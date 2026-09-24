'use client';

import React, { useState, useEffect } from 'react';
import {
  Laptop,
  Tag,
  Cpu,
  DollarSign,
  Layers,
  Sparkles,
  Loader2,
  Building2,
  MapPin,
  Zap,
  FileText,
  Receipt,
  Plus,
  Clock,
  Building,
  User,
  Key,
  Check,
  ShieldCheck,
  ShieldAlert,
  Wrench,
  X,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';
import { numberToVietnameseWords } from '@/lib/utils';
import CurrencyInput from '@/components/ui/currency-input';
import { ManageableDropdown } from './ManageableDropdown';
import { ManageableDropdown as SearchableSelect } from '@/components/ui/manageable-dropdown';
import { getCategoryFields, getFriendlySpecLabel, formatPrice, renderCategoryIcon } from './types';

export interface AssetEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: any | null;
  initialTab?: 'general' | 'specs' | 'finance' | 'licenses';
  categories: any[];
  companies: any[];
  locations: any[];
  vendors: any[];
  users: any[];
  licenses: any[];
  currencies: any[];
  exchangeRatesMap?: Record<string, number>;
  onAddCategory: (name: string) => Promise<void> | void;
  onEditCategory: (id: string, name: string) => Promise<void> | void;
  onDeleteCategory: (id: string, name: string) => Promise<void> | void;
  onAddCompany: (name: string) => Promise<void> | void;
  onEditCompany: (id: string, name: string) => Promise<void> | void;
  onDeleteCompany: (name: string) => Promise<void> | void;
  onAddLocation: (name: string) => Promise<void> | void;
  onEditLocation: (id: string, name: string) => Promise<void> | void;
  onDeleteLocation: (id: string, name: string) => Promise<void> | void;
  onAddVendor: (name: string) => Promise<void> | void;
  onEditVendor: (id: string, name: string) => Promise<void> | void;
  onDeleteVendor: (id: string, name: string) => Promise<void> | void;
  onOpenAddCurrency?: () => void;
  onOpenMaintenance?: (asset: any) => void;
  onSuccess: () => void;
}

export const AssetEditModal: React.FC<AssetEditModalProps> = ({
  isOpen,
  onClose,
  asset,
  initialTab = 'general',
  categories,
  companies,
  locations,
  vendors,
  users,
  licenses,
  currencies,
  exchangeRatesMap = {},
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  onAddCompany,
  onEditCompany,
  onDeleteCompany,
  onAddLocation,
  onEditLocation,
  onDeleteLocation,
  onAddVendor,
  onEditVendor,
  onDeleteVendor,
  onOpenAddCurrency,
  onOpenMaintenance,
  onSuccess,
}) => {
  // ESC key listener to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const { language } = useLanguage();
  const txt = (vi: string, en: string, ja?: string) => {
    if (language === 'ja') return ja || en;
    if (language === 'en') return en;
    return vi;
  };
  const isEn = language === 'en';

  const handleAddCategory = onAddCategory;
  const handleEditCategory = onEditCategory;
  const handleDeleteCategory = onDeleteCategory;
  const handleAddCompany = onAddCompany;
  const handleEditCompany = onEditCompany;
  const handleDeleteCompany = (name: string) => onDeleteCompany(name);
  const handleAddLocation = onAddLocation;
  const handleEditLocation = onEditLocation;
  const handleDeleteLocation = onDeleteLocation;
  const handleAddVendor = onAddVendor;
  const handleEditVendor = onEditVendor;
  const handleDeleteVendor = onDeleteVendor;

  const [modalActiveTab, setModalActiveTab] = useState<'general' | 'specs' | 'finance' | 'licenses'>('general');
  const [selectedLicenseIds, setSelectedLicenseIds] = useState<string[]>([]);
  const [aiLookupLoading, setAiLookupLoading] = useState(false);
  const [aiLookupStatus, setAiLookupStatus] = useState<string | null>(null);

  const userDropdownItems = (users || []).map((u: any) => ({
    id: u.id,
    name: u.fullName || u.email || 'Nhân sự',
    subtitle: `${u.companyName ? `[${u.companyName}] ` : ''}${u.department || 'Staff'} • ${u.email || ''}`,
    icon: <User className="w-3.5 h-3.5 text-blue-600" />,
  }));

  // Subform for Admin adding license from edit modal
  const [showAdminAddLicForm, setShowAdminAddLicForm] = useState(false);
  const [isSubmittingNewLic, setIsSubmittingNewLic] = useState(false);
  const [newLicForm, setNewLicForm] = useState({
    name: '',
    licenseKey: '',
    licenseType: 'PERPETUAL',
    totalSeats: 1,
  });

  const [editFormData, setEditFormData] = useState<any>({
    name: '',
    assetTag: '',
    categoryId: '',
    brand: '',
    model: '',
    serialNumber: '',
    status: 'AVAILABLE',
    condition: 'NEW',
    purchaseDate: '',
    purchasePrice: '',
    purchaseCurrency: 'VND',
    exchangeRate: 1,
    depreciationMonths: 36,
    warrantyExpiry: '',
    companyName: '',
    vendorId: '',
    locationId: '',
    contractNumber: '',
    invoiceNumber: '',
    invoiceUrl: '',
    assignedUserId: '',
    specs: {},
    notes: '',
    source: 'MANUAL',
    isAutoScanned: false,
  });

  const editingAssetId = asset?.id || null;

  useEffect(() => {
    if (isOpen && asset) {
      setModalActiveTab(initialTab);
      const activeAssignment = asset.assignments?.find((a: any) => a.returnedAt === null);
      const assetLicenses = asset.licenseAssignments?.map((la: any) => la.licenseId) || asset.specs?.assignedLicenseIds || [];
      setSelectedLicenseIds(assetLicenses);

      const rawCurr = (asset.purchaseCurrency || 'VND').toUpperCase() as 'VND' | 'USD' | 'EUR';
      const savedRate = asset.specs?.exchangeRate || asset.exchangeRate || exchangeRatesMap[rawCurr] || 1;

      setEditFormData({
        name: asset.name || '',
        assetTag: asset.assetTag || '',
        categoryId: asset.categoryId || '',
        brand: asset.brand || '',
        model: asset.model || '',
        serialNumber: asset.serialNumber || '',
        status: asset.status || 'AVAILABLE',
        condition: asset.condition || 'NEW',
        purchaseDate: asset.purchaseDate ? asset.purchaseDate.split('T')[0] : '',
        purchasePrice: asset.purchasePrice || '',
        purchaseCurrency: rawCurr,
        exchangeRate: savedRate,
        depreciationMonths: asset.specs?.depreciationMonths || 36,
        warrantyExpiry: asset.warrantyExpiry ? asset.warrantyExpiry.split('T')[0] : '',
        companyName: asset.companyName || '',
        vendorId: asset.vendorId || '',
        locationId: asset.locationId || '',
        contractNumber: asset.contractNumber || '',
        invoiceNumber: asset.invoiceNumber || '',
        invoiceUrl: asset.invoiceUrl || '',
        assignedUserId: activeAssignment?.user?.id || '',
        specs: asset.specs || {},
        notes: asset.notes || '',
        source: asset.source || 'MANUAL',
        isAutoScanned:
          asset.source === 'AUTO_SCAN' ||
          asset.source === 'AGENT_PS1' ||
          asset.specs?.autoScanned ||
          asset.notes?.includes('PowerShell'),
      });
      setShowAdminAddLicForm(false);
      setAiLookupStatus(null);
    }
  }, [isOpen, asset, initialTab]);

  // AI Specs Lookup
  const handleAiLookupModel = async (modelName: string, isEdit: boolean = true) => {
    if (!modelName || modelName.trim().length < 3) return;
    setAiLookupLoading(true);
    setAiLookupStatus(null);

    try {
      const res = await fetch('/api/assets/ai-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelName.trim() }),
      });
      const data = await res.json();

      if (res.ok && data.success && data.data) {
        const { brand, name, category: matchedCategoryName, specs, warrantyMonths } = data.data;

        let targetCategoryObj = categories.find((c) => c.id === editFormData.categoryId);
        let isCategoryChanged = false;
        let effectiveCatId = editFormData.categoryId;

        if (matchedCategoryName) {
          const foundCat = categories.find(
            (c) => c.name.toLowerCase().trim() === matchedCategoryName.toLowerCase().trim()
          );
          if (foundCat && (!targetCategoryObj || targetCategoryObj.name.toLowerCase().includes('khác') || targetCategoryObj.name.toLowerCase().includes('thiết bị văn phòng') || !editFormData.categoryId)) {
            effectiveCatId = foundCat.id;
            targetCategoryObj = foundCat;
            isCategoryChanged = true;
          }
        }

        const definedCatFields = targetCategoryObj && Array.isArray(targetCategoryObj.customFields) ? targetCategoryObj.customFields : [];
        const displayCategoryName = targetCategoryObj?.name || matchedCategoryName || txt('Danh mục phù hợp', 'Suitable Category', '適切なカテゴリ');

        const SYNONYM_MAP: Record<string, string> = {
          processor: 'cpu',
          chip: 'cpu',
          vixuly: 'cpu',
          cpu: 'cpu',
          memory: 'ram',
          bonhoram: 'ram',
          ram: 'ram',
          storage: 'storage',
          ssd: 'storage',
          hdd: 'storage',
          rom: 'storage',
          ocung: 'storage',
          display: 'screen',
          screensize: 'screen',
          manhinh: 'screen',
          screen: 'screen',
          sizeinch: 'size_inch',
          os: 'os',
          operatingsystem: 'os',
          hedieuhanh: 'os',
          tenmaytinh: 't_n_m_y_t_nh',
          computername: 't_n_m_y_t_nh',
          hostname: 't_n_m_y_t_nh',
          tnmytnh: 't_n_m_y_t_nh',
          refreshrate: 'refresh_rate',
          tansoquyet: 'refresh_rate',
          mausac: 'color',
          color: 'color',
          chatlieu: 'material',
          material: 'material',
          carddohoa: 'gpu',
          vga: 'gpu',
          gpu: 'gpu',
          accessories: 'includedAccessories',
          phukien: 'includedAccessories',
        };

        setEditFormData((prev: any) => {
          const currentSpecs: Record<string, any> = { ...(prev.specs || {}) };

          if (specs && typeof specs === 'object') {
            Object.entries(specs).forEach(([rawKey, val]) => {
              if (val === undefined || val === null || String(val).trim() === '') return;

              const cleanRaw = rawKey.toLowerCase().replace(/[^a-z0-9]/g, '');
              const mappedKey = SYNONYM_MAP[cleanRaw] || rawKey;

              const matchedField = definedCatFields.find((f: any) => {
                const fClean = f.key.toLowerCase().replace(/[^a-z0-9]/g, '');
                return fClean === cleanRaw || fClean === mappedKey.toLowerCase().replace(/[^a-z0-9]/g, '');
              });

              if (matchedField) {
                if (matchedField.type === 'select' && Array.isArray(matchedField.options) && matchedField.options.length > 0) {
                  const valStr = String(val).toLowerCase();
                  const bestOption = matchedField.options.find((opt: any) => valStr.includes(opt.toLowerCase()) || opt.toLowerCase().includes(valStr));
                  currentSpecs[matchedField.key] = bestOption || matchedField.options[0];
                } else {
                  currentSpecs[matchedField.key] = val;
                }

                if (rawKey !== matchedField.key) delete currentSpecs[rawKey];
                if (cleanRaw !== matchedField.key) delete currentSpecs[cleanRaw];
                if (mappedKey !== matchedField.key) delete currentSpecs[mappedKey];
              } else {
                currentSpecs[mappedKey] = val;
                if (rawKey !== mappedKey) delete currentSpecs[rawKey];
              }
            });

            ['processor', 'PROCESSOR', 'chip'].forEach((k) => { if (k !== 'cpu') delete currentSpecs[k]; });
            ['memory', 'MEMORY', 'bonhoram'].forEach((k) => { if (k !== 'ram') delete currentSpecs[k]; });
            ['ssd', 'SSD', 'rom', 'hdd'].forEach((k) => { if (k !== 'storage') delete currentSpecs[k]; });
            ['display', 'DISPLAY', 'screen_size'].forEach((k) => { if (k !== 'screen') delete currentSpecs[k]; });
            ['operatingsystem', 'OPERATINGSYSTEM'].forEach((k) => { if (k !== 'os') delete currentSpecs[k]; });
            ['computerName', 'hostname', 'tenmaytinh'].forEach((k) => { if (k !== 't_n_m_y_t_nh') delete currentSpecs[k]; });
          }

          let autoExpiry = prev.warrantyExpiry;
          if (warrantyMonths && Number(warrantyMonths) > 0 && prev.purchaseDate) {
            const pDate = new Date(prev.purchaseDate);
            pDate.setMonth(pDate.getMonth() + Number(warrantyMonths));
            autoExpiry = pDate.toISOString().split('T')[0];
          }

          return {
            ...prev,
            categoryId: effectiveCatId,
            brand: prev.brand && prev.brand.trim() !== '' ? prev.brand : (brand || prev.brand || ''),
            name: prev.name && prev.name.trim() !== '' ? prev.name : (name || prev.name || ''),
            warrantyExpiry: autoExpiry || prev.warrantyExpiry,
            specs: currentSpecs,
          };
        });

        if (isCategoryChanged) {
          setAiLookupStatus(txt(`🎯 AI đã tự động chuyển đúng danh mục sang "${displayCategoryName}" & điền đầy đủ cấu hình!`, `🎯 AI automatically mapped category to "${displayCategoryName}" & filled specs!`, `🎯 AIがカテゴリを「${displayCategoryName}」に自動設定し、スペックを入力しました！`));
        } else {
          setAiLookupStatus(txt(`✨ AI đã xác thực danh mục "${displayCategoryName}" & tự động điền toàn bộ thông số!`, `✨ AI verified category "${displayCategoryName}" & auto-filled all specs!`, `✨ AIがカテゴリ「${displayCategoryName}」を検証し、全仕様を自動入力しました！`));
        }

        setTimeout(() => setAiLookupStatus(null), 5500);
      } else {
        setAiLookupStatus(null);
      }
    } catch (err) {
      console.error('AI Lookup error:', err);
      setAiLookupStatus(null);
    } finally {
      setAiLookupLoading(false);
    }
  };

  // Smart Auto-Lookup Debounce
  useEffect(() => {
    if (!isOpen || !editFormData.model || editFormData.model.trim().length < 3) return;
    const timer = setTimeout(() => {
      handleAiLookupModel(editFormData.model, true);
    }, 800);
    return () => clearTimeout(timer);
  }, [editFormData.model, isOpen]);

  const handleAdminCreateAndAssignLicense = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newLicForm.name.trim()) {
      alert(txt('Vui lòng nhập tên phần mềm / license (*)', 'Please enter software / license name (*)', 'ソフトウェア / ライセンス名を入力してください (*)'));
      return;
    }
    setIsSubmittingNewLic(true);
    try {
      const res = await fetch('/api/licenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newLicForm.name.trim(),
          licenseKey: newLicForm.licenseKey.trim() || null,
          licenseType: newLicForm.licenseType || 'PERPETUAL',
          totalSeats: Number(newLicForm.totalSeats) || 1,
          assignedAssetIds: editingAssetId ? [editingAssetId] : [],
          notes: `Quản trị viên thêm trực tiếp từ modal tài sản ${editFormData.assetTag || ''}`,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(txt(`🎉 Đã thêm thành công License "${newLicForm.name}" vào Kho và gán cho thiết bị này!`, `🎉 Successfully added license "${newLicForm.name}" and assigned to this device!`, `🎉 ライセンス「${newLicForm.name}」を登録し、この機器に割り当てました！`));
        setNewLicForm({ name: '', licenseKey: '', licenseType: 'PERPETUAL', totalSeats: 1 });
        setShowAdminAddLicForm(false);
        if (data.data?.id) {
          setSelectedLicenseIds((prev) => [...prev, data.data.id]);
        }
        onSuccess();
      } else {
        alert(`❌ ${txt('Không thể tạo: ', 'Failed to create: ', '作成できません: ')}${data.error || txt('Lỗi hệ thống', 'System error', 'システムエラー')}`);
      }
    } catch (err: any) {
      alert(`❌ ${txt('Lỗi kết nối: ', 'Connection error: ', '通信エラー: ')}${err?.message || err}`);
    } finally {
      setIsSubmittingNewLic(false);
    }
  };

  const handleQuickAddLicenseFromModal = async (name: string, key?: string, type?: string) => {
    try {
      const res = await fetch('/api/licenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          licenseKey: key ? (key.startsWith('****-') ? key : `****-${key}`) : null,
          licenseType: type === 'OEM' ? 'OEM' : type === 'Subscription' ? 'SUBSCRIPTION' : 'PERPETUAL',
          totalSeats: 1,
          assignedAssetIds: editingAssetId ? [editingAssetId] : [],
          notes: `Tạo từ thông số quét của máy ${editFormData.assetTag || ''} (${editFormData.name || ''})`,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(txt(`🎉 Đã thêm thành công License "${name}" vào Kho và gán cho máy tính này!`, `🎉 Successfully added license "${name}" and assigned to this computer!`, `🎉 ライセンス「${name}」を登録し、このPCに割り当てました！`));
        if (data.data?.id) {
          setSelectedLicenseIds((prev) => [...prev, data.data.id]);
        }
        onSuccess();
      } else {
        alert(`❌ ${txt('Không thể tạo: ', 'Failed to create: ', '作成できません: ')}${data.error || txt('Lỗi server', 'Server error', 'サーバーエラー')}`);
      }
    } catch (err: any) {
      alert(`❌ ${txt('Lỗi kết nối: ', 'Connection error: ', '通信エラー: ')}${err?.message || err}`);
    }
  };

  const handleUpdateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAssetId) return;

    try {
      const payload = {
        ...editFormData,
        assignedLicenseIds: selectedLicenseIds,
        purchaseCurrency: editFormData.purchaseCurrency || 'VND',
        exchangeRate: editFormData.exchangeRate || exchangeRatesMap[editFormData.purchaseCurrency || 'VND'] || 1,
        specs: {
          ...(editFormData.specs || {}),
          exchangeRate: editFormData.exchangeRate || exchangeRatesMap[editFormData.purchaseCurrency || 'VND'] || 1,
          assignedLicenseIds: selectedLicenseIds,
          depreciationMonths: editFormData.depreciationMonths || 36,
        },
      };

      const res = await fetch(`/api/assets/${editingAssetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        onClose();
        onSuccess();
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`❌ ${errorData.error || txt('Cập nhật tài sản thất bại', 'Failed to update asset', '資産の更新に失敗しました')}`);
      }
    } catch (err: any) {
      alert(`❌ ${txt('Lỗi kết nối khi cập nhật tài sản: ', 'Connection error updating asset: ', '資産更新の通信エラー: ')}${err?.message || err}`);
    }
  };

  if (!isOpen || !asset) return null;

  return (
<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-6xl w-full flex flex-col max-h-[92vh] border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 shrink-0">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-lg border border-blue-200 dark:border-blue-800">
                    [{editFormData.assetTag || 'TAG'}]
                  </span>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <Laptop className="w-4 h-4 text-blue-600" />
                    <span>{txt('Cập Nhật & Phê Duyệt Tài Sản', 'Update & Approve Asset', '資産情報の更新・承認')}</span>
                  </h3>
                  {editFormData.isAutoScanned && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-extrabold">
                      <span>{txt('🤖 Quét từ PS1', '🤖 Scanned via PS1', '🤖 PS1自動スキャン')}</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 truncate max-w-xl">
                  {editFormData.name || txt('Thiết bị', 'Device', 'デバイス')} {editFormData.brand ? `• ${editFormData.brand}` : ''} {editFormData.model ? `• ${editFormData.model}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onClose()}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal 4-Tabs Navigation */}
            <div className="flex items-center gap-1 px-6 pt-2 pb-0 bg-slate-50/50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-700 overflow-x-auto shrink-0">
              <button
                type="button"
                onClick={() => setModalActiveTab('general')}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  modalActiveTab === 'general'
                    ? 'border-blue-600 text-blue-700 dark:text-blue-400 bg-white dark:bg-slate-900 rounded-t-xl shadow-2xs'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
                <span>{txt('1. Thông tin chung', '1. General Info', '1. 基本情報')}</span>
              </button>

              <button
                type="button"
                onClick={() => setModalActiveTab('specs')}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  modalActiveTab === 'specs'
                    ? 'border-blue-600 text-blue-700 dark:text-blue-400 bg-white dark:bg-slate-900 rounded-t-xl shadow-2xs'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>{txt('2. Cấu hình phần cứng', '2. Hardware Specs', '2. ハードウェア構成')}</span>
                {editFormData.isAutoScanned && (
                  <span className="px-1.5 py-0.2 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded text-[9px] font-extrabold">
                    Auto-Fill
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setModalActiveTab('finance')}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  modalActiveTab === 'finance'
                    ? 'border-blue-600 text-blue-700 dark:text-blue-400 bg-white dark:bg-slate-900 rounded-t-xl shadow-2xs'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>{txt('3. Tài chính & Bảo hành', '3. Finance & Warranty', '3. 財務・保証')}</span>
              </button>

              <button
                type="button"
                onClick={() => setModalActiveTab('licenses')}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  modalActiveTab === 'licenses'
                    ? 'border-blue-600 text-blue-700 dark:text-blue-400 bg-white dark:bg-slate-900 rounded-t-xl shadow-2xs'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{txt('4. Bản quyền & License', '4. Licenses', '4. ライセンス')}</span>
                {selectedLicenseIds.length > 0 && (
                  <span className="px-1.5 py-0.2 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-full text-[9.5px] font-extrabold">
                    {selectedLicenseIds.length}
                  </span>
                )}
              </button>
            </div>

            {/* Modal Form Content */}
            <form
              id="edit-asset-form"
              onSubmit={(e) => {
                editFormData.specs = {
                  ...(editFormData.specs || {}),
                  assignedLicenseIds: selectedLicenseIds,
                  depreciationMonths: editFormData.depreciationMonths || 36,
                };
                handleUpdateAsset(e);
              }}
              className="flex-1 overflow-y-auto p-6 space-y-4"
            >
              {/* AI Lookup Notification Banner */}
              {aiLookupStatus && (
                <div className="p-3 bg-purple-50 dark:bg-purple-950/60 border border-purple-300 dark:border-purple-800 rounded-2xl flex items-center gap-2 text-xs font-bold text-purple-900 dark:text-purple-200 animate-in fade-in zoom-in-95 duration-150">
                  <Sparkles className="w-4 h-4 text-purple-600 animate-pulse shrink-0" />
                  <span>{aiLookupStatus}</span>
                </div>
              )}

              {/* TAB 1: THÔNG TIN CHUNG */}
              {modalActiveTab === 'general' && (
                <div className="space-y-4 animate-in fade-in duration-100">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Mã Tag */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{txt('Mã Tài Sản (Tag) (*)', 'Asset Tag (*)', '資産タグ (*)')}</label>
                      <input
                        type="text"
                        required
                        value={editFormData.assetTag}
                        onChange={(e) => setEditFormData({ ...editFormData, assetTag: e.target.value.toUpperCase() })}
                        className="w-full p-2.5 bg-blue-50/50 dark:bg-slate-800 border border-blue-300 dark:border-blue-700 rounded-xl text-xs font-mono font-bold text-blue-950 dark:text-blue-300 outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                      />
                    </div>

                    {/* Tên thiết bị */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{txt('Tên thiết bị (*)', 'Device Name (*)', 'デバイス名 (*)')}</label>
                      <input
                        type="text"
                        required
                        value={editFormData.name}
                        onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Danh mục */}
                    <div>
                      <ManageableDropdown
                        label={txt('Danh mục (*)', 'Category (*)', 'カテゴリ (*)')}
                        placeholder={txt('-- Chọn danh mục --', '-- Select category --', '-- カテゴリを選択 --')}
                        items={categories.map((c) => ({ id: c.id, name: c.name, icon: renderCategoryIcon(c.icon, 'w-4 h-4') }))}
                        selectedValue={editFormData.categoryId}
                        onSelect={(id) => setEditFormData((prev: any) => ({ ...prev, categoryId: id }))}
                        onAdd={handleAddCategory}
                        onEdit={handleEditCategory}
                        onDelete={handleDeleteCategory}
                        allowEmpty={false}
                      />
                    </div>
                  </div>

                  {/* Brand, Model, Serial */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{txt('Thương hiệu', 'Brand', 'ブランド・メーカー')}</label>
                      <input
                        type="text"
                        placeholder="Dell, HP, Lenovo, Apple..."
                        value={editFormData.brand}
                        onChange={(e) => setEditFormData({ ...editFormData, brand: e.target.value })}
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Model</label>
                        <button
                          type="button"
                          onClick={() => handleAiLookupModel(editFormData.model, true)}
                          disabled={aiLookupLoading || !editFormData.model?.trim()}
                          className="text-[10px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800 px-2 py-0.5 rounded-lg flex items-center gap-1 cursor-pointer disabled:opacity-40"
                        >
                          {aiLookupLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-purple-600" />}
                          <span>{txt('AI Tra Cứu Specs', 'AI Lookup Specs', 'AIスペック検索')}</span>
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="VD: Latitude 5540, ThinkPad T14..."
                        value={editFormData.model}
                        onChange={(e) => setEditFormData({ ...editFormData, model: e.target.value })}
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{txt('Số Serial (SN) (*)', 'Serial Number (SN) (*)', 'シリアル番号 (SN) (*)')}</label>
                      <input
                        type="text"
                        placeholder="SN123456789..."
                        value={editFormData.serialNumber}
                        onChange={(e) => setEditFormData({ ...editFormData, serialNumber: e.target.value })}
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono outline-none"
                      />
                    </div>
                  </div>

                  {/* Section: Đơn vị & Người sử dụng */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3">
                    <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-blue-600" />
                      <span>{txt('ĐƠN VỊ & NGƯỜI SỬ DỤNG', 'ORGANIZATION & USER ALLOCATION', '所属組織・使用者')}</span>
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <ManageableDropdown
                          label={txt('Công ty quản lý (*)', 'Managing Company (*)', '管理会社 (*)')}
                        placeholder={txt('-- Chọn công ty --', '-- Select company --', '-- 会社を選択 --')}
                          icon={<Building2 className="w-3.5 h-3.5 text-indigo-600" />}
                          items={companies.map((c) => ({ id: c, name: c }))}
                          selectedValue={editFormData.companyName}
                          onSelect={(name) => setEditFormData((prev: any) => ({ ...prev, companyName: name }))}
                          onAdd={handleAddCompany}
                          onEdit={handleEditCompany}
                          onDelete={(id, name) => handleDeleteCompany(name)}
                          allowEmpty={true}
                          emptyLabel={txt('-- Chưa phân công ty --', '-- Unassigned company --', '-- 会社未割当 --')}
                        />
                      </div>

                      <div>
                        <SearchableSelect
                          label={txt('Người đang sử dụng:', 'Assigned User:', '使用者:')}
                          placeholder={`-- ${txt('Trong kho IT (Chưa cấp phát)', 'In IT Stock (Unassigned)', 'IT倉庫内（未割当）')} --`}
                          searchPlaceholder={txt('🔍 Tìm kiếm nhân viên, phòng ban, email...', 'Search user, department, email...', 'ユーザーを検索...')}
                          items={userDropdownItems}
                          selectedValue={editFormData.assignedUserId || ''}
                          onSelect={(val) => setEditFormData((prev: any) => ({ ...prev, assignedUserId: val }))}
                          allowEmpty={true}
                          emptyLabel={`-- ${txt('Trong kho IT (Chưa cấp phát)', 'In IT Stock (Unassigned)', 'IT倉庫内（未割当）')} --`}
                          themeColor="blue"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Vị trí, Trạng thái, Tình trạng */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <ManageableDropdown
                        label={txt('Vị trí đặt', 'Location', '設置場所')}
                        placeholder={txt('-- Chọn vị trí --', '-- Select location --', '-- 設置場所を選択 --')}
                        icon={<MapPin className="w-3.5 h-3.5 text-blue-600" />}
                        items={locations.map((l) => ({ id: l.id, name: l.name }))}
                        selectedValue={editFormData.locationId}
                        onSelect={(id) => setEditFormData((prev: any) => ({ ...prev, locationId: id }))}
                        onAdd={handleAddLocation}
                        onEdit={handleEditLocation}
                        onDelete={handleDeleteLocation}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{txt('Trạng thái', 'Status', 'ステータス')}</label>
                      <select
                        value={editFormData.status}
                        onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none cursor-pointer"
                      >
                        <option value="PENDING">🟠 {txt('PENDING (Đang chờ duyệt)', 'PENDING (Pending Approval)', 'PENDING (承認待ち)')}</option>
                        <option value="AVAILABLE">🟢 {txt('AVAILABLE (Sẵn sàng)', 'AVAILABLE (In Stock)', 'AVAILABLE (利用可能)')}</option>
                        <option value="IN_USE">🔵 {txt('IN_USE (Đang dùng)', 'IN_USE (In Use)', 'IN_USE (使用中)')}</option>
                        <option value="MAINTENANCE">🟡 {txt('MAINTENANCE (Bảo trì)', 'MAINTENANCE (Under Maintenance)', 'MAINTENANCE (保守中)')}</option>
                        <option value="RETIRED">⚪ {txt('RETIRED (Thanh lý)', 'RETIRED (Retired/Disposed)', 'RETIRED (廃棄・除籍)')}</option>
                        <option value="LOST">🔴 {txt('LOST (Mất/Thất lạc)', 'LOST (Lost/Missing)', 'LOST (紛失)')}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{txt('Tình trạng vật lý', 'Physical Condition', '物理状態')}</label>
                      <select
                        value={editFormData.condition}
                        onChange={(e) => setEditFormData({ ...editFormData, condition: e.target.value })}
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none cursor-pointer"
                      >
                        <option value="NEW">{txt('Mới 100% (New)', 'New 100%', '新品 (New)')}</option>
                        <option value="GOOD">{txt('Tốt (Good)', 'Good', '良好 (Good)')}</option>
                        <option value="FAIR">{txt('Bình thường (Fair)', 'Fair', '普通 (Fair)')}</option>
                        <option value="POOR">{txt('Cũ / Xuống cấp (Poor)', 'Poor (Degraded)', '経年劣化 (Poor)')}</option>
                        <option value="BROKEN">{txt('Hỏng hóc (Broken)', 'Broken', '故障 (Broken)')}</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: CẤU HÌNH PHẦN CỨNG (AUTO-FILL TỪ SCRIPT) */}
              {modalActiveTab === 'specs' && (
                <div className="space-y-4 animate-in fade-in duration-100">
                  <div className="p-3 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl flex items-start gap-2.5 text-xs text-indigo-950 dark:text-indigo-200">
                    <Zap className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">
                        {editFormData.isAutoScanned
                          ? txt('Thông số được tự động đồng bộ từ PowerShell Script / GPO.', 'Specs automatically synced via PowerShell Script / GPO.', 'PowerShellスクリプト/GPOから自動同期された仕様。') : txt('Cấu hình phần cứng & Thông số kỹ thuật chi tiết.', 'Hardware Specs & Technical Details.', 'ハードウェア構成と技術仕様。')}
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {txt('Bạn có thể đối chiếu và chỉnh sửa trực tiếp các thông số trước khi phê duyệt lưu kho.', 'You can cross-check and modify specifications before approving into inventory.', '倉庫保管を承認する前に仕様を確認・直接編集できます。')}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* OS */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{txt('Hệ điều hành (OS)', 'Operating System (OS)', 'OS (オペレーティングシステム)')}</label>
                      <input
                        type="text"
                        placeholder="Windows 11 Pro, macOS Sonoma, Ubuntu..."
                        value={editFormData.specs?.os || editFormData.specs?.operatingSystem || ''}
                        onChange={(e) =>
                          setEditFormData((prev: any) => ({
                            ...prev,
                            specs: { ...prev.specs, os: e.target.value },
                          }))
                        }
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none"
                      />
                    </div>

                    {/* Hostname */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{txt('Tên máy tính (Hostname)', 'Hostname / Computer Name', 'ホスト名 / コンピュータ名')}</label>
                      <input
                        type="text"
                        placeholder="DESKTOP-IT892, MACBOOK-PRO..."
                        value={editFormData.specs?.hostname || editFormData.specs?.computerName || ''}
                        onChange={(e) =>
                          setEditFormData((prev: any) => ({
                            ...prev,
                            specs: { ...prev.specs, hostname: e.target.value },
                          }))
                        }
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono outline-none"
                      />
                    </div>

                    {/* CPU */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{txt('Vi xử lý (CPU)', 'Processor (CPU)', 'プロセッサ (CPU)')}</label>
                      <input
                        type="text"
                        placeholder="Intel Core i7-1365U, Apple M3 Pro..."
                        value={editFormData.specs?.cpu || editFormData.specs?.processor || ''}
                        onChange={(e) =>
                          setEditFormData((prev: any) => ({
                            ...prev,
                            specs: { ...prev.specs, cpu: e.target.value },
                          }))
                        }
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none"
                      />
                    </div>

                    {/* RAM */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{txt('Dung lượng RAM', 'RAM Memory', 'メモリ (RAM)')}</label>
                      <input
                        type="text"
                        placeholder="16GB DDR5 5600MHz..."
                        value={editFormData.specs?.ram || (editFormData.specs?.ramGb ? `${editFormData.specs?.ramGb} GB` : '')}
                        onChange={(e) =>
                          setEditFormData((prev: any) => ({
                            ...prev,
                            specs: { ...prev.specs, ram: e.target.value },
                          }))
                        }
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none"
                      />
                    </div>

                    {/* GPU */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{txt('Card đồ họa (GPU)', 'Graphics Card (GPU)', 'グラフィックカード (GPU)')}</label>
                      <input
                        type="text"
                        placeholder="Intel Iris Xe, NVIDIA RTX 4060..."
                        value={editFormData.specs?.gpu || editFormData.specs?.graphics || ''}
                        onChange={(e) =>
                          setEditFormData((prev: any) => ({
                            ...prev,
                            specs: { ...prev.specs, gpu: e.target.value },
                          }))
                        }
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none"
                      />
                    </div>

                    {/* Storage */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{txt('Ổ cứng (Storage)', 'Storage / Drive', 'ストレージ (Storage)')}</label>
                      <input
                        type="text"
                        placeholder="512GB NVMe PCIe Gen 4..."
                        value={editFormData.specs?.storage || editFormData.specs?.ssd || ''}
                        onChange={(e) =>
                          setEditFormData((prev: any) => ({
                            ...prev,
                            specs: { ...prev.specs, storage: e.target.value },
                          }))
                        }
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none"
                      />
                    </div>

                    {/* IP Address */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{txt('Địa chỉ IP', 'IP Address', 'IPアドレス')}</label>
                      <input
                        type="text"
                        placeholder="192.168.1.105"
                        value={editFormData.specs?.ipAddress || editFormData.specs?.ip || ''}
                        onChange={(e) =>
                          setEditFormData((prev: any) => ({
                            ...prev,
                            specs: { ...prev.specs, ipAddress: e.target.value },
                          }))
                        }
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono outline-none"
                      />
                    </div>

                    {/* MAC Address */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{txt('Địa chỉ MAC', 'MAC Address', 'MACアドレス')}</label>
                      <input
                        type="text"
                        placeholder="A4:BB:6D:88:99:01"
                        value={editFormData.specs?.macAddress || editFormData.specs?.mac || ''}
                        onChange={(e) =>
                          setEditFormData((prev: any) => ({
                            ...prev,
                            specs: { ...prev.specs, macAddress: e.target.value },
                          }))
                        }
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono outline-none"
                      />
                    </div>

                    {/* Antivirus */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{txt('Bảo mật / Antivirus', 'Security / Antivirus', 'セキュリティ / アンチウイルス')}</label>
                      <input
                        type="text"
                        placeholder="Windows Defender, Kaspersky..."
                        value={editFormData.specs?.antivirus || ''}
                        onChange={(e) =>
                          setEditFormData((prev: any) => ({
                            ...prev,
                            specs: { ...prev.specs, antivirus: e.target.value },
                          }))
                        }
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none"
                      />
                    </div>
                  </div>

                  {/* Extra Category Custom Fields if any */}
                  {(() => {
                    const definedFields = getCategoryFields(categories, editFormData.categoryId);
                    if (definedFields.length === 0) return null;

                    return (
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {txt(`Thông số mở rộng theo danh mục (${definedFields.length} trường):`, `Category Custom Fields (${definedFields.length} fields):`, `カテゴリ拡張項目 (${definedFields.length} 項目):`)}
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {definedFields.map((field) => {
                            const val = editFormData.specs?.[field.key] ?? '';
                            return (
                              <div key={field.key}>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                  {field.label}
                                </label>
                                <input
                                  type="text"
                                  value={val}
                                  onChange={(e) =>
                                    setEditFormData((prev: any) => ({
                                      ...prev,
                                      specs: { ...prev.specs, [field.key]: e.target.value },
                                    }))
                                  }
                                  className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* TAB 3: TÀI CHÍNH & BẢO HÀNH */}
              {modalActiveTab === 'finance' && (
                <div className="space-y-4 animate-in fade-in duration-100">
                  {/* Hợp đồng & Hóa đơn */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                        <span>{txt('Số Hợp Đồng (Contract No.)', 'Contract No.', '契約番号 (Contract No.)')}</span>
                      </label>
                      <input
                        type="text"
                        placeholder={txt('VD: HĐ-2026/08/IT-DELL', 'e.g. CTR-2026/08/IT-DELL', '例：CTR-2026/08/IT-DELL')}
                        value={editFormData.contractNumber}
                        onChange={(e) => setEditFormData({ ...editFormData, contractNumber: e.target.value })}
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                        <Receipt className="w-3.5 h-3.5 text-blue-600" />
                        <span>{txt('Số Hóa Đơn (Invoice No.)', 'Invoice No.', '請求書番号 (Invoice No.)')}</span>
                      </label>
                      <input
                        type="text"
                        placeholder="VD: HD-0089421"
                        value={editFormData.invoiceNumber}
                        onChange={(e) => setEditFormData({ ...editFormData, invoiceNumber: e.target.value })}
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono outline-none"
                      />
                    </div>
                  </div>

                  {/* Giá mua gốc + Loại tiền tệ + Tỷ giá quy đổi */}
                  <div className="p-4 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-blue-950 dark:text-blue-200 uppercase tracking-wide flex items-center gap-1.5">
                        <DollarSign className="w-4 h-4 text-blue-600" />
                        <span>{txt('1. Định giá & Tiền tệ hóa đơn gốc (Ngoại tệ)', '1. Original Invoice Valuation & Currency', '1. 原契約・請求書通貨での価格')}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => onOpenAddCurrency?.()}
                        className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{txt('Thêm đồng tiền mới', 'Add currency', '通貨を追加')}</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
                      {/* Giá mua hóa đơn gốc with dot separators & foreign words */}
                      <div>
                        <CurrencyInput
                          label={txt('Giá mua hóa đơn gốc (*)', 'Original Purchase Price (*)', '原通貨での購入価格 (*)')}
                          value={editFormData.purchasePrice}
                          onChange={(val) => setEditFormData({ ...editFormData, purchasePrice: val })}
                          currency={editFormData.purchaseCurrency || 'VND'}
                          currencyName={currencies.find((c) => c.code === (editFormData.purchaseCurrency || 'VND'))?.name}
                          exchangeRate={editFormData.exchangeRate || exchangeRatesMap[editFormData.purchaseCurrency || 'VND'] || 1}
                          placeholder="VD: 1.000"
                        />
                      </div>

                      {/* Loại tiền tệ gốc */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{txt('Loại tiền tệ gốc', 'Original Currency', '原通貨')}</label>
                        <select
                          value={editFormData.purchaseCurrency || 'VND'}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '__ADD_NEW__') {
                              onOpenAddCurrency?.();
                              return;
                            }
                            const found = currencies.find((c) => c.code === val);
                            setEditFormData({
                              ...editFormData,
                              purchaseCurrency: val,
                              exchangeRate: found ? found.rateToVnd : exchangeRatesMap[val] || 1,
                            });
                          }}
                          className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold outline-none cursor-pointer"
                        >
                          {currencies.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.flag} {c.code} ({c.name})
                            </option>
                          ))}
                          <option value="__ADD_NEW__" className="text-blue-600 font-bold">
                            {txt('➕ Thêm đồng tiền khác...', '➕ Add other currency...', '➕ その他の通貨を追加...')}
                          </option>
                        </select>
                      </div>

                      {/* Tỷ giá quy đổi cơ sở */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          {txt(`Tỷ giá hạch toán (1 ${editFormData.purchaseCurrency || 'VND'} = ? VNĐ)`, `Exchange Rate (1 ${editFormData.purchaseCurrency || 'VND'} = ? VND)`, `換算レート (1 ${editFormData.purchaseCurrency || 'VND'} = ? VND)`)}
                        </label>
                        <input
                          type="number"
                          value={editFormData.exchangeRate || exchangeRatesMap[editFormData.purchaseCurrency || 'VND'] || 1}
                          onChange={(e) => setEditFormData({ ...editFormData, exchangeRate: Number(e.target.value) })}
                          className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold outline-none"
                        />
                      </div>
                    </div>

                    {/* KHỐI 2: Ô GIÁ TIỀN QUY CHUẨN VNĐ RIÊNG & BẰNG CHỮ RÕ RÀNG */}
                    {(() => {
                      const numVal = Number(String(editFormData.purchasePrice).replace(/\D/g, '')) || 0;
                      const curr = editFormData.purchaseCurrency || 'VND';
                      const rate = editFormData.exchangeRate || exchangeRatesMap[curr] || 1;
                      const inVnd = curr === 'VND' ? numVal : numVal * rate;

                      return (
                        <div className="p-3.5 bg-white dark:bg-slate-800/90 rounded-2xl border border-emerald-200 dark:border-emerald-800/80 shadow-xs space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-extrabold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 uppercase tracking-wide">
                              <span>{txt('🇻🇳 2. Giá Tiền Quy Chuẩn VNĐ (Hạch Toán Kế Toán)', '🇻🇳 2. Standard VND Value (Accounting)', '🇻🇳 2. VND換算価格（会計基準）')}</span>
                            </span>
                            <span className="font-mono text-xs font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-xl border border-emerald-200 dark:border-emerald-800">
                              {formatPrice(inVnd, 'VND')}
                            </span>
                          </div>

                          {inVnd > 0 && (
                            <div className="text-[11px] text-emerald-900 dark:text-emerald-200 bg-emerald-50/80 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 rounded-xl px-3 py-2 flex items-start gap-1.5 font-medium">
                              <span className="text-emerald-700 dark:text-emerald-400 font-bold shrink-0">
                                {txt('✍️ Giá chuẩn VNĐ bằng chữ:', '✍️ Amount in words:', '✍️ 金額（文字表記）:')}
                              </span>
                              <span className="italic font-bold">{numberToVietnameseWords(inVnd)}</span>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* AI & Rate Reference Timestamp (1 dòng nhỏ) */}
                    <div className="p-2 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/80 rounded-xl flex items-center gap-1.5 text-[10.5px] text-blue-900 dark:text-blue-200 font-medium">
                      <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span>{txt('Tỷ giá tham chiếu hạch toán cập nhật: 25/08/2026 (Theo Vietcombank / Tỷ giá hạch toán)', 'Reference exchange rate updated: 25/08/2026 (Vietcombank reference)', '会計基準換算レート（Vietcombank参考）')}</span>
                    </div>
                  </div>

                  {/* Ngày mua, Hạn bảo hành, Số tháng khấu hao */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">{txt('Ngày mua hàng', 'Purchase Date', '購入日')}</label>
                        <button
                          type="button"
                          onClick={() => setEditFormData((prev: any) => ({ ...prev, purchaseDate: new Date().toISOString().split('T')[0] }))}
                          className="text-[10.5px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                        >{txt('Hôm nay', 'Today', '今日')}</button>
                      </div>
                      <input
                        type="date"
                        value={editFormData.purchaseDate}
                        onChange={(e) => setEditFormData({ ...editFormData, purchaseDate: e.target.value })}
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">{txt('Hạn bảo hành', 'Warranty Expiration', '保証期限')}</label>
                        {editFormData.warrantyExpiry && (
                          <button
                            type="button"
                            onClick={() => setEditFormData((prev: any) => ({ ...prev, warrantyExpiry: '' }))}
                            className="text-[10.5px] text-red-500 hover:underline cursor-pointer"
                          >{txt('Xóa hạn', 'Clear', '解除')}</button>
                        )}
                      </div>
                      <input
                        type="date"
                        value={editFormData.warrantyExpiry}
                        onChange={(e) => setEditFormData({ ...editFormData, warrantyExpiry: e.target.value })}
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {/* Chọn nhanh thời hạn bảo hành */}
                      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                        <span className="text-[10px] text-slate-400 font-medium">{txt('Chọn nhanh:', 'Quick pick:', 'クイック選択:')}</span>
                        {[1, 2, 3, 5].map((yrs) => (
                          <button
                            key={yrs}
                            type="button"
                            onClick={() => {
                              const base = editFormData.purchaseDate ? new Date(editFormData.purchaseDate) : new Date();
                              base.setFullYear(base.getFullYear() + yrs);
                              setEditFormData((prev: any) => ({
                                ...prev,
                                warrantyExpiry: base.toISOString().split('T')[0],
                              }));
                            }}
                            className="px-2 py-0.5 text-[10.5px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-blue-950 dark:hover:text-blue-300 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors"
                          >
                            {txt(`+${yrs} năm`, `+${yrs} yr${yrs > 1 ? 's' : ''}`, `+${yrs}年`)}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            const base = editFormData.purchaseDate ? new Date(editFormData.purchaseDate) : new Date();
                            base.setFullYear(base.getFullYear() + 10);
                            setEditFormData((prev: any) => ({
                              ...prev,
                              warrantyExpiry: base.toISOString().split('T')[0],
                            }));
                          }}
                          className="px-2 py-0.5 text-[10.5px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 rounded-lg border border-amber-200 dark:border-amber-800 cursor-pointer transition-colors"
                        >{txt('Trọn đời', 'Lifetime', '無期限')}</button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{txt('Thời gian khấu hao (Tháng)', 'Depreciation Period (Months)', '減価償却期間 (月数)')}</label>
                      <select
                        value={editFormData.depreciationMonths || 36}
                        onChange={(e) => setEditFormData({ ...editFormData, depreciationMonths: Number(e.target.value) })}
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold outline-none cursor-pointer"
                      >
                        <option value={12}>{txt('12 tháng (1 năm)', '12 months (1 year)', '12ヶ月 (1年)')}</option>
                        <option value={24}>{txt('24 tháng (2 năm)', '24 months (2 years)', '24ヶ月 (2年)')}</option>
                        <option value={36}>{txt('36 tháng (3 năm - Mặc định)', '36 months (3 years - Default)', '36ヶ月 (3年 - 標準)')}</option>
                        <option value={60}>{txt('60 tháng (5 năm)', '60 months (5 years)', '60ヶ月 (5年)')}</option>
                      </select>
                    </div>
                  </div>

                  {/* Nhà cung cấp & Đường dẫn hóa đơn */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <ManageableDropdown
                        label={txt('Nhà cung cấp', 'Vendor / Supplier', '仕入先・ベンダー')}
                        placeholder={txt('-- Chọn nhà cung cấp --', '-- Select vendor --', '-- ベンダーを選択 --')}
                        icon={<Building className="w-3.5 h-3.5 text-blue-600" />}
                        items={vendors.map((v) => ({ id: v.id, name: v.name }))}
                        selectedValue={editFormData.vendorId}
                        onSelect={(id) => setEditFormData((prev: any) => ({ ...prev, vendorId: id }))}
                        onAdd={handleAddVendor}
                        onEdit={handleEditVendor}
                        onDelete={handleDeleteVendor}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{txt('Chứng từ / Hóa đơn đính kèm (URL/File)', 'Attached Document / Invoice (URL/File)', '添付書類・請求書 (URL/ファイル)')}</label>
                      <input
                        type="text"
                        placeholder={txt('https://... hoặc đường dẫn file hóa đơn PDF', 'https://... or invoice PDF path', 'https://... またはPDFファイルURL')}
                        value={editFormData.invoiceUrl || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, invoiceUrl: e.target.value })}
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none"
                      />
                    </div>
                  </div>

                  {/* Ghi chú */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{txt('Ghi chú mua hàng / Bảo hành', 'Purchase & Warranty Notes', '購入・保証メモ')}</label>
                    <textarea
                      rows={2}
                      placeholder={txt('Ghi chú về tình trạng mua, phụ kiện, số hotline bảo hành...', 'Notes on purchase status, accessories, warranty hotline...', '購入状況、付属品、保証サポート連絡先などのメモ...')}
                      value={editFormData.notes}
                      onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                      className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none"
                    />
                  </div>
                </div>
              )}

              {/* TAB 4: BẢN QUYỀN & LICENSE */}
              {modalActiveTab === 'licenses' && (() => {
                const specs = (editFormData.specs || {}) as Record<string, any>;
                const osLic = specs.osLicense;
                const officeLic = specs.officeLicense;
                const crack = specs.crackDetection;
                const licMatches = Array.isArray(specs.licenseMatches) ? specs.licenseMatches : [];
                const installedSw = Array.isArray(specs.installedSoftware) ? specs.installedSoftware : [];

                return (
                  <div className="space-y-4 animate-in fade-in duration-100">
                    {/* Header Banner */}
                    <div className="p-3 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl flex items-start justify-between gap-2.5 text-xs text-blue-950 dark:text-blue-200">
                      <div className="flex items-start gap-2.5">
                        <Layers className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">{txt('Quản Lý & Gán Bản Quyền Phần Mềm (Software & License)', 'Manage & Assign Software Licenses', 'ソフトウェア＆ライセンス管理・割当')}</span>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{txt('Kiểm tra bản quyền OS/Office đã quét từ máy trạm, đối soát với kho License và cấp phát license sử dụng.', 'Review OS/Office licenses scanned from workstation, reconcile with License inventory, and assign seats.', 'ワークステーションから検出されたOS/Officeライセンスを確認し、ライセンス台帳と突合して割り当てます。')}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAdminAddLicForm((prev) => !prev)}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors shrink-0 shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{showAdminAddLicForm ? txt('Đóng Form', 'Close Form', 'フォームを閉じる') : txt('+ Quản Trị Viên Thêm License', '+ Admin Add License', '+ 管理者によるライセンス追加')}</span>
                      </button>
                    </div>

                    {/* ADMIN DIRECT LICENSE CREATION FORM */}
                    {showAdminAddLicForm && (
                      <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl border-2 border-blue-300 dark:border-blue-700 space-y-3 animate-in fade-in">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-xs text-blue-950 dark:text-blue-200 uppercase tracking-wider flex items-center gap-1.5">
                            <Key className="w-3.5 h-3.5 text-blue-600" />
                            <span>{txt('Thêm Nhanh License Mới Vào Kho & Gán Ngay Vào Máy Này', 'Quick Add New License to Inventory & Assign to this PC', '新規ライセンスを登録してこの機器に即座に割当')}</span>
                          </span>
                          <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">{txt('Tự quản trị viên thêm', 'Added by Admin', '管理者直接入力')}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                              {txt('Tên Phần Mềm / License (*):', 'Software / License Name (*):', 'ソフトウェア / ライセンス名 (*):')}
                            </label>
                            <input
                              type="text"
                              placeholder="VD: AutoCAD 2024, Adobe Photoshop, Office 365..."
                              value={newLicForm.name}
                              onChange={(e) => setNewLicForm({ ...newLicForm, name: e.target.value })}
                              className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                              {txt('Product Key (Tùy chọn):', 'Product Key (Optional):', 'プロダクトキー (任意):')}
                            </label>
                            <input
                              type="text"
                              placeholder="VD: XXXXX-XXXXX..."
                              value={newLicForm.licenseKey}
                              onChange={(e) => setNewLicForm({ ...newLicForm, licenseKey: e.target.value })}
                              className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                              {txt('Số License (Seats):', 'Total Seats:', 'シート数 (ライセンス数):')}
                            </label>
                            <input
                              type="number"
                              min={1}
                              value={newLicForm.totalSeats}
                              onChange={(e) => setNewLicForm({ ...newLicForm, totalSeats: Math.max(1, parseInt(e.target.value) || 1) })}
                              className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <div className="flex items-center gap-2">
                            <label className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{txt('Loại bản quyền:', 'License Type:', 'ライセンス種別:')}</label>
                            {['PERPETUAL', 'SUBSCRIPTION', 'OEM'].map((t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => setNewLicForm({ ...newLicForm, licenseType: t })}
                                className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all ${
                                  newLicForm.licenseType === t
                                    ? 'bg-blue-600 text-white shadow-2xs'
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                                }`}
                              >
                                {t === 'PERPETUAL' ? txt('Vĩnh viễn', 'Perpetual', '永続ライセンス') : t === 'SUBSCRIPTION' ? txt('Thuê bao', 'Subscription', 'サブスクリプション') : txt('Theo máy OEM', 'OEM / Pre-installed', 'OEM / プリインストール')}
                              </button>
                            ))}
                          </div>
                          <button
                            type="button"
                            disabled={isSubmittingNewLic || !newLicForm.name.trim()}
                            onClick={() => handleAdminCreateAndAssignLicense()}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{isSubmittingNewLic ? txt('Đang thêm...', 'Adding...', '追加中...') : txt('Lưu Vào Kho & Gán Ngay', 'Save to Stock & Assign', '保存して割り当てる')}</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* SECTION 1: KẾT QUẢ QUÉT BẢN QUYỀN TỪ MÁY TRẠM (AGENT PS1) */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-indigo-600" />
                          <span className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                            {txt('Bản Quyền Đã Quét Từ Thiết Bị (Agent PS1)', 'Scanned Licenses from Device (PS1 Agent)', 'デバイスから検出されたライセンス (PS1エージェント)')}
                          </span>
                        </div>
                        {specs.lastScannedAt && (
                          <span className="text-[10.5px] text-slate-400 font-medium">
                            {txt('Quét lúc: ', 'Scanned at: ', 'スキャン日時: ')}{new Date(specs.lastScannedAt).toLocaleString(language === 'en' ? 'en-US' : language === 'ja' ? 'ja-JP' : 'vi-VN')}
                          </span>
                        )}
                      </div>

                      {/* Cảnh báo Crack / Bẻ khóa (Nếu có) */}
                      {crack?.hasSuspect && (
                        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl space-y-1.5 text-xs text-rose-950 dark:text-rose-200">
                          <div className="flex items-center gap-2 font-bold text-rose-800 dark:text-rose-300">
                            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>{txt('Cảnh Báo: Phát hiện dấu hiệu Bẻ khóa / Can thiệp bản quyền', 'Warning: Signs of KMS Crack / License Tampering Detected', '警告: クラック・改ざんの兆候が検出されました')}</span>
                          </div>
                          <ul className="list-disc list-inside space-y-0.5 text-[11.5px] text-rose-800 dark:text-rose-300 pl-1">
                            {crack.warnings.map((w: string, wIdx: number) => (
                              <li key={wIdx}>{w}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Grid 2 Card OS & Office License */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        {/* Windows OS License */}
                        <div className="p-3 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                              <Laptop className="w-3.5 h-3.5 text-blue-600" />
                              {txt('Bản Quyền Windows', 'Windows License', 'Windowsライセンス')}
                            </span>
                            {osLic?.isKmsCrack ? (
                              <span className="px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 text-[10px] font-bold">
                                {txt('KMS Lậu / Crack', 'Pirated KMS / Crack', '不正KMS / クラック')}
                              </span>
                            ) : osLic?.status === 'Licensed' ? (
                              <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                                {txt('Đã kích hoạt', 'Activated', 'ライセンス認証済み')} ({osLic.channel || txt('Bản quyền', 'Genuine', '正規品')})
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold">
                                {osLic?.status || txt('Chưa phát hiện', 'Not detected', '未検出')}
                              </span>
                            )}
                          </div>
                          <div className="text-[11.5px] text-slate-800 dark:text-slate-200 font-semibold truncate">
                            {osLic?.name || specs.os || editFormData.os || 'Windows OS'}
                          </div>
                          <div className="text-[10.5px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                            <span>{txt('Kênh:', 'Channel:', 'チャネル:')} <strong>{osLic?.channel || 'OEM / Retail'}</strong></span>
                            {osLic?.partialKey && (
                              <span className="font-mono">Key: ****-{osLic.partialKey}</span>
                            )}
                          </div>
                          {osLic && (
                            <button
                              type="button"
                              onClick={() => handleQuickAddLicenseFromModal(osLic.name || 'Windows 11 Pro', osLic.partialKey, osLic.channel)}
                              className="w-full py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg font-bold text-[11px] transition-colors flex items-center justify-center gap-1 cursor-pointer border border-blue-200 dark:border-blue-800"
                            >
                              <Plus className="w-3 h-3" />
                              <span>{txt('Đưa Windows Này Vào Kho License', 'Import Windows into License Pool', 'このWindowsをライセンス台帳に登録')}</span>
                            </button>
                          )}
                        </div>

                        {/* MS Office License */}
                        <div className="p-3 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-orange-600" />
                              {txt('Bản Quyền MS Office', 'MS Office License', 'MS Officeライセンス')}
                            </span>
                            {officeLic?.status === 'Licensed' ? (
                              <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                                {officeLic.channel === 'Subscription' ? txt('O365 Bản quyền', 'O365 Genuine', 'O365 サブスクリプション') : txt('Kích hoạt', 'Activated', '認証済み')}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold">
                                {officeLic?.status || txt('Chưa phát hiện', 'Not detected', '未検出')}
                              </span>
                            )}
                          </div>
                          <div className="text-[11.5px] text-slate-800 dark:text-slate-200 font-semibold truncate">
                            {officeLic?.name || txt('Chưa cài đặt Office hoặc phiên bản web', 'Office not installed or web edition', 'Office未インストールまたはWeb版')}
                          </div>
                          <div className="text-[10.5px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                            <span>{txt('Kênh:', 'Channel:', 'チャネル:')} <strong>{officeLic?.channel || txt('Chưa rõ', 'Unknown', '不明')}</strong></span>
                            {officeLic?.partialKey && (
                              <span className="font-mono">Key: ****-{officeLic.partialKey}</span>
                            )}
                          </div>
                          {officeLic && (
                            <button
                              type="button"
                              onClick={() => handleQuickAddLicenseFromModal(officeLic.name || 'Microsoft Office 365', officeLic.partialKey, officeLic.channel)}
                              className="w-full py-1.5 bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/60 dark:hover:bg-orange-900 text-orange-700 dark:text-orange-300 rounded-lg font-bold text-[11px] transition-colors flex items-center justify-center gap-1 cursor-pointer border border-orange-200 dark:border-orange-800"
                            >
                              <Plus className="w-3 h-3" />
                              <span>{txt('Đưa Office Này Vào Kho License', 'Import Office into License Pool', 'このOfficeをライセンス台帳に登録')}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* License Matches Alert (Unassigned) */}
                      {licMatches.some((m: any) => m.matchStatus === 'UNASSIGNED_MATCH') && (
                        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl space-y-2 text-xs text-amber-950 dark:text-amber-200">
                          <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                            <Key className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>{txt('Phát hiện phần mềm trên máy trùng với License trong kho (Chưa gán):', 'Detected installed software matching available licenses in pool (Unassigned):', '台帳内の未割当ライセンスと一致するソフトウェアが検出されました:')}</span>
                          </div>
                          <div className="space-y-1.5">
                            {licMatches
                              .filter((m: any) => m.matchStatus === 'UNASSIGNED_MATCH')
                              .map((m: any, mIdx: number) => (
                                <div key={mIdx} className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800 flex items-center justify-between gap-2">
                                  <div>
                                    <div className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                                      <span>{m.softwareName}</span>
                                      <span className="text-amber-700 dark:text-amber-400 font-normal">→ Kho:</span>
                                      <span className="text-blue-700 dark:text-blue-300 font-bold">{m.licenseName}</span>
                                    </div>
                                    <div className="text-[10.5px] text-slate-500 dark:text-slate-400">
                                      {txt('License khả dụng:', 'Available seats:', '空きシート数:')} <strong className="text-emerald-600">{m.availableSeats} / {m.seats}</strong>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!selectedLicenseIds.includes(m.licenseId)) {
                                        setSelectedLicenseIds((prev) => [...prev, m.licenseId]);
                                      }
                                    }}
                                    className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs transition-colors shrink-0 shadow-xs cursor-pointer flex items-center gap-1"
                                  >
                                    <Check className="w-3 h-3" />
                                    <span>{selectedLicenseIds.includes(m.licenseId) ? txt('Đã chọn gán', 'Assigned', '割当済み') : txt('Chọn Gán Vào Máy', 'Assign to PC', 'この機器に割り当てる')}</span>
                                  </button>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* SECTION 2: DANH SÁCH LICENSE TRONG KHO HỆ THỐNG */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Key className="w-3.5 h-3.5 text-blue-600" />
                          <span>{txt('Kho License Của Hệ Thống', 'System License Pool', '登録ライセンス一覧')} ({licenses.length})</span>
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {txt('Đã chọn gán:', 'Assigned:', '割当済み:')} <strong className="text-blue-600 dark:text-blue-400">{selectedLicenseIds.length}</strong> {txt('License', 'License(s)', 'ライセンス')}
                        </span>
                      </div>

                      {licenses.length === 0 ? (
                        <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl space-y-2">
                          <Layers className="w-7 h-7 text-slate-300 mx-auto" />
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{txt('Chưa có bản quyền phần mềm nào trong kho', 'No software licenses in pool', '登録ライセンスがありません')}</p>
                          <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                            {txt('Bạn có thể nhấn các nút "+ Đưa vào Kho License" ở phần quét phía trên để tự động đưa Windows/Office vào kho, hoặc bấm "Tạo Mới License" để thêm thủ công.', 'You can click "+ Import into License Pool" above to register Windows/Office, or click "Create License" to add manually.', '上の「ライセンス台帳に登録」ボタンをクリックして自動登録するか、「新規ライセンス作成」から手動で登録してください。')}
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
                          {licenses.map((lic) => {
                            const isAssigned = selectedLicenseIds.includes(lic.id);
                            return (
                              <div
                                key={lic.id}
                                onClick={() => {
                                  setSelectedLicenseIds((prev) =>
                                    isAssigned ? prev.filter((id) => id !== lic.id) : [...prev, lic.id]
                                  );
                                }}
                                className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                                  isAssigned
                                    ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-300 dark:border-blue-700 ring-2 ring-blue-200 dark:ring-blue-900'
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                }`}
                              >
                                <div className="space-y-1 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-xs text-slate-900 dark:text-white">{lic.name}</span>
                                    <span className="text-[10px] font-bold px-1.5 py-0.2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded">
                                      {lic.licenseType || 'PERPETUAL'}
                                    </span>
                                  </div>
                                  <div className="text-[10.5px] text-slate-400 flex items-center gap-2">
                                    <span>Seats: {lic.usedSeats || 0}/{lic.totalSeats || 1}</span>
                                    {lic.expiryDate && (
                                      <span>{txt('• Hạn: ', '• Exp: ', '• 期限: ')}{new Date(lic.expiryDate).toLocaleDateString(language === 'en' ? 'en-US' : language === 'ja' ? 'ja-JP' : 'vi-VN')}</span>
                                    )}
                                  </div>
                                </div>

                                <div className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-colors ${
                                  isAssigned
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                                }`}>
                                  {isAssigned && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* SECTION 3: DANH SÁCH PHẦN MỀM ĐÃ QUÉT TRÊN MÁY */}
                    {installedSw.length > 0 && (
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-indigo-600" />
                            <span>{txt('Phần mềm & Ứng dụng đã cài đặt trên máy', 'Installed Software & Applications on Device', 'インストール済みソフトウェア・アプリケーション')} ({installedSw.length})</span>
                          </span>
                        </div>
                        <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                          {installedSw.map((sw: any, sIdx: number) => {
                            const isCommercial =
                              sw.name?.toLowerCase().includes('office') ||
                              sw.name?.toLowerCase().includes('photoshop') ||
                              sw.name?.toLowerCase().includes('autocad') ||
                              sw.name?.toLowerCase().includes('adobe');

                            return (
                              <div key={sIdx} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center justify-between gap-2 text-xs">
                                <div>
                                  <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                    <span>{sw.name}</span>
                                    {isCommercial && (
                                      <span className="px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[9px] font-bold">{txt('Cần License', 'License Needed', '要ライセンス')}</span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    {sw.publisher || txt('Nhà phát triển không xác định', 'Unknown Publisher', '不明な発行元')} {sw.version ? `· v${sw.version}` : ''}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleQuickAddLicenseFromModal(sw.name, undefined, isCommercial ? 'COMMERCIAL' : 'PERPETUAL')}
                                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[10.5px] font-semibold transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
                                >
                                  <Plus className="w-2.5 h-2.5" />
                                  <span>{txt('Thêm vào Kho', 'Add to Pool', '台帳に追加')}</span>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </form>

            {/* Modal Sticky Footer */}
            <div className="flex items-center justify-between gap-2 px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 rounded-b-3xl shrink-0">
              <div className="flex items-center gap-2">
                {editingAssetId && (
                  <button
                    type="button"
                    onClick={() => {
                      if (asset) onOpenMaintenance?.(asset);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    <Wrench className="w-3.5 h-3.5 text-amber-600" />
                    <span>{txt('Lịch Sử Sửa Chữa', 'Repair History', '修理履歴')}</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onClose()}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 cursor-pointer"
                >{txt('Hủy (Esc)', 'Cancel (Esc)', 'キャンセル (Esc)')}</button>
                <button
                  type="submit"
                  form="edit-asset-form"
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{txt('Phê Duyệt & Lưu Tài Sản', 'Approve & Save Asset', '資産を承認して保存')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
  );
};
