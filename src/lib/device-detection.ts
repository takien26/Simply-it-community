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

export function isGenericSerial(serial: string | null | undefined): boolean {
  if (!serial) return true;
  const s = serial.trim().toLowerCase();
  if (!s || s.length < 3) return true;
  const genericList = [
    'default string',
    'default',
    'to be filled by o.e.m.',
    'to be filled by oem',
    'none',
    'null',
    'system serial number',
    'system serial',
    'all series',
    'chassis serial number',
    'base board serial number',
    'motherboard serial number',
    'not specified',
    'unknown',
    'system manufacturer',
    'o.e.m.',
    'oem',
    '123456789',
    '1234567890',
    '0123456789',
    '0000000000',
    'na',
    'n/a',
    'scan',
  ];
  return genericList.includes(s) || genericList.some((g) => s.startsWith(g));
}

/**
 * Detects whether a machine is a Laptop, Desktop, or Server
 * based on collected hardware signals, model names, and OS details.
 */
/**
 * Regular expression matching retail Desktop Motherboard chipsets and product series.
 * Supports standard form-factor suffixes: M (Micro-ATX), E, -PLUS, -PRO, WIFI, etc.
 * Examples: B760M, B760M-PLUS, H610M-K, B550M, A520M, Z790, X670E, AORUS, TOMAHAWK, MORTAR...
 */
export const DESKTOP_MOTHERBOARD_REGEX =
  /\b(b[12345678]\d{2}|h[134568]\d{2}|z[12345678]\d{2}|x[2345678]\d{2}|a[356]\d{2}|q[13456]\d{2}|b85|h81|h61|b75)(m|e|-|\b)|(aorus|tomahawk|mortar|pro-vdh|gaming-x|strix\s+[bhzx]|tuf\s+gaming\s+[bhzx]|prime\s+[bhza]|phantom\s+gaming|steel\s+legend)/i;

/**
 * Checks if a device is a custom-built / assembled Desktop PC
 * (máy tính để bàn lắp ráp) where the model is actually a motherboard name.
 */
export function isCustomAssembledPC(input: {
  brand?: string | null;
  model?: string | null;
  motherboard?: string | null;
  deviceType?: string | null;
}): boolean {
  const model = (input.model || '').trim();
  const mb = (input.motherboard || '').trim();
  const brand = (input.brand || '').trim().toLowerCase();
  const combined = `${brand} ${model} ${mb}`.trim();

  // If model or motherboard matches a known desktop motherboard chipset
  if (DESKTOP_MOTHERBOARD_REGEX.test(model) || DESKTOP_MOTHERBOARD_REGEX.test(mb) || DESKTOP_MOTHERBOARD_REGEX.test(combined)) {
    return true;
  }

  // Generic OEM strings from unbranded / custom desktop BIOS
  const genericModels = [
    'system product name',
    'all series',
    'to be filled by o.e.m.',
    'default string',
    'standard pc',
    'desktop pc',
    'pc lắp ráp',
    'custom pc',
  ];
  if (genericModels.some((g) => model.toLowerCase().includes(g))) {
    return true;
  }

  // Component motherboard manufacturers reporting as brand on desktop
  const componentBrands = ['asustek', 'asus', 'gigabyte', 'msi', 'micro-star', 'asrock', 'biostar', 'colorful'];
  if (componentBrands.some((cb) => brand.includes(cb))) {
    const laptopLines = ['zenbook', 'vivobook', 'expertbook', 'zephyrus', 'katana', 'stealth', 'raider', 'cyborg', 'bravo', 'thin'];
    if (!laptopLines.some((ll) => model.toLowerCase().includes(ll))) {
      return true;
    }
  }

  return false;
}

/**
 * Detects whether a machine is a Laptop, Desktop, or Server
 * based on collected hardware signals, model names, and OS details.
 */
export function detectDeviceType(input: DeviceDetectionInput): DetectedDeviceType {
  const brand = (input.brand || '').toLowerCase();
  const model = (input.model || '').toLowerCase();
  const hostname = (input.hostname || '').toLowerCase();
  const os = (input.specs?.os || '').toLowerCase();
  const motherboard = (input.specs?.motherboard || input.specs?.mainboard || '').toLowerCase();
  const combined = `${brand} ${model} ${motherboard} ${hostname}`;

  // 0. Desktop motherboard patterns take absolute precedence
  // (Prevents custom desktop PCs with UPS battery or "TUF Gaming" / "ROG" branding from being misclassified as Laptop)
  if (
    DESKTOP_MOTHERBOARD_REGEX.test(motherboard) ||
    DESKTOP_MOTHERBOARD_REGEX.test(model) ||
    DESKTOP_MOTHERBOARD_REGEX.test(combined)
  ) {
    return 'Desktop';
  }

  // 1. Explicit deviceType reported by collector script
  const explicitType = (input.deviceType || input.specs?.deviceType || '').trim().toLowerCase();
  if (explicitType === 'desktop' || explicitType === 'pc') {
    return 'Desktop';
  }
  if (explicitType === 'server') {
    return 'Server';
  }
  if (explicitType === 'laptop' || explicitType.includes('notebook') || explicitType.includes('laptop')) {
    return 'Laptop';
  }

  // 2. Desktop SMBIOS Chassis Types: 3=Desktop, 4=Low Profile Desktop, 6=Mini Tower, 7=Tower, 15=Space-saving, 16=Lunch Box, 24=Sealed-case PC
  const desktopChassisIds = [3, 4, 5, 6, 7, 15, 16, 24];
  const laptopChassisIds = [8, 9, 10, 11, 12, 14, 30, 31, 32];
  const serverChassisIds = [17, 23, 28, 29];

  if (input.specs?.chassisTypes) {
    const rawChassis = Array.isArray(input.specs.chassisTypes)
      ? input.specs.chassisTypes
      : String(input.specs.chassisTypes).split(',').map((s) => parseInt(s.trim(), 10)).filter(Boolean);

    if (rawChassis.some((id) => desktopChassisIds.includes(id))) {
      return 'Desktop';
    }
    if (rawChassis.some((id) => laptopChassisIds.includes(id))) {
      return 'Laptop';
    }
    if (rawChassis.some((id) => serverChassisIds.includes(id))) {
      return 'Server';
    }
  }

  // 3. Server OS or keywords
  if (os.includes('server') || combined.includes('server') || combined.includes('poweredge') || combined.includes('proliant') || combined.includes('thinksystem')) {
    return 'Server';
  }

  // 4. Desktop OEM product lines
  const desktopKeywords = [
    'optiplex', 'thinkcentre', 'prodesk', 'elitedesk', 'precision tower', 'desktop', 'workstation', 'all-in-one', 'aio'
  ];
  if (desktopKeywords.some((kw) => combined.includes(kw))) {
    return 'Desktop';
  }

  // 5. Battery presence indicates Laptop (only after Desktop rules have cleared)
  if (input.specs?.hasBattery === true) {
    return 'Laptop';
  }

  // 6. Lenovo machine type / model code patterns (e.g. 21S60027VA, 20XF006CVA, 82VG0001US)
  if (/^(20|21|80|81|82|83)[a-z0-9]{6,10}/i.test(model) || /lenovo\s+(20|21|80|81|82|83)/i.test(combined)) {
    return 'Laptop';
  }

  // 7. Common Laptop product line keywords
  const laptopKeywords = [
    'laptop', 'notebook', 'ultrabook',
    'thinkpad', 'thinkbook', 'ideapad', 'yoga', 'legion', 'loq',
    'latitude', 'inspiron', 'xps', 'precision mobile', 'alienware',
    'elitebook', 'probook', 'zbook', 'dragonfly', 'spectre', 'envy', 'pavilion', 'omen', 'victus',
    'zenbook', 'vivobook', 'expertbook', 'zephyrus',
    'macbook', 'surface pro', 'surface laptop', 'surface book', 'surface go',
    'swift', 'aspire', 'spin', 'gram'
  ];

  if (laptopKeywords.some((kw) => combined.includes(kw))) {
    return 'Laptop';
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
