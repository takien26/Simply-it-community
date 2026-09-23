import { prisma } from './db';
import { COMPREHENSIVE_IT_KB, KBArticle } from './it-knowledge-base';

const KB_HIDDEN_DEFAULT_KEY = 'kb.hidden_default_ids';

/**
 * Lấy danh sách ID các bài viết KB mặc định đã bị người dùng xóa hoặc ẩn
 */
export async function getHiddenDefaultArticleIds(): Promise<string[]> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: KB_HIDDEN_DEFAULT_KEY },
    });
    if (setting?.value) {
      const parsed = JSON.parse(setting.value);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (error) {
    console.error('Failed to get hidden default article ids:', error);
  }
  return [];
}

/**
 * Đánh dấu ẩn / xóa bài viết KB mặc định
 */
export async function hideDefaultArticle(articleId: string): Promise<void> {
  const current = await getHiddenDefaultArticleIds();
  if (!current.includes(articleId)) {
    const updated = [...current, articleId];
    await prisma.systemSetting.upsert({
      where: { key: KB_HIDDEN_DEFAULT_KEY },
      update: { value: JSON.stringify(updated) },
      create: {
        key: KB_HIDDEN_DEFAULT_KEY,
        value: JSON.stringify(updated),
        label: 'Danh sách ID bài viết KB mặc định đã ẩn/xóa',
        group: 'kb',
        type: 'JSON',
      },
    });
  }
}

/**
 * Lấy danh sách các bài viết KB mặc định đang còn hiệu lực (chưa bị xóa)
 */
export async function getActiveDefaultArticles(): Promise<KBArticle[]> {
  try {
    const hiddenIds = await getHiddenDefaultArticleIds();
    if (!hiddenIds || hiddenIds.length === 0) {
      return COMPREHENSIVE_IT_KB;
    }
    const hiddenSet = new Set(hiddenIds);
    return COMPREHENSIVE_IT_KB.filter((item) => !hiddenSet.has(item.id));
  } catch (error) {
    console.error('Failed to get active default articles:', error);
    return COMPREHENSIVE_IT_KB;
  }
}

const KB_FEEDBACK_KEY = 'kb.feedback_stats';

export interface KBFeedbackReasonItem {
  id: string;
  reason: string;
  reasonLabel: string;
  comment?: string;
  createdAt: string;
  userId?: string;
}

export const FEEDBACK_REASON_MAP: Record<string, { vi: string; en: string }> = {
  OUTDATED: { vi: 'Thông tin đã cũ / không giống thực tế', en: 'Information is outdated / inaccurate' },
  MISSING_STEPS: { vi: 'Thiếu bước thực hiện', en: 'Missing actionable steps' },
  BROKEN_LINK: { vi: 'Không tải được phần mềm / link hỏng', en: 'Broken download link / files' },
  HARD_TO_UNDERSTAND: { vi: 'Khó hiểu / Không làm theo được', en: 'Hard to understand / follow' },
  OTHER: { vi: 'Lý do khác', en: 'Other reason' },
};

export interface KBFeedbackStats {
  helpful: number;
  unhelpful: number;
  deflectedTickets?: number;
  reasons?: KBFeedbackReasonItem[];
  reasonCounts?: Record<string, number>;
  lastUpdated?: string;
}

export type KBFeedbackStore = Record<string, KBFeedbackStats>;

// Dữ liệu mẫu ban đầu trực quan để IT theo dõi các bài viết tốt và bài viết cần cập nhật
const DEFAULT_FEEDBACK_BASELINE: KBFeedbackStore = {
  'kb-net-01': { helpful: 42, unhelpful: 2, deflectedTickets: 18 }, // 95%
  'kb-net-02': { helpful: 35, unhelpful: 1, deflectedTickets: 14 }, // 97%
  'kb-email-01': { helpful: 56, unhelpful: 3, deflectedTickets: 29 }, // 95%
  'kb-soft-01': {
    helpful: 18,
    unhelpful: 12,
    deflectedTickets: 5,
    reasonCounts: {
      OUTDATED: 4,
      MISSING_STEPS: 5,
      BROKEN_LINK: 3,
    },
    reasons: [
      {
        id: 'rs-1',
        reason: 'MISSING_STEPS',
        reasonLabel: 'Thiếu bước thực hiện',
        comment: 'Phần cài đặt MISA thiếu bước cấp quyền Run as Administrator khi chạy file setup.',
        createdAt: '2026-09-20T10:15:00.000Z',
      },
      {
        id: 'rs-2',
        reason: 'OUTDATED',
        reasonLabel: 'Thông tin đã cũ / không giống thực tế',
        comment: 'Giao diện phiên bản mới 2026 không có nút Cấu hình máy chủ như trong hình.',
        createdAt: '2026-09-21T14:30:00.000Z',
      },
    ],
  },
  'kb-print-01': { helpful: 29, unhelpful: 2, deflectedTickets: 12 }, // 94%
  'kb-hard-01': {
    helpful: 14,
    unhelpful: 8,
    deflectedTickets: 4,
    reasonCounts: {
      MISSING_STEPS: 4,
      HARD_TO_UNDERSTAND: 4,
    },
    reasons: [
      {
        id: 'rs-3',
        reason: 'MISSING_STEPS',
        reasonLabel: 'Thiếu bước thực hiện',
        comment: 'Chưa hướng dẫn cách chọn đúng cổng COM trong Device Manager.',
        createdAt: '2026-09-22T08:00:00.000Z',
      },
    ],
  },
};

/**
 * Lấy toàn bộ thống kê đánh giá bài viết KB
 */
export async function getAllKBFeedbackStats(): Promise<KBFeedbackStore> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: KB_FEEDBACK_KEY },
    });
    if (setting?.value) {
      const parsed = JSON.parse(setting.value);
      if (typeof parsed === 'object' && parsed !== null) {
        return { ...DEFAULT_FEEDBACK_BASELINE, ...parsed };
      }
    }
  } catch (error) {
    console.error('Failed to get KB feedback stats:', error);
  }
  return { ...DEFAULT_FEEDBACK_BASELINE };
}

/**
 * Ghi nhận đánh giá phản hồi (Hữu ích / Cần hỗ trợ) cho bài viết KB
 * @param isDeflection Nếu true: ghi nhận bài viết đã giúp người dùng tự sửa thành công và hủy tạo ticket
 * @param reason Mã lý do khi không hữu ích ('OUTDATED' | 'MISSING_STEPS' | 'BROKEN_LINK' | 'HARD_TO_UNDERSTAND' | 'OTHER')
 * @param comment Ghi chú cụ thể của người dùng
 */
export async function recordArticleFeedback(
  articleId: string,
  isHelpful: boolean,
  userId?: string,
  isDeflection: boolean = false,
  reason?: string,
  comment?: string
): Promise<{
  helpful: number;
  unhelpful: number;
  deflectedTickets: number;
  ratio: number;
  reasons?: KBFeedbackReasonItem[];
  reasonCounts?: Record<string, number>;
}> {
  try {
    const store = await getAllKBFeedbackStats();
    const current = store[articleId] || { helpful: 0, unhelpful: 0, deflectedTickets: 0 };

    if (isHelpful) {
      current.helpful = (current.helpful || 0) + 1;
    } else {
      current.unhelpful = (current.unhelpful || 0) + 1;

      // Lưu lý do nếu người dùng chọn
      if (reason) {
        if (!current.reasonCounts) current.reasonCounts = {};
        current.reasonCounts[reason] = (current.reasonCounts[reason] || 0) + 1;

        if (!current.reasons) current.reasons = [];
        const labelObj = FEEDBACK_REASON_MAP[reason];
        const reasonLabel = labelObj ? labelObj.vi : reason;
        const newReasonItem: KBFeedbackReasonItem = {
          id: `rs-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          reason,
          reasonLabel,
          comment: comment?.trim() || undefined,
          createdAt: new Date().toISOString(),
          userId,
        };
        // Giữ tối đa 30 góp ý mới nhất
        current.reasons = [newReasonItem, ...current.reasons.slice(0, 29)];
      }
    }

    if (isDeflection) {
      current.deflectedTickets = (current.deflectedTickets || 0) + 1;
    }

    current.lastUpdated = new Date().toISOString();

    store[articleId] = current;

    await prisma.systemSetting.upsert({
      where: { key: KB_FEEDBACK_KEY },
      update: { value: JSON.stringify(store) },
      create: {
        key: KB_FEEDBACK_KEY,
        value: JSON.stringify(store),
        label: 'Thống kê đánh giá hữu ích / cần hỗ trợ bài viết KB',
        group: 'kb',
        type: 'JSON',
      },
    });

    const total = current.helpful + current.unhelpful;
    const ratio = total > 0 ? Math.round((current.helpful / total) * 100) : 100;

    return {
      helpful: current.helpful,
      unhelpful: current.unhelpful,
      deflectedTickets: current.deflectedTickets || 0,
      ratio,
      reasons: current.reasons || [],
      reasonCounts: current.reasonCounts || {},
    };
  } catch (error) {
    console.error('Failed to record article feedback:', error);
    return {
      helpful: isHelpful ? 1 : 0,
      unhelpful: isHelpful ? 0 : 1,
      deflectedTickets: isDeflection ? 1 : 0,
      ratio: isHelpful ? 100 : 0,
      reasons: [],
      reasonCounts: {},
    };
  }
}
