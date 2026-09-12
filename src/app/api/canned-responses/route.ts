// src/app/api/canned-responses/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

const DEFAULT_TEMPLATES = [
  {
    title: 'Đặt lại mật khẩu tạm thời',
    shortcut: '/pass',
    category: 'ACCOUNT',
    content: 'Chào anh/chị,\nBộ phận IT đã hỗ trợ đặt lại mật khẩu tài khoản của anh/chị. Mật khẩu tạm thời là: SimplyIT@2026.\nAnh/chị vui lòng đăng nhập và đổi sang mật khẩu cá nhân mới ngay nhé.',
  },
  {
    title: 'Hẹn lịch hỗ trợ trực tiếp',
    shortcut: '/visit',
    category: 'SUPPORT',
    content: 'Chào anh/chị,\nKỹ thuật viên IT đã tiếp nhận sự cố và sẽ qua hỗ trợ trực tiếp tại vị trí của anh/chị trong khoảng 15 - 30 phút tới. Anh/chị vui lòng giữ máy tính hoạt động giúp em nhé.',
  },
  {
    title: 'Hướng dẫn kiểm tra cáp mạng & Khởi động',
    shortcut: '/restart',
    category: 'HARDWARE',
    content: 'Chào anh/chị,\nAnh/chị vui lòng thử thao tác nhanh giúp IT:\n1. Rút và cắm chặt lại cáp mạng (hoặc tắt/bật lại Wi-Fi).\n2. Khởi động lại máy tính (Restart).\nNếu sự cố vẫn tiếp diễn, anh/chị phản hồi lại để IT cử người qua kiểm tra ngay nhé.',
  },
  {
    title: 'Xác nhận xử lý hoàn tất',
    shortcut: '/done',
    category: 'GENERAL',
    content: 'Chào anh/chị,\nSự cố của anh/chị đã được bộ phận IT xử lý hoàn tất. Anh/chị vui lòng kiểm tra lại và phản hồi nếu cần hỗ trợ thêm nhé. Chúc anh/chị một ngày làm việc hiệu quả!',
  },
  {
    title: 'Chờ cấp phát / Đặt linh kiện thay thế',
    shortcut: '/waiting',
    category: 'HARDWARE',
    content: 'Chào anh/chị,\nThiết bị cần được thay thế linh kiện từ kho kỹ thuật. IT đang tiến hành thủ tục xuất kho và sẽ tiến hành lắp đặt ngay khi có thiết bị (dự kiến trong 1 - 2 ngày làm việc).',
  },
];

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let items = await prisma.cannedResponse.findMany({
      orderBy: { createdAt: 'asc' },
    });

    // Auto-seed default templates if empty
    if (items.length === 0) {
      await prisma.cannedResponse.createMany({
        data: DEFAULT_TEMPLATES,
      });
      items = await prisma.cannedResponse.findMany({
        orderBy: { createdAt: 'asc' },
      });
    }

    return NextResponse.json({
      success: true,
      data: items,
    });
  } catch (error: any) {
    console.error('Fetch canned responses error:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi tải mẫu trả lời' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, content, shortcut, category } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Tiêu đề và nội dung mẫu không được để trống' },
        { status: 400 }
      );
    }

    const item = await prisma.cannedResponse.create({
      data: {
        title: title.trim(),
        content: content.trim(),
        shortcut: shortcut ? shortcut.trim() : null,
        category: category || 'GENERAL',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Đã thêm mẫu trả lời nhanh thành công!',
      data: item,
    });
  } catch (error: any) {
    console.error('Create canned response error:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi tạo mẫu trả lời' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
    }

    await prisma.cannedResponse.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Đã xóa mẫu trả lời nhanh!',
    });
  } catch (error: any) {
    console.error('Delete canned response error:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi xóa mẫu trả lời' },
      { status: 500 }
    );
  }
}
