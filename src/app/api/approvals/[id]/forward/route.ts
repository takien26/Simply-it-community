import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { hasPermission } from '@/lib/permissions';

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
    const { managerId, note } = body;

    if (!managerId) {
      return NextResponse.json({ error: 'Vui lòng chọn Cấp trên phê duyệt' }, { status: 400 });
    }

    const isAdmin =
      currentUser.roleName === 'Admin' ||
      currentUser.roleName === 'Asset Manager' ||
      currentUser.roleName?.toLowerCase().includes('admin') ||
      (await hasPermission(currentUser.userId, 'approvals.approve'));

    if (!isAdmin) {
      return NextResponse.json({ error: 'Chỉ Quản trị viên IT mới có quyền điều phối hoặc chuyển tiếp phê duyệt' }, { status: 403 });
    }

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

    // Verify manager target exists and is not requester
    if (managerId === approval.requesterId) {
      return NextResponse.json({ error: 'Không thể chọn chính người yêu cầu làm người duyệt' }, { status: 400 });
    }

    const targetManager = await prisma.user.findUnique({
      where: { id: managerId },
      select: { id: true, fullName: true, email: true, department: true, position: true },
    });

    if (!targetManager) {
      return NextResponse.json({ error: 'Không tìm thấy người quản lý được chọn' }, { status: 404 });
    }

    const itForwardNote = note
      ? `[IT chuyển Cấp trên duyệt]: ${note}`
      : `[IT chuyển Cấp trên duyệt]: Yêu cầu chuyển tới ${targetManager.fullName} xác nhận ngân sách.`;

    const updated = await prisma.approvalRequest.update({
      where: { id },
      data: {
        managerId,
        status: 'PENDING_MANAGER',
        managerApprovedAt: null,
        managerNote: null,
        itNote: approval.itNote ? `${approval.itNote}\n${itForwardNote}` : itForwardNote,
      },
      include: {
        requester: { select: { id: true, fullName: true, email: true, department: true } },
        manager: { select: { id: true, fullName: true, email: true, department: true } },
        itApprover: { select: { id: true, fullName: true, email: true } },
      },
    });

    // Notify the target manager via email
    if (targetManager.email) {
      sendEmail({
        to: targetManager.email,
        subject: `⏳ [Cần Phê Duyệt] ${approval.code}: ${approval.title} - Chuyển tiếp từ IT`,
        html: `
          <h3>Bạn có yêu cầu cấp phát thiết bị/tài nguyên cần phê duyệt</h3>
          <div style="background:#f8fafc;padding:16px;border-radius:12px;border:1px solid #e2e8f0;margin:16px 0;">
            <p><strong>Mã yêu cầu:</strong> ${approval.code}</p>
            <p><strong>Tiêu đề:</strong> ${approval.title}</p>
            <p><strong>Người yêu cầu:</strong> ${approval.requester?.fullName} (${approval.requester?.email})</p>
            <p><strong>Dự toán:</strong> ${approval.estimatedCost ? Number(approval.estimatedCost).toLocaleString('vi-VN') + ' ' + approval.currency : 'Không có'}</p>
            <p><strong>Ghi chú điều phối IT:</strong> ${note || 'Yêu cầu kiểm tra & phê duyệt ngân sách phòng ban.'}</p>
          </div>
          <p>Vui lòng đăng nhập vào hệ thống Simply IT để xem chi tiết và phê duyệt.</p>
        `,
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, approval: updated });
  } catch (error: any) {
    console.error('Forward approval error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
