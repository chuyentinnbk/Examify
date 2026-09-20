/**
 * Danh sách gợi ý tên Kỳ thi / Bài kiểm tra chuẩn
 */
export const EXAM_SESSION_PRESETS: string[] = [
  "KỲ THI KIỂM TRA ĐÁNH GIÁ CHẤT LƯỢNG",
  "BÀI KIỂM TRA GIỮA HỌC KỲ I",
  "BÀI KIỂM TRA CUỐI HỌC KỲ I",
  "BÀI KIỂM TRA GIỮA HỌC KỲ II",
  "BÀI KIỂM TRA CUỐI HỌC KỲ II",
  "BÀI KIỂM TRA ĐỊNH KỲ (1 TIẾT)",
  "BÀI KIỂM TRA THƯỜNG XUYÊN (15 PHÚT)",
  "KỲ THI THỬ TỐT NGHIỆP THPT",
  "ĐỀ KHẢO SÁT CHẤT LƯỢNG ĐẦU NĂM",
  "KỲ THI CHỌN HỌC SINH GIỎI CẤP TRƯỜNG",
];

/**
 * Tiêu đề mặc định cho các phần trong bài kiểm tra (Chuẩn Bộ GD&ĐT)
 */
export const DEFAULT_SECTION_TITLES: Record<string, string> = {
  multiple_choice: "PHẦN I. CÂU TRẮC NGHIỆM NHIỀU PHƯƠNG ÁN LỰA CHỌN",
  true_false: "PHẦN II. CÂU TRẮC NGHIỆM ĐÚNG SAI",
  short_answer: "PHẦN III. CÂU TRẢ LỜI NGẮN",
  essay: "PHẦN IV. TỰ LUẬN",
};

/**
 * Hướng dẫn làm bài mặc định cho các phần trong bài kiểm tra
 */
export const DEFAULT_SECTION_DESCRIPTIONS: Record<string, string> = {
  multiple_choice: "Thí sinh trả lời từ câu hỏi trắc nghiệm dưới đây. Mỗi câu hỏi thí sinh chỉ chọn một phương án.",
  true_false: "Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai.",
  short_answer: "Thí sinh điền kết quả ngắn gọn vào ô trống tương ứng.",
  essay: "Thí sinh trình bày chi tiết các bước lập luận và lời giải.",
};

/**
 * Lấy nhãn dạng câu hỏi chuẩn
 */
export function normalizeQuestionType(type?: string): string {
  const raw = String(type || 'multiple_choice').toLowerCase().replace(/[\s_-]+/g, '');
  if (raw.includes('true') || raw.includes('dung')) return 'true_false';
  if (raw.includes('short') || raw.includes('ngan')) return 'short_answer';
  if (raw.includes('essay') || raw.includes('luan')) return 'essay';
  return 'multiple_choice';
}
