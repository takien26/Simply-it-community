import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { generateAssetTemplate, generateLicenseTemplate, generateServiceTemplate, generateUserTemplate } from '@/lib/services/excel-import';

// GET /api/import/template?type=ASSET|LICENSE|SERVICE|USER
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = (searchParams.get('type') || 'ASSET').toUpperCase();
    const lang = (searchParams.get('lang') || 'vi').toLowerCase();
    const isEn = lang === 'en';

    let buffer: Buffer;
    let fileName: string;

    if (type === 'LICENSE') {
      buffer = await generateLicenseTemplate(lang);
      fileName = isEn ? 'License_Import_Template.xlsx' : 'Mau_Import_License.xlsx';
    } else if (type === 'SERVICE') {
      buffer = await generateServiceTemplate(lang);
      fileName = isEn ? 'IT_Service_Import_Template.xlsx' : 'Mau_Import_Dich_Vu_IT.xlsx';
    } else if (type === 'USER') {
      buffer = await generateUserTemplate(lang);
      fileName = isEn ? 'User_Import_Template.xlsx' : 'Mau_Import_Nhan_Su.xlsx';
    } else {
      buffer = await generateAssetTemplate(lang);
      fileName = isEn ? 'Asset_Import_Template.xlsx' : 'Mau_Import_Tai_San.xlsx';
    }

    const headers = new Headers();
    headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    headers.set('Content-Disposition', `attachment; filename="${fileName}"`);

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Error generating template:', error);
    return NextResponse.json({ error: 'Failed to generate template' }, { status: 500 });
  }
}
