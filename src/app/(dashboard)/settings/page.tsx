'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Settings,
  Mail,
  Database,
  Save,
  CheckCircle2,
  Sliders,
  Bell,
  Sparkles,
  Building,
  Image as ImageIcon,
  ShieldCheck,
  Plus,
  Lock,
  CheckSquare,
  Square,
  Palette,
  QrCode,
  Key,
  Copy,
  ExternalLink,
  Info,
  Upload,
  Download,
  Trash2,
  Laptop,
  Zap,
  Globe,
  Shield,
  Loader2,
  Edit,
  Edit2,
  Check,
  AlertCircle,
  FilePlus,
  Filter,
  Search,
  Layers,
  X,
  RotateCcw,
  FolderOpen,
  Cpu,
  Clock,
  Pin,
  PinOff,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { SupportOrgSettingsTab } from '@/components/settings/support-org-tab';
import { CurrencySettingsCard } from '@/components/settings/currency-settings';
import { AuditLogsSettingsTab } from '@/components/settings/audit-logs-tab';
import { AlertSettingsTab } from '@/components/settings/alert-settings-tab';
import { EmailSettingsTab } from '@/components/settings/email-settings-tab';
import { MaintenanceSchedulesTab } from '@/components/settings/maintenance-schedules-tab';
import { WebhookSettingsTab } from '@/components/settings/webhook-settings-tab';
import { AICopilotSettingsTab } from '@/components/settings/ai-settings-tab';
import { EnterpriseFeatureLock } from '@/components/common/EnterpriseFeatureLock';
import { useLanguage } from '@/lib/i18n/context';

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

interface NavItem {
  id: 'GENERAL' | 'ALERTS' | 'EMAIL' | 'MAINTENANCE' | 'WEBHOOKS' | 'AI_COPILOT' | 'CURRENCY' | 'ROUTING' | 'RBAC' | 'SSO' | 'LDAP' | 'AUDIT';
  label: string;
  icon: string;
  desc: string;
  badge?: string;
  color?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const SETTINGS_NAV_GROUPS: NavGroup[] = [
  {
    title: 'Hệ Thống & Giao Diện',
    items: [
      { id: 'GENERAL', label: 'Cài đặt Chung & Logo', icon: '⚙️', desc: 'Tên hệ thống, logo, favicon, màu sắc giao diện' },
      { id: 'CURRENCY', label: 'Tiền Tệ & Đồng Tiền Gốc', icon: '💰', desc: 'Cấu hình VND, USD, EUR và tỷ giá hối đoái' },
    ],
  },
  {
    title: 'Bảo Mật & Phân Quyền',
    items: [
      { id: 'RBAC', label: 'Phân Quyền Vai Trò (RBAC)', icon: '🔐', desc: 'Ma trận quyền hạn chi tiết Admin, IT, Staff' },
      { id: 'SSO', label: 'Đăng Nhập SSO Microsoft 365', icon: '🔑', desc: 'Đăng nhập 1 chạm qua Microsoft Azure AD' },
      { id: 'LDAP', label: 'Xác Thực LDAP / Active Directory', icon: '🏢', desc: 'Đồng bộ tài khoản máy chủ Windows Server' },
    ],
  },
  {
    title: 'Tích Hợp & Thông Báo',
    items: [
      { id: 'ALERTS', label: 'Cảnh Báo Tự Động (Telegram/Email)', icon: '🚨', desc: 'Quét hạn Dịch vụ IT, License, Bảo hành và bắn tin' },
      { id: 'EMAIL', label: 'Cấu Hình Email & SMTP', icon: '📧', desc: 'Máy chủ gửi mail & 7 mẫu email có link CTA' },
      { id: 'WEBHOOKS', label: 'Webhook Đa Kênh (Teams/Zalo)', icon: '🔔', desc: 'Bắn thông báo tức thời qua Zalo, Teams, Slack' },
    ],
  },
  {
    title: 'Quy Trình & Vận Hành IT',
    items: [
      { id: 'ROUTING', label: 'Tổ Chức IT, Phân Tuyến & SLA', icon: '🎯', desc: 'Đội ngũ hỗ trợ, hàng đợi và hạn cam kết SLA' },
      { id: 'MAINTENANCE', label: 'Lịch Bảo Trì Định Kỳ', icon: '📅', desc: 'Lên lịch tự động kiểm tra bảo dưỡng thiết bị' },
      { id: 'AI_COPILOT', label: 'Trí Tuệ Nhân Tạo (AI)', icon: '🤖', desc: 'Cấu hình Gemini API, Trợ lý AI và OCR hóa đơn' },
    ],
  },
  {
    title: 'Nhật Ký & Tuân Thủ',
    items: [
      { id: 'AUDIT', label: 'Nhật Ký Hoạt Động (Audit Logs)', icon: '📜', desc: 'Ghi vết toàn bộ hành động người dùng' },
    ],
  },
];


const MODULE_CONFIG_EN: Record<string, { label: string; icon: string; color: string }> = {
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

function getSettingsNavGroups(isEn: boolean): NavGroup[] {
  return [
    {
      title: isEn ? 'System & Interface' : 'Hệ Thống & Giao Diện',
      items: [
        { id: 'GENERAL', label: isEn ? 'General Settings & Logo' : 'Cài đặt Chung & Logo', icon: '⚙️', desc: isEn ? 'System name, logo, favicon, interface appearance' : 'Tên hệ thống, logo, favicon, màu sắc giao diện' },
        { id: 'CURRENCY', label: isEn ? 'Currency & Base Denomination' : 'Tiền Tệ & Đồng Tiền Gốc', icon: '💰', desc: isEn ? 'Configure VND, USD, EUR and exchange rates' : 'Cấu hình VND, USD, EUR và tỷ giá hối đoái' },
      ],
    },
    {
      title: isEn ? 'Security & Access Control' : 'Bảo Mật & Phân Quyền',
      items: [
        { id: 'RBAC', label: isEn ? 'Role-Based Access Control (RBAC)' : 'Phân Quyền Vai Trò (RBAC)', icon: '🔐', desc: isEn ? 'Detailed permission matrix for Admin, IT, Staff' : 'Ma trận quyền hạn chi tiết Admin, IT, Staff' },
        { id: 'SSO', label: isEn ? 'Microsoft 365 Single Sign-On' : 'Đăng Nhập SSO Microsoft 365', icon: '🔑', badge: 'ENTERPRISE', desc: isEn ? '1-click login via Microsoft Azure AD / Entra ID' : 'Đăng nhập 1 chạm qua Microsoft Azure AD' },
        { id: 'LDAP', label: isEn ? 'LDAP / Active Directory' : 'Xác Thực LDAP / Active Directory', icon: '🏢', badge: 'ENTERPRISE', desc: isEn ? 'Synchronize Windows Server Active Directory accounts' : 'Đồng bộ tài khoản máy chủ Windows Server' },
      ],
    },
    {
      title: isEn ? 'Integrations & Notifications' : 'Tích Hợp & Thông Báo',
      items: [
        { id: 'ALERTS', label: isEn ? 'Automated Alerts (Telegram/Email)' : 'Cảnh Báo Tự Động (Telegram/Email)', icon: '🚨', desc: isEn ? 'Scan expiry dates for IT services, licenses, warranties' : 'Quét hạn Dịch vụ IT, License, Bảo hành và bắn tin' },
        { id: 'EMAIL', label: isEn ? 'Email & SMTP Configuration' : 'Cấu Hình Email & SMTP', icon: '📧', desc: isEn ? 'Mail servers & 7 automated notification email templates' : 'Máy chủ gửi mail & 7 mẫu email có link CTA' },
        { id: 'WEBHOOKS', label: isEn ? 'Multi-Channel Webhooks' : 'Webhook Đa Kênh (Teams/Zalo)', icon: '🔔', badge: 'ENTERPRISE', desc: isEn ? 'Instant alerts to Teams, Zalo, Slack webhooks' : 'Bắn thông báo tức thời qua Zalo, Teams, Slack' },
      ],
    },
    {
      title: isEn ? 'ITSM Workflows & Operations' : 'Quy Trình & Vận Hành IT',
      items: [
        { id: 'ROUTING', label: isEn ? 'IT Support Org, Routing & SLA' : 'Tổ Chức IT, Phân Tuyến & SLA', icon: '🎯', badge: 'ENTERPRISE', desc: isEn ? 'Support teams, queues, and committed SLA policies' : 'Đội ngũ hỗ trợ, hàng đợi và hạn cam kết SLA' },
        { id: 'MAINTENANCE', label: isEn ? 'Periodic Maintenance Schedules' : 'Lịch Bảo Trì Định Kỳ', icon: '📅', desc: isEn ? 'Automated maintenance schedules for enterprise assets' : 'Lên lịch tự động kiểm tra bảo dưỡng thiết bị' },
        { id: 'AI_COPILOT', label: isEn ? 'Artificial Intelligence (AI)' : 'Trí Tuệ Nhân Tạo (AI)', icon: '🤖', desc: isEn ? 'Configure Gemini AI models, Copilot assistant, and OCR' : 'Cấu hình Gemini API, Trợ lý AI và OCR hóa đơn' },
      ],
    },
    {
      title: isEn ? 'Audit & Compliance' : 'Nhật Ký & Tuân Thủ',
      items: [
        { id: 'AUDIT', label: isEn ? 'Activity Logs (Audit Logs)' : 'Nhật Ký Hoạt Động (Audit Logs)', icon: '📜', desc: isEn ? 'Trace all user activities and audit trials' : 'Ghi vết toàn bộ hành động người dùng' },
      ],
    },
  ];
}

const ROLE_DESC_EN_MAP: Record<string, string> = {
  'Quản trị viên Hệ thống - Toàn quyền quản lý và cấu hình': 'System Administrator - Full management and configuration access',
  'Quản trị viên Hệ thống - Toàn quyền cấu hình & quản lý': 'System Administrator - Full configuration and management access',
  'Quản lý IT - Phụ trách toàn bộ tài sản, dịch vụ và phân quyền': 'IT Manager - Oversees all IT assets, services, and permissions',
  'Kỹ thuật viên IT - Tiếp nhận, xử lý ticket và cập nhật vòng đời tài sản': 'IT Support Specialist - Handles tickets, repairs, and asset lifecycles',
  'Nhân viên thường - Xem danh mục tài sản và gửi yêu cầu mượn/trả': 'Standard Employee - View assets and submit device requests',
  'Kiểm toán viên - Quyền chỉ xem báo cáo, lịch sử kiểm kê và audit logs': 'Auditor - Read-only access to audit logs, inventory, and reports',
};

const ROLE_NAME_EN_MAP: Record<string, string> = {
  'Quản trị viên': 'Administrator',
  'Quản trị viên Hệ thống': 'System Administrator',
  'Quản lý IT': 'IT Manager',
  'Kỹ thuật viên IT': 'IT Support Technician',
  'Nhân viên': 'Employee / Staff',
  'Kiểm toán viên': 'Auditor',
};

function getLocalizedRoleName(name: string, isEn: boolean): string {
  if (!name || !isEn) return name;
  return ROLE_NAME_EN_MAP[name] || name;
}

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
  // AI
  'ai.context.all': 'AI Full IT Data Retrieval Context',
  'ai.vector.write': 'AI Auto-Save Data Context',
  'ai.copilot.use': 'Use Copilot Virtual Assistant',
  'ai.ticket.diagnose': 'AI Ticket Diagnosis & Suggestions',
  'ai.ocr.scan': 'AI OCR Invoice & Quotation Scan',
  'ai.settings.manage': 'Manage AI & API Keys Settings',
  'ai.chat': 'Use Virtual IT Assistant',
  'ai.extract': 'AI OCR Label/Invoice Extraction',
  'ai.auto_save': 'AI Auto-Save Data',
  'ai.templates.manage': 'Manage AI Prompts & Templates',
  'ai.all_scope': 'AI Full IT Data Retrieval Context',

  // Tickets
  'tickets.view': 'View Ticket List',
  'tickets.create': 'Create Support Ticket',
  'tickets.update': 'Update & Process Ticket',
  'tickets.assign': 'Assign IT Technician',
  'tickets.delete': 'Delete Ticket',
  'tickets.sla': 'Manage & Extend Ticket SLA',

  // Approvals
  'approvals.view': 'View Device Allocation Requests',
  'approvals.create': 'Submit Device Request Form',
  'approvals.approve': 'Approve / Reject Device Request',

  // Assets
  'assets.view': 'View Assets & Devices List',
  'assets.create': 'Add New Asset Profile',
  'assets.update': 'Edit Asset Details & Warranty',
  'assets.delete': 'Delete & Dispose Assets',
  'assets.assign': 'Handover & Return Assets',
  'assets.import': 'Import Assets from Excel',
  'assets.export': 'Export Asset Data to Excel',
  'assets.audit': 'Asset Inventory Audit & QR Scan',

  // Maintenance
  'assets.maintenance.view': 'View Maintenance Logs',
  'assets.maintenance.create': 'Create Maintenance Ticket',
  'assets.maintenance.update': 'Edit Maintenance Record',
  'assets.maintenance.delete': 'Delete Maintenance Record',

  // Licenses
  'licenses.view': 'View Software Licenses',
  'licenses.create': 'Add Software License Key',
  'licenses.update': 'Edit License & Renewal Info',
  'licenses.delete': 'Delete Software License',
  'licenses.assign': 'Allocate License Seats to Users',
  'licenses.import': 'Import Licenses from Excel',
  'licenses.export': 'Export Licenses to Excel',

  // Services
  'services.view': 'View IT & Telecom Services',
  'services.create': 'Add New Telecom Service Contract',
  'services.update': 'Update Service & Renewal Cost',
  'services.delete': 'Delete Service Contract',

  // Spare parts
  'spare_parts.view': 'View Spare Parts Inventory',
  'spare_parts.manage': 'Manage Stock In/Out Transfers',

  // Documents
  'documents.view': 'View Documents & Contracts',
  'documents.upload': 'Upload Document / Invoices',
  'documents.delete': 'Delete Documents from Vault',

  // Incidents & Problems
  'incidents.view': 'View IT Incidents (P1/P2)',
  'incidents.manage': 'Coordinate & Resolve Incidents',
  'problems.view': 'View Problem Management (RCA)',
  'problems.manage': 'Manage Problems & Permanent Fixes',

  // Passwords
  'passwords.view': 'View Password Vault (Authorized)',
  'passwords.manage': 'Manage & Share Password Vault',

  // Master Data
  'categories.view': 'View Device Categories',
  'categories.create': 'Create Device Category',
  'categories.update': 'Edit Device Category',
  'categories.delete': 'Delete Device Category',
  'vendors.view': 'View Vendors & Partners',
  'vendors.create': 'Add New Vendor / Partner',
  'vendors.update': 'Edit Vendor Contact Details',
  'vendors.delete': 'Delete Vendor / Partner',
  'locations.view': 'View Locations & Departments',
  'locations.create': 'Add Office / Branch Location',
  'locations.update': 'Edit Office Location & Floors',
  'locations.delete': 'Delete Office Location',

  // Users & RBAC
  'users.view': 'View Employee Directory',
  'users.create': 'Create New User Account',
  'users.update': 'Edit User Account & Roles',
  'users.delete': 'Deactivate / Remove User Account',
  'users.permissions': 'Granular RBAC Permissions',

  // Reports & Settings & Audit
  'reports.view': 'View Summary Analytics Reports',
  'reports.export': 'Export Reports to Excel',
  'settings.view': 'View System Settings',
  'settings.update': 'Modify System Configurations',
  'settings.backup': 'Backup & Restore Database',
  'audit.view': 'View Audit Activity Logs',
};

const PERM_DESC_EN_MAP: Record<string, string> = {
  // AI
  'ai.context.all': 'Allow Gemini AI assistant to query all hardware, software, contracts, and network data.',
  'ai.vector.write': 'Allow AI to automatically store new knowledge into Vector Memory after interactions.',
  'ai.copilot.use': 'Permission to chat and prompt AI assistant for daily ITSM operational tasks.',
  'ai.ticket.diagnose': 'Allow AI to analyze incident descriptions and automatically recommend solutions.',
  'ai.ocr.scan': 'Use vision models to automatically extract metadata from uploaded invoice images.',
  'ai.settings.manage': 'Full permission to configure AI models, temperature, and manage Gemini API keys.',
  'ai.chat': 'Chat and troubleshoot incidents with AI assistant.',
  'ai.extract': 'Automatically extract serial and invoice details using vision AI.',
  'ai.auto_save': 'Allow AI to auto-save asset records when confidence is high.',
  'ai.templates.manage': 'Configure AI templates, system prompts, and permissions.',
  'ai.all_scope': 'Allow AI to access internal server and network configs.',

  // Tickets
  'tickets.view': 'View technical support tickets list.',
  'tickets.create': 'Submit hardware, network, and software support requests.',
  'tickets.update': 'Acknowledge, process, and change ticket status.',
  'tickets.assign': 'Assign IT technicians to tickets.',
  'tickets.delete': 'Delete tickets from the system.',
  'tickets.sla': 'Request extension or adjust committed SLA deadlines.',

  // Approvals
  'approvals.view': 'View device requests and hardware upgrade forms.',
  'approvals.create': 'Submit device allocation or replacement requests.',
  'approvals.approve': 'Approve or reject device allocation requests.',

  // Assets
  'assets.view': 'View hardware inventory and device profiles.',
  'assets.create': 'Add new hardware asset profiles into the system.',
  'assets.update': 'Update technical specifications and warranty info.',
  'assets.delete': 'Delete device profiles or mark as disposed.',
  'assets.assign': 'Allocate devices to employees or return to inventory.',
  'assets.import': 'Batch import hardware assets from Excel/CSV.',
  'assets.export': 'Export asset inventory list to Excel.',
  'assets.audit': 'Execute periodic asset inventory audit via QR/Barcode.',

  // Maintenance
  'assets.maintenance.view': 'View repair, servicing, and maintenance history.',
  'assets.maintenance.create': 'Record repairs and spare part replacements.',
  'assets.maintenance.update': 'Update servicing costs and maintenance vendor.',
  'assets.maintenance.delete': 'Delete maintenance records.',

  // Licenses
  'licenses.view': 'View software licenses list.',
  'licenses.create': 'Add new software license key and contract.',
  'licenses.update': 'Renew or adjust total license seat count.',
  'licenses.delete': 'Remove software license records.',
  'licenses.assign': 'Assign license seats to specific employees.',
  'licenses.import': 'Batch import software licenses from Excel.',
  'licenses.export': 'Export license records to Excel.',

  // Services
  'services.view': 'View internet leased lines, telephony, and cloud services.',
  'services.create': 'Add new telecom service contracts.',
  'services.update': 'Update monthly costs and renewal dates.',
  'services.delete': 'Delete telecom service contracts.',

  // Spare parts
  'spare_parts.view': 'View RAM, SSD, and backup accessory stock levels.',
  'spare_parts.manage': 'Create stock in/out slips for replacement parts.',

  // Documents
  'documents.view': 'View scanned invoices and handover acceptance forms.',
  'documents.upload': 'Upload PDF contracts and delivery receipts.',
  'documents.delete': 'Delete documents from secure storage.',

  // Incidents & Problems
  'incidents.view': 'View wide-scale P1/P2 operational service incidents.',
  'incidents.manage': 'Broadcast and close service disruption incidents.',
  'problems.view': 'View root cause analysis (RCA) investigations.',
  'problems.manage': 'Create and implement permanent fixes for recurring issues.',

  // Passwords
  'passwords.view': 'View shared service and server passwords.',
  'passwords.manage': 'Add, edit, and share server/service vault passwords.',

  // Master Data
  'categories.view': 'View asset category taxonomy.',
  'categories.create': 'Create new asset category group.',
  'categories.update': 'Modify category name and icon.',
  'categories.delete': 'Delete asset category group.',
  'vendors.view': 'View hardware and service vendor directory.',
  'vendors.create': 'Register new partner or supplier.',
  'vendors.update': 'Update vendor contact and representative info.',
  'vendors.delete': 'Delete supplier profile.',
  'locations.view': 'View office buildings and branch departments.',
  'locations.create': 'Register new office branch location.',
  'locations.update': 'Update floor, room, and building location.',
  'locations.delete': 'Remove office location.',

  // Users & RBAC
  'users.view': 'View employee accounts and user list.',
  'users.create': 'Create new employee login account.',
  'users.update': 'Update department, title, and password.',
  'users.delete': 'Deactivate accounts upon employee offboarding.',
  'users.permissions': 'Customize granular permissions per role and user.',

  // Reports, Settings, Audit
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

export default function SettingsPage() {
  const { language, setLanguage, t } = useLanguage();
  const isEn = language === 'en';
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'ALERTS' | 'EMAIL' | 'MAINTENANCE' | 'WEBHOOKS' | 'AI_COPILOT' | 'CURRENCY' | 'ROUTING' | 'RBAC' | 'SSO' | 'LDAP' | 'AUDIT'>('GENERAL');
  const [searchFilter, setSearchFilter] = useState('');
  const [isPinned, setIsPinned] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [settings, setSettings] = useState<any[]>([]);

  // Load pinned state & URL tab from localStorage / searchParams on mount
  useEffect(() => {
    try {
      const savedPin = localStorage.getItem('settings_sidebar_pinned');
      if (savedPin !== null) {
        setIsPinned(savedPin === 'true');
      }
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab')?.toLowerCase();
      if (tabParam) {
        if (tabParam === 'ai' || tabParam === 'ai_copilot' || tabParam === 'copilot') {
          setActiveTab('AI_COPILOT');
        } else if (tabParam === 'alerts' || tabParam === 'alert' || tabParam === 'telegram') {
          setActiveTab('ALERTS');
        } else if (tabParam === 'email' || tabParam === 'smtp') {
          setActiveTab('EMAIL');
        } else if (tabParam === 'maintenance' || tabParam === 'schedule') {
          setActiveTab('MAINTENANCE');
        } else if (tabParam === 'webhooks' || tabParam === 'webhook') {
          setActiveTab('WEBHOOKS');
        } else if (tabParam === 'currency' || tabParam === 'currencies') {
          setActiveTab('CURRENCY');
        } else if (tabParam === 'routing' || tabParam === 'sla') {
          setActiveTab('ROUTING');
        } else if (tabParam === 'rbac' || tabParam === 'roles') {
          setActiveTab('RBAC');
        } else if (tabParam === 'sso' || tabParam === 'azure') {
          setActiveTab('SSO');
        } else if (tabParam === 'ldap' || tabParam === 'ad') {
          setActiveTab('LDAP');
        } else if (tabParam === 'audit' || tabParam === 'logs') {
          setActiveTab('AUDIT');
        } else if (tabParam === 'general') {
          setActiveTab('GENERAL');
        }
      }
    } catch {
      // Ignore localStorage error
    }
  }, []);

  const handleTogglePin = () => {
    const nextState = !isPinned;
    setIsPinned(nextState);
    try {
      localStorage.setItem('settings_sidebar_pinned', String(nextState));
    } catch {
      // Ignore localStorage error
    }
  };

  const handleMouseEnter = () => {
    if (!isPinned) {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isPinned) {
      hoverTimeoutRef.current = setTimeout(() => {
        setIsHovered(false);
      }, 150);
    }
  };

  const isExpanded = isPinned || isHovered;

  const toggleGroup = (groupTitle: string) => {
    setCollapsedGroups((prev) =>
      prev.includes(groupTitle)
        ? prev.filter((t) => t !== groupTitle)
        : [...prev, groupTitle]
    );
  };
  const [roles, setRoles] = useState<any[]>([]);
  const [allPermissions, setAllPermissions] = useState<any[]>([]);
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [roleSaved, setRoleSaved] = useState(false);
  const [testingLdap, setTestingLdap] = useState(false);
  const [ldapTestResult, setLdapTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedUri, setCopiedUri] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [sampleDataStats, setSampleDataStats] = useState<any>(null);
  const [loadingSampleData, setLoadingSampleData] = useState(false);
  const [sampleToast, setSampleToast] = useState<string | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [autoBackupConfig, setAutoBackupConfig] = useState({
    autoEnabled: true,
    frequency: 'DAILY',
    time: '02:00',
    directory: 'C:\\IT_Backups',
    syncUploads: true,
    retentionDays: 30,
    lastRun: null,
  });
  const [backupFileList, setBackupFileList] = useState<any[]>([]);
  const [testingPath, setTestingPath] = useState(false);
  const [pathTestResult, setPathTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [savingBackupConfig, setSavingBackupConfig] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [zipBackupStatus, setZipBackupStatus] = useState<{
    uploadsSizeFormatted: string;
    uploadsCount: number;
    lastBackupAt: string | null;
  } | null>(null);

  const loadZipBackupStatus = async () => {
    try {
      const res = await fetch('/api/system/backup/status');
      const data = await res.json();
      if (data.success && data.status) {
        setZipBackupStatus(data.status);
      }
    } catch {}
  };

  const handleDownloadZipBackup = async () => {
    setIsDownloadingZip(true);
    try {
      const link = document.createElement('a');
      link.href = '/api/system/backup/download';
      link.setAttribute('download', '');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => {
        loadZipBackupStatus();
        setIsDownloadingZip(false);
      }, 5000);
    } catch (err) {
      console.error(err);
      setIsDownloadingZip(false);
      alert('Không thể tải gói sao lưu. Vui lòng thử lại.');
    }
  };

  const loadAutoBackupData = async () => {
    loadZipBackupStatus();
    try {
      const res = await fetch('/api/system/backup/auto');
      const data = await res.json();
      if (data.success) {
        if (data.config) setAutoBackupConfig(data.config);
        if (Array.isArray(data.backupFiles)) setBackupFileList(data.backupFiles);
      }
    } catch {}
  };
  const [copiedBackupDir, setCopiedBackupDir] = useState(false);
  const folderBrowserRef = useRef<HTMLInputElement>(null);

  const handleCopyBackupDir = () => {
    if (navigator?.clipboard && autoBackupConfig.directory) {
      navigator.clipboard.writeText(autoBackupConfig.directory);
      setCopiedBackupDir(true);
      setTimeout(() => setCopiedBackupDir(false), 2500);
    }
  };

  const handleBrowseFolder = async () => {
    try {
      if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
        // @ts-ignore
        const dirHandle = await (window as any).showDirectoryPicker();
        if (dirHandle && dirHandle.name) {
          const pickedName = dirHandle.name;
          const current = autoBackupConfig.directory || 'C:\\IT_Backups';
          const sep = current.includes('/') ? '/' : '\\';
          const newPath = current.includes(sep)
            ? `${current.substring(0, current.lastIndexOf(sep))}${sep}${pickedName}`
            : `C:\\${pickedName}`;
          setAutoBackupConfig((prev) => ({ ...prev, directory: newPath }));
          setPathTestResult(null);
          return;
        }
      }
    } catch {}
    folderBrowserRef.current?.click();
  };

  const handleFolderSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const firstFile = files[0];
      const relPath = firstFile.webkitRelativePath || '';
      if (relPath) {
        const topFolder = relPath.split('/')[0];
        const newPath = `C:\\${topFolder}`;
        setAutoBackupConfig((prev) => ({ ...prev, directory: newPath }));
        setPathTestResult(null);
      }
    }
  };

  const [isRestoring, setIsRestoring] = useState(false);
  const [backupToast, setBackupToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);

  const handleTestBackupPath = async () => {
    setTestingPath(true);
    setPathTestResult(null);
    try {
      const res = await fetch('/api/system/backup/auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'TEST_PATH', directory: autoBackupConfig.directory }),
      });
      const data = await res.json();
      setPathTestResult({ success: res.ok, message: data.message || data.error });
    } catch {
      setPathTestResult({ success: false, message: 'Lỗi kết nối kiểm tra đường dẫn' });
    } finally {
      setTestingPath(false);
    }
  };

  const handleToggleAutoBackup = async () => {
    const nextState = !autoBackupConfig.autoEnabled;
    const updatedConfig = { ...autoBackupConfig, autoEnabled: nextState };
    setAutoBackupConfig(updatedConfig);
    try {
      const res = await fetch('/api/system/backup/auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SAVE_CONFIG', config: updatedConfig }),
      });
      const data = await res.json();
      if (res.ok) {
        setBackupToast({
          message: nextState ? '✅ Đã BẬT tính năng tự động sao lưu định kỳ!' : '⚪ Đã TẮT tính năng tự động sao lưu!',
          type: 'success',
        });
      }
    } catch {
      setBackupToast({ message: 'Lỗi lưu trạng thái tự động sao lưu', type: 'error' });
    } finally {
      setTimeout(() => setBackupToast(null), 3500);
    }
  };

  const handleSaveAutoBackupConfig = async () => {
    setSavingBackupConfig(true);
    try {
      const res = await fetch('/api/system/backup/auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SAVE_CONFIG', config: autoBackupConfig }),
      });
      const data = await res.json();
      if (res.ok) {
        setBackupToast({ message: data.message || 'Đã lưu cấu hình sao lưu!', type: 'success' });
        loadAutoBackupData();
      } else {
        setBackupToast({ message: data.error || 'Lỗi lưu cấu hình', type: 'error' });
      }
    } catch {
      setBackupToast({ message: 'Lỗi kết nối khi lưu cấu hình', type: 'error' });
    } finally {
      setSavingBackupConfig(false);
      setTimeout(() => setBackupToast(null), 4000);
    }
  };

  const handleRunBackupNowToDir = async () => {
    setIsBackingUp(true);
    try {
      const res = await fetch('/api/system/backup/auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RUN_NOW' }),
      });
      const data = await res.json();
      if (res.ok) {
        setBackupToast({ message: data.message || 'Đã tạo bản sao lưu thành công!', type: 'success' });
        loadAutoBackupData();
      } else {
        setBackupToast({ message: data.error || 'Lỗi sao lưu', type: 'error' });
      }
    } catch {
      setBackupToast({ message: 'Lỗi kết nối khi chạy sao lưu', type: 'error' });
    } finally {
      setIsBackingUp(false);
      setTimeout(() => setBackupToast(null), 5000);
    }
  };

  const handleDownloadBackup = async () => {
    setIsBackingUp(true);
    try {
      const res = await fetch('/api/system/backup');
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ITSM_Backup_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setBackupToast({ message: 'Đã xuất file sao lưu hệ thống thành công!', type: 'success' });
      } else {
        setBackupToast({ message: 'Không thể tạo bản sao lưu dữ liệu', type: 'error' });
      }
    } catch {
      setBackupToast({ message: 'Lỗi kết nối khi sao lưu dữ liệu', type: 'error' });
    } finally {
      setIsBackingUp(false);
      setTimeout(() => setBackupToast(null), 4000);
    }
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('CẢNH BÁO: Bạn có chắc chắn muốn phục hồi dữ liệu từ file này? Thao tác này sẽ ghi đè và cập nhật cấu hình hệ thống.')) {
      if (backupInputRef.current) backupInputRef.current.value = '';
      return;
    }

    setIsRestoring(true);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const res = await fetch('/api/system/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json),
      });

      const data = await res.json();
      if (res.ok) {
        setBackupToast({ message: data.message || 'Phục hồi dữ liệu thành công!', type: 'success' });
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setBackupToast({ message: data.error || 'Phục hồi thất bại', type: 'error' });
      }
    } catch {
      setBackupToast({ message: 'File sao lưu không hợp lệ hoặc lỗi kết nối', type: 'error' });
    } finally {
      setIsRestoring(false);
      if (backupInputRef.current) backupInputRef.current.value = '';
      setTimeout(() => setBackupToast(null), 4000);
    }
  };

  const [copiedEmail, setCopiedEmail] = useState(false);
  const [rbacSubTab, setRbacSubTab] = useState<'ROLES' | 'PERMISSIONS'>('ROLES');
  const [permSearch, setPermSearch] = useState('');
  const [permModuleFilter, setPermModuleFilter] = useState('ALL');

  // Add/Edit Role Modal State
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [roleFormId, setRoleFormId] = useState<string | null>(null);
  const [roleFormName, setRoleFormName] = useState('');
  const [roleFormDesc, setRoleFormDesc] = useState('');

  // Add/Edit Permission Modal State
  const [isPermModalOpen, setIsPermModalOpen] = useState(false);
  const [permFormId, setPermFormId] = useState<string | null>(null);
  const [permFormCode, setPermFormCode] = useState('');
  const [permFormName, setPermFormName] = useState('');
  const [permFormModule, setPermFormModule] = useState('');
  const [permFormDesc, setPermFormDesc] = useState('');
  const [savingPerm, setSavingPerm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadSampleStats = async () => {
    try {
      const res = await fetch('/api/system/sample-data');
      const data = await res.json();
      if (data.success) setSampleDataStats(data.stats);
    } catch {}
  };

  const handleSeedSampleData = async () => {
    if (!confirm('Bạn có muốn tạo bộ dữ liệu mẫu (Tài sản, Bản quyền, Dịch vụ, Ticket, Mật khẩu KeePass) để tham khảo không?')) return;
    setLoadingSampleData(true);
    try {
      const res = await fetch('/api/system/sample-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SEED' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSampleToast(data.message);
        setTimeout(() => setSampleToast(null), 5000);
        loadSampleStats();
    loadAutoBackupData();
        loadAll();
      } else {
        alert(data.error || 'Tạo dữ liệu mẫu thất bại');
      }
    } catch {
      alert('Lỗi kết nối khi tạo dữ liệu mẫu');
    } finally {
      setLoadingSampleData(false);
    }
  };

  const handleClearSampleData = async () => {
    if (!confirm('Bạn có chắc chắn muốn XÓA SẠCH toàn bộ dữ liệu mẫu không? (Dữ liệu thật của bạn sẽ được giữ nguyên an toàn 100%)')) return;
    setLoadingSampleData(true);
    try {
      const res = await fetch('/api/system/sample-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CLEAR' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSampleToast(data.message);
        setTimeout(() => setSampleToast(null), 5000);
        loadSampleStats();
        loadAll();
      } else {
        alert(data.error || 'Xóa dữ liệu mẫu thất bại');
      }
    } catch {
      alert('Lỗi kết nối khi xóa dữ liệu mẫu');
    } finally {
      setLoadingSampleData(false);
    }
  };

  const [currentUser, setCurrentUser] = useState<any>(null);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [settingsRes, rolesRes, backupRes, meRes] = await Promise.all([
        fetch('/api/settings').then((r) => r.json()),
        fetch('/api/roles').then((r) => r.json()),
        fetch('/api/system/backup/auto').then((r) => r.json()),
        fetch('/api/auth/me').then((r) => r.json()).catch(() => null),
      ]);

      if (meRes?.success && meRes?.data) setCurrentUser(meRes.data);
      if (settingsRes.success) setSettings(settingsRes.data);
      if (rolesRes.success) {
        setRoles(rolesRes.data.roles);
        setAllPermissions(rolesRes.data.allPermissions);
        if (rolesRes.data.roles.length > 0 && !selectedRole) {
          setSelectedRole(rolesRes.data.roles[0]);
          setRolePermissions(rolesRes.data.roles[0].permissionCodes);
        }
      }
      if (backupRes?.success) {
        if (backupRes.config) setAutoBackupConfig(backupRes.config);
        if (Array.isArray(backupRes.backupFiles)) setBackupFileList(backupRes.backupFiles);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    loadSampleStats();
    loadAutoBackupData();
  }, []);

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => {
      const exists = prev.some((s) => s.key === key);
      if (exists) {
        return prev.map((s) => (s.key === key ? { ...s, value } : s));
      }
      return [...prev, { key, value, label: key, group: 'general' }];
    });
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);
    try {
      const [res, backupRes] = await Promise.all([
        fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ settings }),
        }),
        fetch('/api/system/backup/auto', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'SAVE_CONFIG', config: autoBackupConfig }),
        }),
      ]);

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        loadAll();
        loadAutoBackupData();
      }
    } catch {
      alert('Lỗi lưu cài đặt');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingLogo(true);
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          handleChange('app.logo', data.url);
        }
      } else {
        const err = await res.json();
        alert(err.error || 'Tải ảnh thất bại');
      }
    } catch {
      alert('Lỗi kết nối khi tải ảnh');
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSelectRole = (role: any) => {
    setSelectedRole(role);
    setRolePermissions(role.permissionCodes || []);
  };


  // Open Create / Edit Role Modal
  const handleOpenRoleModal = (role?: any) => {
    if (role) {
      setRoleFormId(role.id);
      setRoleFormName(role.name);
      setRoleFormDesc(role.description || '');
    } else {
      setRoleFormId(null);
      setRoleFormName('');
      setRoleFormDesc('');
    }
    setIsRoleModalOpen(true);
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleFormName.trim()) return;

    try {
      const res = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: roleFormId,
          name: roleFormName.trim(),
          description: roleFormDesc.trim(),
        }),
      });
      if (res.ok) {
        setIsRoleModalOpen(false);
        loadAll();
      } else {
        const err = await res.json();
        alert(err.error || 'Lưu vai trò thất bại');
      }
    } catch {
      alert('Lỗi kết nối khi lưu vai trò');
    }
  };

  const handleDeleteRole = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa vai trò "${name}"?`)) return;
    try {
      const res = await fetch(`/api/roles?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadAll();
      } else {
        const err = await res.json();
        alert(err.error || 'Xóa vai trò thất bại');
      }
    } catch {
      alert('Lỗi kết nối khi xóa vai trò');
    }
  };

  // Open Create / Edit Permission Modal
  const handleOpenPermModal = (perm?: any) => {
    if (perm) {
      setPermFormId(perm.id);
      setPermFormCode(perm.code);
      setPermFormName(perm.name);
      setPermFormModule(perm.module);
      setPermFormDesc(perm.description || '');
    } else {
      setPermFormId(null);
      setPermFormCode('');
      setPermFormName('');
      setPermFormModule('documents');
      setPermFormDesc('');
    }
    setIsPermModalOpen(true);
  };

  const handleSavePermission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permFormCode.trim() || !permFormName.trim()) return;

    setSavingPerm(true);
    try {
      const method = permFormId ? 'PUT' : 'POST';
      const res = await fetch('/api/permissions', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: permFormId,
          code: permFormCode.trim(),
          name: permFormName.trim(),
          module: permFormModule.trim(),
          description: permFormDesc.trim(),
        }),
      });

      if (res.ok) {
        setIsPermModalOpen(false);
        loadAll();
      } else {
        const err = await res.json();
        alert(err.error || 'Lưu quyền hạn thất bại');
      }
    } catch {
      alert('Lỗi kết nối khi lưu quyền hạn');
    } finally {
      setSavingPerm(false);
    }
  };

  const handleDeletePermission = async (id: string, name: string, code: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa quyền "${name}" (${code}) khỏi hệ thống?`)) return;
    try {
      const res = await fetch(`/api/permissions?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadAll();
      } else {
        const err = await res.json();
        alert(err.error || 'Xóa quyền thất bại');
      }
    } catch {
      alert('Lỗi kết nối khi xóa quyền');
    }
  };

  // Select / Deselect All in Module
  const handleToggleModulePermissions = (modulePerms: any[], check: boolean) => {
    const codes = modulePerms.map((p) => p.code);
    if (check) {
      setRolePermissions((prev) => Array.from(new Set([...prev, ...codes])));
    } else {
      setRolePermissions((prev) => prev.filter((c) => !codes.includes(c)));
    }
  };

  const handleTogglePermission = (code: string) => {
    setRolePermissions((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleSaveRolePermissions = async () => {
    if (!selectedRole) return;
    try {
      const res = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedRole.id,
          name: selectedRole.name,
          description: selectedRole.description,
          permissionCodes: rolePermissions,
        }),
      });
      if (res.ok) {
        setRoleSaved(true);
        setTimeout(() => setRoleSaved(false), 3000);
        loadAll();
      }
    } catch {
      alert('Lỗi khi lưu phân quyền');
    }
  };

  const getSettingValue = (key: string) => {
    const s = settings.find((item) => item.key === key);
    return s ? s.value : '';
  };

  const currentLogo = getSettingValue('app.logo');
  const currentPrimaryColor = getSettingValue('app.primary_color') || '#2563EB';

  const redirectUri = typeof window !== 'undefined'
    ? `${window.location.origin}/api/auth/sso/ms365/callback`
    : 'http://localhost:3000/api/auth/sso/ms365/callback';

  const handleTestLdap = async () => {
    setTestingLdap(true);
    setLdapTestResult(null);
    try {
      const res = await fetch('/api/auth/ldap/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverUrl: getSettingValue('ldap.server_url'),
          baseDn: getSettingValue('ldap.base_dn'),
          bindDn: getSettingValue('ldap.bind_dn'),
          bindPassword: getSettingValue('ldap.bind_password'),
          userSearchFilter: getSettingValue('ldap.user_search_filter'),
        }),
      });
      const data = await res.json();
      setLdapTestResult(data);
    } catch (e: any) {
      setLdapTestResult({ success: false, message: 'Lỗi khi gọi API kiểm tra: ' + e.message });
    } finally {
      setTestingLdap(false);
    }
  };

  const copyRedirectUri = () => {
    navigator.clipboard.writeText(redirectUri);
    setCopiedUri(true);
    setTimeout(() => setCopiedUri(false), 2000);
  };

  // Group permissions by module
  const permissionsByModule = allPermissions.reduce((acc: any, p: any) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {});

  const isAdmin = currentUser?.role?.name === 'Admin' || currentUser?.roleName === 'Admin';

  if (!loading && currentUser && !isAdmin) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-3xl border border-rose-200 shadow-xl text-center space-y-4 animate-in fade-in">
        <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-2xl shadow-inner">
          🔒
        </div>
        <h2 className="text-lg font-black text-slate-900">Quyền Truy Cập Bị Giới Hạn</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          Chỉ Quản trị viên hệ thống (Role: <strong>Admin</strong>) mới có quyền truy cập, chỉnh sửa quy chuẩn thời hạn SLA, phân tuyến tự động và phân quyền vai trò.
        </p>
        <div className="pt-2">
          <a
            href="/dashboard"
            className="inline-block px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            Quay lại Tổng Quan
          </a>
        </div>
      </div>
    );
  }

  const navGroups = getSettingsNavGroups(isEn);
  const filteredNavGroups = navGroups.map((group) => {
    if (!searchFilter.trim()) return group;
    const term = searchFilter.toLowerCase();
    const items = group.items.filter(
      (item) =>
        item.label.toLowerCase().includes(term) ||
        item.desc.toLowerCase().includes(term) ||
        group.title.toLowerCase().includes(term)
    );
    return { ...group, items };
  }).filter((group) => group.items.length > 0);

  const currentNavItem = navGroups.flatMap((g) => g.items).find(
    (i) => i.id === activeTab
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="p-2 bg-blue-600 text-white rounded-xl shadow-xs text-lg">⚙️</span>
            <span>{isEn ? 'System Settings & Configuration' : 'Cài đặt & Cấu hình Hệ thống'}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isEn ? 'Central administration for identity, role-based access control (RBAC), SSO/LDAP authentication, and ITSM integrations' : 'Trung tâm quản trị nhận diện, phân quyền vai trò (RBAC), bảo mật xác thực SSO/LDAP và tích hợp vận hành ITSM'}
          </p>
        </div>
      </div>

      {/* Main 2-Column Layout: Left Nav (Sticky & Hover Expanding) + Right Content */}
      <div className="flex flex-col lg:flex-row gap-6 items-start relative">
        {/* Left Column: Settings Navigation Sidebar */}
        <div
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`shrink-0 transition-all duration-300 z-30 sticky top-4 ${
            isExpanded
              ? 'w-full lg:w-80'
              : 'w-full lg:w-16'
          }`}
        >
          {/* Sidebar Top Toolbar (Search, Pin, Title) */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-2 shadow-xs mb-2.5 transition-all">
            <div className="flex items-center justify-between gap-1.5">
              {isExpanded ? (
                <>
                  <div className="flex items-center gap-2 min-w-0 pl-1">
                    <span className="text-sm p-1.5 bg-blue-50 text-blue-600 rounded-xl">⚙️</span>
                    <span className="text-xs font-black text-slate-800 tracking-tight">{isEn ? 'SYSTEM SETTINGS' : 'CÀI ĐẶT HỆ THỐNG'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleTogglePin}
                    title={isPinned ? 'Bỏ ghim (Tự động thu gọn khi di chuột ra ngoài)' : 'Ghim cố định menu luôn mở rộng'}
                    className={`p-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                      isPinned
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-500 hover:bg-blue-50 hover:text-blue-600'
                    }`}
                  >
                    {isPinned ? <Pin className="w-3.5 h-3.5 fill-current" /> : <PinOff className="w-3.5 h-3.5" />}
                    <span className="text-[10.5px] pr-0.5">{isPinned ? (isEn ? 'Pinned' : 'Đã ghim') : (isEn ? 'Pin' : 'Ghim')}</span>
                  </button>
                </>
              ) : (
                <div className="w-full flex justify-center py-0.5" title="Di chuột lại gần để mở rộng đầy đủ danh mục">
                  <span className="text-base p-1 text-slate-700 hover:scale-110 transition-transform cursor-pointer">⚙️</span>
                </div>
              )}
            </div>

            {/* Quick Search when expanded */}
            {isExpanded && (
              <div className="relative mt-2 pt-2 border-t border-slate-100">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={isEn ? 'Quick search settings...' : 'Tìm nhanh mục cài đặt...'}
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium placeholder-slate-400 outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
                {searchFilter && (
                  <button
                    onClick={() => setSearchFilter('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Navigation Groups List */}
          <div
            className={`bg-white border border-slate-200/90 rounded-2xl shadow-xs transition-all duration-300 ${
              isExpanded
                ? 'p-2 divide-y divide-slate-100 max-h-[calc(100vh-220px)] overflow-y-auto'
                : 'p-1.5 w-16 mx-auto'
            }`}
          >
            {filteredNavGroups.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                {isEn ? `No settings found matching "${searchFilter}"` : `Không tìm thấy mục cài đặt phù hợp với "${searchFilter}"`}
              </div>
            ) : (
              filteredNavGroups.map((group, gIdx) => {
                const isGroupCollapsed = collapsedGroups.includes(group.title) && !searchFilter;
                return (
                  <div
                    key={group.title}
                    className={`py-2 first:pt-0.5 last:pb-0.5 ${gIdx > 0 && isExpanded ? 'mt-1' : ''}`}
                  >
                    {/* Group Title Accordion Header */}
                    {isExpanded ? (
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.title)}
                        className="w-full px-2.5 py-1 flex items-center justify-between text-[10.5px] font-black text-slate-400 uppercase tracking-wider hover:text-slate-700 transition-colors cursor-pointer group"
                      >
                        <span>{group.title}</span>
                        <span className="text-slate-400 group-hover:text-slate-600">
                          {isGroupCollapsed ? (
                            <ChevronRight className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </span>
                      </button>
                    ) : (
                      <div className="w-full my-1.5 border-t border-slate-100 first:hidden" />
                    )}

                    {/* Group Items */}
                    {(!isGroupCollapsed || !isExpanded) && (
                      <div className={`space-y-1 ${isExpanded ? 'mt-0.5' : ''}`}>
                        {group.items.map((item) => {
                          const isActive = activeTab === item.id;
                          return (
                            <div key={item.id} className="relative group">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveTab(item.id);
                                  if (typeof window !== 'undefined') {
                                    const url = new URL(window.location.href);
                                    const tabSlug = item.id === 'AI_COPILOT' ? 'ai' : item.id.toLowerCase();
                                    url.searchParams.set('tab', tabSlug);
                                    window.history.replaceState({}, '', url.toString());
                                    window.dispatchEvent(new CustomEvent('app:tab-change', { detail: { tab: tabSlug } }));
                                  }
                                }}
                                className={`w-full transition-all flex items-center cursor-pointer ${
                                  !isExpanded
                                    ? `w-12 h-11 justify-center rounded-xl mx-auto ${
                                        isActive
                                          ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-300'
                                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                      }`
                                    : `px-2.5 py-2 rounded-xl text-left justify-between ${
                                        isActive
                                          ? 'bg-blue-50 text-blue-900 border border-blue-200/90 shadow-xs'
                                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                      }`
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span
                                    className={`text-sm shrink-0 ${
                                      !isExpanded
                                        ? 'text-lg'
                                        : `p-1.5 rounded-lg ${
                                            isActive
                                              ? 'bg-blue-600 text-white shadow-xs'
                                              : 'bg-slate-100 group-hover:bg-white'
                                          }`
                                    }`}
                                  >
                                    {item.icon}
                                  </span>
                                  {isExpanded && (
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-1.5">
                                        <span
                                          className={`text-xs truncate ${
                                            isActive ? 'font-bold text-blue-950' : 'font-semibold text-slate-700'
                                          }`}
                                        >
                                          {item.label}
                                        </span>
                                        {item.badge && (
                                          <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 border border-amber-300 shrink-0">
                                            {item.badge}
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[10px] text-slate-400 truncate max-w-[190px]">
                                        {item.desc}
                                      </div>
                                    </div>
                                  )}
                                </div>
                                {isExpanded && isActive && (
                                  <div className="w-1.5 h-5 bg-blue-600 rounded-full shrink-0 ml-1" />
                                )}
                              </button>

                              {/* Floating Hover Tooltip when sidebar is collapsed */}
                              {!isExpanded && (
                                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200 pointer-events-none">
                                  <div className="bg-slate-900/95 backdrop-blur-sm text-white px-3.5 py-2 rounded-xl shadow-xl border border-slate-700 whitespace-nowrap">
                                    <div className="text-xs font-bold flex items-center gap-1.5">
                                      <span>{item.icon}</span>
                                      <span>{item.label}</span>
                                    </div>
                                    <div className="text-[10.5px] text-slate-300 mt-0.5">
                                      {item.desc}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Active Settings Content */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Header Banner for Current Section */}
          {currentNavItem && (
            <div className="bg-gradient-to-r from-blue-50/70 via-slate-50 to-white p-4 rounded-2xl border border-blue-100 shadow-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl p-2 bg-white rounded-xl shadow-xs border border-slate-100 shrink-0">
                  {currentNavItem.icon}
                </span>
                <div>
                  <h2 className="text-base font-bold text-slate-900">{currentNavItem.label}</h2>
                  <p className="text-xs text-slate-500">{currentNavItem.desc}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-flex px-2.5 py-1 bg-white/90 text-blue-700 border border-blue-200 text-[11px] font-bold rounded-lg shadow-xs">
                  Mục đang chọn
                </span>
              </div>
            </div>
          )}

          {activeTab === 'AI_COPILOT' && (
            <div className="space-y-6">
              <AICopilotSettingsTab />
            </div>
          )}

      {activeTab === 'CURRENCY' && (
        <div className="space-y-6">
          <CurrencySettingsCard />
        </div>
      )}

      {activeTab === 'ROUTING' && (
        <EnterpriseFeatureLock
          previewType="routing"
          tier="ENTERPRISE"
          icon="🎯"
          title="Tổ Chức IT, Phân Tuyến Ticket & Cam Kết SLA"
          titleEn="IT Support Org, Smart Routing & SLA Policies"
          subtitle="Tự động phân luồng ticket theo chuyên môn nhóm IT (L1, L2, L3) và giám sát cam kết SLA"
          subtitleEn="Automated ticket queue dispatching and multi-tier SLA response/resolution policies"
          bullets={[
            'Thiết lập đội nhóm hỗ trợ L1, L2, L3 chuyên trách',
            'Phân tuyến tự động theo loại sự cố và khu vực',
            'Giám sát thời gian phản hồi & xử lý SLA cam kết',
            'Cảnh báo vượt hạn SLA tự động qua Email/Telegram',
            'Báo cáo hiệu suất KPI nhân viên IT theo thời gian thực',
            'Chính sách leo thang sự cố khẩn cấp (Escalation Matrix)',
          ]}
          bulletsEn={[
            'Dedicated L1, L2, L3 IT support teams and queues',
            'Auto-routing by incident categories and branch locations',
            'Committed SLA response and resolution timeframes',
            'Automated SLA breach notifications via Email/Telegram',
            'Real-time IT specialist KPI & resolution analytics',
            'Multi-level incident escalation matrices',
          ]}
        />
      )}

      {activeTab === 'AUDIT' && (
        <AuditLogsSettingsTab />
      )}

      {activeTab === 'GENERAL' && (
        /* GENERAL & APPEARANCE TAB */
        <form onSubmit={handleSaveSettings} className="space-y-6">
          {saved && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold rounded-2xl flex items-center space-x-2 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Cài đặt hệ thống đã được cập nhật thành công!</span>
            </div>
          )}

          {/* Logo & Branding Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center space-x-2 text-slate-900 font-bold text-base pb-3 border-b border-slate-100">
              <Palette className="w-5 h-5 text-blue-600" />
              <span>Tùy biến Logo & Nhận diện Thương hiệu</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tên ứng dụng hiển thị</label>
                <input
                  type="text"
                  placeholder="VD: Quản lý tài sản, IT Asset Hub..."
                  value={getSettingValue('app.name')}
                  onChange={(e) => handleChange('app.name', e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'en' ? 'Company / Organization Name' : 'Tên công ty / Doanh nghiệp'}
                </label>
                <input
                  type="text"
                  placeholder="VD: Công ty TechCorp, ABC Corporation..."
                  value={getSettingValue('app.company_name')}
                  onChange={(e) => handleChange('app.company_name', e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800"
                />
              </div>

              {/* SYSTEM LANGUAGE SETTING */}
              <div className="md:col-span-2 pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-blue-600" />
                  <span>{language === 'en' ? 'Default System Language' : 'Ngôn ngữ mặc định của hệ thống'}</span>
                </label>
                <p className="text-[11px] text-slate-500 mb-2">
                  {language === 'en'
                    ? 'Select primary language for the entire platform interface and login screen'
                    : 'Chọn ngôn ngữ giao diện chính cho hệ thống và màn hình đăng nhập'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      handleChange('app.language', 'vi');
                      setLanguage('vi');
                    }}
                    className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                      (getSettingValue('app.language') || language) === 'vi'
                        ? 'border-blue-500 bg-blue-50/80 ring-2 ring-blue-500/20 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-2xl">🇻🇳</span>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Tiếng Việt (Vietnamese)</p>
                      <p className="text-[11px] text-slate-500">Giao diện chuẩn tiếng Việt cho doanh nghiệp</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleChange('app.language', 'en');
                      setLanguage('en');
                    }}
                    className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                      (getSettingValue('app.language') || language) === 'en'
                        ? 'border-blue-500 bg-blue-50/80 ring-2 ring-blue-500/20 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-2xl">🇬🇧</span>
                    <div>
                      <p className="text-xs font-bold text-slate-900">English (Tiếng Anh)</p>
                      <p className="text-[11px] text-slate-500">Standard English interface for global operations</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* LOGO UPLOAD & PICKER SECTION */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-800">
                  Logo Thương hiệu (Tải ảnh từ máy tính hoặc dán URL)
                </label>
                {currentLogo && (
                  <button
                    type="button"
                    onClick={() => handleChange('app.logo', '')}
                    className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Xóa logo (Dùng icon mặc định)</span>
                  </button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {/* Live Preview Box (Sidebar Style) */}
                <div className="flex items-center gap-3 p-3 bg-slate-900 text-white rounded-xl border border-slate-800 shrink-0">
                  {currentLogo ? (
                    <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-700 shrink-0">
                      <img
                        src={currentLogo}
                        alt="Logo Preview"
                        className="w-full h-full object-contain p-1"
                        onError={(e) => {
                          (e.target as any).style.display = 'none';
                        }}
                      />
                    </div>
                  ) : (
                    <div
                      style={{ backgroundColor: currentPrimaryColor }}
                      className="w-12 h-12 rounded-lg flex items-center justify-center shadow-md shrink-0"
                    >
                      <Laptop className="w-6 h-6 text-white" />
                    </div>
                  )}
                  <div className="text-xs">
                    <p className="font-bold text-white leading-tight">{getSettingValue('app.name') || 'IT Asset Hub'}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{getSettingValue('app.company_name') || 'Công ty TechCorp'}</p>
                    <span className="text-[9px] text-emerald-400 font-mono">● Xem trước Sidebar</span>
                  </div>
                </div>

                {/* Upload & Path Controls */}
                <div className="flex-1 space-y-2 w-full">
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif,image/x-icon"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="logo-file-picker"
                    />
                    <label
                      htmlFor="logo-file-picker"
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl cursor-pointer flex items-center gap-1.5 shadow-2xs transition-colors shrink-0"
                    >
                      {uploadingLogo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      <span>{uploadingLogo ? 'Đang tải lên...' : '📂 Chọn file ảnh từ máy tính'}</span>
                    </label>

                    <input
                      type="text"
                      placeholder="Hoặc dán URL: https://example.com/logo.png"
                      value={currentLogo}
                      onChange={(e) => handleChange('app.logo', e.target.value)}
                      className="flex-1 p-2 bg-white border border-slate-300 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <p className="text-[11px] text-slate-500">
                    💡 Hỗ trợ các định dạng ảnh: <strong>PNG, JPG, SVG, WebP, ICO</strong> (Kích thước đề xuất: vuông hoặc tỉ lệ 1:1 hoặc chữ nhật nhỏ, nền trong suốt).
                  </p>
                </div>
              </div>
            </div>

            {/* COLOR PICKER */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Màu chủ đạo giao diện (Primary Color)</label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={currentPrimaryColor}
                  onChange={(e) => handleChange('app.primary_color', e.target.value)}
                  className="w-10 h-10 rounded-xl border border-slate-300 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={currentPrimaryColor}
                  onChange={(e) => handleChange('app.primary_color', e.target.value)}
                  className="w-36 p-2.5 border border-slate-300 rounded-xl text-sm font-mono outline-none uppercase font-semibold text-slate-800"
                />
                {/* Preset Colors */}
                <div className="flex items-center gap-1.5">
                  {['#2563EB', '#4F46E5', '#7C3AED', '#059669', '#DC2626', '#EA580C', '#0F172A'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => handleChange('app.primary_color', c)}
                      style={{ backgroundColor: c }}
                      className="w-6 h-6 rounded-lg border-2 border-white shadow-2xs hover:scale-110 transition-transform"
                      title={c}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Server IP & QR Code Scanner URL Configuration Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-base">
                <QrCode className="w-5 h-5 text-indigo-600" />
                <span>Cấu hình Server IP / Cổng & Link Quét Mã QR Code</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    handleChange('app.server_url', window.location.origin);
                  }
                }}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 transition-colors flex items-center space-x-1"
              >
                <span>🌐 Tự động lấy URL máy chủ hiện tại</span>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Địa chỉ Server / IP Mạng LAN & Port (VD: http://192.168.1.15:3000 hoặc https://it.mycompany.com)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="http://192.168.1.100:3000"
                    value={getSettingValue('app.server_url')}
                    onChange={(e) => handleChange('app.server_url', e.target.value)}
                    className="flex-1 p-2.5 border border-slate-300 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  💡 <strong>Hướng dẫn:</strong> Khi quét mã QR dán trên máy tính bằng điện thoại, link sẽ trỏ về địa chỉ IP này để mở thẳng trang xem chi tiết thiết bị. Bạn có thể đổi IP máy chủ hoặc tên miền bất kỳ lúc nào tại đây.
                </p>
              </div>
            </div>
          </div>

          {/* Notification & AI Settings */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 text-slate-900 font-bold text-base pb-3 border-b border-slate-100">
              <Bell className="w-5 h-5 text-amber-600" />
              <span>Cảnh báo nhắc hạn & Cấu hình AI</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Nhắc License trước (ngày)
                </label>
                <input
                  type="number"
                  value={getSettingValue('notification.license_expiry_days')}
                  onChange={(e) => handleChange('notification.license_expiry_days', e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Nhắc bảo hành trước (ngày)
                </label>
                <input
                  type="number"
                  value={getSettingValue('notification.warranty_expiry_days')}
                  onChange={(e) => handleChange('notification.warranty_expiry_days', e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Ngưỡng tự lưu AI (0.0 - 1.0)
                </label>
                <input
                  type="text"
                  value={getSettingValue('ai.auto_save_threshold')}
                  onChange={(e) => handleChange('ai.auto_save_threshold', e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-sm outline-none font-mono"
                />
              </div>
            </div>
          </div>

          {/* SAMPLE DATA MANAGEMENT CARD */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Dữ Liệu Mẫu & Demo (Sample Data Management)</h3>
                  <p className="text-xs text-slate-500">Tạo bộ dữ liệu mẫu thực tế để người dùng mới dễ dàng trải nghiệm và xóa sạch bất kỳ lúc nào</p>
                </div>
              </div>

              {sampleToast && (
                <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-xl animate-in fade-in flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{sampleToast}</span>
                </div>
              )}
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center">
                <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Tài sản</span>
                  <span className="text-sm font-extrabold text-indigo-600">{sampleDataStats?.sampleAssets ?? 0} mẫu</span>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Bản quyền</span>
                  <span className="text-sm font-extrabold text-purple-600">{sampleDataStats?.sampleLicenses ?? 0} mẫu</span>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Dịch vụ IT</span>
                  <span className="text-sm font-extrabold text-emerald-600">{sampleDataStats?.sampleServices ?? 0} mẫu</span>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Ticket IT</span>
                  <span className="text-sm font-extrabold text-rose-600">{sampleDataStats?.sampleTickets ?? 0} mẫu</span>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Pass KeePass</span>
                  <span className="text-sm font-extrabold text-amber-600">{sampleDataStats?.samplePasswords ?? 0} mẫu</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <p className="text-xs text-slate-600">
                  💡 <strong>Gợi ý:</strong> Bộ dữ liệu mẫu bao gồm: Laptop Dell XPS, MacBook Pro, Switch Cisco, VMware ESXi, Bản quyền Office 365, Tên miền, Ticket mẫu và cây thư mục KeePass chuẩn.
                </p>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={loadingSampleData}
                    onClick={handleSeedSampleData}
                    className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {loadingSampleData ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-amber-300" />}
                    <span>+ Nạp Dữ Liệu Mẫu</span>
                  </button>

                  <button
                    type="button"
                    disabled={loadingSampleData || (sampleDataStats?.totalSampleItems === 0)}
                    onClick={handleClearSampleData}
                    className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Xóa toàn bộ các bản ghi mẫu có tiền tố [MẪU]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa Dữ Liệu Mẫu</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

                                {/* SYSTEM BACKUP & RESTORE CARD WITH SCHEDULE & DIRECTORY SYNC */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="flex items-center space-x-3">
                  <div className="w-11 h-11 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 shadow-2xs border border-purple-100">
                    <Database className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Sao Lưu & Phục Hồi Dữ Liệu Tự Động (Auto-Backup & Sync)</h3>
                    <p className="text-xs text-slate-500">Tự động sao lưu định kỳ (Ngày/Tuần/Tháng), chỉ định thư mục lưu trữ và tự động đồng bộ file Hóa đơn / Hợp đồng mới</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadBackup}
                    disabled={isBackingUp}
                    className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                    title="Tải ngay file snapshot JSON về máy tính"
                  >
                    <Save className="w-3.5 h-3.5 text-purple-600" />
                    <span>📥 Tải Snapshot</span>
                  </button>

                  <input
                    ref={backupInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleRestoreFile}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => backupInputRef.current?.click()}
                    disabled={isRestoring}
                    className="px-3.5 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Phục hồi cơ sở dữ liệu từ file backup"
                  >
                    {isRestoring ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5 text-slate-600" />}
                    <span>{isRestoring ? 'Đang phục hồi...' : '📤 Phục Hồi'}</span>
                  </button>
                </div>
              </div>

              {backupToast && (
                <div
                  className={`p-3.5 border rounded-xl text-xs font-semibold flex items-center space-x-2 animate-in fade-in ${
                    backupToast.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  <span>{backupToast.type === 'success' ? '✅' : '⚠️'}</span>
                  <span>{backupToast.message}</span>
                </div>
              )}

              {/* SECTION 1: SCHEDULE & DESTINATION FOLDER CONFIGURATION */}
              <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200 space-y-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-purple-600" />
                    <span>1. Cấu Hình Tự Động Sao Lưu Định Kỳ & Thư Mục Máy Chủ</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleToggleAutoBackup}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border transition-all cursor-pointer font-bold text-xs shadow-2xs ${
                      autoBackupConfig.autoEnabled
                        ? 'bg-purple-600 hover:bg-purple-700 border-purple-700 text-white'
                        : 'bg-slate-200 hover:bg-slate-300 border-slate-300 text-slate-700'
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full transition-colors ${autoBackupConfig.autoEnabled ? 'bg-emerald-300 animate-pulse' : 'bg-slate-400'}`} />
                    <span>{autoBackupConfig.autoEnabled ? 'BẬT SAO LƯU TỰ ĐỘNG' : 'ĐÃ TẮT SAO LƯU TỰ ĐỘNG'}</span>
                  </button>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  {/* Frequency */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Tần suất sao lưu:</label>
                    <select
                      value={autoBackupConfig.frequency}
                      onChange={(e) => setAutoBackupConfig({ ...autoBackupConfig, frequency: e.target.value })}
                      disabled={!autoBackupConfig.autoEnabled}
                      className="w-full p-2 bg-white border border-slate-300 rounded-xl font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 cursor-pointer"
                    >
                      <option value="DAILY">Hàng ngày</option>
                      <option value="WEEKLY">Hàng tuần</option>
                      <option value="MONTHLY">Hàng tháng</option>
                    </select>
                  </div>

                  {/* Time of Day */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Thời gian chạy sao lưu:</label>
                    <input
                      type="time"
                      value={autoBackupConfig.time}
                      onChange={(e) => setAutoBackupConfig({ ...autoBackupConfig, time: e.target.value })}
                      disabled={!autoBackupConfig.autoEnabled}
                      className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold font-mono text-slate-800 outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                    />
                  </div>

                  {/* Retention */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Lưu trữ tối đa (ngày):</label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={autoBackupConfig.retentionDays}
                      onChange={(e) => setAutoBackupConfig({ ...autoBackupConfig, retentionDays: parseInt(e.target.value, 10) || 30 })}
                      disabled={!autoBackupConfig.autoEnabled}
                      className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Storage Path / Network Directory */}
                <div className="space-y-1.5 pt-1">
                  <label className="block text-[11px] font-bold text-slate-700 flex items-center justify-between">
                    <span>Thư mục lưu trữ sao lưu:</span>
                    <span className="text-[10px] text-slate-400 font-normal">File sẽ tự động ghi rõ ngày giờ: ITSM_Backup_YYYY-MM-DD_HH-mm-ss.json</span>
                  </label>

                  <input
                    ref={folderBrowserRef}
                    type="file"
                    {...({ webkitdirectory: '', directory: '' } as any)}
                    onChange={handleFolderSelected}
                    className="hidden"
                  />

                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    <div className="relative flex-1 min-w-[200px]">
                      <input
                        type="text"
                        value={autoBackupConfig.directory}
                        onChange={(e) => {
                          setAutoBackupConfig({ ...autoBackupConfig, directory: e.target.value });
                          setPathTestResult(null);
                        }}
                        placeholder="Ví dụ: C:\IT_Backups hoặc \\192.168.1.50\backups\itsm"
                        className="w-full pl-3 pr-20 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs"
                      />
                      <button
                        type="button"
                        onClick={handleCopyBackupDir}
                        className="absolute right-2 top-2 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer border border-slate-200"
                        title="Sao chép đường dẫn này"
                      >
                        <Copy className="w-3 h-3 text-slate-600" />
                        <span>{copiedBackupDir ? 'Đã chép!' : 'Copy'}</span>
                      </button>
                    </div>

                    {/* Browse Folder Button */}
                    <button
                      type="button"
                      onClick={handleBrowseFolder}
                      className="px-3.5 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
                      title="Mở hộp thoại chọn thư mục lưu trữ"
                    >
                      <FolderOpen className="w-4 h-4 text-purple-600" />
                      <span>Chọn Thư Mục</span>
                    </button>

                    {/* Test Path Button */}
                    <button
                      type="button"
                      onClick={handleTestBackupPath}
                      disabled={testingPath}
                      className="px-3.5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 shadow-2xs"
                      title="Kiểm tra xem máy chủ có quyền ghi vào thư mục này không"
                    >
                      {testingPath ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />}
                      <span>Kiểm tra đường dẫn</span>
                    </button>
                  </div>

                  {pathTestResult && (
                    <div className={`p-2.5 rounded-xl text-xs font-medium flex items-center gap-1.5 ${pathTestResult.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
                      <span>{pathTestResult.success ? '✅' : '❌'}</span>
                      <span>{pathTestResult.message}</span>
                    </div>
                  )}
                </div>

                {/* Auto Sync New Uploads Checkbox */}
                <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100 flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="syncUploadsCheck"
                    checked={autoBackupConfig.syncUploads}
                    onChange={(e) => setAutoBackupConfig({ ...autoBackupConfig, syncUploads: e.target.checked })}
                    className="mt-0.5 rounded border-purple-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                  <label htmlFor="syncUploadsCheck" className="text-xs text-purple-950 cursor-pointer leading-relaxed">
                    <strong>Tự động đồng bộ file Hóa đơn & Hợp đồng mới tải lên:</strong> Khi có file PDF/Word/Ảnh scan mới, hệ thống tự động sao chép ngay một bản lưu vào thư mục <code>{autoBackupConfig.directory}/uploads/</code>.
                  </label>
                </div>

                {/* Save Config and Manual Trigger Buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 flex-wrap gap-2">
                  <div className="text-[11px] text-slate-500">
                    {autoBackupConfig.lastRun ? (
                      <span>Lần sao lưu gần nhất: <strong>{new Date(autoBackupConfig.lastRun).toLocaleString('vi-VN')}</strong></span>
                    ) : (
                      <span>Chưa thực hiện sao lưu tự động lần nào</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleRunBackupNowToDir}
                      disabled={isBackingUp}
                      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                      title="Tạo ngay một bản sao lưu và đồng bộ toàn bộ file vào thư mục lưu trữ"
                    >
                      {isBackingUp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                      <span>⚡ Sao Lưu Ngay</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 1-CLICK FULL BACKUP (DATABASE + UPLOADS ZIP) */}
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl border border-indigo-500/40 shadow-xl space-y-4 relative overflow-hidden">
              <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-800/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white flex items-center gap-2">
                      <span>Sao Lưu Toàn Bộ Hệ Thống 1-Click</span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                        Cơ Sở Dữ Liệu + Thư Mục Ảnh (.ZIP)
                      </span>
                    </h3>
                    <p className="text-xs text-slate-300">
                      Tải ngay gói file nén .ZIP chứa toàn bộ cơ sở dữ liệu (PostgreSQL Clean Dump) và toàn bộ kho ảnh hiện trạng, hóa đơn (public/uploads) về máy tính
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
                  <p className="text-xs text-slate-400 font-medium">Kho ảnh & Tài liệu đính kèm:</p>
                  <p className="text-sm font-bold text-indigo-300 mt-0.5">
                    {zipBackupStatus?.uploadsSizeFormatted || '35.8 MB'} ({zipBackupStatus?.uploadsCount || 20} tệp tin)
                  </p>
                </div>
                <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
                  <p className="text-xs text-slate-400 font-medium">Cơ sở dữ liệu:</p>
                  <p className="text-sm font-bold text-emerald-400 mt-0.5">
                    PostgreSQL 18 (Clean SQL Dump)
                  </p>
                </div>
                <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
                  <p className="text-xs text-slate-400 font-medium">Lần tải sao lưu gần nhất:</p>
                  <p className="text-sm font-bold text-amber-300 mt-0.5">
                    {zipBackupStatus?.lastBackupAt
                      ? new Date(zipBackupStatus.lastBackupAt).toLocaleString('vi-VN')
                      : 'Sẵn sàng sao lưu'}
                  </p>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-xs text-slate-400">
                  💡 Gói file .ZIP có thể lưu trữ an toàn định kỳ vào Google Drive, ổ cứng ngoài hoặc dùng khôi phục hệ thống khi cần.
                </p>

                <button
                  type="button"
                  onClick={handleDownloadZipBackup}
                  disabled={isDownloadingZip}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all transform active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
                  title="Tải gói nén .ZIP gồm toàn bộ cơ sở dữ liệu và thư mục ảnh hiện trạng"
                >
                  {isDownloadingZip ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang nén & chuẩn bị gói ZIP...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Tải Gói Sao Lưu Toàn Bộ (.ZIP)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          {/* COMPACT FIXED BOTTOM FLOATING BAR FOR GENERAL SETTINGS */}
          <div className="fixed bottom-3 right-6 z-50 bg-slate-900/95 backdrop-blur-md text-white py-2 px-4 rounded-full shadow-2xl border border-slate-700/80 flex items-center gap-3 transition-all hover:shadow-blue-500/20">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs border border-blue-400/30">
                ⚙️
              </span>
              <span className="text-xs font-medium text-slate-200 hidden sm:inline">
                {saved ? '✅ Đã lưu cài đặt' : 'Cài đặt chung'}
              </span>
            </div>

            {saved && (
              <span className="text-xs text-emerald-400 font-bold flex items-center gap-1 animate-in fade-in">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Đã lưu!</span>
              </span>
            )}

            <button
              type="submit"
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-full text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Lưu Cài Đặt</span>
            </button>
          </div>
        </form>
      )}

      {activeTab === 'ALERTS' && <AlertSettingsTab />}

      {activeTab === 'EMAIL' && <EmailSettingsTab />}

      {activeTab === 'MAINTENANCE' && <MaintenanceSchedulesTab />}

      {activeTab === 'WEBHOOKS' && (
        <EnterpriseFeatureLock
          previewType="webhooks"
          tier="ENTERPRISE"
          icon="🔔"
          title="Webhook Đa Kênh Tự Động Hóa (Teams, Zalo OA, Slack)"
          titleEn="Multi-Channel Automated Webhooks (Teams, Zalo OA, Slack)"
          subtitle="Bắn thông báo tức thời tới các nền tảng chat doanh nghiệp khi có ticket, sự cố, hoặc hết hạn bản quyền"
          subtitleEn="Instant push notifications to corporate chat tools on tickets, incidents, and license expiries"
          bullets={[
            'Tích hợp Microsoft Teams Incoming Webhook thẻ tương tác',
            'Tích hợp Zalo Official Account & Zalo ZNS Template',
            'Tích hợp Slack Webhooks & kênh cảnh báo sự cố',
            'Tự động kích hoạt khi có Ticket khẩn P1, P2',
            'Tự động thông báo khi có yêu cầu mượn thiết bị mới',
            'Cảnh báo sớm 30/15/7 ngày trước khi hết hạn License/Dịch vụ',
          ]}
          bulletsEn={[
            'Microsoft Teams interactive card webhooks',
            'Zalo Official Account & ZNS notification templates',
            'Slack webhook integrations with dedicated incident channels',
            'Auto-trigger on urgent P1/P2 incidents and requests',
            'Instant notifications for asset checkout approvals',
            'Automated reminders 30/15/7 days before contract expiration',
          ]}
        />
      )}

      {activeTab === 'SSO' && (
        <EnterpriseFeatureLock
          previewType="sso"
          tier="ENTERPRISE"
          icon="🔑"
          title="Đăng Nhập Một Lần Microsoft 365 (SSO & Azure AD)"
          titleEn="Microsoft 365 Single Sign-On (SSO / Entra ID)"
          subtitle="Đăng nhập 1 chạm an toàn bằng tài khoản công ty @company.com qua Microsoft Azure AD / Entra ID"
          subtitleEn="1-click secure enterprise login with corporate @company.com via Microsoft Azure AD / Entra ID"
          bullets={[
            'Đăng nhập 1 chạm an toàn với tài khoản Microsoft 365 công ty',
            'Không cần nhớ mật khẩu riêng, hỗ trợ Microsoft Authenticator 2FA',
            'Tự động phân quyền vai trò (Admin, IT, Staff) theo nhóm Azure AD',
            'Tự động cấp tài khoản khi nhân sự đăng nhập lần đầu',
            'Tuân thủ tiêu chuẩn bảo mật danh tính doanh nghiệp SSO SAML/OIDC',
            'Hỗ trợ cấu hình đa Tenant hoặc Single Tenant chuyên biệt',
          ]}
          bulletsEn={[
            '1-click login with corporate Microsoft 365 credentials',
            'Zero password friction with full Microsoft 2FA / MFA enforcement',
            'Auto-sync role permissions from Azure AD security groups',
            'Just-in-time user auto-provisioning upon initial sign-in',
            'Compliant with SAML 2.0 and OpenID Connect (OIDC) standards',
            'Supports multi-tenant or single-tenant corporate directory',
          ]}
        />
      )}

      {activeTab === 'LDAP' && (
        <EnterpriseFeatureLock
          previewType="ldap"
          tier="ENTERPRISE"
          icon="🏢"
          title="Đồng Bộ Thư Mục Active Directory (LDAP / Windows Server)"
          titleEn="Active Directory / LDAP Directory Synchronization"
          subtitle="Đồng bộ danh bạ người dùng và xác thực tập trung từ máy chủ Windows Server Active Directory On-Premise"
          subtitleEn="Centralized user sync and authentication from On-Premise Windows Server Active Directory"
          bullets={[
            'Kết nối an toàn qua giao thức LDAPS (Cổng 636 mã hóa SSL/TLS)',
            'Tự động đồng bộ danh sách nhân viên từ Organizational Unit (OU)',
            'Xác thực trực tiếp với Domain Controller của doanh nghiệp',
            'Tự động vô hiệu hóa tài khoản khi nhân viên thôi việc trên AD',
            'Tùy biến bộ lọc User Search Filter linh hoạt',
            'Hỗ trợ cả Windows Server AD và Linux OpenLDAP / FreeIPA',
          ]}
          bulletsEn={[
            'Secure LDAPS communication over encrypted SSL/TLS port 636',
            'Automated employee roster sync from target Organizational Units (OU)',
            'Direct authentication against corporate Domain Controllers',
            'Instant account deactivation upon AD offboarding',
            'Customizable LDAP search filters and attribute mappings',
            'Supports Windows Server AD, OpenLDAP, and FreeIPA',
          ]}
        />
      )}

      {activeTab === 'RBAC' && (
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
                  <span>Quyền hạn của vai trò đã được lưu thành công!</span>
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
                              {r.isSystem && (
                                <span className="text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-mono">
                                  Hệ thống
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{getLocalizedRoleDesc(r.name, r.description, isEn) || (isEn ? 'No description' : 'Chưa có mô tả')}</p>
                            <span className="text-[10px] text-blue-600 font-semibold mt-1 inline-block">
                              🔑 {r.permissionCodes?.length || 0} {isEn ? 'permissions assigned' : 'quyền được gán'}
                            </span>
                          </div>

                          <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => handleOpenRoleModal(r)}
                              className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-white cursor-pointer"
                              title={isEn ? 'Edit role' : 'Sửa tên vai trò'}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
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
                      const allChecked = perms.every((p: any) => rolePermissions.includes(p.code));
                      const someChecked = perms.some((p: any) => rolePermissions.includes(p.code));

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
                                      <span className="text-[10px] text-slate-500 block line-clamp-1 mt-0.5">{p.description}</span>
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
                  Hiển thị <strong>{
                    allPermissions.filter((p) => {
                      const matchSearch = !permSearch || p.name.toLowerCase().includes(permSearch.toLowerCase()) || p.code.toLowerCase().includes(permSearch.toLowerCase()) || (p.description && p.description.toLowerCase().includes(permSearch.toLowerCase()));
                      const matchModule = permModuleFilter === 'ALL' || p.module === permModuleFilter;
                      return matchSearch && matchModule;
                    }).length
                  }</strong> / {allPermissions.length} quyền hạn
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
      )}
        </div>
      </div>
    </div>
  );
}
