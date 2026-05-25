import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { InjectMinio } from '../minio/minio.decorator';
import * as Minio from 'minio';

@Injectable()
export class FileService {
  private readonly _bucketName: string;

  constructor(
    @InjectMinio() private readonly minioService: Minio.Client,
    private readonly prisma: PrismaService,
  ) {
    const bucket = process.env.MINIO_BUCKET;
    if (!bucket) {
      throw new Error('MINIO_BUCKET environment variable is not defined');
    }
    this._bucketName = bucket;
  }

  async uploadFile(file: Express.Multer.File, todoId: number, userId: number) {
    const todo = await this.prisma.todo.findFirst({
      where: { id: todoId, todoList: { userId } },
    });

    if (!todo) {
      throw new ForbiddenException('Access denied');
    }

    const storedName = `${randomUUID()}-${file.originalname}`;

    try {
      await this.minioService.putObject(
        this._bucketName,
        storedName,
        file.buffer,
        file.size,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(
        `Failed to upload file to MinIO: ${message}`,
      );
    }

    const fileRecord = await this.prisma.fileObject.create({
      data: {
        id: randomUUID(),
        originalName: file.originalname,
        storedName: storedName,
        path: storedName,
        mimeType: file.mimetype,
        size: file.size,
        uploadedAt: new Date(),
        todoId: todoId,
      },
    });

    return {
      id: fileRecord.id,
      originalName: file.originalname,
      message: 'File uploaded successfully',
    };
  }

  async getFileUrl(fileId: string, userId: number): Promise<string> {
    const file = await this.prisma.fileObject.findFirst({
      where: {
        id: fileId,
        todo: {
          todoList: {
            userId: userId,
          },
        },
      },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    try {
      const presignedUrl = await this.minioService.presignedUrl(
        'GET',
        this._bucketName,
        file.storedName,
        60 * 60,
      );
      return presignedUrl;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(
        `Failed to generate file URL: ${message}`,
      );
    }
  }

  async deleteFile(fileId: string, userId: number): Promise<void> {
    const file = await this.prisma.fileObject.findFirst({
      where: {
        id: fileId,
        todo: {
          todoList: {
            userId: userId,
          },
        },
      },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    try {
      await this.minioService.removeObject(this._bucketName, file.storedName);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(
        `Failed to delete file from MinIO: ${message}`,
      );
    }

    await this.prisma.fileObject.delete({
      where: { id: fileId },
    });
  }

  async listFilesForTodo(todoId: number, userId: number) {
    const todo = await this.prisma.todo.findFirst({
      where: { id: todoId, todoList: { userId } },
    });

    if (!todo) {
      throw new ForbiddenException('Access denied');
    }

    const files = await this.prisma.fileObject.findMany({
      where: { todoId },
      select: {
        id: true,
        originalName: true,
        mimeType: true,
        size: true,
        uploadedAt: true,
      },
    });

    return files;
  }
}
