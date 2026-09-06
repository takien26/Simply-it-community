import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function getDirSize(dirPath: string): { size: number; count: number } {
  let size = 0;
  let count = 0;
  if (!fs.existsSync(dirPath)) return { size: 0, count: 0 };

  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    try {
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        const sub = getDirSize(filePath);
        size += sub.size;
        count += sub.count;
      } else {
        size += stat.size;
        count += 1;
      }
    } catch {}
  }
  return { size, count };
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const { size: uploadsSize, count: uploadsCount } = getDirSize(uploadsDir);

    const [assetCount, ticketCount, licenseCount, lastBackupLog] = await Promise.all([
      prisma.asset.count(),
      prisma.ticket.count(),
      prisma.license.count(),
      prisma.auditLog.findFirst({
        where: { action: 'CREATE', entityType: 'SystemBackup' },
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { fullName: true } } },
      }),
    ]);

    return NextResponse.json({
      success: true,
      status: {
        totalAssets: assetCount,
        totalTickets: ticketCount,
        totalLicenses: licenseCount,
        uploadsSize,
        uploadsCount,
        uploadsSizeFormatted: (uploadsSize / (1024 * 1024)).toFixed(2) + ' MB',
        lastBackupAt: lastBackupLog?.createdAt || null,
        lastBackupBy: lastBackupLog?.user?.fullName || null,
      },
    });
  } catch (error) {
    console.error('Backup status error:', error);
    return NextResponse.json({ error: 'Failed to fetch backup status' }, { status: 500 });
  }
}
