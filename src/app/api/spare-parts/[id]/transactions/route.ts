import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/spare-parts/[id]/transactions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const transactions = await prisma.sparePartTransaction.findMany({
      where: { sparePartId: id },
      include: {
        performedBy: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, transactions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/spare-parts/[id]/transactions (Stock In / Stock Out / Adjust)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { type, quantity, note, assetId, maintenanceLogId } = body;

    const qty = Math.abs(Number(quantity));
    if (!type || !qty || qty <= 0) {
      return NextResponse.json({ error: 'Số lượng và loại xuất nhập không hợp lệ' }, { status: 400 });
    }

    const part = await prisma.sparePart.findUnique({ where: { id } });
    if (!part) {
      return NextResponse.json({ error: 'Không tìm thấy phụ tùng' }, { status: 404 });
    }

    let newQuantity = part.quantity;
    if (type === 'IN') {
      newQuantity += qty;
    } else if (type === 'OUT') {
      if (part.quantity < qty) {
        return NextResponse.json({ error: `Số lượng tồn kho không đủ (Hiện còn: ${part.quantity} ${part.unit})` }, { status: 400 });
      }
      newQuantity -= qty;
    } else if (type === 'ADJUST') {
      newQuantity = qty; // Direct adjustment to this quantity
    }

    // Execute atomic transaction
    const [transaction, updatedPart] = await prisma.$transaction([
      prisma.sparePartTransaction.create({
        data: {
          sparePartId: id,
          type,
          quantity: type === 'OUT' ? -qty : qty,
          note: note || null,
          assetId: assetId || null,
          maintenanceLogId: maintenanceLogId || null,
          performedById: user.userId,
        },
        include: {
          performedBy: { select: { id: true, fullName: true, email: true } },
        },
      }),
      prisma.sparePart.update({
        where: { id },
        data: { quantity: newQuantity },
      }),
    ]);

    return NextResponse.json({ success: true, transaction, sparePart: updatedPart }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
