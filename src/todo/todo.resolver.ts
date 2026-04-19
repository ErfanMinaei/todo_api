import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { TodoService } from './todo.service';
import { CreateTodoInput, UpdateTodoInput } from '../graphql';

import { GqlAuthGuard, RolesGuard } from '../auth/gql.auth.guard';
import { CurrentUser } from '../auth/currentUser.decorator';
import type { User, UserRole } from '../../generated/prisma/client';

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

  // ---------- ADMIN ----------

  @UseGuards(GqlAuthGuard, new RolesGuard(['ADMIN', 'SUPERADMIN']))
  @Query('adminTodos')
  async adminTodos(
    @CurrentUser() currentUser: User & { userRoles?: UserRole[] },
    @Args('todoListId') todoListId: number,
  ) {
    const callerRoles = currentUser.userRoles?.map((r) => r.role) ?? [];

    return this.todosService.adminTodos(callerRoles, todoListId);
  }

  @UseGuards(GqlAuthGuard, new RolesGuard(['SUPERADMIN']))
  @Mutation('adminCreateTodo')
  async adminCreateTodo(
    @CurrentUser() currentUser: User & { userRoles?: UserRole[] },
    @Args('input') input: CreateTodoInput,
  ) {
    const callerRoles = currentUser.userRoles?.map((r) => r.role) ?? [];

    return this.todosService.adminCreateTodo(callerRoles, input);
  }

  @UseGuards(GqlAuthGuard, new RolesGuard(['ADMIN', 'SUPERADMIN']))
  @Mutation('adminUpdateTodo')
  async adminUpdateTodo(
    @CurrentUser() currentUser: User & { userRoles?: UserRole[] },
    @Args('id') id: number,
    @Args('input') input: UpdateTodoInput,
  ) {
    const callerRoles = currentUser.userRoles?.map((r) => r.role) ?? [];

    return this.todosService.adminUpdateTodo(callerRoles, id, input);
  }

  @UseGuards(GqlAuthGuard, new RolesGuard(['ADMIN', 'SUPERADMIN']))
  @Mutation('adminDeleteTodo')
  async adminDeleteTodo(
    @CurrentUser() currentUser: User & { userRoles?: UserRole[] },
    @Args('id') id: number,
  ) {
    const callerRoles = currentUser.userRoles?.map((r) => r.role) ?? [];

    return this.todosService.adminDeleteTodo(callerRoles, id);
  }
}
