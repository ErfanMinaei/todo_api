import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTodoInput, UpdateTodoInput } from '../graphql';
import { Prisma } from '../../generated/prisma/client';

type TodoWithList = Prisma.TodoGetPayload<{ include: { todoList: true } }>;

@Injectable()
export class TodoService {
  constructor(
    readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  private getTodosCacheKey(todoListId: number): string {
    return `todos:list:${todoListId}`;
  }

  private getTodoCacheKey(todoId: number): string {
    return `todo:${todoId}`;
  }

  private async cacheSet(
    key: string,
    value: any,
    ttlSeconds = 60,
  ): Promise<void> {
    await this.redis.set(key, JSON.stringify(value), ttlSeconds);
  }

  private async cacheGet<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(key);
    // Cast JSON.parse result to T to satisfy ESLint
    return data ? (JSON.parse(data) as T) : null;
  }

  private async cacheDelete(key: string): Promise<void> {
    await this.redis.del(key);
  }

  private async invalidateTodoCache(
    todoListId: number,
    todoId?: number,
  ): Promise<void> {
    await this.cacheDelete(this.getTodosCacheKey(todoListId));
    if (todoId) {
      await this.cacheDelete(this.getTodoCacheKey(todoId));
    }
  }

  // ─── Regular user methods ──────────────────────────────

  async findByTodoList(todoListId: number): Promise<TodoWithList[]> {
    const cacheKey = this.getTodosCacheKey(todoListId);
    const cached = await this.cacheGet<TodoWithList[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.prisma.todo.findMany({
      where: { todoListId },
      include: { todoList: true },
    });

    await this.cacheSet(cacheKey, result);
    return result;
  }

  async findOne(id: number): Promise<TodoWithList | null> {
    const cacheKey = this.getTodoCacheKey(id);
    const cached = await this.cacheGet<TodoWithList>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.prisma.todo.findUnique({
      where: { id },
      include: { todoList: true },
    });

    if (result) {
      await this.cacheSet(cacheKey, result);
    }
    return result;
  }

  async create(input: CreateTodoInput, userId: number): Promise<TodoWithList> {
    const todoList = await this.prisma.userTodoList.findFirst({
      where: { id: input.todoListId, userId },
    });

    if (!todoList) {
      throw new Error(
        `TodoList with id ${input.todoListId} not found or does not belong to you`,
      );
    }

    const result = await this.prisma.todo.create({
      data: input,
      include: { todoList: true },
    });

    await this.invalidateTodoCache(input.todoListId, result.id);
    return result;
  }

  async update(id: number, input: UpdateTodoInput): Promise<TodoWithList> {
    const existing = await this.prisma.todo.findUnique({
      where: { id },
      select: { todoListId: true },
    });
    if (!existing) throw new NotFoundException('Todo not found');

    const updateData = Object.fromEntries(
      Object.entries(input).filter(
        ([, value]) => value !== null && value !== undefined,
      ),
    );

    const result = await this.prisma.todo.update({
      where: { id },
      data: updateData,
      include: { todoList: true },
    });

    await this.invalidateTodoCache(existing.todoListId, id);
    return result;
  }

  async delete(id: number): Promise<boolean> {
    const existing = await this.prisma.todo.findUnique({
      where: { id },
      select: { todoListId: true },
    });
    if (!existing) throw new NotFoundException('Todo not found');

    await this.prisma.todo.delete({ where: { id } });
    await this.invalidateTodoCache(existing.todoListId, id);
    return true;
  }

  // ─── Admin methods ──────────────────────────────────────

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
  ): void {
    const isSuperAdmin = callerRoles.includes('SUPERADMIN');
    const ownerIsAdmin =
      ownerRoles.includes('ADMIN') || ownerRoles.includes('SUPERADMIN');
    if (!isSuperAdmin && ownerIsAdmin) {
      throw new ForbiddenException(
        'Admins can only access todos of regular users',
      );
    }
  }

  async adminTodos(
    callerRoles: string[],
    todoListId: number,
  ): Promise<TodoWithList[]> {
    const ownerRoles = await this.getTodoListOwnerRoles(todoListId);
    this.assertAdminCanAccessOwner(callerRoles, ownerRoles);

    const cacheKey = this.getTodosCacheKey(todoListId);
    const cached = await this.cacheGet<TodoWithList[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.prisma.todo.findMany({
      where: { todoListId },
      include: { todoList: true },
    });

    await this.cacheSet(cacheKey, result);
    return result;
  }

  async adminCreateTodo(
    callerRoles: string[],
    input: CreateTodoInput,
  ): Promise<TodoWithList> {
    const ownerRoles = await this.getTodoListOwnerRoles(input.todoListId);
    this.assertAdminCanAccessOwner(callerRoles, ownerRoles);

    const result = await this.prisma.todo.create({
      data: input,
      include: { todoList: true },
    });

    await this.invalidateTodoCache(input.todoListId, result.id);
    return result;
  }

  async adminUpdateTodo(
    callerRoles: string[],
    todoId: number,
    input: UpdateTodoInput,
  ): Promise<TodoWithList> {
    const todo = await this.getTodoWithOwnerRoles(todoId);
    const ownerRoles = todo.todoList.user.userRoles.map((r) => r.role);
    this.assertAdminCanAccessOwner(callerRoles, ownerRoles);

    const existing = await this.prisma.todo.findUnique({
      where: { id: todoId },
      select: { todoListId: true },
    });
    if (!existing) throw new NotFoundException('Todo not found');

    const updateData = Object.fromEntries(
      Object.entries(input).filter(
        ([, value]) => value !== null && value !== undefined,
      ),
    );

    const result = await this.prisma.todo.update({
      where: { id: todoId },
      data: updateData,
      include: { todoList: true },
    });

    await this.invalidateTodoCache(existing.todoListId, todoId);
    return result;
  }

  async adminDeleteTodo(
    callerRoles: string[],
    todoId: number,
  ): Promise<boolean> {
    const todo = await this.getTodoWithOwnerRoles(todoId);
    const ownerRoles = todo.todoList.user.userRoles.map((r) => r.role);
    this.assertAdminCanAccessOwner(callerRoles, ownerRoles);

    const existing = await this.prisma.todo.findUnique({
      where: { id: todoId },
      select: { todoListId: true },
    });
    if (!existing) throw new NotFoundException('Todo not found');

    await this.prisma.todo.delete({ where: { id: todoId } });
    await this.invalidateTodoCache(existing.todoListId, todoId);
    return true;
  }

  async findAttachmentsByTodoId(todoId: number) {
    return this.prisma.fileObject.findMany({
      where: { todoId },
    });
  }
}
