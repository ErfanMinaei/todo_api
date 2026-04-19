import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'node:path';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { TodoListsModule } from './todoList/todoList.module';
import { TodoModule } from './todo/todo.module';
import { AuthModule } from './auth/auth.module';
import { RedisModule } from './redis/redis.module';
import { GraphQLFormattedError } from 'graphql';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      typePaths: ['./**/*.graphql'],
      definitions: {
        path: join(process.cwd(), 'src', 'graphql.ts'),
        outputAs: 'class',
      },
      context: ({ req }: { req: Request }) => ({ req }),

      formatError: (formattedError: GraphQLFormattedError) => {
        const extensions = formattedError.extensions as {
          originalError?: {
            statusCode?: number;
            message?: string;
          };
          status?: number;
        };

        return {
          status:
            extensions.originalError?.statusCode ?? extensions.status ?? 500,
          message: extensions.originalError?.message ?? formattedError.message,
        };
      },
    }),
    PrismaModule,
    UsersModule,
    TodoListsModule,
    TodoModule,
    AuthModule,
    RedisModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
