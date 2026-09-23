export interface OnboardingPresetKit {
  id: string;
  name: { vi: string; en: string };
  icon: string;
  badge: string;
  description: { vi: string; en: string };
  assetRequirements: Array<{
    type: string;
    keywords: string[];
    required: boolean;
    label: { vi: string; en: string };
  }>;
  licenseRequirements: Array<{
    keywords: string[];
    required: boolean;
    label: { vi: string; en: string };
  }>;
}

export const ONBOARDING_PRESET_KITS: OnboardingPresetKit[] = [
  {
    id: 'DEV_ENGINEER',
    name: { vi: '💻 IT & Kỹ sư Lập trình (Dev Kit)', en: '💻 Software Engineer (Dev Kit)' },
    icon: '💻',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    description: {
      vi: '1 Laptop cấu hình cao (i7/Ryzen 7/MacBook) + 1 Màn hình phụ + License Dev (JetBrains/VS) + M365',
      en: '1 High-spec Laptop (i7/Ryzen/MacBook) + 1 Extra Monitor + Dev License (JetBrains) + M365',
    },
    assetRequirements: [
      {
        type: 'PRIMARY_MACHINE',
        keywords: ['laptop', 'macbook', 'thinkpad', 'precision', 'latitude', 'workstation', 'pc'],
        required: true,
        label: { vi: 'Laptop / Máy trạm cấu hình cao', en: 'High-spec Laptop / Workstation' },
      },
      {
        type: 'MONITOR',
        keywords: ['màn hình', 'monitor', 'display', 'screen', 'ultrasharp'],
        required: false,
        label: { vi: 'Màn hình mở rộng (Monitor)', en: 'External Monitor' },
      },
    ],
    licenseRequirements: [
      {
        keywords: ['m365', 'microsoft 365', 'office 365', 'office'],
        required: true,
        label: { vi: 'Bản quyền Microsoft 365 / Office', en: 'Microsoft 365 / Office License' },
      },
      {
        keywords: ['jetbrains', 'intellij', 'pycharm', 'visual studio', 'github'],
        required: false,
        label: { vi: 'Bản quyền IDE / Lập trình (JetBrains/VS)', en: 'IDE Developer License (JetBrains/VS)' },
      },
    ],
  },
  {
    id: 'ACCOUNTING_FINANCE',
    name: { vi: '📊 Kế toán & Tài chính Kit', en: '📊 Accounting & Finance Kit' },
    icon: '📊',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    description: {
      vi: '1 PC để bàn hoặc Laptop văn phòng có bàn phím số + 1 Màn hình + License M365 + MISA',
      en: '1 Desktop PC or Office Laptop + 1 Monitor + M365 + Accounting Software License',
    },
    assetRequirements: [
      {
        type: 'PRIMARY_MACHINE',
        keywords: ['pc', 'desktop', 'laptop', 'optiplex', 'prodesk', 'vostro', 'thinkcentre'],
        required: true,
        label: { vi: 'Máy tính văn phòng (PC/Laptop)', en: 'Office PC / Laptop' },
      },
      {
        type: 'MONITOR',
        keywords: ['màn hình', 'monitor', 'display'],
        required: false,
        label: { vi: 'Màn hình văn phòng', en: 'Office Monitor' },
      },
    ],
    licenseRequirements: [
      {
        keywords: ['m365', 'microsoft 365', 'office 365', 'office', 'excel'],
        required: true,
        label: { vi: 'Bản quyền Microsoft 365 / Excel', en: 'Microsoft 365 / Excel License' },
      },
      {
        keywords: ['misa', 'fast', 'bravo', 'kế toán'],
        required: false,
        label: { vi: 'Bản quyền Phần mềm Kế toán (MISA/Fast)', en: 'Accounting Software License (MISA/Fast)' },
      },
    ],
  },
  {
    id: 'SALES_MARKETING',
    name: { vi: '📈 Kinh doanh & Tiếp thị (Sales Kit)', en: '📈 Sales & Marketing Kit' },
    icon: '📈',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    description: {
      vi: '1 Laptop mỏng nhẹ di động pin lâu + Chuột không dây + License M365',
      en: '1 Lightweight mobile laptop + Wireless mouse + M365 License',
    },
    assetRequirements: [
      {
        type: 'PRIMARY_MACHINE',
        keywords: ['laptop', 'ultrabook', 'macbook air', 'zenbook', 'xps', 'envy', 'swift', 'thinkpad'],
        required: true,
        label: { vi: 'Laptop mỏng nhẹ di động', en: 'Lightweight Mobile Laptop' },
      },
    ],
    licenseRequirements: [
      {
        keywords: ['m365', 'microsoft 365', 'office 365', 'office'],
        required: true,
        label: { vi: 'Bản quyền Microsoft 365', en: 'Microsoft 365 License' },
      },
    ],
  },
  {
    id: 'DESIGN_MEDIA',
    name: { vi: '🎨 Thiết kế đồ họa & Media Kit', en: '🎨 Graphic Design & Media Kit' },
    icon: '🎨',
    badge: 'bg-purple-50 text-purple-700 border-purple-200',
    description: {
      vi: '1 MacBook Pro / Máy trạm đồ họa + 1 Màn hình chuẩn màu + License Adobe CC + M365',
      en: '1 MacBook Pro / Workstation + Color-accurate Monitor + Adobe CC + M365',
    },
    assetRequirements: [
      {
        type: 'PRIMARY_MACHINE',
        keywords: ['macbook pro', 'workstation', 'precision', 'creator', 'legion', 'alienware', 'imac'],
        required: true,
        label: { vi: 'Máy trạm đồ họa / MacBook Pro', en: 'Graphics Workstation / MacBook Pro' },
      },
      {
        type: 'MONITOR',
        keywords: ['màn hình', 'monitor', 'ultrasharp', 'proart', 'display'],
        required: false,
        label: { vi: 'Màn hình đồ họa chuẩn màu', en: 'Color-accurate Graphic Monitor' },
      },
    ],
    licenseRequirements: [
      {
        keywords: ['adobe', 'creative cloud', 'photoshop', 'illustrator', 'premiere'],
        required: true,
        label: { vi: 'Bản quyền Adobe Creative Cloud', en: 'Adobe Creative Cloud License' },
      },
      {
        keywords: ['m365', 'microsoft 365', 'office 365'],
        required: false,
        label: { vi: 'Bản quyền Microsoft 365', en: 'Microsoft 365 License' },
      },
    ],
  },
  {
    id: 'GENERAL_OFFICE',
    name: { vi: '🏢 Hành chính & Văn phòng tiêu chuẩn', en: '🏢 General Office & Admin Kit' },
    icon: '🏢',
    badge: 'bg-slate-100 text-slate-800 border-slate-300',
    description: {
      vi: '1 Máy tính văn phòng cơ bản + License M365',
      en: '1 Standard Office PC/Laptop + M365 License',
    },
    assetRequirements: [
      {
        type: 'PRIMARY_MACHINE',
        keywords: ['pc', 'desktop', 'laptop', 'máy tính'],
        required: true,
        label: { vi: 'Máy tính làm việc tiêu chuẩn', en: 'Standard Work Computer' },
      },
    ],
    licenseRequirements: [
      {
        keywords: ['m365', 'microsoft 365', 'office 365', 'office'],
        required: true,
        label: { vi: 'Bản quyền Microsoft 365', en: 'Microsoft 365 License' },
      },
    ],
  },
];

/**
 * Tự động tìm kiếm và so khớp bộ trang bị Kit với tài sản & license có sẵn trong kho
 */
export function matchKitToInventory(
  kit: OnboardingPresetKit,
  availableAssets: any[],
  availableLicenses: any[]
) {
  const matchedAssetIds: string[] = [];
  const matchedLicenseIds: string[] = [];
  const missingItems: string[] = [];
  const usedAssetIds = new Set<string>();

  // 1. So khớp thiết bị
  for (const req of kit.assetRequirements) {
    let found = false;
    for (const asset of availableAssets) {
      if (usedAssetIds.has(asset.id)) continue;
      const haystack = `${asset.name || ''} ${asset.brand || ''} ${asset.model || ''} ${asset.category?.name || ''}`.toLowerCase();
      const isMatch = req.keywords.some((kw) => haystack.includes(kw.toLowerCase()));
      if (isMatch) {
        matchedAssetIds.push(asset.id);
        usedAssetIds.add(asset.id);
        found = true;
        break;
      }
    }

    if (!found) {
      // Nếu là thiết bị bắt buộc mà không tìm thấy máy theo keyword, lấy máy bất kỳ còn sẵn trong kho
      if (req.type === 'PRIMARY_MACHINE') {
        const fallback = availableAssets.find((a) => !usedAssetIds.has(a.id));
        if (fallback) {
          matchedAssetIds.push(fallback.id);
          usedAssetIds.add(fallback.id);
          found = true;
        }
      }
    }

    if (!found && req.required) {
      missingItems.push(req.label.vi);
    }
  }

  // 2. So khớp bản quyền
  for (const req of kit.licenseRequirements) {
    let found = false;
    for (const lic of availableLicenses) {
      if (matchedLicenseIds.includes(lic.id)) continue;
      const freeSeats = Math.max(0, (lic.totalSeats || 1) - (lic.usedSeats || 0));
      if (freeSeats <= 0) continue;

      const haystack = (lic.name || '').toLowerCase();
      const isMatch = req.keywords.some((kw) => haystack.includes(kw.toLowerCase()));
      if (isMatch) {
        matchedLicenseIds.push(lic.id);
        found = true;
        break;
      }
    }

    if (!found && req.required) {
      missingItems.push(req.label.vi);
    }
  }

  return {
    matchedAssetIds,
    matchedLicenseIds,
    missingItems,
    isFullyAvailable: missingItems.length === 0,
  };
}
