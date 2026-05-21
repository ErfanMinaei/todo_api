import { Mutation, Args, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/gql.auth.guard';
import { CurrentUser } from '../auth/currentUser.decorator';
import { FileService } from './file.service';
import { User, UserRole } from '../../generated/prisma/client';

@Resolver()
export class FileResolver {
  constructor(private readonly fileService: FileService) {}

  @Mutation('unattachFile')
  @UseGuards(GqlAuthGuard)
  async unattachFile(
    @Args('id') id: string,
    @CurrentUser() user: User & { userRoles?: UserRole[] },
  ): Promise<boolean> {
    await this.fileService.deleteFileRecordAndFile(id, user);
    return true;
  }
}
