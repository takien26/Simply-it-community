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
  FileText,
  Receipt,
  Plus,
  Clock,
  Building,
  Check,
  X,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';
import { numberToVietnameseWords } from '@/lib/utils';
import CurrencyInput from '@/components/ui/currency-input';
import { ManageableDropdown } from './ManageableDropdown';
import { getCategoryFields, getFriendlySpecLabel, formatPrice, renderCategoryIcon } from './types';

export interface AssetAddModalProps {
  isOpen: boolean;
  onClose: () => void;
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
  onSuccess: () => void;
}

export const AssetAddModal: React.FC<AssetAddModalProps> = ({
  isOpen,
  onClose,
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

  const [formData, setFormData] = useState<any>({
    name: '',
    assetTag: '',
    categoryId: '',
    brand: '',
    model: '',
    serialNumber: '',
    status: 'AVAILABLE',
    condition: 'NEW',
    purchaseDate: new Date().toISOString().split('T')[0],
    purchasePrice: '',
    purchaseCurrency: 'VND',
    exchangeRate: 1,
    warrantyExpiry: '',
    companyName: '',
    vendorId: '',
    locationId: '',
    contractNumber: '',
    invoiceNumber: '',
    assignedUserId: '',
    specs: {},
    notes: '',
  });

  useEffect(() => {
    if (isOpen) {
      setModalActiveTab('general');
      setSelectedLicenseIds([]);
      setAiLookupStatus(null);
      setFormData({
        name: '',
        assetTag: '',
        categoryId: categories[0]?.id || '',
        brand: '',
        model: '',
        serialNumber: '',
        status: 'AVAILABLE',
        condition: 'NEW',
        purchaseDate: new Date().toISOString().split('T')[0],
        purchasePrice: '',
        purchaseCurrency: 'VND',
        exchangeRate: 1,
        warrantyExpiry: '',
        companyName: '',
        vendorId: '',
        locationId: '',
        contractNumber: '',
        invoiceNumber: '',
        assignedUserId: '',
        specs: {},
        notes: '',
      });
    }
  }, [isOpen, categories]);

  // AI Specs Lookup
  const handleAiLookupModel = async (modelName: string, isEdit: boolean = false) => {
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

        let targetCategoryObj = categories.find((c) => c.id === formData.categoryId);
        let isCategoryChanged = false;
        let effectiveCatId = formData.categoryId;

        if (matchedCategoryName) {
          const foundCat = categories.find(
            (c) => c.name.toLowerCase().trim() === matchedCategoryName.toLowerCase().trim()
          );
          if (foundCat && (!targetCategoryObj || targetCategoryObj.name.toLowerCase().includes('khác') || targetCategoryObj.name.toLowerCase().includes('thiết bị văn phòng') || !formData.categoryId)) {
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

        setFormData((prev: any) => {
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
    if (!isOpen || !formData.model || formData.model.trim().length < 3) return;
    const timer = setTimeout(() => {
      handleAiLookupModel(formData.model, false);
    }, 800);
    return () => clearTimeout(timer);
  }, [formData.model, isOpen]);

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        purchaseDate: formData.purchaseDate || new Date().toISOString().split('T')[0],
        assignedLicenseIds: selectedLicenseIds,
        purchaseCurrency: formData.purchaseCurrency || 'VND',
        exchangeRate: formData.exchangeRate || exchangeRatesMap[formData.purchaseCurrency || 'VND'] || 1,
        specs: {
          ...(formData.specs || {}),
          exchangeRate: formData.exchangeRate || exchangeRatesMap[formData.purchaseCurrency || 'VND'] || 1,
          assignedLicenseIds: selectedLicenseIds,
        },
      };

      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        onClose();
        onSuccess();
      } else {
        alert(`❌ ${data.error || txt('Tạo tài sản thất bại', 'Failed to create asset', '資産の作成に失敗しました')}`);
      }
    } catch (err: any) {
      alert(`❌ ${txt('Lỗi kết nối khi tạo tài sản: ', 'Connection error creating asset: ', '資産作成の通信エラー: ')}${err?.message || err}`);
    }
  };

  if (!isOpen) return null;

  return (
<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[92vh] border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 shrink-0">
              <div className="space-y-0.5">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Laptop className="w-4 h-4 text-blue-600" />
                  <span>{txt('Thêm Mới Tài Sản IT', 'Add New IT Asset', '新規IT資産登録')}</span>
                </h3>
                <p className="text-xs text-slate-500">{txt('Khai báo cấu hình, đơn vị sử dụng, chứng từ mua sắm và bản quyền phần mềm', 'Declare specs, allocation, procurement documents and software licenses', 'スペック、使用者、調達情報、ライセンスの登録')}</p>
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
              id="add-asset-form"
              onSubmit={(e) => {
                formData.specs = {
                  ...(formData.specs || {}),
                  assignedLicenseIds: selectedLicenseIds,
                  depreciationMonths: formData.depreciationMonths || 36,
                };
                handleCreateAsset(e);
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
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{txt('Mã Tag (Trống = Tự sinh)', 'Asset Tag (Blank = Auto)', '資産タグ（空欄＝自動採番）')}</label>
                      <input
                        type="text"
                        placeholder={txt('Tự tạo (VD: IT-LAP-0001)', 'Custom (e.g. IT-LAP-0001)', '手動入力（例：IT-LAP-0001）')}
                        value={formData.assetTag}
                        onChange={(e) => setFormData({ ...formData, assetTag: e.target.value.toUpperCase() })}
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-blue-900 dark:text-blue-300 outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                      />
                    </div>

                    {/* Tên thiết bị */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{txt('Tên thiết bị (*)', 'Device Name (*)', 'デバイス名 (*)')}</label>
                      <input
                        type="text"
                        required
                        placeholder={txt('VD: Laptop Dell Latitude 5540...', 'e.g. Laptop Dell Latitude 5540...', '例：Dell Latitude 5540...')}
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Danh mục */}
                    <div>
                      <ManageableDropdown
                        label={txt('Danh mục (*)', 'Category (*)', 'カテゴリ (*)')}
                        placeholder={txt('-- Chọn danh mục --', '-- Select category --', '-- カテゴリを選択 --')}
                        items={categories.map((c) => ({ id: c.id, name: c.name, icon: renderCategoryIcon(c.icon, 'w-4 h-4') }))}
                        selectedValue={formData.categoryId}
                        onSelect={(id) => setFormData((prev: any) => ({ ...prev, categoryId: id }))}
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
                        value={formData.brand}
                        onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Model</label>
                        <button
                          type="button"
                          onClick={() => handleAiLookupModel(formData.model, false)}
                          disabled={aiLookupLoading || !formData.model?.trim()}
                          className="text-[10px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800 px-2 py-0.5 rounded-lg flex items-center gap-1 cursor-pointer disabled:opacity-40"
                        >
                          {aiLookupLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-purple-600" />}
                          <span>{txt('AI Tra Cứu Specs', 'AI Lookup Specs', 'AIスペック検索')}</span>
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder={txt('VD: Latitude 5540, IdeaPad Slim 3...', 'e.g. Latitude 5540, IdeaPad Slim 3...', '例：Latitude 5540, IdeaPad Slim 3...')}
                        value={formData.model}
                        onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{txt('Số Serial (SN) (*)', 'Serial Number (SN) (*)', 'シリアル番号 (SN) (*)')}</label>
                      <input
                        type="text"
                        placeholder="SN123456789..."
                        value={formData.serialNumber}
                        onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
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
                          selectedValue={formData.companyName}
                          onSelect={(name) => setFormData((prev: any) => ({ ...prev, companyName: name }))}
                          onAdd={handleAddCompany}
                          onEdit={handleEditCompany}
                          onDelete={(id, name) => handleDeleteCompany(name)}
                          allowEmpty={true}
                          emptyLabel={txt('-- Chưa phân công ty --', '-- Unassigned company --', '-- 会社未割当 --')}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{txt('Người đang sử dụng:', 'Assigned User:', '使用者:')}</label>
                        <select
                          value={formData.assignedUserId || ''}
                          onChange={(e) => setFormData({ ...formData, assignedUserId: e.target.value })}
                          className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        >
                          <option value="">-- {txt('Trong kho IT (Chưa cấp phát)', 'In IT Stock (Unassigned)', 'IT倉庫内（未割当）')} --</option>
                          {users.map((u) => (
                            <option key={u.id} value={u.id}>
                              👤 {u.fullName} {u.companyName ? `[${u.companyName}]` : ''} ({u.department || 'Staff'})
                            </option>
                          ))}
                        </select>
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
                        selectedValue={formData.locationId}
                        onSelect={(id) => setFormData((prev: any) => ({ ...prev, locationId: id }))}
                        onAdd={handleAddLocation}
                        onEdit={handleEditLocation}
                        onDelete={handleDeleteLocation}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{txt('Trạng thái', 'Status', 'ステータス')}</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none cursor-pointer"
                      >
                        <option value="AVAILABLE">🟢 {txt('AVAILABLE (Sẵn sàng)', 'AVAILABLE (In Stock)', 'AVAILABLE (利用可能)')}</option>
                        <option value="PENDING">🟠 {txt('PENDING (Đang chờ duyệt)', 'PENDING (Pending Approval)', 'PENDING (承認待ち)')}</option>
                        <option value="IN_USE">🔵 {txt('IN_USE (Đang dùng)', 'IN_USE (In Use)', 'IN_USE (使用中)')}</option>
                        <option value="MAINTENANCE">🟡 {txt('MAINTENANCE (Bảo trì)', 'MAINTENANCE (Under Maintenance)', 'MAINTENANCE (保守中)')}</option>
                        <option value="RETIRED">⚪ {txt('RETIRED (Thanh lý)', 'RETIRED (Retired/Disposed)', 'RETIRED (廃棄・除籍)')}</option>
                        <option value="LOST">🔴 {txt('LOST (Mất/Thất lạc)', 'LOST (Lost/Missing)', 'LOST (紛失)')}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{txt('Tình trạng vật lý', 'Physical Condition', '物理状態')}</label>
                      <select
                        value={formData.condition}
                        onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
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

              {/* TAB 2: CẤU HÌNH PHẦN CỨNG */}
              {modalActiveTab === 'specs' && (
                <div className="space-y-4 animate-in fade-in duration-100">
                  <div className="p-3 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl flex items-start gap-2.5 text-xs text-blue-950 dark:text-blue-200">
                    <Cpu className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">{txt('Cấu hình phần cứng & Thông số kỹ thuật chi tiết', 'Hardware Specs & Technical Details', 'ハードウェア構成と技術仕様')}</span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{txt('Nhập các thông số kỹ thuật chính xác để quản lý và theo dõi cấu hình máy trạm.', 'Enter accurate technical specifications to manage and monitor workstation configurations.', 'ワークステーションの構成を正確に管理・監視するために技術仕様を入力してください。')}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* OS */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{txt('Hệ điều hành (OS)', 'Operating System (OS)', 'OS (オペレーティングシステム)')}</label>
                      <input
                        type="text"
                        placeholder="Windows 11 Pro, macOS Sonoma..."
                        value={formData.specs?.os || ''}
                        onChange={(e) =>
                          setFormData((prev: any) => ({
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
                        value={formData.specs?.hostname || ''}
                        onChange={(e) =>
                          setFormData((prev: any) => ({
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
                        value={formData.specs?.cpu || ''}
                        onChange={(e) =>
                          setFormData((prev: any) => ({
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
                        value={formData.specs?.ram || ''}
                        onChange={(e) =>
                          setFormData((prev: any) => ({
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
                        value={formData.specs?.gpu || ''}
                        onChange={(e) =>
                          setFormData((prev: any) => ({
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
                        value={formData.specs?.storage || ''}
                        onChange={(e) =>
                          setFormData((prev: any) => ({
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
                        value={formData.specs?.ipAddress || ''}
                        onChange={(e) =>
                          setFormData((prev: any) => ({
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
                        value={formData.specs?.macAddress || ''}
                        onChange={(e) =>
                          setFormData((prev: any) => ({
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
                        value={formData.specs?.antivirus || ''}
                        onChange={(e) =>
                          setFormData((prev: any) => ({
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
                    const definedFields = getCategoryFields(categories, formData.categoryId);
                    if (definedFields.length === 0) return null;

                    return (
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {txt(`Thông số mở rộng theo danh mục (${definedFields.length} trường):`, `Category Custom Fields (${definedFields.length} fields):`, `カテゴリ拡張項目 (${definedFields.length} 項目):`)}
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {definedFields.map((field) => {
                            const val = formData.specs?.[field.key] ?? '';
                            return (
                              <div key={field.key}>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                  {field.label}
                                </label>
                                <input
                                  type="text"
                                  value={val}
                                  onChange={(e) =>
                                    setFormData((prev: any) => ({
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
                        value={formData.contractNumber}
                        onChange={(e) => setFormData({ ...formData, contractNumber: e.target.value })}
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
                        value={formData.invoiceNumber}
                        onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
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
                          value={formData.purchasePrice}
                          onChange={(val) => setFormData({ ...formData, purchasePrice: val })}
                          currency={formData.purchaseCurrency || 'VND'}
                          currencyName={currencies.find((c) => c.code === (formData.purchaseCurrency || 'VND'))?.name}
                          exchangeRate={formData.exchangeRate || exchangeRatesMap[formData.purchaseCurrency || 'VND'] || 1}
                          placeholder="VD: 1.000"
                        />
                      </div>

                      {/* Loại tiền tệ gốc */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{txt('Loại tiền tệ gốc', 'Original Currency', '原通貨')}</label>
                        <select
                          value={formData.purchaseCurrency || 'VND'}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '__ADD_NEW__') {
                              onOpenAddCurrency?.();
                              return;
                            }
                            const found = currencies.find((c) => c.code === val);
                            setFormData({
                              ...formData,
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
                          {txt(`Tỷ giá hạch toán (1 ${formData.purchaseCurrency || 'VND'} = ? VNĐ)`, `Exchange Rate (1 ${formData.purchaseCurrency || 'VND'} = ? VND)`, `換算レート (1 ${formData.purchaseCurrency || 'VND'} = ? VND)`)}
                        </label>
                        <input
                          type="number"
                          value={formData.exchangeRate || exchangeRatesMap[formData.purchaseCurrency || 'VND'] || 1}
                          onChange={(e) => setFormData({ ...formData, exchangeRate: Number(e.target.value) })}
                          className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold outline-none"
                        />
                      </div>
                    </div>

                    {/* KHỐI 2: Ô GIÁ TIỀN QUY CHUẨN VNĐ RIÊNG & BẰNG CHỮ RÕ RÀNG */}
                    {(() => {
                      const numVal = Number(String(formData.purchasePrice).replace(/\D/g, '')) || 0;
                      const curr = formData.purchaseCurrency || 'VND';
                      const rate = formData.exchangeRate || exchangeRatesMap[curr] || 1;
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

                    {/* AI & Rate Reference Timestamp */}
                    <div className="p-2.5 bg-blue-100/70 dark:bg-blue-950/60 rounded-xl border border-blue-200/80 dark:border-blue-800/80 text-[11px] text-blue-900 dark:text-blue-200 space-y-0.5">
                      <p className="font-bold flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>{txt('Tỷ giá tham chiếu hạch toán cập nhật: 25/08/2026 (Theo Vietcombank / Tỷ giá hạch toán)', 'Reference exchange rate updated: 25/08/2026 (Vietcombank reference)', '会計基準換算レート（Vietcombank参考）')}</span>
                      </p>
                      <p className="text-blue-700 dark:text-blue-300">
                        {txt('💡 Tỷ giá được cố định tại thời điểm ghi nhận hóa đơn tài sản để phục vụ đối soát tài chính chính xác.', '💡 The exchange rate is fixed at invoice entry for accurate financial auditing.', '💡 資産計上時点の換算レートで固定され、正確な財務突合に使用されます。')}
                      </p>
                    </div>
                  </div>

                  {/* Ngày mua, Hạn bảo hành, Số tháng khấu hao */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">{txt('Ngày mua hàng (*)', 'Purchase Date (*)', '購入日 (*)')}</label>
                        <button
                          type="button"
                          onClick={() => setFormData((prev: any) => ({ ...prev, purchaseDate: new Date().toISOString().split('T')[0] }))}
                          className="text-[10.5px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                        >{txt('Hôm nay', 'Today', '今日')}</button>
                      </div>
                      <input
                        type="date"
                        value={formData.purchaseDate}
                        onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                          {txt('Hạn bảo hành', 'Warranty Expiration', '保証期限')}
                        </label>
                        {formData.warrantyExpiry && (
                          <button
                            type="button"
                            onClick={() => setFormData((prev: any) => ({ ...prev, warrantyExpiry: '' }))}
                            className="text-[10.5px] text-red-500 hover:underline cursor-pointer"
                          >{txt('Xóa hạn', 'Clear', '解除')}</button>
                        )}
                      </div>
                      <input
                        type="date"
                        value={formData.warrantyExpiry}
                        onChange={(e) => setFormData({ ...formData, warrantyExpiry: e.target.value })}
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
                              const base = formData.purchaseDate ? new Date(formData.purchaseDate) : new Date();
                              base.setFullYear(base.getFullYear() + yrs);
                              setFormData((prev: any) => ({
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
                            const base = formData.purchaseDate ? new Date(formData.purchaseDate) : new Date();
                            base.setFullYear(base.getFullYear() + 10);
                            setFormData((prev: any) => ({
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
                        value={formData.depreciationMonths || 36}
                        onChange={(e) => setFormData({ ...formData, depreciationMonths: Number(e.target.value) })}
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
                        selectedValue={formData.vendorId}
                        onSelect={(id) => setFormData((prev: any) => ({ ...prev, vendorId: id }))}
                        onAdd={handleAddVendor}
                        onEdit={handleEditVendor}
                        onDelete={handleDeleteVendor}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{txt('Chứng từ / Hóa đơn đính kèm (URL/File)', 'Attached Document / Invoice (URL/File)', '添付書類・請求書 (URL/ファイル)')}</label>
                      <input
                        type="text"
                        placeholder={txt('https://... hoặc đường dẫn file hóa đơn PDF', 'https://... or invoice PDF file path', 'https://... またはPDFファイルURL')}
                        value={formData.invoiceUrl || ''}
                        onChange={(e) => setFormData({ ...formData, invoiceUrl: e.target.value })}
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
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none"
                    />
                  </div>
                </div>
              )}

              {/* TAB 4: BẢN QUYỀN & LICENSE */}
              {modalActiveTab === 'licenses' && (
                <div className="space-y-4 animate-in fade-in duration-100">
                  <div className="p-3 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl flex items-start gap-2.5 text-xs text-blue-950 dark:text-blue-200">
                    <Layers className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">{txt('Gán bản quyền phần mềm khả dụng vào thiết bị này', 'Assign Available Software Licenses to this Device', '利用可能なソフトウェアライセンスを割り当てる')}</span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{txt('Tích chọn phần mềm để tự động theo dõi số seat sử dụng và quản lý chi phí bản quyền.', 'Check software to automatically track assigned seats and license costs.', 'ソフトウェアを選択すると、使用シート数とライセンス費用が自動管理されます。')}</p>
                    </div>
                  </div>

                  {licenses.length === 0 ? (
                    <div className="text-center py-10 bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl space-y-2">
                      <Layers className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{txt('Chưa có bản quyền phần mềm nào trong hệ thống', 'No software licenses in system', '登録されたソフトウェアライセンスがありません')}</p>
                      <p className="text-[11px] text-slate-400">{txt('Bạn có thể thêm License mới tại trang Quản lý Bản quyền.', 'You can add new licenses on the License Management page.', 'ライセンス管理画面から新規ライセンスを追加できます。')}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              )}
            </form>

            {/* Modal Sticky Footer */}
            <div className="flex items-center justify-between gap-2 px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 rounded-b-3xl shrink-0">
              <button
                type="button"
                onClick={() => onClose()}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 cursor-pointer"
              >{txt('Hủy (Esc)', 'Cancel (Esc)', 'キャンセル (Esc)')}</button>

              <button
                type="submit"
                form="add-asset-form"
                className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{txt('Tạo & Lưu Tài Sản', 'Create & Save Asset', '資産を作成・保存')}</span>
              </button>
            </div>
          </div>
        </div>
  );
};
