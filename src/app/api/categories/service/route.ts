import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

const DEFAULT_SERVICE_CATEGORIES = [
  {
    id: 'cat-svc-1',
    name: 'Đường truyền Internet / Cáp quang FTTH',
    icon: '🌐',
    serviceType: 'INTERNET',
    description: 'Cáp quang Viettel, VNPT, FPT, Leased Line doanh nghiệp',
    customFields: [
      { key: 'bandwidth', label: 'Băng thông / Tốc độ', type: 'text', placeholder: '500 Mbps, 1 Gbps' },
      { key: 'ip_type', label: 'Loại IP', type: 'select', options: ['IP Tĩnh (Static IP)', 'IP Động (Dynamic)'] },
      { key: 'sla_uptime', label: 'Cam kết SLA Uptime', type: 'text', placeholder: '99.9%' },
    ],
    count: 0,
  },
  {
    id: 'cat-svc-2',
    name: 'Máy chủ Cloud / VPS / Hosting',
    icon: '☁️',
    serviceType: 'CLOUD_HOSTING',
    description: 'AWS, Azure, Google Cloud, FPT Cloud, Viettel IDC, VPS NVMe',
    customFields: [
      { key: 'server_specs', label: 'Cấu hình Server (vCPU/RAM/Disk)', type: 'text', placeholder: '8 vCPU, 32GB RAM, 500GB NVMe' },
      { key: 'datacenter_region', label: 'Khu vực Datacenter', type: 'text', placeholder: 'Hà Nội, TP.HCM, Singapore' },
      { key: 'os_installed', label: 'HĐH Cài đặt', type: 'text', placeholder: 'Ubuntu 22.04 LTS, Windows Server' },
    ],
    count: 0,
  },
  {
    id: 'cat-svc-3',
    name: 'Tên miền & Chứng chỉ SSL',
    icon: '🛡️',
    serviceType: 'DOMAIN_SSL',
    description: 'Tên miền thương hiệu .vn/.com, SSL Wildcard, Cloudflare',
    customFields: [
      { key: 'domain_name', label: 'Tên miền đăng ký', type: 'text', placeholder: 'domain.com.vn' },
      { key: 'ssl_type', label: 'Loại SSL', type: 'select', options: ['DV (Domain Validation)', 'OV (Organization)', 'EV (Extended)', 'Wildcard (*.domain.com)'] },
      { key: 'registrar', label: 'Nhà đăng ký Registrar', type: 'text', placeholder: 'Mắt Bão, PA Việt Nam, Cloudflare' },
    ],
    count: 0,
  },
  {
    id: 'cat-svc-4',
    name: 'Email Doanh nghiệp & SaaS',
    icon: '📧',
    serviceType: 'EMAIL_COMMUNICATION',
    description: 'M365 Exchange, Google Workspace, Zimbra Mail Server',
    customFields: [
      { key: 'total_mailboxes', label: 'Số lượng hộp thư (Mailbox)', type: 'number', placeholder: '100' },
      { key: 'storage_per_user', label: 'Dung lượng/Hộp thư', type: 'text', placeholder: '50GB' },
    ],
    count: 0,
  },
  {
    id: 'cat-svc-5',
    name: 'Tổng đài ảo VoIP & Đầu số Hotline',
    icon: '📞',
    serviceType: 'TELECOM_VOIP',
    description: 'Tổng đài 1900/1800, SIP Trunking, Call Center',
    customFields: [
      { key: 'hotline_number', label: 'Đầu số Hotline', type: 'text', placeholder: '1900 xxxx, 1800 xxxx' },
      { key: 'concurrent_calls', label: 'Số cuộc gọi đồng thời', type: 'number', placeholder: '16, 32' },
    ],
    count: 0,
  },
  {
    id: 'cat-svc-6',
    name: 'Bảo trì IT & Hợp đồng SLA',
    icon: '🔧',
    serviceType: 'MAINTENANCE_SLA',
    description: 'Bảo trì máy chủ định kỳ, bảo trì hệ thống mạng, Helpdesk Onsite',
    customFields: [
      { key: 'response_time', label: 'Thời gian cam kết phản hồi (SLA)', type: 'text', placeholder: 'Dưới 2 giờ' },
      { key: 'onsite_visits', label: 'Số lượt hỗ trợ tận nơi/tháng', type: 'number', placeholder: '4' },
    ],
    count: 0,
  },
  {
    id: 'cat-svc-7',
    name: 'Phần mềm Thuê bao Định kỳ (SaaS)',
    icon: '💼',
    serviceType: 'SOFTWARE_SAAS',
    description: 'ERP Cloud, CRM, Kế toán hóa đơn điện tử, Chữ ký số',
    customFields: [
      { key: 'user_seats', label: 'Số tài khoản sử dụng', type: 'number', placeholder: '50' },
      { key: 'support_channel', label: 'Kênh hỗ trợ', type: 'text', placeholder: 'Hotline 24/7, Ticket' },
    ],
    count: 0,
  },
  {
    id: 'cat-svc-8',
    name: 'Dịch vụ Hạ tầng IT Khác',
    icon: '📦',
    serviceType: 'OTHER',
    description: 'Chỗ đặt máy chủ Colocation, Lưu trữ đám mây Backup',
    customFields: [
      { key: 'rack_space', label: 'Không gian Rack / Tiêu chuẩn', type: 'text', placeholder: '1U, 2U, 1/2 Rack' },
      { key: 'power_consumption', label: 'Công suất nguồn (Watt)', type: 'text', placeholder: '500W, 1000W' },
    ],
    count: 0,
  },
];

async function getStoredServiceCategories() {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: 'categories.service' },
  });

  let list = DEFAULT_SERVICE_CATEGORIES;
  if (setting && setting.value) {
    try {
      list = JSON.parse(setting.value);
    } catch {
      list = DEFAULT_SERVICE_CATEGORIES;
    }
  }

  const services = await prisma.iTService.findMany({ select: { id: true, serviceType: true, name: true } });
  return list.map((cat: any) => {
    const matching = services.filter((s) => s.serviceType === cat.serviceType || s.name.toLowerCase().includes(cat.name.toLowerCase()));
    return { ...cat, count: matching.length };
  });
}

async function saveStoredServiceCategories(categories: any[]) {
  await prisma.systemSetting.upsert({
    where: { key: 'categories.service' },
    create: {
      key: 'categories.service',
      value: JSON.stringify(categories),
      type: 'JSON',
      group: 'general',
      label: 'Danh mục dịch vụ IT & Thuê bao',
    },
    update: {
      value: JSON.stringify(categories),
    },
  });
}

export async function GET() {
  try {
    const data = await getStoredServiceCategories();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi khi tải danh mục dịch vụ' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const body = await req.json();
    const { name, icon, description, serviceType, customFields } = body;
    if (!name?.trim()) return NextResponse.json({ error: 'Tên danh mục là bắt buộc' }, { status: 400 });

    const list = await getStoredServiceCategories();
    const newCat = {
      id: `cat-svc-${Date.now()}`,
      name: name.trim(),
      icon: icon || '🌐',
      serviceType: serviceType || 'OTHER',
      description: description || '',
      customFields: Array.isArray(customFields) ? customFields : [],
      count: 0,
    };

    list.push(newCat);
    await saveStoredServiceCategories(list);

    return NextResponse.json({ success: true, data: newCat }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi khi tạo danh mục dịch vụ' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const body = await req.json();
    const { id, name, icon, description, serviceType, customFields } = body;
    if (!id || !name?.trim()) return NextResponse.json({ error: 'Thiếu thông tin danh mục' }, { status: 400 });

    let list = await getStoredServiceCategories();
    list = list.map((item: any) =>
      item.id === id
        ? {
            ...item,
            name: name.trim(),
            icon: icon || item.icon,
            description: description !== undefined ? description : item.description,
            serviceType: serviceType || item.serviceType,
            customFields: Array.isArray(customFields) ? customFields : item.customFields || [],
          }
        : item
    );
    await saveStoredServiceCategories(list);

    return NextResponse.json({ success: true, message: 'Đã cập nhật danh mục dịch vụ' });
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

    let list = await getStoredServiceCategories();
    list = list.filter((item: any) => item.id !== id);
    await saveStoredServiceCategories(list);

    return NextResponse.json({ success: true, message: 'Đã xóa danh mục dịch vụ' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi khi xóa danh mục' }, { status: 500 });
  }
}
