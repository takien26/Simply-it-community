import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { testSmtpConnection, sendEmail, SmtpConfig } from '@/lib/email';

// POST /api/email/test
// Tests either current saved settings or preview credentials
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { host, port, user: smtpUser, pass, secure, fromName, fromEmail, testRecipient } = body;

    // Test connection first
    const config: SmtpConfig = {
      host,
      port: Number(port) || 587,
      user: smtpUser,
      pass,
      secure: Boolean(secure),
      fromName: fromName || 'SIMPLY IT',
      fromEmail: fromEmail || smtpUser,
      enabled: true,
    };

    const testRes = await testSmtpConnection(config);
    if (!testRes.success) {
      return NextResponse.json({ success: false, error: testRes.message }, { status: 400 });
    }

    // If testRecipient provided, send a sample email
    if (testRecipient) {
      const sendRes = await sendEmail({
        to: testRecipient,
        subject: '🔔 [SIMPLY IT] Kiểm tra kết nối Email thành công',
        html: `
          <h3>Xin chúc mừng! 🎉</h3>
          <p>Hệ thống SIMPLY IT đã kết nối thành công đến máy chủ Email SMTP của bạn.</p>
          <div class="highlight-box">
            <p><strong>Máy chủ SMTP:</strong> ${config.host}:${config.port}</p>
            <p><strong>Tài khoản:</strong> ${config.user}</p>
            <p><strong>Thời gian kiểm tra:</strong> ${new Date().toLocaleString('vi-VN')}</p>
          </div>
          <p>Kể từ bây giờ, các thông báo về Ticket, Phân công, License và Phê duyệt sẽ được tự động gửi qua email này.</p>
        `,
      });

      if (!sendRes.success) {
        return NextResponse.json({
          success: true,
          message: 'Kết nối SMTP thành công nhưng không gửi được email test: ' + sendRes.error,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: testRecipient
        ? `Kết nối thành công & đã gửi email thử nghiệm đến ${testRecipient}`
        : 'Kết nối SMTP máy chủ thành công!',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Lỗi kiểm tra email' }, { status: 500 });
  }
}
