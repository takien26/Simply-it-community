import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { decrypt } from '@/lib/crypto';
import { createAuditLog } from '@/lib/audit';
import * as ExcelJS from 'exceljs';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const allowed = user.roleName === 'Admin' || (await hasPermission(user.userId, 'passwords.export'));
    if (!allowed) return NextResponse.json({ error: 'Chỉ Quản trị viên (Admin) mới có quyền trích xuất toàn bộ kho mật khẩu' }, { status: 403 });

    const passwords = await prisma.passwordEntry.findMany({
      orderBy: [{ groupName: 'asc' }, { title: 'asc' }],
    });

    await createAuditLog({
      userId: user.userId,
      action: 'UPDATE',
      entityType: 'PASSWORD_VAULT',
      entityId: user.userId,
      changes: {
        event: 'EXPORT_ALL_PASSWORDS',
        count: passwords.length,
        timestamp: new Date().toISOString(),
      },
    }).catch(() => {});

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('KeePass_Passwords');

    worksheet.columns = [
      { header: 'Nhóm / Thư Mục (Group)', key: 'groupName', width: 22 },
      { header: 'Tiêu Đề / Dịch Vụ (Title)', key: 'title', width: 30 },
      { header: 'Tên Đăng Nhập (Username)', key: 'username', width: 25 },
      { header: 'Mật Khẩu (Password)', key: 'password', width: 25 },
      { header: 'Đường Dẫn / IP (URL)', key: 'url', width: 35 },
      { header: 'Phân Loại (Category)', key: 'category', width: 18 },
      { header: 'Công Ty Quản Lý', key: 'companyName', width: 25 },
      { header: 'Ghi Chú (Notes)', key: 'notes', width: 35 },
    ];

    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' },
    };

    passwords.forEach((p) => {
      worksheet.addRow({
        groupName: p.groupName || 'Mặc định (Root)',
        title: p.title,
        username: p.username || '',
        password: decrypt(p.password),
        url: p.url || '',
        category: p.category,
        companyName: p.companyName || '',
        notes: p.notes || '',
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const headers = new Headers();
    headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    headers.set('Content-Disposition', `attachment; filename="KeePass_Passwords_Export_${new Date().toISOString().split('T')[0]}.xlsx"`);

    return new NextResponse(buffer as unknown as BodyInit, { status: 200, headers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
