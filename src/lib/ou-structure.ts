import { prisma } from '@/lib/db';

export interface SubDepartmentNode {
  id: string;
  name: string;
  code?: string;
  description?: string;
  userCount?: number;
}

export interface DepartmentNode {
  id: string;
  name: string;
  code?: string;
  icon?: string;
  description?: string;
  userCount?: number;
  children: SubDepartmentNode[];
}

export interface CompanyOUNode {
  id: string;
  name: string;
  code?: string;
  userCount?: number;
  departments: DepartmentNode[];
}

export const DEFAULT_CORPORATE_DEPARTMENTS: DepartmentNode[] = [
  {
    id: 'dept-it',
    name: 'Ban Công Nghệ Thông Tin (IT / CNTT)',
    code: 'IT',
    icon: '⚡',
    children: [
      { id: 'sub-it-lead', name: 'Ban Lãnh Đạo CNTT (CIO / IT Director)', code: 'IT-LEAD' },
      { id: 'sub-it-system', name: 'Quản Trị Hệ Thống & Cloud (System Admin)', code: 'IT-SYS' },
      { id: 'sub-it-network', name: 'Hạ Tầng Mạng & Viễn Thông (Network & Infra)', code: 'IT-NET' },
      { id: 'sub-it-app', name: 'Ứng Dụng Nghiệp Vụ, ERP & Bravo (Application)', code: 'IT-APP' },
      { id: 'sub-it-sec', name: 'An Toàn Thông Tin & Bảo Mật (Cybersecurity)', code: 'IT-SEC' },
      { id: 'sub-it-helpdesk', name: 'Hỗ Trợ Kỹ Thuật & Helpdesk L1/L2', code: 'IT-HD' },
      { id: 'sub-it-hardware', name: 'Quản Lý Thiết Bị & Phần Cứng (Hardware & EUC)', code: 'IT-EUC' },
      { id: 'sub-it-onsite', name: 'Đội IT On-site Nhà Máy & Chi Nhánh', code: 'IT-ONSITE' },
    ],
  },
  {
    id: 'dept-bod',
    name: 'Ban Giám Đốc & HĐQT',
    code: 'BOD',
    icon: '🏛️',
    children: [
      { id: 'sub-bod-exec', name: 'Văn Phòng Tổng Giám Đốc', code: 'BOD-EXEC' },
      { id: 'sub-bod-strategy', name: 'Ban Chiến Lược & Đầu Tư', code: 'BOD-STRAT' },
    ],
  },
  {
    id: 'dept-finance',
    name: 'Khối Tài Chính & Kế Toán',
    code: 'FIN',
    icon: '💰',
    children: [
      { id: 'sub-fin-general', name: 'Kế Toán Tổng Hợp', code: 'FIN-GEN' },
      { id: 'sub-fin-tax', name: 'Kế Toán Thuế & Kiểm Toán', code: 'FIN-TAX' },
      { id: 'sub-fin-treasury', name: 'Ban Tài Chính & Ngân Quỹ', code: 'FIN-TREAS' },
    ],
  },
  {
    id: 'dept-sales',
    name: 'Khối Kinh Doanh & Thị Trường',
    code: 'SALES',
    icon: '📈',
    children: [
      { id: 'sub-sales-dom', name: 'Kinh Doanh Nội Địa', code: 'SALES-DOM' },
      { id: 'sub-sales-exp', name: 'Kinh Doanh Xuất Khẩu & Quốc Tế', code: 'SALES-EXP' },
      { id: 'sub-sales-cs', name: 'Chăm Sóc Khách Hàng (Customer Care)', code: 'SALES-CS' },
    ],
  },
  {
    id: 'dept-hr',
    name: 'Khối Nhân Sự & Hành Chính',
    code: 'HR',
    icon: '👥',
    children: [
      { id: 'sub-hr-rec', name: 'Tuyển Dụng & Đào Tạo', code: 'HR-REC' },
      { id: 'sub-hr-cb', name: 'Chế Độ & Tiền Lương (C&B)', code: 'HR-CB' },
      { id: 'sub-hr-admin', name: 'Hành Chính Quản Trị Văn Phòng', code: 'HR-ADMIN' },
    ],
  },
  {
    id: 'dept-ops',
    name: 'Khối Vận Hành & Sản Xuất',
    code: 'OPS',
    icon: '🏭',
    children: [
      { id: 'sub-ops-fac', name: 'Ban Quản Lý Nhà Máy & Xưởng Sản Xuất', code: 'OPS-FAC' },
      { id: 'sub-ops-proc', name: 'Chuỗi Cung Ứng & Mua Hàng (Procurement)', code: 'OPS-PROC' },
      { id: 'sub-ops-wh', name: 'Kho Vận & Logistics', code: 'OPS-WH' },
      { id: 'sub-ops-qa', name: 'Quản Lý Chất Lượng (QA/QC)', code: 'OPS-QA' },
    ],
  },
  {
    id: 'dept-mkt',
    name: 'Ban Marketing & Truyền Thông',
    code: 'MKT',
    icon: '📢',
    children: [
      { id: 'sub-mkt-brand', name: 'Thương Hiệu & Truyền Thông Nội Bộ', code: 'MKT-BRAND' },
      { id: 'sub-mkt-dig', name: 'Digital Marketing & Sự Kiện', code: 'MKT-DIG' },
    ],
  },
  {
    id: 'dept-pmo',
    name: 'Ban Quản Lý Dự Án & Kỹ Thuật',
    code: 'PMO',
    icon: '📐',
    children: [
      { id: 'sub-pmo-eng', name: 'Kỹ Thuật & Giải Pháp Công Nghệ', code: 'PMO-ENG' },
      { id: 'sub-pmo-proj', name: 'Triển Khai Dự Án', code: 'PMO-PROJ' },
    ],
  },
];

export function parseDepartmentParts(fullDept: string | null | undefined): { parent: string; child: string } {
  if (!fullDept) return { parent: '', child: '' };
  if (fullDept.includes(' / ')) {
    const parts = fullDept.split(' / ');
    return { parent: parts[0].trim(), child: parts.slice(1).join(' / ').trim() };
  }
  if (fullDept.includes(' - ')) {
    const parts = fullDept.split(' - ');
    return { parent: parts[0].trim(), child: parts.slice(1).join(' - ').trim() };
  }
  return { parent: fullDept.trim(), child: '' };
}

export function formatDepartmentDisplay(parent: string, child?: string): string {
  const p = (parent || '').trim();
  const c = (child || '').trim();
  if (!c) return p;
  return `${p} / ${c}`;
}

export function generateOUId(prefix: string, name: string): string {
  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 30);
  return `${prefix}-${slug || Math.random().toString(36).substring(2, 7)}`;
}

export function matchesCompany(userComp: string | null | undefined, targetComp: string): boolean {
  if (!userComp || !targetComp) return false;
  const u = userComp.trim().toLowerCase();
  const t = targetComp.trim().toLowerCase();
  if (u === t) return true;
  if (u.startsWith(t) || t.startsWith(u)) return true;
  return false;
}

/**
 * Fetch and return the complete OU tree with employee count metrics
 */
export async function getOUStructure(): Promise<CompanyOUNode[]> {
  // 1. Get raw companies
  const companySetting = await prisma.systemSetting.findUnique({
    where: { key: 'corporate.companies' },
  });
  let companyNames: string[] = [];
  if (companySetting?.value) {
    try {
      const parsed = JSON.parse(companySetting.value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        companyNames = parsed;
      }
    } catch {}
  }
  if (companyNames.length === 0) {
    companyNames = [
      'Công ty Cổ phần Dây Cáp Điện Việt Nam',
      'Công ty Cổ phần Điện Lực GELEX',
      'Công ty Cổ phần Tập đoàn GELEX',
      'CÔNG TY CỔ PHẦN TÂN HÀ PHÁT CÔNG NGHIỆP',
      'CÔNG TY TNHH HÀ YẾN IND',
      'CÔNG TY TNHH CÔNG NGHIỆP HÀ YẾN SGN',
      'Công ty Cổ phần Hà Yến',
      'Tập Đoàn Test',
    ];
  }

  // 2. Get existing stored OU structure if present
  let ouTree: CompanyOUNode[] = [];
  const ouSetting = await prisma.systemSetting.findUnique({
    where: { key: 'corporate.ou_structure' },
  });
  if (ouSetting?.value) {
    try {
      const parsed = JSON.parse(ouSetting.value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        ouTree = parsed;
      }
    } catch {}
  }

  // 3. If OU tree is missing or has missing companies, reconcile
  const existingCompanyMap = new Map<string, CompanyOUNode>();
  for (const c of ouTree) {
    existingCompanyMap.set(c.name, c);
  }

  // 4. Query active users to extract existing company/department associations
  const activeUsers = await prisma.user.findMany({
    where: { isActive: true },
    select: { companyName: true, department: true },
  });

  let needsSave = false;
  const reconciledTree: CompanyOUNode[] = [];

  for (const compName of companyNames) {
    let compNode = existingCompanyMap.get(compName);
    if (!compNode) {
      needsSave = true;
      const usersInComp = activeUsers.filter((u) => matchesCompany(u.companyName, compName));
      const userDeptMap = new Map<string, Set<string>>();

      for (const u of usersInComp) {
        const { parent, child } = parseDepartmentParts(u.department);
        if (parent) {
          if (!userDeptMap.has(parent)) {
            userDeptMap.set(parent, new Set());
          }
          if (child) {
            userDeptMap.get(parent)!.add(child);
          }
        }
      }

      const initialDepts: DepartmentNode[] = [];
      if (userDeptMap.size > 0) {
        for (const [parentName, childrenSet] of Array.from(userDeptMap.entries())) {
          initialDepts.push({
            id: generateOUId('dept', parentName),
            name: parentName,
            children: Array.from(childrenSet).map((childName) => ({
              id: generateOUId('sub', childName),
              name: childName,
            })),
          });
        }
      } else {
        // Deep clone default template
        initialDepts.push(
          ...DEFAULT_CORPORATE_DEPARTMENTS.map((d) => ({
            ...d,
            id: generateOUId('dept', d.name),
            children: d.children.map((c) => ({
              ...c,
              id: generateOUId('sub', c.name),
            })),
          }))
        );
      }

      compNode = {
        id: generateOUId('comp', compName),
        name: compName,
        departments: initialDepts,
      };
    }
    reconciledTree.push(compNode);
  }

  // 5. Attach real-time metrics (headcounts)
  for (const comp of reconciledTree) {
    const compUsers = activeUsers.filter((u) => matchesCompany(u.companyName, comp.name));
    comp.userCount = compUsers.length;

    for (const dept of comp.departments) {
      let deptCount = 0;
      for (const sub of dept.children) {
        // User belongs to this specific sub-dept
        const subUsers = compUsers.filter((u) => {
          const { parent, child } = parseDepartmentParts(u.department);
          return (
            parent.toLowerCase() === dept.name.toLowerCase() &&
            child.toLowerCase() === sub.name.toLowerCase()
          );
        });
        sub.userCount = subUsers.length;
        deptCount += subUsers.length;
      }

      // Also count users who are in the main dept directly (no sub-dept or unspecified)
      const directDeptUsers = compUsers.filter((u) => {
        const { parent, child } = parseDepartmentParts(u.department);
        return parent.toLowerCase() === dept.name.toLowerCase() && !child;
      });
      dept.userCount = deptCount + directDeptUsers.length;
    }
  }

  // Save if tree was newly synthesized or updated
  if (needsSave || !ouSetting) {
    await saveOUStructure(reconciledTree);
  }

  return reconciledTree;
}

/**
 * Persist the OU tree to SystemSetting
 */
export async function saveOUStructure(tree: CompanyOUNode[]): Promise<void> {
  // Strip calculated metric fields before storing
  const cleanTree = tree.map((c) => ({
    id: c.id,
    name: c.name,
    code: c.code,
    departments: (c.departments || []).map((d) => ({
      id: d.id,
      name: d.name,
      code: d.code,
      icon: d.icon,
      description: d.description,
      children: (d.children || []).map((sub) => ({
        id: sub.id,
        name: sub.name,
        code: sub.code,
        description: sub.description,
      })),
    })),
  }));

  const companyNames = cleanTree.map((c) => c.name);

  await Promise.all([
    prisma.systemSetting.upsert({
      where: { key: 'corporate.ou_structure' },
      create: {
        key: 'corporate.ou_structure',
        value: JSON.stringify(cleanTree),
        type: 'JSON',
        group: 'general',
        label: 'Cơ cấu tổ chức OU phân cấp (Công ty > Phòng ban > Bộ phận)',
      },
      update: {
        value: JSON.stringify(cleanTree),
      },
    }),
    prisma.systemSetting.upsert({
      where: { key: 'corporate.companies' },
      create: {
        key: 'corporate.companies',
        value: JSON.stringify(companyNames),
        type: 'JSON',
        group: 'general',
        label: 'Danh sách công ty quản lý trong tập đoàn',
      },
      update: {
        value: JSON.stringify(companyNames),
      },
    }),
  ]);
}
