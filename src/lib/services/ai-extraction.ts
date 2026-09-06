import { Part } from '@google/generative-ai';
import { prisma } from '@/lib/db';
import { AIInputType, AITargetEntity, AIExtractionStatus } from '@prisma/client';
import { createAuditLog } from '@/lib/audit';
import path from 'path';
import { getGenAIClient, generateUnifiedVisionAI } from '@/lib/ai-config';

const CANDIDATE_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-3-flash-preview',
  'gemini-3.6-flash',
];

const extractionCache = new Map<string, { data: Record<string, unknown>; confidence: number; timestamp: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export interface ExtractionInput {
  inputType: AIInputType;
  inputFileUrl?: string;
  inputText?: string;
  fileBuffer?: Buffer;
  fileMimeType?: string;
  targetEntity: AITargetEntity;
  templateId?: string;
  userId: string;
  autoSaveEnabled?: boolean;
}

export interface ExtractionResult {
  extractionId: string;
  extractedData: Record<string, unknown>;
  confidence: number;
  status: AIExtractionStatus;
  autoCreated: boolean;
  createdEntityId?: string;
  processingTimeMs: number;
}

export function normalizePrice(val: unknown): number | null {
  if (typeof val === 'number') return isNaN(val) ? null : Math.round(val);
  if (!val) return null;
  const str = String(val).toLowerCase().trim();

  const trMatch = str.match(/([0-9]+(?:[.,][0-9]+)?)\s*(?:tr|triệu|m)/i);
  if (trMatch) {
    const num = parseFloat(trMatch[1].replace(',', '.'));
    return Math.round(num * 1000000);
  }

  const kMatch = str.match(/([0-9]+(?:[.,][0-9]+)?)\s*(?:k|nghìn|ngàn)/i);
  if (kMatch) {
    const num = parseFloat(kMatch[1].replace(',', '.'));
    return Math.round(num * 1000);
  }

  const cleaned = str.replace(/[^0-9]/g, '');
  const pureNum = parseInt(cleaned, 10);
  return isNaN(pureNum) ? null : pureNum;
}

export async function extractWithAI(
  input: ExtractionInput
): Promise<ExtractionResult> {
  const startTime = Date.now();

  const sanitizedInputText = input.inputText
    ? input.inputText.replace(/\0/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ').trim()
    : null;

  const extraction = await prisma.aIExtraction.create({
    data: {
      userId: input.userId,
      inputType: input.inputType,
      inputFileUrl: input.inputFileUrl || null,
      inputText: sanitizedInputText ? sanitizedInputText.slice(0, 50000) : null,
      targetEntity: input.targetEntity,
      templateId: input.templateId || null,
      status: 'PROCESSING',
    },
  });

  try {
    const prompt = buildExhaustiveMultiItemPrompt(input);
    const parts: Part[] = [];

    if (input.fileBuffer && input.fileMimeType) {
      parts.push({
        inlineData: {
          data: input.fileBuffer.toString('base64'),
          mimeType: input.fileMimeType,
        },
      });
    }

    parts.push({ text: prompt });

    let text = '';
    const maxTokens = input.inputType === 'TEXT' ? 2500 : 8000;

    const systemPrompt = `You are an elite Chief IT Asset, Procurement & Commercial Contract Intelligence System.
Your absolute goal is EXHAUSTIVE AND FACTUAL EXTRACTION:
1. Scan EVERY row in equipment tables and product schedules. If a contract/quote has 4 items, you MUST extract ALL 4 ITEMS into the "items" array. NEVER stop at 1 item.
2. For each item, identify brand, model, unit price, quantity, and warranty months.
3. Automatically classify targetEntity into ASSET (Hardware), LICENSE (Software/OS), or SERVICE (Internet/Cloud/SLA).
4. Populate accurate manufacturer factory hardware specs in "specs" for recognized models.`;

    try {
      text = await generateUnifiedVisionAI({
        prompt,
        systemPrompt,
        fileBuffer: input.fileBuffer,
        fileMimeType: input.fileMimeType,
        maxTokens,
        jsonMode: true,
      });
    } catch (unifiedErr: any) {
      console.warn('generateUnifiedVisionAI error, attempting direct fallback:', unifiedErr);
      throw unifiedErr;
    }

    const { data: extractedData, confidence } = parseAIResponse(text);
    const processingTimeMs = Date.now() - startTime;

    await prisma.aIExtraction.update({
      where: { id: extraction.id },
      data: {
        extractedData: extractedData as object,
        confidence,
        status: 'EXTRACTED',
        autoCreated: false,
        processingTimeMs,
      },
    });

    await createAuditLog({
      action: 'AI_EXTRACT',
      entityType: 'AIExtraction',
      entityId: extraction.id,
      userId: input.userId,
      changes: {
        inputType: input.inputType,
        targetEntity: input.targetEntity,
        confidence,
      },
    });

    return {
      extractionId: extraction.id,
      extractedData,
      confidence,
      status: 'EXTRACTED',
      autoCreated: false,
      processingTimeMs,
    };
  } catch (error) {
    const processingTimeMs = Date.now() - startTime;
    await prisma.aIExtraction.update({
      where: { id: extraction.id },
      data: {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        processingTimeMs,
      },
    });
    throw error;
  }
}

export async function confirmExtraction(
  extractionId: string,
  userId: string,
  editedData?: Record<string, unknown>
): Promise<{ entityId: string }> {
  const extraction = await prisma.aIExtraction.findUnique({
    where: { id: extractionId },
  });

  if (!extraction) throw new Error('Extraction not found');
  const dataToSave = editedData || (extraction.extractedData as Record<string, unknown>);

  const entityId = await autoCreateEntity(
    extraction.targetEntity,
    dataToSave,
    userId
  );

  await prisma.aIExtraction.update({
    where: { id: extractionId },
    data: {
      status: editedData ? 'USER_EDITED' : 'USER_CONFIRMED',
      extractedData: editedData ? (editedData as object) : undefined,
      createdEntityId: entityId,
      reviewedById: userId,
      reviewedAt: new Date(),
    },
  });

  return { entityId };
}

export async function confirmExtractionBatch(
  extractionId: string,
  userId: string,
  batchItems: Array<Record<string, unknown>>,
  commonData?: Record<string, unknown>
): Promise<{ count: number; entityIds: string[]; documentId?: string }> {
  const extraction = await prisma.aIExtraction.findUnique({
    where: { id: extractionId },
  });

  if (!extraction) throw new Error('Extraction not found');

  const createdIds: string[] = [];
  const fileUrl = (commonData?.fileUrl as string) || extraction.inputFileUrl || undefined;
  const fileName = (commonData?.fileName as string) || undefined;
  const saveDocument = commonData?.saveDocument !== false;

  for (const item of batchItems) {
    const mergedItem = {
      ...commonData,
      ...item,
      invoiceUrl: fileUrl || (item.invoiceUrl as string) || undefined,
      contractUrl: fileUrl || (item.contractUrl as string) || undefined,
    };
    const target = (item.targetEntity as AITargetEntity) || extraction.targetEntity || 'ASSET';
    const entityId = await autoCreateEntity(
      target,
      mergedItem,
      userId
    );
    createdIds.push(entityId);
  }

  let createdDocId: string | undefined;

  if (saveDocument && fileUrl) {
    try {
      const isContract = Boolean(commonData?.contractNumber || fileName?.toLowerCase().includes('hợp đồng') || fileName?.toLowerCase().includes('contract'));
      const isQuote = Boolean(fileName?.toLowerCase().includes('báo giá') || fileName?.toLowerCase().includes('quote'));
      
      const docType = isContract ? 'CONTRACT' : (isQuote ? 'QUOTATION' : 'INVOICE');
      const docTitle = (commonData?.contractNumber ? `Hợp đồng ${commonData.contractNumber}` : '') ||
                       (commonData?.invoiceNumber ? `Hóa đơn ${commonData.invoiceNumber}` : '') ||
                       fileName || 'Tài liệu mua sắm đính kèm';

      let matchedVendorId = commonData?.vendorId as string | undefined;
      if (!matchedVendorId && commonData?.vendorName) {
        const v = await prisma.vendor.findFirst({
          where: { name: { contains: commonData.vendorName as string, mode: 'insensitive' } },
        });
        if (v) matchedVendorId = v.id;
      }

      const doc = await prisma.document.create({
        data: {
          title: docTitle,
          type: docType as any,
          projectName: (commonData?.projectName as string) || null,
          contractNumber: (commonData?.contractNumber as string) || null,
          invoiceNumber: (commonData?.invoiceNumber as string) || null,
          companyName: (commonData?.companyName as string) || 'TẬP ĐOÀN TechCorp',
          vendorId: matchedVendorId || null,
          vendorName: (commonData?.vendorName as string) || null,
          assetId: createdIds[0] || null,
          documentDate: commonData?.purchaseDate ? new Date(commonData.purchaseDate as string) : new Date(),
          fileUrl,
          fileName: fileName || path.basename(fileUrl),
          fileSize: (commonData?.fileSize as number) || null,
          notes: `Được tải lên từ AI Smart Input. Tự động liên kết với ${createdIds.length} thiết bị/dịch vụ.`,
          createdById: userId,
        },
      });

      createdDocId = doc.id;
    } catch (docErr) {
      console.warn('Failed to auto-save Document record:', docErr);
    }
  }

  await prisma.aIExtraction.update({
    where: { id: extractionId },
    data: {
      status: 'USER_CONFIRMED',
      createdEntityId: createdIds[0] || null,
      reviewedById: userId,
      reviewedAt: new Date(),
    },
  });

  return { count: createdIds.length, entityIds: createdIds, documentId: createdDocId };
}

export async function rejectExtraction(
  extractionId: string,
  userId: string
): Promise<void> {
  await prisma.aIExtraction.update({
    where: { id: extractionId },
    data: {
      status: 'REJECTED',
      reviewedById: userId,
      reviewedAt: new Date(),
    },
  });
}

function buildExhaustiveMultiItemPrompt(input: ExtractionInput): string {
  const inputSection = input.inputText
    ? `=== DOCUMENT / TEXT CONTENT TO ANALYZE ===\n${input.inputText}\n===========================================`
    : `Analyze the attached document (PDF / image / scanned file). Extract all text, tables, quotes, and line items.`;

  return `${inputSection}

You are an expert IT Procurement, Commercial Contract, License & Asset Extraction AI.
Analyze the provided document or text thoroughly and extract ALL distinct line items without missing anything.

CRITICAL EXTRACTION RULES:
1. Scan EVERY table row, quotation item, and equipment clause.
2. If there are multiple items (e.g. 1 Laptop, 2 Microphones, 1 Software License, 1 Maintenance Pack), you MUST output ALL items into the "items" array.
3. For each line item:
   - "targetEntity": Exactly "ASSET" (for hardware/devices), "LICENSE" (for software licenses/operating systems/apps), or "SERVICE" (for recurring subscriptions/cloud/internet/SLA/maintenance).
   - "categoryName": "Laptop", "PC / Máy tính để bàn", "Máy trạm Workstation", "Màn hình", "Máy in", "Thiết bị mạng", "Tai nghe / Loa", "Máy chủ & Hệ thống (Server)", "License Bản quyền", "Dịch vụ IT", or "Phụ kiện".
   - "name": Full formal product name in Vietnamese / English.
   - "brand": Brand or vendor (e.g. Dell, Asus, Apple, HP, MapInfo, Microsoft, Cisco, TSG).
   - "model": Model name or version.
   - "serialNumber": Serial number if found in document (or null).
   - "quantity": Integer quantity (default 1).
   - "purchasePrice": Unit price in VND (number only, e.g. 45000000).
   - "warrantyMonths": Warranty duration or subscription period in months (integer, e.g. 12, 24, 36).
   - "specs": Hardware specs or license details (object or string).

OUTPUT FORMAT: Return valid JSON matching this schema:
{
  "docType": "QUOTATION hoặc CONTRACT hoặc INVOICE hoặc PROPOSAL hoặc OTHER",
  "title": "Tiêu đề chứng từ / báo giá phù hợp",
  "vendorName": "Tên nhà cung cấp / Bên bán (hoặc null)",
  "companyName": "Tên bên mua / Đơn vị nhận (hoặc null)",
  "contractNumber": "Số hợp đồng nếu có (hoặc null)",
  "invoiceNumber": "Số hóa đơn nếu có (hoặc null)",
  "proposalNumber": "Số báo giá / tờ trình nếu có (hoặc null)",
  "purchaseDate": "YYYY-MM-DD nếu có (hoặc null)",
  "totalAmount": 0,
  "summary": "Tóm tắt ngắn gọn nội dung báo giá / hợp đồng",
  "items": [
    {
      "name": "Tên sản phẩm hoặc license",
      "targetEntity": "ASSET hoặc LICENSE hoặc SERVICE",
      "categoryName": "Tên danh mục",
      "brand": "Thương hiệu",
      "model": "Model",
      "serialNumber": null,
      "quantity": 1,
      "purchasePrice": 0,
      "warrantyMonths": 12,
      "specs": {}
    }
  ]
}`;
}

function repairAndParseAIJson(responseText: string): Record<string, unknown> {
  let clean = responseText.trim();
  if (clean.startsWith('```json')) clean = clean.slice(7);
  if (clean.startsWith('```')) clean = clean.slice(3);
  if (clean.endsWith('```')) clean = clean.slice(0, -3);
  clean = clean.trim();

  let rawObj: any = null;
  try {
    rawObj = JSON.parse(clean);
  } catch {}

  if (!rawObj) {
    const arrayMatch = clean.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (arrayMatch) {
      try {
        rawObj = JSON.parse(arrayMatch[0]);
      } catch {}
    }
  }

  if (!rawObj) {
    const objMatch = clean.match(/\{[\s\S]*\}/);
    if (objMatch) {
      try {
        rawObj = JSON.parse(objMatch[0]);
      } catch {}
    }
  }

  if (!rawObj) {
    let repaired = clean;
    const quoteCount = (repaired.match(/(?<!\\)"/g) || []).length;
    if (quoteCount % 2 !== 0) repaired += '"';
    const openBraces = (repaired.match(/\{/g) || []).length;
    const closeBraces = (repaired.match(/\}/g) || []).length;
    for (let i = 0; i < openBraces - closeBraces; i++) repaired += '}';
    try {
      rawObj = JSON.parse(repaired);
    } catch {}
  }

  const result: Record<string, unknown> = {};

  if (Array.isArray(rawObj)) {
    const first = rawObj[0] || {};
    result.vendorName = first.vendorName || null;
    result.companyName = first.companyName || null;
    result.contractNumber = first.contractNumber || null;
    result.invoiceNumber = first.invoiceNumber || null;
    result.purchaseDate = first.purchaseDate || null;
    result.items = rawObj.map((it: any) => ({
      ...it,
      purchasePrice: normalizePrice(it.purchasePrice),
    }));
    Object.assign(result, first);
    result.items = rawObj;
    return result;
  }

  if (typeof rawObj === 'object' && rawObj !== null) {
    if (Array.isArray(rawObj.items) && rawObj.items.length > 0) {
      const first = rawObj.items[0] || {};
      const normalizedItems = rawObj.items.map((it: any) => ({
        ...it,
        purchasePrice: normalizePrice(it.purchasePrice),
      }));

      return {
        ...rawObj,
        name: rawObj.name || first.name || '',
        brand: rawObj.brand || first.brand || '',
        model: rawObj.model || first.model || '',
        categoryName: rawObj.categoryName || first.categoryName || '',
        purchasePrice: normalizePrice(rawObj.purchasePrice || first.purchasePrice),
        warrantyMonths: rawObj.warrantyMonths || first.warrantyMonths || 12,
        specs: rawObj.specs || first.specs || {},
        items: normalizedItems,
      };
    } else {
      rawObj.purchasePrice = normalizePrice(rawObj.purchasePrice);
      return {
        ...rawObj,
        items: [rawObj],
      };
    }
  }

  return { items: [] };
}

function parseAIResponse(responseText: string): { data: Record<string, unknown>; confidence: number } {
  const data = repairAndParseAIJson(responseText);
  return { data, confidence: 0.98 };
}

async function autoCreateEntity(
  targetEntity: AITargetEntity,
  data: Record<string, unknown>,
  userId: string
): Promise<string> {
  switch (targetEntity) {
    case 'ASSET': {
      let categoryId = data.categoryId as string | undefined;
      if (!categoryId && data.categoryName && String(data.categoryName).trim() !== '') {
        const catNameClean = String(data.categoryName).trim();
        const category = await prisma.assetCategory.findFirst({
          where: { name: { contains: catNameClean, mode: 'insensitive' } },
        });
        if (category) {
          categoryId = category.id;
        } else {
          // Auto-create new category appropriately
          try {
            const newCat = await prisma.assetCategory.create({
              data: {
                name: catNameClean,
                icon: '📦',
                description: `Tự động khởi tạo từ AI khi phát hiện thiết bị: ${data.name || data.model || catNameClean}`,
              },
            });
            categoryId = newCat.id;
          } catch {
            const fallback = await prisma.assetCategory.findFirst();
            categoryId = fallback?.id;
          }
        }
      }
      if (!categoryId) {
        const defaultCat = await prisma.assetCategory.findFirst();
        if (!defaultCat) throw new Error('No category found');
        categoryId = defaultCat.id;
      }

      const count = await prisma.asset.count();
      const assetTag = (data.assetTag as string) || 'IT-AST-' + String(count + 1).padStart(4, '0');

      let vendorId = data.vendorId as string | undefined;
      if (!vendorId && data.vendorName) {
        const v = await prisma.vendor.findFirst({
          where: { name: { contains: data.vendorName as string, mode: 'insensitive' } }
        });
        if (v) vendorId = v.id;
      }

      const price = normalizePrice(data.purchasePrice);

      const asset = await prisma.asset.create({
        data: {
          assetTag,
          name: (data.name as string) || 'Chưa đặt tên',
          categoryId,
          brand: (data.brand as string) || null,
          model: (data.model as string) || null,
          serialNumber: (data.serialNumber as string) || null,
          purchaseDate: data.purchaseDate ? new Date(data.purchaseDate as string) : null,
          purchasePrice: price,
          purchaseCurrency: (data.purchaseCurrency as string) || 'VND',
          warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry as string) : null,
          companyName: (data.companyName as string) || null,
          vendorId: vendorId || null,
          locationId: (data.locationId as string) || null,
          specs: (data.specs as object) || undefined,
          notes: (data.notes as string) || null,
        },
      });

      return asset.id;
    }

    case 'LICENSE': {
      const price = normalizePrice(data.purchasePrice);
      const license = await prisma.license.create({
        data: {
          name: (data.name as string) || 'Chưa đặt tên',
          licenseKey: (data.licenseKey as string) || null,
          licenseType: (data.licenseType as any) || 'PERPETUAL',
          totalSeats: Number(data.totalSeats) || 1,
          purchaseDate: data.purchaseDate ? new Date(data.purchaseDate as string) : null,
          expiryDate: data.expiryDate ? new Date(data.expiryDate as string) : null,
          purchasePrice: price,
          purchaseCurrency: (data.purchaseCurrency as string) || 'VND',
          vendorId: (data.vendorId as string) || null,
          notes: (data.notes as string) || null,
        },
      });

      return license.id;
    }

    case 'SERVICE': {
      const count = await prisma.iTService.count();
      const serviceCode = (data.serviceCode as string) || 'SRV-' + String(count + 1).padStart(4, '0');

      let serviceType: any = 'INTERNET';
      const rawType = String(data.serviceType || '').toUpperCase();
      if (['INTERNET', 'DOMAIN', 'HOSTING_CLOUD', 'SOFTWARE_SAAS', 'MAINTENANCE_SLA', 'OTHER'].includes(rawType)) {
        serviceType = rawType;
      }

      let vendorId = data.vendorId as string | undefined;
      if (!vendorId && data.vendorName) {
        const v = await prisma.vendor.findFirst({
          where: { name: { contains: data.vendorName as string, mode: 'insensitive' } }
        });
        if (v) vendorId = v.id;
      }

      const cost = normalizePrice(data.purchasePrice || data.cost);

      const srv = await prisma.iTService.create({
        data: {
          serviceCode,
          name: (data.name as string) || 'Dịch vụ CNTT',
          serviceType,
          status: 'ACTIVE',
          billingCycle: (data.billingCycle as any) || 'MONTHLY',
          cost,
          currency: (data.purchaseCurrency as string) || 'VND',
          startDate: data.purchaseDate ? new Date(data.purchaseDate as string) : (data.startDate ? new Date(data.startDate as string) : null),
          expiryDate: data.expiryDate ? new Date(data.expiryDate as string) : null,
          accountNumber: (data.accountNumber as string) || null,
          contractNumber: (data.contractNumber as string) || null,
          invoiceNumber: (data.invoiceNumber as string) || null,
          vendorId: vendorId || null,
          companyName: (data.companyName as string) || null,
          locationId: (data.locationId as string) || null,
          specs: (data.specs as object) || undefined,
          notes: (data.notes as string) || null,
          createdById: userId,
        },
      });

      return srv.id;
    }

    default:
      throw new Error('Auto-creation not supported for ' + targetEntity);
  }
}
