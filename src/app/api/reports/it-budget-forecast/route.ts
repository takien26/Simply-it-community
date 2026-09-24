import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { calculateAssetHealth } from '@/lib/asset-health';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const oneYearFromNow = new Date(now);
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

    // 1. Services & Subscriptions
    const activeServices = await prisma.iTService.findMany({
      where: {
        status: { in: ['ACTIVE', 'PENDING_RENEWAL'] },
      },
      include: {
        vendor: { select: { name: true } },
      },
    });

    let serviceAnnualTotal = 0;
    const serviceTypeBreakdown: Record<string, number> = {};
    const upcomingRenewals: any[] = [];

    for (const s of activeServices) {
      const cost = Number(s.cost) || 0;
      let annualCost = 0;

      switch (s.billingCycle) {
        case 'MONTHLY':
          annualCost = cost * 12;
          break;
        case 'QUARTERLY':
          annualCost = cost * 4;
          break;
        case 'SEMI_ANNUAL':
          annualCost = cost * 2;
          break;
        case 'ANNUAL':
          annualCost = cost;
          break;
        case 'BIENNIAL':
          annualCost = cost / 2;
          break;
        case 'TRIENNIAL':
          annualCost = cost / 3;
          break;
        case 'ONE_TIME':
        default:
          annualCost = 0;
          break;
      }

      serviceAnnualTotal += annualCost;
      const typeKey = s.serviceType || 'OTHER';
      serviceTypeBreakdown[typeKey] = (serviceTypeBreakdown[typeKey] || 0) + annualCost;

      if (s.renewalDate && new Date(s.renewalDate) <= oneYearFromNow) {
        upcomingRenewals.push({
          id: s.id,
          name: s.name,
          serviceType: s.serviceType,
          provider: s.vendor?.name || 'N/A',
          cost,
          billingCycle: s.billingCycle,
          renewalDate: s.renewalDate,
        });
      }
    }

    // 2. Software Licenses & Renewals
    const allLicenses = await prisma.license.findMany();
    let licenseAnnualTotal = 0;
    const expiringLicenses: any[] = [];

    for (const lic of allLicenses) {
      const price = Number(lic.purchasePrice) || 0;
      licenseAnnualTotal += price;

      if (lic.expiryDate && new Date(lic.expiryDate) <= oneYearFromNow) {
        expiringLicenses.push({
          id: lic.id,
          name: lic.name,
          licenseType: lic.licenseType,
          expiryDate: lic.expiryDate,
          purchasePrice: price,
          seats: lic.totalSeats || 1,
        });
      }
    }

    // 3. Asset Health & Hardware Replacement Fund (CapEx)
    const allAssets = await prisma.asset.findMany({
      include: {
        maintenanceLogs: true,
        tickets: {
          select: { id: true, createdAt: true, status: true, priority: true },
        },
        assignments: {
          where: { returnedAt: null },
          include: {
            user: { select: { id: true, fullName: true, department: true } },
          },
        },
      },
    });

    const replacementCandidates: any[] = [];
    let totalHardwareCapEx = 0;
    const deptTcoMap: Record<string, { assetCount: number; assetValue: number; repairCost: number }> = {};

    for (const asset of allAssets) {
      const health = calculateAssetHealth(asset);
      const purchasePrice = Number(asset.purchasePrice) || 15000000; // 15M fallback
      const totalRepair = asset.maintenanceLogs?.reduce((sum: number, l: any) => sum + (Number(l.cost) || 0), 0) || 0;
      const currentAssignment = asset.assignments?.[0];
      const dept = currentAssignment?.user?.department || 'Chưa cấp phát / Khác';

      if (!deptTcoMap[dept]) {
        deptTcoMap[dept] = { assetCount: 0, assetValue: 0, repairCost: 0 };
      }
      deptTcoMap[dept].assetCount += 1;
      deptTcoMap[dept].assetValue += Number(asset.purchasePrice) || 0;
      deptTcoMap[dept].repairCost += totalRepair;

      if (health.recommendReplacement || health.healthScore < 40) {
        replacementCandidates.push({
          id: asset.id,
          assetTag: asset.assetTag,
          name: asset.name,
          condition: asset.condition,
          healthScore: health.healthScore,
          recommendationReason: health.recommendationReason?.vi || 'Điểm sức khỏe thấp (<40)',
          estimatedReplacementCost: purchasePrice,
          assignedTo: currentAssignment?.user?.fullName || null,
          department: dept,
        });
        totalHardwareCapEx += purchasePrice;
      }
    }

    // 4. Spare Parts Restock Budget
    const spareParts = await prisma.sparePart.findMany();
    let totalSparePartsCost = 0;
    const lowStockParts: any[] = [];

    for (const part of spareParts) {
      if (part.quantity <= part.minStock) {
        const targetStock = Math.max(part.minStock * 2, part.quantity + 5);
        const shortage = targetStock - part.quantity;
        const unitPrice = Number(part.unitPrice) || 250000;
        const restockCost = shortage * unitPrice;

        totalSparePartsCost += restockCost;
        lowStockParts.push({
          id: part.id,
          name: part.name,
          sku: part.sku,
          quantity: part.quantity,
          minStock: part.minStock,
          shortage,
          unitPrice,
          restockCost,
        });
      }
    }

    // 5. 12-Month Cashflow Forecast Projection (Month-by-Month)
    const monthlyForecast: Array<{
      monthKey: string;
      label: string;
      services: number;
      licenses: number;
      hardware: number;
      total: number;
    }> = [];

    const monthNames = ['Thg 1', 'Thg 2', 'Thg 3', 'Thg 4', 'Thg 5', 'Thg 6', 'Thg 7', 'Thg 8', 'Thg 9', 'Thg 10', 'Thg 11', 'Thg 12'];
    const monthlyBaseServices = Math.round(serviceAnnualTotal / 12);
    const monthlyBaseHardware = Math.round(totalHardwareCapEx / 12);

    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const mIdx = d.getMonth();
      const yr = d.getFullYear();
      const monthKey = `${yr}-${String(mIdx + 1).padStart(2, '0')}`;
      const label = `${monthNames[mIdx]} ${yr}`;

      // Check licenses expiring in this specific month
      const licCostThisMonth = expiringLicenses
        .filter((l) => {
          const lDate = new Date(l.expiryDate);
          return lDate.getFullYear() === yr && lDate.getMonth() === mIdx;
        })
        .reduce((sum, l) => sum + (l.purchasePrice || 0), 0);

      // Check services renewing in this specific month
      const serviceSpikes = upcomingRenewals
        .filter((s) => {
          if (!s.renewalDate) return false;
          const sDate = new Date(s.renewalDate);
          return sDate.getFullYear() === yr && sDate.getMonth() === mIdx;
        })
        .reduce((sum, s) => sum + (s.cost || 0), 0);

      const servicesTotal = monthlyBaseServices + serviceSpikes;
      const total = servicesTotal + licCostThisMonth + monthlyBaseHardware;

      monthlyForecast.push({
        monthKey,
        label,
        services: servicesTotal,
        licenses: licCostThisMonth,
        hardware: monthlyBaseHardware,
        total,
      });
    }

    const totalProjected12M =
      serviceAnnualTotal +
      licenseAnnualTotal +
      totalHardwareCapEx +
      totalSparePartsCost;

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalProjected12M,
          serviceAnnualTotal,
          licenseAnnualTotal,
          totalHardwareCapEx,
          totalSparePartsCost,
          replacementCandidateCount: replacementCandidates.length,
          lowStockPartCount: lowStockParts.length,
          upcomingRenewalCount: upcomingRenewals.length,
        },
        services: {
          totalAnnual: serviceAnnualTotal,
          breakdownByType: serviceTypeBreakdown,
          upcomingRenewals,
        },
        licenses: {
          totalAnnual: licenseAnnualTotal,
          expiringLicenses,
        },
        hardware: {
          totalCapEx: totalHardwareCapEx,
          replacementCandidates,
        },
        spareParts: {
          totalCost: totalSparePartsCost,
          lowStockParts,
        },
        monthlyForecast,
        departmentTco: Object.entries(deptTcoMap).map(([dept, val]) => ({
          department: dept,
          ...val,
          totalTco: val.assetValue + val.repairCost,
        })),
        generatedAt: now.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('IT Budget Forecast error:', error);
    return NextResponse.json(
      { error: error?.message || 'Lỗi tính toán dự toán ngân sách IT' },
      { status: 500 }
    );
  }
}
