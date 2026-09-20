import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  Footer,
  PageNumber,
} from 'docx';
import JSZip from 'jszip';
import { ExamItem, ExamQuestion, formatExamCode } from '@/lib/store/app-store';
import {
  DEFAULT_SECTION_TITLES,
  DEFAULT_SECTION_DESCRIPTIONS,
  normalizeQuestionType,
} from './exam-sections';
import { normalizeDepartmentAccents } from './education-departments';

export interface ExportExamOptions {
  includeAnswers?: boolean;
  schoolName?: string;
  departmentName?: string;
  sessionTitle?: string;
  academicYear?: string;
  sectionTitles?: Record<string, string>;
  sectionDescriptions?: Record<string, string>;
}

/**
 * Downloads a binary Blob with a given filename
 */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Clean option prefix like "A. ", "B. ", "(A) " safely
 */
export function cleanOpt(text: string): string {
  if (!text) return '';
  return text.replace(/^(\(?[A-D]\)[\.\:\-\s]+|[A-D][\.\:\)]\s+)/i, '').trim() || text;
}

/**
 * Safely extracts option text regardless of whether key is 'A', 'a', 'A.', etc.
 * or falls back to index 0, 1, 2, 3.
 */
export function getExamOptionText(
  q: ExamQuestion,
  keyUpper: 'A' | 'B' | 'C' | 'D',
  fallbackIndex: number
): string {
  if (!q.options || q.options.length === 0) return '';
  const found = q.options.find((o) => {
    const k = (o.key || '').trim().toUpperCase();
    return k === keyUpper || k.startsWith(keyUpper);
  });
  if (found && found.text) return found.text;
  if (q.options[fallbackIndex] && q.options[fallbackIndex].text) {
    return q.options[fallbackIndex].text;
  }
  return '';
}

/**
 * Converts LaTeX math expressions into clean, readable Unicode math symbols for Microsoft Word.
 * Prevents raw LaTeX code leaking into Word documents.
 */
export function cleanMathForDoc(text: string): string {
  if (!text) return '';

  let res = text;

  // Convert LaTeX fractions: \frac{a}{b} -> (a)/(b)
  res = res.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1)/($2)');
  res = res.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1)/($2)');

  // Convert roots: \sqrt[n]{x} -> n√(x), \sqrt{x} -> √(x)
  res = res.replace(/\\sqrt\[([^{}]+)\]\{([^{}]+)\}/g, '$1√($2)');
  res = res.replace(/\\sqrt\{([^{}]+)\}/g, '√($1)');

  // Common math sets and constants
  res = res.replace(/\\mathbb\{R\}/g, 'ℝ');
  res = res.replace(/\\mathbb\{N\}/g, 'ℕ');
  res = res.replace(/\\mathbb\{Z\}/g, 'ℤ');
  res = res.replace(/\\mathbb\{Q\}/g, 'ℚ');
  res = res.replace(/\\mathbb\{C\}/g, 'ℂ');
  res = res.replace(/\\emptyset/g, '∅');

  // Integrals & Summations
  res = res.replace(/\\int\b/g, '∫');
  res = res.replace(/\\sum\b/g, '∑');

  // Comparison & logic symbols
  res = res.replace(/\\le(q)?\b/g, '≤');
  res = res.replace(/\\ge(q)?\b/g, '≥');
  res = res.replace(/\\ne(q)?\b/g, '≠');
  res = res.replace(/\\approx/g, '≈');
  res = res.replace(/\\equiv/g, '≡');
  res = res.replace(/\\pm\b/g, '±');
  res = res.replace(/\\mp\b/g, '∓');
  res = res.replace(/\\in\b/g, '∈');
  res = res.replace(/\\notin\b/g, '∉');
  res = res.replace(/\\subset(eq)?\b/g, '⊂');
  res = res.replace(/\\cup\b/g, '∪');
  res = res.replace(/\\cap\b/g, '∩');
  res = res.replace(/\\infty\b/g, '∞');
  res = res.replace(/\\forall\b/g, '∀');
  res = res.replace(/\\exists\b/g, '∃');

  // Greek letters
  res = res.replace(/\\alpha\b/g, 'α');
  res = res.replace(/\\beta\b/g, 'β');
  res = res.replace(/\\gamma\b/g, 'γ');
  res = res.replace(/\\Delta\b/g, 'Δ');
  res = res.replace(/\\delta\b/g, 'δ');
  res = res.replace(/\\pi\b/g, 'π');
  res = res.replace(/\\theta\b/g, 'θ');
  res = res.replace(/\\lambda\b/g, 'λ');
  res = res.replace(/\\omega\b/g, 'ω');
  res = res.replace(/\\Omega\b/g, 'Ω');
  res = res.replace(/\\sigma\b/g, 'σ');

  // Operators & arrows
  res = res.replace(/\\times\b/g, '×');
  res = res.replace(/\\cdot\b/g, '·');
  res = res.replace(/\\div\b/g, '÷');
  res = res.replace(/\\to\b/g, '→');
  res = res.replace(/\\rightarrow\b/g, '→');
  res = res.replace(/\\Rightarrow\b/g, '⇒');
  res = res.replace(/\\Leftrightarrow\b/g, '⇔');

  // Superscripts
  const supers: Record<string, string> = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    '+': '⁺', '-': '⁻', 'n': 'ⁿ', 'x': 'ˣ', 'y': 'ʸ'
  };
  res = res.replace(/\^([0-9\+\-nxy])/g, (_, ch) => supers[ch] || `^${ch}`);
  res = res.replace(/\^\{([0-9\+\-nxy]+)\}/g, (_, str) => {
    return str.split('').map((c: string) => supers[c] || c).join('');
  });

  // Subscripts
  const subs: Record<string, string> = {
    '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
    '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
    'x': 'ₓ', 'y': 'ᵧ'
  };
  res = res.replace(/_([0-9xy])/g, (_, ch) => subs[ch] || `_${ch}`);
  res = res.replace(/_\{([0-9xy]+)\}/g, (_, str) => {
    return str.split('').map((c: string) => subs[c] || c).join('');
  });

  // Strip text{} and mathrm{}
  res = res.replace(/\\(?:text|mathrm|mathbf)\{([^{}]+)\}/g, '$1');

  // Strip enclosing $ or $$ delimiters
  res = res.replace(/\$\$([^\$]+)\$\$/g, '$1');
  res = res.replace(/\$([^\$]+)\$/g, '$1');

  // Clean remaining escaped backslashes
  res = res.replace(/\\([\{\}])/g, '$1');

  return res.trim();
}

/**
 * Calculates adaptive multiple-choice layout according to official Vietnamese exam standard:
 * - 4: 4 options in 1 row (25% width each) when options are short (e.g. numbers, formulas, simple words)
 * - 2: 2 options per row (50% width each, 2 rows) when options are medium length
 * - 1: 1 option per row (100% width each, 4 rows) when options are long or multi-line
 */
export function getOptionsLayout(options: { text: string }[]): 4 | 2 | 1 {
  const cleanTexts = options.map((o) => cleanOpt(o.text) || '');
  const maxLen = Math.max(...cleanTexts.map((t) => t.length), 0);
  const totalLen = cleanTexts.reduce((sum, t) => sum + t.length, 0);

  // If any option contains line break or is very long (> 50 chars) or total > 140 chars: 1 per line
  if (maxLen > 50 || totalLen > 140 || cleanTexts.some((t) => t.includes('\n'))) {
    return 1;
  }
  // If all options are short (max length <= 22 chars and total <= 75 chars): 4 on 1 line
  if (maxLen <= 22 && totalLen <= 75) {
    return 4;
  }
  // Otherwise: 2 on 1 line (2 rows x 2 cols)
  return 2;
}

/**
 * Generates Microsoft Word .docx Blob (Chuẩn Bộ GD&ĐT)
 * Strict OpenXML ISO/IEC 29500 compliant:
 * - Exact table grid column widths (dxa/twips) matching cell widths
 * - Native paragraph borders (no nested tables inside cells)
 * - Validated cell spans and clean typography
 */
export async function generateDocxBlob(
  exam: ExamItem,
  options: ExportExamOptions = { includeAnswers: true }
): Promise<Blob> {
  const questions: ExamQuestion[] = exam.questions || [];
  const department = normalizeDepartmentAccents((options.departmentName || exam.department || 'SỞ GIÁO DỤC VÀ ĐÀO TẠO THÀNH PHỐ HẢI PHÒNG').trim());
  const rawSchool = (options.schoolName || exam.schoolName || '').trim();
  const school = (!rawSchool || rawSchool === 'HẢ' ? 'TRƯỜNG THPT CHUYÊN TRẦN PHÚ' : rawSchool);
  const session = (options.sessionTitle || exam.sessionTitle || exam.term || 'KỲ THI KIỂM TRA ĐÁNH GIÁ CHẤT LƯỢNG').trim();
  const year = (options.academicYear || exam.academicYear || (exam.year ? (exam.year.startsWith('NĂM') ? exam.year : `NĂM HỌC ${exam.year}`) : 'NĂM HỌC 2024 – 2025')).trim();

  const docChildren: any[] = [];

  const borderNone = {
    top: { style: BorderStyle.NONE },
    bottom: { style: BorderStyle.NONE },
    left: { style: BorderStyle.NONE },
    right: { style: BorderStyle.NONE },
    insideHorizontal: { style: BorderStyle.NONE },
    insideVertical: { style: BorderStyle.NONE },
  };

  // 1. Header Information Table (2 columns: Sở/Trường & Kỳ thi/Môn, width = 9600 dxa)
  const headerTable = new Table({
    width: { size: 9600, type: WidthType.DXA },
    columnWidths: [4300, 5300],
    borders: borderNone,
    rows: [
      new TableRow({
        children: [
          // Left Box: SỞ GIÁO DỤC / TRƯỜNG & KHUNG ĐỀ CHÍNH THỨC
          new TableCell({
            width: { size: 4300, type: WidthType.DXA },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: department.toUpperCase(), size: 19, bold: true }),
                ],
                alignment: AlignmentType.CENTER,
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: school.toUpperCase(), bold: true, size: 20 }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { after: 100 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'ĐỀ CHÍNH THỨC', bold: true, size: 20 }),
                ],
                alignment: AlignmentType.CENTER,
                border: {
                  top: { style: BorderStyle.SINGLE, size: 8, color: '000000' },
                  bottom: { style: BorderStyle.SINGLE, size: 8, color: '000000' },
                  left: { style: BorderStyle.SINGLE, size: 8, color: '000000' },
                  right: { style: BorderStyle.SINGLE, size: 8, color: '000000' },
                },
                indent: { left: 700, right: 700 },
                spacing: { before: 60, after: 60 },
              }),
            ],
          }),

          // Right Box: KỲ THI, NĂM HỌC, MÔN THI, THỜI GIAN
          new TableCell({
            width: { size: 5300, type: WidthType.DXA },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: session.toUpperCase(), bold: true, size: 20 }),
                ],
                alignment: AlignmentType.CENTER,
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: year.toUpperCase(), bold: true, size: 20 }),
                ],
                alignment: AlignmentType.CENTER,
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: `Môn thi: ${exam.subject.toUpperCase()} (${exam.grade.toUpperCase()})`, bold: true, size: 20 }),
                ],
                alignment: AlignmentType.CENTER,
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: `Thời gian làm bài: ${exam.duration} phút (không kể thời gian giao đề)`, italics: true, size: 18 }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        ],
      }),
    ],
  });

  docChildren.push(headerTable);

  const shortCode = formatExamCode(exam.id, exam.code);

  // Sub-header & Ô MÃ ĐỀ THI đóng khung chuẩn Bộ GD&ĐT
  const examCodeTable = new Table({
    width: { size: 9600, type: WidthType.DXA },
    columnWidths: [6600, 3000],
    borders: borderNone,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 6600, type: WidthType.DXA },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: `(Đề thi gồm ${questions.length} câu)`, italics: true, size: 19 }),
                ],
                alignment: AlignmentType.LEFT,
                spacing: { before: 80, after: 80 },
              }),
            ],
          }),
          new TableCell({
            width: { size: 3000, type: WidthType.DXA },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
              bottom: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
              left: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
              right: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
            },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: `Mã đề thi ${shortCode}`, bold: true, size: 20 }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { before: 50, after: 50 },
              }),
            ],
          }),
        ],
      }),
    ],
  });

  docChildren.push(examCodeTable);

  // Student Info Box
  docChildren.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'Họ và tên thí sinh: ............................................................................................ ', size: 20 }),
        new TextRun({ text: 'Số báo danh: .....................', size: 20 }),
      ],
      spacing: { before: 80, after: 180 },
    })
  );

  // Divider Line
  docChildren.push(
    new Paragraph({
      children: [
        new TextRun({ text: '------------------------------------------------------------------------------------------------------------------', size: 14, color: '888888' }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 220 },
    })
  );

  // 3. Question Items List with Sections
  let currentSectionKey = '';
  questions.forEach((q, idx) => {
    const normType = normalizeQuestionType(q.type);
    const sectionKey = q.section || normType;
    if (sectionKey !== currentSectionKey) {
      currentSectionKey = sectionKey;
      const customTitles = options.sectionTitles || exam.sectionTitles || {};
      const customDescs = options.sectionDescriptions || exam.sectionDescriptions || {};
      const titleText = customTitles[sectionKey] || q.section || DEFAULT_SECTION_TITLES[normType] || `PHẦN ${sectionKey.toUpperCase()}`;
      const descText = customDescs[sectionKey] !== undefined ? customDescs[sectionKey] : (DEFAULT_SECTION_DESCRIPTIONS[normType] || '');

      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({ text: titleText.toUpperCase(), bold: true, size: 22 }),
          ],
          spacing: { before: idx === 0 ? 120 : 260, after: 40 },
        })
      );
      if (descText) {
        docChildren.push(
          new Paragraph({
            children: [
              new TextRun({ text: descText, italics: true, size: 20, color: '444444' }),
            ],
            spacing: { before: 0, after: 120 },
          })
        );
      }
    }

    // Question Title & Content (chuẩn đề thi: Câu 1. nội dung)
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: `Câu ${idx + 1}. `, bold: true, size: 22, color: '2563EB' }),
          new TextRun({ text: cleanMathForDoc(q.content || ''), size: 22 }),
        ],
        spacing: { before: 140, after: 60 },
      })
    );

    // 1. Loại: Đúng / Sai (Bảng 4 cột chuẩn Bộ GD&ĐT: STT, Mệnh đề, Đúng, Sai)
    if (normType === 'true_false') {
      const items = (q.options || []).length > 0 ? q.options : [
        { key: 'a', text: 'Mệnh đề a', isCorrect: true },
        { key: 'b', text: 'Mệnh đề b', isCorrect: false },
        { key: 'c', text: 'Mệnh đề c', isCorrect: true },
        { key: 'd', text: 'Mệnh đề d', isCorrect: false },
      ];

      const borderSingle = {
        top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
        left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
        right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
        insideVertical: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
      };

      const headerRow = new TableRow({
        children: [
          new TableCell({
            width: { size: 7600, type: WidthType.DXA },
            columnSpan: 2,
            children: [
              new Paragraph({
                children: [new TextRun({ text: 'Mệnh đề', bold: true, size: 21 })],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
          new TableCell({
            width: { size: 1000, type: WidthType.DXA },
            children: [
              new Paragraph({
                children: [new TextRun({ text: 'Đúng', bold: true, size: 21 })],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
          new TableCell({
            width: { size: 1000, type: WidthType.DXA },
            children: [
              new Paragraph({
                children: [new TextRun({ text: 'Sai', bold: true, size: 21 })],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        ],
      });

      const bodyRows: TableRow[] = items.map((item, itemIdx) => {
        const isCorrect = item.isCorrect === true;
        const dungMark = options.includeAnswers ? (isCorrect ? 'X' : '') : '';
        const saiMark = options.includeAnswers ? (!isCorrect ? 'X' : '') : '';
        const labelKey = (item.key || String.fromCharCode(97 + itemIdx)).toLowerCase().replace(/[\)\.\:]/g, '');

        return new TableRow({
          children: [
            new TableCell({
              width: { size: 600, type: WidthType.DXA },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: `${labelKey})`, bold: true, size: 21 })],
                  alignment: AlignmentType.CENTER,
                }),
              ],
            }),
            new TableCell({
              width: { size: 7000, type: WidthType.DXA },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: cleanMathForDoc(cleanOpt(item.text)), size: 21 })],
                  alignment: AlignmentType.LEFT,
                }),
              ],
            }),
            new TableCell({
              width: { size: 1000, type: WidthType.DXA },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: dungMark, bold: true, size: 22 })],
                  alignment: AlignmentType.CENTER,
                }),
              ],
            }),
            new TableCell({
              width: { size: 1000, type: WidthType.DXA },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: saiMark, bold: true, size: 22 })],
                  alignment: AlignmentType.CENTER,
                }),
              ],
            }),
          ],
        });
      });

      docChildren.push(
        new Table({
          width: { size: 9600, type: WidthType.DXA },
          columnWidths: [600, 7000, 1000, 1000],
          borders: borderSingle,
          rows: [headerRow, ...bodyRows],
        })
      );
    } else if (normType === 'short_answer') {
      // 2. Loại: Trả lời ngắn
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Đáp số: ..........................................................................................................................................', italics: true, size: 21 }),
          ],
          spacing: { before: 40, after: 120 },
        })
      );
    } else if (normType === 'essay') {
      // 3. Loại: Tự luận
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({ text: '(Thí sinh trình bày bài làm chi tiết bên dưới)', italics: true, size: 19, color: '666666' }),
          ],
          spacing: { before: 40, after: 80 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: '..................................................................................................................................................', size: 18, color: '999999' }),
          ],
          spacing: { after: 90 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: '..................................................................................................................................................', size: 18, color: '999999' }),
          ],
          spacing: { after: 90 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: '..................................................................................................................................................', size: 18, color: '999999' }),
          ],
          spacing: { after: 140 },
        })
      );
    } else {
      // 4. Loại: Trắc nghiệm 4 lựa chọn (A, B, C, D) với bố cục thích ứng 4/2/1
      const optA = cleanMathForDoc(getExamOptionText(q, 'A', 0));
      const optB = cleanMathForDoc(getExamOptionText(q, 'B', 1));
      const optC = cleanMathForDoc(getExamOptionText(q, 'C', 2));
      const optD = cleanMathForDoc(getExamOptionText(q, 'D', 3));

      const layout = getOptionsLayout([
        { text: optA },
        { text: optB },
        { text: optC },
        { text: optD },
      ]);

      if (layout === 4) {
        // 1 dòng 4 đáp án (2400 dxa mỗi cột = 9600 dxa tổng)
        const optionsTable = new Table({
          width: { size: 9600, type: WidthType.DXA },
          columnWidths: [2400, 2400, 2400, 2400],
          borders: borderNone,
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 2400, type: WidthType.DXA },
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({ text: 'A. ', bold: true, size: 21 }),
                        new TextRun({ text: cleanOpt(optA), size: 21 }),
                      ],
                      spacing: { after: 40 },
                    }),
                  ],
                }),
                new TableCell({
                  width: { size: 2400, type: WidthType.DXA },
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({ text: 'B. ', bold: true, size: 21 }),
                        new TextRun({ text: cleanOpt(optB), size: 21 }),
                      ],
                      spacing: { after: 40 },
                    }),
                  ],
                }),
                new TableCell({
                  width: { size: 2400, type: WidthType.DXA },
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({ text: 'C. ', bold: true, size: 21 }),
                        new TextRun({ text: cleanOpt(optC), size: 21 }),
                      ],
                      spacing: { after: 40 },
                    }),
                  ],
                }),
                new TableCell({
                  width: { size: 2400, type: WidthType.DXA },
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({ text: 'D. ', bold: true, size: 21 }),
                        new TextRun({ text: cleanOpt(optD), size: 21 }),
                      ],
                      spacing: { after: 40 },
                    }),
                  ],
                }),
              ],
            }),
          ],
        });
        docChildren.push(optionsTable);
      } else if (layout === 2) {
        // 2 dòng, mỗi dòng 2 đáp án (4800 dxa mỗi cột = 9600 dxa tổng)
        const optionsTable = new Table({
          width: { size: 9600, type: WidthType.DXA },
          columnWidths: [4800, 4800],
          borders: borderNone,
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 4800, type: WidthType.DXA },
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({ text: 'A. ', bold: true, size: 21 }),
                        new TextRun({ text: cleanOpt(optA), size: 21 }),
                      ],
                      spacing: { after: 40 },
                    }),
                  ],
                }),
                new TableCell({
                  width: { size: 4800, type: WidthType.DXA },
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({ text: 'B. ', bold: true, size: 21 }),
                        new TextRun({ text: cleanOpt(optB), size: 21 }),
                      ],
                      spacing: { after: 40 },
                    }),
                  ],
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 4800, type: WidthType.DXA },
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({ text: 'C. ', bold: true, size: 21 }),
                        new TextRun({ text: cleanOpt(optC), size: 21 }),
                      ],
                      spacing: { after: 40 },
                    }),
                  ],
                }),
                new TableCell({
                  width: { size: 4800, type: WidthType.DXA },
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({ text: 'D. ', bold: true, size: 21 }),
                        new TextRun({ text: cleanOpt(optD), size: 21 }),
                      ],
                      spacing: { after: 40 },
                    }),
                  ],
                }),
              ],
            }),
          ],
        });
        docChildren.push(optionsTable);
      } else {
        // 4 dòng, mỗi dòng 1 đáp án: dùng các Paragraph độc lập, sạch sẽ
        docChildren.push(
          new Paragraph({
            children: [
              new TextRun({ text: 'A. ', bold: true, size: 21 }),
              new TextRun({ text: cleanOpt(optA), size: 21 }),
            ],
            spacing: { after: 30 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'B. ', bold: true, size: 21 }),
              new TextRun({ text: cleanOpt(optB), size: 21 }),
            ],
            spacing: { after: 30 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'C. ', bold: true, size: 21 }),
              new TextRun({ text: cleanOpt(optC), size: 21 }),
            ],
            spacing: { after: 30 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'D. ', bold: true, size: 21 }),
              new TextRun({ text: cleanOpt(optD), size: 21 }),
            ],
            spacing: { after: 40 },
          })
        );
      }
    }
  });

  // Footer Marker
  docChildren.push(
    new Paragraph({
      children: [
        new TextRun({ text: '- HẾT -', bold: true, size: 22 }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 280, after: 180 },
    })
  );

  // Instructions for Candidates and Proctors
  docChildren.push(
    new Paragraph({
      children: [
        new TextRun({ text: '- Thí sinh không được sử dụng tài liệu và máy tính không đúng quy định.', italics: true, size: 18 }),
      ],
      spacing: { after: 40 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: '- Cán bộ coi thi không giải thích gì thêm.', italics: true, size: 18 }),
      ],
      spacing: { after: 280 },
    })
  );

  // 4. Answer Key & Detailed Explanation Section (if requested)
  if (options.includeAnswers) {
    docChildren.push(
      new Paragraph({
        text: 'BẢNG ĐÁP ÁN & HƯỚNG DẪN CHẤM CHI TIẾT',
        heading: HeadingLevel.HEADING_2,
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 200 },
      })
    );

    // Answer Key Table
    const tableCols = 5;
    const answerRows: TableRow[] = [];
    const numRows = Math.ceil(questions.length / tableCols);

    const ansBorder = {
      top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
      left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
      right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
      insideVertical: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    };

    for (let r = 0; r < numRows; r++) {
      const cells: TableCell[] = [];
      for (let c = 0; c < tableCols; c++) {
        const qIdx = r * tableCols + c;
        if (qIdx < questions.length) {
          const q = questions[qIdx];
          cells.push(
            new TableCell({
              width: { size: 1920, type: WidthType.DXA },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: `Câu ${qIdx + 1}: `, bold: true, size: 19 }),
                    new TextRun({ text: cleanMathForDoc(q.correctAnswer || ''), bold: true, color: '008800', size: 20 }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
              ],
            })
          );
        } else {
          cells.push(
            new TableCell({
              width: { size: 1920, type: WidthType.DXA },
              children: [new Paragraph({ text: '' })],
            })
          );
        }
      }
      answerRows.push(new TableRow({ children: cells }));
    }

    if (answerRows.length > 0) {
      docChildren.push(
        new Table({
          width: { size: 9600, type: WidthType.DXA },
          columnWidths: [1920, 1920, 1920, 1920, 1920],
          borders: ansBorder,
          rows: answerRows,
        })
      );
    }

    // Detailed Solutions List
    docChildren.push(
      new Paragraph({
        text: 'HƯỚNG DẪN GIẢI CHI TIẾT TỪNG CÂU:',
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 300, after: 150 },
      })
    );

    questions.forEach((q, idx) => {
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Câu ${idx + 1} (Đáp án ${cleanMathForDoc(q.correctAnswer || '')}): `, bold: true, size: 20 }),
            new TextRun({ text: cleanMathForDoc(q.explanation || 'Xem lý thuyết sách giáo khoa.'), size: 20, italics: true }),
          ],
          spacing: { before: 100, after: 80 },
        })
      );
    });
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 11906, // 210mm A4
              height: 16838, // 297mm A4
            },
            margin: {
              top: 1134, // 20mm
              right: 1134,
              bottom: 1134,
              left: 1134,
            },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: 'Trang ',
                    italics: true,
                    size: 18,
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    italics: true,
                    size: 18,
                  }),
                  new TextRun({
                    text: ' / ',
                    italics: true,
                    size: 18,
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    italics: true,
                    size: 18,
                  }),
                ],
              }),
            ],
          }),
        },
        children: docChildren,
      },
    ],
  });

  return await Packer.toBlob(doc);
}

/**
 * Export exam to standard Microsoft Word .docx format (Chuẩn Bộ GD&ĐT)
 */
export async function exportExamToDocx(
  exam: ExamItem,
  options: ExportExamOptions = { includeAnswers: true }
) {
  const blob = await generateDocxBlob(exam, options);
  const safeTitle = (exam.title || 'De_thi_Examify')
    .replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9]/g, '_')
    .replace(/_+/g, '_');
  downloadBlob(blob, `${safeTitle}.docx`);
}

/**
 * Generates Word HTML (.doc) string with complete Microsoft Word Office namespaces,
 * ensuring modern Word versions open without file block or corruption warnings.
 */
export function generateDocHtml(
  exam: ExamItem,
  options: ExportExamOptions = { includeAnswers: true }
): string {
  const questions: ExamQuestion[] = exam.questions || [];
  const department = normalizeDepartmentAccents((options.departmentName || exam.department || 'SỞ GIÁO DỤC VÀ ĐÀO TẠO THÀNH PHỐ HẢI PHÒNG').trim());
  const rawSchool = (options.schoolName || exam.schoolName || '').trim();
  const school = (!rawSchool || rawSchool === 'HẢ' ? 'TRƯỜNG THPT CHUYÊN TRẦN PHÚ' : rawSchool);
  const session = (options.sessionTitle || exam.sessionTitle || exam.term || 'KỲ THI KIỂM TRA ĐÁNH GIÁ CHẤT LƯỢNG').trim();
  const year = (options.academicYear || exam.academicYear || (exam.year ? (exam.year.startsWith('NĂM') ? exam.year : `NĂM HỌC ${exam.year}`) : 'NĂM HỌC 2024 – 2025')).trim();
  const shortCode = formatExamCode(exam.id, exam.code);

  let htmlContent = `
<html xmlns:o='urn:schemas-microsoft-com:office:office'
      xmlns:w='urn:schemas-microsoft-com:office:word'
      xmlns:v='urn:schemas-microsoft-com:vml'
      xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <title>${exam.title}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page Section1 {
      size: 595.3pt 841.9pt;
      margin: 56.7pt 56.7pt 56.7pt 56.7pt;
      mso-header-margin: 35.4pt;
      mso-footer-margin: 35.4pt;
      mso-paper-source: 0;
      mso-footer: f1;
    }
    div.Section1 { page: Section1; }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
      line-height: 1.35;
      color: #000;
      background-color: #fff;
    }
    p.MsoNormal, div.MsoNormal {
      margin: 0;
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
    }
    .header-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    .header-table td { border: none; text-align: center; vertical-align: top; padding: 2px 4px; }
    .header-left { width: 45%; }
    .header-right { width: 55%; font-weight: bold; }
    .official-box { display: inline-block; border: 1.5pt solid #000; padding: 2px 10px; font-weight: bold; font-size: 11pt; margin-top: 4px; }
    .student-info { margin-bottom: 15px; font-size: 11pt; border-top: 1px dashed #666; padding-top: 6px; }
    .question { margin-bottom: 14px; page-break-inside: avoid; }
    .q-title { font-size: 12pt; margin-bottom: 5px; }
    .options-grid { width: 100%; border-collapse: collapse; margin-top: 4px; margin-bottom: 8px; }
    .options-grid td { vertical-align: top; border: none; font-size: 12pt; padding: 3px 6px; }
    .tf-print-table { width: 100%; border-collapse: collapse; margin-top: 6px; margin-bottom: 10px; }
    .tf-print-table th, .tf-print-table td { border: 1pt solid #000; padding: 4px 6px; font-size: 11pt; }
    .footer-divider { text-align: center; font-weight: bold; font-size: 12pt; margin: 25px 0 10px 0; }
    .proctor-notes { font-style: italic; font-size: 10.5pt; line-height: 1.4; margin-bottom: 25px; }
    .answer-key { margin-top: 30px; page-break-before: always; }
    .ans-table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 16px; }
    .ans-table td, .ans-table th { border: 1pt solid #333; padding: 5px; text-align: center; font-size: 11pt; }
    .solution-item { margin-bottom: 10px; font-size: 11pt; }
  </style>
</head>
<body>
<div class="Section1">
  <table class="header-table">
    <tr>
      <td class="header-left">
        <div style="font-weight: bold;">${department.toUpperCase()}</div>
        <div style="font-weight: bold; font-size: 13pt;">${school.toUpperCase()}</div>
        <div class="official-box">ĐỀ CHÍNH THỨC</div>
      </td>
      <td class="header-right">
        <div>${session.toUpperCase()}</div>
        <div>${year.toUpperCase()}</div>
        <div style="margin-top: 3px;">Môn thi: ${exam.subject.toUpperCase()} (${exam.grade.toUpperCase()})</div>
        <div style="font-weight: normal; font-style: italic; font-size: 11pt;">Thời gian làm bài: ${exam.duration} phút (không kể thời gian giao đề)</div>
      </td>
    </tr>
  </table>

  <table style="width: 100%; margin: 8px 0 6px 0; border: none; border-collapse: collapse;">
    <tr>
      <td style="font-style: italic; font-size: 11pt; vertical-align: middle; border: none; padding: 0;">
        (Đề thi gồm ${questions.length} câu)
      </td>
      <td style="text-align: right; border: none; padding: 0;">
        <div style="display: inline-block; border: 1.5pt solid black; padding: 3px 14px; font-weight: bold; font-size: 11pt; font-family: 'Times New Roman', serif;">
          Mã đề thi ${shortCode}
        </div>
      </td>
    </tr>
  </table>

  <div class="student-info" style="border-top: 1px dashed #888; padding-top: 6px; margin-bottom: 15px; font-size: 11pt; font-family: 'Times New Roman', serif;">
    Họ và tên thí sinh: ............................................................................................ Số báo danh: .....................
  </div>

  <div class="questions-list">
    <div style="text-align: center; font-weight: bold; color: #dc2626; font-size: 13pt; margin: 8px 0 10px 0; text-transform: uppercase;">
      CÂU HỎI
    </div>
`;

  let currentSectionKey = '';
  questions.forEach((q, idx) => {
    const normType = normalizeQuestionType(q.type);
    const sectionKey = q.section || normType;
    if (sectionKey !== currentSectionKey) {
      currentSectionKey = sectionKey;
      const customTitles = options.sectionTitles || exam.sectionTitles || {};
      const customDescs = options.sectionDescriptions || exam.sectionDescriptions || {};
      const titleText = customTitles[sectionKey] || q.section || DEFAULT_SECTION_TITLES[normType] || `PHẦN ${sectionKey.toUpperCase()}`;
      const descText = customDescs[sectionKey] !== undefined ? customDescs[sectionKey] : (DEFAULT_SECTION_DESCRIPTIONS[normType] || '');

      htmlContent += `
      <div style="margin-top: ${idx === 0 ? '10px' : '24px'}; margin-bottom: 12px; border-bottom: 1.5px solid #222; padding-bottom: 4px;">
        <div style="font-weight: bold; font-size: 12pt; text-transform: uppercase;">${titleText}</div>
        ${descText ? `<div style="font-style: italic; font-size: 10.5pt; color: #444; margin-top: 2px;">${descText}</div>` : ''}
      </div>
      `;
    }

    htmlContent += `
    <div class="question">
      <div class="q-title"><strong style="color: #2563eb;">Câu ${idx + 1}.</strong> ${cleanMathForDoc(q.content || '')}</div>
    `;

    if (normType === 'true_false') {
      const items = (q.options || []).length > 0 ? q.options : [
        { key: 'a', text: 'Mệnh đề a', isCorrect: true },
        { key: 'b', text: 'Mệnh đề b', isCorrect: false },
        { key: 'c', text: 'Mệnh đề c', isCorrect: true },
        { key: 'd', text: 'Mệnh đề d', isCorrect: false },
      ];

      htmlContent += `
      <table class="tf-print-table" style="width: 100%; border-collapse: collapse; margin-top: 6px; margin-bottom: 8px; border: 1.5pt solid #000;">
        <thead>
          <tr style="background-color: #f5f5f5;">
            <th colspan="2" style="border: 1pt solid #000; padding: 4px 6px; text-align: center; font-weight: bold; width: 76%;">Mệnh đề</th>
            <th style="border: 1pt solid #000; padding: 4px 6px; text-align: center; font-weight: bold; width: 12%;">Đúng</th>
            <th style="border: 1pt solid #000; padding: 4px 6px; text-align: center; font-weight: bold; width: 12%;">Sai</th>
          </tr>
        </thead>
        <tbody>
          ${items
            .map((item, itemIdx) => {
              const isCorrect = item.isCorrect === true;
              const dungMark = options.includeAnswers && isCorrect ? '<strong>X</strong>' : '';
              const saiMark = options.includeAnswers && !isCorrect ? '<strong>X</strong>' : '';
              const labelKey = (item.key || String.fromCharCode(97 + itemIdx)).toLowerCase().replace(/[\)\.\:]/g, '');
              return `
            <tr>
              <td style="border: 1pt solid #000; padding: 4px 6px; text-align: center; font-weight: bold; width: 6%;">${labelKey})</td>
              <td style="border: 1pt solid #000; padding: 4px 8px; text-align: left; width: 70%;">${cleanMathForDoc(cleanOpt(item.text))}</td>
              <td style="border: 1pt solid #000; padding: 4px 6px; text-align: center; width: 12%; font-size: 13pt;">${dungMark}</td>
              <td style="border: 1pt solid #000; padding: 4px 6px; text-align: center; width: 12%; font-size: 13pt;">${saiMark}</td>
            </tr>
          `;
            })
            .join('')}
        </tbody>
      </table>
      `;
    } else if (normType === 'short_answer') {
      htmlContent += `
      <div style="font-style: italic; margin-top: 6px; margin-bottom: 12px; font-size: 12pt;">
        Đáp số: ..........................................................................................................................................
      </div>
      `;
    } else if (normType === 'essay') {
      htmlContent += `
      <div style="font-style: italic; color: #666; margin-top: 4px; font-size: 11pt;">
        (Thí sinh trình bày bài làm chi tiết bên dưới)
      </div>
      <div style="color: #bbb; line-height: 2.2; margin-top: 6px;">
        ..................................................................................................................................................................................<br/>
        ..................................................................................................................................................................................<br/>
        ..................................................................................................................................................................................
      </div>
      `;
    } else {
      const optA = cleanMathForDoc(getExamOptionText(q, 'A', 0));
      const optB = cleanMathForDoc(getExamOptionText(q, 'B', 1));
      const optC = cleanMathForDoc(getExamOptionText(q, 'C', 2));
      const optD = cleanMathForDoc(getExamOptionText(q, 'D', 3));

      const layout = getOptionsLayout([
        { text: optA },
        { text: optB },
        { text: optC },
        { text: optD },
      ]);

      if (layout === 4) {
        htmlContent += `
        <table class="options-grid">
          <tr>
            <td style="width: 25%"><strong>A.</strong> ${cleanOpt(optA)}</td>
            <td style="width: 25%"><strong>B.</strong> ${cleanOpt(optB)}</td>
            <td style="width: 25%"><strong>C.</strong> ${cleanOpt(optC)}</td>
            <td style="width: 25%"><strong>D.</strong> ${cleanOpt(optD)}</td>
          </tr>
        </table>
        `;
      } else if (layout === 2) {
        htmlContent += `
        <table class="options-grid">
          <tr>
            <td style="width: 50%"><strong>A.</strong> ${cleanOpt(optA)}</td>
            <td style="width: 50%"><strong>B.</strong> ${cleanOpt(optB)}</td>
          </tr>
          <tr>
            <td style="width: 50%"><strong>C.</strong> ${cleanOpt(optC)}</td>
            <td style="width: 50%"><strong>D.</strong> ${cleanOpt(optD)}</td>
          </tr>
        </table>
        `;
      } else {
        htmlContent += `
        <table class="options-grid">
          <tr><td style="width: 100%"><strong>A.</strong> ${cleanOpt(optA)}</td></tr>
          <tr><td style="width: 100%"><strong>B.</strong> ${cleanOpt(optB)}</td></tr>
          <tr><td style="width: 100%"><strong>C.</strong> ${cleanOpt(optC)}</td></tr>
          <tr><td style="width: 100%"><strong>D.</strong> ${cleanOpt(optD)}</td></tr>
        </table>
        `;
      }
    }

    htmlContent += `</div>`;
  });

  htmlContent += `
    <div class="footer-divider">- HẾT -</div>
    <div class="proctor-notes">
      <div>- Thí sinh không được sử dụng tài liệu và máy tính không đúng quy định.</div>
      <div>- Cán bộ coi thi không giải thích gì thêm.</div>
    </div>
  `;

  if (options.includeAnswers) {
    htmlContent += `
    <div class="answer-key">
      <h2 style="text-align: center; text-transform: uppercase;">BẢNG ĐÁP ÁN & HƯỚNG DẪN CHẤM CHI TIẾT</h2>
      <table class="ans-table">
        <tr>
    `;

    questions.forEach((q, idx) => {
      if (idx > 0 && idx % 10 === 0) {
        htmlContent += `</tr><tr>`;
      }
      htmlContent += `<td><strong>${idx + 1}</strong>: <span style="color: #008800; font-weight: bold;">${cleanMathForDoc(q.correctAnswer || '')}</span></td>`;
    });

    htmlContent += `
        </tr>
      </table>

      <h3>HƯỚNG DẪN GIẢI CHI TIẾT:</h3>
    `;

    questions.forEach((q, idx) => {
      htmlContent += `
      <div class="solution-item">
        <strong>Câu ${idx + 1} (Đáp án ${cleanMathForDoc(q.correctAnswer || '')}):</strong> <em>${cleanMathForDoc(q.explanation || 'Xem định nghĩa SGK.')}</em>
      </div>
      `;
    });

    htmlContent += `</div>`;
  }

  htmlContent += `
  <div style='mso-element:footer' id='f1'>
    <p style='text-align: right; font-size: 10pt; font-style: italic; font-family: "Times New Roman", serif; margin: 0;'>
      Trang <!--[if supportFields]><span style='mso-element:field-begin'></span>PAGE<span style='mso-element:field-separator'></span><![endif]--><span style='mso-no-proof:yes'>1</span><!--[if supportFields]><span style='mso-element:field-end'></span><![endif]--> / <!--[if supportFields]><span style='mso-element:field-begin'></span>NUMPAGES<span style='mso-element:field-separator'></span><![endif]--><span style='mso-no-proof:yes'>1</span><!--[if supportFields]><span style='mso-element:field-end'></span><![endif]-->
    </p>
  </div>
</div>
</body>
</html>
  `;

  return htmlContent;
}

/**
 * Export exam to Word HTML (.doc) format - matching Vietnamese Official Exam standard
 */
export function exportExamToDoc(
  exam: ExamItem,
  options: ExportExamOptions = { includeAnswers: true }
) {
  const htmlContent = generateDocHtml(exam, options);
  const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword;charset=utf-8' });
  const safeTitle = (exam.title || 'De_thi_Examify')
    .replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9]/g, '_')
    .replace(/_+/g, '_');
  downloadBlob(blob, `${safeTitle}.doc`);
}

/**
 * Generates LaTeX (.tex) string for Overleaf / TeXStudio
 */
export function generateLatexString(
  exam: ExamItem,
  options: ExportExamOptions = { includeAnswers: true }
): string {
  const questions: ExamQuestion[] = exam.questions || [];
  const department = (options.departmentName || exam.department || 'SỞ GIÁO DỤC VÀ ĐÀO TẠO').trim();
  const school = (options.schoolName || exam.schoolName || 'TRƯỜNG THPT CHUYÊN CHẤT LƯỢNG CAO').trim();
  const session = (options.sessionTitle || exam.sessionTitle || exam.term || 'KỲ THI KIỂM TRA ĐÁNH GIÁ CHẤT LƯỢNG').trim();
  const year = (options.academicYear || exam.academicYear || (exam.year ? (exam.year.startsWith('NĂM') ? exam.year : `NĂM HỌC ${exam.year}`) : 'NĂM HỌC 2024 – 2025')).trim();

  let latex = `% ==============================================================================\n`;
  latex += `% Examify AI - Đề thi: ${exam.title}\n`;
  latex += `% Môn: ${exam.subject} - Khối: ${exam.grade}\n`;
  latex += `% Thời gian: ${exam.duration} phút - Mã đề: ${exam.id}\n`;
  latex += `% ==============================================================================\n\n`;
  latex += `\\documentclass[12pt,a4paper]{article}\n`;
  latex += `\\usepackage[utf8]{inputenc}\n`;
  latex += `\\usepackage[vietnamese]{babel}\n`;
  latex += `\\usepackage{amsmath,amssymb,amsfonts}\n`;
  latex += `\\usepackage{geometry}\n`;
  latex += `\\geometry{a4paper, margin=20mm}\n`;
  latex += `\\usepackage{enumitem}\n\n`;
  latex += `\\begin{document}\n\n`;

  // Header Box
  latex += `\\noindent\n`;
  latex += `\\begin{minipage}[t]{0.45\\textwidth}\n`;
  latex += `\\centering\n`;
  latex += `\\textbf{${department.toUpperCase()}}\\\\\n`;
  latex += `\\textbf{${school.toUpperCase()}}\\\\[0.5em]\n`;
  latex += `\\framebox[\\width]{\\textbf{ĐỀ CHÍNH THỨC}}\n`;
  latex += `\\end{minipage}\n`;
  latex += `\\hfill\n`;
  latex += `\\begin{minipage}[t]{0.5\\textwidth}\n`;
  latex += `\\centering\n`;
  latex += `\\textbf{${session.toUpperCase()}}\\\\\n`;
  latex += `\\textbf{${year.toUpperCase()}}\\\\\n`;
  latex += `\\textbf{Môn: ${exam.subject.toUpperCase()} (${exam.grade.toUpperCase()})}\\\\[0.3em]\n`;
  latex += `\\textit{Thời gian làm bài: ${exam.duration} phút (không kể giao đề)}\n`;
  latex += `\\end{minipage}\n\n`;

  const shortCode = formatExamCode(exam.id, exam.code);

  latex += `\\vspace{0.6em}\n`;
  latex += `\\noindent\\textit{(Đề thi có ${questions.length} câu)}\\hfill\\fbox{\\textbf{Mã đề thi: ${shortCode}}}\\\\[0.8em]\n`;
  latex += `\\noindent\\rule{\\textwidth}{0.8pt}\\\\[0.4em]\n`;
  latex += `\\noindent\\textbf{Họ và tên thí sinh:} \\dotfill \\textbf{SBD:} \\dotfill\\\\[1.2em]\n\n`;

  // Questions with Sections
  let currentSectionKey = '';
  questions.forEach((q, idx) => {
    const normType = normalizeQuestionType(q.type);
    const sectionKey = q.section || normType;
    if (sectionKey !== currentSectionKey) {
      currentSectionKey = sectionKey;
      const customTitles = options.sectionTitles || exam.sectionTitles || {};
      const customDescs = options.sectionDescriptions || exam.sectionDescriptions || {};
      const titleText = customTitles[sectionKey] || q.section || DEFAULT_SECTION_TITLES[normType] || `PHẦN ${sectionKey.toUpperCase()}`;
      const descText = customDescs[sectionKey] !== undefined ? customDescs[sectionKey] : (DEFAULT_SECTION_DESCRIPTIONS[normType] || '');

      latex += `\\vspace{1em}\n`;
      latex += `\\noindent\\textbf{${titleText.toUpperCase()}}\\\\[0.2em]\n`;
      if (descText) {
        latex += `\\noindent\\textit{${descText}}\\\\[0.6em]\n`;
      }
    }

    const qType = (q.type || 'multiple_choice').toLowerCase().replace('_', '');

    latex += `% --- Câu ${idx + 1} ---\n`;
    latex += `\\noindent \\textbf{Câu ${idx + 1}:} ${q.content}\\\\[0.2em]\n`;

    if (normType === 'true_false') {
      const items = (q.options || []).length > 0 ? q.options : [
        { key: 'a', text: 'Mệnh đề a', isCorrect: true },
        { key: 'b', text: 'Mệnh đề b', isCorrect: false },
        { key: 'c', text: 'Mệnh đề c', isCorrect: true },
        { key: 'd', text: 'Mệnh đề d', isCorrect: false },
      ];

      latex += `\\begin{center}\n`;
      latex += `\\begin{tabular}{|c|p{12.2cm}|c|c|}\n`;
      latex += `\\hline\n`;
      latex += `\\multicolumn{2}{|c|}{\\textbf{Mệnh đề}} & \\textbf{Đúng} & \\textbf{Sai} \\\\ \\hline\n`;
      items.forEach((item, itemIdx) => {
        const isCorrect = item.isCorrect === true;
        const dungMark = options.includeAnswers && isCorrect ? '\\textbf{X}' : '';
        const saiMark = options.includeAnswers && !isCorrect ? '\\textbf{X}' : '';
        const labelKey = (item.key || String.fromCharCode(97 + itemIdx)).toLowerCase().replace(/[\)\.\:]/g, '');
        latex += `${labelKey}) & ${cleanOpt(item.text)} & ${dungMark} & ${saiMark} \\\\ \\hline\n`;
      });
      latex += `\\end{tabular}\n`;
      latex += `\\end{center}\\vspace{0.4em}\n\n`;
    } else if (normType === 'short_answer') {
      latex += `\\noindent \\textbf{Đáp số:} \\dotfill\\\\[0.6em]\n\n`;
    } else if (normType === 'essay') {
      latex += `\\noindent \\textit{(Thí sinh trình bày bài làm chi tiết bên dưới)}\\\\[1.2em]\n\n`;
    } else {
      const optA = getExamOptionText(q, 'A', 0);
      const optB = getExamOptionText(q, 'B', 1);
      const optC = getExamOptionText(q, 'C', 2);
      const optD = getExamOptionText(q, 'D', 3);

      const layout = getOptionsLayout([
        { text: optA },
        { text: optB },
        { text: optC },
        { text: optD },
      ]);

      if (layout === 4) {
        latex += `\\noindent\\begin{tabular*}{\\textwidth}{@{\\extracolsep{\\fill}}p{0.24\\textwidth}p{0.24\\textwidth}p{0.24\\textwidth}p{0.24\\textwidth}}\n`;
        latex += `\\textbf{A.} ${cleanOpt(optA)} & \\textbf{B.} ${cleanOpt(optB)} & \\textbf{C.} ${cleanOpt(optC)} & \\textbf{D.} ${cleanOpt(optD)}\n`;
        latex += `\\end{tabular*}\\\\[0.3em]\n\n`;
      } else if (layout === 2) {
        latex += `\\noindent\\begin{tabular*}{\\textwidth}{@{\\extracolsep{\\fill}}p{0.48\\textwidth}p{0.48\\textwidth}}\n`;
        latex += `\\textbf{A.} ${cleanOpt(optA)} & \\textbf{B.} ${cleanOpt(optB)} \\\\\n`;
        latex += `\\textbf{C.} ${cleanOpt(optC)} & \\textbf{D.} ${cleanOpt(optD)}\n`;
        latex += `\\end{tabular*}\\\\[0.3em]\n\n`;
      } else {
        latex += `\\noindent \\textbf{A.} ${cleanOpt(optA)}\\\\\n`;
        latex += `\\noindent \\textbf{B.} ${cleanOpt(optB)}\\\\\n`;
        latex += `\\noindent \\textbf{C.} ${cleanOpt(optC)}\\\\\n`;
        latex += `\\noindent \\textbf{D.} ${cleanOpt(optD)}\\\\[0.3em]\n\n`;
      }
    }
  });

  latex += `\\begin{center}\n\\textbf{--- HẾT ---}\n\\end{center}\n`;
  latex += `\\noindent\\textit{- Thí sinh không được sử dụng tài liệu và máy tính không đúng quy định.}\\\\\n`;
  latex += `\\noindent\\textit{- Cán bộ coi thi không giải thích gì thêm.}\n\n`;

  // Answer Keys & Explanations
  if (options.includeAnswers) {
    latex += `\\newpage\n`;
    latex += `\\begin{center}\n`;
    latex += `{\\Large \\textbf{BẢNG ĐÁP ÁN & HƯỚNG DẪN CHẤM CHI TIẾT}}\n`;
    latex += `\\end{center}\n\\vspace{1em}\n\n`;

    latex += `\\noindent\\textbf{BẢNG ĐÁP ÁN:}\\\\[0.5em]\n`;
    latex += `\\begin{center}\n`;
    latex += `\\begin{tabular}{|` + Array(Math.min(10, questions.length)).fill('c').join('|') + `|}\n`;
    latex += `\\hline\n`;

    const cols = 10;
    const totalRows = Math.ceil(questions.length / cols);
    for (let r = 0; r < totalRows; r++) {
      // Question headers
      const qNums = [];
      const answers = [];
      for (let c = 0; c < cols; c++) {
        const qIdx = r * cols + c;
        if (qIdx < questions.length) {
          qNums.push(`\\textbf{${qIdx + 1}}`);
          answers.push(`\\textbf{${questions[qIdx].correctAnswer}}`);
        }
      }
      latex += qNums.join(' & ') + ' \\\\\\hline\n';
      latex += answers.join(' & ') + ' \\\\\\hline\n';
    }
    latex += `\\end{tabular}\n`;
    latex += `\\end{center}\n\\vspace{1.5em}\n\n`;

    latex += `\\noindent\\textbf{HƯỚNG DẪN GIẢI CHI TIẾT:}\\\\[0.5em]\n`;
    questions.forEach((q, idx) => {
      latex += `\\noindent\\textbf{Câu ${idx + 1} (Đáp án ${q.correctAnswer}):} \\textit{${q.explanation || 'Xem định nghĩa SGK.'}}\\\\[0.6em]\n`;
    });
  }

  latex += `\n\\end{document}\n`;
  return latex;
}

/**
 * Export exam to LaTeX (.tex) format
 */
export function exportExamToLatex(
  exam: ExamItem,
  options: ExportExamOptions = { includeAnswers: true }
) {
  const latexStr = generateLatexString(exam, options);
  const blob = new Blob([latexStr], { type: 'text/plain;charset=utf-8' });
  const safeTitle = (exam.title || 'De_thi_Examify')
    .replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9]/g, '_')
    .replace(/_+/g, '_');
  downloadBlob(blob, `${safeTitle}.tex`);
}

/**
 * Generates JSON string
 */
export function generateJsonString(exam: ExamItem): string {
  return JSON.stringify(exam, null, 2);
}

/**
 * Export exam as clean JSON for LMS/Moodle import
 */
export function exportExamToJson(exam: ExamItem) {
  const jsonStr = generateJsonString(exam);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  const safeTitle = (exam.title || 'De_thi_Examify')
    .replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9]/g, '_')
    .replace(/_+/g, '_');
  downloadBlob(blob, `${safeTitle}.json`);
}

/**
 * Tải thư viện html2pdf.js từ local public bundle
 */
function loadHtml2PdfScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if ((window as any).html2pdf) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src*="html2pdf.bundle.min.js"]');
    if (existing) {
      if ((window as any).html2pdf) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', (err) => reject(err));
      return;
    }
    const script = document.createElement('script');
    script.src = '/html2pdf.bundle.min.js?v=20260918';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = (err) => reject(err);
    document.head.appendChild(script);
  });
}

/**
 * Tạo nội dung HTML thuần chuẩn A4 dành riêng cho xuất PDF trực tiếp (không dính XML của Word)
 */
export function generatePdfHtml(
  exam: ExamItem,
  options: ExportExamOptions = { includeAnswers: true }
): string {
  const questions: ExamQuestion[] = exam.questions || [];
  const department = normalizeDepartmentAccents((options.departmentName || exam.department || 'SỞ GIÁO DỤC VÀ ĐÀO TẠO THÀNH PHỐ HẢI PHÒNG').trim());
  const rawSchool = (options.schoolName || exam.schoolName || '').trim();
  const school = (!rawSchool || rawSchool === 'HẢ' ? 'TRƯỜNG THPT CHUYÊN TRẦN PHÚ' : rawSchool);
  const session = (options.sessionTitle || exam.sessionTitle || exam.term || 'KỲ THI KIỂM TRA ĐÁNH GIÁ CHẤT LƯỢNG').trim();
  const year = (options.academicYear || exam.academicYear || (exam.year ? (exam.year.startsWith('NĂM') ? exam.year : `NĂM HỌC ${exam.year}`) : 'NĂM HỌC 2024 – 2025')).trim();
  const shortCode = formatExamCode(exam.id, exam.code) || '101';

  let html = `
  <div style="font-family: 'Times New Roman', Times, 'Liberation Serif', serif; font-size: 12pt; line-height: 1.35; color: #000000; background: #ffffff; width: 100%; box-sizing: border-box; margin: 0; padding: 0;">
    <!-- 1. Header Table -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 6px;">
      <tr>
        <td style="width: 45%; vertical-align: top; text-align: center; padding: 0;">
          <div style="font-weight: bold; font-size: 11pt; line-height: 1.2;">${department.toUpperCase()}</div>
          <div style="font-weight: bold; font-size: 12pt; margin-top: 3px; line-height: 1.2;">${school.toUpperCase()}</div>
          <div style="display: inline-block; border: 1.5pt solid #000; padding: 2px 14px; font-weight: bold; font-size: 10.5pt; margin-top: 6px;">
            ĐỀ CHÍNH THỨC
          </div>
        </td>
        <td style="width: 55%; vertical-align: top; text-align: center; padding: 0;">
          <div style="font-weight: bold; font-size: 11.5pt; line-height: 1.2;">${session.toUpperCase()}</div>
          <div style="font-weight: bold; font-size: 11.5pt; margin-top: 2px; line-height: 1.2;">${year.toUpperCase()}</div>
          <div style="font-weight: bold; font-size: 11.5pt; margin-top: 3px;">Môn thi: ${exam.subject.toUpperCase()} (${exam.grade.toUpperCase()})</div>
          <div style="font-style: italic; font-size: 10.5pt; margin-top: 2px;">Thời gian làm bài: ${exam.duration} phút (không kể thời gian giao đề)</div>
        </td>
      </tr>
    </table>

    <!-- 2. Sub-Header (Question count & Exam Code Box) -->
    <table style="width: 100%; border-collapse: collapse; margin: 6px 0;">
      <tr>
        <td style="vertical-align: middle; font-style: italic; font-size: 10.5pt; border: none; padding: 0;">
          (Đề thi gồm ${questions.length} câu)
        </td>
        <td style="text-align: right; vertical-align: middle; border: none; padding: 0;">
          <div style="display: inline-block; border: 1.5pt solid #000; padding: 2px 12px; font-weight: bold; font-size: 11pt;">
            Mã đề thi ${shortCode}
          </div>
        </td>
      </tr>
    </table>

    <!-- 3. Student Info -->
    <div style="border-top: 1px dashed #666; padding-top: 5px; margin-bottom: 12px; font-size: 10.5pt;">
      Họ và tên thí sinh: ............................................................................................ Số báo danh: .....................
    </div>

    <!-- 4. Section Header: CÂU HỎI -->
    <div style="text-align: center; font-weight: bold; color: #dc2626; font-size: 13pt; margin: 8px 0; text-transform: uppercase;">
      CÂU HỎI
    </div>
  `;

  let currentSectionKey = '';
  questions.forEach((q, idx) => {
    const normType = normalizeQuestionType(q.type);
    const sectionKey = q.section || normType;
    if (sectionKey !== currentSectionKey) {
      currentSectionKey = sectionKey;
      const customTitles = options.sectionTitles || exam.sectionTitles || {};
      const customDescs = options.sectionDescriptions || exam.sectionDescriptions || {};
      const titleText = customTitles[sectionKey] || q.section || DEFAULT_SECTION_TITLES[normType] || `PHẦN ${sectionKey.toUpperCase()}`;
      const descText = customDescs[sectionKey] !== undefined ? customDescs[sectionKey] : (DEFAULT_SECTION_DESCRIPTIONS[normType] || '');

      html += `
      <div style="margin-top: 14px; margin-bottom: 8px; border-bottom: 1.5pt solid #000; padding-bottom: 3px; page-break-after: avoid; break-after: avoid;">
        <div style="font-weight: bold; font-size: 11.5pt; text-transform: uppercase;">
          ${titleText}
        </div>
        ${descText ? `<div style="font-style: italic; font-size: 10pt; color: #333; margin-top: 1px;">${descText}</div>` : ''}
      </div>
      `;
    }

    html += `
    <div style="margin-bottom: 10px; page-break-inside: avoid; break-inside: avoid;">
      <div style="font-size: 11.5pt; margin-bottom: 4px; text-align: justify;">
        <strong style="color: #1d4ed8;">Câu ${idx + 1}.</strong> ${cleanMathForDoc(q.content)}
      </div>
    `;

    if (normType === 'true_false') {
      const items = (q.options || []).length > 0 ? q.options : [
        { key: 'a', text: 'Mệnh đề a', isCorrect: true },
        { key: 'b', text: 'Mệnh đề b', isCorrect: false },
        { key: 'c', text: 'Mệnh đề c', isCorrect: true },
        { key: 'd', text: 'Mệnh đề d', isCorrect: false },
      ];

      html += `
      <table style="width: 100%; border-collapse: collapse; border: 1.2pt solid #000; margin-top: 4px; margin-bottom: 6px;">
        <thead>
          <tr style="background-color: #f8fafc;">
            <th colspan="2" style="border: 1pt solid #000; padding: 3px 6px; text-align: center; font-weight: bold; width: 76%; font-size: 10.5pt;">Mệnh đề</th>
            <th style="border: 1pt solid #000; padding: 3px 6px; text-align: center; font-weight: bold; width: 12%; font-size: 10.5pt;">Đúng</th>
            <th style="border: 1pt solid #000; padding: 3px 6px; text-align: center; font-weight: bold; width: 12%; font-size: 10.5pt;">Sai</th>
          </tr>
        </thead>
        <tbody>
      `;

      items.forEach((item, itemIdx) => {
        const isCorrect = item.isCorrect === true;
        const dungMark = options.includeAnswers && isCorrect ? '<strong>X</strong>' : '';
        const saiMark = options.includeAnswers && !isCorrect ? '<strong>X</strong>' : '';
        const labelKey = (item.key || String.fromCharCode(97 + itemIdx)).toLowerCase().replace(/[\)\.\:]/g, '');

        html += `
          <tr>
            <td style="border: 1pt solid #000; padding: 3px 6px; text-align: center; font-weight: bold; width: 6%; font-size: 10.5pt;">${labelKey})</td>
            <td style="border: 1pt solid #000; padding: 3px 8px; text-align: left; width: 70%; font-size: 11pt;">${cleanMathForDoc(cleanOpt(item.text))}</td>
            <td style="border: 1pt solid #000; padding: 3px 6px; text-align: center; width: 12%; font-size: 12pt;">${dungMark}</td>
            <td style="border: 1pt solid #000; padding: 3px 6px; text-align: center; width: 12%; font-size: 12pt;">${saiMark}</td>
          </tr>
        `;
      });

      html += `
        </tbody>
      </table>
      `;
    } else if (normType === 'short_answer') {
      html += `
      <div style="font-style: italic; margin-top: 4px; margin-bottom: 8px; font-size: 11pt;">
        Đáp số: ..........................................................................................................................................
      </div>
      `;
    } else if (normType === 'essay') {
      html += `
      <div style="font-style: italic; color: #666; margin-top: 3px; font-size: 10.5pt;">
        (Thí sinh trình bày bài làm chi tiết bên dưới)
      </div>
      <div style="color: #999; line-height: 2.2; margin-top: 4px;">
        ..................................................................................................................................................................................<br/>
        ..................................................................................................................................................................................<br/>
        ..................................................................................................................................................................................
      </div>
      `;
    } else {
      const optA = cleanMathForDoc(getExamOptionText(q, 'A', 0));
      const optB = cleanMathForDoc(getExamOptionText(q, 'B', 1));
      const optC = cleanMathForDoc(getExamOptionText(q, 'C', 2));
      const optD = cleanMathForDoc(getExamOptionText(q, 'D', 3));

      const layout = getOptionsLayout([
        { text: optA },
        { text: optB },
        { text: optC },
        { text: optD },
      ]);

      if (layout === 4) {
        html += `
        <table style="width: 100%; border-collapse: collapse; margin-top: 3px; margin-bottom: 5px;">
          <tr>
            <td style="width: 25%; vertical-align: top; padding: 2px 4px; font-size: 11pt; border: none;"><strong>A.</strong> ${cleanOpt(optA)}</td>
            <td style="width: 25%; vertical-align: top; padding: 2px 4px; font-size: 11pt; border: none;"><strong>B.</strong> ${cleanOpt(optB)}</td>
            <td style="width: 25%; vertical-align: top; padding: 2px 4px; font-size: 11pt; border: none;"><strong>C.</strong> ${cleanOpt(optC)}</td>
            <td style="width: 25%; vertical-align: top; padding: 2px 4px; font-size: 11pt; border: none;"><strong>D.</strong> ${cleanOpt(optD)}</td>
          </tr>
        </table>
        `;
      } else if (layout === 2) {
        html += `
        <table style="width: 100%; border-collapse: collapse; margin-top: 3px; margin-bottom: 5px;">
          <tr>
            <td style="width: 50%; vertical-align: top; padding: 2px 4px; font-size: 11pt; border: none;"><strong>A.</strong> ${cleanOpt(optA)}</td>
            <td style="width: 50%; vertical-align: top; padding: 2px 4px; font-size: 11pt; border: none;"><strong>B.</strong> ${cleanOpt(optB)}</td>
          </tr>
          <tr>
            <td style="width: 50%; vertical-align: top; padding: 2px 4px; font-size: 11pt; border: none;"><strong>C.</strong> ${cleanOpt(optC)}</td>
            <td style="width: 50%; vertical-align: top; padding: 2px 4px; font-size: 11pt; border: none;"><strong>D.</strong> ${cleanOpt(optD)}</td>
          </tr>
        </table>
        `;
      } else {
        html += `
        <div style="margin-top: 2px; margin-bottom: 5px; font-size: 11pt; padding-left: 8px;">
          <div style="margin-bottom: 2px;"><strong>A.</strong> ${cleanOpt(optA)}</div>
          <div style="margin-bottom: 2px;"><strong>B.</strong> ${cleanOpt(optB)}</div>
          <div style="margin-bottom: 2px;"><strong>C.</strong> ${cleanOpt(optC)}</div>
          <div style="margin-bottom: 2px;"><strong>D.</strong> ${cleanOpt(optD)}</div>
        </div>
        `;
      }
    }

    html += `</div>`;
  });

  // Footer notes
  html += `
    <div style="text-align: center; font-weight: bold; font-size: 11.5pt; margin: 20px 0 8px 0;">
      - HẾT -
    </div>
    <div style="font-style: italic; font-size: 10pt; text-align: center; color: #444; margin-bottom: 16px;">
      (Thí sinh không được sử dụng tài liệu và máy tính không đúng quy định. Cán bộ coi thi không giải thích gì thêm.)
    </div>
  `;

  // Optional Answer Key & Solutions
  if (options.includeAnswers) {
    html += `
    <div style="page-break-before: always; break-before: page; margin-top: 24px; border-top: 2pt solid #000; padding-top: 14px;">
      <h3 style="text-align: center; font-size: 12.5pt; font-weight: bold; margin-bottom: 10px; text-transform: uppercase;">
        BẢNG ĐÁP ÁN &amp; HƯỚNG DẪN CHẤM CHI TIẾT
      </h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 14px;">
        <tr>
    `;

    const tableCols = 5;
    questions.forEach((q, idx) => {
      let ansText = cleanMathForDoc(q.correctAnswer || '');
      const normType = normalizeQuestionType(q.type);
      if (normType === 'true_false') {
        const tfParts = (q.options || []).map((o, oIdx) => {
          const lk = (o.key || String.fromCharCode(97 + oIdx)).toLowerCase().replace(/[\)\.\:]/g, '');
          return `${lk}: ${o.isCorrect ? 'Đ' : 'S'}`;
        });
        ansText = tfParts.join(', ');
      } else if (normType === 'essay') {
        ansText = 'Xem chi tiết';
      }

      html += `
        <td style="border: 1pt solid #333; padding: 4px; text-align: center; font-size: 10pt; width: 20%;">
          <strong>Câu ${idx + 1}:</strong> <span style="font-weight: bold; color: #047857;">${ansText || '—'}</span>
        </td>
      `;

      if ((idx + 1) % tableCols === 0 && idx + 1 < questions.length) {
        html += `</tr><tr>`;
      }
    });

    const rem = questions.length % tableCols;
    if (rem > 0) {
      for (let pad = 0; pad < tableCols - rem; pad++) {
        html += `<td style="border: 1pt solid #333; padding: 4px; width: 20%;">&nbsp;</td>`;
      }
    }

    html += `
        </tr>
      </table>

      <h4 style="font-size: 11pt; font-weight: bold; margin-bottom: 6px;">HƯỚNG DẪN GIẢI CHI TIẾT:</h4>
    `;

    questions.forEach((q, idx) => {
      html += `
      <div style="margin-bottom: 8px; font-size: 10.5pt;">
        <strong>Câu ${idx + 1} (Đáp án ${cleanMathForDoc(q.correctAnswer || '')}):</strong>
        <em>${cleanMathForDoc(q.explanation || 'Xem lý thuyết sách giáo khoa.')}</em>
      </div>
      `;
    });

    html += `</div>`;
  }

  html += `</div>`;
  return html;
}

/**
 * Tải file đề thi dưới dạng file PDF (.pdf) trực tiếp về máy tính (không qua hộp thoại in)
 */
export async function exportExamToPdf(
  exam: ExamItem,
  options: ExportExamOptions = { includeAnswers: true }
): Promise<void> {
  if (typeof window === 'undefined') return;

  const safeTitle = (exam.title || 'De_thi_Examify')
    .replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9]/g, '_')
    .replace(/_+/g, '_');

  await loadHtml2PdfScript();

  if (typeof (window as any).html2pdf === 'function') {
    const htmlString = generatePdfHtml(exam, options);

    // 1. Chờ font hệ thống / Google Fonts tải xong
    if (document.fonts && document.fonts.ready) {
      try {
        await document.fonts.ready;
      } catch {
        // Bỏ qua nếu trình duyệt không hỗ trợ document.fonts
      }
    }

    // 2. Tiền tải toàn bộ ảnh (nếu có trong đề thi)
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlString;
    const imgElements = Array.from(tempDiv.querySelectorAll('img'));
    if (imgElements.length > 0) {
      await Promise.all(
        imgElements.map((img) => {
          if (img.complete) return Promise.resolve(true);
          return new Promise((res) => {
            const i = new Image();
            i.crossOrigin = 'anonymous';
            i.onload = () => res(true);
            i.onerror = () => res(true);
            i.src = img.src;
          });
        })
      );
    }

    const opt = {
      margin: 10, // 10mm tiêu chuẩn lề A4
      filename: `${safeTitle}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    };

    try {
      // html2pdf tự động dựng div in-flow chuẩn khổ A4, không bị lỗi fixed làm co chiều cao về 0
      await (window as any).html2pdf().set(opt).from(htmlString).save();
      return;
    } catch (err) {
      console.error('Lỗi khi xuất PDF qua html2pdf:', err);
      // Fallback nếu có lỗi: Tải file Word (.doc)
      exportExamToDoc(exam, options);
    }
    return;
  }

  // Fallback nếu môi trường không load được html2pdf: Tải file Word (.doc)
  exportExamToDoc(exam, options);
}

/**
 * Export all exam formats bundled in a single .zip file
 */
export async function exportExamToZipAll(
  exam: ExamItem,
  options: ExportExamOptions = { includeAnswers: true }
) {
  const zip = new JSZip();
  const safeTitle = (exam.title || 'De_thi_Examify')
    .replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9]/g, '_')
    .replace(/_+/g, '_');

  // 1. Generate Docx Blob
  const docxBlob = await generateDocxBlob(exam, options);
  zip.file(`${safeTitle}.docx`, docxBlob);

  // 2. Generate Doc HTML String
  const docHtml = generateDocHtml(exam, options);
  zip.file(`${safeTitle}.doc`, '\ufeff' + docHtml);

  // 3. Generate LaTeX String
  const latexStr = generateLatexString(exam, options);
  zip.file(`${safeTitle}.tex`, latexStr);

  // 4. Generate JSON String
  const jsonStr = generateJsonString(exam);
  zip.file(`${safeTitle}.json`, jsonStr);

  const department = (options.departmentName || exam.department || 'SỞ GIÁO DỤC VÀ ĐÀO TẠO').trim();
  const school = (options.schoolName || exam.schoolName || 'TRƯỜNG THPT CHUYÊN CHẤT LƯỢNG CAO').trim();
  const session = (options.sessionTitle || exam.sessionTitle || exam.term || 'KỲ THI KIỂM TRA ĐÁNH GIÁ CHẤT LƯỢNG').trim();
  const year = (options.academicYear || exam.academicYear || (exam.year ? (exam.year.startsWith('NĂM') ? exam.year : `NĂM HỌC ${exam.year}`) : 'NĂM HỌC 2024 – 2025')).trim();

  // 5. Generate README / Instructions
  const readmeContent = `================================================================================
EXAMIFY AI - TRỌN BỘ HỒ SƠ ĐỀ THI VÀ ĐÁP ÁN CHUẨN BỘ GD&ĐT
================================================================================
Tên đề thi  : ${exam.title}
Kỳ thi / Đợt: ${session}
Năm học     : ${year}
Môn học     : ${exam.subject} (${exam.grade})
Mã đề thi   : ${formatExamCode(exam.id, exam.code)}
Thời gian   : ${exam.duration} phút
Số lượng câu: ${exam.questions?.length || 0} câu trắc nghiệm
Cơ quan q/lý: ${department}
Trường / ĐV : ${school}
Ngày xuất   : ${new Date().toLocaleDateString('vi-VN')}
================================================================================

DANH MỤC CÁC TỆP TIN TRONG GÓI:
1. [${safeTitle}.docx]
   - Định dạng Microsoft Word (.docx) chuẩn hiện đại.
   - Trình bày bảng 2x2 cho 4 phương án, có tiêu đề Sở/Trường, khung Đề chính thức, bảng ma trận đáp án và lời giải chi tiết.

2. [${safeTitle}.doc]
   - Định dạng Word HTML tương thích tuyệt đối với mọi phiên bản MS Word, WPS Office, LibreOffice.

3. [${safeTitle}.tex]
   - Mã nguồn LaTeX chuẩn cho giáo viên Toán, Lý, Hóa.
   - Sẵn sàng biên dịch trên Overleaf hoặc TeXStudio.

4. [${safeTitle}.json]
   - Cấu trúc dữ liệu số hóa tương thích hệ thống quản lý học tập (LMS), Moodle, Google Forms.

5. HƯỚNG DẪN IN HOẶC LƯU PDF:
   - Truy cập giao diện Examify -> Chọn "In / Xuất PDF (.pdf)" -> Chọn máy in "Lưu dưới dạng PDF" (Save as PDF) với khổ giấy A4 để có bản in chuẩn Bộ GD&ĐT đẹp nhất.

Chúc Quý Thầy/Cô và các em học sinh có kỳ thi thành công rực rỡ!
--------------------------------------------------------------------------------
Examify AI - Nền tảng biên soạn & quản trị đề thi chuẩn quốc gia.
`;
  zip.file('HUONG_DAN_SU_DUNG.txt', readmeContent);

  // Generate zip file and trigger download
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(zipBlob, `${safeTitle}_TronBoDeThi.zip`);
}
