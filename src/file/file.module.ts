import { Module } from '@nestjs/common';
import { FileController } from './file.controller';
import { FileService } from './file.service';
import { PrismaModule } from '../prisma/prisma.module';
import { FileResolver } from './file.resolver';
import { JwtRestGuard } from '../auth/jwt.auth.guard';

@Module({
  imports: [PrismaModule],
  controllers: [FileController],
  providers: [FileService, JwtRestGuard, FileResolver],
})
export class FileModule {}
