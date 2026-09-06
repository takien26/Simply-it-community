import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type')?.toLowerCase();
    const id = searchParams.get('id')?.trim();

    if (!type || !id) {
      return NextResponse.json({ error: 'Missing type or id parameter' }, { status: 400 });
    }

    // Helper: Fast indexed document lookup for invoices & contracts (0ms overhead)
    const findLinkedDocs = async (invoiceNum?: string | null, contractNum?: string | null) => {
      let matchedInvoiceDoc = null;
      let matchedContractDoc = null;

      if (invoiceNum && invoiceNum.trim()) {
        matchedInvoiceDoc = await prisma.document.findFirst({
          where: { invoiceNumber: invoiceNum.trim() },
          select: { id: true, title: true, fileUrl: true, fileName: true, type: true },
        });
      }

      if (contractNum && contractNum.trim()) {
        matchedContractDoc = await prisma.document.findFirst({
          where: { contractNumber: contractNum.trim() },
          select: { id: true, title: true, fileUrl: true, fileName: true, type: true },
        });
      }

      return { matchedInvoiceDoc, matchedContractDoc };
    };

    // 1. USER
    if (type === 'user') {
      const u = await prisma.user.findFirst({
        where: {
          OR: [{ id }, { email: id }],
        },
        include: {
          role: true,
          assetAssignments: {
            where: { returnedAt: null },
            include: {
              asset: {
                select: { id: true, assetTag: true, name: true, status: true, brand: true, model: true },
              },
            },
          },
          licenseAssignments: {
            where: { revokedAt: null },
            include: {
              license: {
                select: { id: true, name: true, licenseType: true, expiryDate: true, status: true },
              },
            },
          },
        },
      });

      if (!u) {
        return NextResponse.json({ error: 'Không tìm thấy thông tin người dùng' }, { status: 404 });
      }

      const recentTickets = await prisma.ticket.findMany({
        where: { createdById: u.id },
        take: 3,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          ticketNumber: true,
          title: true,
          status: true,
          priority: true,
          createdAt: true,
        },
      });

      return NextResponse.json({
        type: 'user',
        data: {
          id: u.id,
          fullName: u.fullName,
          email: u.email,
          phone: u.phone,
          department: u.department,
          avatarUrl: u.avatarUrl,
          isActive: u.isActive,
          roleName: u.role?.name || 'Nhân viên',
          roleDescription: u.role?.description,
          assignedAssetsCount: u.assetAssignments.length,
          assignedAssets: u.assetAssignments.map((aa) => aa.asset),
          assignedLicensesCount: u.licenseAssignments.length,
          assignedLicenses: u.licenseAssignments.map((la) => la.license),
          recentTickets,
        },
      });
    }

    // 2. ASSET
    if (type === 'asset') {
      const a = await prisma.asset.findFirst({
        where: {
          OR: [{ id }, { assetTag: id }, { serialNumber: id }],
        },
        include: {
          category: { select: { id: true, name: true, icon: true } },
          vendor: { select: { id: true, name: true, phone: true, email: true, contactPerson: true } },
          location: { select: { id: true, name: true, building: true, floor: true } },
          assignments: {
            where: { returnedAt: null },
            include: {
              user: { select: { id: true, fullName: true, email: true, department: true } },
            },
            take: 1,
          },
          licenseAssignments: {
            where: { revokedAt: null },
            include: {
              license: { select: { id: true, name: true, licenseType: true, expiryDate: true, status: true } },
            },
          },
          maintenanceLogs: {
            take: 5,
            orderBy: { performedAt: 'desc' },
            select: {
              id: true,
              title: true,
              type: true,
              description: true,
              cost: true,
              costCurrency: true,
              performedAt: true,
              performedBy: { select: { fullName: true } },
            },
          },
          _count: {
            select: { maintenanceLogs: true },
          },
        },
      });

      if (!a) {
        return NextResponse.json({ error: 'Không tìm thấy thông tin tài sản' }, { status: 404 });
      }

      const currentAssignee = a.assignments[0]?.user || null;
      const { matchedInvoiceDoc, matchedContractDoc } = await findLinkedDocs(a.invoiceNumber, a.contractNumber);

      // Check for audit campaign records
      let auditHistory: any[] = [];
      try {
        const setting = await prisma.systemSetting.findUnique({
          where: { key: 'audit_campaigns_list' },
        });
        if (setting?.value) {
          const list = JSON.parse(setting.value);
          for (const camp of list) {
            const foundItem = camp.items?.find((i: any) => i.id === a.id || i.assetTag === a.assetTag);
            if (foundItem && foundItem.isAudited) {
              auditHistory.push({
                campaignId: camp.id,
                campaignTitle: camp.title,
                auditedAt: foundItem.auditedAt,
                auditedBy: foundItem.auditedBy,
                auditStatus: foundItem.auditStatus,
                actualCondition: foundItem.actualCondition,
                actualNotes: foundItem.actualNotes,
                actualUserName: foundItem.actualUserName,
                actualLocationName: foundItem.actualLocationName,
              });
            }
          }
        }
      } catch {}

      return NextResponse.json({
        type: 'asset',
        data: {
          id: a.id,
          assetTag: a.assetTag,
          name: a.name,
          brand: a.brand,
          model: a.model,
          serialNumber: a.serialNumber,
          status: a.status,
          condition: a.condition,
          purchaseDate: a.purchaseDate,
          purchasePrice: a.purchasePrice ? Number(a.purchasePrice) : null,
          purchaseCurrency: a.purchaseCurrency || 'VND',
          warrantyExpiry: a.warrantyExpiry,
          contractNumber: a.contractNumber,
          invoiceNumber: a.invoiceNumber,
          matchedInvoiceDoc,
          matchedContractDoc,
          specs: a.specs,
          imageUrl: a.imageUrl,
          invoiceUrl: a.invoiceUrl,
          notes: a.notes,
          categoryName: a.category?.name || 'Chưa phân loại',
          categoryIcon: a.category?.icon || '💻',
          vendorId: a.vendor?.id,
          vendorName: a.vendor?.name,
          vendorContact: a.vendor?.contactPerson,
          vendorPhone: a.vendor?.phone,
          locationName: a.location ? (a.location.name + ' (' + (a.location.building || '') + ' ' + (a.location.floor || '') + ')').trim() : 'Chưa gán vị trí',
          currentUser: currentAssignee,
          assignedAt: a.assignments[0]?.assignedAt || null,
          assignedLicensesCount: a.licenseAssignments.length,
          assignedLicenses: a.licenseAssignments.map((la) => la.license),
          maintenanceCount: a._count.maintenanceLogs,
          recentMaintenance: a.maintenanceLogs,
          auditHistory,
        },
      });
    }

    // 3. LICENSE
    if (type === 'license') {
      const l = await prisma.license.findFirst({
        where: { id },
        include: {
          vendor: { select: { id: true, name: true, email: true, phone: true, contactPerson: true } },
          assignments: {
            where: { revokedAt: null },
            include: {
              user: { select: { id: true, fullName: true, email: true, department: true } },
              asset: { select: { id: true, assetTag: true, name: true } },
            },
            take: 10,
          },
        },
      });

      if (!l) {
        return NextResponse.json({ error: 'Không tìm thấy thông tin license' }, { status: 404 });
      }

      let maskedKey = l.licenseKey;
      if (maskedKey && maskedKey.length > 8) {
        maskedKey = '****-****-' + maskedKey.slice(-4);
      }

      const { matchedInvoiceDoc, matchedContractDoc } = await findLinkedDocs(l.invoiceNumber, l.contractNumber);

      return NextResponse.json({
        type: 'license',
        data: {
          id: l.id,
          name: l.name,
          licenseKey: maskedKey,
          licenseType: l.licenseType,
          status: l.status,
          totalSeats: l.totalSeats,
          usedSeats: l.usedSeats,
          availableSeats: Math.max(0, l.totalSeats - l.usedSeats),
          purchaseDate: l.purchaseDate,
          expiryDate: l.expiryDate,
          purchasePrice: l.purchasePrice ? Number(l.purchasePrice) : null,
          purchaseCurrency: l.purchaseCurrency || 'VND',
          contractNumber: l.contractNumber,
          invoiceNumber: l.invoiceNumber,
          matchedInvoiceDoc,
          matchedContractDoc,
          vendorId: l.vendor?.id,
          vendorName: l.vendor?.name,
          contractUrl: l.contractUrl,
          notes: l.notes,
          assignedUsers: l.assignments.map((as) => ({
            id: as.user?.id || as.asset?.id,
            name: as.user?.fullName || as.asset?.name || 'N/A',
            sub: as.user?.email || as.asset?.assetTag || '',
            department: as.user?.department,
            assignedAt: as.assignedAt,
          })),
        },
      });
    }

    // 4. SERVICE
    if (type === 'service') {
      const s = await prisma.iTService.findFirst({
        where: {
          OR: [{ id }, { serviceCode: id }],
        },
        include: {
          vendor: { select: { id: true, name: true, contactPerson: true, phone: true, email: true } },
          location: { select: { id: true, name: true, building: true, floor: true } },
        },
      });

      if (!s) {
        return NextResponse.json({ error: 'Không tìm thấy thông tin dịch vụ' }, { status: 404 });
      }

      const { matchedInvoiceDoc, matchedContractDoc } = await findLinkedDocs(s.invoiceNumber, s.contractNumber);

      return NextResponse.json({
        type: 'service',
        data: {
          id: s.id,
          serviceCode: s.serviceCode,
          name: s.name,
          serviceType: s.serviceType,
          status: s.status,
          cost: s.cost ? Number(s.cost) : 0,
          billingCycle: s.billingCycle,
          currency: s.currency || 'VND',
          companyName: s.companyName,
          accountNumber: s.accountNumber,
          contractNumber: s.contractNumber,
          invoiceNumber: s.invoiceNumber,
          matchedInvoiceDoc,
          matchedContractDoc,
          contactSupport: s.contactSupport,
          startDate: s.startDate,
          renewalDate: s.renewalDate,
          expiryDate: s.expiryDate,
          vendorId: s.vendor?.id,
          vendorName: s.vendor?.name,
          vendorContact: s.vendor?.contactPerson,
          vendorPhone: s.vendor?.phone,
          vendorEmail: s.vendor?.email,
          locationName: s.location ? (s.location.name + ' (' + (s.location.building || '') + ')').trim() : null,
          notes: s.notes,
        },
      });
    }

    // 5. TICKET
    if (type === 'ticket') {
      const t = await prisma.ticket.findFirst({
        where: {
          OR: [{ id }, { ticketNumber: id }],
        },
        include: {
          createdBy: { select: { id: true, fullName: true, email: true, department: true } },
          assignedTo: { select: { id: true, fullName: true, email: true, department: true } },
          asset: { select: { id: true, assetTag: true, name: true, status: true } },
          team: { select: { id: true, name: true } },
          queue: { select: { id: true, name: true } },
          _count: { select: { comments: true } },
        },
      });

      if (!t) {
        return NextResponse.json({ error: 'Không tìm thấy thông tin ticket' }, { status: 404 });
      }

      return NextResponse.json({
        type: 'ticket',
        data: {
          id: t.id,
          ticketNumber: t.ticketNumber,
          title: t.title,
          description: t.description,
          status: t.status,
          priority: t.priority,
          category: t.category,
          createdAt: t.createdAt,
          slaDeadline: t.slaDeadline,
          resolvedAt: t.resolvedAt,
          companyName: t.companyName,
          customAssetName: t.customAssetName,
          createdBy: t.createdBy,
          assignedTo: t.assignedTo,
          asset: t.asset,
          teamName: t.team?.name,
          queueName: t.queue?.name,
          commentsCount: t._count.comments,
        },
      });
    }

    // 6. VENDOR
    if (type === 'vendor') {
      const v = await prisma.vendor.findFirst({
        where: {
          OR: [{ id }, { name: id }],
        },
        include: {
          assets: {
            take: 5,
            select: { id: true, assetTag: true, name: true, status: true },
          },
          licenses: {
            take: 5,
            select: { id: true, name: true, status: true, totalSeats: true },
          },
          _count: {
            select: {
              assets: true,
              licenses: true,
              maintenanceLogs: true,
            },
          },
        },
      });

      if (!v) {
        return NextResponse.json({ error: 'Không tìm thấy thông tin nhà cung cấp' }, { status: 404 });
      }

      return NextResponse.json({
        type: 'vendor',
        data: {
          id: v.id,
          name: v.name,
          contactPerson: v.contactPerson,
          email: v.email,
          phone: v.phone,
          address: v.address,
          website: v.website,
          notes: v.notes,
          isActive: v.isActive,
          totalAssets: v._count.assets,
          totalLicenses: v._count.licenses,
          totalMaintenance: v._count.maintenanceLogs,
          recentAssets: v.assets,
          recentLicenses: v.licenses,
        },
      });
    }

    return NextResponse.json({ error: 'Loại đối tượng không hợp lệ: ' + type }, { status: 400 });
  } catch (error) {
    console.error('Quick view error:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ khi lấy dữ liệu xem nhanh' }, { status: 500 });
  }
}
