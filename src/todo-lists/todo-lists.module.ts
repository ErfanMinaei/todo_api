import { Module } from '@nestjs/common';
import { TodoListsResolver } from './todo-lists.resolver';
import { TodoListsService } from './todo-lists.service';

@Module({
  providers: [TodoListsResolver, TodoListsService]
})
export class TodoListsModule {}
