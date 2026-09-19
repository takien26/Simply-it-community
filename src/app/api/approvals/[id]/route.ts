import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';

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

    const approval = await prisma.approvalRequest.findUnique({
      where: { id },
      include: {
        requester: {
          select: { id: true, fullName: true, email: true, department: true, position: true, phone: true },
        },
        manager: {
          select: { id: true, fullName: true, email: true },
        },
        itApprover: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    if (!approval) {
      return NextResponse.json({ error: 'Không tìm thấy yêu cầu phê duyệt' }, { status: 404 });
    }

    const canView = currentUser.roleName === 'Admin' ||
      approval.requesterId === currentUser.userId ||
      approval.managerId === currentUser.userId ||
      approval.itApproverId === currentUser.userId ||
      (await hasPermission(currentUser.userId, 'approvals.view'));
    if (!canView) {
      return NextResponse.json({ error: 'Forbidden: Bạn không có quyền xem yêu cầu này' }, { status: 403 });
    }

    return NextResponse.json({ success: true, approval });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, title, description, justification, estimatedCost, linkedAssetId, linkedLicenseId } = body;

    const existing = await prisma.approvalRequest.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Không tìm thấy yêu cầu' }, { status: 404 });
    }

    const canEdit = currentUser.roleName === 'Admin' ||
      (await hasPermission(currentUser.userId, 'approvals.approve')) ||
      (existing.requesterId === currentUser.userId && (existing.status === 'DRAFT' || existing.status === 'PENDING_MANAGER'));
    if (!canEdit) {
      return NextResponse.json({ error: 'Forbidden: Bạn không có quyền chỉnh sửa yêu cầu này' }, { status: 403 });
    }

    if (status && status !== existing.status) {
      const canChangeStatus = currentUser.roleName === 'Admin' ||
        (await hasPermission(currentUser.userId, 'approvals.approve')) ||
        existing.managerId === currentUser.userId ||
        existing.itApproverId === currentUser.userId;
      if (!canChangeStatus) {
        return NextResponse.json({ error: 'Forbidden: Bạn không có quyền phê duyệt hoặc đổi trạng thái yêu cầu này' }, { status: 403 });
      }
    }

    const updated = await prisma.approvalRequest.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(justification !== undefined && { justification }),
        ...(estimatedCost !== undefined && { estimatedCost: Number(estimatedCost) }),
        ...(status && { status }),
        ...(linkedAssetId !== undefined && { linkedAssetId }),
        ...(linkedLicenseId !== undefined && { linkedLicenseId }),
        ...(status === 'DELIVERED' && { deliveredAt: new Date() }),
      },
    });

    return NextResponse.json({ success: true, approval: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
