import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { TodoListsService } from './todo-lists.service';
import { CreateTodoListInput } from '../graphql';
import { JoiValidationPipe } from '../validation/joi-validation.pipe';
import { createTodoListSchema } from '../validation/schemas';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Resolver('TodoList')
export class TodoListsResolver {
  constructor(private todoListsService: TodoListsService) {}

  @Query('todoLists')
  @UseGuards(GqlAuthGuard)
  async todoLists(@CurrentUser() user: any) {
    return this.todoListsService.findByUser(user.id);
  }

  @Query('todoList')
  @UseGuards(GqlAuthGuard)
  async todoList(@Args('id') id: number) {
    return this.todoListsService.findOne(id);
  }

  @Mutation('createTodoList')
  @UseGuards(GqlAuthGuard)
  async createTodoList(
    @Args('input', new JoiValidationPipe(createTodoListSchema)) input: CreateTodoListInput,
    @CurrentUser() user: any,
  ) {
    return this.todoListsService.create(input, user.id);
  }
}