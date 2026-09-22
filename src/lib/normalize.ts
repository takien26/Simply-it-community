/**
 * Simply IT - Common Normalization & Case-Insensitive Matching Engine
 * Cung cấp logic chuẩn hóa dữ liệu thống nhất trên toàn bộ hệ thống
 */

/**
 * Chuẩn hóa chuỗi văn bản: xóa khoảng trắng thừa, chuyển về chữ thường
 */
export function normalizeText(val?: string | null): string {
  if (!val) return '';
  return val.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * So sánh 2 chuỗi không phân biệt hoa - thường và khoảng trắng thừa
 */
export function areStringsEqual(a?: string | null, b?: string | null): boolean {
  return normalizeText(a) === normalizeText(b);
}

/**
 * Chuẩn hóa Email không phân biệt chữ hoa, chữ thường
 */
export function normalizeEmail(email?: string | null): string {
  if (!email) return '';
  return email.trim().toLowerCase();
}

/**
 * Chuẩn hóa Mã tài sản (Asset Tag)
 */
export function normalizeAssetTag(tag?: string | null): string {
  if (!tag) return '';
  return tag.trim().toUpperCase();
}

/**
 * Danh mục các thương hiệu / thành viên tập đoàn GELEX chuẩn hóa
 */
const CANONICAL_CORP_ALIASES: Record<string, string> = {
  // Tập đoàn mẹ
  'gelex': 'GELEX',
  'tap doan gelex': 'GELEX',
  'tập đoàn gelex': 'GELEX',
  'gelex group': 'GELEX',
  'gelex group joint stock company': 'GELEX',
  'công ty cổ phần tập đoàn gelex': 'GELEX',
  'gex': 'GELEX',

  // Khối Thiết bị điện (GELEX Electric)
  'gelex electric': 'GELEX ELECTRIC',
  'gelex-electric': 'GELEX ELECTRIC',
  'công ty cổ phần thiết bị điện gelex': 'GELEX ELECTRIC',
  'công ty cổ phần thiết bị điện gelex (gelex electric)': 'GELEX ELECTRIC',
  'thiết bị điện gelex': 'GELEX ELECTRIC',
  'phát điện gelex': 'GELEX ELECTRIC',
  'mua bán điện gelex': 'GELEX ELECTRIC',

  // Khối Hạ tầng (GELEX Infra)
  'gelex infra': 'GELEX INFRA',
  'gelex-infra': 'GELEX INFRA',
  'công ty cổ phần hạ tầng gelex': 'GELEX INFRA',
  'hạ tầng gelex': 'GELEX INFRA',

  // Đơn vị thành viên
  'cadivi': 'CADIVI',
  'công ty cổ phần dây cáp điện việt nam': 'CADIVI',
  'công ty cổ phần dây cáp điện việt nam (cadivi)': 'CADIVI',

  'thibidi': 'THIBIDI',
  'công ty cổ phần thiết bị điện (thibidi)': 'THIBIDI',

  'emic': 'EMIC',
  'công ty cổ phần thiết bị đo điện (emic)': 'EMIC',

  'hem': 'HEM',
  'công ty cổ phần chế tạo điện cơ hà nội': 'HEM',
  'công ty cổ phần chế tạo điện cơ hà nội (hem)': 'HEM',

  'gelex technology': 'GELEX Technology',
  'gelex tech': 'GELEX Technology',

  'gelex development': 'GELEX DEVELOPMENT',
  'geic': 'GELEX ELECTRIC',
  'công ty cổ phần năng lượng gelex': 'GELEX ELECTRIC',
};

// Sắp xếp các mẫu theo độ dài giảm dần để ưu tiên khớp các mẫu cụ thể dài hơn (VD: 'gelex electric') trước mẫu ngắn ('gelex')
const SORTED_CORP_ALIASES = Object.entries(CANONICAL_CORP_ALIASES).sort(
  (a, b) => b[0].length - a[0].length
);

/**
 * Chuẩn hóa Tên Công Ty (Canonical Company Name)
 * Tự động hợp nhất các biến thể chữ hoa, chữ thường, tiền tố tập đoàn
 */
export function normalizeCompanyName(companyName?: string | null, officialList?: string[]): string {
  if (!companyName || !companyName.trim()) return 'Toàn tập đoàn / Chung';
  const clean = companyName.trim();
  const lower = clean.toLowerCase().replace(/\s+/g, ' ');

  // 1. Kiểm tra đối chiếu trực tiếp với danh sách công ty chính thức (case-insensitive)
  if (Array.isArray(officialList) && officialList.length > 0) {
    for (const off of officialList) {
      if (off && off.trim().toLowerCase() === lower) {
        return off.trim();
      }
    }
  }

  // 2. Tra cứu alias từ điển tập đoàn (khớp chính xác)
  if (CANONICAL_CORP_ALIASES[lower]) {
    const canonical = CANONICAL_CORP_ALIASES[lower];
    // Nếu có trong danh sách chính thức thì lấy đúng định dạng danh sách chính thức
    if (Array.isArray(officialList) && officialList.length > 0) {
      const matchOff = officialList.find((o) => o && o.trim().toLowerCase() === canonical.toLowerCase());
      if (matchOff) return matchOff.trim();
    }
    return canonical;
  }

  // 3. Kiểm tra chứa chuỗi đặc trưng (ưu tiên mẫu dài, cụ thể trước)
  for (const [aliasPattern, canonical] of SORTED_CORP_ALIASES) {
    if (lower.includes(aliasPattern)) {
      if (Array.isArray(officialList) && officialList.length > 0) {
        const matchOff = officialList.find((o) => o && o.trim().toLowerCase() === canonical.toLowerCase());
        if (matchOff) return matchOff.trim();
      }
      return canonical;
    }
  }

  // 4. Khớp chứa từ danh sách chính thức
  if (Array.isArray(officialList) && officialList.length > 0) {
    for (const off of officialList) {
      if (!off) continue;
      const offLower = off.trim().toLowerCase();
      if (lower.includes(offLower) || offLower.includes(lower)) {
        return off.trim();
      }
    }
  }

  return clean;
}

/**
 * Kiểm tra 2 công ty có cùng là một thực thể không
 */
export function areCompaniesEqual(a?: string | null, b?: string | null, officialList?: string[]): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return (
    normalizeCompanyName(a, officialList).toLowerCase() ===
    normalizeCompanyName(b, officialList).toLowerCase()
  );
}
