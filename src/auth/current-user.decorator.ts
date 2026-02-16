import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Request } from 'express';
import { User } from 'generated/prisma/client';

interface GqlContext {
  req: Request & { user?: User };
}

export const CurrentUser = createParamDecorator(
  (data: unknown, context: ExecutionContext) => {
    const ctx = GqlExecutionContext.create(context);
    const { req } = ctx.getContext<GqlContext>();
    return req.user;
  },
);
