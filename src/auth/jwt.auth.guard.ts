import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { verify } from 'jsonwebtoken';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '../../generated/prisma/client';

declare module 'express' {
  export interface Request {
    user?: User;
  }
}

interface TokenPayload {
  sub: number;
  username: string;
  type?: string;
}

@Injectable()
export class JwtRestGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Missing authorization header');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('Invalid token format');
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new UnauthorizedException('JWT secret not configured');
    }

    try {
      const decoded = verify(token, secret) as unknown as TokenPayload;

      if (!decoded.sub || typeof decoded.sub !== 'number') {
        throw new UnauthorizedException('Invalid token payload');
      }

      if (decoded.type !== 'access') {
        throw new UnauthorizedException('Invalid token type');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: decoded.sub },
        include: { userRoles: true },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      request.user = user;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
