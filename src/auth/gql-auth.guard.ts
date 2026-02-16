import { ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { User } from 'generated/prisma/client';

interface GqlContext {
  req: Request & { user?: User };
}

@Injectable()
export class GqlAuthGuard {
  getRequest(context: ExecutionContext) {
    const gqlCtx = GqlExecutionContext.create(context);
    const { req } = gqlCtx.getContext<GqlContext>();
    return req;
  }
}
