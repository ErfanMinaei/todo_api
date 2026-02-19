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
import { GraphQLError } from 'graphql/error';

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

      formatError: (error: GraphQLError) => {
        const extensions = error.extensions as {
          originalError?: {
            statusCode?: number;
            message?: string;
          };
          status?: number;
        };

        return {
          status:
            extensions.originalError?.statusCode ?? extensions.status ?? 500,
          message: extensions.originalError?.message ?? error.message,
        };
      },
    }),
    PrismaModule,
    UsersModule,
    TodoListsModule,
    TodoModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
