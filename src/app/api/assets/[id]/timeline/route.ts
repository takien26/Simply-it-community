import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // 1. Lấy thông tin cơ bản của tài sản
    const asset = await prisma.asset.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, icon: true } },
        vendor: { select: { id: true, name: true, contactPerson: true, phone: true } },
        location: { select: { id: true, name: true, building: true, floor: true } },
        assignments: {
          include: {
            user: { select: { id: true, fullName: true, department: true, email: true, companyName: true } },
            assignedBy: { select: { id: true, fullName: true } },
          },
          orderBy: { assignedAt: 'asc' },
        },
        tickets: {
          include: {
            createdBy: { select: { id: true, fullName: true } },
            assignedTo: { select: { id: true, fullName: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        maintenanceLogs: {
          include: {
            performedBy: { select: { id: true, fullName: true } },
            vendor: { select: { id: true, name: true } },
          },
          orderBy: { performedAt: 'asc' },
        },
        licenseAssignments: {
          include: {
            license: { select: { id: true, name: true, licenseType: true, licenseKey: true } },
            assignedBy: { select: { id: true, fullName: true } },
          },
          orderBy: { assignedAt: 'asc' },
        },
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Không tìm thấy tài sản' }, { status: 404 });
    }

    // 2. Lấy các giao dịch phụ tùng (Spare Parts) liên kết với máy này
    const sparePartTransactions = await prisma.sparePartTransaction.findMany({
      where: { assetId: id },
      include: {
        sparePart: { select: { id: true, name: true, sku: true, unit: true, unitPrice: true, currency: true } },
        performedBy: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // 3. Lấy Audit Logs liên quan đến tài sản
    const auditLogs = await prisma.auditLog.findMany({
      where: { entityType: 'Asset', entityId: id },
      include: {
        user: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // 4. Chuẩn hóa và tổng hợp danh sách sự kiện Vòng đời (Timeline Events)
    interface TimelineEvent {
      id: string;
      type: 'PURCHASE' | 'ASSIGNMENT' | 'RETURN' | 'TICKET' | 'SPARE_PART' | 'MAINTENANCE' | 'LICENSE_ASSIGN' | 'LICENSE_REVOKE' | 'AUDIT';
      timestamp: string;
      title: string;
      subtitle?: string;
      description?: string;
      badge?: { label: string; bg: string; text: string };
      actor?: string;
      cost?: { amount: number; currency: string };
      metadata?: Record<string, any>;
    }

    const events: TimelineEvent[] = [];

    // Sự kiện 1: Mua sắm & Nhập kho ban đầu
    const initialDate = asset.purchaseDate || asset.createdAt;
    events.push({
      id: `event-purchase-${asset.id}`,
      type: 'PURCHASE',
      timestamp: initialDate.toISOString(),
      title: 'Mua mới & Nhập kho hệ thống',
      subtitle: asset.vendor?.name ? `Nhà cung cấp: ${asset.vendor.name}` : undefined,
      description: `Mã tài sản: ${asset.assetTag} • Số Serial: ${asset.serialNumber || 'Chưa có'}${
        asset.contractNumber ? ` • Số HĐ: ${asset.contractNumber}` : ''
      }${asset.invoiceNumber ? ` • Hóa đơn: ${asset.invoiceNumber}` : ''}`,
      badge: { label: 'Mua mới', bg: 'bg-blue-100 dark:bg-blue-900/50', text: 'text-blue-800 dark:text-blue-300' },
      actor: asset.vendor?.name || 'Bộ phận Mua hàng',
      cost: asset.purchasePrice ? { amount: Number(asset.purchasePrice), currency: asset.purchaseCurrency || 'VND' } : undefined,
      metadata: {
        purchaseDate: asset.purchaseDate,
        warrantyExpiry: asset.warrantyExpiry,
        location: asset.location?.name,
        companyName: asset.companyName,
      },
    });

    // Sự kiện 2: Lịch sử Cấp phát & Thu hồi
    asset.assignments.forEach((asg) => {
      events.push({
        id: `event-asg-${asg.id}`,
        type: 'ASSIGNMENT',
        timestamp: asg.assignedAt.toISOString(),
        title: `Bàn giao cho nhân sự: ${asg.user?.fullName || 'Nhân viên'}`,
        subtitle: asg.user?.department ? `Phòng ban: ${asg.user.department}` : undefined,
        description: asg.notes || 'Bàn giao thiết bị làm việc',
        badge: { label: 'Bàn giao', bg: 'bg-emerald-100 dark:bg-emerald-900/50', text: 'text-emerald-800 dark:text-emerald-300' },
        actor: asg.assignedBy?.fullName || 'IT Admin',
        metadata: {
          userId: asg.userId,
          userName: asg.user?.fullName,
          userEmail: asg.user?.email,
          userCompany: asg.user?.companyName,
        },
      });

      if (asg.returnedAt) {
        events.push({
          id: `event-return-${asg.id}`,
          type: 'RETURN',
          timestamp: asg.returnedAt.toISOString(),
          title: `Thu hồi về kho từ: ${asg.user?.fullName || 'Nhân viên'}`,
          subtitle: asg.user?.department ? `Phòng ban: ${asg.user.department}` : undefined,
          description: asg.notes ? `Ghi chú thu hồi: ${asg.notes}` : 'Hoàn tất bàn giao trả máy về kho IT',
          badge: { label: 'Thu hồi', bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-800 dark:text-slate-300' },
          actor: asg.assignedBy?.fullName || 'IT Admin',
          metadata: {
            userId: asg.userId,
            userName: asg.user?.fullName,
          },
        });
      }
    });

    // Sự kiện 3: Sự cố & Ticket hỗ trợ kỹ thuật
    asset.tickets.forEach((t) => {
      events.push({
        id: `event-ticket-${t.id}`,
        type: 'TICKET',
        timestamp: t.createdAt.toISOString(),
        title: `Sự cố: [${t.ticketNumber}] ${t.title}`,
        subtitle: `Trạng thái: ${t.status} • Mức ưu tiên: ${t.priority}`,
        description: t.description ? (t.description.length > 150 ? `${t.description.slice(0, 150)}...` : t.description) : undefined,
        badge: {
          label: `Ticket ${t.status}`,
          bg: t.status === 'CLOSED' || t.status === 'RESOLVED' ? 'bg-emerald-100 dark:bg-emerald-900/50' : 'bg-rose-100 dark:bg-rose-900/50',
          text: t.status === 'CLOSED' || t.status === 'RESOLVED' ? 'text-emerald-800 dark:text-emerald-300' : 'text-rose-800 dark:text-rose-300',
        },
        actor: t.createdBy?.fullName || 'Người dùng báo lỗi',
        metadata: {
          ticketId: t.id,
          ticketNumber: t.ticketNumber,
          assignedTo: t.assignedTo?.fullName,
          resolvedAt: t.resolvedAt,
          resolutionNotes: t.resolutionNotes,
        },
      });
    });

    // Sự kiện 4: Linh kiện phụ tùng thay thế (Spare Parts)
    sparePartTransactions.forEach((sp) => {
      const partCost = sp.sparePart.unitPrice ? Number(sp.sparePart.unitPrice) * Math.abs(sp.quantity) : 0;
      events.push({
        id: `event-sp-${sp.id}`,
        type: 'SPARE_PART',
        timestamp: sp.createdAt.toISOString(),
        title: `Thay thế linh kiện: ${sp.sparePart.name} (x${Math.abs(sp.quantity)} ${sp.sparePart.unit})`,
        subtitle: sp.sparePart.sku ? `Mã SKU: ${sp.sparePart.sku}` : undefined,
        description: sp.note || 'Xuất linh kiện từ kho phụ tùng nâng cấp/thay thế cho máy',
        badge: { label: 'Linh kiện', bg: 'bg-amber-100 dark:bg-amber-900/50', text: 'text-amber-800 dark:text-amber-300' },
        actor: sp.performedBy?.fullName || 'Kỹ thuật viên IT',
        cost: partCost > 0 ? { amount: partCost, currency: sp.sparePart.currency || 'VND' } : undefined,
        metadata: {
          sparePartId: sp.sparePartId,
          partName: sp.sparePart.name,
          quantity: sp.quantity,
        },
      });
    });

    // Sự kiện 5: Bảo trì, Sửa chữa & Nâng cấp (Maintenance Logs)
    asset.maintenanceLogs.forEach((m) => {
      events.push({
        id: `event-maint-${m.id}`,
        type: 'MAINTENANCE',
        timestamp: m.performedAt.toISOString(),
        title: `Bảo dưỡng: ${m.title}`,
        subtitle: `Phân loại: ${m.type}${m.vendor?.name ? ` • Đơn vị thực hiện: ${m.vendor.name}` : ''}`,
        description: m.description || m.notes || undefined,
        badge: { label: m.type, bg: 'bg-purple-100 dark:bg-purple-900/50', text: 'text-purple-800 dark:text-purple-300' },
        actor: m.performedBy?.fullName || m.vendor?.name || 'Kỹ thuật viên',
        cost: m.cost ? { amount: Number(m.cost), currency: m.costCurrency || 'VND' } : undefined,
        metadata: {
          maintenanceId: m.id,
          type: m.type,
          completedAt: m.completedAt,
        },
      });
    });

    // Sự kiện 6: Gán / Thu hồi Bản quyền phần mềm (License Assignments)
    asset.licenseAssignments.forEach((la) => {
      events.push({
        id: `event-lic-${la.id}`,
        type: la.revokedAt ? 'LICENSE_REVOKE' : 'LICENSE_ASSIGN',
        timestamp: (la.revokedAt || la.assignedAt).toISOString(),
        title: la.revokedAt
          ? `Thu hồi bản quyền: ${la.license.name}`
          : `Gán bản quyền phần mềm: ${la.license.name}`,
        subtitle: `Loại license: ${la.license.licenseType}`,
        description: la.notes || undefined,
        badge: {
          label: la.revokedAt ? 'Thu hồi License' : 'Cấp License',
          bg: la.revokedAt ? 'bg-slate-100 dark:bg-slate-800' : 'bg-indigo-100 dark:bg-indigo-900/50',
          text: la.revokedAt ? 'text-slate-700 dark:text-slate-300' : 'text-indigo-800 dark:text-indigo-300',
        },
        actor: la.assignedBy?.fullName || 'IT Admin',
        metadata: {
          licenseId: la.licenseId,
          licenseName: la.license.name,
        },
      });
    });

    // Sắp xếp sự kiện theo thời gian giảm dần (Mới nhất lên đầu)
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Tính toán KPI Tổng Hợp Vòng Đời
    const now = new Date();
    const ageDiffMs = now.getTime() - new Date(initialDate).getTime();
    const ageMonths = Math.max(0, Math.floor(ageDiffMs / (1000 * 60 * 60 * 24 * 30.4375)));
    const ageYears = Number((ageMonths / 12).toFixed(1));

    const uniqueUsers = new Set(asset.assignments.map((a) => a.userId));
    let totalMaintenanceAndPartsCost = 0;

    asset.maintenanceLogs.forEach((m) => {
      if (m.cost) totalMaintenanceAndPartsCost += Number(m.cost);
    });
    sparePartTransactions.forEach((sp) => {
      if (sp.sparePart.unitPrice) {
        totalMaintenanceAndPartsCost += Number(sp.sparePart.unitPrice) * Math.abs(sp.quantity);
      }
    });

    const kpis = {
      ageMonths,
      ageYears,
      totalUsersCount: uniqueUsers.size,
      currentHolder: asset.assignments.find((a) => !a.returnedAt)?.user || null,
      totalTicketsCount: asset.tickets.length,
      openTicketsCount: asset.tickets.filter((t) => t.status !== 'CLOSED' && t.status !== 'RESOLVED').length,
      totalMaintenanceCost: totalMaintenanceAndPartsCost,
      sparePartsCount: sparePartTransactions.length,
      maintenanceCount: asset.maintenanceLogs.length,
      totalEventsCount: events.length,
    };

    return NextResponse.json({
      success: true,
      data: {
        asset: {
          id: asset.id,
          assetTag: asset.assetTag,
          name: asset.name,
          brand: asset.brand,
          model: asset.model,
          serialNumber: asset.serialNumber,
          status: asset.status,
          condition: asset.condition,
          companyName: asset.companyName,
          categoryName: asset.category?.name,
          locationName: asset.location?.name,
          purchasePrice: asset.purchasePrice ? Number(asset.purchasePrice) : null,
          purchaseCurrency: asset.purchaseCurrency || 'VND',
        },
        kpis,
        events,
      },
    });
  } catch (error: any) {
    console.error('Fetch asset timeline 360 error:', error);
    return NextResponse.json({ error: error?.message || 'Không thể lấy dữ liệu vòng đời tài sản' }, { status: 500 });
  }
}
