import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTodoListInput } from '../graphql';

@Injectable()
export class TodoListsService {
  constructor(private prisma: PrismaService) { }

  async findByUser(userId: number) {
    return this.prisma.userTodoList.findMany({
      where: { userId },
      include: { todos: true, user: true },
    });
  }

  async findOne(id: number) {
    return this.prisma.userTodoList.findUnique({
      where: { id },
      include: { todos: true, user: true },
    });
  }

  async create(input: CreateTodoListInput, userId: number) {
    return this.prisma.userTodoList.create({
      data: {
        title: input.title,
        userId,
      },
      include: { todos: true, user: true },
    });
  }
}