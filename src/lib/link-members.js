const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const users = await prisma.user.findMany();
  const teams = await prisma.supportTeam.findMany();

  const assignments = {
    'IT-GROUP': ['Tạ Trung Kiên', 'System Admin'],
    'IT-APPLICATION': ['Nguyễn Văn An', 'Tạ Trung Kiên'],
    'IT-NETWORK': ['Vũ Minh Tuấn', 'Lê Hoàng Long'],
    'IT-SYSTEM': ['System Admin', 'Nguyễn Thành Sang (SANGNT)'],
    'IT-HELPDESK': ['Trần Văn Minh', 'Vũ Minh Tuấn'],
    'IT-SECURITY': ['Phạm Quốc Huy', 'System Admin'],
    'IT-HARDWARE': ['Trần Văn Minh', 'Lê Hoàng Long'],
  };

  for (const team of teams) {
    const userNames = assignments[team.code] || [];
    for (const name of userNames) {
      const user = users.find((u) => u.fullName.includes(name) || name.includes(u.fullName));
      if (user) {
        const exists = await prisma.teamMember.findFirst({ where: { teamId: team.id, userId: user.id } });
        if (!exists) {
          await prisma.teamMember.create({
            data: {
              teamId: team.id,
              userId: user.id,
              role: name.includes('Kiên') || name.includes('Admin') ? 'LEAD' : 'MEMBER',
            },
          });
          console.log(`Linked ${user.fullName} to team ${team.name}`);
        }
      }
    }
  }

  const updatedTeams = await prisma.supportTeam.findMany({
    include: { members: { include: { user: true } } },
  });

  console.log('--- ALL TEAM MEMBERS STATUS ---');
  for (const t of updatedTeams) {
    console.log(`[${t.code}] ${t.name}:`, t.members.map((m) => m.user.fullName));
  }
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
