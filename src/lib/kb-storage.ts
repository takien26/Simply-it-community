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

export interface KBFeedbackStats {
  helpful: number;
  unhelpful: number;
  deflectedTickets?: number;
  lastUpdated?: string;
}

export type KBFeedbackStore = Record<string, KBFeedbackStats>;

// Dữ liệu mẫu ban đầu trực quan để IT theo dõi các bài viết tốt và bài viết cần cập nhật
const DEFAULT_FEEDBACK_BASELINE: KBFeedbackStore = {
  'kb-net-01': { helpful: 42, unhelpful: 2, deflectedTickets: 18 }, // 95%
  'kb-net-02': { helpful: 35, unhelpful: 1, deflectedTickets: 14 }, // 97%
  'kb-email-01': { helpful: 56, unhelpful: 3, deflectedTickets: 29 }, // 95%
  'kb-soft-01': { helpful: 18, unhelpful: 12, deflectedTickets: 5 }, // 60% -> Cần bổ sung nội dung!
  'kb-print-01': { helpful: 29, unhelpful: 2, deflectedTickets: 12 }, // 94%
  'kb-hard-01': { helpful: 14, unhelpful: 8, deflectedTickets: 4 }, // 63% -> Cần bổ sung nội dung!
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
 */
export async function recordArticleFeedback(
  articleId: string,
  isHelpful: boolean,
  userId?: string,
  isDeflection: boolean = false
): Promise<{ helpful: number; unhelpful: number; deflectedTickets: number; ratio: number }> {
  try {
    const store = await getAllKBFeedbackStats();
    const current = store[articleId] || { helpful: 0, unhelpful: 0, deflectedTickets: 0 };

    if (isHelpful) {
      current.helpful = (current.helpful || 0) + 1;
    } else {
      current.unhelpful = (current.unhelpful || 0) + 1;
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
    };
  } catch (error) {
    console.error('Failed to record article feedback:', error);
    return {
      helpful: isHelpful ? 1 : 0,
      unhelpful: isHelpful ? 0 : 1,
      deflectedTickets: isDeflection ? 1 : 0,
      ratio: isHelpful ? 100 : 0,
    };
  }
}
