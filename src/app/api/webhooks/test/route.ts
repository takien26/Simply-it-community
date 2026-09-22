import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { hasPermission, isAdminOrAbove } from '@/lib/permissions';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canTest = isAdminOrAbove(user.roleName) || (await hasPermission(user.userId, 'settings.update'));
    if (!canTest) {
      return NextResponse.json({ error: 'Forbidden: Bạn không có quyền kiểm tra kết nối Webhook' }, { status: 403 });
    }

    const body = await request.json();
    const { webhookUrl, provider } = body;

    if (!webhookUrl) {
      return NextResponse.json({ error: 'Missing webhook URL' }, { status: 400 });
    }

    try {
      const parsedUrl = new URL(webhookUrl);
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        return NextResponse.json({ error: 'Webhook URL phải bắt đầu bằng http:// hoặc https://' }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: 'Webhook URL không hợp lệ' }, { status: 400 });
    }

    const isTelegram = provider === 'telegram' || webhookUrl.includes('api.telegram.org');
    let payload: any;
    if (isTelegram) {
      let chatId: string | null = null;
      try {
        const urlObj = new URL(webhookUrl);
        chatId = urlObj.searchParams.get('chat_id');
      } catch {}

      payload = {
        text: `🔔 <b>[SIMPLY IT] Kiểm tra kết nối Telegram Bot thành công! 🎉</b>\n⏰ <b>Thời gian:</b> ${new Date().toLocaleString('vi-VN')}\n🤖 <b>Trạng thái:</b> Bot đã sẵn sàng nhận cảnh báo sự cố IT & Đơn duyệt!`,
        parse_mode: 'HTML',
        disable_web_page_preview: false,
      };

      if (chatId) {
        payload.chat_id = chatId;
      }
    } else if (provider === 'teams') {
      payload = {
        '@type': 'MessageCard',
        '@context': 'http://schema.org/extensions',
        themeColor: '2563EB',
        summary: 'Kiểm tra kết nối Webhook SIMPLY IT',
        sections: [
          {
            activityTitle: '🔔 Kiểm tra kết nối Webhook SIMPLY IT thành công! 🎉',
            activitySubtitle: new Date().toLocaleString('vi-VN'),
            facts: [
              { name: 'Hệ thống', value: 'SIMPLY IT' },
              { name: 'Trạng thái', value: 'Hoạt động tốt' },
            ],
            markdown: true,
          },
        ],
      };
    } else if (provider === 'slack') {
      payload = {
        text: `🔔 *[SIMPLY IT]* Kiểm tra kết nối Webhook thành công! 🎉 (${new Date().toLocaleString('vi-VN')})`,
      };
    } else {
      payload = {
        event: 'test.ping',
        timestamp: new Date().toISOString(),
        message: 'Kết nối Webhook thành công từ SIMPLY IT!',
      };
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return NextResponse.json({
        success: false,
        error: `Máy chủ webhook phản hồi mã lỗi HTTP ${response.status}: ${errText.slice(0, 100)}`,
      });
    }

    return NextResponse.json({ success: true, message: 'Gửi webhook thử nghiệm thành công!' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Lỗi gửi webhook' }, { status: 500 });
  }
}
