import {
  Controller,
  Put,
  Get,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  BadRequestException,
  Req,
  Delete,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { FileService } from './file.service';
import { JwtRestGuard } from '../auth/jwt.auth.guard';
import { User } from '../../generated/prisma/client';

@Controller('file')
@UseGuards(JwtRestGuard)
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Put('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize:
          Number.parseInt(process.env.FILE_MAX_SIZE_MB ?? '10', 10) *
          1024 *
          1024,
      },
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Query('todoId') todoIdRaw: string,
    @Req() req: Request,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const todoId = Number.parseInt(todoIdRaw, 10);
    if (Number.isNaN(todoId) || todoId <= 0) {
      throw new BadRequestException('todoId must be a positive integer');
    }

    const user = req.user as User;
    return this.fileService.uploadFile(file, todoId, user.id);
  }

  @Get('url/:id')
  async getFileUrl(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as User;
    const url = await this.fileService.getFileUrl(id, user.id);
    return { url };
  }

  @Delete(':id')
  async deleteFile(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as User;
    await this.fileService.deleteFile(id, user.id);
    return { message: 'File deleted successfully' };
  }
}
