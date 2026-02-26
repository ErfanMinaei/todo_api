// users.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { hash } from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllUsers() {
    return this.prisma.user.findMany({
      include: { userRoles: true, todoLists: true },
    });
  }

  async getUserById(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { userRoles: true, todoLists: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async deleteUser(userId: number) {
    await this.prisma.user.delete({ where: { id: userId } });
    return true;
  }

  async promoteToAdmin(userId: number) {
    const user = await this.getUserById(userId);
    const alreadyAdmin = user.userRoles.some((r) => r.role === 'ADMIN');
    if (alreadyAdmin) return user;

    return this.prisma.userRole.create({
      data: { userId, role: 'ADMIN' },
    });
  }

  async createAdmin(input: {
    firstName: string;
    lastName?: string;
    username: string;
    password: string;
  }) {
    const hashedPassword = await hash(input.password, 10);
    const user = await this.prisma.user.create({
      data: {
        ...input,
        password: hashedPassword,
        userRoles: { create: { role: 'ADMIN' } },
      },
      include: { userRoles: true },
    });
    return user;
  }
}
