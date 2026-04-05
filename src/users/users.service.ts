import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { hash, compare } from 'bcrypt';
import { PrismaClientKnownRequestError } from 'generated/prisma/internal/prismaNamespace';
import { User, UserRole } from 'generated/prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private formatUser(user: User & { userRoles?: UserRole[] }) {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName ?? '',
      username: user.username,
      roles: user.userRoles?.map((ur) => ur.role) || ['USER'],
    };
  }

  async getAllUsers(callerRoles: string[]) {
    const isSuperAdmin = callerRoles.includes('SUPERADMIN');

    const users = await this.prisma.user.findMany({
      where: isSuperAdmin
        ? undefined
        : {
            userRoles: {
              every: { role: 'USER' },
              none: { role: { in: ['ADMIN', 'SUPERADMIN'] } },
            },
          },
      include: { userRoles: true },
    });

    return users.map((user) => this.formatUser(user));
  }

  async deleteUser(userId: number) {
    await this.prisma.user.delete({ where: { id: userId } });
    return true;
  }

  async updateUser(
    callerRoles: string[],
    targetUserId: number,
    input: {
      firstName?: string;
      lastName?: string;
      username?: string;
      newPassword?: string;
    },
  ) {
    const isSuperAdmin = callerRoles.includes('SUPERADMIN');
    const isAdmin = callerRoles.includes('ADMIN');

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      include: { userRoles: true },
    });
    if (!targetUser) throw new NotFoundException('User not found');

    const targetRoles = new Set(targetUser.userRoles.map((ur) => ur.role));
    const targetIsAdmin = targetRoles.has('ADMIN');

    if (isAdmin && !isSuperAdmin && targetIsAdmin) {
      throw new ForbiddenException('Admins can only edit regular users');
    }

    const updateData: Partial<User> = {};
    if (input.firstName !== undefined) updateData.firstName = input.firstName;
    if (input.lastName !== undefined) updateData.lastName = input.lastName;
    if (input.username !== undefined) updateData.username = input.username;
    if (input.newPassword)
      updateData.password = await hash(input.newPassword, 10);

    try {
      const updated = await this.prisma.user.update({
        where: { id: targetUserId },
        data: updateData,
        include: { userRoles: true },
      });
      console.log('updated user:', JSON.stringify(updated)); // add this
      return this.formatUser(updated);
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Username already exists');
      }
      throw e;
    }
  }

  async deleteSelf(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { userRoles: true },
    });

    if (!user) throw new NotFoundException('User not found');

    const isSuperAdmin = user.userRoles.some((ur) => ur.role === 'SUPERADMIN');
    if (isSuperAdmin) {
      throw new ForbiddenException(
        'SuperAdmin cannot delete their own account',
      );
    }

    await this.prisma.user.delete({ where: { id: userId } });
    return true;
  }

  async updateSelf(
    userId: number,
    input: {
      firstName?: string;
      lastName?: string;
      username?: string;
      currentPassword?: string;
      newPassword?: string;
    },
  ) {
    if (input.newPassword) {
      if (!input.currentPassword) {
        throw new UnauthorizedException(
          'Current password is required to set a new password',
        );
      }

      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new NotFoundException('User not found');

      const isMatch = await compare(input.currentPassword, user.password);
      if (!isMatch) {
        throw new UnauthorizedException('Current password is incorrect');
      }
    }

    const updateData: Partial<User> = {};
    if (input.firstName !== undefined) updateData.firstName = input.firstName;
    if (input.lastName !== undefined) updateData.lastName = input.lastName;
    if (input.username !== undefined) updateData.username = input.username;
    if (input.newPassword) {
      updateData.password = await hash(input.newPassword, 10);
    }

    try {
      const updated = await this.prisma.user.update({
        where: { id: userId },
        data: updateData,
        include: { userRoles: true },
      });
      return this.formatUser(updated);
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Username already exists');
      }
      throw e;
    }
  }

  async demoteFromAdmin(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { userRoles: true },
    });

    if (!user) throw new NotFoundException('User not found');

    const hasAdminRole = user.userRoles.some((r) => r.role === 'ADMIN');

    if (!hasAdminRole) {
      throw new ConflictException('User is not an admin');
    }

    await this.prisma.userRole.delete({
      where: {
        userId_role: {
          userId,
          role: 'ADMIN',
        },
      },
    });

    const updated = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { userRoles: true },
    });

    return this.formatUser(updated!);
  }

  async promoteToAdmin(userId: number) {
    await this.prisma.userRole.upsert({
      where: { userId_role: { userId, role: 'ADMIN' } },
      create: { userId, role: 'ADMIN' },
      update: {},
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { userRoles: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return this.formatUser(user);
  }

  async createAdmin(input: {
    firstName: string;
    lastName?: string;
    username: string;
    password: string;
  }) {
    const hashedPassword = await hash(input.password, 10);

    try {
      const user = await this.prisma.user.create({
        data: {
          ...input,
          password: hashedPassword,
          userRoles: {
            create: [{ role: 'ADMIN' }, { role: 'USER' }],
          },
        },
        include: { userRoles: true },
      });
      return {
        ...user,
        roles: user.userRoles.map((r) => r.role),
      };
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Username already exists');
      }
      throw e;
    }
  }
}
