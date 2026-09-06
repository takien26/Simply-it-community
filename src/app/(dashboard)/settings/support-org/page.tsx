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
  Edit2,
  Save,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Shield,
  Briefcase,
  MapPin,
  Tag,
  ArrowRight,
  TrendingUp,
  Cpu,
  BrainCircuit,
  Wrench,
  X,
  ChevronDown,
  ChevronRight,
  Loader2,
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
  team?: { name: string };
  activeTicketCount?: number;
}

interface Rule {
  id: string;
  name: string;
  description?: string;
  priority: number;
  isActive: boolean;
  conditions: any[];
  targetTeamId: string;
  targetQueueId?: string | null;
  autoAssign: boolean;
  targetTeam?: { name: string };
}

const COMMON_SKILLS = [
  'Network',
  'WiFi',
  'VPN',
  'Firewall',
  'Microsoft 365',
  'ERP SAP/Bravo',
  'CRM',
  'Windows Server',
  'Active Directory',
  'Hardware & Laptop',
  'Máy in & Scan',
  'Bảo mật & Security',
  'Tổng đài VoIP',
];

export default function SupportOrgSettingsPage() {
  const { language, t } = useLanguage();
  const isEn = language === 'en';
  const [activeTab, setActiveTab] = useState<'TEAMS' | 'QUEUES' | 'MEMBERS' | 'RULES' | 'INSIGHTS'>('TEAMS');

  const [teams, setTeams] = useState<Team[]>([]);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);

  // Forms
  const [teamForm, setTeamForm] = useState({
    name: '',
    code: '',
    description: '',
    parentId: '',
    companyScope: '',
    locationScope: '',
    sortOrder: 0,
  });

  const [queueForm, setQueueForm] = useState({
    name: '',
    code: '',
    teamId: '',
    description: '',
    isDefault: false,
  });

  const [ruleForm, setRuleForm] = useState({
    name: '',
    description: '',
    priority: 10,
    targetTeamId: '',
    targetQueueId: '',
    autoAssign: true,
    conditions: [{ field: 'category', operator: 'equals', value: 'NETWORK' }],
  });

  const [memberForm, setMemberForm] = useState({
    teamId: '',
    userId: '',
    role: 'MEMBER',
    primarySkills: [] as string[],
    secondarySkills: [] as string[],
    skillLevel: 'MID',
    maxTickets: 20,
  });

  // Simulator state
  const [simContext, setSimContext] = useState({
    category: 'NETWORK',
    subCategory: 'WiFi Tầng 3',
    companyName: 'ABC Technology',
    userLocation: 'Hà Nội',
    title: 'Mất kết nối WiFi toàn văn phòng',
    description: 'Không thể kết nối Internet',
  });
  const [simResult, setSimResult] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tRes, qRes, rRes, uRes] = await Promise.all([
        fetch('/api/support-teams').then((r) => r.json()),
        fetch('/api/support-queues').then((r) => r.json()),
        fetch('/api/routing-rules').then((r) => r.json()),
        fetch('/api/users').then((r) => r.json()),
      ]);

      if (tRes.success) setTeams(tRes.data);
      if (qRes.success) setQueues(qRes.data);
      if (rRes.success) setRules(rRes.data);
      if (uRes.success) setUsers(uRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/support-teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teamForm),
      });
      if (res.ok) {
        setIsTeamModalOpen(false);
        setTeamForm({ name: '', code: '', description: '', parentId: '', companyScope: '', locationScope: '', sortOrder: 0 });
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/support-queues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(queueForm),
      });
      if (res.ok) {
        setIsQueueModalOpen(false);
        setQueueForm({ name: '', code: '', teamId: '', description: '', isDefault: false });
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/routing-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ruleForm),
      });
      if (res.ok) {
        setIsRuleModalOpen(false);
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberForm.teamId) return;
    try {
      const res = await fetch(`/api/support-teams/${memberForm.teamId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(memberForm),
      });
      if (res.ok) {
        setIsMemberModalOpen(false);
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

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

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20">
              <Cpu className="w-5 h-5" />
            </span>
            <span>{isEn ? 'IT Support Organization & Routing Engine' : 'Cấu Hình Tổ Chức IT & Routing Engine'}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isEn
              ? 'Configure IT team hierarchies, support queues, skill-based technician assignments, and automated ticket dispatch rules'
              : 'Thiết lập mô hình phân cấp IT, Hàng đợi (Queue), Đội ngũ kỹ năng và Bộ luật Tự động Phân tuyến Ticket'}
          </p>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-px">
        {[
          { id: 'TEAMS', label: isEn ? '1. IT Teams Hierarchy' : '1. Cấu Trúc Đội Ngũ IT (Teams)', icon: Building2 },
          { id: 'QUEUES', label: isEn ? '2. Support Queues' : '2. Hàng Đợi (Support Queues)', icon: Layers },
          { id: 'MEMBERS', label: isEn ? '3. Skill Allocation' : '3. Phân Bổ Kỹ Năng (Skills)', icon: Users },
          { id: 'RULES', label: isEn ? '4. Routing Rules' : '4. Bộ Luật Phân Tuyến (Rules)', icon: BrainCircuit },
          { id: 'INSIGHTS', label: isEn ? '5. Testing & KPIs' : '5. Thử Nghiệm & KPIs', icon: TrendingUp },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-t-xl'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: IT TEAMS HIERARCHY */}
      {activeTab === 'TEAMS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">{isEn ? 'IT Support Team Hierarchy' : 'Cây Phân Cấp Đội Ngũ Hỗ Trợ IT'}</h3>
            <button
              onClick={() => setIsTeamModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isEn ? '+ Add New IT Team' : '+ Thêm Team IT Mới'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map((t) => (
              <div key={t.id} className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-black text-xs px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    {t.code}
                  </span>
                  <span className="text-[11px] font-bold text-slate-400">
                    {t.members?.length || 0} {isEn ? 'Members' : 'Thành viên'}
                  </span>
                </div>

                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">{t.name}</h4>
                  {t.parent && (
                    <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                      <span>{isEn ? 'Belongs to:' : 'Thuộc:'}</span>
                      <strong className="text-slate-600 dark:text-slate-300">{t.parent.name}</strong>
                    </div>
                  )}
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{t.description || (isEn ? 'No description' : 'Không có mô tả')}</p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{isEn ? 'Scope:' : 'Khu vực:'} <strong>{t.locationScope || (isEn ? 'Nationwide' : 'Toàn quốc')}</strong></span>
                  <span>{isEn ? 'Handled Tickets:' : 'Ticket xử lý:'} <strong className="text-indigo-600">{t._count?.tickets || 0}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: SUPPORT QUEUES */}
      {activeTab === 'QUEUES' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">{isEn ? 'Support Queues Directory' : 'Danh Sách Hàng Đợi Tiếp Nhận (Queues)'}</h3>
            <button
              onClick={() => setIsQueueModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isEn ? '+ Add New Queue' : '+ Thêm Queue Mới'}</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase">
                  <th className="py-3 px-4">{isEn ? 'QUEUE CODE' : 'MÃ QUEUE'}</th>
                  <th className="py-3 px-4">{isEn ? 'QUEUE NAME' : 'TÊN HÀNG ĐỢI'}</th>
                  <th className="py-3 px-4">{isEn ? 'ASSIGNED TEAM' : 'TEAM PHỤ TRÁCH'}</th>
                  <th className="py-3 px-4">{isEn ? 'QUEUE TYPE' : 'LOẠI QUEUE'}</th>
                  <th className="py-3 px-4 text-center">{isEn ? 'PENDING TICKETS' : 'TICKET CHỜ XỬ LÝ'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {queues.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-600">{q.code}</td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{q.name}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{q.team?.name || 'N/A'}</td>
                    <td className="py-3 px-4">
                      {q.isDefault ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                          {isEn ? '★ Default Fallback Queue' : '★ Fallback Queue Mặc Định'}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px]">{isEn ? 'Standard Queue' : 'Queue Tiêu chuẩn'}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-purple-700">{q.activeTicketCount || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: MEMBERS & SKILLS */}
      {activeTab === 'MEMBERS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">{isEn ? 'Technician Skills Matrix (Skill-Based Team)' : 'Phân Bổ Kỹ Năng Chuyên Môn (Skill-Based Team)'}</h3>
            <button
              onClick={() => setIsMemberModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isEn ? '+ Assign Skills to Technician' : '+ Gán Kỹ Năng Cho Nhân Sự IT'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teams.flatMap((t) =>
              (t.members || []).map((m: any) => (
                <div key={m.id} className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">{m.user?.fullName}</h4>
                      <p className="text-xs text-slate-400">{m.user?.email} • {m.user?.department || 'IT'}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold">
                      Team: {t.name}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold text-slate-500 uppercase">{isEn ? 'Primary Skills:' : 'Kỹ năng chính (Primary Skills):'}</div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {m.primarySkills?.length > 0 ? (
                        m.primarySkills.map((s: string) => (
                          <span key={s} className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                            {s}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 text-xs italic">{isEn ? 'Unassigned' : 'Chưa khai báo'}</span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                    <span>{isEn ? 'Level:' : 'Trình độ:'} <strong className="text-slate-700 dark:text-slate-200">{m.skillLevel || (isEn ? 'Specialist' : 'Chuyên viên')}</strong></span>
                    <span>{isEn ? 'Max Capacity:' : 'Tải tối đa:'} <strong>{m.maxTickets || 20} Tickets</strong></span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: ROUTING RULES */}
      {activeTab === 'RULES' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">{isEn ? 'Automated Dispatch Rules (Routing Engine)' : 'Bộ Luật Tự Động Phân Tuyến (Routing Rules)'}</h3>
            <button
              onClick={() => setIsRuleModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isEn ? '+ Create New Routing Rule' : '+ Tạo Rule Phân Tuyến Mới'}</span>
            </button>
          </div>

          <div className="space-y-3">
            {rules.map((r) => (
              <div key={r.id} className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-xs px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700">
                      {isEn ? 'Priority' : 'Ưu tiên'} #{r.priority}
                    </span>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">{r.name}</h4>
                    {r.autoAssign && (
                      <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-bold border border-purple-200">
                        🤖 Auto-Assign Agent
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{r.description}</p>

                  {/* Conditions Pills */}
                  <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
                    <span className="font-bold text-slate-400">{isEn ? 'Conditions:' : 'Điều kiện:'}</span>
                    {r.conditions?.map((c: any, i: number) => (
                      <span key={i} className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-mono text-[11px]">
                        {c.field} {c.operator} <strong>"{c.value}"</strong>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">{isEn ? 'Target Team' : 'Team Đích'}</div>
                    <div className="font-bold text-xs text-indigo-600">{r.targetTeam?.name}</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: SIMULATOR & KPIS */}
      {activeTab === 'INSIGHTS' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Simulator Box */}
          <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-purple-100 text-purple-700">
                <Play className="w-4 h-4" />
              </span>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">{isEn ? 'Live Routing Simulator' : 'Mô Phỏng Phân Tuyến (Live Routing Simulator)'}</h3>
                <p className="text-xs text-slate-400">{isEn ? 'Test dispatch rules live with mock ticket context' : 'Kiểm tra ngay kết quả phân tuyến với ngữ cảnh mẫu'}</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-600 mb-1">{isEn ? 'Category:' : 'Phân loại (Category):'}</label>
                <select
                  value={simContext.category}
                  onChange={(e) => setSimContext({ ...simContext, category: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50"
                >
                  <option value="NETWORK">{isEn ? 'NETWORK (Network / WiFi / VPN)' : 'NETWORK (Mạng / WiFi / VPN)'}</option>
                  <option value="HARDWARE">HARDWARE (Phần cứng / Máy tính)</option>
                  <option value="SOFTWARE">SOFTWARE (Phần mềm / ERP)</option>
                  <option value="LICENSE">LICENSE (Bản quyền M365/Office)</option>
                  <option value="ACCESS_REQUEST">ACCESS_REQUEST (Cấp quyền)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">Công ty / Đơn vị:</label>
                <input
                  type="text"
                  value={simContext.companyName}
                  onChange={(e) => setSimContext({ ...simContext, companyName: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">Khu vực / Địa điểm:</label>
                <input
                  type="text"
                  value={simContext.userLocation}
                  onChange={(e) => setSimContext({ ...simContext, userLocation: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-xl bg-slate-50"
                />
              </div>

              <button
                onClick={handleRunSimulation}
                disabled={isSimulating}
                className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                {isSimulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                <span>{isEn ? 'Run Dispatch Simulation' : 'Chạy Thử Nghiệm Phân Tuyến'}</span>
              </button>
            </div>

            {simResult && (
              <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-2xl border border-purple-200 dark:border-purple-900/50 space-y-2 text-xs">
                <div className="font-bold text-purple-900 dark:text-purple-200">Kết quả phân tuyến:</div>
                <div>Rule khớp: <strong>{simResult.matchedRule || 'Fallback Mặc Định'}</strong></div>
                <div>Team đích: <strong>{simResult.teamName}</strong></div>
                <div className="space-y-1 pt-2 border-t border-purple-200/60 font-mono text-[11px] text-purple-800">
                  {simResult.log?.map((l: string, idx: number) => (
                    <div key={idx}>{l}</div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* KPI & Rule Insight Cards */}
          <div className="space-y-4">
            <div className="p-6 bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-3xl shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">{isEn ? 'Automated Dispatch Efficiency' : 'Hiệu Quả Phân Tuyến Tự Động'}</span>
                <Sparkles className="w-5 h-5 text-indigo-400" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-3xl font-black text-emerald-400">92%</div>
                  <div className="text-xs text-indigo-200 mt-0.5">{isEn ? 'Accurate Auto-Routing Rate' : 'Tỷ lệ Auto-Routing chuẩn xác'}</div>
                </div>
                <div>
                  <div className="text-3xl font-black text-indigo-300">&lt; 3s</div>
                  <div className="text-xs text-indigo-200 mt-0.5">{isEn ? 'Queue Resolution Time' : 'Thời gian xác định Queue'}</div>
                </div>
              </div>

              <p className="text-xs text-indigo-200/80 leading-relaxed border-t border-indigo-800/60 pt-3">
                Hệ thống tự động loại bỏ việc End-User phải chọn phòng ban IT thủ công, đảm bảo mọi Ticket được chuyển thẳng đến đúng chuyên gia phụ trách.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Tạo Team Mới */}
      {isTeamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Thêm Team IT Mới</h3>
              <button onClick={() => setIsTeamModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleCreateTeam} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-600 mb-1">Tên Team (*)</label>
                <input required placeholder="VD: Network Team HN, Helpdesk HCM..." value={teamForm.name} onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })} className="w-full p-2 border rounded-xl" />
              </div>
              <div>
                <label className="block font-bold text-slate-600 mb-1">Mã Code (*)</label>
                <input required placeholder="VD: NET-HN, HD-HCM..." value={teamForm.code} onChange={(e) => setTeamForm({ ...teamForm, code: e.target.value })} className="w-full p-2 border rounded-xl" />
              </div>
              <div>
                <label className="block font-bold text-slate-600 mb-1">Thuộc Team Cha (Tùy chọn)</label>
                <select value={teamForm.parentId} onChange={(e) => setTeamForm({ ...teamForm, parentId: e.target.value })} className="w-full p-2 border rounded-xl">
                  <option value="">-- Đội ngũ cấp cao nhất --</option>
                  {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <button type="submit" className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-bold cursor-pointer">Lưu Team</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
