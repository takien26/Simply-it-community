import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { reconcileSoftwareLicenses } from '@/lib/license-reconciliation';
import { detectDeviceType, resolveCategoryForDevice } from '@/lib/device-detection';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      hostname,
      serialNumber,
      brand,
      model,
      deviceType,
      specs,
      scannedAt,
      installedSoftware = [],
      osLicense,
      officeLicense,
      crackDetection,
    } = body;

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

      // Reconcile licenses against warehouse without mutating assignments
      const targetSoftware = Array.isArray(installedSoftware) && installedSoftware.length > 0
        ? installedSoftware
        : (currentSpecs.installedSoftware || []);

      const reconciliation = await reconcileSoftwareLicenses(targetSoftware, existingAsset.id);

      // Merge Specs
      const mergedSpecs = {
        ...currentSpecs,
        ...newSpecs,
        installedSoftware: targetSoftware,
        osLicense: osLicense || currentSpecs.osLicense || null,
        officeLicense: officeLicense || currentSpecs.officeLicense || null,
        crackDetection: crackDetection || currentSpecs.crackDetection || null,
        licenseMatches: reconciliation.licenseMatches,
        unmanagedCommercialApps: reconciliation.unmanagedCommercialApps,
        lastScannedAt: scannedAt || new Date().toISOString(),
        lastScannedHost: cleanHostname,
        hardwareChangeAlert: hasHardwareChange ? changeLogs.join('; ') : currentSpecs.hardwareChangeAlert,
      };

      // Detect device type and resolve category
      const detectedType = detectDeviceType({
        deviceType,
        brand: brand || existingAsset.brand,
        model: model || existingAsset.model,
        hostname: cleanHostname,
        specs: { ...mergedSpecs, ...newSpecs },
      });
      const targetCategory = await resolveCategoryForDevice(detectedType);

      let targetCategoryId = existingAsset.categoryId;
      if (targetCategory && targetCategory.id !== existingAsset.categoryId) {
        const currentCatName = existingAsset.category?.name || '';
        const isGenericCat =
          !existingAsset.categoryId ||
          currentCatName === 'Thiết bị văn phòng' ||
          currentCatName === 'Khác' ||
          currentCatName === 'Other' ||
          currentCatName === 'Chưa phân loại';

        if (
          isGenericCat ||
          (detectedType === 'Laptop' && (currentCatName.includes('để bàn') || currentCatName.includes('PC'))) ||
          (detectedType === 'Desktop' && currentCatName.toLowerCase().includes('laptop')) ||
          (detectedType === 'Server' && !currentCatName.toLowerCase().includes('server') && !currentCatName.includes('chủ'))
        ) {
          targetCategoryId = targetCategory.id;
          changeLogs.push(`Tự động cập nhật danh mục: "${currentCatName || 'Trống'}" ➔ "${targetCategory.name}"`);
        }
      }

      mergedSpecs.deviceType = detectedType;

      const updated = await prisma.asset.update({
        where: { id: existingAsset.id },
        data: {
          brand: brand || existingAsset.brand,
          model: model || existingAsset.model,
          categoryId: targetCategoryId,
          specs: mergedSpecs,
          updatedAt: new Date(),
        },
      });

      let statusNote = '';
      if (reconciliation.summary.unassignedMatches > 0) {
        statusNote += ` (Phát hiện ${reconciliation.summary.unassignedMatches} phần mềm trùng License trong kho chưa gán)`;
      }
      if (crackDetection?.hasSuspect) {
        statusNote += ' (⚠️ Cảnh báo: Phát hiện dấu hiệu crack/bẻ khóa)';
      }

      return NextResponse.json({
        success: true,
        message: `✅ Đã cập nhật thông số quét tự động cho thiết bị ${existingAsset.assetTag} (${cleanHostname})${statusNote}`,
        assetId: updated.id,
        assetTag: updated.assetTag,
        hasHardwareChange,
        changeLogs,
        isNew: false,
        reconciliation: reconciliation.summary,
        crackDetection: crackDetection || null,
      });
    }

    // 3. Asset NOT found -> Register into Database
    const detectedType = detectDeviceType({
      deviceType,
      brand,
      model,
      hostname: cleanHostname,
      specs: newSpecs,
    });
    const category = await resolveCategoryForDevice(detectedType);

    // Generate tag
    const tagCount = await prisma.asset.count();
    const generatedTag = `AST-${String(tagCount + 1).padStart(4, '0')}`;

    const targetSoftware = Array.isArray(installedSoftware) ? installedSoftware : [];
    const reconciliation = await reconcileSoftwareLicenses(targetSoftware, null);

    const newSpecsData = {
      ...newSpecs,
      deviceType: detectedType,
      installedSoftware: targetSoftware,
      osLicense: osLicense || null,
      officeLicense: officeLicense || null,
      crackDetection: crackDetection || null,
      licenseMatches: reconciliation.licenseMatches,
      unmanagedCommercialApps: reconciliation.unmanagedCommercialApps,
      lastScannedAt: scannedAt || new Date().toISOString(),
      lastScannedHost: cleanHostname,
      autoDiscovered: true,
    };

    const deviceTypeLabel = detectedType === 'Laptop' ? 'Laptop' : detectedType === 'Server' ? 'Máy chủ' : 'Máy tính';
    const newAsset = await prisma.asset.create({
      data: {
        assetTag: generatedTag,
        name: cleanHostname ? `${deviceTypeLabel} ${cleanHostname}` : `${deviceTypeLabel} ${model || 'Mới'}`,
        brand: brand || 'Generic',
        model: model || (detectedType === 'Laptop' ? 'Laptop' : 'PC'),
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
      reconciliation: reconciliation.summary,
      crackDetection: crackDetection || null,
    });
  } catch (error: any) {
    console.error('Auto-Scan Collect API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi xử lý dữ liệu quét tự động: ' + (error?.message || error) },
      { status: 500 }
    );
  }
}
