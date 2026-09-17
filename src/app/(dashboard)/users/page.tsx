'use client';

import { useLanguage } from '@/lib/i18n/context';
import { QuickLink } from '@/components/common/QuickLink';
import { ManageableDropdown } from '@/components/ui/manageable-dropdown';

import { useState, useEffect, useRef } from 'react';
import { invalidateClientCache, triggerDataRefresh } from '@/lib/client-cache';
import { UserOffboardModal, UserOnboardModal } from '@/components/users';
import {
  User,
  Users,
  Plus,
  Search,
  Laptop,
  Key,
  Trash2,
  Phone,
  Mail,
  Building,
  Building2,
  Briefcase,
  X,
  Loader2,
  RotateCcw,
  Edit,
  Save,
  FileSpreadsheet,
  LayoutGrid,
  List,
  ShieldCheck,
  UserPlus,
  PlusCircle,
  ChevronDown,
  Check,
  Tag,
  Layers,
  Sparkles,
  FolderTree,
  Folder,
  FolderPlus,
  CornerDownRight,
  KeyRound,
  MapPin,
  UserCheck,
  ExternalLink,
} from 'lucide-react';

// ==================== HIERARCHICAL DEPARTMENTS MASTER STRUCTURE ====================
export interface DepartmentNode {
  id: string;
  name: string;
  code?: string;
  icon?: string;
  children?: { id: string; name: string; code?: string }[];
}

const HIERARCHICAL_DEPARTMENTS: DepartmentNode[] = [
  {
    id: 'dept-it',
    name: 'Ban Công Nghệ Thông Tin (IT / CNTT)',
    code: 'IT',
    icon: '⚡',
    children: [
      { id: 'it-lead', name: 'Ban Lãnh Đạo CNTT (CIO / IT Director)', code: 'IT-LEAD' },
      { id: 'it-system', name: 'Quản Trị Hệ Thống & Cloud (System Admin)', code: 'IT-SYSTEM' },
      { id: 'it-network', name: 'Hạ Tầng Mạng & Viễn Thông (Network & Infra)', code: 'IT-NETWORK' },
      { id: 'it-app', name: 'Ứng Dụng Nghiệp Vụ, ERP & Bravo (Application)', code: 'IT-APP' },
      { id: 'it-sec', name: 'An Toàn Thông Tin & Bảo Mật (Cybersecurity)', code: 'IT-SEC' },
      { id: 'it-helpdesk', name: 'Hỗ Trợ Kỹ Thuật & Helpdesk L1/L2', code: 'IT-HELPDESK' },
      { id: 'it-hardware', name: 'Quản Lý Thiết Bị & Phần Cứng (Hardware & EUC)', code: 'IT-HARDWARE' },
      { id: 'it-onsite', name: 'Đội IT On-site Nhà Máy & Chi Nhánh', code: 'IT-ONSITE' },
    ],
  },
  {
    id: 'dept-bod',
    name: 'Ban Giám Đốc & HĐQT',
    code: 'BOD',
icon: '🏛️',
    children: [
      { id: 'bod-exec', name: 'Văn Phòng Tổng Giám Đốc' },
      { id: 'bod-strategy', name: 'Ban Chiến Lược & Đầu Tư' },
    ],
  },
  {
    id: 'dept-finance',
    name: 'Khối Tài Chính & Kế Toán',
    code: 'FIN',
    icon: '💰',
    children: [
      { id: 'fin-general', name: 'Kế Toán Tổng Hợp' },
      { id: 'fin-tax', name: 'Kế Toán Thuế & Kiểm Toán' },
      { id: 'fin-treasury', name: 'Ban Tài Chính & Ngân Quỹ' },
    ],
  },
  {
    id: 'dept-sales',
    name: 'Khối Kinh Doanh & Thị Trường',
    code: 'SALES',
    icon: '📈',
    children: [
      { id: 'sales-domestic', name: 'Kinh Doanh Nội Địa' },
      { id: 'sales-export', name: 'Kinh Doanh Xuất Khẩu & Quốc Tế' },
      { id: 'sales-cs', name: 'Chăm Sóc Khách Hàng (Customer Care)' },
    ],
  },
  {
    id: 'dept-hr',
    name: 'Khối Nhân Sự & Hành Chính',
    code: 'HR',
    icon: '👥',
    children: [
      { id: 'hr-recruitment', name: 'Tuyển Dụng & Đào Tạo' },
      { id: 'hr-cb', name: 'Chế Độ & Tiền Lương (C&B)' },
      { id: 'hr-admin', name: 'Hành Chính Quản Trị Văn Phòng' },
    ],
  },
  {
    id: 'dept-ops',
    name: 'Khối Vận Hành & Sản Xuất',
    code: 'OPS',
    icon: '🏭',
    children: [
      { id: 'ops-factory', name: 'Ban Quản Lý Nhà Máy & Xưởng Sản Xuất' },
      { id: 'ops-supply', name: 'Chuỗi Cung Ứng & Mua Hàng (Procurement)' },
      { id: 'ops-warehouse', name: 'Kho Vận & Logistics' },
      { id: 'ops-qa', name: 'Quản Lý Chất Lượng (QA/QC)' },
    ],
  },
  {
    id: 'dept-mkt',
    name: 'Ban Marketing & Truyền Thông',
    code: 'MKT',
    icon: '📢',
    children: [
      { id: 'mkt-brand', name: 'Thương Hiệu & Truyền Thông Nội Bộ' },
      { id: 'mkt-digital', name: 'Digital Marketing & Sự Kiện' },
    ],
  },
  {
    id: 'dept-pm',
    name: 'Ban Quản Lý Dự Án & Kỹ Thuật',
    code: 'PMO',
    icon: '📐',
  },
];

// Helper to format full department string for storage & display
function formatDeptDisplay(parent: string, child?: string) {
  if (!child) return parent;
  return `${parent} / ${child}`;
}

function parseDeptParts(fullDept: string | null | undefined): { parent: string; child: string } {
  if (!fullDept) return { parent: '', child: '' };
  if (fullDept.includes(' / ')) {
    const parts = fullDept.split(' / ');
    return { parent: parts[0].trim(), child: parts.slice(1).join(' / ').trim() };
  }
  if (fullDept.includes(' - ')) {
    const parts = fullDept.split(' - ');
    return { parent: parts[0].trim(), child: parts.slice(1).join(' - ').trim() };
  }
  return { parent: fullDept.trim(), child: '' };
}

// Manageable Dropdown is imported from @/components/ui/manageable-dropdown

export default function UsersPage() {
    const { language, t } = useLanguage();
  const isEn = language === 'en';
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [availableAssets, setAvailableAssets] = useState<any[]>([]);
  const [availableLicenses, setAvailableLicenses] = useState<any[]>([]);
  const [companies, setCompanies] = useState<string[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [deptTree, setDeptTree] = useState<DepartmentNode[]>(HIERARCHICAL_DEPARTMENTS);

  // Quick Add Location modal state
  const [isAddLocationModalOpen, setIsAddLocationModalOpen] = useState(false);
  const [newLocName, setNewLocName] = useState('');
  const [newLocBuilding, setNewLocBuilding] = useState('');
  const [newLocFloor, setNewLocFloor] = useState('');
  const [isSavingLoc, setIsSavingLoc] = useState(false);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Modal States
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [isAssignAssetModalOpen, setIsAssignAssetModalOpen] = useState(false);
  const [isAssignLicenseModalOpen, setIsAssignLicenseModalOpen] = useState(false);
  const [viewingUserDetail, setViewingUserDetail] = useState<any>(null);
  const [isUserDetailModalOpen, setIsUserDetailModalOpen] = useState(false);

  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Form State: Parent & Child Department structure
  const [formParentDept, setFormParentDept] = useState('Ban Công Nghệ Thông Tin (IT / CNTT)');
  const [formChildDept, setFormChildDept] = useState('Hỗ Trợ Kỹ Thuật & Helpdesk L1/L2');
  const [isCustomParent, setIsCustomParent] = useState(false);
  const [customParentText, setCustomParentText] = useState('');
  const [isCustomChild, setIsCustomChild] = useState(false);
  const [customChildText, setCustomChildText] = useState('');

  const [userFormData, setUserFormData] = useState({
    fullName: '',
    email: '',
    position: '',
    companyName: '',
    phone: '',
    roleId: '',
    managerId: '',
    locationId: '',
    password: 'User@123',
  });

  const [editUserFormData, setEditUserFormData] = useState<any>({
    fullName: '',
    email: '',
    position: '',
    companyName: '',
    phone: '',
    roleId: '',
    managerId: '',
    locationId: '',
    password: '',
  });

  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [assignAssetNotes, setAssignAssetNotes] = useState('');

  const [selectedLicenseId, setSelectedLicenseId] = useState('');
  const [assignLicenseNotes, setAssignLicenseNotes] = useState('');

  // Onboard & Offboard States
  const [isOnboardModalOpen, setIsOnboardModalOpen] = useState(false);
  const [offboardTargetUserId, setOffboardTargetUserId] = useState<string | null>(null);

  // Directory Sync State
  const [isSyncingDirectory, setIsSyncingDirectory] = useState(false);
  const [syncReport, setSyncReport] = useState<any | null>(null);

  // Global ESC Key Listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (isAddLocationModalOpen) setIsAddLocationModalOpen(false);
        if (isAddUserModalOpen) setIsAddUserModalOpen(false);
        if (isEditUserModalOpen) setIsEditUserModalOpen(false);
        if (isAssignAssetModalOpen) setIsAssignAssetModalOpen(false);
        if (isAssignLicenseModalOpen) setIsAssignLicenseModalOpen(false);
        if (isUserDetailModalOpen) setIsUserDetailModalOpen(false);
        if (offboardTargetUserId) setOffboardTargetUserId(null);
        if (isOnboardModalOpen) setIsOnboardModalOpen(false);
        if (syncReport) setSyncReport(null);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAddLocationModalOpen, isAddUserModalOpen, isEditUserModalOpen, isAssignAssetModalOpen, isAssignLicenseModalOpen, isUserDetailModalOpen, offboardTargetUserId, isOnboardModalOpen, syncReport]);

  
  // Auto-open Detail Modal if URL contains ?id=... or ?userId=...
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const targetId = params.get('id') || params.get('userId') || params.get('email');
    if (!targetId) return;

    if (users.length > 0) {
      const found = users.find(
        (u: any) =>
          u.id === targetId ||
          u.email?.toLowerCase() === targetId.toLowerCase() ||
          u.fullName?.toLowerCase() === targetId.toLowerCase()
      );
      if (found) {
        setViewingUserDetail(found);
        setIsUserDetailModalOpen(true);
        return;
      }
    }

    fetch(`/api/users/${encodeURIComponent(targetId)}`)
      .then((r) => r.json())
      .then((res) => {
        const item = res.data || res.user;
        if (item) {
          setViewingUserDetail(item);
          setIsUserDetailModalOpen(true);
        }
      })
      .catch(() => {});
  }, [users]);
  
  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes, assetsRes, licRes, compRes, locRes] = await Promise.all([
        fetch(`/api/users?search=${encodeURIComponent(search)}`).then((r) => r.json()),
        fetch('/api/roles').then((r) => r.json()),
        fetch('/api/assets?status=AVAILABLE').then((r) => r.json()),
        fetch('/api/licenses?status=ACTIVE').then((r) => r.json()),
        fetch('/api/companies').then((r) => r.json()).catch(() => ({ data: [] })),
        fetch('/api/locations').then((r) => r.json()).catch(() => ({ data: [] })),
      ]);

      if (usersRes.success || usersRes.data) {
        const loadedUsers = usersRes.data || usersRes.users || [];
        setUsers(loadedUsers);
      }
      if (rolesRes.success && rolesRes.data?.roles) {
        setRoles(rolesRes.data.roles);
      } else if (rolesRes.success && Array.isArray(rolesRes.data)) {
        setRoles(rolesRes.data);
      }
      if (assetsRes.success || assetsRes.data) {
        setAvailableAssets(assetsRes.data || assetsRes.assets || []);
      }
      if (licRes.success || licRes.data) {
        setAvailableLicenses(licRes.data || licRes.licenses || []);
      }
      if (compRes?.data) {
        setCompanies(compRes.data.map((c: any) => (typeof c === 'string' ? c : c.name)));
      }
      if (locRes?.data) {
        setLocations(locRes.data);
      }
    } catch (e) {
      console.error('Failed to load users data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search]);

  // Company Master Data Actions
  const handleAddCompany = async (name: string) => {
    try {
      await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      setCompanies((prev) => Array.from(new Set([...prev, name])));
    } catch {
      setCompanies((prev) => Array.from(new Set([...prev, name])));
    }
  };

  const handleEditCompany = async (oldName: string, newName: string) => {
    try {
      await fetch('/api/companies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldName, newName }),
      });
      setCompanies((prev) => prev.map((c) => (c === oldName ? newName : c)));
      loadData();
    } catch {}
  };

  const handleDeleteCompany = async (name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa công ty "${name}"?`)) return;
    try {
      await fetch(`/api/companies?name=${encodeURIComponent(name)}`, {
        method: 'DELETE',
      });
      setCompanies((prev) => prev.filter((c) => c !== name));
      loadData();
    } catch {}
  };

  // Helper to get effective department string from modal inputs
  const getEffectiveDept = () => {
    const parent = isCustomParent ? customParentText.trim() : formParentDept;
    const child = isCustomChild ? customChildText.trim() : formChildDept;
    return formatDeptDisplay(parent, child);
  };

  // Quick Add Location Handler
  const handleQuickAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocName.trim()) return;
    setIsSavingLoc(true);
    try {
      const res = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newLocName.trim(),
          building: newLocBuilding.trim() || null,
          floor: newLocFloor.trim() || null,
        }),
      });
      const data = await res.json();
      if (res.ok && data.data) {
        const newLocation = data.data;
        setLocations((prev) => [...prev, newLocation]);
        if (isEditUserModalOpen) {
          setEditUserFormData((prev: any) => ({ ...prev, locationId: newLocation.id }));
        } else if (isAddUserModalOpen) {
          setUserFormData((prev: any) => ({ ...prev, locationId: newLocation.id }));
        }
        setIsAddLocationModalOpen(false);
        setNewLocName('');
        setNewLocBuilding('');
        setNewLocFloor('');
      }
    } catch (err) {
      console.error('Quick add location error', err);
    } finally {
      setIsSavingLoc(false);
    }
  };

  const handleOpenAddUser = () => {
    setFormParentDept('Ban Công Nghệ Thông Tin (IT / CNTT)');
    setFormChildDept('Hỗ Trợ Kỹ Thuật & Helpdesk L1/L2');
    setIsCustomParent(false);
    setCustomParentText('');
    setIsCustomChild(false);
    setCustomChildText('');

    setUserFormData({
      fullName: '',
      email: '',
      position: '',
      companyName: companies[0] || '',
      phone: '',
      roleId: roles[0]?.id || '',
      managerId: '',
      locationId: locations[0]?.id || '',
      password: 'User@123',
    });
    setIsAddUserModalOpen(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalDept = getEffectiveDept();

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...userFormData,
          managerId: userFormData.managerId || null,
          locationId: userFormData.locationId || null,
          department: finalDept,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsAddUserModalOpen(false);
        loadData();
      } else {
        // Error handling
      }
    } catch {
      // Error handling
    }
  };

  const handleOpenEditUser = (user: any) => {
    setEditingUserId(user.id);
    const { parent, child } = parseDeptParts(user.department);

    const matchedParentNode = deptTree.find(
      (d) => d.name === parent || d.name.includes(parent) || parent.includes(d.name)
    );

    if (matchedParentNode) {
      setFormParentDept(matchedParentNode.name);
      setIsCustomParent(false);
      setCustomParentText('');

      if (child) {
        const matchedChild = matchedParentNode.children?.find(
          (c) => c.name === child || c.name.includes(child) || child.includes(c.name)
        );
        if (matchedChild) {
          setFormChildDept(matchedChild.name);
          setIsCustomChild(false);
          setCustomChildText('');
        } else {
          setFormChildDept('__CUSTOM__');
          setIsCustomChild(true);
          setCustomChildText(child);
        }
      } else {
        setFormChildDept('');
        setIsCustomChild(false);
        setCustomChildText('');
      }
    } else if (parent) {
      setFormParentDept('__CUSTOM__');
      setIsCustomParent(true);
      setCustomParentText(parent);
      if (child) {
        setIsCustomChild(true);
        setCustomChildText(child);
      }
    } else {
      setFormParentDept(deptTree[0].name);
      setFormChildDept('');
    }

    setEditUserFormData({
      fullName: user.fullName || '',
      email: user.email || '',
      position: user.position || '',
      companyName: user.companyName || '',
      phone: user.phone || '',
      roleId: user.role?.id || '',
      managerId: user.managerId || user.manager?.id || '',
      locationId: user.locationId || user.location?.id || '',
      password: '',
      isActive: user.isActive !== false,
    });
    setIsEditUserModalOpen(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserId) return;
    const finalDept = getEffectiveDept();

    try {
      const payload: any = {
        fullName: editUserFormData.fullName,
        email: editUserFormData.email,
        managerId: editUserFormData.managerId || null,
        locationId: editUserFormData.locationId || null,
        department: finalDept,
        position: editUserFormData.position,
        companyName: editUserFormData.companyName,
        phone: editUserFormData.phone,
        roleId: editUserFormData.roleId,
        isActive: editUserFormData.isActive !== false,
      };
      if (editUserFormData.password) {
        payload.password = editUserFormData.password;
      }

      const res = await fetch(`/api/users/${editingUserId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsEditUserModalOpen(false);
        setEditingUserId(null);
        loadData();
      } else {
        alert('Cập nhật thất bại');
      }
    } catch {
      alert('Lỗi kết nối');
    }
  };

  const handleOpenOffboardModal = (user: any) => {
    setOffboardTargetUserId(user.id);
  };

  const handleReactivateUser = async (user: any) => {
    if (!confirm(`Bạn có chắc chắn muốn khôi phục công tác cho "${user.fullName}"? Tài khoản sẽ được mở khóa để đăng nhập lại bình thường.`)) return;
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true }),
      });
      if (res.ok) {
        loadData();
      } else {
        alert('Khôi phục công tác thất bại');
      }
    } catch {
      alert('Lỗi kết nối');
    }
  };

  const handleSyncDirectory = async () => {
    setIsSyncingDirectory(true);
    setSyncReport(null);
    try {
      const res = await fetch('/api/users/sync-directory', { method: 'POST' });
      const data = await res.json();
      setSyncReport(data);
      loadData();
    } catch (e: any) {
      setSyncReport({ success: false, message: e.message || 'Lỗi khi gọi API đồng bộ' });
    } finally {
      setIsSyncingDirectory(false);
    }
  };

  const handleResetSecondaryPassword = async (targetUser: any) => {
    const confirmed = confirm(
      `🔐 BẠN CÓ CHẮC CHẮN MUỐN RESET MẬT KHẨU CẤP 2 CHO:\n\n` +
      `👤 Nhân sự: ${targetUser.fullName}\n` +
      `📧 Email: ${targetUser.email}\n\n` +
      `Sau khi Reset, người dùng này sẽ được yêu cầu thiết lập Mật khẩu cấp 2 mới khi truy cập Kho Mật Khẩu.`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/users/${targetUser.id}/reset-secondary-password`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Success - modal or toast
      }
    } catch {
      // Error handled
    }
  };

  const handleDeleteUser = async (user: any) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa nhân viên "${user.fullName}" (${user.email || ''}) khỏi hệ thống?`)) return;

    // 0ms Optimistic removal
    setUsers((prev: any[]) => prev.filter((u) => u.id !== user.id));
    if (viewingUserDetail?.id === user.id) setIsUserDetailModalOpen(false);

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        invalidateClientCache('/api/users');
        invalidateClientCache('/api/master-data');
        triggerDataRefresh('users');
        triggerDataRefresh('master-data');
        loadData();
      } else {
        alert(data.error || 'Xóa nhân viên thất bại');
        loadData();
      }
    } catch {
      alert('Lỗi kết nối khi xóa nhân viên');
      loadData();
    }
  };

  const handleRevokeAsset = async (assetId: string) => {
    if (!confirm('Bạn có chắc chắn muốn thu hồi thiết bị này về kho?')) return;
    try {
      const res = await fetch(`/api/assets/${assetId}/assignments`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) loadData();
    } catch {
      alert('Thu hồi thất bại');
    }
  };

  const handleRevokeLicense = async (licenseId: string, userId: string) => {
    if (!confirm('Bạn có chắc chắn muốn thu hồi license này?')) return;
    try {
      const res = await fetch(`/api/licenses/${licenseId}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) loadData();
    } catch {
      alert('Thu hồi license thất bại');
    }
  };

  const handleOpenAssignAsset = (user: any) => {
    setSelectedUser(user);
    setSelectedAssetId(availableAssets[0]?.id || '');
    setAssignAssetNotes('');
    setIsAssignAssetModalOpen(true);
  };

  const handleSaveAssignAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !selectedAssetId) return;

    try {
      const res = await fetch(`/api/assets/${selectedAssetId}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          notes: assignAssetNotes,
        }),
      });

      if (res.ok) {
        setIsAssignAssetModalOpen(false);
        loadData();
      } else {
        alert('Gán thiết bị thất bại');
      }
    } catch {
      alert('Lỗi kết nối');
    }
  };

  const handleOpenAssignLicense = (user: any) => {
    setSelectedUser(user);
    setSelectedLicenseId(availableLicenses[0]?.id || '');
    setAssignLicenseNotes('');
    setIsAssignLicenseModalOpen(true);
  };

  const handleSaveAssignLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !selectedLicenseId) return;

    try {
      const res = await fetch(`/api/licenses/${selectedLicenseId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          notes: assignLicenseNotes,
        }),
      });

      if (res.ok) {
        setIsAssignLicenseModalOpen(false);
        loadData();
      } else {
        alert('Gán license thất bại');
      }
    } catch {
      alert('Lỗi kết nối');
    }
  };

  // Active vs Resigned separation
  const activeUsers = users.filter((u) => u.isActive !== false);
  const resignedUsers = users.filter((u) => u.isActive === false);

  const activeCount = activeUsers.length;
  const resignedCount = resignedUsers.length;
  const withAssetsCount = activeUsers.filter((u) => u.assetAssignments?.length > 0).length;
  const withLicCount = activeUsers.filter((u) => u.licenseAssignments?.length > 0).length;
  const noAssignmentsCount = activeUsers.filter(
    (u) => (!u.assetAssignments || u.assetAssignments.length === 0) && (!u.licenseAssignments || u.licenseAssignments.length === 0)
  ).length;
  const adminCount = activeUsers.filter((u) => u.role?.name === 'Admin').length;
  const managersCount = activeUsers.filter(
    (u) => (u.directReports && u.directReports.length > 0) || users.some((x) => x.managerId === u.id)
  ).length;

  // Smart Tree Filtering
  const filteredUsers = users.filter((u) => {
    // If RESIGNED tab is active, only show resigned users
    if (selectedFilter === 'RESIGNED') {
      if (u.isActive !== false) return false;
    } else {
      // In all other tabs, show active users
      if (u.isActive === false) return false;
    }

    if (selectedDeptFilter) {
      if (selectedDeptFilter.startsWith('PARENT:')) {
        const parentName = selectedDeptFilter.replace('PARENT:', '');
        if (!u.department?.includes(parentName) && !u.department?.startsWith('IT')) {
          if (parentName.includes('IT') && (u.department?.includes('IT') || u.department?.includes('CNTT'))) {
            // Match IT parent
          } else {
            return false;
          }
        }
      } else if (selectedDeptFilter.startsWith('CHILD:')) {
        const childName = selectedDeptFilter.replace('CHILD:', '');
        if (!u.department?.includes(childName)) return false;
      }
    }

    if (selectedCompany && u.companyName !== selectedCompany) return false;

    if (selectedFilter === 'WITH_ASSETS') return u.assetAssignments?.length > 0;
    if (selectedFilter === 'WITH_LICENSES') return u.licenseAssignments?.length > 0;
    if (selectedFilter === 'NO_ASSIGNMENTS') return (!u.assetAssignments || u.assetAssignments.length === 0) && (!u.licenseAssignments || u.licenseAssignments.length === 0);
    if (selectedFilter === 'MANAGERS') return (u.directReports && u.directReports.length > 0) || users.some((x) => x.managerId === u.id);
    if (selectedFilter === 'ADMIN') return u.role?.name === 'Admin';
    return true;
  });

  // Selected parent node in Modal to render its sub-departments
  const activeModalParentNode = deptTree.find((d) => d.name === formParentDept);

  return (
    <div className="space-y-4">
      {/* Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {language === 'en' ? 'Employees & IT Asset Directory' : 'Danh Sách Nhân Sự & Cấp Phát Tài Sản'}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-xs font-bold">
              {activeCount} {language === 'en' ? 'active' : 'đang làm việc'}
            </span>
            {resignedCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-xs font-bold border border-rose-200">
                🛑 {resignedCount} {language === 'en' ? 'resigned' : 'nghỉ việc'}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {language === 'en' ? 'Manage department hierarchy, subsidiaries, hardware assets, software licenses, and offboarding' : 'Quản lý cơ cấu phòng ban, công ty thành viên, cấp phát tài sản và thủ tục nghỉ việc'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isSyncingDirectory}
            onClick={handleSyncDirectory}
            title={language === 'en' ? 'Sync accounts from Microsoft 365 & Active Directory / LDAP' : 'Đồng bộ tài khoản từ Microsoft 365 & Active Directory / LDAP'}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isSyncingDirectory ? 'animate-spin text-purple-600' : ''}`} />
            <span>{isSyncingDirectory ? (language === 'en' ? 'Syncing...' : 'Đang đồng bộ...') : (language === 'en' ? 'Sync Directory' : 'Đồng Bộ Thư Mục')}</span>
          </button>

          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>{language === 'en' ? 'Table' : 'Bảng'}</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>{language === 'en' ? 'Grid' : 'Lưới'}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsOnboardModalOpen(true)}
            className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer transition-all hover:scale-102"
            title="Quy trình tiếp nhận nhân sự mới, cấp phát combo máy tính & bản quyền"
          >
            <span>🚀</span>
            <span>{language === 'en' ? 'Onboard New Hire' : 'Tiếp Nhận Nhân Sự (Onboard)'}</span>
          </button>

          <button
            onClick={handleOpenAddUser}
            className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>{t('users.add_btn', '+ Thêm Nhân Viên')}</span>
          </button>
        </div>
      </div>

      {/* Quick Filter Status Badges */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <button
          type="button"
          onClick={() => setSelectedFilter('ALL')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
            selectedFilter === 'ALL'
              ? 'bg-slate-900 border-slate-900 text-white shadow-2xs'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          {language === 'en' ? '👥 Active' : '👥 Đang làm việc'} ({activeCount})
        </button>
        <button
          type="button"
          onClick={() => setSelectedFilter(selectedFilter === 'WITH_ASSETS' ? 'ALL' : 'WITH_ASSETS')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
            selectedFilter === 'WITH_ASSETS'
              ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
              : 'bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100'
          }`}
        >
          {language === 'en' ? '💻 With Devices' : '💻 Đang giữ máy'} ({withAssetsCount})
        </button>
        <button
          type="button"
          onClick={() => setSelectedFilter(selectedFilter === 'WITH_LICENSES' ? 'ALL' : 'WITH_LICENSES')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
            selectedFilter === 'WITH_LICENSES'
              ? 'bg-purple-600 border-purple-600 text-white shadow-2xs'
              : 'bg-purple-50 border-purple-200 text-purple-800 hover:bg-purple-100'
          }`}
        >
          {language === 'en' ? '🔑 With Licenses' : '🔑 Đang giữ Lic'} ({withLicCount})
        </button>
        <button
          type="button"
          onClick={() => setSelectedFilter(selectedFilter === 'NO_ASSIGNMENTS' ? 'ALL' : 'NO_ASSIGNMENTS')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
            selectedFilter === 'NO_ASSIGNMENTS'
              ? 'bg-amber-600 border-amber-600 text-white shadow-2xs'
              : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
          }`}
        >
          {language === 'en' ? '⚪ No Assignments' : '⚪ Chưa gán gì'} ({noAssignmentsCount})
        </button>
        <button
          type="button"
          onClick={() => setSelectedFilter(selectedFilter === 'MANAGERS' ? 'ALL' : 'MANAGERS')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
            selectedFilter === 'MANAGERS'
              ? 'bg-purple-600 border-purple-600 text-white shadow-2xs'
              : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
          }`}
        >
          {language === 'en' ? 'Managers' : 'Cấp quản lý'} ({managersCount})
        </button>
        <button
          type="button"
          onClick={() => setSelectedFilter(selectedFilter === 'ADMIN' ? 'ALL' : 'ADMIN')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
            selectedFilter === 'ADMIN'
              ? 'bg-rose-600 border-rose-600 text-white shadow-2xs'
              : 'bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100'
          }`}
        >
          🛡️ Admin ({adminCount})
        </button>
        <button
          type="button"
          onClick={() => setSelectedFilter(selectedFilter === 'RESIGNED' ? 'ALL' : 'RESIGNED')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
            selectedFilter === 'RESIGNED'
              ? 'bg-rose-700 border-rose-700 text-white shadow-2xs'
              : 'bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100'
          }`}
        >
          🛑 {language === 'en' ? 'Resigned' : 'Nghỉ việc'} ({resignedCount})
        </button>
      </div>

      {/* Toolbar Search, Company Filter & Tree Department Filter (2 rows layout) */}
      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2.5">
        {/* Row 1: Ô Tìm kiếm nhanh toàn chiều rộng */}
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder={language === 'en' ? 'Search by employee name, title, email, phone, company, department...' : 'Tìm theo tên nhân viên, chức danh, email, SĐT, công ty, bộ phận IT...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white dark:focus:bg-slate-800 transition-all font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Row 2: Bộ lọc Công ty & Bộ lọc Cơ cấu Phòng ban */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
            {/* Filter Công ty quản lý */}
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-purple-500 font-bold min-w-[200px] cursor-pointer"
            >
              <option value="">{language === 'en' ? '🏢 All Companies' : '🏢 Tất cả công ty quản lý'}</option>
              {companies.map((c) => (
                <option key={c} value={c}>
                  🏢 {c}
                </option>
              ))}
            </select>

            {/* Filter Cây Thư Mục Phòng Ban (Hierarchical Tree Select) */}
            <select
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-purple-500 font-bold min-w-[240px] cursor-pointer"
            >
              <option value="">{language === 'en' ? '📂 All Departments' : '📂 Tất cả Phòng ban & Bộ phận'}</option>
              {deptTree.map((parent) => (
                <optgroup key={parent.id} label={`${parent.icon || '📁'} ${parent.name}`}>
                  <option value={`PARENT:${parent.name}`}>
                    {isEn ? `★ All of ${parent.name}` : `★ Toàn bộ ${parent.name}`}
                  </option>
                  {parent.children?.map((child) => (
                    <option key={child.id} value={`CHILD:${child.name}`}>
                      &nbsp;&nbsp;&nbsp;&nbsp;└ 📂 {child.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {(search || selectedCompany || selectedDeptFilter || selectedFilter !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setSelectedCompany('');
                setSelectedDeptFilter('');
                setSelectedFilter('ALL');
              }}
              className="inline-flex items-center justify-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{isEn ? 'Reset Filters' : 'Xóa bộ lọc'}</span>
            </button>
          )}
        </div>
      </div>

      {/* VIEW 1: CLEAN & SPACIOUS ENTERPRISE TABLE VIEW */}
      {viewMode === 'table' ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3 min-w-[170px]">{isEn ? 'EMPLOYEE & TITLE' : 'NHÂN SỰ & CHỨC DANH'}</th>
                  <th className="py-3 px-3 min-w-[190px]">{isEn ? 'DEPARTMENT & UNIT' : 'CƠ CẤU PHÒNG BAN & ĐƠN VỊ'}</th>
                  <th className="py-3 px-3 min-w-[130px]">{isEn ? 'CONTACT' : 'LIÊN HỆ'}</th>
                  <th className="py-3 px-3 min-w-[150px]">{isEn ? 'ASSIGNED DEVICES' : 'THIẾT BỊ ĐANG GIỮ'}</th>
                  <th className="py-3 px-3 min-w-[150px]">{isEn ? 'ASSIGNED LICENSES' : 'LICENSE ĐANG GIỮ'}</th>
                  <th className="py-3 px-3 text-right min-w-[100px]">{isEn ? 'ACTIONS' : 'THAO TÁC'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading && users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-600" />
                      <span>{isEn ? 'Loading employee list...' : 'Đang tải danh sách nhân sự...'}</span>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      {isEn ? 'No matching employees found' : 'Không tìm thấy nhân viên nào phù hợp'}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const { parent, child } = parseDeptParts(u.department);
                    const isIT = u.department?.includes('IT') || u.department?.includes('CNTT');

                    return (
                      <tr
                        key={u.id}
                        onClick={() => handleOpenEditUser(u)}
                        className="hover:bg-purple-50/40 dark:hover:bg-purple-950/20 transition-colors group cursor-pointer"
                        title={isEn ? 'Click row to view & edit details' : 'Nhấp vào hàng để xem & sửa chi tiết'}
                      >
                        {/* Cột 1: Nhân Sự & Chức Danh (2 dòng: Dòng 1 Tên & Edit, Dòng 2 Chức danh & Cấp trên) */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                              {u.fullName ? u.fullName.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div className="min-w-0 space-y-1">
                              {/* Dòng 1: Tên & Trạng thái nghỉ việc & Nút sửa */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`font-bold text-xs truncate transition-colors ${
                                  u.isActive === false ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-white group-hover:text-purple-700'
                                }`}>
                                  {u.fullName || (isEn ? 'Unnamed' : 'Chưa đặt tên')}
                                </span>
                                {u.isActive === false && (
                                  <span className="px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 text-[10px] font-bold border border-rose-200 shrink-0">
                                    🛑 {isEn ? 'Resigned' : 'Nghỉ việc'}
                                  </span>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEditUser(u);
                                  }}
                                  title={isEn ? 'Edit details' : 'Sửa thông tin'}
                                  className="text-slate-400 hover:text-purple-600 p-0.5 shrink-0 cursor-pointer"
                                >
                                  <Edit className="w-3 h-3" />
                                </button>
                              </div>

                              {/* Dòng 2: Chức vụ & Cấp trên / Báo cáo */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[11px] text-purple-700 dark:text-purple-400 font-semibold truncate">
                                  {u.position || (isEn ? 'Staff' : 'Nhân viên')}
                                </span>
                                {u.manager && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const mgr = users.find((item: any) => item.id === u.manager.id || item.email === u.manager.email);
                                      if (mgr) {
                                        setViewingUserDetail(mgr);
                                        setIsUserDetailModalOpen(true);
                                      } else {
                                        fetch(`/api/users/${u.manager.id}`)
                                          .then((r) => r.json())
                                          .then((res) => {
                                            const item = res.data || res.user || res;
                                            if (item && item.id) {
                                              setViewingUserDetail(item);
                                              setIsUserDetailModalOpen(true);
                                            }
                                          });
                                      }
                                    }}
                                    title={isEn ? `Click to view manager: ${u.manager.fullName}` : `Bấm để xem hồ sơ cấp trên: ${u.manager.fullName}`}
                                    className="text-[10px] text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-1.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 transition-all cursor-pointer group shadow-2xs"
                                  >
                                    <UserCheck className="w-3 h-3 text-slate-500 shrink-0" />
                                    <span className="group-hover:underline underline-offset-2">{u.manager.fullName}</span>
                                    <ExternalLink className="w-2.5 h-2.5 text-slate-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                                  </button>
                                )}
                                {u.directReports && u.directReports.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setViewingUserDetail(u);
                                      setIsUserDetailModalOpen(true);
                                    }}
                                    title={isEn ? `Manages ${u.directReports.length} team members (Click to view)` : `Quản lý trực tiếp ${u.directReports.length} nhân sự (Bấm để xem)`}
                                    className="text-[10px] text-blue-800 dark:text-blue-200 font-bold flex items-center gap-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/70 px-1.5 py-0.5 rounded-md border border-blue-200/80 hover:border-blue-400 transition-all cursor-pointer group shadow-2xs"
                                  >
                                    <Users className="w-3 h-3 text-blue-600 shrink-0" />
                                    <span className="group-hover:underline underline-offset-2">{u.directReports.length}</span>
                                    <ExternalLink className="w-2.5 h-2.5 text-blue-600 opacity-60 group-hover:opacity-100 transition-opacity" />
                                  </button>
                                )}
                                {u.location && (
                                  <div className="text-[10px] text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-md border border-emerald-200/80">
                                    <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                                    <span>{u.location.name}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Cột 2: Cơ cấu Phòng ban Cha / Con & Công ty (2 dòng: Dòng 1 Công ty, Dòng 2 Phòng ban & Role) */}
                        <td className="py-3 px-3 text-xs">
                          <div className="space-y-1">
                            {/* Dòng 1: Công ty */}
                            {u.companyName ? (
                              <div className="text-indigo-700 dark:text-indigo-300 font-semibold flex items-center gap-1 text-[11px] truncate" title={u.companyName}>
                                <Building2 className="w-3.5 h-3.5 shrink-0 text-indigo-500" />
                                <span className="truncate">{u.companyName}</span>
                              </div>
                            ) : (
                              <div className="text-slate-400 text-[10.5px] italic">
                                {isEn ? 'No company' : 'Chưa phân công ty'}
                              </div>
                            )}

                            {/* Dòng 2: Phòng ban & Quyền hạn */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`px-2 py-0.5 rounded-lg text-[10.5px] font-bold inline-flex items-center gap-1 truncate max-w-[150px] ${
                                  isIT
                                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200'
                                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                }`}
                                title={child ? `${parent} / ${child}` : parent}
                              >
                                <span>{isIT ? '⚡' : '📁'}</span>
                                <span className="truncate">{child ? `${parent} / ${child}` : (parent || (isEn ? 'Unassigned' : 'Chưa phân phòng'))}</span>
                              </span>

                              <span
                                className={`font-mono font-bold px-1.5 py-0.5 rounded text-[9.5px] whitespace-nowrap inline-block shrink-0 ${
                                  u.role?.name === 'Admin'
                                    ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                    : u.role?.name === 'Asset Manager'
                                    ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                🛡️ {u.role?.name || 'Staff'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Cột 3: Liên Hệ (2 dòng: Dòng 1 Email, Dòng 2 Phone) */}
                        <td className="py-3 px-3 text-xs">
                          <div className="space-y-1">
                            <span className="text-slate-700 dark:text-slate-300 block truncate font-medium text-[11px]" title={u.email}>
                              ✉️ {u.email}
                            </span>
                            {u.phone ? (
                              <span className="text-slate-500 font-mono block text-[11px]" title={u.phone}>
                                📞 {u.phone}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[10.5px] italic block">
                                {isEn ? 'No phone' : 'Chưa có SĐT'}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Cột 4: Thiết Bị Đang Giữ (2 dòng: Dòng 1 Tên máy, Dòng 2 Nút thu hồi & SN) */}
                        <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                          <div className="space-y-1.5">
                            {u.assetAssignments?.filter((aa: any) => aa?.asset)?.length > 0 ? (
                              <div className="space-y-1">
                                {u.assetAssignments
                                  .filter((aa: any) => aa?.asset)
                                  .map((aa: any) => (
                                    <div
                                      key={aa.asset.id}
                                      className="p-1.5 rounded-lg bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-[11px] space-y-1"
                                    >
                                      {/* Dòng 1: Tên thiết bị & Mã tài sản */}
                                      <div className="flex items-center gap-1 font-bold text-blue-700 dark:text-blue-300 truncate" title={`[${aa.asset.assetTag}] ${aa.asset.name}`}>
                                        <span className="shrink-0">💻</span>
                                        <QuickLink
                                          type="asset"
                                          id={aa.asset.id}
                                          label={`[${aa.asset.assetTag}] ${aa.asset.name}`}
                                          showIcon={false}
                                          className="font-bold text-blue-700 dark:text-blue-300 text-[11px] truncate hover:underline"
                                        />
                                      </div>
                                      {/* Dòng 2: Nút thu hồi & Serial */}
                                      <div className="flex items-center justify-between gap-1 pt-0.5 border-t border-blue-100 dark:border-blue-900/50">
                                        <span className="text-[10px] text-slate-400 font-mono truncate">{aa.asset.serialNumber ? `SN: ${aa.asset.serialNumber}` : ''}</span>
                                        <button
                                          type="button"
                                          onClick={() => handleRevokeAsset(aa.asset.id)}
                                          title={isEn ? 'Revoke device to inventory' : 'Thu hồi thiết bị về kho'}
                                          className="text-[10px] text-rose-600 hover:text-rose-800 font-bold px-1.5 py-0.2 bg-white dark:bg-slate-800 rounded border border-rose-200 shrink-0 hover:bg-rose-50 cursor-pointer"
                                        >
                                          {isEn ? 'Revoke' : 'Thu hồi'}
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px] block">{isEn ? 'No devices' : 'Chưa gán máy'}</span>
                            )}

                            <button
                              type="button"
                              onClick={() => handleOpenAssignAsset(u)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-[10.5px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 cursor-pointer transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                              <span>{isEn ? 'Assign Device' : 'Gán máy'}</span>
                            </button>
                          </div>
                        </td>

                        {/* Cột 5: License Đang Giữ (2 dòng: Dòng 1 Tên license, Dòng 2 Nút thu hồi) */}
                        <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                          <div className="space-y-1.5">
                            {u.licenseAssignments?.filter((la: any) => la?.license)?.length > 0 ? (
                              <div className="space-y-1">
                                {u.licenseAssignments
                                  .filter((la: any) => la?.license)
                                  .map((la: any) => (
                                    <div
                                      key={la.license.id}
                                      className="p-1.5 rounded-lg bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-[11px] space-y-1"
                                    >
                                      {/* Dòng 1: Tên license trọn vẹn */}
                                      <div className="flex items-center gap-1 font-bold text-purple-900 dark:text-purple-200 truncate" title={la.license.name}>
                                        <span className="shrink-0">🔑</span>
                                        <QuickLink
                                          type="license"
                                          id={la.license.id}
                                          label={la.license.name}
                                          showIcon={false}
                                          className="font-bold text-purple-900 dark:text-purple-200 text-[11px] truncate hover:underline"
                                        />
                                      </div>
                                      {/* Dòng 2: Nút thu hồi */}
                                      <div className="flex items-center justify-between gap-1 pt-0.5 border-t border-purple-100 dark:border-purple-900/50">
                                        <span className="text-[10px] text-slate-400 font-mono truncate">{la.license.seats ? `${la.license.seats} seats` : ''}</span>
                                        <button
                                          type="button"
                                          onClick={() => handleRevokeLicense(la.license.id, u.id)}
                                          title={isEn ? 'Revoke license' : 'Thu hồi license'}
                                          className="text-[10px] text-rose-600 hover:text-rose-800 font-bold px-1.5 py-0.2 bg-white dark:bg-slate-800 rounded border border-rose-200 shrink-0 hover:bg-rose-50 cursor-pointer"
                                        >
                                          {isEn ? 'Revoke' : 'Thu hồi'}
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px] block">{isEn ? 'No licenses' : 'Chưa cấp Lic'}</span>
                            )}

                            <button
                              type="button"
                              onClick={() => handleOpenAssignLicense(u)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-[10.5px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-md border border-purple-200 cursor-pointer transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                              <span>{isEn ? 'Assign Lic' : 'Gán Lic'}</span>
                            </button>
                          </div>
                        </td>

                        {/* Cột 6: Thao Tác (2 dòng: Dòng 1 Nghỉ việc/Khôi phục, Dòng 2 Reset MK2/Sửa/Xóa) */}
                        <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-col items-end gap-1.5">
                            {/* Dòng 1: Nghỉ việc hoặc Khôi phục */}
                            {u.isActive === false ? (
                              <button
                                type="button"
                                onClick={() => handleReactivateUser(u)}
                                title={isEn ? 'Reactivate employee (restore login access)' : 'Khôi phục công tác (Mở khóa đăng nhập)'}
                                className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[10.5px] font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0"
                              >
                                <RotateCcw className="w-3 h-3 text-emerald-600" />
                                <span>{isEn ? 'Reactivate' : 'Khôi phục'}</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenOffboardModal(u)}
                                title={isEn ? 'Mark employee as resigned / offboarded' : 'Chuyển sang trạng thái Nghỉ việc & Khóa tài khoản'}
                                className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[10.5px] font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0"
                              >
                                <span>🛑</span>
                                <span>{isEn ? 'Resign' : 'Nghỉ việc'}</span>
                              </button>
                            )}

                            {/* Dòng 2: Nút thao tác nhanh Reset MK2, Sửa, Xóa */}
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleResetSecondaryPassword(u)}
                                title={isEn ? 'Reset secondary password' : 'Reset Mật Khẩu Cấp 2 khi người dùng quên'}
                                className="px-1.5 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-md text-[10px] font-bold flex items-center gap-0.5 transition-all cursor-pointer shrink-0"
                              >
                                <KeyRound className="w-2.5 h-2.5 text-amber-600" />
                                <span>{isEn ? 'MK2' : 'MK2'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditUser(u)}
                                title={isEn ? 'Edit employee details' : 'Chỉnh sửa toàn bộ thông tin nhân viên'}
                                className="p-1 text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-md transition-all cursor-pointer"
                              >
                                <Edit className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(u)}
                                title={isEn ? 'Delete employee from system' : 'Xóa nhân viên khỏi hệ thống'}
                                className="p-1 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-md transition-all cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* VIEW 2: GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((u) => {
            const { parent, child } = parseDeptParts(u.department);
            return (
              <div
                key={u.id}
                onClick={() => handleOpenEditUser(u)}
                className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 cursor-pointer hover:border-purple-300 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                      {u.fullName.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className={`font-bold text-sm ${u.isActive === false ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-white'}`}>
                          {u.fullName}
                        </h4>
                        {u.isActive === false && (
                          <span className="px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 text-[10px] font-bold border border-rose-200">
                            🛑 {isEn ? 'Resigned' : 'Nghỉ việc'}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-purple-700 font-semibold">{u.position || (isEn ? 'Staff' : 'Nhân viên')}</span>
                      {u.manager && (
                        <div className="pt-0.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const mgr = users.find((item: any) => item.id === u.manager.id || item.email === u.manager.email);
                              if (mgr) {
                                setViewingUserDetail(mgr);
                                setIsUserDetailModalOpen(true);
                              } else {
                                fetch(`/api/users/${u.manager.id}`)
                                  .then((r) => r.json())
                                  .then((res) => {
                                    const item = res.data || res.user || res;
                                    if (item && item.id) {
                                      setViewingUserDetail(item);
                                      setIsUserDetailModalOpen(true);
                                    }
                                  });
                              }
                            }}
                            title={isEn ? `Manager: ${u.manager.fullName}` : `Cấp trên: ${u.manager.fullName}`}
                            className="text-[10px] text-slate-700 dark:text-slate-300 font-medium inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-1.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 transition-all cursor-pointer group"
                          >
                            <UserCheck className="w-3 h-3 text-slate-500 shrink-0" />
                            <span className="group-hover:underline">{isEn ? 'Manager: ' : 'Cấp trên: '}{u.manager.fullName}</span>
                            <ExternalLink className="w-2.5 h-2.5 text-slate-400 opacity-60 group-hover:opacity-100" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {u.isActive === false ? (
                      <button
                        type="button"
                        onClick={() => handleReactivateUser(u)}
                        title={isEn ? 'Reactivate employee' : 'Khôi phục công tác'}
                        className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenOffboardModal(u)}
                        title={isEn ? 'Mark as resigned' : 'Chuyển sang Nghỉ việc'}
                        className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                      >
                        <span className="text-xs">🛑</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleOpenEditUser(u)}
                      className="p-1 text-slate-400 hover:text-blue-600 cursor-pointer"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(u)}
                      className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="text-xs space-y-1 text-slate-600 dark:text-slate-300">
                  {u.companyName && (
                    <div className="flex items-center gap-1 font-semibold text-indigo-700">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>{u.companyName}</span>
                    </div>
                  )}
                  <div>Phòng ban: <strong>{parent}</strong></div>
                  {child && <div>Bộ phận: <strong className="text-purple-700">{child}</strong></div>}
                  <div>Email: <span className="font-mono">{u.email}</span></div>
                </div>

                <div className="pt-2 border-t flex items-center justify-between text-xs">
                  <span>Máy: <strong>{u.assetAssignments?.length || 0}</strong></span>
                  <span>License: <strong>{u.licenseAssignments?.length || 0}</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* Modal: Edit Staff / User */}
      {isEditUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[92vh] border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70 rounded-t-3xl shrink-0">
              <div>
                <h3 className="font-bold text-lg text-slate-900">{isEn ? 'Edit Employee Information' : 'Chỉnh Sửa Thông Tin Nhân Viên'}</h3>
                <p className="text-xs text-slate-400">
                  {isEn ? (
                    <>Press <kbd className="font-mono bg-slate-200 px-1 py-0.5 rounded text-[10px] text-slate-700">Esc</kbd> to close</>
                  ) : (
                    <>Nhấn <kbd className="font-mono bg-slate-200 px-1 py-0.5 rounded text-[10px] text-slate-700">Esc</kbd> để đóng</>
                  )}
                </p>
              </div>
              <button onClick={() => setIsEditUserModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <form id="edit-user-form" onSubmit={handleUpdateUser} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{isEn ? 'Full Name (*)' : 'Họ và tên (*)'}</label>
                  <input
                    type="text"
                    required
                    value={editUserFormData.fullName}
                    onChange={(e) => setEditUserFormData({ ...editUserFormData, fullName: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-medium outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">{isEn ? 'Account / Login Email (*)' : 'Tài khoản / Email đăng nhập (*)'}</label>
                  <input
                    type="email"
                    required
                    placeholder="ten.nguyen@company.com"
                    value={editUserFormData.email || ''}
                    onChange={(e) => setEditUserFormData({ ...editUserFormData, email: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-medium outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Trạng thái công tác: Đang làm việc vs Đã nghỉ việc */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl">
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-2">
                  {isEn ? 'Employment & Login Status' : 'Trạng Thái Công Tác & Đăng Nhập'}
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="editUserStatus"
                      checked={editUserFormData.isActive !== false}
                      onChange={() => setEditUserFormData((prev: any) => ({ ...prev, isActive: true }))}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="font-bold text-emerald-700 dark:text-emerald-400 text-xs">
                      🟢 {isEn ? 'Active (Working / Allowed to login)' : 'Đang làm việc (Mở khóa đăng nhập)'}
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="editUserStatus"
                      checked={editUserFormData.isActive === false}
                      onChange={() => setEditUserFormData((prev: any) => ({ ...prev, isActive: false }))}
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    <span className="font-bold text-rose-700 dark:text-rose-400 text-xs">
                      🛑 {isEn ? 'Resigned (Login Blocked)' : 'Đã nghỉ việc (Khóa đăng nhập)'}
                    </span>
                  </label>
                </div>
              </div>

              {/* Row 2: Cấp trên trực tiếp & Nơi làm việc / Địa điểm */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Cấp trên trực tiếp */}
                <div className="p-3 bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-2xl">
                  <ManageableDropdown
                    label={isEn ? 'Direct Manager' : 'Cấp Trên Trực Tiếp'}
                    placeholder={isEn ? '-- Select direct manager --' : '-- Chọn cấp trên trực tiếp --'}
                    emptyLabel={isEn ? '-- None / Self-managed --' : '-- Không có / Tự quản lý --'}
                    icon={<UserCheck className="w-3.5 h-3.5 text-slate-500" />}
                    themeColor="slate"
                    searchPlaceholder={isEn ? 'Search by name, email, title...' : 'Tìm theo tên, email, chức vụ...'}
                    items={users
                      .filter((u: any) => u.id !== editingUserId)
                      .map((u: any) => ({
                        id: u.id,
                        name: u.fullName,
                        subtitle: `${u.position || (isEn ? 'Staff' : 'Nhân viên')} · ${u.email}`,
                        icon: <User className="w-3.5 h-3.5 text-slate-400" />,
                      }))}
                    selectedValue={editUserFormData.managerId || ''}
                    onSelect={(id) => setEditUserFormData((prev: any) => ({ ...prev, managerId: id }))}
                  />
                </div>

                {/* Nơi làm việc (Vị trí) */}
                <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-2xl">
                  <ManageableDropdown
                    label={isEn ? 'Workplace (Location)' : 'Nơi Làm Việc (Vị Trí)'}
                    placeholder={isEn ? '-- Select workplace / location --' : '-- Chọn nơi làm việc / vị trí --'}
                    emptyLabel={isEn ? '-- Unspecified location --' : '-- Chưa xác định vị trí --'}
                    icon={<MapPin className="w-3.5 h-3.5 text-emerald-600" />}
                    themeColor="emerald"
                    searchPlaceholder={isEn ? 'Search by location name, building, floor...' : 'Tìm theo tên vị trí, tòa nhà, tầng...'}
                    onQuickAddClick={() => setIsAddLocationModalOpen(true)}
                    items={locations.map((loc: any) => ({
                      id: loc.id,
                      name: loc.name,
                      subtitle: `${loc.building || ''} ${loc.floor ? `· ${loc.floor}` : ''}`.trim() || undefined,
                      icon: <MapPin className="w-3.5 h-3.5 text-emerald-600" />,
                    }))}
                    selectedValue={editUserFormData.locationId || ''}
                    onSelect={(id) => setEditUserFormData((prev: any) => ({ ...prev, locationId: id }))}
                  />
                </div>
              </div>

              {/* Managing Company in Corporation */}
              <div className="p-3 bg-indigo-50/50 border border-indigo-200 rounded-2xl">
                <ManageableDropdown
                  label={isEn ? 'Managing Company (Corporation)' : 'Công Ty Quản Lý (Trong Tập Đoàn)'}
                  placeholder={isEn ? '-- Select managing company --' : '-- Chọn công ty quản lý --'}
                  icon={<Building2 className="w-3.5 h-3.5 text-indigo-600" />}
                  items={companies.map((c) => ({ id: c, name: c }))}
                  selectedValue={editUserFormData.companyName}
                  onSelect={(name) => setEditUserFormData((prev: any) => ({ ...prev, companyName: name }))}
                  onAdd={handleAddCompany}
                  onEdit={handleEditCompany}
                  onDelete={(id, name) => handleDeleteCompany(name)}
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{isEn ? 'Job Title / Position' : 'Chức danh / Vị trí công việc'}</label>
                <input
                  type="text"
                  placeholder={isEn ? 'e.g. Senior Developer, Chief Accountant, IT Lead...' : 'VD: Senior Developer, Kế toán trưởng, IT Lead...'}
                  value={editUserFormData.position}
                  onChange={(e) => setEditUserFormData({ ...editUserFormData, position: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-medium outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* HIERARCHICAL DEPARTMENT SELECTION (CHA - CON) */}
              <div className="p-3.5 bg-purple-50/60 border border-purple-200 rounded-2xl space-y-3">
                <div className="font-bold text-purple-950 flex items-center gap-1.5">
                  <FolderTree className="w-4 h-4 text-purple-600" />
                  <span>{isEn ? 'Department & Unit Hierarchy (Parent - Child)' : 'Cơ Cấu Phòng Ban & Bộ Phận (Cha - Con)'}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Cấp 1: Phòng ban Cha */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">{isEn ? '📁 1. Main Department (Parent)' : '📁 1. Phòng Ban Chính (Cha)'}</label>
                    <select
                      value={isCustomParent ? '__CUSTOM__' : formParentDept}
                      onChange={(e) => {
                        if (e.target.value === '__CUSTOM__') {
                          setIsCustomParent(true);
                        } else {
                          setIsCustomParent(false);
                          setFormParentDept(e.target.value);
                          // Reset child to first available or empty
                          const pNode = deptTree.find((d) => d.name === e.target.value);
                          setFormChildDept(pNode?.children?.[0]?.name || '');
                          setIsCustomChild(false);
                        }
                      }}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 outline-none"
                    >
                      {deptTree.map((d) => (
                        <option key={d.id} value={d.name}>
                          {d.icon || '📁'} {d.name}
                        </option>
                      ))}
                      <option value="__CUSTOM__">{isEn ? '➕ Add new department...' : '➕ Thêm phòng ban mới...'}</option>
                    </select>
                  </div>

                  {/* Cấp 2: Bộ phận / Tổ con */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">{isEn ? '📂 2. Sub-department / Team' : '📂 2. Bộ Phận Con / Tổ Chuyên Môn'}</label>
                    <select
                      value={isCustomChild ? '__CUSTOM__' : formChildDept}
                      onChange={(e) => {
                        if (e.target.value === '__CUSTOM__') {
                          setIsCustomChild(true);
                        } else {
                          setIsCustomChild(false);
                          setFormChildDept(e.target.value);
                        }
                      }}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-purple-900 outline-none"
                    >
                      <option value="">{isEn ? '-- Direct under department --' : '-- Trực thuộc chung phòng ban --'}</option>
                      {activeModalParentNode?.children?.map((c) => (
                        <option key={c.id} value={c.name}>
                          📂 {c.name}
                        </option>
                      ))}
                      <option value="__CUSTOM__">{isEn ? '➕ Add new sub-department...' : '➕ Thêm bộ phận con mới...'}</option>
                    </select>
                  </div>
                </div>

                {isCustomParent && (
                  <div>
                    <label className="block font-bold text-purple-800 mb-1">{isEn ? 'New main department name:' : 'Tên phòng ban chính mới:'}</label>
                    <input
                      type="text"
                      required
                      placeholder={isEn ? 'e.g. Research & Development (R&D)...' : 'VD: Khối Nghiên Cứu & Phát Triển (R&D)...'}
                      value={customParentText}
                      onChange={(e) => setCustomParentText(e.target.value)}
                      className="w-full p-2 bg-white border border-purple-400 rounded-xl font-medium outline-none"
                    />
                  </div>
                )}

                {isCustomChild && (
                  <div>
                    <label className="block font-bold text-purple-800 mb-1">{isEn ? 'New sub-department name:' : 'Tên bộ phận / tổ con mới:'}</label>
                    <input
                      type="text"
                      required
                      placeholder={isEn ? 'e.g. Telecom & Switchboard Team...' : 'VD: Tổ Kỹ thuật Viễn thông & Tổng đài...'}
                      value={customChildText}
                      onChange={(e) => setCustomChildText(e.target.value)}
                      className="w-full p-2 bg-white border border-purple-400 rounded-xl font-medium outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{isEn ? 'Role (*)' : 'Vai trò (Role) (*)'}</label>
                  <select
                    value={editUserFormData.roleId}
                    onChange={(e) => setEditUserFormData({ ...editUserFormData, roleId: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-bold text-purple-700 outline-none"
                  >
                    {(Array.isArray(roles) ? roles : []).map((r) => (
                      <option key={r.id} value={r.id}>
                        🛡️ {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">{isEn ? 'Phone Number' : 'Số điện thoại'}</label>
                  <input
                    type="text"
                    value={editUserFormData.phone}
                    onChange={(e) => setEditUserFormData({ ...editUserFormData, phone: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-medium outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{isEn ? 'New login password (Leave blank if no change)' : 'Đổi mật khẩu đăng nhập mới (Bỏ trống nếu không đổi)'}</label>
                <input
                  type="password"
                  placeholder={isEn ? 'New login password...' : 'Mật khẩu đăng nhập mới...'}
                  value={editUserFormData.password}
                  onChange={(e) => setEditUserFormData({ ...editUserFormData, password: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl outline-none"
                />
              </div>

              {/* Box Reset Mật Khẩu Cấp 2 */}
              <div className="p-4 bg-amber-50/80 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-amber-950 dark:text-amber-200">{isEn ? 'Secondary Password (Vault Protection)' : 'Mật Khẩu Cấp 2 (Bảo Vệ Kho Mật Khẩu)'}</h4>
                    <p className="text-[11px] text-amber-800/80 dark:text-amber-300">
                      {isEn ? 'If this employee forgets their secondary password, Admin can reset it here.' : 'Nếu nhân sự này quên Mật khẩu cấp 2, Quản trị viên có thể đặt lại ngay tại đây.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const u = users.find((x) => x.id === editingUserId);
                    if (u) handleResetSecondaryPassword(u);
                  }}
                  className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0 transition-colors"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Reset Secondary Pwd' : 'Reset Mật Khẩu Cấp 2'}</span>
                </button>
              </div>
            </form>

            {/* Modal Sticky Footer */}
            <div className="flex items-center justify-between gap-2 px-6 py-3.5 border-t border-slate-100 bg-slate-50/70 rounded-b-3xl shrink-0">
              <button
                type="button"
                onClick={() => {
                  const u = users.find((x) => x.id === editingUserId);
                  if (u) {
                    setIsEditUserModalOpen(false);
                    handleDeleteUser(u);
                  }
                }}
                className="px-3.5 py-2 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isEn ? 'Delete Account' : 'Xóa Tài Khoản'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditUserModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-white transition-all cursor-pointer"
                >
                  {isEn ? 'Cancel (Esc)' : 'Hủy (Esc)'}
                </button>
                <button
                  type="submit"
                  form="edit-user-form"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Save Changes' : 'Lưu Thay Đổi'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add New Staff Member */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[92vh] border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70 rounded-t-3xl shrink-0">
              <div>
                <h3 className="font-bold text-lg text-slate-900">{isEn ? 'Add New Account / Employee' : 'Thêm Mới Tài Khoản / Nhân Viên'}</h3>
                <p className="text-xs text-slate-400">
                  {isEn ? (
                    <>Press <kbd className="font-mono bg-slate-200 px-1 py-0.5 rounded text-[10px] text-slate-700">Esc</kbd> to close</>
                  ) : (
                    <>Nhấn <kbd className="font-mono bg-slate-200 px-1 py-0.5 rounded text-[10px] text-slate-700">Esc</kbd> để đóng</>
                  )}
                </p>
              </div>
              <button onClick={() => setIsAddUserModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <form id="add-user-form" onSubmit={handleCreateUser} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{isEn ? 'Full Name (*)' : 'Họ và tên (*)'}</label>
                  <input
                    type="text"
                    required
                    placeholder={isEn ? 'e.g. John Doe' : 'VD: Nguyễn Văn An'}
                    value={userFormData.fullName}
                    onChange={(e) => setUserFormData({ ...userFormData, fullName: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-medium outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">{isEn ? 'Account / Login Email (*)' : 'Tài khoản / Email đăng nhập (*)'}</label>
                  <input
                    type="email"
                    required
                    placeholder="an.nguyen@company.com"
                    value={userFormData.email}
                    onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-medium outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Row 2: Cấp trên trực tiếp & Nơi làm việc / Địa điểm */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Cấp trên trực tiếp */}
                <div className="p-3 bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-2xl">
                  <ManageableDropdown
                    label={isEn ? 'Direct Manager' : 'Cấp Trên Trực Tiếp'}
                    placeholder={isEn ? '-- Select direct manager --' : '-- Chọn cấp trên trực tiếp --'}
                    emptyLabel={isEn ? '-- None / Self-managed --' : '-- Không có / Tự quản lý --'}
                    icon={<UserCheck className="w-3.5 h-3.5 text-slate-500" />}
                    themeColor="slate"
                    searchPlaceholder={isEn ? 'Search by name, email, title...' : 'Tìm theo tên, email, chức vụ...'}
                    items={users.map((u: any) => ({
                      id: u.id,
                      name: u.fullName,
                      subtitle: `${u.position || (isEn ? 'Staff' : 'Nhân viên')} · ${u.email}`,
                      icon: <User className="w-3.5 h-3.5 text-slate-400" />,
                    }))}
                    selectedValue={userFormData.managerId || ''}
                    onSelect={(id) => setUserFormData((prev: any) => ({ ...prev, managerId: id }))}
                  />
                </div>

                {/* Nơi làm việc (Vị trí) */}
                <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-2xl">
                  <ManageableDropdown
                    label={isEn ? 'Workplace (Location)' : 'Nơi Làm Việc (Vị Trí)'}
                    placeholder={isEn ? '-- Select workplace / location --' : '-- Chọn nơi làm việc / vị trí --'}
                    emptyLabel={isEn ? '-- Unspecified location --' : '-- Chưa xác định vị trí --'}
                    icon={<MapPin className="w-3.5 h-3.5 text-emerald-600" />}
                    themeColor="emerald"
                    searchPlaceholder={isEn ? 'Search by location name, building, floor...' : 'Tìm theo tên vị trí, tòa nhà, tầng...'}
                    onQuickAddClick={() => setIsAddLocationModalOpen(true)}
                    items={locations.map((loc: any) => ({
                      id: loc.id,
                      name: loc.name,
                      subtitle: `${loc.building || ''} ${loc.floor ? `· ${loc.floor}` : ''}`.trim() || undefined,
                      icon: <MapPin className="w-3.5 h-3.5 text-emerald-600" />,
                    }))}
                    selectedValue={userFormData.locationId || ''}
                    onSelect={(id) => setUserFormData((prev: any) => ({ ...prev, locationId: id }))}
                  />
                </div>
              </div>

              {/* Managing Company in Corporation */}
              <div className="p-3 bg-indigo-50/50 border border-indigo-200 rounded-2xl">
                <ManageableDropdown
                  label={isEn ? 'Managing Company (Corporation)' : 'Công Ty Quản Lý (Trong Tập Đoàn)'}
                  placeholder={isEn ? '-- Select managing company --' : '-- Chọn công ty quản lý --'}
                  icon={<Building2 className="w-3.5 h-3.5 text-indigo-600" />}
                  items={companies.map((c) => ({ id: c, name: c }))}
                  selectedValue={userFormData.companyName}
                  onSelect={(name) => setUserFormData((prev) => ({ ...prev, companyName: name }))}
                  onAdd={handleAddCompany}
                  onEdit={handleEditCompany}
                  onDelete={(id, name) => handleDeleteCompany(name)}
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{isEn ? 'Job Title / Position (*)' : 'Chức danh / Vị trí công việc (*)'}</label>
                <input
                  type="text"
                  placeholder={isEn ? 'e.g. IT Lead, General Accountant, Senior Dev...' : 'VD: IT Lead, Kế toán tổng hợp, Senior Dev...'}
                  value={userFormData.position}
                  onChange={(e) => setUserFormData({ ...userFormData, position: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-medium outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* HIERARCHICAL DEPARTMENT SELECTION (CHA - CON) */}
              <div className="p-3.5 bg-purple-50/60 border border-purple-200 rounded-2xl space-y-3">
                <div className="font-bold text-purple-950 flex items-center gap-1.5">
                  <FolderTree className="w-4 h-4 text-purple-600" />
                  <span>{isEn ? 'Department & Unit Hierarchy (Parent - Child)' : 'Cơ Cấu Phòng Ban & Bộ Phận (Cha - Con)'}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Cấp 1: Phòng ban Cha */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">{isEn ? '📁 1. Main Department (Parent)' : '📁 1. Phòng Ban Chính (Cha)'}</label>
                    <select
                      value={isCustomParent ? '__CUSTOM__' : formParentDept}
                      onChange={(e) => {
                        if (e.target.value === '__CUSTOM__') {
                          setIsCustomParent(true);
                        } else {
                          setIsCustomParent(false);
                          setFormParentDept(e.target.value);
                          const pNode = deptTree.find((d) => d.name === e.target.value);
                          setFormChildDept(pNode?.children?.[0]?.name || '');
                          setIsCustomChild(false);
                        }
                      }}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 outline-none"
                    >
                      {deptTree.map((d) => (
                        <option key={d.id} value={d.name}>
                          {d.icon || '📁'} {d.name}
                        </option>
                      ))}
                      <option value="__CUSTOM__">{isEn ? '➕ Add new department...' : '➕ Thêm phòng ban mới...'}</option>
                    </select>
                  </div>

                  {/* Cấp 2: Bộ phận / Tổ con */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">{isEn ? '📂 2. Sub-department / Team' : '📂 2. Bộ Phận Con / Tổ Chuyên Môn'}</label>
                    <select
                      value={isCustomChild ? '__CUSTOM__' : formChildDept}
                      onChange={(e) => {
                        if (e.target.value === '__CUSTOM__') {
                          setIsCustomChild(true);
                        } else {
                          setIsCustomChild(false);
                          setFormChildDept(e.target.value);
                        }
                      }}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-purple-900 outline-none"
                    >
                      <option value="">{isEn ? '-- Direct under department --' : '-- Trực thuộc chung phòng ban --'}</option>
                      {activeModalParentNode?.children?.map((c) => (
                        <option key={c.id} value={c.name}>
                          📂 {c.name}
                        </option>
                      ))}
                      <option value="__CUSTOM__">{isEn ? '➕ Add new sub-department...' : '➕ Thêm bộ phận con mới...'}</option>
                    </select>
                  </div>
                </div>

                {isCustomParent && (
                  <div>
                    <label className="block font-bold text-purple-800 mb-1">{isEn ? 'New main department name:' : 'Tên phòng ban chính mới:'}</label>
                    <input
                      type="text"
                      required
                      placeholder={isEn ? 'e.g. Research & Development (R&D)...' : 'VD: Khối Nghiên Cứu & Phát Triển (R&D)...'}
                      value={customParentText}
                      onChange={(e) => setCustomParentText(e.target.value)}
                      className="w-full p-2 bg-white border border-purple-400 rounded-xl font-medium outline-none"
                    />
                  </div>
                )}

                {isCustomChild && (
                  <div>
                    <label className="block font-bold text-purple-800 mb-1">{isEn ? 'New sub-department name:' : 'Tên bộ phận / tổ con mới:'}</label>
                    <input
                      type="text"
                      required
                      placeholder={isEn ? 'e.g. Telecom & Switchboard Team...' : 'VD: Tổ Kỹ thuật Viễn thông & Tổng đài...'}
                      value={customChildText}
                      onChange={(e) => setCustomChildText(e.target.value)}
                      className="w-full p-2 bg-white border border-purple-400 rounded-xl font-medium outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{isEn ? 'Role (*)' : 'Vai trò (Role) (*)'}</label>
                  <select
                    value={userFormData.roleId}
                    onChange={(e) => setUserFormData({ ...userFormData, roleId: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-bold text-purple-700 outline-none"
                  >
                    {(Array.isArray(roles) ? roles : []).map((r) => (
                      <option key={r.id} value={r.id}>
                        🛡️ {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">{isEn ? 'Phone Number' : 'Số điện thoại'}</label>
                  <input
                    type="text"
                    placeholder="0912345678"
                    value={userFormData.phone}
                    onChange={(e) => setUserFormData({ ...userFormData, phone: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-medium outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{isEn ? 'Initial Password' : 'Mật khẩu khởi tạo'}</label>
                <input
                  type="text"
                  value={userFormData.password}
                  onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  {isEn ? 'Cancel (Esc)' : 'Hủy (Esc)'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-md cursor-pointer flex items-center gap-1"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Create Account' : 'Tạo Tài Khoản'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Quick Add Location / Workplace */}
      {isAddLocationModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">{isEn ? 'Add New Workplace / Location' : 'Thêm Nơi Làm Việc / Vị Trí Mới'}</h3>
                  <p className="text-[11px] text-slate-400">{isEn ? 'Synced to Location & Department catalog' : 'Đồng bộ vào danh mục Vị Trí & Phòng Ban'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddLocationModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickAddLocation} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">{isEn ? 'Workplace / Office / Branch Name (*)' : 'Tên Vị Trí / Văn Phòng / Chi Nhánh (*)'}</label>
                <input
                  type="text"
                  required
                  placeholder={isEn ? 'e.g. Da Nang Branch, TechCorp Tower - 8th Floor...' : 'VD: Chi nhánh Đà Nẵng, Tòa TechCorp - Tầng 8...'}
                  value={newLocName}
                  onChange={(e) => setNewLocName(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{isEn ? 'Building' : 'Tòa nhà (Building)'}</label>
                  <input
                    type="text"
                    placeholder={isEn ? 'e.g. Building A, Saigon Centre...' : 'VD: Tòa A, Saigon Centre...'}
                    value={newLocBuilding}
                    onChange={(e) => setNewLocBuilding(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">{isEn ? 'Floor' : 'Tầng (Floor)'}</label>
                  <input
                    type="text"
                    placeholder={isEn ? 'e.g. 5th Floor, 12th Floor...' : 'VD: Tầng 5, Tầng 12...'}
                    value={newLocFloor}
                    onChange={(e) => setNewLocFloor(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddLocationModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  {isEn ? 'Cancel (Esc)' : 'Hủy (Esc)'}
                </button>
                <button
                  type="submit"
                  disabled={isSavingLoc}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center gap-1 transition-all disabled:opacity-50"
                >
                  {isSavingLoc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{isEn ? 'Save Location' : 'Lưu Vị Trí'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Gán Thiết Bị Cho Nhân Viên */}
      {isAssignAssetModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b">
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-1.5">
                  <Laptop className="w-4 h-4 text-blue-600" />
                  <span>Cấp Phát Thiết Bị Cho Nhân Sự</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Nhân viên: <strong className="text-slate-800">{selectedUser.fullName}</strong>
                </p>
              </div>
              <button onClick={() => setIsAssignAssetModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAssignAsset} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Chọn thiết bị trong kho (Sẵn sàng cấp):</label>
                <select
                  value={selectedAssetId}
                  onChange={(e) => setSelectedAssetId(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-bold text-blue-900 bg-blue-50/40 outline-none"
                >
                  {availableAssets.map((a) => (
                    <option key={a.id} value={a.id}>
                      [{a.assetTag}] {a.name} {a.serialNumber ? `(SN: ${a.serialNumber})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ghi chú biên bản bàn giao:</label>
                <textarea
                  rows={2}
                  placeholder="VD: Cấp máy mới nguyên seal, chuột và sạc kèm theo..."
                  value={assignAssetNotes}
                  onChange={(e) => setAssignAssetNotes(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsAssignAssetModalOpen(false)}
                  className="px-4 py-2 border rounded-xl font-semibold text-slate-700"
                >{isEn ? 'Cancel' : 'Hủy'}</button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md cursor-pointer"
                >
                  Xác Nhận Bàn Giao
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* ==================== MODAL: XEM CHI TIẾT NHÂN SỰ TOÀN DIỆN ==================== */}
      {isUserDetailModalOpen && viewingUserDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-3xl w-full border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-gradient-to-r from-blue-50/60 via-indigo-50/40 to-slate-50 dark:from-slate-900 dark:to-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center text-lg font-black shadow-md shrink-0">
                  {viewingUserDetail.fullName?.charAt(0) || 'U'}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                      {viewingUserDetail.fullName}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 text-[10.5px] font-bold border border-blue-200 dark:border-blue-800">
                      🛡️ {viewingUserDetail.role?.name || 'Staff'}
                    </span>
                    {viewingUserDetail.isActive !== false ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        ● {isEn ? 'Active' : 'Đang làm việc'}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold border border-rose-200">
                        🛑 {isEn ? 'Resigned (Login Blocked)' : 'Đã nghỉ việc (Khóa đăng nhập)'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {viewingUserDetail.position || 'Nhân viên'} · 🏢 {viewingUserDetail.companyName || 'Công ty chung'} · 📁 {viewingUserDetail.department || 'Chưa phân phòng'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsUserDetailModalOpen(false);
                    handleOpenEditUser(viewingUserDetail);
                  }}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Sửa</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsUserDetailModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
              {/* Card 1: Thông tin liên hệ & Công việc */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-[11px] text-slate-400 font-semibold block">Email liên hệ:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">✉️ {viewingUserDetail.email}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-semibold block">Số điện thoại:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-xs font-mono">
                    📞 {viewingUserDetail.phone || 'Chưa cập nhật'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-semibold block">Công ty trực thuộc:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                    🏢 {viewingUserDetail.companyName || 'Công ty chung'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-semibold block">Phòng ban:</span>
                  <span className="font-bold text-purple-700 dark:text-purple-300 text-xs">
                    📁 {viewingUserDetail.department || 'Chưa phân phòng'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-semibold block">Vị trí làm việc:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                    📍 {viewingUserDetail.location?.name || 'Văn phòng chính'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-semibold block mb-1">{isEn ? 'Direct Manager:' : 'Cấp trên trực tiếp:'}</span>
                  {viewingUserDetail.manager ? (
                    <button
                      type="button"
                      onClick={() => {
                        const mgr = users.find((u: any) => u.id === viewingUserDetail.manager?.id || u.email === viewingUserDetail.manager?.email);
                        if (mgr) {
                          setViewingUserDetail(mgr);
                        } else {
                          fetch(`/api/users/${viewingUserDetail.manager.id}`)
                            .then((r) => r.json())
                            .then((res) => {
                              const item = res.data || res.user || res;
                              if (item && item.id) setViewingUserDetail(item);
                            });
                        }
                      }}
                      title={isEn ? `Click to view manager's profile: ${viewingUserDetail.manager.fullName}` : `Bấm để xem hồ sơ cấp trên: ${viewingUserDetail.manager.fullName}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium border border-slate-200 dark:border-slate-700 transition-all cursor-pointer text-xs group shadow-2xs"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="group-hover:underline underline-offset-2">{viewingUserDetail.manager.fullName}</span>
                      {viewingUserDetail.manager.position && (
                        <span className="text-[10px] text-slate-500 font-normal">({viewingUserDetail.manager.position})</span>
                      )}
                      <ExternalLink className="w-3 h-3 text-slate-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ) : (
                    <span className="text-slate-400 italic text-xs">{isEn ? 'Not assigned' : 'Chưa chỉ định'}</span>
                  )}
                </div>
              </div>

              {/* Card 1.5: Đội ngũ nhân sự trực thuộc / Cấp dưới */}
              {(() => {
                const subReports = viewingUserDetail.directReports && viewingUserDetail.directReports.length > 0
                  ? viewingUserDetail.directReports
                  : users.filter((u: any) => u.managerId === viewingUserDetail.id || u.manager?.id === viewingUserDetail.id);

                return (
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2.5">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
                      <h3 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-purple-600" />
                        <span>{isEn ? 'Direct Reports / Team Members' : 'Nhân Sự Cấp Dưới Trực Thuộc'} ({subReports.length})</span>
                      </h3>
                      {subReports.length > 0 && (
                        <span className="text-[10.5px] text-purple-700 dark:text-purple-300 font-bold bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-full border border-purple-200">
                          {subReports.length} {isEn ? 'members' : 'thành viên'}
                        </span>
                      )}
                    </div>

                    {subReports.length === 0 ? (
                      <div className="text-slate-400 italic text-xs py-1">
                        {isEn ? 'This person currently does not directly manage any subordinates.' : 'Nhân sự này hiện chưa trực tiếp quản lý cấp dưới nào.'}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {subReports.map((sub: any) => (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => {
                              const fullSub = users.find((u: any) => u.id === sub.id) || sub;
                              if (fullSub.assetAssignments) {
                                setViewingUserDetail(fullSub);
                              } else {
                                fetch(`/api/users/${sub.id}`)
                                  .then((r) => r.json())
                                  .then((res) => {
                                    const item = res.data || res.user || res;
                                    if (item && item.id) setViewingUserDetail(item);
                                    else setViewingUserDetail(fullSub);
                                  });
                              }
                            }}
                            title={isEn ? `View profile: ${sub.fullName}` : `Bấm xem hồ sơ nhân sự: ${sub.fullName}`}
                            className="p-2.5 rounded-xl bg-slate-50 hover:bg-purple-50/80 dark:bg-slate-900/60 dark:hover:bg-purple-950/30 border border-slate-200 dark:border-slate-800 hover:border-purple-300 transition-all flex items-center justify-between text-left group cursor-pointer"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                                {sub.fullName?.charAt(0) || 'U'}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-slate-800 dark:text-slate-200 text-xs group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors truncate">
                                  {sub.fullName}
                                </div>
                                <div className="text-[10px] text-slate-500 truncate">
                                  {sub.position || (isEn ? 'Staff' : 'Nhân viên')} {sub.department ? `· ${sub.department}` : ''}
                                </div>
                              </div>
                            </div>
                            <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-purple-600 opacity-60 group-hover:opacity-100 shrink-0 ml-1 transition-all" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Card 2: Thiết bị CNTT đang bàn giao */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
                  <h3 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Laptop className="w-4 h-4 text-blue-600" />
                    <span>Thiết Bị Đang Bàn Giao ({viewingUserDetail.assetAssignments?.length || 0})</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserDetailModalOpen(false);
                      handleOpenAssignAsset(viewingUserDetail);
                    }}
                    className="px-2.5 py-1 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white rounded-lg font-bold text-[11px] transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Bàn Giao Thiết Bị</span>
                  </button>
                </div>

                {(!viewingUserDetail.assetAssignments || viewingUserDetail.assetAssignments.length === 0) ? (
                  <div className="text-center py-5 text-slate-400 italic">
                    Nhân viên này hiện chưa được bàn giao thiết bị nào.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {viewingUserDetail.assetAssignments.map((aa: any) => (
                      <div
                        key={aa.asset.id}
                        className="p-3 rounded-xl bg-blue-50/60 dark:bg-slate-900/80 border border-blue-200 dark:border-blue-900/50 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                            <Laptop className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <code className="bg-blue-200 dark:bg-blue-900 text-blue-900 dark:text-blue-200 px-1.5 py-0.2 rounded font-mono font-bold text-[10px]">
                                {aa.asset.assetTag}
                              </code>
                              <span className="font-bold text-slate-900 dark:text-white truncate">
                                {aa.asset.name}
                              </span>
                            </div>
                            <span className="text-[10.5px] text-slate-500 block truncate mt-0.5">
                              {aa.asset.brand} {aa.asset.model || ''} {aa.asset.serialNumber ? `· SN: ${aa.asset.serialNumber}` : ''} · Bàn giao: {new Date(aa.assignedAt).toLocaleDateString('vi-VN')}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <a
                            href={`/assets?id=${aa.asset.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 text-[10.5px] font-semibold flex items-center gap-1"
                          >
                            <span>Xem máy</span>
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              handleRevokeAsset(aa.asset.id);
                              setViewingUserDetail((prev: any) => ({
                                ...prev,
                                assetAssignments: prev.assetAssignments.filter((x: any) => x.asset.id !== aa.asset.id)
                              }));
                            }}
                            className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg border border-rose-200 text-[10.5px] font-bold cursor-pointer"
                          >
                            Thu hồi
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Card 3: License bản quyền đang cấp */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
                  <h3 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-purple-600" />
                    <span>Bản Quyền Phần Mềm & License ({viewingUserDetail.licenseAssignments?.length || 0})</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserDetailModalOpen(false);
                      handleOpenAssignLicense(viewingUserDetail);
                    }}
                    className="px-2.5 py-1 bg-purple-50 hover:bg-purple-600 text-purple-700 hover:text-white rounded-lg font-bold text-[11px] transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Cấp License</span>
                  </button>
                </div>

                {(!viewingUserDetail.licenseAssignments || viewingUserDetail.licenseAssignments.length === 0) ? (
                  <div className="text-center py-5 text-slate-400 italic">
                    Nhân viên này hiện chưa được cấp license phần mềm nào.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {viewingUserDetail.licenseAssignments.map((la: any) => (
                      <div
                        key={la.license.id}
                        className="p-3 rounded-xl bg-purple-50/60 dark:bg-slate-900/80 border border-purple-200 dark:border-purple-900/50 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 mt-0.5">
                            <Key className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 dark:text-white truncate block">
                              {la.license.name}
                            </span>
                            <span className="text-[10.5px] text-slate-500 block truncate mt-0.5">
                              Loại: {la.license.licenseType || 'PERPETUAL'} · Ngày cấp: {new Date(la.assignedAt).toLocaleDateString('vi-VN')}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <a
                            href={`/licenses?id=${la.license.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 text-[10.5px] font-semibold flex items-center gap-1"
                          >
                            <span>Xem license</span>
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              handleRevokeLicense(la.license.id, la.id);
                              setViewingUserDetail((prev: any) => ({
                                ...prev,
                                licenseAssignments: prev.licenseAssignments.filter((x: any) => x.id !== la.id)
                              }));
                            }}
                            className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg border border-rose-200 text-[10.5px] font-bold cursor-pointer"
                          >
                            Thu hồi
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 bg-slate-50/50 dark:bg-slate-950/40">
              <button
                type="button"
                onClick={() => setIsUserDetailModalOpen(false)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold transition-colors cursor-pointer"
              >
                Đóng (Esc)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Gán License Bản Quyền Cho Nhân Viên */}
      {isAssignLicenseModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b">
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-purple-600" />
                  <span>Cấp License Bản Quyền Cho Nhân Sự</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Nhân viên: <strong className="text-slate-800">{selectedUser.fullName}</strong>
                </p>
              </div>
              <button onClick={() => setIsAssignLicenseModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAssignLicense} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Chọn phần mềm / License còn chỗ (Seats):</label>
                <select
                  value={selectedLicenseId}
                  onChange={(e) => setSelectedLicenseId(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-bold text-purple-900 bg-purple-50/40 outline-none"
                >
                  {availableLicenses.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.usedSeats || 0}/{l.totalSeats} seats)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ghi chú cấp phát:</label>
                <textarea
                  rows={2}
                  placeholder="VD: Cấp tài khoản Office 365 E3 theo đề xuất..."
                  value={assignLicenseNotes}
                  onChange={(e) => setAssignLicenseNotes(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsAssignLicenseModalOpen(false)}
                  className="px-4 py-2 border rounded-xl font-semibold text-slate-700"
                >{isEn ? 'Cancel' : 'Hủy'}</button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-md cursor-pointer"
                >
                  Xác Nhận Cấp License
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Quy Trình Nghỉ Việc & Thu Hồi Tài Sản (1-Click Offboard) */}
      {offboardTargetUserId && (
        <UserOffboardModal
          isOpen={Boolean(offboardTargetUserId)}
          userId={offboardTargetUserId}
          onClose={() => setOffboardTargetUserId(null)}
          onSuccess={() => {
            loadData();
          }}
        />
      )}

      {/* Modal: Tiếp Nhận Nhân Sự & Cấp Phát Thiết Bị Mới (1-Click Onboard) */}
      {isOnboardModalOpen && (
        <UserOnboardModal
          isOpen={isOnboardModalOpen}
          onClose={() => setIsOnboardModalOpen(false)}
          availableAssets={availableAssets}
          availableLicenses={availableLicenses}
          companies={companies}
          locations={locations}
          roles={roles}
          onSuccess={() => {
            loadData();
          }}
        />
      )}

      {/* Modal: Báo Cáo Đồng Bộ Thư Mục SSO / LDAP */}
      {syncReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl shrink-0 ${
                  syncReport.success ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  {syncReport.success ? '🔄' : '⚠️'}
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    {isEn ? 'Directory Sync Report (SSO & LDAP)' : 'Kết Quả Đồng Bộ Thư Mục (SSO & LDAP)'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {syncReport.message}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSyncReport(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {syncReport.success && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] text-slate-500 block">{isEn ? 'Scanned' : 'Đã quét'}</span>
                    <span className="text-lg font-bold text-slate-900 dark:text-white">{syncReport.scannedCount || 0}</span>
                  </div>
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-900">
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-300 block">{isEn ? 'New Imported' : 'Nạp mới'}</span>
                    <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">+{syncReport.importedCount || 0}</span>
                  </div>
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900">
                    <span className="text-[11px] text-blue-700 dark:text-blue-300 block">{isEn ? 'Updated' : 'Cập nhật'}</span>
                    <span className="text-lg font-bold text-blue-700 dark:text-blue-400">{syncReport.updatedCount || 0}</span>
                  </div>
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900">
                    <span className="text-[11px] text-rose-600 dark:text-rose-300 block">{isEn ? 'Offboarded' : 'Nghỉ việc'}</span>
                    <span className="text-lg font-bold text-rose-700 dark:text-rose-400">{syncReport.offboardedCount || 0}</span>
                  </div>
                </div>

                {syncReport.importedUsers?.length > 0 && (
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-1.5">
                      <span>📥</span>
                      <span>{isEn ? `Newly Imported Users (${syncReport.importedUsers.length}):` : `Tài khoản vừa nạp mới thành công (${syncReport.importedUsers.length}):`}</span>
                    </h4>
                    <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                      {syncReport.importedUsers.map((u: any, idx: number) => (
                        <div key={idx} className="p-2 rounded-lg bg-emerald-50/70 border border-emerald-200 text-[11px] flex items-center justify-between gap-2">
                          <div className="truncate">
                            <span className="font-bold text-emerald-950">{u.fullName}</span>
                            <span className="text-slate-500 font-mono ml-1.5">({u.email})</span>
                          </div>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full shrink-0">{u.provider}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {syncReport.offboardedUsers?.length > 0 && (
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-slate-700 dark:text-slate-200 text-xs flex items-center gap-1.5">
                      <span>🛑</span>
                      <span>{isEn ? 'Deactivated Accounts List:' : 'Danh sách tài khoản chuyển sang Nghỉ việc:'}</span>
                    </h4>
                    <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                      {syncReport.offboardedUsers.map((u: any) => (
                        <div key={u.id} className="p-2 rounded-lg bg-rose-50/70 border border-rose-200 text-[11px] flex items-center justify-between gap-2">
                          <div className="truncate">
                            <span className="font-bold text-rose-900">{u.fullName}</span>
                            <span className="text-slate-500 font-mono ml-1.5">({u.email})</span>
                          </div>
                          <span className="text-[10px] text-rose-600 italic shrink-0">{u.reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSyncReport(null)}
                className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer hover:bg-slate-800"
              >
                {isEn ? 'Close' : 'Đóng'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
