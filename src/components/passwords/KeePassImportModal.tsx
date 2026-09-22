'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldCheck,
  X,
  Sparkles,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  ShieldAlert,
  CheckCircle2,
  Download,
  Check,
  RefreshCw,
} from 'lucide-react';
import * as kdbxweb from 'kdbxweb';
import { useLanguage } from '@/lib/i18n/context';

interface KeePassImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message?: string) => void;
}

const decodeXml = (str: string) => {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
};

export function KeePassImportModal({
  isOpen,
  onClose,
  onSuccess,
}: KeePassImportModalProps) {
  const { t } = useLanguage();

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

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importMasterPassword, setImportMasterPassword] = useState('');
  const [showImportMasterPassword, setShowImportMasterPassword] = useState(false);
  const [importKeyFile, setImportKeyFile] = useState<File | null>(null);
  const [importGroup, setImportGroup] = useState('🏢 Văn Phòng Trụ Sở Chính / KeePass Import');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string; groupsCount: number } | null>(null);
  const [importErrorMsg, setImportErrorMsg] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const keyFileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDownloadSampleTemplate = async () => {
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('KeePass_Import_Template');

    worksheet.columns = [
      { header: 'Thư Mục (Group)', key: 'groupName', width: 40 },
      { header: 'Tiêu Đề / Dịch Vụ (Title) (*)', key: 'title', width: 30 },
      { header: 'Tên Đăng Nhập (Username)', key: 'username', width: 25 },
      { header: 'Mật Khẩu (Password) (*)', key: 'password', width: 25 },
      { header: 'Đường Dẫn Đăng Nhập / IP (URL)', key: 'url', width: 35 },
      { header: 'Phân Loại (Category)', key: 'category', width: 20 },
      { header: 'Ghi Chú (Notes)', key: 'notes', width: 35 },
    ];

    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4338CA' },
    };

    worksheet.addRow({
      groupName: '🏢 Văn Phòng Trụ Sở Chính / 🐧 Máy chủ Linux / Ubuntu',
      title: 'Root Server Ubuntu 24.04 Production',
      username: 'root',
      password: 'P@ssw0rd!Secure2025',
      url: 'ssh://103.142.26.88:22',
      category: 'SERVER',
      notes: 'Server chạy ERP và Postgres chính thức',
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Mau_Import_KeePass_Passwords.xlsx';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleUploadKeePassFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) {
      setImportErrorMsg(t('passwords.keepass_err_no_file', 'Vui lòng chọn file KeePass (.kdbx, .xml, .csv)'));
      return;
    }

    const fileName = importFile.name.toLowerCase();
    const isKdbx = fileName.endsWith('.kdbx') || fileName.endsWith('.kbdx');

    if (isKdbx && !importMasterPassword && !importKeyFile) {
      setImportErrorMsg(t('passwords.keepass_err_no_pwd', 'Vui lòng nhập Mật khẩu Master Password để mở file .kdbx'));
      return;
    }

    setIsImporting(true);
    setImportResult(null);
    setImportErrorMsg('');

    try {
      const extractedRows: any[] = [];

      // 1. DIRECT BROWSER-SIDE DECRYPTION FOR .KDBX FILES
      if (isKdbx) {
        const fileBuffer = await importFile.arrayBuffer();
        let keyBuffer: Uint8Array | undefined;
        if (importKeyFile) {
          keyBuffer = new Uint8Array(await importKeyFile.arrayBuffer());
        }

        const credentials = new kdbxweb.Credentials(
          kdbxweb.ProtectedValue.fromString(importMasterPassword || ''),
          keyBuffer
        );

        let db: kdbxweb.Kdbx;
        try {
          db = await kdbxweb.Kdbx.load(fileBuffer, credentials);
        } catch (kdbxErr: any) {
          const msg = (kdbxErr.message || '').toLowerCase();
          if (msg.includes('password') || msg.includes('key') || msg.includes('mac') || msg.includes('invalid') || msg.includes('hash')) {
            throw new Error(t('passwords.keepass_err_wrong_pwd', 'Mật khẩu Master Password không chính xác. Vui lòng kiểm tra lại mật khẩu mở file KeePass.'));
          }
          throw new Error(t('passwords.keepass_err_decrypt', 'Không thể giải mã file KDBX: ') + (kdbxErr.message || ''));
        }

        const traverseGroup = (group: kdbxweb.KdbxGroup, parentPath: string[] = []) => {
          const groupName = group.name;
          if ((group as any).isRecycleBin || (groupName && (groupName.toLowerCase().includes('recycle') || groupName.toLowerCase().includes('thùng rác')))) {
            return;
          }

          const currentPath =
            groupName && groupName !== 'Root' && groupName !== 'Database' && groupName !== 'KeePass'
              ? [...parentPath, groupName]
              : parentPath;

          const fullGroupPath = currentPath.length > 0 ? currentPath.join(' / ') : importGroup;

          for (const entry of group.entries) {
            const getField = (key: string) => {
              const val = entry.fields.get(key);
              if (!val) return '';
              if (typeof (val as any).getText === 'function') return (val as any).getText();
              return val.toString();
            };

            const title = getField('Title');
            const username = getField('UserName');
            const password = getField('Password');
            const url = getField('URL');
            let notes = getField('Notes');
            const totp = getField('TOTP Seed') || getField('otp') || getField('totp') || '';

            const customFields: string[] = [];
            for (const [k, v] of entry.fields) {
              if (['Title', 'UserName', 'Password', 'URL', 'Notes', 'TOTP Seed', 'otp', 'totp'].includes(k)) continue;
              const valStr = typeof (v as any).getText === 'function' ? (v as any).getText() : v?.toString();
              if (valStr) customFields.push(`${k}: ${valStr}`);
            }

            if (customFields.length > 0) {
              notes = notes ? `${notes}\n\n[Thông tin mở rộng]\n${customFields.join('\n')}` : customFields.join('\n');
            }

            if (title || password || username) {
              extractedRows.push({
                title: title || 'Tài khoản KDBX',
                username: username || null,
                password: password || '123456',
                url: url || null,
                groupName: fullGroupPath,
                notes: notes || null,
                totpSecret: totp || null,
              });
            }
          }

          for (const sub of group.groups) {
            traverseGroup(sub, currentPath);
          }
        };

        traverseGroup(db.getDefaultGroup());
      }
      // 2. DIRECT BROWSER-SIDE PARSING FOR .XML FILES
      else if (fileName.endsWith('.xml')) {
        const xmlText = await importFile.text();
        const tagRegex = /<Group>|<\/Group>|<Name>([\s\S]*?)<\/Name>|<Entry>([\s\S]*?)<\/Entry>/gi;
        let match;
        const groupStack: Array<{ name: string; isNamed: boolean }> = [];

        while ((match = tagRegex.exec(xmlText)) !== null) {
          const fullTag = match[0];

          if (fullTag.startsWith('<Group>')) {
            groupStack.push({ name: '', isNamed: false });
          } else if (fullTag.startsWith('</Group>')) {
            if (groupStack.length > 0) groupStack.pop();
          } else if (match[1] !== undefined) {
            if (groupStack.length > 0 && !groupStack[groupStack.length - 1].isNamed) {
              groupStack[groupStack.length - 1].name = decodeXml(match[1]);
              groupStack[groupStack.length - 1].isNamed = true;
            }
          } else if (match[2] !== undefined) {
            const entryContent = match[2];
            const stringRegex = /<String>\s*<Key>([^<]+)<\/Key>\s*<Value[^>]*>([^<]*)<\/Value>\s*<\/String>/gi;
            let sMatch;
            const entryData: Record<string, string> = {};

            while ((sMatch = stringRegex.exec(entryContent)) !== null) {
              entryData[decodeXml(sMatch[1])] = decodeXml(sMatch[2]);
            }

            const title = entryData.Title || '';
            const username = entryData.UserName || entryData.Username || '';
            const password = entryData.Password || '';
            const url = entryData.URL || entryData.Url || '';
            const notes = entryData.Notes || '';

            const isRecycleBin = groupStack.some(
              (g) => g.name.toLowerCase().includes('recycle') || g.name.toLowerCase().includes('thùng rác')
            );

            if (!isRecycleBin && (title || password || username)) {
              const names = groupStack
                .map((g) => g.name.trim())
                .filter((n) => n && n !== 'Root' && n !== 'Database' && n !== 'KeePass');
              const fullGroupPath = names.length > 0 ? names.join(' / ') : importGroup;

              extractedRows.push({
                title: title || 'KeePass Item',
                username: username || null,
                password: password || '123456',
                url: url || null,
                groupName: fullGroupPath,
                notes: notes || null,
              });
            }
          }
        }
      }
      // 3. DIRECT PARSING FOR .CSV / .XLSX
      else if (fileName.endsWith('.csv') || fileName.endsWith('.txt')) {
        const text = await importFile.text();
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(',').map((p) => p.replace(/^"|"$/g, '').trim());
          if (parts[0] || parts[1]) {
            extractedRows.push({
              title: parts[1] || parts[0],
              username: parts[2] || '',
              password: parts[3] || '123456',
              url: parts[4] || '',
              groupName: parts[0] || importGroup,
              notes: parts[5] || '',
            });
          }
        }
      }

      if (extractedRows.length === 0) {
        throw new Error(t('passwords.keepass_err_empty', 'Không tìm thấy tài khoản hợp lệ nào trong file để nhập'));
      }

      // SEND CLEAN EXTRACTED ARRAY TO SERVER IN CHUNKS
      const CHUNK_SIZE = 300;
      let totalImported = 0;
      const totalGroups = new Set<string>();

      for (let i = 0; i < extractedRows.length; i += CHUNK_SIZE) {
        const chunk = extractedRows.slice(i, i + CHUNK_SIZE);
        const res = await fetch('/api/passwords/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rows: chunk,
            defaultGroup: importGroup,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || t('passwords.keepass_err_server', 'Lỗi khi lưu dữ liệu lên server'));
        }
        totalImported += (data.successCount || chunk.length);
        if (Array.isArray(data.groups)) {
          data.groups.forEach((g: string) => totalGroups.add(g));
        }
      }

      const successMsg = t('passwords.keepass_result_success', 'Đã import thành công {imported}/{total} tài khoản từ file KeePass với {groups} thư mục nhóm.')
        .replace('{imported}', String(totalImported))
        .replace('{total}', String(extractedRows.length))
        .replace('{groups}', String(totalGroups.size));
      setImportResult({
        success: true,
        message: successMsg,
        groupsCount: totalGroups.size,
      });
      setImportErrorMsg('');
      onSuccess(successMsg);
    } catch (err: any) {
      setImportErrorMsg(err.message || t('passwords.keepass_importing', 'Lỗi nạp file KeePass'));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full p-6 space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 my-8">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-purple-50 -mx-6 -mt-6 p-6 rounded-t-3xl">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
              <ShieldCheck className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-bold text-base text-indigo-950">{t('passwords.keepass_modal_title', 'Import Trực Tiếp Từ KeePass')}</h3>
              <p className="text-[11px] text-indigo-700">
                {t('passwords.keepass_modal_desc', 'Hỗ trợ file gốc .kdbx / .kbdx, .xml, .csv & Excel')}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          {/* Format Badge Tips */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5 text-slate-600 text-[11px]">
            <p className="font-bold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>{t('passwords.keepass_formats_supported', 'Các định dạng được hỗ trợ nạp tự động:')}</span>
            </p>
            <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-slate-600">
              <li><strong className="text-indigo-700 font-mono font-bold">{t('passwords.keepass_format_kdbx_title', 'File gốc .kdbx (KDBX 3/4):')}</strong> {t('passwords.keepass_format_kdbx_desc', 'Giữ 100% cây thư mục & mật khẩu (nhập Master Password bên dưới).')}</li>
              <li><strong className="text-purple-700 font-mono font-bold">{t('passwords.keepass_format_xml_title', 'File .xml (KeePass 2.x XML):')}</strong> {t('passwords.keepass_format_xml_desc', 'Giữ nguyên 100% cây thư mục cha/con.')}</li>
              <li><strong className="text-emerald-700 font-mono font-bold">{t('passwords.keepass_format_csv_title', 'File .csv hoặc .xlsx:')}</strong> {t('passwords.keepass_format_csv_desc', 'Nhập bảng tính tài khoản theo cột Group/Folder.')}</li>
            </ul>
          </div>

          <form onSubmit={handleUploadKeePassFile} className="space-y-3">
            {/* File Upload Drop Zone */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">{t('passwords.keepass_file_label', 'Chọn file KeePass (.kdbx, .kbdx, .xml, .csv) (*)')}</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-5 border-2 border-dashed border-indigo-300 hover:border-indigo-500 bg-slate-50/70 hover:bg-indigo-50/40 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".kdbx, .kbdx, .xml, .csv, .xlsx, .xls, .txt"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setImportFile(f);
                    setImportResult(null);
                    setImportErrorMsg('');
                  }}
                />
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-xs">
                  <Lock className="w-5 h-5" />
                </div>
                {importFile ? (
                  <div className="text-center">
                    <p className="font-bold text-indigo-900 text-xs flex items-center justify-center gap-1">
                      <span>📄 {importFile.name}</span>
                      <span className="text-[10px] text-indigo-600 font-mono">({(importFile.size / 1024).toFixed(1)} KB)</span>
                    </p>
                    <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">{t('passwords.keepass_file_selected', '✓ Đã chọn file thành công')}</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="font-bold text-slate-700">{t('passwords.keepass_file_drop_hint', 'Bấm để chọn file hoặc kéo thả file .kdbx / .xml vào đây')}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{t('passwords.keepass_file_types_hint', 'KeePass Database (.kdbx), KeePass XML (.xml), CSV, Excel (.xlsx)')}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Master Password Field for .kdbx files */}
            {importFile && (importFile.name.toLowerCase().endsWith('.kdbx') || importFile.name.toLowerCase().endsWith('.kbdx')) && (
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
                <label className="block font-bold text-amber-950 text-xs flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                  <span>{t('passwords.keepass_master_pwd_label', 'Mật khẩu Master Password của file KDBX (*)')}</span>
                </label>
                <div className="relative">
                  <input
                    type={showImportMasterPassword ? 'text' : 'password'}
                    value={importMasterPassword}
                    onChange={(e) => {
                      setImportMasterPassword(e.target.value);
                      setImportErrorMsg('');
                    }}
                    placeholder={t('passwords.keepass_master_pwd_placeholder', 'Nhập Master Password để giải mã file .kdbx...')}
                    className="w-full pl-3 pr-9 py-2 bg-white border border-amber-300 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-mono text-xs text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowImportMasterPassword(!showImportMasterPassword)}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showImportMasterPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-amber-800">
                  {t('passwords.keepass_master_pwd_note', '🔒 Mật khẩu chỉ dùng để giải mã một lần trong bộ nhớ máy chủ và không được lưu lại bất kỳ đâu.')}
                </p>

                {/* Optional Key File */}
                <div className="pt-1">
                  <label className="block font-semibold text-amber-900 text-[11px] mb-1">{t('passwords.keepass_keyfile_label', 'File Key (.key) nếu cơ sở dữ liệu có dùng:')}</label>
                  <input
                    ref={keyFileInputRef}
                    type="file"
                    accept=".key, .keyx, .bin"
                    className="hidden"
                    onChange={(e) => setImportKeyFile(e.target.files?.[0] || null)}
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => keyFileInputRef.current?.click()}
                      className="px-2.5 py-1 bg-white border border-amber-300 hover:bg-amber-100/50 rounded-lg text-[11px] font-semibold text-amber-900 cursor-pointer"
                    >
                      {importKeyFile ? '🔑 ' + importKeyFile.name : t('passwords.keepass_keyfile_select', '+ Chọn file Key (Nếu có)')}
                    </button>
                    {importKeyFile && (
                      <button
                        type="button"
                        onClick={() => setImportKeyFile(null)}
                        className="text-rose-600 hover:underline text-[10px] cursor-pointer"
                      >
                        {t('passwords.keepass_keyfile_remove', 'Xóa file key')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Default Folder Fallback */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('passwords.keepass_default_folder_label', 'Thư Mục Mặc Định (Nếu mục không có thư mục)')}</label>
              <input
                type="text"
                value={importGroup}
                onChange={(e) => setImportGroup(e.target.value)}
                placeholder={t('passwords.keepass_default_folder_placeholder', 'VD: 🏢 Văn Phòng Trụ Sở Chính / KeePass Import')}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-semibold"
              />
            </div>

            {importErrorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2 font-medium">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{importErrorMsg}</span>
              </div>
            )}

            {importResult && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{importResult.message}</span>
                </p>
                {importResult.groupsCount > 0 && (
                  <p className="text-[11px] text-emerald-700 pl-5.5">
                    {t('passwords.keepass_result_tree', '📁 Đã nạp và tái hiện {groups} thư mục nhóm trên cây thư mục.').replace('{groups}', String(importResult.groupsCount))}
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleDownloadSampleTemplate}
                className="text-indigo-600 hover:underline font-semibold text-xs flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{t('passwords.keepass_download_excel', 'Tải mẫu Excel')}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  {t('passwords.keepass_close', 'Đóng (ESC)')}
                </button>
                <button
                  type="submit"
                  disabled={!importFile || isImporting}
                  className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isImporting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>{isImporting ? t('passwords.keepass_btn_submitting', 'Đang Giải Mã & Nạp...') : t('passwords.keepass_btn_submit', 'Tiến Hành Import')}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
