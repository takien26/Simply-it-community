export interface AssetHealthCalculation {
  healthScore: number; // 0 - 100
  rating: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  ratingLabel: { vi: string; en: string };
  color: string;
  badgeClass: string;
  breakdown: {
    ageScore: number; // 0 - 30
    conditionScore: number; // 0 - 25
    breakdownScore: number; // 0 - 25
    costRatioScore: number; // 0 - 20
  };
  metrics: {
    ageMonths: number;
    breakdownCount: number;
    totalMaintenanceCost: number;
    costToPurchaseRatio: number;
  };
  recommendReplacement: boolean;
  recommendationReason?: { vi: string; en: string };
}

/**
 * Tính toán Chỉ số Sức Khỏe Thiết Bị (Asset Health Score)
 * Dựa trên 4 tiêu chí cốt lõi chuẩn ITAM quốc tế:
 * 1. Tuổi thọ máy (30%)
 * 2. Tình trạng vật lý thực tế (25%)
 * 3. Tần suất phát sinh sự cố & sửa chữa (25%)
 * 4. Tỷ lệ chi phí sửa chữa lũy kế so với nguyên giá (20%)
 */
export function calculateAssetHealth(asset: any): AssetHealthCalculation {
  const now = new Date();

  // 1. Tiêu chí Tuổi thọ (Age - Max 30 điểm)
  const startDate = asset.purchaseDate ? new Date(asset.purchaseDate) : new Date(asset.createdAt || now);
  const ageMonths = Math.max(0, Math.floor((now.getTime() - startDate.getTime()) / (30.44 * 24 * 60 * 60 * 1000)));

  let ageScore = 0;
  if (ageMonths <= 12) ageScore = 30;
  else if (ageMonths <= 24) ageScore = 25;
  else if (ageMonths <= 36) ageScore = 18;
  else if (ageMonths <= 48) ageScore = 10;
  else if (ageMonths <= 60) ageScore = 5;
  else ageScore = 0; // Trên 5 năm: khấu hao hoàn toàn

  // 2. Tiêu chí Tình trạng vật lý (Condition - Max 25 điểm)
  const condition = (asset.condition || 'GOOD').toUpperCase();
  let conditionScore = 20;
  switch (condition) {
    case 'NEW':
      conditionScore = 25;
      break;
    case 'GOOD':
      conditionScore = 20;
      break;
    case 'FAIR':
      conditionScore = 14;
      break;
    case 'POOR':
      conditionScore = 6;
      break;
    case 'BROKEN':
      conditionScore = 0;
      break;
    default:
      conditionScore = 18;
  }

  // 3. Tiêu chí Tần suất sự cố (Breakdown / Reliability - Max 25 điểm)
  // Đếm số ticket và log sửa chữa
  const ticketCount = Array.isArray(asset.tickets) ? asset.tickets.length : (asset._count?.tickets || 0);
  const maintenanceCount = Array.isArray(asset.maintenanceLogs)
    ? asset.maintenanceLogs.filter((m: any) => m.type === 'REPAIR' || m.type === 'EMERGENCY' || m.type === 'INCIDENT').length
    : 0;
  const totalBreakdowns = ticketCount + maintenanceCount;

  let breakdownScore = 0;
  if (totalBreakdowns === 0) breakdownScore = 25;
  else if (totalBreakdowns === 1) breakdownScore = 20;
  else if (totalBreakdowns === 2) breakdownScore = 14;
  else if (totalBreakdowns <= 4) breakdownScore = 7;
  else breakdownScore = 0;

  // 4. Tiêu chí Chi phí sửa chữa lũy kế so với nguyên giá (Cost Ratio - Max 20 điểm)
  let totalMaintenanceCost = 0;
  if (Array.isArray(asset.maintenanceLogs)) {
    totalMaintenanceCost = asset.maintenanceLogs.reduce((sum: number, log: any) => {
      return sum + (Number(log.cost) || 0);
    }, 0);
  }

  const purchasePrice = Number(asset.purchasePrice) || 0;
  let costRatio = 0;
  let costRatioScore = 20;

  if (purchasePrice > 0) {
    costRatio = totalMaintenanceCost / purchasePrice;
    if (costRatio < 0.1) costRatioScore = 20;
    else if (costRatio < 0.25) costRatioScore = 15;
    else if (costRatio < 0.4) costRatioScore = 8;
    else if (costRatio < 0.5) costRatioScore = 3;
    else costRatioScore = 0; // Chi phí sửa >= 50% nguyên giá
  } else {
    // Nếu không có giá mua, suy diễn từ tổng tiền sửa chữa
    if (totalMaintenanceCost === 0) costRatioScore = 20;
    else if (totalMaintenanceCost < 1000000) costRatioScore = 15;
    else if (totalMaintenanceCost < 5000000) costRatioScore = 8;
    else costRatioScore = 2;
  }

  const healthScore = Math.max(0, Math.min(100, ageScore + conditionScore + breakdownScore + costRatioScore));

  let rating: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' = 'GOOD';
  let ratingLabel = { vi: 'Ổn định', en: 'Good' };
  let color = 'text-blue-600';
  let badgeClass = 'bg-blue-50 text-blue-700 border-blue-200';

  if (healthScore >= 80) {
    rating = 'EXCELLENT';
    ratingLabel = { vi: 'Tối ưu / Hoàn hảo', en: 'Excellent' };
    color = 'text-emerald-600';
    badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (healthScore >= 60) {
    rating = 'GOOD';
    ratingLabel = { vi: 'Ổn định', en: 'Good' };
    color = 'text-blue-600';
    badgeClass = 'bg-blue-50 text-blue-700 border-blue-200';
  } else if (healthScore >= 40) {
    rating = 'FAIR';
    ratingLabel = { vi: 'Cần bảo dưỡng', en: 'Needs Maintenance' };
    color = 'text-amber-600';
    badgeClass = 'bg-amber-50 text-amber-800 border-amber-200';
  } else {
    rating = 'POOR';
    ratingLabel = { vi: 'Xuống cấp nghiêm trọng', en: 'Critical Degradation' };
    color = 'text-rose-600';
    badgeClass = 'bg-rose-50 text-rose-800 border-rose-200';
  }

  // Khuyến nghị thay thế thông minh (Actionable Decision)
  let recommendReplacement = false;
  let recommendationReason: { vi: string; en: string } | undefined;

  if (purchasePrice > 0 && costRatio >= 0.5) {
    recommendReplacement = true;
    recommendationReason = {
      vi: `Tổng chi phí sửa chữa lũy kế (${Math.round(costRatio * 100)}% nguyên giá) đã vượt quá 50% giá trị mua máy. Đề xuất thanh lý và đầu tư máy mới để tiết kiệm ngân sách.`,
      en: `Cumulative maintenance cost (${Math.round(costRatio * 100)}% of initial price) exceeds 50% of asset value. Recommend retiring and replacing with a new device.`,
    };
  } else if (healthScore < 40 && ageMonths > 36) {
    recommendReplacement = true;
    recommendationReason = {
      vi: `Thiết bị đã sử dụng hơn 3 năm (${ageMonths} tháng) và điểm sức khỏe xuống thấp (${healthScore}/100), hay phát sinh sự cố. Đề xuất đưa vào kế hoạch thay thế.`,
      en: `Asset has been in service for over 3 years (${ageMonths} months) with low health score (${healthScore}/100) and recurring issues. Recommend scheduled replacement.`,
    };
  }

  return {
    healthScore,
    rating,
    ratingLabel,
    color,
    badgeClass,
    breakdown: {
      ageScore,
      conditionScore,
      breakdownScore,
      costRatioScore,
    },
    metrics: {
      ageMonths,
      breakdownCount: totalBreakdowns,
      totalMaintenanceCost,
      costToPurchaseRatio: Math.round(costRatio * 100) / 100,
    },
    recommendReplacement,
    recommendationReason,
  };
}
