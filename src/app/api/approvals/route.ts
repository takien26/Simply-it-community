import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ApprovalStatus, ApprovalType } from '@prisma/client';
import { sendEmail } from '@/lib/email';
import { broadcastRealtimeEvent } from '@/lib/realtime';

// GET /api/approvals
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as ApprovalStatus | null;
    const type = searchParams.get('type') as ApprovalType | null;
    const search = searchParams.get('search') || '';

    const isAdmin =
      currentUser.roleName === 'Admin' ||
      currentUser.roleName === 'Asset Manager' ||
      currentUser.roleName?.toLowerCase().includes('admin');

    const where: any = {};

    // Non-admin can only see:
    // 1. Requests they created
    // 2. Requests waiting for their approval as manager
    if (!isAdmin) {
      where.OR = [
        { requesterId: currentUser.userId },
        { managerId: currentUser.userId },
      ];
    }

    if (status) where.status = status;
    if (type) where.type = type;
    if (search) {
      where.AND = [
        {
          OR: [
            { code: { contains: search, mode: 'insensitive' } },
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const approvals = await prisma.approvalRequest.findMany({
      where,
      include: {
        requester: {
          select: { id: true, fullName: true, email: true, department: true, position: true },
        },
        manager: {
          select: { id: true, fullName: true, email: true },
        },
        itApprover: {
          select: { id: true, fullName: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, approvals });
  } catch (error: any) {
    console.error('Approvals GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/approvals
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      type,
      title,
      description,
      justification,
      estimatedCost,
      currency,
      quantity,
      managerId,
    } = body;

    if (!title || !type) {
      return NextResponse.json({ error: 'Tiêu đề và loại yêu cầu không được để trống' }, { status: 400 });
    }

    const currentYear = new Date().getFullYear();
    const count = await prisma.approvalRequest.count();
    const code = `AR-${currentYear}-${String(count + 1).padStart(4, '0')}`;

    // If requester has a direct manager, status is PENDING_MANAGER, otherwise PENDING_IT
    const initialStatus: ApprovalStatus = managerId ? 'PENDING_MANAGER' : 'PENDING_IT';

    const approval = await prisma.approvalRequest.create({
      data: {
        code,
        type,
        status: initialStatus,
        title,
        description: description || null,
        justification: justification || null,
        estimatedCost: estimatedCost ? Number(estimatedCost) : null,
        currency: currency || 'VND',
        quantity: quantity ? Number(quantity) : 1,
        requesterId: currentUser.userId,
        managerId: managerId || null,
      },
      include: {
        requester: { select: { id: true, fullName: true, email: true } },
        manager: { select: { id: true, fullName: true, email: true } },
      },
    });

    // Send email notification to Manager or IT
    (async () => {
      try {
        const targetEmail = approval.manager?.email;
        if (targetEmail) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          const approvalLink = `${appUrl}/approvals`;
          await sendEmail({
            to: targetEmail,
            templateCode: 'approval.pending',
            data: {
              approverName: approval.manager?.fullName || 'Quản lý',
              approvalCode: approval.code,
              requesterName: approval.requester?.fullName || 'Nhân viên',
              approvalType: approval.type,
              title: approval.title,
              justification: approval.justification || 'Không có',
              link: approvalLink,
              approvalLink: approvalLink,
            },
          });
        }
      } catch (e) {
        console.error('[Approval Email error]:', e);
      }
    })();

    // Broadcast real-time SSE event
    broadcastRealtimeEvent({
      type: 'APPROVAL_REQUESTED',
      title: `📋 Yêu cầu cấp máy mới: ${approval.code}`,
      message: `${approval.requester?.fullName || 'Nhân viên'} gửi yêu cầu: "${approval.title}"`,
      data: { approvalId: approval.id, code: approval.code },
    });

    return NextResponse.json({ success: true, approval }, { status: 201 });
  } catch (error: any) {
    console.error('Approvals POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
