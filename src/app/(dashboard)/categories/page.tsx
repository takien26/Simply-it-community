'use client';

import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/lib/i18n/context';
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

  // Load all data
  const loadAllData = async () => {
    setLoading(true);
    try {
      const [catRes, licRes, svcRes, vendRes, compRes, locRes] = await Promise.all([
        fetch('/api/categories').then((r) => r.json()).catch(() => ({ data: [] })),
        fetch('/api/categories/license').then((r) => r.json()).catch(() => ({ data: [] })),
        fetch('/api/categories/service').then((r) => r.json()).catch(() => ({ data: [] })),
        fetch('/api/vendors').then((r) => r.json()).catch(() => ({ data: [] })),
        fetch('/api/companies').then((r) => r.json()).catch(() => ({ data: [] })),
        fetch('/api/locations').then((r) => r.json()).catch(() => ({ data: [] })),
      ]);

      if (catRes.data) setAssetCategories(catRes.data);
      if (licRes.data) setLicenseCategories(licRes.data);
      if (svcRes.data) setServiceCategories(svcRes.data);
      if (vendRes.data) setVendors(vendRes.data);
      if (compRes.data) setCompanies(compRes.data);
      if (locRes.data) setLocations(locRes.data);
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

    try {
      let url = `/api/categories/${cat.id}`;
      if (activeTab === 'licenses') {
        url = `/api/categories/license?id=${cat.id}`;
      } else if (activeTab === 'services') {
        url = `/api/categories/service?id=${cat.id}`;
      }

      await fetch(url, { method: 'DELETE' });
      loadAllData();
    } catch (err) {
      console.error('Delete category error:', err);
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

    try {
      if (activeTab === 'vendors') {
        await fetch(`/api/vendors/${item.id}`, { method: 'DELETE' });
      } else if (activeTab === 'companies') {
        await fetch(`/api/companies?name=${encodeURIComponent(item)}`, { method: 'DELETE' });
      } else if (activeTab === 'locations') {
        await fetch(`/api/locations/${item.id}`, { method: 'DELETE' });
      }
      loadAllData();
    } catch (err) {
      console.error('Delete simple error:', err);
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

          {/* TAB 5: COMPANIES */}
          {activeTab === 'companies' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {companies
                .filter((c) => c.toLowerCase().includes(search.toLowerCase()))
                .map((c) => (
                  <div
                    key={c}
                    className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-2xs hover:shadow-md transition-all flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-50/80 border border-amber-100 flex items-center justify-center text-2xl shrink-0 shadow-inner">
                        🏢
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm leading-snug">{c}</h3>
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                          {isEn ? 'Corporate Entity' : 'Công ty thành viên'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditSimple(c)}
                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSimple(c)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
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
    </div>
  );
}
