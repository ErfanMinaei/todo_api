import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { TodosService } from './todo.service';
import { CreateTodoInput, UpdateTodoInput } from '../graphql';
import { JoiValidationPipe } from '../validation/joi-validation.pipe';
import { createTodoSchema, updateTodoSchema } from '../validation/schemas';

@Resolver('Todo')
export class TodosResolver {
  constructor(private todosService: TodosService) {}

  @Query('todos')
  async todos(@Args('todoListId') todoListId: number) {
    return this.todosService.findByTodoList(todoListId);
  }

  @Query('todo')
  async todo(@Args('id') id: number) {
    return this.todosService.findOne(id);
  }

  @Mutation('createTodo')
  async createTodo(
    @Args('input', new JoiValidationPipe(createTodoSchema)) input: CreateTodoInput,
  ) {
    return this.todosService.create(input);
  }

  @Mutation('updateTodo')
  async updateTodo(
    @Args('id') id: number,
    @Args('input', new JoiValidationPipe(updateTodoSchema)) input: UpdateTodoInput,
  ) {
    return this.todosService.update(id, input);
  }

  @Mutation('deleteTodo')
  async deleteTodo(@Args('id') id: number) {
    return this.todosService.delete(id);
  }
}