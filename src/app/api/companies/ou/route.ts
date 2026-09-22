import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import { isAdminOrAbove } from '@/lib/rbac-defaults';
import {
  getOUStructure,
  saveOUStructure,
  generateOUId,
  DEFAULT_CORPORATE_DEPARTMENTS,
  parseDepartmentParts,
  formatDepartmentDisplay,
} from '@/lib/ou-structure';

// GET /api/companies/ou
export async function GET() {
  try {
    const ouTree = await getOUStructure();
    return NextResponse.json({ success: true, data: ouTree });
  } catch (error: any) {
    console.error('Fetch OU structure error:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi khi tải sơ đồ tổ chức OU' },
      { status: 500 }
    );
  }
}

// POST /api/companies/ou
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canManage =
      isAdminOrAbove(currentUser.roleName) ||
      (await hasPermission(currentUser.userId, 'companies.update'));

    if (!canManage) {
      return NextResponse.json(
        { error: 'Forbidden: Bạn không có quyền quản lý sơ đồ tổ chức' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, companyName } = body;

    if (!companyName || !companyName.trim()) {
      return NextResponse.json({ error: 'Tên công ty là bắt buộc' }, { status: 400 });
    }

    const trimmedCompName = companyName.trim();
    const ouTree = await getOUStructure();
    let compNode = ouTree.find(
      (c) => c.name.toLowerCase() === trimmedCompName.toLowerCase()
    );

    if (!compNode) {
      // Auto-create company node if absent
      compNode = {
        id: generateOUId('comp', trimmedCompName),
        name: trimmedCompName,
        departments: [],
      };
      ouTree.push(compNode);
    }

    switch (action) {
      // 1. ADD DEPARTMENT
      case 'ADD_DEPARTMENT': {
        const name = (body.name || '').trim();
        if (!name) {
          return NextResponse.json({ error: 'Tên phòng ban là bắt buộc' }, { status: 400 });
        }
        if (compNode.departments.some((d) => d.name.toLowerCase() === name.toLowerCase())) {
          return NextResponse.json(
            { error: `Phòng ban "${name}" đã tồn tại trong công ty này` },
            { status: 400 }
          );
        }

        const newDept = {
          id: generateOUId('dept', name),
          name,
          code: (body.code || '').trim() || undefined,
          icon: body.icon || '📁',
          description: (body.description || '').trim() || undefined,
          children: [],
        };
        compNode.departments.push(newDept);
        await saveOUStructure(ouTree);
        return NextResponse.json({ success: true, message: 'Đã thêm phòng ban thành công', data: newDept });
      }

      // 2. EDIT DEPARTMENT
      case 'EDIT_DEPARTMENT': {
        const oldName = (body.oldName || '').trim();
        const newName = (body.newName || '').trim();
        if (!oldName || !newName) {
          return NextResponse.json({ error: 'Tên cũ và tên mới là bắt buộc' }, { status: 400 });
        }

        const dept = compNode.departments.find(
          (d) => d.name.toLowerCase() === oldName.toLowerCase()
        );
        if (!dept) {
          return NextResponse.json({ error: `Không tìm thấy phòng ban "${oldName}"` }, { status: 404 });
        }

        dept.name = newName;
        if (body.code !== undefined) dept.code = (body.code || '').trim() || undefined;
        if (body.icon) dept.icon = body.icon;
        if (body.description !== undefined) dept.description = (body.description || '').trim() || undefined;

        await saveOUStructure(ouTree);

        // Cascading rename for users in this company and department
        if (body.cascadeUpdateUsers !== false) {
          const compUsers = await prisma.user.findMany({
            where: { companyName: compNode.name, department: { not: null } },
            select: { id: true, department: true },
          });

          for (const u of compUsers) {
            const { parent, child } = parseDepartmentParts(u.department);
            if (parent.toLowerCase() === oldName.toLowerCase()) {
              const updatedDeptStr = formatDepartmentDisplay(newName, child);
              await prisma.user.update({
                where: { id: u.id },
                data: { department: updatedDeptStr },
              });
            }
          }
        }

        return NextResponse.json({ success: true, message: 'Đã cập nhật phòng ban thành công', data: dept });
      }

      // 3. DELETE DEPARTMENT
      case 'DELETE_DEPARTMENT': {
        const name = (body.name || body.deptName || '').trim();
        const deptId = (body.deptId || '').trim();
        if (!name && !deptId) {
          return NextResponse.json({ error: 'Tên phòng ban hoặc ID là bắt buộc' }, { status: 400 });
        }

        const deptIndex = compNode.departments.findIndex(
          (d) => (name && d.name.toLowerCase() === name.toLowerCase()) || (deptId && d.id === deptId)
        );
        if (deptIndex === -1) {
          return NextResponse.json({ error: `Không tìm thấy phòng ban "${name || deptId}"` }, { status: 404 });
        }

        const targetDept = compNode.departments[deptIndex];

        // Check if users exist in this department
        if (!body.force) {
          const count = await prisma.user.count({
            where: {
              companyName: compNode.name,
              department: { startsWith: targetDept.name },
              isActive: true,
            },
          });
          if (count > 0) {
            return NextResponse.json(
              {
                error: `Không thể xóa: Có ${count} nhân sự đang thuộc phòng ban này. Vui lòng chuyển công tác trước khi xóa hoặc chọn xác nhận bắt buộc.`,
                requiresForce: true,
                userCount: count,
              },
              { status: 400 }
            );
          }
        }

        compNode.departments.splice(deptIndex, 1);
        await saveOUStructure(ouTree);
        return NextResponse.json({ success: true, message: 'Đã xóa phòng ban thành công' });
      }

      // 4. ADD SUB-DEPARTMENT
      case 'ADD_SUB_DEPARTMENT': {
        const deptName = (body.departmentName || body.parentDeptName || body.deptName || '').trim();
        const subName = (body.name || body.subDeptName || '').trim();
        if (!deptName || !subName) {
          return NextResponse.json({ error: 'Tên phòng ban cha và tên bộ phận con là bắt buộc' }, { status: 400 });
        }

        const dept = compNode.departments.find(
          (d) => d.name.toLowerCase() === deptName.toLowerCase() || (body.deptId && d.id === body.deptId)
        );
        if (!dept) {
          return NextResponse.json({ error: `Không tìm thấy phòng ban cha "${deptName}"` }, { status: 404 });
        }

        if (dept.children.some((c) => c.name.toLowerCase() === subName.toLowerCase())) {
          return NextResponse.json(
            { error: `Bộ phận "${subName}" đã tồn tại trong phòng ban này` },
            { status: 400 }
          );
        }

        const newSub = {
          id: generateOUId('sub', subName),
          name: subName,
          code: (body.code || '').trim() || undefined,
          description: (body.description || '').trim() || undefined,
        };
        dept.children.push(newSub);
        await saveOUStructure(ouTree);
        return NextResponse.json({ success: true, message: 'Đã thêm bộ phận con thành công', data: newSub });
      }

      // 5. EDIT SUB-DEPARTMENT
      case 'EDIT_SUB_DEPARTMENT': {
        const deptName = (body.departmentName || body.parentDeptName || body.deptName || '').trim();
        const oldSubName = (body.oldName || '').trim();
        const newSubName = (body.newName || body.name || '').trim();
        const subDeptId = (body.subDeptId || '').trim();

        if (!deptName || (!oldSubName && !subDeptId) || !newSubName) {
          return NextResponse.json({ error: 'Tên phòng ban cha, tên/id cũ và tên mới là bắt buộc' }, { status: 400 });
        }

        const dept = compNode.departments.find(
          (d) => d.name.toLowerCase() === deptName.toLowerCase() || (body.deptId && d.id === body.deptId)
        );
        if (!dept) {
          return NextResponse.json({ error: `Không tìm thấy phòng ban cha "${deptName}"` }, { status: 404 });
        }

        const sub = dept.children.find(
          (c) => (subDeptId && c.id === subDeptId) || (oldSubName && c.name.toLowerCase() === oldSubName.toLowerCase())
        );
        if (!sub) {
          return NextResponse.json({ error: `Không tìm thấy bộ phận "${oldSubName || subDeptId}"` }, { status: 404 });
        }

        const prevName = sub.name;
        sub.name = newSubName;
        if (body.code !== undefined) sub.code = (body.code || '').trim() || undefined;
        if (body.description !== undefined) sub.description = (body.description || '').trim() || undefined;

        await saveOUStructure(ouTree);

        // Cascading rename for users
        if (body.cascadeUpdateUsers !== false) {
          const oldFull = `${dept.name} / ${prevName}`;
          const newFull = `${dept.name} / ${newSubName}`;
          await prisma.user.updateMany({
            where: { companyName: compNode.name, department: oldFull },
            data: { department: newFull },
          });
        }

        return NextResponse.json({ success: true, message: 'Đã cập nhật bộ phận con thành công', data: sub });
      }

      // 6. DELETE SUB-DEPARTMENT
      case 'DELETE_SUB_DEPARTMENT': {
        const deptName = (body.departmentName || body.parentDeptName || body.deptName || '').trim();
        const subName = (body.name || body.subDeptName || '').trim();
        const subDeptId = (body.subDeptId || '').trim();

        if (!deptName || (!subName && !subDeptId)) {
          return NextResponse.json({ error: 'Tên phòng ban cha và tên bộ phận con là bắt buộc' }, { status: 400 });
        }

        const dept = compNode.departments.find(
          (d) => d.name.toLowerCase() === deptName.toLowerCase() || (body.deptId && d.id === body.deptId)
        );
        if (!dept) {
          return NextResponse.json({ error: `Không tìm thấy phòng ban cha "${deptName}"` }, { status: 404 });
        }

        const subIndex = dept.children.findIndex(
          (c) => (subDeptId && c.id === subDeptId) || (subName && c.name.toLowerCase() === subName.toLowerCase())
        );
        if (subIndex === -1) {
          return NextResponse.json({ error: `Không tìm thấy bộ phận "${subName || subDeptId}"` }, { status: 404 });
        }

        const targetSub = dept.children[subIndex];

        // Check if users exist in this sub-department
        if (!body.force) {
          const targetFullDept = `${dept.name} / ${targetSub.name}`;
          const count = await prisma.user.count({
            where: {
              companyName: compNode.name,
              department: targetFullDept,
              isActive: true,
            },
          });
          if (count > 0) {
            return NextResponse.json(
              {
                error: `Không thể xóa: Có ${count} nhân sự đang thuộc bộ phận này. Vui lòng chuyển công tác trước khi xóa hoặc chọn xác nhận bắt buộc.`,
                requiresForce: true,
                userCount: count,
              },
              { status: 400 }
            );
          }
        }

        dept.children.splice(subIndex, 1);
        await saveOUStructure(ouTree);
        return NextResponse.json({ success: true, message: 'Đã xóa bộ phận con thành công' });
      }

      // 7. APPLY DEFAULT CORPORATE TEMPLATE
      case 'APPLY_DEFAULT_TEMPLATE': {
        const defaultDepts = DEFAULT_CORPORATE_DEPARTMENTS.map((d) => ({
          ...d,
          id: generateOUId('dept', d.name),
          children: d.children.map((c) => ({
            ...c,
            id: generateOUId('sub', c.name),
          })),
        }));

        if (body.overwrite) {
          compNode.departments = defaultDepts;
        } else {
          // Merge missing departments
          for (const d of defaultDepts) {
            if (!compNode.departments.some((existing) => existing.name.toLowerCase() === d.name.toLowerCase())) {
              compNode.departments.push(d);
            }
          }
        }

        await saveOUStructure(ouTree);
        return NextResponse.json({
          success: true,
          message: 'Đã áp dụng mẫu cơ cấu phòng ban chuẩn cho công ty',
          data: compNode.departments,
        });
      }

      default:
        return NextResponse.json({ error: `Hành động không hợp lệ: ${action}` }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Manage OU error:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi xử lý cơ cấu tổ chức' },
      { status: 500 }
    );
  }
}
