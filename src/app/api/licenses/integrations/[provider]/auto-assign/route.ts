import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { executeAutoAssignM365 } from '@/lib/license-connectors/m365-auto-assign';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canAssign = currentUser.roleName === 'Admin' || (await hasPermission(currentUser.userId, 'licenses.assign'));
    if (!canAssign) {
      return NextResponse.json({ error: 'Forbidden: Bạn không có quyền tự động cấp phát license' }, { status: 403 });
    }

    const { provider } = await params;
    if (provider !== 'm365') {
      return NextResponse.json({ error: `Tự động phân bổ cho "${provider}" chưa được hỗ trợ.` }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = Boolean(body.dryRun);
    const autoReclaim = body.autoReclaim !== false; // Mặc định bật thu hồi tài khoản disabled

    const result = await executeAutoAssignM365({
      userId: currentUser.userId,
      dryRun,
      autoReclaim,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Lỗi xử lý tự động phân bổ' }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Lỗi khi tự động phân bổ M365:', err);
    return NextResponse.json({ error: err?.message || 'Lỗi xử lý tự động phân bổ' }, { status: 500 });
  }
}
