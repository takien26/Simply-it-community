import { prisma } from './db';

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: any;
}

export async function dispatchWebhookEvent(event: string, data: any): Promise<void> {
  try {
    const webhooks = await prisma.webhookConfig.findMany({
      where: { isActive: true },
    });

    for (const hook of webhooks) {
      const eventsList = Array.isArray(hook.events) ? (hook.events as string[]) : [];
      if (eventsList.length > 0 && !eventsList.includes(event) && !eventsList.includes('*')) {
        continue;
      }

      // Non-blocking dispatch
      (async () => {
        try {
          let bodyPayload: any;
          const isTelegram = hook.provider === 'telegram' || hook.webhookUrl.includes('api.telegram.org');

          if (isTelegram) {
            let chatId: string | null = null;
            let finalUrl = hook.webhookUrl;

            try {
              const urlObj = new URL(hook.webhookUrl);
              chatId = urlObj.searchParams.get('chat_id');
            } catch {}

            let tgText = '';
            if (event === 'ticket.urgent') {
              tgText =
                `🚨 <b>[SIMPLY IT] TICKET P1 KHẨN CẤP!</b>\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `🎫 <b>Mã ticket:</b> <code>${data?.ticketNumber || 'N/A'}</code>\n` +
                `📌 <b>Tiêu đề:</b> ${data?.title || 'Sự cố'}\n` +
                `👤 <b>Người tạo:</b> ${data?.creator || 'N/A'}\n` +
                `👨‍💻 <b>Kỹ thuật viên:</b> ${data?.assignedTo || 'Chưa gán'}\n` +
                `⏳ <b>Hạn SLA:</b> ${data?.slaDeadline || '4 giờ'}\n` +
                `📝 <b>Mô tả:</b> ${data?.description ? String(data.description).slice(0, 180) + '...' : 'Không có'}\n\n` +
                `🔗 <a href="${data?.link || '#'}">👉 Bấm vào đây để mở và xử lý Ticket</a>`;
            } else if (event === 'ticket.created') {
              tgText =
                `🎫 <b>[SIMPLY IT] CÓ TICKET MỚI</b>\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `📌 <b>Mã:</b> <code>${data?.ticketNumber || 'N/A'}</code> | <b>Ưu tiên:</b> ${data?.priority || 'MEDIUM'}\n` +
                `📋 <b>Tiêu đề:</b> ${data?.title || 'Yêu cầu hỗ trợ'}\n` +
                `👤 <b>Người gửi:</b> ${data?.creator || 'N/A'}\n` +
                `📂 <b>Danh mục:</b> ${data?.category || 'N/A'}\n\n` +
                `🔗 <a href="${data?.link || '#'}">👉 Xem chi tiết Ticket</a>`;
            } else if (event === 'approval.pending') {
              tgText =
                `📋 <b>[SIMPLY IT] YÊU CẦU PHÊ DUYỆT MỚI</b>\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `🔖 <b>Mã yêu cầu:</b> <code>${data?.code || 'N/A'}</code>\n` +
                `📑 <b>Tiêu đề:</b> ${data?.title || 'N/A'}\n` +
                `👤 <b>Người yêu cầu:</b> ${data?.requesterName || 'Nhân viên'}\n` +
                `🏢 <b>Phòng ban:</b> ${data?.department || 'N/A'}\n` +
                `💰 <b>Chi phí:</b> ${data?.estimatedCost ? Number(data.estimatedCost).toLocaleString('vi-VN') + ' ' + (data?.currency || 'VND') : 'Không có'}\n\n` +
                `🔗 <a href="${data?.link || '#'}">👉 Bấm vào đây để Xem & Phê Duyệt</a>`;
            } else if (event === 'spare_part.low_stock') {
              tgText =
                `⚠️ <b>[SIMPLY IT] CẢNH BÁO TỒN KHO LINH KIỆN NGUY CẤP!</b>\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `📦 <b>Linh kiện:</b> ${data?.name || 'N/A'}\n` +
                `🏷️ <b>Mã SKU:</b> <code>${data?.sku || 'N/A'}</code>\n` +
                `📉 <b>Số lượng còn lại:</b> <b>${data?.remaining} ${data?.unit || 'cái'}</b> (Mức tối thiểu: ${data?.minStock})\n` +
                `👤 <b>Người xuất kho:</b> ${data?.performedBy || 'KTV IT'}\n\n` +
                `👉 <a href="${data?.link || '/spare-parts?lowStock=true'}">Bấm vào đây để kiểm tra & Đề xuất nhập kho</a>`;
            } else if (event === 'ticket.sla_escalation') {
              tgText =
                `🚨 <b>[SIMPLY IT] CẢNH BÁO LEO THANG — NGUY CƠ VỠ SLA!</b>\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `🎫 <b>Mã ticket:</b> <code>${data?.ticketNumber || 'N/A'}</code>\n` +
                `📌 <b>Tiêu đề:</b> ${data?.title || 'Sự cố'}\n` +
                `⏱️ <b>Thời gian đã trôi:</b> <b>${data?.elapsedRatio}%</b> (Còn lại: ~${data?.remainingMinutes} phút)\n` +
                `👨‍💻 <b>Kỹ thuật viên:</b> ${data?.assignedTo || 'Chưa gán'}\n` +
                `⚡ <b>Hành động tự động:</b> ${data?.actionTaken || 'Điều phối tự động'}\n\n` +
                `🔗 <a href="/tickets?id=${data?.ticketId}">👉 Bấm vào đây để can thiệp & Xử lý gấp</a>`;
            } else {
              const details = Object.entries(data || {})
                .filter(([_, v]) => typeof v === 'string' || typeof v === 'number')
                .slice(0, 5)
                .map(([k, v]) => `▫️ <b>${k}:</b> ${v}`)
                .join('\n');

              tgText =
                `🔔 <b>[SIMPLY IT] SỰ KIỆN: ${event}</b>\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `⏰ <b>Thời gian:</b> ${new Date().toLocaleString('vi-VN')}\n` +
                (details ? `${details}\n\n` : '\n') +
                (data?.link ? `🔗 <a href="${data.link}">👉 Xem trên hệ thống</a>` : '');
            }

            bodyPayload = {
              text: tgText,
              parse_mode: 'HTML',
              disable_web_page_preview: false,
            };

            if (chatId) {
              bodyPayload.chat_id = chatId;
            }
          } else if (hook.provider === 'teams') {
            bodyPayload = {
              '@type': 'MessageCard',
              '@context': 'http://schema.org/extensions',
              themeColor: event.includes('urgent') ? 'DC2626' : '2563EB',
              summary: `[SIMPLY IT] ${event}`,
              sections: [
                {
                  activityTitle: `🔔 [SIMPLY IT] Sự kiện: ${event}`,
                  activitySubtitle: new Date().toLocaleString('vi-VN'),
                  facts: Object.entries(data || {})
                    .filter(([_, v]) => typeof v === 'string' || typeof v === 'number')
                    .slice(0, 6)
                    .map(([k, v]) => ({ name: k, value: String(v) })),
                  markdown: true,
                },
              ],
            };
          } else if (hook.provider === 'slack') {
            bodyPayload = {
              text: `🔔 *[SIMPLY IT]* Sự kiện: \`${event}\`\n${JSON.stringify(data, null, 2)}`,
            };
          } else {
            // Default & Zalo / Custom Webhook JSON format
            bodyPayload = {
              event,
              timestamp: new Date().toISOString(),
              data,
            };
          }

          await fetch(hook.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyPayload),
          });
        } catch (dispatchErr) {
          console.error(`[Webhook ${hook.name} Dispatch Error]:`, dispatchErr);
        }
      })();
    }
  } catch (err) {
    console.error('[Webhook System Error]:', err);
  }
}
