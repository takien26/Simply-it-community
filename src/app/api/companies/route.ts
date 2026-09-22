import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import { getOUStructure, saveOUStructure, generateOUId, DEFAULT_CORPORATE_DEPARTMENTS } from '@/lib/ou-structure';
import { normalizeCompanyName, areCompaniesEqual } from '@/lib/normalize';

const DEFAULT_COMPANIES = [
  'Tổng Công Ty (HQ)',
  'Chi Nhánh Hà Nội',
  'Chi Nhánh TP.HCM',
  'Chi Nhánh Đà Nẵng',
  'Nhà Máy Sản Xuất',
];

async function getStoredCompanies(): Promise<string[]> {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: 'corporate.companies' },
  });
  if (setting && setting.value) {
    try {
      const parsed = JSON.parse(setting.value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch {}
  }
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
    const seen = new Set<string>();
    const normalizedList: string[] = [];
    for (const c of list) {
      const norm = normalizeCompanyName(c);
      if (!seen.has(norm.toLowerCase())) {
        seen.add(norm.toLowerCase());
        normalizedList.push(norm);
      }
    }
    return NextResponse.json({ success: true, data: normalizedList });
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

    const canManage = currentUser.roleName === 'Admin' || (await hasPermission(currentUser.userId, 'companies.create'));
    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden: Bạn không có quyền thêm công ty' }, { status: 403 });
    }

    const body = await request.json();
    const rawName = (body.name || '').trim();
    if (!rawName) {
      return NextResponse.json({ error: 'Tên công ty là bắt buộc' }, { status: 400 });
    }

    const name = normalizeCompanyName(rawName);
    const currentList = await getStoredCompanies();
    if (!currentList.some((c) => areCompaniesEqual(c, name))) {
      currentList.push(name);
      await saveStoredCompanies(currentList);

      // Sync OU structure
      try {
        const ouTree = await getOUStructure();
        if (!ouTree.some((c) => areCompaniesEqual(c.name, name))) {
          ouTree.push({
            id: generateOUId('comp', name),
            name,
            departments: DEFAULT_CORPORATE_DEPARTMENTS.map((d) => ({
              ...d,
              id: generateOUId('dept', d.name),
              children: d.children.map((c) => ({
                ...c,
                id: generateOUId('sub', c.name),
              })),
            })),
          });
          await saveOUStructure(ouTree);
        }
      } catch (ouErr) {
        console.error('Sync OU on company create error:', ouErr);
      }
    }

    return NextResponse.json({ success: true, data: name });
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

    const canManage = currentUser.roleName === 'Admin' || (await hasPermission(currentUser.userId, 'companies.update'));
    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden: Bạn không có quyền sửa thông tin công ty' }, { status: 403 });
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

    // Sync OU structure
    try {
      const ouTree = await getOUStructure();
      const node = ouTree.find((c) => c.name.toLowerCase() === oldName.toLowerCase());
      if (node) {
        node.name = newName;
        await saveOUStructure(ouTree);
      }
    } catch (ouErr) {
      console.error('Sync OU on company rename error:', ouErr);
    }

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

    const canManage = currentUser.roleName === 'Admin' || (await hasPermission(currentUser.userId, 'companies.delete'));
    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden: Bạn không có quyền xóa công ty' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name')?.trim();

    if (!name) {
      return NextResponse.json({ error: 'Tên công ty là bắt buộc' }, { status: 400 });
    }

    const currentList = await getStoredCompanies();
    const updatedList = currentList.filter((c) => c !== name);
    await saveStoredCompanies(updatedList);

    // Sync OU structure
    try {
      const ouTree = await getOUStructure();
      const filteredOU = ouTree.filter((c) => c.name.toLowerCase() !== name.toLowerCase());
      await saveOUStructure(filteredOU);
    } catch (ouErr) {
      console.error('Sync OU on company delete error:', ouErr);
    }

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
