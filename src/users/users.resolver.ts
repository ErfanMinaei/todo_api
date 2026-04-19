import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UsersService } from './users.service';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard, RolesGuard } from '../auth/gql.auth.guard';
import type { User, UserRole } from '../../generated/prisma/client';
import { CurrentUser } from '../auth/currentUser.decorator';

@Resolver('User')
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(GqlAuthGuard, new RolesGuard(['SUPERADMIN']))
  @Mutation('createAdmin')
  async createAdmin(
    @Args('input')
    input: {
      firstName: string;
      lastName?: string;
      username: string;
      password: string;
    },
  ) {
    return this.usersService.createAdmin(input);
  }

  @UseGuards(GqlAuthGuard, new RolesGuard(['SUPERADMIN']))
  @Mutation('promoteToAdmin')
  async promoteToAdmin(@Args('userId') userId: number) {
    return this.usersService.promoteToAdmin(userId);
  }

  @UseGuards(GqlAuthGuard, new RolesGuard(['SUPERADMIN']))
  @Mutation('demoteFromAdmin')
  async demoteFromAdmin(@Args('userId') userId: number) {
    return this.usersService.demoteFromAdmin(userId);
  }

  @UseGuards(GqlAuthGuard, new RolesGuard(['ADMIN', 'SUPERADMIN']))
  @Query('allUsers')
  async allUsers(
    @CurrentUser() currentUser: User & { userRoles?: UserRole[] },
  ) {
    const callerRoles = currentUser.userRoles?.map((ur) => ur.role) ?? [];
    return this.usersService.getAllUsers(callerRoles);
  }

  @UseGuards(GqlAuthGuard, new RolesGuard(['ADMIN', 'SUPERADMIN']))
  @Mutation('deleteUser')
  async deleteUser(@Args('userId') userId: number) {
    return this.usersService.deleteUser(userId);
  }

  @UseGuards(GqlAuthGuard, new RolesGuard(['ADMIN', 'SUPERADMIN']))
  @Mutation('updateUser')
  async updateUser(
    @CurrentUser() currentUser: User & { userRoles?: UserRole[] },
    @Args('userId') userId: number,
    @Args('input')
    input: {
      firstName?: string;
      lastName?: string;
      username?: string;
      newPassword?: string;
    },
  ) {
    const callerRoles = currentUser.userRoles?.map((ur) => ur.role) ?? [];
    return this.usersService.updateUser(callerRoles, userId, input);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation('deleteSelf')
  async deleteSelf(@CurrentUser() currentUser: User) {
    return this.usersService.deleteSelf(currentUser.id);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation('updateSelf')
  async updateSelf(
    @CurrentUser() currentUser: User,
    @Args('input')
    input: {
      firstName?: string;
      lastName?: string;
      username?: string;
      currentPassword?: string;
      newPassword?: string;
    },
  ) {
    return this.usersService.updateSelf(currentUser.id, input);
  }
}
