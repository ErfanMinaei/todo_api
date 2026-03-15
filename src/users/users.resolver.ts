import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UsersService } from './users.service';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard, RolesGuard } from '../auth/gql.auth.guard';

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

  @UseGuards(GqlAuthGuard, new RolesGuard(['ADMIN', 'SUPERADMIN']))
  @Query('allUsers')
  async allUsers() {
    return this.usersService.getAllUsers();
  }

  @UseGuards(GqlAuthGuard, new RolesGuard(['ADMIN', 'SUPERADMIN']))
  @Mutation('deleteUser')
  async deleteUser(@Args('userId') userId: number) {
    return this.usersService.deleteUser(userId);
  }
}
