import { PrismaClient } from '../generated/prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { hash } from 'bcrypt';
import 'dotenv/config';

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function seed() {
  const hashedPassword = await hash('SuperAdmin123!', 10);

  await prisma.user.upsert({
    where: { username: 'superadmin' },
    update: {},
    create: {
      firstName: 'Super',
      lastName: 'Admin',
      username: 'superadmin',
      password: hashedPassword,
      userRoles: {
        create: [{ role: 'SUPERADMIN' }, { role: 'ADMIN' }, { role: 'USER' }],
      },
    },
  });
  console.log('Superadmin created successfully');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
