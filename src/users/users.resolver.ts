import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { UsersService } from './users.service';
import { CreateUserInput } from '../graphql';

@Resolver('User')
export class UsersResolver {
  constructor(readonly usersService: UsersService) {}

  @Mutation('createUser')
  async createUser(
    @Args('input')
    input: CreateUserInput,
  ) {
    return this.usersService.create(input);
  }
}
