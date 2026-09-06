import { NextRequest, NextResponse } from 'next/server';
import { getActiveLicense, activateLicense, deactivateLicense } from '@/lib/license';

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
    const body = await req.json();
    const { key } = body;

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
    await deactivateLicense();
    return NextResponse.json({ success: true, message: 'Đã hủy bản quyền, chuyển về bản Community' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
