import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tag: string }> }
) {
  try {
    const { tag } = await params;
    const decodedTag = decodeURIComponent(tag);

    const asset = await prisma.asset.findFirst({
      where: {
        OR: [
          { id: decodedTag.includes('-') && decodedTag.length === 36 ? decodedTag : undefined },
          { assetTag: decodedTag },
          { serialNumber: decodedTag },
        ].filter(Boolean) as any,
      },
      include: {
        category: true,
        vendor: true,
        location: true,
        assignments: {
          include: {
            user: { select: { id: true, fullName: true, email: true, department: true } },
          },
          orderBy: { assignedAt: 'desc' },
        },
        maintenanceLogs: {
          include: {
            performedBy: { select: { fullName: true } },
            vendor: { select: { name: true } },
          },
          orderBy: { performedAt: 'desc' },
        },
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Không tìm thấy thiết bị với mã này' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: asset });
  } catch (error) {
    console.error('Scan API error:', error);
    return NextResponse.json({ error: 'Lỗi tra cứu thông tin thiết bị' }, { status: 500 });
  }
}
