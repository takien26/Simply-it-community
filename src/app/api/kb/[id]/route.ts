import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission, isAdminOrAbove } from '@/lib/permissions';
import { createAuditLog } from '@/lib/audit';
import { moveToTrash } from '@/lib/trash';
import { COMPREHENSIVE_IT_KB } from '@/lib/it-knowledge-base';
import { hideDefaultArticle } from '@/lib/kb-storage';
import { DocumentType } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET /api/kb/[id] - Lấy thông tin chi tiết bài viết
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // 1. Kiểm tra trong DB Document
    const doc = await prisma.document.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, fullName: true, email: true } },
      },
    });

    if (doc) {
      let docTeam = 'PUBLIC';
      let isInternal = false;
      const tagMatch = doc.title.match(/^\[([a-zA-Z0-9_-]+)\]/);
      if (tagMatch && tagMatch[1] !== 'Hướng dẫn xử lý') {
        docTeam = tagMatch[1];
        isInternal = docTeam !== 'PUBLIC';
      }

      return NextResponse.json({
        success: true,
        data: {
          id: doc.id,
          title: doc.title,
          slug: doc.id,
          category: String(doc.type || 'Tài liệu Kỹ thuật'),
          categoryKey: isInternal ? 'NETWORK' : 'OTHER',
          summary: doc.notes ? doc.notes.split('\n')[0] : doc.title,
          content: doc.notes || doc.title,
          steps: doc.notes || doc.title,
          views: 120,
          updatedAt: doc.updatedAt.toISOString(),
          isFeatured: isInternal,
          author: doc.createdBy?.fullName || 'Admin',
          teamScope: docTeam,
          isInternalIT: isInternal,
          fileUrl: doc.fileUrl,
          fileName: doc.fileName,
          isDefault: false,
        },
      });
    }

    // 2. Kiểm tra trong bài viết mặc định
    const defaultArt = COMPREHENSIVE_IT_KB.find((a) => a.id === id);
    if (defaultArt) {
      return NextResponse.json({
        success: true,
        data: {
          id: defaultArt.id,
          title: defaultArt.title,
          slug: defaultArt.id,
          category: defaultArt.category,
          categoryKey: defaultArt.categoryKey,
          summary: defaultArt.summary,
          content: defaultArt.steps,
          steps: defaultArt.steps,
          views: 850,
          updatedAt: '2026-05-15T10:00:00.000Z',
          isFeatured: true,
          author: 'IT Support Team',
          teamScope: 'PUBLIC',
          isInternalIT: false,
          isDefault: true,
        },
      });
    }

    return NextResponse.json({ error: 'Không tìm thấy bài viết' }, { status: 404 });
  } catch (error: any) {
    console.error('Get KB article error:', error);
    return NextResponse.json({ error: 'Failed to fetch article' }, { status: 500 });
  }
}

// PUT /api/kb/[id] - Chỉnh sửa bài viết (Yêu cầu quyền kb.update hoặc Admin)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = currentUser.roleName || 'Staff';
    const isAdmin = isAdminOrAbove(userRole) || (Array.isArray((currentUser as any).permissions) && (currentUser as any).permissions.includes('*'));
    const canUpdate = isAdmin || (await hasPermission(currentUser.userId, 'kb.update'));

    if (!canUpdate) {
      return NextResponse.json(
        { error: 'Bạn không có quyền chỉnh sửa bài viết này (Cần quyền kb.update hoặc vai trò Quản trị viên).' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { title, teamScope = 'PUBLIC', category = 'OTHER', summary, content, fileUrl, fileName } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Tiêu đề bài viết không được để trống' }, { status: 400 });
    }

    let finalTitle = title.trim();
    if (teamScope !== 'PUBLIC' && !finalTitle.includes(`[${teamScope}]`)) {
      finalTitle = `[${teamScope}] ${finalTitle}`;
    }

    const combinedNotes = `${summary ? summary.trim() + '\n\n' : ''}${content ? content.trim() : ''}`;

    // 1. Trường hợp là tài liệu trong CSDL Document
    const existingDoc = await prisma.document.findUnique({ where: { id } });
    if (existingDoc) {
      const updated = await prisma.document.update({
        where: { id },
        data: {
          title: finalTitle,
          notes: combinedNotes,
          fileUrl: fileUrl !== undefined ? fileUrl : existingDoc.fileUrl,
          fileName: fileName !== undefined ? fileName : existingDoc.fileName,
        },
      });

      await createAuditLog({
        action: 'UPDATE',
        entityType: 'Document',
        entityId: id,
        userId: currentUser.userId,
        changes: {
          title: finalTitle,
          teamScope,
          summary,
        },
      });

      return NextResponse.json({
        success: true,
        data: updated,
        message: 'Đã cập nhật bài viết thành công!',
      });
    }

    // 2. Trường hợp là bài viết mặc định trong COMPREHENSIVE_IT_KB
    const defaultArticle = COMPREHENSIVE_IT_KB.find((a) => a.id === id);
    if (defaultArticle) {
      // Chuyển bài viết mặc định thành Document tùy biến trong CSDL
      const newDoc = await prisma.document.create({
        data: {
          title: finalTitle,
          type: DocumentType.OTHER,
          notes: combinedNotes,
          fileUrl: fileUrl || '/uploads/documents/it-guidelines.pdf',
          fileName: fileName || `${finalTitle.slice(0, 30)}.pdf`,
          createdById: currentUser.userId,
        },
      });

      // Ẩn bài viết mặc định ban đầu để tránh trùng lặp
      await hideDefaultArticle(id);

      await createAuditLog({
        action: 'UPDATE',
        entityType: 'Document',
        entityId: newDoc.id,
        userId: currentUser.userId,
        changes: {
          originalDefaultId: id,
          newDocumentId: newDoc.id,
          title: finalTitle,
        },
      });

      return NextResponse.json({
        success: true,
        data: newDoc,
        message: 'Đã cập nhật và lưu bài viết thành công!',
      });
    }

    return NextResponse.json({ error: 'Không tìm thấy bài viết để cập nhật' }, { status: 404 });
  } catch (error: any) {
    console.error('Update KB article error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi khi cập nhật bài viết' }, { status: 500 });
  }
}

// DELETE /api/kb/[id] - Xóa bài viết (Yêu cầu quyền kb.delete hoặc Admin)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = currentUser.roleName || 'Staff';
    const isAdmin = isAdminOrAbove(userRole) || (Array.isArray((currentUser as any).permissions) && (currentUser as any).permissions.includes('*'));
    const canDelete = isAdmin || (await hasPermission(currentUser.userId, 'kb.delete'));

    if (!canDelete) {
      return NextResponse.json(
        { error: 'Bạn không có quyền xóa bài viết này (Cần quyền kb.delete hoặc vai trò Quản trị viên).' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // 1. Nếu là bài viết trong DB Document
    const existingDoc = await prisma.document.findUnique({ where: { id } });
    if (existingDoc) {
      // Sao lưu vào Thùng rác (Recycle Bin) trước khi xóa
      await moveToTrash({
        entityType: 'DOCUMENT',
        entityId: id,
        entityName: existingDoc.title,
        entityCode: existingDoc.fileName || null,
        dataSnapshot: existingDoc,
        deletedById: currentUser.userId,
        deletedByName: currentUser.fullName || currentUser.email,
      }).catch((err) => {
        console.error('Failed to snapshot document to trash:', err);
      });

      await prisma.document.delete({ where: { id } });

      await createAuditLog({
        action: 'DELETE',
        entityType: 'Document',
        entityId: id,
        userId: currentUser.userId,
        changes: { deletedTitle: existingDoc.title },
      });

      return NextResponse.json({
        success: true,
        message: 'Đã xóa bài viết và chuyển vào Thùng rác!',
      });
    }

    // 2. Nếu là bài viết mặc định trong COMPREHENSIVE_IT_KB
    const defaultArticle = COMPREHENSIVE_IT_KB.find((a) => a.id === id);
    if (defaultArticle) {
      await hideDefaultArticle(id);

      await createAuditLog({
        action: 'DELETE',
        entityType: 'Document',
        entityId: id,
        userId: currentUser.userId,
        changes: { deletedDefaultArticle: defaultArticle.title },
      });

      return NextResponse.json({
        success: true,
        message: 'Đã xóa bài viết khỏi Trung tâm tài liệu!',
      });
    }

    return NextResponse.json({ error: 'Không tìm thấy bài viết để xóa' }, { status: 404 });
  } catch (error: any) {
    console.error('Delete KB article error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi khi xóa bài viết' }, { status: 500 });
  }
}
