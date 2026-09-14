'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Receipt,
  Download,
  ExternalLink,
  Copy,
  Check,
  Upload,
  Link as LinkIcon,
  X,
  Loader2,
  AlertCircle,
  FileSpreadsheet,
  Image as ImageIcon,
  FolderOpen,
  Plus,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { OfficeDocumentViewer } from '@/components/documents/office-document-viewer';
import { useLanguage } from '@/lib/i18n/context';

export interface DocumentQuickPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  entityType: 'license' | 'asset' | 'service';
  entityId: string;
  invoiceNumber?: string | null;
  contractNumber?: string | null;
  directUrl?: string | null;
  initialDocuments?: any[];
  onUpdateDirectUrl?: (newUrl: string) => Promise<void> | void;
  themeColor?: 'purple' | 'blue' | 'indigo' | 'emerald';
}

interface PreviewItem {
  id: string;
  name: string;
  url: string;
  type?: string;
  size?: number | null;
  source: 'direct' | 'document';
  invoiceNumber?: string | null;
  contractNumber?: string | null;
}

export function DocumentQuickPreviewModal({
  isOpen,
  onClose,
  title,
  subtitle,
  entityType,
  entityId,
  invoiceNumber,
  contractNumber,
  directUrl,
  initialDocuments = [],
  onUpdateDirectUrl,
  themeColor = 'purple',
}: DocumentQuickPreviewModalProps) {
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

  const { language, t, isEn, isJa } = useLanguage();
  const txt = (vi: string, en: string, ja: string) => isJa ? ja : (isEn ? en : vi);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<PreviewItem[]>([]);
  const [activeItemIndex, setActiveItemIndex] = useState(0);

  // Link input state
  const [isEditingLink, setIsEditingLink] = useState(false);
  const [urlInput, setUrlInput] = useState(directUrl || '');
  const [savingLink, setSavingLink] = useState(false);
  const [copied, setCopied] = useState(false);

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch documents matching entity or invoice/contract
  const loadDocuments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (entityType === 'license') params.append('licenseId', entityId);
      if (entityType === 'asset') params.append('assetId', entityId);
      if (entityType === 'service') params.append('serviceId', entityId);
      if (invoiceNumber) params.append('invoiceNumber', invoiceNumber);
      if (contractNumber) params.append('contractNumber', contractNumber);

      const res = await fetch(`/api/documents?${params.toString()}`);
      const data = await res.json();
      const docList = data.data || [];

      const parsedItems: PreviewItem[] = [];

      // 1. Direct URL if available
      if (directUrl && directUrl.trim()) {
        const cleanDirect = directUrl.trim();
        parsedItems.push({
          id: 'direct-link',
          name: cleanDirect.startsWith('http')
            ? (cleanDirect.includes('drive.google.com') ? 'Google Drive Link' : cleanDirect.includes('sharepoint.com') ? 'SharePoint Link' : txt('Link chứng từ trực tiếp', 'Direct Document Link', 'ダイレクト証憑リンク'))
            : cleanDirect.split('/').pop() || txt('Tệp chứng từ trực tiếp', 'Direct Document File', 'ダイレクト証憑ファイル'),
          url: cleanDirect,
          source: 'direct',
        });
      }

      // 2. Documents from repository
      docList.forEach((doc: any) => {
        if (Array.isArray(doc.attachments) && doc.attachments.length > 0) {
          doc.attachments.forEach((att: any, idx: number) => {
            if (att.url) {
              parsedItems.push({
                id: `${doc.id}-att-${idx}`,
                name: att.name || doc.title || `${txt('Tệp đính kèm', 'Attachment', '添付ファイル')} ${idx + 1}`,
                url: att.url,
                type: att.type,
                size: att.size,
                source: 'document',
                invoiceNumber: doc.invoiceNumber,
                contractNumber: doc.contractNumber,
              });
            }
          });
        } else if (doc.fileUrl) {
          parsedItems.push({
            id: doc.id,
            name: doc.fileName || doc.title || txt('Tệp chứng từ', 'Document File', '証憑ファイル'),
            url: doc.fileUrl,
            type: doc.fileType,
            size: doc.fileSize,
            source: 'document',
            invoiceNumber: doc.invoiceNumber,
            contractNumber: doc.contractNumber,
          });
        }
      });

      // Deduplicate by URL
      const uniqueItems: PreviewItem[] = [];
      const seenUrls = new Set<string>();
      for (const item of parsedItems) {
        if (!seenUrls.has(item.url)) {
          seenUrls.add(item.url);
          uniqueItems.push(item);
        }
      }

      setItems(uniqueItems);
      if (uniqueItems.length > 0) {
        setActiveItemIndex(0);
      }
    } catch (err) {
      console.error('Error fetching preview documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setUrlInput(directUrl || '');
      setIsEditingLink(false);
      loadDocuments();
    }
  }, [isOpen, entityId, directUrl, invoiceNumber, contractNumber]);

  if (!isOpen) return null;

  const activeItem = items[activeItemIndex] || items[0] || null;

  const isPdf = (url?: string, name?: string) => {
    const target = (name || url || '').toLowerCase();
    return target.endsWith('.pdf') || target.includes('.pdf?');
  };

  const isImage = (url?: string, name?: string) => {
    const target = (name || url || '').toLowerCase();
    return (
      target.endsWith('.png') ||
      target.endsWith('.jpg') ||
      target.endsWith('.jpeg') ||
      target.endsWith('.webp') ||
      target.endsWith('.gif') ||
      target.endsWith('.svg')
    );
  };

  const isOffice = (url?: string, name?: string) => {
    const target = (name || url || '').toLowerCase();
    return (
      target.endsWith('.docx') ||
      target.endsWith('.doc') ||
      target.endsWith('.xlsx') ||
      target.endsWith('.xls') ||
      target.endsWith('.csv') ||
      target.endsWith('.pptx') ||
      target.endsWith('.ppt')
    );
  };

  const isGoogleDrive = (url?: string) => {
    return (url || '').includes('drive.google.com');
  };

  const getEmbedUrl = (url: string) => {
    if (url.includes('drive.google.com/file/d/')) {
      return url.replace(/\/view(\?.*)?$/, '/preview');
    }
    return url;
  };

  const handleSaveDirectUrl = async () => {
    const clean = urlInput.trim();
    setSavingLink(true);
    try {
      if (onUpdateDirectUrl) {
        await onUpdateDirectUrl(clean);
      } else {
        const endpoint =
          entityType === 'license'
            ? `/api/licenses/${entityId}`
            : entityType === 'asset'
            ? `/api/assets/${entityId}`
            : `/api/services/${entityId}`;
        const payload =
          entityType === 'license'
            ? { contractUrl: clean }
            : entityType === 'asset'
            ? { invoiceUrl: clean }
            : { contractUrl: clean };

        await fetch(endpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      setIsEditingLink(false);
      await loadDocuments();
    } catch (e) {
      alert(txt('Không thể lưu đường dẫn chứng từ', 'Failed to save document URL', '証憑URLを保存できませんでした'));
    } finally {
      setSavingLink(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', 'doc');

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.url) {
        throw new Error(uploadData.error || 'Upload failed');
      }

      const uploadedUrl = uploadData.url;

      if (onUpdateDirectUrl) {
        await onUpdateDirectUrl(uploadedUrl);
      } else {
        const endpoint =
          entityType === 'license'
            ? `/api/licenses/${entityId}`
            : entityType === 'asset'
            ? `/api/assets/${entityId}`
            : `/api/services/${entityId}`;
        const payload =
          entityType === 'license'
            ? { contractUrl: uploadedUrl }
            : entityType === 'asset'
            ? { invoiceUrl: uploadedUrl }
            : { contractUrl: uploadedUrl };

        await fetch(endpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      try {
        await fetch('/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `${title} - ${file.name}`,
            type: invoiceNumber ? 'INVOICE' : 'CONTRACT',
            fileUrl: uploadedUrl,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            licenseId: entityType === 'license' ? entityId : undefined,
            assetId: entityType === 'asset' ? entityId : undefined,
            serviceId: entityType === 'service' ? entityId : undefined,
            invoiceNumber: invoiceNumber || undefined,
            contractNumber: contractNumber || undefined,
          }),
        });
      } catch (docErr) {
        console.warn('Auto doc registry non-blocking error:', docErr);
      }

      await loadDocuments();
    } catch (err: any) {
      alert(txt('Lỗi tải file: ', 'Upload error: ', 'アップロードエラー: ') + err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCopyLink = () => {
    if (!activeItem) return;
    const fullUrl = activeItem.url.startsWith('http')
      ? activeItem.url
      : `${window.location.origin}${activeItem.url}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const themeStyles = {
    purple: {
      badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200 border-purple-200 dark:border-purple-800',
      activeTab: 'bg-purple-600 text-white',
      btnPrimary: 'bg-purple-600 hover:bg-purple-700 text-white',
      accentText: 'text-purple-600 dark:text-purple-400',
    },
    blue: {
      badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 border-blue-200 dark:border-blue-800',
      activeTab: 'bg-blue-600 text-white',
      btnPrimary: 'bg-blue-600 hover:bg-blue-700 text-white',
      accentText: 'text-blue-600 dark:text-blue-400',
    },
    indigo: {
      badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800',
      activeTab: 'bg-indigo-600 text-white',
      btnPrimary: 'bg-indigo-600 hover:bg-indigo-700 text-white',
      accentText: 'text-indigo-600 dark:text-indigo-400',
    },
    emerald: {
      badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800',
      activeTab: 'bg-emerald-600 text-white',
      btnPrimary: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      accentText: 'text-emerald-600 dark:text-emerald-400',
    },
  }[themeColor];

  const searchKeyword = invoiceNumber || contractNumber || title;
  const repoSearchUrl = `/documents?search=${encodeURIComponent(searchKeyword)}`;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 md:p-5 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-6xl w-full overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 p-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3 truncate flex-1 pr-2">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-purple-400" />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-sm truncate">{title}</h3>
                {subtitle && (
                  <span className="px-2 py-0.5 bg-white/10 rounded-full text-[10px] text-slate-300 font-medium">
                    {subtitle}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-0.5 flex-wrap">
                {invoiceNumber && (
                  <span className="flex items-center gap-1">
                    <Receipt className="w-3 h-3 text-purple-400" />
                    <span>{txt('HĐ:', 'Inv:', '請求書:')} <strong>{invoiceNumber}</strong></span>
                  </span>
                )}
                {contractNumber && (
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3 text-purple-400" />
                    <span>{txt('Hợp đồng:', 'Contract:', '契約書:')} <strong>{contractNumber}</strong></span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {/* Direct Link / Edit Link toggle */}
            <button
              onClick={() => setIsEditingLink(!isEditingLink)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer"
              title={txt('Gắn hoặc chỉnh sửa link xem tài liệu online', 'Attach or edit online document link', 'オンライン証憑リンクの登録・編集')}
            >
              <LinkIcon className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">{txt('Gắn Link Xem', 'Attach Link', 'リンク登録')}</span>
            </button>

            {/* Direct File Upload button */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx,.pptx"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              title={txt('Tải trực tiếp file chứng từ lên hệ thống', 'Upload document file directly to system', 'システムに証憑ファイルを直接アップロード')}
            >
              {isUploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">{isUploading ? txt('Đang tải...', 'Uploading...', 'アップロード中...') : txt('Tải File Lên', 'Upload File', 'ファイルアップロード')}</span>
            </button>

            {/* Open in full Document Repository */}
            <a
              href={repoSearchUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer"
              title={txt('Mở trong Kho chứng từ ở tab mới (không đóng màn hình này)', 'Open in Document Archive in new tab', '新しいタブで証憑アーカイブを開く')}
            >
              <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">{txt('Kho Chứng Từ', 'Document Archive', '証憑アーカイブ')}</span>
            </a>

            {/* Close */}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 cursor-pointer"
              title={txt('Đóng (ESC)', 'Close (ESC)', '閉じる (ESC)')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Link Input Bar (collapsible) */}
        {isEditingLink && (
          <div className="bg-slate-800/90 px-4 py-2.5 border-b border-slate-700/80 flex items-center gap-2 flex-wrap animate-in slide-in-from-top duration-150">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1 shrink-0">
              <LinkIcon className="w-3.5 h-3.5 text-purple-400" />
              <span>{txt('Link xem trực tiếp (Google Drive / OneDrive / Web URL):', 'Direct Link (Google Drive / OneDrive / Web URL):', 'ダイレクトリンク (Google Drive / OneDrive / Web URL):')}</span>
            </span>
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder={txt('https://drive.google.com/... hoặc https://... đường dẫn xem file', 'https://drive.google.com/... or https://... direct document URL', 'https://drive.google.com/... または https://... 閲覧リンク')}
              className="flex-1 min-w-[240px] px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-purple-500"
            />
            <button
              onClick={handleSaveDirectUrl}
              disabled={savingLink}
              className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors shrink-0 disabled:opacity-50 flex items-center gap-1 cursor-pointer"
            >
              {savingLink ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              <span>{txt('Lưu Link', 'Save Link', 'リンクを保存')}</span>
            </button>
            <button
              onClick={() => setIsEditingLink(false)}
              className="px-2 py-1.5 rounded-xl text-slate-400 hover:text-white text-xs cursor-pointer"
            >
              {txt('Hủy', 'Cancel', 'キャンセル')}
            </button>
          </div>
        )}

        {/* File Tabs Bar (if items exist) */}
        {items.length > 0 && (
          <div className="bg-slate-800 px-4 py-2 flex items-center justify-between gap-2 overflow-x-auto border-t border-slate-700/60 scrollbar-none shrink-0">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <span className="text-[11px] font-bold text-slate-400 shrink-0 mr-1 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-purple-400" />
                <span>{txt('Danh sách chứng từ', 'Document List', '証憑一覧')} ({items.length}):</span>
              </span>
              {items.map((item, idx) => (
                <button
                  key={item.id || idx}
                  onClick={() => setActiveItemIndex(idx)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                    activeItemIndex === idx
                      ? themeStyles.activeTab
                      : 'bg-slate-700/70 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {isPdf(item.url, item.name) ? (
                    <FileText className="w-3.5 h-3.5 text-rose-400" />
                  ) : isImage(item.url, item.name) ? (
                    <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                  ) : isOffice(item.url, item.name) ? (
                    <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" />
                  ) : (
                    <LinkIcon className="w-3.5 h-3.5 text-amber-400" />
                  )}
                  <span className="max-w-[160px] truncate">{item.name}</span>
                </button>
              ))}
            </div>

            {/* Actions for current active item */}
            {activeItem && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleCopyLink}
                  className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                  title={txt('Sao chép link xem nhanh này để chia sẻ', 'Copy shareable preview link', '共有用プレビューリンクをコピー')}
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? txt('Đã chép link', 'Copied Link', 'コピー完了') : txt('Chép link', 'Copy Link', 'リンクをコピー')}</span>
                </button>
                <a
                  href={activeItem.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                  title={txt('Mở tệp này trong tab mới', 'Open this file in new tab', 'このファイルを新しいタブで開く')}
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>{txt('Mở tab mới', 'Open in Tab', '新しいタブ')}</span>
                </a>
                <a
                  href={activeItem.url}
                  download={activeItem.name}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-purple-700 hover:bg-purple-600 text-white text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                  title={txt('Tải tệp này về máy tính', 'Download this file to your computer', 'ファイルをPCにダウンロード')}
                >
                  <Download className="w-3 h-3" />
                  <span>{txt('Tải về', 'Download', 'ダウンロード')}</span>
                </a>
              </div>
            )}
          </div>
        )}

        {/* Viewer Body */}
        <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-2 overflow-hidden flex items-center justify-center relative">
          {loading ? (
            <div className="flex flex-col items-center justify-center space-y-3 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
              <p className="text-xs font-medium">{txt('Đang tải tài liệu chứng từ...', 'Loading document...', 'ドキュメントを読み込み中...')}</p>
            </div>
          ) : items.length === 0 ? (
            /* Empty State: Prompt to add link or upload */
            <div className="max-w-md w-full p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 flex items-center justify-center mx-auto">
                <FileText className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                  {txt('Chưa Có Chứng Từ Xem Nhanh', 'No Document for Quick Preview', 'クイックプレビュー可能な証憑がありません')}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {txt('Chưa tìm thấy file hóa đơn/hợp đồng trực tiếp cho mục này. Bạn có thể dán link xem tài liệu (Google Drive, OneDrive...) hoặc tải trực tiếp file chứng từ lên.', 'No direct invoice/contract file found for this item. You can paste an online link (Google Drive, OneDrive...) or upload files directly.', 'この項目の請求書または契約書ファイルが見つかりません。オンラインリンク (Google Drive、OneDrive等) を貼り付けるか、直接ファイルをアップロードしてください。')}
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={() => setIsEditingLink(true)}
                  className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-xs cursor-pointer"
                >
                  <LinkIcon className="w-4 h-4" />
                  <span>{txt('Gắn Link Xem Trực Tiếp (Online)', 'Attach Direct Link (Online)', 'オンラインリンクを登録')}</span>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-purple-600" />
                  <span>{txt('Tải File Chứng Từ Từ Máy Tính', 'Upload Document From Computer', 'PCからファイルをアップロード')}</span>
                </button>
                <a
                  href={repoSearchUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>{txt('Tìm trong Kho Chứng Từ Toàn Hệ Thống', 'Search in System Document Archive', 'システム証憑アーカイブで検索')}</span>
                </a>
              </div>
            </div>
          ) : activeItem && isPdf(activeItem.url, activeItem.name) ? (
            /* PDF Preview */
            <iframe
              src={activeItem.url}
              className="w-full h-full rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner bg-white"
              title={activeItem.name}
            />
          ) : activeItem && isImage(activeItem.url, activeItem.name) ? (
            /* Image Preview */
            <div className="max-h-full max-w-full overflow-auto p-4 flex items-center justify-center">
              <img
                src={activeItem.url}
                alt={activeItem.name}
                className="max-h-[72vh] max-w-full rounded-2xl object-contain shadow-xl border border-slate-200 dark:border-slate-800"
              />
            </div>
          ) : activeItem && isOffice(activeItem.url, activeItem.name) ? (
            /* Office Preview (Word, Excel, PowerPoint) */
            <div className="w-full h-full">
              <OfficeDocumentViewer
                url={activeItem.url}
                fileName={activeItem.name}
                className="w-full h-full"
              />
            </div>
          ) : activeItem && isGoogleDrive(activeItem.url) ? (
            /* Google Drive Preview */
            <div className="w-full h-full flex flex-col items-center justify-center relative">
              <iframe
                src={getEmbedUrl(activeItem.url)}
                className="w-full h-full rounded-2xl border border-slate-200 shadow-inner bg-white"
                title={activeItem.name}
                allow="autoplay"
              />
            </div>
          ) : (
            /* External link or fallback preview card */
            <div className="max-w-md w-full p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center mx-auto">
                <ExternalLink className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">
                  {activeItem?.name || txt('Tài liệu liên kết', 'Linked Document', '関連ドキュメント')}
                </h4>
                <p className="text-xs text-slate-500 font-mono mt-1 break-all bg-slate-50 dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                  {activeItem?.url}
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <a
                  href={activeItem?.url}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-xs cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>{txt('Mở Xem Ngay (Tab Mới)', 'Open Now (New Tab)', '開く (新しいタブ)')}</span>
                </a>
                <button
                  onClick={handleCopyLink}
                  className="w-full py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? txt('Đã Sao Chép Link', 'Link Copied', 'リンクをコピーしました') : txt('Sao Chép Link Xem', 'Copy Link', 'リンクをコピー')}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
