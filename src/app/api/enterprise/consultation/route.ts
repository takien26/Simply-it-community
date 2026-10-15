import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fullName, email, phone, company, message } = body;

    const user = await getCurrentUser().catch(() => null);

    const subject = `[SIMPLY IT] Đăng ký tư vấn bản Enterprise - ${company || fullName || 'Khách hàng'}`;
    const formattedBody = `
Kính gửi tác giả Tạ Trung Kiên (SIMPLY IT),

Hệ thống vừa nhận được yêu cầu tư vấn / nhận báo giá bản quyền SIMPLY IT Enterprise:

• Họ và tên: ${fullName || 'N/A'}
• Email công việc: ${email || 'N/A'}
• Số điện thoại / Zalo: ${phone || 'N/A'}
• Tên Doanh nghiệp: ${company || 'N/A'}
• Nhu cầu cụ thể:
${message || 'Quan tâm tư vấn tính năng bản quyền Enterprise'}

• Người gửi tài khoản: ${user ? `${user.fullName} (${user.email})` : 'Khách vãng lai / Trực tiếp'}
• Thời gian ghi nhận: ${new Date().toLocaleString('vi-VN')}
--------------------------------------------------
SIMPLY IT Community Edition System Auto-Logger
    `.trim();

    // 1. Ghi nhận log vào CSDL để không bao giờ bị thất lạc thông tin lead
    try {
      await prisma.emailLog.create({
        data: {
          toEmail: 'takien26@gmail.com',
          subject,
          status: 'RECEIVED',
          error: `Họ tên: ${fullName || ''} | SĐT: ${phone || ''} | Cty: ${company || ''} | Email: ${email || ''}`,
          sentAt: new Date(),
        },
      });
    } catch (logErr) {
      console.warn('[Enterprise Consultation] Failed to write emailLog:', logErr);
    }

    // 2. Thử gửi mail qua SMTP nếu hệ thống có cấu hình SMTP
    let emailSent = false;
    try {
      const emailResult = await sendEmail({
        to: 'takien26@gmail.com',
        subject,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 12px;">
            <div style="background: linear-gradient(135deg, #312e81, #1e3a8a); color: white; padding: 16px 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="margin: 0; font-size: 18px;">SIMPLY IT — Yêu Cầu Tư Vấn Bản Enterprise</h2>
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr><td style="padding: 8px 0; color: #64748b; width: 140px;"><strong>Họ và tên:</strong></td><td style="padding: 8px 0; color: #0f172a; font-weight: bold;">${fullName || 'N/A'}</td></tr>
              <tr><td style="padding: 8px 0; color: #64748b;"><strong>Email công việc:</strong></td><td style="padding: 8px 0; color: #2563eb;"><a href="mailto:${email}">${email || 'N/A'}</a></td></tr>
              <tr><td style="padding: 8px 0; color: #64748b;"><strong>Số điện thoại / Zalo:</strong></td><td style="padding: 8px 0; color: #0f172a; font-weight: bold;">${phone || 'N/A'}</td></tr>
              <tr><td style="padding: 8px 0; color: #64748b;"><strong>Doanh nghiệp:</strong></td><td style="padding: 8px 0; color: #0f172a; font-weight: bold;">${company || 'N/A'}</td></tr>
              <tr><td style="padding: 8px 0; color: #64748b; vertical-align: top;"><strong>Nhu cầu cụ thể:</strong></td><td style="padding: 8px 0; color: #334155; white-space: pre-wrap;">${message || 'Quan tâm tính năng Enterprise'}</td></tr>
            </table>
            <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
              Thời gian gửi: ${new Date().toLocaleString('vi-VN')} • Gửi từ SIMPLY IT Portal
            </div>
          </div>
        `,
      });
      emailSent = emailResult.success;
    } catch {
      // SMTP chưa cấu hình, không sao vì phía client sẽ tự mở Outlook
    }

    return NextResponse.json({
      success: true,
      emailSent,
      data: {
        to: 'takien26@gmail.com',
        subject,
        formattedBody,
      },
    });
  } catch (error: any) {
    console.error('[Enterprise Consultation API Error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Lỗi xử lý yêu cầu tư vấn' },
      { status: 500 }
    );
  }
}
