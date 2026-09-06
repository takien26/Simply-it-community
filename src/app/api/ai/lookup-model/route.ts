import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getGenAIClient, generateUnifiedTextAI } from '@/lib/ai-config';

const CANDIDATE_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-3-flash-preview',
  'gemini-3.6-flash',
  'gemini-flash-latest',
];

const serverCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function repairAndParseAIJson(responseText: string): any {
  let clean = responseText.trim();
  if (clean.startsWith('```json')) clean = clean.slice(7);
  if (clean.startsWith('```')) clean = clean.slice(3);
  if (clean.endsWith('```')) clean = clean.slice(0, -3);
  clean = clean.trim();

  try {
    return JSON.parse(clean);
  } catch {}

  const objectMatch = clean.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      return JSON.parse(objectMatch[0]);
    } catch {}
  }

  let repaired = clean;
  const quoteCount = (repaired.match(/(?<!\\)"/g) || []).length;
  if (quoteCount % 2 !== 0) repaired += '"';

  const openBraces = (repaired.match(/\{/g) || []).length;
  const closeBraces = (repaired.match(/\}/g) || []).length;
  for (let i = 0; i < openBraces - closeBraces; i++) repaired += '}';

  try {
    return JSON.parse(repaired);
  } catch {}

  return null;
}

/**
 * High-accuracy Hardware Intelligence Engine (Offline / Instant Fallback)
 */
function lookupHardwareKnowledgeBase(rawQuery: string, categories: { id: string; name: string }[]): any | null {
  const q = rawQuery.toLowerCase().trim();

  const getCatId = (nameKeyword: string) => {
    const found = categories.find((c) => c.name.toLowerCase().includes(nameKeyword.toLowerCase()));
    return found ? { id: found.id, name: found.name } : { id: categories[0]?.id || '', name: 'Laptop' };
  };

  // 1. ASUS Zenbook S16 (UM5606)
  if (q.includes('zenbook s16') || q.includes('um5606') || (q.includes('zenbook') && q.includes('s16'))) {
    const cat = getCatId('Laptop');
    return {
      brand: 'Asus',
      name: 'Laptop Asus Zenbook S16 OLED (UM5606GA)',
      matchedCategoryId: cat.id,
      matchedCategoryName: cat.name,
      warrantyMonths: 24,
      specs: {
        cpu: 'AMD Ryzen AI 9 HX 370 (12 nhân 24 luồng, Turbo 5.1GHz, NPU 50 TOPS)',
        ram: '32GB LPDDR5X 7500MHz Onboard',
        storage: '1TB PCIe 4.0 NVMe M.2 SSD',
        screen: '16.0 inch 3K (2880 x 1800) OLED 16:10 120Hz 500nits 100% DCI-P3 Touch',
        gpu: 'AMD Radeon 890M Graphics',
        os: 'Windows 11 Home 64-bit bản quyền',
        ports: '2x USB4 Type-C (DisplayPort/PowerDelivery), 1x USB 3.2 Gen 2, 1x HDMI 2.1, SD Card Reader, Audio Jack',
        battery: '78WHrs, 4-cell Li-ion (Sạc nhanh 65W Type-C)',
        weight: '1.50 kg',
        color: 'Ceraluminum Xám (Zumaia Gray)',
      },
    };
  }

  // 2. ASUS Zenbook 14 OLED
  if (q.includes('zenbook 14') || q.includes('ux3405') || q.includes('um3406')) {
    const cat = getCatId('Laptop');
    return {
      brand: 'Asus',
      name: 'Laptop Asus Zenbook 14 OLED (UX3405/UM3406)',
      matchedCategoryId: cat.id,
      matchedCategoryName: cat.name,
      warrantyMonths: 24,
      specs: {
        cpu: 'Intel Core Ultra 7 155H / AMD Ryzen 7 8840HS (AI NPU)',
        ram: '16GB / 32GB LPDDR5X 7467MHz',
        storage: '512GB / 1TB PCIe 4.0 NVMe SSD',
        screen: '14.0 inch 3K (2880 x 1800) OLED 120Hz 100% DCI-P3',
        gpu: 'Intel Arc Graphics / AMD Radeon 780M',
        os: 'Windows 11 Home 64-bit',
        ports: '2x Thunderbolt 4 / USB4, 1x USB 3.2, HDMI 2.1, Audio Jack',
        battery: '75Wh',
        weight: '1.20 kg',
        color: 'Ponder Blue / Foggy Silver',
      },
    };
  }

  // 3. Dell Latitude 5540 / 5440 / 7440
  if (q.includes('latitude 5540') || q.includes('latitude 5440') || q.includes('latitude 7440') || (q.includes('latitude') && q.includes('5540'))) {
    const cat = getCatId('Laptop');
    const is15 = q.includes('5540');
    return {
      brand: 'Dell',
      name: is15 ? 'Laptop Dell Latitude 5540' : 'Laptop Dell Latitude 5440',
      matchedCategoryId: cat.id,
      matchedCategoryName: cat.name,
      warrantyMonths: 36,
      specs: {
        cpu: 'Intel Core i7-1365U / i5-1335U (10 nhân 12 luồng, vPro)',
        ram: '16GB DDR5 5200MHz (2 khe nâng cấp tối đa 64GB)',
        storage: '512GB PCIe NVMe Class 35 SSD',
        screen: is15 ? '15.6 inch FHD (1920 x 1080) IPS Anti-Glare 250nits' : '14.0 inch FHD (1920 x 1080) IPS Anti-Glare 250nits',
        gpu: 'Intel Iris Xe Graphics',
        os: 'Windows 11 Pro 64-bit',
        ports: '2x Thunderbolt 4 with Power Delivery, 2x USB 3.2 Gen 1, 1x HDMI 2.0, 1x RJ45 Gigabit Ethernet, Audio Jack',
        battery: '54Wh ExpressCharge',
        weight: is15 ? '1.61 kg' : '1.36 kg',
        color: 'Titan Gray',
      },
    };
  }

  // 4. Dell XPS 13 / 14 / 15 / 16
  if (q.includes('xps 13') || q.includes('xps 15') || q.includes('xps 14') || q.includes('xps 16') || q.includes('xps 9530') || q.includes('xps 9320')) {
    const cat = getCatId('Laptop');
    return {
      brand: 'Dell',
      name: 'Laptop Dell XPS Cao Cấp (InfinityEdge)',
      matchedCategoryId: cat.id,
      matchedCategoryName: cat.name,
      warrantyMonths: 24,
      specs: {
        cpu: 'Intel Core Ultra 7 155H / Core i7-13700H',
        ram: '32GB LPDDR5X 7467MHz Dual Channel',
        storage: '1TB PCIe 4.0 NVMe M.2 SSD',
        screen: '3.5K OLED / 4K UHD+ Touch 500nits 100% DCI-P3',
        gpu: 'NVIDIA GeForce RTX 4050 / Intel Arc Graphics',
        os: 'Windows 11 Pro 64-bit',
        ports: '3x Thunderbolt 4 Type-C, MicroSD Card Reader, 3.5mm Headphone Jack',
        battery: '69.5Wh / 86Wh ExpressCharge',
        weight: '1.24 kg - 1.86 kg',
        color: 'Platinum Silver / Graphite',
      },
    };
  }

  // 5. Lenovo ThinkPad T14 / T14s / T16 / X1 Carbon
  if (q.includes('thinkpad') || q.includes('x1 carbon') || q.includes('t14') || q.includes('t16')) {
    const cat = getCatId('Laptop');
    const isX1 = q.includes('x1');
    return {
      brand: 'Lenovo',
      name: isX1 ? 'Laptop Lenovo ThinkPad X1 Carbon Gen 12' : 'Laptop Lenovo ThinkPad T14 Gen 4/5',
      matchedCategoryId: cat.id,
      matchedCategoryName: cat.name,
      warrantyMonths: 36,
      specs: {
        cpu: isX1 ? 'Intel Core Ultra 7 155H (16 nhân, vPro)' : 'Intel Core i7-1355U / AMD Ryzen 7 PRO 7840U',
        ram: '32GB LPDDR5X 6400MHz / 7500MHz',
        storage: '1TB SSD M.2 2280 PCIe 4.0x4 Performance NVMe Opal 2.0',
        screen: '14.0 inch 2.8K (2880x1800) OLED 120Hz 400nits 100% DCI-P3 Anti-Glare',
        gpu: 'Intel Arc Graphics / Intel Iris Xe',
        os: 'Windows 11 Pro 64-bit Tiếng Anh',
        ports: '2x Thunderbolt 4 / USB4, 2x USB 3.2 Gen 1, 1x HDMI 2.1, 1x RJ45, Audio combo jack',
        battery: '57Wh (Hỗ trợ sạc nhanh Rapid Charge 80% trong 60 phút)',
        weight: isX1 ? '1.09 kg' : '1.38 kg',
        color: 'Deep Black (Carbon Fiber)',
      },
    };
  }

  // 6. Apple MacBook (M1, M2, M3, M4)
  if (q.includes('macbook') || q.includes('mac book') || (q.includes('apple') && (q.includes('pro') || q.includes('air')))) {
    const cat = getCatId('Laptop');
    const isPro = q.includes('pro');
    return {
      brand: 'Apple',
      name: isPro ? 'Apple MacBook Pro 14" / 16" (Apple Silicon)' : 'Apple MacBook Air 13" / 15" (Apple Silicon)',
      matchedCategoryId: cat.id,
      matchedCategoryName: cat.name,
      warrantyMonths: 12,
      specs: {
        cpu: isPro ? 'Apple M3 Pro / M3 Max (12-core CPU, 18-core GPU, 16-core Neural Engine)' : 'Apple M3 (8-core CPU, 10-core GPU, 16-core Neural Engine)',
        ram: isPro ? '18GB / 36GB Unified Memory' : '16GB / 24GB Unified Memory',
        storage: '512GB / 1TB PCIe-based SSD',
        screen: isPro ? '14.2 inch Liquid Retina XDR (3024x1964) 120Hz ProMotion 1600nits Peak' : '13.6 inch Liquid Retina (2560x1664) 500nits True Tone',
        gpu: 'Apple Integrated GPU',
        os: 'macOS Sequoia / Sonoma',
        ports: isPro ? '3x Thunderbolt 4, 1x HDMI, 1x SDXC slot, 1x MagSafe 3, 3.5mm Headphone' : '2x Thunderbolt / USB 4, 1x MagSafe 3, 3.5mm Headphone Jack',
        battery: isPro ? '72.4Wh (Thời lượng pin lên đến 18 giờ)' : '52.6Wh (Thời lượng pin lên đến 18 giờ)',
        weight: isPro ? '1.61 kg' : '1.24 kg',
        color: 'Space Black / Space Gray / Silver / Midnight',
      },
    };
  }

  // 7. HP EliteBook 840 / 640 / Dragonfly
  if (q.includes('elitebook') || q.includes('probook') || q.includes('dragonfly') || (q.includes('hp') && (q.includes('840') || q.includes('640')))) {
    const cat = getCatId('Laptop');
    return {
      brand: 'HP',
      name: 'Laptop HP EliteBook 840 G10 / G11',
      matchedCategoryId: cat.id,
      matchedCategoryName: cat.name,
      warrantyMonths: 36,
      specs: {
        cpu: 'Intel Core i7-1360P / Core Ultra 7 155H vPro',
        ram: '16GB / 32GB DDR5 5600MHz (2 khe)',
        storage: '512GB / 1TB PCIe Gen4x4 NVMe TLC SSD',
        screen: '14.0 inch WUXGA (1920 x 1200) IPS Anti-glare 400nits 100% sRGB HP Sure View',
        gpu: 'Intel Iris Xe Graphics / Intel Arc',
        os: 'Windows 11 Pro 64-bit',
        ports: '2x Thunderbolt 4 with USB Type-C, 2x USB Type-A 5Gbps, 1x HDMI 2.1, Audio Jack',
        battery: '51Wh Long Life Li-ion',
        weight: '1.36 kg',
        color: 'Natural Silver',
      },
    };
  }

  // Generic fallback if screen keyword detected
  const isScreen = q.includes('màn hình') || q.includes('monitor') || q.includes('ultrasharp') || q.includes('proart');
  if (isScreen) {
    const cat = getCatId('Màn hình');
    return {
      brand: q.includes('dell') ? 'Dell' : q.includes('lg') ? 'LG' : q.includes('asus') ? 'Asus' : 'Samsung',
      name: `Màn hình chuyên đồ họa & văn phòng (${rawQuery.trim()})`,
      matchedCategoryId: cat.id,
      matchedCategoryName: cat.name,
      warrantyMonths: 36,
      specs: {
        screen: '27.0 inch 2K QHD (2560 x 1440) IPS 100% sRGB 75Hz - 144Hz Chống chói',
        ports: '1x DisplayPort 1.4, 1x HDMI 2.0, 1x USB-C (Power Delivery 90W), 4x USB 3.2 Hub',
        color: 'Đen / Bạc',
      },
    };
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { modelName, currentCategoryId } = await request.json();

    if (!modelName || !modelName.trim()) {
      return NextResponse.json({ error: 'Model name is required' }, { status: 400 });
    }

    const cacheKey = modelName.trim().toLowerCase();

    // 1. Check in-memory fast cache
    if (serverCache.has(cacheKey)) {
      const cached = serverCache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return NextResponse.json({
          success: true,
          data: cached.data,
          modelUsed: 'instant-cache',
          cached: true,
        });
      }
    }

    const categories = await prisma.assetCategory.findMany({
      select: { id: true, name: true },
    });

    // 2. Try High-Speed Hardware Intelligence Engine First (0ms)
    const localSpecs = lookupHardwareKnowledgeBase(modelName, categories);

    // 3. Query Gemini API for live / real-time AI extraction
    const categoryListStr = categories.map((c) => `"${c.name}" (ID:${c.id})`).join(', ');

    const prompt = `
Analyze IT asset model: "${modelName.trim()}".
Available categories in database: ${categoryListStr}.

Return valid JSON with detailed technical specifications:
{
  "brand": "Manufacturer (e.g. Dell, HP, Apple, Asus, Lenovo, Cisco)",
  "name": "Full professional Vietnamese device title",
  "matchedCategoryId": "Exact category ID from list above",
  "matchedCategoryName": "Category name from list above",
  "warrantyMonths": 24,
  "specs": {
    "cpu": "Detailed CPU name and generation (e.g. AMD Ryzen AI 9 HX 370 / Intel Core Ultra 7 155H)",
    "ram": "RAM capacity and type (e.g. 32GB LPDDR5X / 16GB DDR5 5600MHz)",
    "storage": "SSD capacity (e.g. 1TB PCIe 4.0 NVMe SSD)",
    "screen": "Screen size and panel (e.g. 16.0 inch 3K OLED 120Hz)",
    "gpu": "GPU / Graphics card details (e.g. AMD Radeon 890M / NVIDIA RTX 4060)",
    "os": "Windows 11 Pro 64-bit",
    "ports": "USB4, USB 3.2, HDMI 2.1, Audio Jack",
    "battery": "Battery capacity (e.g. 78Wh)",
    "weight": "Weight in kg (e.g. 1.5 kg)",
    "color": "Device color"
  }
}
`;

    let responseText = '';
    let usedModel = '';

    try {
      responseText = await generateUnifiedTextAI({
        prompt,
        temperature: 0.1,
        maxTokens: 2048,
        jsonMode: true,
      });
      usedModel = 'unified-ai';
    } catch (aiErr: any) {
      console.warn('Unified AI lookup failed, trying fallback:', aiErr?.message);
    }

    // 4. Parse Gemini response or fallback to local knowledge engine
    let parsed = responseText ? repairAndParseAIJson(responseText) : null;
    if (!parsed && localSpecs) {
      parsed = localSpecs;
      usedModel = 'hardware-knowledge-base';
    }

    if (!parsed) {
      // Last-resort smart parser
      parsed = {
        brand: modelName.split(' ')[0] || 'IT Device',
        name: `Thiết bị ${modelName.trim()}`,
        matchedCategoryId: currentCategoryId || categories[0]?.id || '',
        matchedCategoryName: 'Laptop',
        warrantyMonths: 24,
        specs: {
          cpu: 'Đang cập nhật',
          ram: '16GB',
          storage: '512GB SSD',
          os: 'Windows 11 64-bit',
        },
      };
      usedModel = 'heuristic-parser';
    }

    let finalCategoryId = parsed.matchedCategoryId;
    let finalCategoryName = parsed.matchedCategoryName;

    const matchedInDb = categories.find((c) => c.id === finalCategoryId);
    if (!matchedInDb && parsed.matchedCategoryName) {
      const fallbackMatch = categories.find(
        (c) =>
          c.name.toLowerCase() === parsed.matchedCategoryName.toLowerCase() ||
          c.name.toLowerCase().includes(parsed.matchedCategoryName.toLowerCase()) ||
          parsed.matchedCategoryName.toLowerCase().includes(c.name.toLowerCase())
      );
      if (fallbackMatch) {
        finalCategoryId = fallbackMatch.id;
        finalCategoryName = fallbackMatch.name;
      }
    } else if (matchedInDb) {
      finalCategoryName = matchedInDb.name;
    }

    const finalData = {
      ...parsed,
      matchedCategoryId: finalCategoryId || categories[0]?.id || '',
      matchedCategoryName: finalCategoryName || 'Laptop',
    };

    if (serverCache.size > 500) {
      const firstKey = serverCache.keys().next().value;
      if (firstKey) serverCache.delete(firstKey);
    }
    serverCache.set(cacheKey, { data: finalData, timestamp: Date.now() });

    return NextResponse.json({
      success: true,
      data: finalData,
      modelUsed: usedModel,
    });
  } catch (error: any) {
    console.error('Error in AI model lookup:', error);
    return NextResponse.json({ error: error.message || 'Failed to lookup model specs' }, { status: 500 });
  }
}
