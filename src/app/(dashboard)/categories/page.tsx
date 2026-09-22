'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/context';
import { invalidateClientCache, triggerDataRefresh } from '@/lib/client-cache';
import { showTrashUndoToast } from '@/components/common/TrashUndoToast';
import { CompanyOUNode, DepartmentNode, SubDepartmentNode } from '@/lib/ou-structure';
import {
  Layers,
  Plus,
  Trash2,
  Edit2,
  X,
  Laptop,
  Key,
  Globe,
  Building2,
  Handshake,
  MapPin,
  Search,
  Sliders,
  CheckCircle2,
  PlusCircle,
  Settings2,
  UploadCloud,
  Check,
  RefreshCw,
  Phone,
  Mail,
  Smile,
  ImageIcon,
  Save,
  Tag,
  User,
  Users,
  Briefcase,
  ChevronDown,
  ChevronRight,
  FolderTree,
  FolderPlus,
  Folder,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

interface CustomFieldDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'date' | 'boolean';
  placeholder?: string;
  required?: boolean;
  options?: string[];
}

interface VendorContact {
  id?: string;
  name: string;
  role?: string;
  phone?: string;
  email?: string;
  notes?: string;
}

function renderCategoryIcon(icon?: string, className = 'w-6 h-6') {
  if (!icon) return <span className="text-xl">📦</span>;
  if (
    icon.startsWith('http://') ||
    icon.startsWith('https://') ||
    icon.startsWith('/uploads/') ||
    icon.startsWith('data:image/') ||
    icon.startsWith('/images/')
  ) {
    return <img src={icon} alt="icon" className={`${className} object-contain rounded inline-block`} />;
  }
  return <span className="text-xl inline-block">{icon}</span>;
}

const POPULAR_EMOJIS = [
  '💻', '🖥️', '📱', '⌨️', '🖨️', '🌐', '📡', '🔌', '💾', '🎧',
  '📋', '🏢', '🔧', '📦', '🔑', '🛡️', '🗄️', '📹', '🖱️', '🔋',
  '📷', '📽️', '🕹️', '🖲️', '📠', '📟', '🎙️', '📺', '⚙️', '🏷️',
  '📄', '🎨', '💼', '📧', '📞', '☁️', '🪟', '📐', '🔒', '📶'
];

export default function CategoriesPage() {
  const { language } = useLanguage();
  const isEn = language === 'en';
  // Active Tab
  const [activeTab, setActiveTab] = useState<'assets' | 'licenses' | 'services' | 'vendors' | 'companies' | 'locations'>('assets');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Data states
  const [assetCategories, setAssetCategories] = useState<any[]>([]);
  const [licenseCategories, setLicenseCategories] = useState<any[]>([]);
  const [serviceCategories, setServiceCategories] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [companies, setCompanies] = useState<string[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [ouTree, setOuTree] = useState<CompanyOUNode[]>([]);
  const [expandedCompanies, setExpandedCompanies] = useState<Record<string, boolean>>({});
  const [expandedDepartments, setExpandedDepartments] = useState<Record<string, boolean>>({});

  // Department Modal State
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [deptModalMode, setDeptModalMode] = useState<'create' | 'edit'>('create');
  const [deptModalCompany, setDeptModalCompany] = useState('');
  const [deptModalOldName, setDeptModalOldName] = useState('');
  const [deptForm, setDeptForm] = useState({ name: '', code: '', icon: '📁', description: '' });

  // Sub-department Modal State
  const [isSubDeptModalOpen, setIsSubDeptModalOpen] = useState(false);
  const [subDeptModalMode, setSubDeptModalMode] = useState<'create' | 'edit'>('create');
  const [subDeptModalCompany, setSubDeptModalCompany] = useState('');
  const [subDeptModalDept, setSubDeptModalDept] = useState('');
  const [subDeptModalOldName, setSubDeptModalOldName] = useState('');
  const [subDeptForm, setSubDeptForm] = useState({ name: '', code: '', description: '' });

  // Unified Category Form Modal State (for Assets, Licenses, Services)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryModalMode, setCategoryModalMode] = useState<'create' | 'edit'>('create');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);

  const [categoryForm, setCategoryForm] = useState<{
    name: string;
    icon: string;
    description: string;
    serviceType?: string;
    customFields: CustomFieldDef[];
  }>({
    name: '',
    icon: '💻',
    description: '',
    customFields: [],
  });

  // Custom Field Form Input States (Inline builder)
  const [newField, setNewField] = useState<CustomFieldDef>({
    key: '',
    label: '',
    type: 'text',
    placeholder: '',
    required: false,
    options: [],
  });
  const [newFieldOptionsText, setNewFieldOptionsText] = useState('');

  // Editing existing custom field state
  const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);
  const [editingFieldData, setEditingFieldData] = useState<CustomFieldDef>({
    key: '',
    label: '',
    type: 'text',
    placeholder: '',
    required: false,
    options: [],
  });
  const [editingFieldOptionsText, setEditingFieldOptionsText] = useState('');

  // File Upload State
  const [isUploading, setIsUploading] = useState(false);
  const categoryFileInputRef = useRef<HTMLInputElement>(null);

  // Dedicated Vendor Multi-Contact Modal State
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [vendorModalMode, setVendorModalMode] = useState<'create' | 'edit'>('create');
  const [vendorForm, setVendorForm] = useState<{
    id: string;
    name: string;
    contacts: VendorContact[];
    generalNotes: string;
  }>({
    id: '',
    name: '',
    contacts: [{ name: '', role: '', phone: '', email: '', notes: '' }],
    generalNotes: '',
  });

  // Simple Modal for Companies & Locations
  const [isSimpleModalOpen, setIsSimpleModalOpen] = useState(false);
  const [simpleModalMode, setSimpleModalMode] = useState<'create' | 'edit'>('create');
  const [simpleForm, setSimpleForm] = useState({
    id: '',
    name: '',
    building: '',
    floor: '',
    oldName: '',
  });

  // ESC key listener to close active modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isCategoryModalOpen) setIsCategoryModalOpen(false);
        else if (isVendorModalOpen) setIsVendorModalOpen(false);
        else if (isSimpleModalOpen) setIsSimpleModalOpen(false);
        else if (isDeptModalOpen) setIsDeptModalOpen(false);
        else if (isSubDeptModalOpen) setIsSubDeptModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCategoryModalOpen, isVendorModalOpen, isSimpleModalOpen, isDeptModalOpen, isSubDeptModalOpen]);

  // Load all data
  const loadAllData = async () => {
    setLoading(true);
    try {
      const [catRes, licRes, svcRes, vendRes, compRes, locRes, ouRes] = await Promise.all([
        fetch('/api/categories').then((r) => r.json()).catch(() => ({ data: [] })),
        fetch('/api/categories/license').then((r) => r.json()).catch(() => ({ data: [] })),
        fetch('/api/categories/service').then((r) => r.json()).catch(() => ({ data: [] })),
        fetch('/api/vendors').then((r) => r.json()).catch(() => ({ data: [] })),
        fetch('/api/companies').then((r) => r.json()).catch(() => ({ data: [] })),
        fetch('/api/locations').then((r) => r.json()).catch(() => ({ data: [] })),
        fetch('/api/companies/ou').then((r) => r.json()).catch(() => ({ data: [] })),
      ]);

      if (catRes.data) setAssetCategories(catRes.data);
      if (licRes.data) setLicenseCategories(licRes.data);
      if (svcRes.data) setServiceCategories(svcRes.data);
      if (vendRes.data) setVendors(vendRes.data);
      if (compRes.data) setCompanies(compRes.data);
      if (locRes.data) setLocations(locRes.data);
      if (ouRes.data) setOuTree(ouRes.data);
    } catch (e) {
      console.error('Load categories error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Upload Custom Icon Handler
  const handleUploadIcon = async (file: File) => {
    setIsUploading(true);
    try {
      const uploadData = new FormData();
      uploadData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: uploadData,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setCategoryForm((prev) => ({ ...prev, icon: data.url }));
      } else {
        alert(data.error || 'Tải ảnh icon thất bại');
      }
    } catch {
      alert('Lỗi kết nối khi tải ảnh icon');
    } finally {
      setIsUploading(false);
    }
  };

  // Custom Field Management Handlers
  const handleAddCustomField = () => {
    if (!newField.label.trim()) {
      alert('Vui lòng nhập Tên trường thông số (VD: Dung lượng RAM, CPU, Phiên bản, Gói cước...)');
      return;
    }

    let key = newField.key.trim();
    if (!key) {
      key = newField.label
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/(^_|_$)/g, '');
    }

    const options =
      newField.type === 'select'
        ? newFieldOptionsText
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;

    const fieldToAdd: CustomFieldDef = {
      key,
      label: newField.label.trim(),
      type: newField.type,
      placeholder: newField.placeholder?.trim() || undefined,
      required: newField.required || false,
      options,
    };

    setCategoryForm((prev) => ({
      ...prev,
      customFields: [...prev.customFields, fieldToAdd],
    }));

    setNewField({
      key: '',
      label: '',
      type: 'text',
      placeholder: '',
      required: false,
      options: [],
    });
    setNewFieldOptionsText('');
  };

  const handleRemoveCustomField = (index: number) => {
    setCategoryForm((prev) => ({
      ...prev,
      customFields: prev.customFields.filter((_, i) => i !== index),
    }));
    if (editingFieldIndex === index) {
      setEditingFieldIndex(null);
    }
  };

  const handleStartEditField = (index: number) => {
    const f = categoryForm.customFields[index];
    setEditingFieldIndex(index);
    setEditingFieldData({ ...f });
    setEditingFieldOptionsText(f.options ? f.options.join(', ') : '');
  };

  const handleSaveEditField = () => {
    if (editingFieldIndex === null) return;
    if (!editingFieldData.label.trim()) {
      alert('Tên trường không được để trống');
      return;
    }

    let key = editingFieldData.key.trim();
    if (!key) {
      key = editingFieldData.label
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/(^_|_$)/g, '');
    }

    const options =
      editingFieldData.type === 'select'
        ? editingFieldOptionsText
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;

    const updatedField: CustomFieldDef = {
      ...editingFieldData,
      key,
      label: editingFieldData.label.trim(),
      placeholder: editingFieldData.placeholder?.trim() || undefined,
      options,
    };

    setCategoryForm((prev) => ({
      ...prev,
      customFields: prev.customFields.map((f, i) => (i === editingFieldIndex ? updatedField : f)),
    }));

    setEditingFieldIndex(null);
  };

  // Open Add Modal Handler
  const handleOpenAdd = () => {
    if (activeTab === 'assets' || activeTab === 'licenses' || activeTab === 'services') {
      let defaultIcon = '💻';
      if (activeTab === 'licenses') defaultIcon = '🔑';
      if (activeTab === 'services') defaultIcon = '🌐';

      setCategoryForm({
        name: '',
        icon: defaultIcon,
        description: '',
        customFields: [],
      });
      setNewField({ key: '', label: '', type: 'text', placeholder: '', required: false });
      setNewFieldOptionsText('');
      setEditingFieldIndex(null);
      setEditingCategoryId(null);
      setCategoryModalMode('create');
      setIsCategoryModalOpen(true);
    } else if (activeTab === 'vendors') {
      setVendorForm({
        id: '',
        name: '',
        contacts: [
          { name: '', role: 'Phụ trách Kinh doanh / AM', phone: '', email: '', notes: '' },
          { name: '', role: 'Hỗ trợ Kỹ thuật 24/7', phone: '', email: '', notes: '' },
        ],
        generalNotes: '',
      });
      setVendorModalMode('create');
      setIsVendorModalOpen(true);
    } else {
      setSimpleForm({
        id: '',
        name: '',
        building: '',
        floor: '',
        oldName: '',
      });
      setSimpleModalMode('create');
      setIsSimpleModalOpen(true);
    }
  };

  // Open Edit for Assets, Licenses, Services
  const handleOpenEditCategory = (cat: any) => {
    setEditingCategoryId(cat.id);
    setCategoryForm({
      name: cat.name,
      icon: cat.icon || (activeTab === 'assets' ? '💻' : activeTab === 'licenses' ? '🔑' : '🌐'),
      description: cat.description || '',
      serviceType: cat.serviceType || undefined,
      customFields: Array.isArray(cat.customFields) ? cat.customFields : [],
    });
    setNewField({ key: '', label: '', type: 'text', placeholder: '', required: false });
    setNewFieldOptionsText('');
    setEditingFieldIndex(null);
    setCategoryModalMode('edit');
    setIsCategoryModalOpen(true);
  };

  // Open Edit for Vendor
  const handleOpenEditVendor = (v: any) => {
    let contactsList: VendorContact[] = Array.isArray(v.contacts) && v.contacts.length > 0 ? v.contacts : [];
    if (contactsList.length === 0) {
      if (v.contactPerson || v.phone || v.email) {
        contactsList = [
          {
            name: v.contactPerson || 'Đầu mối liên hệ',
            role: 'Đầu mối chính',
            phone: v.phone || '',
            email: v.email || '',
            notes: '',
          },
        ];
      } else {
        contactsList = [{ name: '', role: '', phone: '', email: '', notes: '' }];
      }
    }

    setVendorForm({
      id: v.id,
      name: v.name,
      contacts: contactsList,
      generalNotes: v.generalNotes || '',
    });
    setVendorModalMode('edit');
    setIsVendorModalOpen(true);
  };

  // Vendor Contact Sub-handlers
  const handleAddVendorContactRow = () => {
    setVendorForm((prev) => ({
      ...prev,
      contacts: [...prev.contacts, { name: '', role: '', phone: '', email: '', notes: '' }],
    }));
  };

  const handleRemoveVendorContactRow = (index: number) => {
    setVendorForm((prev) => ({
      ...prev,
      contacts: prev.contacts.filter((_, i) => i !== index),
    }));
  };

  const handleVendorContactFieldChange = (index: number, field: keyof VendorContact, value: string) => {
    setVendorForm((prev) => ({
      ...prev,
      contacts: prev.contacts.map((c, i) => (i === index ? { ...c, [field]: value } : c)),
    }));
  };

  const handleSaveVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorForm.name.trim()) {
      alert('Vui lòng nhập tên đối tác / nhà cung cấp');
      return;
    }

    const filteredContacts = vendorForm.contacts.filter(
      (c) => c.name.trim() || c.phone?.trim() || c.email?.trim() || c.role?.trim()
    );

    try {
      const url = vendorModalMode === 'create' ? '/api/vendors' : `/api/vendors/${vendorForm.id}`;
      const method = vendorModalMode === 'create' ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: vendorForm.name.trim(),
          contacts: filteredContacts,
          generalNotes: vendorForm.generalNotes,
        }),
      });

      if (res.ok) {
        setIsVendorModalOpen(false);
        loadAllData();
      } else {
        const data = await res.json();
        alert(data.error || 'Lưu đối tác thất bại');
      }
    } catch (err) {
      console.error('Save vendor error:', err);
      alert('Lỗi kết nối khi lưu đối tác');
    }
  };

  // Save Category for Assets, Licenses, Services
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) {
      alert('Vui lòng nhập tên danh mục');
      return;
    }

    try {
      let url = '/api/categories';
      if (activeTab === 'licenses') {
        url = '/api/categories/license';
      } else if (activeTab === 'services') {
        url = '/api/categories/service';
      }

      if (categoryModalMode === 'edit') {
        if (activeTab === 'assets') {
          url = `/api/categories/${editingCategoryId}`;
        }
      }

      const method = categoryModalMode === 'edit' && activeTab === 'assets' ? 'PUT' : categoryModalMode === 'edit' ? 'PUT' : 'POST';

      const payload =
        categoryModalMode === 'edit' && (activeTab === 'licenses' || activeTab === 'services')
          ? { id: editingCategoryId, ...categoryForm }
          : categoryForm;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsCategoryModalOpen(false);
        setEditingCategoryId(null);
        loadAllData();
      } else {
        const data = await res.json();
        alert(data.error || 'Lưu danh mục thất bại');
      }
    } catch (err) {
      console.error('Save category error:', err);
      alert('Lỗi kết nối khi lưu danh mục');
    }
  };

  const handleDeleteCategory = async (cat: any) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa danh mục "${cat.name}" không?`)) return;

    // 0ms Optimistic removal
    if (activeTab === 'licenses') {
      setLicenseCategories((prev: any[]) => prev.filter((c: any) => c.id !== cat.id));
    } else if (activeTab === 'services') {
      setServiceCategories((prev: any[]) => prev.filter((c: any) => c.id !== cat.id));
    } else {
      setAssetCategories((prev: any[]) => prev.filter((c: any) => c.id !== cat.id));
    }

    try {
      let url = `/api/categories/${cat.id}`;
      if (activeTab === 'licenses') {
        url = `/api/categories/license?id=${cat.id}`;
      } else if (activeTab === 'services') {
        url = `/api/categories/service?id=${cat.id}`;
      }

      const res = await fetch(url, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        invalidateClientCache('/api/categories');
        invalidateClientCache('/api/master-data');
        invalidateClientCache('/api/trash');
        triggerDataRefresh('master-data');
        triggerDataRefresh('categories');
        triggerDataRefresh('trash');

        if (data.trashItemId) {
          showTrashUndoToast({
            name: cat.name || (isEn ? 'Category' : 'Danh mục'),
            code: cat.icon || '🏷️',
            trashItemId: data.trashItemId,
            onUndo: async () => {
              await loadAllData();
            },
          });
        }
      } else {
        alert(data.error || (isEn ? 'Failed to delete category' : 'Xóa danh mục thất bại'));
      }
      await loadAllData();
    } catch (err) {
      console.error('Delete category error:', err);
      await loadAllData();
    }
  };

  // Simple CRUD for Companies & Locations
  const handleOpenEditSimple = (item: any) => {
    if (activeTab === 'companies') {
      setSimpleForm({
        id: item,
        name: item,
        building: '',
        floor: '',
        oldName: item,
      });
    } else {
      setSimpleForm({
        id: item.id,
        name: item.name,
        building: item.building || '',
        floor: item.floor || '',
        oldName: item.name,
      });
    }
    setSimpleModalMode('edit');
    setIsSimpleModalOpen(true);
  };

  const handleSaveSimple = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simpleForm.name.trim()) {
      alert('Vui lòng nhập tên');
      return;
    }

    try {
      if (activeTab === 'companies') {
        const url = '/api/companies';
        const method = simpleModalMode === 'create' ? 'POST' : 'PUT';
        await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: simpleForm.name,
            oldName: simpleForm.oldName,
            newName: simpleForm.name,
          }),
        });
      } else if (activeTab === 'locations') {
        const url = simpleModalMode === 'create' ? '/api/locations' : `/api/locations/${simpleForm.id}`;
        const method = simpleModalMode === 'create' ? 'POST' : 'PUT';
        await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: simpleForm.name,
            building: simpleForm.building,
            floor: simpleForm.floor,
          }),
        });
      }

      invalidateClientCache('/api/master-data');
      triggerDataRefresh('master-data');
      setIsSimpleModalOpen(false);
      loadAllData();
    } catch (err) {
      console.error('Save simple error:', err);
      alert('Lưu thất bại');
    }
  };

  const handleDeleteSimple = async (item: any) => {
    const itemName = activeTab === 'companies' ? item : item.name;
    if (!confirm(`Bạn có chắc chắn muốn xóa "${itemName}" không?`)) return;

    // 0ms Optimistic removal
    if (activeTab === 'vendors') {
      setVendors((prev) => prev.filter((v) => v.id !== item.id));
    } else if (activeTab === 'companies') {
      setCompanies((prev) => prev.filter((c) => c !== item));
    } else if (activeTab === 'locations') {
      setLocations((prev) => prev.filter((l) => l.id !== item.id));
    }

    try {
      let res: Response | null = null;
      let data: any = null;
      if (activeTab === 'vendors') {
        res = await fetch(`/api/vendors/${item.id}`, { method: 'DELETE' });
        data = await res.json().catch(() => ({}));
      } else if (activeTab === 'companies') {
        res = await fetch(`/api/companies?name=${encodeURIComponent(item)}`, { method: 'DELETE' });
        data = await res.json().catch(() => ({}));
      } else if (activeTab === 'locations') {
        res = await fetch(`/api/locations/${item.id}`, { method: 'DELETE' });
        data = await res.json().catch(() => ({}));
      }
      if (res && !res.ok) {
        alert(data?.error || data?.message || (isEn ? 'Failed to delete' : 'Xóa thất bại'));
      } else if (data?.trashItemId) {
        invalidateClientCache('/api/trash');
        triggerDataRefresh('trash');
        showTrashUndoToast({
          name: item.name || item,
          code: '🏢',
          trashItemId: data.trashItemId,
          onUndo: async () => {
            await loadAllData();
          },
        });
      }
      invalidateClientCache('/api/master-data');
      triggerDataRefresh('master-data');
      await loadAllData();
    } catch (err) {
      console.error('Delete simple error:', err);
      alert(isEn ? 'Network error while deleting' : 'Lỗi kết nối khi xóa dữ liệu');
      await loadAllData();
    }
  };

  // OU Tree Handlers
  const toggleCompanyExpand = (compName: string) => {
    setExpandedCompanies((prev) => ({ ...prev, [compName]: !prev[compName] }));
  };

  const toggleDeptExpand = (key: string) => {
    setExpandedDepartments((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleOpenAddDept = (compName: string) => {
    setDeptModalCompany(compName);
    setDeptModalMode('create');
    setDeptForm({ name: '', code: '', icon: '📁', description: '' });
    setIsDeptModalOpen(true);
  };

  const handleOpenEditDept = (compName: string, dept: DepartmentNode) => {
    setDeptModalCompany(compName);
    setDeptModalOldName(dept.name);
    setDeptModalMode('edit');
    setDeptForm({
      name: dept.name,
      code: dept.code || '',
      icon: dept.icon || '📁',
      description: dept.description || '',
    });
    setIsDeptModalOpen(true);
  };

  const handleSaveDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptForm.name.trim()) {
      alert(isEn ? 'Department name is required' : 'Vui lòng nhập tên phòng ban');
      return;
    }
    try {
      const res = await fetch('/api/companies/ou', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: deptModalMode === 'create' ? 'ADD_DEPARTMENT' : 'EDIT_DEPARTMENT',
          companyName: deptModalCompany,
          name: deptForm.name.trim(),
          oldName: deptModalOldName,
          newName: deptForm.name.trim(),
          code: deptForm.code.trim(),
          icon: deptForm.icon,
          description: deptForm.description.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsDeptModalOpen(false);
        setExpandedCompanies((prev) => ({ ...prev, [deptModalCompany]: true }));
        invalidateClientCache('/api/master-data');
        triggerDataRefresh('master-data');
        await loadAllData();
      } else {
        alert(data.error || (isEn ? 'Operation failed' : 'Thao tác phòng ban thất bại'));
      }
    } catch {
      alert(isEn ? 'Network error saving department' : 'Lỗi kết nối khi lưu phòng ban');
    }
  };

  const handleDeleteDept = async (compName: string, deptName: string) => {
    if (!confirm(isEn ? `Are you sure you want to delete department "${deptName}" from "${compName}"?` : `Bạn có chắc muốn xóa phòng ban "${deptName}" khỏi "${compName}"?`)) return;
    try {
      const res = await fetch('/api/companies/ou', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'DELETE_DEPARTMENT',
          companyName: compName,
          name: deptName,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        invalidateClientCache('/api/master-data');
        triggerDataRefresh('master-data');
        await loadAllData();
      } else if (data.requiresForce) {
        if (confirm(`${data.error}\n\n${isEn ? 'Do you want to force delete?' : 'Bạn có muốn cưỡng chế xóa không?'}`)) {
          const forceRes = await fetch('/api/companies/ou', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'DELETE_DEPARTMENT',
              companyName: compName,
              name: deptName,
              force: true,
            }),
          });
          if (forceRes.ok) {
            invalidateClientCache('/api/master-data');
            triggerDataRefresh('master-data');
            await loadAllData();
          } else {
            const fData = await forceRes.json();
            alert(fData.error || (isEn ? 'Delete department failed' : 'Xóa phòng ban thất bại'));
          }
        }
      } else {
        alert(data.error || (isEn ? 'Delete department failed' : 'Xóa phòng ban thất bại'));
      }
    } catch {
      alert(isEn ? 'Network error deleting department' : 'Lỗi kết nối khi xóa phòng ban');
    }
  };

  const handleOpenAddSubDept = (compName: string, deptName: string) => {
    setSubDeptModalCompany(compName);
    setSubDeptModalDept(deptName);
    setSubDeptModalMode('create');
    setSubDeptForm({ name: '', code: '', description: '' });
    setIsSubDeptModalOpen(true);
  };

  const handleOpenEditSubDept = (compName: string, deptName: string, sub: SubDepartmentNode) => {
    setSubDeptModalCompany(compName);
    setSubDeptModalDept(deptName);
    setSubDeptModalOldName(sub.name);
    setSubDeptModalMode('edit');
    setSubDeptForm({
      name: sub.name,
      code: sub.code || '',
      description: sub.description || '',
    });
    setIsSubDeptModalOpen(true);
  };

  const handleSaveSubDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subDeptForm.name.trim()) {
      alert(isEn ? 'Sub-department name is required' : 'Vui lòng nhập tên bộ phận con');
      return;
    }
    try {
      const res = await fetch('/api/companies/ou', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: subDeptModalMode === 'create' ? 'ADD_SUB_DEPARTMENT' : 'EDIT_SUB_DEPARTMENT',
          companyName: subDeptModalCompany,
          departmentName: subDeptModalDept,
          name: subDeptForm.name.trim(),
          oldName: subDeptModalOldName,
          newName: subDeptForm.name.trim(),
          code: subDeptForm.code.trim(),
          description: subDeptForm.description.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsSubDeptModalOpen(false);
        setExpandedCompanies((prev) => ({ ...prev, [subDeptModalCompany]: true }));
        setExpandedDepartments((prev) => ({ ...prev, [`${subDeptModalCompany}-${subDeptModalDept}`]: true }));
        invalidateClientCache('/api/master-data');
        triggerDataRefresh('master-data');
        await loadAllData();
      } else {
        alert(data.error || (isEn ? 'Operation failed' : 'Thao tác bộ phận thất bại'));
      }
    } catch {
      alert(isEn ? 'Network error saving sub-department' : 'Lỗi kết nối khi lưu bộ phận');
    }
  };

  const handleDeleteSubDept = async (compName: string, deptName: string, subName: string) => {
    if (!confirm(isEn ? `Are you sure you want to delete sub-department "${subName}" from "${deptName}"?` : `Bạn có chắc muốn xóa bộ phận "${subName}" khỏi phòng ban "${deptName}"?`)) return;
    try {
      const res = await fetch('/api/companies/ou', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'DELETE_SUB_DEPARTMENT',
          companyName: compName,
          departmentName: deptName,
          name: subName,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        invalidateClientCache('/api/master-data');
        triggerDataRefresh('master-data');
        await loadAllData();
      } else if (data.requiresForce) {
        if (confirm(`${data.error}\n\n${isEn ? 'Do you want to force delete?' : 'Bạn có muốn cưỡng chế xóa không?'}`)) {
          const forceRes = await fetch('/api/companies/ou', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'DELETE_SUB_DEPARTMENT',
              companyName: compName,
              departmentName: deptName,
              name: subName,
              force: true,
            }),
          });
          if (forceRes.ok) {
            invalidateClientCache('/api/master-data');
            triggerDataRefresh('master-data');
            await loadAllData();
          } else {
            const fData = await forceRes.json();
            alert(fData.error || (isEn ? 'Delete sub-department failed' : 'Xóa bộ phận thất bại'));
          }
        }
      } else {
        alert(data.error || (isEn ? 'Delete sub-department failed' : 'Xóa bộ phận thất bại'));
      }
    } catch {
      alert(isEn ? 'Network error deleting sub-department' : 'Lỗi kết nối khi xóa bộ phận');
    }
  };

  const handleApplyDefaultTemplate = async (compName: string) => {
    if (!confirm(isEn ? `Apply default corporate department template for "${compName}"?` : `Áp dụng bộ cơ cấu phòng ban chuẩn (IT, Giám Đốc, Kế Toán, Kinh Doanh, Nhân Sự, Sản Xuất...) cho "${compName}"?`)) return;
    try {
      const res = await fetch('/api/companies/ou', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'APPLY_DEFAULT_TEMPLATE',
          companyName: compName,
        }),
      });
      if (res.ok) {
        setExpandedCompanies((prev) => ({ ...prev, [compName]: true }));
        invalidateClientCache('/api/master-data');
        triggerDataRefresh('master-data');
        await loadAllData();
      }
    } catch {
      alert(isEn ? 'Network error applying template' : 'Lỗi kết nối khi áp dụng mẫu');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="p-2 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-2xl shadow-xs">
              <Layers className="w-5 h-5" />
            </span>
            <span>{isEn ? 'Categories & Organization Taxonomy' : 'Quản Lý Hệ Thống Danh Mục (Categories)'}</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {isEn ? 'Organize hardware groups, licenses, IT services, vendor directory & custom attribute schemas' : 'Phân chia các nhóm thiết bị, license, dịch vụ IT, danh bạ đầu mối đối tác & thiết lập trường thông số'}
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>
            {activeTab === 'assets' && (isEn ? '+ Add Asset Category' : 'Thêm Danh Mục Thiết Bị')}
            {activeTab === 'licenses' && (isEn ? '+ Add License Category' : 'Thêm Danh Mục License')}
            {activeTab === 'services' && (isEn ? '+ Add Service Category' : 'Thêm Danh Mục Dịch Vụ')}
            {activeTab === 'vendors' && (isEn ? '+ Add Vendor / Partner' : 'Thêm Đối Tác / Nhà Cung Cấp')}
            {activeTab === 'companies' && (isEn ? '+ Add Corporate Entity' : 'Thêm Công Ty / Chi Nhánh')}
            {activeTab === 'locations' && (isEn ? '+ Add Location / Branch' : 'Thêm Vị Trí / Phòng Ban')}
          </span>
        </button>
      </div>

      {/* Navigation Segmented Tabs (Buttons) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('assets')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'assets'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Laptop className="w-4 h-4" />
          <span>{isEn ? 'Asset Categories' : 'Danh Mục Thiết Bị'} ({assetCategories.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('licenses')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'licenses'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>{isEn ? 'License Categories' : 'Danh Mục License'} ({licenseCategories.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('services')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'services'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>{isEn ? 'IT Service Categories' : 'Danh Mục Dịch Vụ IT'} ({serviceCategories.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('vendors')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'vendors'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Handshake className="w-4 h-4" />
          <span>{isEn ? 'Vendors & Partners' : 'Đối Tác / Nhà Cung Cấp'} ({vendors.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('companies')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'companies'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>{isEn ? 'Corporate Entities' : 'Công Ty Thành Viên'} ({companies.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('locations')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'locations'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>{isEn ? 'Locations & Branches' : 'Vị Trí & Phòng Ban'} ({locations.length})</span>
        </button>
      </div>

      {/* Search Filter Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        <input
          type="text"
          placeholder={isEn ? "Quick search categories..." : "Tìm kiếm danh mục nhanh..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium shadow-2xs"
        />
      </div>

      {/* Content Rendering By Tab */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500 flex items-center justify-center space-x-2">
          <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
          <span>{isEn ? 'Loading category data...' : 'Đang tải dữ liệu danh mục...'}</span>
        </div>
      ) : (
        <div>
          {/* TAB 1: ASSET CATEGORIES */}
          {activeTab === 'assets' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assetCategories
                .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
                .map((cat) => (
                  <div
                    key={cat.id}
                    className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-3.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50/80 border border-blue-100 flex items-center justify-center text-2xl shrink-0 shadow-inner overflow-hidden">
                          {renderCategoryIcon(cat.icon, 'w-8 h-8')}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm leading-snug">{cat.name}</h3>
                          <p className="text-[11px] text-slate-500 font-medium">
                            {cat._count?.assets || 0} {isEn ? 'devices in use' : 'thiết bị đang sử dụng'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditCategory(cat)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Chỉnh sửa danh mục & trường thông số"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Xóa danh mục"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {cat.description && (
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{cat.description}</p>
                    )}

                    {/* Custom Specs Preview & Action */}
                    <div className="pt-3 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700 flex items-center gap-1.5">
                          <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{isEn ? 'Attributes' : 'Trường thông số'} ({cat.customFields?.length || 0})</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenEditCategory(cat)}
                          className="text-indigo-600 hover:underline font-bold text-[11px] cursor-pointer"
                        >
                          {isEn ? 'Configure →' : 'Chỉnh sửa →'}
                        </button>
                      </div>

                      {cat.customFields && cat.customFields.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {cat.customFields.map((f: CustomFieldDef, idx: number) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200/80 px-2 py-0.5 rounded-lg text-[11px] font-semibold text-slate-700"
                            >
                              <span>{f.label}</span>
                              <span className="text-[9px] text-slate-400 font-mono">({f.type})</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic">{isEn ? 'No custom attributes set (Click to configure)' : 'Chưa cấu hình trường riêng (Bấm để thêm)'}</p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* TAB 2: LICENSE CATEGORIES WITH FULL SPECS */}
          {activeTab === 'licenses' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {licenseCategories
                .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
                .map((cat) => (
                  <div
                    key={cat.id}
                    className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-3.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50/80 border border-indigo-100 flex items-center justify-center text-2xl shrink-0 shadow-inner overflow-hidden">
                          {renderCategoryIcon(cat.icon, 'w-8 h-8')}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm leading-snug">{cat.name}</h3>
                          <p className="text-[11px] text-indigo-600 font-bold">
                            {cat.count || 0} {isEn ? 'licenses in use' : 'License đang sử dụng'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditCategory(cat)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          title="Chỉnh sửa danh mục & trường thông số"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Xóa danh mục"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {cat.description && (
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{cat.description}</p>
                    )}

                    {/* Custom Specs Preview & Action for License */}
                    <div className="pt-3 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700 flex items-center gap-1.5">
                          <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Trường thông số ({cat.customFields?.length || 0})</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenEditCategory(cat)}
                          className="text-indigo-600 hover:underline font-bold text-[11px] cursor-pointer"
                        >
                          {isEn ? 'Configure →' : 'Chỉnh sửa →'}
                        </button>
                      </div>

                      {cat.customFields && cat.customFields.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {cat.customFields.map((f: CustomFieldDef, idx: number) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 bg-indigo-50/70 border border-indigo-200/80 px-2 py-0.5 rounded-lg text-[11px] font-semibold text-indigo-900"
                            >
                              <span>{f.label}</span>
                              <span className="text-[9px] text-indigo-400 font-mono">({f.type})</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic">{isEn ? 'No custom attributes set (Click to configure)' : 'Chưa cấu hình trường riêng (Bấm để thêm)'}</p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* TAB 3: SERVICE CATEGORIES WITH FULL SPECS */}
          {activeTab === 'services' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {serviceCategories
                .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
                .map((cat) => (
                  <div
                    key={cat.id}
                    className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-3.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-purple-50/80 border border-purple-100 flex items-center justify-center text-2xl shrink-0 shadow-inner overflow-hidden">
                          {renderCategoryIcon(cat.icon, 'w-8 h-8')}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm leading-snug">{cat.name}</h3>
                          <p className="text-[11px] text-purple-600 font-bold">
                            {cat.count || 0} {isEn ? 'active services' : 'Dịch vụ đang hoạt động'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditCategory(cat)}
                          className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                          title="Chỉnh sửa danh mục & trường thông số"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Xóa danh mục"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {cat.description && (
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{cat.description}</p>
                    )}

                    {/* Custom Specs Preview & Action for Service */}
                    <div className="pt-3 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700 flex items-center gap-1.5">
                          <Sliders className="w-3.5 h-3.5 text-purple-600" />
                          <span>Trường thông số ({cat.customFields?.length || 0})</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenEditCategory(cat)}
                          className="text-purple-600 hover:underline font-bold text-[11px] cursor-pointer"
                        >
                          {isEn ? 'Configure →' : 'Chỉnh sửa →'}
                        </button>
                      </div>

                      {cat.customFields && cat.customFields.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {cat.customFields.map((f: CustomFieldDef, idx: number) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 bg-purple-50/70 border border-purple-200/80 px-2 py-0.5 rounded-lg text-[11px] font-semibold text-purple-900"
                            >
                              <span>{f.label}</span>
                              <span className="text-[9px] text-purple-400 font-mono">({f.type})</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic">{isEn ? 'No custom attributes set (Click to configure)' : 'Chưa cấu hình trường riêng (Bấm để thêm)'}</p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* TAB 4: VENDORS WITH MULTI-CONTACT PERSONS */}
          {activeTab === 'vendors' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vendors
                .filter((v) => v.name.toLowerCase().includes(search.toLowerCase()))
                .map((v) => {
                  const contacts: VendorContact[] =
                    Array.isArray(v.contacts) && v.contacts.length > 0
                      ? v.contacts
                      : v.contactPerson || v.phone || v.email
                      ? [{ name: v.contactPerson || 'Đầu mối liên hệ', role: 'Đầu mối chính', phone: v.phone || '', email: v.email || '' }]
                      : [];

                  return (
                    <div
                      key={v.id}
                      className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-3.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-50/80 border border-emerald-100 flex items-center justify-center text-2xl shrink-0 shadow-inner">
                            🏢
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 text-sm leading-snug">{v.name}</h3>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded inline-block mt-0.5">
                              {contacts.length} {isEn ? 'contacts' : 'đầu mối liên hệ'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditVendor(v)}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title="Sửa đối tác & người liên hệ"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSimple(v)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Xóa đối tác"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Contact Persons List */}
                      <div className="space-y-2 pt-1 border-t border-slate-100">
                        {contacts.length === 0 ? (
                          <p className="text-[11px] text-slate-400 italic">{isEn ? 'No contact persons listed' : 'Chưa có thông tin đầu mối liên hệ'}</p>
                        ) : (
                          contacts.map((c, idx) => (
                            <div
                              key={idx}
                              className="p-2.5 bg-slate-50/80 border border-slate-200/70 rounded-xl space-y-1 text-xs"
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-bold text-slate-900 flex items-center gap-1.5 text-[11px]">
                                  <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[9px] font-bold shrink-0">
                                    👤
                                  </span>
                                  <span className="truncate">{c.name || 'Người liên hệ'}</span>
                                </span>
                                {c.role && (
                                  <span className="text-[9px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 rounded shrink-0">
                                    {c.role}
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600 font-mono pt-0.5">
                                {c.phone && (
                                  <a
                                    href={`tel:${c.phone}`}
                                    className="flex items-center gap-1 text-slate-700 hover:text-emerald-600 font-medium"
                                  >
                                    <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                                    <span>{c.phone}</span>
                                  </a>
                                )}
                                {c.email && (
                                  <a
                                    href={`mailto:${c.email}`}
                                    className="flex items-center gap-1 text-slate-700 hover:text-blue-600 font-medium"
                                  >
                                    <Mail className="w-3 h-3 text-blue-600 shrink-0" />
                                    <span className="truncate">{c.email}</span>
                                  </a>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {v.generalNotes && (
                        <p className="text-[11px] text-slate-500 italic line-clamp-1 border-t border-slate-100 pt-1">
                          {v.generalNotes}
                        </p>
                      )}
                    </div>
                  );
                })}
            </div>
          )}

          {/* TAB 5: COMPANIES & OU HIERARCHY TREE */}
          {activeTab === 'companies' && (
            <div className="space-y-4">
              {/* OU Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-amber-50/60 border border-amber-200/80 rounded-2xl text-xs">
                <div className="flex items-center gap-2 text-amber-950 font-bold">
                  <Building2 className="w-4 h-4 text-amber-600" />
                  <span>
                    {isEn
                      ? `Enterprise Structure: ${companies.length} corporate entities`
                      : `Sơ đồ Đơn vị Tổ chức (OU): ${companies.length} công ty thành viên`}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const allExpanded = companies.every((c) => expandedCompanies[c]);
                      const nextState: Record<string, boolean> = {};
                      companies.forEach((c) => {
                        nextState[c] = !allExpanded;
                      });
                      setExpandedCompanies(nextState);
                    }}
                    className="px-3 py-1.5 bg-white border border-amber-300 hover:bg-amber-100/60 text-amber-900 rounded-xl font-bold cursor-pointer transition-colors text-[11px]"
                  >
                    {companies.every((c) => expandedCompanies[c])
                      ? (isEn ? 'Collapse all' : 'Thu gọn tất cả')
                      : (isEn ? 'Expand all OU' : 'Mở rộng tất cả OU')}
                  </button>
                </div>
              </div>

              {/* Companies Grid / Tree */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {(ouTree.length > 0 ? ouTree : companies.map((c) => ({ id: c, name: c, departments: [] as DepartmentNode[], userCount: 0 })))
                  .filter((comp) => {
                    const q = search.toLowerCase();
                    if (!q) return true;
                    if (comp.name.toLowerCase().includes(q)) return true;
                    return comp.departments?.some(
                      (d) =>
                        d.name.toLowerCase().includes(q) ||
                        d.children?.some((sub) => sub.name.toLowerCase().includes(q))
                    );
                  })
                  .map((comp) => {
                    const isCompExpanded = !!expandedCompanies[comp.name];
                    const depts = comp.departments || [];
                    const totalSubDepts = depts.reduce((acc, d) => acc + (d.children?.length || 0), 0);

                    return (
                      <div
                        key={comp.name}
                        className={`bg-white border rounded-2xl transition-all ${
                          isCompExpanded
                            ? 'border-amber-400 shadow-md ring-1 ring-amber-300/40'
                            : 'border-slate-200/90 shadow-2xs hover:shadow-md'
                        }`}
                      >
                        {/* Company Card Header */}
                        <div
                          className="p-4.5 flex items-start justify-between gap-3 cursor-pointer select-none"
                          onClick={() => toggleCompanyExpand(comp.name)}
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="w-11 h-11 rounded-2xl bg-amber-50/90 border border-amber-200 flex items-center justify-center text-xl shrink-0 shadow-inner mt-0.5">
                              🏢
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-bold text-slate-900 text-sm leading-snug truncate hover:text-amber-700 transition-colors">
                                {comp.name}
                              </h3>
                              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                                  {isEn ? 'Corporate Entity' : 'Công ty thành viên'}
                                </span>
                                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                                  <FolderTree className="w-3 h-3 text-indigo-600" />
                                  <span>{depts.length} {isEn ? 'departments' : 'phòng ban'}</span>
                                  {totalSubDepts > 0 && <span>• {totalSubDepts} {isEn ? 'teams' : 'bộ phận'}</span>}
                                </span>
                                <Link
                                  href={`/users?company=${encodeURIComponent(comp.name)}`}
                                  onClick={(e) => e.stopPropagation()}
                                  title={isEn ? 'View employees in this company' : 'Xem danh sách nhân sự công ty này'}
                                  className="text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors"
                                >
                                  <Users className="w-3 h-3 text-blue-600" />
                                  <span>{comp.userCount || 0} {isEn ? 'staff' : 'nhân sự'}</span>
                                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                                </Link>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => handleOpenEditSimple(comp.name)}
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                              title={isEn ? 'Rename company' : 'Đổi tên công ty'}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSimple(comp.name)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title={isEn ? 'Delete company' : 'Xóa công ty'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleCompanyExpand(comp.name)}
                              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                isCompExpanded
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                              }`}
                              title={isCompExpanded ? (isEn ? 'Collapse' : 'Thu gọn') : (isEn ? 'Expand departments' : 'Mở rộng các phòng ban')}
                            >
                              <ChevronDown
                                className={`w-4 h-4 transition-transform duration-200 ${
                                  isCompExpanded ? 'rotate-180' : ''
                                }`}
                              />
                            </button>
                          </div>
                        </div>

                        {/* Collapsible OU Tree Panel */}
                        {isCompExpanded && (
                          <div className="px-4 pb-4 pt-1 border-t border-amber-100 bg-slate-50/50 rounded-b-2xl space-y-3">
                            {/* Panel Header */}
                            <div className="flex items-center justify-between gap-2 pt-2">
                              <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-800">
                                <FolderTree className="w-4 h-4 text-indigo-600" />
                                <span>{isEn ? 'Department Hierarchy (OU)' : 'Cơ cấu Phòng Ban Trực Thuộc'}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {depts.length === 0 && (
                                  <button
                                    type="button"
                                    onClick={() => handleApplyDefaultTemplate(comp.name)}
                                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-2xs cursor-pointer transition-colors"
                                  >
                                    <Sparkles className="w-3 h-3" />
                                    <span>{isEn ? 'Use Standard Template' : 'Áp dụng mẫu chuẩn'}</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleOpenAddDept(comp.name)}
                                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-2xs cursor-pointer transition-colors"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>{isEn ? '+ Add Department' : '+ Thêm phòng ban'}</span>
                                </button>
                              </div>
                            </div>

                            {/* Departments List (Tier 2) */}
                            {depts.length === 0 ? (
                              <div className="p-4 text-center bg-white border border-dashed border-slate-300 rounded-xl text-slate-400 text-xs space-y-1">
                                <p className="font-semibold text-slate-600">{isEn ? 'No departments configured yet' : 'Chưa có phòng ban nào được thiết lập'}</p>
                                <p className="text-[11px] text-slate-400">{isEn ? 'Click "+ Add Department" or "Use Standard Template" to start' : 'Bấm "+ Thêm phòng ban" hoặc "Áp dụng mẫu chuẩn" để tạo nhanh cơ cấu'}</p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {depts.map((dept) => {
                                  const deptKey = `${comp.name}-${dept.name}`;
                                  const isDeptExpanded = !!expandedDepartments[deptKey];
                                  const subCount = dept.children?.length || 0;

                                  return (
                                    <div
                                      key={dept.id || dept.name}
                                      className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-2xs"
                                    >
                                      {/* Department Item Row */}
                                      <div className="p-2.5 flex items-center justify-between gap-2 text-xs hover:bg-slate-50/80 transition-colors">
                                        <div
                                          className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer select-none"
                                          onClick={() => toggleDeptExpand(deptKey)}
                                        >
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              toggleDeptExpand(deptKey);
                                            }}
                                            className="p-1 text-slate-400 hover:text-indigo-600 rounded cursor-pointer"
                                          >
                                            <ChevronRight
                                              className={`w-3.5 h-3.5 transition-transform duration-150 ${
                                                isDeptExpanded ? 'rotate-90 text-indigo-600' : ''
                                              }`}
                                            />
                                          </button>
                                          <span className="text-base shrink-0">{dept.icon || '📁'}</span>
                                          <div className="min-w-0">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              <span className="font-bold text-slate-900 text-xs truncate">
                                                {dept.name}
                                              </span>
                                              {dept.code && (
                                                <span className="px-1.5 py-0.2 bg-slate-100 border border-slate-200 rounded text-[9px] font-mono text-slate-600 font-bold">
                                                  {dept.code}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                          {/* Sĩ số nhân viên */}
                                          <Link
                                            href={`/users?company=${encodeURIComponent(comp.name)}&dept=${encodeURIComponent(dept.name)}`}
                                            title={isEn ? 'View staff in this department' : 'Xem nhân viên thuộc phòng ban này'}
                                            className="px-2 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold border border-blue-200/80 flex items-center gap-1 transition-colors"
                                          >
                                            <User className="w-2.5 h-2.5" />
                                            <span>{dept.userCount || 0} {isEn ? 'staff' : 'nhân sự'}</span>
                                          </Link>

                                          {/* Badge sub count */}
                                          <span
                                            onClick={() => toggleDeptExpand(deptKey)}
                                            className="px-1.5 py-0.5 rounded text-[10px] font-medium text-slate-500 bg-slate-100 cursor-pointer hover:bg-slate-200"
                                          >
                                            {subCount} {isEn ? 'teams' : 'nhóm con'}
                                          </span>

                                          {/* Action Buttons */}
                                          <button
                                            type="button"
                                            onClick={() => handleOpenAddSubDept(comp.name, dept.name)}
                                            className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                                            title={isEn ? 'Add sub-department / team' : 'Thêm bộ phận / tổ trực thuộc'}
                                          >
                                            <Plus className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleOpenEditDept(comp.name, dept)}
                                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                                            title={isEn ? 'Edit department' : 'Sửa tên / mã phòng ban'}
                                          >
                                            <Edit2 className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteDept(comp.name, dept.name)}
                                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                            title={isEn ? 'Delete department' : 'Xóa phòng ban'}
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>

                                      {/* Sub-departments List (Tier 3) */}
                                      {isDeptExpanded && (
                                        <div className="pl-7 pr-3 py-2 space-y-1.5 border-t border-slate-100 bg-slate-50/60 text-xs">
                                          {subCount === 0 ? (
                                            <p className="text-[11px] text-slate-400 italic py-1">
                                              └── {isEn ? 'No sub-departments. Staff report directly to this main department.' : 'Chưa có bộ phận con. Nhân sự sẽ thuộc trực tiếp phòng ban chính này.'}
                                            </p>
                                          ) : (
                                            dept.children.map((sub) => (
                                              <div
                                                key={sub.id || sub.name}
                                                className="flex items-center justify-between p-1.5 pl-2 bg-white border border-slate-200/80 rounded-lg hover:border-slate-300 transition-colors"
                                              >
                                                <div className="flex items-center gap-2 min-w-0">
                                                  <span className="text-slate-300 font-mono text-xs select-none">└──</span>
                                                  <span className="text-xs">📂</span>
                                                  <span className="font-semibold text-slate-800 text-[11px] truncate">
                                                    {sub.name}
                                                  </span>
                                                  {sub.code && (
                                                    <span className="px-1 py-0.2 bg-purple-50 text-purple-700 text-[9px] font-mono rounded border border-purple-200">
                                                      {sub.code}
                                                    </span>
                                                  )}
                                                </div>

                                                <div className="flex items-center gap-1.5 shrink-0">
                                                  <Link
                                                    href={`/users?company=${encodeURIComponent(comp.name)}&dept=${encodeURIComponent(`${dept.name} / ${sub.name}`)}`}
                                                    title={isEn ? 'View staff in this sub-department' : 'Xem nhân sự thuộc bộ phận này'}
                                                    className="px-1.5 py-0.2 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold border border-slate-200 flex items-center gap-0.5 transition-colors"
                                                  >
                                                    <User className="w-2.5 h-2.5" />
                                                    <span>{sub.userCount || 0}</span>
                                                  </Link>
                                                  <button
                                                    type="button"
                                                    onClick={() => handleOpenEditSubDept(comp.name, dept.name, sub)}
                                                    className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                                                    title={isEn ? 'Edit sub-department' : 'Sửa bộ phận con'}
                                                  >
                                                    <Edit2 className="w-3 h-3" />
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() => handleDeleteSubDept(comp.name, dept.name, sub.name)}
                                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                                    title={isEn ? 'Delete sub-department' : 'Xóa bộ phận con'}
                                                  >
                                                    <Trash2 className="w-3 h-3" />
                                                  </button>
                                                </div>
                                              </div>
                                            ))
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* TAB 6: LOCATIONS */}
          {activeTab === 'locations' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {locations
                .filter((l) => l.name.toLowerCase().includes(search.toLowerCase()))
                .map((loc) => (
                  <div
                    key={loc.id}
                    className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-2xs hover:shadow-md transition-all flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-rose-50/80 border border-rose-100 flex items-center justify-center text-2xl shrink-0 shadow-inner">
                        📍
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm leading-snug">{loc.name}</h3>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {loc.building || ''} {loc.floor ? `• ${loc.floor}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditSimple(loc)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSimple(loc)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* DEDICATED VENDOR MULTI-CONTACT MODAL */}
      {isVendorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[92vh] border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-emerald-50/80">
              <h3 className="font-bold text-sm text-emerald-950 flex items-center gap-2">
                <span>
                  {vendorModalMode === 'create' ? '➕ Thêm Mới: ' : '✏️ Chỉnh Sửa: '} Đối Tác / Nhà Cung Cấp
                </span>
              </h3>
              <button
                onClick={() => setIsVendorModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveVendor} className="p-6 space-y-4 overflow-y-auto text-xs flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tên công ty / Đối tác / Nhà cung cấp (*)</label>
                <input
                  type="text"
                  required
                  placeholder="VD: FPT Smart Cloud & Software, Viettel IDC, Mắt Bão..."
                  value={vendorForm.name}
                  onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
                />
              </div>

              {/* Multi-Contact Person List Section */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-emerald-600" />
                      <span>Danh sách Người liên hệ & Đầu mối KTV ({vendorForm.contacts.length})</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 font-normal mt-0.5">
                      Mỗi người có SĐT & Email riêng biệt (Ví dụ: Chị Hằng - AM, Anh Tuấn - Kỹ thuật 24/7...)
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddVendorContactRow}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm người</span>
                  </button>
                </div>

                <div className="space-y-3 pt-1">
                  {vendorForm.contacts.map((contact, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2 shadow-2xs relative group"
                    >
                      <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                        <span className="text-[11px] font-bold text-emerald-900 flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 text-[10px] flex items-center justify-center font-bold">
                            {idx + 1}
                          </span>
                          <span>Đầu mối liên hệ #{idx + 1}</span>
                        </span>

                        {vendorForm.contacts.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveVendorContactRow(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Xóa đầu mối này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Họ và tên (*)</label>
                          <input
                            type="text"
                            placeholder="VD: Chị Hằng, Anh Tuấn..."
                            value={contact.name}
                            onChange={(e) => handleVendorContactFieldChange(idx, 'name', e.target.value)}
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Chức vụ / Vai trò phụ trách</label>
                          <input
                            type="text"
                            placeholder="VD: Quản lý kinh doanh (AM), Kỹ thuật viên 24/7..."
                            value={contact.role || ''}
                            onChange={(e) => handleVendorContactFieldChange(idx, 'role', e.target.value)}
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Số điện thoại / Hotline riêng</label>
                          <input
                            type="text"
                            placeholder="VD: 0988666888 / 1900xxxx"
                            value={contact.phone || ''}
                            onChange={(e) => handleVendorContactFieldChange(idx, 'phone', e.target.value)}
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Email liên hệ riêng</label>
                          <input
                            type="email"
                            placeholder="VD: hang.fpt@fpt.com"
                            value={contact.email || ''}
                            onChange={(e) => handleVendorContactFieldChange(idx, 'email', e.target.value)}
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú chung về đối tác / Cổng Portal</label>
                <textarea
                  rows={2}
                  placeholder="Mã số thuế, địa chỉ trụ sở, link portal hỗ trợ..."
                  value={vendorForm.generalNotes}
                  onChange={(e) => setVendorForm({ ...vendorForm, generalNotes: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsVendorModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >{isEn ? 'Cancel' : 'Hủy'}</button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  💾 Lưu Đối Tác
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UNIFIED MODAL FOR ASSETS, LICENSES, SERVICES WITH NEAT ICON & FULL-FEATURED SPECS BUILDER */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full flex flex-col max-h-[92vh] border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <span>
                  {categoryModalMode === 'edit' ? '✏️ Chỉnh Sửa ' : '➕ Thêm Mới '}
                  {activeTab === 'assets' && 'Danh Mục Thiết Bị'}
                  {activeTab === 'licenses' && 'Danh Mục License Bản Quyền'}
                  {activeTab === 'services' && 'Danh Mục Dịch Vụ IT & Thuê Bao'}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsCategoryModalOpen(false);
                  setEditingCategoryId(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content Form */}
            <form onSubmit={handleSaveCategory} className="p-6 space-y-4 overflow-y-auto text-xs">
              {/* Row 1: NEAT Icon & Name */}
              <div className="space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                  {/* Icon Section */}
                  <div className="sm:col-span-4 space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700">Icon đại diện</label>
                    <div className="flex items-center gap-2">
                      {/* Icon Preview Box */}
                      <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-300 flex items-center justify-center text-2xl shadow-inner shrink-0 overflow-hidden">
                        {renderCategoryIcon(categoryForm.icon, 'w-8 h-8')}
                      </div>

                      {/* Action: Upload File or type */}
                      <div className="flex flex-col gap-1 flex-1 min-w-0">
                        <input
                          type="file"
                          ref={categoryFileInputRef}
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUploadIcon(file);
                          }}
                        />
                        <button
                          type="button"
                          disabled={isUploading}
                          onClick={() => categoryFileInputRef.current?.click()}
                          className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-[11px] font-semibold text-slate-700 flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-2xs"
                        >
                          <UploadCloud className="w-3.5 h-3.5 text-blue-600" />
                          <span>{isUploading ? 'Đang tải...' : 'Tải ảnh lên'}</span>
                        </button>
                        <input
                          type="text"
                          placeholder="Emoji hoặc link ảnh"
                          value={categoryForm.icon}
                          onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                          className="w-full px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-md text-[10px] outline-none focus:ring-1 focus:ring-blue-500 font-mono text-slate-700"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Category Name Section */}
                  <div className="sm:col-span-8 space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700">Tên danh mục (*)</label>
                    <input
                      type="text"
                      required
                      placeholder={
                        activeTab === 'assets'
                          ? 'VD: Laptop, Máy in, Switch, Màn hình...'
                          : activeTab === 'licenses'
                          ? 'VD: Ứng dụng Văn phòng, Thiết kế Đồ họa, IDE Lập trình...'
                          : 'VD: Đường truyền Internet FTTH, Máy chủ Cloud VPS...'
                      }
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                    />
                  </div>
                </div>

                {/* Quick Emoji Bar */}
                <div className="flex items-center gap-1 overflow-x-auto py-1 border-t border-b border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                    Gợi ý:
                  </span>
                  {POPULAR_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setCategoryForm({ ...categoryForm, icon: emoji })}
                      className={`w-7 h-7 flex items-center justify-center text-sm rounded-lg hover:bg-slate-100 border transition-all cursor-pointer ${
                        categoryForm.icon === emoji ? 'bg-blue-50 border-blue-400 scale-110 shadow-2xs font-bold' : 'border-transparent'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mô tả danh mục</label>
                <textarea
                  rows={2}
                  placeholder="Mô tả phạm vi hoặc các phần mềm / gói dịch vụ tiêu biểu..."
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              {/* FULL-FEATURED SPECS BUILDER SECTION */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <Sliders className="w-4 h-4 text-indigo-600" />
                      <span>Tùy biến các trường thông số kỹ thuật (Custom Specs Fields)</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 font-normal mt-0.5">
                      Thiết lập các trường thuộc tính riêng cho mục thuộc danh mục này khi thêm/sửa dữ liệu
                    </p>
                  </div>
                  <span className="text-[11px] bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold px-2 py-0.5 rounded-lg">
                    {categoryForm.customFields.length} trường
                  </span>
                </div>

                {/* Sub-form to Add New Custom Field */}
                <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-3 shadow-2xs">
                  <div className="text-[11px] font-bold text-indigo-900 flex items-center gap-1">
                    <PlusCircle className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Thêm trường thông số mới vào danh mục:</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    <div className="sm:col-span-4">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Tên trường (*)</label>
                      <input
                        type="text"
                        placeholder={
                          activeTab === 'assets'
                            ? 'VD: Dung lượng RAM, CPU...'
                            : activeTab === 'licenses'
                            ? 'VD: Phiên bản, Gói dịch vụ, HĐH...'
                            : 'VD: Băng thông, IP Tĩnh, SLA...'
                        }
                        value={newField.label}
                        onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Kiểu dữ liệu</label>
                      <select
                        value={newField.type}
                        onChange={(e) => setNewField({ ...newField, type: e.target.value as any })}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                      >
                        <option value="text">Văn bản (text)</option>
                        <option value="number">Số (number)</option>
                        <option value="select">Danh sách (select)</option>
                        <option value="date">Ngày tháng (date)</option>
                        <option value="boolean">Có / Không (boolean)</option>
                      </select>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Gợi ý / Placeholder</label>
                      <input
                        type="text"
                        placeholder="VD: 16GB, E3, 500Mbps..."
                        value={newField.placeholder || ''}
                        onChange={(e) => setNewField({ ...newField, placeholder: e.target.value })}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="sm:col-span-2 flex items-end">
                      <button
                        type="button"
                        onClick={handleAddCustomField}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 shadow-2xs cursor-pointer transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Thêm</span>
                      </button>
                    </div>
                  </div>

                  {/* If select type: options input */}
                  {newField.type === 'select' && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Các tùy chọn danh sách (cách nhau bởi dấu phẩy):
                      </label>
                      <input
                        type="text"
                        placeholder="VD: Gói Basic, Gói Pro, Gói Enterprise..."
                        value={newFieldOptionsText}
                        onChange={(e) => setNewFieldOptionsText(e.target.value)}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-0.5">
                    <input
                      type="checkbox"
                      id="newFieldRequired"
                      checked={newField.required || false}
                      onChange={(e) => setNewField({ ...newField, required: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <label htmlFor="newFieldRequired" className="text-[11px] font-medium text-slate-600 cursor-pointer">
                      Bắt buộc nhập khi thêm dữ liệu
                    </label>
                  </div>
                </div>

                {/* List of Existing Custom Fields */}
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-slate-700">Danh sách trường đã cấu hình:</p>

                  {categoryForm.customFields.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400 bg-white border border-dashed border-slate-200 rounded-xl">
                      Chưa có trường thông số kỹ thuật nào. Hãy nhập ở bảng trên để thêm!
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {categoryForm.customFields.map((field, idx) => {
                        const isEditingThis = editingFieldIndex === idx;

                        if (isEditingThis) {
                          return (
                            <div key={idx} className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2">
                              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                                <div className="sm:col-span-5">
                                  <label className="block text-[10px] font-bold text-amber-900 mb-0.5">Tên trường</label>
                                  <input
                                    type="text"
                                    value={editingFieldData.label}
                                    onChange={(e) => setEditingFieldData({ ...editingFieldData, label: e.target.value })}
                                    className="w-full p-1.5 bg-white border border-amber-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                                  />
                                </div>
                                <div className="sm:col-span-3">
                                  <label className="block text-[10px] font-bold text-amber-900 mb-0.5">Kiểu dữ liệu</label>
                                  <select
                                    value={editingFieldData.type}
                                    onChange={(e) => setEditingFieldData({ ...editingFieldData, type: e.target.value as any })}
                                    className="w-full p-1.5 bg-white border border-amber-300 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                                  >
                                    <option value="text">Văn bản (text)</option>
                                    <option value="number">Số (number)</option>
                                    <option value="select">Danh sách (select)</option>
                                    <option value="date">Ngày tháng (date)</option>
                                    <option value="boolean">Có / Không (boolean)</option>
                                  </select>
                                </div>
                                <div className="sm:col-span-4">
                                  <label className="block text-[10px] font-bold text-amber-900 mb-0.5">Gợi ý / Placeholder</label>
                                  <input
                                    type="text"
                                    value={editingFieldData.placeholder || ''}
                                    onChange={(e) => setEditingFieldData({ ...editingFieldData, placeholder: e.target.value })}
                                    className="w-full p-1.5 bg-white border border-amber-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-amber-500"
                                  />
                                </div>
                              </div>

                              {editingFieldData.type === 'select' && (
                                <div>
                                  <label className="block text-[10px] font-bold text-amber-900 mb-0.5">
                                    Các tùy chọn (cách nhau bởi dấu phẩy):
                                  </label>
                                  <input
                                    type="text"
                                    value={editingFieldOptionsText}
                                    onChange={(e) => setEditingFieldOptionsText(e.target.value)}
                                    className="w-full p-1.5 bg-white border border-amber-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-amber-500"
                                  />
                                </div>
                              )}

                              <div className="flex items-center justify-between pt-1">
                                <label className="flex items-center gap-1.5 text-[11px] text-amber-900 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={editingFieldData.required || false}
                                    onChange={(e) => setEditingFieldData({ ...editingFieldData, required: e.target.checked })}
                                    className="rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                                  />
                                  <span>Bắt buộc nhập</span>
                                </label>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={handleSaveEditField}
                                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                                  >
                                    Lưu
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingFieldIndex(null)}
                                    className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs cursor-pointer"
                                  >{isEn ? 'Cancel' : 'Hủy'}</button>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={idx}
                            className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between hover:bg-slate-50 transition-colors"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                              <span className="w-5 h-5 rounded-md bg-indigo-50 text-indigo-600 text-[11px] font-mono flex items-center justify-center font-bold shrink-0">
                                {idx + 1}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-xs text-slate-900 truncate">{field.label}</span>
                                  <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded border border-slate-200 shrink-0">
                                    {field.type}
                                  </span>
                                  {field.required && (
                                    <span className="text-[9px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded shrink-0">
                                      Bắt buộc
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                                  Mã: {field.key} {field.placeholder ? `• Gợi ý: "${field.placeholder}"` : ''}
                                  {field.options ? ` • Tùy chọn: [${field.options.join(', ')}]` : ''}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleStartEditField(idx)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                title="Sửa trường này"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveCustomField(idx)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Xóa trường này"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsCategoryModalOpen(false);
                    setEditingCategoryId(null);
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >{isEn ? 'Cancel' : 'Hủy'}</button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  💾 Lưu Danh Mục
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SIMPLE MODAL FOR COMPANIES & LOCATIONS */}
      {isSimpleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <span>
                  {simpleModalMode === 'create' ? '➕ Thêm Mới: ' : '✏️ Chỉnh Sửa: '}
                  {activeTab === 'companies' && 'Công Ty Thành Viên'}
                  {activeTab === 'locations' && 'Vị Trí / Phòng Ban'}
                </span>
              </h3>
              <button
                onClick={() => setIsSimpleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSimple} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tên mục (*)</label>
                <input
                  type="text"
                  required
                  placeholder="Nhập tên..."
                  value={simpleForm.name}
                  onChange={(e) => setSimpleForm({ ...simpleForm, name: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {activeTab === 'locations' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Tòa nhà / Khu vực</label>
                    <input
                      type="text"
                      placeholder="VD: Tòa A"
                      value={simpleForm.building}
                      onChange={(e) => setSimpleForm({ ...simpleForm, building: e.target.value })}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Tầng / Vị trí</label>
                    <input
                      type="text"
                      placeholder="VD: Tầng 3"
                      value={simpleForm.floor}
                      onChange={(e) => setSimpleForm({ ...simpleForm, floor: e.target.value })}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSimpleModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >{isEn ? 'Cancel' : 'Hủy'}</button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  💾 Lưu Thay Đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DEPARTMENT MODAL (PHÒNG BAN CẤP 2) */}
      {isDeptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-indigo-50/80">
              <div className="min-w-0 pr-2">
                <h3 className="font-bold text-sm text-indigo-950 flex items-center gap-2">
                  <FolderTree className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="truncate">
                    {deptModalMode === 'create'
                      ? (isEn ? 'Add Department' : 'Thêm Phòng Ban Mới')
                      : (isEn ? 'Edit Department' : 'Chỉnh Sửa Phòng Ban')}
                  </span>
                </h3>
                <p className="text-[11px] text-indigo-700 font-medium truncate mt-0.5">
                  🏢 {deptModalCompany}
                </p>
              </div>
              <button
                onClick={() => setIsDeptModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDept} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isEn ? 'Department Name (*)' : 'Tên Phòng Ban / Khối (*)'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={isEn ? 'e.g. IT Department, Finance & Accounting...' : 'VD: Ban Công Nghệ Thông Tin, Khối Kế Toán Tài Chính...'}
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isEn ? 'Department Code' : 'Mã Phòng Ban (Code)'}
                  </label>
                  <input
                    type="text"
                    placeholder="VD: IT, FIN, HR, OPS..."
                    value={deptForm.code}
                    onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isEn ? 'Icon' : 'Biểu tượng Icon'}
                  </label>
                  <select
                    value={deptForm.icon}
                    onChange={(e) => setDeptForm({ ...deptForm, icon: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="📁">📁 Thư mục (Mặc định)</option>
                    <option value="⚡">⚡ Ban CNTT / Kỹ thuật</option>
                    <option value="🏛️">🏛️ Ban Giám Đốc / HĐQT</option>
                    <option value="💰">💰 Tài Chính / Kế Toán</option>
                    <option value="📈">📈 Kinh Doanh / Bán Hàng</option>
                    <option value="👥">👥 Nhân Sự / Hành Chính</option>
                    <option value="🏭">🏭 Vận Hành / Sản Xuất</option>
                    <option value="📢">📢 Marketing / Truyền Thông</option>
                    <option value="📐">📐 Dự Án / Kỹ Thuật PMO</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isEn ? 'Description / Responsibilities' : 'Mô tả nhiệm vụ (Tùy chọn)'}
                </label>
                <textarea
                  rows={2}
                  placeholder={isEn ? 'Brief description...' : 'Mô tả phạm vi chức năng nhiệm vụ...'}
                  value={deptForm.description}
                  onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDeptModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  {isEn ? 'Cancel' : 'Hủy'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  💾 {isEn ? 'Save Department' : 'Lưu Phòng Ban'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUB-DEPARTMENT MODAL (BỘ PHẬN CON CẤP 3) */}
      {isSubDeptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-purple-50/80">
              <div className="min-w-0 pr-2">
                <h3 className="font-bold text-sm text-purple-950 flex items-center gap-2">
                  <FolderPlus className="w-4 h-4 text-purple-600 shrink-0" />
                  <span className="truncate">
                    {subDeptModalMode === 'create'
                      ? (isEn ? 'Add Sub-department / Team' : 'Thêm Bộ Phận Con / Tổ Chuyên Môn')
                      : (isEn ? 'Edit Sub-department' : 'Chỉnh Sửa Bộ Phận Con')}
                  </span>
                </h3>
                <p className="text-[11px] text-purple-700 font-medium truncate mt-0.5">
                  📁 {subDeptModalDept} • 🏢 {subDeptModalCompany}
                </p>
              </div>
              <button
                onClick={() => setIsSubDeptModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSubDept} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isEn ? 'Sub-department Name (*)' : 'Tên Bộ Phận Con / Nhóm / Tổ (*)'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={isEn ? 'e.g. Network & Infra, Helpdesk L1/L2, Tax Accounting...' : 'VD: Hạ Tầng Mạng & Viễn Thông, Helpdesk L1/L2, Kế Toán Thuế...'}
                  value={subDeptForm.name}
                  onChange={(e) => setSubDeptForm({ ...subDeptForm, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-purple-500 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isEn ? 'Code (Optional)' : 'Mã Viết Tắt (Tùy chọn)'}
                </label>
                <input
                  type="text"
                  placeholder="VD: NET, SYS, HD, TAX..."
                  value={subDeptForm.code}
                  onChange={(e) => setSubDeptForm({ ...subDeptForm, code: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isEn ? 'Description (Optional)' : 'Mô tả nhiệm vụ (Tùy chọn)'}
                </label>
                <textarea
                  rows={2}
                  placeholder={isEn ? 'Brief description...' : 'Mô tả công việc phân công cho nhóm...'}
                  value={subDeptForm.description}
                  onChange={(e) => setSubDeptForm({ ...subDeptForm, description: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSubDeptModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  {isEn ? 'Cancel' : 'Hủy'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  💾 {isEn ? 'Save Sub-department' : 'Lưu Bộ Phận'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
