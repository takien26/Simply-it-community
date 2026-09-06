import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { COMPREHENSIVE_IT_KB, KBArticle } from '@/lib/it-knowledge-base';
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

    const userRole = currentUser.roleName || 'Staff';
    const isAdmin = userRole === 'Admin' || (Array.isArray((currentUser as any).permissions) && (currentUser as any).permissions.includes('*'));
    const isITStaff = isAdmin || userRole.toLowerCase().includes('it') || userRole.toLowerCase().includes('manager') || userRole.toLowerCase().includes('kỹ thuật');

    // 1. Fetch DB documents
    const dbDocs = await prisma.document.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    }).catch(() => []);

    // 2. Map standard KB articles
    const defaultArticles = COMPREHENSIVE_IT_KB.map((item, idx) => ({
      id: item.id,
      title: item.title,
      slug: item.id,
      category: item.category,
      categoryKey: item.categoryKey,
      summary: item.summary,
      content: item.steps,
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
      if (doc.title.includes('[IT-NET]')) { docTeam = 'IT-NET'; isInternal = true; }
      else if (doc.title.includes('[IT-APP]')) { docTeam = 'IT-APP'; isInternal = true; }
      else if (doc.title.includes('[IT-HELPDESK]')) { docTeam = 'IT-HELPDESK'; isInternal = true; }
      else if (doc.title.includes('[IT-SEC]')) { docTeam = 'IT-SEC'; isInternal = true; }

      return {
        id: doc.id,
        title: doc.title,
        slug: doc.id,
        category: String(doc.type || 'Tài liệu Kỹ thuật'),
        categoryKey: isInternal ? 'NETWORK' : 'OTHER',
        summary: doc.notes ? doc.notes.split('\n')[0] : doc.title,
        content: doc.notes || doc.title,
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

    // 4. RBAC Filter: Regular users ONLY see PUBLIC articles! Only IT/Admin can see internal team docs!
    let visibleArticles = allArticles.filter((art) => {
      if (isAdmin) return true;
      if (isITStaff) return true;
      return art.teamScope === 'PUBLIC' || !art.isInternalIT;
    });

    if (teamScope && teamScope !== 'ALL') {
      visibleArticles = visibleArticles.filter((a) => a.teamScope === teamScope);
    }

    if (category && category !== 'ALL') {
      visibleArticles = visibleArticles.filter(
        (a) => a.category.toLowerCase() === category.toLowerCase() || a.categoryKey === category
      );
    }

    if (search) {
      const q = search.toLowerCase();
      visibleArticles = visibleArticles.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.summary.toLowerCase().includes(q) ||
          a.content.toLowerCase().includes(q)
      );
    }

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
      userRole,
      isITStaff,
      isAdmin,
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
    const isAdmin = userRole === 'Admin' || (Array.isArray((currentUser as any).permissions) && (currentUser as any).permissions.includes('*'));
    const isITStaff = isAdmin || userRole.toLowerCase().includes('it') || userRole.toLowerCase().includes('manager') || userRole.toLowerCase().includes('kỹ thuật');

    if (!isITStaff && !isAdmin) {
      return NextResponse.json({ error: 'Chỉ Kỹ thuật viên IT hoặc Admin mới có quyền tải lên tài liệu hướng dẫn.' }, { status: 403 });
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
