'use client';

import React from 'react';
import {
  ShieldCheck,
  Layers,
  Plus,
  CheckCircle2,
  Edit2,
  Trash2,
  Save,
  Search,
  X,
  Loader2,
} from 'lucide-react';

const MODULE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  dashboard: { label: 'Tổng quan & Dashboard', icon: '📊', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  kb: { label: 'Hướng Dẫn & Tri Thức IT (KB)', icon: '📖', color: 'bg-amber-50 text-amber-800 border-amber-300' },
  tickets: { label: 'Hỗ trợ IT & Ticket Helpdesk', icon: '🎫', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  approvals: { label: 'Yêu cầu & Cấp phát Thiết bị', icon: '📋', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  assets: { label: 'Quản lý Tài sản & Thiết bị', icon: '💻', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  'assets.maintenance': { label: 'Lịch sử Bảo trì & Sửa chữa', icon: '🔧', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  licenses: { label: 'Bản quyền phần mềm (Licenses)', icon: '🔑', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  services: { label: 'Dịch vụ Viễn thông & CNTT', icon: '🌐', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  spare_parts: { label: 'Kho Phụ tùng Linh kiện', icon: '🔩', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  documents: { label: 'Hóa đơn, Chứng từ & Hợp đồng', icon: '📄', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  incidents: { label: 'Quản lý Sự cố IT (Incidents)', icon: '🚨', color: 'bg-red-50 text-red-700 border-red-200' },
  problems: { label: 'Quản lý Vấn đề & Gốc rễ (Problems)', icon: '🧩', color: 'bg-yellow-50 text-yellow-800 border-yellow-300' },
  passwords: { label: 'Kho Mật khẩu An toàn (Vault)', icon: '🔐', color: 'bg-slate-50 text-slate-800 border-slate-300' },
  categories: { label: 'Danh mục thiết bị', icon: '🏢', color: 'bg-slate-50 text-slate-700 border-slate-200' },
  vendors: { label: 'Nhà cung cấp / Đối tác', icon: '🤝', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  locations: { label: 'Vị trí & Phòng ban', icon: '📍', color: 'bg-lime-50 text-lime-700 border-lime-200' },
  users: { label: 'Người dùng & Phân quyền (RBAC)', icon: '👥', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  ai: { label: 'Trí tuệ nhân tạo AI & Chatbot', icon: '✨', color: 'bg-violet-50 text-violet-700 border-violet-200' },
  reports: { label: 'Báo cáo & Thống kê', icon: '📈', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  settings: { label: 'Cài đặt hệ thống', icon: '⚙️', color: 'bg-zinc-50 text-zinc-700 border-zinc-200' },
  audit: { label: 'Nhật ký hoạt động (Audit)', icon: '🔍', color: 'bg-gray-50 text-gray-700 border-gray-200' },
  projects: { label: 'Gói mua sắm / Dự án', icon: '📁', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  other: { label: 'Phân hệ khác', icon: '📌', color: 'bg-slate-50 text-slate-700 border-slate-200' },
};

const MODULE_CONFIG_EN: Record<string, { label: string; icon: string; color: string }> = {
  portal: { label: 'Self-Service Portal', icon: '🌐', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  dashboard: { label: 'Overview & Dashboard', icon: '📊', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  kb: { label: 'Knowledge Base & IT Guides (KB)', icon: '📖', color: 'bg-amber-50 text-amber-800 border-amber-300' },
  tickets: { label: 'IT Support & Ticket Helpdesk', icon: '🎫', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  approvals: { label: 'Device Requests & Allocations', icon: '📋', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  assets: { label: 'Hardware & Asset Management', icon: '💻', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  'assets.maintenance': { label: 'Maintenance & Repair History', icon: '🔧', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  licenses: { label: 'Software Licenses', icon: '🔑', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  services: { label: 'Telecom & IT Services', icon: '🌐', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  spare_parts: { label: 'Spare Parts Inventory', icon: '🔩', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  documents: { label: 'Invoices, Contracts & Documents', icon: '📄', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  incidents: { label: 'IT Incident Management', icon: '🚨', color: 'bg-red-50 text-red-700 border-red-200' },
  problems: { label: 'Problem & Root Cause Management', icon: '🧩', color: 'bg-yellow-50 text-yellow-800 border-yellow-300' },
  passwords: { label: 'Secure Password Vault', icon: '🔐', color: 'bg-slate-50 text-slate-800 border-slate-300' },
  categories: { label: 'Device Categories', icon: '🏢', color: 'bg-slate-50 text-slate-700 border-slate-200' },
  vendors: { label: 'Vendors & Partners', icon: '🤝', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  locations: { label: 'Locations & Departments', icon: '📍', color: 'bg-lime-50 text-lime-700 border-lime-200' },
  companies: { label: 'Companies & Legal Entities', icon: '🏢', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  users: { label: 'Users & RBAC', icon: '👥', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  ai: { label: 'AI Copilot & Chatbot', icon: '✨', color: 'bg-violet-50 text-violet-700 border-violet-200' },
  reports: { label: 'Reports & Analytics', icon: '📈', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  settings: { label: 'System Settings', icon: '⚙️', color: 'bg-zinc-50 text-zinc-700 border-zinc-200' },
  audit: { label: 'Activity Audit Logs', icon: '🔍', color: 'bg-gray-50 text-gray-700 border-gray-200' },
  projects: { label: 'Procurement & Projects', icon: '📁', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  other: { label: 'Other Modules', icon: '📌', color: 'bg-slate-50 text-slate-700 border-slate-200' },
};

function getLocalizedModule(mod: string, isEn: boolean) {
  if (isEn && MODULE_CONFIG_EN[mod]) {
    return MODULE_CONFIG_EN[mod];
  }
  return MODULE_CONFIG[mod] || (isEn ? MODULE_CONFIG_EN.other : MODULE_CONFIG.other);
}

const ROLE_DESC_EN_MAP: Record<string, string> = {
  'Quản lý tài sản & license': 'Manage IT assets & software licenses',
  'Nhân viên - Xem tài sản/license được gán': 'Staff – View assigned assets & software licenses',
  'Nhân viên – Xem tài sản/license được gán': 'Staff – View assigned assets & software licenses',
  'Quản trị viên Hệ thống - Toàn quyền quản lý và cấu hình': 'System Administrator - Full management and configuration access',
  'Quản trị viên Hệ thống - Toàn quyền cấu hình & quản lý': 'System Administrator - Full configuration and management access',
  'Quản lý IT - Phụ trách toàn bộ tài sản, dịch vụ và phân quyền': 'IT Manager - Oversees all IT assets, services, and permissions',
  'Kỹ thuật viên IT - Tiếp nhận, xử lý ticket và cập nhật vòng đời tài sản': 'IT Support Specialist - Handles tickets, repairs, and asset lifecycles',
  'Nhân viên thường - Xem danh mục tài sản và gửi yêu cầu mượn/trả': 'Standard Employee - View assets and submit device requests',
  'Kiểm toán viên - Quyền chỉ xem báo cáo, lịch sử kiểm kê và audit logs': 'Auditor - Read-only access to audit logs, inventory, and reports',
};

function getLocalizedRoleDesc(name: string, desc: string | null | undefined, isEn: boolean): string {
  if (!desc) return isEn ? 'No description' : 'Chưa có mô tả';
  if (!isEn) return desc;
  if (ROLE_DESC_EN_MAP[desc]) return ROLE_DESC_EN_MAP[desc];
  if (name.toLowerCase().includes('admin') || desc.includes('Toàn quyền')) {
    return 'System Administrator - Full management and configuration access';
  }
  return desc;
}

const PERM_NAME_EN_MAP: Record<string, string> = {
  'portal.view': 'View Employee Self-Service Portal',
  'dashboard.view': 'View Dashboard & Analytics',
  'assets.view': 'View Assets & Devices List',
  'assets.create': 'Add New Asset Profile',
  'assets.update': 'Edit Asset Details & Warranty',
  'assets.delete': 'Delete & Dispose Assets',
  'assets.assign': 'Handover & Return Assets',
  'assets.import': 'Import Assets from Excel',
  'assets.export': 'Export Asset Data to Excel',
  'assets.audit': 'Asset Inventory Audit & QR Scan',
  'assets.maintenance.view': 'View Maintenance & Repair History',
  'assets.maintenance.create': 'Create Maintenance Ticket',
  'assets.maintenance.update': 'Update Repair Progress & Cost',
  'assets.maintenance.delete': 'Delete Maintenance Record',
  'licenses.view': 'View Software Licenses',
  'licenses.create': 'Add Software License Key',
  'licenses.update': 'Edit License & Key Renewal',
  'licenses.delete': 'Delete Software License',
  'licenses.assign': 'Allocate & Revoke Licenses',
  'licenses.import': 'Import Licenses from Excel',
  'licenses.export': 'Export License Data',
  'services.view': 'View IT & Telecom Services',
  'services.create': 'Add IT Service / Circuit / VPS',
  'services.update': 'Edit Service & Billing Cycle',
  'services.delete': 'Delete IT Service',
  'services.renew': 'Execute Service Contract Renewal',
  'services.import': 'Import Services from Excel',
  'services.export': 'Export IT Services Report',
  'tickets.view': 'View IT Support Tickets',
  'tickets.create': 'Create Support Ticket',
  'tickets.update': 'Acknowledge & Process Ticket',
  'tickets.delete': 'Delete Support Ticket',
  'tickets.assign': 'Assign Technician to Ticket',
  'tickets.comment': 'Internal Discussion & Comments',
  'tickets.sla': 'Manage & Extend Ticket SLA',
  'tickets.reports': 'View Ticket Analytics & Reports',
  'approvals.view': 'View Device Allocation Requests',
  'approvals.create': 'Submit Device Request Form',
  'approvals.approve': 'Approve / Reject Device Request',
  'documents.view': 'View Documents & Invoices',
  'documents.create': 'Upload New Document / Invoice',
  'documents.upload': 'Upload New Document / Invoice',
  'documents.update': 'Edit Document Details & Links',
  'documents.delete': 'Delete Document / Invoice',
  'documents.download': 'Download Original Attachment',
  'categories.view': 'View Categories & Specs',
  'categories.create': 'Add New Category',
  'categories.update': 'Edit Category & Custom Fields',
  'categories.delete': 'Delete Category',
  'vendors.view': 'View Vendors & Partners',
  'vendors.create': 'Add New Vendor',
  'vendors.update': 'Edit Vendor Details & Contacts',
  'vendors.delete': 'Delete Vendor',
  'locations.view': 'View Locations & Branches',
  'locations.create': 'Add New Location',
  'locations.update': 'Edit Location & Building Info',
  'locations.delete': 'Delete Location',
  'companies.view': 'View Companies & Branches',
  'companies.create': 'Create Company / Entity',
  'companies.update': 'Update Company Info',
  'companies.delete': 'Delete Company / Entity',
  'users.view': 'View User Accounts Directory',
  'users.create': 'Create New User Account',
  'users.update': 'Edit User & Reset Password',
  'users.delete': 'Deactivate / Delete User Account',
  'users.permissions': 'Configure RBAC & Permissions',
  'settings.view': 'View System Settings',
  'settings.update': 'Modify System Config & Theme',
  'settings.ldap': 'Configure LDAP / Active Directory',
  'settings.backup': 'Backup & Restore Database',
  'reports.view': 'View Analytics & Summary Reports',
  'reports.export': 'Export Reports (Excel/PDF)',
  'audit.view': 'View System Audit Activity Logs',
  'ai.extract': 'AI OCR Label/Invoice Extraction',
  'ai.auto_save': 'AI Auto-Save Data',
  'ai.templates.manage': 'Manage AI Prompts & Templates',
  'ai.history.view': 'View AI Extraction History',
  'ai.context.all': 'AI Full IT Data Retrieval Context',
  'ai.vector.write': 'AI Auto-Save Data Context',
  'ai.copilot.use': 'Use Copilot Virtual Assistant',
  'ai.ticket.diagnose': 'AI Ticket Diagnosis & Suggestions',
  'ai.ocr.scan': 'AI OCR Invoice & Quotation Scan',
  'ai.settings.manage': 'Manage AI & API Keys Settings',
  'ai.chat': 'Use Virtual IT Assistant',
  'ai.all_scope': 'AI Full IT Data Retrieval Context',
  'incidents.view': 'View Incidents & Problems',
  'incidents.create': 'Create New Incident / Problem',
  'incidents.update': 'Update Incident Progress & RCA',
  'incidents.delete': 'Delete Incident / Problem',
  'incidents.manage': 'Coordinate & Resolve Incidents',
  'problems.view': 'View Problem Management (RCA)',
  'problems.manage': 'Manage Problems & Permanent Fixes',
  'kb.view': 'View Knowledge Base & IT Guides',
  'kb.create': 'Create New Knowledge Base Article',
  'kb.update': 'Edit Knowledge Base Article',
  'kb.delete': 'Delete Knowledge Base Article',
};

const PERM_DESC_EN_MAP: Record<string, string> = {
  'portal.view': 'Allows employee access to self-service portal.',
  'dashboard.view': 'View real-time statistics and summary charts.',
  'assets.view': 'Browse asset inventory list and specs.',
  'assets.create': 'Add new hardware devices to inventory.',
  'assets.update': 'Update specs, location, and maintenance notes.',
  'assets.delete': 'Permanently remove device records from system.',
  'assets.assign': 'Perform checkout and checkin operations.',
  'assets.import': 'Batch import hardware devices from Excel.',
  'assets.export': 'Export assets dataset to Excel.',
  'assets.audit': 'Audit physical assets via QR / barcode scanner.',
  'assets.maintenance.view': 'View full history of device repairs.',
  'assets.maintenance.create': 'Log new maintenance and repair ticket.',
  'assets.maintenance.update': 'Update repair costs, status, and parts.',
  'assets.maintenance.delete': 'Remove repair record from system.',
  'licenses.view': 'View software licenses and assigned seats.',
  'licenses.create': 'Add software license profiles.',
  'licenses.update': 'Renew license and update expiration dates.',
  'licenses.delete': 'Remove software license profile.',
  'licenses.assign': 'Allocate license seat to employee.',
  'licenses.import': 'Batch import licenses from Excel file.',
  'licenses.export': 'Export license ledger to Excel file.',
  'services.view': 'View ISP, Cloud, and Telecom service list.',
  'services.create': 'Register new IT service contract.',
  'services.update': 'Update billing cycle and recurring costs.',
  'services.delete': 'Delete IT service contract.',
  'services.renew': 'Record contract renewal date.',
  'services.import': 'Batch import services from Excel.',
  'services.export': 'Export service expense ledger to Excel.',
  'tickets.view': 'View helpdesk support requests list.',
  'tickets.create': 'Create new helpdesk support ticket.',
  'tickets.update': 'Update ticket status, priority, and assignees.',
  'tickets.delete': 'Delete support ticket from helpdesk.',
  'tickets.assign': 'Assign IT technician to ticket.',
  'tickets.comment': 'Internal Discussion & Comments.',
  'tickets.sla': 'Modify or extend committed resolution deadline.',
  'tickets.reports': 'View SLA compliance and CSAT metrics.',
  'approvals.view': 'View employee equipment allocation requests.',
  'approvals.create': 'Submit new equipment request form.',
  'approvals.approve': 'Approve or reject allocation requests.',
  'kb.view': 'Browse and read self-service knowledge base guides.',
  'kb.create': 'Author and publish new knowledge base guides.',
  'kb.update': 'Edit content and attachments of knowledge base guides.',
  'kb.delete': 'Remove knowledge base articles from repository.',
  'kb.internal': 'View confidential internal IT documentation and diagrams.',
  'documents.view': 'View contracts and invoices directory.',
  'documents.create': 'Upload new contract or PDF invoice.',
  'documents.upload': 'Upload new document attachments.',
  'documents.update': 'Edit invoice details and linked items.',
  'documents.delete': 'Remove documents and invoices.',
  'documents.download': 'Download attached PDF files.',
  'categories.view': 'View category classification list.',
  'categories.create': 'Add new device category type.',
  'categories.update': 'Edit category attributes and custom specs.',
  'categories.delete': 'Remove device category.',
  'vendors.view': 'View list of suppliers and warranty partners.',
  'vendors.create': 'Register new partner or supplier.',
  'vendors.update': 'Update vendor contact and representative info.',
  'vendors.delete': 'Delete supplier profile.',
  'locations.view': 'View office buildings and branch departments.',
  'locations.create': 'Register new office branch location.',
  'locations.update': 'Update floor, room, and building location.',
  'locations.delete': 'Remove office location.',
  'users.view': 'View employee accounts and user list.',
  'users.create': 'Create new employee login account.',
  'users.update': 'Update department, title, and password.',
  'users.delete': 'Deactivate accounts upon employee offboarding.',
  'users.permissions': 'Customize granular permissions per role and user.',
  'reports.view': 'View cost, incident rate, and depreciation analytics.',
  'reports.export': 'Export asset analytics reports to Excel.',
  'settings.view': 'View general system configuration parameters.',
  'settings.update': 'Modify Email, Backup, SSO, and Routing settings.',
  'settings.backup': 'Run manual database backup or restore data.',
  'audit.view': 'Inspect operational history of all system users.',
};

function getLocalizedPermissionName(code: string, originalName: string, isEn: boolean): string {
  if (!isEn) return originalName;
  if (PERM_NAME_EN_MAP[code]) return PERM_NAME_EN_MAP[code];
  return originalName;
}

function getLocalizedPermissionDesc(code: string, originalDesc: string | null | undefined, isEn: boolean): string {
  if (!originalDesc) return '';
  if (!isEn) return originalDesc;
  if (PERM_DESC_EN_MAP[code]) return PERM_DESC_EN_MAP[code];
  return originalDesc;
}

interface RbacSettingsTabProps {
  isEn: boolean;
  roles: any[];
  allPermissions: any[];
  selectedRole: any;
  rolePermissions: string[];
  roleSaved: boolean;
  rbacSubTab: 'ROLES' | 'PERMISSIONS';
  setRbacSubTab: (tab: 'ROLES' | 'PERMISSIONS') => void;
  permSearch: string;
  setPermSearch: (val: string) => void;
  permModuleFilter: string;
  setPermModuleFilter: (val: string) => void;
  handleSelectRole: (role: any) => void;
  handleSaveRolePermissions: () => void;
  handleToggleModulePermissions: (perms: any[], checked: boolean) => void;
  handleTogglePermission: (code: string) => void;
  handleDeleteRole: (id: string, name: string) => void;
  handleDeletePermission: (id: string, name: string, code: string) => void;
  handleOpenRoleModal: (role?: any) => void;
  handleOpenPermModal: (perm?: any) => void;
  isRoleModalOpen: boolean;
  setIsRoleModalOpen: (open: boolean) => void;
  roleFormId: string | null;
  roleFormName: string;
  setRoleFormName: (val: string) => void;
  roleFormDesc: string;
  setRoleFormDesc: (val: string) => void;
  handleSaveRole: (e: React.FormEvent) => void;
  isPermModalOpen: boolean;
  setIsPermModalOpen: (open: boolean) => void;
  permFormId: string | null;
  permFormCode: string;
  setPermFormCode: (val: string) => void;
  permFormName: string;
  setPermFormName: (val: string) => void;
  permFormModule: string;
  setPermFormModule: (val: string) => void;
  permFormDesc: string;
  setPermFormDesc: (val: string) => void;
  handleSavePermission: (e: React.FormEvent) => void;
  savingPerm: boolean;
}

export function RbacSettingsTab({
  isEn,
  roles,
  allPermissions,
  selectedRole,
  rolePermissions,
  roleSaved,
  rbacSubTab,
  setRbacSubTab,
  permSearch,
  setPermSearch,
  permModuleFilter,
  setPermModuleFilter,
  handleSelectRole,
  handleSaveRolePermissions,
  handleToggleModulePermissions,
  handleTogglePermission,
  handleDeleteRole,
  handleDeletePermission,
  handleOpenRoleModal,
  handleOpenPermModal,
  isRoleModalOpen,
  setIsRoleModalOpen,
  roleFormId,
  roleFormName,
  setRoleFormName,
  roleFormDesc,
  setRoleFormDesc,
  handleSaveRole,
  isPermModalOpen,
  setIsPermModalOpen,
  permFormId,
  permFormCode,
  setPermFormCode,
  permFormName,
  setPermFormName,
  permFormModule,
  setPermFormModule,
  permFormDesc,
  setPermFormDesc,
  handleSavePermission,
  savingPerm,
}: RbacSettingsTabProps) {
  // Group permissions by module
  const permissionsByModule = allPermissions.reduce((acc: any, p: any) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Sub-tab Navigation */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setRbacSubTab('ROLES')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              rbacSubTab === 'ROLES'
                ? 'bg-white text-blue-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>{isEn ? 'Role-Based Permissions' : 'Phân Quyền Theo Vai Trò'} ({roles.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setRbacSubTab('PERMISSIONS')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              rbacSubTab === 'PERMISSIONS'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            <span>{isEn ? 'System Permissions Directory' : 'Danh Mục Quyền Hạn Hệ Thống'} ({allPermissions.length})</span>
          </button>
        </div>

        {rbacSubTab === 'ROLES' ? (
          <button
            type="button"
            onClick={() => handleOpenRoleModal()}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isEn ? '+ Add New Role' : '+ Thêm Vai Trò Mới'}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => handleOpenPermModal()}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isEn ? '+ Add New Permission' : '+ Thêm Quyền Hạn Mới'}</span>
          </button>
        )}
      </div>

      {/* SUB-TAB 1: ROLES & PERMISSIONS MATRIX */}
      {rbacSubTab === 'ROLES' && (
        <div className="space-y-4">
          {roleSaved && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-xl flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{isEn ? 'Role permissions updated successfully!' : 'Quyền hạn của vai trò đã được lưu thành công!'}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Roles List (Left Col) */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>{isEn ? 'Roles List' : 'Danh sách Vai trò'}</span>
                </h3>
              </div>

              <div className="space-y-2">
                {roles.map((r) => {
                  const isSelected = selectedRole?.id === r.id;
                  return (
                    <div
                      key={r.id}
                      onClick={() => handleSelectRole(r)}
                      className={`p-3 rounded-xl border text-xs transition-all cursor-pointer group flex items-start justify-between gap-2 ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/70 text-blue-900 shadow-2xs'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm leading-tight">{r.name}</span>
                          {r.name === 'Super Admin' ? (
                            <span className="text-[9px] bg-amber-50 text-amber-900 border border-amber-300 px-1.5 py-0.2 rounded font-mono font-semibold flex items-center gap-1">
                              <ShieldCheck className="w-2.5 h-2.5 text-amber-600" /> Root
                            </span>
                          ) : r.isSystem ? (
                            <span className="text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-mono">
                              {isEn ? 'System' : 'Hệ thống'}
                            </span>
                          ) : null}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{getLocalizedRoleDesc(r.name, r.description, isEn) || (isEn ? 'No description' : 'Chưa có mô tả')}</p>
                        <span className="text-[10px] text-blue-600 font-semibold mt-1 inline-block">
                          🔑 {r.permissionCodes?.length || 0} {isEn ? 'permissions assigned' : 'quyền được gán'}
                        </span>
                      </div>

                      <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 shrink-0" onClick={(e) => e.stopPropagation()}>
                        {r.name !== 'Super Admin' && (
                          <button
                            type="button"
                            onClick={() => handleOpenRoleModal(r)}
                            className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-white cursor-pointer"
                            title={isEn ? 'Edit role' : 'Sửa tên vai trò'}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {!r.isSystem && (
                          <button
                            type="button"
                            onClick={() => handleDeleteRole(r.id, r.name)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-white cursor-pointer"
                            title={isEn ? 'Delete role' : 'Xóa vai trò'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Permission Matrix (Right 2 Cols) */}
            <div className="md:col-span-2 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {isEn ? 'Permissions for role: ' : 'Phân quyền cho vai trò: '}<span className="text-blue-600 font-mono text-base">{selectedRole?.name}</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">{isEn ? 'Check the permissions allowed for this role' : 'Tích chọn các quyền mà vai trò này được phép thực hiện'}</p>
                </div>
                <button
                  type="button"
                  onClick={handleSaveRolePermissions}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-2xs transition-colors cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Save Permissions' : 'Lưu Phân Quyền'}</span>
                </button>
              </div>

              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                {Object.entries(permissionsByModule).map(([moduleName, perms]: any) => {
                  const cfg = getLocalizedModule(moduleName, isEn);

                  return (
                    <div key={moduleName} className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                      <div className="flex items-center justify-between pb-1 border-b border-slate-200/60">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{cfg.icon}</span>
                          <div>
                            <span className="text-xs font-bold text-slate-900">{cfg.label}</span>
                            <span className="text-[10px] text-slate-400 font-mono ml-2">({moduleName})</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-[10px]">
                          <button
                            type="button"
                            onClick={() => handleToggleModulePermissions(perms, true)}
                            className="text-blue-600 hover:underline font-semibold cursor-pointer"
                          >
                            {isEn ? 'Select All' : 'Chọn tất cả'}
                          </button>
                          <span className="text-slate-300">|</span>
                          <button
                            type="button"
                            onClick={() => handleToggleModulePermissions(perms, false)}
                            className="text-rose-600 hover:underline font-semibold cursor-pointer"
                          >
                            {isEn ? 'Deselect All' : 'Bỏ chọn'}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {perms.map((p: any) => {
                          const isChecked = rolePermissions.includes(p.code);
                          return (
                            <label
                              key={p.code}
                              className={`flex items-start gap-2 p-2 rounded-lg transition-colors cursor-pointer select-none border ${
                                isChecked
                                  ? 'bg-blue-50/80 border-blue-200 text-blue-950 font-medium'
                                  : 'bg-white hover:bg-slate-100 border-slate-200/80 text-slate-700'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleTogglePermission(p.code)}
                                className="rounded text-blue-600 focus:ring-0 w-3.5 h-3.5 mt-0.5 cursor-pointer"
                              />
                              <div className="text-xs min-w-0">
                                <span className="font-semibold block truncate leading-tight">{getLocalizedPermissionName(p.code, p.name, isEn)}</span>
                                <span className="text-[10px] text-slate-400 font-mono block truncate">{p.code}</span>
                                {p.description && (
                                  <span className="text-[10px] text-slate-500 block line-clamp-1 mt-0.5">
                                    {isEn && PERM_DESC_EN_MAP[p.code] ? PERM_DESC_EN_MAP[p.code] : p.description}
                                  </span>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: GRANULAR PERMISSIONS DIRECTORY & CUSTOM PERMISSION BUILDER */}
      {rbacSubTab === 'PERMISSIONS' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          {/* Toolbar Search & Module Filter */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder={isEn ? 'Search by permission name, code, description...' : 'Tìm theo tên quyền, mã quyền (code), mô tả...'}
                  value={permSearch}
                  onChange={(e) => setPermSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <select
                value={permModuleFilter}
                onChange={(e) => setPermModuleFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                <option value="ALL">📁 {isEn ? 'All Modules' : 'Tất cả phân hệ'} ({allPermissions.length})</option>
                {Array.from(new Set(allPermissions.map((p) => p.module))).map((mod) => (
                  <option key={mod} value={mod}>
                    {getLocalizedModule(mod, isEn)?.icon || '📁'} {getLocalizedModule(mod, isEn)?.label || mod} ({mod})
                  </option>
                ))}
              </select>
            </div>

            <div className="text-xs text-slate-500">
              {isEn ? 'Showing ' : 'Hiển thị '}<strong>{
                allPermissions.filter((p) => {
                  const matchSearch = !permSearch || p.name.toLowerCase().includes(permSearch.toLowerCase()) || p.code.toLowerCase().includes(permSearch.toLowerCase()) || (p.description && p.description.toLowerCase().includes(permSearch.toLowerCase()));
                  const matchModule = permModuleFilter === 'ALL' || p.module === permModuleFilter;
                  return matchSearch && matchModule;
                }).length
              }</strong> / {allPermissions.length} {isEn ? 'permissions' : 'quyền hạn'}
            </div>
          </div>

          {/* Permissions Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 w-[22%]">{isEn ? 'Module' : 'Phân Hệ / Module'}</th>
                  <th className="py-2.5 px-3 w-[24%]">{isEn ? 'Permission Code' : 'Mã Quyền (Code)'}</th>
                  <th className="py-2.5 px-3 w-[24%]">{isEn ? 'Permission Name' : 'Tên Quyền Hạn'}</th>
                  <th className="py-2.5 px-3 w-[20%]">{isEn ? 'Description' : 'Mô Tả Chức Năng'}</th>
                  <th className="py-2.5 px-3 w-[10%] text-right">{isEn ? 'Actions' : 'Thao Tác'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allPermissions
                  .filter((p) => {
                    const matchSearch = !permSearch || p.name.toLowerCase().includes(permSearch.toLowerCase()) || p.code.toLowerCase().includes(permSearch.toLowerCase()) || (p.description && p.description.toLowerCase().includes(permSearch.toLowerCase()));
                    const matchModule = permModuleFilter === 'ALL' || p.module === permModuleFilter;
                    return matchSearch && matchModule;
                  })
                  .map((p) => {
                    const cfg = getLocalizedModule(p.module, isEn);
                    return (
                      <tr key={p.id || p.code} className="hover:bg-slate-50/80 transition-colors">
                        {/* Module */}
                        <td className="py-2 px-3">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-bold border ${cfg.color}`}>
                            <span>{cfg.icon}</span>
                            <span>{cfg.label}</span>
                          </span>
                        </td>

                        {/* Code */}
                        <td className="py-2 px-3">
                          <code className="px-2 py-0.5 rounded bg-slate-100 text-indigo-700 font-mono font-bold text-[11px] border border-slate-200">
                            {p.code}
                          </code>
                        </td>

                        {/* Name */}
                        <td className="py-2 px-3">
                          <span className="font-bold text-slate-900">{getLocalizedPermissionName(p.code, p.name, isEn)}</span>
                        </td>

                        {/* Description */}
                        <td className="py-2 px-3 text-slate-500 text-[11px]">
                          {getLocalizedPermissionDesc(p.code, p.description, isEn) || '-'}
                        </td>

                        {/* Actions */}
                        <td className="py-2 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenPermModal(p)}
                              title="Chỉnh sửa quyền"
                              className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded cursor-pointer transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePermission(p.id, p.name, p.code)}
                              title="Xóa quyền này"
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer transition-colors"
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
      )}

      {/* MODAL: ADD / EDIT ROLE */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>{roleFormId ? 'Chỉnh Sửa Vai Trò' : 'Tạo Vai Trò Mới'}</span>
              </h3>
              <button onClick={() => setIsRoleModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRole} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tên vai trò (*)</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Kỹ sư Phần mềm, Trưởng phòng Kế toán..."
                  value={roleFormName}
                  onChange={(e) => setRoleFormName(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mô tả nhiệm vụ / phạm vi</label>
                <textarea
                  rows={3}
                  placeholder="Mô tả ngắn về quyền hạn và trách nhiệm..."
                  value={roleFormDesc}
                  onChange={(e) => setRoleFormDesc(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRoleModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs cursor-pointer"
                >
                  Lưu Vai Trò
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT PERMISSION */}
      {isPermModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-5 space-y-4 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>{permFormId ? 'Chỉnh Sửa Quyền Hạn' : 'Tạo Quyền Hạn Mới Trong Hệ Thống'}</span>
              </h3>
              <button onClick={() => setIsPermModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePermission} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Mã Quyền (Code) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: documents.approve, tickets.export, assets.audit..."
                  value={permFormCode}
                  onChange={(e) => setPermFormCode(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-indigo-900"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">Quy chuẩn: <code>module.action</code> (VD: <code>documents.delete</code>)</p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tên Quyền Hạn (Tiếng Việt) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Phê duyệt chứng từ thanh toán..."
                  value={permFormName}
                  onChange={(e) => setPermFormName(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Phân Hệ / Module <span className="text-rose-500">*</span>
                </label>
                <select
                  value={permFormModule}
                  onChange={(e) => setPermFormModule(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-semibold text-slate-800"
                >
                  {Object.entries(MODULE_CONFIG).map(([key, cfg]) => (
                    <option key={key} value={key}>
                      {cfg.icon} {cfg.label} ({key})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mô tả chức năng</label>
                <textarea
                  rows={2}
                  placeholder="Mô tả chi tiết quyền hạn này cho phép làm gì..."
                  value={permFormDesc}
                  onChange={(e) => setPermFormDesc(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPermModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={savingPerm}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-bold shadow-xs cursor-pointer flex items-center gap-1"
                >
                  {savingPerm && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Lưu Quyền Hạn</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
