'use client';

import React, { useState, useMemo } from 'react';
import {
  Building2,
  ArrowRightLeft,
  DollarSign,
  Users,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Layers,
  ChevronDown,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';
import { formatPrice } from './types';
import ExcelJS from 'exceljs';
import { useLanguage } from '@/lib/i18n/context';

interface CrossCompanyMatrixProps {
  licenses: any[];
  users: any[];
  companies: string[];
  selectedCurrency?: string;
  isEn?: boolean;
}

export function CrossCompanyMatrix({
  licenses,
  users,
  companies: initialCompanies,
  selectedCurrency = 'VND',
  isEn = false,
}: CrossCompanyMatrixProps) {
  const { t, language, isEn: ctxIsEn, isJa } = useLanguage();
  const effectiveIsEn = isEn || ctxIsEn;
  const [selectedSoftwareFilter, setSelectedSoftwareFilter] = useState<string>('ALL');

  // 1. Chuẩn hóa danh sách các công ty (bao gồm từ settings và từ dữ liệu license/user)
  const allCompanyNames = useMemo(() => {
    const set = new Set<string>();
    initialCompanies.forEach((c) => c && set.add(c.trim()));
    licenses.forEach((lic) => {
      if (lic.companyName) set.add(lic.companyName.trim());
      if (Array.isArray(lic.batches)) {
        lic.batches.forEach((b: any) => {
          if (b.companyName) set.add(b.companyName.trim());
        });
      }
    });
    users.forEach((u) => {
      if (u.companyName) set.add(u.companyName.trim());
      if (u.company) set.add(u.company.trim());
    });
    return Array.from(set).filter(Boolean);
  }, [initialCompanies, licenses, users]);

  // 2. Tạo map tra cứu nhanh thông tin User (id -> User Object)
  const userMap = useMemo(() => {
    const map = new Map<string, any>();
    users.forEach((u) => {
      if (u.id) map.set(u.id, u);
    });
    return map;
  }, [users]);

  // 3. Phẳng hóa toàn bộ các đợt license (bao gồm master license và các batches con)
  const flattenedLicenses = useMemo(() => {
    const list: any[] = [];
    licenses.forEach((lic) => {
      list.push(lic);
      if (Array.isArray(lic.batches) && lic.batches.length > 0) {
        lic.batches.forEach((b: any) => {
          list.push({
            ...b,
            _parentName: lic.name,
          });
        });
      }
    });
    return list;
  }, [licenses]);

  // 4. Danh sách các phần mềm độc lập để lọc
  const uniqueSoftwareNames = useMemo(() => {
    const set = new Set<string>();
    licenses.forEach((lic) => {
      if (lic.name) set.add(lic.name.trim());
    });
    return Array.from(set);
  }, [licenses]);

  // 5. Lọc danh sách license theo phần mềm được chọn
  const filteredLicenses = useMemo(() => {
    if (selectedSoftwareFilter === 'ALL') return flattenedLicenses;
    return flattenedLicenses.filter((lic) => {
      const matchName = lic.name?.toLowerCase().includes(selectedSoftwareFilter.toLowerCase());
      const matchParent = lic._parentName?.toLowerCase().includes(selectedSoftwareFilter.toLowerCase());
      return matchName || matchParent;
    });
  }, [flattenedLicenses, selectedSoftwareFilter]);

  // 6. TÍNH TOÁN MA TRẬN CUNG - CẦU & BÙ TRỪ NỘI BỘ
  const matrixData = useMemo(() => {
    // A. BÊN MUA: Thống kê số lượng ghế và chi phí do từng công ty bỏ tiền mua
    const buyerStats = new Map<
      string,
      {
        totalPurchased: number;
        totalCost: number;
        avgUnitPrice: number;
        licenseCount: number;
      }
    >();

    allCompanyNames.forEach((comp) => {
      buyerStats.set(comp, { totalPurchased: 0, totalCost: 0, avgUnitPrice: 0, licenseCount: 0 });
    });

    filteredLicenses.forEach((lic) => {
      const comp = lic.companyName?.trim() || t('licenses.matrix.unassigned_company', 'Chưa phân công ty');
      if (!buyerStats.has(comp)) {
        buyerStats.set(comp, { totalPurchased: 0, totalCost: 0, avgUnitPrice: 0, licenseCount: 0 });
      }
      const stat = buyerStats.get(comp)!;
      const seats = Number(lic.totalSeats) || 1;
      const price = Number(lic.purchasePrice) || 0;
      stat.totalPurchased += seats;
      stat.totalCost += price;
      stat.licenseCount += 1;
    });

    buyerStats.forEach((stat) => {
      stat.avgUnitPrice = stat.totalPurchased > 0 ? stat.totalCost / stat.totalPurchased : 0;
    });

    // B. BÊN SỬ DỤNG: Thống kê người dùng của từng công ty đang giữ ghế của bên nào
    const matrix: Record<string, Record<string, number>> = {};
    const userDetailList: Array<{
      userName: string;
      userEmail: string;
      userCompany: string;
      buyerCompany: string;
      licenseName: string;
      isCrossAssigned: boolean;
      unitPrice: number;
    }> = [];

    allCompanyNames.forEach((userComp) => {
      matrix[userComp] = {};
      allCompanyNames.forEach((buyerComp) => {
        matrix[userComp][buyerComp] = 0;
      });
    });

    filteredLicenses.forEach((lic) => {
      const buyerComp = lic.companyName?.trim() || t('licenses.matrix.unassigned_company', 'Chưa phân công ty');
      const assignments = Array.isArray(lic.assignments) ? lic.assignments : [];
      const unitPrice = (Number(lic.purchasePrice) || 0) / (Number(lic.totalSeats) || 1);

      assignments.forEach((asg: any) => {
        if (asg.revokedAt) return;
        const userObj = asg.userId ? userMap.get(asg.userId) : null;
        const userComp = userObj?.companyName?.trim() || userObj?.company?.trim() || t('licenses.matrix.unknown_company', 'Không rõ đơn vị');

        if (!matrix[userComp]) {
          matrix[userComp] = {};
          allCompanyNames.forEach((b) => {
            matrix[userComp][b] = 0;
          });
        }
        if (matrix[userComp][buyerComp] === undefined) {
          matrix[userComp][buyerComp] = 0;
        }

        matrix[userComp][buyerComp] += 1;

        userDetailList.push({
          userName: userObj?.name || asg.user?.name || t('licenses.matrix.default_user', 'Nhân sự'),
          userEmail: userObj?.email || asg.user?.email || '—',
          userCompany: userComp,
          buyerCompany: buyerComp,
          licenseName: lic.name,
          isCrossAssigned: userComp !== buyerComp,
          unitPrice,
        });
      });
    });

    // C. BẢNG CÂN ĐỐI TỔNG HỢP VÀ TÍNH TIỀN BÙ TRỪ (CHARGEBACK BALANCE)
    const companyBalances = allCompanyNames.map((comp) => {
      const bStat = buyerStats.get(comp) || { totalPurchased: 0, totalCost: 0, avgUnitPrice: 0, licenseCount: 0 };
      const purchased = bStat.totalPurchased;

      const userRow = matrix[comp] || {};
      const totalUsedByThisCompany = Object.values(userRow).reduce((sum, val) => sum + val, 0);
      const usedSelf = userRow[comp] || 0;

      let borrowedFromOthers = 0;
      let borrowedCost = 0;
      Object.entries(userRow).forEach(([otherBuyer, count]) => {
        if (otherBuyer !== comp && count > 0) {
          borrowedFromOthers += count;
          const otherUnitPrice = buyerStats.get(otherBuyer)?.avgUnitPrice || 0;
          borrowedCost += count * otherUnitPrice;
        }
      });

      let lentToOthers = 0;
      let lentRevenue = 0;
      Object.entries(matrix).forEach(([otherUserComp, row]) => {
        if (otherUserComp !== comp) {
          const count = row[comp] || 0;
          lentToOthers += count;
          lentRevenue += count * bStat.avgUnitPrice;
        }
      });

      const balanceSeats = purchased - totalUsedByThisCompany;
      const netChargebackAmount = lentRevenue - borrowedCost;

      return {
        companyName: comp,
        purchased,
        totalUsed: totalUsedByThisCompany,
        usedSelf,
        borrowedFromOthers,
        borrowedCost,
        lentToOthers,
        lentRevenue,
        balanceSeats,
        avgUnitPrice: bStat.avgUnitPrice,
        totalCost: bStat.totalCost,
        netChargebackAmount,
        status:
          balanceSeats > 0 ? 'SURPLUS' : balanceSeats < 0 ? 'DEFICIT' : 'EXACT',
      };
    });

    const totalPurchasedAll = companyBalances.reduce((acc, c) => acc + c.purchased, 0);
    const totalUsedAll = companyBalances.reduce((acc, c) => acc + c.totalUsed, 0);
    const totalCrossAssigned = companyBalances.reduce((acc, c) => acc + c.borrowedFromOthers, 0);
    const totalChargebackVolume = companyBalances.reduce((acc, c) => acc + Math.abs(c.netChargebackAmount), 0) / 2;

    return {
      buyerStats,
      matrix,
      companyBalances,
      userDetailList,
      kpis: {
        totalPurchased: totalPurchasedAll,
        totalUsed: totalUsedAll,
        utilizationRate: totalPurchasedAll > 0 ? (totalUsedAll / totalPurchasedAll) * 100 : 0,
        totalCrossAssigned,
        totalChargebackVolume,
      },
    };
  }, [allCompanyNames, filteredLicenses, userMap]);

  // Xuất Excel Báo Cáo Ma Trận & Quyết Toán Bù Trừ Tập Đoàn
  const handleExportExcel = async () => {
    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = 'Simply IT SAM Engine';

      // Sheet 1: Bảng Cân Đối Bù Trừ
      const ws1 = wb.addWorksheet(t('licenses.matrix.excel_sheet_settlement', 'Quyết Toán Bù Trừ'));
      ws1.columns = [
        { header: 'STT', key: 'stt', width: 6 },
        { header: t('licenses.matrix.col_company', 'Công Ty Thành Viên'), key: 'company', width: 30 },
        { header: t('licenses.matrix.col_purchased', 'Số Ghế Mua'), key: 'purchased', width: 15 },
        { header: t('licenses.matrix.col_used', 'Thực Dùng'), key: 'used', width: 15 },
        { header: t('licenses.matrix.col_self', 'Tự Dùng'), key: 'self', width: 15 },
        { header: t('licenses.matrix.col_borrowed', 'Đi Mượn'), key: 'borrowed', width: 15 },
        { header: t('licenses.matrix.col_lent', 'Cho Mượn'), key: 'lent', width: 15 },
        { header: t('licenses.matrix.col_balance', 'Cân Đối Ghế'), key: 'balance', width: 16 },
        { header: t('licenses.matrix.col_status', 'Trạng Thái Hạn Mức'), key: 'status', width: 22 },
        { header: t('licenses.matrix.col_avg_price', 'Đơn Giá Bình Quân'), key: 'avgPrice', width: 20 },
        { header: t('licenses.matrix.col_lent_revenue', 'Tiền Thu Về (Cho Mượn)'), key: 'lentRevenue', width: 24 },
        { header: t('licenses.matrix.col_borrowed_cost', 'Tiền Phải Trả (Đi Mượn)'), key: 'borrowedCost', width: 24 },
        { header: t('licenses.matrix.col_net', 'Quyết Toán Bù Trừ Ròng'), key: 'net', width: 25 },
      ];
      ws1.getRow(1).font = { bold: true };

      matrixData.companyBalances.forEach((c, idx) => {
        ws1.addRow({
          stt: idx + 1,
          company: c.companyName,
          purchased: c.purchased,
          used: c.totalUsed,
          self: c.usedSelf,
          borrowed: c.borrowedFromOthers,
          lent: c.lentToOthers,
          balance: c.balanceSeats > 0 ? `+${c.balanceSeats}` : c.balanceSeats,
          status: c.balanceSeats > 0 ? t('licenses.matrix.status_surplus', 'Dư hạn mức') : c.balanceSeats < 0 ? t('licenses.matrix.status_deficit', 'Dùng quá quota') : t('licenses.matrix.status_balanced', 'Cân bằng'),
          avgPrice: Math.round(c.avgUnitPrice),
          lentRevenue: Math.round(c.lentRevenue),
          borrowedCost: Math.round(c.borrowedCost),
          net: Math.round(c.netChargebackAmount),
        });
      });

      // Sheet 2: Ma trận 2D Cung - Cầu
      const ws2 = wb.addWorksheet(t('licenses.matrix.excel_sheet_2d', 'Ma Trận 2D Cung Cầu'));
      const headerRow2 = [t('licenses.matrix.col_user_buyer', 'Công Ty Dùng \\ Công Ty Mua'), ...allCompanyNames, t('licenses.matrix.col_total_used', 'Tổng Dùng')];
      ws2.addRow(headerRow2);
      ws2.getRow(1).font = { bold: true };

      allCompanyNames.forEach((userComp) => {
        const rowVals: any[] = [userComp];
        let totalRow = 0;
        allCompanyNames.forEach((buyerComp) => {
          const val = matrixData.matrix[userComp]?.[buyerComp] || 0;
          rowVals.push(val);
          totalRow += val;
        });
        rowVals.push(totalRow);
        ws2.addRow(rowVals);
      });

      // Sheet 3: Danh sách chi tiết nhân sự
      const ws3 = wb.addWorksheet(t('licenses.matrix.excel_sheet_users', 'Danh Sách Gán Chi Tiết'));
      ws3.columns = [
        { header: 'STT', key: 'stt', width: 6 },
        { header: t('licenses.matrix.col_user_name', 'Họ Và Tên'), key: 'name', width: 24 },
        { header: 'Email', key: 'email', width: 28 },
        { header: t('licenses.matrix.col_user_comp', 'Công Ty Nhân Sự'), key: 'userComp', width: 28 },
        { header: t('licenses.matrix.col_buyer_comp', 'Công Ty Chi Trả License'), key: 'buyerComp', width: 28 },
        { header: t('licenses.matrix.col_lic_name', 'Tên Phần Mềm'), key: 'licenseName', width: 32 },
        { header: t('licenses.matrix.col_assignment_type', 'Phân Loại Cấp Phát'), key: 'type', width: 25 },
      ];
      ws3.getRow(1).font = { bold: true };

      matrixData.userDetailList.forEach((u, i) => {
        ws3.addRow({
          stt: i + 1,
          name: u.userName,
          email: u.userEmail,
          userComp: u.userCompany,
          buyerComp: u.buyerCompany,
          licenseName: u.licenseName,
          type: u.isCrossAssigned ? t('licenses.matrix.legend_cross', 'Cấp phát chéo (Mượn hạn mức)') : t('licenses.matrix.legend_self', 'Nội bộ công ty'),
        });
      });

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Bao_Cao_Ma_Tran_Bu_Tru_License_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Lỗi khi xuất file Excel:', err);
      alert(t('licenses.matrix.excel_err', 'Không thể xuất file Excel. Vui lòng thử lại!'));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header & Controls */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 shadow-xl border border-indigo-900/50">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold uppercase tracking-wider">
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>{t('licenses.matrix.badge', 'Động Cơ Quyết Toán Bù Trừ Tập Đoàn')}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <span>{t('licenses.matrix.title', 'Ma Trận Phân Bổ & Quyết Toán Bù Trừ Bản Quyền')}</span>
            </h2>
            <p className="text-xs sm:text-sm text-indigo-200/80 leading-relaxed">
              {t('licenses.matrix.subtitle', 'Giám sát việc mượn - cho mượn hạn mức license giữa các công ty con trong tập đoàn. Tự động tính toán số tiền bù trừ nội bộ phục vụ hạch toán kế toán cuối kỳ.')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Bộ lọc phần mềm */}
            <div className="relative">
              <select
                value={selectedSoftwareFilter}
                onChange={(e) => setSelectedSoftwareFilter(e.target.value)}
                className="appearance-none bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs font-bold py-2.5 pl-4 pr-9 rounded-2xl outline-none transition-all cursor-pointer backdrop-blur-md"
              >
                <option value="ALL" className="text-slate-900 font-semibold">
                  {t('licenses.matrix.all_software', '🌟 Tất Cả Phần Mềm')}
                </option>
                {uniqueSoftwareNames.map((name) => (
                  <option key={name} value={name} className="text-slate-900 font-semibold">
                    📦 {name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-white/70 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Nút xuất Excel Quyết toán */}
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-950/40 transition-all cursor-pointer hover:scale-102 active:scale-98"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{t('licenses.matrix.export_btn', 'Xuất Excel Quyết Toán')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {t('licenses.matrix.kpi_purchased', 'Tổng Mua Toàn Tập Đoàn')}
            </p>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
              {matrixData.kpis.totalPurchased.toLocaleString()}{' '}
              <span className="text-xs font-semibold text-slate-400">
                {t('licenses.matrix.seats_unit', 'ghế')}
              </span>
            </h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {t('licenses.matrix.kpi_in_use', 'Thực Tế Đang Dùng')}
            </p>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
              {matrixData.kpis.totalUsed.toLocaleString()}{' '}
              <span className="text-xs font-semibold text-slate-400">
                ({matrixData.kpis.utilizationRate.toFixed(1)}%)
              </span>
            </h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center shrink-0">
            <ArrowRightLeft className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {t('licenses.matrix.kpi_cross', 'Ghế Cấp Phát Chéo')}
            </p>
            <h3 className="text-xl font-black text-amber-600 mt-0.5">
              {matrixData.kpis.totalCrossAssigned.toLocaleString()}{' '}
              <span className="text-xs font-semibold text-slate-400">
                {t('licenses.matrix.borrowed_seats_unit', 'ghế mượn')}
              </span>
            </h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {t('licenses.matrix.kpi_settlement', 'Quy Mô Tiền Quyết Toán')}
            </p>
            <h3 className="text-lg font-black text-emerald-600 mt-0.5">
              {formatPrice(matrixData.kpis.totalChargebackVolume, selectedCurrency)}
            </h3>
          </div>
        </div>
      </div>

      {/* 3. BẢNG QUYẾT TOÁN BÙ TRỪ CHI PHÍ NỘI BỘ (MAIN CHARGEBACK TABLE) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/30">
          <div>
            <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>{t('licenses.matrix.table_title', 'Bảng Quyết Toán Bù Trừ Chi Phí Giữa Các Công Ty')}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('licenses.matrix.table_desc', 'Đối chiếu số lượng ghế mua vs thực dùng và quy đổi số tiền phải trả hoặc thu về giữa các pháp nhân.')}
            </p>
          </div>
          <span className="text-[11px] px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold self-start sm:self-auto">
            {t('licenses.matrix.entities_count', '{count} đơn vị thành viên').replace('{count}', String(matrixData.companyBalances.length))}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 uppercase tracking-wider text-[10px] font-black border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">{t('licenses.matrix.col_company', 'Công Ty Thành Viên')}</th>
                <th className="py-3 px-3 text-center">{t('licenses.matrix.col_purchased', 'Số Mua')}</th>
                <th className="py-3 px-3 text-center">{t('licenses.matrix.col_used', 'Thực Dùng')}</th>
                <th className="py-3 px-3 text-center">{t('licenses.matrix.col_self', 'Tự Dùng')}</th>
                <th className="py-3 px-3 text-center">{t('licenses.matrix.col_borrowed', 'Đi Mượn')}</th>
                <th className="py-3 px-3 text-center">{t('licenses.matrix.col_lent', 'Cho Mượn')}</th>
                <th className="py-3 px-3 text-center">{t('licenses.matrix.col_balance', 'Cân Đối Ghế')}</th>
                <th className="py-3 px-4 text-right">{t('licenses.matrix.col_net', 'Tiền Bù Trừ Ròng')}</th>
                <th className="py-3 px-4 text-center">{t('licenses.matrix.col_status', 'Trạng Thái')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {matrixData.companyBalances.map((c) => {
                const isSurplus = c.balanceSeats > 0;
                const isDeficit = c.balanceSeats < 0;

                return (
                  <tr
                    key={c.companyName}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-xs shrink-0">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{c.companyName}</p>
                          <p className="text-[10px] text-slate-400">
                            {t('licenses.matrix.avg_price', 'Đơn giá mua TB: {price}').replace('{price}', c.avgUnitPrice > 0 ? formatPrice(c.avgUnitPrice, selectedCurrency) : '—')}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Số Mua */}
                    <td className="py-3 px-3 text-center font-bold text-slate-900 dark:text-white">
                      {c.purchased}
                    </td>

                    {/* Thực Dùng */}
                    <td className="py-3 px-3 text-center font-bold text-slate-900 dark:text-white">
                      {c.totalUsed}
                    </td>

                    {/* Tự Dùng */}
                    <td className="py-3 px-3 text-center text-slate-500">{c.usedSelf}</td>

                    {/* Đi Mượn */}
                    <td className="py-3 px-3 text-center">
                      {c.borrowedFromOthers > 0 ? (
                        <span className="font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-lg">
                          +{c.borrowedFromOthers}
                        </span>
                      ) : (
                        <span className="text-slate-300">0</span>
                      )}
                    </td>

                    {/* Cho Mượn */}
                    <td className="py-3 px-3 text-center">
                      {c.lentToOthers > 0 ? (
                        <span className="font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-lg">
                          +{c.lentToOthers}
                        </span>
                      ) : (
                        <span className="text-slate-300">0</span>
                      )}
                    </td>

                    {/* Cân Đối Ghế */}
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`font-black px-2.5 py-1 rounded-xl text-xs ${
                          isSurplus
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                            : isDeficit
                            ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {c.balanceSeats > 0 ? `+${c.balanceSeats}` : c.balanceSeats}
                      </span>
                    </td>

                    {/* Tiền Bù Trừ Ròng */}
                    <td className="py-3 px-4 text-right">
                      {c.netChargebackAmount > 0 ? (
                        <div className="flex items-center justify-end gap-1 text-emerald-600 font-black">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          <span>+{formatPrice(c.netChargebackAmount, selectedCurrency)}</span>
                        </div>
                      ) : c.netChargebackAmount < 0 ? (
                        <div className="flex items-center justify-end gap-1 text-rose-600 font-black">
                          <ArrowDownLeft className="w-3.5 h-3.5" />
                          <span>-{formatPrice(Math.abs(c.netChargebackAmount), selectedCurrency)}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-semibold">0 ₫</span>
                      )}
                    </td>

                    {/* Trạng Thái */}
                    <td className="py-3 px-4 text-center">
                      {isSurplus ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{t('licenses.matrix.status_surplus', 'Dư hạn mức')}</span>
                        </span>
                      ) : isDeficit ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 px-2.5 py-1 rounded-full">
                          <AlertTriangle className="w-3 h-3" />
                          <span>{t('licenses.matrix.status_deficit', 'Dùng quá quota')}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                          <span>{t('licenses.matrix.status_balanced', 'Cân bằng')}</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. MA TRẬN 2D CUNG - CẦU (2D INTERACTIVE ALLOCATION MATRIX) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
          <div>
            <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>{t('licenses.matrix.matrix_2d_title', 'Ma Trận 2 Chiều Cung - Cầu Giữa Các Công Ty')}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('licenses.matrix.matrix_2d_desc', 'Hàng ngang = Công ty của nhân viên đang sử dụng. Cột dọc = Công ty đã bỏ tiền mua license.')}
            </p>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
              <span>{t('licenses.matrix.legend_self', 'Tự dùng')}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              <span>{t('licenses.matrix.legend_cross', 'Cấp phát chéo')}</span>
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-center text-xs">
            <thead className="bg-slate-100/70 dark:bg-slate-800/80 text-slate-500 uppercase tracking-wider text-[10.5px] font-black border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3.5 px-4 text-left min-w-[200px]">
                  {t('licenses.matrix.col_user_buyer', 'Công Ty Dùng ↓ \\ Công Ty Mua →')}
                </th>
                {allCompanyNames.map((buyerComp) => (
                  <th key={buyerComp} className="py-3.5 px-3 min-w-[120px]">
                    <div className="truncate font-bold" title={buyerComp}>
                      {buyerComp}
                    </div>
                  </th>
                ))}
                <th className="py-3.5 px-4 bg-slate-200/50 dark:bg-slate-800 font-black text-slate-900 dark:text-white">
                  {t('licenses.matrix.col_total_used', 'Tổng Dùng')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {allCompanyNames.map((userComp) => {
                const userRow = matrixData.matrix[userComp] || {};
                const totalRow = Object.values(userRow).reduce((sum, val) => sum + val, 0);

                return (
                  <tr
                    key={userComp}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 text-left font-bold text-slate-900 dark:text-white">
                      {userComp}
                    </td>

                    {allCompanyNames.map((buyerComp) => {
                      const count = userRow[buyerComp] || 0;
                      const isSelf = userComp === buyerComp;
                      const isCross = !isSelf && count > 0;

                      return (
                        <td key={buyerComp} className="py-3 px-3">
                          {count > 0 ? (
                            <span
                              className={`inline-block min-w-[32px] px-2 py-1 rounded-xl font-bold text-xs ${
                                isSelf
                                  ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-black'
                                  : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 ring-1 ring-amber-300'
                              }`}
                              title={
                                isCross
                                  ? t('licenses.matrix.cross_tooltip', '{count} nhân sự thuộc {userComp} đang dùng hạn mức của {buyerComp}')
                                      .replace('{count}', String(count))
                                      .replace('{userComp}', userComp)
                                      .replace('{buyerComp}', buyerComp)
                                  : t('licenses.matrix.self_tooltip', '{count} ghế nội bộ').replace('{count}', String(count))
                              }
                            >
                              {count}
                            </span>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-700">—</span>
                          )}
                        </td>
                      );
                    })}

                    <td className="py-3 px-4 font-black text-slate-900 dark:text-white bg-slate-50/50 dark:bg-slate-800/40">
                      {totalRow}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
