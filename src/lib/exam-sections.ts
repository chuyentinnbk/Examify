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

export interface CognitiveMatrixPercent {
  knowledge: number;       // Nhận biết
  comprehension: number;   // Thông hiểu
  application: number;     // Vận dụng
  highApplication: number; // Vận dụng cao
}

export interface CognitiveLevelCounts {
  knowledge: number;
  comprehension: number;
  application: number;
  highApplication: number;
}

/**
 * Thuật toán phân bổ số câu hỏi theo ma trận nhận thức với quy tắc "Min-1 Allocation":
 * - Mức nào có tỉ lệ % > 0 thì được giữ chân tối thiểu 1 câu (nếu tổng số câu N >= số mức có % > 0).
 * - Mức nào 0% thì dứt khoát 0 câu.
 * - Số câu còn lại (N - số mức > 0) được chia theo tỉ lệ phần trăm bằng thuật toán Largest Remainder.
 * - Đảm bảo tổng số câu của các mức luôn bằng chính xác totalCount.
 */
export function calculateMinOneCognitiveCounts(
  totalCount: number,
  matrix: CognitiveMatrixPercent
): CognitiveLevelCounts {
  if (totalCount <= 0) {
    return { knowledge: 0, comprehension: 0, application: 0, highApplication: 0 };
  }

  const levels: Array<keyof CognitiveMatrixPercent> = ['knowledge', 'comprehension', 'application', 'highApplication'];
  const activeLevels = levels.filter((lvl) => (matrix[lvl] || 0) > 0);

  // Nếu không chọn mức nào > 0, mặc định cho Thông hiểu
  if (activeLevels.length === 0) {
    return { knowledge: 0, comprehension: totalCount, application: 0, highApplication: 0 };
  }

  // Trường hợp tổng số câu ít hơn số mức có % > 0:
  // Ưu tiên phát 1 câu cho các mức có % cao nhất
  if (totalCount < activeLevels.length) {
    const sorted = [...activeLevels].sort((a, b) => (matrix[b] || 0) - (matrix[a] || 0));
    const res: CognitiveLevelCounts = { knowledge: 0, comprehension: 0, application: 0, highApplication: 0 };
    for (let i = 0; i < totalCount; i++) {
      res[sorted[i]] = 1;
    }
    return res;
  }

  // Bước 1: Đặt cọc tối thiểu 1 câu cho mỗi mức có % > 0
  const result: CognitiveLevelCounts = { knowledge: 0, comprehension: 0, application: 0, highApplication: 0 };
  activeLevels.forEach((lvl) => {
    result[lvl] = 1;
  });

  const remaining = totalCount - activeLevels.length;
  if (remaining === 0) {
    return result;
  }

  // Bước 2: Chia số câu còn lại theo tỉ lệ phần trăm (Largest Remainder Method)
  const totalPercent = activeLevels.reduce((sum, lvl) => sum + (matrix[lvl] || 0), 0) || 100;

  const quotas = activeLevels.map((lvl) => {
    const raw = (remaining * (matrix[lvl] || 0)) / totalPercent;
    const intPart = Math.floor(raw);
    const fraction = raw - intPart;
    return { lvl, intPart, fraction, percent: matrix[lvl] || 0 };
  });

  quotas.forEach((q) => {
    result[q.lvl] += q.intPart;
  });

  const distributed = quotas.reduce((sum, q) => sum + q.intPart, 0);
  const leftover = remaining - distributed;

  // Sắp xếp theo phần dư giảm dần, nếu phần dư bằng nhau xếp theo % cao hơn
  quotas.sort((a, b) => b.fraction - a.fraction || b.percent - a.percent);

  for (let i = 0; i < leftover; i++) {
    const pick = quotas[i % quotas.length];
    result[pick.lvl] += 1;
  }

  return result;
}

export interface SectionFormatPreset {
  id: string;
  name: string;
  description: string;
  totalQuestions: number;
  sections: {
    multiple_choice: { count: number; matrix: CognitiveMatrixPercent };
    true_false: { count: number; matrix: CognitiveMatrixPercent };
    short_answer: { count: number; matrix: CognitiveMatrixPercent };
    essay: { count: number; matrix: CognitiveMatrixPercent };
  };
}

export const EXAM_FORMAT_PRESETS: SectionFormatPreset[] = [
  {
    id: 'moet_2025',
    name: 'Chuẩn Bộ GD&ĐT 2025 (22 câu)',
    description: '12 Trắc nghiệm + 4 Đúng/Sai + 6 Trả lời ngắn',
    totalQuestions: 22,
    sections: {
      multiple_choice: { count: 12, matrix: { knowledge: 60, comprehension: 40, application: 0, highApplication: 0 } },
      true_false: { count: 4, matrix: { knowledge: 0, comprehension: 50, application: 50, highApplication: 0 } },
      short_answer: { count: 6, matrix: { knowledge: 0, comprehension: 0, application: 60, highApplication: 40 } },
      essay: { count: 0, matrix: { knowledge: 0, comprehension: 0, application: 50, highApplication: 50 } },
    },
  },
  {
    id: 'traditional_mc',
    name: 'Trắc nghiệm Truyền thống (40 câu)',
    description: '40 câu trắc nghiệm 4 lựa chọn phủ đều 4 cấp độ tư duy',
    totalQuestions: 40,
    sections: {
      multiple_choice: { count: 40, matrix: { knowledge: 40, comprehension: 30, application: 20, highApplication: 10 } },
      true_false: { count: 0, matrix: { knowledge: 0, comprehension: 50, application: 50, highApplication: 0 } },
      short_answer: { count: 0, matrix: { knowledge: 0, comprehension: 0, application: 60, highApplication: 40 } },
      essay: { count: 0, matrix: { knowledge: 0, comprehension: 0, application: 50, highApplication: 50 } },
    },
  },
  {
    id: 'mixed_essay',
    name: 'Trắc nghiệm & Tự luận (22 câu)',
    description: '20 câu trắc nghiệm + 2 câu tự luận mở rộng',
    totalQuestions: 22,
    sections: {
      multiple_choice: { count: 20, matrix: { knowledge: 40, comprehension: 40, application: 20, highApplication: 0 } },
      true_false: { count: 0, matrix: { knowledge: 0, comprehension: 50, application: 50, highApplication: 0 } },
      short_answer: { count: 0, matrix: { knowledge: 0, comprehension: 0, application: 60, highApplication: 40 } },
      essay: { count: 2, matrix: { knowledge: 0, comprehension: 0, application: 50, highApplication: 50 } },
    },
  },
];

/**
 * Chuẩn hóa các thuộc tính hình học SVG sinh bởi AI (ví dụ: chuyển <line points="..."> thành <line x1="..." y1="..." x2="..." y2="...">).
 */
export function normalizeSvgGeometry(content: string): string {
  if (!content || !content.includes('<line') || !content.includes('points=')) {
    return content;
  }

  return content.replace(
    /<line\b([^>]*?)\bpoints=["']([^"']+)["']([^>]*?)(\/?>)/gi,
    (match, before, points, after, closing) => {
      const coords = points.trim().split(/[\s,]+/).filter(Boolean);
      if (coords.length >= 4) {
        return `<line x1="${coords[0]}" y1="${coords[1]}" x2="${coords[2]}" y2="${coords[3]}"${before}${after}${closing}`;
      }
      return `<polyline points="${points}" fill="none"${before}${after}${closing}`;
    }
  );
}

