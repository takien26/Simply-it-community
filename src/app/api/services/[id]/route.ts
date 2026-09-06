import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const { id } = await params;
    const service = await prisma.iTService.findUnique({
      where: { id },
      include: {
        vendor: true,
        location: true,
        documents: {
          orderBy: { documentDate: 'desc' },
        },
        createdBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    if (!service) {
      return NextResponse.json({ error: 'Không tìm thấy dịch vụ' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: service });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const canUpdate = await hasPermission(user.userId, 'services.update');
    if (!canUpdate && user.roleName !== 'Admin') {
      return NextResponse.json({ error: 'Bạn không có quyền sửa dịch vụ' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    const {
      serviceCode,
      name,
      serviceType,
      status,
      billingCycle,
      cost,
      currency,
      startDate,
      renewalDate,
      expiryDate,
      accountNumber,
      contractNumber,
      invoiceNumber,
      vendorId,
      companyName,
      locationId,
      contactSupport,
      specs,
      contractUrl,
      notes,
    } = body;

    // Check existing
    const existing = await prisma.iTService.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Không tìm thấy dịch vụ để cập nhật' }, { status: 404 });
    }

    if (serviceCode && serviceCode.trim() !== existing.serviceCode) {
      const dup = await prisma.iTService.findUnique({ where: { serviceCode: serviceCode.trim() } });
      if (dup && dup.id !== id) {
        return NextResponse.json({ error: `Mã dịch vụ "${serviceCode}" đã được sử dụng bởi dịch vụ khác` }, { status: 400 });
      }
    }

    const updated = await prisma.iTService.update({
      where: { id },
      data: {
        serviceCode: serviceCode !== undefined ? serviceCode.trim() : existing.serviceCode,
        name: name !== undefined ? name.trim() : existing.name,
        serviceType: serviceType !== undefined ? serviceType : existing.serviceType,
        status: status !== undefined ? status : existing.status,
        billingCycle: billingCycle !== undefined ? billingCycle : existing.billingCycle,
        cost: cost !== undefined ? (cost ? parseFloat(String(cost).replace(/[^0-9.-]+/g, '')) : null) : existing.cost,
        currency: currency !== undefined ? currency : existing.currency,
        startDate: startDate !== undefined ? (startDate ? new Date(startDate) : null) : existing.startDate,
        renewalDate: renewalDate !== undefined ? (renewalDate ? new Date(renewalDate) : null) : existing.renewalDate,
        expiryDate: expiryDate !== undefined ? (expiryDate ? new Date(expiryDate) : null) : existing.expiryDate,
        accountNumber: accountNumber !== undefined ? (accountNumber ? accountNumber.trim() : null) : existing.accountNumber,
        contractNumber: contractNumber !== undefined ? (contractNumber ? contractNumber.trim() : null) : existing.contractNumber,
        invoiceNumber: invoiceNumber !== undefined ? (invoiceNumber ? invoiceNumber.trim() : null) : existing.invoiceNumber,
        vendorId: vendorId !== undefined ? (vendorId || null) : existing.vendorId,
        companyName: companyName !== undefined ? (companyName ? companyName.trim() : null) : existing.companyName,
        locationId: locationId !== undefined ? (locationId || null) : existing.locationId,
        contactSupport: contactSupport !== undefined ? (contactSupport ? contactSupport.trim() : null) : existing.contactSupport,
        specs: specs !== undefined ? specs : existing.specs,
        contractUrl: contractUrl !== undefined ? contractUrl : existing.contractUrl,
        notes: notes !== undefined ? (notes ? notes.trim() : null) : existing.notes,
      },
      include: {
        vendor: true,
        location: true,
        documents: true,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Error updating service:', error);
    return NextResponse.json({ error: error.message || 'Lỗi khi cập nhật dịch vụ' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const canDelete = await hasPermission(user.userId, 'services.delete');
    if (!canDelete && user.roleName !== 'Admin') {
      return NextResponse.json({ error: 'Bạn không có quyền xóa dịch vụ' }, { status: 403 });
    }

    const { id } = await params;
    await prisma.iTService.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Đã xóa dịch vụ thành công' });
  } catch (error: any) {
    console.error('Error deleting service:', error);
    return NextResponse.json({ error: error.message || 'Lỗi khi xóa dịch vụ' }, { status: 500 });
  }
}
