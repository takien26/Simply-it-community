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
