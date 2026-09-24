import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isGenericSerial } from '@/lib/device-detection';
import { checkRateLimit } from '@/lib/rate-limit';
import { processHealthReport, HealthMetricReport } from '@/lib/health/alert-engine';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local';
    const rateLimit = checkRateLimit(`v1_health_report:${ip}`, 120, 60_000);
    if (!rateLimit.success) {
      return NextResponse.json(
        { success: false, error: 'Quá nhiều yêu cầu gửi dữ liệu sức khỏe. Vui lòng thử lại sau.' },
        { status: 429 }
      );
    }

    // PostgreSQL rejects \u0000 in text/JSONB — strip null bytes from raw payload
    const rawText = await request.text();
    const cleanText = rawText.replace(/\\u0000/gi, '').replace(/\0/g, '');
    let body: any;
    try {
      body = JSON.parse(cleanText);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Dữ liệu sức khỏe gửi lên không đúng định dạng JSON' },
        { status: 400 }
      );
    }

    // Validate Agent Secret if configured
    const configuredSecret =
      (await prisma.systemSetting.findUnique({ where: { key: 'agent.scan_secret' } }))?.value ||
      process.env.AGENT_SECRET;
    if (configuredSecret) {
      const headerSecret = request.headers.get('x-agent-secret');
      const bodySecret = body.agentSecret;
      if (headerSecret !== configuredSecret && bodySecret !== configuredSecret) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized: Mã bảo mật Agent Secret không hợp lệ' },
          { status: 401 }
        );
      }
    }

    const { hostname, serialNumber } = body;

    if (!serialNumber && !hostname) {
      return NextResponse.json(
        { success: false, error: 'Thiếu thông tin Serial Number hoặc Hostname để định danh thiết bị' },
        { status: 400 }
      );
    }

    const rawSerial = (serialNumber || '').trim();
    const cleanHostname = (hostname || '').trim();
    const isGeneric = isGenericSerial(rawSerial);
    const validSerial = !isGeneric ? rawSerial : null;

    // 1. Tìm Asset trong cơ sở dữ liệu
    let targetAsset = null;
    if (validSerial) {
      targetAsset = await prisma.asset.findFirst({
        where: { serialNumber: { equals: validSerial, mode: 'insensitive' } },
        select: { id: true, assetTag: true, name: true },
      });
    }

    if (!targetAsset && cleanHostname) {
      targetAsset = await prisma.asset.findFirst({
        where: { name: { contains: cleanHostname, mode: 'insensitive' } },
        select: { id: true, assetTag: true, name: true },
      });
    }

    if (!targetAsset) {
      // Nếu máy chưa tồn tại trong CMDB, trả về hướng dẫn để chạy Inventory trước
      return NextResponse.json(
        {
          success: false,
          error: `Thiết bị (${cleanHostname || rawSerial}) chưa có trong hệ thống quản lý tài sản. Vui lòng chạy Inventory (-Mode Inventory) trước để ghi nhận thiết bị.`,
          needsInventory: true,
        },
        { status: 404 }
      );
    }

    // 2. Chạy Alert Engine xử lý dữ liệu sinh tồn
    const healthResult = await processHealthReport(targetAsset.id, body as HealthMetricReport);

    return NextResponse.json({
      success: true,
      assetId: targetAsset.id,
      assetTag: targetAsset.assetTag,
      name: targetAsset.name,
      overallStatus: healthResult.overallStatus,
      alertsCreated: healthResult.alertsCreated,
      alertsUpdated: healthResult.alertsUpdated,
      alertsResolved: healthResult.alertsResolved,
      activeAlertsCount: healthResult.activeAlertsCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Health Report API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi xử lý dữ liệu sức khỏe: ' + (error?.message || error) },
      { status: 500 }
    );
  }
}
