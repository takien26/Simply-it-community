import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { hasPermission, isAdminOrAbove } from '@/lib/permissions';
import { prisma } from '@/lib/db';
import { getActiveDefaultArticles, getAllKBFeedbackStats } from '@/lib/kb-storage';
import { DocumentType } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const teamScope = searchParams.get('teamScope');
    const search = searchParams.get('search') || '';
    const description = searchParams.get('description') || '';
    const enableAiSemantic = searchParams.get('semantic') !== 'false';

    const userRole = currentUser.roleName || 'Staff';
    const isAdmin = isAdminOrAbove(userRole) || (Array.isArray((currentUser as any).permissions) && (currentUser as any).permissions.includes('*'));
    const isITStaff = isAdmin || userRole.toLowerCase().includes('it') || userRole.toLowerCase().includes('manager') || userRole.toLowerCase().includes('kỹ thuật');

    // Kiểm tra phân quyền RBAC chi tiết
    const canCreate = isAdmin || (await hasPermission(currentUser.userId, 'kb.create'));
    const canUpdate = isAdmin || (await hasPermission(currentUser.userId, 'kb.update'));
    const canDelete = isAdmin || (await hasPermission(currentUser.userId, 'kb.delete'));

    // 1. Fetch DB documents
    const dbDocs = await prisma.document.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    }).catch(() => []);

    // 2. Map standard active KB articles with keywords (loại trừ bài viết đã bị ẩn/xóa)
    const activeDefaults = await getActiveDefaultArticles();
    const defaultArticles = activeDefaults.map((item, idx) => ({
      id: item.id,
      title: item.title,
      slug: item.id,
      category: item.category,
      categoryKey: item.categoryKey,
      keywords: item.keywords || [],
      summary: item.summary,
      content: item.steps,
      steps: item.steps,
      views: 850 + idx * 45,
      updatedAt: '2026-05-15T10:00:00.000Z',
      isFeatured: true,
      author: 'IT Support Team',
      teamScope: 'PUBLIC',
      isInternalIT: false,
    }));

    // 3. Map DB documents
    const dbArticles = dbDocs.map((doc) => {
      let docTeam = 'PUBLIC';
      let isInternal = false;
      const tagMatch = doc.title.match(/^\[([a-zA-Z0-9_-]+)\]/);
      if (tagMatch && tagMatch[1] !== 'Hướng dẫn xử lý') {
        docTeam = tagMatch[1];
        isInternal = docTeam !== 'PUBLIC';
      } else if (doc.title.includes('[INTERNAL_IT]') || doc.title.includes('[IT-')) {
        const anyItMatch = doc.title.match(/\[(IT-[a-zA-Z0-9_-]+|INTERNAL_IT)\]/);
        docTeam = anyItMatch ? anyItMatch[1] : 'INTERNAL_IT';
        isInternal = true;
      }

      return {
        id: doc.id,
        title: doc.title,
        slug: doc.id,
        category: String(doc.type || 'Tài liệu Kỹ thuật'),
        categoryKey: isInternal ? 'NETWORK' : 'OTHER',
        keywords: [doc.title, doc.fileName || ''].filter(Boolean),
        summary: doc.notes ? doc.notes.split('\n')[0] : doc.title,
        content: doc.notes || doc.title,
        steps: doc.notes || doc.title,
        views: 120,
        updatedAt: doc.updatedAt.toISOString(),
        isFeatured: isInternal,
        author: isInternal ? docTeam : 'Admin',
        teamScope: docTeam,
        isInternalIT: isInternal,
        fileUrl: doc.fileUrl,
        fileName: doc.fileName,
      };
    });

    const allArticles = [...defaultArticles, ...dbArticles];

    // 4. Attach persistent feedback statistics (Helpful vs Unhelpful / Deflection Ratio)
    const feedbackStore = await getAllKBFeedbackStats();
    const articlesWithFeedback = allArticles.map((art) => {
      const fb = feedbackStore[art.id] || { helpful: 0, unhelpful: 0 };
      const totalFb = (fb.helpful || 0) + (fb.unhelpful || 0);
      const feedbackRatio = totalFb > 0 ? Math.round(((fb.helpful || 0) / totalFb) * 100) : null;
      const needsImprovement = totalFb >= 2 && feedbackRatio !== null && feedbackRatio < 70;

      return {
        ...art,
        helpfulCount: fb.helpful || 0,
        unhelpfulCount: fb.unhelpful || 0,
        feedbackRatio,
        needsImprovement,
      };
    });

    // 5. RBAC Filter: Regular users ONLY see PUBLIC articles! Only IT/Admin can see internal team docs!
    let visibleArticles: any[] = articlesWithFeedback.filter((art) => {
      if (isAdmin) return true;
      if (isITStaff) return true;
      return art.teamScope === 'PUBLIC' || !art.isInternalIT;
    });

    // Special filter for articles that need review / updates (Low rating)
    const needsImprovementFilter = searchParams.get('needsImprovement') === 'true';
    if (needsImprovementFilter) {
      visibleArticles = visibleArticles.filter(
        (a) => a.needsImprovement || (a.unhelpfulCount || 0) > 0
      );
    }

    if (teamScope && teamScope !== 'ALL') {
      visibleArticles = visibleArticles.filter((a) => a.teamScope === teamScope);
    }

    if (category && category !== 'ALL') {
      visibleArticles = visibleArticles.filter(
        (a) => a.category.toLowerCase() === category.toLowerCase() || a.categoryKey === category
      );
    }

    // 6. 3-Tier Hybrid Search Engine (Token Scoring + Context + AI Semantic Fallback)
    if (search || description) {
      const { searchHybridKB } = await import('@/lib/kb-hybrid-search');
      const hybridResults = await searchHybridKB(search, visibleArticles, {
        description,
        category: category || undefined,
        enableAiSemantic,
        limit: 50,
      });
      visibleArticles = hybridResults.map((r) => ({
        ...r.article,
        searchScore: r.score,
        matchReason: r.matchReason,
      }));
    }

    const needsImprovementCount = articlesWithFeedback.filter(
      (a) => a.needsImprovement || (a.unhelpfulCount || 0) > 0
    ).length;

    const categories = [
      { key: 'ALL', name: 'Tất cả bài viết', count: visibleArticles.length },
      { key: 'NETWORK', name: 'Hệ thống mạng & WiFi', count: visibleArticles.filter((a) => a.categoryKey === 'NETWORK').length },
      { key: 'EMAIL', name: 'Email & Outlook', count: visibleArticles.filter((a) => a.categoryKey === 'EMAIL').length },
      { key: 'SOFTWARE', name: 'Phần mềm & ERP', count: visibleArticles.filter((a) => a.categoryKey === 'SOFTWARE').length },
      { key: 'PRINTER', name: 'Máy in & Scan', count: visibleArticles.filter((a) => a.categoryKey === 'PRINTER').length },
      { key: 'HARDWARE', name: 'Phần cứng & Thiết bị', count: visibleArticles.filter((a) => a.categoryKey === 'HARDWARE' || a.categoryKey === 'APPROVAL').length },
      { key: 'ACCOUNT', name: 'Tài khoản & Mật khẩu', count: visibleArticles.filter((a) => a.categoryKey === 'ACCOUNT').length },
    ];

    const teamScopes = [
      { key: 'ALL', name: 'Toàn bộ phạm vi', count: allArticles.length },
      { key: 'PUBLIC', name: '🌍 Dành cho Tất cả Nhân viên', count: allArticles.filter((a) => a.teamScope === 'PUBLIC').length },
      { key: 'IT-NET', name: '🔒 Team IT Network & Hạ Tầng', count: allArticles.filter((a) => a.teamScope === 'IT-NET').length },
      { key: 'IT-APP', name: '🔒 Team IT Ứng Dụng & ERP', count: allArticles.filter((a) => a.teamScope === 'IT-APP').length },
      { key: 'IT-HELPDESK', name: '🔒 Team IT Helpdesk & Thiết Bị', count: allArticles.filter((a) => a.teamScope === 'IT-HELPDESK').length },
      { key: 'IT-SEC', name: '🔒 Team An Toàn & Bảo Mật', count: allArticles.filter((a) => a.teamScope === 'IT-SEC').length },
    ];

    return NextResponse.json({
      success: true,
      data: visibleArticles,
      categories,
      teamScopes,
      needsImprovementCount,
      userRole,
      isITStaff,
      isAdmin,
      canCreate,
      canUpdate,
      canDelete,
    });
  } catch (error) {
    console.error('KB API error:', error);
    return NextResponse.json({ error: 'Failed to fetch KB articles' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = currentUser.roleName || 'Staff';
    const isAdmin = isAdminOrAbove(userRole) || (Array.isArray((currentUser as any).permissions) && (currentUser as any).permissions.includes('*'));
    const canCreate = isAdmin || (await hasPermission(currentUser.userId, 'kb.create'));

    if (!canCreate) {
      return NextResponse.json({ error: 'Chỉ người dùng có quyền thêm tài liệu IT (kb.create) hoặc Quản trị viên mới được phép thực hiện.' }, { status: 403 });
    }

    const body = await request.json();
    const { title, teamScope = 'PUBLIC', content, summary, category = 'OTHER', fileUrl, fileName } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Tiêu đề bài viết không được để trống' }, { status: 400 });
    }

    let finalTitle = title.trim();
    if (teamScope !== 'PUBLIC' && !finalTitle.includes(`[${teamScope}]`)) {
      finalTitle = `[${teamScope}] ${finalTitle}`;
    }

    const newDoc = await prisma.document.create({
      data: {
        title: finalTitle,
        type: DocumentType.OTHER,
        notes: `${summary ? summary + '\n\n' : ''}${content || ''}`,
        fileUrl: fileUrl || '/uploads/documents/it-guidelines.pdf',
        fileName: fileName || `${finalTitle.slice(0, 30)}.pdf`,
        createdById: currentUser.userId,
      },
    });

    return NextResponse.json({
      success: true,
      data: newDoc,
      message: 'Đã tạo bài viết hướng dẫn thành công!',
    });
  } catch (error: any) {
    console.error('Create KB error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi tạo bài viết' }, { status: 500 });
  }
}
