import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const RACKS_SETTING_KEY = 'custom_rack_cabinets_list';

const DEFAULT_PRESET_RACKS = [
  {
    id: 'tpl-rack-42u-datacenter',
    name: 'Tủ Rack 42U - Trung Tâm Dữ Liệu & Core Network',
    code: 'RCK-42U-DC01',
    totalU: 42,
    category: 'Trung Tâm Dữ Liệu (DC / NOC)',
    brand: 'APC NetShelter SX 42U 19"',
    description: 'Tủ rack máy chủ & mạng lõi tiêu chuẩn Data Center: Core Switch Nexus, Firewall HA, SAN Storage, cụm VMware R750 & UPS 5kVA',
    maxPowerWatts: 6000,
    currentWatts: 2850,
    powerCalcMode: 'AUTO',
    temperatureC: 22.5,
    tempWarningThresholdC: 32.0,
    humidityPct: 48,
    locationNote: 'Phòng Server Trung Tâm - Tầng 3 (Khu A)',
    isPreset: true,
    units: [
      {
        id: 'u-41',
        uPosition: 41,
        uHeight: 2,
        deviceType: 'FIREWALL',
        name: 'Tường Lửa FortiGate 200F Cluster Active-Passive (2U)',
        brand: 'Fortinet',
        model: 'FortiGate 200F',
        assetTag: 'NET-FW-200F',
        ipAddress: '192.168.1.1',
        powerWatts: 180,
        status: 'ONLINE',
        notes: 'Chạy cụm HA cân bằng tải bảo mật cổng vào Internet',
      },
      {
        id: 'u-39',
        uPosition: 39,
        uHeight: 1,
        deviceType: 'ROUTER',
        name: 'Router Biên Doanh Nghiệp Cisco Catalyst 8300 Edge 1U',
        brand: 'Cisco Systems',
        model: 'C8300-1N1S-6T',
        assetTag: 'NET-RTR-8300',
        ipAddress: '192.168.1.254',
        powerWatts: 120,
        status: 'ONLINE',
        notes: 'Định tuyến BGP đa hướng VNPT & Viettel Leased-Line',
      },
      {
        id: 'u-37',
        uPosition: 37,
        uHeight: 2,
        deviceType: 'SWITCH',
        name: 'Core Switch Cisco Catalyst 9500 48-Port 10G/40G Fiber (2U)',
        brand: 'Cisco Systems',
        model: 'C9500-48Y4C',
        assetTag: 'NET-CSW-9500',
        ipAddress: '192.168.10.1',
        powerWatts: 350,
        status: 'ONLINE',
        notes: 'Trục xương sống kết nối toàn bộ hệ thống mạng công ty',
      },
      {
        id: 'u-35',
        uPosition: 35,
        uHeight: 1,
        deviceType: 'SWITCH',
        name: 'Distribution Switch Cisco CBS350 48-Port PoE+ 1G',
        brand: 'Cisco Systems',
        model: 'CBS350-48P-4X',
        assetTag: 'NET-DSW-01',
        ipAddress: '192.168.10.2',
        powerWatts: 420,
        status: 'ONLINE',
      },
      {
        id: 'u-34',
        uPosition: 34,
        uHeight: 1,
        deviceType: 'PATCH_PANEL',
        name: 'Khay Đấu Nối Quang Modular Fiber Patch Panel 24 Core LC',
        brand: 'CommScope',
        model: 'FPP-24-LC',
        status: 'ONLINE',
      },
      {
        id: 'u-25',
        uPosition: 25,
        uHeight: 2,
        deviceType: 'SERVER',
        name: 'Máy Chủ Cơ Sở Dữ Liệu Dell PowerEdge R750 2U (Database Master)',
        brand: 'Dell Technologies',
        model: 'PowerEdge R750',
        assetTag: 'SRV-DB-R750-01',
        ipAddress: '192.168.10.10',
        powerWatts: 520,
        status: 'ONLINE',
        notes: '2x Intel Xeon Gold 6330, 256GB RAM, 8x 3.84TB NVMe SSD Enterprise',
      },
      {
        id: 'u-23',
        uPosition: 23,
        uHeight: 1,
        deviceType: 'SERVER',
        name: 'Máy Chủ Ảo Hóa VMware ESXi Cluster Dell PowerEdge R650 1U',
        brand: 'Dell Technologies',
        model: 'PowerEdge R650',
        assetTag: 'SRV-ESX-R650-01',
        ipAddress: '192.168.10.11',
        powerWatts: 380,
        status: 'ONLINE',
        notes: 'Chạy các máy ảo Core ERP, Active Directory, Web Application',
      },
      {
        id: 'u-19',
        uPosition: 19,
        uHeight: 2,
        deviceType: 'STORAGE',
        name: 'Hệ Thống Lưu Trữ Dữ Liệu Tập Trung NAS/SAN Synology RS3621xs+ (2U)',
        brand: 'Synology',
        model: 'RS3621xs+',
        assetTag: 'SAN-SYN-3621',
        ipAddress: '192.168.10.50',
        powerWatts: 310,
        status: 'ONLINE',
        notes: '12 Khay ổ cứng 16TB Enterprise (Tổng 192TB RAW, RAID 6)',
      },
      {
        id: 'u-16',
        uPosition: 16,
        uHeight: 1,
        deviceType: 'KVM',
        name: 'Màn Hình KVM Console LCD 17" Rackmount 8 Cổng',
        brand: 'ATEN',
        model: 'CL1008M',
        status: 'STANDBY',
        notes: 'Bàn phím + Chuột cảm ứng điều khiển trực tiếp phòng Server',
      },
      {
        id: 'u-14',
        uPosition: 14,
        uHeight: 1,
        deviceType: 'PDU',
        name: 'Thanh Phân Phối Nguồn Kỹ Thuật Số PDU APC Metered Rack 24 Ports',
        brand: 'APC by Schneider',
        model: 'AP8858',
        status: 'ONLINE',
        notes: 'Đo tải dòng điện Ampe & Cảnh báo quá tải qua mạng',
      },
      {
        id: 'u-5',
        uPosition: 5,
        uHeight: 3,
        deviceType: 'UPS',
        name: 'Bộ Lưu Điện Online UPS APC Smart-UPS RT 5000VA 230V (3U)',
        brand: 'APC by Schneider',
        model: 'SURTD5000XLI',
        assetTag: 'PWR-UPS-5KVA',
        ipAddress: '192.168.1.200',
        powerWatts: 5000,
        status: 'ONLINE',
        notes: 'Dự phòng mất điện 45 phút cho toàn bộ tủ rack máy chủ',
      },
      {
        id: 'u-1',
        uPosition: 1,
        uHeight: 3,
        deviceType: 'UPS',
        name: 'Khay Ắc Quy Mở Rộng APC Battery Pack 3U',
        brand: 'APC by Schneider',
        model: 'SURT192XLBP',
        status: 'ONLINE',
        notes: 'Mở rộng thêm thời lượng cấp nguồn lưu điện',
      },
    ],
  },
  {
    id: 'tpl-rack-27u-branch',
    name: 'Tủ Rack 27U - Văn Phòng Chi Nhánh & Phòng IT',
    code: 'RCK-27U-BR01',
    totalU: 27,
    category: 'Văn Phòng Chi Nhánh',
    brand: 'Vietrack 27U D800',
    description: 'Tủ rack mạng 27U đặt tại văn phòng chi nhánh: Router Gateway DrayTek, Switch Cisco 48P, NAS Backup & UPS 2.2kVA',
    maxPowerWatts: 3000,
    currentWatts: 1150,
    powerCalcMode: 'AUTO',
    temperatureC: 24.8,
    tempWarningThresholdC: 32.0,
    humidityPct: 52,
    locationNote: 'Văn phòng Chi Nhánh - Phòng Kỹ Thuật',
    isPreset: true,
    units: [
      {
        id: 'u-26',
        uPosition: 26,
        uHeight: 1,
        deviceType: 'PATCH_PANEL',
        name: 'Patch Panel Cat6 24 Ports CommScope',
        brand: 'CommScope',
        model: 'Cat6-24P',
        status: 'ONLINE',
      },
      {
        id: 'u-24',
        uPosition: 24,
        uHeight: 1,
        deviceType: 'SWITCH',
        name: 'Switch Quản Lý 48-Port PoE+ Cisco Business CBS350',
        brand: 'Cisco',
        model: 'CBS350-48P-4G',
        assetTag: 'NET-SW-CBS48',
        ipAddress: '192.168.2.2',
        powerWatts: 370,
        portsCount: 48,
        status: 'ONLINE',
        notes: 'Cấp nguồn PoE cho 12 Access Point WiFi & Camera văn phòng',
      },
      {
        id: 'u-22',
        uPosition: 22,
        uHeight: 1,
        deviceType: 'ROUTER',
        name: 'Router Cân Bằng Tải Internet Doanh Nghiệp DrayTek Vigor 3910 (10G)',
        brand: 'DrayTek',
        model: 'Vigor 3910',
        assetTag: 'NET-GW-3910',
        ipAddress: '192.168.2.1',
        powerWatts: 60,
        status: 'ONLINE',
        notes: 'Cân bằng tải 3 đường truyền FTTH VNPT/Viettel/FPT + VPN Site-to-Site về Trụ sở',
      },
      {
        id: 'u-19',
        uPosition: 19,
        uHeight: 1,
        deviceType: 'STORAGE',
        name: 'Thiết Bị Lưu Trữ Backup Chi Nhánh Synology RS822+ 1U',
        brand: 'Synology',
        model: 'RS822+',
        assetTag: 'NAS-SYN-822',
        ipAddress: '192.168.2.50',
        powerWatts: 75,
        status: 'ONLINE',
        notes: 'Sao lưu dữ liệu máy tính người dùng văn phòng hàng ngày',
      },
      {
        id: 'u-17',
        uPosition: 17,
        uHeight: 1,
        deviceType: 'SWITCH',
        name: 'Switch Phụ 24-Port Gigabit TP-Link JetStream',
        brand: 'TP-Link',
        model: 'TL-SG3428',
        assetTag: 'NET-SW-TPL24',
        ipAddress: '192.168.2.3',
        powerWatts: 45,
        portsCount: 24,
        status: 'ONLINE',
      },
      {
        id: 'u-1',
        uPosition: 1,
        uHeight: 2,
        deviceType: 'UPS',
        name: 'Bộ Lưu Điện UPS APC Smart-UPS 2200VA Rackmount 2U',
        brand: 'APC by Schneider',
        model: 'SMT2200RMI2U',
        assetTag: 'PWR-UPS-2KVA',
        ipAddress: '192.168.2.200',
        powerWatts: 1980,
        status: 'ONLINE',
        notes: 'Lưu điện dự phòng 30 phút cho hệ thống mạng chi nhánh',
      },
    ],
  },
  {
    id: 'tpl-rack-15u-floor',
    name: 'Tủ Rack 15U - Treo Tường Phân Phối Tầng Văn Phòng',
    code: 'RCK-15U-FL03',
    totalU: 15,
    category: 'Phân Phối Tầng (Access)',
    brand: 'Ecopac 15U Wallmount',
    description: 'Tủ mạng phân phối từng tầng làm việc: Patch Panel 24P, Access Switch PoE 24P cấp WiFi & UPS 1kVA',
    maxPowerWatts: 1500,
    currentWatts: 460,
    powerCalcMode: 'AUTO',
    temperatureC: 25.2,
    tempWarningThresholdC: 34.0,
    humidityPct: 55,
    locationNote: 'Hành Lang Tầng 3 - Cạnh Thang Máy',
    isPreset: true,
    units: [
      {
        id: 'u-14',
        uPosition: 14,
        uHeight: 1,
        deviceType: 'PATCH_PANEL',
        name: 'Patch Panel Cat6 24 Ports',
        brand: 'CommScope',
        model: 'Cat6-24P',
        status: 'ONLINE',
      },
      {
        id: 'u-12',
        uPosition: 12,
        uHeight: 1,
        deviceType: 'SWITCH',
        name: 'Access Switch PoE 24-Port Aruba Instant On 1930',
        brand: 'HPE Aruba',
        model: 'JL683A',
        assetTag: 'NET-SW-ARU1930',
        ipAddress: '192.168.3.2',
        powerWatts: 195,
        status: 'ONLINE',
        notes: 'Cấp nguồn PoE cho hệ thống điện thoại IP Phone và WiFi tầng',
      },
      {
        id: 'u-10',
        uPosition: 10,
        uHeight: 1,
        deviceType: 'CABLE_MGMT',
        name: 'Thanh Quản Lý Cáp Ngang 1U D-Rack',
        brand: 'D-Rack',
        status: 'ONLINE',
      },
      {
        id: 'u-1',
        uPosition: 1,
        uHeight: 2,
        deviceType: 'UPS',
        name: 'Bộ Lưu Điện UPS Santak Rack 1KVA Online (2U)',
        brand: 'Santak',
        model: 'C1K-Rack',
        assetTag: 'PWR-UPS-1KVA',
        powerWatts: 900,
        status: 'ONLINE',
        notes: 'Dự phòng 20 phút khi mất điện nguồn tầng',
      },
    ],
  },
  {
    id: 'tpl-rack-9u-cctv',
    name: 'Tủ Rack 9U - Tủ Camera Giám Sát & An Ninh CCTV',
    code: 'RCK-9U-CCTV01',
    totalU: 9,
    category: 'An Ninh & Giám Sát (CCTV)',
    brand: 'Toten 9U Wallmount D600',
    description: 'Tủ chuyên dụng hệ thống an ninh: Đầu ghi NVR Hikvision 32 kênh, Switch PoE 16P cấp nguồn Camera, UPS 1kVA',
    maxPowerWatts: 1000,
    currentWatts: 320,
    powerCalcMode: 'AUTO',
    temperatureC: 26.5,
    tempWarningThresholdC: 35.0,
    humidityPct: 58,
    locationNote: 'Phòng Bảo Vệ / Kiểm Soát An Ninh',
    isPreset: true,
    units: [
      {
        id: 'u-8',
        uPosition: 8,
        uHeight: 1,
        deviceType: 'PATCH_PANEL',
        name: 'Patch Panel Cat6 16 Ports',
        brand: 'AMP',
        status: 'ONLINE',
      },
      {
        id: 'u-6',
        uPosition: 6,
        uHeight: 1,
        deviceType: 'SWITCH',
        name: 'Switch PoE Chuyên Dụng Camera Hikvision 16 Ports',
        brand: 'Hikvision',
        model: 'DS-3E0318P-E',
        assetTag: 'CCTV-SW-16P',
        ipAddress: '192.168.100.2',
        powerWatts: 150,
        status: 'ONLINE',
      },
      {
        id: 'u-3',
        uPosition: 3,
        uHeight: 2,
        deviceType: 'STORAGE',
        name: 'Đầu Ghi Hình NVR Hikvision 32 Kênh 4K 4 Khay HDD (2U)',
        brand: 'Hikvision',
        model: 'DS-7732NI-K4',
        assetTag: 'CCTV-NVR-32CH',
        ipAddress: '192.168.100.10',
        powerWatts: 80,
        status: 'ONLINE',
        notes: 'Lưu trữ 30 ngày cho 24 Camera an ninh toàn tòa nhà',
      },
      {
        id: 'u-1',
        uPosition: 1,
        uHeight: 1,
        deviceType: 'UPS',
        name: 'Bộ Lưu Điện UPS APC Back-UPS Pro 900VA',
        brand: 'APC',
        model: 'BR900GI',
        assetTag: 'PWR-UPS-CCTV',
        powerWatts: 540,
        status: 'ONLINE',
      },
    ],
  },
];

async function getStoredRacks(): Promise<any[]> {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: RACKS_SETTING_KEY },
  });

  if (!setting || !setting.value) {
    try {
      await prisma.systemSetting.upsert({
        where: { key: RACKS_SETTING_KEY },
        create: {
          key: RACKS_SETTING_KEY,
          value: JSON.stringify(DEFAULT_PRESET_RACKS),
          type: 'JSON',
          group: 'inventory',
          label: 'Danh sách Tủ Rack Mạng Hệ Thống',
          description: 'Lưu trữ toàn bộ tủ rack mạng, data center và thông số công suất, nhiệt độ',
        },
        update: {},
      });
    } catch {}
    return DEFAULT_PRESET_RACKS;
  }

  try {
    const list = JSON.parse(setting.value);
    return Array.isArray(list) && list.length > 0 ? list : DEFAULT_PRESET_RACKS;
  } catch {
    return DEFAULT_PRESET_RACKS;
  }
}

async function saveStoredRacks(racks: any[]): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { key: RACKS_SETTING_KEY },
    create: {
      key: RACKS_SETTING_KEY,
      value: JSON.stringify(racks),
      type: 'JSON',
      group: 'inventory',
      label: 'Danh sách Tủ Rack Mạng Hệ Thống',
      description: 'Lưu trữ toàn bộ tủ rack mạng, data center và thông số công suất, nhiệt độ',
    },
    update: {
      value: JSON.stringify(racks),
    },
  });
}

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const racks = await getStoredRacks();
    return NextResponse.json({ success: true, data: racks });
  } catch (error: any) {
    console.error('Get racks error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi tải danh sách tủ rack' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      code,
      totalU = 42,
      category = 'Tủ Tùy Chỉnh',
      brand = '',
      description = '',
      maxPowerWatts = 5000,
      currentWatts = 0,
      powerCalcMode = 'AUTO',
      temperatureC = 24.0,
      tempWarningThresholdC = 32.0,
      humidityPct = 50,
      locationNote = '',
      units = [],
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Tên tủ rack không được để trống' }, { status: 400 });
    }

    const racks = await getStoredRacks();
    const newRack = {
      id: `rack-${Date.now()}`,
      name: name.trim(),
      code: code?.trim() || `RCK-${totalU}U-${Math.floor(100 + Math.random() * 900)}`,
      totalU: Number(totalU) || 42,
      category: category.trim() || 'Tủ Tùy Chỉnh',
      brand: brand.trim() || 'Custom Rack Cabinet',
      description: description.trim() || '',
      maxPowerWatts: Number(maxPowerWatts) || 5000,
      currentWatts: Number(currentWatts) || 0,
      powerCalcMode: powerCalcMode || 'AUTO',
      temperatureC: Number(temperatureC) || 24.0,
      tempWarningThresholdC: Number(tempWarningThresholdC) || 32.0,
      humidityPct: Number(humidityPct) || 50,
      locationNote: locationNote.trim() || '',
      isPreset: false,
      units: units || [],
      createdAt: new Date().toISOString(),
    };

    const updatedList = [newRack, ...racks];
    await saveStoredRacks(updatedList);

    return NextResponse.json({
      success: true,
      data: newRack,
      message: 'Đã lưu tủ rack mới vào thư viện hệ thống thành công!',
    });
  } catch (error: any) {
    console.error('Create rack error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi tạo tủ rack' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Thiếu ID tủ rack cần cập nhật' }, { status: 400 });
    }

    const racks = await getStoredRacks();
    let found = false;

    const updatedList = racks.map((r) => {
      if (r.id === id) {
        found = true;
        const units = updateData.units !== undefined ? updateData.units : r.units || [];
        const mode = updateData.powerCalcMode || r.powerCalcMode || 'AUTO';
        let calculatedWatts = updateData.currentWatts !== undefined ? Number(updateData.currentWatts) : r.currentWatts;

        if (mode === 'AUTO' && units.length > 0) {
          calculatedWatts = units.reduce((acc: number, u: any) => acc + (Number(u.powerWatts) || 0), 0);
        }

        return {
          ...r,
          ...updateData,
          units,
          powerCalcMode: mode,
          currentWatts: calculatedWatts,
          updatedAt: new Date().toISOString(),
        };
      }
      return r;
    });

    if (!found) {
      const newCustom = {
        id,
        ...updateData,
        createdAt: new Date().toISOString(),
      };
      updatedList.unshift(newCustom);
    }

    await saveStoredRacks(updatedList);
    const updatedItem = updatedList.find((r) => r.id === id);

    return NextResponse.json({
      success: true,
      data: updatedItem,
      message: 'Đã cập nhật thông số và công suất tủ rack thành công!',
    });
  } catch (error: any) {
    console.error('Update rack error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi cập nhật tủ rack' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Thiếu ID tủ rack cần xóa' }, { status: 400 });
    }

    const racks = await getStoredRacks();
    const updatedList = racks.filter((r) => r.id !== id);
    await saveStoredRacks(updatedList);

    return NextResponse.json({
      success: true,
      message: 'Đã xóa tủ rack khỏi danh mục hệ thống!',
    });
  } catch (error: any) {
    console.error('Delete rack error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi xóa tủ rack' }, { status: 500 });
  }
}
