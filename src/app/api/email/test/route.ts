import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { testSmtpConnection, sendEmail, getSmtpConfig, SmtpConfig } from '@/lib/email';

// POST /api/email/test
// Tests either current saved settings or preview credentials
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { host, port, user: smtpUser, pass, secure, fromName, fromEmail, testRecipient, testEmail } = body;
    const recipient = testRecipient || testEmail;

    // Load saved DB config as baseline fallback
    const savedConfig = await getSmtpConfig();

    const effectiveHost = (host !== undefined && host !== '') ? host.trim() : savedConfig.host;
    const effectiveUser = (smtpUser !== undefined && smtpUser !== '') ? smtpUser.trim() : savedConfig.user;
    const effectivePass = (pass !== undefined && pass !== '') ? pass : savedConfig.pass;
    const effectivePort = port ? Number(port) : (savedConfig.port || 587);
    const effectiveSecure = secure !== undefined ? Boolean(secure) : savedConfig.secure;
    const effectiveFromName = fromName || savedConfig.fromName || 'SIMPLY IT';
    const effectiveFromEmail = fromEmail || savedConfig.fromEmail || effectiveUser || 'noreply@company.com';

    if (!effectiveHost) {
      return NextResponse.json(
        {
          success: false,
          error: 'Chưa cấu hình Máy chủ SMTP (Host trống). Vui lòng điền thông tin máy chủ SMTP (ví dụ: smtp.office365.com, smtp.gmail.com) và bấm Lưu cấu hình.',
        },
        { status: 400 }
      );
    }

    // Test connection first
    const config: SmtpConfig = {
      host: effectiveHost,
      port: effectivePort,
      user: effectiveUser,
      pass: effectivePass,
      secure: effectiveSecure,
      fromName: effectiveFromName,
      fromEmail: effectiveFromEmail,
      enabled: true,
    };

    const testRes = await testSmtpConnection(config);
    if (!testRes.success) {
      return NextResponse.json({ success: false, error: testRes.message }, { status: 400 });
    }

    // If recipient provided, send a sample email using the verified config
    if (recipient) {
      const sendRes = await sendEmail({
        to: recipient,
        subject: '🔔 [SIMPLY IT] Kiểm tra kết nối Email thành công',
        html: `
          <h3>Xin chúc mừng! 🎉</h3>
          <p>Hệ thống SIMPLY IT đã kết nối thành công đến máy chủ Email SMTP của bạn.</p>
          <div style="background:#f1f5f9;padding:12px 16px;border-radius:8px;margin:16px 0;font-size:13px;line-height:1.6;">
            <p style="margin:0 0 4px 0;"><strong>Máy chủ SMTP:</strong> ${config.host}:${config.port} (${config.secure ? 'SSL/TLS' : 'STARTTLS'})</p>
            <p style="margin:0 0 4px 0;"><strong>Tài khoản:</strong> ${config.user || 'Không xác thực'}</p>
            <p style="margin:0;"><strong>Thời gian kiểm tra:</strong> ${new Date().toLocaleString('vi-VN')}</p>
          </div>
          <p>Kể từ bây giờ, các thông báo về Ticket, Phân công công việc, License và Phê duyệt tài sản sẽ được tự động gửi qua email này.</p>
        `,
        customConfig: config,
      });

      if (!sendRes.success) {
        return NextResponse.json({
          success: false,
          error: 'Kết nối SMTP thành công nhưng không gửi được email thử nghiệm: ' + sendRes.error,
        }, { status: 400 });
      }
    }

    return NextResponse.json({
      success: true,
      message: recipient
        ? `Kết nối thành công & đã gửi email thử nghiệm đến ${recipient}`
        : 'Kết nối SMTP máy chủ thành công!',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Lỗi kiểm tra email' }, { status: 500 });
  }
}
