import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

export interface FileRecord {
  id: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  uploadedAt: Date;
}

@Injectable()
export class FileService {
  // In-memory store — replace with Prisma/DB persistence if needed
  private readonly store = new Map<string, FileRecord>();

  saveFileRecord(file: Express.Multer.File): { id: string; message: string } {
    const id = randomUUID();
    const record: FileRecord = {
      id,
      originalName: file.originalname,
      storedName: file.filename,
      mimeType: file.mimetype,
      size: file.size,
      uploadedAt: new Date(),
    };
    this.store.set(id, record);
    return { id, message: 'File uploaded successfully' };
  }

  getFileRecord(id: string): FileRecord | undefined {
    return this.store.get(id);
  }
}
