import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canUpdate = await hasPermission(currentUser.userId, 'assets.update');
    if (!canUpdate) {
      return NextResponse.json(
        { error: 'Forbidden: Bạn không có quyền bàn giao tài sản (assets.update)' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      assetIds,
      receiverId,
      docNumber,
      handoverDate,
      locationName,
      notes,
      itemSpecs, // Optional per-asset overrides { [assetId]: { condition, accessories } }
    } = body;

    if (!Array.isArray(assetIds) || assetIds.length === 0) {
      return NextResponse.json(
        { error: 'Vui lòng chọn ít nhất một tài sản để bàn giao' },
        { status: 400 }
      );
    }

    if (!receiverId) {
      return NextResponse.json(
        { error: 'Vui lòng chọn nhân viên tiếp nhận bàn giao' },
        { status: 400 }
      );
    }

    // Verify receiver exists
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
      select: { id: true, fullName: true, email: true, department: true, position: true, phone: true },
    });

    if (!receiver) {
      return NextResponse.json({ error: 'Không tìm thấy nhân viên tiếp nhận' }, { status: 404 });
    }

    const effectiveDate = handoverDate ? new Date(handoverDate) : new Date();
    const handoverNote = notes?.trim() || `Bàn giao hàng loạt theo biên bản ${docNumber || 'BBBG'}`;

    const updatedAssets: any[] = [];

    // Process each asset in a transaction
    await prisma.$transaction(async (tx) => {
      for (const assetId of assetIds) {
        const existingAsset = await tx.asset.findUnique({
          where: { id: assetId },
          select: { id: true, assetTag: true, name: true, status: true },
        });

        if (!existingAsset) continue;

        // 1. Close any active assignment for this asset
        await tx.assetAssignment.updateMany({
          where: { assetId, returnedAt: null },
          data: { returnedAt: effectiveDate },
        });

        // 2. Create new assignment for receiver
        const customItem = itemSpecs?.[assetId];
        const itemNote = customItem
          ? `${handoverNote} | Tình trạng: ${customItem.condition || 'Tốt'} | Phụ kiện: ${Array.isArray(customItem.accessories) ? customItem.accessories.join(', ') : (customItem.accessories || 'Chuẩn')}`
          : handoverNote;

        await tx.assetAssignment.create({
          data: {
            assetId,
            userId: receiverId,
            assignedById: currentUser.userId,
            assignedAt: effectiveDate,
            notes: itemNote,
          },
        });

        // 3. Update asset status to IN_USE
        const updated = await tx.asset.update({
          where: { id: assetId },
          data: {
            status: 'IN_USE',
          },
          select: { id: true, assetTag: true, name: true, status: true },
        });

        updatedAssets.push(updated);
      }
    });

    // Create audit logs asynchronously
    for (const asset of updatedAssets) {
      await createAuditLog({
        action: 'UPDATE',
        entityType: 'ASSET',
        entityId: asset.id,
        changes: {
          status: { old: 'AVAILABLE', new: 'IN_USE' },
          assignedTo: { new: receiver.fullName, docNumber },
        },
        userId: currentUser.userId,
      }).catch((e) => console.error('Bulk handover audit log error:', e));
    }

    return NextResponse.json({
      success: true,
      message: `Đã bàn giao thành công ${updatedAssets.length} thiết bị cho ${receiver.fullName}`,
      count: updatedAssets.length,
      receiver,
      docNumber,
    });
  } catch (error: any) {
    console.error('Bulk handover error:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi xử lý bàn giao hàng loạt' },
      { status: 500 }
    );
  }
}
