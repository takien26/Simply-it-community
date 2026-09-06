import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xls': 'application/vnd.ms-excel',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.doc': 'application/msword',
  '.txt': 'text/plain',
  '.json': 'application/json',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filePath: string[] }> }
) {
  try {
    const { filePath } = await params;
    if (!filePath || filePath.length === 0) {
      return new NextResponse('File not found', { status: 404 });
    }

    const safeRelativePath = path.join(...filePath).replace(/\.\./g, '');
    const fullPath = path.join(process.cwd(), 'public', 'uploads', safeRelativePath);

    if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
      return new NextResponse('File not found', { status: 404 });
    }

    const fileBuffer = fs.readFileSync(fullPath);
    const ext = path.extname(fullPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Serve upload file error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
