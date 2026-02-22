import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { compare, hash } from 'bcrypt';
import { RegisterUserInput } from 'src/graphql';
import { PrismaClientKnownRequestError } from 'generated/prisma/internal/prismaNamespace';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { verify, JwtPayload } from 'jsonwebtoken';
import ms, { StringValue } from 'ms';

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
  ) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private generateAccessToken(userId: number, username: string): string {
    return this.jwtService.sign(
      { sub: userId, username },
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
      { sub: userId, username },
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
    if (!expiresIn) {
      throw new Error('JWT_REFRESH_EXPIRES_IN is not defined');
    }
    const expiresAt = new Date(Date.now() + ms(expiresIn as StringValue));
    await this.prisma.refreshToken.create({
      data: { token, tokenHash, userId, expiresAt },
    });
  }

  private formatUser(user: {
    id: number;
    firstName: string;
    lastName: string | null;
    username: string;
  }) {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName ?? '',
      username: user.username,
    };
  }

  private decodeRefreshToken(token: string): TokenPayload {
    const secret = this.configService.get<string>('JWT_REFRESH_SECRET')!;
    const decoded = verify(token, secret) as unknown;

    if (
      typeof decoded !== 'object' ||
      decoded === null ||
      !('sub' in decoded) ||
      !('username' in decoded)
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const payload = decoded as JwtPayload & { username: string };

    return {
      sub: Number(payload.sub),
      username: payload.username,
    };
  }

  async login(username: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });

    if (!user)
      throw new UnauthorizedException('Incorrect username or password');

    const isPasswordValid = await compare(password, user.password);
    if (!isPasswordValid)
      throw new UnauthorizedException('Incorrect username or password');

    const accessToken = this.generateAccessToken(user.id, user.username);
    const refreshToken = this.generateRefreshToken(user.id, user.username);

    await this.saveRefreshToken(user.id, refreshToken);

    return { accessToken, refreshToken, user: this.formatUser(user) };
  }

  async register(input: RegisterUserInput) {
    const hashedPassword = await hash(input.password, 10);

    try {
      const user = await this.prisma.user.create({
        data: { ...input, password: hashedPassword },
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
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.prisma.refreshToken.delete({ where: { tokenHash } });

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

  async logout(userId: number): Promise<boolean> {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
    return true;
  }
}
