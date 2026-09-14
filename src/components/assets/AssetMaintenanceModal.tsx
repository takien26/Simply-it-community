'use client';

import React, { useState, useEffect } from 'react';
import {
  Wrench,
  X,
  Plus,
  Save,
  History,
  Trash2,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n/context';


interface AssetMaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: any | null;
  users: any[];
  currencies: any[];
  onSuccess?: () => void;
}

export const AssetMaintenanceModal: React.FC<AssetMaintenanceModalProps> = ({
  isOpen,
  onClose,
  asset,
  users,
  currencies,
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
  const [maintenanceLogs, setMaintenanceLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [maintenanceForm, setMaintenanceForm] = useState<any>({
    type: 'UPGRADE',
    title: '',
    description: '',
    cost: '',
    costCurrency: 'VND',
    performedAt: new Date().toISOString().split('T')[0],
    performedById: '',
    vendorId: '',
    notes: '',
  });

  const formatPrice = (amount: number, currencyCode: string = 'VND') => {
    return formatCurrency(amount, currencyCode);
  };

  const fetchLogs = async (assetId: string) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/assets/${assetId}/maintenance`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setMaintenanceLogs(data.data);
      }
    } catch (err) {
      console.error('Lỗi khi tải lịch sử bảo trì:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && asset?.id) {
      setMaintenanceForm({
        type: 'UPGRADE',
        title: '',
        description: '',
        cost: '',
        costCurrency: asset.purchaseCurrency || 'VND',
        performedAt: new Date().toISOString().split('T')[0],
        performedById: '',
        vendorId: '',
        notes: '',
      });
      fetchLogs(asset.id);
    }
  }, [isOpen, asset?.id]);

  if (!isOpen || !asset) return null;

  const handleSaveMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asset?.id) return;
    try {
      const res = await fetch(`/api/assets/${asset.id}/maintenance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(maintenanceForm),
      });
      if (res.ok) {
        setMaintenanceForm({
          type: 'UPGRADE',
          title: '',
          description: '',
          cost: '',
          costCurrency: asset.purchaseCurrency || 'VND',
          performedAt: new Date().toISOString().split('T')[0],
          performedById: '',
          vendorId: '',
          notes: '',
        });
        await fetchLogs(asset.id);
        onSuccess?.();
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(txt(`❌ ${errorData.error || 'Lỗi khi lưu bảo trì'}`, `❌ ${errorData.error || 'Failed to save maintenance log'}`, `❌ ${errorData.error || '保守記録の保存に失敗しました'}`));
      }
    } catch {
      alert(txt('❌ Lỗi kết nối khi lưu bảo trì', '❌ Connection error while saving maintenance', '❌ 保守記録の保存中に接続エラーが発生しました'));
    }
  };

  const handleDeleteMaintenance = async (logId: string) => {
    if (!confirm(txt('Bạn có chắc muốn xóa bản ghi bảo trì này?', 'Are you sure you want to delete this maintenance record?', 'この保守記録を削除してもよろしいですか？'))) return;
    try {
      const res = await fetch(`/api/assets/${asset.id}/maintenance/${logId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchLogs(asset.id);
        onSuccess?.();
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(txt(`❌ ${errorData.error || 'Lỗi khi xóa bảo trì'}`, `❌ ${errorData.error || 'Failed to delete maintenance log'}`, `❌ ${errorData.error || '保守記録の削除に失敗しました'}`));
      }
    } catch {
      alert(txt('❌ Lỗi kết nối khi xóa bảo trì', '❌ Connection error while deleting maintenance', '❌ 保守記録の削除中に接続エラーが発生しました'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-6xl w-full flex flex-col max-h-[92vh] border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-900 text-white rounded-t-3xl shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="p-1.5 bg-amber-500 text-slate-950 rounded-xl shadow-xs shrink-0">
              <Wrench className="w-4 h-4 font-bold" />
            </span>
            <div>
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <span>{txt('Nhật Ký Bảo Trì & Sửa Chữa', 'Maintenance & Repair Log', '保守・修理日誌')}</span>
                <span className="font-mono text-xs bg-amber-500/20 text-amber-300 border border-amber-400/30 px-2 py-0.2 rounded-md">
                  [{asset.assetTag}]
                </span>
              </h3>
              <p className="text-xs text-slate-400 truncate">
                {asset.name} {asset.brand ? `• ${asset.brand}` : ''} {asset.model ? `• ${asset.model}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Split-View Body (2 Columns) */}
        <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto flex-1">
          {/* Left Column (5/12): Add Maintenance Log Form */}
          <div className="lg:col-span-5 space-y-4 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 pb-6 lg:pb-0 lg:pr-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <span className="p-1 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 rounded-lg">
                  <Plus className="w-3.5 h-3.5" />
                </span>
                <h4 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                  {txt('Ghi nhận bảo dưỡng / Sửa chữa mới', 'Record New Maintenance / Repair', '新規保守・修理の記録')}
                </h4>
              </div>

              <form id="maintenance-form" onSubmit={handleSaveMaintenance} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {txt('Loại can thiệp / dịch vụ (*)', 'Service / Action Type (*)', '対応種別 / サービス (*)')}
                  </label>
                  <select
                    value={maintenanceForm.type}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, type: e.target.value })}
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="UPGRADE">{txt('🚀 Nâng cấp phần cứng (RAM/SSD/...)', '🚀 Hardware Upgrade (RAM/SSD/...)', '🚀 ハードウェア増設・換装 (RAM/SSD等)')}</option>
                    <option value="REPAIR">{txt('🔧 Sửa chữa hỏng hóc', '🔧 Repair / Fix', '🔧 故障修理')}</option>
                    <option value="CLEANING">{txt('🧼 Vệ sinh, tra keo tản nhiệt', '🧼 Cleaning & Thermal Paste', '🧼 清掃・CPUグリス塗り直し')}</option>
                    <option value="SOFTWARE_UPDATE">{txt('💻 Cài đặt lại OS / Phần mềm', '💻 Reinstall OS / Software', '💻 OS再インストール・ソフト設定')}</option>
                    <option value="INSPECTION">{txt('🔍 Kiểm tra định kỳ', '🔍 Periodic Inspection', '🔍 定期点検・動作確認')}</option>
                    <option value="OTHER">{txt('📝 Can thiệp khác', '📝 Other Action', '📝 その他対応')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {txt('Tiêu đề / Nội dung vắn tắt (*)', 'Summary / Title (*)', '件名 / 対応概要 (*)')}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={txt('VD: Thay bàn phím mới, Nâng cấp 8GB RAM...', 'e.g. Replace keyboard, upgrade 8GB RAM...', '例: キーボード交換、8GB RAM増設...')}
                    value={maintenanceForm.title}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, title: e.target.value })}
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {txt('Chi phí', 'Cost', '費用')}
                    </label>
                    <input
                      type="number"
                      placeholder="VD: 850000"
                      value={maintenanceForm.cost}
                      onChange={(e) => setMaintenanceForm({ ...maintenanceForm, cost: e.target.value })}
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {txt('Đơn vị tiền', 'Currency', '通貨')}
                    </label>
                    <select
                      value={maintenanceForm.costCurrency || 'VND'}
                      onChange={(e) => setMaintenanceForm({ ...maintenanceForm, costCurrency: e.target.value })}
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      {currencies.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.code} ({c.symbol})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {txt('Ngày thực hiện', 'Date Performed', '実施日')}
                    </label>
                    <input
                      type="date"
                      value={maintenanceForm.performedAt}
                      onChange={(e) => setMaintenanceForm({ ...maintenanceForm, performedAt: e.target.value })}
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {txt('Kỹ thuật viên', 'Technician / Performed By', '作業担当者')}
                    </label>
                    <select
                      value={maintenanceForm.performedById}
                      onChange={(e) => setMaintenanceForm({ ...maintenanceForm, performedById: e.target.value })}
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="">{txt('-- Chọn nhân sự --', '-- Select Staff --', '-- 担当者を選択 --')}</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.fullName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {txt('Ghi chú chi tiết linh kiện / sửa chữa', 'Detailed Notes / Spare Parts Info', '詳細メモ / 交換部品情報')}
                  </label>
                  <textarea
                    rows={2}
                    placeholder={txt('Ghi chú linh kiện tháo ra, serial linh kiện mới, đơn vị sửa...', 'Removed parts notes, new component serial numbers, vendor info...', '取り外した部品、新品シリアル、修理業者名など...')}
                    value={maintenanceForm.description}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, description: e.target.value })}
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500 font-normal"
                  />
                </div>
              </form>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                form="maintenance-form"
                className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{txt('Lưu Phiếu Bảo Trì', 'Save Maintenance Record', '保守記録を保存')}</span>
              </button>
            </div>
          </div>

          {/* Right Column (7/12): History Timeline List */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-indigo-600" />
                <span>{txt('Lịch sử sửa chữa & bảo dưỡng', 'Maintenance & Repair History', '保守・修理履歴')} ({maintenanceLogs.length}):</span>
              </h4>
              {maintenanceLogs.length > 0 && (
                <span className="text-[11px] font-mono font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-lg">
                  {txt('Tổng:', 'Total:', '合計:')} {formatCurrency(maintenanceLogs.reduce((sum, l) => sum + (Number(l.cost) || 0), 0))}
                </span>
              )}
            </div>

            {maintenanceLogs.length === 0 ? (
              <div className="text-center py-16 bg-slate-50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl space-y-1.5">
                <Wrench className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isLoading ? txt('Đang tải lịch sử bảo trì...', 'Loading maintenance history...', '保守履歴を読み込み中...') : txt('Chưa có lịch sử bảo trì nào', 'No maintenance records found', '保守記録はありません')}
                </p>
                <p className="text-[11px] text-slate-400">{txt('Điền form bên trái để ghi nhận đợt bảo trì đầu tiên.', 'Fill out the form on the left to record the first maintenance entry.', '左のフォームを入力して最初の保守記録を登録してください。')}</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {maintenanceLogs.map((log) => {
                  const logTypeConfig = (() => {
                    switch (log.type) {
                      case 'UPGRADE':
                        return { label: txt('Nâng cấp', 'Upgrade', 'アップグレード'), badge: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800', icon: '🚀' };
                      case 'REPAIR':
                        return { label: txt('Sửa chữa', 'Repair', '修理'), badge: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800', icon: '🔧' };
                      case 'CLEANING':
                        return { label: txt('Bảo dưỡng', 'Maintenance', '点検・清掃'), badge: 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-800', icon: '🧼' };
                      case 'SOFTWARE_UPDATE':
                        return { label: txt('Cài phần mềm', 'Software', 'OS/ソフト'), badge: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800', icon: '💻' };
                      case 'INSPECTION':
                        return { label: txt('Kiểm tra', 'Inspection', '定期検査'), badge: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800', icon: '🔍' };
                      default:
                        return { label: txt('Ghi chú', 'Notes', 'その他メモ'), badge: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700', icon: '📝' };
                    }
                  })();

                  return (
                    <div
                      key={log.id}
                      className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.2 rounded-md border flex items-center gap-1 ${logTypeConfig.badge}`}>
                            <span>{logTypeConfig.icon}</span>
                            <span>{logTypeConfig.label}</span>
                          </span>
                          <span className="font-bold text-xs text-slate-900 dark:text-white">{log.title}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-slate-400">
                            📅 {new Date(log.performedAt).toLocaleDateString('vi-VN')}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteMaintenance(log.id)}
                            className="text-slate-300 hover:text-rose-600 p-0.5 rounded cursor-pointer transition-colors"
                            title={txt('Xóa phiếu', 'Delete record', '記録を削除')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {log.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-2 rounded-xl">
                          {log.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-[10.5px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-700/60">
                        <span>
                          KTV: <strong className="text-slate-700 dark:text-slate-300">{log.performedBy?.fullName || 'IT'}</strong>
                        </span>
                        <span className="font-bold font-mono text-amber-700 dark:text-amber-400">
                          {log.cost ? formatPrice(Number(log.cost), log.costCurrency || 'VND') : txt('Miễn phí', 'Free', '無料')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Sticky Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 rounded-b-3xl shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            {txt('Đóng (Esc)', 'Close (Esc)', '閉じる (Esc)')}
          </button>
        </div>
      </div>
    </div>
  );
};
