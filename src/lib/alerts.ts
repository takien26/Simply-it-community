import { prisma } from './db';
import { sendEmail } from './email';

export interface AlertScanItem {
  type: 'SERVICE' | 'LICENSE' | 'WARRANTY';
  id: string;
  name: string;
  codeOrTag?: string;
  vendorName?: string;
  assignedTo?: string;
  expiryDate: string;
  daysRemaining: number;
  urgency: 'CRITICAL' | 'WARNING' | 'NOTICE'; // CRITICAL <= 7 days, WARNING <= 15 days, NOTICE <= 30 days
  cost?: number;
  currency?: string;
}

export interface AlertScanResult {
  timestamp: string;
  totalExpiring: number;
  criticalCount: number;
  warningCount: number;
  services: AlertScanItem[];
  licenses: AlertScanItem[];
  warranties: AlertScanItem[];
  dispatchStatus?: {
    telegram?: { success: boolean; message?: string };
    zalo?: { success: boolean; message?: string };
    email?: { success: boolean; message?: string; recipients?: string[] };
  };
}

/**
 * Scan for expiring IT Services, Licenses, and Asset Warranties
 */
export async function scanExpiringAlerts(daysThreshold = 30): Promise<AlertScanResult> {
  const now = new Date();
  const futureThreshold = new Date();
  futureThreshold.setDate(now.getDate() + daysThreshold);

  // 1. Expiring IT Services (renewalDate <= futureThreshold)
  const expiringServices = await prisma.iTService.findMany({
    where: {
      status: 'ACTIVE',
      renewalDate: {
        not: null,
        lte: futureThreshold,
      },
    },
    include: {
      vendor: { select: { name: true } },
    },
    orderBy: { renewalDate: 'asc' },
  });

  // 2. Expiring Licenses (expiryDate <= futureThreshold)
  const expiringLicenses = await prisma.license.findMany({
    where: {
      status: 'ACTIVE',
      expiryDate: {
        not: null,
        lte: futureThreshold,
      },
    },
    include: {
      vendor: { select: { name: true } },
      assignments: {
        where: { revokedAt: null },
        include: { user: { select: { fullName: true } } },
        take: 3,
      },
    },
    orderBy: { expiryDate: 'asc' },
  });

  // 3. Expiring Asset Warranties (warrantyExpiry <= futureThreshold)
  const expiringAssets = await prisma.asset.findMany({
    where: {
      status: { not: 'RETIRED' },
      warrantyExpiry: {
        not: null,
        lte: futureThreshold,
      },
    },
    include: {
      assignments: {
        where: { returnedAt: null },
        include: { user: { select: { fullName: true } } },
        take: 1,
      },
    },
    orderBy: { warrantyExpiry: 'asc' },
  });

  const servicesList: AlertScanItem[] = expiringServices.map((s) => {
    const expiry = new Date(s.renewalDate!);
    const days = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return {
      type: 'SERVICE',
      id: s.id,
      name: s.name,
      codeOrTag: s.serviceCode,
      vendorName: s.vendor?.name || '—',
      expiryDate: expiry.toLocaleDateString('vi-VN'),
      daysRemaining: days,
      urgency: days <= 7 ? 'CRITICAL' : days <= 15 ? 'WARNING' : 'NOTICE',
      cost: s.cost ? Number(s.cost) : undefined,
      currency: s.currency || 'VND',
    };
  });

  const licensesList: AlertScanItem[] = expiringLicenses.map((l) => {
    const expiry = new Date(l.expiryDate!);
    const days = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const assignedUsers = l.assignments.map((a) => a.user?.fullName).filter(Boolean).join(', ');
    return {
      type: 'LICENSE',
      id: l.id,
      name: l.name,
      vendorName: l.vendor?.name || '—',
      assignedTo: assignedUsers || undefined,
      expiryDate: expiry.toLocaleDateString('vi-VN'),
      daysRemaining: days,
      urgency: days <= 7 ? 'CRITICAL' : days <= 15 ? 'WARNING' : 'NOTICE',
    };
  });

  const warrantiesList: AlertScanItem[] = expiringAssets.map((a) => {
    const expiry = new Date(a.warrantyExpiry!);
    const days = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const currentUser = a.assignments[0]?.user?.fullName;
    return {
      type: 'WARRANTY',
      id: a.id,
      name: a.name,
      codeOrTag: a.assetTag,
      assignedTo: currentUser || 'Trong kho',
      expiryDate: expiry.toLocaleDateString('vi-VN'),
      daysRemaining: days,
      urgency: days <= 7 ? 'CRITICAL' : days <= 15 ? 'WARNING' : 'NOTICE',
    };
  });

  const allItems = [...servicesList, ...licensesList, ...warrantiesList];
  const criticalCount = allItems.filter((i) => i.urgency === 'CRITICAL').length;
  const warningCount = allItems.filter((i) => i.urgency === 'WARNING').length;

  return {
    timestamp: new Date().toISOString(),
    totalExpiring: allItems.length,
    criticalCount,
    warningCount,
    services: servicesList,
    licenses: licensesList,
    warranties: warrantiesList,
  };
}

/**
 * Send message to Telegram Bot
 */
export async function sendTelegramMessage(botToken: string, chatId: string, text: string): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanToken = botToken.trim();
    const cleanChatId = chatId.trim();
    if (!cleanToken || !cleanChatId) {
      return { success: false, error: 'Thiếu Bot Token hoặc Chat ID' };
    }

    const url = `https://api.telegram.org/bot${cleanToken}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: cleanChatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    const data = await res.json();
    if (res.ok && data.ok) {
      return { success: true };
    }
    return { success: false, error: data.description || 'Lỗi gửi tin qua Telegram' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Lỗi kết nối tới Telegram API' };
  }
}

/**
 * Send alert message to Zalo / Webhook endpoint
 */
export async function sendZaloWebhook(webhookUrl: string, payload: any): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanUrl = webhookUrl.trim();
    if (!cleanUrl) return { success: false, error: 'Thiếu Webhook URL' };

    const res = await fetch(cleanUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) return { success: true };
    return { success: false, error: `Webhook trả về mã ${res.status}` };
  } catch (err: any) {
    return { success: false, error: err.message || 'Lỗi kết nối Webhook' };
  }
}

/**
 * Format Telegram HTML Message
 */
export function formatTelegramAlertMessage(scan: AlertScanResult, appUrl = ''): string {
  const dateStr = new Date().toLocaleString('vi-VN');
  let msg = `🚨 <b>[SIMPLY IT] CẢNH BÁO HẠN GIA HẠN & BẢO HÀNH</b>\n`;
  msg += `⏱ <i>Thời điểm quét: ${dateStr}</i>\n`;
  msg += `📊 <b>Tổng số cần lưu ý:</b> ${scan.totalExpiring} mục (Khẩn cấp: ${scan.criticalCount}, Chú ý: ${scan.warningCount})\n\n`;

  if (scan.services.length > 0) {
    msg += `🌐 <b>DỊCH VỤ IT / MẠNG / HOSTING (${scan.services.length}):</b>\n`;
    scan.services.forEach((s) => {
      const icon = s.daysRemaining <= 7 ? '🔴' : s.daysRemaining <= 15 ? '🟠' : '🟡';
      const daysText = s.daysRemaining <= 0 ? '<b>ĐÃ ĐẾN HẠN HÔM NAY!</b>' : `còn <b>${s.daysRemaining} ngày</b>`;
      msg += `${icon} [${s.codeOrTag}] <b>${s.name}</b>: ${daysText} (Hạn: ${s.expiryDate})\n`;
      if (s.vendorName && s.vendorName !== '—') msg += `   └ Đối tác: ${s.vendorName}\n`;
    });
    msg += `\n`;
  }

  if (scan.licenses.length > 0) {
    msg += `🔑 <b>BẢN QUYỀN PHẦN MỀM (${scan.licenses.length}):</b>\n`;
    scan.licenses.forEach((l) => {
      const icon = l.daysRemaining <= 7 ? '🔴' : l.daysRemaining <= 15 ? '🟠' : '🟡';
      const daysText = l.daysRemaining <= 0 ? '<b>ĐÃ HẾT HẠN!</b>' : `còn <b>${l.daysRemaining} ngày</b>`;
      msg += `${icon} <b>${l.name}</b>: ${daysText} (Hạn: ${l.expiryDate})\n`;
      if (l.assignedTo) msg += `   └ Đang gán: ${l.assignedTo}\n`;
    });
    msg += `\n`;
  }

  if (scan.warranties.length > 0) {
    msg += `💻 <b>BẢO HÀNH PHẦN CỨNG MÁY TÍNH (${scan.warranties.length}):</b>\n`;
    scan.warranties.forEach((w) => {
      const icon = w.daysRemaining <= 7 ? '🔴' : w.daysRemaining <= 15 ? '🟠' : '🟡';
      const daysText = w.daysRemaining <= 0 ? '<b>HẾT BẢO HÀNH HÔM NAY!</b>' : `còn <b>${w.daysRemaining} ngày</b>`;
      msg += `${icon} [${w.codeOrTag}] <b>${w.name}</b>: ${daysText} (Hạn: ${w.expiryDate})\n`;
      if (w.assignedTo) msg += `   └ Người dùng: ${w.assignedTo}\n`;
    });
    msg += `\n`;
  }

  if (appUrl) {
    msg += `🔗 <a href="${appUrl}">Mở hệ thống Simply IT để xử lý</a>`;
  }

  return msg;
}

/**
 * Format HTML Email Report
 */
export function formatHtmlEmailReport(scan: AlertScanResult, appUrl = ''): string {
  const dateStr = new Date().toLocaleString('vi-VN');

  const renderTable = (items: AlertScanItem[], title: string, icon: string) => {
    if (items.length === 0) return '';
    const rows = items
      .map(
        (i) => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 12px; font-weight: bold; color: #1e293b;">${i.codeOrTag ? `[${i.codeOrTag}] ` : ''}${i.name}</td>
          <td style="padding: 8px 12px; color: #475569;">${i.vendorName || i.assignedTo || '—'}</td>
          <td style="padding: 8px 12px; color: #475569;">${i.expiryDate}</td>
          <td style="padding: 8px 12px; text-align: center;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: bold; ${
              i.daysRemaining <= 7
                ? 'background-color: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5;'
                : i.daysRemaining <= 15
                ? 'background-color: #ffedd5; color: #c2410c; border: 1px solid #fdba74;'
                : 'background-color: #fef9c3; color: #a16207; border: 1px solid #fde047;'
            }">
              ${i.daysRemaining <= 0 ? 'Đến hạn!' : `Còn ${i.daysRemaining} ngày`}
            </span>
          </td>
        </tr>`
      )
      .join('');

    return `
      <div style="margin-top: 20px;">
        <h3 style="color: #1e293b; font-size: 14px; margin-bottom: 8px; border-left: 4px solid #2563eb; padding-left: 8px;">
          ${icon} ${title} (${items.length})
        </h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left; background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden;">
          <thead style="background-color: #f8fafc; color: #64748b; font-size: 11px; text-transform: uppercase;">
            <tr>
              <th style="padding: 8px 12px;">Tên mục</th>
              <th style="padding: 8px 12px;">Đối tác / Người giữ</th>
              <th style="padding: 8px 12px;">Ngày hết hạn</th>
              <th style="padding: 8px 12px; text-align: center;">Thời hạn còn</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  };

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 680px; margin: 0 auto; padding: 20px; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #1e3a8a; margin: 0 0 4px 0;">🔔 SIMPLY IT - BÁO CÁO CẢNH BÁO ĐỊNH KỲ</h2>
        <p style="color: #64748b; font-size: 12px; margin: 0;">Thời điểm quét: ${dateStr}</p>
      </div>

      <div style="background-color: #ffffff; padding: 14px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 16px; display: flex; justify-content: space-around; text-align: center;">
        <div>
          <span style="font-size: 20px; font-weight: bold; color: #1e293b;">${scan.totalExpiring}</span>
          <p style="font-size: 11px; color: #64748b; margin: 2px 0 0 0;">Tổng cần gia hạn</p>
        </div>
        <div>
          <span style="font-size: 20px; font-weight: bold; color: #dc2626;">${scan.criticalCount}</span>
          <p style="font-size: 11px; color: #dc2626; margin: 2px 0 0 0;">Khẩn cấp (≤ 7 ngày)</p>
        </div>
        <div>
          <span style="font-size: 20px; font-weight: bold; color: #d97706;">${scan.warningCount}</span>
          <p style="font-size: 11px; color: #d97706; margin: 2px 0 0 0;">Sắp đến hạn (≤ 15 ngày)</p>
        </div>
      </div>

      ${renderTable(scan.services, 'Dịch vụ IT / Tên miền / Hosting / Đường truyền', '🌐')}
      ${renderTable(scan.licenses, 'Bản quyền phần mềm (Licenses)', '🔑')}
      ${renderTable(scan.warranties, 'Bảo hành thiết bị máy tính & phần cứng', '💻')}

      ${
        appUrl
          ? `<div style="text-align: center; margin-top: 24px;">
              <a href="${appUrl}" style="background-color: #2563eb; color: #ffffff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: bold; display: inline-block;">
                Mở hệ thống Simply IT để xử lý &rarr;
              </a>
            </div>`
          : ''
      }
    </div>
  `;
}

/**
 * Execute full scan & multi-channel dispatch
 */
export async function runDailyAlertJob(appUrl = ''): Promise<AlertScanResult> {
  // 1. Fetch alert settings
  const settings = await prisma.systemSetting.findMany({
    where: {
      key: {
        in: [
          'alert.telegram_enabled',
          'alert.telegram_bot_token',
          'alert.telegram_chat_id',
          'alert.zalo_enabled',
          'alert.zalo_webhook_url',
          'alert.email_enabled',
          'alert.email_recipients',
          'alert.threshold_days',
          'app.server_url',
        ],
      },
    },
  });

  const map = new Map(settings.map((s) => [s.key, s.value]));

  const telegramEnabled = map.get('alert.telegram_enabled') === 'true';
  const telegramBotToken = map.get('alert.telegram_bot_token') || '';
  const telegramChatId = map.get('alert.telegram_chat_id') || '';

  const zaloEnabled = map.get('alert.zalo_enabled') === 'true';
  const zaloWebhookUrl = map.get('alert.zalo_webhook_url') || '';

  const emailEnabled = map.get('alert.email_enabled') === 'true';
  const emailRecipientsRaw = map.get('alert.email_recipients') || '';
  const emailRecipients = emailRecipientsRaw
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);

  const threshold = Number(map.get('alert.threshold_days')) || 30;
  const targetAppUrl = appUrl || map.get('app.server_url') || 'http://localhost:3000';

  // 2. Perform Scan
  const scanResult = await scanExpiringAlerts(threshold);

  const dispatchStatus: any = {};

  // If there are items expiring, or if manual run, dispatch
  if (scanResult.totalExpiring > 0) {
    // 3. Dispatch to Telegram
    if (telegramEnabled && telegramBotToken && telegramChatId) {
      const tgMessage = formatTelegramAlertMessage(scanResult, targetAppUrl);
      const tgRes = await sendTelegramMessage(telegramBotToken, telegramChatId, tgMessage);
      dispatchStatus.telegram = tgRes;
    }

    // 4. Dispatch to Zalo / Webhook
    if (zaloEnabled && zaloWebhookUrl) {
      const zaloPayload = {
        event: 'alert.expiring_items',
        timestamp: scanResult.timestamp,
        totalExpiring: scanResult.totalExpiring,
        criticalCount: scanResult.criticalCount,
        services: scanResult.services,
        licenses: scanResult.licenses,
        warranties: scanResult.warranties,
      };
      const zaloRes = await sendZaloWebhook(zaloWebhookUrl, zaloPayload);
      dispatchStatus.zalo = zaloRes;
    }

    // 5. Dispatch to Email
    if (emailEnabled && emailRecipients.length > 0) {
      const html = formatHtmlEmailReport(scanResult, targetAppUrl);
      const emailSubject = `[SIMPLY IT] Cảnh báo hạn dùng (${scanResult.totalExpiring} mục cần lưu ý: ${scanResult.criticalCount} khẩn cấp)`;

      const emailResults = await Promise.all(
        emailRecipients.map((recip) =>
          sendEmail({
            to: recip,
            subject: emailSubject,
            html,
          })
        )
      );

      const allSuccess = emailResults.every((r) => r.success);
      dispatchStatus.email = {
        success: allSuccess,
        recipients: emailRecipients,
      };
    }
  }

  scanResult.dispatchStatus = dispatchStatus;

  // 6. Save last scan result to system settings
  await prisma.systemSetting.upsert({
    where: { key: 'alert.last_scan_result' },
    update: { value: JSON.stringify(scanResult) },
    create: {
      key: 'alert.last_scan_result',
      value: JSON.stringify(scanResult),
      label: 'Kết quả quét cảnh báo gần nhất',
      group: 'alert',
      type: 'JSON',
    },
  });

  await prisma.systemSetting.upsert({
    where: { key: 'alert.last_scan_time' },
    update: { value: new Date().toISOString() },
    create: {
      key: 'alert.last_scan_time',
      value: new Date().toISOString(),
      label: 'Thời điểm quét cảnh báo gần nhất',
      group: 'alert',
      type: 'STRING',
    },
  });

  return scanResult;
}
