import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

const DEFAULT_COMPANIES = [
  'Công ty Cổ phần Tập đoàn ABC',
  'Công ty TNHH MTV Công Nghệ ABC',
  'Chi nhánh Miền Bắc (Hà Nội)',
  'Chi nhánh Miền Nam (TP.HCM)',
];

async function getStoredCompanies(): Promise<string[]> {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: 'corporate.companies' },
  });

  if (setting && setting.value !== undefined && setting.value !== null) {
    try {
      const parsed = JSON.parse(setting.value);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // parse error fall through
    }
  }

  // Only if corporate.companies setting has NEVER been initialized in DB
  await saveStoredCompanies(DEFAULT_COMPANIES);
  return DEFAULT_COMPANIES;
}

async function saveStoredCompanies(companies: string[]) {
  await prisma.systemSetting.upsert({
    where: { key: 'corporate.companies' },
    create: {
      key: 'corporate.companies',
      value: JSON.stringify(companies),
      type: 'JSON',
      group: 'general',
      label: 'Danh sách công ty quản lý trong tập đoàn',
    },
    update: {
      value: JSON.stringify(companies),
    },
  });
}

// GET /api/companies
export async function GET() {
  try {
    const list = await getStoredCompanies();
    return NextResponse.json({ success: true, data: list });
  } catch (error) {
    console.error('List companies error:', error);
    return NextResponse.json({ error: 'Failed to list companies' }, { status: 500 });
  }
}

// POST /api/companies
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const name = (body.name || '').trim();
    if (!name) {
      return NextResponse.json({ error: 'Tên công ty là bắt buộc' }, { status: 400 });
    }

    const currentList = await getStoredCompanies();
    if (!currentList.includes(name)) {
      currentList.push(name);
      await saveStoredCompanies(currentList);
    }

    return NextResponse.json({ success: true, data: name }, { status: 201 });
  } catch (error) {
    console.error('Create company error:', error);
    return NextResponse.json({ error: 'Failed to create company' }, { status: 500 });
  }
}

// PUT /api/companies (Rename)
export async function PUT(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const oldName = (body.oldName || '').trim();
    const newName = (body.newName || '').trim();

    if (!oldName || !newName) {
      return NextResponse.json({ error: 'Tên cũ và tên mới là bắt buộc' }, { status: 400 });
    }

    const currentList = await getStoredCompanies();
    const updatedList = currentList.map((c) => (c === oldName ? newName : c));
    await saveStoredCompanies(updatedList);

    // Update all licenses, assets, users that used oldName
    await Promise.all([
      prisma.license.updateMany({
        where: { companyName: oldName },
        data: { companyName: newName },
      }),
      prisma.asset.updateMany({
        where: { companyName: oldName },
        data: { companyName: newName },
      }),
      prisma.user.updateMany({
        where: { companyName: oldName },
        data: { companyName: newName },
      }),
    ]);

    return NextResponse.json({ success: true, data: newName });
  } catch (error) {
    console.error('Update company error:', error);
    return NextResponse.json({ error: 'Failed to update company' }, { status: 500 });
  }
}

// DELETE /api/companies
export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name')?.trim();

    if (!name) {
      return NextResponse.json({ error: 'Tên công ty là bắt buộc' }, { status: 400 });
    }

    const currentList = await getStoredCompanies();
    const updatedList = currentList.filter((c) => c !== name);
    await saveStoredCompanies(updatedList);

    // Cascade clear companyName from all referenced entities
    await Promise.all([
      prisma.license.updateMany({
        where: { companyName: name },
        data: { companyName: null },
      }),
      prisma.asset.updateMany({
        where: { companyName: name },
        data: { companyName: null },
      }),
      prisma.user.updateMany({
        where: { companyName: name },
        data: { companyName: null },
      }),
    ]);

    return NextResponse.json({ success: true, message: 'Đã xóa công ty thành công', data: updatedList });
  } catch (error) {
    console.error('Delete company error:', error);
    return NextResponse.json({ error: 'Failed to delete company' }, { status: 500 });
  }
}
