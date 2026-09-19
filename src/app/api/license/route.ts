import { NextRequest, NextResponse } from 'next/server';
import { getActiveLicense, activateLicense, deactivateLicense } from '@/lib/license';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const license = await getActiveLicense();
    return NextResponse.json(license);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    if (user.roleName !== 'Admin') {
      return NextResponse.json({ error: 'Chỉ Quản trị viên mới có quyền kích hoạt bản quyền' }, { status: 403 });
    }

    const body = await req.json();
    const key = body.key || body.licenseKey;

    if (!key) {
      return NextResponse.json({ error: 'Vui lòng cung cấp mã License Key' }, { status: 400 });
    }

    const result = await activateLicense(key);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, license: result.license });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi xử lý kích hoạt' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    if (user.roleName !== 'Admin') {
      return NextResponse.json({ error: 'Chỉ Quản trị viên mới có quyền hủy bản quyền' }, { status: 403 });
    }

    await deactivateLicense();
    return NextResponse.json({ success: true, message: 'Đã hủy bản quyền, chuyển về bản Community' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
