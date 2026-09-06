import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { importAssetsFromExcel, importLicensesFromExcel } from '@/lib/services/excel-import';
import { ImportType } from '@prisma/client';

// POST /api/import - Upload & Process Excel File
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const importType = (formData.get('importType') as string || 'ASSET').toUpperCase() as ImportType;

    if (!file) {
      return NextResponse.json({ error: 'Vui lòng chọn file Excel (.xlsx)' }, { status: 400 });
    }

    // Check permission based on import type
    const requiredPermission = importType === 'LICENSE' ? 'licenses.import' : 'assets.import';
    const canImport = await hasPermission(currentUser.userId, requiredPermission);
    if (!canImport) {
      return NextResponse.json({ error: `Bạn không có quyền thực hiện import (${requiredPermission})` }, { status: 403 });
    }

    // Check file extension
    const fileName = file.name;
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      return NextResponse.json({ error: 'Định dạng file không hợp lệ. Chỉ chấp nhận .xlsx hoặc .xls' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    let result;
    if (importType === 'LICENSE') {
      result = await importLicensesFromExcel(fileBuffer, fileName, currentUser.userId);
    } else {
      result = await importAssetsFromExcel(fileBuffer, fileName, currentUser.userId);
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: `Xử lý hoàn tất: ${result.successRows}/${result.totalRows} dòng thành công, ${result.failedRows} dòng lỗi.`,
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Import failed',
        success: false,
      },
      { status: 500 }
    );
  }
}
