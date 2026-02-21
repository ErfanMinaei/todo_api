import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTodoListInput, UpdateTodoListInput } from '../graphql';

@Injectable()
export class TodoListsService {
  constructor(readonly prisma: PrismaService) {}

  async findByUser(userId: number) {
    return this.prisma.userTodoList.findMany({
      where: { userId },
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

  async update(input: UpdateTodoListInput, id: number) {
    const updateData = Object.fromEntries(
      Object.entries(input).filter(
        ([, value]) => value !== null && value !== undefined,
      ),
    );

    return this.prisma.userTodoList.update({
      where: { id },
      data: updateData,
      include: { todos: true },
    });
  }

  async delete(id: number) {
    await this.prisma.userTodoList.delete({ where: { id } });
    return true;
  }
}
