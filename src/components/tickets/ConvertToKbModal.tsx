'use client';

import React, { useState, useEffect } from 'react';
import { BookOpen, X, Loader2 } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';

export interface ConvertToKbModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: any;
}

export function ConvertToKbModal({ isOpen, onClose, ticket }: ConvertToKbModalProps) {
  const { language } = useLanguage();
  const isEn = language === 'en';

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [teamScope, setTeamScope] = useState('PUBLIC');
  const [availableSupportTeams, setAvailableSupportTeams] = useState<any[]>([]);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    if (isOpen && ticket) {
      setTitle(`[Hướng dẫn xử lý] ${ticket.title}`);
      const solution =
        ticket.resolutionNotes ||
        (ticket.comments?.length > 0
          ? ticket.comments.map((c: any) => c.content).join('\n\n')
          : 'Sự cố đã được kiểm tra và xử lý thành công theo quy trình kỹ thuật.');
      setContent(`## 1. Hiện tượng & Vấn đề sự cố\n${ticket.description}\n\n## 2. Các bước xử lý / Khắc phục\n${solution}`);
      setTeamScope('PUBLIC');

      fetch('/api/support-teams')
        .then((r) => r.json())
        .then((res) => {
          if (res.success && Array.isArray(res.data)) {
            setAvailableSupportTeams(res.data);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, ticket]);

  if (!isOpen || !ticket) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setConverting(true);
      const res = await fetch(`/api/tickets/${ticket.id}/convert-to-kb`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customTitle: title.trim(),
          customContent: content,
          teamScope,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(
          isEn
            ? 'Published to Knowledge Base successfully!'
            : 'Đã đóng góp giải pháp vào Thư viện Tri thức (KB) thành công!'
        );
        onClose();
      } else {
        alert(data.error || (isEn ? 'Failed to publish article' : 'Lỗi xuất bản bài viết'));
      }
    } catch (err: any) {
      alert(err.message || (isEn ? 'Connection error' : 'Lỗi kết nối'));
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-xl w-full p-5 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] flex flex-col text-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-700">
              <BookOpen className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                <span>{isEn ? 'Convert Ticket to Knowledge Base Article' : 'Đóng Góp Giải Pháp Vào Thư Viện Hướng Dẫn (KB)'}</span>
                <span className="text-[10px] bg-indigo-100 text-indigo-800 font-black px-1.5 py-0.5 rounded">👑 Enterprise</span>
              </h3>
              <p className="text-xs text-slate-500">
                {isEn
                  ? 'Save this resolution as a reusable guide for the IT team & users'
                  : 'Lưu giải pháp xử lý sự cố này thành cẩm nang tra cứu cho toàn công ty'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 flex-1 overflow-y-auto pr-1">
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              {isEn ? 'Article Title (*)' : 'Tiêu đề bài viết (*)'}
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              {isEn ? 'Audience & IT Team Scope (*)' : 'Phạm vi hiển thị & Phân quyền riêng cho Team IT (*)'}
            </label>
            <select
              value={teamScope}
              onChange={(e) => setTeamScope(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white cursor-pointer"
            >
              <option value="PUBLIC">
                {isEn ? '🌐 Public (All employees & users across enterprise)' : '🌐 Công khai (Toàn bộ nhân viên & người dùng)'}
              </option>
              <option value="INTERNAL_IT">
                {isEn ? '🔒 All IT Teams (General IT internal only)' : '🔒 Toàn bộ đội ngũ IT (Nội bộ kỹ thuật chung)'}
              </option>

              <optgroup label={isEn ? '── Specific IT Teams ──' : '── Phân quyền riêng cho từng Team IT ──'}>
                <option value="IT-HELPDESK">🔒 Team Helpdesk / Hỗ trợ người dùng (IT-HELPDESK)</option>
                <option value="IT-NET">🔒 Team Hạ tầng mạng & Máy chủ (IT-NET)</option>
                <option value="IT-APP">🔒 Team Phần mềm & Ứng dụng ERP (IT-APP)</option>
                <option value="IT-SEC">🔒 Team An toàn thông tin & Bảo mật (IT-SEC)</option>
                {availableSupportTeams &&
                  availableSupportTeams.length > 0 &&
                  availableSupportTeams.map((t: any) => {
                    if (['IT-HELPDESK', 'IT-NET', 'IT-APP', 'IT-SEC'].includes(t.code)) return null;
                    return (
                      <option key={t.id} value={t.code || t.id}>
                        🔒 {t.name} ({t.code})
                      </option>
                    );
                  })}
              </optgroup>
            </select>
            <p className="text-[10px] text-slate-400 mt-1 italic">
              💡 {isEn
                ? 'Selecting a specific IT team will restrict visibility to members of that technical team.'
                : 'Chọn riêng một team IT sẽ giới hạn bài viết chỉ dành cho các kỹ thuật viên thuộc team đó tra cứu.'}
            </p>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              {isEn ? 'Solution Content (Markdown formatted)' : 'Nội dung hướng dẫn xử lý (Định dạng Markdown)'}
            </label>
            <textarea
              rows={8}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 cursor-pointer"
            >
              {isEn ? 'Cancel' : 'Hủy'}
            </button>
            <button
              type="submit"
              disabled={converting || !title.trim()}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              {converting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BookOpen className="w-3.5 h-3.5" />}
              <span>{isEn ? 'Publish Article' : 'Xuất Bản Vào Thư Viện'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
