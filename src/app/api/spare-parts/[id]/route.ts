import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function PUT(
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
    const {
      name,
      sku,
      categoryId,
      minStock,
      unit,
      unitPrice,
      currency,
      vendorId,
      locationId,
      notes,
    } = body;

    const updated = await prisma.sparePart.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(sku !== undefined && { sku: sku || null }),
        ...(categoryId !== undefined && { categoryId: categoryId || null }),
        ...(minStock !== undefined && { minStock: Number(minStock) }),
        ...(unit && { unit }),
        ...(unitPrice !== undefined && { unitPrice: unitPrice ? Number(unitPrice) : null }),
        ...(currency && { currency }),
        ...(vendorId !== undefined && { vendorId: vendorId || null }),
        ...(locationId !== undefined && { locationId: locationId || null }),
        ...(notes !== undefined && { notes: notes || null }),
      },
    });

    return NextResponse.json({ success: true, sparePart: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await prisma.sparePart.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
