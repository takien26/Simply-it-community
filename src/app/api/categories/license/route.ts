import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

const DEFAULT_LICENSE_CATEGORIES = [
  {
    id: 'cat-lic-1',
    name: 'Ứng dụng Văn phòng & Cộng tác',
    icon: '📄',
    description: 'Microsoft 365, Google Workspace, LibreOffice',
    customFields: [
      { key: 'edition', label: 'Gói dịch vụ / Plan', type: 'text', placeholder: 'Business Standard, E3, E5' },
      { key: 'assigned_domain', label: 'Domain gán', type: 'text', placeholder: 'company.com' },
      { key: 'cloud_storage', label: 'Dung lượng Cloud/User', type: 'text', placeholder: '1TB, 2TB' },
    ],
    count: 0,
  },
  {
    id: 'cat-lic-2',
    name: 'Thiết kế Đồ họa & Sáng tạo',
    icon: '🎨',
    description: 'Adobe Creative Cloud, Figma, Canva Pro, CorelDRAW',
    customFields: [
      { key: 'version', label: 'Phiên bản / Version', type: 'text', placeholder: 'CC 2024, v28.0' },
      { key: 'platform', label: 'Hệ điều hành hỗ trợ', type: 'select', options: ['Windows & macOS', 'Chỉ Windows', 'Chỉ macOS', 'Web Cloud'] },
      { key: 'license_tier', label: 'Cấp độ bản quyền', type: 'text', placeholder: 'All Apps, Single App' },
    ],
    count: 0,
  },
  {
    id: 'cat-lic-3',
    name: 'Công cụ Lập trình & IDE',
    icon: '💻',
    description: 'JetBrains All Products, Visual Studio Enterprise, GitHub Copilot',
    customFields: [
      { key: 'edition', label: 'Phiên bản (Edition)', type: 'text', placeholder: 'Ultimate, Enterprise, Pro' },
      { key: 'plugins_included', label: 'Plugin/Tiện ích kèm theo', type: 'text', placeholder: 'Copilot, AI Assistant' },
    ],
    count: 0,
  },
  {
    id: 'cat-lic-4',
    name: 'Họp trực tuyến & Giao tiếp',
    icon: '📹',
    description: 'Zoom Workplace Pro, Microsoft Teams Rooms, Webex',
    customFields: [
      { key: 'max_participants', label: 'Số người tham gia tối đa', type: 'number', placeholder: '300, 500, 1000' },
      { key: 'cloud_recording', label: 'Lưu trữ ghi âm cuộc họp', type: 'select', options: ['Có (Cloud Recording)', 'Không (Lưu máy cục bộ)'] },
    ],
    count: 0,
  },
  {
    id: 'cat-lic-5',
    name: 'Hệ điều hành & Server OS',
    icon: '🪟',
    description: 'Windows 11 Pro / Enterprise, Windows Server 2022, RedHat Linux',
    customFields: [
      { key: 'core_count', label: 'Số Core / CPU cấp phép', type: 'number', placeholder: '16 Core, 32 Core' },
      { key: 'cal_seats', label: 'Số lượng CAL User/Device', type: 'number', placeholder: '50' },
      { key: 'architecture', label: 'Kiến trúc', type: 'select', options: ['x64 (64-bit)', 'ARM64', 'x86'] },
    ],
    count: 0,
  },
  {
    id: 'cat-lic-6',
    name: 'Bảo mật & Antivirus',
    icon: '🛡️',
    description: 'Kaspersky Endpoint, ESET NOD32, Bitdefender GravityZone',
    customFields: [
      { key: 'management_type', label: 'Quản trị tập trung', type: 'select', options: ['Cloud Console', 'On-Premise Server'] },
      { key: 'protected_devices', label: 'Số thiết bị bảo vệ', type: 'number', placeholder: '100' },
    ],
    count: 0,
  },
  {
    id: 'cat-lic-7',
    name: 'Cơ sở dữ liệu & Phân tích',
    icon: '🗄️',
    description: 'Microsoft SQL Server, Oracle DB, Power BI Premium',
    customFields: [
      { key: 'db_edition', label: 'Phiên bản CSDL', type: 'text', placeholder: 'Standard, Enterprise' },
      { key: 'licensing_model', label: 'Mô hình tính License', type: 'select', options: ['Per Core', 'Server + CAL', 'Per User'] },
    ],
    count: 0,
  },
  {
    id: 'cat-lic-8',
    name: 'Phần mềm Kỹ thuật & CAD/CAM',
    icon: '📐',
    description: 'AutoCAD, SolidWorks, Revit, SketchUp Pro',
    customFields: [
      { key: 'license_type', label: 'Loại License', type: 'select', options: ['Standalone', 'Network Floating', 'Named User'] },
      { key: 'dongle_key', label: 'Khóa cứng USB (Dongle)', type: 'text', placeholder: 'Có / Mã Dongle' },
    ],
    count: 0,
  },
];

async function getStoredLicenseCategories() {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: 'categories.license' },
  });

  let list = DEFAULT_LICENSE_CATEGORIES;
  if (setting && setting.value) {
    try {
      list = JSON.parse(setting.value);
    } catch {
      list = DEFAULT_LICENSE_CATEGORIES;
    }
  }

  const licenses = await prisma.license.findMany({ select: { id: true, name: true } });
  return list.map((cat: any) => {
    const matching = licenses.filter((l) =>
      l.name.toLowerCase().includes(cat.name.toLowerCase()) ||
      (cat.description && cat.description.toLowerCase().split(', ').some((kw: string) => l.name.toLowerCase().includes(kw.toLowerCase())))
    );
    return { ...cat, count: matching.length };
  });
}

async function saveStoredLicenseCategories(categories: any[]) {
  await prisma.systemSetting.upsert({
    where: { key: 'categories.license' },
    create: {
      key: 'categories.license',
      value: JSON.stringify(categories),
      type: 'JSON',
      group: 'general',
      label: 'Danh mục bản quyền License',
    },
    update: {
      value: JSON.stringify(categories),
    },
  });
}

export async function GET() {
  try {
    const data = await getStoredLicenseCategories();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi khi tải danh mục license' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const body = await req.json();
    const { name, icon, description, customFields } = body;
    if (!name?.trim()) return NextResponse.json({ error: 'Tên danh mục là bắt buộc' }, { status: 400 });

    const list = await getStoredLicenseCategories();
    const newCat = {
      id: `cat-lic-${Date.now()}`,
      name: name.trim(),
      icon: icon || '🔑',
      description: description || '',
      customFields: Array.isArray(customFields) ? customFields : [],
      count: 0,
    };

    list.push(newCat);
    await saveStoredLicenseCategories(list);

    return NextResponse.json({ success: true, data: newCat }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi khi tạo danh mục license' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const body = await req.json();
    const { id, name, icon, description, customFields } = body;
    if (!id || !name?.trim()) return NextResponse.json({ error: 'Thiếu thông tin danh mục' }, { status: 400 });

    let list = await getStoredLicenseCategories();
    list = list.map((item: any) =>
      item.id === id
        ? {
            ...item,
            name: name.trim(),
            icon: icon || item.icon,
            description: description !== undefined ? description : item.description,
            customFields: Array.isArray(customFields) ? customFields : item.customFields || [],
          }
        : item
    );
    await saveStoredLicenseCategories(list);

    return NextResponse.json({ success: true, message: 'Đã cập nhật danh mục license' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi khi cập nhật danh mục' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Thiếu ID danh mục' }, { status: 400 });

    let list = await getStoredLicenseCategories();
    list = list.filter((item: any) => item.id !== id);
    await saveStoredLicenseCategories(list);

    return NextResponse.json({ success: true, message: 'Đã xóa danh mục license' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi khi xóa danh mục' }, { status: 500 });
  }
}
