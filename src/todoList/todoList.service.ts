import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
      include: { todos: true, user: true },
    });
  }

  async delete(id: number) {
    await this.prisma.userTodoList.delete({ where: { id } });
    return true;
  }

  private async getTodoListWithOwnerRoles(todoListId: number) {
    const todoList = await this.prisma.userTodoList.findUnique({
      where: { id: todoListId },
      include: { todos: true, user: { include: { userRoles: true } } },
    });
    if (!todoList) throw new NotFoundException('TodoList not found');
    return todoList;
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
        'Admins can only access todo lists of regular users',
      );
    }
  }

  async adminGetUserTodoLists(callerRoles: string[], userId: number) {
    const targetUser = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { userRoles: true },
    });
    if (!targetUser) throw new NotFoundException('User not found');

    const ownerRoles = targetUser.userRoles.map((r) => r.role);
    this.assertAdminCanAccessOwner(callerRoles, ownerRoles);

    return this.prisma.userTodoList.findMany({
      where: { userId },
      include: { todos: true, user: true },
    });
  }

  async adminCreateTodoList(
    callerRoles: string[],
    userId: number,
    input: CreateTodoListInput,
  ) {
    const targetUser = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { userRoles: true },
    });
    if (!targetUser) throw new NotFoundException('User not found');

    const ownerRoles = targetUser.userRoles.map((r) => r.role);
    this.assertAdminCanAccessOwner(callerRoles, ownerRoles);

    return this.prisma.userTodoList.create({
      data: { title: input.title, userId },
      include: { todos: true, user: true },
    });
  }

  async adminUpdateTodoList(
    callerRoles: string[],
    todoListId: number,
    input: UpdateTodoListInput,
  ) {
    const todoList = await this.getTodoListWithOwnerRoles(todoListId);
    const ownerRoles = todoList.user.userRoles.map((r) => r.role);
    this.assertAdminCanAccessOwner(callerRoles, ownerRoles);

    const updateData = Object.fromEntries(
      Object.entries(input).filter(
        ([, value]) => value !== null && value !== undefined,
      ),
    );

    return this.prisma.userTodoList.update({
      where: { id: todoListId },
      data: updateData,
      include: { todos: true, user: true },
    });
  }

  async adminDeleteTodoList(callerRoles: string[], todoListId: number) {
    const todoList = await this.getTodoListWithOwnerRoles(todoListId);
    const ownerRoles = todoList.user.userRoles.map((r) => r.role);
    this.assertAdminCanAccessOwner(callerRoles, ownerRoles);

    await this.prisma.userTodoList.delete({ where: { id: todoListId } });
    return true;
  }
}
