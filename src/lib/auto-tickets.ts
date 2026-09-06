import { prisma } from './db';
import { TicketCategory, TicketPriority } from '@prisma/client';
import { sendEmail } from './email';

let lastSyncTime = 0;
const SYNC_INTERVAL_MS = 10 * 60 * 1000; // 10 phút

/**
 * Tự động quét và tạo Ticket cảnh báo cho toàn bộ đội ngũ IT
 * khi có License hoặc Dịch vụ IT sắp đến hạn hoặc quá hạn gia hạn.
 */
export async function syncExpiryTickets(force = false): Promise<{ createdCount: number }> {
  const nowTime = Date.now();
  if (!force && nowTime - lastSyncTime < SYNC_INTERVAL_MS) {
    return { createdCount: 0 };
  }
  lastSyncTime = nowTime;

  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // 1. Lấy tài khoản System Admin làm người tạo tự động
    const adminUser = await prisma.user.findFirst({
      where: {
        OR: [
          { role: { name: { in: ['Admin', 'IT Admin', 'Asset Manager'] } } },
          { email: 'admin@company.com' },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });

    if (!adminUser) {
      console.warn('Auto-ticket: Không tìm thấy tài khoản Admin để làm người tạo.');
      return { createdCount: 0 };
    }

    let createdCount = 0;

    // 2. Quét License sắp hết hạn (trong vòng 30 ngày)
    const expiringLicenses = await prisma.license.findMany({
      where: {
        expiryDate: { lte: thirtyDaysFromNow },
        status: { not: 'EXPIRED' },
      },
      include: {
        vendor: { select: { name: true } },
      },
    });

    for (const lic of expiringLicenses) {
      if (!lic.expiryDate) continue;
      const daysLeft = Math.ceil((new Date(lic.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const isOverdue = daysLeft < 0;

      const licenseTitleTag = `[HẾT HẠN LICENSE] ${lic.name}`;

      // Kiểm tra xem đã có ticket OPEN hoặc IN_PROGRESS cho license này chưa
      const existingTicket = await prisma.ticket.findFirst({
        where: {
          title: { contains: lic.name },
          category: 'LICENSE',
          status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING'] },
        },
      });

      if (!existingTicket) {
        const totalTickets = await prisma.ticket.count();
        const ticketNumber = `TK-${currentYear}-${String(totalTickets + 1).padStart(4, '0')}`;

        const priority: TicketPriority = isOverdue || daysLeft <= 7 ? 'URGENT' : 'HIGH';
        const formattedDate = new Date(lic.expiryDate).toLocaleDateString('vi-VN');

        const description = `🔔 [TỰ ĐỘNG ĐẨY TỪ HỆ THỐNG CẢNH BÁO ITSM]
Bản quyền phần mềm "${lic.name}" ${isOverdue ? `ĐÃ HẾT HẠN (${Math.abs(daysLeft)} ngày trước)` : `SẮP HẾT HẠN sau ${daysLeft} ngày`} (Hạn dùng: ${formattedDate}).

📋 THÔNG TIN CHI TIẾT BẢN QUYỀN:
- Tên phần mềm: ${lic.name}
- Loại License: ${lic.licenseType}
- Số lượng Seat: ${lic.usedSeats} / ${lic.totalSeats} seats đã cấp phát
- Công ty quản lý: ${lic.companyName || 'Công ty chung'}
- Nhà cung cấp: ${lic.vendor?.name || 'Chưa cập nhật'}
- Số Hợp Đồng: ${lic.contractNumber || 'Chưa cập nhật'}
- Số Hóa Đơn: ${lic.invoiceNumber || 'Chưa cập nhật'}
${lic.notes ? `- Ghi chú: ${lic.notes}` : ''}

👉 Đề nghị IT phụ trách kiểm tra số lượng nhân sự đang dùng và lập đề xuất gia hạn bản quyền kịp thời.`;

        await prisma.ticket.create({
          data: {
            ticketNumber,
            title: licenseTitleTag,
            description,
            category: 'LICENSE',
            priority,
            status: 'OPEN',
            createdById: adminUser.id,
            companyName: lic.companyName || undefined,
            dueDate: lic.expiryDate,
          },
        });

        createdCount++;
        console.log(`[Auto-Ticket] Đã tạo cảnh báo Ticket #${ticketNumber} cho License: ${lic.name}`);

        // Trigger email notification to Admin
        if (adminUser.email) {
          sendEmail({
            to: adminUser.email,
            templateCode: 'license.expiring',
            data: {
              licenseName: lic.name,
              vendorName: lic.vendor?.name || 'N/A',
              expiryDate: formattedDate,
              daysLeft: String(daysLeft),
            },
          }).catch(() => {});
        }
      }
    }

    // 3. Quét Dịch vụ & Thuê bao IT sắp đến hạn gia hạn
    const expiringServices = await prisma.iTService.findMany({
      where: {
        renewalDate: { lte: thirtyDaysFromNow },
        status: { in: ['ACTIVE', 'PENDING_RENEWAL'] },
      },
      include: {
        vendor: { select: { name: true } },
        location: { select: { name: true } },
      },
    });

    for (const svc of expiringServices) {
      if (!svc.renewalDate) continue;
      const daysLeft = Math.ceil((new Date(svc.renewalDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const isOverdue = daysLeft < 0;

      const serviceTitleTag = `[GIA HẠN DỊCH VỤ] ${svc.name} (${svc.serviceCode})`;

      // Kiểm tra xem đã có ticket OPEN hoặc IN_PROGRESS cho dịch vụ này chưa
      const existingTicket = await prisma.ticket.findFirst({
        where: {
          OR: [
            { title: { contains: svc.serviceCode } },
            { title: { contains: svc.name } },
          ],
          status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING'] },
        },
      });

      if (!existingTicket) {
        const totalTickets = await prisma.ticket.count();
        const ticketNumber = `TK-${currentYear}-${String(totalTickets + 1).padStart(4, '0')}`;

        const priority: TicketPriority = isOverdue || daysLeft <= 7 ? 'URGENT' : 'HIGH';
        const formattedDate = new Date(svc.renewalDate).toLocaleDateString('vi-VN');
        const formattedCost = svc.cost ? `${Number(svc.cost).toLocaleString('vi-VN')} VNĐ` : 'Miễn phí / Trọn gói';

        const description = `🔔 [TỰ ĐỘNG ĐẨY TỪ HỆ THỐNG CẢNH BÁO ITSM]
Gói Dịch vụ / Thuê bao IT "${svc.name}" [Mã: ${svc.serviceCode}] ${isOverdue ? `ĐÃ QUÁ HẠN GIA HẠN (${Math.abs(daysLeft)} ngày)` : `CẦN GIA HẠN sau ${daysLeft} ngày`} (Ngày đến hạn: ${formattedDate}).

🌐 THÔNG TIN CHI TIẾT DỊCH VỤ:
- Tên dịch vụ: ${svc.name}
- Phân loại: ${svc.serviceType}
- Chi phí chu kỳ: ${formattedCost} (${svc.billingCycle})
- Mã thuê bao: ${svc.accountNumber || 'Chưa cập nhật'}
- IP Tĩnh / Băng thông: ${(svc.specs as any)?.ipStatic || (svc.specs as any)?.bandwidth || 'Không có'}
- Nhà mạng / Đối tác: ${svc.vendor?.name || 'Chưa cập nhật'}
- Hotline hỗ trợ đối tác: ${svc.contactSupport || 'Chưa cập nhật'}
- Công ty quản lý: ${svc.companyName || 'Công ty chung'} ${svc.location?.name ? `(${svc.location.name})` : ''}
${svc.notes ? `- Ghi chú: ${svc.notes}` : ''}

👉 Đề nghị IT phụ trách kiểm tra hợp đồng dịch vụ và thanh toán gia hạn duy trì đường truyền/thuê bao.`;

        await prisma.ticket.create({
          data: {
            ticketNumber,
            title: serviceTitleTag,
            description,
            category: 'NETWORK',
            priority,
            status: 'OPEN',
            createdById: adminUser.id,
            companyName: svc.companyName || undefined,
            dueDate: svc.renewalDate,
          },
        });

        createdCount++;
        console.log(`[Auto-Ticket] Đã tạo cảnh báo Ticket #${ticketNumber} cho Dịch vụ: ${svc.name}`);
      }
    }

    return { createdCount };
  } catch (error) {
    console.error('Lỗi khi tự động đồng bộ Ticket hết hạn:', error);
    return { createdCount: 0 };
  }
}
