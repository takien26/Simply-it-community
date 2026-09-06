import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

function toSafeString(val: any): string | null {
  if (!val) return null;
  if (typeof val === 'string') return val.trim() || null;
  if (Array.isArray(val)) return val.filter(Boolean).map(String).join(', ') || null;
  if (typeof val === 'object') {
    if (typeof val.ip === 'string') return val.ip;
    if (typeof val.IPv4 === 'string') return val.IPv4;
    if (typeof val.address === 'string') return val.address;
    const vals = Object.values(val).filter((v) => typeof v === 'string' || typeof v === 'number');
    return vals.length > 0 ? vals.join(', ') : null;
  }
  return String(val);
}

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const assetsWithScans = await prisma.asset.findMany({
      where: {
        specs: { not: null as any },
      },
      include: {
        category: true,
        assignments: {
          where: { returnedAt: null },
          include: { user: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });

    const agentReports = assetsWithScans
      .filter((a) => {
        const sp = (a.specs as Record<string, any>) || {};
        return sp.lastScannedAt || sp.installedSoftware || sp.autoDiscovered || sp.cpu || sp.ram;
      })
      .map((a) => {
        const sp = (a.specs as Record<string, any>) || {};
        const safeInstalledSoftware = Array.isArray(sp.installedSoftware)
          ? sp.installedSoftware.map((s: any) => ({
              name: toSafeString(s.name) || 'Phần mềm không tên',
              version: toSafeString(s.version) || '',
              publisher: toSafeString(s.publisher) || '',
              installDate: toSafeString(s.installDate) || '',
            }))
          : [];

        return {
          assetId: a.id,
          assetTag: a.assetTag,
          name: a.name,
          brand: a.brand || '',
          model: a.model || '',
          serialNumber: a.serialNumber || '',
          categoryName: a.category?.name || 'Thiết bị',
          assignedTo: a.assignments[0]?.user?.fullName || null,
          department: a.assignments[0]?.user?.department || null,
          hostname: toSafeString(sp.lastScannedHost) || toSafeString(sp.hostname) || a.name,
          ipAddress: toSafeString(sp.ipAddress) || null,
          macAddress: toSafeString(sp.macAddress) || null,
          cpu: toSafeString(sp.cpu) || null,
          ram: toSafeString(sp.ram) || null,
          storage: toSafeString(sp.storage) || null,
          os: toSafeString(sp.os) || toSafeString(sp.operatingSystem) || null,
          lastScannedAt: sp.lastScannedAt || a.updatedAt,
          hardwareChangeAlert: toSafeString(sp.hardwareChangeAlert) || null,
          installedSoftwareCount: safeInstalledSoftware.length,
          installedSoftware: safeInstalledSoftware,
        };
      });

    return NextResponse.json({
      success: true,
      data: agentReports,
      total: agentReports.length,
    });
  } catch (error: any) {
    console.error('Discovery Agents List API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi tải danh sách báo cáo agent: ' + (error?.message || error) },
      { status: 500 }
    );
  }
}
