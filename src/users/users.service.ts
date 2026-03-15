import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { hash } from 'bcrypt';
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
