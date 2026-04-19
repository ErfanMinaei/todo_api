import { Module } from '@nestjs/common';
import { TodoListsResolver } from './todoList.resolver';
import { TodoListsService } from './todoList.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [TodoListsResolver, TodoListsService],
})
export class TodoListsModule {}
