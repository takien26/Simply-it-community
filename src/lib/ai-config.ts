import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '@/lib/db';

export type AIProvider = 'gemini' | 'openai';

/**
 * Retrieves the active AI provider (default: 'gemini')
 */
export async function getAIProvider(): Promise<AIProvider> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'ai.provider' },
    });
    if (setting?.value && setting.value.trim().toLowerCase() === 'openai') {
      return 'openai';
    }
  } catch (err) {
    console.error('Error fetching ai.provider:', err);
  }
  return (process.env.AI_PROVIDER?.toLowerCase() === 'openai' ? 'openai' : 'gemini');
}

/**
 * Retrieves the Gemini API Key
 */
export async function getGeminiApiKey(): Promise<string> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'ai.gemini_api_key' },
    });
    if (setting?.value && setting.value.trim().length > 0) {
      return setting.value.trim();
    }
  } catch (err) {
    console.error('Error fetching ai.gemini_api_key from DB:', err);
  }
  return process.env.GEMINI_API_KEY || '';
}

/**
 * Retrieves the OpenAI API Key
 */
export async function getOpenAIApiKey(): Promise<string> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'ai.openai_api_key' },
    });
    if (setting?.value && setting.value.trim().length > 0) {
      return setting.value.trim();
    }
  } catch (err) {
    console.error('Error fetching ai.openai_api_key from DB:', err);
  }
  return process.env.OPENAI_API_KEY || '';
}

/**
 * Returns an initialized GoogleGenerativeAI instance or null if no key is configured.
 */
export async function getGenAIClient(explicitKey?: string): Promise<{ client: GoogleGenerativeAI; apiKey: string } | null> {
  const apiKey = explicitKey || (await getGeminiApiKey());
  if (!apiKey || apiKey.trim().length === 0) {
    return null;
  }
  return {
    client: new GoogleGenerativeAI(apiKey.trim()),
    apiKey: apiKey.trim(),
  };
}

/**
 * Tests Gemini API key
 */
export async function testGeminiApiKey(apiKeyToTest?: string): Promise<{ success: boolean; model?: string; message: string; error?: string }> {
  try {
    const key = apiKeyToTest || (await getGeminiApiKey());
    if (!key || key.trim().length === 0) {
      return {
        success: false,
        message: 'Chưa có Gemini API Key nào được cấu hình',
        error: 'API Key trống',
      };
    }

    const genAI = new GoogleGenerativeAI(key.trim());
    const candidateModels = [
      'gemini-3.6-flash',
      'gemini-3.5-flash',
      'gemini-3.1-flash-lite',
      'gemini-3-flash-preview',
    ];

    let lastError = '';
    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent('Respond with only the word OK');
        const text = result.response.text();
        if (text) {
          return {
            success: true,
            model: modelName,
            message: `Kết nối thành công tới Google AI Studio! (Model: ${modelName})`,
          };
        }
      } catch (err: any) {
        lastError = err?.message || String(err);
      }
    }

    return {
      success: false,
      message: 'Gemini API Key không hợp lệ hoặc đã hết hạn/hết quota.',
      error: lastError,
    };
  } catch (err: any) {
    return {
      success: false,
      message: 'Lỗi kiểm tra Gemini API Key',
      error: err?.message || String(err),
    };
  }
}

/**
 * Tests OpenAI API key
 */
export async function testOpenAIApiKey(apiKeyToTest?: string): Promise<{ success: boolean; model?: string; message: string; error?: string }> {
  try {
    const key = apiKeyToTest || (await getOpenAIApiKey());
    if (!key || key.trim().length === 0) {
      return {
        success: false,
        message: 'Chưa có OpenAI ChatGPT API Key nào được cấu hình',
        error: 'API Key trống',
      };
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key.trim()}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Respond with only the word OK' }],
        max_tokens: 5,
      }),
    });

    const data = await res.json();
    if (res.ok && data.choices?.[0]?.message?.content) {
      return {
        success: true,
        model: 'gpt-4o-mini',
        message: 'Kết nối thành công tới OpenAI API (ChatGPT)!',
      };
    }

    return {
      success: false,
      message: data.error?.message || 'OpenAI API Key không hợp lệ hoặc đã hết quota/billing.',
      error: data.error?.message || 'API Error',
    };
  } catch (err: any) {
    return {
      success: false,
      message: 'Lỗi kết nối tới OpenAI API',
      error: err?.message || String(err),
    };
  }
}

/**
 * Unified text generation supporting Gemini and OpenAI ChatGPT
 */
export async function generateUnifiedTextAI(options: {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  provider?: AIProvider;
  model?: string;
}): Promise<string> {
  const activeProvider = options.provider || (await getAIProvider());
  const temperature = options.temperature ?? 0.2;
  const maxTokens = options.maxTokens ?? 4000;

  // 1. OPENAI CHATGPT
  if (activeProvider === 'openai') {
    const openAIKey = await getOpenAIApiKey();
    if (openAIKey && openAIKey.trim().length > 0) {
      const selectedModel = options.model || 'gpt-4o-mini';
      const messages: any[] = [];
      if (options.systemPrompt) {
        messages.push({ role: 'system', content: options.systemPrompt });
      }
      messages.push({ role: 'user', content: options.prompt });

      const requestBody: any = {
        model: selectedModel,
        messages,
        temperature,
        max_tokens: maxTokens,
      };

      if (options.jsonMode) {
        requestBody.response_format = { type: 'json_object' };
      }

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openAIKey.trim()}`,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();
      if (res.ok && data.choices?.[0]?.message?.content) {
        return data.choices[0].message.content.trim();
      }
      console.warn('OpenAI error, attempting fallback to Gemini:', data.error);
    }
  }

  // 2. GOOGLE GEMINI (Default & Fallback)
  const geminiClient = await getGenAIClient();
  if (geminiClient) {
    const candidateModels = [
      options.model || 'gemini-3.6-flash',
      'gemini-3.5-flash',
      'gemini-3.1-flash-lite',
      'gemini-3-flash-preview',
    ];

    for (const modelName of candidateModels) {
      try {
        const model = geminiClient.client.getGenerativeModel({
          model: modelName,
          systemInstruction: options.systemPrompt,
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
            responseMimeType: options.jsonMode ? 'application/json' : undefined,
          },
        });

        const result = await model.generateContent(options.prompt);
        const text = result.response.text();
        if (text) return text.trim();
      } catch (err: any) {
        console.warn(`Gemini model ${modelName} failed:`, err.message);
      }
    }
  }

  throw new Error('Không thể kết nối tới AI Provider (Gemini hoặc OpenAI). Vui lòng kiểm tra API Key trong Cài Đặt.');
}

/**
 * Unified Vision/Multimodal AI extraction (Supporting Images & PDFs with Gemini & OpenAI GPT-4o)
 */
export async function generateUnifiedVisionAI(options: {
  prompt: string;
  systemPrompt?: string;
  fileBuffer?: Buffer;
  fileMimeType?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  provider?: AIProvider;
}): Promise<string> {
  const activeProvider = options.provider || (await getAIProvider());
  const temperature = options.temperature ?? 0.1;
  const maxTokens = options.maxTokens ?? 8000;

  // 1. OPENAI GPT-4o / GPT-4o-mini Vision
  if (activeProvider === 'openai' && options.fileBuffer && options.fileMimeType?.startsWith('image/')) {
    const openAIKey = await getOpenAIApiKey();
    if (openAIKey && openAIKey.trim().length > 0) {
      const base64Data = options.fileBuffer.toString('base64');
      const dataUri = `data:${options.fileMimeType};base64,${base64Data}`;

      const messages: any[] = [];
      if (options.systemPrompt) {
        messages.push({ role: 'system', content: options.systemPrompt });
      }
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: options.prompt },
          { type: 'image_url', image_url: { url: dataUri, detail: 'high' } },
        ],
      });

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openAIKey.trim()}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages,
          temperature,
          max_tokens: maxTokens,
          response_format: options.jsonMode ? { type: 'json_object' } : undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.choices?.[0]?.message?.content) {
        return data.choices[0].message.content.trim();
      }
      console.warn('OpenAI Vision failed, falling back to Gemini:', data.error);
    }
  }

  // 2. GEMINI MULTIMODAL (Images + PDFs)
  const geminiClient = await getGenAIClient();
  if (geminiClient) {
    const parts: any[] = [];
    if (options.fileBuffer && options.fileMimeType) {
      parts.push({
        inlineData: {
          data: options.fileBuffer.toString('base64'),
          mimeType: options.fileMimeType,
        },
      });
    }
    parts.push({ text: options.prompt });

    const candidateModels = [
      'gemini-3.6-flash',
      'gemini-3.5-flash',
      'gemini-3.1-flash-lite',
      'gemini-3-flash-preview',
    ];

    for (const modelName of candidateModels) {
      try {
        const model = geminiClient.client.getGenerativeModel({
          model: modelName,
          systemInstruction: options.systemPrompt,
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
            responseMimeType: options.jsonMode ? 'application/json' : undefined,
          },
        });

        const result = await model.generateContent(parts);
        const text = result.response.text();
        if (text) return text.trim();
      } catch (err: any) {
        console.warn(`Gemini model ${modelName} vision failed:`, err.message);
      }
    }
  }

  // Fallback: If no files or text prompt only
  return generateUnifiedTextAI(options);
}
