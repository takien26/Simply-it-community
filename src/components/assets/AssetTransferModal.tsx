'use client';

import React, { useState, useEffect } from 'react';
import {
  ArrowLeftRight,
  UserCheck,
  X,
  History,
  Check,
  Loader2,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';

interface AssetTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: any | null;
  users: any[];
  locations: any[];
  companies: any[];
  onUserCreated?: (newUser: any) => void;
  onSuccess: (asset: any, actionType: 'TRANSFER' | 'RECLAIM') => void;
}

export const AssetTransferModal: React.FC<AssetTransferModalProps> = ({
  isOpen,
  onClose,
  asset,
  users,
  locations,
  companies,
  onUserCreated,
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

  const { language, t, isEn, isJa } = useLanguage();
  const txt = (vi: string, en: string, ja: string) => isJa ? ja : (isEn ? en : vi);
  const formatDateI18n = (d?: string | null) => {
    if (!d) return '—';
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return d;
    return dateObj.toLocaleDateString(isJa ? 'ja-JP' : (isEn ? 'en-US' : 'vi-VN'));
  };
  const [transferHistory, setTransferHistory] = useState<any[]>([]);
  const [transferUserSearch, setTransferUserSearch] = useState('');
  const [isTransferUserDropdownOpen, setIsTransferUserDropdownOpen] = useState(false);
  const [transferError, setTransferError] = useState('');
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);

  // Quick user creation inside transfer
  const [isQuickAddUserOpen, setIsQuickAddUserOpen] = useState(false);
  const [quickAddUserName, setQuickAddUserName] = useState('');
  const [quickAddUserEmail, setQuickAddUserEmail] = useState('');
  const [quickAddUserDept, setQuickAddUserDept] = useState('');
  const [isSubmittingQuickUser, setIsSubmittingQuickUser] = useState(false);

  const [transferForm, setTransferForm] = useState<{
    actionType: 'TRANSFER' | 'RECLAIM';
    toUserId: string;
    transferDate: string;
    condition: string;
    locationId: string;
    companyName: string;
    notes: string;
  }>({
    actionType: 'TRANSFER',
    toUserId: '',
    transferDate: new Date().toISOString().split('T')[0],
    condition: 'GOOD',
    locationId: '',
    companyName: '',
    notes: '',
  });

  useEffect(() => {
    if (isOpen && asset) {
      setTransferForm({
        actionType: 'TRANSFER',
        toUserId: '',
        transferDate: new Date().toISOString().split('T')[0],
        condition: asset.condition || 'GOOD',
        locationId: asset.locationId || '',
        companyName: asset.companyName || '',
        notes: '',
      });
      setTransferUserSearch('');
      setIsTransferUserDropdownOpen(false);
      setTransferError('');
      setTransferHistory([]);

      // Fetch transfer history
      fetch(`/api/assets/${asset.id}/transfer`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setTransferHistory(data.data?.history || []);
          }
        })
        .catch(() => console.error('Failed to load transfer history'));
    }
  }, [isOpen, asset]);

  if (!isOpen || !asset) return null;

  const currentActiveAssignment = asset.assignments?.find((a: any) => a.returnedAt === null);

  const handleQuickCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddUserName.trim()) return;
    setIsSubmittingQuickUser(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: quickAddUserName.trim(),
          email: quickAddUserEmail.trim() || undefined,
          department: quickAddUserDept.trim() || undefined,
          role: 'USER',
        }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        onUserCreated?.(data.user);
        setTransferForm((prev) => ({ ...prev, toUserId: data.user.id }));
        setTransferUserSearch(data.user.fullName);
        setIsQuickAddUserOpen(false);
        setQuickAddUserName('');
        setQuickAddUserEmail('');
        setQuickAddUserDept('');
      } else {
        setTransferError(data.error || txt('Thêm nhanh nhân sự thất bại', 'Failed to quick add staff', '担当者の簡易追加に失敗しました'));
      }
    } catch {
      setTransferError(txt('Lỗi kết nối khi thêm nhân sự', 'Connection error while adding staff', '担当者追加中に接続エラーが発生しました'));
    } finally {
      setIsSubmittingQuickUser(false);
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asset) return;

    if (transferForm.actionType === 'TRANSFER' && !transferForm.toUserId) {
      setTransferError(txt('Vui lòng chọn nhân sự mới tiếp nhận thiết bị (*)', 'Please select the new recipient (*)', '新しい受取担当者を選択してください (*)'));
      return;
    }

    setIsSubmittingTransfer(true);
    setTransferError('');

    try {
      const res = await fetch(`/api/assets/${asset.id}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType: transferForm.actionType,
          toUserId: transferForm.actionType === 'TRANSFER' ? transferForm.toUserId : '',
          transferDate: transferForm.transferDate,
          condition: transferForm.condition,
          locationId: transferForm.locationId,
          companyName: transferForm.companyName,
          notes: transferForm.notes,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        onSuccess(asset, transferForm.actionType);
      } else {
        setTransferError(data.error || txt('Điều chuyển thất bại', 'Transfer failed', '機器の異動に失敗しました'));
      }
    } catch {
      setTransferError(txt('Lỗi kết nối khi điều chuyển', 'Connection error during transfer', '異動処理中に接続エラーが発生しました'));
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-5xl w-full flex flex-col max-h-[92vh] border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header (1 Line Slim) */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-900 text-white rounded-t-3xl shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="px-2 py-0.5 bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 rounded-lg text-xs font-mono font-bold shrink-0">
              [{asset.assetTag}]
            </span>
            <h3 className="font-bold text-sm text-white truncate">
              {txt('Điều chuyển & Bàn giao thiết bị', 'Asset Transfer & Handover', '機器受渡・異動管理')}
            </h3>
            <span className="text-slate-400 text-xs truncate hidden sm:inline">
              • {asset.name} {asset.brand ? `(${asset.brand})` : ''}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Split-View Body (2 Columns) */}
        <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto flex-1">
          {/* Left Column: Form (7/12) */}
          <div className="lg:col-span-7 space-y-4 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 pb-6 lg:pb-0 lg:pr-6">
            <form id="transfer-asset-form" onSubmit={handleTransferSubmit} className="space-y-4">
              {/* Action Type: Chuyển giao vs Thu hồi */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setTransferForm((prev) => ({ ...prev, actionType: 'TRANSFER' }))}
                  className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    transferForm.actionType === 'TRANSFER'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  <span>{txt('Bàn giao / Đổi người dùng', 'Assign / Transfer User', '受渡 / 利用者変更')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTransferForm((prev) => ({ ...prev, actionType: 'RECLAIM' }))}
                  className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    transferForm.actionType === 'RECLAIM'
                      ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-300 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>{txt('Thu hồi về kho IT', 'Revoke to IT Inventory', 'IT機器倉庫へ回収')}</span>
                </button>
              </div>

              {/* Current Status Box */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 block text-[10.5px]">{txt('Người đang phụ trách:', 'Currently Assigned To:', '現在の担当者:')}</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {currentActiveAssignment?.user ? (
                      `${currentActiveAssignment.user.fullName} (${currentActiveAssignment.user.department || txt('Chưa rõ phòng ban', 'No Department', '部署未設定')})`
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 italic">{txt('Đang ở trong kho (Chưa bàn giao)', 'In Storage (Unassigned)', '倉庫待機中 (未割当)')}</span>
                    )}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10.5px]">{txt('Tình trạng hiện tại:', 'Current Condition:', '現在の状態:')}</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">
                    {asset.status || 'AVAILABLE'}
                  </span>
                </div>
              </div>

              {/* Error banner */}
              {transferError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{transferError}</span>
                </div>
              )}

              {/* Receiver (if TRANSFER action) */}
              {transferForm.actionType === 'TRANSFER' && (
                <div className="space-y-1.5 relative">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {txt('Người nhận thiết bị mới (*)', 'New Recipient (*)', '新しい受取者 (*)')}
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsQuickAddUserOpen(!isQuickAddUserOpen)}
                      className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{isQuickAddUserOpen ? txt('Đóng thêm nhanh', 'Close Quick Add', '閉じる') : txt('+ Thêm nhân sự mới', '+ Quick Add Staff', '+ 担当者を簡易追加')}</span>
                    </button>
                  </div>

                  {/* Quick Add User Subform */}
                  {isQuickAddUserOpen && (
                    <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl space-y-2.5 animate-in fade-in duration-100">
                      <div className="text-[11px] font-bold text-indigo-900 dark:text-indigo-200">
                        {txt('Thêm nhanh nhân sự mới vào hệ thống:', 'Quick add new staff member:', '担当者をシステムに簡易追加:')}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          placeholder={txt('Họ và tên (*)', 'Full Name (*)', '氏名 (*)')}
                          value={quickAddUserName}
                          onChange={(e) => setQuickAddUserName(e.target.value)}
                          className="p-1.5 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <input
                          type="email"
                          placeholder={txt('Email công ty', 'Company Email', '会社メールアドレス')}
                          value={quickAddUserEmail}
                          onChange={(e) => setQuickAddUserEmail(e.target.value)}
                          className="p-1.5 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <input
                          type="text"
                          placeholder={txt('Phòng ban', 'Department', '所属部署')}
                          value={quickAddUserDept}
                          onChange={(e) => setQuickAddUserDept(e.target.value)}
                          className="p-1.5 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleQuickCreateUser}
                          disabled={isSubmittingQuickUser || !quickAddUserName.trim()}
                          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                        >
                          {isSubmittingQuickUser ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                          <span>{txt('Lưu & Chọn nhân sự này', 'Save & Select Staff', '保存して選択')}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* User Search & Dropdown Select */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={txt('Gõ tìm kiếm họ tên, email hoặc phòng ban...', 'Search name, email or department...', '氏名、メール、部署で検索...')}
                      value={transferUserSearch}
                      onChange={(e) => {
                        setTransferUserSearch(e.target.value);
                        setIsTransferUserDropdownOpen(true);
                      }}
                      onFocus={() => setIsTransferUserDropdownOpen(true)}
                      className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                    />

                    {isTransferUserDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl max-h-48 overflow-y-auto z-20 p-1 space-y-0.5">
                        {users
                          .filter((u) => {
                            const query = transferUserSearch.toLowerCase();
                            return (
                              u.fullName.toLowerCase().includes(query) ||
                              (u.email && u.email.toLowerCase().includes(query)) ||
                              (u.department && u.department.toLowerCase().includes(query))
                            );
                          })
                          .slice(0, 15)
                          .map((u) => (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => {
                                setTransferForm((prev) => ({ ...prev, toUserId: u.id }));
                                setTransferUserSearch(`${u.fullName} (${u.department || txt('Chưa rõ phòng ban', 'No Department', '部署未設定')})`);
                                setIsTransferUserDropdownOpen(false);
                              }}
                              className="w-full text-left px-3 py-1.5 rounded-xl text-xs hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors flex items-center justify-between cursor-pointer"
                            >
                              <span className="font-bold text-slate-800 dark:text-slate-200">{u.fullName}</span>
                              <span className="text-[11px] text-slate-400">{u.department || u.email || ''}</span>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Form Grid: Date, Condition, Location, Company */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {txt('Ngày bàn giao / thu hồi', 'Handover / Return Date', '受渡 / 回収日')}
                  </label>
                  <input
                    type="date"
                    value={transferForm.transferDate}
                    onChange={(e) => setTransferForm((prev) => ({ ...prev, transferDate: e.target.value }))}
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {txt('Tình trạng thiết bị lúc bàn giao', 'Condition at Handover', '受渡時の機器状態')}
                  </label>
                  <select
                    value={transferForm.condition}
                    onChange={(e) => setTransferForm((prev) => ({ ...prev, condition: e.target.value }))}
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="NEW">{txt('Mới 100%', 'Brand New (100%)', '新品 (100%)')}</option>
                    <option value="GOOD">{txt('Tốt (Đang dùng ổn định)', 'Good (Stable)', '良好 (安定稼働)')}</option>
                    <option value="FAIR">{txt('Khá (Có xước xát nhẹ)', 'Fair (Minor scratches)', '普通 (小傷あり)')}</option>
                    <option value="POOR">{txt('Kém (Cần sửa chữa)', 'Poor (Needs Repair)', '要修理')}</option>
                    <option value="DAMAGED">{txt('Hỏng / Lỗi', 'Damaged / Broken', '故障・破損')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {txt('Vị trí đặt máy / Văn phòng', 'Location / Office', '設置場所 / オフィス')}
                  </label>
                  <select
                    value={transferForm.locationId}
                    onChange={(e) => setTransferForm((prev) => ({ ...prev, locationId: e.target.value }))}
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">{txt('-- Giữ nguyên hoặc không xác định --', '-- Keep current or unspecified --', '-- 変更なし / 未設定 --')}</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {txt('Công ty trực thuộc', 'Affiliated Company', '所属企業')}
                  </label>
                  <select
                    value={transferForm.companyName}
                    onChange={(e) => setTransferForm((prev) => ({ ...prev, companyName: e.target.value }))}
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">{txt('-- Giữ nguyên hoặc không chọn --', '-- Keep current or none --', '-- 変更なし / 未選択 --')}</option>
                    {companies.map((c: any) => (
                      <option key={c.id || c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {txt('Ghi chú điều chuyển / Bàn giao', 'Handover / Transfer Notes', '受渡・異動メモ')}
                </label>
                <textarea
                  rows={2}
                  placeholder={txt('Lý do điều chuyển, tình trạng phụ kiện đi kèm (sạc, chuột, balo...)...', 'Reason for transfer, accessories included (charger, mouse, bag...)...', '異動理由、付属アクセサリ状態 (充電器、マウス等)...')}
                  value={transferForm.notes}
                  onChange={(e) => setTransferForm((prev) => ({ ...prev, notes: e.target.value }))}
                  className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </form>
          </div>

          {/* Right Column: Transfer History Timeline (5/12) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <History className="w-4 h-4 text-indigo-600" />
              <h4 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                {txt('Lịch sử luân chuyển', 'Transfer History', '異動履歴')} ({transferHistory.length})
              </h4>
            </div>

            {transferHistory.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl space-y-1">
                <ArrowLeftRight className="w-6 h-6 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400">{txt('Chưa có lịch sử điều chuyển', 'No transfer history yet', '異動履歴はありません')}</p>
                <p className="text-[11px] text-slate-400">{txt('Thiết bị chưa từng đổi người dùng qua hệ thống.', 'Device has not had user reassignment recorded yet.', 'この機器の利用者変更履歴はありません。')}</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                {transferHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {item.toUser ? item.toUser.fullName : txt('Thu hồi về kho', 'Revoked to Inventory', '倉庫へ回収')}
                      </span>
                      <span className="text-[10.5px] font-mono text-slate-400">
                        📅 {new Date(item.assignedAt || item.transferDate).toLocaleDateString('vi-VN')}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center justify-between">
                      <span>{txt('Phòng:', 'Dept:', '部署:')} {item.toUser?.department || '—'}</span>
                      {item.returnedAt ? (
                        <span className="text-rose-500 text-[10px] font-semibold">
                          {txt('Đã trả ngày', 'Returned on', '返却日')} {formatDateI18n(item.returnedAt)}
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-bold text-[10px] bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded">
                          {txt('Đang phụ trách', 'Active Holding', '現在担当中')}
                        </span>
                      )}
                    </div>

                    {item.notes && (
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/60 p-2 rounded-xl">
                        {item.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Sticky Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 rounded-b-3xl shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 cursor-pointer"
          >
            {txt('Đóng (Esc)', 'Close (Esc)', '閉じる (Esc)')}
          </button>

          <button
            type="submit"
            form="transfer-asset-form"
            disabled={isSubmittingTransfer}
            className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5"
          >
            {isSubmittingTransfer ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            <span>{txt('Lưu điều chuyển', 'Save Transfer', '異動を保存')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
