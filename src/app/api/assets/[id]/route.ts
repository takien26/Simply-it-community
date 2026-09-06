import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

// GET /api/assets/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const asset = await prisma.asset.findUnique({
      where: { id },
      include: {
        category: true,
        vendor: true,
        location: true,
        assignments: {
          include: {
            user: { select: { id: true, fullName: true, email: true, department: true } },
            assignedBy: { select: { fullName: true } },
          },
          orderBy: { assignedAt: 'desc' },
        },
        licenseAssignments: {
          where: { revokedAt: null },
          include: {
            license: { select: { id: true, name: true, licenseType: true, expiryDate: true, status: true } },
          },
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
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: asset });
  } catch (error) {
    console.error('Get asset error:', error);
    return NextResponse.json({ error: 'Failed to fetch asset' }, { status: 500 });
  }
}

// PUT /api/assets/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canUpdate = await hasPermission(currentUser.userId, 'assets.update');
    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden: Missing assets.update permission' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.asset.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    const { assignedUserId, assignedLicenseIds } = body;

    let newStatus = body.status ?? existing.status;

    if (assignedUserId !== undefined) {
      if (assignedUserId === '') {
        // Unassign
        await prisma.assetAssignment.updateMany({
          where: { assetId: id, returnedAt: null },
          data: { returnedAt: new Date() },
        });
        if (!body.status) newStatus = 'AVAILABLE';
      } else {
        // Check current active assignment
        const active = await prisma.assetAssignment.findFirst({
          where: { assetId: id, returnedAt: null },
        });

        if (!active || active.userId !== assignedUserId) {
          // Return old assignment
          await prisma.assetAssignment.updateMany({
            where: { assetId: id, returnedAt: null },
            data: { returnedAt: new Date() },
          });
          // Create new assignment
          await prisma.assetAssignment.create({
            data: {
              assetId: id,
              userId: assignedUserId,
              assignedById: currentUser.userId,
              assignedAt: new Date(),
              notes: 'Cập nhật gán trực tiếp',
            },
          });
        }
        if (!body.status) newStatus = 'IN_USE';
      }
    }

    // Handle License Assignments for this Asset
    if (assignedLicenseIds !== undefined && Array.isArray(assignedLicenseIds)) {
      const activeLicenseAssignments = await prisma.licenseAssignment.findMany({
        where: { assetId: id, revokedAt: null },
      });

      const currentAssignedLicIds = activeLicenseAssignments.map((la) => la.licenseId);
      const targetLicIds: string[] = assignedLicenseIds;

      // 1. Revoke removed licenses
      for (const la of activeLicenseAssignments) {
        if (!targetLicIds.includes(la.licenseId)) {
          await prisma.licenseAssignment.update({
            where: { id: la.id },
            data: { revokedAt: new Date() },
          });
          await prisma.license.update({
            where: { id: la.licenseId },
            data: { usedSeats: { decrement: 1 } },
          });
        }
      }

      // 2. Add newly selected licenses
      for (const licId of targetLicIds) {
        if (!currentAssignedLicIds.includes(licId)) {
          await prisma.licenseAssignment.create({
            data: {
              assetId: id,
              licenseId: licId,
              userId: assignedUserId || null,
              assignedById: currentUser.userId,
              assignedAt: new Date(),
              notes: 'Gán bản quyền cho máy tính',
            },
          });
          await prisma.license.update({
            where: { id: licId },
            data: { usedSeats: { increment: 1 } },
          });
        }
      }
    }

    let newAssetTag = existing.assetTag;
    if (body.assetTag && body.assetTag.trim()) {
      const cleanTag = body.assetTag.trim().toUpperCase();
      if (cleanTag !== existing.assetTag) {
        const duplicate = await prisma.asset.findUnique({ where: { assetTag: cleanTag } });
        if (duplicate && duplicate.id !== id) {
          return NextResponse.json(
            { error: `Mã tài sản (Mã Tag) "${cleanTag}" đã được sử dụng cho thiết bị khác` },
            { status: 400 }
          );
        }
        newAssetTag = cleanTag;
      }
    }

    const updated = await prisma.asset.update({
      where: { id },
      data: {
        assetTag: newAssetTag,
        name: body.name !== undefined ? body.name : existing.name,
        categoryId: body.categoryId ? body.categoryId : existing.categoryId,
        brand: body.brand !== undefined ? (body.brand || null) : existing.brand,
        model: body.model !== undefined ? (body.model || null) : existing.model,
        serialNumber: body.serialNumber !== undefined ? (body.serialNumber || null) : existing.serialNumber,
        status: newStatus,
        condition: body.condition ?? existing.condition,
        purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
        purchasePrice: (() => {
          if (body.purchasePrice === undefined || body.purchasePrice === null || body.purchasePrice === '') return null;
          let rawStr = String(body.purchasePrice).trim();
          if (rawStr.includes('.') && !rawStr.includes(',')) {
            rawStr = rawStr.replace(/\./g, '');
          } else if (rawStr.includes(',')) {
            rawStr = rawStr.replace(/\./g, '').replace(',', '.');
          }
          const clean = rawStr.replace(/[^0-9.-]+/g, '');
          const num = parseFloat(clean);
          return !isNaN(num) ? num : null;
        })(),
        purchaseCurrency: body.purchaseCurrency !== undefined ? (body.purchaseCurrency || 'VND') : existing.purchaseCurrency,
        warrantyExpiry: body.warrantyExpiry ? new Date(body.warrantyExpiry) : null,
        companyName: body.companyName !== undefined ? (body.companyName || null) : existing.companyName,
        vendorId: body.vendorId ? body.vendorId : null,
        locationId: body.locationId ? body.locationId : null,
        contractNumber: body.contractNumber !== undefined ? (body.contractNumber || null) : existing.contractNumber,
        invoiceNumber: body.invoiceNumber !== undefined ? (body.invoiceNumber || null) : existing.invoiceNumber,
        specs: (() => {
          const baseSpecs = body.specs !== undefined ? { ...(body.specs as any) } : { ...(existing.specs as any) };
          if (body.exchangeRate !== undefined) {
            baseSpecs.exchangeRate = Number(body.exchangeRate) || 1;
          }
          return Object.keys(baseSpecs).length > 0 ? baseSpecs : (existing.specs ?? undefined);
        })(),
        notes: body.notes !== undefined ? (body.notes || null) : existing.notes,
      },
    });

    await createAuditLog({
      action: 'UPDATE',
      entityType: 'Asset',
      entityId: id,
      userId: currentUser.userId,
      changes: { before: existing, after: updated },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update asset error:', error);
    return NextResponse.json({ error: 'Failed to update asset' }, { status: 500 });
  }
}

// DELETE /api/assets/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canDelete = await hasPermission(currentUser.userId, 'assets.delete');
    if (!canDelete) {
      return NextResponse.json({ error: 'Forbidden: Missing assets.delete permission' }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.asset.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Revoke any active licenses assigned to this asset
    const activeLicAssignments = await prisma.licenseAssignment.findMany({
      where: { assetId: id, revokedAt: null },
    });
    for (const la of activeLicAssignments) {
      await prisma.licenseAssignment.update({
        where: { id: la.id },
        data: { revokedAt: new Date() },
      });
      await prisma.license.update({
        where: { id: la.licenseId },
        data: { usedSeats: { decrement: 1 } },
      });
    }

    await prisma.asset.delete({ where: { id } });

    await createAuditLog({
      action: 'DELETE',
      entityType: 'Asset',
      entityId: id,
      userId: currentUser.userId,
      changes: { deleted: existing },
    });

    return NextResponse.json({ success: true, message: 'Asset deleted successfully' });
  } catch (error) {
    console.error('Delete asset error:', error);
    return NextResponse.json({ error: 'Failed to delete asset' }, { status: 500 });
  }
}
