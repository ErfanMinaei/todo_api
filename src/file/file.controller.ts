import {
  Controller,
  Put,
  Get,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  NotFoundException,
  BadRequestException,
  Res,
  Req,
  Delete,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { Response, Request } from 'express';
import { FileService } from './file.service';
import { extname, resolve } from 'node:path';
import { JwtRestGuard } from '../auth/jwt.auth.guard';
import { User, UserRole } from '../../generated/prisma/client';

const UPLOAD_DIR = resolve(process.cwd(), 'uploads');

@Controller('file')
@UseGuards(JwtRestGuard)
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Put('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      // eslint-disable-next-line prettier/prettier
      storage: diskStorage({// NOSONAR 
        destination: UPLOAD_DIR,
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `${uniqueSuffix}${ext}`);
        },
      }),
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
    const absolutePath = resolve(UPLOAD_DIR, file.filename);

    return this.fileService.saveFileRecord(file, absolutePath, {
      todoId,
      userId: user.id,
    });
  }

  @Get('read/:id')
  async readFile(
    @Param('id') id: string,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const user = req.user as User;
    const record = await this.fileService.getFileRecordForUser(id, user.id);
    if (!record) {
      throw new NotFoundException(
        `File with id "${id}" not found or access denied`,
      );
    }
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${record.originalName}"`,
    );
    res.sendFile(record.path);
  }
  @Delete(':id')
  async unattachFile(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as User & { userRoles?: UserRole[] };
    return this.fileService.deleteFileRecordAndFile(id, user);
  }
}
