'use client';

import React, { useState, useEffect, useRef } from 'react';
import { EnterpriseFeatureLock } from '@/components/common/EnterpriseFeatureLock';
import { useLanguage } from '@/lib/i18n/context';
import {
  Map,
  Layers,
  Plus,
  Save,
  Trash2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Search,
  Laptop,
  Printer,
  Server,
  Wifi,
  Monitor,
  HardDrive,
  Info,
  CheckCircle2,
  X,
  Loader2,
  Building,
  Upload,
  Eye,
  Maximize2,
  Crosshair,
  Smartphone,
  Network,
  Camera,
  Fingerprint,
  Zap,
  Tv,
  Barcode,
  Cpu,
  Keyboard,
  Mouse,
  Headphones,
  Plug,
  Tablet,
  Copy,
  ExternalLink,
  Shield,
  Sliders,
  Activity,
  Box,
  Share2,
  FileSpreadsheet,
  Settings,
  AlertTriangle,
  Flame,
  Radio,
  Power,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

// ==================== TYPE DEFINITIONS ====================

type DeviceRackType =
  | 'SERVER'
  | 'SWITCH'
  | 'ROUTER'
  | 'FIREWALL'
  | 'PATCH_PANEL'
  | 'STORAGE'
  | 'UPS'
  | 'PDU'
  | 'KVM'
  | 'CABLE_MGMT'
  | 'BLANK'
  | 'OTHER';

interface RackUnitDevice {
  id: string;
  uPosition: number; // 1 to totalU (1 is bottom, 42 is top in standard, or U-index)
  uHeight: number; // 1U, 2U, 3U, 4U
  deviceType: DeviceRackType;
  name: string;
  brand?: string;
  model?: string;
  assetId?: string;
  assetTag?: string;
  ipAddress?: string;
  powerWatts?: number;
  status?: 'ONLINE' | 'STANDBY' | 'MAINTENANCE' | 'OFFLINE';
  portsCount?: number;
  notes?: string;
}

interface RackCabinetData {
  id: string;
  name: string;
  code: string;
  totalU: number; // e.g. 42, 27, 15, 12, 9, 6
  brand?: string;
  model?: string;
  category?: string;
  description?: string;
  locationNote?: string;
  maxPowerWatts?: number;
  currentWatts?: number;
  powerCalcMode?: 'AUTO' | 'MANUAL'; // AUTO: sum of devices, MANUAL: meter override
  temperatureC?: number;
  tempWarningThresholdC?: number;
  humidityPct?: number;
  isPreset?: boolean;
  units: RackUnitDevice[];
}

interface FloorMarker {
  id: string;
  markerType?: 'ASSET' | 'RACK';
  assetId?: string;
  assetTag?: string;
  name: string;
  categoryName?: string;
  brand?: string;
  status: string;
  assignedUser?: string;
  department?: string;
  x: number; // percentage (0 - 100)
  y: number; // percentage (0 - 100)
  iconType?: string;
  rackData?: RackCabinetData;
}

interface FloorMapItem {
  id: string;
  name: string;
  locationId?: string;
  location?: { id: string; name: string; building?: string; floor?: string };
  imageUrl: string;
  markers: FloorMarker[];
  createdAt: string;
}

// ==================== PRESET RACK TEMPLATES ====================

const PRESET_RACK_TEMPLATES: Array<{
  id: string;
  name: string;
  code: string;
  totalU: number;
  category: string;
  brand: string;
  description: string;
  maxPowerWatts: number;
  currentWatts: number;
  temperatureC: number;
  units: RackUnitDevice[];
}> = [
  {
    id: 'tpl-rack-42u-datacenter',
    name: 'Tủ Rack 42U - Trung Tâm Dữ Liệu & Core Network',
    code: 'RCK-42U-DC01',
    totalU: 42,
    category: 'Data Center & Core Server',
    brand: 'APC NetShelter SX 42U 19"',
    description: 'Tủ rack máy chủ 42U tiêu chuẩn DC: Switch Core Cisco, Firewall FortiGate HA, Server Dell R750 & UPS RT 5kVA',
    maxPowerWatts: 5000,
    currentWatts: 2850,
    temperatureC: 23.5,
    units: [
      {
        id: 'u-41',
        uPosition: 41,
        uHeight: 2,
        deviceType: 'PATCH_PANEL',
        name: 'Hộp Đấu Nối Quang ODF 48 Core SC/APC + Quản Lý Cáp',
        brand: 'CommScope',
        model: 'ODF-48F-19',
        status: 'ONLINE',
        notes: 'Đường cáp quang trục chính kết nối các tầng',
      },
      {
        id: 'u-39',
        uPosition: 39,
        uHeight: 1,
        deviceType: 'SWITCH',
        name: 'Core Switch Cisco Catalyst 9300 48-Port PoE+ Layer 3',
        brand: 'Cisco',
        model: 'C9300-48P',
        assetTag: 'NET-SW-9300',
        ipAddress: '192.168.1.1',
        powerWatts: 450,
        portsCount: 48,
        status: 'ONLINE',
        notes: 'VLAN 10-Mgmt, VLAN 20-Server, VLAN 30-Client',
      },
      {
        id: 'u-37',
        uPosition: 37,
        uHeight: 1,
        deviceType: 'FIREWALL',
        name: 'Tường Lửa Doanh Nghiệp FortiGate 200F (Node Master HA)',
        brand: 'Fortinet',
        model: 'FG-200F',
        assetTag: 'SEC-FW-200F-01',
        ipAddress: '192.168.1.254',
        powerWatts: 180,
        status: 'ONLINE',
        notes: 'Cụm Firewall HA Active - Kiểm soát VPN & IPS',
      },
      {
        id: 'u-35',
        uPosition: 35,
        uHeight: 1,
        deviceType: 'FIREWALL',
        name: 'Tường Lửa Dự Phòng FortiGate 200F (Node Standby HA)',
        brand: 'Fortinet',
        model: 'FG-200F',
        assetTag: 'SEC-FW-200F-02',
        ipAddress: '192.168.1.253',
        powerWatts: 175,
        status: 'STANDBY',
        notes: 'Sẵn sàng tự động chuyển đổi khi Node 01 lỗi',
      },
      {
        id: 'u-33',
        uPosition: 33,
        uHeight: 1,
        deviceType: 'SWITCH',
        name: 'Distribution Switch 10Gbps SFP+ Ruijie RG-S5750C',
        brand: 'Ruijie Networks',
        model: 'RG-S5750C-28SFP',
        assetTag: 'NET-SW-SFP10G',
        ipAddress: '192.168.1.2',
        powerWatts: 220,
        portsCount: 28,
        status: 'ONLINE',
      },
      {
        id: 'u-31',
        uPosition: 31,
        uHeight: 1,
        deviceType: 'PATCH_PANEL',
        name: 'Patch Panel Đồng Cat6 48 Ports CommScope AMP',
        brand: 'CommScope',
        model: 'Cat6-48P',
        status: 'ONLINE',
      },
      {
        id: 'u-27',
        uPosition: 27,
        uHeight: 2,
        deviceType: 'SERVER',
        name: 'Máy Chủ Cơ Sở Dữ Liệu Dell PowerEdge R750 2U (Database Server)',
        brand: 'Dell Technologies',
        model: 'PowerEdge R750',
        assetTag: 'SRV-DB-R750-01',
        ipAddress: '192.168.10.10',
        powerWatts: 680,
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
    maxPowerWatts: 2500,
    currentWatts: 1150,
    temperatureC: 24.8,
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
    maxPowerWatts: 1200,
    currentWatts: 460,
    temperatureC: 25.2,
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
        name: 'Access Switch 24-Port Gigabit PoE+ Cisco Catalyst 1000',
        brand: 'Cisco',
        model: 'C1000-24P-4G',
        assetTag: 'NET-SW-C1000',
        ipAddress: '192.168.3.2',
        powerWatts: 195,
        portsCount: 24,
        status: 'ONLINE',
        notes: 'Cấp mạng LAN bàn làm việc và nguồn PoE cho 6 WiFi AP tầng 3',
      },
      {
        id: 'u-10',
        uPosition: 10,
        uHeight: 1,
        deviceType: 'CABLE_MGMT',
        name: 'Thanh Quản Lý Cáp Mạng Ngang 1U',
        brand: 'Vietrack',
        model: 'CM-1U',
        status: 'ONLINE',
      },
      {
        id: 'u-8',
        uPosition: 8,
        uHeight: 1,
        deviceType: 'ROUTER',
        name: 'Router Cổng Biên Phụ MikroTik RB4011',
        brand: 'MikroTik',
        model: 'RB4011iGS+',
        assetTag: 'NET-GW-RB4011',
        ipAddress: '192.168.3.1',
        powerWatts: 35,
        status: 'ONLINE',
      },
      {
        id: 'u-1',
        uPosition: 1,
        uHeight: 2,
        deviceType: 'UPS',
        name: 'Bộ Lưu Điện UPS Santak Rackmount 1000VA (2U)',
        brand: 'Santak',
        model: 'C1KR',
        assetTag: 'PWR-UPS-1KVA',
        powerWatts: 900,
        status: 'ONLINE',
        notes: 'Lưu điện cho Switch và AP khi mất điện lưới',
      },
    ],
  },
  {
    id: 'tpl-rack-9u-cctv',
    name: 'Tủ Rack 9U - Hệ Thống Camera An Ninh CCTV & NVR',
    code: 'RCK-9U-CCTV01',
    totalU: 9,
    category: 'Camera & An Ninh',
    brand: 'Toten 9U Wallmount',
    description: 'Tủ mạng chuyên dụng CCTV: Đầu ghi hình NVR 32 kênh Hikvision, Switch PoE Camera 16P & UPS 1000VA',
    maxPowerWatts: 800,
    currentWatts: 340,
    temperatureC: 26.0,
    units: [
      {
        id: 'u-8',
        uPosition: 8,
        uHeight: 2,
        deviceType: 'STORAGE',
        name: 'Đầu Ghi Hình Camera NVR 32 Kênh 4K Hikvision (4 HDD)',
        brand: 'Hikvision',
        model: 'DS-7732NI-K4',
        assetTag: 'CCTV-NVR-32CH',
        ipAddress: '192.168.5.10',
        powerWatts: 80,
        status: 'ONLINE',
        notes: '4x 8TB HDD Western Purple ghi hình liên tục 30 ngày',
      },
      {
        id: 'u-6',
        uPosition: 6,
        uHeight: 1,
        deviceType: 'SWITCH',
        name: 'Switch Chuyên Dụng Camera PoE 16-Port Gigabit Hikvision',
        brand: 'Hikvision',
        model: 'DS-3E1518P-EI',
        assetTag: 'CCTV-SW-16P',
        ipAddress: '192.168.5.2',
        powerWatts: 230,
        portsCount: 16,
        status: 'ONLINE',
        notes: 'Cấp nguồn PoE tầm xa 250m cho 16 Camera an ninh',
      },
      {
        id: 'u-4',
        uPosition: 4,
        uHeight: 1,
        deviceType: 'PATCH_PANEL',
        name: 'Patch Panel Cat6 16 Ports',
        brand: 'CommScope',
        model: 'Cat6-16P',
        status: 'ONLINE',
      },
      {
        id: 'u-1',
        uPosition: 1,
        uHeight: 2,
        deviceType: 'UPS',
        name: 'Bộ Lưu Điện UPS Online 1000VA (2U)',
        brand: 'APC by Schneider',
        model: 'SRV1KI-E',
        assetTag: 'PWR-UPS-CCTV',
        powerWatts: 800,
        status: 'ONLINE',
        notes: 'Đảm bảo camera luôn ghi hình kể cả khi mất điện',
      },
    ],
  },
];

const DEFAULT_MAP_TEMPLATES = [
  {
    name: 'Văn Phòng Mở & Phòng Họp (Open Workspace)',
    category: 'Văn Phòng Hiện Đại',
    imageUrl: '/templates/floorplan_open_office.svg',
    description: 'Bố trí 24 bàn làm việc, Phòng IT, Phòng Họp lớn, Phòng Giám đốc & Pantry',
  },
  {
    name: 'Trung Tâm Dữ Liệu & Phòng Trực NOC 24/7 (Data Center)',
    category: 'Máy Chủ & NOC',
    imageUrl: '/templates/floorplan_datacenter_noc.svg',
    description: 'Bố trí 8 Tủ Rack Server, Điều hòa chính xác CRAC, Hành lang lạnh/nóng, Video Wall NOC',
  },
  {
    name: 'Trụ Sở Doanh Nghiệp Đa Phòng Ban (Corporate HQ)',
    category: 'Trụ Sở Đa Phòng',
    imageUrl: '/templates/floorplan_corporate_hq.svg',
    description: 'Bao gồm Ban Giám Đốc, Kế toán, Kinh doanh, Phòng IT, Boardroom & Lễ tân',
  },
  {
    name: 'Chi Nhánh Giao Dịch & Bán Lẻ (Branch Retail & Bank)',
    category: 'Chi Nhánh',
    imageUrl: '/templates/floorplan_branch_retail.svg',
    description: 'Quầy Teller giao dịch, Back-office, Phòng Két sắt & Tủ mạng chi nhánh',
  },
  {
    name: 'Kho Vận Logistics & Nhà Xưởng (Warehouse & Factory)',
    category: 'Kho Vận & Xưởng',
    imageUrl: '/templates/floorplan_warehouse_logistics.svg',
    description: 'Cửa nhập xuất Docks, Kệ kho High-Bay, Điều hành kho & Trạm máy quét Barcode',
  },
];

export default function FloorMapsPage() {
  const { language, t } = useLanguage();
  const isEn = language === 'en';
  const [isEnterprise, setIsEnterprise] = useState<boolean | null>(null);
  const [activeModules, setActiveModules] = useState<string[]>([]);
  const isModActive = (mod: string) => Boolean(isEnterprise) && (activeModules.length === 0 || activeModules.includes(mod) || activeModules.includes('*'));

  const fetchLicense = () => {
    fetch('/api/license')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.isEnterprise) {
          setIsEnterprise(true);
          setActiveModules(Array.isArray(data.modules) ? data.modules : []);
        } else {
          setIsEnterprise(false);
          setActiveModules([]);
        }
      })
      .catch(() => setIsEnterprise(false));
  };

  useEffect(() => {
    fetchLicense();
    const handleUpdate = () => fetchLicense();
    window.addEventListener('simply:license-updated', handleUpdate);
    return () => window.removeEventListener('simply:license-updated', handleUpdate);
  }, []);

  const [maps, setMaps] = useState<FloorMapItem[]>([]);
  const [activeMap, setActiveMap] = useState<FloorMapItem | null>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Map Canvas Controls
  const [zoom, setZoom] = useState(1);
  const [selectedMarker, setSelectedMarker] = useState<FloorMarker | null>(null);
  const [isPlacingAsset, setIsPlacingAsset] = useState<any | null>(null);
  const [isPlacingRack, setIsPlacingRack] = useState<RackCabinetData | null>(null);
  const [draggingMarkerId, setDraggingMarkerId] = useState<string | null>(null);
  const [searchAsset, setSearchAsset] = useState('');
  const [searchRack, setSearchRack] = useState('');
  const [rightTab, setRightTab] = useState<'ASSETS' | 'RACKS'>('RACKS');

  // Rack Detail Modal / Drawer
  const [viewingRackMarker, setViewingRackMarker] = useState<FloorMarker | null>(null);
  const [isAddDeviceModalOpen, setIsAddDeviceModalOpen] = useState(false);
  const [targetSlotU, setTargetSlotU] = useState<number>(1);
  const [newDeviceForm, setNewDeviceForm] = useState<{
    name: string;
    deviceType: DeviceRackType;
    brand: string;
    model: string;
    assetId: string;
    assetTag: string;
    ipAddress: string;
    powerWatts: number;
    uHeight: number;
    notes: string;
  }>({
    name: '',
    deviceType: 'SERVER',
    brand: '',
    model: '',
    assetId: '',
    assetTag: '',
    ipAddress: '',
    powerWatts: 150,
    uHeight: 1,
    notes: '',
  });

  // Create Custom Rack Modal
  const [isCreateRackModalOpen, setIsCreateRackModalOpen] = useState(false);

  // Dynamic Rack Library (loaded from DB / API)
  const [rackLibrary, setRackLibrary] = useState<RackCabinetData[]>(PRESET_RACK_TEMPLATES as any);
  const [loadingRacks, setLoadingRacks] = useState(false);

  // Edit Rack Modal State
  const [isEditRackModalOpen, setIsEditRackModalOpen] = useState(false);
  const [editingRack, setEditingRack] = useState<RackCabinetData | null>(null);
  const [editRackForm, setEditRackForm] = useState<{
    name: string;
    code: string;
    totalU: number;
    brand: string;
    category: string;
    description: string;
    locationNote: string;
    maxPowerWatts: number;
    currentWatts: number;
    powerCalcMode: 'AUTO' | 'MANUAL';
    temperatureC: number;
    tempWarningThresholdC: number;
    humidityPct: number;
  }>({
    name: '',
    code: '',
    totalU: 42,
    brand: '',
    category: '',
    description: '',
    locationNote: '',
    maxPowerWatts: 5000,
    currentWatts: 0,
    powerCalcMode: 'AUTO',
    temperatureC: 24.0,
    tempWarningThresholdC: 32.0,
    humidityPct: 50,
  });
  const [customRackName, setCustomRackName] = useState('');
  const [customRackCode, setCustomRackCode] = useState('');
  const [customRackTotalU, setCustomRackTotalU] = useState<number>(42);
  const [customRackBrand, setCustomRackBrand] = useState('APC NetShelter');
  const [customRackNotes, setCustomRackNotes] = useState('');

  // Create Floor Map Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newMapName, setNewMapName] = useState('');
  const [newMapLocationId, setNewMapLocationId] = useState('');
  const [newMapImageUrl, setNewMapImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  // Context Menu (Right Click)
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    marker: FloorMarker;
  } | null>(null);

  useEffect(() => {
    const handleGlobalClick = () => setContextMenu(null);
    window.addEventListener('click', handleGlobalClick);
    window.addEventListener('scroll', handleGlobalClick);
    return () => {
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('scroll', handleGlobalClick);
    };
  }, []);

  const mapContainerRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resMaps, resAssets, resLocs] = await Promise.all([
        fetch('/api/floor-maps').then((r) => r.json()),
        fetch('/api/assets?limit=200').then((r) => r.json()),
        fetch('/api/locations').then((r) => r.json()),
      ]);

      if (resMaps.success && Array.isArray(resMaps.data)) {
        let loadedMaps = resMaps.data;
        if (loadedMaps.length === 0) {
          // Create initial sample map
          const createRes = await fetch('/api/floor-maps', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: 'Tầng 3 - Sơ Đồ Văn Phòng IT & Khối Kỹ Thuật',
              imageUrl: DEFAULT_MAP_TEMPLATES[0].imageUrl,
              markers: [],
            }),
          });
          const createdData = await createRes.json();
          if (createdData.success) {
            loadedMaps = [createdData.data];
          }
        }
        setMaps(loadedMaps);
        setActiveMap(loadedMaps[0] || null);
      }

      if (resAssets.data || Array.isArray(resAssets)) {
        const astList = resAssets.data || resAssets;
        setAssets(Array.isArray(astList) ? astList : []);
      }

      if (resLocs.data || Array.isArray(resLocs)) {
        const locList = resLocs.data || resLocs;
        setLocations(Array.isArray(locList) ? locList : []);
      }
    } catch (e) {
      console.error('Error loading floor maps:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Handle map click to place asset marker OR rack marker
  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!activeMap || !mapContainerRef.current) return;

    const rect = mapContainerRef.current.getBoundingClientRect();
    const x = Math.max(2, Math.min(98, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(2, Math.min(98, ((e.clientY - rect.top) / rect.height) * 100));

    // 1. Placing Network Rack Cabinet
    if (isPlacingRack) {
      const newRackMarker: FloorMarker = {
        id: `rack-marker-${Date.now()}`,
        markerType: 'RACK',
        name: isPlacingRack.name,
        categoryName: 'Tủ Rack Mạng',
        brand: isPlacingRack.brand || 'APC',
        status: 'AVAILABLE',
        x: Number(x.toFixed(2)),
        y: Number(y.toFixed(2)),
        rackData: isPlacingRack,
      };

      const updatedMarkers = [...(activeMap.markers || []), newRackMarker];
      setActiveMap({ ...activeMap, markers: updatedMarkers });
      setIsPlacingRack(null);
      showToast(`🗄️ Đã ghim [${isPlacingRack.name}] lên sơ đồ mặt bằng! Bấm "Lưu Sơ Đồ" để áp dụng.`);
      return;
    }

    // 2. Placing Individual Device Asset
    if (isPlacingAsset) {
      const newMarker: FloorMarker = {
        id: `marker-${Date.now()}`,
        markerType: 'ASSET',
        assetId: isPlacingAsset.id,
        assetTag: isPlacingAsset.assetTag,
        name: isPlacingAsset.name,
        categoryName: isPlacingAsset.category?.name || 'Thiết bị',
        brand: isPlacingAsset.brand || '',
        status: isPlacingAsset.status,
        assignedUser: isPlacingAsset.assignments?.[0]?.user?.fullName || 'Chưa gán',
        department: isPlacingAsset.assignments?.[0]?.user?.department || '',
        x: Number(x.toFixed(2)),
        y: Number(y.toFixed(2)),
      };

      const updatedMarkers = [...(activeMap.markers || []), newMarker];
      setActiveMap({ ...activeMap, markers: updatedMarkers });
      setIsPlacingAsset(null);
      showToast(`Đã ghim [${isPlacingAsset.assetTag}] lên sơ đồ mặt bằng! Bấm "Lưu Sơ Đồ" để áp dụng.`);
    }
  };

  // Dragging Marker Handler
  const handleMarkerDragStart = (e: React.MouseEvent, markerId: string) => {
    e.stopPropagation();
    setDraggingMarkerId(markerId);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggingMarkerId || !activeMap || !mapContainerRef.current) return;

    const rect = mapContainerRef.current.getBoundingClientRect();
    const x = Math.max(2, Math.min(98, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(2, Math.min(98, ((e.clientY - rect.top) / rect.height) * 100));

    const updatedMarkers = (activeMap.markers || []).map((m) =>
      m.id === draggingMarkerId ? { ...m, x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) } : m
    );

    setActiveMap({ ...activeMap, markers: updatedMarkers });
  };

  const handleMouseUp = () => {
    setDraggingMarkerId(null);
  };

  // Save changes to active map
  const handleSaveMap = async () => {
    if (!activeMap) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/floor-maps/${activeMap.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: activeMap.name,
          imageUrl: activeMap.imageUrl,
          markers: activeMap.markers,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('✅ Đã lưu toàn bộ tọa độ thiết bị và tủ rack thành công!');
        setMaps((prev) => prev.map((m) => (m.id === activeMap.id ? activeMap : m)));
      } else {
        showToast(`Lỗi: ${data.error}`);
      }
    } catch (e: any) {
      showToast(`Lỗi lưu sơ đồ: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Remove a marker from map
  const handleRemoveMarker = (markerId: string) => {
    if (!activeMap) return;
    const target = (activeMap.markers || []).find((m) => m.id === markerId);
    const updated = (activeMap.markers || []).filter((m) => m.id !== markerId);
    setActiveMap({ ...activeMap, markers: updated });
    if (selectedMarker?.id === markerId) setSelectedMarker(null);
    if (viewingRackMarker?.id === markerId) setViewingRackMarker(null);
    setContextMenu(null);
    showToast(`✅ Đã gỡ [${target?.name || target?.assetTag || 'Đối tượng'}] khỏi sơ đồ!`);
  };

  // Add Device into a Rack Slot
  const handleAddDeviceToRack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingRackMarker || !viewingRackMarker.rackData || !activeMap) return;

    const currentRack = viewingRackMarker.rackData;
    const newDevice: RackUnitDevice = {
      id: `dev-${Date.now()}`,
      uPosition: Number(targetSlotU),
      uHeight: Number(newDeviceForm.uHeight) || 1,
      deviceType: newDeviceForm.deviceType,
      name: newDeviceForm.name.trim(),
      brand: newDeviceForm.brand.trim(),
      model: newDeviceForm.model.trim(),
      assetId: newDeviceForm.assetId || undefined,
      assetTag: newDeviceForm.assetTag || undefined,
      ipAddress: newDeviceForm.ipAddress.trim() || undefined,
      powerWatts: Number(newDeviceForm.powerWatts) || 0,
      status: 'ONLINE',
      notes: newDeviceForm.notes.trim() || undefined,
    };

    // Remove any overlapping devices in this slot
    const updatedUnits = currentRack.units.filter(
      (u) =>
        !(
          (u.uPosition >= newDevice.uPosition && u.uPosition < newDevice.uPosition + newDevice.uHeight) ||
          (newDevice.uPosition >= u.uPosition && newDevice.uPosition < u.uPosition + u.uHeight)
        )
    );
    updatedUnits.push(newDevice);

    // Calculate updated total watts
    const newWatts = updatedUnits.reduce((acc, cur) => acc + (cur.powerWatts || 0), 0);

    const updatedRack: RackCabinetData = {
      ...currentRack,
      units: updatedUnits,
      currentWatts: newWatts,
    };

    const updatedMarker: FloorMarker = {
      ...viewingRackMarker,
      rackData: updatedRack,
    };

    const updatedMarkers = (activeMap.markers || []).map((m) =>
      m.id === viewingRackMarker.id ? updatedMarker : m
    );

    setActiveMap({ ...activeMap, markers: updatedMarkers });
    setViewingRackMarker(updatedMarker);
    setIsAddDeviceModalOpen(false);
    showToast(`✅ Đã lắp thiết bị [${newDevice.name}] vào U${newDevice.uPosition} của tủ rack!`);
  };

  // Remove Device from Rack Slot
  const handleRemoveDeviceFromRack = (deviceId: string) => {
    if (!viewingRackMarker || !viewingRackMarker.rackData || !activeMap) return;

    const currentRack = viewingRackMarker.rackData;
    const updatedUnits = currentRack.units.filter((u) => u.id !== deviceId);
    const newWatts = updatedUnits.reduce((acc, cur) => acc + (cur.powerWatts || 0), 0);

    const updatedRack: RackCabinetData = {
      ...currentRack,
      units: updatedUnits,
      currentWatts: newWatts,
    };

    const updatedMarker: FloorMarker = {
      ...viewingRackMarker,
      rackData: updatedRack,
    };

    const updatedMarkers = (activeMap.markers || []).map((m) =>
      m.id === viewingRackMarker.id ? updatedMarker : m
    );

    setActiveMap({ ...activeMap, markers: updatedMarkers });
    setViewingRackMarker(updatedMarker);
    showToast('✅ Đã gỡ thiết bị khỏi Tủ Rack!');
  };

  // Create Custom Rack Cabinet and Persist to Library
  const handleCreateCustomRack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customRackName.trim()) return;

    const newRackData = {
      name: customRackName.trim(),
      code: customRackCode.trim() || `RCK-${customRackTotalU}U-${Math.floor(100 + Math.random() * 900)}`,
      totalU: Number(customRackTotalU) || 42,
      category: 'Tủ Tùy Chỉnh',
      brand: customRackBrand.trim() || 'Custom Rack',
      locationNote: customRackNotes.trim() || 'Phòng Kỹ Thuật / NOC',
      maxPowerWatts: (Number(customRackTotalU) || 42) * 120,
      currentWatts: 0,
      powerCalcMode: 'AUTO' as const,
      temperatureC: 24.0,
      tempWarningThresholdC: 32.0,
      humidityPct: 50,
      units: [],
    };

    try {
      const res = await fetch('/api/floor-maps/racks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRackData),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setRackLibrary((prev) => [data.data, ...prev]);
        setIsPlacingRack(data.data);
        showToast(`✅ Đã lưu tủ [${data.data.name}] vào hệ thống! Nhấp vào sơ đồ để ghim.`);
      } else {
        const fallbackRack: RackCabinetData = {
          id: `rack-${Date.now()}`,
          ...newRackData,
          units: [],
        };
        setRackLibrary((prev) => [fallbackRack, ...prev]);
        setIsPlacingRack(fallbackRack);
        showToast(`🎯 Đã tạo [${fallbackRack.name}]! Nhấp vào sơ đồ để ghim.`);
      }
    } catch (err: any) {
      const fallbackRack: RackCabinetData = {
        id: `rack-${Date.now()}`,
        ...newRackData,
        units: [],
      };
      setRackLibrary((prev) => [fallbackRack, ...prev]);
      setIsPlacingRack(fallbackRack);
    }

    setIsCreateRackModalOpen(false);
    setCustomRackName('');
    setCustomRackCode('');
    setCustomRackBrand('');
    setCustomRackNotes('');
  };

  // Open Edit Rack Settings Modal
  const handleOpenEditRack = (rack: RackCabinetData) => {
    setEditingRack(rack);
    // Calculate current units power if in AUTO mode
    const units = rack.units || [];
    const autoWatts = units.reduce((acc, u) => acc + (u.powerWatts || 0), 0);
    const mode = rack.powerCalcMode || 'AUTO';

    setEditRackForm({
      name: rack.name || '',
      code: rack.code || '',
      totalU: rack.totalU || 42,
      brand: rack.brand || '',
      category: rack.category || 'Tủ Mạng & Server',
      description: rack.description || '',
      locationNote: rack.locationNote || '',
      maxPowerWatts: rack.maxPowerWatts || 5000,
      currentWatts: mode === 'AUTO' ? autoWatts : (rack.currentWatts || autoWatts),
      powerCalcMode: mode,
      temperatureC: rack.temperatureC || 24.0,
      tempWarningThresholdC: rack.tempWarningThresholdC || 32.0,
      humidityPct: rack.humidityPct || 50,
    });
    setIsEditRackModalOpen(true);
  };

  // Save Edited Rack Settings (updates Library & Active Map Markers)
  const handleSaveEditRack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRack) return;

    const units = editingRack.units || [];
    const autoWatts = units.reduce((acc, u) => acc + (u.powerWatts || 0), 0);
    const finalWatts = editRackForm.powerCalcMode === 'AUTO' ? autoWatts : Number(editRackForm.currentWatts);

    const updatedRack: RackCabinetData = {
      ...editingRack,
      name: editRackForm.name.trim(),
      code: editRackForm.code.trim(),
      totalU: Number(editRackForm.totalU) || 42,
      brand: editRackForm.brand.trim(),
      category: editRackForm.category.trim(),
      description: editRackForm.description.trim(),
      locationNote: editRackForm.locationNote.trim(),
      maxPowerWatts: Number(editRackForm.maxPowerWatts) || 5000,
      currentWatts: finalWatts,
      powerCalcMode: editRackForm.powerCalcMode,
      temperatureC: Number(editRackForm.temperatureC) || 24.0,
      tempWarningThresholdC: Number(editRackForm.tempWarningThresholdC) || 32.0,
      humidityPct: Number(editRackForm.humidityPct) || 50,
      units,
    };

    // 1. Update in Rack Library
    setRackLibrary((prev) => prev.map((r) => (r.id === updatedRack.id ? updatedRack : r)));

    // 2. Persist to API
    try {
      await fetch('/api/floor-maps/racks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedRack),
      });
    } catch (err) {
      console.error('Error updating rack in API:', err);
    }

    // 3. Update any corresponding marker on active map
    if (activeMap) {
      const updatedMarkers = (activeMap.markers || []).map((m) => {
        if (m.markerType === 'RACK' && m.rackData && (m.rackData.id === updatedRack.id || m.id === viewingRackMarker?.id)) {
          return {
            ...m,
            name: updatedRack.name,
            brand: updatedRack.brand,
            rackData: updatedRack,
          };
        }
        return m;
      });
      setActiveMap({ ...activeMap, markers: updatedMarkers });
    }

    // 4. Update viewingRackMarker if open
    if (viewingRackMarker && viewingRackMarker.rackData?.id === updatedRack.id) {
      setViewingRackMarker({
        ...viewingRackMarker,
        name: updatedRack.name,
        brand: updatedRack.brand,
        rackData: updatedRack,
      });
    }

    setIsEditRackModalOpen(false);
    showToast(`✅ Đã cập nhật thành công thông số tủ [${updatedRack.name}]!`);
  };

  // Delete Rack from Library
  const handleDeleteRackFromLibrary = async (rackId: string, rackName: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa tủ rack "${rackName}" khỏi danh mục hệ thống?`)) return;

    try {
      await fetch(`/api/floor-maps/racks?id=${encodeURIComponent(rackId)}`, { method: 'DELETE' });
      setRackLibrary((prev) => prev.filter((r) => r.id !== rackId));
      showToast(`✅ Đã xóa tủ rack [${rackName}] khỏi hệ thống!`);
    } catch (err: any) {
      setRackLibrary((prev) => prev.filter((r) => r.id !== rackId));
    }
  };

  // Helper get precise asset icon
  const getAssetIcon = (name: string = '', cat: string = '', brand: string = '', customIcon?: string) => {
    if (customIcon) {
      switch (customIcon) {
        case 'laptop': return <Laptop className="w-3.5 h-3.5" />;
        case 'desktop': return <Cpu className="w-3.5 h-3.5" />;
        case 'monitor': return <Monitor className="w-3.5 h-3.5" />;
        case 'printer': return <Printer className="w-3.5 h-3.5" />;
        case 'server': return <Server className="w-3.5 h-3.5" />;
        case 'network': return <Network className="w-3.5 h-3.5" />;
        case 'wifi': return <Wifi className="w-3.5 h-3.5" />;
        case 'camera': return <Camera className="w-3.5 h-3.5" />;
        case 'phone': return <Smartphone className="w-3.5 h-3.5" />;
        case 'tablet': return <Tablet className="w-3.5 h-3.5" />;
        case 'keyboard': return <Keyboard className="w-3.5 h-3.5" />;
        case 'mouse': return <Mouse className="w-3.5 h-3.5" />;
        case 'headphones': return <Headphones className="w-3.5 h-3.5" />;
        case 'plug': return <Plug className="w-3.5 h-3.5" />;
        case 'harddrive': return <HardDrive className="w-3.5 h-3.5" />;
        case 'ups': return <Zap className="w-3.5 h-3.5" />;
        case 'fingerprint': return <Fingerprint className="w-3.5 h-3.5" />;
        case 'tv': return <Tv className="w-3.5 h-3.5" />;
        case 'barcode': return <Barcode className="w-3.5 h-3.5" />;
      }
    }

    const s = `${name} ${cat} ${brand}`.toLowerCase();
    if (s.includes('chuột') || s.includes('mouse')) return <Mouse className="w-3.5 h-3.5" />;
    if (s.includes('bàn phím') || s.includes('keyboard')) return <Keyboard className="w-3.5 h-3.5" />;
    if (s.includes('headphone') || s.includes('tai nghe') || s.includes('loa')) return <Headphones className="w-3.5 h-3.5" />;
    if (s.includes('adapter') || s.includes('sạc') || s.includes('cáp')) return <Plug className="w-3.5 h-3.5" />;
    if (s.includes('ổ cứng') || s.includes('usb') || s.includes('ssd') || s.includes('hdd')) return <HardDrive className="w-3.5 h-3.5" />;
    if (s.includes('tablet') || s.includes('ipad')) return <Tablet className="w-3.5 h-3.5" />;
    if (s.includes('print') || s.includes('máy in') || s.includes('scan')) return <Printer className="w-3.5 h-3.5" />;
    if (s.includes('server') || s.includes('máy chủ') || s.includes('storage') || s.includes('nas')) return <Server className="w-3.5 h-3.5" />;
    if (s.includes('wifi') || s.includes('ap') || s.includes('access point')) return <Wifi className="w-3.5 h-3.5" />;
    if (s.includes('switch') || s.includes('router') || s.includes('firewall') || s.includes('cisco')) return <Network className="w-3.5 h-3.5" />;
    if (s.includes('camera') || s.includes('cctv') || s.includes('nvr')) return <Camera className="w-3.5 h-3.5" />;
    if (s.includes('phone') || s.includes('điện thoại')) return <Smartphone className="w-3.5 h-3.5" />;
    if (s.includes('chấm công') || s.includes('vân tay')) return <Fingerprint className="w-3.5 h-3.5" />;
    if (s.includes('ups') || s.includes('lưu điện')) return <Zap className="w-3.5 h-3.5" />;
    if (s.includes('tivi') || s.includes('tv') || s.includes('máy chiếu')) return <Tv className="w-3.5 h-3.5" />;
    if (s.includes('barcode') || s.includes('mã vạch')) return <Barcode className="w-3.5 h-3.5" />;
    if (s.includes('màn hình') || s.includes('monitor')) return <Monitor className="w-3.5 h-3.5" />;
    if (s.includes('pc') || s.includes('desktop') || s.includes('đồng bộ')) return <Cpu className="w-3.5 h-3.5" />;
    return <Laptop className="w-3.5 h-3.5" />;
  };

  // Helper get Device Badge color in visual rack
  const getDeviceVisualTheme = (type: DeviceRackType) => {
    switch (type) {
      case 'SERVER':
        return {
          bg: 'bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900',
          border: 'border-indigo-500/50',
          badge: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30',
          icon: <Server className="w-3.5 h-3.5 text-indigo-400" />,
        };
      case 'SWITCH':
        return {
          bg: 'bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900',
          border: 'border-cyan-500/50',
          badge: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30',
          icon: <Network className="w-3.5 h-3.5 text-cyan-400" />,
        };
      case 'FIREWALL':
        return {
          bg: 'bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900',
          border: 'border-rose-500/50',
          badge: 'bg-rose-500/20 text-rose-300 border border-rose-500/30',
          icon: <Shield className="w-3.5 h-3.5 text-rose-400" />,
        };
      case 'ROUTER':
        return {
          bg: 'bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900',
          border: 'border-amber-500/50',
          badge: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
          icon: <Radio className="w-3.5 h-3.5 text-amber-400" />,
        };
      case 'STORAGE':
        return {
          bg: 'bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900',
          border: 'border-emerald-500/50',
          badge: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
          icon: <HardDrive className="w-3.5 h-3.5 text-emerald-400" />,
        };
      case 'UPS':
        return {
          bg: 'bg-gradient-to-r from-slate-900 via-yellow-950 to-slate-900',
          border: 'border-yellow-500/50',
          badge: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
          icon: <Zap className="w-3.5 h-3.5 text-yellow-400" />,
        };
      case 'PDU':
        return {
          bg: 'bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900',
          border: 'border-purple-500/50',
          badge: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
          icon: <Power className="w-3.5 h-3.5 text-purple-400" />,
        };
      case 'PATCH_PANEL':
        return {
          bg: 'bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900',
          border: 'border-slate-600',
          badge: 'bg-slate-700 text-slate-300 border border-slate-600',
          icon: <Layers className="w-3.5 h-3.5 text-slate-300" />,
        };
      default:
        return {
          bg: 'bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900',
          border: 'border-slate-700',
          badge: 'bg-slate-800 text-slate-400 border border-slate-700',
          icon: <Box className="w-3.5 h-3.5 text-slate-400" />,
        };
    }
  };

  // Get status color ring
  const getStatusColor = (st: string = '') => {
    switch (st) {
      case 'IN_USE':
      case 'ONLINE':
        return 'bg-emerald-600 text-white ring-4 ring-emerald-400/40';
      case 'AVAILABLE':
        return 'bg-blue-600 text-white ring-4 ring-blue-400/40';
      case 'MAINTENANCE':
      case 'STANDBY':
        return 'bg-amber-600 text-white ring-4 ring-amber-400/40';
      case 'LOST':
      case 'BROKEN':
      case 'OFFLINE':
        return 'bg-rose-600 text-white ring-4 ring-rose-400/40';
      default:
        return 'bg-slate-700 text-white ring-4 ring-slate-400/40';
    }
  };

  // Filter unplaced assets
  const placedAssetIds = (activeMap?.markers || []).map((m) => m.assetId).filter(Boolean);
  const unplacedAssets = assets
    .filter((a) => !placedAssetIds.includes(a.id))
    .filter(
      (a) =>
        !searchAsset ||
        a.name.toLowerCase().includes(searchAsset.toLowerCase()) ||
        a.assetTag.toLowerCase().includes(searchAsset.toLowerCase()) ||
        (a.assignments?.[0]?.user?.fullName || '').toLowerCase().includes(searchAsset.toLowerCase())
    );

  // Filter placed rack cabinets on current floor map
  const placedRackMarkers = (activeMap?.markers || []).filter((m) => m.markerType === 'RACK' && m.rackData);

  // Filter dynamic rack library based on searchRack
  const filteredRacks = (rackLibrary || []).filter((r) => {
    if (!searchRack || !searchRack.trim()) return true;
    const query = searchRack.toLowerCase().trim();
    return (
      (r.name || '').toLowerCase().includes(query) ||
      (r.code || '').toLowerCase().includes(query) ||
      (r.brand || '').toLowerCase().includes(query) ||
      (r.category || '').toLowerCase().includes(query) ||
      (r.locationNote || '').toLowerCase().includes(query)
    );
  });

  if (isEnterprise === false || (isEnterprise && !isModActive('FLOOR_MAPS'))) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        <EnterpriseFeatureLock
          previewType="floor_maps"
          tier="ENTERPRISE"
          icon="🗺️"
          title="Sơ Đồ Mặt Bằng 2D & Định Vị Thiết Bị Trực Quan (Floor Plans & Rack Maps)"
          titleEn="Interactive 2D Floor Plans & Data Center Rack Maps"
          subtitle="Tải lên bản vẽ mặt bằng kiến trúc tòa nhà, phân tầng phòng ban và trực quan hóa vị trí thiết bị, tủ mạng Rack Unit thời gian thực"
          subtitleEn="Upload architectural floor plan blueprints, map office room zones, and visually position IT assets and 42U rack cabinets"
          bullets={[
            'Quản lý sơ đồ mặt bằng nhiều tòa nhà, phân tầng (Floor 1 - Floor N) và khu vực phòng máy chủ (Server Room)',
            'Ghim tọa độ thiết bị trực quan bằng kéo thả: Máy tính, Switch, Server, Camera giám sát, Bộ phát Wifi AP',
            'Mô phỏng tủ rack mạng chuẩn quốc tế (12U, 24U, 42U), quản lý từng vị trí Rack Unit U1 - U42 và công suất điện Watts',
            'Liên kết trực tiếp với dữ liệu tài sản trong kho, xem thông tin cấu hình, trạng thái hoạt động và địa chỉ IP khi nhấp chuột',
          ]}
          bulletsEn={[
            'Multi-building, multi-floor layout management with specialized templates for IT offices and Data Centers',
            'Interactive drag-and-drop marker positioning: PCs, Servers, Managed Switches, CCTV Cameras, and Access Points',
            'Data Center Rack Visualizer (12U, 24U, 42U): slot device units, calculate power consumption, and cable routing',
            'Deep integration with the IT Asset Register: instant lookup of asset specs, real-time status, and IP addresses',
          ]}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-12">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 p-4 bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMsg}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md">
            <Map className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
              <span>{isEn ? '2D Floor Plans & Network Rack Elevation' : 'Sơ Đồ Mặt Bằng 2D & Tủ Rack Mạng'}</span>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold">
                19" Rack Elevation
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              {isEn
                ? 'Position computers, printers and drag-and-drop 42U/27U/15U/9U Network Rack cabinets directly onto floor plans'
                : 'Định vị máy tính, máy in và kéo thả Tủ Rack mạng 42U/27U/15U/9U trực tiếp lên sơ đồ tầng'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Map Selector */}
          <select
            value={activeMap?.id || ''}
            onChange={(e) => {
              const selected = maps.find((m) => m.id === e.target.value);
              if (selected) {
                setActiveMap(selected);
                setSelectedMarker(null);
                setIsPlacingAsset(null);
                setIsPlacingRack(null);
              }
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
          >
            {maps.map((m) => (
              <option key={m.id} value={m.id}>
                📍 {m.name} ({m.markers?.length || 0} điểm ghim)
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-purple-600" />
            <span>{isEn ? '+ Create Floor Plan' : '+ Tạo Sơ Đồ Mới'}</span>
          </button>

          <button
            type="button"
            onClick={handleSaveMap}
            disabled={saving}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>{isEn ? 'Save Layout' : 'Lưu Sơ Đồ'}</span>
          </button>
        </div>
      </div>

      {/* Main Workspace: 2-Column (Floor Canvas 8 cols + Side Panel 4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Floor Canvas (8/12 cols) */}
        <div className="lg:col-span-8 space-y-3">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-4 space-y-3">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-purple-600" />
                  <span>{activeMap?.name}</span>
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  ({activeMap?.markers?.length || 0} điểm ghim · {placedRackMarkers.length} tủ rack)
                </span>
              </div>

              {/* Placing State Banners */}
              <div className="flex items-center gap-1.5">
                {isPlacingRack && (
                  <div className="px-3 py-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 animate-pulse shadow-md">
                    <Server className="w-3.5 h-3.5" />
                    <span>Click vị trí trên sơ đồ để đặt [{isPlacingRack.name}]</span>
                    <button
                      type="button"
                      onClick={() => setIsPlacingRack(null)}
                      className="ml-1 text-white hover:text-indigo-200"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {isPlacingAsset && (
                  <div className="px-3 py-1 bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 animate-pulse">
                    <Crosshair className="w-3.5 h-3.5" />
                    <span>Click vị trí trên ảnh để ghim [{isPlacingAsset.assetTag}]</span>
                    <button
                      type="button"
                      onClick={() => setIsPlacingAsset(null)}
                      className="ml-1 text-white hover:text-amber-200"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Zoom Controls */}
                <button
                  type="button"
                  onClick={() => setZoom((prev) => Math.min(2, prev + 0.2))}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 cursor-pointer"
                  title="Phóng to"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom((prev) => Math.max(0.6, prev - 0.2))}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 cursor-pointer"
                  title="Thu nhỏ"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(1)}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 cursor-pointer text-xs font-bold"
                  title="Reset Zoom"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Interactive Canvas Container */}
            <div
              className="relative overflow-auto rounded-2xl bg-slate-950/5 border border-slate-200 min-h-[520px] flex items-center justify-center select-none"
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            >
              <div
                ref={mapContainerRef}
                onClick={handleMapClick}
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top center',
                  transition: draggingMarkerId ? 'none' : 'transform 0.15s ease-out',
                }}
                className={`relative w-full max-w-[1000px] aspect-[16/10] bg-slate-100 shadow-inner rounded-xl overflow-hidden border border-slate-300 ${
                  isPlacingAsset || isPlacingRack ? 'cursor-crosshair' : 'cursor-default'
                }`}
              >
                {/* Background Floor Blueprint Image */}
                <img
                  src={activeMap?.imageUrl || DEFAULT_MAP_TEMPLATES[0].imageUrl}
                  alt={activeMap?.name}
                  className="w-full h-full object-cover pointer-events-none opacity-90 brightness-95"
                />

                {/* Blueprint grid overlay lines */}
                <div
                  className="absolute inset-0 pointer-events-none opacity-10"
                  style={{
                    backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                  }}
                />

                {/* Markers On Map (Supports both Individual Assets and Network Racks) */}
                {(activeMap?.markers || []).map((marker) => {
                  const isRack = marker.markerType === 'RACK' || !!marker.rackData;
                  const isSelected = selectedMarker?.id === marker.id;
                  const isDragging = draggingMarkerId === marker.id;

                  if (isRack) {
                    const rack = marker.rackData;
                    const usedU = (rack?.units || []).reduce((acc, u) => acc + (u.uHeight || 1), 0);
                    const totalU = rack?.totalU || 42;
                    const usagePercent = Math.min(100, Math.round((usedU / totalU) * 100));

                    return (
                      <div
                        key={marker.id}
                        style={{
                          left: `${marker.x}%`,
                          top: `${marker.y}%`,
                          transform: 'translate(-50%, -50%)',
                        }}
                        onMouseDown={(e) => handleMarkerDragStart(e, marker.id)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMarker(marker);
                          setViewingRackMarker(marker);
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSelectedMarker(marker);
                          setContextMenu({ x: e.clientX, y: e.clientY, marker });
                        }}
                        className={`absolute z-20 cursor-grab active:cursor-grabbing group transition-transform duration-150 ${
                          isDragging ? 'scale-125 z-40 opacity-90' : 'hover:scale-110'
                        }`}
                      >
                        {/* Rack Cabinet 2D Isometric Style Pin */}
                        <div className="relative">
                          <div
                            className={`px-2.5 py-1.5 rounded-xl bg-gradient-to-b from-slate-900 to-indigo-950 text-white border-2 border-indigo-400 shadow-2xl flex items-center gap-2 ring-4 ring-indigo-500/30 ${
                              isSelected ? 'ring-purple-500 border-purple-400 scale-105' : ''
                            }`}
                          >
                            <div className="w-6 h-6 rounded-lg bg-indigo-600/60 border border-indigo-400 flex items-center justify-center font-bold text-xs text-indigo-200 shrink-0">
                              <Server className="w-3.5 h-3.5 animate-pulse" />
                            </div>
                            <div className="text-left">
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-[11px] text-indigo-100 whitespace-nowrap">
                                  {marker.name}
                                </span>
                                <span className="px-1 py-0.2 rounded bg-indigo-500/40 text-[9px] font-mono font-bold text-indigo-200">
                                  {totalU}U
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-[9px] text-slate-300 font-medium">
                                <span>{rack?.units?.length || 0} Thiết bị</span>
                                <span>·</span>
                                <span className="text-emerald-400 font-bold">{usagePercent}% U</span>
                              </div>
                            </div>
                          </div>

                          {/* Pulsing indicator dot */}
                          <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900 animate-ping" />
                          <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900" />
                        </div>

                        {/* Tooltip Tag */}
                        <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-slate-950/95 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl border border-slate-700 z-50">
                          🖱️ Click để mở sơ đồ mặt cắt 19" Tủ Rack ({rack?.currentWatts || 0}W · {rack?.temperatureC || 24}°C)
                        </div>
                      </div>
                    );
                  }

                  // Standard Asset Pin
                  return (
                    <div
                      key={marker.id}
                      style={{
                        left: `${marker.x}%`,
                        top: `${marker.y}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                      onMouseDown={(e) => handleMarkerDragStart(e, marker.id)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMarker(marker);
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedMarker(marker);
                        setContextMenu({ x: e.clientX, y: e.clientY, marker });
                      }}
                      className={`absolute z-10 transition-shadow duration-150 cursor-grab active:cursor-grabbing group ${
                        isDragging ? 'scale-125 z-30 opacity-90' : 'hover:scale-115'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shadow-lg transition-transform ${getStatusColor(
                          marker.status
                        )} ${isSelected ? 'ring-4 ring-purple-500 scale-120' : ''}`}
                      >
                        {getAssetIcon(marker.name, marker.categoryName, marker.brand, marker.iconType)}
                      </div>

                      <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-slate-900/95 text-white px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md">
                        {marker.assetTag}: {marker.assignedUser || marker.name}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Marker Detail Card */}
            {selectedMarker && (
              <div className="p-3.5 bg-gradient-to-r from-purple-50 via-indigo-50 to-slate-50 rounded-2xl border border-purple-200 flex items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold shadow-xs">
                    {selectedMarker.markerType === 'RACK' ? (
                      <Server className="w-5 h-5" />
                    ) : (
                      getAssetIcon(selectedMarker.name, selectedMarker.categoryName, selectedMarker.brand, selectedMarker.iconType)
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-purple-900 text-xs">
                        [{selectedMarker.assetTag || selectedMarker.rackData?.code || 'RACK'}]
                      </span>
                      <span className="font-bold text-slate-900 text-xs">{selectedMarker.name}</span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      {selectedMarker.markerType === 'RACK' ? (
                        <span>
                          Tủ Rack <strong>{selectedMarker.rackData?.totalU}U</strong> ({selectedMarker.rackData?.units?.length || 0} thiết bị) · Tọa độ: X: {selectedMarker.x}%, Y: {selectedMarker.y}%
                        </span>
                      ) : (
                        <span>
                          Người sử dụng: <strong>{selectedMarker.assignedUser}</strong> · Tọa độ: X: {selectedMarker.x}%, Y: {selectedMarker.y}%
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {selectedMarker.markerType === 'RACK' && (
                    <button
                      type="button"
                      onClick={() => setViewingRackMarker(selectedMarker)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Xem Cắt Đứng 19"</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleRemoveMarker(selectedMarker.id)}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Gỡ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedMarker(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Multi-Tab Sidebar (Rack Cabinets vs Unplaced Assets) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-4 space-y-3 h-full flex flex-col">
            {/* Tab Switcher */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setRightTab('RACKS')}
                className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  rightTab === 'RACKS'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Server className="w-4 h-4 text-indigo-600" />
                <span>🗄️ Tủ Rack Mạng ({rackLibrary.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setRightTab('ASSETS')}
                className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  rightTab === 'ASSETS'
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Laptop className="w-4 h-4 text-purple-600" />
                <span>💻 Thiết Bị Lẻ ({unplacedAssets.length})</span>
              </button>
            </div>

            {/* TAB 1: RACK CABINETS */}
            {rightTab === 'RACKS' && (
              <div className="space-y-3 flex-1 flex flex-col">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                      Danh Mục Tủ Rack ({filteredRacks.length})
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Chọn tủ để ghim lên sơ đồ hoặc thêm tủ mới
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsCreateRackModalOpen(true)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Thêm Tủ Mới</span>
                  </button>
                </div>

                {/* Search Box for Racks */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm tủ rack theo tên, mã, vị trí..."
                    value={searchRack}
                    onChange={(e) => setSearchRack(e.target.value)}
                    className="w-full pl-8 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800 transition-all placeholder:text-slate-400"
                  />
                  {searchRack && (
                    <button
                      type="button"
                      onClick={() => setSearchRack('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Rack List */}
                <div className="flex-1 overflow-y-auto max-h-[480px] space-y-2.5 pr-1">
                  {loadingRacks && (
                    <div className="py-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                      <span>Đang tải danh sách tủ rack...</span>
                    </div>
                  )}

                  {!loadingRacks && filteredRacks.length === 0 && (
                    <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                      <Server className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-xs font-semibold text-slate-600">
                        {searchRack ? `Không tìm thấy tủ rack phù hợp với "${searchRack}"` : 'Chưa có tủ rack nào'}
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsCreateRackModalOpen(true)}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tạo Tủ Rack Ngay</span>
                      </button>
                    </div>
                  )}

                  {!loadingRacks && filteredRacks.map((tmpl) => {
                    const isPlacingThis = isPlacingRack?.id === tmpl.id;
                    const units = tmpl.units || [];
                    const usedU = units.reduce((acc, u) => acc + (u.uHeight || 1), 0);
                    const totalU = tmpl.totalU || 42;
                    const usagePercent = Math.round((usedU / totalU) * 100);
                    const autoWatts = units.reduce((acc, u) => acc + (u.powerWatts || 0), 0);
                    const currentWatts = tmpl.powerCalcMode === 'MANUAL' ? (tmpl.currentWatts || 0) : autoWatts;
                    const maxWatts = tmpl.maxPowerWatts || 5000;
                    const powerLoadPct = Math.round((currentWatts / maxWatts) * 100);

                    return (
                      <div
                        key={tmpl.id}
                        className={`p-3 rounded-2xl border transition-all text-xs flex flex-col justify-between gap-2.5 group ${
                          isPlacingThis
                            ? 'bg-indigo-50/90 border-indigo-500 ring-2 ring-indigo-400'
                            : 'bg-slate-50/80 hover:bg-white border-slate-200 shadow-2xs hover:shadow-xs'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-900 to-indigo-900 text-indigo-200 flex items-center justify-center font-bold shrink-0 shadow-xs mt-0.5">
                              <Server className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-extrabold text-slate-900 text-xs truncate">{tmpl.name}</span>
                                <span className="px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 text-[9.5px] font-mono font-bold">
                                  {totalU}U
                                </span>
                                {tmpl.code && (
                                  <span className="px-1 py-0.2 rounded bg-slate-200 text-slate-700 text-[9px] font-mono">
                                    {tmpl.code}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10.5px] text-slate-500 truncate mt-0.5">
                                {tmpl.brand} {tmpl.locationNote ? `· ${tmpl.locationNote}` : tmpl.category ? `· ${tmpl.category}` : ''}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleOpenEditRack(tmpl)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
                              title="Sửa thông số tủ, công suất & nhiệt độ"
                            >
                              <Settings className="w-3.5 h-3.5" />
                            </button>
                            {!tmpl.isPreset && (
                              <button
                                type="button"
                                onClick={() => handleDeleteRackFromLibrary(tmpl.id, tmpl.name)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                                title="Xóa tủ khỏi hệ thống"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Capacity & Specs Bar */}
                        <div className="space-y-1.5 bg-white/90 p-2.5 rounded-xl border border-slate-200/70">
                          <div className="flex items-center justify-between text-[10px] text-slate-600 font-semibold">
                            <span>Lấp đầy: <strong>{usedU}/{totalU}U</strong> ({usagePercent}%)</span>
                            <span>{units.length} Thiết bị</span>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-indigo-600 h-full rounded-full transition-all"
                              style={{ width: `${usagePercent}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                            <div className="flex items-center gap-1 text-amber-700 font-semibold">
                              <Zap className="w-3 h-3 text-amber-500" />
                              <span>{currentWatts}W</span>
                              <span className="text-slate-400 font-normal">/ {maxWatts}W ({powerLoadPct}%)</span>
                            </div>
                            <div className="flex items-center gap-1 text-emerald-700 font-semibold">
                              <Flame className="w-3 h-3 text-emerald-500" />
                              <span>{tmpl.temperatureC || 24}°C</span>
                              <span className="text-slate-400 font-normal">· {tmpl.humidityPct || 50}%</span>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-end gap-2 pt-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              const mockMarker: FloorMarker = {
                                id: `preview-${tmpl.id}`,
                                markerType: 'RACK',
                                name: tmpl.name,
                                x: 50,
                                y: 50,
                                status: 'AVAILABLE',
                                rackData: {
                                  ...tmpl,
                                  units: JSON.parse(JSON.stringify(tmpl.units || [])),
                                },
                              };
                              setViewingRackMarker(mockMarker);
                            }}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span>Xem Tủ</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (isPlacingThis) {
                                setIsPlacingRack(null);
                              } else {
                                const newRackData: RackCabinetData = {
                                  id: `rack-${Date.now()}`,
                                  name: tmpl.name,
                                  code: tmpl.code || `RCK-${totalU}U-${Math.floor(100 + Math.random() * 900)}`,
                                  totalU: totalU,
                                  brand: tmpl.brand,
                                  category: tmpl.category,
                                  description: tmpl.description,
                                  locationNote: tmpl.locationNote,
                                  maxPowerWatts: tmpl.maxPowerWatts,
                                  currentWatts: currentWatts,
                                  powerCalcMode: tmpl.powerCalcMode || 'AUTO',
                                  temperatureC: tmpl.temperatureC || 24,
                                  tempWarningThresholdC: tmpl.tempWarningThresholdC || 32,
                                  humidityPct: tmpl.humidityPct || 50,
                                  units: JSON.parse(JSON.stringify(tmpl.units || [])),
                                };
                                setIsPlacingRack(newRackData);
                                setIsPlacingAsset(null);
                                showToast(`🎯 Click vị trí trên sơ đồ để ghim [${tmpl.name}]`);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all flex items-center gap-1 cursor-pointer ${
                              isPlacingThis
                                ? 'bg-amber-500 text-white shadow-md'
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                            }`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>{isPlacingThis ? 'Hủy Ghim' : '+ Ghim Lên Sơ Đồ'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: UNPLACED ASSETS */}
            {rightTab === 'ASSETS' && (
              <div className="space-y-3 flex-1 flex flex-col">
                <div>
                  <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center justify-between">
                    <span>Thiết bị chưa gán vị trí ({unplacedAssets.length})</span>
                    <span className="text-[10px] text-purple-600 font-bold bg-purple-50 px-2 py-0.5 rounded-md">
                      Click để ghim
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Bấm "+ Ghim" sau đó nhấp chuột vào vị trí bất kỳ trên ảnh
                  </p>
                </div>

                {/* Search Input */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Tìm mã máy, tên máy, người dùng..."
                    value={searchAsset}
                    onChange={(e) => setSearchAsset(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Unplaced Assets List */}
                <div className="flex-1 overflow-y-auto max-h-[480px] space-y-2 pr-1">
                  {unplacedAssets.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-xs italic">
                      Tất cả thiết bị đều đã được ghim lên sơ đồ! 🎉
                    </div>
                  ) : (
                    unplacedAssets.map((ast) => {
                      const isSelecting = isPlacingAsset?.id === ast.id;
                      const assignedName = ast.assignments?.[0]?.user?.fullName;

                      return (
                        <div
                          key={ast.id}
                          className={`p-2.5 rounded-xl border text-xs transition-all flex items-center justify-between gap-2 ${
                            isSelecting
                              ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-300'
                              : 'bg-slate-50/70 hover:bg-white border-slate-200'
                          }`}
                        >
                          <div className="min-w-0 flex items-start gap-2">
                            <div className="w-6 h-6 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                              {getAssetIcon(ast.name, ast.category?.name, ast.brand)}
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 truncate block">{ast.name}</span>
                              <div className="text-[10.5px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                                <code className="bg-slate-200 px-1 py-0.2 rounded font-mono font-semibold text-slate-700 text-[10px]">
                                  {ast.assetTag}
                                </code>
                                <span className="truncate">
                                  {assignedName ? `👤 ${assignedName}` : '📦 Chưa bàn giao'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              if (isSelecting) {
                                setIsPlacingAsset(null);
                              } else {
                                setIsPlacingAsset(ast);
                                setIsPlacingRack(null);
                              }
                            }}
                            className={`px-2.5 py-1.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer shrink-0 ${
                              isSelecting
                                ? 'bg-amber-500 text-white'
                                : 'bg-purple-50 hover:bg-purple-600 text-purple-700 hover:text-white border border-purple-200'
                            }`}
                          >
                            {isSelecting ? 'Hủy' : '+ Ghim'}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ==================== MODAL: 19-INCH RACK ELEVATION VISUALIZER ==================== */}
      {viewingRackMarker && viewingRackMarker.rackData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
          <div className="bg-slate-900 text-slate-100 rounded-3xl shadow-2xl max-w-5xl w-full border border-slate-700 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold shadow-lg shrink-0">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-lg font-extrabold text-white">
                      {viewingRackMarker.rackData.name}
                    </h2>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] font-mono font-bold">
                      {viewingRackMarker.rackData.code} · {viewingRackMarker.rackData.totalU}U
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {viewingRackMarker.rackData.brand} · {viewingRackMarker.rackData.locationNote || 'Vị trí máy chủ chính'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTargetSlotU(1);
                    setIsAddDeviceModalOpen(true);
                  }}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Lắp Thiết Bị Vào U</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewingRackMarker(null)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick Stats Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 bg-slate-950/40 border-b border-slate-800/80 text-xs">
              {(() => {
                const totalU = viewingRackMarker.rackData.totalU;
                const units = viewingRackMarker.rackData.units || [];
                const usedU = units.reduce((acc, u) => acc + (u.uHeight || 1), 0);
                const freeU = Math.max(0, totalU - usedU);
                const pct = Math.round((usedU / totalU) * 100);

                return (
                  <>
                    <div className="p-2.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                      <span className="text-[10.5px] text-slate-400 font-semibold block">Tỷ lệ lấp đầy U</span>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className="text-lg font-black text-white">{pct}%</span>
                        <span className="text-[11px] text-indigo-400 font-bold">({usedU}/{totalU}U)</span>
                      </div>
                      <span className="text-[10px] text-slate-400">Còn trống: {freeU}U</span>
                    </div>

                    <div className="p-2.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                      <span className="text-[10.5px] text-slate-400 font-semibold block">Công suất tiêu thụ</span>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className="text-lg font-black text-amber-400">
                          {viewingRackMarker.rackData.currentWatts || 0}
                        </span>
                        <span className="text-xs text-slate-400 font-bold">/ {viewingRackMarker.rackData.maxPowerWatts || 5000} W</span>
                      </div>
                      <span className="text-[10px] text-slate-400">PDU Metered 230V</span>
                    </div>

                    <div className="p-2.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                      <span className="text-[10.5px] text-slate-400 font-semibold block">Nhiệt độ môi trường</span>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className="text-lg font-black text-emerald-400">
                          {viewingRackMarker.rackData.temperatureC || 23.5} °C
                        </span>
                      </div>
                      <span className="text-[10px] text-emerald-500 font-bold">Mát - Ổn định</span>
                    </div>

                    <div className="p-2.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                      <span className="text-[10.5px] text-slate-400 font-semibold block">Tổng thiết bị lắp đặt</span>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className="text-lg font-black text-purple-400">{units.length}</span>
                        <span className="text-xs text-slate-400 font-bold">Thiết bị</span>
                      </div>
                      <span className="text-[10px] text-slate-400">Cụm Server & Network</span>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Modal Body: 19-inch Physical Rack Graphic View & Device Table */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: 19-inch Rack Cabinet Elevation View (7/12 cols) */}
              <div className="lg:col-span-7 flex flex-col items-center">
                <div className="w-full max-w-xl bg-slate-950 p-4 rounded-3xl border-4 border-slate-800 shadow-2xl relative">
                  {/* Top Rack Crown */}
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[11px] font-mono text-slate-500 font-bold">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      19" STANDARD RACK CABINET
                    </span>
                    <span>TOTAL: {viewingRackMarker.rackData.totalU}U</span>
                  </div>

                  {/* 19" Rack Structure with Rails */}
                  <div className="relative border-2 border-slate-800 rounded-xl bg-slate-900/90 overflow-hidden flex flex-col divide-y divide-slate-800/60">
                    {(() => {
                      const totalU = viewingRackMarker.rackData.totalU || 42;
                      const units = viewingRackMarker.rackData.units || [];
                      const rows: React.ReactNode[] = [];

                      // Render slots from top (e.g. U42) to bottom (U1)
                      let currentU = totalU;
                      while (currentU >= 1) {
                        const deviceInSlot = units.find(
                          (u) => currentU >= u.uPosition && currentU < u.uPosition + (u.uHeight || 1)
                        );

                        if (deviceInSlot) {
                          // Only render on the top-most U of multi-U device
                          if (currentU === deviceInSlot.uPosition + deviceInSlot.uHeight - 1) {
                            const uHeight = deviceInSlot.uHeight || 1;
                            const theme = getDeviceVisualTheme(deviceInSlot.deviceType);

                            rows.push(
                              <div
                                key={`slot-${currentU}`}
                                style={{ height: `${Math.max(34, uHeight * 34)}px` }}
                                className={`w-full ${theme.bg} ${theme.border} border-y relative flex items-center justify-between px-3 group transition-all`}
                              >
                                {/* Left Rail Indicator */}
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-5 rounded bg-slate-950/80 border border-slate-700 flex items-center justify-center font-mono font-bold text-[10px] text-slate-300 shrink-0">
                                    {uHeight > 1 ? `U${deviceInSlot.uPosition}-${currentU}` : `U${currentU}`}
                                  </div>

                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className="shrink-0">{theme.icon}</div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-extrabold text-xs text-white truncate max-w-[200px] sm:max-w-[240px]">
                                          {deviceInSlot.name}
                                        </span>
                                        {deviceInSlot.assetTag && (
                                          <span className="px-1 py-0.2 rounded bg-slate-800 text-[9px] font-mono font-semibold text-slate-300 border border-slate-700">
                                            {deviceInSlot.assetTag}
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[10px] text-slate-400 block truncate">
                                        {deviceInSlot.brand} {deviceInSlot.model} {deviceInSlot.ipAddress ? `· IP: ${deviceInSlot.ipAddress}` : ''}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Right Controls & LED Graphic */}
                                <div className="flex items-center gap-2 shrink-0">
                                  {/* LED indicators */}
                                  <div className="hidden sm:flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-md border border-slate-800">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                    <span className="text-[9px] font-mono text-emerald-400 font-bold">
                                      {deviceInSlot.powerWatts ? `${deviceInSlot.powerWatts}W` : 'ACT'}
                                    </span>
                                  </div>

                                  {/* Action Buttons */}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveDeviceFromRack(deviceInSlot.id)}
                                    className="opacity-0 group-hover:opacity-100 p-1 bg-rose-950/80 hover:bg-rose-900 text-rose-300 rounded-md text-[10px] font-bold border border-rose-800 transition-opacity cursor-pointer"
                                    title="Tháo thiết bị khỏi slot U này"
                                  >
                                    Tháo U
                                  </button>
                                </div>
                              </div>
                            );

                            currentU -= uHeight;
                            continue;
                          }
                        } else {
                          // Empty U Slot
                          const targetU = currentU;
                          rows.push(
                            <div
                              key={`empty-${targetU}`}
                              className="h-[32px] w-full bg-slate-900/50 hover:bg-slate-800/80 px-3 flex items-center justify-between text-slate-500 text-xs font-mono transition-colors group cursor-pointer"
                              onClick={() => {
                                setTargetSlotU(targetU);
                                setIsAddDeviceModalOpen(true);
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-6 text-[10px] text-slate-500 font-bold">U{targetU}</span>
                                <span className="text-[11px] text-slate-600 font-medium group-hover:text-slate-400">
                                  --- Trống (Available Slot) ---
                                </span>
                              </div>

                              <span className="opacity-0 group-hover:opacity-100 text-[10px] text-indigo-400 font-bold flex items-center gap-1 transition-opacity">
                                <Plus className="w-3 h-3" />
                                <span>Lắp thiết bị vào U{targetU}</span>
                              </span>
                            </div>
                          );
                        }

                        currentU--;
                      }

                      return rows;
                    })()}
                  </div>
                </div>
              </div>

              {/* Right Column: Device Inventory In This Rack (5/12 cols) */}
              <div className="lg:col-span-5 space-y-3">
                <div className="bg-slate-950/70 p-4 rounded-3xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <h3 className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-indigo-400" />
                      <span>Danh Sách Thiết Bị Trong Tủ ({viewingRackMarker.rackData.units?.length || 0})</span>
                    </h3>
                  </div>

                  <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
                    {(viewingRackMarker.rackData.units || []).length === 0 ? (
                      <div className="text-center py-8 text-slate-500 text-xs italic">
                        Chưa có thiết bị nào được lắp vào tủ rack này.
                      </div>
                    ) : (
                      (viewingRackMarker.rackData.units || [])
                        .sort((a, b) => b.uPosition - a.uPosition)
                        .map((u) => {
                          const theme = getDeviceVisualTheme(u.deviceType);
                          return (
                            <div
                              key={u.id}
                              className="p-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex items-start justify-between gap-2"
                            >
                              <div className="flex items-start gap-2.5">
                                <div className="w-7 h-7 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                                  {theme.icon}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-extrabold text-white text-xs">{u.name}</span>
                                    <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 text-[9.5px] font-mono font-bold">
                                      U{u.uPosition}{u.uHeight > 1 ? `-${u.uPosition + u.uHeight - 1}` : ''} ({u.uHeight}U)
                                    </span>
                                  </div>
                                  <div className="text-[10.5px] text-slate-400 space-y-0.5 mt-0.5">
                                    <div>
                                      {u.brand} {u.model} {u.assetTag ? `· Mã: ${u.assetTag}` : ''}
                                    </div>
                                    {u.ipAddress && (
                                      <div className="font-mono text-cyan-400 text-[10px]">
                                        🌐 IP: {u.ipAddress}
                                      </div>
                                    )}
                                    {u.notes && <div className="text-slate-500 italic text-[9.5px]">{u.notes}</div>}
                                  </div>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRemoveDeviceFromRack(u.id)}
                                className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors"
                                title="Tháo thiết bị khỏi tủ"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      
      {/* ==================== MODAL: EDIT RACK CABINET SETTINGS ==================== */}
      {isEditRackModalOpen && editingRack && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
          <div className="bg-slate-900 text-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-slate-700 space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Chỉnh Sửa Thông Số Tủ Rack & Môi Trường</h3>
                  <p className="text-[11px] text-slate-400">Tùy chỉnh định mức công suất, cách tính và cảm biến nhiệt độ</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditRackModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditRack} className="space-y-4 text-xs">
              {/* Section 1: Basic Info */}
              <div className="space-y-2.5">
                <h4 className="font-bold text-indigo-400 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5" />
                  <span>1. Thông Tin Cơ Bản Tủ Rack</span>
                </h4>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Tên Tủ Rack (*):</label>
                  <input
                    type="text"
                    required
                    value={editRackForm.name}
                    onChange={(e) => setEditRackForm({ ...editRackForm, name: e.target.value })}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Mã Định Danh (Code):</label>
                    <input
                      type="text"
                      value={editRackForm.code}
                      onChange={(e) => setEditRackForm({ ...editRackForm, code: e.target.value })}
                      className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl font-mono text-indigo-300 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Tổng Số Slot Chiều Cao (U):</label>
                    <select
                      value={editRackForm.totalU}
                      onChange={(e) => setEditRackForm({ ...editRackForm, totalU: Number(e.target.value) })}
                      className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl font-bold text-indigo-400 outline-none"
                    >
                      <option value={48}>48U (Tủ lớn Data Center)</option>
                      <option value={45}>45U</option>
                      <option value={42}>42U (Tiêu chuẩn Data Center)</option>
                      <option value={36}>36U</option>
                      <option value={27}>27U (Văn phòng chi nhánh)</option>
                      <option value={20}>20U</option>
                      <option value={15}>15U (Treo tường tầng)</option>
                      <option value={12}>12U (Tủ mạng tầng)</option>
                      <option value={9}>9U (Tủ camera CCTV)</option>
                      <option value={6}>6U (Tủ mini âm tường)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Thương Hiệu / Model:</label>
                    <input
                      type="text"
                      value={editRackForm.brand}
                      onChange={(e) => setEditRackForm({ ...editRackForm, brand: e.target.value })}
                      className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl font-medium outline-none text-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Phân Loại / Mục Đích:</label>
                    <input
                      type="text"
                      value={editRackForm.category}
                      onChange={(e) => setEditRackForm({ ...editRackForm, category: e.target.value })}
                      className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl font-medium outline-none text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Vị Trí Lắp Đặt / Ghi Chú:</label>
                  <input
                    type="text"
                    value={editRackForm.locationNote}
                    onChange={(e) => setEditRackForm({ ...editRackForm, locationNote: e.target.value })}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl font-medium outline-none text-white"
                  />
                </div>
              </div>

              {/* Section 2: Power Management & Calculation Mode */}
              <div className="space-y-2.5 pt-2 border-t border-slate-800">
                <h4 className="font-bold text-amber-400 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  <span>2. Quản Lý Điện Năng & Công Suất Tủ (PDU)</span>
                </h4>

                <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800 space-y-2.5">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1.5">Chế Độ Tính Công Suất:</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setEditRackForm({ ...editRackForm, powerCalcMode: 'AUTO' })}
                        className={`p-2.5 rounded-xl border text-left flex flex-col gap-0.5 transition-all cursor-pointer ${
                          editRackForm.powerCalcMode === 'AUTO'
                            ? 'border-indigo-500 bg-indigo-950/50 text-white ring-1 ring-indigo-500'
                            : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span className="font-bold text-xs flex items-center gap-1">
                          ⚡ Tự Động Cộng Dồn
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Cộng công suất từ tất cả thiết bị đang gắn trong tủ
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditRackForm({ ...editRackForm, powerCalcMode: 'MANUAL' })}
                        className={`p-2.5 rounded-xl border text-left flex flex-col gap-0.5 transition-all cursor-pointer ${
                          editRackForm.powerCalcMode === 'MANUAL'
                            ? 'border-amber-500 bg-amber-950/50 text-white ring-1 ring-amber-500'
                            : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span className="font-bold text-xs flex items-center gap-1">
                          🔢 Đo Đạc Thực Tế
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Nhập chỉ số Watt thực tế đo từ đồng hồ / PDU
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block font-bold text-slate-300 mb-1">
                        {editRackForm.powerCalcMode === 'MANUAL' ? 'Công Suất Đo Được (Watts):' : 'Công Suất Hiện Tại (Watts):'}
                      </label>
                      <input
                        type="number"
                        disabled={editRackForm.powerCalcMode === 'AUTO'}
                        value={editRackForm.currentWatts}
                        onChange={(e) => setEditRackForm({ ...editRackForm, currentWatts: Number(e.target.value) })}
                        className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl font-bold text-amber-400 outline-none disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-300 mb-1">Công Suất Tối Đa PDU (Watts):</label>
                      <input
                        type="number"
                        value={editRackForm.maxPowerWatts}
                        onChange={(e) => setEditRackForm({ ...editRackForm, maxPowerWatts: Number(e.target.value) })}
                        className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl font-bold text-white outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Thermal & Environment */}
              <div className="space-y-2.5 pt-2 border-t border-slate-800">
                <h4 className="font-bold text-emerald-400 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5" />
                  <span>3. Cảm Biến Môi Trường, Nhiệt Độ & Độ Ẩm</span>
                </h4>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Nhiệt Độ (°C):</label>
                    <input
                      type="number"
                      step="0.1"
                      value={editRackForm.temperatureC}
                      onChange={(e) => setEditRackForm({ ...editRackForm, temperatureC: Number(e.target.value) })}
                      className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl font-bold text-emerald-400 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Độ Ẩm (% RH):</label>
                    <input
                      type="number"
                      value={editRackForm.humidityPct}
                      onChange={(e) => setEditRackForm({ ...editRackForm, humidityPct: Number(e.target.value) })}
                      className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl font-bold text-cyan-400 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Ngưỡng Báo Động (°C):</label>
                    <input
                      type="number"
                      step="0.5"
                      value={editRackForm.tempWarningThresholdC}
                      onChange={(e) => setEditRackForm({ ...editRackForm, tempWarningThresholdC: Number(e.target.value) })}
                      className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl font-bold text-rose-400 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditRackModalOpen(false)}
                  className="px-4 py-2 border border-slate-700 rounded-xl font-semibold text-slate-300 hover:bg-slate-800"
                >{isEn ? 'Cancel' : 'Hủy'}</button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Lưu Thay Đổi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: ADD DEVICE TO RACK SLOT ==================== */}
      {isAddDeviceModalOpen && viewingRackMarker && viewingRackMarker.rackData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
          <div className="bg-slate-900 text-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-slate-700 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Lắp Thiết Bị Vào Tủ Rack</h3>
                  <span className="text-[11px] text-slate-400">
                    Tủ: <strong>{viewingRackMarker.rackData.name}</strong> · Vị trí slot: <strong>U{targetSlotU}</strong>
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddDeviceModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddDeviceToRack} className="space-y-3.5 text-xs">
              {/* Quick Select from Existing Assets in System */}
              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  1. Chọn nhanh từ kho thiết bị hệ thống (Tùy chọn):
                </label>
                <select
                  onChange={(e) => {
                    const selected = assets.find((a) => a.id === e.target.value);
                    if (selected) {
                      setNewDeviceForm({
                        ...newDeviceForm,
                        name: selected.name,
                        brand: selected.brand || '',
                        model: selected.model || '',
                        assetId: selected.id,
                        assetTag: selected.assetTag,
                        deviceType: selected.category?.name?.toLowerCase().includes('switch')
                          ? 'SWITCH'
                          : selected.category?.name?.toLowerCase().includes('server')
                          ? 'SERVER'
                          : 'OTHER',
                      });
                    }
                  }}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl font-medium outline-none text-slate-200"
                >
                  <option value="">-- Chọn thiết bị có sẵn trong kho --</option>
                  {assets.map((ast) => (
                    <option key={ast.id} value={ast.id}>
                      [{ast.assetTag}] {ast.name} ({ast.brand || 'No brand'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Tên Thiết Bị (*)</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Máy chủ Database Dell R750..."
                  value={newDeviceForm.name}
                  onChange={(e) => setNewDeviceForm({ ...newDeviceForm, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Loại Thiết Bị:</label>
                  <select
                    value={newDeviceForm.deviceType}
                    onChange={(e) => setNewDeviceForm({ ...newDeviceForm, deviceType: e.target.value as any })}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl font-semibold outline-none text-slate-200"
                  >
                    <option value="SERVER">🖥️ Máy Chủ (Server)</option>
                    <option value="SWITCH">🔌 Switch Mạng (Core/Access)</option>
                    <option value="FIREWALL">🛡️ Tường Lửa (Firewall)</option>
                    <option value="ROUTER">📡 Router Gateway</option>
                    <option value="STORAGE">💾 Storage SAN / NAS</option>
                    <option value="PATCH_PANEL">🔀 Patch Panel Đấu Nối</option>
                    <option value="UPS">⚡ Bộ Lưu Điện (UPS)</option>
                    <option value="PDU">🔌 Thanh Nguồn (PDU)</option>
                    <option value="KVM">🖥️ Console KVM Monitor</option>
                    <option value="CABLE_MGMT">🗂️ Quản Lý Cáp 1U</option>
                    <option value="OTHER">📦 Thiết Bị Khác</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Chiều Cao Slot U:</label>
                  <select
                    value={newDeviceForm.uHeight}
                    onChange={(e) => setNewDeviceForm({ ...newDeviceForm, uHeight: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl font-semibold outline-none text-slate-200"
                  >
                    <option value={1}>1U (Tiêu chuẩn)</option>
                    <option value={2}>2U (Server R750 / NAS / UPS)</option>
                    <option value={3}>3U (UPS Lớn 5kVA)</option>
                    <option value={4}>4U (Storage / Server 4U)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Thương Hiệu & Model:</label>
                  <input
                    type="text"
                    placeholder="VD: Dell PowerEdge R750"
                    value={newDeviceForm.brand}
                    onChange={(e) => setNewDeviceForm({ ...newDeviceForm, brand: e.target.value })}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl font-medium outline-none text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Địa Chỉ IP Quản Trị:</label>
                  <input
                    type="text"
                    placeholder="VD: 192.168.10.15"
                    value={newDeviceForm.ipAddress}
                    onChange={(e) => setNewDeviceForm({ ...newDeviceForm, ipAddress: e.target.value })}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl font-mono text-cyan-400 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Công Suất Điện (Watt):</label>
                  <input
                    type="number"
                    placeholder="VD: 350"
                    value={newDeviceForm.powerWatts}
                    onChange={(e) => setNewDeviceForm({ ...newDeviceForm, powerWatts: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl font-medium outline-none text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Vị Trí Slot Bắt Đầu:</label>
                  <input
                    type="number"
                    min={1}
                    max={viewingRackMarker.rackData.totalU}
                    value={targetSlotU}
                    onChange={(e) => setTargetSlotU(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl font-bold text-indigo-400 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddDeviceModalOpen(false)}
                  className="px-4 py-2 border border-slate-700 rounded-xl font-semibold text-slate-300 hover:bg-slate-800"
                >{isEn ? 'Cancel' : 'Hủy'}</button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-md flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Xác Nhận Lắp Thiết Bị</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: CREATE CUSTOM RACK CABINET ==================== */}
      {isCreateRackModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
          <div className="bg-slate-900 text-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-700 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold">
                  <Server className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-white">Tạo Tủ Rack Mạng Tùy Chỉnh</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateRackModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCustomRack} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Tên Tủ Rack (*)</label>
                <input
                  type="text"
                  required
                  placeholder="VD: RACK-01 (Phòng IT Tầng 3)..."
                  value={customRackName}
                  onChange={(e) => setCustomRackName(e.target.value)}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Mã Nhận Diện:</label>
                  <input
                    type="text"
                    placeholder="VD: RCK-42U-01"
                    value={customRackCode}
                    onChange={(e) => setCustomRackCode(e.target.value)}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl font-mono text-indigo-300 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Tổng Số Slot U (*):</label>
                  <select
                    value={customRackTotalU}
                    onChange={(e) => setCustomRackTotalU(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl font-bold text-indigo-400 outline-none"
                  >
                    <option value={42}>42U (Tiêu chuẩn Data Center)</option>
                    <option value={27}>27U (Văn phòng chi nhánh)</option>
                    <option value={15}>15U (Treo tường tầng)</option>
                    <option value={12}>12U (Tủ mạng tầng)</option>
                    <option value={9}>9U (Tủ camera CCTV)</option>
                    <option value={6}>6U (Tủ mini âm tường)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Thương Hiệu / Nhà Cung Cấp:</label>
                <input
                  type="text"
                  placeholder="VD: APC NetShelter / Vietrack / Ecopac / Toten..."
                  value={customRackBrand}
                  onChange={(e) => setCustomRackBrand(e.target.value)}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl font-medium outline-none text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Ghi Chú Vị Trí Lắp Đặt:</label>
                <textarea
                  rows={2}
                  placeholder="VD: Phòng Server chính, góc Đông Bắc, cạnh điều hòa CRAC 01..."
                  value={customRackNotes}
                  onChange={(e) => setCustomRackNotes(e.target.value)}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl font-medium outline-none text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateRackModalOpen(false)}
                  className="px-4 py-2 border border-slate-700 rounded-xl font-semibold text-slate-300 hover:bg-slate-800"
                >{isEn ? 'Cancel' : 'Hủy'}</button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-md flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tạo & Ghim Lên Sơ Đồ</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: CREATE FLOOR MAP ==================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <Map className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-slate-900">Thêm Sơ Đồ Mặt Bằng Mới</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const res = await fetch('/api/floor-maps', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      name: newMapName.trim(),
                      locationId: newMapLocationId || undefined,
                      imageUrl: newMapImageUrl || DEFAULT_MAP_TEMPLATES[0].imageUrl,
                      markers: [],
                    }),
                  });
                  const data = await res.json();
                  if (data.success) {
                    setMaps((prev) => [data.data, ...prev]);
                    setActiveMap(data.data);
                    setIsCreateModalOpen(false);
                    setNewMapName('');
                    showToast('Đã tạo sơ đồ mặt bằng mới!');
                  }
                } catch (e: any) {
                  showToast(`Lỗi: ${e.message}`);
                }
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tên Sơ Đồ Mặt Bằng (*)</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Tầng 4 - Phòng Nghiên Cứu & Phát Triển..."
                  value={newMapName}
                  onChange={(e) => setNewMapName(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-medium outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Liên kết vị trí / Tòa nhà:</label>
                <select
                  value={newMapLocationId}
                  onChange={(e) => setNewMapLocationId(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-semibold outline-none"
                >
                  <option value="">-- Chọn vị trí trong hệ thống --</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      🏢 {loc.name} {loc.building ? `(${loc.building} - ${loc.floor})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Chọn mẫu bản vẽ kiến trúc 2D:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2.5 max-h-48 overflow-y-auto pr-1">
                  {DEFAULT_MAP_TEMPLATES.map((tmpl, tIdx) => (
                    <div
                      key={tIdx}
                      onClick={() => setNewMapImageUrl(tmpl.imageUrl)}
                      className={`p-2 rounded-2xl border cursor-pointer flex items-center gap-2.5 transition-all text-left ${
                        newMapImageUrl === tmpl.imageUrl
                          ? 'border-purple-600 bg-purple-50/80 ring-2 ring-purple-400/50 shadow-xs'
                          : 'border-slate-200 hover:border-purple-300 hover:bg-slate-50'
                      }`}
                    >
                      <img
                        src={tmpl.imageUrl}
                        alt={tmpl.name}
                        className="w-16 h-12 object-cover rounded-xl shrink-0 border border-slate-200 bg-slate-900"
                      />
                      <div className="min-w-0">
                        <span className="text-[11px] font-bold text-slate-900 block truncate">{tmpl.name}</span>
                        <p className="text-[9.5px] text-slate-500 line-clamp-1">{tmpl.description}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="Hoặc nhập URL ảnh: https://.../floorplan.png"
                  value={newMapImageUrl}
                  onChange={(e) => setNewMapImageUrl(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-semibold text-slate-700 hover:bg-slate-50"
                >{isEn ? 'Cancel' : 'Hủy'}</button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-md flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tạo Sơ Đồ</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== FLOATING CONTEXT MENU ==================== */}
      {contextMenu && (
        <div
          style={{
            left: `${Math.min(typeof window !== 'undefined' ? window.innerWidth - 250 : 500, contextMenu.x)}px`,
            top: `${Math.min(typeof window !== 'undefined' ? window.innerHeight - 340 : 500, contextMenu.y)}px`,
          }}
          onClick={(e) => e.stopPropagation()}
          className="fixed z-50 w-60 bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700 p-2 animate-in fade-in zoom-in-95 backdrop-blur-md"
        >
          <div className="px-2.5 py-1.5 border-b border-slate-800">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-purple-400 font-bold text-[10.5px]">
                [{contextMenu.marker.assetTag || contextMenu.marker.rackData?.code || 'TAG'}]
              </span>
              <span className="font-bold text-slate-100 text-xs truncate">{contextMenu.marker.name}</span>
            </div>
            <span className="text-[10px] text-slate-400 block truncate mt-0.5">
              {contextMenu.marker.assignedUser || contextMenu.marker.rackData?.brand || 'Đối tượng mặt bằng'}
            </span>
          </div>

          <div className="py-1 space-y-0.5 text-xs font-semibold">
            {contextMenu.marker.markerType === 'RACK' && (
              <button
                type="button"
                onClick={() => {
                  setViewingRackMarker(contextMenu.marker);
                  setContextMenu(null);
                }}
                className="w-full px-2.5 py-2 text-indigo-300 hover:bg-indigo-950/70 rounded-xl flex items-center gap-2 transition-colors text-left cursor-pointer"
              >
                <Eye className="w-4 h-4 shrink-0 text-indigo-400" />
                <span>Xem chi tiết 19" Tủ Rack</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleRemoveMarker(contextMenu.marker.id)}
              className="w-full px-2.5 py-2 text-rose-400 hover:bg-rose-950/70 hover:text-rose-300 rounded-xl flex items-center gap-2 transition-colors text-left cursor-pointer"
            >
              <Trash2 className="w-4 h-4 shrink-0" />
              <span>Gỡ khỏi sơ đồ</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
