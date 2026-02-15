import { Module } from '@nestjs/common';
import { TodoListsResolver } from './todo-lists.resolver';
import { TodoListsService } from './todo-lists.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [TodoListsResolver, TodoListsService],
})
export class TodoListsModule {}
