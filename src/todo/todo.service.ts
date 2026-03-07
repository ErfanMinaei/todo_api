import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTodoInput, UpdateTodoInput } from '../graphql';

@Injectable()
export class TodoService {
  constructor(readonly prisma: PrismaService) {}

  async findByTodoList(todoListId: number) {
    return this.prisma.todo.findMany({
      where: { todoListId },
      include: { todoList: true },
    });
  }

  async findOne(id: number) {
    return this.prisma.todo.findUnique({
      where: { id },
      include: { todoList: true },
    });
  }

  async create(input: CreateTodoInput, userId: number) {
    const todoList = await this.prisma.userTodoList.findFirst({
      where: { id: input.todoListId, userId },
    });

    if (!todoList) {
      throw new Error(
        `TodoList with id ${input.todoListId} not found or does not belong to you`,
      );
    }

    return this.prisma.todo.create({
      data: input,
      include: { todoList: true },
    });
  }

  async update(id: number, input: UpdateTodoInput) {
    const updateData = Object.fromEntries(
      Object.entries(input).filter(
        ([, value]) => value !== null && value !== undefined,
      ),
    );

    return this.prisma.todo.update({
      where: { id },
      data: updateData,
      include: { todoList: true },
    });
  }

  async delete(id: number) {
    await this.prisma.todo.delete({ where: { id } });
    return true;
  }
}
