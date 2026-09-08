'use client';

import { OfficeDocumentViewer } from '@/components/documents/office-document-viewer';
import { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Receipt,
  Upload,
  Download,
  Eye,
  Edit,
  Edit2,
  Trash2,
  Search,
  Filter,
  Calendar,
  Building2,
  Tag,
  Laptop,
  Plus,
  X,
  CheckCircle,
  AlertCircle,
  LayoutGrid,
  List,
  DollarSign,
  RefreshCw,
  FileCheck,
  Loader2,
  FileCode,
  Handshake,
  Paperclip,
  Image as ImageIcon,
  ChevronDown,
  ChevronRight,
  FolderKanban,
  FolderOpen,
  Boxes,
  Layers,
  Sparkles,
  Key,
  Globe,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ManageableDropdown } from '@/components/ui/manageable-dropdown';
import { useLanguage } from '@/lib/i18n/context';
import CurrencyInput from '@/components/ui/currency-input';

interface DocumentAttachment {
  url: string;
  name: string;
  size?: number | null;
  type?: string | null;
}

interface DocumentItem {
  id: string;
  title: string;
  type: 'INVOICE' | 'CONTRACT' | 'HANDOVER' | 'WARRANTY' | 'QUOTATION' | 'PROPOSAL' | 'OTHER';
  projectName?: string | null;
  projectCode?: string | null;
  contractNumber?: string | null;
  invoiceNumber?: string | null;
  companyName?: string | null;
  vendorId?: string | null;
  vendorName?: string | null;
  assetId?: string | null;
  assetIds?: string[] | null;
  licenseId?: string | null;
  licenseIds?: string[] | null;
  serviceId?: string | null;
  serviceIds?: string[] | null;
  documentDate?: string | null;
  amount?: number | string | null;
  amountCurrency?: string;
  fileUrl: string;
  fileName: string;
  fileSize?: number | null;
  fileType?: string | null;
  attachments?: DocumentAttachment[] | null;
  notes?: string | null;
  createdAt: string;
  vendor?: { id: string; name: string } | null;
  asset?: { id: string; assetTag: string; name: string; serialNumber?: string | null } | null;
  createdBy?: { id: string; fullName: string } | null;
}

interface ProjectGroup {
  name: string;
  code?: string;
  totalDocs: number;
  totalAmount: number;
  companies: string[];
  vendors: string[];
  types: string[];
  documents: DocumentItem[];
  linkedAssets: any[];
  latestDate?: string;
}

function getDocumentTypes(isEn: boolean) {
  return [
    { value: 'ALL', label: isEn ? 'All Documents' : 'Tất cả giấy tờ', icon: '📁', countKey: 'totalDocs' },
    { value: 'INVOICE', label: isEn ? 'Invoice (VAT / Electronic)' : 'Hóa đơn (VAT / Điện tử)', icon: '🧾', countKey: 'totalInvoices' },
    { value: 'CONTRACT', label: isEn ? 'Sales / Service Contract' : 'Hợp đồng mua bán / DV', icon: '📑', countKey: 'totalContracts' },
    { value: 'HANDOVER', label: isEn ? 'Handover Minute' : 'Biên bản bàn giao', icon: '📝', countKey: 'totalHandovers' },
    { value: 'WARRANTY', label: isEn ? 'Warranty Card / Slip' : 'Phiếu / Thẻ bảo hành', icon: '🛡️', countKey: 'totalWarranties' },
    { value: 'QUOTATION', label: isEn ? 'Quotation / Estimate' : 'Báo giá / Dự toán', icon: '📊', countKey: 'totalQuotations' },
    { value: 'PROPOSAL', label: isEn ? 'Proposal / Submission' : 'Tờ trình & Đề xuất', icon: '📋', countKey: 'totalProposals' },
    { value: 'OTHER', label: isEn ? 'Other Documents' : 'Hồ sơ / Giấy tờ khác', icon: '📎', countKey: 'none' },
  ];
}

export default function DocumentsPage() {
  const { language, t } = useLanguage();
  const isEn = language === 'en';
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [projects, setProjects] = useState<ProjectGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({
    totalDocs: 0,
    totalInvoices: 0,
    totalContracts: 0,
    totalHandovers: 0,
    totalWarranties: 0,
    totalQuotations: 0,
    totalProjects: 0,
    totalAmount: 0,
  });

  // View Mode: 'DOCUMENTS' (flat list) or 'PROJECTS' (grouped by Project / Purchase Package)
  const [displayGrouping, setDisplayGrouping] = useState<'DOCUMENTS' | 'PROJECTS'>('DOCUMENTS');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('');
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});

  // Filters
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedVendor, setSelectedVendor] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [viewMode, setViewMode] = useState<'TABLE' | 'GRID'>('TABLE');
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const typeDropdownRef = useRef<HTMLDivElement>(null);

  // Reference lists
  const [companies, setCompanies] = useState<string[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddProjectModalOpen, setIsAddProjectModalOpen] = useState(false);
  const [newProjectForm, setNewProjectForm] = useState({
    name: '',
    code: '',
    companyName: '',
    vendorId: '',
    description: '',
  });
  const [savingProject, setSavingProject] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  const [previewAttachmentIndex, setPreviewAttachmentIndex] = useState(0);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  // AI Auto-Extract State
  const [isAiUploadModalOpen, setIsAiUploadModalOpen] = useState(false);
  const [aiUploadFile, setAiUploadFile] = useState<File | null>(null);
  const [aiUploadPreviewUrl, setAiUploadPreviewUrl] = useState<string>('');
  const [aiExtracting, setAiExtracting] = useState(false);
  const [aiExtractedData, setAiExtractedData] = useState<any>(null);
  const aiUploadInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const initialForm = {
    title: '',
    type: 'INVOICE' as DocumentItem['type'],
    projectName: '',
    projectCode: '',
    contractNumber: '',
    invoiceNumber: '',
    companyName: '',
    vendorId: '',
    vendorName: '',
    assetId: '',
    licenseId: '',
    serviceId: '',
    assetIds: [] as string[],
    licenseIds: [] as string[],
    serviceIds: [] as string[],
    documentDate: new Date().toISOString().split('T')[0],
    amount: '',
    fileUrl: '',
    fileName: '',
    fileSize: 0,
    fileType: '',
    attachments: [] as DocumentAttachment[],
    notes: '',
  };
  const [formData, setFormData] = useState(initialForm);
  const [editFormData, setEditFormData] = useState(initialForm);

  // ESC KEY HANDLER to close any active modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (previewDoc) {
          setPreviewDoc(null);
        } else if (isAddProjectModalOpen) {
          setIsAddProjectModalOpen(false);
        } else if (isAddModalOpen) {
          setIsAddModalOpen(false);
        } else if (isEditModalOpen) {
          setIsEditModalOpen(false);
          setEditingDocId(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewDoc, isAddModalOpen, isEditModalOpen]);

  // Click outside listener for type dropdown popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target as Node)) {
        setIsTypeDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load Documents & Projects
  const loadDocuments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedType !== 'ALL') params.append('type', selectedType);
      if (selectedCompany) params.append('companyName', selectedCompany);
      if (selectedVendor) params.append('vendorId', selectedVendor);
      if (selectedProjectFilter) params.append('projectName', selectedProjectFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const [docsRes, projRes] = await Promise.all([
        fetch(`/api/documents?${params.toString()}`).then((r) => r.json()),
        fetch('/api/projects').then((r) => r.json()).catch(() => ({ data: [] })),
      ]);

      if (docsRes.success) {
        setDocuments(docsRes.data || []);
        if (docsRes.stats) setStats(docsRes.stats);
      }
      if (projRes.data) {
        setProjects(projRes.data || []);
      }
    } catch {
      console.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const loadReferenceData = () => {
    Promise.all([
      fetch('/api/companies').then((r) => r.json()).catch(() => ({ data: [] })),
      fetch('/api/vendors').then((r) => r.json()).catch(() => ({ data: [] })),
      fetch('/api/assets?pageSize=1000').then((r) => r.json()).catch(() => ({ data: [] })),
      fetch('/api/licenses?pageSize=1000').then((r) => r.json()).catch(() => ({ data: [] })),
      fetch('/api/services?pageSize=1000').then((r) => r.json()).catch(() => ({ data: [] })),
    ]).then(([compRes, vendRes, assetRes, licRes, svcRes]) => {
      if (compRes.data) setCompanies(compRes.data);
      if (vendRes.data) setVendors(vendRes.data);
      if (assetRes.data) setAssets(assetRes.data || assetRes.assets || []);
      if (licRes && (licRes.data || licRes.licenses)) setLicenses(licRes.data || licRes.licenses || []);
      if (svcRes && (svcRes.data || svcRes.services)) setServices(svcRes.data || svcRes.services || []);
    });
  };

  useEffect(() => {
    loadReferenceData();
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [search, selectedType, selectedCompany, selectedVendor, selectedProjectFilter, startDate, endDate]);

  // Project CRUD Handlers
  const currentSelectedProject = isEditModalOpen ? editFormData.projectName : formData.projectName;
  const projectDropdownItems = Array.from(
    new Set([
      ...projects.map((p) => p.name),
      ...(currentSelectedProject ? [currentSelectedProject] : []),
    ])
  ).map((pName) => {
    const proj = projects.find((p) => p.name === pName);
    return {
      id: pName,
      name: pName,
      subtitle: proj ? `${proj.totalDocs} chứng từ • ${formatCurrency(proj.totalAmount)}` : undefined,
      icon: <FolderKanban className="w-3.5 h-3.5 text-amber-600 shrink-0" />,
    };
  });

  const handleCreateProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pName = newProjectForm.name.trim();
    if (!pName) {
      alert('Vui lòng nhập tên Gói mua sắm / Dự án');
      return;
    }
    setSavingProject(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProjectForm),
      });
      const data = await res.json();
      if (res.ok) {
        setProjects((prev) => {
          if (prev.some((p) => p.name === pName)) return prev;
          return [
            {
              name: pName,
              code: newProjectForm.code || undefined,
              totalDocs: 0,
              totalAmount: 0,
              companies: newProjectForm.companyName ? [newProjectForm.companyName] : [],
              vendors: [],
              types: [],
              documents: [],
              linkedAssets: [],
            },
            ...prev,
          ];
        });
        setIsAddProjectModalOpen(false);
        setDisplayGrouping('PROJECTS');
        setExpandedProjects((prev) => ({ ...prev, [pName]: true }));
      } else {
        alert(data.error || 'Không thể tạo gói mua sắm / dự án');
      }
    } catch {
      alert('Lỗi kết nối khi tạo dự án');
    } finally {
      setSavingProject(false);
    }
  };

  const handleAddProject = async (name: string) => {
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        setProjects((prev) => {
          if (prev.some((p) => p.name === name)) return prev;
          return [
            ...prev,
            {
              name,
              totalDocs: 0,
              totalAmount: 0,
              companies: [],
              vendors: [],
              types: [],
              documents: [],
              linkedAssets: [],
            },
          ];
        });
        setFormData((prev) => ({ ...prev, projectName: name }));
        setEditFormData((prev) => ({ ...prev, projectName: name }));
      }
    } catch {
      alert('Không thể thêm dự án');
    }
  };

  const handleEditProject = async (oldName: string, newName: string) => {
    try {
      const res = await fetch('/api/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldName, newName }),
      });
      if (res.ok) {
        if (formData.projectName === oldName) setFormData((prev) => ({ ...prev, projectName: newName }));
        if (editFormData.projectName === oldName) setEditFormData((prev) => ({ ...prev, projectName: newName }));
        loadDocuments();
      }
    } catch {
      alert('Không thể sửa dự án');
    }
  };

  const handleDeleteProject = async (name: string) => {
    try {
      const res = await fetch(`/api/projects?name=${encodeURIComponent(name)}`, { method: 'DELETE' });
      if (res.ok) {
        if (formData.projectName === name) setFormData((prev) => ({ ...prev, projectName: '' }));
        if (editFormData.projectName === name) setEditFormData((prev) => ({ ...prev, projectName: '' }));
        loadDocuments();
      }
    } catch {
      alert('Không thể xóa dự án');
    }
  };

  // Company CRUD Handlers
  const handleAddCompany = async (name: string) => {
    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        setCompanies((prev) => Array.from(new Set([...prev, name])));
        if (isAddModalOpen) setFormData((prev) => ({ ...prev, companyName: name }));
        if (isEditModalOpen) setEditFormData((prev) => ({ ...prev, companyName: name }));
      }
    } catch {
      alert('Không thể thêm công ty');
    }
  };

  const handleEditCompany = async (oldName: string, newName: string) => {
    try {
      const res = await fetch('/api/companies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldName, newName }),
      });
      if (res.ok) {
        setCompanies((prev) => prev.map((c) => (c === oldName ? newName : c)));
        if (formData.companyName === oldName) setFormData((prev) => ({ ...prev, companyName: newName }));
        if (editFormData.companyName === oldName) setEditFormData((prev) => ({ ...prev, companyName: newName }));
        loadDocuments();
      }
    } catch {
      alert('Không thể sửa công ty');
    }
  };

  const handleDeleteCompany = async (name: string) => {
    try {
      const res = await fetch(`/api/companies?name=${encodeURIComponent(name)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setCompanies((prev) => prev.filter((c) => c !== name));
        if (formData.companyName === name) setFormData((prev) => ({ ...prev, companyName: '' }));
        if (editFormData.companyName === name) setEditFormData((prev) => ({ ...prev, companyName: '' }));
      }
    } catch {
      alert('Không thể xóa công ty');
    }
  };

  // Vendor CRUD Handlers
  const handleAddVendor = async (name: string) => {
    try {
      const res = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (res.ok) {
        setVendors((prev) => [...prev, data.data]);
        if (isAddModalOpen) setFormData((prev) => ({ ...prev, vendorId: data.data.id, vendorName: name }));
        if (isEditModalOpen) setEditFormData((prev) => ({ ...prev, vendorId: data.data.id, vendorName: name }));
      }
    } catch {
      alert('Không thể thêm nhà cung cấp');
    }
  };

  const handleEditVendor = async (id: string, newName: string) => {
    try {
      const res = await fetch(`/api/vendors/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });
      if (res.ok) {
        setVendors((prev) => prev.map((v) => (v.id === id ? { ...v, name: newName } : v)));
        loadDocuments();
      }
    } catch {
      alert('Không thể sửa nhà cung cấp');
    }
  };

  const handleDeleteVendor = async (id: string) => {
    try {
      const res = await fetch(`/api/vendors/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setVendors((prev) => prev.filter((v) => v.id !== id));
        if (formData.vendorId === id) setFormData((prev) => ({ ...prev, vendorId: '', vendorName: '' }));
        if (editFormData.vendorId === id) setEditFormData((prev) => ({ ...prev, vendorId: '', vendorName: '' }));
      }
    } catch {
      alert('Không thể xóa nhà cung cấp');
    }
  };

  
  // AI AUTO EXTRACT FOR DOCUMENTS
  const handleExtractDocumentWithAI = async (file: File) => {
    setAiExtracting(true);
    try {
      const aiData = new FormData();
      aiData.append('file', file);
      aiData.append('inputType', 'FILE');
      aiData.append('targetEntity', 'ASSET');

      const res = await fetch('/api/ai/extract', {
        method: 'POST',
        body: aiData,
      });

      const json = await res.json();
      if (res.ok && json.success && json.data?.extractedData) {
        const ext = json.data.extractedData;
        const fileInfo = json.data.fileInfo;

        // Determine Document Type
        let detectedType: DocumentItem['type'] = 'INVOICE';
        const rawType = String(ext.docType || '').toUpperCase();
        const lowerName = file.name.toLowerCase();
        if (rawType.includes('PROPOSAL') || lowerName.includes('tờ trình') || lowerName.includes('to trinh') || lowerName.includes('đề xuất') || lowerName.includes('de xuat') || lowerName.includes('proposal')) {
          detectedType = 'PROPOSAL';
        } else if (rawType.includes('CONTRACT') || lowerName.includes('hợp đồng') || lowerName.includes('hop dong') || lowerName.includes('contract')) {
          detectedType = 'CONTRACT';
        } else if (rawType.includes('QUOTATION') || lowerName.includes('báo giá') || lowerName.includes('bao gia') || lowerName.includes('quote')) {
          detectedType = 'QUOTATION';
        } else if (rawType.includes('HANDOVER') || lowerName.includes('bàn giao') || lowerName.includes('ban giao') || lowerName.includes('nghiệm thu') || lowerName.includes('nghiem thu')) {
          detectedType = 'HANDOVER';
        } else if (rawType.includes('WARRANTY') || lowerName.includes('bảo hành') || lowerName.includes('bao hanh') || lowerName.includes('warranty')) {
          detectedType = 'WARRANTY';
        } else if (rawType.includes('INVOICE') || lowerName.includes('hóa đơn') || lowerName.includes('hoa don') || lowerName.includes('vat') || lowerName.includes('invoice')) {
          detectedType = 'INVOICE';
        }

        // Match Vendor
        let matchedVendorId = '';
        let matchedVendorName = ext.vendorName || '';
        if (ext.vendorName) {
          const v = vendors.find((item: any) => item.name.toLowerCase().includes(ext.vendorName.toLowerCase()) || ext.vendorName.toLowerCase().includes(item.name.toLowerCase()));
          if (v) {
            matchedVendorId = v.id;
            matchedVendorName = v.name;
          }
        }

        // Match Company
        let matchedCompany = ext.companyName || '';
        if (ext.companyName) {
          const c = companies.find((item: any) => item.toLowerCase().includes(ext.companyName.toLowerCase()) || ext.companyName.toLowerCase().includes(item.toLowerCase()));
          if (c) matchedCompany = c;
        }

        // Match Assets / Licenses / Services based on extracted items
        const matchedAssetIds: string[] = [];
        const matchedLicenseIds: string[] = [];
        const matchedServiceIds: string[] = [];

        if (Array.isArray(ext.items)) {
          ext.items.forEach((it: any) => {
            const itName = String(it.name || '').toLowerCase();
            const itModel = String(it.model || '').toLowerCase();
            const itBrand = String(it.brand || '').toLowerCase();

            // Check assets
            const a = assets.find((ast: any) => {
              const an = (ast.name || '').toLowerCase();
              const at = (ast.assetTag || '').toLowerCase();
              const am = (ast.model || '').toLowerCase();
              return (itName && an.includes(itName)) || (itModel && am && am.includes(itModel)) || (itName && itName.includes(at));
            });
            if (a && !matchedAssetIds.includes(a.id)) matchedAssetIds.push(a.id);

            // Check licenses
            const l = licenses.find((lic: any) => {
              const ln = (lic.name || '').toLowerCase();
              return (itName && ln.includes(itName)) || (itName && itName.includes(ln));
            });
            if (l && !matchedLicenseIds.includes(l.id)) matchedLicenseIds.push(l.id);

            // Check services
            const s = services.find((svc: any) => {
              const sn = (svc.name || '').toLowerCase();
              const sc = (svc.serviceCode || '').toLowerCase();
              return (itName && sn.includes(itName)) || (itName && itName.includes(sc));
            });
            if (s && !matchedServiceIds.includes(s.id)) matchedServiceIds.push(s.id);
          });
        }

        // Build Title
        let generatedTitle = ext.title;
        if (!generatedTitle) {
          const typePrefix = detectedType === 'PROPOSAL' ? 'Tờ trình / Đề xuất' :
                             detectedType === 'INVOICE' ? 'Hóa đơn VAT' :
                             detectedType === 'CONTRACT' ? 'Hợp đồng' :
                             detectedType === 'QUOTATION' ? 'Báo giá' :
                             detectedType === 'HANDOVER' ? 'Biên bản bàn giao' :
                             detectedType === 'WARRANTY' ? 'Phiếu bảo hành' : 'Chứng từ';
          const numPart = ext.invoiceNumber || ext.contractNumber || ext.proposalNumber || '';
          const vendorPart = matchedVendorName ? ` - ${matchedVendorName}` : '';
          generatedTitle = `${typePrefix} ${numPart}${vendorPart}`.trim() || file.name.replace(/\.[^/.]+$/, '');
        }

        // Build Attachment
        const newAttachment: DocumentAttachment = {
          url: fileInfo?.fileUrl || URL.createObjectURL(file),
          name: file.name,
          size: file.size,
          type: file.type,
        };

        // Update Form State
        setFormData(prev => ({
          ...prev,
          title: generatedTitle,
          type: detectedType,
          projectName: ext.projectName || prev.projectName,
          contractNumber: ext.contractNumber || prev.contractNumber,
          invoiceNumber: ext.invoiceNumber || ext.proposalNumber || prev.invoiceNumber,
          companyName: matchedCompany || prev.companyName,
          vendorId: matchedVendorId || prev.vendorId,
          vendorName: matchedVendorName || prev.vendorName,
          documentDate: ext.purchaseDate || ext.documentDate || prev.documentDate,
          amount: ext.totalAmount ? String(ext.totalAmount) : prev.amount,
          fileUrl: newAttachment.url,
          fileName: newAttachment.name,
          fileSize: newAttachment.size || 0,
          fileType: newAttachment.type || '',
          attachments: [newAttachment, ...(prev.attachments || [])],
          notes: ext.summary || (Array.isArray(ext.items) ? ext.items.map((i: any) => `- ${i.name} (SL: ${i.quantity || 1})`).join('\n') : prev.notes),
          assetId: matchedAssetIds[0] || prev.assetId,
          assetIds: Array.from(new Set([...(prev.assetIds || []), ...matchedAssetIds])),
          licenseId: matchedLicenseIds[0] || prev.licenseId,
          licenseIds: Array.from(new Set([...(prev.licenseIds || []), ...matchedLicenseIds])),
          serviceId: matchedServiceIds[0] || prev.serviceId,
          serviceIds: Array.from(new Set([...(prev.serviceIds || []), ...matchedServiceIds])),
        }));

        setIsAddModalOpen(true);
      } else {
        alert('AI không thể nhận diện được nội dung tệp. Vui lòng tự nhập thông tin.');
      }
    } catch (e: any) {
      console.error('AI extract error:', e);
      alert('Lỗi kết nối AI: ' + (e.message || 'Thử lại sau'));
    } finally {
      setAiExtracting(false);
    }
  };

  // MULTIPLE FILE UPLOAD HANDLER
  const handleMultipleFileUpload = async (files: FileList | File[], isEdit: boolean = false) => {
    if (!files || files.length === 0) return;
    setUploadingFile(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const uploadData = new FormData();
        uploadData.append('file', file);
        uploadData.append('category', 'doc');

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: uploadData,
        });

        const data = await res.json();
        if (res.ok) {
          return {
            url: data.url,
            name: data.originalName || file.name,
            size: data.fileSize || file.size,
            type: data.fileType || file.type,
          } as DocumentAttachment;
        }
        return null;
      });

      const results = await Promise.all(uploadPromises);
      const validUploads = results.filter(Boolean) as DocumentAttachment[];

      if (validUploads.length > 0) {
        const updater = isEdit ? setEditFormData : setFormData;
        updater((prev) => {
          const newAttachments = [...(prev.attachments || []), ...validUploads];
          const primary = newAttachments[0];
          return {
            ...prev,
            attachments: newAttachments,
            fileUrl: primary?.url || prev.fileUrl,
            fileName: primary?.name || prev.fileName,
            fileSize: primary?.size || prev.fileSize,
            fileType: primary?.type || prev.fileType,
            title: prev.title ? prev.title : validUploads[0].name.replace(/\.[^/.]+$/, ''),
          };
        });
      }
    } catch {
      alert('Lỗi kết nối khi tải file lên');
    } finally {
      setUploadingFile(false);
    }
  };

  // REMOVE ATTACHMENT
  const handleRemoveAttachment = (index: number, isEdit: boolean = false) => {
    const updater = isEdit ? setEditFormData : setFormData;
    updater((prev) => {
      const updated = prev.attachments.filter((_, i) => i !== index);
      const primary = updated[0];
      return {
        ...prev,
        attachments: updated,
        fileUrl: primary?.url || '',
        fileName: primary?.name || '',
        fileSize: primary?.size || 0,
        fileType: primary?.type || '',
      };
    });
  };

  // Submit Add
  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fileUrl && (!formData.attachments || formData.attachments.length === 0)) {
      alert('Vui lòng chọn hoặc tải ít nhất 1 tệp đính kèm');
      return;
    }

    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.ok) {
        setIsAddModalOpen(false);
        setFormData(initialForm);
        loadDocuments();
      } else {
        alert(data.error || 'Thêm tài liệu thất bại');
      }
    } catch {
      alert('Lỗi kết nối khi lưu tài liệu');
    }
  };

  // Submit Edit
  const handleOpenEdit = (doc: DocumentItem) => {
    setEditingDocId(doc.id);
    const existingAttachments: DocumentAttachment[] = Array.isArray(doc.attachments) && doc.attachments.length > 0
      ? doc.attachments
      : (doc.fileUrl ? [{ url: doc.fileUrl, name: doc.fileName, size: doc.fileSize, type: doc.fileType }] : []);

    setEditFormData({
      title: doc.title,
      type: doc.type,
      projectName: doc.projectName || '',
      projectCode: doc.projectCode || '',
      contractNumber: doc.contractNumber || '',
      invoiceNumber: doc.invoiceNumber || '',
      companyName: doc.companyName || '',
      vendorId: doc.vendorId || '',
      vendorName: doc.vendorName || '',
      assetId: doc.assetId || '',
      licenseId: doc.licenseId || '',
      serviceId: doc.serviceId || '',
      assetIds: Array.isArray(doc.assetIds) && doc.assetIds.length > 0 ? doc.assetIds : (doc.assetId ? [doc.assetId] : []),
      licenseIds: Array.isArray(doc.licenseIds) && doc.licenseIds.length > 0 ? doc.licenseIds : (doc.licenseId ? [doc.licenseId] : []),
      serviceIds: Array.isArray(doc.serviceIds) && doc.serviceIds.length > 0 ? doc.serviceIds : (doc.serviceId ? [doc.serviceId] : []),
      documentDate: doc.documentDate ? doc.documentDate.split('T')[0] : '',
      amount: doc.amount ? String(doc.amount) : '',
      fileUrl: doc.fileUrl,
      fileName: doc.fileName,
      fileSize: doc.fileSize || 0,
      fileType: doc.fileType || '',
      attachments: existingAttachments,
      notes: doc.notes || '',
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDocId) return;

    try {
      const res = await fetch(`/api/documents/${editingDocId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
      });

      const data = await res.json();
      if (res.ok) {
        setIsEditModalOpen(false);
        setEditingDocId(null);
        loadDocuments();
      } else {
        alert(data.error || 'Cập nhật tài liệu thất bại');
      }
    } catch {
      alert('Lỗi kết nối');
    }
  };

  // Delete
  const handleDeleteDocument = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa hồ sơ / giấy tờ này?')) return;
    try {
      const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      if (res.ok) loadDocuments();
      else alert('Xóa thất bại');
    } catch {
      alert('Lỗi kết nối');
    }
  };

  // Helper type badge
  const getTypeBadge = (type: DocumentItem['type']) => {
    switch (type) {
      case 'INVOICE':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">🧾 Hóa đơn VAT</span>;
      case 'CONTRACT':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">📑 Hợp đồng</span>;
      case 'HANDOVER':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">📝 Biên bản bàn giao</span>;
      case 'WARRANTY':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">🛡️ Bảo hành</span>;
      case 'QUOTATION':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">📊 Báo giá</span>;
      case 'PROPOSAL':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">📋 Tờ trình & Đề xuất</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">📎 Giấy tờ khác</span>;
    }
  };

  const isPdf = (url: string = '', name: string = '') => url.toLowerCase().endsWith('.pdf') || name.toLowerCase().endsWith('.pdf');
  const isImage = (url: string = '', name: string = '') => /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(url) || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(name);


  // Service Dropdown Items
  const serviceDropdownItems = services.map((s) => {
    return {
      id: s.id,
      name: `[${s.serviceCode}] ${s.name}`,
      subtitle: s.vendor?.name ? `${s.vendor.name} • ${s.accountNumber || ''}` : s.accountNumber || 'Dịch vụ IT',
      icon: <Globe className="w-4 h-4 text-blue-600 shrink-0" />,
    };
  });

  // License Dropdown Items
  const licenseDropdownItems = licenses.map((l) => {
    const typeLabel = l.licenseType === 'SUBSCRIPTION' ? 'Thuê bao' : l.licenseType === 'PERPETUAL' ? 'Vĩnh viễn' : l.licenseType === 'OEM' ? 'OEM' : (l.licenseType || 'Bản quyền');
    const keyPart = l.licenseKey ? ` • Key: ${l.licenseKey}` : '';
    const seatPart = l.totalSeats ? ` • ${l.totalSeats} seats` : '';
    return {
      id: l.id,
      name: l.name,
      subtitle: `${typeLabel}${keyPart}${seatPart}`,
      icon: <Key className="w-4 h-4 text-purple-600 shrink-0" />,
    };
  });

  // Asset Dropdown Items
  const assetDropdownItems = assets.map((a) => {
    const brandPart = a.brand ? `${a.brand} ${a.model || ''} ` : '';
    const snPart = a.serialNumber ? ` • SN: ${a.serialNumber}` : '';
    return {
      id: a.id,
      name: `[${a.assetTag}] ${a.name}`,
      subtitle: `${brandPart}${snPart}`.trim() || (a.companyName || 'Thiết bị công ty'),
      icon: <Laptop className="w-4 h-4 text-blue-600 shrink-0" />,
    };
  });

  // Company Dropdown Items
  const companyDropdownItems = companies.map((c) => ({
    id: c,
    name: c,
    icon: <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />,
  }));

  // Vendor Dropdown Items
  const vendorDropdownItems = vendors.map((v) => ({
    id: v.id,
    name: v.name,
    icon: <Handshake className="w-3.5 h-3.5 text-emerald-600 shrink-0" />,
  }));

  // Render attachment thumbnail / icon helper
  const renderFileIcon = (url: string, name: string) => {
    if (isPdf(url, name)) return <FileText className="w-4 h-4 text-rose-600 shrink-0" />;
    if (isImage(url, name)) return <ImageIcon className="w-4 h-4 text-emerald-600 shrink-0" />;
    return <FileCode className="w-4 h-4 text-blue-600 shrink-0" />;
  };

  const activeTypeObj = getDocumentTypes(isEn).find((d) => d.value === selectedType) || getDocumentTypes(isEn)[0];

  const toggleProjectExpand = (pName: string) => {
    setExpandedProjects((prev) => ({ ...prev, [pName]: !prev[pName] }));
  };

  return (
    <div className="space-y-4">
      {/* Page Header & Quick Actions - Matching Assets Page */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-1 border-b border-slate-100">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>{isEn ? 'Invoices, Contracts & Procurement' : 'Quản lý Hóa đơn & Hợp đồng'}</span>
            <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
              {documents.length} {isEn ? 'documents' : 'hồ sơ'}
            </span>
            {projects.length > 0 && (
              <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                <FolderKanban className="w-3 h-3" />
                <span>{projects.length} {isEn ? 'procurement projects' : 'gói mua sắm / dự án'}</span>
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isEn ? 'Archive, group by procurement project/bundle, lookup contracts, VAT invoices, handovers and warranties' : 'Lưu trữ, gom nhóm theo gói mua sắm/dự án, tra cứu nhanh hợp đồng, hóa đơn VAT, biên bản nghiệm thu và bảo hành'}
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Switch View Mode: Single Docs vs Group by Projects */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              onClick={() => setDisplayGrouping('DOCUMENTS')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                displayGrouping === 'DOCUMENTS'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{isEn ? 'Single Documents' : 'Từng chứng từ'}</span>
            </button>
            <button
              onClick={() => setDisplayGrouping('PROJECTS')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                displayGrouping === 'PROJECTS'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FolderKanban className="w-3.5 h-3.5" />
              <span>{isEn ? 'Group by Project' : 'Theo Gói mua sắm / Dự án'}</span>
            </button>
          </div>

          <input
            ref={aiUploadInputRef}
            type="file"
            accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleExtractDocumentWithAI(file);
              e.target.value = '';
            }}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => aiUploadInputRef.current?.click()}
            disabled={aiExtracting}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer hover:shadow-purple-500/25 disabled:opacity-50"
            title="Tự động đọc hóa đơn/tờ trình/hợp đồng bằng AI và điền form"
          >
            {aiExtracting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-amber-300" />}
            <span>{aiExtracting ? (isEn ? 'AI reading file...' : 'AI đang đọc tệp...') : (isEn ? '✨ AI Smart Import' : '✨ Nhập nhanh AI')}</span>
          </button>

          <button
            onClick={loadDocuments}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-all cursor-pointer"
            title={isEn ? 'Refresh Data' : 'Làm mới dữ liệu'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{isEn ? 'Refresh' : 'Làm mới'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setNewProjectForm({
                name: '',
                code: '',
                companyName: companies[0] || '',
                vendorId: '',
                description: '',
              });
              setIsAddProjectModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-lg shadow-2xs transition-all cursor-pointer"
          >
            <FolderKanban className="w-3.5 h-3.5 text-amber-700" />
            <span>{isEn ? '+ Add Project / Bundle' : '+ Thêm Gói Mua Sắm / Dự Án'}</span>
          </button>

          <button
            onClick={() => {
              setFormData(initialForm);
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isEn ? '+ Upload New Document' : 'Tải Lên Hồ Sơ Mới'}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar - Compact & Sleek Single Bar Matching Assets Page */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs">
        {/* Keyword Search */}
        <div className="relative flex-1 w-full min-w-[180px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder={isEn ? "Search by title, project name, contract/invoice number, vendor..." : "Tìm theo tiêu đề, Tên dự án, Số HĐ, Số Hóa đơn, đối tác..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Controls Row */}
        <div className="flex items-center gap-1.5 w-full md:w-auto flex-wrap justify-end shrink-0">
          {/* Project / Purchase bundle filter */}
          <select
            value={selectedProjectFilter}
            onChange={(e) => setSelectedProjectFilter(e.target.value)}
            className="py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer max-w-[160px] truncate"
          >
            <option value="">📁 {isEn ? 'All projects / bundles' : 'Tất cả gói / dự án'}</option>
            {projects.map((p) => (
              <option key={p.name} value={p.name}>
                📁 {p.name} ({p.totalDocs})
              </option>
            ))}
          </select>

          {/* Company filter */}
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer max-w-[130px] truncate"
          >
            <option value="">🏢 {isEn ? 'All companies' : 'Tất cả công ty'}</option>
            {companies.map((c) => (
              <option key={c} value={c}>
                🏢 {c}
              </option>
            ))}
          </select>

          {/* Vendor filter */}
          <select
            value={selectedVendor}
            onChange={(e) => setSelectedVendor(e.target.value)}
            className="py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer max-w-[130px] truncate"
          >
            <option value="">🤝 {isEn ? 'All vendors' : 'Tất cả đối tác'}</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                🤝 {v.name}
              </option>
            ))}
          </select>

          {/* Type Popover Dropdown */}
          <div className="relative shrink-0" ref={typeDropdownRef}>
            <button
              type="button"
              onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
              className={`py-1.5 px-2.5 border rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
                selectedType !== 'ALL'
                  ? 'border-blue-400 bg-blue-50 text-blue-900 ring-2 ring-blue-200'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>{activeTypeObj.icon}</span>
              <span className="truncate max-w-[110px]">{activeTypeObj.label}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
            </button>

            {/* Popover Menu */}
            {isTypeDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 z-40 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 space-y-1 animate-in fade-in zoom-in-95 duration-100">
                <div className="max-h-56 overflow-y-auto space-y-0.5 pr-0.5">
                  {getDocumentTypes(isEn).map((dt) => {
                    const isSelected = selectedType === dt.value;
                    const count = dt.countKey !== 'none' ? stats[dt.countKey] : null;

                    return (
                      <div
                        key={dt.value}
                        onClick={() => {
                          setSelectedType(dt.value);
                          setIsTypeDropdownOpen(false);
                        }}
                        className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-xs cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-600 text-white font-bold' : 'hover:bg-blue-50/80 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate flex-1 pr-1">
                          <span>{dt.icon}</span>
                          <span className="truncate">{dt.label}</span>
                        </div>
                        {count !== null && (
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                              isSelected ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {count}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* View mode toggle */}
          {displayGrouping === 'DOCUMENTS' && (
            <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50 p-0.5">
              <button
                onClick={() => setViewMode('TABLE')}
                className={`p-1 rounded-lg text-xs font-bold flex items-center transition-colors cursor-pointer ${
                  viewMode === 'TABLE' ? 'bg-white shadow-2xs text-blue-700' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Xem dạng bảng"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('GRID')}
                className={`p-1 rounded-lg text-xs font-bold flex items-center transition-colors cursor-pointer ${
                  viewMode === 'GRID' ? 'bg-white shadow-2xs text-blue-700' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Xem dạng lưới"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <Loader2 className="w-7 h-7 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-xs text-slate-500 font-medium">{isEn ? 'Loading documents & attachments...' : 'Đang tải danh sách hồ sơ & chứng từ...'}</p>
        </div>
      ) : documents.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Chưa có hồ sơ / hợp đồng nào</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Tải lên các file PDF hóa đơn VAT, hợp đồng mua sắm hoặc biên bản bàn giao để gom nhóm và quản lý tập trung.
            </p>
          </div>
          <button
            onClick={() => {
              setFormData(initialForm);
              setIsAddModalOpen(true);
            }}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer"
          >
            + Tải Lên Hồ Sơ Đầu Tiên
          </button>
        </div>
      ) : displayGrouping === 'PROJECTS' ? (
        /* ==================== VIEW MODE: GROUP BY PROJECT / PURCHASE DOSSIER ==================== */
        <div className="space-y-3">
          {projects.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 space-y-2">
              <FolderKanban className="w-10 h-10 text-amber-500 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">Chưa có hồ sơ nào được gán vào Gói mua sắm / Dự án</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Khi thêm hoặc sửa hồ sơ, hãy nhập <strong>Tên Dự án / Gói mua sắm</strong> (VD: <em>"Mua sắm Laptop Dev 2026"</em>) để tự động gom nhóm hợp đồng, hóa đơn và biên bản lại với nhau!
              </p>
            </div>
          ) : (
            projects.map((proj) => {
              const isExpanded = !!expandedProjects[proj.name]; // Default collapsed! Only opens when clicked

              return (
                <div
                  key={proj.name}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all hover:border-blue-300"
                >
                  {/* Project Header Bar */}
                  <div
                    onClick={() => toggleProjectExpand(proj.name)}
                    className="p-3.5 bg-gradient-to-r from-slate-50 via-indigo-50/20 to-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer border-b border-slate-100 hover:bg-slate-100/50 transition-colors"
                  >
                    <div className="flex items-center space-x-3 truncate">
                      <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0 shadow-2xs">
                        <FolderOpen className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-sm text-slate-900 truncate">
                            {proj.name}
                          </h3>
                          {proj.code && (
                            <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 border border-amber-200 rounded text-[10px] font-mono font-bold">
                              {proj.code}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                          <span>📦 <strong>{proj.totalDocs}</strong> chứng từ liên kết</span>
                          {proj.vendors.length > 0 && <span>• 🤝 {proj.vendors.join(', ')}</span>}
                          {proj.companies.length > 0 && <span>• 🏢 {proj.companies.join(', ')}</span>}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Tổng giá trị gói</span>
                        <span className="text-sm font-black text-amber-700 font-mono">
                          {formatCurrency(proj.totalAmount)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFormData({ ...initialForm, projectName: proj.name, projectCode: proj.code || '' });
                          setIsAddModalOpen(true);
                        }}
                        className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold flex items-center gap-1 border border-blue-200 cursor-pointer shadow-2xs"
                        title="Thêm chứng từ vào gói này"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Thêm tệp</span>
                      </button>

                      <div className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Project Documents List */}
                  {isExpanded && (
                    <div className="p-3 bg-slate-50/40 divide-y divide-slate-100">
                      {/* Linked Assets Summary if any */}
                      {proj.linkedAssets && proj.linkedAssets.length > 0 && (
                        <div className="pb-2.5 mb-2.5 border-b border-slate-200/80 flex items-center gap-2 flex-wrap text-xs">
                          <span className="font-bold text-blue-900 flex items-center gap-1 text-[11px]">
                            <Laptop className="w-3.5 h-3.5 text-blue-600" />
                            <span>Thiết bị thuộc dự án ({proj.linkedAssets.length}):</span>
                          </span>
                          {proj.linkedAssets.map((ast) => (
                            <span
                              key={ast.id}
                              className="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-md font-semibold text-[11px] flex items-center gap-1"
                            >
                              <span>[{ast.assetTag}] {ast.name}</span>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Documents in Project */}
                      {proj.documents.length === 0 ? (
                        <div className="py-6 px-4 text-center bg-white rounded-xl border border-dashed border-slate-200 space-y-1.5">
                          <FolderOpen className="w-6 h-6 text-amber-400 mx-auto" />
                          <p className="text-xs font-semibold text-slate-700">Gói mua sắm / dự án này chưa có chứng từ nào</p>
                          <p className="text-[11px] text-slate-400">
                            Bấm nút <strong>"+ Thêm tệp"</strong> ở trên để tải lên hóa đơn VAT, hợp đồng hoặc biên bản nghiệm thu cho gói này.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {proj.documents.map((doc) => {
                          const attachList = Array.isArray(doc.attachments) && doc.attachments.length > 0
                            ? doc.attachments
                            : (doc.fileUrl ? [{ url: doc.fileUrl, name: doc.fileName, size: doc.fileSize, type: doc.fileType }] : []);

                          return (
                            <div
                              key={doc.id}
                              onClick={() => handleOpenEdit(doc)}
                              className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs hover:border-blue-400 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between space-y-2 group"
                            >
                              <div>
                                <div className="flex items-start justify-between gap-1.5">
                                  <div className="flex items-center space-x-2 truncate">
                                    <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-blue-600 group-hover:bg-blue-50">
                                      {renderFileIcon(doc.fileUrl, doc.fileName)}
                                    </div>
                                    <h4 className="font-bold text-slate-900 group-hover:text-blue-700 text-xs truncate">
                                      {doc.title}
                                    </h4>
                                  </div>
                                  {getTypeBadge(doc.type)}
                                </div>

                                <div className="mt-2 text-[11px] space-y-0.5 text-slate-600">
                                  {doc.contractNumber && <p className="font-mono text-amber-800 font-semibold">HĐ: {doc.contractNumber}</p>}
                                  {doc.invoiceNumber && <p className="font-mono text-emerald-800 font-semibold">HĐơn: {doc.invoiceNumber}</p>}
                                  {doc.documentDate && <p className="text-slate-400">📅 Ngày lập: {formatDate(doc.documentDate)}</p>}
                                  {doc.amount && (
                                    <p className="font-bold text-amber-700 font-mono">
                                      💵 {formatCurrency(Number(doc.amount))}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div
                                className="flex items-center justify-between pt-2 border-t border-slate-100"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  onClick={() => {
                                    setPreviewDoc(doc);
                                    setPreviewAttachmentIndex(0);
                                  }}
                                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>Xem file ({attachList.length})</span>
                                </button>

                                <div className="flex items-center space-x-1">
                                  <a
                                    href={doc.fileUrl}
                                    download={doc.fileName}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                                    title="Tải xuống"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </a>
                                  <button
                                    onClick={() => handleOpenEdit(doc)}
                                    className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                                    title={isEn ? 'Edit' : 'Chỉnh sửa'}
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteDocument(doc.id)}
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                                    title={isEn ? 'Delete' : 'Xóa'}
                                  >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : viewMode === 'TABLE' ? (
        /* ==================== VIEW MODE: TABLE VIEW ==================== */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3 pl-4">Hồ sơ / Giấy tờ</th>
                  <th className="py-2.5 px-3">Gói mua sắm / Dự án</th>
                  <th className="py-2.5 px-3">Phân loại</th>
                  <th className="py-2.5 px-3">Số HĐ / Hóa đơn</th>
                  <th className="py-2.5 px-3">Công ty & Đối tác</th>
                  <th className="py-2.5 px-3">Thiết bị liên kết</th>
                  <th className="py-2.5 px-3">Ngày lập</th>
                  <th className="py-2.5 px-3 text-right">Tổng tiền (VNĐ)</th>
                  <th className="py-2.5 px-3 pr-4 text-center">{isEn ? 'Actions' : 'Thao tác'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {documents.map((doc) => {
                  const attachList = Array.isArray(doc.attachments) && doc.attachments.length > 0
                    ? doc.attachments
                    : (doc.fileUrl ? [{ url: doc.fileUrl, name: doc.fileName, size: doc.fileSize, type: doc.fileType }] : []);

                  return (
                    <tr
                      key={doc.id}
                      onClick={() => handleOpenEdit(doc)}
                      className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                    >
                      {/* Title & File Name */}
                      <td className="py-2 px-3 pl-4">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-blue-600 group-hover:bg-blue-100 transition-colors">
                            {renderFileIcon(doc.fileUrl, doc.fileName)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors line-clamp-1">
                                {doc.title}
                              </p>
                              {attachList.length > 1 && (
                                <span className="px-1.5 py-0.2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md text-[10px] font-bold shrink-0">
                                  📎 {attachList.length} tệp
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 font-mono mt-0.5 line-clamp-1">
                              {doc.fileName} {doc.fileSize ? `• ${(doc.fileSize / 1024).toFixed(0)} KB` : ''}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Project Name / Bundle */}
                      <td className="py-2 px-3">
                        {doc.projectName ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 rounded-md font-semibold text-[11px]">
                            <FolderKanban className="w-3 h-3 text-amber-600" />
                            <span className="truncate max-w-[120px]">{doc.projectName}</span>
                          </span>
                        ) : (
                          <span className="text-slate-300 italic text-[11px]">--</span>
                        )}
                      </td>

                      {/* Type badge */}
                      <td className="py-2 px-3">{getTypeBadge(doc.type)}</td>

                      {/* Contract & Invoice numbers */}
                      <td className="py-2 px-3">
                        <div className="space-y-0.5">
                          {doc.contractNumber && (
                            <span className="inline-block px-1.5 py-0.2 bg-amber-50 text-amber-800 border border-amber-200 rounded font-mono text-[10px]">
                              HĐ: {doc.contractNumber}
                            </span>
                          )}
                          {doc.invoiceNumber && (
                            <span className="inline-block px-1.5 py-0.2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded font-mono text-[10px] ml-1">
                              HĐơn: {doc.invoiceNumber}
                            </span>
                          )}
                          {!doc.contractNumber && !doc.invoiceNumber && (
                            <span className="text-slate-300 italic text-[11px]">--</span>
                          )}
                        </div>
                      </td>

                      {/* Company & Vendor */}
                      <td className="py-2 px-3">
                        <p className="font-semibold text-slate-800 line-clamp-1">
                          {doc.companyName ? `🏢 ${doc.companyName}` : '--'}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                          {doc.vendorName || doc.vendor?.name ? `🤝 ${doc.vendorName || doc.vendor?.name}` : ''}
                        </p>
                      </td>

                      {/* Linked Items: Asset + License + Service */}
                      <td className="py-2 px-3">
                        <div className="flex flex-wrap gap-1 max-w-[230px]">
                          {doc.asset && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded font-semibold text-[10px] max-w-[180px]" title={`[${doc.asset.assetTag}] ${doc.asset.name}`}>
                              <Laptop className="w-3 h-3 text-blue-500 shrink-0" />
                              <span className="truncate">[{doc.asset.assetTag}]</span>
                            </span>
                          )}
                          {(doc as any).license && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-50 text-purple-800 border border-purple-200 rounded font-semibold text-[10px] max-w-[180px]" title={(doc as any).license.name}>
                              <Key className="w-3 h-3 text-purple-500 shrink-0" />
                              <span className="truncate">{(doc as any).license.name?.slice(0, 18)}</span>
                            </span>
                          )}
                          {(doc as any).service && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded font-semibold text-[10px] max-w-[180px]" title={(doc as any).service.name}>
                              <Globe className="w-3 h-3 text-emerald-500 shrink-0" />
                              <span className="truncate">{(doc as any).service.name?.slice(0, 18)}</span>
                            </span>
                          )}
                          {!doc.asset && !(doc as any).license && !(doc as any).service && (
                            <span className="text-slate-300 italic text-[11px]">--</span>
                          )}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-2 px-3 text-slate-600 font-mono">
                        {doc.documentDate ? formatDate(doc.documentDate) : '--'}
                      </td>

                      {/* Amount */}
                      <td className="py-2 px-3 text-right font-bold text-slate-900 font-mono">
                        {doc.amount ? formatCurrency(Number(doc.amount)) : '--'}
                      </td>

                      {/* Actions */}
                      <td className="py-2 px-3 pr-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => {
                              setPreviewDoc(doc);
                              setPreviewAttachmentIndex(0);
                            }}
                            title="Xem trước file"
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <a
                            href={doc.fileUrl}
                            download={doc.fileName}
                            target="_blank"
                            rel="noreferrer"
                            title="Tải xuống file"
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                          <button
                            onClick={() => handleOpenEdit(doc)}
                            title="Sửa thông tin"
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteDocument(doc.id)}
                            title={isEn ? 'Delete' : 'Xóa'}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
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
      ) : (
        /* ==================== VIEW MODE: GRID VIEW ==================== */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {documents.map((doc) => {
            const attachList = Array.isArray(doc.attachments) && doc.attachments.length > 0
              ? doc.attachments
              : (doc.fileUrl ? [{ url: doc.fileUrl, name: doc.fileName, size: doc.fileSize, type: doc.fileType }] : []);

            return (
              <div
                key={doc.id}
                onClick={() => handleOpenEdit(doc)}
                className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all space-y-2.5 cursor-pointer group flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-blue-600 group-hover:bg-blue-50">
                        {renderFileIcon(doc.fileUrl, doc.fileName)}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 group-hover:text-blue-700 text-xs line-clamp-1">
                          {doc.title}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {doc.fileName} {doc.fileSize ? `(${(doc.fileSize / 1024).toFixed(0)} KB)` : ''}
                        </p>
                      </div>
                    </div>
                    {getTypeBadge(doc.type)}
                  </div>

                  {/* Project & Tag Row */}
                  <div className="flex flex-wrap items-center gap-1 pt-0.5">
                    {doc.projectName && (
                      <span className="px-2 py-0.2 bg-amber-50 text-amber-900 border border-amber-200 rounded font-semibold text-[10px] flex items-center gap-1">
                        <FolderKanban className="w-3 h-3 text-amber-600" />
                        <span className="truncate max-w-[130px]">{doc.projectName}</span>
                      </span>
                    )}
                    {doc.contractNumber && (
                      <span className="px-2 py-0.2 bg-amber-50 text-amber-800 border border-amber-200 rounded font-mono text-[10px]">
                        HĐ: {doc.contractNumber}
                      </span>
                    )}
                    {doc.invoiceNumber && (
                      <span className="px-2 py-0.2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded font-mono text-[10px]">
                        HĐơn: {doc.invoiceNumber}
                      </span>
                    )}
                    {attachList.length > 1 && (
                      <span className="px-1.5 py-0.2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-[10px] font-bold">
                        📎 {attachList.length} tệp
                      </span>
                    )}
                  </div>

                  <div className="text-xs space-y-1 text-slate-600 pt-0.5">
                    {doc.companyName && <p className="line-clamp-1">🏢 <strong>Công ty:</strong> {doc.companyName}</p>}
                    {(doc.vendorName || doc.vendor?.name) && (
                      <p className="line-clamp-1">🤝 <strong>Đối tác:</strong> {doc.vendorName || doc.vendor?.name}</p>
                    )}
                    {doc.asset && (
                      <p className="line-clamp-1 text-blue-700">💻 <strong>Thiết bị:</strong> [{doc.asset.assetTag}] {doc.asset.name}</p>
                    )}
                    {doc.documentDate && <p>📅 <strong>Ngày lập:</strong> {formatDate(doc.documentDate)}</p>}
                    {doc.amount && (
                      <p className="text-amber-700 font-bold font-mono">
                        💵 {formatCurrency(Number(doc.amount))}
                      </p>
                    )}
                  </div>
                </div>

                <div
                  className="flex items-center justify-between pt-2 border-t border-slate-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => {
                      setPreviewDoc(doc);
                      setPreviewAttachmentIndex(0);
                    }}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Xem file ({attachList.length})</span>
                  </button>

                  <div className="flex items-center space-x-1">
                    <a
                      href={doc.fileUrl}
                      download={doc.fileName}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer"
                      title="Tải xuống file"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                    <button
                      onClick={() => handleOpenEdit(doc)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer"
                      title="Sửa"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteDocument(doc.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                      title={isEn ? 'Delete' : 'Xóa'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: ADD NEW DOCUMENT */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Upload className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Tải Lên Hồ Sơ / Hóa Đơn Mới</h3>
                  <p className="text-[11px] text-blue-100">Lưu trữ, gán vào Gói mua sắm/Dự án và liên kết thiết bị (Nhấn ESC để đóng)</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-white/80 hover:text-white p-1.5 rounded-xl hover:bg-white/10 cursor-pointer"
                title="Đóng (ESC)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDocument} className="p-4 overflow-y-auto flex-1 space-y-3.5 text-xs">
              {/* MULTI-FILE UPLOAD ZONE */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700 flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                    <span>Tệp đính kèm (*)</span>
                    {formData.attachments?.length > 0 && (
                      <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2 py-0.2 rounded-full">
                        Đã chọn {formData.attachments.length} tệp
                      </span>
                    )}
                  </label>
                  <span className="text-[10px] text-slate-400">Chọn nhiều tệp cùng lúc (PDF, Ảnh, Docx...)</span>
                </div>

                <div className="border-2 border-dashed border-blue-200 hover:border-blue-500 rounded-2xl p-3.5 text-center cursor-pointer bg-blue-50/20 hover:bg-blue-50/40 relative transition-colors">
                  <input
                    type="file"
                    multiple
                    accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx"
                    onChange={(e) => {
                      if (e.target.files) handleMultipleFileUpload(e.target.files, false);
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {uploadingFile ? (
                    <div className="py-2 text-blue-600 font-semibold flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang tải các tệp lên...</span>
                    </div>
                  ) : (
                    <div className="py-1">
                      <Upload className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                      <p className="font-semibold text-slate-700">Kéo thả nhiều tệp PDF/Ảnh vào đây hoặc bấm để chọn</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Tối đa 25MB mỗi tệp</p>
                    </div>
                  )}
                </div>

                {/* ATTACHMENTS LIST PREVIEW */}
                {formData.attachments?.length > 0 && (
                  <div className="mt-2 space-y-1 max-h-32 overflow-y-auto p-1.5 bg-slate-50 rounded-xl border border-slate-200">
                    {formData.attachments.map((att, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-1.5 bg-white rounded-lg border border-slate-200 text-xs"
                      >
                        <div className="flex items-center space-x-2 truncate flex-1 pr-2">
                          {renderFileIcon(att.url, att.name)}
                          <span className="font-semibold text-slate-800 truncate">{att.name}</span>
                          {att.size && (
                            <span className="text-[10px] text-slate-400 font-mono shrink-0">
                              ({(att.size / 1024).toFixed(0)} KB)
                            </span>
                          )}
                          {idx === 0 && (
                            <span className="text-[9px] bg-blue-50 text-blue-700 border border-blue-200 font-bold px-1.5 py-0.2 rounded shrink-0">
                              Tệp chính
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(idx, false)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                            title="Xóa tệp này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* AI AUTO EXTRACT BANNER */}
              <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border border-purple-200/80 rounded-2xl p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Sparkles className="w-4 h-4 text-amber-300" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-purple-950">AI Tự Động Trích Xuất & Điền Form</h4>
                    <p className="text-[10px] text-purple-700">Đọc số HĐ, hóa đơn, tờ trình, nhà cung cấp, ngày tháng, tổng tiền và liên kết thiết bị tự động</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => aiUploadInputRef.current?.click()}
                  disabled={aiExtracting}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all shrink-0 cursor-pointer disabled:opacity-50"
                >
                  {aiExtracting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-amber-300" />}
                  <span>{aiExtracting ? 'Đang đọc...' : 'Đọc tệp bằng AI'}</span>
                </button>
              </div>

              {/* PROJECT / PURCHASE DOSSIER BUNDLE */}
              <div className="p-3 bg-amber-50/40 border border-amber-200 rounded-2xl space-y-2">
                <ManageableDropdown
                  label="Gói Mua Sắm / Dự Án (Gom nhóm chứng từ liên quan)"
                  placeholder="-- Chọn hoặc tạo mới Gói mua sắm / Dự án --"
                  searchPlaceholder="Tìm kiếm tên dự án..."
                  icon={<FolderKanban className="w-3.5 h-3.5 text-amber-600" />}
                  items={projectDropdownItems}
                  selectedValue={formData.projectName}
                  onSelect={(val) => setFormData((prev) => ({ ...prev, projectName: val }))}
                  onAdd={handleAddProject}
                  onEdit={handleEditProject}
                  onDelete={(id, name) => handleDeleteProject(name)}
                  allowEmpty={true}
                  emptyLabel="-- Không gán vào gói / dự án nào --"
                />
                {formData.projectName && (
                  <div>
                    <label className="block text-[11px] font-bold text-amber-900 mb-1">Mã Dự Án / Mã Gói Thầu (Nếu có)</label>
                    <input
                      type="text"
                      placeholder="VD: DA-2026-IT01"
                      value={formData.projectCode}
                      onChange={(e) => setFormData({ ...formData, projectCode: e.target.value })}
                      className="w-full p-1.5 bg-white border border-amber-300 rounded-xl font-mono text-xs outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                )}
              </div>

              {/* Title & Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tên hồ sơ / Tiêu đề (*)</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Hóa đơn mua Laptop Dell Latitude..."
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-medium outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Loại giấy tờ (*)</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-medium outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="INVOICE">🧾 Hóa đơn (VAT / Điện tử)</option>
                    <option value="CONTRACT">📑 Hợp đồng mua bán / DV</option>
                    <option value="HANDOVER">📝 Biên bản bàn giao / nghiệm thu</option>
                    <option value="WARRANTY">🛡️ Phiếu / Thẻ bảo hành</option>
                    <option value="QUOTATION">📊 Báo giá / Dự toán</option>
                    <option value="PROPOSAL">📋 Tờ trình & Đề xuất mua sắm</option>
                    <option value="OTHER">📎 Giấy tờ khác</option>
                  </select>
                </div>
              </div>

              {/* Contract No & Invoice No */}
              <div className="grid grid-cols-2 gap-3 p-2.5 bg-slate-50 border border-slate-200 rounded-2xl">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Số Hợp Đồng (Contract No.)</label>
                  <input
                    type="text"
                    placeholder="VD: HĐ-2026/08/IT-DELL"
                    value={formData.contractNumber}
                    onChange={(e) => setFormData({ ...formData, contractNumber: e.target.value })}
                    className="w-full p-1.5 bg-white border border-slate-300 rounded-xl font-mono outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Số Hóa Đơn (Invoice No.)</label>
                  <input
                    type="text"
                    placeholder="VD: HD-0089421"
                    value={formData.invoiceNumber}
                    onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                    className="w-full p-1.5 bg-white border border-slate-300 rounded-xl font-mono outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Company & Vendor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ManageableDropdown
                  label="Công ty quản lý (*)"
                  placeholder="-- Chọn công ty --"
                  icon={<Building2 className="w-3.5 h-3.5 text-indigo-600" />}
                  items={companyDropdownItems}
                  selectedValue={formData.companyName}
                  onSelect={(val) => setFormData((prev) => ({ ...prev, companyName: val }))}
                  onAdd={handleAddCompany}
                  onEdit={handleEditCompany}
                  onDelete={(id, name) => handleDeleteCompany(name)}
                  allowEmpty={true}
                  emptyLabel="-- Chưa phân công ty --"
                />

                <ManageableDropdown
                  label="Nhà cung cấp / Đối tác"
                  placeholder="-- Chọn nhà cung cấp --"
                  icon={<Handshake className="w-3.5 h-3.5 text-emerald-600" />}
                  items={vendorDropdownItems}
                  selectedValue={formData.vendorId}
                  onSelect={(val) => {
                    const matched = vendors.find((v) => v.id === val);
                    setFormData((prev) => ({ ...prev, vendorId: val, vendorName: matched ? matched.name : '' }));
                  }}
                  onAdd={handleAddVendor}
                  onEdit={handleEditVendor}
                  onDelete={handleDeleteVendor}
                  allowEmpty={true}
                  emptyLabel="-- Chưa chọn nhà cung cấp --"
                />
              </div>

              {/* Date & Amount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ngày lập / Ngày ký</label>
                  <input
                    type="date"
                    value={formData.documentDate}
                    onChange={(e) => setFormData({ ...formData, documentDate: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <CurrencyInput
                    label="Tổng tiền thanh toán (VNĐ)"
                    placeholder="VD: 25.000.000"
                    value={formData.amount}
                    onChange={(val) => setFormData((prev) => ({ ...prev, amount: val }))}
                  />
                </div>
              </div>

              {/* Linked Asset, License & IT Service */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <ManageableDropdown
                  label="Liên kết với Thiết bị / Tài sản"
                  placeholder="-- Chọn thiết bị liên kết --"
                  searchPlaceholder="Tìm theo tên máy, mã tag, Serial..."
                  icon={<Laptop className="w-3.5 h-3.5 text-blue-600" />}
                  items={assetDropdownItems}
                  selectedValue={formData.assetId}
                  onSelect={(val) => setFormData((prev) => ({ ...prev, assetId: val }))}
                  allowEmpty={true}
                  emptyLabel="-- Không liên kết thiết bị --"
                />

                <ManageableDropdown
                  label="Liên kết với License Bản quyền"
                  placeholder="-- Chọn License liên kết --"
                  searchPlaceholder="Tìm theo tên phần mềm, License key..."
                  icon={<Key className="w-3.5 h-3.5 text-purple-600" />}
                  items={licenseDropdownItems}
                  selectedValue={formData.licenseId}
                  onSelect={(val) => setFormData((prev) => ({ ...prev, licenseId: val }))}
                  allowEmpty={true}
                  emptyLabel="-- Không liên kết License --"
                />

                <ManageableDropdown
                  label="Liên kết với Dịch vụ IT / Thuê bao"
                  placeholder="-- Chọn Dịch vụ IT liên kết --"
                  searchPlaceholder="Tìm theo tên dịch vụ, mã gói..."
                  icon={<Globe className="w-3.5 h-3.5 text-emerald-600" />}
                  items={serviceDropdownItems}
                  selectedValue={formData.serviceId}
                  onSelect={(val) => setFormData((prev) => ({ ...prev, serviceId: val }))}
                  allowEmpty={true}
                  emptyLabel="-- Không liên kết Dịch vụ IT --"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Ghi chú thêm</label>
                <textarea
                  rows={2}
                  placeholder="Trích yếu hợp đồng, điều khoản bảo hành..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-300 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy (ESC)
                </button>
                <button
                  type="submit"
                  disabled={uploadingFile}
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs cursor-pointer"
                >
                  Lưu Hồ Sơ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT DOCUMENT */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Edit className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Cập nhật Hồ sơ / Hợp đồng</h3>
                  <p className="text-[11px] text-blue-100">Sửa đổi thông tin số HĐ, hóa đơn, dự án và thêm tệp đính kèm (Nhấn ESC để đóng)</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-white/80 hover:text-white p-1.5 rounded-xl hover:bg-white/10 cursor-pointer"
                title="Đóng (ESC)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateDocument} className="p-4 overflow-y-auto flex-1 space-y-3.5 text-xs">
              {/* MULTI-FILE UPLOAD ZONE IN EDIT */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700 flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                    <span>Tệp đính kèm</span>
                    {editFormData.attachments?.length > 0 && (
                      <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2 py-0.2 rounded-full">
                        {editFormData.attachments.length} tệp
                      </span>
                    )}
                  </label>
                  <span className="text-[10px] text-slate-400">Chọn thêm file bổ sung</span>
                </div>

                <div className="border-2 border-dashed border-blue-200 hover:border-blue-500 rounded-2xl p-3 text-center cursor-pointer bg-blue-50/20 hover:bg-blue-50/40 relative transition-colors">
                  <input
                    type="file"
                    multiple
                    accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx"
                    onChange={(e) => {
                      if (e.target.files) handleMultipleFileUpload(e.target.files, true);
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {uploadingFile ? (
                    <div className="py-1 text-blue-600 font-semibold flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang tải tệp lên...</span>
                    </div>
                  ) : (
                    <div className="py-1 flex items-center justify-center gap-2 text-blue-700 font-semibold">
                      <Upload className="w-4 h-4" />
                      <span>Kéo thả thêm tệp hoặc nhấp để chọn tệp bổ sung</span>
                    </div>
                  )}
                </div>

                {/* ATTACHMENTS LIST IN EDIT */}
                {editFormData.attachments?.length > 0 && (
                  <div className="mt-2 space-y-1 max-h-32 overflow-y-auto p-1.5 bg-slate-50 rounded-xl border border-slate-200">
                    {editFormData.attachments.map((att, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-1.5 bg-white rounded-lg border border-slate-200 text-xs"
                      >
                        <div className="flex items-center space-x-2 truncate flex-1 pr-2">
                          {renderFileIcon(att.url, att.name)}
                          <span className="font-semibold text-slate-800 truncate">{att.name}</span>
                          {att.size && (
                            <span className="text-[10px] text-slate-400 font-mono shrink-0">
                              ({(att.size / 1024).toFixed(0)} KB)
                            </span>
                          )}
                          {idx === 0 && (
                            <span className="text-[9px] bg-blue-50 text-blue-700 border border-blue-200 font-bold px-1.5 py-0.2 rounded shrink-0">
                              Tệp chính
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-1 shrink-0">
                          <a
                            href={att.url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Xem tệp"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(idx, true)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                            title="Xóa tệp"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* PROJECT / PURCHASE DOSSIER BUNDLE IN EDIT */}
              <div className="p-3 bg-amber-50/40 border border-amber-200 rounded-2xl space-y-2">
                <ManageableDropdown
                  label="Gói Mua Sắm / Dự Án (Gom nhóm chứng từ liên quan)"
                  placeholder="-- Chọn hoặc tạo mới Gói mua sắm / Dự án --"
                  searchPlaceholder="Tìm kiếm tên dự án..."
                  icon={<FolderKanban className="w-3.5 h-3.5 text-amber-600" />}
                  items={projectDropdownItems}
                  selectedValue={editFormData.projectName}
                  onSelect={(val) => setEditFormData((prev) => ({ ...prev, projectName: val }))}
                  onAdd={handleAddProject}
                  onEdit={handleEditProject}
                  onDelete={(id, name) => handleDeleteProject(name)}
                  allowEmpty={true}
                  emptyLabel="-- Không gán vào gói / dự án nào --"
                />
                {editFormData.projectName && (
                  <div>
                    <label className="block text-[11px] font-bold text-amber-900 mb-1">Mã Dự Án / Mã Gói Thầu (Nếu có)</label>
                    <input
                      type="text"
                      placeholder="VD: DA-2026-IT01"
                      value={editFormData.projectCode}
                      onChange={(e) => setEditFormData({ ...editFormData, projectCode: e.target.value })}
                      className="w-full p-1.5 bg-white border border-amber-300 rounded-xl font-mono text-xs outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                )}
              </div>

              {/* Title & Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tên hồ sơ / Tiêu đề (*)</label>
                  <input
                    type="text"
                    required
                    value={editFormData.title}
                    onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-medium outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Loại giấy tờ (*)</label>
                  <select
                    value={editFormData.type}
                    onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value as any })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-medium outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="INVOICE">🧾 Hóa đơn (VAT / Điện tử)</option>
                    <option value="CONTRACT">📑 Hợp đồng mua bán / DV</option>
                    <option value="HANDOVER">📝 Biên bản bàn giao / nghiệm thu</option>
                    <option value="WARRANTY">🛡️ Phiếu / Thẻ bảo hành</option>
                    <option value="QUOTATION">📊 Báo giá / Dự toán</option>
                    <option value="PROPOSAL">📋 Tờ trình & Đề xuất mua sắm</option>
                    <option value="OTHER">📎 Giấy tờ khác</option>
                  </select>
                </div>
              </div>

              {/* Contract No & Invoice No */}
              <div className="grid grid-cols-2 gap-3 p-2.5 bg-slate-50 border border-slate-200 rounded-2xl">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Số Hợp Đồng (Contract No.)</label>
                  <input
                    type="text"
                    value={editFormData.contractNumber}
                    onChange={(e) => setEditFormData({ ...editFormData, contractNumber: e.target.value })}
                    className="w-full p-1.5 bg-white border border-slate-300 rounded-xl font-mono outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Số Hóa Đơn (Invoice No.)</label>
                  <input
                    type="text"
                    value={editFormData.invoiceNumber}
                    onChange={(e) => setEditFormData({ ...editFormData, invoiceNumber: e.target.value })}
                    className="w-full p-1.5 bg-white border border-slate-300 rounded-xl font-mono outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Company & Vendor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ManageableDropdown
                  label="Công ty quản lý"
                  placeholder="-- Chọn công ty --"
                  icon={<Building2 className="w-3.5 h-3.5 text-indigo-600" />}
                  items={companyDropdownItems}
                  selectedValue={editFormData.companyName}
                  onSelect={(val) => setEditFormData((prev) => ({ ...prev, companyName: val }))}
                  onAdd={handleAddCompany}
                  onEdit={handleEditCompany}
                  onDelete={(id, name) => handleDeleteCompany(name)}
                  allowEmpty={true}
                  emptyLabel="-- Chưa phân công ty --"
                />

                <ManageableDropdown
                  label="Nhà cung cấp / Đối tác"
                  placeholder="-- Chọn nhà cung cấp --"
                  icon={<Handshake className="w-3.5 h-3.5 text-emerald-600" />}
                  items={vendorDropdownItems}
                  selectedValue={editFormData.vendorId}
                  onSelect={(val) => {
                    const matched = vendors.find((v) => v.id === val);
                    setEditFormData((prev) => ({ ...prev, vendorId: val, vendorName: matched ? matched.name : '' }));
                  }}
                  onAdd={handleAddVendor}
                  onEdit={handleEditVendor}
                  onDelete={handleDeleteVendor}
                  allowEmpty={true}
                  emptyLabel="-- Chưa chọn nhà cung cấp --"
                />
              </div>

              {/* Date & Amount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ngày lập / Ngày ký</label>
                  <input
                    type="date"
                    value={editFormData.documentDate}
                    onChange={(e) => setEditFormData({ ...editFormData, documentDate: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <CurrencyInput
                    label="Tổng tiền thanh toán (VNĐ)"
                    placeholder="VD: 25.000.000"
                    value={editFormData.amount}
                    onChange={(val) => setEditFormData((prev) => ({ ...prev, amount: val }))}
                  />
                </div>
              </div>

              {/* Linked Asset, License & IT Service - MULTI */}
              <div className="space-y-3">
                {/* Assets Multi */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5 text-xs flex items-center gap-1.5">
                    <Laptop className="w-3.5 h-3.5 text-blue-600" />
                    Liên kết Thiết bị / Tài sản
                    <span className="text-slate-400 font-normal">(có thể chọn nhiều)</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2 min-h-[24px]">
                    {(editFormData.assetIds || []).map((id) => {
                      const a = assets.find((x: any) => x.id === id);
                      return a ? (
                        <span key={id} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-900 border border-blue-300 rounded-lg text-[11px] font-bold">
                          <Laptop className="w-3 h-3 shrink-0" />
                          [{a.assetTag}] {a.name?.slice(0, 28)}{(a.name?.length || 0) > 28 ? '…' : ''}
                          <button type="button" onClick={() => setEditFormData(prev => { const next = (prev.assetIds || []).filter((x: string) => x !== id); return { ...prev, assetIds: next, assetId: next[0] || '' }; })} className="ml-0.5 text-blue-500 hover:text-red-600 cursor-pointer font-normal">✕</button>
                        </span>
                      ) : null;
                    })}
                  </div>
                  <ManageableDropdown
                    label=""
                    placeholder="-- Chọn thiết bị để thêm --"
                    searchPlaceholder="Tìm theo tên máy, mã tag, Serial..."
                    icon={<Laptop className="w-3.5 h-3.5 text-blue-600" />}
                    items={assetDropdownItems.filter((a: any) => !(editFormData.assetIds || []).includes(a.id))}
                    selectedValue=""
                    onSelect={(val) => { if (val) setEditFormData(prev => ({ ...prev, assetIds: [...(prev.assetIds || []), val], assetId: prev.assetId || val })); }}
                    allowEmpty={true}
                    emptyLabel="-- Không thêm thiết bị --"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Licenses Multi */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5 text-xs flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-purple-600" />
                      License Bản quyền
                      <span className="text-slate-400 font-normal">(nhiều)</span>
                    </label>
                    <div className="flex flex-wrap gap-1.5 mb-2 min-h-[20px]">
                      {(editFormData.licenseIds || []).map((id) => {
                        const l = licenses.find((x: any) => x.id === id);
                        return l ? (
                          <span key={id} className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-900 border border-purple-300 rounded-lg text-[11px] font-bold">
                            <Key className="w-3 h-3 shrink-0" />
                            {l.name?.slice(0, 22)}{(l.name?.length || 0) > 22 ? '…' : ''}
                            <button type="button" onClick={() => setEditFormData(prev => { const next = (prev.licenseIds || []).filter((x: string) => x !== id); return { ...prev, licenseIds: next, licenseId: next[0] || '' }; })} className="ml-0.5 text-purple-500 hover:text-red-600 cursor-pointer font-normal">✕</button>
                          </span>
                        ) : null;
                      })}
                    </div>
                    <ManageableDropdown
                      label=""
                      placeholder="-- Chọn License --"
                      searchPlaceholder="Tìm theo tên phần mềm, key..."
                      icon={<Key className="w-3.5 h-3.5 text-purple-600" />}
                      items={licenseDropdownItems.filter((l: any) => !(editFormData.licenseIds || []).includes(l.id))}
                      selectedValue=""
                      onSelect={(val) => { if (val) setEditFormData(prev => ({ ...prev, licenseIds: [...(prev.licenseIds || []), val], licenseId: prev.licenseId || val })); }}
                      allowEmpty={true}
                      emptyLabel="-- Không thêm License --"
                    />
                  </div>

                  {/* Services Multi */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5 text-xs flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-emerald-600" />
                      Dịch vụ IT / Thuê bao
                      <span className="text-slate-400 font-normal">(nhiều)</span>
                    </label>
                    <div className="flex flex-wrap gap-1.5 mb-2 min-h-[20px]">
                      {(editFormData.serviceIds || []).map((id) => {
                        const s = services.find((x: any) => x.id === id);
                        return s ? (
                          <span key={id} className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg text-[11px] font-bold">
                            <Globe className="w-3 h-3 shrink-0" />
                            {s.name?.slice(0, 22)}{(s.name?.length || 0) > 22 ? '…' : ''}
                            <button type="button" onClick={() => setEditFormData(prev => { const next = (prev.serviceIds || []).filter((x: string) => x !== id); return { ...prev, serviceIds: next, serviceId: next[0] || '' }; })} className="ml-0.5 text-emerald-600 hover:text-red-600 cursor-pointer font-normal">✕</button>
                          </span>
                        ) : null;
                      })}
                    </div>
                    <ManageableDropdown
                      label=""
                      placeholder="-- Chọn Dịch vụ IT --"
                      searchPlaceholder="Tìm theo tên dịch vụ, mã gói..."
                      icon={<Globe className="w-3.5 h-3.5 text-emerald-600" />}
                      items={serviceDropdownItems.filter((s: any) => !(editFormData.serviceIds || []).includes(s.id))}
                      selectedValue=""
                      onSelect={(val) => { if (val) setEditFormData(prev => ({ ...prev, serviceIds: [...(prev.serviceIds || []), val], serviceId: prev.serviceId || val })); }}
                      allowEmpty={true}
                      emptyLabel="-- Không thêm Dịch vụ --"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">{isEn ? 'Notes' : 'Ghi chú'}</label>
                <textarea
                  rows={2}
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-300 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy (ESC)
                </button>
                <button
                  type="submit"
                  disabled={uploadingFile}
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs cursor-pointer"
                >
                  Lưu Thay Đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PREVIEW FILE WITH MULTI-ATTACHMENT TABS */}
      {previewDoc && (() => {
        const previewAttachments: DocumentAttachment[] = Array.isArray(previewDoc.attachments) && previewDoc.attachments.length > 0
          ? previewDoc.attachments
          : [{ url: previewDoc.fileUrl, name: previewDoc.fileName, size: previewDoc.fileSize, type: previewDoc.fileType }];

        const currentActiveFile = previewAttachments[previewAttachmentIndex] || previewAttachments[0];

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-2xl max-w-6xl w-full overflow-hidden border border-slate-200 flex flex-col h-[92vh]">
              {/* Header */}
              <div className="bg-slate-900 p-4 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-2.5 truncate flex-1 pr-2">
                  <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="truncate">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm truncate">{previewDoc.title}</h3>
                      {previewDoc.projectName && (
                        <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-[10px] font-bold">
                          📁 {previewDoc.projectName}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono truncate">
                      {currentActiveFile?.name} {currentActiveFile?.size ? `(${(currentActiveFile.size / 1024).toFixed(0)} KB)` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <a
                    href={currentActiveFile?.url || previewDoc.fileUrl}
                    download={currentActiveFile?.name || previewDoc.fileName}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải tệp này</span>
                  </a>
                  <button
                    onClick={() => setPreviewDoc(null)}
                    className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 cursor-pointer"
                    title="Đóng (ESC)"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Multi-attachment Tabs Bar */}
              {previewAttachments.length > 1 && (
                <div className="bg-slate-800 px-4 py-2 flex items-center gap-1.5 overflow-x-auto border-t border-slate-700/60 scrollbar-none">
                  <span className="text-[11px] font-bold text-slate-400 shrink-0 mr-1 flex items-center gap-1">
                    <Paperclip className="w-3 h-3 text-indigo-400" />
                    <span>Danh sách tệp ({previewAttachments.length}):</span>
                  </span>
                  {previewAttachments.map((att, idx) => (
                    <button
                      key={idx}
                      onClick={() => setPreviewAttachmentIndex(idx)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                        previewAttachmentIndex === idx
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'bg-slate-700/70 text-slate-300 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      {renderFileIcon(att.url, att.name)}
                      <span className="max-w-[140px] truncate">{att.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Preview Body */}
              <div className="flex-1 bg-slate-100 p-2 overflow-hidden flex items-center justify-center">
                {currentActiveFile && isPdf(currentActiveFile.url, currentActiveFile.name) ? (
                  <iframe
                    src={currentActiveFile.url}
                    className="w-full h-full rounded-xl border border-slate-300 shadow-inner"
                    title={currentActiveFile.name}
                  />
                ) : currentActiveFile && isImage(currentActiveFile.url, currentActiveFile.name) ? (
                  <div className="max-h-full max-w-full overflow-auto p-4 flex items-center justify-center">
                    <img
                      src={currentActiveFile.url}
                      alt={currentActiveFile.name}
                      className="max-h-[72vh] max-w-full rounded-xl object-contain shadow-lg"
                    />
                  </div>
                ) : (
                  <div className="w-full h-full">
                    <OfficeDocumentViewer
                      url={currentActiveFile.url}
                      fileName={currentActiveFile.name}
                      className="w-full h-full"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    
      {/* ==================== MODAL: TẠO GÓI MUA SẮM / DỰ ÁN MỚI ==================== */}
      {isAddProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-3 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 p-4 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                  <FolderKanban className="w-5 h-5 text-amber-200" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Thêm Mới Gói Mua Sắm / Dự Án</h3>
                  <p className="text-[11px] text-amber-100">Gom nhóm toàn bộ hợp đồng, hóa đơn và biên bản liên quan</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddProjectModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateProjectSubmit} className="p-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên Gói Mua Sắm / Dự Án (*)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Dự án trang bị Laptop Dev 2026, Nâng cấp hạ tầng mạng Q3..."
                  value={newProjectForm.name}
                  onChange={(e) => setNewProjectForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-amber-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mã Gói Thầu / Mã Dự Án (Tùy chọn)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: DA-2026-IT01, GTH-NET-02..."
                  value={newProjectForm.code}
                  onChange={(e) => setNewProjectForm((prev) => ({ ...prev, code: e.target.value }))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono outline-none focus:bg-white focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ManageableDropdown
                  label="Đơn vị / Công ty quản lý"
                  placeholder="-- Chọn công ty --"
                  items={companyDropdownItems}
                  selectedValue={newProjectForm.companyName}
                  onSelect={(val) => setNewProjectForm((prev) => ({ ...prev, companyName: val }))}
                  onAdd={handleAddCompany}
                  onEdit={handleEditCompany}
                  onDelete={handleDeleteCompany}
                  icon={<Building2 className="w-3.5 h-3.5 text-indigo-600" />}
                  themeColor="indigo"
                />

                <ManageableDropdown
                  label="Nhà cung cấp / Đối tác chính"
                  placeholder="-- Chọn nhà cung cấp --"
                  items={vendorDropdownItems}
                  selectedValue={newProjectForm.vendorId}
                  onSelect={(val) => setNewProjectForm((prev) => ({ ...prev, vendorId: val }))}
                  onAdd={handleAddVendor}
                  onEdit={handleEditVendor}
                  onDelete={handleDeleteVendor}
                  icon={<Handshake className="w-3.5 h-3.5 text-emerald-600" />}
                  themeColor="blue"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mô tả / Ghi chú mục tiêu gói mua sắm
                </label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú về tiến độ, mục đích sử dụng hoặc các điều khoản đặc biệt..."
                  value={newProjectForm.description}
                  onChange={(e) => setNewProjectForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddProjectModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold cursor-pointer"
                >{isEn ? 'Cancel' : 'Hủy'}</button>
                <button
                  type="submit"
                  disabled={savingProject}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {savingProject ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FolderKanban className="w-3.5 h-3.5" />}
                  <span>{savingProject ? 'Đang tạo...' : 'Tạo Gói Mua Sắm'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
</div>
  );
}
