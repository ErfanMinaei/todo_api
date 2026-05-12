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
import { Response } from 'express';
import { FileService } from './file.service';
import { extname } from 'node:path';

@Controller('file')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Put('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (_req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `${uniqueSuffix}${ext}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    }),
  )
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    return this.fileService.saveFileRecord(file);
  }

  @Get('read/:id')
  readFile(@Param('id') id: string, @Res() res: Response) {
    const record = this.fileService.getFileRecord(id);
    if (!record) {
      throw new NotFoundException(`File with id "${id}" not found`);
    }
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${record.originalName}"`,
    );
    res.sendFile(record.storedName, { root: './uploads' });
  }
}
