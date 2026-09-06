import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/db';

const DEFAULT_TEMPLATES = [
  {
    code: 'ticket.created',
    name: 'Ticket Mới Được Tạo',
    subject: '[{{ticketNumber}}] Yêu cầu hỗ trợ mới: {{title}}',
    bodyHtml: `
      <p>Xin chào <strong>{{recipientName}}</strong>,</p>
      <p>Một yêu cầu hỗ trợ mới đã được tạo trên hệ thống quản lý IT:</p>
      <div class="highlight-box">
        <p><strong>Mã Ticket:</strong> {{ticketNumber}}</p>
        <p><strong>Tiêu đề:</strong> {{title}}</p>
        <p><strong>Độ ưu tiên:</strong> {{priority}}</p>
        <p><strong>Người tạo:</strong> {{creatorName}}</p>
        <p><strong>Nội dung:</strong> {{description}}</p>
      </div>
      <p style="text-align: center; margin: 26px 0 14px;">
        <a href="{{link}}" class="btn" style="display: inline-block; padding: 12px 28px; background: #4f46e5; color: #ffffff !important; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 13.5px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.35); text-align: center;">
          🚀 Bấm Vào Đây Để Xem Chi Tiết Ticket
        </a>
      </p>
      <p style="font-size: 11.5px; color: #64748b; text-align: center; word-break: break-all; margin-top: 8px;">
        Hoặc truy cập trực tiếp: <a href="{{link}}" style="color: #4f46e5; text-decoration: underline;">{{link}}</a>
      </p>
    `,
  },
  {
    code: 'ticket.assigned',
    name: 'Ticket Được Phân Công',
    subject: '[{{ticketNumber}}] Bạn được phân công xử lý ticket: {{title}}',
    bodyHtml: `
      <p>Xin chào <strong>{{assigneeName}}</strong>,</p>
      <p>Bạn vừa được phân công tiếp nhận và xử lý yêu cầu hỗ trợ kỹ thuật sau:</p>
      <div class="highlight-box">
        <p><strong>Mã Ticket:</strong> {{ticketNumber}}</p>
        <p><strong>Tiêu đề:</strong> {{title}}</p>
        <p><strong>Độ ưu tiên:</strong> {{priority}}</p>
        <p><strong>Người yêu cầu:</strong> {{creatorName}}</p>
        <p><strong>Hạn xử lý (SLA):</strong> {{slaDeadline}}</p>
      </div>
      <p style="text-align: center; margin: 26px 0 14px;">
        <a href="{{link}}" class="btn" style="display: inline-block; padding: 12px 28px; background: #4f46e5; color: #ffffff !important; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 13.5px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.35); text-align: center;">
          🚀 Bấm Vào Đây Để Tiếp Nhận &amp; Xử Lý
        </a>
      </p>
      <p style="font-size: 11.5px; color: #64748b; text-align: center; word-break: break-all; margin-top: 8px;">
        Đường dẫn xử lý: <a href="{{link}}" style="color: #4f46e5; text-decoration: underline;">{{link}}</a>
      </p>
    `,
  },
  {
    code: 'ticket.resolved',
    name: 'Ticket Đã Được Giải Quyết',
    subject: '[{{ticketNumber}}] Yêu cầu hỗ trợ của bạn đã hoàn tất',
    bodyHtml: `
      <p>Xin chào <strong>{{creatorName}}</strong>,</p>
      <p>Yêu cầu hỗ trợ kỹ thuật của bạn đã được bộ phận IT xử lý hoàn tất:</p>
      <div class="highlight-box">
        <p><strong>Mã Ticket:</strong> {{ticketNumber}}</p>
        <p><strong>Tiêu đề:</strong> {{title}}</p>
        <p><strong>Kỹ thuật viên xử lý:</strong> {{assigneeName}}</p>
        <p><strong>Ghi chú giải quyết:</strong> {{resolutionNotes}}</p>
      </div>
      <p style="text-align: center; margin: 26px 0 14px;">
        <a href="{{link}}" class="btn" style="display: inline-block; padding: 12px 28px; background: #10b981; color: #ffffff !important; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 13.5px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35); text-align: center;">
          ⭐ Đánh Giá Chất Lượng Phục Vụ &amp; Xem Lại
        </a>
      </p>
      <p style="font-size: 11.5px; color: #64748b; text-align: center; word-break: break-all; margin-top: 8px;">
        Đường dẫn ticket: <a href="{{link}}" style="color: #10b981; text-decoration: underline;">{{link}}</a>
      </p>
    `,
  },
  {
    code: 'approval.pending',
    name: 'Yêu Cầu Phê Duyệt Cấp Thiết Bị',
    subject: '[Phê duyệt] Yêu cầu cấp phát: {{title}}',
    bodyHtml: `
      <p>Xin chào <strong>{{approverName}}</strong>,</p>
      <p>Bạn có một yêu cầu phê duyệt mới cần xem xét và duyệt:</p>
      <div class="highlight-box">
        <p><strong>Mã yêu cầu:</strong> {{approvalCode}}</p>
        <p><strong>Người yêu cầu:</strong> {{requesterName}}</p>
        <p><strong>Loại yêu cầu:</strong> {{approvalType}}</p>
        <p><strong>Chi tiết:</strong> {{title}}</p>
        <p><strong>Lý do:</strong> {{justification}}</p>
      </div>
      <p style="text-align: center; margin: 26px 0 14px;">
        <a href="{{link}}" class="btn" style="display: inline-block; padding: 12px 28px; background: #6366f1; color: #ffffff !important; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 13.5px; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.35); text-align: center;">
          ⚡ Bấm Vào Đây Để Duyệt Hoặc Từ Chối
        </a>
      </p>
      <p style="font-size: 11.5px; color: #64748b; text-align: center; word-break: break-all; margin-top: 8px;">
        Đường dẫn phê duyệt: <a href="{{link}}" style="color: #6366f1; text-decoration: underline;">{{link}}</a>
      </p>
    `,
  },
  {
    code: 'license.expiring',
    name: 'Cảnh Báo License Sắp Hết Hạn',
    subject: '⚠️ Cảnh báo: License {{licenseName}} sắp hết hạn trong {{daysLeft}} ngày',
    bodyHtml: `
      <p>Xin chào Quản trị viên IT,</p>
      <p>Hệ thống ghi nhận bản quyền phần mềm sau sắp hết hạn:</p>
      <div class="highlight-box">
        <p><strong>Tên License:</strong> {{licenseName}}</p>
        <p><strong>Nhà cung cấp:</strong> {{vendorName}}</p>
        <p><strong>Ngày hết hạn:</strong> {{expiryDate}}</p>
        <p><strong>Số ngày còn lại:</strong> <span style="color: #dc2626; font-weight: bold;">{{daysLeft}} ngày</span></p>
      </div>
      <p style="text-align: center; margin: 26px 0 14px;">
        <a href="{{link}}" class="btn" style="display: inline-block; padding: 12px 28px; background: #d97706; color: #ffffff !important; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 13.5px; box-shadow: 0 4px 12px rgba(217, 119, 6, 0.35); text-align: center;">
          🔍 Kiểm Tra &amp; Tiến Hành Gia Hạn License
        </a>
      </p>
      <p style="font-size: 11.5px; color: #64748b; text-align: center; word-break: break-all; margin-top: 8px;">
        Đường dẫn quản lý license: <a href="{{link}}" style="color: #d97706; text-decoration: underline;">{{link}}</a>
      </p>
    `,
  },
  {
    code: 'service.created',
    name: 'Yêu Cầu Dịch Vụ IT Mới',
    subject: '[Dịch vụ IT] Yêu cầu dịch vụ mới: {{serviceName}}',
    bodyHtml: `
      <p>Xin chào <strong>{{recipientName}}</strong>,</p>
      <p>Một yêu cầu dịch vụ IT mới đã được tạo và gửi đến đội ngũ kỹ thuật:</p>
      <div class="highlight-box">
        <p><strong>Tên dịch vụ:</strong> {{serviceName}}</p>
        <p><strong>Nhóm dịch vụ:</strong> {{serviceCategory}}</p>
        <p><strong>Người yêu cầu:</strong> {{requesterName}}</p>
        <p><strong>Phòng ban:</strong> {{department}}</p>
        <p><strong>Độ khẩn cấp:</strong> {{urgency}}</p>
        <p><strong>Chi tiết ghi chú:</strong> {{notes}}</p>
      </div>
      <p style="text-align: center; margin: 26px 0 14px;">
        <a href="{{link}}" class="btn" style="display: inline-block; padding: 12px 28px; background: #0ea5e9; color: #ffffff !important; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 13.5px; box-shadow: 0 4px 12px rgba(14, 165, 233, 0.35); text-align: center;">
          🛠️ Xem &amp; Tiếp Nhận Dịch Vụ IT
        </a>
      </p>
      <p style="font-size: 11.5px; color: #64748b; text-align: center; word-break: break-all; margin-top: 8px;">
        Đường dẫn dịch vụ: <a href="{{link}}" style="color: #0ea5e9; text-decoration: underline;">{{link}}</a>
      </p>
    `,
  },
  {
    code: 'subscription.expiring',
    name: 'Cảnh Báo Hợp Đồng / Thuê Bao IT Tới Hạn',
    subject: '⚠️ Cảnh báo: Thuê bao IT {{serviceName}} sắp tới hạn trong {{daysRemaining}} ngày',
    bodyHtml: `
      <p>Xin chào Quản trị viên IT,</p>
      <p>Hệ thống ghi nhận hợp đồng thuê bao IT định kỳ sau sắp tới hạn thanh toán / gia hạn:</p>
      <div class="highlight-box">
        <p><strong>Tên dịch vụ / Thuê bao:</strong> {{serviceName}}</p>
        <p><strong>Nhà cung cấp:</strong> {{providerName}}</p>
        <p><strong>Số hợp đồng:</strong> {{contractNumber}}</p>
        <p><strong>Chi phí định kỳ:</strong> {{recurringAmount}}</p>
        <p><strong>Ngày tới hạn:</strong> {{expiryDate}}</p>
        <p><strong>Thời gian còn lại:</strong> <span style="color: #dc2626; font-weight: bold;">{{daysRemaining}} ngày</span></p>
      </div>
      <p style="text-align: center; margin: 26px 0 14px;">
        <a href="{{link}}" class="btn" style="display: inline-block; padding: 12px 28px; background: #0284c7; color: #ffffff !important; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 13.5px; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.35); text-align: center;">
          📑 Kiểm Tra Hợp Đồng &amp; Lịch Sử Thanh Toán
        </a>
      </p>
      <p style="font-size: 11.5px; color: #64748b; text-align: center; word-break: break-all; margin-top: 8px;">
        Đường dẫn quản lý thuê bao IT: <a href="{{link}}" style="color: #0284c7; text-decoration: underline;">{{link}}</a>
      </p>
    `,
  },
];

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Auto-upsert default templates to keep them updated
    for (const t of DEFAULT_TEMPLATES) {
      await prisma.emailTemplate.upsert({
        where: { code: t.code },
        update: {
          name: t.name,
        },
        create: t,
      });
    }

    const templates = await prisma.emailTemplate.findMany({
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ success: true, templates });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canUpdate = await hasPermission(user.userId, 'settings.update');
    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden: Bạn không có quyền chỉnh sửa mẫu email hệ thống' }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, subject, bodyHtml, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing template ID' }, { status: 400 });
    }

    const updated = await prisma.emailTemplate.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(subject && { subject }),
        ...(bodyHtml && { bodyHtml }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({ success: true, template: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
