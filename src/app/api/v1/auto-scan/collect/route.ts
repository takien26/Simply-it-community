import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { hostname, serialNumber, brand, model, specs, scannedAt, installedSoftware = [] } = body;

    if (!serialNumber && !hostname) {
      return NextResponse.json(
        { success: false, error: 'Thiếu thông tin Serial Number hoặc Hostname' },
        { status: 400 }
      );
    }

    const cleanSerial = (serialNumber || '').trim();
    const cleanHostname = (hostname || '').trim();

    // 1. Check if asset exists by Serial Number or Hostname
    let existingAsset = null;
    if (cleanSerial) {
      existingAsset = await prisma.asset.findFirst({
        where: { serialNumber: { equals: cleanSerial, mode: 'insensitive' } },
        include: { category: true, assignments: { where: { returnedAt: null } } },
      });
    }

    if (!existingAsset && cleanHostname) {
      existingAsset = await prisma.asset.findFirst({
        where: { name: { contains: cleanHostname, mode: 'insensitive' } },
        include: { category: true, assignments: { where: { returnedAt: null } } },
      });
    }

    const currentSpecs = (existingAsset?.specs as Record<string, any>) || {};
    const newSpecs = specs || {};

    // 2. Hardware Change Detection
    let hasHardwareChange = false;
    const changeLogs: string[] = [];

    if (existingAsset) {
      if (currentSpecs.ram && newSpecs.ram && currentSpecs.ram !== newSpecs.ram) {
        hasHardwareChange = true;
        changeLogs.push(`RAM thay đổi từ "${currentSpecs.ram}" sang "${newSpecs.ram}"`);
      }
      if (currentSpecs.cpu && newSpecs.cpu && currentSpecs.cpu !== newSpecs.cpu) {
        hasHardwareChange = true;
        changeLogs.push(`CPU thay đổi từ "${currentSpecs.cpu}" sang "${newSpecs.cpu}"`);
      }
      if (currentSpecs.storage && newSpecs.storage && currentSpecs.storage !== newSpecs.storage) {
        hasHardwareChange = true;
        changeLogs.push(`Ổ cứng thay đổi từ "${currentSpecs.storage}" sang "${newSpecs.storage}"`);
      }

      // Merge Specs
      const mergedSpecs = {
        ...currentSpecs,
        ...newSpecs,
        installedSoftware: Array.isArray(installedSoftware) && installedSoftware.length > 0
          ? installedSoftware
          : (currentSpecs.installedSoftware || []),
        lastScannedAt: scannedAt || new Date().toISOString(),
        lastScannedHost: cleanHostname,
        hardwareChangeAlert: hasHardwareChange ? changeLogs.join('; ') : currentSpecs.hardwareChangeAlert,
      };

      const updated = await prisma.asset.update({
        where: { id: existingAsset.id },
        data: {
          brand: brand || existingAsset.brand,
          model: model || existingAsset.model,
          specs: mergedSpecs,
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: `✅ Đã cập nhật thông số quét tự động cho thiết bị ${existingAsset.assetTag} (${cleanHostname})`,
        assetId: updated.id,
        assetTag: updated.assetTag,
        hasHardwareChange,
        changeLogs,
        isNew: false,
      });
    }

    // 3. Asset NOT found -> Register into Database
    let category = await prisma.assetCategory.findFirst({
      where: { name: { in: ['Laptop', 'Máy tính', 'Thiết bị văn phòng'] } },
    });
    if (!category) {
      category = await prisma.assetCategory.findFirst();
    }

    // Generate tag
    const tagCount = await prisma.asset.count();
    const generatedTag = `AST-${String(tagCount + 1).padStart(4, '0')}`;

    const newSpecsData = {
      ...newSpecs,
      installedSoftware: Array.isArray(installedSoftware) ? installedSoftware : [],
      lastScannedAt: scannedAt || new Date().toISOString(),
      lastScannedHost: cleanHostname,
      autoDiscovered: true,
    };

    const newAsset = await prisma.asset.create({
      data: {
        assetTag: generatedTag,
        name: cleanHostname ? `Máy tính ${cleanHostname}` : `Thiết bị ${model || 'Mới'}`,
        brand: brand || 'Generic',
        model: model || 'PC/Laptop',
        serialNumber: cleanSerial || generatedTag,
        categoryId: category?.id || '',
        status: 'PENDING',
        condition: 'GOOD',
        specs: newSpecsData,
      },
    });

    return NextResponse.json({
      success: true,
      message: `🎉 Đã phát hiện và tự động đưa vào danh sách Chờ Duyệt: ${newAsset.name} (${generatedTag})`,
      assetId: newAsset.id,
      assetTag: newAsset.assetTag,
      isNew: true,
    });
  } catch (error: any) {
    console.error('Auto-Scan Collect API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi xử lý dữ liệu quét tự động: ' + (error?.message || error) },
      { status: 500 }
    );
  }
}
