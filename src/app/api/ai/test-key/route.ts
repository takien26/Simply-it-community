import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { testGeminiApiKey, testOpenAIApiKey } from '@/lib/ai-config';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { provider = 'gemini', apiKey } = body;

    let result;
    if (provider === 'openai') {
      result = await testOpenAIApiKey(apiKey);
    } else {
      result = await testGeminiApiKey(apiKey);
    }

    return NextResponse.json(result, {
      status: result.success ? 200 : 400,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Lỗi kiểm tra kết nối API', error: error?.message || String(error) },
      { status: 500 }
    );
  }
}
