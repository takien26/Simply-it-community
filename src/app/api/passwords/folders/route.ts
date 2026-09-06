import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const body = await req.json();
    const { action, oldPath, newPath, parentPath, folderName, sourcePath, targetParentPath, orderedPaths } = body;

    // Action 1: Create New Folder / Subfolder
    if (action === 'CREATE') {
      const fullPath = parentPath ? `${parentPath} / ${folderName}` : folderName;
      const setting = await prisma.systemSetting.findUnique({ where: { key: 'passwords.custom_folders' } });
      let folders: string[] = [];
      if (setting && setting.value) {
        try { folders = JSON.parse(setting.value); } catch {}
      }
      if (!folders.includes(fullPath)) {
        folders.push(fullPath);
        await prisma.systemSetting.upsert({
          where: { key: 'passwords.custom_folders' },
          update: { value: JSON.stringify(folders) },
          create: {
            key: 'passwords.custom_folders',
            value: JSON.stringify(folders),
            group: 'passwords',
            label: 'Cây thư mục mật khẩu tùy biến',
            type: 'JSON',
          },
        });
      }
      return NextResponse.json({ success: true, fullPath, message: `Đã tạo thư mục "${folderName}"` });
    }

    // Action 2: Rename Folder
    if (action === 'RENAME') {
      if (!oldPath || !newPath) return NextResponse.json({ error: 'Thiếu đường dẫn cũ/mới' }, { status: 400 });

      const allEntries = await prisma.passwordEntry.findMany({
        where: {
          OR: [
            { groupName: oldPath },
            { groupName: { startsWith: `${oldPath} /` } },
          ],
        },
      });

      for (const entry of allEntries) {
        const updatedGroupName = entry.groupName === oldPath 
          ? newPath 
          : entry.groupName?.replace(`${oldPath} /`, `${newPath} /`) || newPath;

        await prisma.passwordEntry.update({
          where: { id: entry.id },
          data: { groupName: updatedGroupName },
        });
      }

      // Update custom folders
      const setting = await prisma.systemSetting.findUnique({ where: { key: 'passwords.custom_folders' } });
      if (setting && setting.value) {
        try {
          let folders: string[] = JSON.parse(setting.value);
          folders = folders.map((f) => f === oldPath ? newPath : f.startsWith(`${oldPath} /`) ? f.replace(`${oldPath} /`, `${newPath} /`) : f);
          await prisma.systemSetting.update({
            where: { key: 'passwords.custom_folders' },
            data: { value: JSON.stringify(folders) },
          });
        } catch {}
      }

      // Update folder order
      const orderSetting = await prisma.systemSetting.findUnique({ where: { key: 'passwords.folder_order' } });
      if (orderSetting && orderSetting.value) {
        try {
          let orderList: string[] = JSON.parse(orderSetting.value);
          orderList = orderList.map((f) => f === oldPath ? newPath : f.startsWith(`${oldPath} /`) ? f.replace(`${oldPath} /`, `${newPath} /`) : f);
          await prisma.systemSetting.update({
            where: { key: 'passwords.folder_order' },
            data: { value: JSON.stringify(orderList) },
          });
        } catch {}
      }

      return NextResponse.json({ success: true, message: `Đã đổi tên thư mục thành "${newPath}"` });
    }

    // Action 3: Delete Folder
    if (action === 'DELETE') {
      if (!oldPath) return NextResponse.json({ error: 'Thiếu đường dẫn thư mục' }, { status: 400 });

      await prisma.passwordEntry.updateMany({
        where: {
          OR: [
            { groupName: oldPath },
            { groupName: { startsWith: `${oldPath} /` } },
          ],
        },
        data: { groupName: 'Mặc định (Root)' },
      });

      const setting = await prisma.systemSetting.findUnique({ where: { key: 'passwords.custom_folders' } });
      if (setting && setting.value) {
        try {
          let folders: string[] = JSON.parse(setting.value);
          folders = folders.filter((f) => f !== oldPath && !f.startsWith(`${oldPath} /`));
          await prisma.systemSetting.update({
            where: { key: 'passwords.custom_folders' },
            data: { value: JSON.stringify(folders) },
          });
        } catch {}
      }

      return NextResponse.json({ success: true, message: `Đã xóa thư mục "${oldPath}" và chuyển mật khẩu về mặc định.` });
    }

    // Action 4: Move Folder into another Parent or to Root
    if (action === 'MOVE') {
      if (!sourcePath) return NextResponse.json({ error: 'Thiếu đường dẫn thư mục nguồn' }, { status: 400 });

      const segs = sourcePath.split(' / ').map((s: string) => s.trim()).filter(Boolean);
      const folderLeafName = segs[segs.length - 1];

      let newBasePath = '';
      if (!targetParentPath || targetParentPath === 'ROOT' || targetParentPath === 'ALL') {
        newBasePath = folderLeafName;
      } else {
        newBasePath = `${targetParentPath} / ${folderLeafName}`;
      }

      if (newBasePath === sourcePath) {
        return NextResponse.json({ success: true, message: 'Vị trí không thay đổi' });
      }

      if (newBasePath.startsWith(`${sourcePath} /`)) {
        return NextResponse.json({ error: 'Không thể di chuyển thư mục cha vào thư mục con của chính nó!' }, { status: 400 });
      }

      const entriesToUpdate = await prisma.passwordEntry.findMany({
        where: {
          OR: [
            { groupName: sourcePath },
            { groupName: { startsWith: `${sourcePath} /` } },
          ],
        },
      });

      for (const entry of entriesToUpdate) {
        let updatedGroup = newBasePath;
        if (entry.groupName && entry.groupName.startsWith(`${sourcePath} /`)) {
          updatedGroup = entry.groupName.replace(`${sourcePath} /`, `${newBasePath} /`);
        }
        await prisma.passwordEntry.update({
          where: { id: entry.id },
          data: { groupName: updatedGroup },
        });
      }

      const setting = await prisma.systemSetting.findUnique({ where: { key: 'passwords.custom_folders' } });
      if (setting && setting.value) {
        try {
          let folders: string[] = JSON.parse(setting.value);
          folders = folders.map((f) => {
            if (f === sourcePath) return newBasePath;
            if (f.startsWith(`${sourcePath} /`)) return f.replace(`${sourcePath} /`, `${newBasePath} /`);
            return f;
          });
          await prisma.systemSetting.update({
            where: { key: 'passwords.custom_folders' },
            data: { value: JSON.stringify(folders) },
          });
        } catch {}
      }

      return NextResponse.json({
        success: true,
        newBasePath,
        message: `Đã di chuyển thư mục "${folderLeafName}" sang "${targetParentPath || 'Thư mục gốc (Root)'}"`,
      });
    }

    // Action 5: Reorder Folders Up/Down (Save Custom Sorting Order)
    if (action === 'REORDER') {
      if (!Array.isArray(orderedPaths)) return NextResponse.json({ error: 'Thiếu danh sách thứ tự' }, { status: 400 });

      await prisma.systemSetting.upsert({
        where: { key: 'passwords.folder_order' },
        update: { value: JSON.stringify(orderedPaths) },
        create: {
          key: 'passwords.folder_order',
          value: JSON.stringify(orderedPaths),
          group: 'passwords',
          label: 'Thứ tự sắp xếp cây thư mục mật khẩu',
          type: 'JSON',
        },
      });

      return NextResponse.json({ success: true, message: 'Đã lưu thứ tự sắp xếp thư mục' });
    }

    return NextResponse.json({ error: 'Hành động không hợp lệ' }, { status: 400 });
  } catch (error: any) {
    console.error('Folder API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: 'passwords.custom_folders' } });
    let customFolders: string[] = [];
    if (setting && setting.value) {
      try { customFolders = JSON.parse(setting.value); } catch {}
    }

    const orderSetting = await prisma.systemSetting.findUnique({ where: { key: 'passwords.folder_order' } });
    let folderOrder: string[] = [];
    if (orderSetting && orderSetting.value) {
      try { folderOrder = JSON.parse(orderSetting.value); } catch {}
    }

    return NextResponse.json({ success: true, customFolders, folderOrder });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
