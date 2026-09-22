// src/lib/kb-hybrid-search.ts
import { COMPREHENSIVE_IT_KB, KBArticle } from './it-knowledge-base';
import { generateUnifiedTextAI } from './ai-config';

export interface HybridSearchArticle {
  id: string;
  title: string;
  slug: string;
  category: string;
  categoryKey: string;
  keywords?: string[];
  summary: string;
  content: string;
  steps?: string;
  views?: number;
  updatedAt?: string;
  isFeatured?: boolean;
  author?: string;
  teamScope?: string;
  isInternalIT?: boolean;
  fileUrl?: string;
  fileName?: string;
}

export interface HybridSearchResult {
  article: HybridSearchArticle;
  score: number;
  matchReason?: string;
}

export interface HybridSearchOptions {
  category?: string;
  description?: string;
  teamScope?: string;
  limit?: number;
  minScore?: number;
  enableAiSemantic?: boolean;
}

/**
 * Remove Vietnamese accents / diacritics
 * e.g. "Máy tính không vào được wifi" -> "may tinh khong vao duoc wifi"
 */
export function removeVietnameseTones(str: string): string {
  if (!str) return '';
  let res = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  res = res.replace(/đ/g, 'd').replace(/Đ/g, 'D');
  return res.toLowerCase().trim();
}

// Common Vietnamese stopwords / filler words to filter out during tokenization
const VIETNAMESE_STOPWORDS = new Set([
  'cua', 'toi', 'em', 'anh', 'chi', 'ban', 'bi', 'o', 'cho', 'va', 'la', 'thi', 'ma',
  'cac', 'nhung', 'cai', 'chiec', 'nay', 'kia', 'duoc', 'voi', 'trong', 'ra', 'vao',
  'lai', 'lam', 'sao', 'the', 'nao', 'khi', 'dang', 'da', 'se', 'roi', 'hay', 'giup',
  'ho', 'nho', 'a', 'da', 'oi', 'nhe', 'nha', 'minh', 'gi', 'khong', 'chua', 'qua',
  'nhu', 'de', 'den', 'tu', 'mot', 'hai', 'rat', 'qua', 'lam', 'roi', 'co', 'the',
]);

/**
 * Tokenize string into meaningful keywords (both accented and unaccented)
 */
export function extractSearchTokens(text: string): string[] {
  if (!text) return [];
  const normalized = text.toLowerCase();
  const rawWords = normalized.split(/[\s,./?!;:()\[\]{}"'\\+*#%@$^&|~`]+/).filter((w) => w.length > 1);

  const tokens: string[] = [];
  for (const word of rawWords) {
    const unaccented = removeVietnameseTones(word);
    if (!VIETNAMESE_STOPWORDS.has(unaccented)) {
      tokens.push(word);
      if (unaccented !== word) {
        tokens.push(unaccented);
      }
    }
  }

  // Also include 2-word phrases for common tech terms (e.g. "ket mang", "doi pass", "may in")
  for (let i = 0; i < rawWords.length - 1; i++) {
    const pair = `${rawWords[i]} ${rawWords[i + 1]}`;
    const unaccentedPair = removeVietnameseTones(pair);
    tokens.push(pair);
    if (unaccentedPair !== pair) {
      tokens.push(unaccentedPair);
    }
  }

  return Array.from(new Set(tokens));
}

/**
 * 3-Tier Hybrid Search for Knowledge Base articles:
 * Tier 1: Lexical scoring (Keywords, Synonyms, Unaccented Token Matching)
 * Tier 2: Contextual NLP Re-ranking (Category, Description boosting)
 * Tier 3: Semantic AI Fallback via Gemini (Intent recognition for casual/vague phrasing)
 */
export async function searchHybridKB(
  query: string,
  articles: HybridSearchArticle[] = [],
  options: HybridSearchOptions = {}
): Promise<HybridSearchResult[]> {
  const q = query.trim();
  const desc = (options.description || '').trim();
  const combinedText = desc ? `${q} ${desc}` : q;
  const limit = options.limit || 5;
  const minScore = options.minScore || 15;

  if (!q && !desc) {
    return articles.slice(0, limit).map((a) => ({ article: a, score: 10 }));
  }

  const cleanQueryLower = q.toLowerCase();
  const cleanQueryUnaccented = removeVietnameseTones(q);
  const queryTokens = extractSearchTokens(q);
  const descTokens = desc ? extractSearchTokens(desc) : [];

  // ==================== TIER 1 & TIER 2: LEXICAL & CONTEXT SCORING ====================
  const scoredResults: HybridSearchResult[] = articles.map((art) => {
    let score = 0;
    let matchReason = '';

    const titleLower = art.title.toLowerCase();
    const titleUnaccented = removeVietnameseTones(art.title);
    const summaryLower = (art.summary || '').toLowerCase();
    const summaryUnaccented = removeVietnameseTones(art.summary || '');
    const contentLower = (art.content || art.steps || '').toLowerCase();
    const keywords = Array.isArray(art.keywords) ? art.keywords : [];

    // --- 1. Exact phrase matching in Title & Keywords (+150 max) ---
    if (cleanQueryLower && titleLower.includes(cleanQueryLower)) {
      score += 120;
      matchReason = 'Khớp trực tiếp tiêu đề bài viết';
    } else if (cleanQueryUnaccented && titleUnaccented.includes(cleanQueryUnaccented)) {
      score += 90;
      matchReason = 'Khớp tiêu đề (không dấu)';
    }

    // Check keywords (synonyms)
    for (const kw of keywords) {
      const kwLower = kw.toLowerCase().trim();
      const kwUnaccented = removeVietnameseTones(kwLower);

      if (cleanQueryLower === kwLower || cleanQueryUnaccented === kwUnaccented) {
        score += 150;
        matchReason = `Khớp từ khóa chính xác: "${kw}"`;
        break;
      } else if (cleanQueryLower.includes(kwLower) || cleanQueryUnaccented.includes(kwUnaccented)) {
        score += 100;
        matchReason = `Khớp từ khóa đồng nghĩa: "${kw}"`;
      } else if (kwLower.includes(cleanQueryLower) || kwUnaccented.includes(cleanQueryUnaccented)) {
        score += 70;
      }
    }

    // --- 2. Token Matching on Title & Keywords (+20 to +40 per token) ---
    for (const token of queryTokens) {
      if (token.length < 2) continue;

      if (titleLower.includes(token) || titleUnaccented.includes(token)) {
        score += 25;
      }

      for (const kw of keywords) {
        const kwLower = kw.toLowerCase();
        const kwUnaccented = removeVietnameseTones(kwLower);
        if (kwLower.includes(token) || kwUnaccented.includes(token)) {
          score += 20;
          break;
        }
      }

      if (summaryLower.includes(token) || summaryUnaccented.includes(token)) {
        score += 10;
      }

      if (contentLower.includes(token)) {
        score += 3;
      }
    }

    // --- 3. Description Tokens Matching (Tier 2 Contextual boost) ---
    for (const token of descTokens) {
      if (token.length < 3) continue;
      if (titleLower.includes(token) || titleUnaccented.includes(token)) {
        score += 15;
      }
      if (keywords.some((k) => k.toLowerCase().includes(token) || removeVietnameseTones(k).includes(token))) {
        score += 12;
      }
      if (summaryLower.includes(token)) {
        score += 5;
      }
    }

    // --- 4. Category & Service Boost (+40) ---
    if (options.category && options.category !== 'ALL') {
      const catLower = options.category.toLowerCase();
      if (
        art.categoryKey?.toLowerCase() === catLower ||
        art.category?.toLowerCase() === catLower ||
        titleLower.includes(catLower)
      ) {
        score += 40;
      }
    }

    return { article: art, score, matchReason: matchReason || 'Khớp nội dung liên quan' };
  });

  let ranked = scoredResults
    .filter((item) => item.score >= minScore)
    .sort((a, b) => b.score - a.score);

  // ==================== TIER 3: AI SEMANTIC FALLBACK (GEMINI) ====================
  // If no strong match found (top score < 45) and user provided a meaningful query (>= 5 chars)
  const topScore = ranked.length > 0 ? ranked[0].score : 0;
  const shouldInvokeAiSemantic =
    options.enableAiSemantic !== false &&
    topScore < 45 &&
    combinedText.length >= 6 &&
    articles.length > 0;

  if (shouldInvokeAiSemantic) {
    try {
      // Build a lightweight catalog of public KB articles for Gemini intent classification
      const candidateList = articles.slice(0, 20).map((a, idx) => ({
        index: idx,
        id: a.id,
        title: a.title,
        category: a.category,
        summary: a.summary || '',
      }));

      const prompt = `
Bạn là AI Semantic Matcher của hệ thống IT Helpdesk.
Người dùng đang mô tả sự cố hoặc đặt câu hỏi IT bằng ngôn ngữ tự nhiên:
"${combinedText}"

Dưới đây là danh sách bài viết hướng dẫn (Knowledge Base):
${JSON.stringify(candidateList, null, 2)}

Nhiệm vụ: Tìm 1 đến 2 bài viết phù hợp nhất với ý định của người dùng, ngay cả khi người dùng không dùng từ ngữ kỹ thuật chính xác.
Trả về định dạng JSON DUY NHẤT:
{
  "matches": [
    { "id": "id_bài_viết", "confidence": 0.9, "reason": "Lý do ngắn gọn khớp với triệu chứng người dùng" }
  ]
}
Nếu không có bài nào phù hợp, trả về: { "matches": [] }
`;

      const aiResponse = await generateUnifiedTextAI({
        prompt,
        temperature: 0.1,
        maxTokens: 300,
        jsonMode: true,
      });

      if (aiResponse) {
        try {
          const parsed = typeof aiResponse === 'string' ? JSON.parse(aiResponse) : aiResponse;
          const aiMatches = Array.isArray(parsed?.matches) ? parsed.matches : [];

          for (const m of aiMatches) {
            if (!m.id) continue;
            const targetArt = articles.find((a) => a.id === m.id);
            if (targetArt) {
              const semanticScore = Math.round((m.confidence || 0.8) * 130);
              const existingIdx = ranked.findIndex((r) => r.article.id === m.id);
              if (existingIdx >= 0) {
                ranked[existingIdx].score = Math.max(ranked[existingIdx].score, semanticScore);
                ranked[existingIdx].matchReason = m.reason || 'AI Semantic Match';
              } else {
                ranked.push({
                  article: targetArt,
                  score: semanticScore,
                  matchReason: m.reason || 'AI Semantic Match',
                });
              }
            }
          }

          // Re-sort after semantic boost
          ranked.sort((a, b) => b.score - a.score);
        } catch {}
      }
    } catch (aiErr) {
      console.warn('AI Semantic Matcher skipped:', aiErr);
    }
  }

  return ranked.slice(0, limit);
}
