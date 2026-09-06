const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Updating and standardizing IT Support Teams & Master Data...');

  const teamsData = [
    {
      code: 'IT-ALL',
      name: '⚡ Toàn Ban Công Nghệ Thông Tin (Tất cả đội ngũ IT)',
      description: 'Hàng đợi chung của toàn bộ Ban CNTT Tập đoàn',
      sortOrder: 1,
    },
    {
      code: 'IT-LEAD',
      name: 'Ban Lãnh Đạo CNTT (CIO / IT Director)',
      description: 'Phê duyệt kiến trúc, quy trình và dự án CNTT',
      sortOrder: 2,
    },
    {
      code: 'IT-HELPDESK',
      name: 'Hỗ Trợ Kỹ Thuật & Helpdesk L1/L2',
      description: 'Tiếp nhận, xử lý sự cố người dùng cuối, máy tính văn phòng, email, tài khoản',
      sortOrder: 3,
    },
    {
      code: 'IT-APPLICATION',
      name: 'Phần Mềm Nghiệp Vụ, ERP & Bravo (Application)',
      description: 'Xử lý các lỗi, phân quyền, dữ liệu phần mềm ERP, Bravo, SAP, CRM, Kế toán',
      sortOrder: 4,
    },
    {
      code: 'IT-NETWORK',
      name: 'Hạ Tầng Mạng & Viễn Thông (Network & Infra)',
      description: 'Xử lý mạng Internet, WiFi, Switch, Router, VPN, Tường lửa (Firewall), Tổng đài',
      sortOrder: 5,
    },
    {
      code: 'IT-SYSTEM',
      name: 'Quản Trị Hệ Thống & Cloud (System Admin)',
      description: 'Quản trị máy chủ Windows/Linux Server, Cloud Azure/AWS, ảo hóa VMware, Backup',
      sortOrder: 6,
    },
    {
      code: 'IT-SECURITY',
      name: 'An Toàn Thông Tin & Bảo Mật (Cybersecurity)',
      description: 'Bảo mật dữ liệu, phòng chống mã độc, kiểm soát virus, an ninh mạng',
      sortOrder: 7,
    },
    {
      code: 'IT-HARDWARE',
      name: 'Quản Lý Thiết Bị & Phần Cứng (Hardware & EUC)',
      description: 'Bảo trì, sửa chữa, thay thế linh kiện máy tính, máy in, scan, màn hình',
      sortOrder: 8,
    },
    {
      code: 'IT-ONSITE',
      name: 'Đội IT On-site Nhà Máy & Chi Nhánh (Factory IT)',
      description: 'Kỹ thuật viên trực tiếp hỗ trợ tại các nhà máy Chi nhánh Miền Nam, Chi nhánh Miền Trung, các cơ sở chi nhánh',
      sortOrder: 9,
    },
  ];

  // 1. Delete legacy / duplicate team codes if any (e.g. IT-GROUP -> migrate to IT-ALL)
  const legacyGroup = await prisma.supportTeam.findUnique({ where: { code: 'IT-GROUP' } });
  if (legacyGroup) {
    await prisma.routingRule.updateMany({
      where: { targetTeamId: legacyGroup.id },
      data: { targetTeamId: legacyGroup.id },
    });
    await prisma.supportTeam.update({
      where: { id: legacyGroup.id },
      data: { code: 'IT-ALL', name: teamsData[0].name, description: teamsData[0].description },
    });
  }

  // Upsert all teams
  const savedTeams = {};
  for (const t of teamsData) {
    const team = await prisma.supportTeam.upsert({
      where: { code: t.code },
      update: {
        name: t.name,
        description: t.description,
        sortOrder: t.sortOrder,
        isActive: true,
      },
      create: {
        code: t.code,
        name: t.name,
        description: t.description,
        sortOrder: t.sortOrder,
        isActive: true,
      },
    });
    savedTeams[t.code] = team;
    console.log(`✅ Upserted team: [${team.code}] ${team.name}`);
  }

  // 2. Load all users
  const allUsers = await prisma.user.findMany();
  const itUsers = allUsers.filter((u) => u.department?.includes('IT') || u.department?.includes('CNTT') || u.roleId);

  // Clear existing team members to rebuild clean mappings
  await prisma.teamMember.deleteMany({});

  // 3. Map members to teams
  const memberMappings = {
    'IT-ALL': itUsers.map((u) => u.id), // IT-ALL contains ALL IT users!
    'IT-LEAD': ['Tạ Trung Kiên', 'System Admin'],
    'IT-HELPDESK': ['Trần Văn Minh', 'Vũ Minh Tuấn'],
    'IT-APPLICATION': ['Nguyễn Văn An', 'Tạ Trung Kiên'],
    'IT-NETWORK': ['Vũ Minh Tuấn', 'Lê Hoàng Long'],
    'IT-SYSTEM': ['System Admin', 'Nguyễn Thành Sang (SANGNT)', 'SANGNT'],
    'IT-SECURITY': ['Phạm Quốc Huy', 'System Admin'],
    'IT-HARDWARE': ['Trần Văn Minh', 'Lê Hoàng Long'],
    'IT-ONSITE': ['Lê Hoàng Long'],
  };

  for (const [code, memberList] of Object.entries(memberMappings)) {
    const team = savedTeams[code];
    if (!team) continue;

    for (const item of memberList) {
      let targetUser = null;
      if (typeof item === 'string' && item.length > 30) {
        // UUID
        targetUser = allUsers.find((u) => u.id === item);
      } else {
        // Name
        targetUser = allUsers.find((u) => u.fullName.includes(item) || item.includes(u.fullName));
      }

      if (targetUser) {
        const existing = await prisma.teamMember.findFirst({
          where: { teamId: team.id, userId: targetUser.id },
        });
        if (!existing) {
          await prisma.teamMember.create({
            data: {
              teamId: team.id,
              userId: targetUser.id,
              role: targetUser.fullName.includes('Kiên') || targetUser.fullName.includes('Admin') ? 'LEAD' : 'MEMBER',
            },
          });
        }
      }
    }
  }

  // Also verify/create default Queues for all teams
  for (const t of Object.values(savedTeams)) {
    const existingQueue = await prisma.supportQueue.findFirst({ where: { teamId: t.id } });
    if (!existingQueue) {
      await prisma.supportQueue.create({
        data: {
          code: `Q-${t.code}`,
          name: `Hàng Đợi - ${t.name}`,
          teamId: t.id,
          isDefault: t.code === 'IT-ALL',
          isActive: true,
        },
      });
    }
  }

  console.log('🎉 Finished standardizing IT Teams & Members!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
