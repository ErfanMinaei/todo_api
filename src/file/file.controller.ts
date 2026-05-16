import {
  Controller,
  Put,
  Get,
  Param,
  UploadedFile,
  UseInterceptors,
  NotFoundException,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { Response, Request } from 'express';
import { FileService } from './file.service';
import { extname, resolve } from 'node:path';

const UPLOAD_DIR = resolve(process.cwd(), 'uploads');

@Controller('file')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Put('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      // eslint-disable-next-line prettier/prettier
      storage: diskStorage({// NOSONAR
        destination: UPLOAD_DIR,
        filename: (
          req: Request,
          file: Express.Multer.File,
          cb: (error: Error | null, filename: string) => void,
        ) => {
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
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    const absolutePath = resolve(UPLOAD_DIR, file.filename);
    return this.fileService.saveFileRecord(file, absolutePath);
  }

  @Get('read/:id')
  async readFile(@Param('id') id: string, @Res() res: Response) {
    const record = await this.fileService.getFileRecord(id);
    if (!record) {
      throw new NotFoundException(`File with id "${id}" not found`);
    }
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${record.originalName}"`,
    );
    res.sendFile(record.path);
  }
}
