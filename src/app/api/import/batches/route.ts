import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/import/batches - List import history
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');

    const [batches, total] = await Promise.all([
      prisma.importBatch.findMany({
        include: {
          importedBy: { select: { id: true, fullName: true, email: true } },
          records: {
            where: { status: 'FAILED' },
            select: { rowNumber: true, errorMessage: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.importBatch.count(),
    ]);

    return NextResponse.json({
      success: true,
      data: batches,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('List import batches error:', error);
    return NextResponse.json({ error: 'Failed to list import batches' }, { status: 500 });
  }
}
