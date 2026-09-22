import { prisma } from '../src/lib/db';

async function main() {
  // Update Business Standard (no Teams) to 15 seats
  const bsNoTeams = await prisma.license.findFirst({
    where: {
      OR: [
        { licenseKey: '5a1c7b8d-0739-4ca8-bf69-ec87e69133ac' },
        { name: { contains: 'no Teams', mode: 'insensitive' } }
      ]
    }
  });
  if (bsNoTeams) {
    await prisma.license.update({
      where: { id: bsNoTeams.id },
      data: { totalSeats: 15 }
    });
    console.log('Updated Microsoft 365 Business Standard (no Teams) to 15 total seats.');
  }

  // Update Exchange Online (Plan 1) to 30 seats
  const exchangeP1 = await prisma.license.findFirst({
    where: {
      OR: [
        { licenseKey: '4b9405b0-7788-4568-add1-99614e613b69' },
        { name: { equals: 'Exchange Online (Plan 1)', mode: 'insensitive' } }
      ]
    }
  });
  if (exchangeP1) {
    await prisma.license.update({
      where: { id: exchangeP1.id },
      data: { totalSeats: 30 }
    });
    console.log('Updated Exchange Online (Plan 1) to 30 total seats.');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
