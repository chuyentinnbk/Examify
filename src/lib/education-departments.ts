/**
 * Danh sách các Sở Giáo dục và Đào tạo & Bộ GD&ĐT chuẩn Việt Nam
 */
export const VIETNAM_EDUCATION_DEPARTMENTS: string[] = [
  "SỞ GIÁO DỤC VÀ ĐÀO TẠO THÀNH PHỐ HÀ NỘI",
  "SỞ GIÁO DỤC VÀ ĐÀO TẠO THÀNH PHỐ HỒ CHÍ MINH",
  "SỞ GIÁO DỤC VÀ ĐÀO TẠO THÀNH PHỐ HẢI PHÒNG",
  "SỞ GIÁO DỤC VÀ ĐÀO TẠO THÀNH PHỐ ĐÀ NẴNG",
  "SỞ GIÁO DỤC VÀ ĐÀO TẠO THÀNH PHỐ CẦN THƠ",
  "SỞ GIÁO DỤC VÀ ĐÀO TẠO THÀNH PHỐ HUẾ",
  "SỞ GIÁO DỤC VÀ ĐÀO TẠO TỈNH ĐỒNG NAI",
  "SỞ GIÁO DỤC VÀ ĐÀO TẠO TỈNH AN GIANG",
  "SỞ GIÁO DỤC VÀ ĐÀO TẠO TỈNH BẮC NINH",
  "SỞ GIÁO DỤC VÀ ĐÀO TẠO TỈNH CÀ MAU",
  "SỞ GIÁO DỤC VÀ ĐÀO TẠO TỈNH CAO BẰNG",
  "SỞ GIÁO DỤC VÀ ĐÀO TẠO TỈNH ĐẮK LẮK",
  "SỞ GIÁO DỤC VÀ ĐÀO TẠO TỈNH ĐIỆN BIÊN",
  "SỞ GIÁO DỤC VÀ ĐÀO TẠO TỈNH ĐỒNG THÁP",
  "SỞ GIÁO DỤC VÀ ĐÀO TẠO TỈNH GIA LAI",
  "SỞ GIÁO DỤC VÀ ĐÀO TẠO TỈNH HÀ TĨNH",
  "SỞ GIÁO DỤC VÀ ĐÀO TẠO TỈNH HƯNG YÊN",
  "SỞ GIÁO DỤC VÀ ĐÀO TẠO TỈNH KHÁNH HÒA",
  "SỞ GIÁO DỤC VÀ ĐÀO TẠO TỈNH LAI CHÂU",
  "SỞ GIÁO DỤC VÀ ĐÀO TẠO TỈNH LẠNG SƠN",
  "SỞ GIÁO DỤC VÀ ĐÀO TẠO TỈNH LÀO CAI",
  "SỞ GIÁO DỤC VÀ ĐÀO TẠO TỈNH LÂM ĐỒNG",
  "SỞ GIÁO DỤC VÀ ĐÀO TẠO TỈNH NINH BÌNH",
  "SỞ GIÁO DỤC VÀ ĐÀO TẠO TỈNH NGHỆ AN",
  "SỞ GIÁO DỤC VÀ ĐÀO TẠO TỈNH PHÚ THỌ",
  "SỞ GIÁO DỤC VÀ ĐÀO TẠO TỈNH QUẢNG NINH",
  "SỞ GIÁO DỤC VÀ ĐÀO TẠO TỈNH QUẢNG NGÃI",
  "SỞ GIÁO DỤC VÀ ĐÀO TẠO TỈNH QUẢNG TRỊ",
  "SỞ GIÁO DỤC VÀ ĐÀO TẠO TỈNH SƠN LA",
  "SỞ GIÁO DỤC VÀ ĐÀO TẠO TỈNH TÂY NINH",
  "SỞ GIÁO DỤC VÀ ĐÀO TẠO TỈNH TUYÊN QUANG",
  "SỞ GIÁO DỤC VÀ ĐÀO TẠO TỈNH THÁI NGUYÊN",
  "SỞ GIÁO DỤC VÀ ĐÀO TẠO TỈNH THANH HÓA",
  "SỞ GIÁO DỤC VÀ ĐÀO TẠO TỈNH VĨNH LONG",
  "BỘ GIÁO DỤC VÀ ĐÀO TẠO"
];
/**
 * Rút gọn hiển thị nhãn địa phương (ví dụ: 'thành phố Hà Nội' -> 'Hà Nội')
 */
export function getShortLocation(dept: string): string {
  return dept
    .replace(/^SỞ GIÁO DỤC VÀ ĐÀO TẠO (THÀNH PHỐ |TỈNH )?/i, '')
    .replace(/^Sở Giáo dục và Đào tạo (thành phố |tỉnh )?/i, '')
    .trim();
}

/**
 * Loại bỏ dấu tiếng Việt để so sánh chuỗi không dấu
 */
export function removeVietnameseTones(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

/**
 * Tự động chuẩn hóa và khôi phục dấu tiếng Việt cho Sở GD&ĐT
 * Khắc phục hoàn toàn lỗi gõ mất dấu (ví dụ: 'SO GIAO DUC VA DAO TAO THANH PHO HAI PHONG' -> 'SỞ GIÁO DỤC VÀ ĐÀO TẠO THÀNH PHỐ HẢI PHÒNG')
 */
export function normalizeDepartmentAccents(input: string): string {
  if (!input || !input.trim()) return input;
  const raw = input.trim();
  const rawClean = removeVietnameseTones(raw);

  // 1. So khớp chính xác chuỗi không dấu
  for (const dept of VIETNAM_EDUCATION_DEPARTMENTS) {
    if (removeVietnameseTones(dept) === rawClean) {
      return dept;
    }
  }

  // 2. So khớp theo tên địa phương nếu người dùng gõ tên tỉnh/thành phố (ví dụ 'Hải Phòng', 'Hà Nội', 'TP. HCM'...)
  for (const dept of VIETNAM_EDUCATION_DEPARTMENTS) {
    const locClean = removeVietnameseTones(getShortLocation(dept));
    if (locClean && (rawClean === locClean || rawClean === `so ` + locClean || rawClean === `so gd ` + locClean)) {
      return dept;
    }
  }

  return raw;
}


