import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';

// GET — List all support teams (with tree structure and members)
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let teams = await prisma.supportTeam.findMany({
      include: {
        parent: { select: { id: true, name: true, code: true } },
        children: { select: { id: true, name: true, code: true } },
        members: {
          include: {
            user: { select: { id: true, fullName: true, email: true, department: true, position: true, avatarUrl: true } },
          },
        },
        queues: { select: { id: true, name: true, code: true, isDefault: true, isActive: true } },
        _count: { select: { tickets: true, incidents: true, members: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    if (teams.length === 0) {
      // Auto-create standard enterprise IT teams
      const rootGroup = await prisma.supportTeam.upsert({
        where: { code: 'IT-GROUP' },
        update: {},
        create: {
          name: 'Ban Công Nghệ Thông Tin (IT Group)',
          code: 'IT-GROUP',
          description: 'Ban CNTT Tập đoàn - Quản lý và điều phối toàn bộ dịch vụ IT',
          sortOrder: 1,
        },
      });

      const standardTeams = [
        { code: 'IT-HELPDESK', name: 'Hỗ Trợ Kỹ Thuật & Helpdesk L1/L2', desc: 'Tiếp nhận yêu cầu ban đầu, hỗ trợ máy tính, máy in, phần mềm văn phòng', sort: 2, qCode: 'Q-HELPDESK', qName: 'Hàng Đợi Helpdesk & Hỗ Trợ Đầu Cuối' },
        { code: 'IT-SYSTEM', name: 'Quản Trị Hệ Thống & Cloud (System Admin)', desc: 'Quản trị máy chủ Server, Active Directory/Domain, Microsoft 365, Email, Sao lưu dữ liệu', sort: 3, qCode: 'Q-SYSTEM', qName: 'Hàng Đợi Máy Chủ, M365 & Hệ Thống' },
        { code: 'IT-NETWORK', name: 'Hạ Tầng Mạng & Viễn Thông (Network & Infra)', desc: 'Quản trị mạng WiFi, Switch, Router, Firewall, VPN, đường truyền Internet', sort: 4, qCode: 'Q-NETWORK', qName: 'Hàng Đợi Sự Cố Mạng & WiFi & VPN' },
        { code: 'IT-APPLICATION', name: 'Ứng Dụng Nghiệp Vụ, ERP & Bravo (Application)', desc: 'Hỗ trợ ERP (SAP/Bravo/FAST), phần mềm Kế toán, CRM, Hóa đơn điện tử, CSDL SQL', sort: 5, qCode: 'Q-APPLICATION', qName: 'Hàng Đợi Phần Mềm Nghiệp Vụ & ERP' },
        { code: 'IT-SECURITY', name: 'An Toàn Thông Tin & Bảo Mật (Cybersecurity)', desc: 'Quản lý Antivirus Endpoint (EDR), chính sách bảo mật, chống mã độc/Phishing', sort: 6, qCode: 'Q-SECURITY', qName: 'Hàng Đợi An Ninh & Cảnh Báo Mã Độc' },
        { code: 'IT-HARDWARE', name: 'Quản Lý Thiết Bị & Phần Cứng (Hardware & EUC)', desc: 'Sửa chữa phần cứng laptop, PC, thay thế linh kiện, bảo dưỡng máy in', sort: 7, qCode: 'Q-HARDWARE', qName: 'Hàng Đợi Sửa Chữa & Thay Thế Linh Kiện' },
        { code: 'IT-ONSITE', name: 'Đội IT On-site Nhà Máy & Chi Nhánh', desc: 'Hỗ trợ trực tiếp người dùng tại nhà máy, kho vận và văn phòng chi nhánh', sort: 8, qCode: 'Q-ONSITE', qName: 'Hàng Đợi IT On-site Chi Nhánh' },
        { code: 'IT-LEAD', name: 'Ban Lãnh Đạo CNTT (CIO / IT Director)', desc: 'Ban điều hành và quản lý chiến lược công nghệ thông tin', sort: 9, qCode: 'Q-LEAD', qName: 'Hàng Đợi Ban Lãnh Đạo CNTT' },
      ];

      for (const t of standardTeams) {
        const team = await prisma.supportTeam.upsert({
          where: { code: t.code },
          update: {},
          create: {
            code: t.code,
            name: t.name,
            description: t.desc,
            parentId: rootGroup.id,
            sortOrder: t.sort,
          },
        });

        await prisma.supportQueue.upsert({
          where: { code: t.qCode },
          update: {},
          create: {
            code: t.qCode,
            name: t.qName,
            teamId: team.id,
            isDefault: t.code === 'IT-HELPDESK',
          },
        });
      }

      teams = await prisma.supportTeam.findMany({
        include: {
          parent: { select: { id: true, name: true, code: true } },
          children: { select: { id: true, name: true, code: true } },
          members: {
            include: {
              user: { select: { id: true, fullName: true, email: true, department: true, position: true, avatarUrl: true } },
            },
          },
          queues: { select: { id: true, name: true, code: true, isDefault: true, isActive: true } },
          _count: { select: { tickets: true, incidents: true, members: true } },
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      });
    }

    return NextResponse.json({ success: true, data: teams });
  } catch (error) {
    console.error('List support teams error:', error);
    return NextResponse.json({ error: 'Failed to fetch support teams' }, { status: 500 });
  }
}

// POST — Create a new support team with members
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canManage = currentUser.roleName === 'Admin' || (await hasPermission(currentUser.userId, 'users.permissions')) || (await hasPermission(currentUser.userId, 'settings.update'));
    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden: Yêu cầu quyền Quản trị viên để tạo team' }, { status: 403 });
    }

    const body = await request.json();
    const { name, code, description, parentId, companyScope, locationScope, sortOrder, memberIds } = body;

    if (!name || !code) {
      return NextResponse.json({ error: 'Tên team và mã code không được để trống' }, { status: 400 });
    }

    const existing = await prisma.supportTeam.findUnique({ where: { code: code.toUpperCase() } });
    if (existing) {
      return NextResponse.json({ error: `Mã code "${code}" đã tồn tại` }, { status: 400 });
    }

    const team = await prisma.supportTeam.create({
      data: {
        name,
        code: code.toUpperCase(),
        description: description || null,
        parentId: parentId || null,
        companyScope: companyScope || null,
        locationScope: locationScope || null,
        sortOrder: sortOrder || 0,
        isActive: true,
      },
    });

    // Create default queue for new team
    await prisma.supportQueue.create({
      data: {
        name: `Hàng Đợi - ${team.name}`,
        code: `Q-${team.code}`,
        teamId: team.id,
        isDefault: false,
        isActive: true,
      },
    });

    // Add members if provided
    if (Array.isArray(memberIds) && memberIds.length > 0) {
      for (const uid of memberIds) {
        await prisma.teamMember.create({
          data: {
            teamId: team.id,
            userId: uid,
            role: 'MEMBER',
          },
        });
      }
    }

    const fullTeam = await prisma.supportTeam.findUnique({
      where: { id: team.id },
      include: {
        parent: true,
        children: true,
        members: { include: { user: true } },
        queues: true,
      },
    });

    return NextResponse.json({ success: true, data: fullTeam }, { status: 201 });
  } catch (error) {
    console.error('Create support team error:', error);
    return NextResponse.json({ error: 'Failed to create support team' }, { status: 500 });
  }
}

// PUT — Update support team, scopes & members
export async function PUT(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canManage = currentUser.roleName === 'Admin' || (await hasPermission(currentUser.userId, 'users.permissions')) || (await hasPermission(currentUser.userId, 'settings.update'));
    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden: Yêu cầu quyền Quản trị viên để sửa team' }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, code, description, parentId, companyScope, locationScope, sortOrder, isActive, memberIds } = body;

    if (!id) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (code !== undefined) updateData.code = code.toUpperCase();
    if (description !== undefined) updateData.description = description;
    if (parentId !== undefined) updateData.parentId = parentId || null;
    if (companyScope !== undefined) updateData.companyScope = companyScope || null;
    if (locationScope !== undefined) updateData.locationScope = locationScope || null;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    if (isActive !== undefined) updateData.isActive = !!isActive;

    const team = await prisma.supportTeam.update({
      where: { id },
      data: updateData,
    });

    // Update members if memberIds array is provided
    if (Array.isArray(memberIds)) {
      await prisma.teamMember.deleteMany({ where: { teamId: id } });
      for (const uid of memberIds) {
        await prisma.teamMember.create({
          data: {
            teamId: id,
            userId: uid,
            role: 'MEMBER',
          },
        });
      }
    }

    const fullTeam = await prisma.supportTeam.findUnique({
      where: { id: team.id },
      include: {
        parent: true,
        children: true,
        members: { include: { user: { select: { id: true, fullName: true, position: true } } } },
        queues: true,
      },
    });

    return NextResponse.json({ success: true, data: fullTeam });
  } catch (error) {
    console.error('Update support team error:', error);
    return NextResponse.json({ error: 'Failed to update support team' }, { status: 500 });
  }
}

// DELETE — Delete support team
export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canManage = currentUser.roleName === 'Admin' || (await hasPermission(currentUser.userId, 'users.permissions')) || (await hasPermission(currentUser.userId, 'settings.update'));
    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden: Yêu cầu quyền Quản trị viên để xóa team' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
    }

    const team = await prisma.supportTeam.findUnique({ where: { id } });
    if (team?.code === 'IT-ALL') {
      return NextResponse.json({ error: 'Không thể xóa Team IT tổng thể của hệ thống' }, { status: 400 });
    }

    await prisma.supportTeam.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Support team deleted' });
  } catch (error) {
    console.error('Delete support team error:', error);
    return NextResponse.json({ error: 'Failed to delete support team' }, { status: 500 });
  }
}
