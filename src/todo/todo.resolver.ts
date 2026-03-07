import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { TodoService } from './todo.service';
import { CreateTodoInput, UpdateTodoInput } from '../graphql';

import { GqlAuthGuard } from '../auth/gql.auth.guard';
import { CurrentUser } from 'src/auth/currentUser.decorator';
import { User } from 'generated/prisma/client';

@Resolver('Todo')
export class TodoResolver {
  constructor(readonly todosService: TodoService) {}

  @Query('todos')
  @UseGuards(GqlAuthGuard)
  async todos(@Args('todoListId') todoListId: number) {
    return this.todosService.findByTodoList(todoListId);
  }

  @Query('todo')
  @UseGuards(GqlAuthGuard)
  async todo(@Args('id') id: number) {
    return this.todosService.findOne(id);
  }

  @Mutation('createTodo')
  @UseGuards(GqlAuthGuard)
  async createTodo(
    @Args('input') input: CreateTodoInput,
    @CurrentUser() user: User,
  ) {
    return this.todosService.create(input, user.id);
  }

  @Mutation('updateTodo')
  @UseGuards(GqlAuthGuard)
  async updateTodo(
    @Args('id') id: number,
    @Args('input')
    input: UpdateTodoInput,
  ) {
    return this.todosService.update(id, input);
  }

  @Mutation('deleteTodo')
  @UseGuards(GqlAuthGuard)
  async deleteTodo(@Args('id') id: number) {
    return this.todosService.delete(id);
  }
}
