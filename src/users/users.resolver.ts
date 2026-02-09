import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UsersService } from './users.service';
import { CreateUserInput } from '../graphql';
import { JoiValidationPipe } from '../validation/joi-validation.pipe';
import { createUserSchema } from '../validation/schemas';

@Resolver('User')
export class UsersResolver {
  constructor(private usersService: UsersService) {}

  @Query('user')
  async user(@Args('id') id: number) {
    return this.usersService.findOne(id);
  }

  @Mutation('createUser')
  async createUser(
    @Args('input', new JoiValidationPipe(createUserSchema)) input: CreateUserInput,
  ) {
    return this.usersService.create(input);
  }
}