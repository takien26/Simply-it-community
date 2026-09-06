import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { extractWithAI } from '@/lib/services/ai-extraction';
import { AIInputType, AITargetEntity } from '@prisma/client';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import path from 'path';
import fs from 'fs';

function sanitizeUtf8Text(str: string): string {
  if (!str) return '';
  return str.replace(/\0/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ').trim();
}

async function extractDocxTablesAndText(buffer: Buffer): Promise<string> {
  try {
    const JSZipConstructor: any = (JSZip as any).default || JSZip;
    const zip = new JSZipConstructor();
    const loadedZip = await zip.loadAsync(buffer);
    const docFile = loadedZip.file('word/document.xml');
    
    let xmlStr = '';
    if (docFile) {
      xmlStr = await docFile.async('string');
    } else {
      xmlStr = buffer.toString('utf8');
    }

    let tablesText = '';
    const tableMatches = xmlStr.match(/<w:tbl[\s\S]*?<\/w:tbl>/g);
    if (tableMatches) {
      tableMatches.forEach((tblXml: string, tIdx: number) => {
        tablesText += `\n=== BẢNG PHỤ LỤC HÀNG HÓA / THIẾT BỊ #${tIdx + 1} ===\n`;
        const rowMatches = tblXml.match(/<w:tr[\s\S]*?<\/w:tr>/g);
        if (rowMatches) {
          rowMatches.forEach((trXml: string) => {
            const cellMatches = trXml.match(/<w:tc[\s\S]*?<\/w:tc>/g);
            if (cellMatches) {
              const cells = cellMatches.map((tc: string) => {
                const tMatches = tc.match(/<w:t[^>]*>([^<]+)<\/w:t>/g);
                return tMatches ? tMatches.map((t) => t.replace(/<[^>]+>/g, '')).join(' ').trim() : '';
              });
              tablesText += `| ${cells.join(' | ')} |\n`;
            }
          });
        }
      });
    }

    const textMatches = xmlStr.match(/<w:t[^>]*>([^<]+)<\/w:t>/g);
    const bodyText = textMatches ? textMatches.map((m: string) => m.replace(/<[^>]+>/g, '')).join(' ') : '';

    const combined = `${tablesText}\n\n=== NỘI DUNG VĂN BẢN HỢP ĐỒNG ===\n${bodyText}`;
    return sanitizeUtf8Text(combined);
  } catch (e) {
    console.error('JSZip docx extraction error:', e);
    // Fallback: extract string matches directly from buffer
    const rawStr = buffer.toString('utf8');
    const textMatches = rawStr.match(/<w:t[^>]*>([^<]+)<\/w:t>/g);
    if (textMatches) {
      return sanitizeUtf8Text(textMatches.map((m: string) => m.replace(/<[^>]+>/g, '')).join(' '));
    }
    return '';
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canExtract = await hasPermission(currentUser.userId, 'ai.extract');
    if (!canExtract) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    let inputType = formData.get('inputType') as AIInputType;
    const targetEntity = formData.get('targetEntity') as AITargetEntity;
    let inputText = formData.get('inputText') as string | null;
    const templateId = formData.get('templateId') as string | null;
    const file = formData.get('file') as File | null;

    if (!inputType || !targetEntity) {
      return NextResponse.json(
        { error: 'inputType and targetEntity are required' },
        { status: 400 }
      );
    }

    let fileBuffer: Buffer | undefined;
    let fileMimeType: string | undefined;
    let savedFileUrl: string | undefined;
    let savedFileName: string | undefined;
    let savedFileSize: number | undefined;

    if (file) {
      const fileName = file.name.toLowerCase();
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Save file to disk
      try {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const uniqueFileName = `${Date.now()}_${safeName}`;
        const uploadDirPath = path.join(process.cwd(), 'public', 'uploads', 'documents');
        if (!fs.existsSync(uploadDirPath)) {
          fs.mkdirSync(uploadDirPath, { recursive: true });
        }
        const fullFilePath = path.join(uploadDirPath, uniqueFileName);
        fs.writeFileSync(fullFilePath, buffer);
        savedFileUrl = `/uploads/documents/${uniqueFileName}`;
        savedFileName = file.name;
        savedFileSize = file.size;
      } catch (fileSaveErr) {
        console.warn('Failed to save persistent file to disk:', fileSaveErr);
      }

      if (
        fileName.endsWith('.xlsx') ||
        fileName.endsWith('.xls') ||
        fileName.endsWith('.csv') ||
        file.type.includes('spreadsheet') ||
        file.type.includes('excel') ||
        file.type.includes('csv')
      ) {
        try {
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(buffer as any);
          let sheetData = `Tệp Excel: "${file.name}"\n`;
          workbook.eachSheet((sheet) => {
            sheetData += `\n=== BẢNG TÍNH (SHEET): ${sheet.name} ===\n`;
            sheet.eachRow((row, rowNumber) => {
              const rowVals = Array.isArray(row.values)
                ? row.values
                    .slice(1)
                    .map((v) =>
                      typeof v === 'object' && v !== null && 'result' in v
                        ? (v as any).result
                        : v
                    )
                : [];
              sheetData += `Dòng ${rowNumber}: ${rowVals.join(' | ')}\n`;
            });
          });
          inputText = sanitizeUtf8Text(sheetData);
          inputType = 'TEXT';
        } catch (excelErr) {
          console.warn('Excel parse fallback:', excelErr);
          inputText = sanitizeUtf8Text(buffer.toString('utf8'));
          inputType = 'TEXT';
        }
      } else if (
        fileName.endsWith('.docx') ||
        fileName.endsWith('.doc') ||
        file.type.includes('word') ||
        file.type.includes('document')
      ) {
        const docxText = await extractDocxTablesAndText(buffer);
        inputText = `Tệp Hợp đồng/Báo giá Word: "${file.name}"\n${docxText}`;
        inputType = 'TEXT';
      } else {
        fileBuffer = buffer;
        if (fileName.endsWith('.pdf')) {
          fileMimeType = 'application/pdf';
          inputType = 'PDF';
        } else if (fileName.endsWith('.png')) {
          fileMimeType = 'image/png';
          inputType = 'IMAGE';
        } else if (fileName.endsWith('.webp')) {
          fileMimeType = 'image/webp';
          inputType = 'IMAGE';
        } else {
          fileMimeType = file.type || 'image/jpeg';
          inputType = 'IMAGE';
        }
      }
    }

    const result = await extractWithAI({
      inputType,
      targetEntity,
      inputText: inputText || undefined,
      inputFileUrl: savedFileUrl,
      fileBuffer,
      fileMimeType,
      templateId: templateId || undefined,
      userId: currentUser.userId,
      autoSaveEnabled: false,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        fileInfo: {
          fileUrl: savedFileUrl || null,
          fileName: savedFileName || null,
          fileSize: savedFileSize || null,
        }
      },
    });
  } catch (error) {
    console.error('Extraction error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Extraction failed' },
      { status: 500 }
    );
  }
}
