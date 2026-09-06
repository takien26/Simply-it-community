import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

// GET /api/licenses/[id]
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
    const license = await prisma.license.findUnique({
      where: { id },
      include: {
        vendor: true,
        assignments: {
          include: {
            user: { select: { id: true, fullName: true, email: true, department: true } },
            asset: { select: { id: true, assetTag: true, name: true } },
            assignedBy: { select: { fullName: true } },
          },
          orderBy: { assignedAt: 'desc' },
        },
      },
    });

    if (!license) {
      return NextResponse.json({ error: 'License not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: license });
  } catch (error) {
    console.error('Get license error:', error);
    return NextResponse.json({ error: 'Failed to fetch license' }, { status: 500 });
  }
}

// PUT /api/licenses/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canUpdate = await hasPermission(currentUser.userId, 'licenses.update');
    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.license.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'License not found' }, { status: 404 });
    }

    let usedSeats = existing.usedSeats;
    if (Array.isArray(body.pairs)) {
      const validPairs = body.pairs.filter((p: any) => p.userId || p.assetId);
      // Delete old active assignments to replace with new assignment list
      await prisma.licenseAssignment.deleteMany({
        where: { licenseId: id },
      });
      // Create updated assignments
      for (const pair of validPairs) {
        await prisma.licenseAssignment.create({
          data: {
            licenseId: id,
            userId: pair.userId || null,
            assetId: pair.assetId || null,
            assignedById: currentUser.userId,
            assignedAt: pair.assignedAt ? new Date(pair.assignedAt) : new Date(),
            notes: pair.notes || 'Gán phân bổ sử dụng',
          },
        });
      }
      usedSeats = validPairs.length;
    }

    const updated = await prisma.license.update({
      where: { id },
      data: {
        name: body.name !== undefined ? body.name : existing.name,
        licenseKey: body.licenseKey !== undefined ? (body.licenseKey || null) : existing.licenseKey,
        licenseType: body.licenseType ?? existing.licenseType,
        totalSeats: body.totalSeats !== undefined && body.totalSeats !== '' ? Number(body.totalSeats) : existing.totalSeats,
        usedSeats: usedSeats,
        purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
        expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
        purchasePrice: body.purchasePrice !== undefined && body.purchasePrice !== '' && !isNaN(Number(body.purchasePrice)) ? Number(body.purchasePrice) : null,
        purchaseCurrency: body.purchaseCurrency !== undefined ? (body.purchaseCurrency || 'VND') : existing.purchaseCurrency,
        vendorId: body.vendorId ? body.vendorId : null,
        companyName: body.companyName !== undefined ? (body.companyName || null) : (existing as any).companyName,
        contractNumber: body.contractNumber !== undefined ? (body.contractNumber || null) : existing.contractNumber,
        invoiceNumber: body.invoiceNumber !== undefined ? (body.invoiceNumber || null) : existing.invoiceNumber,
        status: body.status ?? existing.status,
        specs: body.specs !== undefined ? body.specs : (existing as any).specs,
        notes: body.notes !== undefined ? (body.notes || null) : existing.notes,
      },
    });

    await createAuditLog({
      action: 'UPDATE',
      entityType: 'License',
      entityId: id,
      userId: currentUser.userId,
      changes: { before: existing, after: updated },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update license error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Update failed' }, { status: 500 });
  }
}

// DELETE /api/licenses/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canDelete = await hasPermission(currentUser.userId, 'licenses.delete');
    if (!canDelete) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    await prisma.license.delete({ where: { id } });

    await createAuditLog({
      action: 'DELETE',
      entityType: 'License',
      entityId: id,
      userId: currentUser.userId,
    });

    return NextResponse.json({ success: true, message: 'Đã xóa license' });
  } catch (error) {
    console.error('Delete license error:', error);
    return NextResponse.json({ error: 'Failed to delete license' }, { status: 500 });
  }
}
