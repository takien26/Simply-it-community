"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var import_client = require("@prisma/client");
var bcrypt = __toESM(require("bcryptjs"));
const prisma = new import_client.PrismaClient();
async function main() {
  console.log("\u{1F331} Seeding database...");
  const permissionsData = [
    {
      "code": "dashboard.view",
      "name": "Xem B\u1EA3ng \u0111i\u1EC1u khi\u1EC3n & Th\u1ED1ng k\xEA",
      "module": "dashboard"
    },
    {
      "code": "assets.view",
      "name": "Xem danh s\xE1ch thi\u1EBFt b\u1ECB / t\xE0i s\u1EA3n",
      "module": "assets"
    },
    {
      "code": "assets.create",
      "name": "Th\xEAm m\u1EDBi thi\u1EBFt b\u1ECB / t\xE0i s\u1EA3n",
      "module": "assets"
    },
    {
      "code": "assets.update",
      "name": "S\u1EEDa th\xF4ng tin thi\u1EBFt b\u1ECB",
      "module": "assets"
    },
    {
      "code": "assets.delete",
      "name": "X\xF3a / H\u1EE7y thi\u1EBFt b\u1ECB",
      "module": "assets"
    },
    {
      "code": "assets.assign",
      "name": "B\xE0n giao / Thu h\u1ED3i thi\u1EBFt b\u1ECB cho nh\xE2n vi\xEAn",
      "module": "assets"
    },
    {
      "code": "assets.import",
      "name": "Import danh s\xE1ch thi\u1EBFt b\u1ECB t\u1EEB Excel",
      "module": "assets"
    },
    {
      "code": "assets.export",
      "name": "Export danh s\xE1ch thi\u1EBFt b\u1ECB ra Excel",
      "module": "assets"
    },
    {
      "code": "assets.maintenance.view",
      "name": "Xem l\u1ECBch s\u1EED s\u1EEDa ch\u1EEFa & b\u1EA3o tr\xEC",
      "module": "assets.maintenance"
    },
    {
      "code": "assets.maintenance.create",
      "name": "T\u1EA1o phi\u1EBFu s\u1EEDa ch\u1EEFa / b\u1EA3o tr\xEC m\u1EDBi",
      "module": "assets.maintenance"
    },
    {
      "code": "assets.maintenance.update",
      "name": "C\u1EADp nh\u1EADt ti\u1EBFn \u0111\u1ED9 & chi ph\xED s\u1EEDa ch\u1EEFa",
      "module": "assets.maintenance"
    },
    {
      "code": "assets.maintenance.delete",
      "name": "X\xF3a phi\u1EBFu s\u1EEDa ch\u1EEFa / b\u1EA3o tr\xEC",
      "module": "assets.maintenance"
    },
    {
      "code": "licenses.view",
      "name": "Xem danh s\xE1ch b\u1EA3n quy\u1EC1n License",
      "module": "licenses"
    },
    {
      "code": "licenses.create",
      "name": "Th\xEAm m\u1EDBi b\u1EA3n quy\u1EC1n License",
      "module": "licenses"
    },
    {
      "code": "licenses.update",
      "name": "S\u1EEDa License & c\u1EADp nh\u1EADt key",
      "module": "licenses"
    },
    {
      "code": "licenses.delete",
      "name": "X\xF3a b\u1EA3n quy\u1EC1n License",
      "module": "licenses"
    },
    {
      "code": "licenses.assign",
      "name": "C\u1EA5p ph\xE1t / Thu h\u1ED3i License cho nh\xE2n vi\xEAn",
      "module": "licenses"
    },
    {
      "code": "licenses.import",
      "name": "Import License t\u1EEB Excel",
      "module": "licenses"
    },
    {
      "code": "licenses.export",
      "name": "Export danh s\xE1ch License",
      "module": "licenses"
    },
    {
      "code": "services.view",
      "name": "Xem danh s\xE1ch d\u1ECBch v\u1EE5 IT & thu\xEA bao",
      "module": "services"
    },
    {
      "code": "services.create",
      "name": "Th\xEAm m\u1EDBi d\u1ECBch v\u1EE5 IT / \u0111\u01B0\u1EDDng truy\u1EC1n / VPS",
      "module": "services"
    },
    {
      "code": "services.update",
      "name": "S\u1EEDa d\u1ECBch v\u1EE5 & chu k\u1EF3 thanh to\xE1n",
      "module": "services"
    },
    {
      "code": "services.delete",
      "name": "X\xF3a d\u1ECBch v\u1EE5 IT",
      "module": "services"
    },
    {
      "code": "services.renew",
      "name": "Th\u1EF1c hi\u1EC7n gia h\u1EA1n h\u1EE3p \u0111\u1ED3ng d\u1ECBch v\u1EE5",
      "module": "services"
    },
    {
      "code": "services.import",
      "name": "Import d\u1ECBch v\u1EE5 t\u1EEB Excel",
      "module": "services"
    },
    {
      "code": "services.export",
      "name": "Export b\xE1o c\xE1o d\u1ECBch v\u1EE5 IT",
      "module": "services"
    },
    {
      "code": "tickets.view",
      "name": "Xem danh s\xE1ch Ticket h\u1ED7 tr\u1EE3 IT",
      "module": "tickets"
    },
    {
      "code": "tickets.create",
      "name": "T\u1EA1o m\u1EDBi Ticket y\xEAu c\u1EA7u h\u1ED7 tr\u1EE3",
      "module": "tickets"
    },
    {
      "code": "tickets.update",
      "name": "Ti\u1EBFp nh\u1EADn & c\u1EADp nh\u1EADt tr\u1EA1ng th\xE1i Ticket",
      "module": "tickets"
    },
    {
      "code": "tickets.delete",
      "name": "X\xF3a / H\u1EE7y Ticket h\u1ED7 tr\u1EE3",
      "module": "tickets"
    },
    {
      "code": "tickets.assign",
      "name": "Ph\xE2n c\xF4ng KTV x\u1EED l\xFD Ticket",
      "module": "tickets"
    },
    {
      "code": "tickets.comment",
      "name": "Trao \u0111\u1ED5i & ph\u1EA3n h\u1ED3i n\u1ED9i b\u1ED9 tr\xEAn Ticket",
      "module": "tickets"
    },
    {
      "code": "documents.view",
      "name": "Xem h\u1ED3 s\u01A1, h\xF3a \u0111\u01A1n & h\u1EE3p \u0111\u1ED3ng",
      "module": "documents"
    },
    {
      "code": "documents.create",
      "name": "T\u1EA3i l\xEAn h\u1ED3 s\u01A1 / h\xF3a \u0111\u01A1n m\u1EDBi",
      "module": "documents"
    },
    {
      "code": "documents.update",
      "name": "Ch\u1EC9nh s\u1EEDa th\xF4ng tin h\u1ED3 s\u01A1 & li\xEAn k\u1EBFt",
      "module": "documents"
    },
    {
      "code": "documents.delete",
      "name": "X\xF3a h\u1ED3 s\u01A1 / h\xF3a \u0111\u01A1n",
      "module": "documents"
    },
    {
      "code": "documents.download",
      "name": "T\u1EA3i t\u1EC7p \u0111\xEDnh k\xE8m g\u1ED1c",
      "module": "documents"
    },
    {
      "code": "categories.view",
      "name": "Xem danh m\u1EE5c thi\u1EBFt b\u1ECB, lic & d\u1ECBch v\u1EE5",
      "module": "categories"
    },
    {
      "code": "categories.create",
      "name": "Th\xEAm m\u1EDBi danh m\u1EE5c",
      "module": "categories"
    },
    {
      "code": "categories.update",
      "name": "S\u1EEDa danh m\u1EE5c & c\u1EA5u h\xECnh tr\u01B0\u1EDDng th\xF4ng s\u1ED1",
      "module": "categories"
    },
    {
      "code": "categories.delete",
      "name": "X\xF3a danh m\u1EE5c",
      "module": "categories"
    },
    {
      "code": "vendors.view",
      "name": "Xem danh b\u1EA1 \u0111\u1ED1i t\xE1c / nh\xE0 cung c\u1EA5p",
      "module": "vendors"
    },
    {
      "code": "vendors.create",
      "name": "Th\xEAm m\u1EDBi nh\xE0 cung c\u1EA5p",
      "module": "vendors"
    },
    {
      "code": "vendors.update",
      "name": "S\u1EEDa nh\xE0 cung c\u1EA5p & danh b\u1EA1 li\xEAn h\u1EC7",
      "module": "vendors"
    },
    {
      "code": "vendors.delete",
      "name": "X\xF3a nh\xE0 cung c\u1EA5p",
      "module": "vendors"
    },
    {
      "code": "locations.view",
      "name": "Xem v\u1ECB tr\xED / ph\xF2ng ban",
      "module": "locations"
    },
    {
      "code": "locations.create",
      "name": "Th\xEAm v\u1ECB tr\xED m\u1EDBi",
      "module": "locations"
    },
    {
      "code": "locations.update",
      "name": "S\u1EEDa th\xF4ng tin v\u1ECB tr\xED / t\xF2a nh\xE0",
      "module": "locations"
    },
    {
      "code": "locations.delete",
      "name": "X\xF3a v\u1ECB tr\xED",
      "module": "locations"
    },
    {
      "code": "companies.view",
      "name": "Xem c\xF4ng ty th\xE0nh vi\xEAn & chi nh\xE1nh",
      "module": "companies"
    },
    {
      "code": "companies.create",
      "name": "Th\xEAm m\u1EDBi c\xF4ng ty th\xE0nh vi\xEAn",
      "module": "companies"
    },
    {
      "code": "companies.update",
      "name": "S\u1EEDa th\xF4ng tin c\xF4ng ty",
      "module": "companies"
    },
    {
      "code": "companies.delete",
      "name": "X\xF3a c\xF4ng ty th\xE0nh vi\xEAn",
      "module": "companies"
    },
    {
      "code": "users.view",
      "name": "Xem danh s\xE1ch t\xE0i kho\u1EA3n",
      "module": "users"
    },
    {
      "code": "users.create",
      "name": "T\u1EA1o t\xE0i kho\u1EA3n ng\u01B0\u1EDDi d\xF9ng m\u1EDBi",
      "module": "users"
    },
    {
      "code": "users.update",
      "name": "Ch\u1EC9nh s\u1EEDa t\xE0i kho\u1EA3n & reset m\u1EADt kh\u1EA9u",
      "module": "users"
    },
    {
      "code": "users.delete",
      "name": "Kh\xF3a / X\xF3a t\xE0i kho\u1EA3n ng\u01B0\u1EDDi d\xF9ng",
      "module": "users"
    },
    {
      "code": "users.permissions",
      "name": "C\u1EA5u h\xECnh ph\xE2n quy\u1EC1n vai tr\xF2 & ng\u01B0\u1EDDi d\xF9ng",
      "module": "users"
    },
    {
      "code": "settings.view",
      "name": "Xem c\xE0i \u0111\u1EB7t h\u1EC7 th\u1ED1ng",
      "module": "settings"
    },
    {
      "code": "settings.update",
      "name": "S\u1EEDa \u0111\u1ED5i c\u1EA5u h\xECnh chung & giao di\u1EC7n",
      "module": "settings"
    },
    {
      "code": "settings.ldap",
      "name": "C\u1EA5u h\xECnh x\xE1c th\u1EF1c LDAP / Active Directory",
      "module": "settings"
    },
    {
      "code": "reports.view",
      "name": "Xem b\xE1o c\xE1o th\u1ED1ng k\xEA t\u1ED5ng h\u1EE3p",
      "module": "reports"
    },
    {
      "code": "reports.export",
      "name": "Xu\u1EA5t d\u1EEF li\u1EC7u b\xE1o c\xE1o (Excel/PDF)",
      "module": "reports"
    },
    {
      "code": "audit.view",
      "name": "Xem nh\u1EADt k\xFD ho\u1EA1t \u0111\u1ED9ng h\u1EC7 th\u1ED1ng (Audit Log)",
      "module": "audit"
    },
    {
      "code": "ai.extract",
      "name": "S\u1EED d\u1EE5ng AI OCR / Tr\xEDch xu\u1EA5t t\xE0i li\u1EC7u",
      "module": "ai"
    },
    {
      "code": "ai.auto_save",
      "name": "Cho ph\xE9p AI t\u1EF1 \u0111\u1ED9ng l\u01B0u d\u1EEF li\u1EC7u tr\xEDch xu\u1EA5t",
      "module": "ai"
    },
    {
      "code": "ai.templates.manage",
      "name": "Qu\u1EA3n l\xFD c\xE1c m\u1EABu Template & Prompt AI",
      "module": "ai"
    },
    {
      "code": "ai.history.view",
      "name": "Xem l\u1ECBch s\u1EED tr\xEDch xu\u1EA5t AI",
      "module": "ai"
    }
  ];
  const permissions = await Promise.all(
    permissionsData.map(
      (p) => prisma.permission.upsert({
        where: { code: p.code },
        update: {},
        create: p
      })
    )
  );
  console.log(`\u2705 Created ${permissions.length} permissions`);
  const adminRole = await prisma.role.upsert({
    where: { name: "Admin" },
    update: {},
    create: {
      name: "Admin",
      description: "Qu\u1EA3n tr\u1ECB vi\xEAn h\u1EC7 th\u1ED1ng - To\xE0n quy\u1EC1n",
      isSystem: true
    }
  });
  const managerRole = await prisma.role.upsert({
    where: { name: "Asset Manager" },
    update: {},
    create: {
      name: "Asset Manager",
      description: "Qu\u1EA3n l\xFD t\xE0i s\u1EA3n & license",
      isSystem: true
    }
  });
  const staffRole = await prisma.role.upsert({
    where: { name: "Staff" },
    update: {},
    create: {
      name: "Staff",
      description: "Nh\xE2n vi\xEAn - Xem t\xE0i s\u1EA3n/license \u0111\u01B0\u1EE3c g\xE1n",
      isSystem: true
    }
  });
  console.log("\u2705 Created roles: Admin, Asset Manager, Staff");
  for (const perm of permissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: perm.id }
    });
  }
  const managerPermCodes = [
    "dashboard.view",
    "assets.view",
    "assets.create",
    "assets.update",
    "assets.delete",
    "assets.assign",
    "assets.import",
    "assets.export",
    "assets.maintenance.view",
    "assets.maintenance.create",
    "assets.maintenance.update",
    "assets.maintenance.delete",
    "licenses.view",
    "licenses.create",
    "licenses.update",
    "licenses.delete",
    "licenses.assign",
    "licenses.import",
    "licenses.export",
    "categories.view",
    "categories.create",
    "categories.update",
    "categories.delete",
    "vendors.view",
    "vendors.create",
    "vendors.update",
    "vendors.delete",
    "locations.view",
    "locations.create",
    "locations.update",
    "locations.delete",
    "reports.view",
    "reports.export",
    "ai.extract",
    "ai.auto_save",
    "ai.history.view"
  ];
  for (const code of managerPermCodes) {
    const perm = permissions.find((p) => p.code === code);
    if (perm) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: managerRole.id, permissionId: perm.id } },
        update: {},
        create: { roleId: managerRole.id, permissionId: perm.id }
      });
    }
  }
  const staffPermCodes = ["dashboard.view", "assets.view", "licenses.view", "ai.extract"];
  for (const code of staffPermCodes) {
    const perm = permissions.find((p) => p.code === code);
    if (perm) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: staffRole.id, permissionId: perm.id } },
        update: {},
        create: { roleId: staffRole.id, permissionId: perm.id }
      });
    }
  }
  console.log("\u2705 Assigned permissions to roles");
  const hashedPassword = await bcrypt.hash("Admin@123", 12);
  await prisma.user.upsert({
    where: { email: "admin@company.com" },
    update: {},
    create: {
      email: "admin@company.com",
      passwordHash: hashedPassword,
      fullName: "System Admin",
      roleId: adminRole.id,
      department: "IT",
      isActive: true
    }
  });
  console.log("\u2705 Created admin user: admin@company.com / Admin@123");
  const categories = [
    { name: "Thi\u1EBFt b\u1ECB v\u0103n ph\xF2ng", icon: "\u{1F3E2}", children: [
      { name: "Laptop", icon: "\u{1F4BB}" },
      { name: "PC / M\xE1y t\xEDnh \u0111\u1EC3 b\xE0n", icon: "\u{1F5A5}\uFE0F" },
      { name: "M\xE0n h\xECnh", icon: "\u{1F5A5}\uFE0F" },
      { name: "B\xE0n ph\xEDm & Chu\u1ED9t", icon: "\u2328\uFE0F" },
      { name: "M\xE1y in", icon: "\u{1F5A8}\uFE0F" }
    ] },
    { name: "Thi\u1EBFt b\u1ECB m\u1EA1ng", icon: "\u{1F310}", children: [
      { name: "Router", icon: "\u{1F4E1}" },
      { name: "Switch", icon: "\u{1F50C}" },
      { name: "Access Point", icon: "\u{1F4F6}" }
    ] },
    { name: "Thi\u1EBFt b\u1ECB di \u0111\u1ED9ng", icon: "\u{1F4F1}", children: [
      { name: "\u0110i\u1EC7n tho\u1EA1i", icon: "\u{1F4F1}" },
      { name: "Tablet", icon: "\u{1F4CB}" }
    ] },
    { name: "Ph\u1EE5 ki\u1EC7n", icon: "\u{1F527}", children: [
      { name: "Adapter / S\u1EA1c", icon: "\u{1F50C}" },
      { name: "USB / Thi\u1EBFt b\u1ECB l\u01B0u tr\u1EEF", icon: "\u{1F4BE}" },
      { name: "Tai nghe / Loa", icon: "\u{1F3A7}" }
    ] }
  ];
  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    let parent = await prisma.assetCategory.findFirst({
      where: { name: cat.name, parentId: null }
    });
    if (!parent) {
      parent = await prisma.assetCategory.create({
        data: { name: cat.name, icon: cat.icon, sortOrder: i }
      });
    }
    if (cat.children) {
      for (let j = 0; j < cat.children.length; j++) {
        const child = cat.children[j];
        const existingChild = await prisma.assetCategory.findFirst({
          where: { name: child.name, parentId: parent.id }
        });
        if (!existingChild) {
          await prisma.assetCategory.create({
            data: {
              name: child.name,
              icon: child.icon,
              parentId: parent.id,
              sortOrder: j
            }
          });
        }
      }
    }
  }
  console.log("\u2705 Created asset categories");
  const locations = [
    { name: "Ph\xF2ng IT", building: "T\xF2a A", floor: "T\u1EA7ng 3" },
    { name: "Ph\xF2ng K\u1EBF to\xE1n", building: "T\xF2a A", floor: "T\u1EA7ng 2" },
    { name: "Ph\xF2ng Kinh doanh", building: "T\xF2a A", floor: "T\u1EA7ng 4" },
    { name: "Ph\xF2ng Nh\xE2n s\u1EF1", building: "T\xF2a A", floor: "T\u1EA7ng 2" },
    { name: "Ph\xF2ng h\u1ECDp l\u1EDBn", building: "T\xF2a A", floor: "T\u1EA7ng 1" },
    { name: "Kho thi\u1EBFt b\u1ECB", building: "T\xF2a B", floor: "T\u1EA7ng 1" }
  ];
  for (const loc of locations) {
    const existing = await prisma.location.findFirst({ where: { name: loc.name } });
    if (!existing) {
      await prisma.location.create({ data: loc });
    }
  }
  console.log("\u2705 Created locations");
  const settings = [
    { key: "app.name", value: "IT Asset Manager", type: "STRING", group: "general", label: "T\xEAn \u1EE9ng d\u1EE5ng" },
    { key: "app.company_name", value: "C\xF4ng ty ABC", type: "STRING", group: "general", label: "T\xEAn c\xF4ng ty" },
    { key: "app.logo", value: "/images/logo.png", type: "IMAGE_URL", group: "appearance", label: "Logo" },
    { key: "app.favicon", value: "/favicon.ico", type: "IMAGE_URL", group: "appearance", label: "Favicon" },
    { key: "app.primary_color", value: "#2563EB", type: "STRING", group: "appearance", label: "M\xE0u ch\u1EE7 \u0111\u1EA1o" },
    { key: "notification.license_expiry_days", value: "30", type: "NUMBER", group: "notification", label: "C\u1EA3nh b\xE1o license tr\u01B0\u1EDBc (ng\xE0y)" },
    { key: "notification.warranty_expiry_days", value: "30", type: "NUMBER", group: "notification", label: "C\u1EA3nh b\xE1o b\u1EA3o h\xE0nh tr\u01B0\u1EDBc (ng\xE0y)" },
    { key: "ai.auto_save_threshold", value: "0.85", type: "NUMBER", group: "ai", label: "Ng\u01B0\u1EE1ng AI t\u1EF1 \u0111\u1ED9ng l\u01B0u" },
    { key: "ai.provider", value: "gemini", type: "STRING", group: "ai", label: "AI Provider" }
  ];
  for (const setting of settings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting
    });
  }
  console.log("\u2705 Created system settings");
  const templates = [
    {
      name: "Tem Serial Thi\u1EBFt b\u1ECB",
      targetEntity: "ASSET",
      description: "Tr\xEDch xu\u1EA5t th\xF4ng tin t\u1EEB \u1EA3nh tem serial/nh\xE3n thi\u1EBFt b\u1ECB",
      promptTemplate: "Analyze this device label/serial tag image. Extract device information and return as JSON with these fields: {{expectedFields}}. If a field is not visible, set it to null. For specs, extract any visible hardware specifications (CPU, RAM, Storage, etc.).",
      expectedFields: {
        name: { type: "string", label: "T\xEAn thi\u1EBFt b\u1ECB", required: true },
        brand: { type: "string", label: "Th\u01B0\u01A1ng hi\u1EC7u", required: true },
        model: { type: "string", label: "Model" },
        serialNumber: { type: "string", label: "Serial Number", required: true },
        specs: { type: "object", label: "C\u1EA5u h\xECnh" }
      },
      exampleOutput: {
        name: "Laptop Dell Latitude 5540",
        brand: "Dell",
        model: "Latitude 5540",
        serialNumber: "ABC123XYZ",
        specs: { cpu: "i7-1365U", ram: "16GB", ssd: "512GB" }
      }
    },
    {
      name: "H\xF3a \u0111\u01A1n / Invoice",
      targetEntity: "ASSET",
      description: "Tr\xEDch xu\u1EA5t th\xF4ng tin mua h\xE0ng t\u1EEB h\xF3a \u0111\u01A1n",
      promptTemplate: 'Analyze this invoice/receipt image. Extract purchase information for IT assets. Return as JSON with these fields: {{expectedFields}}. Convert prices to numbers (e.g. "25.000.000 VND" -> 25000000). Parse dates to ISO format.',
      expectedFields: {
        name: { type: "string", label: "T\xEAn s\u1EA3n ph\u1EA9m", required: true },
        brand: { type: "string", label: "Th\u01B0\u01A1ng hi\u1EC7u" },
        model: { type: "string", label: "Model" },
        serialNumber: { type: "string", label: "Serial Number" },
        purchaseDate: { type: "date", label: "Ng\xE0y mua" },
        purchasePrice: { type: "number", label: "Gi\xE1 mua" },
        vendorName: { type: "string", label: "Nh\xE0 cung c\u1EA5p" }
      }
    },
    {
      name: "H\u1EE3p \u0111\u1ED3ng License",
      targetEntity: "LICENSE",
      description: "Tr\xEDch xu\u1EA5t th\xF4ng tin license t\u1EEB PDF h\u1EE3p \u0111\u1ED3ng",
      promptTemplate: "Analyze this license contract/document. Extract software license information. Return as JSON with these fields: {{expectedFields}}. Parse dates to ISO format. Convert prices to numbers.",
      expectedFields: {
        name: { type: "string", label: "T\xEAn ph\u1EA7n m\u1EC1m", required: true },
        licenseKey: { type: "string", label: "License Key" },
        licenseType: { type: "enum", label: "Lo\u1EA1i license", values: ["PERPETUAL", "SUBSCRIPTION", "OEM", "TRIAL"] },
        totalSeats: { type: "number", label: "S\u1ED1 seat" },
        purchaseDate: { type: "date", label: "Ng\xE0y mua" },
        expiryDate: { type: "date", label: "Ng\xE0y h\u1EBFt h\u1EA1n" },
        purchasePrice: { type: "number", label: "Gi\xE1 mua" },
        vendorName: { type: "string", label: "Nh\xE0 cung c\u1EA5p" }
      }
    },
    {
      name: "Quick Text - T\xE0i s\u1EA3n",
      targetEntity: "ASSET",
      description: "Ph\xE2n t\xEDch d\xF2ng text ng\u1EAFn \u0111\u1EC3 t\u1EA1o t\xE0i s\u1EA3n nhanh",
      promptTemplate: 'Parse this short text description of an IT asset. Extract as much information as possible. Convert Vietnamese price shorthand (e.g., "25tr" = 25000000, "5m" = 5000000). Parse any date formats. Text: "{{inputText}}"\n\nReturn JSON with fields: {{expectedFields}}',
      expectedFields: {
        name: { type: "string", label: "T\xEAn thi\u1EBFt b\u1ECB", required: true },
        brand: { type: "string", label: "Th\u01B0\u01A1ng hi\u1EC7u" },
        model: { type: "string", label: "Model" },
        serialNumber: { type: "string", label: "Serial Number" },
        purchaseDate: { type: "date", label: "Ng\xE0y mua" },
        purchasePrice: { type: "number", label: "Gi\xE1 mua" },
        specs: { type: "object", label: "C\u1EA5u h\xECnh" }
      }
    },
    {
      name: "Quick Text - License",
      targetEntity: "LICENSE",
      description: "Ph\xE2n t\xEDch d\xF2ng text ng\u1EAFn \u0111\u1EC3 t\u1EA1o license nhanh",
      promptTemplate: 'Parse this short text description of a software license. Extract as much information as possible. Convert Vietnamese price shorthand. Parse any date formats. Text: "{{inputText}}"\n\nReturn JSON with fields: {{expectedFields}}',
      expectedFields: {
        name: { type: "string", label: "T\xEAn ph\u1EA7n m\u1EC1m", required: true },
        licenseKey: { type: "string", label: "License Key" },
        totalSeats: { type: "number", label: "S\u1ED1 seat" },
        expiryDate: { type: "date", label: "Ng\xE0y h\u1EBFt h\u1EA1n" },
        purchasePrice: { type: "number", label: "Gi\xE1 mua" }
      }
    }
  ];
  for (const tmpl of templates) {
    const existing = await prisma.aIExtractionTemplate.findFirst({ where: { name: tmpl.name } });
    if (!existing) {
      await prisma.aIExtractionTemplate.create({ data: tmpl });
    }
  }
  console.log("\u2705 Created AI extraction templates");
  console.log("\n\u{1F389} Seeding completed!");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
