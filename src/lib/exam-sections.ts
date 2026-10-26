import { autoCanonicalizeGeometrySvg } from './geometry-templates';

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

/**
 * Kiểm tra xem môn học có phải là Toán hay không.
 * Môn Toán có đặc thù công thức KaTeX phức tạp, hình học SVG không gian và barem tự luận,
 * cần giới hạn tối đa 30 câu để tránh tràn giới hạn token của LLM.
 */
export function isMathSubject(subject?: string): boolean {
  if (!subject) return false;
  const s = subject.toLowerCase().trim();
  return (
    s.includes('toán') ||
    s.includes('toan') ||
    s.includes('math') ||
    s.includes('hình học') ||
    s.includes('đại số')
  );
}

/**
 * Lấy giới hạn số lượng câu hỏi tối đa dựa trên môn học:
 * - Toán học: tối đa 30 câu (tránh nghẽn/tràn 8k token do SVG và LaTeX)
 * - Các môn khác (Sử, Địa, Ngoại ngữ, GDCD...): tối đa 50 câu (thoải mái ra đề 40-50 câu chuẩn Bộ)
 */
export function getMaxQuestionsForSubject(subject?: string): number {
  return isMathSubject(subject) ? 30 : 50;
}

/**
 * Mẫu cấu trúc đề thi được tùy biến theo từng môn học:
 * - Với môn Toán: Giới hạn tối đa 30 câu (chuẩn 2025: 22 câu, truyền thống: 30 câu).
 * - Với môn KHXH / Ngoại ngữ (Sử, Địa, Tiếng Anh...): Chuẩn 2025 là 28 câu, truyền thống là 40 câu trắc nghiệm (50 phút).
 */
export function getExamFormatPresets(subject?: string): SectionFormatPreset[] {
  const isMath = isMathSubject(subject);
  if (isMath) {
    return [
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
        name: 'Trắc nghiệm Truyền thống (30 câu)',
        description: '30 câu trắc nghiệm 4 lựa chọn phủ đều 4 cấp độ tư duy',
        totalQuestions: 30,
        sections: {
          multiple_choice: { count: 30, matrix: { knowledge: 40, comprehension: 30, application: 20, highApplication: 10 } },
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
  }

  // Đối với các môn KHXH, Ngoại ngữ, KHTN...
  return [
    {
      id: 'moet_2025',
      name: 'Chuẩn Bộ GD&ĐT 2025 (28 câu)',
      description: '24 Trắc nghiệm nhiều lựa chọn + 4 Đúng/Sai',
      totalQuestions: 28,
      sections: {
        multiple_choice: { count: 24, matrix: { knowledge: 50, comprehension: 30, application: 20, highApplication: 0 } },
        true_false: { count: 4, matrix: { knowledge: 0, comprehension: 50, application: 50, highApplication: 0 } },
        short_answer: { count: 0, matrix: { knowledge: 0, comprehension: 0, application: 50, highApplication: 50 } },
        essay: { count: 0, matrix: { knowledge: 0, comprehension: 0, application: 50, highApplication: 50 } },
      },
    },
    {
      id: 'traditional_mc',
      name: 'Trắc nghiệm Truyền thống (40 câu)',
      description: '40 câu trắc nghiệm 4 lựa chọn (Chuẩn thi tốt nghiệp 50 phút)',
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
}

export const EXAM_FORMAT_PRESETS: SectionFormatPreset[] = getExamFormatPresets('Toán học');

/**
 * Tính khoảng cách từ điểm (px, py) đến đoạn thẳng (x1, y1)-(x2, y2)
 */
function distToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): { dist: number; qx: number; qy: number; t: number } {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return { dist: Math.hypot(px - x1, py - y1), qx: x1, qy: y1, t: 0 };
  let t = ((px - x1) * dx + (py - y1) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  const qx = x1 + t * dx;
  const qy = y1 + t * dy;
  return { dist: Math.hypot(px - qx, py - qy), qx, qy, t };
}

/**
 * Kiểm tra xem điểm (px, py) có nằm trong đa giác hay không (Ray-casting)
 */
function pointInPolygon(px: number, py: number, vertices: { x: number; y: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i].x, yi = vertices[i].y;
    const xj = vertices[j].x, yj = vertices[j].y;
    const intersect = ((yi > py) !== (yj > py)) &&
      (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Tự động phát hiện và chuyển đổi các thẻ SVG giả dạng Bảng Biến Thiên / Bảng xét dấu
 * do AI sinh lỗi thành Bảng Markdown chuẩn đẹp (hỗ trợ KaTeX \nearrow, \searrow, -\infty, +\infty).
 */
export function healSvgVariationTable(content: string): string {
  if (!content || !content.includes('<svg')) return content;

  return content.replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, (svgBlock) => {
    // Kiểm tra xem SVG có phải là Bảng biến thiên hay không
    const isVariationTable =
      /<text[^>]*>\s*x\s*<\/text>/i.test(svgBlock) &&
      (/<text[^>]*>\s*(?:y'|f'\(x\)|y|f\(x\))\s*<\/text>/i.test(svgBlock) ||
       /\\infty/i.test(svgBlock));

    if (!isVariationTable) return svgBlock;

    // Bóc tách tất cả thẻ <text> có tọa độ x, y
    const textTagRegex = /<text\b([^>]*)>([\s\S]*?)<\/text>/gi;
    const items: { x: number; y: number; text: string }[] = [];
    let m;
    while ((m = textTagRegex.exec(svgBlock)) !== null) {
      const attrs = m[1];
      let text = m[2].trim();
      text = text.replace(/-\\\\?\s*0/g, '-');
      const xM = attrs.match(/\bx\s*=\s*["']?([0-9.]+)/i);
      const yM = attrs.match(/\by\s*=\s*["']?([0-9.]+)/i);
      if (xM && yM && text) {
        items.push({
          x: parseFloat(xM[1]),
          y: parseFloat(yM[1]),
          text,
        });
      }
    }

    if (items.length < 5) return svgBlock;

    // Gom nhóm theo tọa độ y (dung sai 22px) thành các hàng
    const rows: { y: number; items: typeof items }[] = [];
    for (const item of items) {
      let r = rows.find((row) => Math.abs(row.y - item.y) <= 22);
      if (!r) {
        r = { y: item.y, items: [] };
        rows.push(r);
      }
      r.items.push(item);
    }

    rows.sort((a, b) => a.y - b.y);
    rows.forEach((r) => r.items.sort((a, b) => a.x - b.x));

    if (rows.length < 2) return svgBlock;

    const formatCell = (val: string) => {
      let v = val.trim();
      if (!v) return '';
      v = v.replace(/^[-−–]\s*\\?infty$/i, '-\\infty');
      v = v.replace(/^\+\s*\\?infty$/i, '+\\infty');
      if (!v.startsWith('$') && !v.endsWith('$')) {
        return `$${v}$`;
      }
      return v;
    };

    // Hàng 1: x
    const headerRow = rows[0];
    const headerCells = headerRow.items.map((i) => formatCell(i.text));
    const alignRow = headerCells.map(() => ':---:');

    // Các hàng dữ liệu (y', y)
    const bodyRows = rows.slice(1).map((r) => {
      const rowLabel = r.items[0]?.text?.trim() || '';
      const isYRow = /^(?:y|f\(x\))$/i.test(rowLabel);
      let cells = r.items.map((i) => i.text);

      if (isYRow && cells.length >= 4) {
        const formatted: string[] = [];
        cells.forEach((c, cIdx) => {
          let cleanVal = c.replace(/\\?infty/g, '\\infty').trim();
          if (cIdx === 0) {
            formatted.push(formatCell(cleanVal));
          } else if (cIdx === 1) {
            formatted.push(`$${cleanVal} \\nearrow$`);
          } else if (cIdx === 2) {
            formatted.push(`$${cleanVal}$`);
          } else if (cIdx === 3) {
            formatted.push(`$\\searrow ${cleanVal}$`);
          } else {
            formatted.push(`$\\nearrow ${cleanVal}$`);
          }
        });
        return formatted;
      }

      return cells.map((c) => formatCell(c));
    });

    const maxCols = Math.max(headerCells.length, ...bodyRows.map((r) => r.length));
    while (headerCells.length < maxCols) headerCells.push('');
    while (alignRow.length < maxCols) alignRow.push(':---:');
    bodyRows.forEach((r) => {
      while (r.length < maxCols) r.push('');
    });

    const markdownTable = [
      `| ${headerCells.join(' | ')} |`,
      `| ${alignRow.join(' | ')} |`,
      ...bodyRows.map((r) => `| ${r.join(' | ')} |`),
    ].join('\n');

    return `\n\n${markdownTable}\n\n`;
  });
}

/**
 * Chuẩn hóa và tối ưu hóa vị trí hình học SVG sinh bởi AI:
 * 1. Chuyển <line points="..."> thành <line x1="..." y1="..." x2="..." y2="..."> hợp lệ.
 * 2. Loại bỏ stroke halo trắng (stroke="white") gây đứt nét/cắt ngang đường kẻ.
 * 3. Tự động dời nhãn đo độ dài cạnh (70 m, 50 m, 80√2 m, 10 km...) ra ngoài tam giác/đa giác (18-24px),
 *    giữ đường kẻ liền mạch hoàn toàn chuẩn đề thi quốc gia.
 * 4. Tự động căn chỉnh nhãn đỉnh (A, B, C...) lệch ngoài đỉnh 18-20px và góc (60°, 45°...) nằm gọn trong góc.
 * 5. Đưa các thẻ <text> xuống cuối cùng của <svg> theo Painter's Algorithm.
 */
export function normalizeSvgGeometry(content: string): string {
  if (!content || !content.includes('<svg')) {
    return content;
  }

  // Tự động phát hiện và chuyển đổi SVG giả bảng biến thiên thành Bảng Markdown chuẩn
  content = healSvgVariationTable(content);
  if (!content.includes('<svg')) {
    return content;
  }

  // Tự động nắn và chuẩn hóa các hình học chuẩn (lập phương, chóp, nón, lăng trụ)
  const canonicalized = autoCanonicalizeGeometrySvg(content);

  return canonicalized.replace(/<svg\b([\s\S]*?)<\/svg>/gi, (svgBlock) => {
    // Nếu là hình mẫu chuẩn (Canonical Golden SVG), giữ nguyên 100% tọa độ vàng
    if (svgBlock.includes('data-canonical-geo=')) {
      return svgBlock;
    }

    // 1. Fix malformed <line points="...">
    let fixed = svgBlock.replace(
      /<line\b([^>]*?)\bpoints=["']([^"']+)["']([^>]*?)(\/?>)/gi,
      (match, before, points, after, closing) => {
        const coords = points.trim().split(/[\s,]+/).filter(Boolean);
        if (coords.length >= 4) {
          return `<line x1="${coords[0]}" y1="${coords[1]}" x2="${coords[2]}" y2="${coords[3]}"${before}${after}${closing}`;
        }
        return `<polyline points="${points}" fill="none"${before}${after}${closing}`;
      }
    );

    // 2. Remove ugly legacy stroke halo attributes that cut through lines
    fixed = fixed.replace(/\s*paint-order=["'][^"']*["']/gi, '');
    fixed = fixed.replace(/\s*stroke=["']white["']/gi, '');
    fixed = fixed.replace(/\s*stroke-width=["']3\.5["']/gi, '');
    fixed = fixed.replace(/\s*stroke-linecap=["']round["']/gi, '');
    fixed = fixed.replace(/\s*stroke-linejoin=["']round["']/gi, '');

    // 3. Parse Polygons, Polylines & Centroids
    interface Vertex { x: number; y: number }
    interface Edge { a: Vertex; b: Vertex; centroid?: Vertex; isPerimeter?: boolean; isDashed?: boolean }
    interface Polygon { vertices: Vertex[]; centroid: Vertex; edges: Edge[]; isPoly: boolean }

    const polygons: Polygon[] = [];
    const polyMatches = [...fixed.matchAll(/<(polygon|polyline)\b([^>]*?)>/gi)];
    polyMatches.forEach((pm) => {
      const isPoly = pm[1].toLowerCase() === 'polygon';
      const pMatch = pm[2].match(/points=["']([^"']+)["']/i);
      if (!pMatch) return;
      const rawCoords = pMatch[1].trim().split(/[\s,]+/).map(Number);
      const vertices: Vertex[] = [];
      let sumX = 0, sumY = 0;
      for (let i = 0; i < rawCoords.length - 1; i += 2) {
        vertices.push({ x: rawCoords[i], y: rawCoords[i + 1] });
        sumX += rawCoords[i];
        sumY += rawCoords[i + 1];
      }
      if (vertices.length < 2) return;
      const centroid: Vertex = { x: sumX / vertices.length, y: sumY / vertices.length };
      const edges: Edge[] = [];
      for (let i = 0; i < vertices.length - 1; i++) {
        edges.push({ a: vertices[i], b: vertices[i + 1], centroid, isPerimeter: true });
      }
      if (isPoly && vertices.length >= 3) {
        edges.push({ a: vertices[vertices.length - 1], b: vertices[0], centroid, isPerimeter: true });
      }
      polygons.push({ vertices, centroid, edges, isPoly });
    });

    // 4. Parse Lines
    const explicitLines: Edge[] = [];
    const lineMatches = [...fixed.matchAll(/<line\b([^>]*?)>/gi)];
    lineMatches.forEach((lm) => {
      const x1 = lm[1].match(/\bx1=["']([^"']+)["']/i);
      const y1 = lm[1].match(/\by1=["']([^"']+)["']/i);
      const x2 = lm[1].match(/\bx2=["']([^"']+)["']/i);
      const y2 = lm[1].match(/\by2=["']([^"']+)["']/i);
      if (x1 && y1 && x2 && y2) {
        const a: Vertex = { x: Number(x1[1]), y: Number(y1[1]) };
        const b: Vertex = { x: Number(x2[1]), y: Number(y2[1]) };
        const isDashed = /dash/i.test(lm[1]);
        let polyCentroid: Vertex | null = null;
        for (const poly of polygons) {
          if (poly.isPoly) {
            polyCentroid = poly.centroid;
            break;
          }
        }
        explicitLines.push({ a, b, centroid: polyCentroid || undefined, isPerimeter: !isDashed, isDashed });
      }
    });

    const allSegments: Edge[] = [];
    polygons.forEach((p) => allSegments.push(...p.edges));
    allSegments.push(...explicitLines);

    const perimeterSegments = allSegments.filter((s) => s.isPerimeter);

    const mainPolygon =
      polygons.find((p) => p.isPoly && p.vertices.length >= 3) ||
      polygons.find((p) => p.vertices.length >= 3) ||
      polygons[0];
    const G: Vertex = mainPolygon ? mainPolygon.centroid : { x: 150, y: 100 };

    const allPoints: Vertex[] = [];
    if (mainPolygon) allPoints.push(...mainPolygon.vertices);
    polygons.forEach((p) => allPoints.push(...p.vertices));
    explicitLines.forEach((l) => {
      allPoints.push(l.a, l.b);
    });

    const is3DDiagram =
      fixed.includes('dasharray') ||
      fixed.includes('stroke-dash') ||
      /['’′]/.test(fixed);

    // 5. Shift Text Elements cleanly away from lines
    fixed = fixed.replace(/<text\b([^>]*?)>([\s\S]*?)<\/text>/gi, (fullMatch, attrs, textContent) => {
      const xMatch = attrs.match(/\bx=["']([^"']+)["']/i);
      const yMatch = attrs.match(/\by=["']([^"']+)["']/i);
      if (!xMatch || !yMatch) return fullMatch;

      let tx = Number(xMatch[1]);
      let ty = Number(yMatch[1]);
      const cleanText = textContent.replace(/<[^>]+>/g, '').trim();

      const charW = 7.5;
      const textW = Math.max(10, cleanText.length * charW);
      const cx = tx + textW / 2;
      const cy = ty - 4;

      const isAngle = cleanText.includes('°');
      const isVertexLabel = /^[A-Z]['’′_0-9]?$/i.test(cleanText) || /^[A-Z][0-9]$/i.test(cleanText) || /^[A-Z]_[0-9a-z]$/i.test(cleanText);
      const isInternalLabel = /^(h_[a-z]|m_[a-z]|r|R)$/i.test(cleanText);

      if (is3DDiagram) {
        // In 3D geometry diagrams, 3D perspective projection coordinates are already calculated.
        // We preserve tx and ty to prevent centroid ray corruption or edge snapping.
      } else if (isVertexLabel) {
        // Vertex labels (A, B, C...) - push outward along the ray from G
        let closestPt: Vertex | null = null;
        let minPtDist = Infinity;
        for (const p of allPoints) {
          const d = Math.hypot(cx - p.x, cy - p.y);
          if (d < minPtDist) {
            minPtDist = d;
            closestPt = p;
          }
        }

        if (closestPt && minPtDist < 25) {
          let dx = closestPt.x - G.x;
          let dy = closestPt.y - G.y;
          if (Math.abs(dx) < 5 && dy > 0) {
            dx = 0;
            dy = 1;
          }
          const len = Math.hypot(dx, dy) || 1;
          const ux = dx / len;
          const uy = dy / len;

          const targetVOffset = 20;
          const newCx = closestPt.x + ux * targetVOffset;
          const newCy = closestPt.y + uy * targetVOffset;

          tx = Math.round(newCx - textW / 2);
          ty = Math.round(newCy + 4);
        }
      } else if (isAngle) {
        // Angle labels (60°, 45°...) - position inside angle sector along bisector
        let closestV: Vertex | null = null;
        let minVDist = Infinity;
        for (const v of allPoints) {
          const d = Math.hypot(cx - v.x, cy - v.y);
          if (d < minVDist) {
            minVDist = d;
            closestV = v;
          }
        }

        if (closestV) {
          const adjEdges: { to: Vertex }[] = [];
          for (const seg of allSegments) {
            if (Math.hypot(seg.a.x - closestV.x, seg.a.y - closestV.y) < 1) {
              adjEdges.push({ to: seg.b });
            } else if (Math.hypot(seg.b.x - closestV.x, seg.b.y - closestV.y) < 1) {
              adjEdges.push({ to: seg.a });
            }
          }

          if (adjEdges.length >= 2) {
            const v1x = adjEdges[0].to.x - closestV.x;
            const v1y = adjEdges[0].to.y - closestV.y;
            const l1 = Math.hypot(v1x, v1y) || 1;
            const u1x = v1x / l1, u1y = v1y / l1;

            const v2x = adjEdges[1].to.x - closestV.x;
            const v2y = adjEdges[1].to.y - closestV.y;
            const l2 = Math.hypot(v2x, v2y) || 1;
            const u2x = v2x / l2, u2y = v2y / l2;

            let bx = u1x + u2x;
            let by = u1y + u2y;
            const blen = Math.hypot(bx, by) || 1;
            bx /= blen;
            by /= blen;

            const dot = Math.max(-1, Math.min(1, u1x * u2x + u1y * u2y));
            const angleRad = Math.acos(dot);
            const sinHalf = Math.sin(angleRad / 2);
            const angleDist = Math.max(18, Math.min(50, 16 / Math.max(0.3, sinHalf)));

            const newCx = closestV.x + bx * angleDist;
            const newCy = closestV.y + by * angleDist;

            tx = Math.round(newCx - textW / 2);
            ty = Math.round(newCy + 4);
          } else {
            const dx = G.x - cx;
            const dy = G.y - cy;
            const len = Math.hypot(dx, dy) || 1;
            tx = Math.round(tx + (dx / len) * 20);
            ty = Math.round(ty + (dy / len) * 20);
          }
        }
      } else if (isInternalLabel) {
        // Internal lines (h_a, m_a, r) - keep inside beside dashed line
        let closestLine: Edge | null = null;
        let minLDist = Infinity;
        let closestProj: { qx: number; qy: number } | null = null;
        for (const l of explicitLines) {
          const proj = distToSegment(cx, cy, l.a.x, l.a.y, l.b.x, l.b.y);
          if (proj.dist < minLDist) {
            minLDist = proj.dist;
            closestLine = l;
            closestProj = proj;
          }
        }
        if (closestLine && minLDist < 12 && closestProj) {
          tx = Math.round(closestProj.qx + 12);
          ty = Math.round(closestProj.qy + 4);
        }
      } else {
        // Check if this measurement is an internal dashed line measurement (e.g. median in Q15)
        const isInsideTriangle = mainPolygon && mainPolygon.isPoly && pointInPolygon(cx, cy, mainPolygon.vertices);
        let dashedLineNear: { line: Edge; proj: { qx: number; qy: number } } | null = null;
        for (const l of explicitLines) {
          if (l.isDashed) {
            const proj = distToSegment(cx, cy, l.a.x, l.a.y, l.b.x, l.b.y);
            if (proj.dist < 40) {
              dashedLineNear = { line: l, proj };
              break;
            }
          }
        }

        if (isInsideTriangle && dashedLineNear) {
          // Median/altitude measurement - place cleanly to the right of dashed line
          tx = Math.round(dashedLineNear.proj.qx + 12);
          ty = Math.round(dashedLineNear.proj.qy + 4);
        } else {
          // Outer perimeter edge measurement (70 m, 50 m, 80√2 m, 10 km, a, b, c, 5, 8...)
          let closestEdge: Edge | null = null;
          let closestProj: { qx: number; qy: number; t: number } | null = null;
          let minEDist = Infinity;

          for (const seg of perimeterSegments) {
            const proj = distToSegment(cx, cy, seg.a.x, seg.a.y, seg.b.x, seg.b.y);
            if (proj.dist < minEDist) {
              minEDist = proj.dist;
              closestEdge = seg;
              closestProj = proj;
            }
          }

          if (closestEdge && minEDist < 24 && closestProj) {
            const edx = closestEdge.b.x - closestEdge.a.x;
            const edy = closestEdge.b.y - closestEdge.a.y;
            const elen = Math.hypot(edx, edy) || 1;
            let nx = -edy / elen;
            let ny = edx / elen;

            const segCentroid = closestEdge.centroid || G;
            const toG_x = closestProj.qx - segCentroid.x;
            const toG_y = closestProj.qy - segCentroid.y;
            if (nx * toG_x + ny * toG_y < 0) {
              nx = -nx;
              ny = -ny;
            }

            let t = closestProj.t;
            t = Math.max(0.2, Math.min(0.8, t));
            const clampedQx = closestEdge.a.x + t * edx;
            const clampedQy = closestEdge.a.y + t * edy;

            const targetClearance = Math.max(22, 18 + textW * 0.25);
            const newCx = clampedQx + nx * targetClearance;
            const newCy = clampedQy + ny * targetClearance;

            tx = Math.round(newCx - textW / 2);
            ty = Math.round(newCy + 4);
          }
        }
      }

      let newAttrs = attrs.replace(/\bx=["'][^"']+["']/i, `x="${tx}"`);
      newAttrs = newAttrs.replace(/\by=["'][^"']+["']/i, `y="${ty}"`);
      return `<text ${newAttrs.trim()}>${textContent}</text>`;
    });

    // 6. Move all <text> elements to the end of the <svg> before </svg> (Painter's Algorithm)
    const textMatches: string[] = [];
    const withoutText = fixed.replace(/<text\b[\s\S]*?<\/text>/gi, (m) => {
      textMatches.push(m);
      return '';
    });

    if (textMatches.length > 0) {
      fixed = withoutText.replace(/<\/svg>/i, `${textMatches.join('')}</svg>`);
    }

    return fixed;
  });
}

/**
 * Trích xuất giá trị Đúng/Sai cho một nhãn (a, b, c, d) từ chuỗi đáp án (correctAnswer)
 * Sử dụng cờ Unicode `u` và bộ ký tự biên an toàn (?!\p{L}) để tránh bắt nhầm các từ như "Đường thẳng", "Đồ thị"
 */
export function parseTrueFalseTruth(key: string, answerStr?: string | null): boolean | null {
  if (!answerStr || typeof answerStr !== 'string') return null;

  const k = key.trim().toLowerCase();

  // Trường hợp 1: Khớp trực tiếp nhãn và token (a: Đ, a: Đúng, a: S, a: Sai, a. Đ, a) S)
  const directMatch = answerStr.match(
    new RegExp('(?:^|[\\s,;|\\n])' + k + '[-:=.,;()–—\\s]+(?:(Đúng|True|Đ|T|1)|(Sai|False|S|F|0))(?!\\p{L})', 'iu')
  );
  if (directMatch) {
    if (directMatch[1]) return true;
    if (directMatch[2]) return false;
  }

  // Trường hợp 2: Khớp câu đảo ngữ (c: ... là Sai)
  const tailMatch = answerStr.match(
    new RegExp('(?:^|[\\s,;|\\n])' + k + '[-:=.,;()–—\\s]+[^,;|\\n]*?(?:là|thì|kết quả|khẳng định|mệnh đề)?\\s*(?:(Đúng|True|Đ|T|1)|(Sai|False|S|F|0))(?!\\p{L})[\\s.,;|\\n]*?(?=[a-d][-:=.,;()]|$)', 'iu')
  );
  if (tailMatch) {
    if (tailMatch[1]) return true;
    if (tailMatch[2]) return false;
  }

  return null;
}

/**
 * Gọt sạch 100% các câu độc thoại nội tâm rác hoặc lời tự thú của mô hình AI
 */
export function cleanseInternalMonologue(text?: string | null): string {
  if (!text || typeof text !== 'string') return '';
  let cleaned = text;

  // 1. Phán đoán chọn đáp án gần nhất (Nearest neighbor guessing)
  cleaned = cleaned.replace(/[.,;\s]*(?:[^\n.]|(?<=\d)\.(?=\d))*?(?:gần\s+nhất|xấp\s+xỉ\s+nhất|gần\s+(?:với\s+)?[^\n.]*?\s+nhất)(?:[^\n.]|(?<=\d)\.(?=\d))*?\bnên\s+(?:ta\s+)?chọn(?:[^\n.]|(?<=\d)\.(?=\d))*/giu, '');
  cleaned = cleaned.replace(/[.,;\s]*Chọn\s+(?:[^\n.]|(?<=\d)\.(?=\d))*?\blà\s+xấp\s+xỉ\s+gần\s+nhất(?:[^\n.]|(?<=\d)\.(?=\d))*/giu, '');

  // 2. Tự ý đổi số / sửa tham số đề bài (Parameter mutation)
  cleaned = cleaned.replace(/[.,;\s]*(?:Để\s+số\s+(?:nguyên\s+)?đẹp(?:\s+hơn)?|(?:Do|Vì)\s+số\s+(?:xấu|lẻ)|(?:Chọn|Sửa)\s+lại\s+[A-Za-z0-9]+)(?:[^\n.]|(?<=\d)\.(?=\d))*/giu, '');

  // 3. Độc thoại hoảng loạn sửa đáp án
  cleaned = cleaned.replace(/[.,;\s]*Sửa\s+[a-d]\s+thành\s+(?:Đ|S|Đúng|Sai|True|False)[.,;\s]*/giu, '. ');
  cleaned = cleaned.replace(/[.,;\s]*Thôi\s+để\s+[a-d]\s*[:=-](?:[^\n.]|(?<=\d)\.(?=\d))*/giu, '');
  cleaned = cleaned.replace(/[.,;\s]*Có\s+vẻ\s+đề\s+cần\s+chỉnh(?:[^\n.]|(?<=\d)\.(?=\d))*/giu, '');

  // Chuẩn hóa dấu trừ Unicode sang ASCII trừ chuẩn
  cleaned = cleaned.replace(/[−–—]/g, '-');

  cleaned = cleaned.replace(/\s{2,}/g, ' ').replace(/^\s*[.,;]\s*/, '').replace(/[.,;]\s*([.,;])/g, '$1').trim();
  return cleaned;
}

/**
 * Bóc tách kết luận Đúng/Sai từ lời giải chi tiết (explanation)
 */
export function extractTruthFromExplanation(key: string, expl?: string | null): boolean | null {
  if (!expl || typeof expl !== 'string') return null;
  const k = key.trim().toLowerCase();

  // Dạng 1: 'a) ... (Đ)' hoặc '(S)' hoặc '(Đúng)'
  const p1 = expl.match(new RegExp('(?:^|\\n|\\s)' + k + '\\)[^\\n]*?\\(((?:Đúng|Sai|True|False|Đ|S))\\)', 'iu'));
  if (p1) return /[ĐđTt]/iu.test(p1[1]);

  // Dạng 2: 'a) ... là Đúng/Sai', '- Ý a: ... ĐÚNG', hoặc 'Khẳng định a: ... SAI'
  const p2 = expl.match(new RegExp('(?:^|\\n|\\s)(?:[-*+]\\s*)?(?:Ý|Mệnh đề|Khẳng định)?\\s*' + k + '[-:).;\\s]+[^\\n]*?(?<!\\p{L})(Đúng|Sai|True|False|Đ|S)(?!\\p{L})', 'iu'));
  if (p2) return /[ĐđTt]/iu.test(p2[1]);

  return null;
}

/**
 * Đồng bộ hóa toàn diện câu hỏi Đúng/Sai (True/False):
 * 1. Làm sạch độc thoại nội tâm trong explanation
 * 2. Đồng bộ hóa options mảng đối tượng { key, text, isCorrect }
 * 3. Tái tạo correctAnswer chuẩn "a: Đ, b: S, c: Đ, d: S"
 * 4. Tôn trọng dữ liệu đã chỉnh sửa của giáo viên nếu preserveTeacherEdits = true
 */
export function reconcileTrueFalseQuestion(q: any, preserveTeacherEdits: boolean = true): any {
  if (!q) return q;

  const subKeys = ['a', 'b', 'c', 'd'];
  const rawAnswer = String(q.correctAnswer || '');
  const rawExpl = String(q.explanation || '');

  // 1. Làm sạch độc thoại nội tâm trong lời giải
  const cleanedExpl = cleanseInternalMonologue(rawExpl);

  // 2. Kiểm tra nếu options đã có sẵn thuộc tính isCorrect hợp lệ và đang ở chế độ tôn trọng giáo viên
  const hasValidStoredOptions =
    preserveTeacherEdits &&
    Array.isArray(q.options) &&
    q.options.length >= 4 &&
    q.options.every((o: any) => typeof o === 'object' && o !== null && typeof o.isCorrect === 'boolean');

  if (hasValidStoredOptions) {
    const syncedAnswer = q.options
      .slice(0, 4)
      .map((o: any) => `${o.key ? String(o.key).toLowerCase() : 'a'}: ${o.isCorrect ? 'Đ' : 'S'}`)
      .join(', ');

    return {
      ...q,
      explanation: cleanedExpl || q.explanation,
      correctAnswer: syncedAnswer || q.correctAnswer,
    };
  }

  // 3. Chuẩn hóa options thô từ AI hoặc dữ liệu chưa có isCorrect
  const currentOpts = Array.isArray(q.options) && q.options.length > 0
    ? q.options.slice(0, 4)
    : subKeys.map((k) => ({ key: k, text: `Mệnh đề ${k}` }));

  const normalizedOptions = currentOpts.map((opt: any, idx: number) => {
    const k = subKeys[idx] || 'a';
    const rawText = typeof opt === 'string' ? opt : (opt.text || '');
    const cleanText = rawText
      .replace(/(?:^\([A-Da-d]\)|^[\[\{][A-Da-d][\]\}]|^[A-Da-d][\.\:\)\-–—])\s*/i, '')
      .trim();

    const explTruth = extractTruthFromExplanation(k, rawExpl);
    const answerTruth = parseTrueFalseTruth(k, rawAnswer);

    let isCorrect: boolean;
    if (explTruth !== null) {
      isCorrect = explTruth;
    } else if (answerTruth !== null) {
      isCorrect = answerTruth;
    } else if (typeof opt === 'object' && opt !== null && typeof opt.isCorrect === 'boolean') {
      isCorrect = opt.isCorrect;
    } else {
      isCorrect = idx % 2 === 0;
    }

    return {
      key: k,
      text: cleanText || rawText || `Mệnh đề khẳng định ý ${k}`,
      isCorrect,
    };
  });

  // Đảm bảo đủ 4 ý a, b, c, d
  while (normalizedOptions.length < 4) {
    const k = subKeys[normalizedOptions.length] || 'a';
    normalizedOptions.push({ key: k, text: `Mệnh đề khẳng định ý ${k}`, isCorrect: false });
  }

  const normalizedAnswer = normalizedOptions
    .map((o: any) => `${o.key}: ${o.isCorrect ? 'Đ' : 'S'}`)
    .join(', ');

  return {
    ...q,
    options: normalizedOptions,
    correctAnswer: normalizedAnswer,
    explanation: cleanedExpl || q.explanation,
  };
}


