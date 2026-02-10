import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { TodoListsService } from './todo-lists.service';
import { CreateTodoListInput } from '../graphql';
import { JoiValidationPipe } from '../validation/joi-validation.pipe';
import { createTodoListSchema } from '../validation/schemas';

@Resolver('TodoList')
export class TodoListsResolver {
  constructor(private todoListsService: TodoListsService) { }

  @Query('todoLists')
  async todoLists(@Args('userId') userId: number) {
    return this.todoListsService.findByUser(userId);
  }

  @Query('todoList')
  async todoList(@Args('id') id: number) {
    return this.todoListsService.findOne(id);
  }

  @Mutation('createTodoList')
  async createTodoList(
    @Args('input', new JoiValidationPipe(createTodoListSchema)) input: CreateTodoListInput,
  ) {
    return this.todoListsService.create(input);  //will fix this error after applying gurads 
  }
}
