import { prisma } from './db';
import { IncidentSeverity } from '@prisma/client';

export interface TicketSpikeCluster {
  key: string;
  category: string;
  categoryLabel: string;
  count: number;
  ticketIds: string[];
  ticketNumbers: string[];
  sampleTitles: string[];
  suggestedIncidentTitle: string;
  severity: IncidentSeverity;
  firstCreatedAt: string;
  lastCreatedAt: string;
}

const CATEGORY_LABELS: Record<string, { vi: string; en: string; defaultSeverity: IncidentSeverity }> = {
  NETWORK: { vi: 'Hạ tầng Mạng & WiFi', en: 'Network & WiFi', defaultSeverity: 'CRITICAL_P1' },
  PRINTER: { vi: 'Hệ thống Máy in & Scan', en: 'Printer & Scanners', defaultSeverity: 'HIGH_P2' },
  EMAIL: { vi: 'Email & Hòm thư M365', en: 'Email & M365', defaultSeverity: 'CRITICAL_P1' },
  HARDWARE: { vi: 'Thiết bị & Phần cứng', en: 'Hardware & Devices', defaultSeverity: 'HIGH_P2' },
  SOFTWARE: { vi: 'Phần mềm & Ứng dụng', en: 'Software & Applications', defaultSeverity: 'HIGH_P2' },
  ACCESS: { vi: 'Tài khoản & Phân quyền', en: 'Account & Permissions', defaultSeverity: 'HIGH_P2' },
  ERP: { vi: 'Hệ thống ERP / Doanh nghiệp', en: 'ERP & Corporate Systems', defaultSeverity: 'CRITICAL_P1' },
  OTHER: { vi: 'Khác', en: 'Other Issues', defaultSeverity: 'MEDIUM_P3' },
};

/**
 * Phát hiện bão ticket (Ticket Spike):
 * Tìm các nhóm ticket cùng danh mục được tạo trong vòng 30 phút qua mà chưa được gộp vào Incident.
 * Ngưỡng phát hiện: >= 3 ticket trong 30 phút.
 */
export async function detectActiveTicketSpikes(minutesWindow = 30, minThreshold = 3): Promise<TicketSpikeCluster[]> {
  try {
    const timeThreshold = new Date(Date.now() - minutesWindow * 60 * 1000);

    const recentTickets = await prisma.ticket.findMany({
      where: {
        createdAt: { gte: timeThreshold },
        status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING'] },
        incidentId: null,
      },
      select: {
        id: true,
        ticketNumber: true,
        title: true,
        category: true,
        priority: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recentTickets.length < minThreshold) {
      return [];
    }

    // Nhóm theo category
    const groups: Record<string, typeof recentTickets> = {};
    for (const t of recentTickets) {
      const cat = t.category || 'OTHER';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(t);
    }

    const clusters: TicketSpikeCluster[] = [];

    for (const [catKey, tickets] of Object.entries(groups)) {
      if (tickets.length >= minThreshold) {
        const catInfo = CATEGORY_LABELS[catKey] || {
          vi: catKey,
          en: catKey,
          defaultSeverity: 'MEDIUM_P3' as IncidentSeverity,
        };

        const sorted = [...tickets].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        const hasUrgent = tickets.some((t) => t.priority === 'URGENT');
        const severity: IncidentSeverity = hasUrgent ? 'CRITICAL_P1' : catInfo.defaultSeverity;

        clusters.push({
          key: catKey,
          category: catKey,
          categoryLabel: catInfo.vi,
          count: tickets.length,
          ticketIds: tickets.map((t) => t.id),
          ticketNumbers: tickets.map((t) => t.ticketNumber),
          sampleTitles: tickets.slice(0, 3).map((t) => t.title),
          suggestedIncidentTitle: `[SỰ CỐ DIỆN RỘNG] Gián đoạn dịch vụ ${catInfo.vi} (${tickets.length} yêu cầu đồng thời)`,
          severity,
          firstCreatedAt: sorted[0].createdAt.toISOString(),
          lastCreatedAt: sorted[sorted.length - 1].createdAt.toISOString(),
        });
      }
    }

    return clusters;
  } catch (error) {
    console.error('Error in detectActiveTicketSpikes:', error);
    return [];
  }
}

/**
 * Tự động tạo Major Incident từ cụm bão ticket và liên kết toàn bộ ticket con
 */
export async function createIncidentFromSpikeCluster(
  cluster: TicketSpikeCluster,
  userId: string,
  customTitle?: string
) {
  const currentYear = new Date().getFullYear();
  let incidentNumber = `INC-${currentYear}-${Date.now().toString().slice(-4)}`;

  const count = await prisma.incident.count();
  incidentNumber = `INC-${currentYear}-${String(count + 1).padStart(4, '0')}`;

  const title = customTitle || cluster.suggestedIncidentTitle;
  const description = `⚡ [SỰ CỐ DIỆN RỘNG PHÁT HIỆN TỰ ĐỘNG]
Hệ thống phát hiện bão ticket bất thường gồm ${cluster.count} yêu cầu hỗ trợ thuộc nhóm "${cluster.categoryLabel}" được tạo trong vòng 30 phút qua.

Danh sách ticket liên quan:
${cluster.ticketNumbers.map((num, i) => `${i + 1}. ${num}: ${cluster.sampleTitles[i] || ''}`).join('\n')}

👉 Sự cố này đã tự động gộp các ticket trên. Khi KTV giải quyết xong sự cố này, toàn bộ ticket con sẽ được cập nhật đồng bộ.`;

  const newIncident = await prisma.incident.create({
    data: {
      incidentNumber,
      title,
      description,
      severity: cluster.severity,
      status: 'INVESTIGATING',
      createdById: userId,
      tickets: {
        connect: cluster.ticketIds.map((id) => ({ id })),
      },
      updates: {
        create: {
          userId,
          content: `Hệ thống tự động gom ${cluster.count} ticket trùng lặp vào sự cố diện rộng ${incidentNumber}.`,
          statusChange: 'INVESTIGATING',
        },
      },
    },
    include: {
      tickets: { select: { id: true, ticketNumber: true, title: true } },
    },
  });

  return newIncident;
}
