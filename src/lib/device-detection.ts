import { prisma } from '@/lib/db';

export type DetectedDeviceType = 'Laptop' | 'Desktop' | 'Server';

export interface DeviceDetectionInput {
  deviceType?: string | null;
  brand?: string | null;
  model?: string | null;
  hostname?: string | null;
  specs?: {
    deviceType?: string | null;
    hasBattery?: boolean | null;
    chassisTypes?: string | number[] | null;
    cpu?: string | null;
    os?: string | null;
    [key: string]: any;
  } | null;
}

/**
 * Detects whether a machine is a Laptop, Desktop, or Server
 * based on collected hardware signals, model names, and OS details.
 */
export function detectDeviceType(input: DeviceDetectionInput): DetectedDeviceType {
  // 1. Explicit deviceType reported by collector script
  const explicitType = (input.deviceType || input.specs?.deviceType || '').trim().toLowerCase();
  if (explicitType === 'laptop' || explicitType.includes('notebook') || explicitType.includes('laptop')) {
    return 'Laptop';
  }
  if (explicitType === 'server') {
    return 'Server';
  }
  if (explicitType === 'desktop' || explicitType === 'pc') {
    return 'Desktop';
  }

  // 2. Battery presence strongly indicates Laptop / Mobile PC
  if (input.specs?.hasBattery === true) {
    return 'Laptop';
  }

  // 3. Inspect SMBIOS Chassis Types if available
  if (input.specs?.chassisTypes) {
    const rawChassis = Array.isArray(input.specs.chassisTypes)
      ? input.specs.chassisTypes
      : String(input.specs.chassisTypes).split(',').map((s) => parseInt(s.trim(), 10)).filter(Boolean);

    const laptopChassisIds = [8, 9, 10, 11, 12, 14, 30, 31, 32];
    const serverChassisIds = [17, 23, 28, 29];

    if (rawChassis.some((id) => laptopChassisIds.includes(id))) {
      return 'Laptop';
    }
    if (rawChassis.some((id) => serverChassisIds.includes(id))) {
      return 'Server';
    }
  }

  const brand = (input.brand || '').toLowerCase();
  const model = (input.model || '').toLowerCase();
  const hostname = (input.hostname || '').toLowerCase();
  const os = (input.specs?.os || '').toLowerCase();
  const combined = `${brand} ${model} ${hostname}`;

  // 4. Server OS or keywords
  if (os.includes('server') || combined.includes('server') || combined.includes('poweredge') || combined.includes('proliant') || combined.includes('thinksystem')) {
    return 'Server';
  }

  // 5. Lenovo machine type / model code patterns (e.g. 21S60027VA, 20XF006CVA, 82VG0001US)
  if (/^(20|21|80|81|82|83)[a-z0-9]{6,10}/i.test(model) || /lenovo\s+(20|21|80|81|82|83)/i.test(combined)) {
    return 'Laptop';
  }

  // 6. Common Laptop product line keywords
  const laptopKeywords = [
    'laptop', 'notebook', 'ultrabook',
    'thinkpad', 'thinkbook', 'ideapad', 'yoga', 'legion', 'loq',
    'latitude', 'inspiron', 'xps', 'precision mobile', 'alienware',
    'elitebook', 'probook', 'zbook', 'dragonfly', 'spectre', 'envy', 'pavilion', 'omen', 'victus',
    'zenbook', 'vivobook', 'expertbook', 'rog', 'tuf gaming', 'zephyrus',
    'macbook', 'surface pro', 'surface laptop', 'surface book', 'surface go',
    'swift', 'aspire', 'spin', 'gram'
  ];

  if (laptopKeywords.some((kw) => combined.includes(kw))) {
    return 'Laptop';
  }

  // 7. Desktop product line keywords
  const desktopKeywords = [
    'optiplex', 'thinkcentre', 'prodesk', 'elitedesk', 'precision tower', 'desktop', 'workstation', 'all-in-one', 'aio'
  ];

  if (desktopKeywords.some((kw) => combined.includes(kw))) {
    return 'Desktop';
  }

  // Default fallback
  return 'Desktop';
}

/**
 * Finds or creates the appropriate AssetCategory for the detected device type.
 */
export async function resolveCategoryForDevice(deviceType: DetectedDeviceType) {
  if (deviceType === 'Laptop') {
    let cat = await prisma.assetCategory.findFirst({
      where: {
        name: { in: ['Laptop', 'Máy tính xách tay', 'Laptop / Notebook', 'Notebook'], mode: 'insensitive' },
      },
    });
    if (!cat) {
      cat = await prisma.assetCategory.findFirst({
        where: { name: { contains: 'Laptop', mode: 'insensitive' } },
      });
    }
    if (!cat) {
      cat = await prisma.assetCategory.create({
        data: {
          name: 'Laptop',
          icon: '💻',
          description: 'Máy tính xách tay / Laptop',
          isActive: true,
          sortOrder: 0,
        },
      });
    }
    return cat;
  }

  if (deviceType === 'Server') {
    let cat = await prisma.assetCategory.findFirst({
      where: {
        name: { in: ['Server', 'Máy chủ', 'Máy chủ / Server'], mode: 'insensitive' },
      },
    });
    if (!cat) {
      cat = await prisma.assetCategory.findFirst({
        where: { name: { contains: 'Server', mode: 'insensitive' } },
      });
    }
    if (!cat) {
      cat = await prisma.assetCategory.create({
        data: {
          name: 'Máy chủ',
          icon: '🗄️',
          description: 'Máy chủ / Server',
          isActive: true,
          sortOrder: 1,
        },
      });
    }
    return cat;
  }

  // Desktop
  let cat = await prisma.assetCategory.findFirst({
    where: {
      name: { in: ['PC / Máy tính để bàn', 'Máy tính để bàn', 'Desktop', 'PC'], mode: 'insensitive' },
    },
  });
  if (!cat) {
    cat = await prisma.assetCategory.findFirst({
      where: { name: { contains: 'để bàn', mode: 'insensitive' } },
    });
  }
  if (!cat) {
    cat = await prisma.assetCategory.findFirst({
      where: { name: { in: ['Laptop', 'Thiết bị văn phòng'] } },
    });
  }
  if (!cat) {
    cat = await prisma.assetCategory.findFirst();
  }
  return cat;
}
