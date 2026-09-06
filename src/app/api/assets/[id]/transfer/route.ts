import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

// GET /api/assets/[id]/transfer - Get assignment history and current active assignment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const asset = await prisma.asset.findUnique({
      where: { id },
      select: {
        id: true,
        assetTag: true,
        name: true,
        brand: true,
        model: true,
        serialNumber: true,
        status: true,
        condition: true,
        companyName: true,
        locationId: true,
        location: { select: { id: true, name: true } },
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Không tìm thấy tài liệu/thiết bị' }, { status: 404 });
    }

    const assignments = await prisma.assetAssignment.findMany({
      where: { assetId: id },
      include: {
        user: { select: { id: true, fullName: true, email: true, department: true, position: true, companyName: true } },
        assignedBy: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { assignedAt: 'desc' },
    });

    const activeAssignment = assignments.find((a) => !a.returnedAt) || null;

    return NextResponse.json({
      success: true,
      data: {
        asset,
        activeAssignment,
        history: assignments,
      },
    });
  } catch (error) {
    console.error('Get transfer history error:', error);
    return NextResponse.json({ error: 'Lỗi khi tải lịch sử điều chuyển' }, { status: 500 });
  }
}

// POST /api/assets/[id]/transfer - Transfer asset to new user or return to warehouse
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canUpdate = await hasPermission(currentUser.userId, 'assets.update');
    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden: Bạn không có quyền điều chuyển tài sản' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const {
      toUserId, // Target user ID (or empty/null for warehouse return)
      transferDate,
      condition,
      locationId,
      companyName,
      notes,
    } = body;

    const asset = await prisma.asset.findUnique({
      where: { id },
      include: {
        assignments: {
          where: { returnedAt: null },
          include: { user: true },
        },
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Không tìm thấy thiết bị' }, { status: 404 });
    }

    const currentAssignment = asset.assignments[0] || null;
    const effectiveDate = transferDate ? new Date(transferDate) : new Date();

    // 1. If currently assigned, mark active assignment as returned / transferred
    if (currentAssignment) {
      await prisma.assetAssignment.update({
        where: { id: currentAssignment.id },
        data: {
          returnedAt: effectiveDate,
          notes: currentAssignment.notes
            ? `${currentAssignment.notes}\n[Điều chuyển ${effectiveDate.toLocaleDateString('vi-VN')}]: ${notes || 'Bàn giao cho người mới/Kho'}`
            : `[Điều chuyển ${effectiveDate.toLocaleDateString('vi-VN')}]: ${notes || 'Bàn giao cho người mới/Kho'}`,
        },
      });
    }

    let newStatus = 'AVAILABLE';

    // 2. If target user provided -> create new assignment
    if (toUserId && toUserId.trim() !== '') {
      await prisma.assetAssignment.create({
        data: {
          assetId: id,
          userId: toUserId,
          assignedById: currentUser.userId,
          assignedAt: effectiveDate,
          notes: notes || null,
        },
      });
      newStatus = 'IN_USE';
    }

    // 3. Update asset status, condition, location, company
    const updatedAsset = await prisma.asset.update({
      where: { id },
      data: {
        status: newStatus as any,
        condition: condition || asset.condition,
        locationId: locationId !== undefined ? (locationId || null) : asset.locationId,
        companyName: companyName !== undefined ? (companyName || null) : asset.companyName,
      },
      include: {
        location: true,
        assignments: {
          include: {
            user: { select: { id: true, fullName: true, email: true, department: true } },
            assignedBy: { select: { fullName: true } },
          },
          orderBy: { assignedAt: 'desc' },
        },
      },
    });

    // 4. Audit Log
    await createAuditLog({
      userId: currentUser.userId,
      action: toUserId ? 'ASSIGN' : 'REVOKE',
      entityType: 'ASSET',
      entityId: id,
      changes: {
        fromUser: currentAssignment?.user?.fullName || 'Kho thiết bị',
        toUser: toUserId ? updatedAsset.assignments[0]?.user?.fullName : 'Kho thiết bị (Thu hồi)',
        notes,
      },
    });

    return NextResponse.json({
      success: true,
      message: toUserId ? 'Điều chuyển thiết bị thành công' : 'Thu hồi thiết bị về kho thành công',
      data: updatedAsset,
    });
  } catch (error) {
    console.error('Transfer asset error:', error);
    return NextResponse.json({ error: 'Lỗi khi thực hiện điều chuyển' }, { status: 500 });
  }
}
