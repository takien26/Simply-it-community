import nodemailer from 'nodemailer';
import { prisma } from './db';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
  enabled: boolean;
}

export async function getSmtpConfig(): Promise<SmtpConfig> {
  const settings = await prisma.systemSetting.findMany({
    where: {
      key: {
        in: [
          'email.smtp_host',
          'email.smtp_port',
          'email.smtp_user',
          'email.smtp_password',
          'email.smtp_from_name',
          'email.from_name',
          'email.smtp_from_email',
          'email.from_email',
          'email.smtp_enabled',
          'email.enabled',
          'email.smtp_secure',
        ],
      },
    },
  });

  const settingMap = new Map(settings.map((s) => [s.key, s.value]));

  const host = settingMap.get('email.smtp_host') || process.env.SMTP_HOST || '';
  const port = parseInt(settingMap.get('email.smtp_port') || process.env.SMTP_PORT || '587');
  const user = settingMap.get('email.smtp_user') || process.env.SMTP_USER || '';
  const pass = settingMap.get('email.smtp_password') || process.env.SMTP_PASS || '';
  const fromName = settingMap.get('email.from_name') || settingMap.get('email.smtp_from_name') || 'SIMPLY IT';
  const fromEmail = settingMap.get('email.from_email') || settingMap.get('email.smtp_from_email') || user || 'noreply@company.com';

  const rawEnabled = settingMap.get('email.enabled') ?? settingMap.get('email.smtp_enabled');
  const enabled = rawEnabled !== undefined ? rawEnabled === 'true' : Boolean(host && user);
  const secure = settingMap.get('email.smtp_secure') === 'true' || port === 465;

  return { host, port, secure, user, pass, fromName, fromEmail, enabled };
}

export async function createTransporter(customConfig?: Partial<SmtpConfig>) {
  const config = customConfig ? { ...(await getSmtpConfig()), ...customConfig } : await getSmtpConfig();

  if (!config.host || !config.user) {
    return null;
  }

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });
}

export function renderTemplate(templateStr: string, variables: Record<string, any>): string {
  let result = templateStr;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    result = result.replace(regex, String(value ?? ''));
  }
  return result;
}

export async function sendEmail({
  to,
  templateCode,
  data = {},
  subject,
  html,
  customConfig,
}: {
  to: string;
  templateCode?: string;
  data?: Record<string, any>;
  subject?: string;
  html?: string;
  customConfig?: Partial<SmtpConfig>;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const baseConfig = await getSmtpConfig();
    const config = customConfig ? { ...baseConfig, ...customConfig } : baseConfig;

    if (!config.enabled && !process.env.FORCE_EMAIL && !customConfig) {
      console.log(`[Email] SMTP is disabled. Skipped sending email to ${to}`);
      return { success: false, error: 'SMTP is disabled' };
    }

    let finalSubject = subject || '';
    let finalHtml = html || '';
    let templateId: string | undefined;

    if (templateCode) {
      const template = await prisma.emailTemplate.findUnique({
        where: { code: templateCode },
      });

      if (template && template.isActive) {
        templateId = template.id;
        finalSubject = subject || renderTemplate(template.subject, data);
        finalHtml = html || renderTemplate(template.bodyHtml, data);
      }
    }

    // Built-in fallback template for ticket.resolved with 1-click CSAT buttons
    if (templateCode === 'ticket.resolved' && (!finalSubject || !finalHtml)) {
      finalSubject = `[Hoàn thành] Ticket #${data.ticketNumber}: ${data.title}`;
      finalHtml = `
        <p>Xin chào <strong>${data.creatorName || 'bạn'}</strong>,</p>
        <p>Yêu cầu hỗ trợ của bạn với mã số <strong>#${data.ticketNumber}</strong> đã được kỹ thuật viên <strong>${data.assigneeName || 'IT Support'}</strong> xử lý hoàn tất.</p>
        <div class="highlight-box">
          <p style="margin: 0 0 6px 0;"><strong>Tiêu đề sự cố:</strong> ${data.title}</p>
          <p style="margin: 0;"><strong>Trạng thái:</strong> <span style="color: #16a34a; font-weight: bold;">ĐÃ GIẢI QUYẾT HOÀN TẤT</span></p>
        </div>
        <p><strong>Khảo sát 1-click:</strong> Hãy dành 5 giây đánh giá mức độ hài lòng của bạn về chất lượng hỗ trợ của IT:</p>
        <div style="margin: 16px 0; text-align: center;">
          <a href="${data.rate5Url || `${data.link}&rate=5`}" style="display: inline-block; margin: 4px; padding: 10px 14px; background: #ecfdf5; border: 1px solid #10b981; border-radius: 10px; color: #047857; text-decoration: none; font-weight: bold; font-size: 13px;">😍 Rất hài lòng (5★)</a>
          <a href="${data.rate4Url || `${data.link}&rate=4`}" style="display: inline-block; margin: 4px; padding: 10px 14px; background: #eff6ff; border: 1px solid #3b82f6; border-radius: 10px; color: #1d4ed8; text-decoration: none; font-weight: bold; font-size: 13px;">😊 Hài lòng (4★)</a>
          <a href="${data.rate3Url || `${data.link}&rate=3`}" style="display: inline-block; margin: 4px; padding: 10px 14px; background: #fefce8; border: 1px solid #eab308; border-radius: 10px; color: #a16207; text-decoration: none; font-weight: bold; font-size: 13px;">😐 Bình thường (3★)</a>
          <a href="${data.rate1Url || `${data.link}&rate=1`}" style="display: inline-block; margin: 4px; padding: 10px 14px; background: #fef2f2; border: 1px solid #ef4444; border-radius: 10px; color: #b91c1c; text-decoration: none; font-weight: bold; font-size: 13px;">😞 Chưa hài lòng (1★)</a>
        </div>
        <p><a href="${data.link}" class="btn" style="color: #ffffff !important;">Xem chi tiết Ticket trên hệ thống</a></p>
      `;
    }

    if (!finalSubject || !finalHtml) {
      return { success: false, error: 'Missing subject or body template' };
    }

    const transporter = await createTransporter(config);
    if (!transporter) {
      return { success: false, error: 'Transporter not configured' };
    }

    // Default HTML Email layout with nice branding
    const styledHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
          .header { background: #2563eb; color: #ffffff; padding: 24px; text-align: center; }
          .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.025em; }
          .content { padding: 32px 24px; font-size: 14px; line-height: 1.6; color: #334155; }
          .footer { background: #f1f5f9; padding: 16px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
          .btn { display: inline-block; padding: 10px 20px; background: #2563eb; color: #ffffff !important; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px; }
          .highlight-box { background: #f8fafc; border-left: 4px solid #2563eb; padding: 12px 16px; margin: 16px 0; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${config.fromName}</h1>
          </div>
          <div class="content">
            ${finalHtml}
          </div>
          <div class="footer">
            <p>Email này được gửi tự động từ hệ thống quản lý IT ${config.fromName}. Vui lòng không trả lời trực tiếp email này.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const info = await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to,
      subject: finalSubject,
      html: styledHtml,
    });

    // Record log
    await prisma.emailLog.create({
      data: {
        templateId,
        toEmail: to,
        subject: finalSubject,
        status: 'SENT',
        sentAt: new Date(),
      },
    });

    return { success: true };
  } catch (error: any) {
    console.error('[Email Error]:', error);

    // Record failed log
    try {
      await prisma.emailLog.create({
        data: {
          toEmail: to,
          subject: subject || templateCode || 'Unknown',
          status: 'FAILED',
          error: error.message || String(error),
        },
      });
    } catch {}

    return { success: false, error: error.message || 'Failed to send email' };
  }
}

export async function testSmtpConnection(config: SmtpConfig): Promise<{ success: boolean; message: string }> {
  try {
    if (!config.host || !config.host.trim()) {
      return {
        success: false,
        message: 'Máy chủ SMTP (Host) không được để trống. Vui lòng nhập địa chỉ máy chủ (vd: smtp.office365.com, smtp.gmail.com).',
      };
    }

    const transporter = nodemailer.createTransport({
      host: config.host.trim(),
      port: config.port,
      secure: config.secure,
      auth: config.user
        ? {
            user: config.user.trim(),
            pass: config.pass,
          }
        : undefined,
      connectionTimeout: 10000,
    });

    await transporter.verify();
    return { success: true, message: 'Kết nối SMTP thành công!' };
  } catch (error: any) {
    let msg = error.message || 'Không thể kết nối đến máy chủ SMTP';
    if (error.code === 'ECONNREFUSED') {
      msg = `Không thể kết nối tới máy chủ SMTP (${config.host}:${config.port}). Máy chủ từ chối kết nối (ECONNREFUSED). Vui lòng kiểm tra lại địa chỉ Host và Cổng (Port).`;
    } else if (error.code === 'ETIMEDOUT') {
      msg = `Kết nối đến máy chủ SMTP (${config.host}:${config.port}) bị quá hạn (ETIMEDOUT). Vui lòng kiểm tra tường lửa mạng hoặc kiểm tra lại cổng SMTP.`;
    } else if (error.responseCode === 535 || error.message?.toLowerCase().includes('authentication')) {
      msg = 'Đăng nhập SMTP thất bại (535 Authentication failed). Vui lòng kiểm tra lại tên tài khoản hoặc Mật khẩu ứng dụng (App Password).';
    }
    return { success: false, message: msg };
  }
}
