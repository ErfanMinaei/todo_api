import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

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

  // ---------------- ADMIN ----------------

  private async getTodoWithOwnerRoles(todoId: number) {
    const todo = await this.prisma.todo.findUnique({
      where: { id: todoId },
      include: {
        todoList: {
          include: {
            user: {
              include: {
                userRoles: true,
              },
            },
          },
        },
      },
    });

    if (!todo) throw new NotFoundException('Todo not found');

    return todo;
  }

  private async getTodoListOwnerRoles(todoListId: number) {
    const todoList = await this.prisma.userTodoList.findUnique({
      where: { id: todoListId },
      include: {
        user: {
          include: { userRoles: true },
        },
      },
    });

    if (!todoList) throw new NotFoundException('TodoList not found');

    return todoList.user.userRoles.map((r) => r.role);
  }

  private assertAdminCanAccessOwner(
    callerRoles: string[],
    ownerRoles: string[],
  ) {
    const isSuperAdmin = callerRoles.includes('SUPERADMIN');

    const ownerIsAdmin =
      ownerRoles.includes('ADMIN') || ownerRoles.includes('SUPERADMIN');

    if (!isSuperAdmin && ownerIsAdmin) {
      throw new ForbiddenException(
        'Admins can only access todos of regular users',
      );
    }
  }

  async adminTodos(callerRoles: string[], todoListId: number) {
    const ownerRoles = await this.getTodoListOwnerRoles(todoListId);

    this.assertAdminCanAccessOwner(callerRoles, ownerRoles);

    return this.prisma.todo.findMany({
      where: { todoListId },
      include: { todoList: true },
    });
  }

  async adminCreateTodo(callerRoles: string[], input: CreateTodoInput) {
    const ownerRoles = await this.getTodoListOwnerRoles(input.todoListId);

    this.assertAdminCanAccessOwner(callerRoles, ownerRoles);

    return this.prisma.todo.create({
      data: input,
      include: { todoList: true },
    });
  }

  async adminUpdateTodo(
    callerRoles: string[],
    todoId: number,
    input: UpdateTodoInput,
  ) {
    const todo = await this.getTodoWithOwnerRoles(todoId);

    const ownerRoles = todo.todoList.user.userRoles.map((r) => r.role);

    this.assertAdminCanAccessOwner(callerRoles, ownerRoles);

    const updateData = Object.fromEntries(
      Object.entries(input).filter(
        ([, value]) => value !== null && value !== undefined,
      ),
    );

    return this.prisma.todo.update({
      where: { id: todoId },
      data: updateData,
      include: { todoList: true },
    });
  }

  async adminDeleteTodo(callerRoles: string[], todoId: number) {
    const todo = await this.getTodoWithOwnerRoles(todoId);

    const ownerRoles = todo.todoList.user.userRoles.map((r) => r.role);

    this.assertAdminCanAccessOwner(callerRoles, ownerRoles);

    await this.prisma.todo.delete({
      where: { id: todoId },
    });

    return true;
  }
}
