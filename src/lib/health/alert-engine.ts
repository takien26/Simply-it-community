import { prisma } from '@/lib/db';

export interface HealthMetricReport {
  cpu?: {
    usagePercent?: number;
  };
  ram?: {
    totalGB?: number;
    usedGB?: number;
    availableGB?: number;
    usedPercent?: number;
  };
  storage?: Array<{
    drive: string;
    totalGB?: number;
    freeGB?: number;
    usedGB?: number;
    usedPercent?: number;
  }>;
  security?: {
    defender?: {
      available?: boolean;
      enabled?: boolean;
      realTimeProtection?: boolean;
      signatureAgeDays?: number;
    };
    firewall?: {
      domain?: boolean;
      private?: boolean;
      public?: boolean;
    };
    bitlocker?: Array<{
      drive: string;
      protectionStatus?: string;
      encryptionPercentage?: number;
    }>;
  };
  windowsUpdate?: {
    lastUpdate?: string;
    pendingReboot?: boolean;
    rebootPendingDays?: number;
  };
  services?: Array<{
    name: string;
    status: string;
    displayName?: string;
  }>;
  battery?: {
    present?: boolean;
    percentage?: number;
    healthPercent?: number;
  };
  uptime?: {
    lastBoot?: string;
    uptimeMinutes?: number;
  };
  agent?: {
    version?: string;
    schemaVersion?: string;
    collectedAt?: string;
  };
}

export const DEFAULT_HEALTH_POLICIES = [
  {
    metric: 'STORAGE',
    name: 'Dung lượng ổ đĩa (Disk Storage Usage)',
    description: 'Cảnh báo khi phân vùng ổ cứng đạt ngưỡng đầy tiềm ẩn rủi ro treo máy hoặc mất dữ liệu',
    isEnabled: true,
    warningThreshold: 80,
    criticalThreshold: 90,
    clearThreshold: 75,
    durationMinutes: 0,
    requiredOccurrences: 1,
    severity: 'WARNING',
    autoCreateTicket: true,
    ticketPriority: 'HIGH',
  },
  {
    metric: 'CPU',
    name: 'Tải CPU cao liên tục (High CPU Load)',
    description: 'Cảnh báo khi bộ vi xử lý hoạt động ở mức công suất cao liên tục trong thời gian dài',
    isEnabled: true,
    warningThreshold: 85,
    criticalThreshold: 95,
    clearThreshold: 75,
    durationMinutes: 10,
    requiredOccurrences: 2,
    severity: 'WARNING',
    autoCreateTicket: false,
    ticketPriority: 'MEDIUM',
  },
  {
    metric: 'RAM',
    name: 'Tràn bộ nhớ RAM (High Memory Usage)',
    description: 'Cảnh báo khi dung lượng bộ nhớ RAM bị chiếm dụng gần hết gây chậm máy',
    isEnabled: true,
    warningThreshold: 85,
    criticalThreshold: 95,
    clearThreshold: 75,
    durationMinutes: 10,
    requiredOccurrences: 2,
    severity: 'WARNING',
    autoCreateTicket: false,
    ticketPriority: 'MEDIUM',
  },
  {
    metric: 'AGENT_OFFLINE',
    name: 'Máy trạm mất kết nối (Agent Offline)',
    description: 'Cảnh báo khi máy tính không gửi báo cáo sinh tồn về máy chủ quản trị',
    isEnabled: true,
    warningThreshold: 30, // 30 mins
    criticalThreshold: 120, // 2 hours
    clearThreshold: 0,
    durationMinutes: 0,
    requiredOccurrences: 1,
    severity: 'WARNING',
    autoCreateTicket: false,
    ticketPriority: 'LOW',
  },
  {
    metric: 'WINDOWS_UPDATE',
    name: 'Bản vá Windows quá hạn (Outdated Windows Updates)',
    description: 'Cảnh báo khi máy tính chưa được cài đặt bản vá bảo mật Windows trong thời gian dài',
    isEnabled: true,
    warningThreshold: 30, // 30 days
    criticalThreshold: 60, // 60 days
    clearThreshold: 0,
    durationMinutes: 0,
    requiredOccurrences: 1,
    severity: 'WARNING',
    autoCreateTicket: false,
    ticketPriority: 'LOW',
  },
  {
    metric: 'DEFENDER',
    name: 'Diệt virus bị vô hiệu hóa (Windows Defender Disabled)',
    description: 'Cảnh báo nghiêm trọng khi tính năng diệt virus hoặc bảo vệ thời gian thực bị tắt',
    isEnabled: true,
    warningThreshold: 0,
    criticalThreshold: 1,
    clearThreshold: 0,
    durationMinutes: 0,
    requiredOccurrences: 1,
    severity: 'CRITICAL',
    autoCreateTicket: true,
    ticketPriority: 'URGENT',
  },
  {
    metric: 'FIREWALL',
    name: 'Tường lửa bị tắt (Windows Firewall Disabled)',
    description: 'Cảnh báo nghiêm trọng khi các profile tường lửa mạng bị vô hiệu hóa',
    isEnabled: true,
    warningThreshold: 0,
    criticalThreshold: 1,
    clearThreshold: 0,
    durationMinutes: 0,
    requiredOccurrences: 1,
    severity: 'CRITICAL',
    autoCreateTicket: true,
    ticketPriority: 'URGENT',
  },
  {
    metric: 'BITLOCKER',
    name: 'Mã hóa ổ đĩa bị tắt (BitLocker Protection Off)',
    description: 'Cảnh báo khi ổ đĩa máy tính doanh nghiệp chưa được bảo vệ bằng mã hóa BitLocker',
    isEnabled: true,
    warningThreshold: 1,
    criticalThreshold: 0,
    clearThreshold: 0,
    durationMinutes: 0,
    requiredOccurrences: 1,
    severity: 'WARNING',
    autoCreateTicket: false,
    ticketPriority: 'MEDIUM',
  },
  {
    metric: 'PENDING_REBOOT',
    name: 'Yêu cầu khởi động lại máy (Pending Reboot Required)',
    description: 'Cảnh báo khi máy tính đã cài cập nhật nhưng chưa được khởi động lại sau nhiều ngày',
    isEnabled: true,
    warningThreshold: 7, // 7 days
    criticalThreshold: 14, // 14 days
    clearThreshold: 0,
    durationMinutes: 0,
    requiredOccurrences: 1,
    severity: 'WARNING',
    autoCreateTicket: false,
    ticketPriority: 'LOW',
  },
];

export async function getOrInitPolicies() {
  const existing = await prisma.healthAlertPolicy.findMany();
  if (existing.length >= DEFAULT_HEALTH_POLICIES.length) {
    return existing;
  }

  const existingMetrics = new Set(existing.map((p) => p.metric));
  for (const def of DEFAULT_HEALTH_POLICIES) {
    if (!existingMetrics.has(def.metric)) {
      await prisma.healthAlertPolicy.create({
        data: def as any,
      });
    }
  }

  return prisma.healthAlertPolicy.findMany();
}

/**
 * Tạo Ticket hỗ trợ tự động gắn với Asset và Alert (nếu chưa có ticket)
 */
async function autoCreateSupportTicket(
  asset: { id: string; assetTag: string; name: string; assignments?: any[] },
  alert: { metric: string; severity: string; message: string; resource?: string | null },
  priority: string
) {
  try {
    // Tìm admin hoặc system user làm người tạo ticket
    const adminUser = await prisma.user.findFirst({
      where: { role: { name: 'Admin' } },
      select: { id: true },
    });

    if (!adminUser) return null;

    // Sinh số ticket dạng TK-YYYYMMDD-XXXX
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const countToday = await prisma.ticket.count({
      where: {
        ticketNumber: { startsWith: `TK-${today}` },
      },
    });
    const ticketNumber = `TK-${today}-${String(countToday + 1).padStart(4, '0')}`;

    // Tìm người dùng hiện đang phụ trách thiết bị nếu có
    const currentHolder = asset.assignments?.[0]?.userId || null;

    const prioEnum = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(priority)
      ? (priority as any)
      : 'HIGH';

    const newTicket = await prisma.ticket.create({
      data: {
        ticketNumber,
        title: `[IT Health Alert] ${asset.name} (${asset.assetTag}): ${alert.message}`,
        description: `Hệ thống giám sát tự động phát hiện cảnh báo sức khỏe thiết bị:
- Thiết bị: ${asset.name} (Mã: ${asset.assetTag})
- Chỉ số vi phạm: ${alert.metric} ${alert.resource ? `(${alert.resource})` : ''}
- Mức độ: ${alert.severity}
- Nội dung: ${alert.message}
- Thời điểm phát hiện: ${new Date().toLocaleString('vi-VN')}

Ticket này được tạo tự động bởi SIMPLY IT Health Alert Engine. Vui lòng kiểm tra và xử lý theo quy trình.`,
        category: 'HARDWARE',
        priority: prioEnum,
        status: 'OPEN',
        createdById: adminUser.id,
        assignedToId: currentHolder,
        assetId: asset.id,
      },
    });

    return newTicket.id;
  } catch (err) {
    console.error('Lỗi khi tự động tạo ticket từ alert:', err);
    return null;
  }
}

/**
 * Xử lý báo cáo Health từ Agent gửi lên
 */
export async function processHealthReport(assetId: string, data: HealthMetricReport) {
  const policies = await getOrInitPolicies();
  const policyMap = new Map(policies.map((p) => [p.metric, p]));

  const now = new Date();
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    include: {
      assignments: {
        where: { returnedAt: null },
        take: 1,
      },
    },
  });

  if (!asset) {
    throw new Error(`Asset not found with ID ${assetId}`);
  }

  // 1. Cập nhật hoặc tạo mới bản ghi AssetHealth
  const cpuPercent = typeof data.cpu?.usagePercent === 'number' ? data.cpu.usagePercent : null;
  const ramTotal = typeof data.ram?.totalGB === 'number' ? data.ram.totalGB : null;
  const ramUsed = typeof data.ram?.usedGB === 'number' ? data.ram.usedGB : null;
  const ramAvailable = typeof data.ram?.availableGB === 'number' ? data.ram.availableGB : null;
  const ramPercent = typeof data.ram?.usedPercent === 'number' ? data.ram.usedPercent : null;

  let lastBootDate: Date | null = null;
  if (data.uptime?.lastBoot) {
    try {
      const d = new Date(data.uptime.lastBoot);
      if (!isNaN(d.getTime())) lastBootDate = d;
    } catch {}
  }

  const assetHealth = await prisma.assetHealth.upsert({
    where: { assetId },
    create: {
      assetId,
      status: 'HEALTHY',
      cpuUsagePercent: cpuPercent,
      ramTotalGB: ramTotal,
      ramUsedGB: ramUsed,
      ramAvailableGB: ramAvailable,
      ramUsedPercent: ramPercent,
      storage: data.storage || [],
      securityStatus: data.security || {},
      windowsUpdate: data.windowsUpdate || {},
      services: data.services || [],
      battery: data.battery || {},
      uptimeMinutes: data.uptime?.uptimeMinutes || null,
      lastBoot: lastBootDate,
      agentVersion: data.agent?.version || '4.1.0',
      schemaVersion: data.agent?.schemaVersion || '1.0',
      lastReportedAt: now,
    },
    update: {
      cpuUsagePercent: cpuPercent,
      ramTotalGB: ramTotal,
      ramUsedGB: ramUsed,
      ramAvailableGB: ramAvailable,
      ramUsedPercent: ramPercent,
      storage: data.storage || [],
      securityStatus: data.security || {},
      windowsUpdate: data.windowsUpdate || {},
      services: data.services || [],
      battery: data.battery || {},
      uptimeMinutes: data.uptime?.uptimeMinutes || null,
      lastBoot: lastBootDate,
      agentVersion: data.agent?.version || '4.1.0',
      schemaVersion: data.agent?.schemaVersion || '1.0',
      lastReportedAt: now,
    },
  });

  // 2. Chạy Alert Engine kiểm tra các chính sách
  let createdCount = 0;
  let updatedCount = 0;
  let resolvedCount = 0;

  async function handleAlertCondition({
    metric,
    resource = null,
    isTriggered,
    isClear,
    isCritical,
    currentValue = null,
    currentValueText = '',
    thresholdValue = null,
    thresholdValueText = '',
    message,
    policy,
  }: {
    metric: string;
    resource?: string | null;
    isTriggered: boolean;
    isClear: boolean;
    isCritical: boolean;
    currentValue?: number | null;
    currentValueText?: string;
    thresholdValue?: number | null;
    thresholdValueText?: string;
    message: string;
    policy?: any;
  }) {
    if (!policy || !policy.isEnabled) return;

    const fingerprint = `${assetId}:${metric}:${resource || 'system'}`;
    const activeAlert = await prisma.healthAlert.findFirst({
      where: {
        assetId,
        fingerprint,
        status: 'ACTIVE',
      },
    });

    if (isTriggered) {
      const severity = isCritical ? 'CRITICAL' : 'WARNING';

      if (activeAlert) {
        // Cập nhật alert cũ (Deduplication)
        await prisma.healthAlert.update({
          where: { id: activeAlert.id },
          data: {
            occurrenceCount: activeAlert.occurrenceCount + 1,
            lastDetectedAt: now,
            currentValue,
            currentValueText,
            thresholdValue,
            thresholdValueText,
            severity,
            message,
          },
        });
        updatedCount++;
      } else {
        // Tạo alert mới
        let ticketId: string | null = null;
        if (asset && policy.autoCreateTicket) {
          ticketId = await autoCreateSupportTicket(
            asset,
            { metric, severity, message, resource },
            policy.ticketPriority || 'HIGH'
          );
        }

        await prisma.healthAlert.create({
          data: {
            assetId,
            fingerprint,
            metric,
            resource,
            severity,
            status: 'ACTIVE',
            currentValue,
            currentValueText,
            thresholdValue,
            thresholdValueText,
            message,
            occurrenceCount: 1,
            firstDetectedAt: now,
            lastDetectedAt: now,
            ticketId,
          },
        });
        createdCount++;
      }
    } else if (isClear && activeAlert) {
      // Tự động giải quyết (Auto-Resolve with Hysteresis)
      await prisma.healthAlert.update({
        where: { id: activeAlert.id },
        data: {
          status: 'RESOLVED',
          resolvedAt: now,
        },
      });
      resolvedCount++;
    }
  }

  // --- A. Kiểm tra Dung lượng ổ đĩa (Storage) ---
  const storagePolicy = policyMap.get('STORAGE');
  if (storagePolicy && storagePolicy.isEnabled && Array.isArray(data.storage)) {
    for (const drive of data.storage) {
      const usedPct = Number(drive.usedPercent) || 0;
      const isCrit = usedPct >= (storagePolicy.criticalThreshold || 90);
      const isWarn = usedPct >= (storagePolicy.warningThreshold || 80);
      const isClear = usedPct <= (storagePolicy.clearThreshold || 75);

      await handleAlertCondition({
        metric: 'STORAGE',
        resource: drive.drive,
        isTriggered: isCrit || isWarn,
        isClear,
        isCritical: isCrit,
        currentValue: usedPct,
        currentValueText: `${usedPct.toFixed(1)}% (${drive.freeGB || 0} GB trống)`,
        thresholdValue: isCrit ? storagePolicy.criticalThreshold : storagePolicy.warningThreshold,
        thresholdValueText: `${isCrit ? storagePolicy.criticalThreshold : storagePolicy.warningThreshold}%`,
        message: `Ổ đĩa ${drive.drive} đạt ${usedPct.toFixed(1)}% dung lượng (${drive.freeGB || 0} GB trống trên ${drive.totalGB || 0} GB)`,
        policy: storagePolicy,
      });
    }
  }

  // --- B. Kiểm tra CPU Load ---
  const cpuPolicy = policyMap.get('CPU');
  if (cpuPolicy && cpuPolicy.isEnabled && typeof cpuPercent === 'number') {
    const isCrit = cpuPercent >= (cpuPolicy.criticalThreshold || 95);
    const isWarn = cpuPercent >= (cpuPolicy.warningThreshold || 85);
    const isClear = cpuPercent <= (cpuPolicy.clearThreshold || 75);

    await handleAlertCondition({
      metric: 'CPU',
      resource: 'Processor',
      isTriggered: isCrit || isWarn,
      isClear,
      isCritical: isCrit,
      currentValue: cpuPercent,
      currentValueText: `${cpuPercent.toFixed(1)}%`,
      thresholdValue: isCrit ? cpuPolicy.criticalThreshold : cpuPolicy.warningThreshold,
      thresholdValueText: `${isCrit ? cpuPolicy.criticalThreshold : cpuPolicy.warningThreshold}%`,
      message: `Tải CPU vượt ngưỡng: ${cpuPercent.toFixed(1)}%`,
      policy: cpuPolicy,
    });
  }

  // --- C. Kiểm tra RAM Usage ---
  const ramPolicy = policyMap.get('RAM');
  if (ramPolicy && ramPolicy.isEnabled && typeof ramPercent === 'number') {
    const isCrit = ramPercent >= (ramPolicy.criticalThreshold || 95);
    const isWarn = ramPercent >= (ramPolicy.warningThreshold || 85);
    const isClear = ramPercent <= (ramPolicy.clearThreshold || 75);

    await handleAlertCondition({
      metric: 'RAM',
      resource: 'Memory',
      isTriggered: isCrit || isWarn,
      isClear,
      isCritical: isCrit,
      currentValue: ramPercent,
      currentValueText: `${ramPercent.toFixed(1)}% (${ramAvailable || 0} GB còn trống)`,
      thresholdValue: isCrit ? ramPolicy.criticalThreshold : ramPolicy.warningThreshold,
      thresholdValueText: `${isCrit ? ramPolicy.criticalThreshold : ramPolicy.warningThreshold}%`,
      message: `Bộ nhớ RAM sử dụng quá tải: ${ramPercent.toFixed(1)}% (${ramUsed || 0} GB / ${ramTotal || 0} GB)`,
      policy: ramPolicy,
    });
  }

  // --- D. Kiểm tra Windows Defender ---
  const defenderPolicy = policyMap.get('DEFENDER');
  if (defenderPolicy && defenderPolicy.isEnabled && data.security?.defender) {
    const def = data.security.defender;
    const isDefDisabled = def.available !== false && (def.enabled === false || def.realTimeProtection === false);
    const isSigOld = typeof def.signatureAgeDays === 'number' && def.signatureAgeDays > 14;
    const isTriggered = isDefDisabled || isSigOld;

    let reasonMsg = '';
    if (def.enabled === false) reasonMsg = 'Windows Defender bị vô hiệu hóa hoàn toàn';
    else if (def.realTimeProtection === false) reasonMsg = 'Tính năng bảo vệ thời gian thực (Real-time Protection) bị tắt';
    else if (isSigOld) reasonMsg = `Chữ ký diệt virus quá hạn ${def.signatureAgeDays} ngày chưa cập nhật`;

    await handleAlertCondition({
      metric: 'DEFENDER',
      resource: 'Antivirus',
      isTriggered,
      isClear: !isTriggered,
      isCritical: true,
      currentValueText: isTriggered ? 'Vô hiệu hóa / Quá hạn' : 'Đang bảo vệ',
      message: `Cảnh báo an ninh: ${reasonMsg}`,
      policy: defenderPolicy,
    });
  }

  // --- E. Kiểm tra Windows Firewall ---
  const firewallPolicy = policyMap.get('FIREWALL');
  if (firewallPolicy && firewallPolicy.isEnabled && data.security?.firewall) {
    const fw = data.security.firewall;
    const isFwDisabled = fw.domain === false || fw.private === false || fw.public === false;
    const disabledProfiles: string[] = [];
    if (fw.domain === false) disabledProfiles.push('Domain');
    if (fw.private === false) disabledProfiles.push('Private');
    if (fw.public === false) disabledProfiles.push('Public');

    await handleAlertCondition({
      metric: 'FIREWALL',
      resource: 'Firewall',
      isTriggered: isFwDisabled,
      isClear: !isFwDisabled,
      isCritical: true,
      currentValueText: isFwDisabled ? `Tắt: ${disabledProfiles.join(', ')}` : 'Đang bật',
      message: `Tường lửa Windows Firewall bị tắt trên profile: ${disabledProfiles.join(', ')}`,
      policy: firewallPolicy,
    });
  }

  // --- F. Kiểm tra BitLocker ---
  const bitlockerPolicy = policyMap.get('BITLOCKER');
  if (bitlockerPolicy && bitlockerPolicy.isEnabled && Array.isArray(data.security?.bitlocker)) {
    for (const b of data.security.bitlocker) {
      const isUnprotected = b.protectionStatus && b.protectionStatus !== 'On' && b.protectionStatus !== '1';
      await handleAlertCondition({
        metric: 'BITLOCKER',
        resource: b.drive,
        isTriggered: !!isUnprotected,
        isClear: !isUnprotected,
        isCritical: false,
        currentValueText: b.protectionStatus || 'Tắt',
        message: `Ổ đĩa ${b.drive} chưa được bảo vệ bằng mã hóa BitLocker (Trạng thái: ${b.protectionStatus || 'Off'})`,
        policy: bitlockerPolicy,
      });
    }
  }

  // --- G. Kiểm tra Windows Update & Pending Reboot ---
  const rebootPolicy = policyMap.get('PENDING_REBOOT');
  if (rebootPolicy && rebootPolicy.isEnabled && data.windowsUpdate) {
    const isPending = !!data.windowsUpdate.pendingReboot;
    const pendingDays = Number(data.windowsUpdate.rebootPendingDays) || 0;
    const isCrit = pendingDays >= (rebootPolicy.criticalThreshold || 14);

    await handleAlertCondition({
      metric: 'PENDING_REBOOT',
      resource: 'WindowsUpdate',
      isTriggered: isPending,
      isClear: !isPending,
      isCritical: isCrit,
      currentValueText: isPending ? 'Cần khởi động lại' : 'Bình thường',
      message: `Máy tính có cập nhật mới đang chờ khởi động lại (Pending Reboot)`,
      policy: rebootPolicy,
    });
  }

  // 3. Đánh giá trạng thái sức khỏe tổng quát (Overall Status) của máy
  const activeAlerts = await prisma.healthAlert.findMany({
    where: {
      assetId,
      status: 'ACTIVE',
    },
    select: { severity: true },
  });

  let overallStatus = 'HEALTHY';
  if (activeAlerts.some((a) => a.severity === 'CRITICAL')) {
    overallStatus = 'CRITICAL';
  } else if (activeAlerts.length > 0) {
    overallStatus = 'WARNING';
  }

  await prisma.assetHealth.update({
    where: { assetId },
    data: { status: overallStatus },
  });

  return {
    success: true,
    assetId,
    overallStatus,
    alertsCreated: createdCount,
    alertsUpdated: updatedCount,
    alertsResolved: resolvedCount,
    activeAlertsCount: activeAlerts.length,
  };
}
