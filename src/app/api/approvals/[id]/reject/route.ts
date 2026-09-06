import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';

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
    const { reason } = body;

    if (!reason || !reason.trim()) {
      return NextResponse.json({ error: 'Vui lòng cung cấp lý do từ chối yêu cầu' }, { status: 400 });
    }

    const approval = await prisma.approvalRequest.findUnique({
      where: { id },
      include: { requester: true },
    });

    if (!approval) {
      return NextResponse.json({ error: 'Không tìm thấy yêu cầu' }, { status: 404 });
    }

    const isAdmin =
      currentUser.roleName === 'Admin' ||
      currentUser.roleName === 'Asset Manager' ||
      currentUser.roleName?.toLowerCase().includes('admin');

    const isDirectManager = approval.managerId === currentUser.userId;

    if (!isDirectManager && !isAdmin) {
      return NextResponse.json({ error: 'Bạn không có quyền từ chối yêu cầu này' }, { status: 403 });
    }

    const updated = await prisma.approvalRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedBy: currentUser.userId,
        rejectedAt: new Date(),
        rejectedReason: reason.trim(),
      },
    });

    // Send email notification of rejection
    if (approval.requester?.email) {
      sendEmail({
        to: approval.requester.email,
        subject: `❌ [Từ Chối] Yêu cầu ${approval.code}: ${approval.title}`,
        html: `
          <h3>Yêu cầu của bạn đã bị từ chối ⚠️</h3>
          <div class="highlight-box">
            <p><strong>Mã yêu cầu:</strong> ${approval.code}</p>
            <p><strong>Nội dung:</strong> ${approval.title}</p>
            <p><strong>Người từ chối:</strong> ${currentUser.email}</p>
            <p><strong>Lý do từ chối:</strong> <span style="color: #dc2626;">${reason}</span></p>
          </div>
          <p>Nếu cần hỗ trợ thêm hoặc muốn làm rõ lý do, vui lòng liên hệ trực tiếp với người phê duyệt.</p>
        `,
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, approval: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
