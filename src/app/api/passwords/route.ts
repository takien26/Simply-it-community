import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const groupName = searchParams.get('groupName') || '';
    const companyName = searchParams.get('companyName') || '';
    const favoriteOnly = searchParams.get('favoriteOnly') === 'true';

    const where: any = {};

    if (favoriteOnly) {
      where.isFavorite = true;
    }

    if (category && category !== 'ALL') {
      where.category = category;
    }

    if (groupName && groupName !== 'ALL') {
      where.groupName = groupName;
    }

    if (companyName && companyName !== 'ALL') {
      where.companyName = companyName;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        { url: { contains: search, mode: 'insensitive' } },
        { groupName: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }

    const passwords = await prisma.passwordEntry.findMany({
      where,
      orderBy: [{ isFavorite: 'desc' }, { updatedAt: 'desc' }],
      include: {
        asset: { select: { id: true, assetTag: true, name: true } },
        service: { select: { id: true, serviceCode: true, name: true } },
        vendor: { select: { id: true, name: true } },
        createdBy: { select: { id: true, fullName: true, email: true } },
      },
    });

    // Groups & Categories statistics
    const allGroups = await prisma.passwordEntry.findMany({
      select: { groupName: true, category: true },
    });

    const groupCounts: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};

    for (const item of allGroups) {
      if (item.groupName) {
        groupCounts[item.groupName] = (groupCounts[item.groupName] || 0) + 1;
      }
      if (item.category) {
        categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
      }
    }

    return NextResponse.json({
      success: true,
      data: passwords,
      stats: {
        total: passwords.length,
        favorites: passwords.filter((p) => p.isFavorite).length,
        groupCounts,
        categoryCounts,
      },
    });
  } catch (error: any) {
    console.error('Fetch passwords error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi tải danh sách mật khẩu' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const body = await req.json();
    const { title, username, password, url, category, groupName, companyName, assetId, serviceId, vendorId, isFavorite, totpSecret, notes } = body;

    if (!title || !password) {
      return NextResponse.json({ error: 'Tiêu đề và Mật khẩu là bắt buộc' }, { status: 400 });
    }

    const newEntry = await prisma.passwordEntry.create({
      data: {
        title: String(title).trim(),
        username: username ? String(username).trim() : null,
        password: String(password),
        url: url ? String(url).trim() : null,
        category: category || 'GENERAL',
        groupName: groupName ? String(groupName).trim() : 'Mặc định (Root)',
        companyName: companyName ? String(companyName).trim() : null,
        assetId: assetId || null,
        serviceId: serviceId || null,
        vendorId: vendorId || null,
        isFavorite: Boolean(isFavorite),
        totpSecret: totpSecret ? String(totpSecret).trim() : null,
        notes: notes ? String(notes).trim() : null,
        createdById: user.userId,
      },
      include: {
        asset: { select: { id: true, assetTag: true, name: true } },
        service: { select: { id: true, serviceCode: true, name: true } },
        vendor: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, data: newEntry });
  } catch (error: any) {
    console.error('Create password error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi tạo mật khẩu mới' }, { status: 500 });
  }
}
