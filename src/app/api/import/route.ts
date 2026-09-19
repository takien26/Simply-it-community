import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { importAssetsFromExcel, importLicensesFromExcel } from '@/lib/services/excel-import';
import { getActiveLicense } from '@/lib/license';
import { POST as handleUserImport } from '@/app/api/users/import/route';
import { ImportType } from '@prisma/client';

// POST /api/import - Upload & Process Excel File
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const license = await getActiveLicense();
    if (!license.isEnterprise) {
      return NextResponse.json(
        { error: 'Tính năng Import hàng loạt từ file Excel chỉ khả dụng cho tài khoản trả phí (Enterprise Edition).' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const importType = ((formData.get('importType') as string) || 'ASSET').toUpperCase();

    if (!file) {
      return NextResponse.json({ error: 'Vui lòng chọn file Excel (.xlsx)' }, { status: 400 });
    }

    if (importType === 'USER') {
      const userFormData = new FormData();
      userFormData.append('file', file);
      const userReq = new NextRequest(new URL('/api/users/import', request.url), {
        method: 'POST',
        headers: request.headers,
        body: userFormData,
      });
      return await handleUserImport(userReq);
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
