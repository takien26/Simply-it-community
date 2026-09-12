// src/lib/email-inbound.ts
// SIMPLY IT — Inbound Email-to-Ticket & Auto-Routing Service
// Tự động tiếp nhận Email qua IMAP -> Bóc tách -> Tạo Ticket / Phản hồi Ticket -> Phân tuyến thông minh

import { ImapFlow } from 'imapflow';
import { simpleParser, ParsedMail, Attachment } from 'mailparser';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from './db';
import { routeTicket } from './routing-engine';
import { sendEmail } from './email';
import { broadcastRealtimeEvent } from './realtime';
import { TicketCategory, TicketPriority } from '@prisma/client';
import { getActiveLicense } from './license';

export interface ImapConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  enabled: boolean;
  pollIntervalMinutes: number;
  defaultCategory: TicketCategory;
  defaultPriority: TicketPriority;
  autoCreateUser: boolean;
  mailbox: string;
}

export interface InboundSyncResult {
  success: boolean;
  scannedCount: number;
  ticketsCreated: number;
  commentsAdded: number;
  skippedCount: number;
  errors: string[];
  processedEmails: Array<{
    uid: number;
    from: string;
    subject: string;
    action: 'TICKET_CREATED' | 'COMMENT_ADDED' | 'SKIPPED_LOOP' | 'ERROR';
    ticketNumber?: string;
    detail?: string;
    timestamp: string;
  }>;
}

// In-memory mutex lock to prevent concurrent polling executions
let isPollingInProgress = false;

/**
 * Load Inbound IMAP configuration from system settings
 */
export async function getImapConfig(): Promise<ImapConfig> {
  const settings = await prisma.systemSetting.findMany({
    where: {
      key: {
        in: [
          'email.imap_host',
          'email.imap_port',
          'email.imap_secure',
          'email.imap_user',
          'email.imap_password',
          'email.imap_enabled',
          'email.imap_poll_interval',
          'email.imap_default_category',
          'email.imap_default_priority',
          'email.imap_auto_create_user',
          'email.imap_mailbox',
          // Fallback to SMTP config if user wants same account
          'email.smtp_host',
          'email.smtp_user',
          'email.smtp_password',
        ],
      },
    },
  });

  const map = new Map<string, string>(settings.map((s: any) => [s.key, s.value]));

  const host = String(map.get('email.imap_host') || process.env.IMAP_HOST || '');
  const port = parseInt(String(map.get('email.imap_port') || process.env.IMAP_PORT || '993'), 10);
  const secure = map.get('email.imap_secure') !== undefined ? map.get('email.imap_secure') === 'true' : true;
  const user = String(map.get('email.imap_user') || process.env.IMAP_USER || '');
  const pass = String(map.get('email.imap_password') || process.env.IMAP_PASS || '');
  const enabled = map.get('email.imap_enabled') === 'true';
  const pollIntervalMinutes = parseInt(String(map.get('email.imap_poll_interval') || '2'), 10);

  const rawCat = String(map.get('email.imap_default_category') || 'HARDWARE');
  const defaultCategory = (['HARDWARE', 'SOFTWARE', 'LICENSE', 'ACCESS_REQUEST', 'NETWORK', 'OTHER'].includes(rawCat)
    ? rawCat
    : 'HARDWARE') as TicketCategory;

  const rawPri = String(map.get('email.imap_default_priority') || 'MEDIUM');
  const defaultPriority = (['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(rawPri)
    ? rawPri
    : 'MEDIUM') as TicketPriority;

  const autoCreateUser = map.get('email.imap_auto_create_user') !== undefined
    ? map.get('email.imap_auto_create_user') === 'true'
    : true;

  const mailbox = String(map.get('email.imap_mailbox') || 'INBOX');

  return {
    host,
    port,
    secure,
    user,
    pass,
    enabled,
    pollIntervalMinutes,
    defaultCategory,
    defaultPriority,
    autoCreateUser,
    mailbox,
  };
}

/**
 * Test IMAP connection and return mailbox stats
 */
export async function testImapConnection(config: ImapConfig): Promise<{
  success: boolean;
  message: string;
  mailboxStats?: { messages: number; unseen: number };
}> {
  if (!config.host || !config.host.trim()) {
    return { success: false, message: 'Địa chỉ máy chủ IMAP (Host) không được để trống (vd: imap.gmail.com, outlook.office365.com).' };
  }
  if (!config.user || !config.user.trim()) {
    return { success: false, message: 'Tên đăng nhập / Email IMAP không được để trống.' };
  }

  const client = new ImapFlow({
    host: config.host.trim(),
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user.trim(),
      pass: config.pass,
    },
    logger: false,
    emitLogs: false,
  });

  try {
    await client.connect();
    const mbName = config.mailbox || 'INBOX';
    const lock = await client.getMailboxLock(mbName, { readOnly: true });
    try {
      const status = await client.status(mbName, { messages: true, unseen: true });
      return {
        success: true,
        message: `Kết nối IMAP thành công! Hộp thư "${mbName}" hiện có ${status.messages || 0} thư (${status.unseen || 0} thư chưa đọc).`,
        mailboxStats: {
          messages: status.messages || 0,
          unseen: status.unseen || 0,
        },
      };
    } finally {
      lock.release();
    }
  } catch (error: any) {
    let msg = error.message || 'Lỗi kết nối IMAP';
    if (error.code === 'ECONNREFUSED') {
      msg = `Không thể kết nối đến máy chủ IMAP (${config.host}:${config.port}). Máy chủ từ chối kết nối.`;
    } else if (error.code === 'ETIMEDOUT') {
      msg = `Kết nối đến máy chủ IMAP (${config.host}:${config.port}) bị quá hạn (Timeout).`;
    } else if (error.authenticationFailed || error.responseStatus === 'NO' || msg.toLowerCase().includes('auth')) {
      msg = 'Đăng nhập IMAP thất bại. Vui lòng kiểm tra lại tài khoản hoặc Mật khẩu ứng dụng (App Password).';
    }
    return { success: false, message: msg };
  } finally {
    try {
      await client.logout();
    } catch {}
  }
}

/**
 * Save attachments from parsed email into public/uploads/tickets/email/
 */
async function saveEmailAttachments(
  attachments: Attachment[]
): Promise<Array<{ url: string; name: string; size: number; type: string }>> {
  if (!attachments || attachments.length === 0) return [];

  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'tickets', 'email');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const saved: Array<{ url: string; name: string; size: number; type: string }> = [];

  for (const att of attachments) {
    try {
      const safeFilename = att.filename
        ? `${Date.now()}_${crypto.randomBytes(4).toString('hex')}_${att.filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`
        : `${Date.now()}_${crypto.randomBytes(4).toString('hex')}.bin`;

      const filePath = path.join(uploadDir, safeFilename);
      fs.writeFileSync(filePath, att.content);

      saved.push({
        url: `/uploads/tickets/email/${safeFilename}`,
        name: att.filename || 'Tệp đính kèm',
        size: att.size || att.content.length,
        type: att.contentType || 'application/octet-stream',
      });
    } catch (attErr) {
      console.error('[Email Inbound] Failed to save attachment:', attErr);
    }
  }

  return saved;
}

/**
 * Check if incoming email is automated bounce, loop, or auto-reply (RFC 3834)
 */
function isLoopOrSpam(parsed: ParsedMail, systemUser: string): { isSpam: boolean; reason?: string } {
  const fromAddr = parsed.from?.value?.[0]?.address?.toLowerCase() || '';

  // 1. Never process emails originating from the system itself
  if (fromAddr && systemUser && fromAddr === systemUser.toLowerCase()) {
    return { isSpam: true, reason: 'Email gửi từ chính hòm thư tiếp nhận của hệ thống (Self-Loop)' };
  }

  // 2. Check RFC 3834 Auto-Submitted header
  const autoSubmitted = parsed.headers.get('auto-submitted');
  if (autoSubmitted && String(autoSubmitted).toLowerCase() !== 'no') {
    return { isSpam: true, reason: `Header Auto-Submitted: ${autoSubmitted}` };
  }

  // 3. Check X-Auto-Response-Suppress (Exchange / Outlook)
  const xAuto = parsed.headers.get('x-auto-response-suppress');
  if (xAuto) {
    return { isSpam: true, reason: `Header X-Auto-Response-Suppress: ${xAuto}` };
  }

  // 4. Check Precedence / X-Precedence
  const precedence = parsed.headers.get('precedence') || parsed.headers.get('x-precedence');
  if (precedence && ['bulk', 'junk', 'auto_reply'].includes(String(precedence).toLowerCase())) {
    return { isSpam: true, reason: `Header Precedence: ${precedence}` };
  }

  // 5. Check Subject keywords for out-of-office or bounce
  const subject = (parsed.subject || '').toLowerCase();
  const bouncePhrases = [
    'out of office',
    'automatic reply',
    'tự động trả lời',
    'undelivered mail returned to sender',
    'delivery status notification',
    'mail delivery failed',
    'failure notice',
  ];

  for (const phrase of bouncePhrases) {
    if (subject.includes(phrase)) {
      return { isSpam: true, reason: `Tiêu đề chứa từ khóa trả lời tự động: "${phrase}"` };
    }
  }

  return { isSpam: false };
}

/**
 * Clean plain text content from email body
 */
function cleanEmailBody(parsed: ParsedMail): string {
  let body = parsed.text || '';
  if (!body && parsed.html) {
    // Strip basic HTML tags if text is absent
    body = parsed.html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<br\s*[\/]?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .trim();
  }

  // Truncate excessively long history if it contains common quoted replies
  const splitMarkers = [
    '-----Original Message-----',
    '________________________________',
    'Vào Th ',
    'On Thu,',
    'On Fri,',
    'On Mon,',
    'On Tue,',
    'On Wed,',
    'On Sat,',
    'On Sun,',
  ];

  for (const marker of splitMarkers) {
    const idx = body.indexOf(marker);
    if (idx > 20) {
      body = body.substring(0, idx).trim();
      break;
    }
  }

  return body.trim();
}

/**
 * Resolve or auto-provision requester User
 */
async function resolveRequester(
  senderEmail: string,
  senderName: string,
  autoCreate: boolean
): Promise<{ id: string; fullName: string; email: string; isNew: boolean }> {
  const normalizedEmail = senderEmail.toLowerCase().trim();

  // 1. Search existing user by email
  const existingUser = await prisma.user.findFirst({
    where: {
      email: {
        equals: normalizedEmail,
        mode: 'insensitive',
      },
    },
    select: { id: true, fullName: true, email: true },
  });

  if (existingUser) {
    return { ...existingUser, isNew: false };
  }

  // 2. If not found and auto-create enabled, create new Employee/User
  if (autoCreate) {
    let defaultRole = await prisma.role.findFirst({
      where: {
        name: { in: ['Employee', 'Nhân viên', 'User', 'Staff'] },
      },
    });

    if (!defaultRole) {
      defaultRole = await prisma.role.findFirst({
        orderBy: { createdAt: 'asc' },
      });
    }

    if (defaultRole) {
      const dummyPasswordHash = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);
      const displayName = senderName && senderName.trim() ? senderName.trim() : normalizedEmail.split('@')[0];

      const newUser = await prisma.user.create({
        data: {
          email: normalizedEmail,
          fullName: displayName,
          passwordHash: dummyPasswordHash,
          roleId: defaultRole.id,
          isActive: true,
        },
        select: { id: true, fullName: true, email: true },
      });

      return { ...newUser, isNew: true };
    }
  }

  // 3. Fallback: Assign to system admin user
  const adminUser = await prisma.user.findFirst({
    where: {
      OR: [
        { role: { name: { in: ['Admin', 'IT Admin', 'Asset Manager'] } } },
        { email: 'admin@company.com' },
      ],
    },
    orderBy: { createdAt: 'asc' },
    select: { id: true, fullName: true, email: true },
  });

  if (adminUser) {
    return { ...adminUser, isNew: false };
  }

  throw new Error('Không tìm thấy tài khoản người dùng và không thể tạo tài khoản tự động');
}

/**
 * Infer ticket category and priority from subject & content keywords
 */
function inferCategoryAndPriority(
  subject: string,
  content: string,
  defaultCat: TicketCategory,
  defaultPri: TicketPriority
): { category: TicketCategory; priority: TicketPriority } {
  const text = `${subject} ${content}`.toLowerCase();

  // Category inference
  let category: TicketCategory = defaultCat;
  if (/mạng|wifi|vpn|internet|lan|kết nối|rớt mạng|mất mạng|ip tĩnh|dns/.test(text)) {
    category = 'NETWORK';
  } else if (/bản quyền|license|office 365|m365|key active|kích hoạt|tài khoản|cấp quyền|mật khẩu|reset pass/.test(text)) {
    category = text.includes('bản quyền') || text.includes('license') || text.includes('office') ? 'LICENSE' : 'ACCESS_REQUEST';
  } else if (/phần mềm|cài đặt|setup|autocad|photoshop|misa|zalo|adobe|phần mềm kế toán/.test(text)) {
    category = 'SOFTWARE';
  } else if (/máy in|máy tính|laptop|chuột|bàn phím|màn hình|hỏng nguồn|không lên|kêu to|nhiệt độ|pin/.test(text)) {
    category = 'HARDWARE';
  }

  // Priority inference
  let priority: TicketPriority = defaultPri;
  if (/khẩn cấp|sập toàn bộ|mất mạng toàn công ty|cháy|hỏng máy chủ|server down|hỏa tốc|nguy cấp/.test(text)) {
    priority = 'URGENT';
  } else if (/gấp|quan trọng|không làm việc được|sếp|giám đốc|họp khẩn/.test(text)) {
    priority = 'HIGH';
  }

  return { category, priority };
}

/**
 * Core processing function: Polls IMAP, parses emails, creates/updates tickets, runs auto-routing
 */
export async function processInboundEmails(customConfig?: Partial<ImapConfig>): Promise<InboundSyncResult> {
  const result: InboundSyncResult = {
    success: true,
    scannedCount: 0,
    ticketsCreated: 0,
    commentsAdded: 0,
    skippedCount: 0,
    errors: [],
    processedEmails: [],
  };

  if (isPollingInProgress) {
    result.errors.push('Tác vụ quét hộp thư đang chạy trong nền, vui lòng đợi kết thúc.');
    result.success = false;
    return result;
  }

  // Check Enterprise Edition license
  const license = await getActiveLicense();
  if (!license.isEnterprise) {
    result.errors.push('Tính năng Tiếp nhận Ticket qua Email (Inbound IMAP) là tính năng thuộc phiên bản trả phí (Enterprise Edition). Vui lòng kích hoạt bản quyền để sử dụng.');
    result.success = false;
    return result;
  }

  const baseConfig = await getImapConfig();
  const config: ImapConfig = customConfig ? { ...baseConfig, ...customConfig } : baseConfig;

  if (!config.enabled && !customConfig) {
    result.errors.push('Tính năng tiếp nhận Email qua IMAP hiện đang tắt.');
    result.success = false;
    return result;
  }

  if (!config.host || !config.user) {
    result.errors.push('Chưa cấu hình máy chủ IMAP (Host/User).');
    result.success = false;
    return result;
  }

  isPollingInProgress = true;

  const client = new ImapFlow({
    host: config.host.trim(),
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user.trim(),
      pass: config.pass,
    },
    logger: false,
    emitLogs: false,
  });

  try {
    await client.connect();
    const mbName = config.mailbox || 'INBOX';
    const lock = await client.getMailboxLock(mbName);

    try {
      // 1. Fetch unread messages
      const searchCriteria = { seen: false };
      const messageList = [];

      for await (const msg of client.fetch(searchCriteria, {
        uid: true,
        envelope: true,
        source: true,
        flags: true,
      })) {
        messageList.push(msg);
      }

      result.scannedCount = messageList.length;

      // 2. Process each unread message
      for (const msg of messageList) {
        try {
          if (!msg.source) continue;

          // Parse full MIME message with mailparser
          const parsed = await simpleParser(msg.source);
          const senderEmail = parsed.from?.value?.[0]?.address || '';
          const senderName = parsed.from?.value?.[0]?.name || '';
          const subject = parsed.subject || '(Không có tiêu đề)';
          const cleanBody = cleanEmailBody(parsed);

          // Check for loops & spam
          const loopCheck = isLoopOrSpam(parsed, config.user);
          if (loopCheck.isSpam) {
            result.skippedCount++;
            result.processedEmails.push({
              uid: msg.uid,
              from: senderEmail,
              subject,
              action: 'SKIPPED_LOOP',
              detail: loopCheck.reason,
              timestamp: new Date().toISOString(),
            });

            // Mark as seen so we don't re-check next time
            await client.messageFlagsAdd({ uid: msg.uid }, ['\\Seen']);
            continue;
          }

          // Thread Matching: Check if subject or headers reference an existing ticket
          // Pattern: TK-2026-0012 or TIC-0012
          const ticketNumberMatch = subject.match(/(?:TK-\d{4}-\d{4}|TIC-\d+)/i);
          let existingTicket: any = null;

          if (ticketNumberMatch) {
            const matchedNum = ticketNumberMatch[0].toUpperCase();
            existingTicket = await prisma.ticket.findFirst({
              where: {
                ticketNumber: {
                  equals: matchedNum,
                  mode: 'insensitive',
                },
              },
              include: {
                assignedTo: { select: { id: true, fullName: true, email: true } },
                createdBy: { select: { id: true, fullName: true, email: true } },
              },
            });
          }

          // Save any attachments
          const attachments = await saveEmailAttachments(parsed.attachments || []);

          // CASE A: Existing Ticket Reply -> Append Comment & Re-open
          if (existingTicket) {
            const requester = await resolveRequester(senderEmail, senderName, config.autoCreateUser);

            const commentContent = `📧 **[Phản hồi qua Email từ ${senderName || senderEmail}]:**\n\n${cleanBody || '(Đính kèm tệp)'}`;

            await prisma.ticketComment.create({
              data: {
                ticketId: existingTicket.id,
                userId: requester.id,
                content: commentContent,
                isInternal: false,
                attachmentUrls: attachments.length > 0 ? (attachments as any) : undefined,
              },
            });

            // If ticket was waiting or resolved, re-open to IN_PROGRESS
            if (existingTicket.status === 'WAITING' || existingTicket.status === 'RESOLVED') {
              await prisma.ticket.update({
                where: { id: existingTicket.id },
                data: { status: 'IN_PROGRESS', resolvedAt: null },
              });
            }

            // Realtime notification
            broadcastRealtimeEvent({
              type: 'TICKET_UPDATED',
              title: `💬 Phản hồi email mới cho ${existingTicket.ticketNumber}`,
              message: `${senderName || senderEmail} vừa gửi email bổ sung cho ticket: "${existingTicket.title}"`,
              data: { ticketId: existingTicket.id, ticketNumber: existingTicket.ticketNumber },
            });

            result.commentsAdded++;
            result.processedEmails.push({
              uid: msg.uid,
              from: senderEmail,
              subject,
              action: 'COMMENT_ADDED',
              ticketNumber: existingTicket.ticketNumber,
              detail: `Đã thêm bình luận vào Ticket ${existingTicket.ticketNumber}`,
              timestamp: new Date().toISOString(),
            });

            // Mark as seen
            await client.messageFlagsAdd({ uid: msg.uid }, ['\\Seen']);
            continue;
          }

          // CASE B: New Ticket Creation
          const requester = await resolveRequester(senderEmail, senderName, config.autoCreateUser);
          const { category, priority } = inferCategoryAndPriority(subject, cleanBody, config.defaultCategory, config.defaultPriority);

          const currentYear = new Date().getFullYear();
          const count = await prisma.ticket.count();
          const ticketNumber = `TK-${currentYear}-${String(count + 1).padStart(4, '0')}`;

          // SLA calculation (Urgent 4h, High 8h, Medium 24h, Low 48h)
          const hoursMap: Record<string, number> = { URGENT: 4, HIGH: 8, MEDIUM: 24, LOW: 48 };
          const slaHours = hoursMap[priority] || 24;
          const slaDeadline = new Date(Date.now() + slaHours * 60 * 60 * 1000);

          const fullDescription = cleanBody
            ? `${cleanBody}\n\n---\n*Yêu cầu được gửi tự động qua email từ: ${senderName ? `${senderName} <${senderEmail}>` : senderEmail}*`
            : `Yêu cầu được tạo từ email của: ${senderEmail}`;

          const newTicket = await prisma.ticket.create({
            data: {
              ticketNumber,
              title: subject,
              description: fullDescription,
              category,
              priority,
              status: 'OPEN',
              createdById: requester.id,
              slaDeadline,
              attachmentUrls: attachments.length > 0 ? (attachments as any) : undefined,
            },
          });

          // Run Auto-Routing Engine to assign team & technician
          await routeTicket(newTicket.id).catch((err) =>
            console.error('[Email Inbound] Routing Engine Error:', err)
          );

          // Re-fetch ticket with routing results
          const fullTicket = await prisma.ticket.findUnique({
            where: { id: newTicket.id },
            include: {
              assignedTo: { select: { fullName: true, email: true } },
              team: { select: { name: true } },
            },
          });

          // Send confirmation auto-responder email to requester
          (async () => {
            try {
              const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
              const ticketLink = `${appUrl}/tickets`;

              await sendEmail({
                to: senderEmail,
                templateCode: 'ticket.created',
                subject: `[${ticketNumber}] Đã tiếp nhận yêu cầu hỗ trợ: ${subject}`,
                data: {
                  recipientName: requester.fullName,
                  ticketNumber,
                  title: subject,
                  priority,
                  creatorName: requester.fullName,
                  description: fullDescription,
                  slaDeadline: slaDeadline.toLocaleString('vi-VN'),
                  teamName: fullTicket?.team?.name || 'Đội ngũ Hỗ trợ IT',
                  link: ticketLink,
                },
              });
            } catch (mailErr) {
              console.error('[Email Inbound] Auto-responder Error:', mailErr);
            }
          })();

          // Broadcast SSE event
          broadcastRealtimeEvent({
            type: 'TICKET_CREATED',
            title: `🎫 Ticket mới qua Email: ${ticketNumber}`,
            message: `${requester.fullName} vừa gửi email yêu cầu: "${subject}"`,
            data: { ticketId: newTicket.id, ticketNumber },
          });

          result.ticketsCreated++;
          result.processedEmails.push({
            uid: msg.uid,
            from: senderEmail,
            subject,
            action: 'TICKET_CREATED',
            ticketNumber,
            detail: `Khởi tạo thành công Ticket ${ticketNumber} (Phân loại: ${category}, Ưu tiên: ${priority})`,
            timestamp: new Date().toISOString(),
          });

          // Mark as seen
          await client.messageFlagsAdd({ uid: msg.uid }, ['\\Seen']);
        } catch (msgErr: any) {
          console.error(`[Email Inbound] Error processing message UID ${msg.uid}:`, msgErr);
          result.errors.push(`Lỗi xử lý thư UID ${msg.uid}: ${msgErr.message}`);
          result.processedEmails.push({
            uid: msg.uid,
            from: 'N/A',
            subject: 'Lỗi',
            action: 'ERROR',
            detail: msgErr.message,
            timestamp: new Date().toISOString(),
          });
        }
      }
    } finally {
      lock.release();
    }
  } catch (connErr: any) {
    console.error('[Email Inbound Connection Error]:', connErr);
    result.success = false;
    result.errors.push(`Lỗi kết nối IMAP: ${connErr.message}`);
  } finally {
    try {
      await client.logout();
    } catch {}
    isPollingInProgress = false;
  }

  // Record last sync result to SystemSetting
  try {
    await prisma.systemSetting.upsert({
      where: { key: 'email.imap_last_sync_time' },
      update: { value: new Date().toISOString() },
      create: {
        key: 'email.imap_last_sync_time',
        value: new Date().toISOString(),
        group: 'email',
        label: 'Thời gian quét IMAP gần nhất',
      },
    });

    await prisma.systemSetting.upsert({
      where: { key: 'email.imap_last_sync_result' },
      update: { value: JSON.stringify(result) },
      create: {
        key: 'email.imap_last_sync_result',
        value: JSON.stringify(result),
        group: 'email',
        label: 'Kết quả quét IMAP gần nhất',
      },
    });
  } catch (dbErr) {
    console.error('[Email Inbound] Failed to save sync log to SystemSetting:', dbErr);
  }

  return result;
}
