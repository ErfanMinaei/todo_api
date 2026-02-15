import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UsersService } from './users.service';
import { CreateUserInput } from '../graphql';
import { JoiValidationPipe } from '../validation/joi-validation.pipe';
import { createUserSchema } from '../validation/schemas';

@Resolver('User')
export class UsersResolver {
  constructor(private usersService: UsersService) {}

  @Mutation('createUser')
  async createUser(
    @Args('input', new JoiValidationPipe(createUserSchema)) input: CreateUserInput,
  ) {
    return this.usersService.create(input);
  }
}