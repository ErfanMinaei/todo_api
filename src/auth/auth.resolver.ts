import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { LoginInput, RegisterUserInput } from '../graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from './gql.auth.guard';

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

  @Mutation('refresh')
  async refresh(@Args('refreshToken') refreshToken: string) {
    return this.authService.refresh(refreshToken);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation('logout')
  async logout(@Args('refreshToken') refreshToken: string) {
    return this.authService.logout(refreshToken);
  }
}
