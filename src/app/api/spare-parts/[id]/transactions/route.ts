import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission, isAdminOrAbove } from '@/lib/permissions';
import { dispatchWebhookEvent } from '@/lib/webhooks';

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

    const rawTransactions = await prisma.sparePartTransaction.findMany({
      where: { sparePartId: id },
      include: {
        performedBy: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Enrich with asset data if assetId is set
    const assetIds = Array.from(new Set(rawTransactions.map((t) => t.assetId).filter(Boolean))) as string[];
    let assetMap: Record<string, any> = {};
    if (assetIds.length > 0) {
      try {
        const assets = await prisma.asset.findMany({
          where: { id: { in: assetIds } },
          select: {
            id: true,
            assetTag: true,
            name: true,
            model: true,
            assignments: {
              where: { returnedAt: null },
              select: { user: { select: { id: true, fullName: true, email: true, department: true } } },
              take: 1,
            },
          },
        });
        assetMap = Object.fromEntries(assets.map((a) => [a.id, a]));
      } catch (e) {
        console.error('Error fetching assets for transactions:', e);
      }
    }

    const transactions = rawTransactions.map((t) => ({
      ...t,
      asset: t.assetId ? assetMap[t.assetId] || null : null,
    }));

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

    const canManage = isAdminOrAbove(user.roleName) || (await hasPermission(user.userId, 'spare_parts.manage'));
    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden: Bạn không có quyền nhập/xuất kho linh kiện' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const {
      type,
      quantity,
      note,
      assetId,
      createMaintenanceLog,
      maintenanceType,
      targetDescription,
    } = body;

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

    let finalMaintenanceLogId: string | null = body.maintenanceLogId || null;

    // If stock-out for an asset and maintenance log creation requested:
    if (type === 'OUT' && assetId && createMaintenanceLog) {
      try {
        const mType = (maintenanceType as any) || 'UPGRADE';
        const mLog = await prisma.assetMaintenanceLog.create({
          data: {
            assetId,
            type: mType,
            title: `Xuất linh kiện: ${part.name} (x${qty} ${part.unit})`,
            description: targetDescription || note || `Xuất ${qty} ${part.unit} "${part.name}" (SKU: ${part.sku || 'N/A'}) cho thiết bị.`,
            cost: part.unitPrice ? Number(part.unitPrice) * qty : undefined,
            costCurrency: part.currency || 'VND',
            performedAt: new Date(),
            performedById: user.userId,
            notes: note || undefined,
          },
        });
        finalMaintenanceLogId = mLog.id;
      } catch (err) {
        console.error('Failed to create AssetMaintenanceLog:', err);
      }
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
          maintenanceLogId: finalMaintenanceLogId,
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

    // Nếu số lượng sau khi xuất kho chạm hoặc dưới ngưỡng an toàn, kích hoạt webhook cảnh báo khẩn cấp
    if (type === 'OUT' && newQuantity <= part.minStock) {
      dispatchWebhookEvent('spare_part.low_stock', {
        name: part.name,
        sku: part.sku || 'N/A',
        remaining: newQuantity,
        minStock: part.minStock,
        unit: part.unit,
        performedBy: user.fullName || user.email,
        link: '/spare-parts?lowStock=true',
      }).catch((err) => console.error('Failed to dispatch spare_part.low_stock webhook:', err));
    }

    return NextResponse.json({ success: true, transaction, sparePart: updatedPart }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
