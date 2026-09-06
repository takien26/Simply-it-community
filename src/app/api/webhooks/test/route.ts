import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { webhookUrl, provider } = body;

    if (!webhookUrl) {
      return NextResponse.json({ error: 'Missing webhook URL' }, { status: 400 });
    }

    let payload: any;
    if (provider === 'teams') {
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
