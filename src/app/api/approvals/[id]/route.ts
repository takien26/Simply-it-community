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
    const { status, title, description, justification, estimatedCost, quantity, type, managerId, linkedAssetId, linkedLicenseId, attachments } = body;

    const existing = await prisma.approvalRequest.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Không tìm thấy yêu cầu' }, { status: 404 });
    }

    const hasNoApprovalsYet = !existing.managerApprovedAt && !existing.itApprovedAt;
    const isRequester = existing.requesterId === currentUser.userId;
    const isAdmin = currentUser.roleName === 'Admin' ||
      currentUser.roleName === 'Super Admin' ||
      currentUser.roleName === 'Asset Manager' ||
      currentUser.roleName?.toLowerCase().includes('admin');

    const canEdit = isAdmin ||
      (await hasPermission(currentUser.userId, 'approvals.approve')) ||
      (isRequester && hasNoApprovalsYet && (existing.status === 'DRAFT' || existing.status === 'PENDING_MANAGER' || existing.status === 'PENDING_IT'));
    if (!canEdit) {
      return NextResponse.json({ error: 'Forbidden: Bạn không có quyền chỉnh sửa yêu cầu này' }, { status: 403 });
    }

    let targetStatus = status;

    // Nếu người đề xuất chỉnh sửa Cấp trên duyệt khi chưa ai duyệt, cập nhật routing phù hợp
    if (!targetStatus && isRequester && hasNoApprovalsYet && managerId !== undefined) {
      if (existing.status === 'PENDING_MANAGER' || existing.status === 'PENDING_IT') {
        const safeManagerId = managerId && managerId !== currentUser.userId ? managerId : null;
        targetStatus = safeManagerId ? 'PENDING_MANAGER' : 'PENDING_IT';
      }
    }

    if (targetStatus && targetStatus !== existing.status) {
      const isRequesterCancelling = targetStatus === 'CANCELLED' && isRequester && hasNoApprovalsYet;
      const canChangeStatus = isAdmin ||
        (await hasPermission(currentUser.userId, 'approvals.approve')) ||
        existing.managerId === currentUser.userId ||
        existing.itApproverId === currentUser.userId ||
        isRequesterCancelling;
      if (!canChangeStatus) {
        return NextResponse.json({ error: 'Forbidden: Bạn không có quyền phê duyệt hoặc đổi trạng thái yêu cầu này' }, { status: 403 });
      }
    }

    // Xử lý đính kèm file trong description
    let finalDescription: string | null | undefined = undefined;
    if (description !== undefined || attachments !== undefined) {
      const baseDesc = description !== undefined ? description : existing.description;
      const cleanDesc = (baseDesc || '').replace(/<!-- ATTACHMENTS_JSON:[\s\S]*?-->/g, '').trim();
      if (attachments !== undefined) {
        if (Array.isArray(attachments) && attachments.length > 0) {
          finalDescription = `${cleanDesc}\n\n<!-- ATTACHMENTS_JSON: ${JSON.stringify(attachments)} -->`.trim();
        } else {
          finalDescription = cleanDesc || null;
        }
      } else {
        const match = (existing.description || '').match(/<!-- ATTACHMENTS_JSON:[\s\S]*?-->/);
        if (match) {
          finalDescription = `${cleanDesc}\n\n${match[0]}`.trim();
        } else {
          finalDescription = cleanDesc || null;
        }
      }
    }

    const safeManagerId = managerId !== undefined ? (managerId && managerId !== currentUser.userId ? managerId : null) : undefined;

    const updated = await prisma.approvalRequest.update({
      where: { id },
      data: {
        ...(title && { title: title.trim() }),
        ...(type && { type }),
        ...(quantity !== undefined && { quantity: Number(quantity) || 1 }),
        ...(finalDescription !== undefined && { description: finalDescription }),
        ...(justification !== undefined && { justification }),
        ...(estimatedCost !== undefined && { estimatedCost: estimatedCost ? Number(estimatedCost) : null }),
        ...(safeManagerId !== undefined && { managerId: safeManagerId }),
        ...(targetStatus && { status: targetStatus }),
        ...(linkedAssetId !== undefined && { linkedAssetId }),
        ...(linkedLicenseId !== undefined && { linkedLicenseId }),
        ...(targetStatus === 'DELIVERED' && { deliveredAt: new Date() }),
      },
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

    return NextResponse.json({ success: true, approval: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.approvalRequest.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Không tìm thấy yêu cầu' }, { status: 404 });
    }

    const isAdmin = currentUser.roleName === 'Admin' ||
      currentUser.roleName === 'Asset Manager' ||
      currentUser.roleName?.toLowerCase().includes('admin');

    const isRequester = existing.requesterId === currentUser.userId;
    const hasNoApprovalsYet = !existing.managerApprovedAt && !existing.itApprovedAt;

    // Cho phép người đề xuất xóa bỏ yêu cầu khi chưa có ai phê duyệt (hoặc Admin)
    if (!isAdmin && (!isRequester || !hasNoApprovalsYet)) {
      return NextResponse.json(
        { error: 'Forbidden: Bạn chỉ có thể hủy/xóa bỏ đề xuất do chính mình tạo khi chưa có ai phê duyệt' },
        { status: 403 }
      );
    }

    await prisma.approvalRequest.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Đã xóa bỏ đề xuất thành công' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
