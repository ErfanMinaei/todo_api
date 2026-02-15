import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { TodoListsService } from './todo-lists.service';
import { CreateTodoListInput, UpdateTodoListInput } from '../graphql';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Resolver('TodoList')
export class TodoListsResolver {
  constructor(readonly todoListsService: TodoListsService) {}

  @Query('todoLists')
  @UseGuards(GqlAuthGuard)
  async todoLists(@CurrentUser() user: any) {
    return this.todoListsService.findByUser(user.id);
  }

  @Mutation('createTodoList')
  @UseGuards(GqlAuthGuard)
  async createTodoList(
    @Args('input')
    input: CreateTodoListInput,
    @CurrentUser() user: any,
  ) {
    return this.todoListsService.create(input, user.id);
  }

  @Mutation('updateTodoList')
  @UseGuards(GqlAuthGuard)
  async updateTodoList(
    @Args('id') id: number,
    @Args('input')
    input: UpdateTodoListInput,
  ) {
    return this.todoListsService.update(input, id);
  }

  @Mutation('deleteTodoList')
  @UseGuards(GqlAuthGuard)
  async deleteTodo(@Args('id') id: number) {
    return this.todoListsService.delete(id);
  }
}
