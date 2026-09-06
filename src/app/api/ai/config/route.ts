import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getGeminiApiKey, getOpenAIApiKey, getAIProvider } from '@/lib/ai-config';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [geminiKey, openaiKey, providerSetting, modelSetting] = await Promise.all([
      getGeminiApiKey(),
      getOpenAIApiKey(),
      prisma.systemSetting.findUnique({ where: { key: 'ai.provider' } }),
      prisma.systemSetting.findUnique({ where: { key: 'ai.model' } }),
    ]);

    const hasGeminiKey = Boolean(geminiKey && geminiKey.trim().length > 0);
    const hasOpenAIKey = Boolean(openaiKey && openaiKey.trim().length > 0);

    const maskKey = (k: string) => {
      if (!k || k.trim().length === 0) return '';
      return k.length <= 8 ? '••••••••' : k.slice(0, 4) + '••••••••' + k.slice(-4);
    };

    return NextResponse.json({
      success: true,
      provider: providerSetting?.value || 'gemini',
      model: modelSetting?.value || 'gemini-1.5-flash',
      hasGeminiKey,
      maskedGeminiKey: maskKey(geminiKey),
      hasOpenAIKey,
      maskedOpenAIKey: maskKey(openaiKey),
      // Legacy compatibility fields
      hasKey: hasGeminiKey || hasOpenAIKey,
      maskedKey: hasGeminiKey ? maskKey(geminiKey) : maskKey(openaiKey),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Lỗi khi tải cấu hình AI' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { apiKey, geminiApiKey, openaiApiKey, provider, model } = body;

    // Gemini API Key
    const gKey = geminiApiKey || (provider === 'gemini' && apiKey ? apiKey : null);
    if (typeof gKey === 'string' && gKey.trim()) {
      await prisma.systemSetting.upsert({
        where: { key: 'ai.gemini_api_key' },
        update: { value: gKey.trim(), group: 'ai', label: 'Google Gemini API Key' },
        create: { key: 'ai.gemini_api_key', value: gKey.trim(), group: 'ai', label: 'Google Gemini API Key', type: 'STRING' },
      });
    }

    // OpenAI API Key
    const oKey = openaiApiKey || (provider === 'openai' && apiKey ? apiKey : null);
    if (typeof oKey === 'string' && oKey.trim()) {
      await prisma.systemSetting.upsert({
        where: { key: 'ai.openai_api_key' },
        update: { value: oKey.trim(), group: 'ai', label: 'OpenAI ChatGPT API Key' },
        create: { key: 'ai.openai_api_key', value: oKey.trim(), group: 'ai', label: 'OpenAI ChatGPT API Key', type: 'STRING' },
      });
    }

    // Provider
    if (provider) {
      await prisma.systemSetting.upsert({
        where: { key: 'ai.provider' },
        update: { value: provider },
        create: { key: 'ai.provider', value: provider, group: 'ai', label: 'AI Provider', type: 'STRING' },
      });
    }

    // Model
    if (model) {
      await prisma.systemSetting.upsert({
        where: { key: 'ai.model' },
        update: { value: model },
        create: { key: 'ai.model', value: model, group: 'ai', label: 'AI Model', type: 'STRING' },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Cập nhật cấu hình AI thành công!',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Lỗi khi lưu cấu hình AI' },
      { status: 500 }
    );
  }
}
