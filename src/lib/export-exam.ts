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
} from 'docx';
import { ExamItem, ExamQuestion } from '@/lib/store/app-store';

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

function cleanOpt(text: string): string {
  return text ? text.replace(/^[A-D\d]+[\.\:\)\-\s]+/i, '').trim() : '';
}

/**
 * Export exam to standard Microsoft Word .docx format
 */
export async function exportExamToDocx(
  exam: ExamItem,
  options: { includeAnswers?: boolean; schoolName?: string } = { includeAnswers: true }
) {
  const questions: ExamQuestion[] = exam.questions || [];
  const school = options.schoolName || 'TRUNG TÂM KHẢO THÍ & ĐÁNH GIÁ CHẤT LƯỢNG';

  const docChildren: any[] = [];

  // 1. Header Information Table (2 columns)
  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: school.toUpperCase(), bold: true, size: 20 }),
                ],
                alignment: AlignmentType.CENTER,
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'ĐỀ THI CHÍNH THỨC', bold: true, size: 20 }),
                ],
                alignment: AlignmentType.CENTER,
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: `(Đề thi gồm ${questions.length} câu trắc nghiệm)`, italics: true, size: 18 }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: `KỲ THI KIỂM TRA ĐỊNH KỲ`, bold: true, size: 20 }),
                ],
                alignment: AlignmentType.CENTER,
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: `MÔN: ${exam.subject.toUpperCase()} - ${exam.grade.toUpperCase()}`, bold: true, size: 20 }),
                ],
                alignment: AlignmentType.CENTER,
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: `Thời gian làm bài: ${exam.duration} phút`, italics: true, size: 18 }),
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

  // Divider Line
  docChildren.push(
    new Paragraph({
      children: [
        new TextRun({ text: '--------------------------------------------------------------------------------------------------', size: 16, color: '888888' }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 150, after: 150 },
    })
  );

  // Student Info Field
  docChildren.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'Họ và tên thí sinh: .................................................................... ', size: 20 }),
        new TextRun({ text: 'Số báo danh: ..................... ', size: 20 }),
        new TextRun({ text: `Mã đề: ${exam.id}`, bold: true, size: 20 }),
      ],
      spacing: { after: 250 },
    })
  );

  // 2. Exam Title Heading
  docChildren.push(
    new Paragraph({
      text: exam.title.toUpperCase(),
      heading: HeadingLevel.HEADING_2,
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 300 },
    })
  );

  // 3. Question Items
  questions.forEach((q, idx) => {
    // Question Text
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: `Câu ${idx + 1}: `, bold: true, size: 22 }),
          new TextRun({ text: `(${q.level}) `, italics: true, size: 18, color: '555555' }),
          new TextRun({ text: q.content, size: 22 }),
        ],
        spacing: { before: 200, after: 120 },
      })
    );

    // Options Grid (2x2 table)
    const optA = cleanOpt(q.options.find((o) => o.key === 'A')?.text || '');
    const optB = cleanOpt(q.options.find((o) => o.key === 'B')?.text || '');
    const optC = cleanOpt(q.options.find((o) => o.key === 'C')?.text || '');
    const optD = cleanOpt(q.options.find((o) => o.key === 'D')?.text || '');

    const optionsTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.NONE },
        insideVertical: { style: BorderStyle.NONE },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: 'A. ', bold: true, size: 20 }),
                    new TextRun({ text: optA, size: 20 }),
                  ],
                  spacing: { after: 60 },
                }),
              ],
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: 'B. ', bold: true, size: 20 }),
                    new TextRun({ text: optB, size: 20 }),
                  ],
                  spacing: { after: 60 },
                }),
              ],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: 'C. ', bold: true, size: 20 }),
                    new TextRun({ text: optC, size: 20 }),
                  ],
                  spacing: { after: 60 },
                }),
              ],
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: 'D. ', bold: true, size: 20 }),
                    new TextRun({ text: optD, size: 20 }),
                  ],
                  spacing: { after: 60 },
                }),
              ],
            }),
          ],
        }),
      ],
    });

    docChildren.push(optionsTable);
  });

  // End of exam marker
  docChildren.push(
    new Paragraph({
      children: [
        new TextRun({ text: '---------- HẾT ----------', bold: true, size: 20 }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 300, after: 300 },
    })
  );

  // 4. Answer Key & Detailed Explanation Section (if requested)
  if (options.includeAnswers) {
    docChildren.push(
      new Paragraph({
        text: 'BẢNG ĐÁP ÁN & HƯỚNG DẪN GIẢI CHI TIẾT',
        heading: HeadingLevel.HEADING_2,
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 200 },
      })
    );

    // Answer Key Table
    const tableCols = 5;
    const answerRows: TableRow[] = [];
    const numRows = Math.ceil(questions.length / tableCols);

    for (let r = 0; r < numRows; r++) {
      const cells: TableCell[] = [];
      for (let c = 0; c < tableCols; c++) {
        const qIdx = r * tableCols + c;
        if (qIdx < questions.length) {
          const q = questions[qIdx];
          cells.push(
            new TableCell({
              width: { size: 20, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: `Câu ${qIdx + 1}: `, bold: true, size: 18 }),
                    new TextRun({ text: q.correctAnswer, bold: true, color: '008800', size: 20 }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
              ],
            })
          );
        } else {
          cells.push(
            new TableCell({
              width: { size: 20, type: WidthType.PERCENTAGE },
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
          width: { size: 100, type: WidthType.PERCENTAGE },
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
            new TextRun({ text: `Câu ${idx + 1} (Đáp án ${q.correctAnswer}): `, bold: true, size: 20 }),
            new TextRun({ text: q.explanation || 'Xem lý thuyết sách giáo khoa.', size: 20, italics: true }),
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
            margin: {
              top: 1000,
              right: 1000,
              bottom: 1000,
              left: 1000,
            },
          },
        },
        children: docChildren,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const safeTitle = (exam.title || 'De_thi_Examify')
    .replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9]/g, '_')
    .replace(/_+/g, '_');
  downloadBlob(blob, `${safeTitle}.docx`);
}

/**
 * Export exam to Word HTML (.doc) format - openable in Word & Google Docs
 */
export function exportExamToDoc(
  exam: ExamItem,
  options: { includeAnswers?: boolean; schoolName?: string } = { includeAnswers: true }
) {
  const questions: ExamQuestion[] = exam.questions || [];
  const school = options.schoolName || 'TRUNG TÂM KHẢO THÍ QUỐC GIA';

  let htmlContent = `
<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset="utf-8">
  <title>${exam.title}</title>
  <style>
    body { font-family: 'Times New Roman', Times, serif; font-size: 13pt; line-height: 1.4; color: #000; padding: 20px; }
    .header-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
    .header-table td { border: none; text-align: center; vertical-align: top; width: 50%; }
    .title { text-align: center; font-size: 16pt; font-weight: bold; margin: 15px 0 20px 0; text-transform: uppercase; }
    .student-info { margin-bottom: 25px; font-size: 12pt; border-bottom: 1px dashed #888; padding-bottom: 8px; }
    .question { margin-bottom: 16px; page-break-inside: avoid; }
    .q-title { font-weight: bold; margin-bottom: 6px; }
    .q-level { font-style: italic; color: #555; font-size: 10pt; }
    .options-grid { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
    .options-grid td { width: 50%; padding: 4px 8px; vertical-align: top; border: none; font-size: 12pt; }
    .correct-opt { font-weight: bold; color: #006600; }
    .answer-key { margin-top: 40px; page-break-before: always; }
    .ans-table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px; }
    .ans-table td, .ans-table th { border: 1px solid #333; padding: 6px; text-align: center; font-size: 11pt; }
    .solution-item { margin-bottom: 12px; font-size: 11pt; }
  </style>
</head>
<body>
  <table class="header-table">
    <tr>
      <td>
        <strong>${school.toUpperCase()}</strong><br/>
        <strong>ĐỀ THI CHÍNH THỨC</strong><br/>
        <em>(Đề thi gồm ${questions.length} câu)</em>
      </td>
      <td>
        <strong>KỲ THI KIỂM TRA ĐỊNH KỲ</strong><br/>
        <strong>MÔN: ${exam.subject.toUpperCase()} - ${exam.grade.toUpperCase()}</strong><br/>
        <em>Thời gian làm bài: ${exam.duration} phút</em>
      </td>
    </tr>
  </table>

  <div class="student-info">
    Họ và tên thí sinh: ............................................................................................ Số báo danh: ..................... Mã đề: <strong>${exam.id}</strong>
  </div>

  <div class="title">${exam.title}</div>

  <div class="questions-list">
`;

  questions.forEach((q, idx) => {
    const optA = cleanOpt(q.options.find((o) => o.key === 'A')?.text || '');
    const optB = cleanOpt(q.options.find((o) => o.key === 'B')?.text || '');
    const optC = cleanOpt(q.options.find((o) => o.key === 'C')?.text || '');
    const optD = cleanOpt(q.options.find((o) => o.key === 'D')?.text || '');

    htmlContent += `
    <div class="question">
      <div class="q-title">Câu ${idx + 1}: <span class="q-level">(${q.level})</span> ${q.content}</div>
      <table class="options-grid">
        <tr>
          <td><strong>A.</strong> ${optA}</td>
          <td><strong>B.</strong> ${optB}</td>
        </tr>
        <tr>
          <td><strong>C.</strong> ${optC}</td>
          <td><strong>D.</strong> ${optD}</td>
        </tr>
      </table>
    </div>
    `;
  });

  htmlContent += `
    <div style="text-align: center; font-weight: bold; margin: 30px 0;">---------- HẾT ----------</div>
  `;

  if (options.includeAnswers) {
    htmlContent += `
    <div class="answer-key">
      <h2 style="text-align: center; text-transform: uppercase;">Bảng Đáp Án & Hướng Dẫn Giải Chi Tiết</h2>
      <table class="ans-table">
        <tr>
    `;

    questions.forEach((q, idx) => {
      if (idx > 0 && idx % 10 === 0) {
        htmlContent += `</tr><tr>`;
      }
      htmlContent += `<td><strong>${idx + 1}</strong>: <span style="color: #008800; font-weight: bold;">${q.correctAnswer}</span></td>`;
    });

    htmlContent += `
        </tr>
      </table>

      <h3>Hướng dẫn giải chi tiết:</h3>
    `;

    questions.forEach((q, idx) => {
      htmlContent += `
      <div class="solution-item">
        <strong>Câu ${idx + 1} (Đáp án ${q.correctAnswer}):</strong> <em>${q.explanation || 'Xem định nghĩa SGK.'}</em>
      </div>
      `;
    });

    htmlContent += `</div>`;
  }

  htmlContent += `
</body>
</html>
  `;

  const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword;charset=utf-8' });
  const safeTitle = (exam.title || 'De_thi_Examify')
    .replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9]/g, '_')
    .replace(/_+/g, '_');
  downloadBlob(blob, `${safeTitle}.doc`);
}

/**
 * Triggers Browser Print to save as PDF
 */
export function exportExamToPdf() {
  if (typeof window !== 'undefined') {
    window.print();
  }
}

/**
 * Export exam as clean JSON for LMS/Moodle import
 */
export function exportExamToJson(exam: ExamItem) {
  const jsonStr = JSON.stringify(exam, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  const safeTitle = (exam.title || 'De_thi_Examify')
    .replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9]/g, '_')
    .replace(/_+/g, '_');
  downloadBlob(blob, `${safeTitle}.json`);
}
