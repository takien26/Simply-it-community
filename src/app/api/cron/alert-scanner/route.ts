import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { runDailyAlertJob, scanExpiringAlerts, sendTelegramMessage, sendZaloWebhook } from '@/lib/alerts';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const shouldRun = searchParams.get('run') === 'true';

    if (shouldRun) {
      const appUrl = req.nextUrl.origin;
      const result = await runDailyAlertJob(appUrl);
      return NextResponse.json({ success: true, data: result });
    }

    // Read last scan results
    const lastScanSetting = await prisma.systemSetting.findUnique({
      where: { key: 'alert.last_scan_result' },
    });

    const lastTimeSetting = await prisma.systemSetting.findUnique({
      where: { key: 'alert.last_scan_time' },
    });

    let lastResult = null;
    if (lastScanSetting?.value) {
      try {
        lastResult = JSON.parse(lastScanSetting.value);
      } catch {}
    }

    // Also do a quick preview scan without dispatching
    const previewScan = await scanExpiringAlerts(30);

    return NextResponse.json({
      success: true,
      lastScanTime: lastTimeSetting?.value || null,
      lastScanResult: lastResult,
      currentPreview: previewScan,
    });
  } catch (err: any) {
    console.error('Alert Scanner GET Error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Lỗi kiểm tra cảnh báo' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'run_scan';

    // 1. Test Telegram
    if (action === 'test_telegram') {
      const { botToken, chatId } = body;
      if (!botToken || !chatId) {
        return NextResponse.json({ success: false, error: 'Thiếu Telegram Bot Token hoặc Chat ID' }, { status: 400 });
      }

      const testMsg = `🧪 <b>[SIMPLY IT] Kiểm tra kết nối Telegram Bot thành công!</b>\n⏱ Thời gian: ${new Date().toLocaleString('vi-VN')}\n\nHệ thống đã sẵn sàng gửi các cảnh báo tự động về hạn bản quyền, dịch vụ IT và bảo hành thiết bị.`;
      const res = await sendTelegramMessage(botToken, chatId, testMsg);
      if (res.success) {
        return NextResponse.json({ success: true, message: 'Đã gửi tin nhắn thử nghiệm tới Telegram thành công!' });
      }
      return NextResponse.json({ success: false, error: res.error || 'Gửi tin nhắn Telegram thất bại' }, { status: 400 });
    }

    // 2. Test Zalo / Webhook
    if (action === 'test_zalo') {
      const { webhookUrl } = body;
      if (!webhookUrl) {
        return NextResponse.json({ success: false, error: 'Thiếu Webhook URL' }, { status: 400 });
      }

      const testPayload = {
        event: 'alert.test_connection',
        timestamp: new Date().toISOString(),
        message: 'Kiểm tra kết nối Webhook từ Simply IT thành công!',
      };
      const res = await sendZaloWebhook(webhookUrl, testPayload);
      if (res.success) {
        return NextResponse.json({ success: true, message: 'Đã gửi payload thử nghiệm tới Webhook thành công!' });
      }
      return NextResponse.json({ success: false, error: res.error || 'Gửi Webhook thất bại' }, { status: 400 });
    }

    // 3. Test Email
    if (action === 'test_email') {
      const { email } = body;
      if (!email) {
        return NextResponse.json({ success: false, error: 'Thiếu địa chỉ email nhận' }, { status: 400 });
      }

      const testHtml = `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #2563eb;">🧪 Kiểm tra cấu hình Email cảnh báo - Simply IT</h2>
          <p>Email này được gửi để xác nhận tính năng gửi email cảnh báo tự động hoạt động bình thường.</p>
          <p>Thời gian: <b>${new Date().toLocaleString('vi-VN')}</b></p>
        </div>
      `;
      const res = await sendEmail({
        to: email,
        subject: '[SIMPLY IT] Thử nghiệm gửi email cảnh báo',
        html: testHtml,
      });

      if (res.success) {
        return NextResponse.json({ success: true, message: `Đã gửi email thử nghiệm thành công tới ${email}!` });
      }
      return NextResponse.json({ success: false, error: res.error || 'Gửi email thất bại' }, { status: 400 });
    }

    // 4. Run full scan & dispatch
    const appUrl = req.nextUrl.origin;
    const result = await runDailyAlertJob(appUrl);

    return NextResponse.json({
      success: true,
      message: `Đã quét hoàn tất: ${result.totalExpiring} mục sắp đến hạn.`,
      data: result,
    });
  } catch (err: any) {
    console.error('Alert Scanner POST Error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Lỗi quét cảnh báo' }, { status: 500 });
  }
}
