'use client';

import { useLanguage } from '@/lib/i18n/context';

import { useState, useEffect, useRef } from 'react';
import {
  X,
  Printer,
  FileText,
  Save,
  RotateCcw,
  Sliders,
  CheckCircle2,
  Building,
  User,
  Shield,
  Calendar,
  Check,
  Edit3,
  Copy,
  Download,
  FileDown,
  Upload,
  Sparkles,
  HelpCircle,
  Code,
  Eye,
  FileCode,
} from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';

interface AssetHandoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: any;
  initialMode?: 'HANDOVER' | 'RETURN';
  previousUser?: any;
}

interface HandoverTemplateConfig {
  companyName: string;
  companySubTitle: string;
  nationalHeaderEnabled: boolean;
  docTitle: string;
  departmentName: string;
  giverRoleDefault: string;
  terms: string[];
  accessoriesDefault: string[];
  signCount: 2 | 3;
  signTitles: {
    giver: string;
    receiver: string;
    approver?: string;
  };
  notesDefault: string;
  customHtmlTemplate?: string;
  useCustomTemplate?: boolean;
}

const MERGE_TAGS = [
  { tag: '{{TEN_CONG_TY}}', desc: 'Tên Công ty / Đơn vị ban hành' },
  { tag: '{{PHONG_BAN_IT}}', desc: 'Tên Ban / Phòng Công Nghệ Thông Tin' },
  { tag: '{{SO_BIEN_BAN}}', desc: 'Số biên bản bàn giao (VD: BBBG-202608/IT-001)' },
  { tag: '{{NGAY_BAN_GIAO}}', desc: 'Ngày tháng năm bàn giao (VD: Ngày 22 tháng 08 năm 2026)' },
  { tag: '{{DIA_DIEM}}', desc: 'Địa điểm bàn giao (VD: Văn phòng Công ty)' },
  { tag: '{{NGUOI_GIAO}}', desc: 'Họ tên người bàn giao IT (Bên A)' },
  { tag: '{{CHUC_VU_GIAO}}', desc: 'Chức vụ người bàn giao' },
  { tag: '{{BO_PHAN_GIAO}}', desc: 'Bộ phận / Phòng ban bên giao' },
  { tag: '{{NGUOI_NHAN}}', desc: 'Họ tên nhân viên tiếp nhận (Bên B)' },
  { tag: '{{CHUC_VU_NHAN}}', desc: 'Chức danh / Vị trí người nhận' },
  { tag: '{{BO_PHAN_NHAN}}', desc: 'Phòng ban của người nhận' },
  { tag: '{{EMAIL_NHAN}}', desc: 'Email công vụ người nhận' },
  { tag: '{{TEN_THIET_BI}}', desc: 'Tên thiết bị / Chủng loại máy' },
  { tag: '{{MODEL}}', desc: 'Thương hiệu / Model thiết bị' },
  { tag: '{{MA_TAI_SAN}}', desc: 'Mã tài sản (Asset Tag)' },
  { tag: '{{SO_SERIAL}}', desc: 'Số Serial máy (S/N)' },
  { tag: '{{CAU_HINH}}', desc: 'Thông số cấu hình (CPU, RAM, Ổ cứng, Màn hình...)' },
  { tag: '{{TINH_TRANG}}', desc: 'Tình trạng máy khi bàn giao' },
  { tag: '{{PHU_KIEN}}', desc: 'Danh sách phụ kiện đi kèm' },
  { tag: '{{DIEU_KHOAN}}', desc: 'Quy định trách nhiệm & cam kết sử dụng' },
  { tag: '{{GHI_CHU_KET}}', desc: 'Ghi chú kết thúc biên bản' },
];


const RETURN_TERMS = [
  'Bên hoàn trả (Người sử dụng) đã bàn giao lại đầy đủ thiết bị và các phụ kiện đi kèm theo danh mục trên.'.normalize('NFC'),
  'Bộ phận CNTT đã kiểm tra tình trạng thực tế: Máy hoạt động bình thường, tem niêm phong nguyên vẹn, không biến dạng vật lý.'.normalize('NFC'),
  'Dữ liệu công việc của Công ty đã được sao lưu/bàn giao đầy đủ; các tài khoản cá nhân đã được đăng xuất an toàn khỏi máy.'.normalize('NFC'),
  'Kể từ ngày ký biên bản này, Bên hoàn trả chính thức hoàn tất nghĩa vụ quản lý và sử dụng đối với thiết bị này.'.normalize('NFC'),
];

const RETURN_SIGN_TITLES = {
  giver: 'NGƯỜI HOÀN TRẢ (BÊN A)\n(Ký và ghi rõ họ tên)'.normalize('NFC'),
  receiver: 'ĐẠI DIỆN TIẾP NHẬN CNTT (BÊN B)\n(Ký và ghi rõ họ tên)'.normalize('NFC'),
  approver: 'QUẢN LÝ PHÒNG BAN DUYỆT\n(Ký và ghi rõ họ tên)'.normalize('NFC'),
};

const DEFAULT_TEMPLATE: HandoverTemplateConfig = {
  companyName: 'TẬP ĐOÀN DOANH NGHIỆP'.normalize('NFC'),
  companySubTitle: 'BAN CÔNG NGHỆ THÔNG TIN & CHUYỂN ĐỔI SỐ'.normalize('NFC'),
  nationalHeaderEnabled: true,
  docTitle: 'BIÊN BẢN BÀN GIAO THIẾT BỊ CÔNG NGHỆ THÔNG TIN'.normalize('NFC'),
  departmentName: 'Phòng IT / CNTT'.normalize('NFC'),
  giverRoleDefault: 'Chuyên viên Quản trị Hệ thống CNTT'.normalize('NFC'),
  terms: [
    'Bên nhận có trách nhiệm bảo quản, sử dụng thiết bị đúng mục đích công việc của Công ty.'.normalize('NFC'),
    'Không tự ý tháo mở tem niêm phong, thay đổi linh kiện phần cứng hoặc cài đặt phần mềm không có bản quyền/trái quy định.'.normalize('NFC'),
    'Khi phát sinh sự cố kỹ thuật hoặc hỏng hóc, phải thông báo ngay cho Bộ phận CNTT để được hỗ trợ kiểm tra và bảo hành.'.normalize('NFC'),
    'Khi chuyển đổi công việc hoặc chấm dứt hợp đồng lao động, Bên nhận có trách nhiệm hoàn trả đầy đủ thiết bị và các phụ kiện đi kèm cho Bộ phận CNTT.'.normalize('NFC'),
  ],
  accessoriesDefault: [
    'Củ sạc / Adapter nguồn chính hãng'.normalize('NFC'),
    'Chuột máy tính'.normalize('NFC'),
    'Túi chống sốc / Balo laptop'.normalize('NFC'),
  ],
  signCount: 2,
  signTitles: {
    giver: 'NGƯỜI BÀN GIAO (BÊN A)\n(Ký và ghi rõ họ tên)'.normalize('NFC'),
    receiver: 'NGƯỜI NHẬN THIẾT BỊ (BÊN B)\n(Ký và ghi rõ họ tên)'.normalize('NFC'),
    approver: 'ĐẠI DIỆN LÃNH ĐẠO / TRƯỞNG BỘ PHẬN\n(Ký và ghi rõ họ tên)'.normalize('NFC'),
  },
  notesDefault: 'Biên bản được lập thành 02 bản có giá trị pháp lý như nhau, mỗi bên giữ 01 bản để theo dõi và thực hiện.'.normalize('NFC'),
  useCustomTemplate: false,
};

export default function AssetHandoverModal({ isOpen, onClose, asset, initialMode = 'HANDOVER', previousUser }: AssetHandoverModalProps) {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const [docMode, setDocMode] = useState<'HANDOVER' | 'RETURN'>(initialMode);

  useEffect(() => {
    if (initialMode) setDocMode(initialMode);
  }, [initialMode]);
  const [template, setTemplate] = useState<HandoverTemplateConfig>(DEFAULT_TEMPLATE);
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [templateTab, setTemplateTab] = useState<'STANDARD' | 'UPLOAD_WORD'>('STANDARD');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  // Form states for current print document
  const [docNumber, setDocNumber] = useState('');
  const [handoverDate, setHandoverDate] = useState('');
  const [locationName, setLocationName] = useState('');
  
  // Giver info (Party A)
  const [giverName, setGiverName] = useState('');
  const [giverTitle, setGiverTitle] = useState('');
  const [giverDept, setGiverDept] = useState('');
  const [giverPhone, setGiverPhone] = useState('');

  // Receiver info (Party B)
  const [receiverName, setReceiverName] = useState('');
  const [receiverTitle, setReceiverTitle] = useState('');
  const [receiverDept, setReceiverDept] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [receiverEmail, setReceiverEmail] = useState('');

  // Asset specs & condition
  const [assetName, setAssetName] = useState('');
  const [brandModel, setBrandModel] = useState('');
  const [assetTag, setAssetTag] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [specsSummary, setSpecsSummary] = useState('');
  const [conditionText, setConditionText] = useState('Đang hoạt động tốt, ngoại hình đẹp, đầy đủ chức năng'.normalize('NFC'));
  const [selectedAccessories, setSelectedAccessories] = useState<string[]>([]);
  const [customAccessoryInput, setCustomAccessoryInput] = useState('');
  const [termsList, setTermsList] = useState<string[]>([]);
  const [customNotes, setCustomNotes] = useState('');

  // Custom Word / HTML Template state
  const [customWordTemplate, setCustomWordTemplate] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Load persistent template from server
  useEffect(() => {
    const loadTemplate = async () => {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        const settingsList = Array.isArray(data) ? data : data.data || [];
        
        const tSetting = settingsList.find((s: any) => s.key === 'handover.template');
        const compSetting = settingsList.find((s: any) => s.key === 'app.company_name');
        
        let loaded = DEFAULT_TEMPLATE;
        if (tSetting && tSetting.value) {
          try {
            loaded = { ...DEFAULT_TEMPLATE, ...JSON.parse(tSetting.value) };
          } catch {}
        } else if (compSetting && compSetting.value) {
          loaded = { ...DEFAULT_TEMPLATE, companyName: compSetting.value.toUpperCase().normalize('NFC') };
        }
        setTemplate(loaded);
        setTermsList(loaded.terms || DEFAULT_TEMPLATE.terms);
        setSelectedAccessories(loaded.accessoriesDefault || DEFAULT_TEMPLATE.accessoriesDefault);
        setCustomNotes(loaded.notesDefault || DEFAULT_TEMPLATE.notesDefault);
        setCustomWordTemplate(loaded.customHtmlTemplate || '');
      } catch {
        setTemplate(DEFAULT_TEMPLATE);
        setTermsList(DEFAULT_TEMPLATE.terms);
        setSelectedAccessories(DEFAULT_TEMPLATE.accessoriesDefault);
        setCustomNotes(DEFAULT_TEMPLATE.notesDefault);
      }
    };
    if (isOpen) {
      loadTemplate();
    }
  }, [isOpen]);

  // 2. Populate asset details when modal opens
  useEffect(() => {
    if (!asset || !isOpen) return;

    const now = new Date();
    const dateStr = `Ngày ${now.getDate().toString().padStart(2, '0')} tháng ${(now.getMonth() + 1).toString().padStart(2, '0')} năm ${now.getFullYear()}`.normalize('NFC');
    setHandoverDate(dateStr);

    const isReturn = docMode === 'RETURN';
    const prefix = isReturn ? 'BBTH' : 'BBBG';
    const docNum = `${prefix}-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}/${asset.assetTag || 'IT'}`;
    setDocNumber(docNum);

    setAssetName((asset.name || '').normalize('NFC'));
    const bm = [asset.brand, asset.model].filter(Boolean).join(' - ') || asset.model || asset.brand || '';
    setBrandModel(bm.normalize('NFC'));
    setAssetTag(asset.assetTag || '');
    setSerialNumber(asset.serialNumber || 'N/A');

    // Parse specs nicely
    let specs = '';
    if (typeof asset.specs === 'object' && asset.specs !== null) {
      const parts = [];
      if (asset.specs.cpu) parts.push(`CPU: ${asset.specs.cpu}`);
      if (asset.specs.ram) parts.push(`RAM: ${asset.specs.ram}`);
      if (asset.specs.storage || asset.specs.ssd) parts.push(`Ổ cứng: ${asset.specs.storage || asset.specs.ssd}`);
      if (asset.specs.screen || asset.specs.display) parts.push(`Màn hình: ${asset.specs.screen || asset.specs.display}`);
      if (asset.specs.os) parts.push(`HĐH: ${asset.specs.os}`);
      specs = parts.length > 0 ? parts.join(' | ') : JSON.stringify(asset.specs);
    } else if (typeof asset.specs === 'string') {
      specs = asset.specs;
    }
    setSpecsSummary(specs.normalize('NFC') || 'Cấu hình tiêu chuẩn theo phiếu xuất kho'.normalize('NFC'));

    // Target user (Handover target or Returning employee)
    const targetUser = previousUser || asset.assignments?.find((a: any) => !a.returnedAt)?.user || asset.assignments?.[0]?.user || asset.assignedTo;

    if (targetUser) {
      setReceiverName((targetUser.fullName || targetUser.name || '').normalize('NFC'));
      setReceiverEmail(targetUser.email || '');
      setReceiverDept((targetUser.department || 'Phòng ban người dùng').normalize('NFC'));
      setReceiverTitle((targetUser.position || 'Nhân viên').normalize('NFC'));
      setReceiverPhone(targetUser.phone || '');
    } else {
      setReceiverName('');
      setReceiverDept('');
      setReceiverTitle('');
      setReceiverPhone('');
      setReceiverEmail('');
    }

    setGiverName('Quản trị viên IT'.normalize('NFC'));
    setGiverTitle((template.giverRoleDefault || 'Kỹ thuật viên CNTT').normalize('NFC'));
    setGiverDept((template.departmentName || 'Ban Công Nghệ Thông Tin').normalize('NFC'));
    setLocationName((asset.location?.name || 'Văn phòng Công ty').normalize('NFC'));
  }, [asset, isOpen, template, docMode, previousUser]);

  // Handle uploading custom word / text template file
  const handleUploadTemplateFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        setCustomWordTemplate(content);
        setTemplate((prev) => ({ ...prev, useCustomTemplate: true, customHtmlTemplate: content }));
        alert('Đã tải lên mẫu file thành công! Bạn có thể xem trước hoặc bấm "Lưu Mẫu Mặc Định Cho Công Ty".');
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  // Replace all placeholders in custom template with actual asset data
  const renderCustomTemplateContent = () => {
    if (!customWordTemplate) return '';
    let result = customWordTemplate;
    const replacements: Record<string, string> = {
      '{{TEN_CONG_TY}}': template.companyName,
      '{{PHONG_BAN_IT}}': template.companySubTitle,
      '{{SO_BIEN_BAN}}': docNumber,
      '{{NGAY_BAN_GIAO}}': handoverDate,
      '{{DIA_DIEM}}': locationName,
      '{{NGUOI_GIAO}}': giverName,
      '{{CHUC_VU_GIAO}}': giverTitle,
      '{{BO_PHAN_GIAO}}': giverDept,
      '{{NGUOI_NHAN}}': receiverName || '...........................................',
      '{{CHUC_VU_NHAN}}': receiverTitle || '...........................................',
      '{{BO_PHAN_NHAN}}': receiverDept || '...........................................',
      '{{EMAIL_NHAN}}': receiverEmail || '...........................................',
      '{{TEN_THIET_BI}}': assetName,
      '{{MODEL}}': brandModel || 'Theo tiêu chuẩn',
      '{{MA_TAI_SAN}}': assetTag,
      '{{SO_SERIAL}}': serialNumber,
      '{{CAU_HINH}}': specsSummary,
      '{{TINH_TRANG}}': conditionText,
      '{{PHU_KIEN}}': selectedAccessories.map((a) => `<li>${a}</li>`).join(''),
      '{{DIEU_KHOAN}}': termsList.map((t) => `<li>${t}</li>`).join(''),
      '{{GHI_CHU_KET}}': customNotes,
    };

    for (const [key, val] of Object.entries(replacements)) {
      result = result.replaceAll(key, val);
    }
    return result;
  };

  // Handle Save Template as persistent default
  const handleSaveAsDefaultTemplate = async () => {
    setSavingTemplate(true);
    try {
      const updatedTemplate: HandoverTemplateConfig = {
        ...template,
        terms: termsList,
        accessoriesDefault: selectedAccessories,
        notesDefault: customNotes,
        customHtmlTemplate: customWordTemplate,
        useCustomTemplate: template.useCustomTemplate,
      };

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'handover.template',
          value: JSON.stringify(updatedTemplate),
          type: 'JSON',
          group: 'handover',
          label: 'Mẫu Biên bản bàn giao thiết bị IT',
        }),
      });

      if (res.ok) {
        setTemplate(updatedTemplate);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        setIsEditingTemplate(false);
      } else {
        alert('Lưu mẫu thất bại');
      }
    } catch {
      alert('Lỗi kết nối khi lưu mẫu');
    } finally {
      setSavingTemplate(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Download Sample Word Template with placeholders
  const handleDownloadSampleWordTemplate = () => {
    const sampleContent = `<html xmlns:o='urn:schemas-microsoft-com:office:office' 
          xmlns:w='urn:schemas-microsoft-com:office:word' 
          xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>Mau_Bien_Ban_Ban_Giao_Mau</title>
      <style>
        @page { size: A4 portrait; margin: 20mm 15mm 20mm 25mm; }
        body { font-family: 'Times New Roman', Times, serif; font-size: 13pt; line-height: 1.35; color: #000000; }
        p { margin: 0 0 6pt 0; }
        .table-header { width: 100%; border: none; margin-bottom: 12pt; }
        .table-header td { border: none; padding: 2pt 4pt; vertical-align: top; }
        .table-data { width: 100%; border-collapse: collapse; margin-top: 8pt; margin-bottom: 8pt; }
        .table-data td, .table-data th { border: 1px solid #000000; padding: 5pt 8pt; font-family: 'Times New Roman', Times, serif; font-size: 12pt; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-justify { text-align: justify; }
        .font-bold { font-weight: bold; }
        .font-italic { font-style: italic; }
        .uppercase { text-transform: uppercase; }
        .indent { text-indent: 1.27cm; }
      </style>
    </head>
    <body>
      <table class="table-header">
        <tr>
          <td style="width: 45%; text-align: center;">
            <p class="font-bold uppercase" style="font-size: 11pt;">{{TEN_CONG_TY}}</p>
            <p class="font-bold uppercase" style="font-size: 10pt;">{{PHONG_BAN_IT}}</p>
            <p style="font-size: 10pt;">Số: {{SO_BIEN_BAN}}</p>
          </td>
          <td style="width: 55%; text-align: center;">
            <p class="font-bold uppercase" style="font-size: 11pt;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
            <p class="font-bold" style="font-size: 11pt;">Độc lập - Tự do - Hạnh phúc</p>
            <p style="font-size: 11pt; margin-top: -4pt;">-----------------</p>
            <p class="font-italic" style="font-size: 11pt; margin-top: 4pt;">{{NGAY_BAN_GIAO}}</p>
          </td>
        </tr>
      </table>

      <div class="text-center" style="margin-top: 10pt; margin-bottom: 12pt;">
        <p class="font-bold uppercase" style="font-size: 15pt; margin-bottom: 2pt;">BIÊN BẢN BÀN GIAO THIẾT BỊ CÔNG NGHỆ THÔNG TIN</p>
        <p class="font-italic" style="font-size: 11pt;">(Căn cứ theo Quy chế quản lý, cấp phát và sử dụng tài sản CNTT)</p>
      </div>

      <p class="text-justify indent">
        Hôm nay, {{NGAY_BAN_GIAO}}, tại <strong>{{DIA_DIEM}}</strong>, {docMode === 'RETURN' ? 'chúng tôi gồm có các bên tiến hành kiểm tra, thu hồi và tiếp nhận hoàn trả thiết bị công nghệ thông tin với các thông tin chi tiết như sau:' : 'chúng tôi gồm có các bên tiến hành bàn giao và tiếp nhận thiết bị công nghệ thông tin với các thông tin chi tiết như sau:'}
      </p>

      <p class="font-bold uppercase" style="margin-top: 8pt; font-size: 12pt;">{docMode === 'RETURN' ? 'I. ĐẠI DIỆN BÊN GIAO LẠI (CÁN BỘ HOÀN TRẢ - BÊN A):' : 'I. ĐẠI DIỆN BÊN GIAO (BỘ PHẬN CNTT - BÊN A):'}</p>
      <table style="width: 100%; border: none; margin: 0 0 6pt 0;">
        <tr>
          <td style="width: 50%; border: none; padding: 2pt 0;">- Họ và tên: <strong>{{NGUOI_GIAO}}</strong></td>
          <td style="width: 50%; border: none; padding: 2pt 0;">- Chức vụ: <strong>{{CHUC_VU_GIAO}}</strong></td>
        </tr>
        <tr>
          <td style="width: 50%; border: none; padding: 2pt 0;">- Bộ phận: {{BO_PHAN_GIAO}}</td>
          <td style="width: 50%; border: none; padding: 2pt 0;">- Địa điểm: {{DIA_DIEM}}</td>
        </tr>
      </table>

      <p class="font-bold uppercase" style="margin-top: 8pt; font-size: 12pt;">{docMode === 'RETURN' ? 'II. ĐẠI DIỆN BÊN TIẾP NHẬN (BỘ PHẬN CNTT - BÊN B):' : 'II. ĐẠI DIỆN BÊN NHẬN (CÁN BỘ TIẾP NHẬN - BÊN B):'}</p>
      <table style="width: 100%; border: none; margin: 0 0 6pt 0;">
        <tr>
          <td style="width: 50%; border: none; padding: 2pt 0;">- Họ và tên: <strong>{{NGUOI_NHAN}}</strong></td>
          <td style="width: 50%; border: none; padding: 2pt 0;">- Chức danh: {{CHUC_VU_NHAN}}</td>
        </tr>
        <tr>
          <td style="width: 50%; border: none; padding: 2pt 0;">- Phòng ban / Đơn vị: {{BO_PHAN_NHAN}}</td>
          <td style="width: 50%; border: none; padding: 2pt 0;">- Email: {{EMAIL_NHAN}}</td>
        </tr>
      </table>

      <p class="font-bold uppercase" style="margin-top: 8pt; font-size: 12pt;">{docMode === 'RETURN' ? 'III. NỘI DUNG THIẾT BỊ VÀ THÔNG SỐ KỸ THUẬT THU HỒI:' : 'III. NỘI DUNG THIẾT BỊ VÀ THÔNG SỐ KỸ THUẬT BÀN GIAO:'}</p>
      <table class="table-data">
        <tr>
          <td style="width: 32%; background-color: #f2f2f2; font-weight: bold;">Tên thiết bị / Chủng loại</td>
          <td style="font-weight: bold;">{{TEN_THIET_BI}}</td>
        </tr>
        <tr>
          <td style="background-color: #f2f2f2; font-weight: bold;">Thương hiệu / Model</td>
          <td>{{MODEL}}</td>
        </tr>
        <tr>
          <td style="background-color: #f2f2f2; font-weight: bold;">{isEn ? 'Asset Tag' : 'Mã tài sản (Asset Tag)'}</td>
          <td style="font-weight: bold; font-family: 'Courier New', monospace;">{{MA_TAI_SAN}}</td>
        </tr>
        <tr>
          <td style="background-color: #f2f2f2; font-weight: bold;">Số Serial (S/N)</td>
          <td style="font-weight: bold; font-family: 'Courier New', monospace;">{{SO_SERIAL}}</td>
        </tr>
        <tr>
          <td style="background-color: #f2f2f2; font-weight: bold;">Cấu hình phần cứng</td>
          <td>{{CAU_HINH}}</td>
        </tr>
        <tr>
          <td style="background-color: #f2f2f2; font-weight: bold;">Tình trạng khi bàn giao</td>
          <td><strong>{{TINH_TRANG}}</strong></td>
        </tr>
      </table>

      <p class="font-bold uppercase" style="margin-top: 8pt; font-size: 12pt;">IV. PHỤ KIỆN ĐI KÈM THEO THIẾT BỊ:</p>
      <ul style="margin: 0 0 6pt 20pt; padding: 0;">
        {{PHU_KIEN}}
      </ul>

      <p class="font-bold uppercase" style="margin-top: 8pt; font-size: 12pt;">V. ĐIỀU KHOẢN VÀ TRÁCH NHIỆM BẢO QUẢN THIẾT BỊ:</p>
      <ol style="margin: 0 0 8pt 20pt; padding: 0; text-align: justify;">
        {{DIEU_KHOAN}}
      </ol>

      <p class="text-justify font-italic indent" style="font-size: 12pt; margin-bottom: 15pt;">
        {{GHI_CHU_KET}}
      </p>

      <table style="width: 100%; border: none; margin-top: 15pt;">
        <tr>
          <td style="width: 50%; text-align: center; border: none; vertical-align: top;">
            <p class="font-bold uppercase" style="font-size: 12pt;">ĐẠI DIỆN BÊN GIAO (BÊN A)</p>
            <p class="font-italic" style="font-size: 10pt; margin-bottom: 45pt;">(Ký và ghi rõ họ tên)</p>
            <p class="font-bold" style="font-size: 12pt;">{{NGUOI_GIAO}}</p>
          </td>
          <td style="width: 50%; text-align: center; border: none; vertical-align: top;">
            <p class="font-bold uppercase" style="font-size: 12pt;">NGƯỜI NHẬN THIẾT BỊ (BÊN B)</p>
            <p class="font-italic" style="font-size: 10pt; margin-bottom: 45pt;">(Ký và ghi rõ họ tên)</p>
            <p class="font-bold" style="font-size: 12pt;">{{NGUOI_NHAN}}</p>
          </td>
        </tr>
      </table>
    </body>
    </html>`;

    const blob = new Blob(['\ufeff', sampleContent], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Mau_Bien_Ban_Chua_Bien_Goi_Y.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export as Word Document (.doc)
  const handleExportWord = () => {
    let wordHtml = '';

    if (template.useCustomTemplate && customWordTemplate.trim()) {
      wordHtml = renderCustomTemplateContent();
      if (!wordHtml.includes('<html')) {
        wordHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' 
              xmlns:w='urn:schemas-microsoft-com:office:word' 
              xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <meta charset='utf-8'>
          <title>${docMode === 'RETURN' ? 'BIÊN BẢN THU HỒI THIẾT BỊ CÔNG NGHỆ THÔNG TIN' : template.docTitle}</title>
          <style>
            @page { size: A4 portrait; margin: 20mm 15mm 20mm 25mm; }
            body { font-family: 'Times New Roman', Times, serif; font-size: 13pt; line-height: 1.35; color: #000000; }
          </style>
        </head>
        <body>${wordHtml}</body>
        </html>`;
      }
    } else {
      const accessoriesHtml = selectedAccessories.map((a) => `<li>${a}</li>`).join('');
      const termsHtml = termsList.map((t) => `<li style="margin-bottom: 4pt;">${t}</li>`).join('');

      wordHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' 
            xmlns:w='urn:schemas-microsoft-com:office:word' 
            xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${docMode === 'RETURN' ? 'BIÊN BẢN THU HỒI THIẾT BỊ CÔNG NGHỆ THÔNG TIN' : template.docTitle}</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @page {
            size: A4 portrait;
            margin: 20mm 15mm 20mm 25mm;
          }
          body {
            font-family: 'Times New Roman', Times, serif;
            font-size: 13pt;
            line-height: 1.35;
            color: #000000;
          }
          p { margin: 0 0 6pt 0; }
          .table-header {
            width: 100%;
            border: none;
            margin-bottom: 12pt;
          }
          .table-header td {
            border: none;
            padding: 2pt 4pt;
            vertical-align: top;
          }
          .table-data {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8pt;
            margin-bottom: 8pt;
          }
          .table-data td, .table-data th {
            border: 1px solid #000000;
            padding: 5pt 8pt;
            font-family: 'Times New Roman', Times, serif;
            font-size: 12pt;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .text-justify { text-align: justify; }
          .font-bold { font-weight: bold; }
          .font-italic { font-style: italic; }
          .uppercase { text-transform: uppercase; }
          .indent { text-indent: 1.27cm; }
        </style>
      </head>
      <body>
        <table class="table-header">
          <tr>
            <td style="width: 45%; text-align: center;">
              <p class="font-bold uppercase" style="font-size: 11pt;">${template.companyName}</p>
              <p class="font-bold uppercase" style="font-size: 10pt;">${template.companySubTitle}</p>
              <p style="font-size: 10pt;">Số: ${docNumber}</p>
            </td>
            <td style="width: 55%; text-align: center;">
              <p class="font-bold uppercase" style="font-size: 11pt;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
              <p class="font-bold" style="font-size: 11pt;">Độc lập - Tự do - Hạnh phúc</p>
              <p style="font-size: 11pt; margin-top: -4pt;">-----------------</p>
              <p class="font-italic" style="font-size: 11pt; margin-top: 4pt;">${handoverDate}</p>
            </td>
          </tr>
        </table>

        <div class="text-center" style="margin-top: 10pt; margin-bottom: 12pt;">
          <p class="font-bold uppercase" style="font-size: 15pt; margin-bottom: 2pt;">${docMode === 'RETURN' ? 'BIÊN BẢN THU HỒI THIẾT BỊ CÔNG NGHỆ THÔNG TIN' : template.docTitle}</p>
          <p class="font-italic" style="font-size: 11pt;">(Căn cứ theo Quy chế quản lý, cấp phát và sử dụng tài sản CNTT)</p>
        </div>

        <p class="text-justify indent">
          Hôm nay, ${handoverDate.toLowerCase()}, tại <strong>${locationName}</strong>, chúng tôi gồm có các bên tiến hành bàn giao và tiếp nhận thiết bị công nghệ thông tin với các thông tin chi tiết như sau:
        </p>

        <p class="font-bold uppercase" style="margin-top: 8pt; font-size: 12pt;">I. ĐẠI DIỆN BÊN GIAO (BỘ PHẬN CNTT - BÊN A):</p>
        <table style="width: 100%; border: none; margin: 0 0 6pt 0;">
          <tr>
            <td style="width: 50%; border: none; padding: 2pt 0;">- Họ và tên: <strong>${giverName}</strong></td>
            <td style="width: 50%; border: none; padding: 2pt 0;">- Chức vụ: <strong>${giverTitle}</strong></td>
          </tr>
          <tr>
            <td style="width: 50%; border: none; padding: 2pt 0;">- Bộ phận: ${giverDept}</td>
            <td style="width: 50%; border: none; padding: 2pt 0;">- Điện thoại / Email: ${giverPhone || 'Nội bộ'}</td>
          </tr>
        </table>

        <p class="font-bold uppercase" style="margin-top: 8pt; font-size: 12pt;">II. ĐẠI DIỆN BÊN NHẬN (CÁN BỘ TIẾP NHẬN - BÊN B):</p>
        <table style="width: 100%; border: none; margin: 0 0 6pt 0;">
          <tr>
            <td style="width: 50%; border: none; padding: 2pt 0;">- Họ và tên: <strong>${receiverName || '................................................'}</strong></td>
            <td style="width: 50%; border: none; padding: 2pt 0;">- Chức danh: ${receiverTitle || '................................................'}</td>
          </tr>
          <tr>
            <td style="width: 50%; border: none; padding: 2pt 0;">- Phòng ban / Đơn vị: ${receiverDept || '................................................'}</td>
            <td style="width: 50%; border: none; padding: 2pt 0;">- Email: ${receiverEmail || '................................................'}</td>
          </tr>
        </table>

        <p class="font-bold uppercase" style="margin-top: 8pt; font-size: 12pt;">III. NỘI DUNG THIẾT BỊ VÀ THÔNG SỐ KỸ THUẬT BÀN GIAO:</p>
        <table class="table-data">
          <tr>
            <td style="width: 32%; background-color: #f2f2f2; font-weight: bold;">Tên thiết bị / Chủng loại</td>
            <td style="font-weight: bold;">${assetName}</td>
          </tr>
          <tr>
            <td style="background-color: #f2f2f2; font-weight: bold;">Thương hiệu / Model</td>
            <td>${brandModel || 'Theo tiêu chuẩn sản xuất'}</td>
          </tr>
          <tr>
            <td style="background-color: #f2f2f2; font-weight: bold;">{isEn ? 'Asset Tag' : 'Mã tài sản (Asset Tag)'}</td>
            <td style="font-weight: bold; font-family: 'Courier New', monospace;">${assetTag}</td>
          </tr>
          <tr>
            <td style="background-color: #f2f2f2; font-weight: bold;">Số Serial (S/N)</td>
            <td style="font-weight: bold; font-family: 'Courier New', monospace;">${serialNumber}</td>
          </tr>
          <tr>
            <td style="background-color: #f2f2f2; font-weight: bold;">Cấu hình phần cứng</td>
            <td>${specsSummary}</td>
          </tr>
          <tr>
            <td style="background-color: #f2f2f2; font-weight: bold;">Tình trạng khi bàn giao</td>
            <td><strong>${conditionText}</strong></td>
          </tr>
        </table>

        <p class="font-bold uppercase" style="margin-top: 8pt; font-size: 12pt;">IV. PHỤ KIỆN ĐI KÈM THEO THIẾT BỊ:</p>
        <ul style="margin: 0 0 6pt 20pt; padding: 0;">
          ${accessoriesHtml}
        </ul>

        <p class="font-bold uppercase" style="margin-top: 8pt; font-size: 12pt;">V. ĐIỀU KHOẢN VÀ TRÁCH NHIỆM BẢO QUẢN THIẾT BỊ:</p>
        <ol style="margin: 0 0 8pt 20pt; padding: 0; text-align: justify;">
          ${termsHtml}
        </ol>

        <p class="text-justify font-italic indent" style="font-size: 12pt; margin-bottom: 15pt;">
          ${customNotes}
        </p>

        <table style="width: 100%; border: none; margin-top: 15pt;">
          <tr>
            <td style="width: 50%; text-align: center; border: none; vertical-align: top;">
              <p class="font-bold uppercase" style="font-size: 12pt;">ĐẠI DIỆN BÊN GIAO (BÊN A)</p>
              <p class="font-italic" style="font-size: 10pt; margin-bottom: 45pt;">(Ký và ghi rõ họ tên)</p>
              <p class="font-bold" style="font-size: 12pt;">${giverName}</p>
            </td>
            <td style="width: 50%; text-align: center; border: none; vertical-align: top;">
              <p class="font-bold uppercase" style="font-size: 12pt;">NGƯỜI NHẬN THIẾT BỊ (BÊN B)</p>
              <p class="font-italic" style="font-size: 10pt; margin-bottom: 45pt;">(Ký và ghi rõ họ tên)</p>
              <p class="font-bold" style="font-size: 12pt;">${receiverName || '................................................'}</p>
            </td>
          </tr>
        </table>
      </body>
      </html>`;
    }

    const blob = new Blob(['\ufeff', wordHtml], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${docMode === 'RETURN' ? 'Bien_Ban_Thu_Hoi' : 'Bien_Ban_Ban_Giao'}_${asset.assetTag || 'Thiet_Bi'}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleAccessory = (acc: string) => {
    setSelectedAccessories((prev) =>
      prev.includes(acc) ? prev.filter((a) => a !== acc) : [...prev, acc]
    );
  };

  const addCustomAccessory = () => {
    if (!customAccessoryInput.trim()) return;
    const clean = customAccessoryInput.trim().normalize('NFC');
    if (!selectedAccessories.includes(clean)) {
      setSelectedAccessories((prev) => [...prev, clean]);
    }
    setCustomAccessoryInput('');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTag(text);
    setTimeout(() => setCopiedTag(null), 2000);
  };

  if (!isOpen || !asset) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden print:max-w-none print:max-h-none print:shadow-none print:border-none print:rounded-none">
        
        {/* MODAL CONTROLS HEADER (HIDDEN ON PRINT) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 print:hidden shrink-0 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${docMode === 'RETURN' ? 'bg-amber-600' : 'bg-blue-600'} text-white flex items-center justify-center shadow-xs`}>
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                {/* 2 Tabs Mode Switcher */}
                <div className="inline-flex items-center p-0.5 bg-slate-200 rounded-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setDocMode('HANDOVER');
                      setTermsList(template.terms || DEFAULT_TEMPLATE.terms);
                    }}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${docMode === 'HANDOVER' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'}`}
                  >
                    📋 Biên Bản Bàn Giao
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDocMode('RETURN');
                      setTermsList(RETURN_TERMS);
                    }}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${docMode === 'RETURN' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'}`}
                  >
                    📥 Biên Bản Thu Hồi
                  </button>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-800 text-xs font-mono font-bold">
                  {asset.assetTag}
                </span>
              </div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>{docMode === 'RETURN' ? 'Thu hồi thiết bị về kho CNTT' : 'Bàn giao thiết bị cho nhân viên'}</span>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-mono font-bold">
                  {asset.assetTag}
                </span>
                {template.useCustomTemplate && (
                  <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold border border-purple-200">
                    ★ Mẫu Tùy Biến Riêng
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500">Hỗ trợ tải lên file Word mẫu riêng, tự động điền dữ liệu và in A4 chuẩn</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditingTemplate(!isEditingTemplate)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                isEditingTemplate
                  ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{isEditingTemplate ? 'Đóng Tùy Biến' : '⚙️ Tùy Chỉnh & Tải Mẫu Word'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportWord}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              title="Tải về file Microsoft Word (.doc) theo đúng mẫu"
            >
              <FileDown className="w-4 h-4" />
              <span>Tải File Word (.doc)</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>In Ngay / Lưu PDF (A4)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* TEMPLATE CUSTOMIZER & WORD UPLOAD PANEL (HIDDEN ON PRINT) */}
        {isEditingTemplate && (
          <div className="p-4 bg-amber-50/70 border-b border-amber-200 text-xs space-y-4 print:hidden shrink-0 max-h-80 overflow-y-auto">
            {/* Header & Tabs */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 p-1 bg-amber-200/60 rounded-xl">
                <button
                  type="button"
                  onClick={() => setTemplateTab('STANDARD')}
                  className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                    templateTab === 'STANDARD'
                      ? 'bg-white text-amber-950 shadow-xs'
                      : 'text-amber-800 hover:text-amber-950'
                  }`}
                >
                  ⚙️ Tùy Biến Mẫu Tiêu Chuẩn
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateTab('UPLOAD_WORD')}
                  className={`px-3 py-1 rounded-lg font-bold text-xs transition-all flex items-center gap-1 ${
                    templateTab === 'UPLOAD_WORD'
                      ? 'bg-white text-indigo-900 shadow-xs'
                      : 'text-amber-800 hover:text-amber-950'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>📁 Tải Lên Mẫu File Word Riêng Của Bạn</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTemplate(DEFAULT_TEMPLATE);
                    setTermsList(DEFAULT_TEMPLATE.terms);
                    setSelectedAccessories(DEFAULT_TEMPLATE.accessoriesDefault);
                    setCustomWordTemplate('');
                  }}
                  className="px-2.5 py-1 text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-lg font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Khôi phục mẫu gốc</span>
                </button>

                <button
                  type="button"
                  disabled={savingTemplate}
                  onClick={handleSaveAsDefaultTemplate}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingTemplate ? 'Đang lưu...' : '💾 Lưu Mẫu Mặc Định Cho Công Ty'}</span>
                </button>
              </div>
            </div>

            {saveSuccess && (
              <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-lg font-bold flex items-center gap-1.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Mẫu biên bản đã được lưu thành công làm chuẩn mặc định cho toàn công ty!</span>
              </div>
            )}

            {/* TAB 1: STANDARD FORM SETTINGS */}
            {templateTab === 'STANDARD' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tên Đơn Vị / Công Ty (Góc Trái)</label>
                    <input
                      type="text"
                      value={template.companyName}
                      onChange={(e) => setTemplate({ ...template, companyName: e.target.value.normalize('NFC') })}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Phòng Ban / Bộ Phận Quản Lý</label>
                    <input
                      type="text"
                      value={template.companySubTitle}
                      onChange={(e) => setTemplate({ ...template, companySubTitle: e.target.value.normalize('NFC') })}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tiêu Đề Biên Bản</label>
                    <input
                      type="text"
                      value={template.docTitle}
                      onChange={(e) => setTemplate({ ...template, docTitle: e.target.value.normalize('NFC') })}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Các Điều Khoản Trách Nhiệm Sử Dụng (Mỗi dòng 1 điều khoản):</label>
                  <textarea
                    rows={3}
                    value={termsList.join('\n')}
                    onChange={(e) => setTermsList(e.target.value.split('\n').filter((t) => t.trim().length > 0).map((t) => t.normalize('NFC')))}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>
            )}

            {/* TAB 2: UPLOAD CUSTOM WORD / HTML TEMPLATE */}
            {templateTab === 'UPLOAD_WORD' && (
              <div className="space-y-3 bg-white p-3.5 rounded-xl border border-indigo-200">
                <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-200">
                  <div>
                    <p className="font-bold text-indigo-950 text-xs flex items-center gap-1.5">
                      <span>📁 Tải Lên Mẫu File Word (.doc / .html) Của Đơn Vị Bạn</span>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Chèn các mã giữ chỗ như <code className="text-indigo-600 font-bold font-mono">{'{{TEN_THIET_BI}}'}</code>, <code className="text-indigo-600 font-bold font-mono">{'{{SO_SERIAL}}'}</code> vào file Word của bạn để hệ thống tự động điền dữ liệu.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadSampleWordTemplate}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-300 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Download className="w-3.5 h-3.5 text-indigo-600" />
                      <span>📥 Tải Mẫu Word Gợi Ý (.doc)</span>
                    </button>

                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleUploadTemplateFile}
                      accept=".doc,.docx,.html,.htm,.txt"
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>⬆️ Tải Lên File Mẫu (.doc / .html)</span>
                    </button>
                  </div>
                </div>

                {/* Merge Tags Reference Table */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                      📋 Bảng Danh Sách Các Mã Biến Bắt Buộc / Tùy Chọn (Bấm để sao chép):
                    </span>
                    {copiedTag && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold animate-in fade-in">
                        ✓ Đã sao chép: {copiedTag}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 max-h-36 overflow-y-auto p-1 bg-slate-50 rounded-lg border border-slate-200 text-[11px]">
                    {MERGE_TAGS.map((m) => (
                      <button
                        key={m.tag}
                        type="button"
                        onClick={() => copyToClipboard(m.tag)}
                        className="p-1.5 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-lg text-left transition-colors cursor-pointer flex items-center justify-between group"
                        title={`Bấm để chép mã: ${m.tag} (${m.desc})`}
                      >
                        <div className="truncate">
                          <code className="font-bold font-mono text-indigo-700 text-[10.5px] block">{m.tag}</code>
                          <span className="text-[9.5px] text-slate-500 truncate block">{m.desc}</span>
                        </div>
                        <Copy className="w-3 h-3 text-slate-400 group-hover:text-indigo-600 shrink-0 ml-1" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Template Raw Content / Status */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-700 text-[11px]">
                      Nội dung File Mẫu Tùy Biến (HTML / Word format):
                    </label>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1 cursor-pointer text-indigo-700 font-bold">
                        <input
                          type="checkbox"
                          checked={template.useCustomTemplate}
                          onChange={(e) => setTemplate({ ...template, useCustomTemplate: e.target.checked })}
                          className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span>Kích hoạt Mẫu Tùy Biến Này Cho Toàn Hệ Thống</span>
                      </label>
                    </div>
                  </div>

                  <textarea
                    rows={4}
                    placeholder="Dán mã HTML/Word mẫu hoặc tải file từ nút phía trên. Các thẻ {{TEN_THIET_BI}}, {{SO_SERIAL}}... sẽ tự động được thay thế bằng dữ liệu thực tế."
                    value={customWordTemplate}
                    onChange={(e) => {
                      setCustomWordTemplate(e.target.value);
                      setTemplate({ ...template, customHtmlTemplate: e.target.value, useCustomTemplate: true });
                    }}
                    className="w-full p-2 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-lg border border-slate-700 outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* PRINTABLE A4 DOCUMENT BODY */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-white print:p-0 print:overflow-visible print:bg-white text-black">
          {template.useCustomTemplate && customWordTemplate.trim() ? (
            /* CUSTOM TEMPLATE RENDER */
            <div
              id="printable-handover-doc"
              style={{ fontFamily: '"Times New Roman", Times, Georgia, serif' }}
              className="max-w-[760px] mx-auto text-[14px] leading-relaxed text-black print:max-w-none"
              dangerouslySetInnerHTML={{ __html: renderCustomTemplateContent() }}
            />
          ) : (
            /* STANDARD DEFAULT TEMPLATE RENDER */
            <div
              id="printable-handover-doc"
              style={{ fontFamily: '"Times New Roman", Times, Georgia, serif' }}
              className="max-w-[760px] mx-auto space-y-6 text-[14px] leading-relaxed text-black print:max-w-none print:space-y-4"
            >
              
              {/* DOCUMENT TOP HEADER: COMPANY & NATIONAL HEADER */}
              <div className="flex items-start justify-between border-b-2 border-black pb-4 print:border-black">
                {/* Left: Company name */}
                <div className="text-center w-5/12">
                  <p className="font-bold text-[13px] uppercase tracking-wide">{template.companyName}</p>
                  <p className="font-bold text-[12px] uppercase text-black mt-0.5">{template.companySubTitle}</p>
                  <p className="text-[12px] font-mono text-black mt-1">Số: {docNumber}</p>
                </div>

                {/* Right: National Header */}
                {template.nationalHeaderEnabled && (
                  <div className="text-center w-6/12">
                    <p className="font-bold text-[13px] uppercase tracking-wide">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                    <p className="font-bold text-[13px] text-black mt-0.5">Độc lập - Tự do - Hạnh phúc</p>
                    <div className="w-24 h-[1px] bg-black mx-auto mt-1"></div>
                    <p className="text-[12.5px] italic text-black mt-2">{handoverDate}</p>
                  </div>
                )}
              </div>

              {/* DOCUMENT TITLE */}
              <div className="text-center py-2 space-y-1">
                <h1 className="text-xl sm:text-2xl font-bold uppercase tracking-wide text-black">
                  {template.docTitle}
                </h1>
                <p className="text-[12.5px] italic text-black">
                  (Căn cứ theo Quy chế quản lý, cấp phát và sử dụng tài sản CNTT của đơn vị)
                </p>
              </div>

              {/* INTRODUCTORY SENTENCE */}
              <p className="text-justify indent-8 text-[13.5px]">
                Hôm nay, {handoverDate.toLowerCase()}, tại <strong>{locationName}</strong>, chúng tôi gồm có các bên tiến hành bàn giao và tiếp nhận thiết bị công nghệ thông tin với các thông tin chi tiết như sau:
              </p>

              {/* SECTION I: PARTIES INVOLVED */}
              <div className="space-y-3 text-[13.5px]">
                {/* PARTY A: GIVER */}
                <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 print:bg-transparent print:border-none print:p-0 print:space-y-1">
                  <p className="font-bold uppercase text-[13px] tracking-wider text-black">
                    I. ĐẠI DIỆN BÊN GIAO (BỘ PHẬN CNTT - BÊN A):
                  </p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1">
                    <div>
                      <span>Họ và tên: </span>
                      <input
                        type="text"
                        style={{ fontFamily: '"Times New Roman", Times, serif' }}
                        value={giverName}
                        onChange={(e) => setGiverName(e.target.value.normalize('NFC'))}
                        className="font-bold bg-transparent border-b border-dotted border-slate-500 focus:outline-none print:border-none inline-block w-48 text-black"
                      />
                    </div>
                    <div>
                      <span>Chức vụ: </span>
                      <input
                        type="text"
                        style={{ fontFamily: '"Times New Roman", Times, serif' }}
                        value={giverTitle}
                        onChange={(e) => setGiverTitle(e.target.value.normalize('NFC'))}
                        className="font-semibold bg-transparent border-b border-dotted border-slate-500 focus:outline-none print:border-none inline-block w-52 text-black"
                      />
                    </div>
                    <div>
                      <span>Bộ phận: </span>
                      <input
                        type="text"
                        style={{ fontFamily: '"Times New Roman", Times, serif' }}
                        value={giverDept}
                        onChange={(e) => setGiverDept(e.target.value.normalize('NFC'))}
                        className="font-semibold bg-transparent border-b border-dotted border-slate-500 focus:outline-none print:border-none inline-block w-52 text-black"
                      />
                    </div>
                  </div>
                </div>

                {/* PARTY B: RECEIVER */}
                <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 print:bg-transparent print:border-none print:p-0 print:space-y-1">
                  <p className="font-bold uppercase text-[13px] tracking-wider text-black">
                    II. ĐẠI DIỆN BÊN NHẬN (CÁN BỘ TIẾP NHẬN - BÊN B):
                  </p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1">
                    <div>
                      <span>Họ và tên: </span>
                      <input
                        type="text"
                        style={{ fontFamily: '"Times New Roman", Times, serif' }}
                        value={receiverName}
                        onChange={(e) => setReceiverName(e.target.value.normalize('NFC'))}
                        placeholder="Nhập tên người nhận..."
                        className="font-bold bg-transparent border-b border-dotted border-slate-500 focus:outline-none print:border-none inline-block w-48 text-black"
                      />
                    </div>
                    <div>
                      <span>Chức danh / Vị trí: </span>
                      <input
                        type="text"
                        style={{ fontFamily: '"Times New Roman", Times, serif' }}
                        value={receiverTitle}
                        onChange={(e) => setReceiverTitle(e.target.value.normalize('NFC'))}
                        placeholder="Chức danh..."
                        className="font-semibold bg-transparent border-b border-dotted border-slate-500 focus:outline-none print:border-none inline-block w-44 text-black"
                      />
                    </div>
                    <div>
                      <span>Phòng ban / Đơn vị: </span>
                      <input
                        type="text"
                        style={{ fontFamily: '"Times New Roman", Times, serif' }}
                        value={receiverDept}
                        onChange={(e) => setReceiverDept(e.target.value.normalize('NFC'))}
                        placeholder="Phòng ban..."
                        className="font-semibold bg-transparent border-b border-dotted border-slate-500 focus:outline-none print:border-none inline-block w-48 text-black"
                      />
                    </div>
                    <div>
                      <span>Email công vụ: </span>
                      <input
                        type="text"
                        style={{ fontFamily: '"Times New Roman", Times, serif' }}
                        value={receiverEmail}
                        onChange={(e) => setReceiverEmail(e.target.value)}
                        className="font-mono text-black bg-transparent border-b border-dotted border-slate-500 focus:outline-none print:border-none inline-block w-48"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION III: ASSET SPECIFICATION TABLE */}
              <div className="space-y-2 text-[13.5px]">
                <p className="font-bold uppercase text-[13px] tracking-wider text-black">
                  III. NỘI DUNG THIẾT BỊ VÀ THÔNG SỐ KỸ THUẬT BÀN GIAO:
                </p>

                <table className="w-full border-collapse border border-black text-[13px] print:border-black">
                  <tbody>
                    <tr>
                      <td className="border border-black p-2.5 font-bold bg-slate-100 w-1/3 print:border-black print:bg-slate-100">
                        Tên thiết bị / Chủng loại
                      </td>
                      <td className="border border-black p-2.5 font-bold text-black print:border-black">
                        {assetName}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2.5 font-bold bg-slate-100 print:border-black print:bg-slate-100">
                        Thương hiệu / Model
                      </td>
                      <td className="border border-black p-2.5 font-semibold print:border-black">
                        {brandModel || 'Theo tiêu chuẩn sản xuất'}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2.5 font-bold bg-slate-100 print:border-black print:bg-slate-100">{isEn ? 'Asset Tag' : 'Mã tài sản (Asset Tag)'}</td>
                      <td className="border border-black p-2.5 font-mono font-bold text-black print:border-black">
                        {assetTag}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2.5 font-bold bg-slate-100 print:border-black print:bg-slate-100">
                        Số Serial (S/N)
                      </td>
                      <td className="border border-black p-2.5 font-mono font-bold print:border-black">
                        {serialNumber}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2.5 font-bold bg-slate-100 print:border-black print:bg-slate-100">
                        Cấu hình phần cứng
                      </td>
                      <td className="border border-black p-2.5 print:border-black">
                        <input
                          type="text"
                          style={{ fontFamily: '"Times New Roman", Times, serif' }}
                          value={specsSummary}
                          onChange={(e) => setSpecsSummary(e.target.value.normalize('NFC'))}
                          className="w-full bg-transparent focus:outline-none print:border-none font-medium text-black"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2.5 font-bold bg-slate-100 print:border-black print:bg-slate-100">
                        Tình trạng khi bàn giao
                      </td>
                      <td className="border border-black p-2.5 print:border-black font-bold text-black">
                        <input
                          type="text"
                          style={{ fontFamily: '"Times New Roman", Times, serif' }}
                          value={conditionText}
                          onChange={(e) => setConditionText(e.target.value.normalize('NFC'))}
                          className="w-full bg-transparent focus:outline-none print:border-none text-black"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* SECTION IV: ACCESSORIES INCLUDED */}
              <div className="space-y-1.5 text-[13.5px]">
                <p className="font-bold uppercase tracking-wider text-black text-[13px]">
                  IV. PHỤ KIỆN ĐI KÈM THEO THIẾT BỊ:
                </p>
                <div className="pl-2 space-y-1">
                  {selectedAccessories.map((acc, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-black font-bold">☑</span>
                      <span>{acc}</span>
                    </div>
                  ))}
                </div>

                {/* Add accessory input (HIDDEN ON PRINT) */}
                <div className="flex items-center gap-2 pt-1 print:hidden">
                  <input
                    type="text"
                    placeholder="+ Thêm phụ kiện khác (VD: Bàn phím rời, Hub Type-C...)"
                    value={customAccessoryInput}
                    onChange={(e) => setCustomAccessoryInput(e.target.value.normalize('NFC'))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCustomAccessory();
                      }
                    }}
                    className="p-1.5 border border-slate-300 rounded-lg text-xs flex-1 max-w-sm"
                  />
                  <button
                    type="button"
                    onClick={addCustomAccessory}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-300 cursor-pointer"
                  >
                    + Thêm
                  </button>
                </div>
              </div>

              {/* SECTION V: TERMS AND RESPONSIBILITIES */}
              <div className="space-y-1.5 text-[13.5px]">
                <p className="font-bold uppercase tracking-wider text-black text-[13px]">
                  V. ĐIỀU KHOẢN VÀ TRÁCH NHIỆM BẢO QUẢN THIẾT BỊ:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-justify pl-2">
                  {termsList.map((t, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {t}
                    </li>
                  ))}
                </ol>
              </div>

              {/* CLOSING NOTES */}
              <p className="text-[13px] italic text-justify indent-8 text-black">
                {customNotes}
              </p>

              {/* SIGNATURE BLOCKS */}
              <div className="pt-6 grid grid-cols-2 gap-8 text-center text-[13.5px] print:pt-4">
                <div className="space-y-16">
                  <div>
                    <p className="font-bold uppercase text-black">ĐẠI DIỆN BÊN GIAO (BÊN A)</p>
                    <p className="text-[12px] italic text-black">(Ký và ghi rõ họ tên)</p>
                  </div>
                  <p className="font-bold text-black">{giverName}</p>
                </div>

                <div className="space-y-16">
                  <div>
                    <p className="font-bold uppercase text-black">NGƯỜI NHẬN THIẾT BỊ (BÊN B)</p>
                    <p className="text-[12px] italic text-black">(Ký và ghi rõ họ tên)</p>
                  </div>
                  <p className="font-bold text-black">{receiverName || '...........................................'}</p>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* FOOTER ACTIONS (HIDDEN ON PRINT) */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between print:hidden shrink-0 flex-wrap gap-2">
          <span className="text-xs text-slate-500">
            💡 <strong>Mẹo:</strong> Bấm <em>Tùy Chỉnh & Tải Mẫu Word</em> để nạp mẫu Word riêng của công ty hoặc tải về file mẫu gợi ý.
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >{isEn ? 'Close' : 'Đóng'}</button>

            <button
              type="button"
              onClick={handleExportWord}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              title="Tải về file Microsoft Word (.doc) theo đúng mẫu"
            >
              <FileDown className="w-4 h-4" />
              <span>Tải File Word (.doc)</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>In Khổ A4 / Lưu PDF</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
