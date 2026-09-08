'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n/context';
import {
  Building2,
  Users,
  Layers,
  Sparkles,
  Plus,
  Trash2,
  Edit,
  Save,
  Play,
  Briefcase,
  MapPin,
  Tag,
  BrainCircuit,
  X,
  Loader2,
  Power,
  Sliders,
  Check,
  UserCheck,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  FlaskConical,
  HelpCircle,
  Search,
  Star,
  Inbox,
  FolderTree,
  Clock,
  RotateCcw,
} from 'lucide-react';

interface Team {
  id: string;
  name: string;
  code: string;
  description?: string;
  parentId?: string | null;
  companyScope?: string | null;
  locationScope?: string | null;
  sortOrder: number;
  isActive: boolean;
  parent?: { id: string; name: string };
  children?: Array<{ id: string; name: string; code: string }>;
  members?: any[];
  queues?: any[];
  _count?: { tickets: number; incidents: number; members: number };
}

interface Queue {
  id: string;
  name: string;
  code: string;
  teamId: string;
  description?: string;
  isDefault: boolean;
  isActive: boolean;
  team?: { id: string; name: string; code: string };
  activeTicketCount?: number;
}

interface Condition {
  field: string;
  operator: string;
  value: string;
}

interface Rule {
  id: string;
  name: string;
  description?: string;
  priority: number;
  isActive: boolean;
  conditions: Condition[];
  targetTeamId: string;
  targetQueueId?: string | null;
  targetUserId?: string | null;
  autoAssign: boolean;
  targetTeam?: { id: string; name: string; code: string };
  targetUser?: { id: string; fullName: string; email: string; department?: string; position?: string; companyName?: string };
}

export const DEFAULT_ENTERPRISE_COMPANIES = [
  'Tập đoàn Công nghệ Mẫu',
  'Công ty Cổ phần Công nghệ ABC',
  'Chi nhánh Miền Nam',
  'Chi nhánh Miền Trung',
  'Chi nhánh Hà Nội',
  'Chi nhánh Công nghệ Phụ trợ',
  'Trung tâm Nghiên cứu & Phát triển R&D',
  'Công ty TNHH Giải pháp Đám mây',
  'Công ty Hạ tầng Mạng Viễn thông',
];

export const DEFAULT_ENTERPRISE_LOCATIONS = [
  { id: 'loc-hn-5', name: 'Hà Nội - Tòa nhà TechCorp Tầng 5 (123 Phố Công Nghệ, Q. Hai Bà Trưng)', building: 'Tòa TechCorp' },
  { id: 'loc-hn-3', name: 'Hà Nội - Tòa nhà TechCorp Tầng 3 (123 Phố Công Nghệ, Q. Hai Bà Trưng)', building: 'Tòa TechCorp' },
  { id: 'loc-hn-tt', name: 'Hà Nội - TechCorp Tower (Số 9 Phố Đổi Mới, Hoàn Kiếm)', building: 'TechCorp Tower' },
  { id: 'loc-hn-hem', name: 'Hà Nội - Trung tâm Kỹ thuật Hà Nội (Khu Công Nghệ Cao, Hà Nội)', building: 'Trung tâm Kỹ thuật Hà Nội' },
  { id: 'loc-hcm-south', name: 'TP.HCM - Văn phòng Chi nhánh Miền Nam (Quận 1)', building: 'VP Chi nhánh Miền Nam' },
  { id: 'loc-dn-south', name: 'Đồng Nai - Trung tâm Vận hành Miền Nam (Khu Công Nghệ Cao TP.HCM)', building: 'Trung tâm Vận hành Miền Nam' },
  { id: 'loc-dn-central', name: 'Đồng Nai - Trung tâm Vận hành Miền Trung (KCN Công Nghệ Đồng Nai)', building: 'Trung tâm Vận hành Miền Trung' },
  { id: 'loc-bn-vigla', name: 'Bắc Ninh - Trung tâm R&D Bắc Ninh (KCN Bắc Ninh Tech Hub)', building: 'Trung tâm R&D Bắc Ninh' },
];

export const DEFAULT_SERVICES = [
  'Hệ thống ERP SAP / Bravo',
  'Mạng WiFi & Đường truyền Internet',
  'Kết nối VPN làm việc từ xa',
  'Email Doanh nghiệp & Microsoft 365',
  'Máy in & Scan văn phòng',
  'Cấp phát máy tính & thiết bị mới',
  'Họp trực tuyến Teams / Zoom phòng họp',
  'Cấp quyền File Server nội bộ',
];

const FIELD_OPTIONS = [
  { value: 'companyName', label: '🏢 Công ty (Company)' },
  { value: 'location', label: '📍 Nơi làm việc (Location)' },
  { value: 'department', label: '👥 Phòng ban (Dept)' },
  { value: 'category', label: '📂 Danh mục (Category)' },
  { value: 'subCategory', label: '📑 Danh mục con' },
  { value: 'service', label: '⚙️ Dịch vụ CNTT' },
  { value: 'assetType', label: '💻 Loại thiết bị' },
  { value: 'priority', label: '🔥 Mức ưu tiên' },
  { value: 'keyword', label: '🔍 Từ khóa' },
];

const OPERATOR_OPTIONS = [
  { value: 'equals', label: 'Bằng chính xác (=)' },
  { value: 'contains', label: 'Chứa từ khóa' },
  { value: 'in', label: 'Trong danh sách' },
  { value: 'not_equals', label: 'Khác (!=)' },
];

const CATEGORY_OPTIONS = [
  { value: 'SOFTWARE', label: '💻 Phần mềm, ERP, Bravo & SAP' },
  { value: 'NETWORK', label: '🌐 Hệ thống Mạng, WiFi, VPN' },
  { value: 'HARDWARE', label: '🖥️ Thiết bị, Laptop & Máy in' },
  { value: 'LICENSE', label: '🔑 Bản quyền Microsoft 365 & Mail' },
  { value: 'ACCESS_REQUEST', label: '🛡️ Cấp quyền thư mục & File Server' },
  { value: 'SECURITY', label: '🚨 Cảnh báo Virus & Bảo mật' },
  { value: 'OTHER', label: '❓ Yêu cầu tổng hợp khác' },
];

const PRIORITY_OPTIONS = [
  { value: 'URGENT', label: '🔥 P1 - Khẩn cấp (SLA 4h)' },
  { value: 'HIGH', label: '⚡ P2 - Cao (SLA 24h)' },
  { value: 'MEDIUM', label: '⏳ P3 - Trung bình (SLA 48h)' },
  { value: 'LOW', label: '☕ P4 - Thấp (SLA 72h)' },
];

export interface SlaPolicy {
  id: string;
  name: string;
  code: string;
  priorityLevel: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW' | 'CUSTOM';
  responseTimeHours: number;
  resolutionTimeHours: number;
  description: string;
  color: string;
  icon: string;
  isDefault: boolean;
  isActive: boolean;
}

export const DEFAULT_SLA_POLICIES: SlaPolicy[] = [
  {
    id: 'sla-urgent',
    name: 'Sự Cố Khẩn Cấp (P1 - URGENT)',
    code: 'URGENT',
    priorityLevel: 'URGENT',
    responseTimeHours: 0.25,
    resolutionTimeHours: 4,
    description: 'Sự cố tê liệt toàn hệ thống diện rộng, lãnh đạo yêu cầu xử lý hỏa tốc.',
    color: 'rose',
    icon: '🔥',
    isDefault: true,
    isActive: true,
  },
  {
    id: 'sla-high',
    name: 'Mức Cao (P2 - HIGH)',
    code: 'HIGH',
    priorityLevel: 'HIGH',
    responseTimeHours: 0.5,
    resolutionTimeHours: 24,
    description: 'Ảnh hưởng trực tiếp đến quy trình sản xuất / kinh doanh chính hoặc nhiều người dùng.',
    color: 'orange',
    icon: '⚡',
    isDefault: true,
    isActive: true,
  },
  {
    id: 'sla-medium',
    name: 'Trung Bình (P3 - MEDIUM)',
    code: 'MEDIUM',
    priorityLevel: 'MEDIUM',
    responseTimeHours: 1,
    resolutionTimeHours: 48,
    description: 'Sự cố máy tính cá nhân, lỗi phần mềm văn phòng, cấp quyền thông thường.',
    color: 'blue',
    icon: '🟡',
    isDefault: true,
    isActive: true,
  },
  {
    id: 'sla-low',
    name: 'Mức Thấp (P4 - LOW)',
    code: 'LOW',
    priorityLevel: 'LOW',
    responseTimeHours: 2,
    resolutionTimeHours: 72,
    description: 'Yêu cầu cấp tài khoản mới, tư vấn, hỏi đáp, kế hoạch dự phòng.',
    color: 'emerald',
    icon: '🟢',
    isDefault: true,
    isActive: true,
  },
  {
    id: 'sla-vip',
    name: 'VIP & Ban Lãnh Đạo (P0 - EXECUTIVE)',
    code: 'VIP',
    priorityLevel: 'CUSTOM',
    responseTimeHours: 0.15,
    resolutionTimeHours: 2,
    description: 'Hỗ trợ đặc biệt ưu tiên tức thì cho Hội đồng Quản trị và Ban Tổng Giám đốc.',
    color: 'purple',
    icon: '👑',
    isDefault: false,
    isActive: true,
  },
  {
    id: 'sla-infra',
    name: 'Hạ Tầng Mạng & Cloud (INFRA-CRITICAL)',
    code: 'INFRA',
    priorityLevel: 'CUSTOM',
    responseTimeHours: 0.3,
    resolutionTimeHours: 8,
    description: 'Sự cố đứt cáp quang liên tỉnh, mất kết nối VPN nhà máy, máy chủ ảo Cloud gặp sự cố.',
    color: 'cyan',
    icon: '🌐',
    isDefault: false,
    isActive: true,
  },
];

function cleanSubDept(fullDept: string | null | undefined): string {
  if (!fullDept) return 'IT';
  if (fullDept.includes(' / ')) {
    return fullDept.split(' / ')[1] || fullDept;
  }
  return fullDept;
}


const RULE_NAME_EN_MAP: Record<string, string> = {
  '5. An Toàn Thông Tin, Mã Độc & Bảo Mật': '5. Cybersecurity, Malware & Security Incidents',
  '1. Phần Mềm Nghiệp Vụ, ERP & Kế Toán': '1. Business Applications, ERP & Accounting',
  '6. IT On-site Nhà Máy Chi nhánh Miền Nam & Chi nhánh Miền Trung': '6. On-site IT for Chi nhánh Miền Nam & Chi nhánh Miền Trung Factories',
  '2. Hạ Tầng Mạng, WiFi, VPN & Viễn Thông': '2. Network Infrastructure, WiFi, VPN & Telecom',
  '3. Thiết Bị Văn Phòng & Máy In Chi Nhánh': '3. Office Devices & Branch Printers',
  '4. Tài Khoản, Microsoft 365 & Phân Quyền': '4. Accounts, Microsoft 365 & Permissions',
};

const RULE_DESC_EN_MAP: Record<string, string> = {
  'Tự động điều phối các sự cố an toàn thông tin, virus, mã độc, lừa đảo phishing hoặc nghi vấn rò rỉ dữ liệu về Đội ATTT.':
    'Automatically dispatch cybersecurity incidents, malware, viruses, phishing, or data leaks to the Cybersecurity Team.',
  'Các sự cố liên quan đến SAP S/4HANA, Bravo, Fast, HR Portal hoặc lỗi phần mềm ứng dụng chuyên ngành.':
    'Issues relating to SAP S/4HANA, Bravo, Fast, HR Portal, or enterprise specialized business applications.',
  'Các yêu cầu hỗ trợ trực tiếp phần cứng, mạng dây xưởng sản xuất, cân điện tử, camera nhà máy tại Đồng Nai.':
    'On-site hardware, shop floor production networking, weigh scales, and factory surveillance support in Dong Nai.',
  'Sự cố mất mạng, chập chờn WiFi văn phòng, đứt cáp quang, lỗi chứng chỉ VPN Fortinet hoặc tổng đài thoại IP Phone.':
    'Network outages, unstable office WiFi, fiber cuts, Fortinet VPN certificate errors, or IP telephony faults.',
};

const TEAM_NAME_EN_MAP: Record<string, string> = {
  'Đội An Toàn Thông Tin & An Ninh Mạng': 'Cybersecurity & Information Security Team',
  'Đội Ứng Dụng & Phần Mềm Nghiệp Vụ (Application)': 'Business Applications & ERP Team (Application)',
  'Đội IT On-site Nhà Máy & Chi Nhánh (Factory IT)': 'Factory & Branch On-site IT Team (Factory IT)',
  'Đội Hạ Tầng Mạng & Viễn Thông': 'Network Infrastructure & Telecom Team',
  'Đội Hỗ Trợ Người Dùng & Văn Phòng (Helpdesk & Workplace)': 'User Support & Workplace Team (Helpdesk & Workplace)',
  'Đội Máy Chủ & Đám Mây (Server & Cloud)': 'Server & Cloud Infrastructure Team',
  'Đội Vận Hành Trung Tâm Dữ Liệu (Data Center Ops)': 'Data Center Operations Team',
  'Đội Dự Án Chuyển Đổi Số (Digital Transformation)': 'Digital Transformation Project Team',
};

function getLocalizedRuleName(name: string | undefined, isEn: boolean): string {
  if (!name) return '';
  if (!isEn) return name;
  return RULE_NAME_EN_MAP[name] || name;
}

function getLocalizedRuleDesc(desc: string | undefined, isEn: boolean): string {
  if (!desc) return '';
  if (!isEn) return desc;
  return RULE_DESC_EN_MAP[desc] || desc;
}

function getLocalizedTeamName(name: string | undefined, isEn: boolean): string {
  if (!name) return '';
  if (!isEn) return name;
  return TEAM_NAME_EN_MAP[name] || name;
}

export function SupportOrgSettingsTab() {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const [activeTab, setActiveTab] = useState<'RULES' | 'SCOPE' | 'QUEUES' | 'SLA'>('RULES');

  // Dynamic SLA Policies State
  const [slaPolicies, setSlaPolicies] = useState<SlaPolicy[]>(DEFAULT_SLA_POLICIES);
  const [isSlaModalOpen, setIsSlaModalOpen] = useState(false);
  const [editingSlaId, setEditingSlaId] = useState<string | null>(null);
  const [slaForm, setSlaForm] = useState<Omit<SlaPolicy, 'id' | 'isDefault'>>({
    name: '',
    code: '',
    priorityLevel: 'MEDIUM',
    responseTimeHours: 1,
    resolutionTimeHours: 24,
    description: '',
    color: 'blue',
    icon: '⏱️',
    isActive: true,
  });

  const [savingSla, setSavingSla] = useState(false);
  const [slaToast, setSlaToast] = useState<string | null>(null);

  const [masterData, setMasterData] = useState<{
    locations: any[];
    services: any[];
    categories: any[];
    users: any[];
    teams: Team[];
    queues: Queue[];
    companies: string[];
    departments: string[];
  }>({
    locations: DEFAULT_ENTERPRISE_LOCATIONS,
    services: DEFAULT_SERVICES.map((s, idx) => ({ id: `srv-${idx}`, name: s })),
    categories: [],
    users: [],
    teams: [],
    queues: [],
    companies: DEFAULT_ENTERPRISE_COMPANIES,
    departments: [],
  });

  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);

  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [editingQueueId, setEditingQueueId] = useState<string | null>(null);

  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);

  // Team / Scope Form state
  const [teamForm, setTeamForm] = useState({
    name: '',
    code: '',
    companyScope: '',
    locationScope: '',
    description: '',
    memberIds: [] as string[],
  });

  // Queue Form state
  const [queueForm, setQueueForm] = useState({
    name: '',
    code: '',
    teamId: '',
    description: '',
    isDefault: false,
  });

  // Rule Form state
  const [ruleForm, setRuleForm] = useState({
    name: '',
    description: '',
    priority: 10,
    targetTeamId: '',
    targetQueueId: '',
    targetUserId: '',
    autoAssign: true,
    isActive: true,
    conditions: [{ field: 'category', operator: 'equals', value: 'SOFTWARE' }],
  });

  // Simulator state
  const [simContext, setSimContext] = useState({
    companyName: DEFAULT_ENTERPRISE_COMPANIES[1],
    userDepartment: 'Ban Công Nghệ Thông Tin (IT / CNTT)',
    userLocation: DEFAULT_ENTERPRISE_LOCATIONS[0].name,
    serviceName: DEFAULT_SERVICES[0],
    category: 'SOFTWARE',
    title: 'Không đăng nhập được phần mềm ERP Bravo',
    description: 'Báo lỗi timeout kết nối máy chủ dữ liệu SQL',
  });
  const [simResult, setSimResult] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tRes, qRes, rRes, uRes, lRes, cRes, mRes, sRes] = await Promise.all([
        fetch('/api/support-teams').then((r) => r.json()).catch(() => ({ success: false })),
        fetch('/api/support-queues').then((r) => r.json()).catch(() => ({ success: false })),
        fetch('/api/routing-rules').then((r) => r.json()).catch(() => ({ success: false })),
        fetch('/api/users').then((r) => r.json()).catch(() => ({ success: false })),
        fetch('/api/locations').then((r) => r.json()).catch(() => ({ success: false })),
        fetch('/api/categories').then((r) => r.json()).catch(() => ({ success: false })),
        fetch('/api/routing-rules/master-data').then((r) => r.json()).catch(() => ({ success: false })),
        fetch('/api/settings').then((r) => r.json()).catch(() => ({ success: false })),
      ]);

      if (sRes?.success && Array.isArray(sRes.data)) {
        const policiesItem = sRes.data.find((s: any) => s.key === 'sla.policies');
        if (policiesItem && policiesItem.value) {
          try {
            const parsed = JSON.parse(policiesItem.value);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setSlaPolicies(parsed);
            }
          } catch {}
        }
      }

      const loadedTeams: Team[] = tRes?.success ? tRes.data : (mRes?.data?.teams || []);
      const loadedQueues: Queue[] = qRes?.success ? qRes.data : (mRes?.data?.queues || []);
      const loadedRules: Rule[] = rRes?.success ? rRes.data : [];
      const loadedUsers = uRes?.success ? uRes.data : (mRes?.data?.users || []);
      const loadedLocs = (lRes?.success && lRes.data?.length > 0) ? lRes.data : DEFAULT_ENTERPRISE_LOCATIONS;
      const loadedCats = cRes?.success ? cRes.data : [];

      const companiesSet = new Set<string>(DEFAULT_ENTERPRISE_COMPANIES);
      const deptsSet = new Set<string>();

      if (Array.isArray(loadedUsers)) {
        loadedUsers.forEach((u: any) => {
          if (u.companyName) companiesSet.add(u.companyName);
          if (u.department) deptsSet.add(u.department);
        });
      }
      if (mRes?.data?.companies) {
        mRes.data.companies.forEach((c: string) => companiesSet.add(c));
      }
      if (mRes?.data?.departments) {
        mRes.data.departments.forEach((d: string) => deptsSet.add(d));
      }

      setMasterData({
        locations: loadedLocs,
        services: DEFAULT_SERVICES.map((s, idx) => ({ id: `srv-${idx}`, name: s })),
        categories: loadedCats,
        users: loadedUsers,
        teams: loadedTeams,
        queues: loadedQueues,
        companies: Array.from(companiesSet),
        departments: Array.from(deptsSet),
      });

      setRules(loadedRules);
    } catch (e) {
      console.error('Error loading routing data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter ONLY IT Users for team assignment
  const itPersonnel = masterData.users.filter((u: any) =>
    u.department?.includes('IT') ||
    u.department?.includes('CNTT') ||
    u.role?.name === 'Admin' ||
    u.role?.name === 'Asset Manager' ||
    u.role?.name === 'Ticket Issue'
  );

  // ==================== RULES ACTIONS ====================
  const handleOpenCreateRule = () => {
    setEditingRuleId(null);
    const initialTeamId = masterData.teams[0]?.id || '';
    setRuleForm({
      name: '',
      description: '',
      priority: 10,
      targetTeamId: initialTeamId,
      targetQueueId: '',
      targetUserId: '',
      autoAssign: true,
      isActive: true,
      conditions: [{ field: 'category', operator: 'equals', value: 'SOFTWARE' }],
    });
    setIsRuleModalOpen(true);
  };

  const handleOpenEditRule = (rule: Rule) => {
    setEditingRuleId(rule.id);
    setRuleForm({
      name: rule.name,
      description: rule.description || '',
      priority: rule.priority,
      targetTeamId: rule.targetTeamId || masterData.teams[0]?.id || '',
      targetQueueId: rule.targetQueueId || '',
      targetUserId: rule.targetUserId || '',
      autoAssign: rule.autoAssign,
      isActive: rule.isActive,
      conditions: Array.isArray(rule.conditions) && rule.conditions.length > 0
        ? rule.conditions
        : [{ field: 'category', operator: 'equals', value: 'SOFTWARE' }],
    });
    setIsRuleModalOpen(true);
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleForm.targetTeamId) {
      alert('Vui lòng chọn Team IT tiếp nhận');
      return;
    }
    try {
      const method = editingRuleId ? 'PUT' : 'POST';
      const payload: any = {
        ...ruleForm,
        priority: Number(ruleForm.priority),
        targetUserId: ruleForm.targetUserId || null,
        targetQueueId: ruleForm.targetQueueId || null,
      };
      if (editingRuleId) payload.id = editingRuleId;

      const res = await fetch('/api/routing-rules', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsRuleModalOpen(false);
        setEditingRuleId(null);
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || 'Lưu luật phân tuyến thất bại');
      }
    } catch {
      alert('Lỗi kết nối khi lưu luật phân tuyến');
    }
  };

  const handleDeleteRule = async (rule: Rule) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa Luật phân tuyến "${rule.name}"?`)) return;
    try {
      const res = await fetch(`/api/routing-rules?id=${rule.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || 'Xóa luật thất bại');
      }
    } catch {
      alert('Lỗi khi xóa luật');
    }
  };

  const handleToggleRuleActive = async (rule: Rule) => {
    try {
      const res = await fetch('/api/routing-rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rule.id, isActive: !rule.isActive }),
      });
      if (res.ok) loadData();
    } catch {}
  };

  const handleAddCondition = () => {
    setRuleForm((prev) => ({
      ...prev,
      conditions: [...prev.conditions, { field: 'companyName', operator: 'contains', value: masterData.companies[0] || '' }],
    }));
  };

  const handleRemoveCondition = (index: number) => {
    setRuleForm((prev) => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== index),
    }));
  };

  const handleConditionFieldChange = (index: number, newField: string) => {
    let defaultValue = '';
    if (newField === 'category') defaultValue = 'SOFTWARE';
    else if (newField === 'companyName') defaultValue = masterData.companies[0] || DEFAULT_ENTERPRISE_COMPANIES[0];
    else if (newField === 'location') defaultValue = masterData.locations[0]?.name || DEFAULT_ENTERPRISE_LOCATIONS[0].name;
    else if (newField === 'department') defaultValue = 'Ban Công Nghệ Thông Tin (IT / CNTT)';
    else if (newField === 'priority') defaultValue = 'HIGH';
    else if (newField === 'service') defaultValue = masterData.services[0]?.name || DEFAULT_SERVICES[0];
    else if (newField === 'assetType') defaultValue = 'Laptop / Máy tính xách tay';

    setRuleForm((prev) => {
      const updated = [...prev.conditions];
      updated[index] = { field: newField, operator: 'contains', value: defaultValue };
      return { ...prev, conditions: updated };
    });
  };

  const handleConditionValueChange = (index: number, val: string) => {
    setRuleForm((prev) => {
      const updated = [...prev.conditions];
      updated[index] = { ...updated[index], value: val };
      return { ...prev, conditions: updated };
    });
  };

  const handleConditionOperatorChange = (index: number, op: string) => {
    setRuleForm((prev) => {
      const updated = [...prev.conditions];
      updated[index] = { ...updated[index], operator: op };
      return { ...prev, conditions: updated };
    });
  };

  // ==================== TEAM / SCOPE ACTIONS ====================
  const handleOpenCreateTeam = () => {
    setEditingTeamId(null);
    setTeamForm({
      name: '',
      code: '',
      companyScope: '',
      locationScope: '',
      description: '',
      memberIds: [],
    });
    setIsTeamModalOpen(true);
  };

  const handleOpenEditTeam = (team: Team) => {
    setEditingTeamId(team.id);
    const existingMemberIds = (team.members || []).map((m: any) => m.userId || m.user?.id).filter(Boolean);
    setTeamForm({
      name: team.name,
      code: team.code,
      companyScope: team.companyScope || '',
      locationScope: team.locationScope || '',
      description: team.description || '',
      memberIds: existingMemberIds,
    });
    setIsTeamModalOpen(true);
  };

  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamForm.name || !teamForm.code) {
      alert('Vui lòng nhập đầy đủ Tên Team và Mã Code');
      return;
    }

    try {
      const method = editingTeamId ? 'PUT' : 'POST';
      const payload: any = {
        ...teamForm,
        companyScope: teamForm.companyScope || null,
        locationScope: teamForm.locationScope || null,
      };
      if (editingTeamId) payload.id = editingTeamId;

      const res = await fetch('/api/support-teams', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsTeamModalOpen(false);
        setEditingTeamId(null);
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || 'Lưu Team IT thất bại');
      }
    } catch {
      alert('Lỗi kết nối khi lưu Team IT');
    }
  };

  const handleDeleteTeam = async (team: Team) => {
    if (team.code === 'IT-ALL') {
      alert('Không thể xóa Team IT tổng thể của hệ thống');
      return;
    }
    if (!confirm(`Bạn có chắc chắn muốn xóa Team "${team.name}" (${team.code})? Toàn bộ quy tắc liên quan sẽ cần được gán lại.`)) return;

    try {
      const res = await fetch(`/api/support-teams?id=${team.id}`, { method: 'DELETE' });
      if (res.ok) {
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || 'Xóa Team thất bại');
      }
    } catch {
      alert('Lỗi khi xóa Team');
    }
  };

  const toggleMemberSelection = (userId: string) => {
    setTeamForm((prev) => {
      const exists = prev.memberIds.includes(userId);
      if (exists) {
        return { ...prev, memberIds: prev.memberIds.filter((id) => id !== userId) };
      } else {
        return { ...prev, memberIds: [...prev.memberIds, userId] };
      }
    });
  };

  // ==================== QUEUE ACTIONS ====================
  const handleOpenCreateQueue = () => {
    setEditingQueueId(null);
    setQueueForm({
      name: '',
      code: '',
      teamId: masterData.teams[0]?.id || '',
      description: '',
      isDefault: false,
    });
    setIsQueueModalOpen(true);
  };

  const handleOpenEditQueue = (queue: Queue) => {
    setEditingQueueId(queue.id);
    setQueueForm({
      name: queue.name,
      code: queue.code,
      teamId: queue.teamId || queue.team?.id || masterData.teams[0]?.id || '',
      description: queue.description || '',
      isDefault: queue.isDefault,
    });
    setIsQueueModalOpen(true);
  };

  const handleSaveQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queueForm.name || !queueForm.code || !queueForm.teamId) {
      alert('Vui lòng điền đầy đủ Tên, Mã queue và Team phụ trách');
      return;
    }

    try {
      const method = editingQueueId ? 'PUT' : 'POST';
      const payload: any = { ...queueForm };
      if (editingQueueId) payload.id = editingQueueId;

      const res = await fetch('/api/support-queues', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsQueueModalOpen(false);
        setEditingQueueId(null);
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || 'Lưu hàng đợi thất bại');
      }
    } catch {
      alert('Lỗi kết nối khi lưu hàng đợi');
    }
  };

  const handleDeleteQueue = async (queue: Queue) => {
    if (queue.isDefault) {
      alert('Không thể xóa Fallback Queue mặc định của hệ thống');
      return;
    }
    if (!confirm(`Bạn có chắc chắn muốn xóa Hàng đợi "${queue.name}" (${queue.code})?`)) return;

    try {
      const res = await fetch(`/api/support-queues?id=${queue.id}`, { method: 'DELETE' });
      if (res.ok) {
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || 'Xóa hàng đợi thất bại');
      }
    } catch {
      alert('Lỗi khi xóa hàng đợi');
    }
  };

  // ==================== SLA DYNAMIC CRUD OPERATIONS ====================
  const persistSlaPolicies = async (updatedPolicies: SlaPolicy[]) => {
    setSavingSla(true);
    try {
      const urgent = updatedPolicies.find((p) => p.priorityLevel === 'URGENT' || p.code === 'URGENT')?.resolutionTimeHours || 4;
      const high = updatedPolicies.find((p) => p.priorityLevel === 'HIGH' || p.code === 'HIGH')?.resolutionTimeHours || 24;
      const medium = updatedPolicies.find((p) => p.priorityLevel === 'MEDIUM' || p.code === 'MEDIUM')?.resolutionTimeHours || 48;
      const low = updatedPolicies.find((p) => p.priorityLevel === 'LOW' || p.code === 'LOW')?.resolutionTimeHours || 72;

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: [
            { key: 'sla.policies', value: JSON.stringify(updatedPolicies), group: 'sla', label: 'Danh sách Quy Chuẩn SLA' },
            { key: 'sla.urgent_hours', value: String(urgent), group: 'sla', label: 'SLA Mức Khẩn cấp (giờ)' },
            { key: 'sla.high_hours', value: String(high), group: 'sla', label: 'SLA Mức Cao (giờ)' },
            { key: 'sla.medium_hours', value: String(medium), group: 'sla', label: 'SLA Mức Trung bình (giờ)' },
            { key: 'sla.low_hours', value: String(low), group: 'sla', label: 'SLA Mức Thấp (giờ)' },
          ],
        }),
      });

      if (res.ok) {
        setSlaPolicies(updatedPolicies);
        setSlaToast('✅ Đã lưu và cập nhật danh sách quy chuẩn SLA thành công!');
        setTimeout(() => setSlaToast(null), 3500);
      } else {
        alert('Lỗi lưu quy chuẩn SLA');
      }
    } catch {
      alert('Lỗi kết nối khi lưu quy chuẩn SLA');
    } finally {
      setSavingSla(false);
    }
  };

  const handleOpenCreateSla = () => {
    setEditingSlaId(null);
    setSlaForm({
      name: '',
      code: '',
      priorityLevel: 'MEDIUM',
      responseTimeHours: 1,
      resolutionTimeHours: 24,
      description: '',
      color: 'blue',
      icon: '⏱️',
      isActive: true,
    });
    setIsSlaModalOpen(true);
  };

  const handleOpenEditSla = (policy: SlaPolicy) => {
    setEditingSlaId(policy.id);
    setSlaForm({
      name: policy.name,
      code: policy.code,
      priorityLevel: policy.priorityLevel,
      responseTimeHours: policy.responseTimeHours,
      resolutionTimeHours: policy.resolutionTimeHours,
      description: policy.description,
      color: policy.color,
      icon: policy.icon,
      isActive: policy.isActive,
    });
    setIsSlaModalOpen(true);
  };

  const handleSaveSlaForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slaForm.name.trim() || !slaForm.code.trim()) {
      alert('Vui lòng nhập đầy đủ Tên và Mã quy chuẩn SLA');
      return;
    }

    let updated: SlaPolicy[];
    if (editingSlaId) {
      updated = slaPolicies.map((p) =>
        p.id === editingSlaId
          ? { ...p, ...slaForm, code: slaForm.code.toUpperCase() }
          : p
      );
    } else {
      const newPolicy: SlaPolicy = {
        id: `sla-${Date.now()}`,
        ...slaForm,
        code: slaForm.code.toUpperCase(),
        isDefault: false,
      };
      updated = [...slaPolicies, newPolicy];
    }

    await persistSlaPolicies(updated);
    setIsSlaModalOpen(false);
  };

  const handleDeleteSlaPolicy = async (policy: SlaPolicy) => {
    if (policy.isDefault) {
      if (!confirm(`Quy chuẩn "${policy.name}" là chuẩn hệ thống cốt lõi. Bạn có chắc chắn muốn xóa không?`)) {
        return;
      }
    } else {
      if (!confirm(`Bạn có chắc chắn muốn xóa Quy chuẩn SLA "${policy.name}" (${policy.code})?`)) {
        return;
      }
    }

    const updated = slaPolicies.filter((p) => p.id !== policy.id);
    await persistSlaPolicies(updated);
  };

  const handleToggleSlaPolicy = async (id: string) => {
    const updated = slaPolicies.map((p) => (p.id === id ? { ...p, isActive: !p.isActive } : p));
    await persistSlaPolicies(updated);
  };

  const handleResetSlaDefaults = async () => {
    if (confirm('Khôi phục danh sách quy chuẩn SLA về cài đặt tiêu chuẩn ban đầu của hệ thống?')) {
      await persistSlaPolicies(DEFAULT_SLA_POLICIES);
    }
  };

  // ==================== SIMULATION ====================
  const handleRunSimulation = async () => {
    setIsSimulating(true);
    try {
      const res = await fetch('/api/routing-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'TEST', context: simContext }),
      });
      const data = await res.json();
      if (data.success) {
        setSimResult(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSimulating(false);
    }
  };

  // Helper: STRICTLY ONLY Render Members of the Selected Team (or ALL IT staff if IT-ALL is selected)
  const renderTeamSpecificUserOptions = (selectedTeamId: string) => {
    const selectedTeam = masterData.teams.find((t) => t.id === selectedTeamId || t.code === selectedTeamId);
    const isAllTeam = !selectedTeamId || selectedTeam?.code === 'IT-ALL' || selectedTeam?.code === 'IT-GROUP';

    let memberUsers: any[] = [];
    if (isAllTeam) {
      memberUsers = itPersonnel;
    } else {
      const members = selectedTeam?.members || [];
      memberUsers = members
        .map((m: any) => {
          if (m.user) return m.user;
          return masterData.users.find((u) => u.id === m.userId);
        })
        .filter(Boolean);
    }

    const groupLabel = isAllTeam
      ? `── ⚡ TẤT CẢ ĐỘI NGŨ IT TẬP ĐOÀN (${memberUsers.length} nhân sự) ──`
      : `── 👥 THÀNH VIÊN TRỰC THUỘC [${selectedTeam?.name || 'Team'}] (${memberUsers.length} nhân sự) ──`;

    return (
      <>
        <option value="">-- Không gán riêng (Cả Team cùng nhận vào Hàng đợi) --</option>

        {memberUsers.length > 0 ? (
          <optgroup label={groupLabel}>
            {memberUsers.map((u: any) => (
              <option key={u.id} value={u.id}>
                👤 {u.fullName} {u.position ? `(${u.position})` : ''}
              </option>
            ))}
          </optgroup>
        ) : (
          <option disabled value="__NONE__">
            ⚠️ Team này chưa có thành viên riêng (Cả Team sẽ cùng nhận)
          </option>
        )}
      </>
    );
  };

  // Render Smart Value Input / Select based on field type
  const renderConditionValueInput = (cond: Condition, idx: number) => {
    if (cond.field === 'category') {
      return (
        <select
          value={cond.value}
          onChange={(e) => handleConditionValueChange(idx, e.target.value)}
          className="w-full p-2 bg-purple-50/70 border border-purple-200 rounded-xl text-xs font-bold text-purple-900 outline-none truncate"
        >
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      );
    }

    if (cond.field === 'companyName') {
      const allCompanies = Array.from(new Set([...masterData.companies, ...DEFAULT_ENTERPRISE_COMPANIES]));
      if (cond.value && !allCompanies.includes(cond.value)) {
        allCompanies.push(cond.value);
      }
      return (
        <select
          value={cond.value}
          onChange={(e) => handleConditionValueChange(idx, e.target.value)}
          className="w-full p-2 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-950 outline-none truncate"
        >
          <option value="">-- Chọn Công ty --</option>
          {allCompanies.map((comp) => (
            <option key={comp} value={comp}>🏢 {comp}</option>
          ))}
        </select>
      );
    }

    if (cond.field === 'location') {
      const allLocations = masterData.locations && masterData.locations.length > 0
        ? masterData.locations
        : DEFAULT_ENTERPRISE_LOCATIONS;
      return (
        <select
          value={cond.value}
          onChange={(e) => handleConditionValueChange(idx, e.target.value)}
          className="w-full p-2 bg-blue-50/70 border border-blue-200 rounded-xl text-xs font-bold text-blue-950 outline-none truncate"
        >
          <option value="">-- Chọn Nơi làm việc --</option>
          {allLocations.map((loc: any) => (
            <option key={loc.id || loc.name} value={loc.name}>
              📍 {loc.name}
            </option>
          ))}
        </select>
      );
    }

    if (cond.field === 'department') {
      return (
        <select
          value={cond.value}
          onChange={(e) => handleConditionValueChange(idx, e.target.value)}
          className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none truncate"
        >
          <option value="">-- Chọn Khối Phòng ban --</option>
          <option value="Ban Công Nghệ Thông Tin (IT / CNTT)">⚡ Ban Công Nghệ Thông Tin (IT / CNTT)</option>
          <option value="Khối Tài Chính & Kế Toán">💰 Khối Tài Chính & Kế Toán</option>
          <option value="Khối Kinh Doanh & Thị Trường">📈 Khối Kinh Doanh & Thị Trường</option>
          <option value="Khối Nhân Sự & Hành Chính">👥 Khối Nhân Sự & Hành Chính</option>
          <option value="Khối Vận Hành & Sản Xuất">🏭 Khối Vận Hành & Sản Xuất</option>
          <option value="Ban Giám Đốc & HĐQT">🏛️ Ban Giám Đốc & HĐQT</option>
          <option value="Ban Marketing & Truyền Thông">📢 Ban Marketing & Truyền Thông</option>
          <option value="Ban Quản Lý Dự Án & Kỹ Thuật">📐 Ban Quản Lý Dự Án & Kỹ Thuật</option>
        </select>
      );
    }

    if (cond.field === 'priority') {
      return (
        <select
          value={cond.value}
          onChange={(e) => handleConditionValueChange(idx, e.target.value)}
          className="w-full p-2 bg-rose-50/70 border border-rose-200 rounded-xl text-xs font-bold text-rose-900 outline-none truncate"
        >
          {PRIORITY_OPTIONS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      );
    }

    if (cond.field === 'service') {
      const allServices = masterData.services && masterData.services.length > 0
        ? masterData.services
        : DEFAULT_SERVICES.map((s, i) => ({ id: `${i}`, name: s }));
      return (
        <select
          value={cond.value}
          onChange={(e) => handleConditionValueChange(idx, e.target.value)}
          className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-none truncate"
        >
          <option value="">-- Chọn Dịch vụ --</option>
          {allServices.map((s: any) => (
            <option key={s.id || s.name} value={s.name}>⚙️ {s.name}</option>
          ))}
        </select>
      );
    }

    if (cond.field === 'assetType') {
      const defaultAssetTypes = [
        'Laptop / Máy tính xách tay',
        'PC / Máy tính để bàn',
        'Màn hình hiển thị',
        'Máy in / Máy scan',
        'Bộ phát WiFi / Access Point',
        'Switch / Router mạng',
        'Thiết bị họp truyền hình',
      ];
      return (
        <select
          value={cond.value}
          onChange={(e) => handleConditionValueChange(idx, e.target.value)}
          className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-none truncate"
        >
          <option value="">-- Chọn Thiết bị --</option>
          {defaultAssetTypes.map((a) => (
            <option key={a} value={a}>💻 {a}</option>
          ))}
        </select>
      );
    }

    return (
      <input
        type="text"
        required
        placeholder="Nhập từ khóa..."
        value={cond.value}
        onChange={(e) => handleConditionValueChange(idx, e.target.value)}
        className="w-full p-2 border border-slate-300 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-purple-400"
      />
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Info & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-purple-600 text-white shadow-xs">
              <BrainCircuit className="w-4 h-4" />
            </span>
            <span>{isEn ? 'IT Routing & Organization (Ticket Routing Engine)' : 'Phân Tuyến & Tổ Chức IT (Ticket Routing Engine)'}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isEn ? <><strong>"CREATE ONCE - USE EVERYWHERE"</strong> Principle: Automatically route tickets based on unified Master Data.</> : <>Nguyên tắc <strong>"CREATE ONCE - USE EVERYWHERE"</strong>: Tự động phân tuyến dựa trên Master Data có sẵn.</>}
          </p>
        </div>

        {/* Dynamic Action buttons depending on active tab */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSimResult(null);
              setIsSimulatorOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer shrink-0 transition-all"
          >
            <FlaskConical className="w-4 h-4" />
            <span>{isEn ? '🧪 Test Routing (Simulator)' : '🧪 Kiểm Tra Phân Tuyến (Simulator)'}</span>
          </button>

          {activeTab === 'RULES' && (
            <button
              type="button"
              onClick={handleOpenCreateRule}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer shrink-0 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>{isEn ? '+ Create New Rule' : '+ Tạo Luật Mới'}</span>
            </button>
          )}

          {activeTab === 'SCOPE' && (
            <button
              type="button"
              onClick={handleOpenCreateTeam}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer shrink-0 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>{isEn ? '+ Add IT Team / Scope' : '+ Thêm Team IT / Phạm Vi Mới'}</span>
            </button>
          )}

          {activeTab === 'QUEUES' && (
            <button
              type="button"
              onClick={handleOpenCreateQueue}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer shrink-0 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>{isEn ? '+ Add New Queue' : '+ Thêm Hàng Đợi Mới'}</span>
            </button>
          )}

          {activeTab === 'SLA' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetSlaDefaults}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-300 cursor-pointer shrink-0 transition-all"
                title="Khôi phục danh sách quy chuẩn SLA về mặc định tiêu chuẩn"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isEn ? 'Reset Defaults' : 'Khôi Phục Mặc Định'}</span>
              </button>
              <button
                type="button"
                onClick={handleOpenCreateSla}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer shrink-0 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>{isEn ? '+ Add New SLA Policy' : '+ Thêm Quy Chuẩn SLA Mới'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Consolidated Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-1 flex-wrap">
        {[
          { id: 'RULES', label: isEn ? '1. Routing Rules' : '1. Luật Phân Tuyến (Routing Rules)', icon: Sliders, count: rules.length },
          { id: 'SCOPE', label: isEn ? '2. Scope Matrix & IT Teams' : '2. Phạm Vi Phụ Trách & Đội Ngũ IT (Scope Matrix)', icon: Building2, count: masterData.teams.length },
          { id: 'QUEUES', label: isEn ? '3. Support Queues' : '3. Hàng Đợi (Queues)', icon: Layers, count: masterData.queues.length },
          { id: 'SLA', label: isEn ? '4. SLA Policies' : '4. Cam Kết Thời Hạn (Quy Chuẩn SLA)', icon: Clock, count: slaPolicies.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`px-2 py-0.5 rounded-full text-[10.5px] ${isActive ? 'bg-purple-200 text-purple-900 font-black' : 'bg-slate-100 text-slate-500'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: LUẬT PHÂN TUYẾN (ROUTING RULES) */}
      {activeTab === 'RULES' && (
        <div className="space-y-4">
          <div className="p-3 bg-purple-50/70 dark:bg-purple-950/30 rounded-2xl border border-purple-100 dark:border-purple-900 text-xs text-purple-900 dark:text-purple-200 flex items-center justify-between">
            <span>{isEn ? (
              <>🛡️ <strong>Visible to IT Manager & Admin only:</strong> Rules are evaluated automatically by <strong>Priority (lowest number first)</strong>. Matching rules will route directly to that Team.</>
            ) : (
              <>🛡️ <strong>Chỉ IT Manager & Admin thấy:</strong> Các luật được quét tự động theo thứ tự <strong>Ưu tiên (Số nhỏ chạy trước)</strong>. Khớp luật nào sẽ chuyển ngay vào Team đó.</>
            )}</span>
          </div>

          <div className="space-y-3">
            {rules.map((r) => (
              <div
                key={r.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center md:justify-between gap-4 ${
                  r.isActive
                    ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs'
                    : 'bg-slate-50/70 border-slate-200 opacity-60'
                }`}
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono font-black text-xs px-2.5 py-0.5 rounded-lg bg-purple-100 text-purple-800 border border-purple-200 shadow-2xs">
                      {isEn ? 'Priority' : 'Ưu tiên'} #{r.priority}
                    </span>
                    <h4 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{getLocalizedRuleName(r.name, isEn)}</span>
                      {!r.isActive && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-600 text-[10px] font-bold">
                          Đang tắt
                        </span>
                      )}
                    </h4>

                    {/* Target Person or Whole Team Badge */}
                    {r.targetUser ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 text-[11px] font-bold border border-blue-200 flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                        <span>{isEn ? 'Direct Assignee:' : 'Gán đích danh:'} <strong>{r.targetUser.fullName}</strong> {r.targetUser.position ? `(${r.targetUser.position})` : ''}</span>
                      </span>
                    ) : r.autoAssign ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{isEn ? 'Auto-Assign by Workload' : 'Auto-Assign theo tải công việc'}</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold border border-slate-200 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-600" />
                        <span>{isEn ? 'Whole Team Receives (Shared Queue)' : 'Cả Team cùng nhận (Hàng đợi chung)'}</span>
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400">{getLocalizedRuleDesc(r.description, isEn) || (isEn ? 'No additional description' : 'Không có mô tả bổ sung')}</p>

                  {/* Conditions pills */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1 text-xs">
                    <span className="font-bold text-slate-400 text-[11px]">{isEn ? 'Conditions (AND):' : 'Điều kiện (AND):'}</span>
                    {r.conditions?.map((c: any, i: number) => (
                      <span key={i} className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium text-[11.5px] border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                        <span className="text-slate-500 font-mono">{c.field}</span>
                        <span className="text-purple-600 font-bold">{c.operator === 'equals' ? '=' : c.operator}</span>
                        <strong className="text-purple-800 dark:text-purple-300">"{c.value}"</strong>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Target Team & Actions */}
                <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end border-t md:border-t-0 pt-2 md:pt-0 border-slate-100">
                  <div className="text-left md:text-right">
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{isEn ? 'DISPATCH TO IT TEAM' : 'CHUYỂN ĐẾN TEAM IT'}</div>
                    <div className="font-black text-xs text-purple-700 dark:text-purple-300 flex items-center gap-1.5 mt-0.5">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>{getLocalizedTeamName(r.targetTeam?.name, isEn) || (isEn ? 'Unassigned Team' : 'Chưa gán Team')}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleToggleRuleActive(r)}
                      title={r.isActive ? 'Tạm ngắt luật này' : 'Kích hoạt luật này'}
                      className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                        r.isActive ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 'text-slate-400 bg-slate-100 border-slate-200'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEditRule(r)}
                      title="Chỉnh sửa sâu luật phân tuyến"
                      className="p-1.5 text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-xl transition-colors cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteRule(r)}
                      title="Xóa luật này"
                      className="p-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: PHẠM VI PHỤ TRÁCH & TỔ CHỨC TEAM IT (SCOPE MATRIX) */}
      {activeTab === 'SCOPE' && (
        <div className="space-y-4">
          <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900 text-xs text-indigo-950 dark:text-indigo-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <strong>💡 Logic Phân Bổ Theo Địa Bàn:</strong> Khi nhân viên tại một <strong>Công ty</strong> hoặc <strong>Nhà máy/Văn phòng</strong> gửi yêu cầu, hệ thống sẽ ưu tiên phân tuyến trực tiếp về Team IT phụ trách khu vực đó.
            </div>
            <button
              type="button"
              onClick={handleOpenCreateTeam}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-1 shrink-0 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Thêm Team IT Mới</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[850px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase">
                    <th className="py-3 px-4 min-w-[240px]">TEAM IT CHUYÊN TRÁCH</th>
                    <th className="py-3 px-4 min-w-[200px]">CÔNG TY / ĐƠN VỊ PHỤ TRÁCH</th>
                    <th className="py-3 px-4 min-w-[180px]">ĐỊA ĐIỂM / NƠI LÀM VIỆC</th>
                    <th className="py-3 px-4 min-w-[200px]">KỸ THUẬT VIÊN TRỰC THUỘC</th>
                    <th className="py-3 px-4 text-right min-w-[90px]">THAO TÁC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {masterData.teams.map((t) => {
                    const memberNames = (t.members || []).map((m: any) => m.user?.fullName).filter(Boolean);
                    const isAllTeam = t.code === 'IT-ALL';

                    return (
                      <tr key={t.id} className="hover:bg-purple-50/30 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-purple-900 dark:text-purple-300">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] px-2 py-0.5 rounded-lg bg-purple-100 text-purple-800 font-bold border border-purple-200">
                              {t.code}
                            </span>
                            <span className="font-bold text-slate-900 dark:text-white text-xs">{t.name}</span>
                          </div>
                          {t.description && (
                            <p className="text-[11px] text-slate-400 font-normal mt-0.5 line-clamp-1">{t.description}</p>
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                          <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-400">
                            <Building2 className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{t.companyScope || 'Toàn tập đoàn (Tất cả đơn vị)'}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span className="truncate">{t.locationScope || 'Toàn quốc'}</span>
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-xs">
                          {isAllTeam ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 font-bold text-[11px]">
                              ⚡ {itPersonnel.length} Chuyên viên IT toàn tập đoàn
                            </span>
                          ) : memberNames.length > 0 ? (
                            <div className="flex items-center gap-1 flex-wrap">
                              {memberNames.map((name: string, i: number) => (
                                <span key={i} className="px-2 py-0.5 bg-slate-100 rounded-md text-[11px] font-medium text-slate-700">
                                  👤 {name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Chưa gán thành viên</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditTeam(t)}
                              title="Chỉnh sửa Team & Phân công thành viên"
                              className="p-1.5 text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-xl transition-colors cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            {!isAllTeam && (
                              <button
                                type="button"
                                onClick={() => handleDeleteTeam(t)}
                                title="Xóa Team này"
                                className="p-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: HÀNG ĐỢI (QUEUES) */}
      {activeTab === 'QUEUES' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Mỗi Team có thể có nhiều Hàng đợi chuyên trách. Hàng đợi <strong>Fallback Queue</strong> là nơi tiếp nhận an toàn khi không khớp Rule nào.</span>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase">
                  <th className="py-3 px-4 min-w-[120px]">MÃ QUEUE</th>
                  <th className="py-3 px-4 min-w-[240px]">TÊN HÀNG ĐỢI</th>
                  <th className="py-3 px-4 min-w-[200px]">TEAM PHỤ TRÁCH</th>
                  <th className="py-3 px-4 min-w-[170px]">LOẠI HÀNG ĐỢI</th>
                  <th className="py-3 px-4 text-center min-w-[110px]">TRẠNG THÁI</th>
                  <th className="py-3 px-4 text-right min-w-[90px]">THAO TÁC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {masterData.queues.map((q) => (
                  <tr key={q.id} className="hover:bg-purple-50/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-purple-600">{q.code}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{q.name}</td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-semibold">{q.team?.name || 'N/A'}</td>
                    <td className="py-3.5 px-4">
                      {q.isDefault ? (
                        <span className="whitespace-nowrap inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-black">
                          ★ Fallback Queue Mặc Định
                        </span>
                      ) : (
                        <span className="whitespace-nowrap inline-flex items-center px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium">
                          Hàng đợi chuyên trách
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-xs">
                        Đang hoạt động
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditQueue(q)}
                          title="Sửa hàng đợi"
                          className="p-1.5 text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-xl transition-colors cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        {!q.isDefault && (
                          <button
                            type="button"
                            onClick={() => handleDeleteQueue(q)}
                            title="Xóa hàng đợi"
                            className="p-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: CAM KẾT THỜI HẠN XỬ LÝ (QUY CHUẨN SLA) */}
      {activeTab === 'SLA' && (
        <div className="space-y-6 animate-in fade-in">
          {slaToast && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{slaToast}</span>
            </div>
          )}

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Tổng Quy Chuẩn SLA</span>
              <strong className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">{slaPolicies.length}</strong>
              <span className="text-[10.5px] text-slate-500">Quy định cam kết dịch vụ</span>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Đang Áp Dụng</span>
              <strong className="text-2xl font-black text-emerald-600 mt-1 block">
                {slaPolicies.filter((p) => p.isActive).length}
              </strong>
              <span className="text-[10.5px] text-emerald-700 font-semibold">Quy chuẩn hiệu lực</span>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Hỏa Tốc / Khẩn Cấp</span>
              <strong className="text-2xl font-black text-rose-600 mt-1 block">
                {slaPolicies.filter((p) => p.priorityLevel === 'URGENT' || p.code === 'VIP' || p.resolutionTimeHours <= 4).length}
              </strong>
              <span className="text-[10.5px] text-rose-700 font-semibold">Xử lý &le; 4 giờ</span>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Tiêu Chuẩn / Định Kỳ</span>
              <strong className="text-2xl font-black text-blue-600 mt-1 block">
                {slaPolicies.filter((p) => p.resolutionTimeHours > 4).length}
              </strong>
              <span className="text-[10.5px] text-blue-700 font-semibold">Xử lý 24h - 72h</span>
            </div>
          </div>

          {/* Dynamic SLA Policies Table / Card Box */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/40">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span>Danh Sách Quy Chuẩn Cam Kết Thời Hạn SLA Toàn Tập Đoàn</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tùy chỉnh thêm, sửa hoặc xóa các quy chuẩn cam kết thời gian tiếp nhận và xử lý sự cố theo nhu cầu thực tế
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenCreateSla}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Thêm Quy Chuẩn SLA</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[760px]">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4 min-w-[200px]">QUY CHUẨN & MÃ CODE</th>
                    <th className="py-3.5 px-4 min-w-[130px]">MỨC ĐỘ ƯU TIÊN</th>
                    <th className="py-3.5 px-4 min-w-[130px]">TIẾP NHẬN / PHẢN HỒI</th>
                    <th className="py-3.5 px-4 min-w-[130px]">XỬ LÝ HOÀN THÀNH</th>
                    <th className="py-3.5 px-4 min-w-[220px]">PHẠM VI ÁP DỤNG</th>
                    <th className="py-3.5 px-4 text-center min-w-[100px]">TRẠNG THÁI</th>
                    <th className="py-3.5 px-4 text-right min-w-[100px]">THAO TÁC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {slaPolicies.map((policy) => {
                    const colorClasses: Record<string, string> = {
                      rose: 'bg-rose-50 text-rose-800 border-rose-200',
                      orange: 'bg-orange-50 text-orange-800 border-orange-200',
                      blue: 'bg-blue-50 text-blue-800 border-blue-200',
                      emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                      purple: 'bg-purple-50 text-purple-800 border-purple-200',
                      cyan: 'bg-cyan-50 text-cyan-800 border-cyan-200',
                      amber: 'bg-amber-50 text-amber-800 border-amber-200',
                    };
                    const badgeClass = colorClasses[policy.color] || colorClasses.blue;

                    return (
                      <tr
                        key={policy.id}
                        className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors ${
                          !policy.isActive ? 'opacity-50 bg-slate-50/30' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <span className="text-lg shrink-0">{policy.icon || '⏱️'}</span>
                            <div className="min-w-0">
                              <strong className="block font-bold text-slate-900 dark:text-white truncate">
                                {policy.name}
                              </strong>
                              <span className="font-mono text-[10.5px] font-bold text-slate-400">
                                Code: {policy.code}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badgeClass} inline-flex items-center gap-1`}>
                            <span>{policy.priorityLevel}</span>
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-800 dark:text-slate-200">
                            {policy.responseTimeHours < 1
                              ? `${Math.round(policy.responseTimeHours * 60)} Phút`
                              : `${policy.responseTimeHours} Giờ`}
                          </div>
                          <span className="text-[10px] text-slate-400">Cam kết phản hồi</span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-black text-blue-700 dark:text-blue-400 text-sm">
                            {policy.resolutionTimeHours} Giờ
                          </div>
                          <span className="text-[10px] text-slate-400">Hạn chót đóng ca</span>
                        </td>

                        <td className="py-3.5 px-4">
                          <p className="text-slate-600 dark:text-slate-400 text-[11px] line-clamp-2 max-w-xs">
                            {policy.description || 'Áp dụng cho các ca xử lý thông thường'}
                          </p>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleSlaPolicy(policy.id)}
                            className={`px-2.5 py-1 rounded-full text-[10.5px] font-bold transition-all cursor-pointer ${
                              policy.isActive
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-slate-200 text-slate-600 border border-slate-300'
                            }`}
                          >
                            {policy.isActive ? '● Đang Bật' : '○ Tạm Dừng'}
                          </button>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditSla(policy)}
                              title="Chỉnh sửa quy chuẩn SLA này"
                              className="p-1.5 text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-xl transition-colors cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteSlaPolicy(policy)}
                              title="Xóa quy chuẩn SLA này"
                              className="p-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Smart SLA Protections & Audit Guidelines */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div className="p-5 bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-3xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-purple-950 dark:text-purple-200 flex items-center gap-1.5">
                  <span>⏸️</span>
                  <span>Tự Động Đóng Băng SLA Khi Chờ Phản Hồi</span>
                </span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px] border border-emerald-300">
                  Đang Kích Hoạt
                </span>
              </div>
              <p className="text-[11px] text-purple-800 leading-relaxed">
                Khi kỹ thuật viên chuyển ticket sang trạng thái <strong>WAITING</strong> (Chờ người dùng gửi thêm thông tin / Chờ hãng bảo hành linh kiện), đồng hồ SLA sẽ tạm dừng và tự động cộng bù giờ khi tiếp tục xử lý.
              </p>
            </div>

            <div className="p-5 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-3xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                  <span>🛡️</span>
                  <span>Gia Hạn SLA Có Kiểm Toán Minh Bạch</span>
                </span>
                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full font-bold text-[10px] border border-indigo-300">
                  Audit Log
                </span>
              </div>
              <p className="text-[11px] text-indigo-800 leading-relaxed">
                Đối với các ca sự cố phức tạp hơn mô tả ban đầu, kỹ thuật viên có thể xin gia hạn thời hạn SLA kèm lý do rõ ràng. Hệ thống ghi nhật ký kiểm toán nhằm đảm bảo tính minh bạch và tránh lạm dụng.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: THÊM / SỬA TEAM IT & PHẠM VI (TEAM MODAL) */}
      {isTeamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full flex flex-col max-h-[92vh] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 shrink-0">
              <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>{editingTeamId ? 'Chỉnh Sửa Team IT & Phạm Vi Phụ Trách' : 'Thêm Mới Team IT / Tổ Chuyên Môn'}</span>
              </h3>
              <button type="button" onClick={() => setIsTeamModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <form id="team-form" onSubmit={handleSaveTeam} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Tên Team IT (*)</label>
                  <input
                    required
                    placeholder="VD: Đội IT On-site Trung tâm Vận hành Miền Nam Đồng Nai"
                    value={teamForm.name}
                    onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-bold outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mã Code (*)</label>
                  <input
                    required
                    placeholder="IT-Chi nhánh Miền Nam-DN"
                    value={teamForm.code}
                    onChange={(e) => setTeamForm({ ...teamForm, code: e.target.value.toUpperCase() })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-mono font-bold text-purple-700 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Công Ty Phụ Trách (Master Data):</label>
                  <select
                    value={teamForm.companyScope}
                    onChange={(e) => setTeamForm({ ...teamForm, companyScope: e.target.value })}
                    className="w-full p-2.5 bg-indigo-50/50 border border-indigo-200 rounded-xl font-bold text-indigo-950 outline-none truncate"
                  >
                    <option value="">Toàn tập đoàn (Tất cả đơn vị)</option>
                    {masterData.companies.map((comp) => (
                      <option key={comp} value={comp}>🏢 {comp}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Khu vực / Địa điểm Phụ Trách:</label>
                  <select
                    value={teamForm.locationScope}
                    onChange={(e) => setTeamForm({ ...teamForm, locationScope: e.target.value })}
                    className="w-full p-2.5 bg-blue-50/50 border border-blue-200 rounded-xl font-bold text-blue-950 outline-none truncate"
                  >
                    <option value="">Toàn quốc (Tất cả địa điểm)</option>
                    {masterData.locations.map((loc: any) => (
                      <option key={loc.id || loc.name} value={loc.name}>📍 {loc.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Members Selection (Checkboxes) */}
              <div className="p-3 bg-purple-50/60 rounded-2xl border border-purple-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-purple-950 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-purple-600" />
                    <span>Phân Công Kỹ Thuật Viên IT Thuộc Team Này:</span>
                  </label>
                  <span className="text-[11px] font-bold text-purple-700">
                    Đã chọn: {teamForm.memberIds.length} người
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {itPersonnel.map((u: any) => {
                    const isSelected = teamForm.memberIds.includes(u.id);
                    return (
                      <div
                        key={u.id}
                        onClick={() => toggleMemberSelection(u.id)}
                        className={`p-2 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-purple-600 text-white border-purple-600 font-bold shadow-2xs'
                            : 'bg-white text-slate-800 border-slate-200 hover:bg-purple-50'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded flex items-center justify-center border ${isSelected ? 'bg-white text-purple-600 border-white' : 'border-slate-300'}`}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div className="min-w-0 flex-1 truncate">
                          <div className="text-xs truncate">{u.fullName}</div>
                          <div className={`text-[10px] truncate ${isSelected ? 'text-purple-100' : 'text-slate-400'}`}>
                            {u.position || cleanSubDept(u.department)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mô tả nhiệm vụ / ghi chú:</label>
                <input
                  type="text"
                  placeholder="Mô tả phạm vi hỗ trợ và nhiệm vụ của team..."
                  value={teamForm.description}
                  onChange={(e) => setTeamForm({ ...teamForm, description: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl outline-none"
                />
              </div>
            </form>

            {/* Modal Sticky Footer */}
            <div className="flex justify-end gap-2 px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 shrink-0">
              <button
                type="button"
                onClick={() => setIsTeamModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl font-semibold text-slate-700 hover:bg-white cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                form="team-form"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{editingTeamId ? 'Cập Nhật Team IT' : 'Tạo Team IT Mới'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: THÊM / SỬA HÀNG ĐỢI (QUEUE MODAL) */}
      {isQueueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-600" />
                <span>{editingQueueId ? 'Chỉnh Sửa Hàng Đợi (Queue)' : 'Thêm Mới Hàng Đợi (Queue)'}</span>
              </h3>
              <button type="button" onClick={() => setIsQueueModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveQueue} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Tên hàng đợi (*)</label>
                  <input
                    required
                    placeholder="VD: Hàng Đợi ERP, Hàng Đợi Mạng..."
                    value={queueForm.name}
                    onChange={(e) => setQueueForm({ ...queueForm, name: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-bold outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mã Queue (*)</label>
                  <input
                    required
                    placeholder="Q-ERP"
                    value={queueForm.code}
                    onChange={(e) => setQueueForm({ ...queueForm, code: e.target.value.toUpperCase() })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-mono font-bold text-purple-700 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Team IT phụ trách (*)</label>
                <select
                  required
                  value={queueForm.teamId}
                  onChange={(e) => setQueueForm({ ...queueForm, teamId: e.target.value })}
                  className="w-full p-2.5 border border-purple-300 bg-purple-50/40 rounded-xl font-bold text-purple-900 outline-none"
                >
                  <option value="">-- Chọn Team IT --</option>
                  {masterData.teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      🏢 {t.name} ({t.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mô tả chức năng</label>
                <input
                  type="text"
                  placeholder="Mô tả các loại Ticket được đưa vào hàng đợi này..."
                  value={queueForm.description}
                  onChange={(e) => setQueueForm({ ...queueForm, description: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl outline-none"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-amber-900 text-xs">Đặt làm Fallback Queue Mặc Định</div>
                  <div className="text-[11px] text-amber-700">Ticket không khớp luật nào sẽ tự động rơi vào đây</div>
                </div>
                <input
                  type="checkbox"
                  checked={queueForm.isDefault}
                  onChange={(e) => setQueueForm({ ...queueForm, isDefault: e.target.checked })}
                  className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsQueueModalOpen(false)}
                  className="px-4 py-2 border rounded-xl font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-md cursor-pointer flex items-center gap-1"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{editingQueueId ? 'Cập Nhật Hàng Đợi' : 'Tạo Hàng Đợi Mới'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK ACTION MODAL: ROUTING SIMULATOR */}
      {isSimulatorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 border border-slate-200 dark:border-slate-800 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-100 text-amber-700">
                  <FlaskConical className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-black text-base text-slate-900 dark:text-white">
                    Kiểm Tra Phân Tuyến Trực Tiếp (Routing Simulator)
                  </h3>
                  <p className="text-xs text-slate-400">Giả lập ngữ cảnh thực tế từ Master Data để xem kết quả phân luồng (Không tạo Ticket thật)</p>
                </div>
              </div>
              <button type="button" onClick={() => setIsSimulatorOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">🏢 Công ty / Đơn vị (Master Data):</label>
                  <select
                    value={simContext.companyName}
                    onChange={(e) => setSimContext({ ...simContext, companyName: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-xl bg-slate-50 font-semibold truncate"
                  >
                    {masterData.companies.map((c) => (
                      <option key={c} value={c}>🏢 {c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">📍 Nơi làm việc (Master Data):</label>
                  <select
                    value={simContext.userLocation}
                    onChange={(e) => setSimContext({ ...simContext, userLocation: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-xl bg-slate-50 font-semibold truncate"
                  >
                    {masterData.locations.map((l: any) => (
                      <option key={l.id || locName(l)} value={locName(l)}>📍 {locName(l)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">👥 Phòng ban (Master Data):</label>
                  <select
                    value={simContext.userDepartment}
                    onChange={(e) => setSimContext({ ...simContext, userDepartment: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-xl bg-slate-50 font-semibold truncate"
                  >
                    <option value="Ban Công Nghệ Thông Tin (IT / CNTT)">⚡ Ban Công Nghệ Thông Tin (IT / CNTT)</option>
                    <option value="Khối Tài Chính & Kế Toán">💰 Khối Tài Chính & Kế Toán</option>
                    <option value="Khối Kinh Doanh & Thị Trường">📈 Khối Kinh Doanh & Thị Trường</option>
                    <option value="Khối Nhân Sự & Hành Chính">👥 Khối Nhân Sự & Hành Chính</option>
                    <option value="Khối Vận Hành & Sản Xuất">🏭 Khối Vận Hành & Sản Xuất</option>
                    <option value="Ban Giám Đốc & HĐQT">🏛️ Ban Giám Đốc & HĐQT</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">📂 Danh mục sự cố:</label>
                  <select
                    value={simContext.category}
                    onChange={(e) => setSimContext({ ...simContext, category: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-xl bg-slate-50 font-semibold truncate"
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">🔍 Tiêu đề / Mô tả sự cố giả lập:</label>
                <input
                  type="text"
                  value={simContext.title}
                  onChange={(e) => setSimContext({ ...simContext, title: e.target.value })}
                  placeholder="Nhập tiêu đề sự cố..."
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-medium"
                />
              </div>

              <button
                type="button"
                onClick={handleRunSimulation}
                disabled={isSimulating}
                className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                {isSimulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                <span>Chạy Giả Lập Phân Tuyến Ngay</span>
              </button>
            </div>

            {/* Simulation Results Tree */}
            {simResult && (
              <div className="p-4 bg-amber-50/80 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-900 space-y-3 text-xs animate-in fade-in">
                <div className="font-black text-sm text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>KẾT QUẢ ĐIỀU PHỐI TỰ ĐỘNG:</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-800 dark:text-slate-200">
                  <div className="p-2.5 bg-white rounded-xl border border-amber-200">
                    <span className="text-slate-400 text-[10.5px] block font-bold">LUẬT ĐƯỢC ÁP DỤNG:</span>
                    <strong className="text-purple-700 text-xs">{simResult.matchedRule || 'Fallback Mặc Định'}</strong>
                  </div>

                  <div className="p-2.5 bg-white rounded-xl border border-amber-200">
                    <span className="text-slate-400 text-[10.5px] block font-bold">TEAM IT TIẾP NHẬN:</span>
                    <strong className="text-indigo-700 text-xs">{simResult.teamName || 'Ban CNTT'}</strong>
                  </div>

                  <div className="p-2.5 bg-white rounded-xl border border-amber-200">
                    <span className="text-slate-400 text-[10.5px] block font-bold">HÀNG ĐỢI (QUEUE):</span>
                    <strong className="text-slate-900 text-xs">{simResult.queueName || 'Default Queue'}</strong>
                  </div>

                  <div className="p-2.5 bg-white rounded-xl border border-amber-200">
                    <span className="text-slate-400 text-[10.5px] block font-bold">NGƯỜI XỬ LÝ (ASSIGNEE):</span>
                    <strong className="text-emerald-700 text-xs">{simResult.assigneeName || 'Toàn bộ Team cùng nhận (Hàng đợi)'}</strong>
                  </div>
                </div>

                <div className="space-y-1 pt-2 border-t border-amber-200 font-mono text-[11px] text-amber-900">
                  {simResult.log?.map((l: string, idx: number) => (
                    <div key={idx}>{l}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: TẠO / SỬA RULE PHÂN TUYẾN SÂU (RULE BUILDER) */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full flex flex-col max-h-[92vh] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 shrink-0">
              <div>
                <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-purple-600" />
                  <span>{editingRuleId ? 'Chỉnh Sửa Luật Phân Tuyến' : 'Tạo Mới Luật Phân Tuyến'}</span>
                </h3>
                <p className="text-xs text-slate-400">Tham chiếu trực tiếp Master Data để thiết lập điều kiện và gán Team/Kỹ thuật viên</p>
              </div>
              <button type="button" onClick={() => setIsRuleModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <form id="rule-form" onSubmit={handleSaveRule} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tên bộ luật (*)</label>
                  <input
                    required
                    placeholder="VD: Sự Cố Phần Mềm & ERP, Lỗi Mạng WiFi HN..."
                    value={ruleForm.name}
                    onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Mức ưu tiên (*)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={100}
                    value={ruleForm.priority}
                    onChange={(e) => setRuleForm({ ...ruleForm, priority: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-bold text-purple-700 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Mô tả quy tắc</label>
                <input
                  placeholder="Mô tả phạm vi áp dụng của rule này..."
                  value={ruleForm.description}
                  onChange={(e) => setRuleForm({ ...ruleForm, description: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl outline-none"
                />
              </div>

              {/* Target Team & Target IT Specialist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Chuyển đến Team IT đích (*)</label>
                  <select
                    required
                    value={ruleForm.targetTeamId}
                    onChange={(e) => {
                      setRuleForm({ ...ruleForm, targetTeamId: e.target.value, targetUserId: '' });
                    }}
                    className="w-full p-2.5 border border-purple-300 bg-purple-50/40 rounded-xl font-bold text-purple-900 outline-none truncate"
                  >
                    <option value="">-- Chọn Team IT --</option>
                    {masterData.teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        🏢 {t.name} ({t.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Kỹ thuật viên gán thẳng (Tùy chọn)</label>
                  <select
                    value={ruleForm.targetUserId}
                    onChange={(e) => setRuleForm({ ...ruleForm, targetUserId: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-bold text-slate-800 outline-none truncate"
                  >
                    {renderTeamSpecificUserOptions(ruleForm.targetTeamId)}
                  </select>
                </div>
              </div>

              <div className="p-2.5 bg-blue-50/80 rounded-xl border border-blue-200 text-blue-900 text-[11px] flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  {ruleForm.targetUserId
                    ? '🎯 Bạn đã chọn gán thẳng cho 1 Kỹ thuật viên cụ thể. Ticket sẽ chuyển trực tiếp cho người này.'
                    : '👥 Bạn đang để trống: Ticket sẽ vào Hàng đợi chung của Team để TOÀN BỘ thành viên trong Team cùng nhận được.'}
                </span>
              </div>

              {/* Conditions Builder - Grid with zero overflow */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                    Điều kiện lọc (Đồng thời thỏa mãn - AND):
                  </span>
                  <button
                    type="button"
                    onClick={handleAddCondition}
                    className="px-2.5 py-1 bg-white border border-slate-300 hover:border-purple-400 rounded-lg text-purple-700 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Thêm điều kiện</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {ruleForm.conditions.map((cond, idx) => (
                    <div
                      key={idx}
                      className="w-full grid grid-cols-1 sm:grid-cols-[160px_130px_minmax(0,1fr)_32px] gap-2 items-center bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs"
                    >
                      <div className="min-w-0">
                        <select
                          value={cond.field}
                          onChange={(e) => handleConditionFieldChange(idx, e.target.value)}
                          className="w-full p-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 bg-slate-50 outline-none truncate"
                        >
                          {FIELD_OPTIONS.map((f) => (
                            <option key={f.value} value={f.value}>{f.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="min-w-0">
                        <select
                          value={cond.operator}
                          onChange={(e) => handleConditionOperatorChange(idx, e.target.value)}
                          className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-600 bg-white outline-none truncate"
                        >
                          {OPERATOR_OPTIONS.map((op) => (
                            <option key={op.value} value={op.value}>{op.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="min-w-0 flex-1">
                        {renderConditionValueInput(cond, idx)}
                      </div>

                      <div className="flex justify-end items-center">
                        {ruleForm.conditions.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => handleRemoveCondition(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                            title="Xóa điều kiện này"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <div className="w-4 h-4" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </form>

            {/* Modal Sticky Footer */}
            <div className="flex justify-end gap-2 px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 shrink-0">
              <button
                type="button"
                onClick={() => setIsRuleModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl font-semibold text-slate-700 hover:bg-white cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                form="rule-form"
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{editingRuleId ? 'Cập Nhật Luật' : 'Lưu Luật Mới'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: THÊM / SỬA QUY CHUẨN SLA (SLA MODAL) */}
      {isSlaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full flex flex-col max-h-[92vh] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 shrink-0">
              <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>{editingSlaId ? 'Chỉnh Sửa Quy Chuẩn SLA' : 'Thêm Mới Quy Chuẩn Cam Kết SLA'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsSlaModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Form Body */}
            <form id="sla-form" onSubmit={handleSaveSlaForm} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tên Quy Chuẩn Cam Kết (*)
                  </label>
                  <input
                    required
                    placeholder="VD: VIP & Lãnh Đạo Tập Đoàn"
                    value={slaForm.name}
                    onChange={(e) => setSlaForm({ ...slaForm, name: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-bold outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Mã Định Danh (Code) (*)
                  </label>
                  <input
                    required
                    placeholder="VIP / P1 / INFRA"
                    value={slaForm.code}
                    onChange={(e) => setSlaForm({ ...slaForm, code: e.target.value.toUpperCase() })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-mono font-bold text-blue-700 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Cấp Độ Ưu Tiên Áp Dụng:
                  </label>
                  <select
                    value={slaForm.priorityLevel}
                    onChange={(e) => setSlaForm({ ...slaForm, priorityLevel: e.target.value as any })}
                    className="w-full p-2.5 bg-blue-50/50 border border-blue-200 rounded-xl font-bold text-blue-950 outline-none"
                  >
                    <option value="URGENT">🔥 URGENT (Khẩn cấp)</option>
                    <option value="HIGH">⚡ HIGH (Mức cao)</option>
                    <option value="MEDIUM">🟡 MEDIUM (Trung bình)</option>
                    <option value="LOW">🟢 LOW (Mức thấp)</option>
                    <option value="CUSTOM">👑 CUSTOM (Chuyên biệt)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Hạn Phản Hồi (Giờ):
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.05"
                    max="72"
                    required
                    value={slaForm.responseTimeHours}
                    onChange={(e) => setSlaForm({ ...slaForm, responseTimeHours: parseFloat(e.target.value) || 0.25 })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-bold outline-none"
                  />
                  <span className="text-[10.5px] text-slate-400 mt-0.5 block">
                    VD: 0.25 = 15 phút, 0.5 = 30 phút, 1 = 1 giờ
                  </span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Hạn Xử Lý Hoàn Thành (Giờ):
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="720"
                    required
                    value={slaForm.resolutionTimeHours}
                    onChange={(e) => setSlaForm({ ...slaForm, resolutionTimeHours: parseFloat(e.target.value) || 4 })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-bold text-blue-700 outline-none"
                  />
                  <span className="text-[10.5px] text-slate-400 mt-0.5 block">
                    VD: 2h, 4h, 8h, 24h, 48h, 72h
                  </span>
                </div>
              </div>

              {/* Icon & Color Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Biểu Tượng Icon:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {['🔥', '⚡', '🟡', '🟢', '👑', '🖥️', '🌐', '💼', '🛡️', '🚀', '⏳', '☕'].map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setSlaForm({ ...slaForm, icon: emoji })}
                        className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm transition-all cursor-pointer ${
                          slaForm.icon === emoji
                            ? 'bg-blue-600 text-white shadow-xs scale-110'
                            : 'bg-white hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Màu Sắc Nhận Diện:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'rose', name: 'Đỏ', bg: 'bg-rose-500' },
                      { id: 'orange', name: 'Cam', bg: 'bg-orange-500' },
                      { id: 'blue', name: 'Xanh', bg: 'bg-blue-500' },
                      { id: 'emerald', name: 'Lục', bg: 'bg-emerald-500' },
                      { id: 'purple', name: 'Tím', bg: 'bg-purple-500' },
                      { id: 'cyan', name: 'Cyan', bg: 'bg-cyan-500' },
                      { id: 'amber', name: 'Vàng', bg: 'bg-amber-500' },
                    ].map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSlaForm({ ...slaForm, color: c.id })}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold text-white transition-all cursor-pointer flex items-center gap-1 ${c.bg} ${
                          slaForm.color === c.id ? 'ring-2 ring-offset-2 ring-slate-800 scale-105' : 'opacity-80 hover:opacity-100'
                        }`}
                      >
                        {slaForm.color === c.id && <Check className="w-3 h-3 stroke-[3]" />}
                        <span>{c.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mô Tả Chi Tiết Phạm Vi & Trường Hợp Áp Dụng:
                </label>
                <textarea
                  rows={3}
                  placeholder="Mô tả cụ thể sự cố, đối tượng hoặc điều kiện để áp dụng quy chuẩn SLA này..."
                  value={slaForm.description}
                  onChange={(e) => setSlaForm({ ...slaForm, description: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl outline-none"
                />
              </div>

              <div className="flex items-center gap-2 p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                <input
                  type="checkbox"
                  id="sla-is-active"
                  checked={slaForm.isActive}
                  onChange={(e) => setSlaForm({ ...slaForm, isActive: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                />
                <label htmlFor="sla-is-active" className="font-bold text-emerald-950 cursor-pointer">
                  Kích hoạt và áp dụng quy chuẩn SLA này ngay lập tức
                </label>
              </div>
            </form>

            {/* Modal Sticky Footer */}
            <div className="flex justify-end gap-2 px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 shrink-0">
              <button
                type="button"
                onClick={() => setIsSlaModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl font-semibold text-slate-700 hover:bg-white cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                form="sla-form"
                disabled={savingSla}
                className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-md cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {savingSla ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>{editingSlaId ? 'Cập Nhật Quy Chuẩn SLA' : 'Lưu Quy Chuẩn SLA Mới'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function locName(l: any) {
  return typeof l === 'string' ? l : l.name || '';
}
