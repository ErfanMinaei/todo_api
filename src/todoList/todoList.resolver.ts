import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { TodoListsService } from './todoList.service';
import { CreateTodoListInput, UpdateTodoListInput } from '../graphql';
import { GqlAuthGuard, RolesGuard } from '../auth/gql.auth.guard';
import { CurrentUser } from '../auth/currentUser.decorator';
import type { User, UserRole } from '../../generated/prisma/client';

@Resolver('TodoList')
export class TodoListsResolver {
  constructor(readonly todoListsService: TodoListsService) {}

  @Query('todoLists')
  @UseGuards(GqlAuthGuard)
  async todoLists(@CurrentUser() user: User) {
    return this.todoListsService.findByUser(user.id);
  }

  @Mutation('createTodoList')
  @UseGuards(GqlAuthGuard)
  async createTodoList(
    @Args('input')
    input: CreateTodoListInput,
    @CurrentUser() user: User,
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

  @UseGuards(GqlAuthGuard, new RolesGuard(['ADMIN', 'SUPERADMIN']))
  @Query('userTodoLists')
  async userTodoLists(
    @CurrentUser() currentUser: User & { userRoles?: UserRole[] },
    @Args('userId') userId: number,
  ) {
    const callerRoles = currentUser.userRoles?.map((ur) => ur.role) ?? [];
    return this.todoListsService.adminGetUserTodoLists(callerRoles, userId);
  }

  @UseGuards(GqlAuthGuard, new RolesGuard(['SUPERADMIN']))
  @Mutation('adminCreateTodoList')
  async adminCreateTodoList(
    @CurrentUser() currentUser: User & { userRoles?: UserRole[] },
    @Args('userId') userId: number,
    @Args('input') input: CreateTodoListInput,
  ) {
    const callerRoles = currentUser.userRoles?.map((ur) => ur.role) ?? [];
    return this.todoListsService.adminCreateTodoList(
      callerRoles,
      userId,
      input,
    );
  }

  @UseGuards(GqlAuthGuard, new RolesGuard(['ADMIN', 'SUPERADMIN']))
  @Mutation('adminUpdateTodoList')
  async adminUpdateTodoList(
    @CurrentUser() currentUser: User & { userRoles?: UserRole[] },
    @Args('todoListId') todoListId: number,
    @Args('input') input: UpdateTodoListInput,
  ) {
    const callerRoles = currentUser.userRoles?.map((ur) => ur.role) ?? [];
    return this.todoListsService.adminUpdateTodoList(
      callerRoles,
      todoListId,
      input,
    );
  }

  @UseGuards(GqlAuthGuard, new RolesGuard(['ADMIN', 'SUPERADMIN']))
  @Mutation('adminDeleteTodoList')
  async adminDeleteTodoList(
    @CurrentUser() currentUser: User & { userRoles?: UserRole[] },
    @Args('todoListId') todoListId: number,
  ) {
    const callerRoles = currentUser.userRoles?.map((ur) => ur.role) ?? [];
    return this.todoListsService.adminDeleteTodoList(callerRoles, todoListId);
  }
}
