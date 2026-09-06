import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

const SETTING_KEY_CAMPAIGNS = 'audit_campaigns_list';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const setting = await prisma.systemSetting.findUnique({
      where: { key: SETTING_KEY_CAMPAIGNS },
    });

    let list: any[] = [];
    if (setting?.value) {
      try {
        list = JSON.parse(setting.value);
      } catch {}
    }

    const campaign = list.find((c) => c.id === id);
    if (!campaign) {
      return NextResponse.json({ error: 'Không tìm thấy đợt kiểm kê' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: campaign });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi tải đợt kiểm kê' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action, itemUpdate } = body;

    const setting = await prisma.systemSetting.findUnique({
      where: { key: SETTING_KEY_CAMPAIGNS },
    });

    let list: any[] = [];
    if (setting?.value) {
      try {
        list = JSON.parse(setting.value);
      } catch {}
    }

    const campaignIdx = list.findIndex((c) => c.id === id);
    if (campaignIdx === -1) {
      return NextResponse.json({ error: 'Không tìm thấy đợt kiểm kê' }, { status: 404 });
    }

    const campaign = list[campaignIdx];

    // Action 1: Update specific item audit status
    if (action === 'VERIFY_ITEM' && (itemUpdate?.assetId || itemUpdate?.assetTag)) {
      const itemIdx = campaign.items.findIndex(
        (i: any) => i.id === itemUpdate.assetId || i.assetTag === itemUpdate.assetTag
      );

      if (itemIdx !== -1) {
        campaign.items[itemIdx] = {
          ...campaign.items[itemIdx],
          isAudited: true,
          auditStatus: itemUpdate.auditStatus || 'MATCHED',
          actualUserId: itemUpdate.actualUserId || campaign.items[itemIdx].actualUserId,
          actualUserName: itemUpdate.actualUserName || campaign.items[itemIdx].actualUserName,
          actualLocationId: itemUpdate.actualLocationId || campaign.items[itemIdx].actualLocationId,
          actualLocationName: itemUpdate.actualLocationName || campaign.items[itemIdx].actualLocationName,
          actualCondition: itemUpdate.actualCondition || campaign.items[itemIdx].actualCondition,
          actualNotes: itemUpdate.actualNotes || '',
          actualPhotoUrl: itemUpdate.actualPhotoUrl !== undefined ? itemUpdate.actualPhotoUrl : (campaign.items[itemIdx].actualPhotoUrl || null),
          auditedAt: new Date().toISOString(),
          auditedBy: user.email || 'IT Staff',
        };

        // Recalculate auditedCount
        campaign.auditedCount = campaign.items.filter((i: any) => i.isAudited || i.auditStatus !== 'PENDING').length;

        // Create maintenance inspection log
        try {
          await prisma.assetMaintenanceLog.create({
            data: {
              assetId: campaign.items[itemIdx].id,
              type: 'INSPECTION',
              title: 'Kiểm kê đợt: ' + campaign.title,
              description: 'Kết quả: ' + (itemUpdate.auditStatus || 'MATCHED') + '. Ghi chú: ' + (itemUpdate.actualNotes || 'Khớp đúng.'),
              performedById: user.userId || undefined,
              cost: 0,
              attachmentUrls: itemUpdate.actualPhotoUrl ? [itemUpdate.actualPhotoUrl] : undefined,
              performedAt: new Date(),
            },
          });
        } catch {}
      }
    }

    // Action 2: Finalize Campaign
    if (action === 'FINALIZE') {
      campaign.status = 'COMPLETED';
      campaign.completedAt = new Date().toISOString();
      campaign.completedBy = user.email;
    }

    list[campaignIdx] = campaign;

    await prisma.systemSetting.upsert({
      where: { key: SETTING_KEY_CAMPAIGNS },
      update: { value: JSON.stringify(list), updatedAt: new Date() },
      create: {
        key: SETTING_KEY_CAMPAIGNS,
        value: JSON.stringify(list),
        type: 'JSON',
        group: 'audit',
        label: 'Danh Sách Đợt Kiểm Kê',
      },
    });

    return NextResponse.json({ success: true, data: campaign });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi cập nhật kiểm kê' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const setting = await prisma.systemSetting.findUnique({
      where: { key: SETTING_KEY_CAMPAIGNS },
    });

    let list: any[] = [];
    if (setting?.value) {
      try {
        list = JSON.parse(setting.value);
      } catch {}
    }

    list = list.filter((c) => c.id !== id);

    await prisma.systemSetting.upsert({
      where: { key: SETTING_KEY_CAMPAIGNS },
      update: { value: JSON.stringify(list), updatedAt: new Date() },
      create: {
        key: SETTING_KEY_CAMPAIGNS,
        value: JSON.stringify(list),
        type: 'JSON',
        group: 'audit',
        label: 'Danh Sách Đợt Kiểm Kê',
      },
    });

    return NextResponse.json({ success: true, message: 'Đã xóa đợt kiểm kê' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi xóa đợt kiểm kê' }, { status: 500 });
  }
}
