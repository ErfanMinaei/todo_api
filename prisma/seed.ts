import { PrismaClient } from '../generated/prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

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
        create: { role: 'SUPERADMIN' },
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
