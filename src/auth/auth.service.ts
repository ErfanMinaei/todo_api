import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/redis/redis.service';
import { compare, hash } from 'bcrypt';
import { RegisterUserInput, Role } from 'src/graphql';
import { PrismaClientKnownRequestError } from 'generated/prisma/internal/prismaNamespace';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { verify, JwtPayload } from 'jsonwebtoken';
import ms, { StringValue } from 'ms';
import { User, UserRole } from 'generated/prisma/client';

interface TokenPayload {
  sub: number;
  username: string;
}

@Injectable()
export class AuthService {
  constructor(
    readonly prisma: PrismaService,
    readonly jwtService: JwtService,
    readonly configService: ConfigService,
    readonly redis: RedisService,
  ) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private generateAccessToken(userId: number, username: string): string {
    return this.jwtService.sign(
      { sub: userId, username, type: 'access' },
      {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>(
          'JWT_EXPIRES_IN',
        ) as StringValue,
      },
    );
  }

  private generateRefreshToken(userId: number, username: string): string {
    return this.jwtService.sign(
      { sub: userId, username, type: 'refresh' },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>(
          'JWT_REFRESH_EXPIRES_IN',
        ) as StringValue,
      },
    );
  }

  private async saveRefreshToken(userId: number, token: string): Promise<void> {
    const tokenHash = this.hashToken(token);
    const expiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN');
    if (!expiresIn) throw new Error('JWT_REFRESH_EXPIRES_IN is not defined');

    const ttlSeconds = Math.floor(ms(expiresIn as StringValue) / 1000);
    const userKey = `user_tokens:${userId}`;

    await this.redis.set(
      `refresh_token:${tokenHash}`,
      String(userId),
      ttlSeconds,
    );

    await this.redis.rpush(userKey, tokenHash);
    await this.redis.expire(userKey, ttlSeconds);
  }

  private formatUser(user: User & { userRoles?: UserRole[] }) {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName ?? '',
      username: user.username,
      roles: user.userRoles?.map((ur) => ur.role) || ['USER'],
    };
  }

  private decodeRefreshToken(token: string): TokenPayload {
    const secret = this.configService.get<string>('JWT_REFRESH_SECRET')!;
    const decoded = verify(token, secret) as unknown;

    if (
      typeof decoded !== 'object' ||
      decoded === null ||
      !('sub' in decoded) ||
      !('username' in decoded) ||
      !('type' in decoded) ||
      decoded.type !== 'refresh'
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const payload = decoded as JwtPayload & { username: string; type: string };
    return { sub: Number(payload.sub), username: payload.username };
  }

  private get maxDevices(): number {
    return Number(this.configService.get<string>('MAX_DEVICES') || 3);
  }

  private async checkDeviceLimit(userId: number): Promise<void> {
    const userKey = `user_tokens:${userId}`;
    const tokens = await this.redis.lrange(userKey, 0, -1);

    if (tokens.length === 0) return;

    const keys = tokens.map((t: string) => `refresh_token:${t}`);
    const results = await this.redis.mget(...keys);

    let validTokenCount = 0;

    for (let i = 0; i < tokens.length; i++) {
      if (results[i]) {
        validTokenCount++;
      } else {
        await this.redis.lrem(userKey, 0, tokens[i]);
      }
    }

    if (validTokenCount >= this.maxDevices) {
      throw new UnauthorizedException(
        'Maximum number of devices (3) reached. Please logout from another device first.',
      );
    }
  }

  async login(username: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      include: { userRoles: true },
    });

    if (!user)
      throw new UnauthorizedException('Incorrect username or password');

    const isPasswordValid = await compare(password, user.password);
    if (!isPasswordValid)
      throw new UnauthorizedException('Incorrect username or password');

    await this.checkDeviceLimit(user.id);

    const accessToken = this.generateAccessToken(user.id, user.username);
    const refreshToken = this.generateRefreshToken(user.id, user.username);

    await this.saveRefreshToken(user.id, refreshToken);

    return { accessToken, refreshToken, user: this.formatUser(user) };
  }

  async register(input: RegisterUserInput) {
    const hashedPassword = await hash(input.password, 10);

    try {
      const user = await this.prisma.user.create({
        data: {
          ...input,
          password: hashedPassword,
          userRoles: {
            create: [{ role: Role.USER }],
          },
        },
        include: { userRoles: true },
      });

      const accessToken = this.generateAccessToken(user.id, user.username);
      const refreshToken = this.generateRefreshToken(user.id, user.username);
      await this.saveRefreshToken(user.id, refreshToken);

      return { accessToken, refreshToken, user: this.formatUser(user) };
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Username already exists');
      }
      throw error;
    }
  }

  async refresh(refreshToken: string) {
    let payload: TokenPayload;

    try {
      payload = this.decodeRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.redis.get(`refresh_token:${tokenHash}`);

    if (!stored) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const userKey = `user_tokens:${payload.sub}`;

    await this.redis.del(`refresh_token:${tokenHash}`);
    await this.redis.lrem(userKey, 0, tokenHash);

    const newAccessToken = this.generateAccessToken(
      payload.sub,
      payload.username,
    );

    const newRefreshToken = this.generateRefreshToken(
      payload.sub,
      payload.username,
    );

    await this.saveRefreshToken(payload.sub, newRefreshToken);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  async logout(refreshToken: string): Promise<boolean> {
    const tokenHash = this.hashToken(refreshToken);

    const userId = await this.redis.get(`refresh_token:${tokenHash}`);

    if (userId) {
      const userKey = `user_tokens:${userId}`;
      await this.redis.lrem(userKey, 0, tokenHash);
    }

    await this.redis.del(`refresh_token:${tokenHash}`);
    return true;
  }
}
