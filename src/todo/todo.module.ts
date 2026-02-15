import { Module } from '@nestjs/common';
import { TodoResolver } from './todo.resolver';
import { TodoService } from './todo.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [TodoResolver, TodoService],
})
export class TodoModule {}
