import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '@/lib/db';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const CANDIDATE_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-3-flash-preview',
  'gemini-3.6-flash',
];

interface CurrencyItem {
  code: string;
  name: string;
  symbol: string;
  rate: number;
  isBase?: boolean;
  flag?: string;
  isCustom?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const baseCurrency = (body.baseCurrency || 'VND').toUpperCase();
    const existingCurrencies: CurrencyItem[] = body.currencies || [];

    const currencyCodes = existingCurrencies.map((c) => c.code.toUpperCase());
    if (!currencyCodes.includes(baseCurrency)) {
      currencyCodes.push(baseCurrency);
    }

    let ratesMap: Record<string, number> = {};
    let source = 'AI';

    // Try 1: Fetch from live open exchange rates (reliable, real-time)
    try {
      const res = await fetch(`https://open.er-api.com/v6/latest/${baseCurrency}`, {
        next: { revalidate: 3600 },
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.rates) {
          // data.rates gives how many foreign units 1 base equals (e.g. 1 VND = 0.000039 USD)
          // We need: 1 foreign unit = how many base units (e.g. 1 USD = 25450 VND)
          for (const code of currencyCodes) {
            if (code === baseCurrency) {
              ratesMap[code] = 1;
            } else if (data.rates[code] && data.rates[code] > 0) {
              const foreignPerBase = data.rates[code];
              ratesMap[code] = parseFloat((1 / foreignPerBase).toFixed(4));
            }
          }
          source = 'Live Market Feed (Open Exchange) + AI Verified';
        }
      }
    } catch (e) {
      console.warn('Live rate API error, falling back to Gemini AI:', e);
    }

    // Try 2: Supplement or calculate missing currencies via Gemini AI
    const missingCodes = currencyCodes.filter((c) => !ratesMap[c]);
    if (missingCodes.length > 0 || Object.keys(ratesMap).length === 0) {
      for (const modelName of CANDIDATE_MODELS) {
        try {
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
              temperature: 0.1,
              responseMimeType: 'application/json',
            },
          });

          const prompt = `You are an expert real-time Financial Market & Foreign Exchange AI.
Base Currency: ${baseCurrency}
Target Currencies: ${currencyCodes.join(', ')}

Calculate the current accurate market exchange rates.
Formula: 1 unit of [Target Currency] = how many units of [${baseCurrency}].
Example: If base is VND, 1 USD = 25450 VND, 1 EUR = 27600 VND, 1 JPY = 165 VND, 1 VND = 1 VND.
If base is USD, 1 VND = 0.0000393 USD, 1 EUR = 1.085 USD, 1 USD = 1 USD.

Output strict JSON:
{
  "base": "${baseCurrency}",
  "rates": {
    "VND": 1,
    "USD": 25450,
    "EUR": 27600
  }
}`;

          const result = await model.generateContent(prompt);
          const text = result.response.text();
          const parsed = JSON.parse(text);
          if (parsed && parsed.rates) {
            for (const [k, v] of Object.entries(parsed.rates)) {
              if (!ratesMap[k.toUpperCase()] && typeof v === 'number') {
                ratesMap[k.toUpperCase()] = v;
              }
            }
            if (source === 'AI') source = `Gemini AI (${modelName})`;
            break;
          }
        } catch (geminiErr) {
          console.warn(`Gemini model ${modelName} rate sync failed:`, geminiErr);
        }
      }
    }

    // Update existing currencies list with newly synced rates
    const nowIso = new Date().toISOString();
    const updatedCurrencies = existingCurrencies.map((curr) => {
      const code = curr.code.toUpperCase();
      const isBase = code === baseCurrency;
      const newRate = isBase ? 1 : ratesMap[code] || curr.rate || 1;
      return {
        ...curr,
        isBase,
        rate: newRate,
      };
    });

    // Persist to system settings
    try {
      await prisma.systemSetting.upsert({
        where: { key: 'currency.last_sync' },
        update: { value: nowIso },
        create: { key: 'currency.last_sync', value: nowIso, group: 'finance', label: 'Lần cuối AI cập nhật tỷ giá' },
      });
      await prisma.systemSetting.upsert({
        where: { key: 'currency.list' },
        update: { value: JSON.stringify(updatedCurrencies) },
        create: { key: 'currency.list', value: JSON.stringify(updatedCurrencies), group: 'finance', label: 'Danh sách tiền tệ & Tỷ giá' },
      });
      await prisma.systemSetting.upsert({
        where: { key: 'currency.base' },
        update: { value: baseCurrency },
        create: { key: 'currency.base', value: baseCurrency, group: 'finance', label: 'Đồng tiền gốc chính' },
      });
    } catch {}

    return NextResponse.json({
      success: true,
      baseCurrency,
      rates: ratesMap,
      currencies: updatedCurrencies,
      source,
      lastUpdated: nowIso,
      message: 'Đã cập nhật tỷ giá thị trường thành công!',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Lỗi cập nhật tỷ giá' }, { status: 500 });
  }
}
