import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { LoginInput } from '../graphql';
import { RegisterUserInput } from 'src/graphql';

@Resolver()
export class AuthResolver {
  constructor(readonly authService: AuthService) {}

  @Mutation('login')
  async login(@Args('input') input: LoginInput) {
    return this.authService.login(input.username, input.password);
  }

  @Mutation('register')
  async register(@Args('input') input: RegisterUserInput) {
    return this.authService.register(input);
  }
}
