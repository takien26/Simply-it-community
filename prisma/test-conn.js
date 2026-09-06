const { PrismaClient } = require('@prisma/client');

const passwords = ['postgres', '123456', 'admin', 'root', '12345678', 'password', '123', 'postgres123', 'Kien@123', 'Admin@123'];

async function test() {
  for (const p of passwords) {
    process.env.DATABASE_URL = `postgresql://postgres:${encodeURIComponent(p)}@localhost:5432/postgres?schema=public`;
    const prisma = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL } }
    });
    try {
      await prisma.$queryRaw`SELECT 1;`;
      console.log('SUCCESS_PASSWORD:' + p);
      await prisma.$disconnect();
      return;
    } catch (e) {
      await prisma.$disconnect();
    }
  }
  console.log('NO_MATCH');
}

test();
