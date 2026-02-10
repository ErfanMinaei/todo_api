import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { JoiValidationPipe } from 'src/validation/joi-validation.pipe';
import { loginSchema } from '../validation/schemas';
import { LoginInput } from '../graphql';


@Resolver()
export class AuthResolver {
    constructor(private authService: AuthService){}

    @Mutation('login')
    async login(
        @Args('input', new JoiValidationPipe(loginSchema)) input: LoginInput
    ){
        return this.authService.login(input.username, input.password);
    }
}