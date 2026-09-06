'use client';

import { useLanguage } from '@/lib/i18n/context';

import { useState, useEffect } from 'react';
import {
  Plus,
  Sparkles,
  Upload,
  FileText,
  Type,
  CheckCircle,
  AlertTriangle,
  Loader2,
  X,
  Globe,
  RefreshCw,
  Building2,
  Tag,
  Key,
  Laptop,
  Calendar,
  DollarSign,
  Cpu,
  Receipt,
  User,
  MapPin,
  Truck,
  Check,
  ChevronDown,
  ChevronUp,
  Trash2,
  Sliders,
  Building,
} from 'lucide-react';

import { ManageableDropdown } from '@/components/ui/manageable-dropdown';
import CurrencyInput from '@/components/ui/currency-input';
import WarrantyInput from '@/components/ui/warranty-input';

interface AIQuickInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface AssetItem {
  id: string;
  targetEntity: 'ASSET' | 'LICENSE' | 'SERVICE';
  selected: boolean;
  isExpanded: boolean;
  assetTag: string;
  serviceCode?: string;
  name: string;
  categoryId: string;
  brand: string;
  model: string;
  serialNumber: string;
  serviceType?: string;
  billingCycle?: string;
  accountNumber?: string;
  licenseKey?: string;
  licenseType?: string;
  totalSeats?: number;
  purchasePrice: string | number;
  purchaseDate: string;
  warrantyExpiry: string;
  expiryDate?: string;
  startDate?: string;
  renewalDate?: string;
  companyName: string;
  assignedUserId: string;
  locationId: string;
  vendorId: string;
  specs: Record<string, any>;
  notes: string;
}

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

function detectItemEntity(raw: any, rawText: string): 'ASSET' | 'LICENSE' | 'SERVICE' {
  const fullText = `${raw?.categoryName || ''} ${raw?.name || ''} ${raw?.model || ''} ${raw?.brand || ''} ${raw?.serviceType || ''} ${rawText || ''}`.toLowerCase();

  const serviceKeywords = [
    'dịch vụ', 'internet', 'đường truyền', 'cáp quang', 'vnpt', 'viettel', 'fpt telecom',
    'domain', 'tên miền', 'hosting', 'vps', 'cloud server', 'aws', 'azure', 'gcp',
    'bảo trì định kỳ', 'sla', 'thuê bao', 'gói cước', 'thuê chỗ đặt', 'co-location',
    'chữ ký số', 'hóa đơn điện tử', 'bảo hành mở rộng'
  ];

  const licenseKeywords = [
    'license', 'bản quyền', 'windows 11 pro', 'office 365', 'm365', 'microsoft 365',
    'autocad', 'antivirus', 'kaspersky', 'vmware', 'photoshop', 'adobe', 'cal license',
    'perpetual', 'subscription key', 'sql server standard', 'cals'
  ];

  if (serviceKeywords.some((kw) => fullText.includes(kw))) return 'SERVICE';
  if (licenseKeywords.some((kw) => fullText.includes(kw))) return 'LICENSE';
  return 'ASSET';
}

function resolveSmartCategory(
  item: any,
  rawText: string,
  categoriesList: any[]
): string {
  if (!categoriesList || categoriesList.length === 0) return '';

  const fullText = `${item?.categoryName || ''} ${item?.name || ''} ${item?.model || ''} ${item?.brand || ''} ${rawText || ''}`.toLowerCase();

  const categoryRules: Array<{ keywords: string[]; targetNames: string[] }> = [
    {
      keywords: ['laptop', 'macbook', 'zenbook', 'thinkpad', 'latitude', 'vivobook', 'inspiron', 'legion', 'rog', 'pavilion', 'elitebook', 'vostro', 'probook', 'surface pro', 'notebook', 'ultrabook', 'aspire lite'],
      targetNames: ['Laptop'],
    },
    {
      keywords: ['optiplex', 'thinkcentre', 'prodesk', 'elitedesk', 'expertcenter', 'pc để bàn', 'máy tính bàn', 'máy tính để bàn', 'desktop', 'tower pc', 'mini pc', 'all-in-one', 'aio'],
      targetNames: ['PC / Máy tính để bàn', 'Máy tính để bàn', 'PC', 'Desktop'],
    },
    {
      keywords: ['màn hình', 'monitor', 'display', 'screen', 'ultrasharp', 'proart', 'viewsonic', 'lg gram'],
      targetNames: ['Màn hình'],
    },
    {
      keywords: ['máy chủ', 'server', 'poweredge', 'proliant', 'rackmount', 'nas', 'synology'],
      targetNames: ['Máy chủ & Hệ thống (Server)', 'Máy chủ', 'Server'],
    },
    {
      keywords: ['máy in', 'printer', 'laserjet', 'canon lbp', 'epson', 'brother'],
      targetNames: ['Máy in'],
    },
    {
      keywords: ['loa', 'speaker', 'micro', 'headset', 'tai nghe', 'jabra', 'speak 750', 'speak 710', 'poly', 'plantronics', 'earphone'],
      targetNames: ['Tai nghe / Loa', 'Phụ kiện', 'Thiết bị văn phòng'],
    },
    {
      keywords: ['router', 'access point', 'switch', 'cisco', 'mikrotik', 'draytek', 'unifi', 'aruba', 'thiết bị mạng', 'catalyst', 'fortigate'],
      targetNames: ['Thiết bị mạng', 'Router', 'Switch', 'Access Point'],
    },
    {
      keywords: ['voip', 'yealink', 'pa20', 'polycom', 'grandstream', 'sip', 'paging', 'intercom', 'điện thoại ip', 'ip phone', 'hội nghị', 'camera họp', 'webcam'],
      targetNames: ['VoIP & Hội nghị truyền hình', 'Thiết bị di động', 'Thiết bị văn phòng'],
    },
    {
      keywords: ['ups', 'bộ lưu điện', 'apc', 'santak', 'pdu', 'nguồn dự phòng', 'ắc quy'],
      targetNames: ['Bộ lưu điện (UPS) & Nguồn', 'Phụ kiện'],
    },
    {
      keywords: ['bàn phím', 'chuột', 'keyboard', 'mouse', 'logitech', 'keychron'],
      targetNames: ['Bàn phím & Chuột'],
    },
    {
      keywords: ['adapter', 'sạc', 'charger', 'củ sạc', 'nguồn', 'power supply'],
      targetNames: ['Adapter / Sạc'],
    },
  ];

  if (item?.categoryName) {
    const directMatch = categoriesList.find((c) =>
      c.name.toLowerCase().includes(item.categoryName.toLowerCase()) ||
      item.categoryName.toLowerCase().includes(c.name.toLowerCase())
    );
    if (directMatch) return directMatch.id;
  }

  for (const rule of categoryRules) {
    if (rule.keywords.some((kw) => fullText.includes(kw))) {
      for (const target of rule.targetNames) {
        const catMatch = categoriesList.find((c) =>
          c.name.toLowerCase() === target.toLowerCase() ||
          c.name.toLowerCase().includes(target.toLowerCase()) ||
          target.toLowerCase().includes(c.name.toLowerCase())
        );
        if (catMatch) return catMatch.id;
      }
    }
  }

  const laptopCat = categoriesList.find((c) => c.name.toLowerCase().includes('laptop'));
  if (laptopCat) return laptopCat.id;

  return categoriesList[0]?.id || '';
}

function normalizeSpecsObject(rawSpecs: any) {
  const specs = typeof rawSpecs === 'object' && rawSpecs !== null ? rawSpecs : {};
  const normalized: Record<string, any> = {};

  Object.entries(specs).forEach(([k, v]) => {
    if (v === undefined || v === null || String(v).trim() === '') return;
    const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
    const mappedKey = SYNONYM_MAP[cleanK] || k;
    normalized[mappedKey] = v;
  });

  if (normalized.cpu) { delete normalized.processor; delete normalized.PROCESSOR; delete normalized.chip; }
  if (normalized.ram) { delete normalized.memory; delete normalized.MEMORY; }
  if (normalized.storage) { delete normalized.ssd; delete normalized.SSD; delete normalized.rom; delete normalized.hdd; }
  if (normalized.screen) { delete normalized.display; delete normalized.DISPLAY; }
  if (normalized.os) { delete normalized.operatingsystem; }
  if (normalized.t_n_m_y_t_nh) { delete normalized.computerName; delete normalized.hostname; delete normalized.tenmaytinh; }

  return normalized;
}

export function AIQuickInputModal({ isOpen, onClose, onSuccess }: AIQuickInputModalProps) {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const [inputType, setInputType] = useState<'IMAGE' | 'PDF' | 'TEXT'>('PDF');
  const [targetEntity, setTargetEntity] = useState<'AUTO' | 'ASSET' | 'LICENSE' | 'SERVICE'>('AUTO');
  const [file, setFile] = useState<File | null>(null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [savingBatch, setSavingBatch] = useState(false);

  // Common Document / Invoice Metadata
  const [saveDocument, setSaveDocument] = useState(true);
  const [autoApproveImmediate, setAutoApproveImmediate] = useState(false);
  const [uploadedFileInfo, setUploadedFileInfo] = useState<{ fileUrl: string | null; fileName: string | null; fileSize: number | null }>({ fileUrl: null, fileName: null, fileSize: null });
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [availableProjects, setAvailableProjects] = useState<{ id: string; name: string }[]>([]);
  const [isCreatingProject, setIsCreatingProject] = useState<boolean>(false);
  const [newProjectNameInput, setNewProjectNameInput] = useState<string>('');

  const [commonDocData, setCommonDocData] = useState({
    contractNumber: '',
    invoiceNumber: '',
    vendorId: '',
    vendorName: '',
    companyName: 'TẬP ĐOÀN TechCorp',
    purchaseDate: '',
  });

  // Multi-Item State
  const [extractedItems, setExtractedItems] = useState<AssetItem[]>([]);

  // Metadata dropdowns
  const [categories, setCategories] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [companies, setCompanies] = useState<string[]>([
    'TẬP ĐOÀN TechCorp',
    'TechCorp ELECTRIC',
    'TechCorp HẠ TẦNG',
    'TechCorp LAND',
    'Chi nhánh Miền Nam',
    'Chi nhánh Miền Trung',
    'HEM',
    'ABC_TECH',
    'NƯỚC SÔNG ĐÀ (VIWASUPCO)',
  ]);

  useEffect(() => {
    if (isOpen) {
      fetchDropdownData();
    }
  }, [isOpen]);

  const fetchDropdownData = async () => {
    try {
      const [catsRes, vensRes, locsRes, usrsRes, compsRes, projsRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/vendors'),
        fetch('/api/locations'),
        fetch('/api/users'),
        fetch('/api/companies'),
        fetch('/api/projects'),
      ]);

      if (catsRes.ok) {
        const d = await catsRes.json();
        const flat: any[] = [];
        const traverse = (arr: any[]) => {
          arr.forEach((c) => {
            flat.push(c);
            if (c.children) traverse(c.children);
          });
        };
        traverse(d.data || []);
        setCategories(flat);
      }
      if (vensRes.ok) {
        const d = await vensRes.json();
        setVendors(d.data || []);
      }
      if (locsRes.ok) {
        const d = await locsRes.json();
        setLocations(d.data || []);
      }
      if (usrsRes.ok) {
        const d = await usrsRes.json();
        setUsers(d.data || []);
      }
      if (compsRes.ok) {
        const d = await compsRes.json();
        if (d.data && d.data.length > 0) {
          setCompanies(d.data.map((c: any) => c.name || c));
        }
      }
      if (projsRes.ok) {
        const d = await projsRes.json();
        if (d.data) {
          setAvailableProjects(d.data.map((p: any) => ({ id: p.name || p.id, name: p.name })));
        }
      }
    } catch (e) {
      console.error('Failed to load dropdowns', e);
    }
  };

  const handleReset = () => {
    setSaveDocument(true);
    setUploadedFileInfo({ fileUrl: null, fileName: null, fileSize: null });
    setSelectedProject('');
    setIsCreatingProject(false);
    setNewProjectNameInput('');
    setFile(null);
    setInputText('');
    setResult(null);
    setIsSaved(false);
    setError('');
    setExtractedItems([]);
    setCommonDocData({
      contractNumber: '',
      invoiceNumber: '',
      vendorId: '',
      vendorName: '',
      companyName: companies[0] || 'TẬP ĐOÀN TechCorp',
      purchaseDate: '',
    });
  };

  const handleExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('inputType', inputType);
      formData.append('targetEntity', targetEntity === 'AUTO' ? 'ASSET' : targetEntity);

      if (inputType === 'TEXT') {
        if (!inputText.trim()) {
          setError('Vui lòng nhập nội dung mô tả');
          setLoading(false);
          return;
        }
        formData.append('inputText', inputText);
      } else {
        if (!file) {
          setError('Vui lòng chọn file để tải lên');
          setLoading(false);
          return;
        }
        formData.append('file', file);
      }

      const res = await fetch('/api/ai/extract', {
        method: 'POST',
        body: formData,
      });

      let resData: any = null;
      try {
        resData = await res.json();
      } catch {
        resData = null;
      }

      if (!res.ok) {
        setError(resData?.error || `Lỗi xử lý AI (${res.status}): Không thể hoàn tất bóc tách dữ liệu`);
        setLoading(false);
        return;
      } else {
        setResult(resData.data);
        if (resData.data?.fileInfo) {
          setUploadedFileInfo(resData.data.fileInfo);
        }
        const extracted = resData.data?.extractedData || {};

        let matchedVendorId = '';
        if (extracted.vendorName && vendors.length > 0) {
          const v = vendors.find((vend) =>
            vend.name.toLowerCase().includes(extracted.vendorName.toLowerCase()) ||
            extracted.vendorName.toLowerCase().includes(vend.name.toLowerCase())
          );
          if (v) matchedVendorId = v.id;
        }

        const commonPDate = extracted.purchaseDate ? String(extracted.purchaseDate).split('T')[0] : '';
        setCommonDocData({
          contractNumber: extracted.contractNumber || '',
          invoiceNumber: extracted.invoiceNumber || '',
          vendorId: matchedVendorId,
          vendorName: extracted.vendorName || '',
          companyName: companies[0] || 'TẬP ĐOÀN TechCorp',
          purchaseDate: commonPDate,
        });

        // Parse items array
        const rawItems = Array.isArray(extracted.items) && extracted.items.length > 0
          ? extracted.items
          : [extracted];

        const parsedItems: AssetItem[] = rawItems.map((raw: any, index: number) => {
          const itemEntity = targetEntity === 'AUTO' ? detectItemEntity(raw, inputText) : targetEntity;
          const matchedCatId = resolveSmartCategory(raw, inputText, categories);
          const normalizedSpecs = normalizeSpecsObject(raw.specs);

          const fullItemText = `${raw.name || ''} ${raw.model || ''} ${raw.productName || ''} ${raw.title || ''} ${raw.categoryName || ''} ${raw.specs ? JSON.stringify(raw.specs) : ''} ${raw.notes || ''} ${inputText || ''}`.toLowerCase();

          const effectivePDate = raw.purchaseDate
            ? String(raw.purchaseDate).split('T')[0]
            : (commonPDate || new Date().toISOString().split('T')[0]);

          let durationMonths = Number(raw.warrantyMonths) || 0;
          if (!durationMonths) {
            if (fullItemText.includes('1 năm') || fullItemText.includes('1 year') || fullItemText.includes('12 tháng') || fullItemText.includes('12 months') || fullItemText.includes('hạn dùng 1 năm') || fullItemText.includes('1 yr') || fullItemText.includes('1yr')) {
              durationMonths = 12;
            } else if (fullItemText.includes('2 năm') || fullItemText.includes('2 years') || fullItemText.includes('24 tháng')) {
              durationMonths = 24;
            } else if (fullItemText.includes('3 năm') || fullItemText.includes('3 years') || fullItemText.includes('36 tháng')) {
              durationMonths = 36;
            } else if (fullItemText.includes('6 tháng') || fullItemText.includes('6 months')) {
              durationMonths = 6;
            } else if (fullItemText.includes('1 tháng') || fullItemText.includes('1 month')) {
              durationMonths = 1;
            }
          }

          let autoExpiryDate = '';
          if (durationMonths > 0 && effectivePDate) {
            const p = new Date(effectivePDate);
            p.setMonth(p.getMonth() + durationMonths);
            autoExpiryDate = p.toISOString().split('T')[0];
          }

          let smartLicenseType = raw.licenseType || 'PERPETUAL';
          if (
            fullItemText.includes('1 năm') ||
            fullItemText.includes('1 year') ||
            fullItemText.includes('hạn dùng') ||
            fullItemText.includes('subscription') ||
            fullItemText.includes('thuê bao') ||
            fullItemText.includes('m365') ||
            fullItemText.includes('microsoft 365') ||
            fullItemText.includes('office 365') ||
            fullItemText.includes('hằng năm') ||
            fullItemText.includes('hàng năm') ||
            fullItemText.includes('annual') ||
            fullItemText.includes('gia hạn') ||
            (durationMonths > 0 && !fullItemText.includes('vĩnh viễn') && !fullItemText.includes('perpetual'))
          ) {
            smartLicenseType = 'SUBSCRIPTION';
          } else if (fullItemText.includes('oem')) {
            smartLicenseType = 'OEM';
          } else if (fullItemText.includes('trial') || fullItemText.includes('dùng thử')) {
            smartLicenseType = 'TRIAL';
          }

          let defaultServiceType = 'INTERNET';
          const rawName = `${raw.name || ''} ${raw.categoryName || ''}`.toLowerCase();
          if (rawName.includes('domain') || rawName.includes('tên miền')) defaultServiceType = 'DOMAIN';
          else if (rawName.includes('hosting') || rawName.includes('cloud') || rawName.includes('vps') || rawName.includes('server')) defaultServiceType = 'HOSTING_CLOUD';
          else if (rawName.includes('saas') || rawName.includes('phần mềm') || rawName.includes('chữ ký số')) defaultServiceType = 'SOFTWARE_SAAS';
          else if (rawName.includes('bảo trì') || rawName.includes('sla')) defaultServiceType = 'MAINTENANCE_SLA';

          return {
            id: `item-${Date.now()}-${index}`,
            targetEntity: itemEntity,
            selected: true,
            isExpanded: index === 0,
            assetTag: raw.assetTag || '',
            serviceCode: raw.serviceCode || '',
            name: raw.name || raw.productName || raw.title || '',
            categoryId: matchedCatId,
            brand: raw.brand || '',
            model: raw.model || '',
            serialNumber: raw.serialNumber || '',
            serviceType: raw.serviceType || defaultServiceType,
            billingCycle: raw.billingCycle || 'MONTHLY',
            accountNumber: raw.accountNumber || '',
            licenseKey: raw.licenseKey || '',
            licenseType: smartLicenseType,
            totalSeats: raw.totalSeats || 1,
            purchasePrice: raw.purchasePrice || raw.unitPrice || raw.cost || '',
            purchaseDate: effectivePDate,
            warrantyExpiry: autoExpiryDate || (raw.warrantyExpiry ? String(raw.warrantyExpiry).split('T')[0] : ''),
            expiryDate: raw.expiryDate ? String(raw.expiryDate).split('T')[0] : (autoExpiryDate || ''),
            companyName: companies[0] || 'TẬP ĐOÀN TechCorp',
            assignedUserId: '',
            locationId: locations[0]?.id || '',
            vendorId: matchedVendorId,
            specs: normalizedSpecs,
            notes: raw.notes || '',
          };
        });

        setExtractedItems(parsedItems);

        if (autoApproveImmediate && parsedItems.length > 0) {
          // Immediately auto-save all items
          setTimeout(async () => {
            try {
              setSavingBatch(true);
              const saveRes = await fetch('/api/ai/confirm-batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  extractionId: resData.data.extractionId,
                  batchItems: parsedItems.filter((i) => i.selected),
                  commonData: {
                    contractNumber: extracted.contractNumber || '',
                    invoiceNumber: extracted.invoiceNumber || '',
                    vendorId: matchedVendorId,
                    vendorName: extracted.vendorName || '',
                    companyName: companies[0] || 'TẬP ĐOÀN TechCorp',
                    purchaseDate: commonPDate,
                    saveDocument,
                    fileUrl: resData.data.fileInfo?.fileUrl || null,
                    fileName: resData.data.fileInfo?.fileName || null,
                    fileSize: resData.data.fileInfo?.fileSize || null,
                  },
                }),
              });
              if (saveRes.ok) {
                setIsSaved(true);
                if (onSuccess) onSuccess();
              }
            } catch (err) {
              console.error('Auto save error:', err);
            } finally {
              setSavingBatch(false);
            }
          }, 300);
        }
      }
    } catch {
      setError('Lỗi kết nối khi gửi dữ liệu lên AI');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelectAll = (select: boolean) => {
    setExtractedItems((prev) => prev.map((item) => ({ ...item, selected: select })));
  };

  const handleUpdateItem = (id: string, field: keyof AssetItem, value: any) => {
    setExtractedItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleUpdateItemSpecs = (id: string, specKey: string, specVal: any) => {
    setExtractedItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextSpecs = { ...(item.specs || {}) };
          if (specVal === undefined) {
            delete nextSpecs[specKey];
          } else {
            nextSpecs[specKey] = specVal;
          }
          return { ...item, specs: nextSpecs };
        }
        return item;
      })
    );
  };

  const handleRemoveItem = (id: string) => {
    setExtractedItems((prev) => prev.filter((item) => item.id !== id));
  };

  const [lookingUpId, setLookingUpId] = useState<string | null>(null);

  const handleLookupItemModel = async (itemId: string, modelName: string) => {
    if (!modelName || !modelName.trim()) return;
    setLookingUpId(itemId);
    try {
      const res = await fetch('/api/ai/lookup-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelName: modelName.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.data) {
        const d = data.data;
        setExtractedItems((prev) =>
          prev.map((it) => {
            if (it.id === itemId) {
              return {
                ...it,
                brand: d.brand || it.brand,
                name: d.name || it.name,
                categoryId: d.matchedCategoryId || it.categoryId,
                warrantyExpiry: d.warrantyMonths && it.purchaseDate
                  ? (() => {
                      const p = new Date(it.purchaseDate);
                      p.setMonth(p.getMonth() + Number(d.warrantyMonths));
                      return p.toISOString().split('T')[0];
                    })()
                  : it.warrantyExpiry,
                specs: {
                  ...(it.specs || {}),
                  ...normalizeSpecsObject(d.specs || {}),
                },
              };
            }
            return it;
          })
        );
      }
    } catch (err) {
      console.error('Model lookup error:', err);
    } finally {
      setLookingUpId(null);
    }
  };

  const handleAddNewItem = () => {
    const newItem: AssetItem = {
      id: `item-${Date.now()}-${extractedItems.length}`,
      targetEntity: 'ASSET',
      selected: true,
      isExpanded: true,
      assetTag: '',
      serviceCode: '',
      name: '',
      categoryId: categories[0]?.id || '',
      brand: '',
      model: '',
      serialNumber: '',
      purchasePrice: '',
      purchaseDate: commonDocData.purchaseDate || '',
      warrantyExpiry: '',
      expiryDate: '',
      companyName: commonDocData.companyName || (companies[0] || ''),
      assignedUserId: '',
      locationId: locations[0]?.id || '',
      vendorId: commonDocData.vendorId || '',
      specs: {},
      notes: '',
    };
    setExtractedItems((prev) => [...prev, newItem]);
  };

  const handleSaveAllSelected = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!result?.extractionId) return;

    const selectedItems = extractedItems.filter((i) => i.selected);
    if (selectedItems.length === 0) {
      setError('Vui lòng chọn ít nhất 1 tài sản / dịch vụ để lưu');
      return;
    }

    // Validate required fields
    for (let i = 0; i < selectedItems.length; i++) {
      const item = selectedItems[i];
      if (!item.name || !item.name.trim()) {
        setError(`Mục số ${i + 1} (${item.model || item.targetEntity}): Vui lòng nhập Tên (*)`);
        return;
      }
      if (!item.purchaseDate) {
        setError(`Mục số ${i + 1} (${item.name}): Ngày bắt đầu / Ngày mua là bắt buộc (*)`);
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      const payloadItems = selectedItems.map((item) => ({
        ...item,
        contractNumber: commonDocData.contractNumber,
        invoiceNumber: commonDocData.invoiceNumber,
        vendorId: item.vendorId || commonDocData.vendorId,
        companyName: item.companyName || commonDocData.companyName,
      }));

      const res = await fetch(`/api/ai/extract/${result.extractionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm_batch',
          batchItems: payloadItems,
          commonData: {
            ...commonDocData,
            saveDocument,
            fileUrl: uploadedFileInfo.fileUrl,
            fileName: uploadedFileInfo.fileName,
            projectName: selectedProject || null,
            fileSize: uploadedFileInfo.fileSize,
          },
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSavedCount(selectedItems.length);
        setIsSaved(true);
        if (onSuccess) onSuccess();
      } else {
        setError(data.error || 'Lưu dữ liệu thất bại');
      }
    } catch {
      setError('Lỗi kết nối khi lưu dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const getSelectedCategoryFields = (catId: string) => {
    const cat = categories.find((c) => c.id === catId);
    if (cat && Array.isArray(cat.customFields)) {
      return cat.customFields;
    }
    return [];
  };

  const selectedCount = extractedItems.filter((i) => i.selected).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
              <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-lg flex items-center gap-2">
                <span>AI Vision & Smart Input</span>
                <span className="text-[10px] bg-white/20 font-mono px-2 py-0.5 rounded-full">Multi-Item Batch 3.6</span>
              </h3>
              <p className="text-xs text-indigo-100 mt-0.5">
                Nhận diện thông minh từ PDF hợp đồng, hóa đơn nhiều sản phẩm hoặc ảnh tem
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2 font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Upload / Input Form */}
          {!result ? (
            <form onSubmit={handleExtract} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  1. Chọn đối tượng cần tạo (Hoặc để AI tự động phân loại)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetEntity('AUTO')}
                    className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      targetEntity === 'AUTO'
                        ? 'border-indigo-600 bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-950 shadow-xs ring-2 ring-indigo-500/20'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>✨ Tự Động Phân Loại</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetEntity('ASSET')}
                    className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      targetEntity === 'ASSET'
                        ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-xs ring-2 ring-blue-500/20'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Laptop className="w-4 h-4 text-blue-600" />
                    <span>Thiết bị / Tài sản</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetEntity('LICENSE')}
                    className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      targetEntity === 'LICENSE'
                        ? 'border-purple-600 bg-purple-50 text-purple-700 shadow-xs ring-2 ring-purple-500/20'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Key className="w-4 h-4 text-purple-600" />
                    <span>License Bản Quyền</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetEntity('SERVICE')}
                    className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      targetEntity === 'SERVICE'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700 shadow-xs ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Globe className="w-4 h-4 text-emerald-600" />
                    <span>Dịch Vụ & Thuê Bao</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  2. Chọn hình thức nhập liệu
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'PDF', label: 'PDF, Word (.docx), Excel (.xlsx)', icon: FileText },
                    { id: 'IMAGE', label: 'Ảnh tem / Hóa đơn', icon: Upload },
                    { id: 'TEXT', label: '1 Dòng chữ ngắn', icon: Type },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          setInputType(tab.id as any);
                          setError('');
                        }}
                        className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          inputType === tab.id
                            ? 'bg-blue-50 border-blue-500 text-blue-700'
                            : 'bg-slate-50/70 border-slate-200 text-slate-600 hover:bg-white'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span className="truncate">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {inputType === 'TEXT' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nhập dòng mô tả thiết bị / dịch vụ:
                  </label>
                  <textarea
                    rows={3}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="VD: Đường truyền Internet VNPT Fiber 300Mbps 12tr/năm hoặc Laptop Asus Zenbook S16 39tr..."
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tải lên file {inputType === 'PDF' ? 'PDF, Word (.docx), Excel (.xlsx), Báo giá, Hợp đồng' : 'ảnh chụp tem serial / hóa đơn'}:
                  </label>
                  <div className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/30 rounded-2xl p-6 text-center transition-colors">
                    <input
                      type="file"
                      accept={inputType === 'PDF' ? '.pdf,.docx,.doc,.xlsx,.xls,.csv' : 'image/*'}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) setFile(f);
                      }}
                      className="hidden"
                      id="ai-file-upload"
                    />
                    <label htmlFor="ai-file-upload" className="cursor-pointer block space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto shadow-inner">
                        <Upload className="w-6 h-6" />
                      </div>
                      {file ? (
                        <div>
                          <p className="text-xs font-bold text-indigo-900">{file.name}</p>
                          <p className="text-[10px] text-slate-500">{(file.size / 1024).toFixed(0)} KB</p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs font-bold text-slate-700">
                            Nhấp để chọn file hoặc kéo thả vào đây
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {inputType === 'PDF' ? 'PDF, DOCX, XLSX, XLS, CSV (Tối đa 20MB)' : 'PNG, JPG, WEBP (Tối đa 10MB)'}
                          </p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>AI đang phân tích và bóc tách dữ liệu...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Bắt đầu Trích Xuất Dữ Liệu</span>
                  </>
                )}
              </button>
            </form>
          ) : isSaved ? (
            /* STEP 3: Success Screen */
            <div className="py-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  Thêm Mới Thành Công {savedCount} Mục Vào Cơ Sở Dữ Liệu!
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Toàn bộ tài sản, dịch vụ và license đã được khởi tạo đồng thời vào hệ thống.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Trích xuất tài liệu khác</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
                >
                  Hoàn tất & Đóng
                </button>
              </div>
            </div>
          ) : (
            /* STEP 2: Interactive Multi-Item Review & Selection Form */
            <form onSubmit={handleSaveAllSelected} className="space-y-4">
              {/* Summary Bar */}
              <div className="p-3.5 bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border border-purple-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <span className="p-1.5 bg-purple-600 text-white rounded-xl shadow-2xs">
                    <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-xs text-purple-950">AI đã tìm thấy {extractedItems.length} mục trong tài liệu!</span>
                      <span className="bg-purple-600 text-white font-bold px-2 py-0.5 rounded-full text-[10px]">
                        {(result.confidence * 100).toFixed(0)}% Match
                      </span>
                    </div>
                    <p className="text-[11px] text-purple-800 mt-0.5">
                      Bạn có thể chọn <strong>[✓] Tải lên</strong> hoặc chuyển đổi giữa <strong>Tài sản / License / Dịch vụ</strong>:
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => handleToggleSelectAll(true)}
                    className="px-2.5 py-1 bg-white hover:bg-purple-100 border border-purple-300 text-purple-900 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                  >
                    ✓ Chọn tất cả ({extractedItems.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleSelectAll(false)}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-[10px] font-medium transition-colors cursor-pointer"
                  >
                    Bỏ chọn tất cả
                  </button>
                  <button
                    type="button"
                    onClick={handleAddNewItem}
                    className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Thêm Mục</span>
                  </button>
                </div>
              </div>

              {/* COMMON DOCUMENT METADATA */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-amber-50/60 border border-amber-200 rounded-2xl">
                <div>
                  <label className="block text-xs font-bold text-amber-900 mb-1 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-amber-600" />
                    <span>Số HĐ (Contract No.)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="VD: HĐ-2026/08/IT"
                    value={commonDocData.contractNumber}
                    onChange={(e) => setCommonDocData({ ...commonDocData, contractNumber: e.target.value })}
                    className="w-full p-2 bg-white border border-amber-300 rounded-xl text-xs font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-amber-900 mb-1 flex items-center gap-1">
                    <Receipt className="w-3.5 h-3.5 text-amber-600" />
                    <span>Số Hóa Đơn (Invoice No.)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="VD: HD-0089421"
                    value={commonDocData.invoiceNumber}
                    onChange={(e) => setCommonDocData({ ...commonDocData, invoiceNumber: e.target.value })}
                    className="w-full p-2 bg-white border border-amber-300 rounded-xl text-xs font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-amber-900 mb-1 flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-amber-600" />
                    <span>Nhà cung cấp / Đối tác</span>
                  </label>
                  <input
                    type="text"
                    placeholder="VD: CÔNG TY CP CÔNG NGHỆ..."
                    value={commonDocData.vendorName}
                    onChange={(e) => setCommonDocData({ ...commonDocData, vendorName: e.target.value })}
                    className="w-full p-2 bg-white border border-amber-300 rounded-xl text-xs font-semibold outline-none"
                  />
                </div>
              </div>

              {/* AUTO-SAVE DOCUMENT & LINK TO ASSETS BANNER WITH FOLDER SELECTION */}
              {uploadedFileInfo.fileUrl && (
                <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-300 rounded-2xl flex flex-col gap-3 shadow-2xs">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                          <span>Kho Tài Liệu & Gắn Link Tự Động</span>
                          <span className="text-[10px] bg-emerald-200 text-emerald-900 font-bold px-2 py-0.5 rounded-full">
                            Tự động liên kết
                          </span>
                        </h5>
                        <p className="text-[11px] text-emerald-800 mt-0.5">
                          Tệp <strong>"{uploadedFileInfo.fileName}"</strong> sẽ được lưu vào mục <strong>Tài Liệu</strong> và gắn link trực tiếp vào tất cả thiết bị được thêm.
                        </p>
                      </div>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer select-none shrink-0 bg-white px-3 py-1.5 rounded-xl border border-emerald-300 shadow-2xs">
                      <input
                        type="checkbox"
                        checked={saveDocument}
                        onChange={(e) => setSaveDocument(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-emerald-900">
                        {saveDocument ? '✓ Đang bật lưu' : '✕ Bỏ qua lưu file'}
                      </span>
                    </label>
                  </div>

                  {/* FOLDER / PROJECT SELECTOR OR CREATOR */}
                  {saveDocument && (
                    <div className="pt-2.5 border-t border-emerald-200/80 flex flex-col sm:flex-row sm:items-center gap-2.5">
                      <span className="text-[11px] font-bold text-emerald-900 flex items-center gap-1 shrink-0">
                        <span>📁 Thư mục / Gói lưu trữ:</span>
                      </span>

                      {!isCreatingProject ? (
                        <div className="flex items-center gap-2 flex-1">
                          <select
                            value={selectedProject}
                            onChange={(e) => setSelectedProject(e.target.value)}
                            className="flex-1 bg-white border border-emerald-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs font-medium"
                          >
                            <option value="">-- 📄 Lưu ở ngoài cùng (Không vào gói dự án nào) --</option>
                            {availableProjects.map((p) => (
                              <option key={p.id} value={p.name}>
                                📁 {p.name}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={() => setIsCreatingProject(true)}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs shrink-0 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Tạo thư mục</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            placeholder="Nhập tên thư mục / gói dự án mới..."
                            value={newProjectNameInput}
                            onChange={(e) => setNewProjectNameInput(e.target.value)}
                            className="flex-1 bg-white border border-emerald-400 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs font-medium"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              if (newProjectNameInput.trim()) {
                                const pName = newProjectNameInput.trim();
                                try {
                                  await fetch('/api/projects', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ name: pName }),
                                  });
                                } catch {}
                                setAvailableProjects((prev) => [...prev, { id: pName, name: pName }]);
                                setSelectedProject(pName);
                                setNewProjectNameInput('');
                                setIsCreatingProject(false);
                              }
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs shrink-0"
                          >
                            Lưu thư mục
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsCreatingProject(false);
                              setNewProjectNameInput('');
                            }}
                            className="px-2 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold shrink-0"
                          >{isEn ? 'Cancel' : 'Hủy'}</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* LIST OF ITEMS (CARDS) */}
              <div className="space-y-3">
                {extractedItems.map((item, index) => {
                  const definedFields = getSelectedCategoryFields(item.categoryId);
                  const definedKeys = new Set(definedFields.map((f: any) => f.key.toLowerCase()));
                  const AI_KNOWN_KEYS = new Set([
                    'gpu', 'vga', 'graphics', 'refresh_rate', 'refreshrate', 'ports', 'wireless', 'battery',
                    'weight', 'color', 'material', 'includedaccessories', 'powersupply', 'psu', 'panel',
                    'connection', 'micrange', 'audio', 'papersize', 'speed', 'bandwidth', 'ipstatic', 'sla'
                  ]);
                  const allSpecEntries = Object.entries(item.specs || {}).filter(([k, v]) => v !== undefined && v !== null && String(v).trim() !== '');
                  const aiEntries = allSpecEntries.filter(([k]) => {
                    const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
                    return !definedKeys.has(cleanK) && !definedKeys.has(k.toLowerCase()) && (AI_KNOWN_KEYS.has(cleanK) || AI_KNOWN_KEYS.has(k.toLowerCase()));
                  });
                  const customUserEntries = allSpecEntries.filter(([k]) => {
                    const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
                    return !definedKeys.has(cleanK) && !definedKeys.has(k.toLowerCase()) && !AI_KNOWN_KEYS.has(cleanK) && !AI_KNOWN_KEYS.has(k.toLowerCase());
                  });
                  const currentCat = categories.find((c) => c.id === item.categoryId);

                  return (
                    <div
                      key={item.id}
                      className={`rounded-2xl border transition-all ${
                        item.selected
                          ? item.targetEntity === 'SERVICE'
                            ? 'border-emerald-300 bg-white shadow-xs'
                            : item.targetEntity === 'LICENSE'
                            ? 'border-purple-300 bg-white shadow-xs'
                            : 'border-indigo-300 bg-white shadow-xs'
                          : 'border-slate-200 bg-slate-50/80 opacity-70'
                      }`}
                    >
                      {/* Card Header Toolbar with Checkbox & Entity Switcher */}
                      <div className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={item.selected}
                              onChange={(e) => handleUpdateItem(item.id, 'selected', e.target.checked)}
                              className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                            />
                            <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                              <span>#{index + 1}.</span>
                              <span className="text-indigo-900">{item.name || item.model || `Mục ${index + 1}`}</span>
                            </span>
                          </label>

                          {/* Target Entity Switcher (Asset / License / Service) */}
                          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
                            <button
                              type="button"
                              onClick={() => handleUpdateItem(item.id, 'targetEntity', 'ASSET')}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                                item.targetEntity === 'ASSET'
                                  ? 'bg-blue-600 text-white shadow-2xs'
                                  : 'text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              💻 Tài sản
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateItem(item.id, 'targetEntity', 'LICENSE')}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                                item.targetEntity === 'LICENSE'
                                  ? 'bg-purple-600 text-white shadow-2xs'
                                  : 'text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              🔑 License
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateItem(item.id, 'targetEntity', 'SERVICE')}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                                item.targetEntity === 'SERVICE'
                                  ? 'bg-emerald-600 text-white shadow-2xs'
                                  : 'text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              🌐 Dịch vụ
                            </button>
                          </div>

                          {item.selected ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.2 rounded-full">
                              ✓ Sẽ tải lên
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-slate-500 bg-slate-200 px-2 py-0.2 rounded-full">
                              ✕ Bỏ qua
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={() => handleUpdateItem(item.id, 'isExpanded', !item.isExpanded)}
                            className="p-1 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors cursor-pointer text-xs flex items-center gap-1"
                          >
                            <span>{item.isExpanded ? 'Thu gọn' : 'Chỉnh sửa chi tiết'}</span>
                            {item.isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Card Expandable Body */}
                      {item.isExpanded && (
                        <div className="p-4 space-y-4">
                          {/* ================= CASE 1: ASSET FORM ================= */}
                          {item.targetEntity === 'ASSET' && (
                            <>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                                    <Tag className="w-3.5 h-3.5 text-blue-600" />
                                    <span>Mã Tag (Trống = Tự tạo)</span>
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="Tự tạo (VD: IT-AST-0001)"
                                    value={item.assetTag}
                                    onChange={(e) => handleUpdateItem(item.id, 'assetTag', e.target.value.toUpperCase())}
                                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold text-blue-900 outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-bold text-slate-700 mb-1">{isEn ? 'Device Name' : 'Tên thiết bị'}<span className="text-rose-500">(*)</span>
                                  </label>
                                  <input
                                    type="text"
                                    required={item.selected}
                                    placeholder="VD: Laptop Dell Latitude 5540, Bộ loa Jabra..."
                                    value={item.name}
                                    onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>

                                <div>
                                  <ManageableDropdown
                                    label="Danh mục (*)"
                                    placeholder="-- Chọn danh mục --"
                                    items={categories.map((c) => ({ id: c.id, name: c.name, icon: <span>{c.icon || '📦'}</span> }))}
                                    selectedValue={item.categoryId}
                                    onSelect={(val) => handleUpdateItem(item.id, 'categoryId', val)}
                                    allowEmpty={false}
                                  />
                                </div>
                              </div>

                              {/* ĐƠN VỊ SỞ HỮU & CẤP PHÁT */}
                              <div className="p-3.5 bg-gradient-to-r from-blue-50/90 via-indigo-50/90 to-purple-50/90 border border-indigo-200 rounded-2xl space-y-2.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                                    <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                                    ĐƠN VỊ SỞ HỮU & CẤP PHÁT
                                  </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <ManageableDropdown
                                    label="Tài sản thuộc công ty nào (*)"
                                    placeholder="-- Chọn công ty --"
                                    items={companies.map((c) => ({ id: c, name: c }))}
                                    selectedValue={item.companyName}
                                    onSelect={(val) => handleUpdateItem(item.id, 'companyName', val)}
                                    allowEmpty={true}
                                  />
                                  <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center">
                                      <User className="w-3.5 h-3.5 mr-1 text-blue-600" />
                                      Gán trực tiếp cho nhân sự:
                                    </label>
                                    <select
                                      value={item.assignedUserId || ''}
                                      onChange={(e) => handleUpdateItem(item.id, 'assignedUserId', e.target.value)}
                                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-sm outline-none"
                                    >
                                      <option value="">-- Chưa gán (Lưu vào kho) --</option>
                                      {users.map((u) => (
                                        <option key={u.id} value={u.id}>
                                          👤 {u.fullName} {u.companyName ? `[${u.companyName}] ` : ''}({u.department || 'Staff'})
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              </div>

                              {/* THƯƠNG HIỆU, MODEL, SERIAL */}
                              <div className="grid grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-xs font-semibold text-slate-600 mb-1">Thương hiệu</label>
                                  <input
                                    type="text"
                                    placeholder="Jabra, Dell, HP, Apple..."
                                    value={item.brand}
                                    onChange={(e) => handleUpdateItem(item.id, 'brand', e.target.value)}
                                    className="w-full p-2 border border-slate-300 rounded-xl text-xs outline-none"
                                  />
                                </div>
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <label className="block text-xs font-semibold text-slate-600">Model / Part Number</label>
                                    <button
                                      type="button"
                                      disabled={!item.model || lookingUpId === item.id}
                                      onClick={() => handleLookupItemModel(item.id, item.model)}
                                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 disabled:opacity-40 flex items-center gap-0.5 cursor-pointer"
                                    >
                                      {lookingUpId === item.id ? (
                                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                      ) : (
                                        <Sparkles className="w-2.5 h-2.5" />
                                      )}
                                      <span>{lookingUpId === item.id ? 'Đang tra...' : '⚡ AI Tra Specs'}</span>
                                    </button>
                                  </div>
                                  <input
                                    type="text"
                                    placeholder="Speak 750, Zenbook S16..."
                                    value={item.model}
                                    onChange={(e) => handleUpdateItem(item.id, 'model', e.target.value)}
                                    className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-600 mb-1">Số Serial</label>
                                  <input
                                    type="text"
                                    placeholder="SN..."
                                    value={item.serialNumber}
                                    onChange={(e) => handleUpdateItem(item.id, 'serialNumber', e.target.value)}
                                    className="w-full p-2 border border-slate-300 rounded-xl text-xs font-mono outline-none"
                                  />
                                </div>
                              </div>

                              {/* 3 PHÂN VÙNG SPECS */}
                              <div className="space-y-2.5">
                                {definedFields.length > 0 && (
                                  <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
                                    <div className="flex items-center justify-between pb-1 border-b border-blue-200">
                                      <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                                        <Cpu className="w-3.5 h-3.5 text-blue-600" />
                                        1. Thông Số Chuẩn Danh Mục ({currentCat?.name || 'Thiết bị'})
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      {definedFields.map((f: any) => (
                                        <div key={f.key}>
                                          <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                                            {f.label}
                                          </label>
                                          <input
                                            type="text"
                                            value={item.specs?.[f.key] ?? ''}
                                            onChange={(e) => handleUpdateItemSpecs(item.id, f.key, e.target.value)}
                                            placeholder={`Nhập ${f.label}...`}
                                            className="w-full p-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-none"
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {aiEntries.length > 0 && (
                                  <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2">
                                    <div className="flex items-center justify-between pb-1 border-b border-purple-200">
                                      <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                                        <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                                        2. Thông Số Chi Tiết Do AI Trích Xuất
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      {aiEntries.map(([k, v]) => (
                                        <div key={k} className="bg-white p-1.5 border border-purple-200 rounded-lg space-y-1">
                                          <div className="flex items-center justify-between">
                                            <label className="text-[11px] font-bold text-purple-900 truncate">
                                              {k.toUpperCase()} <span className="text-[8px] bg-purple-100 text-purple-700 px-1 py-0.2 rounded">AI</span>
                                            </label>
                                            <button
                                              type="button"
                                              onClick={() => handleUpdateItemSpecs(item.id, k, undefined)}
                                              className="text-slate-400 hover:text-rose-600 p-0.5"
                                            >
                                              <X className="w-3 h-3" />
                                            </button>
                                          </div>
                                          <input
                                            type="text"
                                            value={String(v ?? '')}
                                            onChange={(e) => handleUpdateItemSpecs(item.id, k, e.target.value)}
                                            className="w-full p-1 bg-purple-50/30 border border-purple-200 rounded text-xs outline-none font-semibold text-slate-800"
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                <div className="p-2.5 bg-amber-50/50 border border-amber-200 rounded-xl space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                                      <Sliders className="w-3 h-3 text-amber-600" />
                                      3. Thông Số Tùy Chỉnh
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const customKey = prompt('Nhập tên thông số tùy chỉnh:');
                                        if (customKey && customKey.trim()) {
                                          handleUpdateItemSpecs(item.id, customKey.trim(), '');
                                        }
                                      }}
                                      className="text-[10px] font-bold text-amber-900 bg-white border border-amber-300 px-2 py-0.5 rounded-lg flex items-center gap-1"
                                    >
                                      <Plus className="w-3 h-3" />
                                      <span>+ Thêm trường</span>
                                    </button>
                                  </div>
                                  {customUserEntries.length > 0 && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                      {customUserEntries.map(([k, v]) => (
                                        <div key={k} className="bg-white p-1.5 border border-amber-200 rounded-lg space-y-1">
                                          <div className="flex items-center justify-between">
                                            <label className="text-[11px] font-bold text-amber-950 truncate">{k}</label>
                                            <button
                                              type="button"
                                              onClick={() => handleUpdateItemSpecs(item.id, k, undefined)}
                                              className="text-slate-400 hover:text-rose-600 p-0.5"
                                            >
                                              <X className="w-3 h-3" />
                                            </button>
                                          </div>
                                          <input
                                            type="text"
                                            value={String(v ?? '')}
                                            onChange={(e) => handleUpdateItemSpecs(item.id, k, e.target.value)}
                                            className="w-full p-1 bg-amber-50/20 border border-amber-200 rounded text-xs outline-none"
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* SMART WARRANTY & PRICE */}
                              <div className="space-y-3">
                                <WarrantyInput
                                  purchaseDate={item.purchaseDate || commonDocData.purchaseDate || ''}
                                  onPurchaseDateChange={(d) => handleUpdateItem(item.id, 'purchaseDate', d)}
                                  warrantyExpiry={item.warrantyExpiry || ''}
                                  onWarrantyExpiryChange={(w) => handleUpdateItem(item.id, 'warrantyExpiry', w)}
                                />

                                <div>
                                  <CurrencyInput
                                    label="Giá mua thiết bị (VND)"
                                    placeholder="VD: 15.000.000"
                                    value={item.purchasePrice || ''}
                                    onChange={(val) => handleUpdateItem(item.id, 'purchasePrice', val)}
                                  />
                                </div>
                              </div>
                            </>
                          )}

                          {/* ================= CASE 2: SERVICE FORM ================= */}
                          {item.targetEntity === 'SERVICE' && (
                            <>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                                    <Tag className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Mã Dịch Vụ (Trống = Tự tạo)</span>
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="Tự tạo (VD: SRV-0001)"
                                    value={item.serviceCode || ''}
                                    onChange={(e) => handleUpdateItem(item.id, 'serviceCode', e.target.value.toUpperCase())}
                                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold text-emerald-900 outline-none uppercase"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Tên Dịch Vụ / Gói Cước <span className="text-rose-500">(*)</span>
                                  </label>
                                  <input
                                    type="text"
                                    required={item.selected}
                                    placeholder="VD: Cáp quang VNPT Fiber 300Mbps, Cloud AWS..."
                                    value={item.name}
                                    onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Loại Dịch Vụ (*)
                                  </label>
                                  <select
                                    value={item.serviceType || 'INTERNET'}
                                    onChange={(e) => handleUpdateItem(item.id, 'serviceType', e.target.value)}
                                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                                  >
                                    <option value="INTERNET">🌐 Đường truyền Internet</option>
                                    <option value="DOMAIN">🔗 Tên miền (Domain)</option>
                                    <option value="HOSTING_CLOUD">☁️ Hosting / Cloud Server / VPS</option>
                                    <option value="SOFTWARE_SAAS">💻 Phần mềm SaaS / Thuê bao</option>
                                    <option value="MAINTENANCE_SLA">🛠️ Bảo trì định kỳ & SLA</option>
                                    <option value="OTHER">📦 Dịch vụ khác</option>
                                  </select>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-emerald-50/50 border border-emerald-200 rounded-2xl">
                                <div>
                                  <label className="block text-xs font-bold text-emerald-950 mb-1">
                                    Chu Kỳ Thanh Toán
                                  </label>
                                  <select
                                    value={item.billingCycle || 'MONTHLY'}
                                    onChange={(e) => handleUpdateItem(item.id, 'billingCycle', e.target.value)}
                                    className="w-full p-2 bg-white border border-emerald-300 rounded-xl text-xs outline-none"
                                  >
                                    <option value="MONTHLY">Hàng tháng (Monthly)</option>
                                    <option value="QUARTERLY">Hàng quý (3 tháng)</option>
                                    <option value="SEMI_ANNUALLY">6 tháng</option>
                                    <option value="ANNUALLY">Hàng năm (Annually)</option>
                                    <option value="ONE_TIME">Một lần (One-time)</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-xs font-bold text-emerald-950 mb-1">
                                    Mã Thuê Bao / Mã KH / IP Tĩnh
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="VD: HNI-TB-984102 hoặc 113.161.x.x"
                                    value={item.accountNumber || ''}
                                    onChange={(e) => handleUpdateItem(item.id, 'accountNumber', e.target.value)}
                                    className="w-full p-2 bg-white border border-emerald-300 rounded-xl text-xs outline-none"
                                  />
                                </div>
                              </div>

                              {/* DATE & PRICE */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                  <CurrencyInput
                                    label="Chi phí dịch vụ (VND)"
                                    placeholder="VD: 1.500.000"
                                    value={item.purchasePrice || ''}
                                    onChange={(val) => handleUpdateItem(item.id, 'purchasePrice', val)}
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ngày bắt đầu (*)</label>
                                  <input
                                    type="date"
                                    required={item.selected}
                                    value={item.purchaseDate || ''}
                                    onChange={(e) => handleUpdateItem(item.id, 'purchaseDate', e.target.value)}
                                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ngày hết hạn / Tái ký</label>
                                  <input
                                    type="date"
                                    value={item.expiryDate || ''}
                                    onChange={(e) => handleUpdateItem(item.id, 'expiryDate', e.target.value)}
                                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs outline-none"
                                  />
                                </div>
                              </div>
                            </>
                          )}

                          {/* ================= CASE 3: LICENSE FORM ================= */}
                          {item.targetEntity === 'LICENSE' && (
                            <>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="sm:col-span-2">
                                  <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Tên Phần Mềm / Bản Quyền <span className="text-rose-500">(*)</span>
                                  </label>
                                  <input
                                    type="text"
                                    required={item.selected}
                                    placeholder="VD: Microsoft 365 Business Standard, Windows 11 Pro..."
                                    value={item.name}
                                    onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-purple-500"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Loại Bản Quyền (*)
                                  </label>
                                  <select
                                    value={item.licenseType || 'PERPETUAL'}
                                    onChange={(e) => handleUpdateItem(item.id, 'licenseType', e.target.value)}
                                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-purple-500"
                                  >
                                    <option value="PERPETUAL">Vĩnh viễn (Perpetual)</option>
                                    <option value="SUBSCRIPTION">Thuê bao (Subscription)</option>
                                    <option value="OEM">OEM theo máy</option>
                                    <option value="TRIAL">Dùng thử (Trial)</option>
                                    <option value="OPEN_SOURCE">Mã nguồn mở</option>
                                  </select>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-semibold text-slate-600 mb-1">License Key / Product Key</label>
                                  <input
                                    type="text"
                                    placeholder="XXXXX-XXXXX-XXXXX-XXXXX..."
                                    value={item.licenseKey || ''}
                                    onChange={(e) => handleUpdateItem(item.id, 'licenseKey', e.target.value)}
                                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-mono outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tổng Số Seats (Người dùng)</label>
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.totalSeats || 1}
                                    onChange={(e) => handleUpdateItem(item.id, 'totalSeats', Number(e.target.value))}
                                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs outline-none font-bold"
                                  />
                                </div>
                              </div>

                              {/* DATE & PRICE */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                  <CurrencyInput
                                    label="Giá mua license (VND)"
                                    placeholder="VD: 5.000.000"
                                    value={item.purchasePrice || ''}
                                    onChange={(val) => handleUpdateItem(item.id, 'purchasePrice', val)}
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ngày mua (*)</label>
                                  <input
                                    type="date"
                                    required={item.selected}
                                    value={item.purchaseDate || ''}
                                    onChange={(e) => handleUpdateItem(item.id, 'purchaseDate', e.target.value)}
                                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hạn bản quyền</label>
                                  <input
                                    type="date"
                                    value={item.expiryDate || ''}
                                    onChange={(e) => handleUpdateItem(item.id, 'expiryDate', e.target.value)}
                                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs outline-none"
                                  />
                                </div>
                              </div>
                            </>
                          )}

                          {/* GHI CHÚ */}
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Ghi chú thêm</label>
                            <input
                              type="text"
                              placeholder="Ghi chú về nguồn gốc, phụ kiện đi kèm hoặc đầu mối liên hệ..."
                              value={item.notes}
                              onChange={(e) => handleUpdateItem(item.id, 'notes', e.target.value)}
                              className="w-full p-2 border border-slate-300 rounded-xl text-xs outline-none"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Modal Sticky Footer Action */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Trích xuất file khác
                </button>

                <button
                  type="submit"
                  disabled={loading || selectedCount === 0}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>Lưu {selectedCount} Mục Đã Chọn Vào Hệ Thống</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default AIQuickInputModal;
