import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserInput } from '../graphql';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) { }

  async findOne(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { todoLists: true },
    });
  }

  async findByUsername(username: string) {
    return this.prisma.user.findUnique({
      where: { username },
    });
  }

  async create(input: CreateUserInput) {
    const hashedPassword = await bcrypt.hash(input.password, 10);

    return this.prisma.user.create({
      data: {
        ...input,
        password: hashedPassword,
      },
    });
  }
}