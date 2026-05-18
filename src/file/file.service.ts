import { Injectable, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { FileObject } from '../../generated/prisma/browser';

export interface SaveFileOptions {
  todoId: number;
  userId: number;
}

@Injectable()
export class FileService {
  constructor(private readonly prisma: PrismaService) {}

  async saveFileRecord(
    file: Express.Multer.File,
    path: string,
    options: SaveFileOptions,
  ): Promise<{ id: string; message: string }> {
    const { todoId, userId } = options;

    const todo = await this.prisma.todo.findFirst({
      where: {
        id: todoId,
        todoList: {
          userId: userId,
        },
      },
      select: { id: true },
    });

    if (!todo) {
      throw new BadRequestException(
        `Todo with id ${todoId} not found or does not belong to you`,
      );
    }

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
        todoId,
      },
    });

    return { id, message: 'File uploaded successfully' };
  }

  async getFileRecordForUser(
    id: string,
    userId: number,
  ): Promise<FileObject | null> {
    const file = await this.prisma.fileObject.findUnique({
      where: { id },
      include: {
        todo: {
          include: {
            todoList: true,
          },
        },
      },
    });

    if (!file) return null;
    // Check ownership
    if (file.todo?.todoList.userId !== userId) {
      return null;
    }
    return file;
  }
}
