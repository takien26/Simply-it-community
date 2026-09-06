import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import mammoth from 'mammoth';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Vui lòng chọn file Word (.docx)' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Convert docx buffer to HTML using mammoth
    const { value: rawHtml, messages } = await mammoth.convertToHtml({ buffer });

    // Clean and polish HTML for email template usage
    let cleanedHtml = rawHtml;

    // Detect subject if specified in Word
    let detectedSubject = '';
    const subjectMatch = cleanedHtml.match(/(?:Tiêu đề|Subject)\s*[:：]\s*(?:<strong>)?([^<]+)(?:<\/strong>)?/i);
    if (subjectMatch) {
      detectedSubject = subjectMatch[1].trim();
    }

    // Isolate sample content if demarcated by --- BẮT ĐẦU NỘI DUNG MẪU --- and --- KẾT THÚC NỘI DUNG MẪU ---
    const startDelimiter = 'BẮT ĐẦU NỘI DUNG MẪU';
    const endDelimiter = 'KẾT THÚC NỘI DUNG MẪU';

    if (cleanedHtml.includes(startDelimiter) && cleanedHtml.includes(endDelimiter)) {
      const startIndex = cleanedHtml.indexOf(startDelimiter);
      const endIndex = cleanedHtml.indexOf(endDelimiter);
      cleanedHtml = cleanedHtml.substring(startIndex + startDelimiter.length, endIndex);
      // Clean leading and trailing tag fragments
      cleanedHtml = cleanedHtml.replace(/^[^-]*---/, '').replace(/---.*$/, '');
    }

    // Enhance tables with email friendly inline styling
    cleanedHtml = cleanedHtml
      .replace(/<table>/g, '<table class="email-table" style="width: 100%; border-collapse: collapse; margin: 15px 0;">')
      .replace(/<td>/g, '<td style="padding: 10px 12px; border: 1px solid #E2E8F0; vertical-align: top;">')
      .replace(/<th>/g, '<th style="padding: 10px 12px; background-color: #F8FAFC; border: 1px solid #E2E8F0; text-align: left; font-weight: bold;">')
      .trim();

    return NextResponse.json({
      success: true,
      subject: detectedSubject || undefined,
      html: cleanedHtml,
      messages: messages.map((m) => m.message),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi khi phân tích file Word' }, { status: 500 });
  }
}
