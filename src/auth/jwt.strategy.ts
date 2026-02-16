import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GqlExecutionContext } from '@nestjs/graphql';
import { verify } from 'jsonwebtoken';
import { Request } from 'express';
import { User } from 'generated/prisma/client';

interface GqlContext {
  req: Request & { user?: User };
}
interface JwtPayload {
  sub: number;
  username: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const gqlCtx = GqlExecutionContext.create(context);
    const { req } = gqlCtx.getContext<GqlContext>();

    const authHeader = req?.headers?.authorization;
    if (!authHeader) throw new UnauthorizedException();

    const token = authHeader.split(' ')[1];
    if (!token) throw new UnauthorizedException();

    try {
      const decoded = verify(token, process.env.JWT_SECRET!) as unknown;

      if (
        typeof decoded !== 'object' ||
        decoded === null ||
        !('sub' in decoded)
      ) {
        throw new UnauthorizedException();
      }

      const payload = decoded as JwtPayload;

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) throw new UnauthorizedException();

      req.user = user;

      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
