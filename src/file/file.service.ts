import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { FileObject } from '../../generated/prisma/browser';

@Injectable()
export class FileService {
  constructor(private readonly prisma: PrismaService) {}

  async saveFileRecord(
    file: Express.Multer.File,
    path: string,
  ): Promise<{ id: string; message: string }> {
    const id = randomUUID();

    await this.prisma.fileObject.create({
      data: {
        id,
        originalName: file.originalname,
        storedName: file.filename,
        path,
        mimeType: file.mimetype,
        size: file.size,
        uploadedAt: new Date(),
      },
    });

    return { id, message: 'File uploaded successfully' };
  }

  getFileRecord(id: string): Promise<FileObject | null> {
    return this.prisma.fileObject.findUnique({ where: { id } });
  }
}
