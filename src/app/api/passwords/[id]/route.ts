import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const { id } = await params;
    const item = await prisma.passwordEntry.findUnique({
      where: { id },
      include: {
        asset: true,
        service: true,
        vendor: true,
        createdBy: { select: { id: true, fullName: true, email: true } },
      },
    });

    if (!item) return NextResponse.json({ error: 'Không tìm thấy tài khoản' }, { status: 404 });
    return NextResponse.json({ success: true, data: item });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    const updated = await prisma.passwordEntry.update({
      where: { id },
      data: {
        title: body.title !== undefined ? String(body.title).trim() : undefined,
        username: body.username !== undefined ? String(body.username).trim() : undefined,
        password: body.password !== undefined ? String(body.password) : undefined,
        url: body.url !== undefined ? String(body.url).trim() : undefined,
        category: body.category !== undefined ? body.category : undefined,
        groupName: body.groupName !== undefined ? String(body.groupName).trim() : undefined,
        companyName: body.companyName !== undefined ? String(body.companyName).trim() : undefined,
        assetId: body.assetId !== undefined ? body.assetId || null : undefined,
        serviceId: body.serviceId !== undefined ? body.serviceId || null : undefined,
        vendorId: body.vendorId !== undefined ? body.vendorId || null : undefined,
        isFavorite: body.isFavorite !== undefined ? Boolean(body.isFavorite) : undefined,
        totpSecret: body.totpSecret !== undefined ? String(body.totpSecret).trim() : undefined,
        notes: body.notes !== undefined ? String(body.notes).trim() : undefined,
      },
      include: {
        asset: { select: { id: true, assetTag: true, name: true } },
        service: { select: { id: true, serviceCode: true, name: true } },
        vendor: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const { id } = await params;
    await prisma.passwordEntry.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Đã xóa tài khoản mật khẩu' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
