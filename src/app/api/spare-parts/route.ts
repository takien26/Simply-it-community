import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/spare-parts
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const lowStockOnly = searchParams.get('lowStock') === 'true';

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    const spareParts = await prisma.sparePart.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
        vendor: { select: { id: true, name: true } },
        location: { select: { id: true, name: true } },
        _count: { select: { transactions: true } },
      },
      orderBy: { name: 'asc' },
    });

    const filtered = lowStockOnly
      ? spareParts.filter((p) => p.quantity <= p.minStock)
      : spareParts;

    const stats = {
      totalItems: spareParts.length,
      totalQuantity: spareParts.reduce((sum, p) => sum + p.quantity, 0),
      lowStockCount: spareParts.filter((p) => p.quantity <= p.minStock).length,
      totalValue: spareParts.reduce((sum, p) => sum + p.quantity * (Number(p.unitPrice) || 0), 0),
    };

    return NextResponse.json({ success: true, spareParts: filtered, stats });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/spare-parts
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      sku,
      categoryId,
      quantity,
      minStock,
      unit,
      unitPrice,
      currency,
      vendorId,
      locationId,
      notes,
    } = body;

    if (!name) {
      return NextResponse.json({ error: 'Tên phụ tùng không được để trống' }, { status: 400 });
    }

    const part = await prisma.sparePart.create({
      data: {
        name,
        sku: sku?.trim() || null,
        categoryId: categoryId || null,
        quantity: Number(quantity) || 0,
        minStock: Number(minStock) || 5,
        unit: unit || 'cái',
        unitPrice: unitPrice ? Number(unitPrice) : null,
        currency: currency || 'VND',
        vendorId: vendorId || null,
        locationId: locationId || null,
        notes: notes || null,
      },
      include: {
        category: { select: { id: true, name: true } },
        vendor: { select: { id: true, name: true } },
        location: { select: { id: true, name: true } },
      },
    });

    // If initial quantity > 0, log initial IN transaction
    if (Number(quantity) > 0) {
      await prisma.sparePartTransaction.create({
        data: {
          sparePartId: part.id,
          type: 'IN',
          quantity: Number(quantity),
          note: 'Nhập kho khởi tạo ban đầu',
          performedById: user.userId,
        },
      });
    }

    return NextResponse.json({ success: true, sparePart: part }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
