import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Root IT Group
    const rootGroup = await prisma.supportTeam.upsert({
      where: { code: 'IT-GROUP' },
      update: { name: 'Ban Công Nghệ Thông Tin (IT Group)', description: 'Ban CNTT Tập đoàn - Quản lý và điều phối toàn bộ dịch vụ IT' },
      create: {
        name: 'Ban Công Nghệ Thông Tin (IT Group)',
        code: 'IT-GROUP',
        description: 'Ban CNTT Tập đoàn - Quản lý và điều phối toàn bộ dịch vụ IT',
        sortOrder: 1,
      },
    });

    // 2. Standard 6 Enterprise Teams
    const teamsConfig = [
      {
        code: 'IT-HELPDESK',
        name: 'IT Helpdesk & Hỗ trợ Người dùng (L1)',
        description: 'Tiếp nhận yêu cầu ban đầu, hỗ trợ máy tính, máy in, phần mềm văn phòng, cấp phát thiết bị',
        sortOrder: 2,
        queueCode: 'Q-HELPDESK',
        queueName: 'Hàng Đợi Helpdesk & Hỗ Trợ Đầu Cuối',
      },
      {
        code: 'IT-NETWORK',
        name: 'Hạ tầng Mạng & Viễn thông (Network)',
        description: 'Quản trị mạng WiFi, Switch, Router, Firewall, VPN, đường truyền Internet, Camera an ninh',
        sortOrder: 3,
        queueCode: 'Q-NETWORK',
        queueName: 'Hàng Đợi Sự Cố Mạng & WiFi & VPN',
      },
      {
        code: 'IT-SYSTEM',
        name: 'Quản trị Hệ thống & Cloud (System Admin)',
        description: 'Quản trị máy chủ Server, Active Directory/Domain, Microsoft 365, Email, Sao lưu dữ liệu (Backup)',
        sortOrder: 4,
        queueCode: 'Q-SYSTEM',
        queueName: 'Hàng Đợi Máy Chủ, M365 & Hệ Thống',
      },
      {
        code: 'IT-APPLICATION',
        name: 'Phần mềm Nghiệp vụ & ERP (Applications)',
        description: 'Hỗ trợ ERP (SAP/Bravo/FAST), phần mềm Kế toán, CRM, Hóa đơn điện tử, Chữ ký số, CSDL SQL',
        sortOrder: 5,
        queueCode: 'Q-APPLICATION',
        queueName: 'Hàng Đợi Phần Mềm Nghiệp Vụ & ERP',
      },
      {
        code: 'IT-SECURITY',
        name: 'An toàn & Bảo mật Thông tin (Cybersecurity)',
        description: 'Quản lý Antivirus Endpoint (EDR), chính sách bảo mật, chống mã độc/Phishing, cấp quyền bảo mật',
        sortOrder: 6,
        queueCode: 'Q-SECURITY',
        queueName: 'Hàng Đợi An Ninh & Cảnh Báo Mã Độc',
      },
      {
        code: 'IT-HARDWARE',
        name: 'Bảo trì Phần cứng & Thiết bị (Hardware Repair)',
        description: 'Sửa chữa phần cứng laptop, PC, thay thế linh kiện (RAM/SSD), bảo dưỡng máy in, máy chiếu phòng họp',
        sortOrder: 7,
        queueCode: 'Q-HARDWARE',
        queueName: 'Hàng Đợi Sửa Chữa & Thay Thế Linh Kiện',
      },
    ];

    const createdTeams: Record<string, any> = {};
    const createdQueues: Record<string, any> = {};

    for (const t of teamsConfig) {
      const team = await prisma.supportTeam.upsert({
        where: { code: t.code },
        update: {
          name: t.name,
          description: t.description,
          parentId: rootGroup.id,
          sortOrder: t.sortOrder,
        },
        create: {
          code: t.code,
          name: t.name,
          description: t.description,
          parentId: rootGroup.id,
          sortOrder: t.sortOrder,
        },
      });
      createdTeams[t.code] = team;

      const queue = await prisma.supportQueue.upsert({
        where: { code: t.queueCode },
        update: {
          name: t.queueName,
          teamId: team.id,
          isDefault: t.code === 'IT-HELPDESK',
        },
        create: {
          code: t.queueCode,
          name: t.queueName,
          teamId: team.id,
          isDefault: t.code === 'IT-HELPDESK',
        },
      });
      createdQueues[t.code] = queue;
    }

    // 3. Standard Enterprise Routing Rules
    const standardRules = [
      {
        name: '1. Phần Mềm Nghiệp Vụ, ERP & Kế Toán',
        description: 'Tất cả yêu cầu liên quan đến ERP, Bravo, SAP, CRM, phần mềm kế toán tự động chuyển đến Application Team',
        priority: 10,
        teamCode: 'IT-APPLICATION',
        queueCode: 'IT-APPLICATION',
        conditions: [
          { field: 'category', operator: 'equals', value: 'SOFTWARE' },
        ],
      },
      {
        name: '2. Hạ Tầng Mạng, WiFi & Kết Nối VPN',
        description: 'Sự cố mất mạng, WiFi chập chờn, VPN từ xa, Firewall chặn trang web chuyển đến Network Team',
        priority: 20,
        teamCode: 'IT-NETWORK',
        queueCode: 'IT-NETWORK',
        conditions: [
          { field: 'category', operator: 'equals', value: 'NETWORK' },
        ],
      },
      {
        name: '3. Cảnh Báo Bảo Mật, Virus & Phishing',
        description: 'Nghi vấn lừa đảo, máy tính nhiễm mã độc/virus, yêu cầu quét bảo mật chuyển đến Security Team',
        priority: 30,
        teamCode: 'IT-SECURITY',
        queueCode: 'IT-SECURITY',
        conditions: [
          { field: 'category', operator: 'in', value: 'SECURITY,ACCESS_REQUEST' },
        ],
      },
      {
        name: '4. Bản Quyền M365, Mail Server & Tài Khoản',
        description: 'Cấp quyền bản quyền Office 365, hòm thư email, tài khoản Domain/Active Directory chuyển đến System Team',
        priority: 40,
        teamCode: 'IT-SYSTEM',
        queueCode: 'IT-SYSTEM',
        conditions: [
          { field: 'category', operator: 'equals', value: 'LICENSE' },
        ],
      },
      {
        name: '5. Sửa Chữa Phần Cứng, Máy In & Linh Kiện',
        description: 'Sự cố hỏng phần cứng, máy in kẹt giấy, nâng cấp RAM/SSD, màn hình chuyển đến Hardware Repair Team',
        priority: 50,
        teamCode: 'IT-HARDWARE',
        queueCode: 'IT-HARDWARE',
        conditions: [
          { field: 'category', operator: 'equals', value: 'HARDWARE' },
        ],
      },
    ];

    for (const r of standardRules) {
      const targetTeam = createdTeams[r.teamCode];
      const targetQueue = createdQueues[r.queueCode];

      if (targetTeam) {
        const existingRule = await prisma.routingRule.findFirst({
          where: { name: r.name },
        });

        if (existingRule) {
          await prisma.routingRule.update({
            where: { id: existingRule.id },
            data: {
              description: r.description,
              priority: r.priority,
              targetTeamId: targetTeam.id,
              targetQueueId: targetQueue?.id || null,
              conditions: r.conditions,
              autoAssign: true,
              isActive: true,
            },
          });
        } else {
          await prisma.routingRule.create({
            data: {
              name: r.name,
              description: r.description,
              priority: r.priority,
              targetTeamId: targetTeam.id,
              targetQueueId: targetQueue?.id || null,
              conditions: r.conditions,
              autoAssign: true,
              isActive: true,
            },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Khởi tạo thành công bộ Teams chuẩn doanh nghiệp, Queues và Routing Rules!',
      teams: Object.values(createdTeams).map((t: any) => ({ name: t.name, code: t.code })),
    });
  } catch (error: any) {
    console.error('Seed standard support org error:', error);
    return NextResponse.json({ error: 'Failed to seed standard support org: ' + error.message }, { status: 500 });
  }
}
