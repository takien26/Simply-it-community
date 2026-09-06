import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { ApprovalStatus } from '@prisma/client';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { note } = body;

    const approval = await prisma.approvalRequest.findUnique({
      where: { id },
      include: {
        requester: true,
        manager: true,
      },
    });

    if (!approval) {
      return NextResponse.json({ error: 'Không tìm thấy yêu cầu' }, { status: 404 });
    }

    const isAdmin =
      currentUser.roleName === 'Admin' ||
      currentUser.roleName === 'Asset Manager' ||
      currentUser.roleName?.toLowerCase().includes('admin');

    let nextStatus: ApprovalStatus = approval.status;
    const updateData: any = {};

    // 1. Manager Approval Step
    if (approval.status === 'PENDING_MANAGER') {
      const isDirectManager = approval.managerId === currentUser.userId;
      if (!isDirectManager && !isAdmin) {
        return NextResponse.json({ error: 'Bạn không có quyền duyệt yêu cầu này' }, { status: 403 });
      }

      updateData.managerId = currentUser.userId;
      updateData.managerApprovedAt = new Date();
      updateData.managerNote = note || null;
      updateData.status = 'PENDING_IT'; // Advance to IT verification
      nextStatus = 'PENDING_IT';
    }
    // 2. IT Approval Step
    else if (approval.status === 'PENDING_IT') {
      if (!isAdmin) {
        return NextResponse.json({ error: 'Chỉ Quản trị viên IT mới có quyền phê duyệt cấp phát' }, { status: 403 });
      }

      updateData.itApproverId = currentUser.userId;
      updateData.itApprovedAt = new Date();
      updateData.itNote = note || null;
      updateData.status = 'APPROVED';
      nextStatus = 'APPROVED';
    } else {
      return NextResponse.json({ error: `Yêu cầu đang ở trạng thái "${approval.status}", không thể duyệt tiếp` }, { status: 400 });
    }

    const updated = await prisma.approvalRequest.update({
      where: { id },
      data: updateData,
    });

    // Send email notification on final approval
    if (nextStatus === 'APPROVED' && approval.requester?.email) {
      sendEmail({
        to: approval.requester.email,
        subject: `✅ [Đã Duyệt] Yêu cầu ${approval.code}: ${approval.title}`,
        html: `
          <h3>Yêu cầu của bạn đã được phê duyệt! 🎉</h3>
          <div class="highlight-box">
            <p><strong>Mã yêu cầu:</strong> ${approval.code}</p>
            <p><strong>Nội dung:</strong> ${approval.title}</p>
            <p><strong>Người duyệt:</strong> ${currentUser.email}</p>
            <p><strong>Ghi chú:</strong> ${note || 'Đồng ý cấp phát'}</p>
          </div>
          <p>Bộ phận IT sẽ sớm tiến hành chuẩn bị thiết bị/license và bàn giao cho bạn.</p>
        `,
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, approval: updated, nextStatus });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
