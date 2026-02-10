import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { TodoService } from './todo.service';
import { CreateTodoInput, UpdateTodoInput } from '../graphql';
import { JoiValidationPipe } from '../validation/joi-validation.pipe';
import { createTodoSchema, updateTodoSchema } from '../validation/schemas';
import { GqlAuthGuard } from '../auth/gql-auth.guard';

@Resolver('Todo')
export class TodosResolver {
  constructor(private todosService: TodoService) {}

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
    @Args('input', new JoiValidationPipe(createTodoSchema)) input: CreateTodoInput,
  ) {
    return this.todosService.create(input);
  }

  @Mutation('updateTodo')
  @UseGuards(GqlAuthGuard)
  async updateTodo(
    @Args('id') id: number,
    @Args('input', new JoiValidationPipe(updateTodoSchema)) input: UpdateTodoInput,
  ) {
    return this.todosService.update(id, input);
  }

  @Mutation('deleteTodo')
  @UseGuards(GqlAuthGuard)
  async deleteTodo(@Args('id') id: number) {
    return this.todosService.delete(id);
  }
}