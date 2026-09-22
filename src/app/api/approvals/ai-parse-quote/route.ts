import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { generateUnifiedVisionAI } from '@/lib/ai-config';
import path from 'path';
import fs from 'fs';

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { fileUrl, text } = body;

    if (!fileUrl && !text) {
      return NextResponse.json({ error: 'Cần cung cấp hình ảnh/tài liệu báo giá hoặc văn bản' }, { status: 400 });
    }

    let fileBuffer: Buffer | undefined = undefined;
    let fileMimeType: string | undefined = undefined;

    if (fileUrl) {
      try {
        let cleanPath = fileUrl.split('?')[0];
        if (cleanPath.startsWith('/')) {
          cleanPath = cleanPath.slice(1);
        }
        const fullPath = path.join(process.cwd(), 'public', cleanPath);
        if (fs.existsSync(fullPath)) {
          fileBuffer = await fs.promises.readFile(fullPath);
          const ext = path.extname(fullPath).toLowerCase();
          if (ext === '.png') fileMimeType = 'image/png';
          else if (ext === '.jpg' || ext === '.jpeg') fileMimeType = 'image/jpeg';
          else if (ext === '.webp') fileMimeType = 'image/webp';
          else if (ext === '.pdf') fileMimeType = 'application/pdf';
        }
      } catch (err) {
        console.warn('Error reading local quote file:', err);
      }
    }

    const prompt = `
Bạn là chuyên gia phân tích báo giá thiết bị CNTT và bản quyền phần mềm doanh nghiệp.
Hãy đọc thông tin từ hình ảnh hoặc tài liệu đính kèm sau đây (kèm ghi chú: "${text || ''}") và trích xuất thông tin cần thiết:

1. "title": Tên sản phẩm / thiết bị / bản quyền ngắn gọn, chuyên nghiệp (VD: "Laptop Dell Latitude 5540 i7/16GB/512GB", "Màn hình Dell UltraSharp 27 inch", "Phần mềm Autodesk AutoCAD 2026").
2. "estimatedCost": Tổng số tiền dự toán chi phí (chỉ lấy số nguyên VND, nếu giá ngoại tệ USD hãy quy đổi x 25.400 VND/USD; loại bỏ dấu chấm/phẩy/chữ đ).
3. "quantity": Số lượng thiết bị (số nguyên, mặc định 1 nếu không nói rõ).
4. "justification": Tóm tắt thông số kỹ thuật cốt lõi (CPU, RAM, SSD, độ phân giải...) và mục đích sử dụng (tối đa 2 câu).
5. "type": Chọn 1 trong các loại: "NEW_DEVICE", "SOFTWARE_LICENSE", "DEVICE_REPLACEMENT", "ACCESS_REQUEST", "OTHER".

Trả về ĐÚNG định dạng JSON sau, không bọc markdown hay thêm bất kỳ chữ nào khác:
{"title": "...", "estimatedCost": 25000000, "quantity": 1, "justification": "...", "type": "NEW_DEVICE"}
`;

    const rawResponse = await generateUnifiedVisionAI({
      prompt,
      systemPrompt: 'Bạn là chuyên gia ITAM trích xuất báo giá thiết bị và phần mềm. Chỉ trả về duy nhất chuỗi JSON hợp lệ.',
      fileBuffer,
      fileMimeType,
      jsonMode: true,
      temperature: 0.1,
    });

    let parsedData: any = {};
    try {
      const cleaned = rawResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
      parsedData = JSON.parse(cleaned);
    } catch {
      const match = rawResponse.match(/\{[\s\S]*\}/);
      if (match) {
        parsedData = JSON.parse(match[0]);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        title: parsedData.title || '',
        estimatedCost: parsedData.estimatedCost ? Number(parsedData.estimatedCost) : null,
        quantity: parsedData.quantity ? Number(parsedData.quantity) : 1,
        justification: parsedData.justification || '',
        type: parsedData.type || 'NEW_DEVICE',
      },
    });
  } catch (error: any) {
    console.error('AI parse quote error:', error);
    return NextResponse.json({
      error: error.message || 'Không thể trích xuất thông tin từ tài liệu/ảnh',
    }, { status: 500 });
  }
}
