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

@Injectable()
export class AuthService {
  constructor(
    readonly prisma: PrismaService,
    readonly jwtService: JwtService,
  ) {}

  async login(username: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      throw new UnauthorizedException('Incorrect username or password');
    }

    const isPasswordValied = await compare(password, user.password);
    if (!isPasswordValied) {
      throw new UnauthorizedException('Incorrect username or password');
    }

    const token = this.jwtService.sign({
      sub: user.id,
      username: user.username,
    });

    return {
      token,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
      },
    };
  }

  async register(input: RegisterUserInput) {
    const hashedPassword = await hash(input.password, 10);

    try {
      const user = await this.prisma.user.create({
        data: {
          ...input,
          password: hashedPassword,
        },
      });

      const token = this.jwtService.sign({
        sub: user.id,
        username: user.username,
      });

      return {
        token,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
        },
      };
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Username already exists');
        }
      }
      throw error;
    }
  }
}
