import { prisma } from '../src/lib/db';

async function main() {
  const licenses = await prisma.license.findMany({
    select: {
      id: true,
      name: true,
      totalSeats: true,
      usedSeats: true,
      licenseKey: true,
      _count: { select: { assignments: { where: { revokedAt: null } } } }
    },
    orderBy: { name: 'asc' }
  });

  console.log('Current DB Licenses:');
  for (const l of licenses) {
    const free = l.totalSeats - l._count.assignments;
    console.log(`- ${l.name}: Used=${l._count.assignments}/${l.totalSeats} (Còn trống: ${free})`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
