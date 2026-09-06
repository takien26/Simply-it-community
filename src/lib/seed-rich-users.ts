import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Updating and enriching Enterprise Users & IT Staff...');

  const passwordHash = await bcrypt.hash('Admin@123', 10);

  // 1. Get or create roles
  let adminRole = await prisma.role.findFirst({ where: { name: 'Admin' } });
  let managerRole = await prisma.role.findFirst({ where: { name: 'Asset Manager' } });
  let staffRole = await prisma.role.findFirst({ where: { name: 'Staff' } });
  let ticketIssueRole = await prisma.role.findFirst({ where: { name: 'Ticket Issue' } });

  if (!adminRole) adminRole = await prisma.role.create({ data: { name: 'Admin', description: 'Toàn quyền quản trị' } });
  if (!managerRole) managerRole = await prisma.role.create({ data: { name: 'Asset Manager', description: 'Quản lý tài sản & IT' } });
  if (!staffRole) staffRole = await prisma.role.create({ data: { name: 'Staff', description: 'Nhân viên người dùng' } });

  // 2. Define rich realistic enterprise users
  const richUsers = [
    // --- IT LEADERSHIP & SPECIALISTS ---
    {
      email: 'kien.ta-trung@company.local',
      fullName: 'Tạ Trung Kiên',
      position: 'Trưởng Ban CNTT / IT Lead',
      department: 'Ban Công Nghệ Thông Tin (IT / CNTT) / Ban Lãnh Đạo CNTT (CIO / IT Director)',
      companyName: 'Tập đoàn Công nghệ Mẫu',
      phone: '0912345670',
      roleId: adminRole.id,
    },
    {
      email: 'admin@company.com',
      fullName: 'System Admin',
      position: 'Quản Trị Viên Hệ Thống',
      department: 'Ban Công Nghệ Thông Tin (IT / CNTT) / Quản Trị Hệ Thống & Cloud (System Admin)',
      companyName: 'Tập đoàn Công nghệ Mẫu',
      phone: '0912345671',
      roleId: adminRole.id,
    },
    {
      email: 'an.nguyen@company.local',
      fullName: 'Nguyễn Văn An',
      position: 'Chuyên viên ERP & Phần mềm nghiệp vụ',
      department: 'Ban Công Nghệ Thông Tin (IT / CNTT) / Ứng Dụng Nghiệp Vụ, ERP & Bravo (Application)',
      companyName: 'Công ty Cổ phần Công nghệ ABC',
      phone: '0912345672',
      roleId: managerRole.id,
    },
    {
      email: 'sang.nguyen@company.local',
      fullName: 'Nguyễn Thành Sang (SANGNT)',
      position: 'Chuyên viên Hệ thống & Máy chủ',
      department: 'Ban Công Nghệ Thông Tin (IT / CNTT) / Quản Trị Hệ Thống & Cloud (System Admin)',
      companyName: 'Công ty Cổ phần Công nghệ ABC',
      phone: '0912345673',
      roleId: ticketIssueRole ? ticketIssueRole.id : staffRole.id,
    },
    {
      email: 'tuan.vu@company.local',
      fullName: 'Vũ Minh Tuấn',
      position: 'Kỹ sư Hạ tầng Mạng & Viễn thông',
      department: 'Ban Công Nghệ Thông Tin (IT / CNTT) / Hạ Tầng Mạng & Viễn Thông (Network & Infra)',
      companyName: 'Tập đoàn Công nghệ Mẫu',
      phone: '0912345674',
      roleId: managerRole.id,
    },
    {
      email: 'minh.tran@company.local',
      fullName: 'Trần Văn Minh',
      position: 'Kỹ thuật viên Helpdesk L1/L2',
      department: 'Ban Công Nghệ Thông Tin (IT / CNTT) / Hỗ Trợ Kỹ Thuật & Helpdesk L1/L2',
      companyName: 'Tập đoàn Công nghệ Mẫu',
      phone: '0912345675',
      roleId: managerRole.id,
    },
    {
      email: 'long.le@company.local',
      fullName: 'Lê Hoàng Long',
      position: 'Kỹ thuật viên IT On-site Nhà máy Chi nhánh Miền Nam',
      department: 'Ban Công Nghệ Thông Tin (IT / CNTT) / Đội IT On-site Nhà Máy & Chi Nhánh',
      companyName: 'Chi nhánh Miền Nam',
      phone: '0912345676',
      roleId: staffRole.id,
    },
    {
      email: 'huy.pham@company.local',
      fullName: 'Phạm Quốc Huy',
      position: 'Chuyên viên An toàn thông tin & SOC',
      department: 'Ban Công Nghệ Thông Tin (IT / CNTT) / An Toàn Thông Tin & Bảo Mật (Cybersecurity)',
      companyName: 'Tập đoàn Công nghệ Mẫu',
      phone: '0912345677',
      roleId: managerRole.id,
    },

    // --- BUSINESS DEPARTMENTS (END USERS) ---
    {
      email: 'bao.dang@company.local',
      fullName: 'Đặng Quốc Bảo',
      position: 'Phó Tổng Giám Đốc',
      department: 'Ban Giám Đốc & HĐQT / Văn Phòng Tổng Giám Đốc',
      companyName: 'Tập đoàn Công nghệ Mẫu',
      phone: '0901234561',
      roleId: staffRole.id,
    },
    {
      email: 'mai.tran@company.local',
      fullName: 'Trần Thị Mai',
      position: 'Kế toán trưởng',
      department: 'Khối Tài Chính & Kế Toán / Kế Toán Tổng Hợp',
      companyName: 'Công ty Cổ phần Công nghệ ABC',
      phone: '0901234562',
      roleId: staffRole.id,
    },
    {
      email: 'thang.pham@company.local',
      fullName: 'Phạm Đức Thắng',
      position: 'Trưởng phòng Kinh doanh',
      department: 'Khối Kinh Doanh & Thị Trường / Kinh Doanh Nội Địa',
      companyName: 'Chi nhánh Miền Nam',
      phone: '0901234563',
      roleId: staffRole.id,
    },
    {
      email: 'linh.hoang@company.local',
      fullName: 'Hoàng Thùy Linh',
      position: 'Chuyên viên Truyền thông & Thương hiệu',
      department: 'Ban Marketing & Truyền Thông / Thương Hiệu & Truyền Thông Nội Bộ',
      companyName: 'Tập đoàn Công nghệ Mẫu',
      phone: '0901234564',
      roleId: staffRole.id,
    },
    {
      email: 'nam.le@company.local',
      fullName: 'Lê Hoàng Nam',
      position: 'Kỹ sư Thiết kế & R&D',
      department: 'Ban Quản Lý Dự Án & Kỹ Thuật',
      companyName: 'Chi nhánh Miền Trung',
      phone: '0901234565',
      roleId: staffRole.id,
    },
    {
      email: 'huong.nguyen@company.local',
      fullName: 'Nguyễn Thu Hương',
      position: 'Trưởng phòng Nhân sự & Tuyển dụng',
      department: 'Khối Nhân Sự & Hành Chính / Tuyển Dụng & Đào Tạo',
      companyName: 'Trung tâm Nghiên cứu & Phát triển R&D',
      phone: '0901234566',
      roleId: staffRole.id,
    },
  ];

  for (const u of richUsers) {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: u.email },
          { fullName: u.fullName },
        ],
      },
    });

    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          fullName: u.fullName,
          position: u.position,
          department: u.department,
          companyName: u.companyName,
          phone: u.phone,
          roleId: u.roleId,
          isActive: true,
        },
      });
      console.log(`✅ Updated user: ${u.fullName} (${u.department})`);
    } else {
      await prisma.user.create({
        data: {
          email: u.email,
          fullName: u.fullName,
          position: u.position,
          department: u.department,
          companyName: u.companyName,
          phone: u.phone,
          roleId: u.roleId,
          passwordHash,
          isActive: true,
        },
      });
      console.log(`✅ Created user: ${u.fullName} (${u.department})`);
    }
  }

  // 3. Link IT Users to their Support Teams
  const teams = await prisma.supportTeam.findMany();
  const allUsers = await prisma.user.findMany();

  const teamMappings: Record<string, string[]> = {
    'IT-HELPDESK': ['minh.tran@company.local', 'tuan.vu@company.local', 'kien.ta-trung@company.local'],
    'IT-APPLICATION': ['an.nguyen@company.local', 'kien.ta-trung@company.local'],
    'IT-NETWORK': ['tuan.vu@company.local', 'long.le@company.local'],
    'IT-SYSTEM': ['admin@company.com', 'sang.nguyen@company.local'],
    'IT-SECURITY': ['huy.pham@company.local', 'admin@company.com'],
    'IT-HARDWARE': ['minh.tran@company.local', 'long.le@company.local'],
  };

  for (const team of teams) {
    const emails = teamMappings[team.code] || [];
    for (const email of emails) {
      const user = allUsers.find((u) => u.email === email);
      if (user) {
        const existingMember = await prisma.teamMember.findFirst({
          where: { teamId: team.id, userId: user.id },
        });
        if (!existingMember) {
          await prisma.teamMember.create({
            data: {
              teamId: team.id,
              userId: user.id,
              role: email === 'kien.ta-trung@company.local' ? 'LEAD' : 'MEMBER',
            },
          });
          console.log(`🔗 Linked ${user.fullName} to team ${team.name}`);
        }
      }
    }
  }

  console.log('🎉 Finished enriching Enterprise Users!');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
