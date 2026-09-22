'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Upload,
  Loader2,
  CheckCircle2,
  Pencil,
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ImagePlus,
  Code,
  Lightbulb,
  AlertTriangle,
  Eye,
  FileText,
  Sparkles,
} from 'lucide-react';
import { KBArticleContent } from './KBArticleContent';

export interface KBEditorData {
  id?: string;
  title: string;
  teamScope?: string;
  category?: string;
  categoryKey?: string;
  summary?: string;
  content?: string;
  fileUrl?: string;
  fileName?: string;
}

interface KBEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: KBEditorData | null;
  onSaveSuccess: (updatedArticle?: any) => void;
  isEn: boolean;
}

export function KBEditorModal({
  isOpen,
  onClose,
  initialData,
  onSaveSuccess,
  isEn,
}: KBEditorModalProps) {
  const isEdit = Boolean(initialData?.id);

  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const [title, setTitle] = useState('');
  const [teamScope, setTeamScope] = useState('PUBLIC');
  const [category, setCategory] = useState('NETWORK');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [existingFileUrl, setExistingFileUrl] = useState<string | undefined>(undefined);
  const [existingFileName, setExistingFileName] = useState<string | undefined>(undefined);

  const [submitting, setSubmitting] = useState(false);
  const [uploadingInlineImage, setUploadingInlineImage] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inlineImageInputRef = useRef<HTMLInputElement>(null);
  const attachedFileInputRef = useRef<HTMLInputElement>(null);

  // Initialize or reset form data
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        const cleanTitle = initialData.title.replace(/^\[[a-zA-Z0-9_-]+\]\s*/, '');
        setTitle(cleanTitle);
        setTeamScope(initialData.teamScope || 'PUBLIC');
        setCategory(initialData.categoryKey || 'NETWORK');
        setSummary(initialData.summary || '');
        setContent(initialData.content || '');
        setExistingFileUrl(initialData.fileUrl);
        setExistingFileName(initialData.fileName);
      } else {
        setTitle('');
        setTeamScope('PUBLIC');
        setCategory('NETWORK');
        setSummary('');
        setContent('');
        setExistingFileUrl(undefined);
        setExistingFileName(undefined);
      }
      setAttachedFile(null);
      setActiveTab('write');
    }
  }, [isOpen, initialData]);

  // Insert text snippet at current cursor in textarea
  const insertSnippet = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const previousText = textarea.value;
    const selectedText = previousText.substring(start, end);

    const replacement = `${before}${selectedText || ''}${after}`;
    const newText = previousText.substring(0, start) + replacement + previousText.substring(end);

    setContent(newText);

    // Restore focus and cursor position
    setTimeout(() => {
      textarea.focus();
      const newCursor = start + before.length + (selectedText ? selectedText.length : 0);
      textarea.setSelectionRange(newCursor, newCursor);
    }, 50);
  };

  // Smart step insertion: auto-increments to Step 1, 2, 3...
  const insertNextStep = () => {
    const textarea = textareaRef.current;
    const currentText = textarea ? textarea.value : content;
    const start = textarea ? textarea.selectionStart : currentText.length;

    // Scan steps prior to cursor first to maintain sequential order
    const textBeforeCursor = currentText.substring(0, start);
    const matchesBefore = [...textBeforeCursor.matchAll(/(?:Bước|Step)\s*(\d+)/gi)];

    let nextNum = 1;
    if (matchesBefore.length > 0) {
      const lastNum = parseInt(matchesBefore[matchesBefore.length - 1][1], 10);
      nextNum = lastNum + 1;
    } else {
      const allMatches = [...currentText.matchAll(/(?:Bước|Step)\s*(\d+)/gi)];
      if (allMatches.length > 0) {
        const maxNum = Math.max(...allMatches.map((m) => parseInt(m[1], 10)));
        nextNum = maxNum + 1;
      }
    }

    const stepLabel = isEn ? `Step ${nextNum}: ` : `Bước ${nextNum}: `;

    // Insert newline if cursor is not already at line beginning
    let leading = '\n';
    if (start === 0 || currentText[start - 1] === '\n') {
      leading = '';
    }

    insertSnippet(`${leading}${stepLabel}`);
  };

  // Handle keyboard shortcuts (Enter auto-continues Step 1, 2, 3 or bullet lists)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const cursor = textarea.selectionStart;
      const text = textarea.value;

      // Find beginning of current line
      const lineStart = text.lastIndexOf('\n', cursor - 1) + 1;
      const lineEnd = text.indexOf('\n', cursor);
      const fullLine = text.substring(lineStart, lineEnd === -1 ? text.length : lineEnd);
      const textBeforeCursorInLine = text.substring(lineStart, cursor);

      // 1. Check for Step format: "Bước 1: ..." or "Step 1: ..."
      const stepMatch = textBeforeCursorInLine.match(/^((?:Bước|Step)\s*(\d+)[:.]\s*)(.*)$/i);
      if (stepMatch) {
        const prefix = stepMatch[1];
        const stepNum = parseInt(stepMatch[2], 10);
        const textAfterPrefix = stepMatch[3].trim();

        // If line is empty after prefix (user pressed Enter on empty "Bước X: "), clear step prefix
        if (textAfterPrefix.length === 0 && fullLine.trim() === prefix.trim()) {
          e.preventDefault();
          const newText = text.substring(0, lineStart) + text.substring(cursor);
          setContent(newText);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(lineStart, lineStart);
          }, 0);
          return;
        }

        // Auto-increment step on Enter
        e.preventDefault();
        const nextNum = stepNum + 1;
        const nextStepStr = isEn ? `\nStep ${nextNum}: ` : `\nBước ${nextNum}: `;
        const newText = text.substring(0, cursor) + nextStepStr + text.substring(cursor);
        setContent(newText);
        setTimeout(() => {
          textarea.focus();
          const nextCursor = cursor + nextStepStr.length;
          textarea.setSelectionRange(nextCursor, nextCursor);
        }, 0);
        return;
      }

      // 2. Check for Bullet list format: "- ..." or "* ..."
      const bulletMatch = textBeforeCursorInLine.match(/^((?:-|\*)\s+)(.*)$/);
      if (bulletMatch) {
        const bulletPrefix = bulletMatch[1];
        const textAfterBullet = bulletMatch[2].trim();

        if (textAfterBullet.length === 0 && fullLine.trim() === bulletPrefix.trim()) {
          e.preventDefault();
          const newText = text.substring(0, lineStart) + text.substring(cursor);
          setContent(newText);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(lineStart, lineStart);
          }, 0);
          return;
        }

        e.preventDefault();
        const nextBulletStr = '\n- ';
        const newText = text.substring(0, cursor) + nextBulletStr + text.substring(cursor);
        setContent(newText);
        setTimeout(() => {
          textarea.focus();
          const nextCursor = cursor + nextBulletStr.length;
          textarea.setSelectionRange(nextCursor, nextCursor);
        }, 0);
        return;
      }
    }
  };

  // Upload an image file to server and insert markdown tag
  const uploadAndInsertImage = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert(isEn ? 'Please select an image file (PNG, JPG, WebP, GIF)' : 'Vui lòng chọn file hình ảnh (PNG, JPG, WebP, GIF)');
      return;
    }

    setUploadingInlineImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.url) {
        const altName = file.name.replace(/\.[^/.]+$/, '');
        const imageMarkdown = `\n\n![${altName || 'Ảnh minh họa thao tác'}](${data.url})\n\n`;
        insertSnippet(imageMarkdown);
        setToastMsg(
          isEn
            ? '📸 Image inserted! Tip: Add |small or |medium to resize (e.g. ![Name|small](url))'
            : '📸 Đã chèn ảnh! Mẹo: Thêm |small hoặc |medium vào tên ảnh để đổi cỡ (VD: ![Tên ảnh|small](url))'
        );
        setTimeout(() => setToastMsg(null), 5000);
      } else {
        alert(data.error || (isEn ? 'Failed to upload image' : 'Lỗi khi tải ảnh lên'));
      }
    } catch (err: any) {
      alert(err.message || (isEn ? 'Connection error' : 'Lỗi kết nối tải ảnh'));
    } finally {
      setUploadingInlineImage(false);
    }
  };

  // Handle Ctrl+V paste image from clipboard
  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          await uploadAndInsertImage(file);
        }
        break;
      }
    }
  };

  // Handle drag & drop image file onto textarea
  const handleDrop = async (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        await uploadAndInsertImage(file);
      }
    }
  };

  // Handle form submission (Create or Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert(isEn ? 'Please enter article title' : 'Vui lòng nhập tiêu đề bài viết');
      return;
    }

    setSubmitting(true);
    try {
      let fileUrl = existingFileUrl;
      let fileName = existingFileName;

      // Upload attached document if provided
      if (attachedFile) {
        const formData = new FormData();
        formData.append('file', attachedFile);
        const upRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        }).then((r) => r.json());

        if (upRes.url) {
          fileUrl = upRes.url;
          fileName = attachedFile.name;
        }
      }

      const endpoint = isEdit ? `/api/kb/${initialData?.id}` : '/api/kb';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          teamScope,
          category,
          categoryKey: category,
          summary: summary.trim(),
          content: content.trim(),
          fileUrl,
          fileName,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onSaveSuccess(data.data);
        onClose();
      } else {
        alert(data.error || (isEn ? 'Failed to save article' : 'Lỗi khi lưu bài viết'));
      }
    } catch (err: any) {
      alert(err.message || (isEn ? 'Connection error' : 'Lỗi kết nối'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-3 sm:p-5 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-5xl w-full h-[92vh] flex flex-col border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/15 rounded-xl backdrop-blur-xs">
              {isEdit ? <Pencil className="w-5 h-5 text-white" /> : <Upload className="w-5 h-5 text-white" />}
            </div>
            <div>
              <h3 className="font-black text-sm tracking-wide">
                {isEdit
                  ? isEn
                    ? 'Edit Knowledge Base Article'
                    : 'Chỉnh Sửa Bài Viết Hướng Dẫn'
                  : isEn
                  ? 'Author New Knowledge Base Article'
                  : 'Soạn Thảo Bài Viết Hướng Dẫn Mới'}
              </h3>
              <p className="text-[11px] text-blue-100/90 font-medium">
                {isEn
                  ? 'Rich web article format • Paste images directly (Ctrl + V) • Step-by-step procedures'
                  : 'Định dạng bài viết web chuẩn • Dán ảnh trực tiếp (Ctrl + V) • Các bước thao tác'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* WRITE / PREVIEW TOGGLE */}
            <div className="bg-white/15 p-1 rounded-xl flex items-center gap-1 border border-white/20">
              <button
                type="button"
                onClick={() => setActiveTab('write')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'write'
                    ? 'bg-white text-blue-900 shadow-sm'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>{isEn ? 'Editor' : 'Soạn thảo'}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'preview'
                    ? 'bg-white text-blue-900 shadow-sm'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{isEn ? 'Live Preview' : 'Xem trước'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* TOAST NOTIFICATION IN MODAL */}
        {toastMsg && (
          <div className="mx-6 mt-3 p-3 bg-emerald-500 text-white rounded-xl shadow-md flex items-center justify-between text-xs font-bold animate-in slide-in-from-top duration-200">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {toastMsg}
            </span>
            <button type="button" onClick={() => setToastMsg(null)} className="cursor-pointer text-white/80 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* FORM BODY */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Row 1: Title */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 text-xs mb-1.5">
                {isEn ? 'Article Title' : 'Tiêu đề bài viết'} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder={
                  isEn
                    ? 'e.g. Cisco Switch Configuration Guide, WiFi Password Reset, MISA ERP Setup...'
                    : 'VD: Hướng dẫn cấu hình Switch Cisco, Cách kết nối WiFi công ty, Cài đặt phần mềm MISA...'
                }
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-blue-500 shadow-2xs"
              />
            </div>

            {/* Row 2: Team Scope & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 text-xs mb-1.5">
                  {isEn ? 'Visibility Scope & IT Team Permissions' : 'Phạm vi hiển thị & Phân quyền Team IT'} <span className="text-rose-500">*</span>
                </label>
                <select
                  value={teamScope}
                  onChange={(e) => setTeamScope(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 cursor-pointer shadow-2xs"
                >
                  <option value="PUBLIC">{isEn ? '🌍 All Employees (Public)' : '🌍 Tất cả Nhân viên (Public)'}</option>
                  <option value="IT-NET">{isEn ? '🔒 Team IT Network & Infra' : '🔒 Team IT Network & Hạ Tầng'}</option>
                  <option value="IT-APP">{isEn ? '🔒 Team IT Applications & ERP' : '🔒 Team IT Ứng Dụng & ERP'}</option>
                  <option value="IT-HELPDESK">{isEn ? '🔒 Team IT Helpdesk & Hardware' : '🔒 Team IT Helpdesk & Thiết Bị'}</option>
                  <option value="IT-SEC">{isEn ? '🔒 Team Security & Compliance' : '🔒 Team An Toàn & Bảo Mật'}</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 text-xs mb-1.5">
                  {isEn ? 'Category' : 'Danh mục chuyên môn'}
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 cursor-pointer shadow-2xs"
                >
                  <option value="NETWORK">{isEn ? 'Network & WiFi' : 'Hệ thống mạng & WiFi'}</option>
                  <option value="EMAIL">{isEn ? 'Email & Outlook' : 'Email & Outlook'}</option>
                  <option value="SOFTWARE">{isEn ? 'Software & ERP' : 'Phần mềm & ERP'}</option>
                  <option value="PRINTER">{isEn ? 'Printers & Scanners' : 'Máy in & Scan'}</option>
                  <option value="HARDWARE">{isEn ? 'Hardware & Devices' : 'Phần cứng & Thiết bị'}</option>
                  <option value="ACCOUNT">{isEn ? 'Accounts & Passwords' : 'Tài khoản & Mật khẩu'}</option>
                  <option value="MEETING">{isEn ? 'Meeting Room Tech' : 'Thiết bị Phòng Họp'}</option>
                  <option value="OTHER">{isEn ? 'Other Guides' : 'Hướng dẫn khác'}</option>
                </select>
              </div>
            </div>

            {/* Row 3: Short Summary */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 text-xs mb-1.5">
                {isEn ? 'Summary / Lead Paragraph' : 'Tóm tắt mục đích / Giới thiệu tổng quan'}
              </label>
              <input
                type="text"
                placeholder={
                  isEn
                    ? 'Describe purpose, symptoms, and who should apply this guide...'
                    : 'Mô tả ngắn gọn mục đích, triệu chứng lỗi và đối tượng áp dụng hướng dẫn này...'
                }
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-blue-500 shadow-2xs"
              />
            </div>

            {/* Row 4: Rich Article Content (Editor / Live Preview) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-700 dark:text-slate-300 text-xs flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>{isEn ? 'Article Body & Step-by-Step Instructions' : 'Nội dung bài viết & Các bước thực hiện'}</span>
                </label>
                <span className="text-[11px] text-slate-400">
                  {isEn
                    ? 'Tip: Paste screenshots (Ctrl + V) anywhere'
                    : '💡 Mẹo: Chụp màn hình rồi bấm Ctrl + V để dán ảnh trực tiếp'}
                </span>
              </div>

              {activeTab === 'write' ? (
                <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                  {/* QUICK TOOLBAR */}
                  <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 flex items-center flex-wrap gap-1 text-xs">
                    <button
                      type="button"
                      onClick={() => insertSnippet('**', '**')}
                      title={isEn ? 'Bold (Ctrl+B)' : 'Chữ đậm'}
                      className="p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                    >
                      <Bold className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertSnippet('*', '*')}
                      title={isEn ? 'Italic' : 'Chữ nghiêng'}
                      className="p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                    >
                      <Italic className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertSnippet('`', '`')}
                      title={isEn ? 'Inline Code / IP / Command' : 'Mã lệnh / Địa chỉ IP'}
                      className="p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                    >
                      <Code className="w-4 h-4" />
                    </button>

                    <div className="w-[1px] h-4 bg-slate-300 dark:bg-slate-700 mx-1" />

                    <button
                      type="button"
                      onClick={() => insertSnippet('\n## ')}
                      title={isEn ? 'Heading 2' : 'Tiêu đề mục lớn'}
                      className="p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer flex items-center gap-0.5"
                    >
                      <Heading2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertSnippet('\n### ')}
                      title={isEn ? 'Heading 3' : 'Tiêu đề mục nhỏ'}
                      className="p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer flex items-center gap-0.5"
                    >
                      <Heading3 className="w-4 h-4" />
                    </button>

                    <div className="w-[1px] h-4 bg-slate-300 dark:bg-slate-700 mx-1" />

                    <button
                      type="button"
                      onClick={insertNextStep}
                      title={isEn ? 'Numbered Step (auto-increments: 1, 2, 3...)' : 'Bước thực hiện đánh số (tự động tăng: 1, 2, 3...)'}
                      className="p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer flex items-center gap-1 font-bold"
                    >
                      <ListOrdered className="w-4 h-4 text-blue-600" />
                      <span className="text-[11px]">{isEn ? 'Step' : 'Bước'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => insertSnippet('\n- ')}
                      title={isEn ? 'Bullet List' : 'Danh sách chấm tròn'}
                      className="p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                    >
                      <List className="w-4 h-4" />
                    </button>

                    <div className="w-[1px] h-4 bg-slate-300 dark:bg-slate-700 mx-1" />

                    <button
                      type="button"
                      onClick={() => insertSnippet('\n> [!TIP] 💡 Mẹo: ')}
                      title={isEn ? 'Tip Callout' : 'Hộp Mẹo hữu ích'}
                      className="p-1.5 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 transition-colors cursor-pointer flex items-center gap-1 font-bold"
                    >
                      <Lightbulb className="w-4 h-4" />
                      <span className="text-[11px]">{isEn ? 'Tip' : 'Mẹo'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => insertSnippet('\n> [!WARNING] ⚠️ Cảnh báo: ')}
                      title={isEn ? 'Warning Callout' : 'Hộp Cảnh báo'}
                      className="p-1.5 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-950/50 text-amber-700 dark:text-amber-300 transition-colors cursor-pointer flex items-center gap-1 font-bold"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-[11px]">{isEn ? 'Warning' : 'Cảnh báo'}</span>
                    </button>

                    <div className="w-[1px] h-4 bg-slate-300 dark:bg-slate-700 mx-1" />

                    {/* INSERT IMAGE BUTTON */}
                    <button
                      type="button"
                      disabled={uploadingInlineImage}
                      onClick={() => inlineImageInputRef.current?.click()}
                      className="p-1.5 px-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 hover:bg-blue-100 font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      {uploadingInlineImage ? (
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      ) : (
                        <ImagePlus className="w-4 h-4 text-blue-600" />
                      )}
                      <span>{uploadingInlineImage ? (isEn ? 'Uploading...' : 'Đang tải...') : (isEn ? '+ Insert Image' : '+ Chèn Ảnh')}</span>
                    </button>

                    <input
                      type="file"
                      ref={inlineImageInputRef}
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadAndInsertImage(file);
                        e.target.value = '';
                      }}
                    />

                    {/* Image Size Guide Note for New Users */}
                    <div className="ml-auto hidden sm:flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                      <span className="font-bold text-blue-600 dark:text-blue-400">💡 {isEn ? 'Image Size:' : 'Cỡ ảnh:'}</span>
                      <span>{isEn ? 'Default (Full) • Add ' : 'Mặc định (Rộng) • Thêm '}</span>
                      <code className="text-pink-600 dark:text-pink-400 font-mono text-[10px] font-bold bg-pink-50 dark:bg-pink-950/60 px-1 py-0.5 rounded">|small</code>
                      <span>{isEn ? ' or ' : ' hoặc '}</span>
                      <code className="text-pink-600 dark:text-pink-400 font-mono text-[10px] font-bold bg-pink-50 dark:bg-pink-950/60 px-1 py-0.5 rounded">|medium</code>
                    </div>
                  </div>

                  {/* TEXTAREA WITH CTRL+V PASTE SUPPORT & SMART STEP / BULLET AUTO-CONTINUE */}
                  <textarea
                    ref={textareaRef}
                    rows={12}
                    placeholder={
                      isEn
                        ? 'Enter step 1, 2, 3 instructions...\n\n👉 Press Ctrl+V anytime to paste screenshots directly from your clipboard!\n👉 Image sizes: ![Image](url) (Full width, max-h 500px), ![Image|small](url) (Small/phone ~380px), ![Image|medium](url) (Medium ~670px)\n👉 Use ## for headings, > [!TIP] for tip boxes.'
                        : 'Nhập hướng dẫn từng bước 1, 2, 3...\n\n👉 Bấm Ctrl+V bất cứ lúc nào để dán ảnh chụp màn hình trực tiếp từ bộ nhớ tạm!\n👉 Chỉnh cỡ ảnh: ![Tên ảnh](url) (Mặc định toàn khung), ![Tên ảnh|small](url) (Cỡ nhỏ ~380px cho ảnh dọc/điện thoại/popup), ![Tên ảnh|medium](url) (Cỡ vừa ~670px)\n👉 Dùng ## để tạo tiêu đề mục, > [!TIP] để tạo hộp mẹo lưu ý, > [!WARNING] để tạo cảnh báo.'
                    }
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    onDrop={handleDrop}
                    className="w-full p-4 bg-transparent outline-none font-medium font-mono text-xs leading-relaxed resize-y text-slate-800 dark:text-slate-200 min-h-[260px]"
                  />
                </div>
              ) : (
                /* LIVE PREVIEW TAB */
                <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-6 bg-slate-50/50 dark:bg-slate-900 min-h-[300px] max-h-[450px] overflow-y-auto">
                  <div className="border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-200">
                      {category}
                    </span>
                    <h2 className="text-lg font-black text-slate-900 dark:text-white mt-2">
                      {title || (isEn ? 'Untitled Article' : 'Tiêu đề bài viết')}
                    </h2>
                    {summary && (
                      <div className="mt-2 p-3 bg-blue-50/70 dark:bg-blue-950/40 rounded-xl border border-blue-100 dark:border-blue-900/60 text-xs font-semibold text-blue-950 dark:text-blue-200">
                        {summary}
                      </div>
                    )}
                  </div>

                  {content ? (
                    <KBArticleContent content={content} />
                  ) : (
                    <div className="text-center py-10 text-slate-400 text-xs italic">
                      {isEn ? 'No content written yet. Switch back to Editor to write.' : 'Chưa có nội dung. Chuyển sang tab Soạn thảo để viết bài.'}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Row 5: Attach Document File (PDF, Word, Spec file) */}
            <div className="p-4 bg-slate-50/70 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700">
              <label className="block font-bold text-slate-700 dark:text-slate-300 text-xs mb-1">
                {isEn ? 'Attach Full Specification File (PDF, Word, Visio Diagram)' : 'Đính kèm File tài liệu quy trình đầy đủ (PDF, Word, Sơ đồ Visio)'}
              </label>
              {existingFileName && !attachedFile && (
                <div className="mb-2 text-[11px] text-slate-500 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  <span>{isEn ? 'Current file:' : 'File đính kèm hiện tại:'} <strong>{existingFileName}</strong></span>
                </div>
              )}
              <input
                type="file"
                ref={attachedFileInputRef}
                onChange={(e) => setAttachedFile(e.target.files?.[0] || null)}
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer text-xs"
              />
            </div>
          </div>

          {/* MODAL FOOTER */}
          <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between shrink-0">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>{isEn ? 'Supports Markdown, images & callouts' : 'Tự động định dạng Markdown, hình ảnh và khối lưu ý'}</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-xl cursor-pointer transition-colors"
              >
                {isEn ? 'Cancel' : 'Hủy'}
              </button>
              <button
                type="submit"
                disabled={submitting || !title.trim()}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer hover:scale-102 active:scale-98"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>
                  {submitting
                    ? isEn
                      ? 'Saving...'
                      : 'Đang lưu...'
                    : isEdit
                    ? isEn
                      ? 'Save Changes'
                      : 'Lưu Thay Đổi'
                    : isEn
                    ? 'Publish Article'
                    : 'Xuất Bản Bài Viết'}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
