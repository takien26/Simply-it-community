const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const teams = await prisma.supportTeam.findMany();
  const teamMap = {};
  teams.forEach((t) => {
    teamMap[t.code] = t;
  });

  const defaultRules = [
    {
      name: '1. Phần Mềm Nghiệp Vụ, ERP & Kế Toán',
      description: 'Tất cả yêu cầu liên quan đến ERP, Bravo, SAP, CRM, phần mềm kế toán tự động chuyển đến Application Team',
      priority: 10,
      targetTeamCode: 'IT-APPLICATION',
      conditions: [{ field: 'category', operator: 'equals', value: 'SOFTWARE' }],
    },
    {
      name: '2. Hạ Tầng Mạng, WiFi, VPN & Viễn Thông',
      description: 'Tất cả sự cố mất mạng, lỗi WiFi văn phòng, đứt kết nối VPN làm việc từ xa',
      priority: 15,
      targetTeamCode: 'IT-NETWORK',
      conditions: [{ field: 'category', operator: 'equals', value: 'NETWORK' }],
    },
    {
      name: '3. Bảo Trì Thiết Bị, Laptop, PC & Máy In',
      description: 'Hỏng hóc phần cứng, máy in kẹt giấy, thay thế linh kiện bàn phím màn hình',
      priority: 20,
      targetTeamCode: 'IT-HARDWARE',
      conditions: [{ field: 'category', operator: 'equals', value: 'HARDWARE' }],
    },
    {
      name: '4. Bản Quyền Phần Mềm, License & M365',
      description: 'Cấp phát license Microsoft 365, Mail Server, Windows bản quyền',
      priority: 25,
      targetTeamCode: 'IT-HELPDESK',
      conditions: [{ field: 'category', operator: 'equals', value: 'LICENSE' }],
    },
    {
      name: '5. An Toàn Thông Tin, Mã Độc & Bảo Mật',
      description: 'Cảnh báo virus, mã độc tống tiền, nghi vấn lộ lọt thông tin',
      priority: 5,
      targetTeamCode: 'IT-SECURITY',
      conditions: [{ field: 'category', operator: 'equals', value: 'SECURITY' }],
    },
    {
      name: '6. IT On-site Nhà Máy Chi nhánh Miền Nam & Chi nhánh Miền Trung',
      description: 'Hỗ trợ tại chỗ cho khối sản xuất nhà máy Đồng Nai & Bình Dương',
      priority: 12,
      targetTeamCode: 'IT-ONSITE',
      conditions: [{ field: 'companyName', operator: 'contains', value: 'Chi nhánh Miền Nam' }],
    },
  ];

  for (const r of defaultRules) {
    const team = teamMap[r.targetTeamCode] || teams[0];
    const existing = await prisma.routingRule.findFirst({ where: { name: r.name } });
    if (existing) {
      await prisma.routingRule.update({
        where: { id: existing.id },
        data: {
          name: r.name,
          description: r.description,
          priority: r.priority,
          targetTeamId: team.id,
          conditions: r.conditions,
          isActive: true,
        },
      });
      console.log(`Updated rule: ${r.name} -> ${team.name}`);
    } else {
      await prisma.routingRule.create({
        data: {
          name: r.name,
          description: r.description,
          priority: r.priority,
          targetTeamId: team.id,
          conditions: r.conditions,
          isActive: true,
          autoAssign: true,
        },
      });
      console.log(`Created rule: ${r.name} -> ${team.name}`);
    }
  }

  const allRules = await prisma.routingRule.findMany({
    include: { targetTeam: true },
    orderBy: { priority: 'asc' },
  });

  console.log('--- ALL RULES IN DB ---');
  for (const r of allRules) {
    console.log(`[P${r.priority}] ${r.name} -> ${r.targetTeam?.name}`);
  }
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
