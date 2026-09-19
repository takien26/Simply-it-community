/**
 * Pure utility functions for formatting Asset specs and names
 * Compatible with both Server-side API and Client-side Components
 */

export function formatAssetSpecsForExport(rawSpecs: any): string {
  if (!rawSpecs) return '—';
  let specs = rawSpecs;
  if (typeof specs === 'string') {
    try {
      specs = JSON.parse(specs);
    } catch {
      return specs.trim() || '—';
    }
  }
  if (!specs || typeof specs !== 'object') return '—';

  const parts: string[] = [];

  // 1. CPU / Vi xử lý
  const cpu = specs.cpu || specs.processor;
  if (cpu && typeof cpu === 'string' && cpu.trim()) {
    parts.push(`CPU: ${cpu.trim()}`);
  }

  // 2. RAM / Bộ nhớ trong
  const ram = specs.ram || specs.memory;
  if (ram) {
    let ramStr = typeof ram === 'string' ? ram.trim() : `${ram} GB`;
    // If it contains extra slot details like '8 GB (1 slots, 2400 MHz)', keep it concise
    parts.push(`RAM: ${ramStr}`);
  }

  // 3. Ổ cứng (Storage / SSD / HDD)
  const storage = specs.storage || specs.disk || specs.ssd || specs.hdd;
  if (storage && typeof storage === 'string' && storage.trim()) {
    parts.push(`Ổ cứng: ${storage.trim()}`);
  }

  // 4. Card màn hình (GPU / VGA)
  const gpu = specs.gpu || specs.vga || specs.graphics;
  if (gpu && typeof gpu === 'string' && gpu.trim()) {
    parts.push(`GPU: ${gpu.trim()}`);
  }

  // 5. Hệ điều hành (OS)
  const os = specs.os || specs.operatingSystem;
  if (os && typeof os === 'string' && os.trim()) {
    parts.push(`HĐH: ${os.trim()}`);
  }

  // 6. Địa chỉ IP
  const ip = specs.ipAddress || specs.ip;
  if (ip && typeof ip === 'string' && ip.trim()) {
    parts.push(`IP: ${ip.trim()}`);
  }

  // 7. Địa chỉ MAC
  const mac = specs.macAddress || specs.mac;
  if (mac && typeof mac === 'string' && mac.trim()) {
    parts.push(`MAC: ${mac.trim()}`);
  }

  // Nếu không phát hiện trường chuẩn nào ở trên, chỉ trích xuất các thuộc tính đơn giản (primitive),
  // tuyệt đối bỏ qua mảng phần mềm, license object hay metadata quét
  if (parts.length === 0) {
    const ignoredKeys = [
      'installedSoftware',
      'osLicense',
      'officeLicense',
      'crackDetection',
      'licenseMatches',
      'autoScanned',
      'source',
      'paymentHistory',
      'lastScannedHost',
      'chassisTypes',
      'autoDiscovered',
      'deviceType',
      'hasBattery',
      'loggedUser',
    ];

    const fallbackList = Object.entries(specs)
      .filter(([k, v]) => {
        if (ignoredKeys.includes(k)) return false;
        if (typeof v === 'object' && v !== null) return false;
        return v !== undefined && v !== null && String(v).trim() !== '';
      })
      .map(([k, v]) => `${k}: ${v}`);

    return fallbackList.length > 0 ? fallbackList.join(' | ') : '—';
  }

  return parts.join(' | ');
}

export function formatDeviceNameAndModel(
  name?: string | null,
  brand?: string | null,
  model?: string | null
): string {
  const cleanName = (name || '').trim();

  let cleanBrand = (brand || '').trim();
  cleanBrand = cleanBrand
    .replace(/Technology Co\.,? Ltd\.?/gi, '')
    .replace(/COMPUTER INC\.?/gi, '')
    .replace(/Technologies|Corporation|Corp\.?/gi, '')
    .replace(/Group Limited/gi, '')
    .trim();

  const cleanModel = (model || '').trim();

  const extraParts = [cleanBrand, cleanModel].filter(Boolean);
  if (extraParts.length === 0) return cleanName || '—';

  // Tránh lặp lại nếu trong tên đã chứa model
  if (cleanModel && cleanName.toLowerCase().includes(cleanModel.toLowerCase()) && cleanModel.length > 3) {
    return cleanName;
  }

  const extraStr = extraParts.join(' - ');
  if (!cleanName) return extraStr;

  return `${cleanName} (${extraStr})`;
}
