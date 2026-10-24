import { NextRequest } from 'next/server';
import { z } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { apiError, apiSuccess, parseAiJson } from '@/lib/utils';
import { generateExamVariants, ShuffledVariant } from '@/lib/exam-shuffler';
import { normalizeQuestionType, normalizeSvgGeometry } from '@/lib/exam-sections';
import { extractCleanShortAnswerValue } from '@/lib/curriculum-questions';
import { ExamQuestion } from '@/lib/store/app-store';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const IsomorphicVariantsSchema = z.object({
  baseQuestions: z.array(z.any()).min(1, 'Base questions are required'),
  baseTitle: z.string().default('Đề thi'),
  subject: z.string().default('Toán học'),
  grade: z.string().default('Lớp 12'),
  term: z.string().optional(),
  variantCodes: z.array(z.string()).min(1).default(['102', '103', '104']),
  shuffleOrder: z.boolean().default(true),
  aiProvider: z.string().optional(),
  aiModel: z.string().optional(),
});

/**
 * Normalizes question options into uniform structure
 */
function normalizeOptions(options: any[], correctAnswer?: string): any[] {
  if (!Array.isArray(options) || options.length === 0) return [];

  const defaultKeys = ['A', 'B', 'C', 'D'];
  const normAns = (correctAnswer || 'A').trim().toUpperCase();

  return options.map((opt, idx) => {
    if (typeof opt === 'string') {
      const cleanText = opt.replace(/^[A-Da-d][\.\:\)\-\s]+/i, '').trim();
      const key = defaultKeys[idx] || String.fromCharCode(65 + idx);
      return {
        key,
        text: cleanText || opt,
        isCorrect: key === normAns,
      };
    }
    const key = (opt.key || defaultKeys[idx] || String.fromCharCode(65 + idx)).toUpperCase();
    const text = typeof opt.text === 'string' ? opt.text.replace(/^[A-Da-d][\.\:\)\-\s]+/i, '').trim() : '';
    const isCorrect = opt.isCorrect === true || key === normAns;
    return {
      key,
      text: text || opt.text || '',
      isCorrect,
    };
  });
}

/**
 * Normalizes True/False options into a, b, c, d
 */
function normalizeTfOptions(options: any[], correctAnswer?: string): { options: any[]; correctAnswer: string } {
  const subKeys = ['a', 'b', 'c', 'd'];
  let opts: any[] = [];

  if (Array.isArray(options) && options.length > 0) {
    opts = options.slice(0, 4).map((opt, idx) => {
      const key = subKeys[idx] || 'a';
      const text = typeof opt === 'string' ? opt.replace(/^[a-da-d][\.\:\)\-\s]+/i, '').trim() : (opt.text || '');
      const isCorrect = opt.isCorrect !== undefined
        ? opt.isCorrect === true
        : correctAnswer
        ? new RegExp(`${key}\\s*[:=-]?\\s*(Đ|Đúng|True|T|1)(?!\\w)`, 'i').test(correctAnswer)
        : idx % 2 === 0;
      return {
        key,
        text: text || `Mệnh đề ${key}`,
        isCorrect,
      };
    });
  }

  while (opts.length < 4) {
    const k = subKeys[opts.length] || 'a';
    opts.push({ key: k, text: `Mệnh đề ${k}`, isCorrect: opts.length % 2 === 0 });
  }

  const ansStr = opts.map((o) => `${o.key}: ${o.isCorrect ? 'Đ' : 'S'}`).join(', ');
  return { options: opts, correctAnswer: ansStr };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = IsomorphicVariantsSchema.safeParse(body);

    if (!validation.success) {
      return apiError(validation.error.flatten().fieldErrors, 422, 'Invalid payload');
    }

    const {
      baseQuestions,
      baseTitle,
      subject,
      grade,
      term = 'Học kỳ 1',
      variantCodes,
      shuffleOrder,
    } = validation.data;

    const geminiKey = process.env.GEMINI_API_KEY?.split(/[,;]+/)[0]?.trim();

    const levelMap: Record<string, string> = {
      KNOWLEDGE: 'Nhận biết',
      COMPREHENSION: 'Thông hiểu',
      APPLICATION: 'Vận dụng',
      HIGH_APPLICATION: 'Vận dụng cao',
    };

    // Prepare simplified questions to minimize prompt payload
    const simplifiedBase = baseQuestions.map((q: any, i: number) => {
      const normType = normalizeQuestionType(q.type);
      const level = q.level || (q.cognitiveLevel ? levelMap[q.cognitiveLevel] : undefined) || 'Thông hiểu';
      return {
        index: i + 1,
        type: normType,
        level,
        topic: q.topic || subject,
        content: q.content,
        options: normType === 'multiple_choice'
          ? (q.options || []).map((o: any) => cleanTextOpt(o))
          : normType === 'true_false'
          ? (q.options || []).map((o: any, idx: number) => {
              const defaultKeys = ['a', 'b', 'c', 'd'];
              if (typeof o === 'string') {
                return { key: defaultKeys[idx] || 'a', text: o, isCorrect: undefined };
              }
              return { key: o.key || defaultKeys[idx] || 'a', text: o.text || '', isCorrect: o.isCorrect };
            })
          : [],
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
      };
    });

    function cleanTextOpt(opt: any): string {
      if (typeof opt === 'string') return opt;
      return opt.text || '';
    }

    // Helper to generate isomorphic questions for a single variant code using Gemini
    async function generateVariantQuestions(targetCode: string, codeIndex: number): Promise<ExamQuestion[]> {
      if (!geminiKey) {
        throw new Error('No GEMINI_API_KEY found');
      }

      const genAI = new GoogleGenerativeAI(geminiKey);

      const diversityDirectives = [
        `MÃ ĐỀ ${targetCode} (Biến thể thứ 1): Hãy chọn hệ số chẵn đẹp hoặc nhân hệ số k = 2; các nghiệm số nguyên dương gọn gàng.`,
        `MÃ ĐỀ ${targetCode} (Biến thể thứ 2): Hãy chọn hệ số lẻ hoặc phân số tối giản đẹp, nhân hệ số k = 3 hoặc tịnh tiến biến số; tuyệt đối không chọn lại các số của Mã 101 và Mã 102.`,
        `MÃ ĐỀ ${targetCode} (Biến thể thứ 3): Hãy chọn hệ số nguyên tố nhỏ (2, 3, 5, 7) hoặc đổi dấu âm/dương, nhân hệ số k = 4; đảm bảo số liệu hoàn toàn khác biệt với các mã trước.`,
        `MÃ ĐỀ ${targetCode} (Biến thể thứ 4): Tịnh tiến thông số (ví dụ đổi bán kính, diện tích, hoành độ theo chiều hướng mới), nghiệm nguyên đẹp, số liệu độc lập 100%.`,
      ];
      const directive = diversityDirectives[codeIndex % diversityDirectives.length];

      const prompt = `Bạn là chuyên gia khảo thí biên soạn đề thi chuẩn GDPT tại Việt Nam.
Dưới đây là danh sách ${simplifiedBase.length} câu hỏi của ĐỀ THI GỐC (Mã đề 101) môn ${subject}, khối ${grade}.
Nhiệm vụ của bạn: Tạo MÃ ĐỀ THI ĐỒNG DẠNG (MÃ ĐỀ ${targetCode} - Biến thể thứ ${codeIndex + 1}) ĐỒNG BỘ 1-1 VỚI ĐỀ GỐC:

### ĐỊNH HƯỚNG TẠO SỐ LIỆU ĐỘC LẬP CHO MÃ ${targetCode}:
- ${directive}
- Đảm bảo các số liệu không bị trùng lặp với các mã đề khác nhưng độ khó và phương pháp giải hoàn toàn tương đồng.

### NGUYÊN TẮC ĐỒNG DẠNG BẮT BUỘC (ISOMORPHIC RULES):
1. ĐỒNG BỘ 1-1 VỚI TỪNG CÂU HỎI CỦA ĐỀ GỐC:
   - Câu thứ i trong Mã đề ${targetCode} PHẢI CÙNG DẠNG BÀI TOÁN, CÙNG DẠNG CÂU HỎI (multiple_choice, true_false, short_answer, essay), CÙNG CẤP ĐỘ NHẬN THỨC với câu thứ i của Đề gốc.
   - GIỮ NGUYÊN dạng bài nhưng THAY ĐỔI TOÀN BỘ BỘ SỐ LIỆU (hệ số phương trình, tọa độ, số liệu bài toán thực tế...) sang một bộ số mới giải ra kết quả đẹp, hợp lý để chống quay cóp giữa các học sinh.
2. TỰ ĐỘNG GIẢI VÀ TÍNH TOÁN LẠI ĐÁP ÁN CHUẨN XÁC 100%:
   - BẮT BUỘC giải lại chi tiết từng bước trong "explanation" theo bộ số mới.
   - Đối với Trắc nghiệm (multiple_choice):
     * Tính toán ra 4 phương án (A, B, C, D) gồm 1 đáp án đúng và 3 phương án nhiễu hợp lý theo bộ số mới.
     * Cập nhật "correctAnswer" chuẩn xác ('A', 'B', 'C', hoặc 'D').
   - Đối với Đúng/Sai (true_false):
     * 4 mệnh đề a, b, c, d tương ứng với số liệu mới.
     * Tính toán lại tính đúng/sai thực tế, định dạng "correctAnswer" như "a: Đ, b: S, c: Đ, d: S" (phân bố cân bằng 2Đ-2S hoặc 3Đ-1S, không được 4Đ hoặc 4S).
   - Đối với Trả lời ngắn (short_answer):
     * Tính toán ra kết quả số học mới chính xác ĐÃ ĐƯỢC MÃ HÓA và ghi vào "correctAnswer" (ví dụ: "15", "-4.5", "1.26", "6").
     * BẮT BUỘC ĐÁP SỐ LÀ CON SỐ CỤ THỂ theo chuẩn phiếu tô trắc nghiệm Bộ GD&ĐT (tối đa 4 ký tự). TUYỆT ĐỐI NGHIÊM CẤM chứa căn thức (\\sqrt), biến số (a, b, m) hay bất đẳng thức.
     * ĐẶC BIỆT: Mỗi mã đề PHẢI RA MỘT ĐÁP SỐ KHÁC NHAU HOÀN TOÀN so với Đề gốc và các mã khác (chọn thông số độc lập, ví dụ nếu đề gốc tính ra 108, mã 102 tính ra 256, thì mã 103 chọn thông số tính ra 500 hoặc 32... TUYỆT ĐỐI KHÔNG TRÙNG ĐÁP SỐ giữa các mã).
   - Đối với Tự luận (essay):
     * Cập nhật lại đề bài và barem điểm giải chi tiết trong "explanation".
3. KHÔNG ĐƯỢC ĐẢO THỨ TỰ CÂU TRONG BƯỚC NÀY:
   - Giữ nguyên thứ tự câu 1 đến câu ${simplifiedBase.length} đúng theo đề gốc để đảm bảo sự đồng bộ 1-1.

### QUY TẮC BẢO ĐẢM TÍNH SƯ PHẠM VÀ LỜI GIẢI (BẮT BUỘC):
1. TUYỆT ĐỐI KHÔNG ĐỂ LỘ SUY NGHĨ NỘI TÂM (CHAIN-OF-THOUGHT) TRONG "explanation":
   - Trường "explanation" là lời giải sư phạm hoàn chỉnh, chỉn chu, trang trọng dành trực tiếp cho giáo viên và học sinh đọc.
   - NGHIÊM CẤM độc thoại nội tâm, nghiêm cấm ghi "ta cần phân bố 2Đ-2S", không tự bình luận về quy tắc đề thi hay quá trình chế đề trong "explanation".
2. ĐỒNG BỘ 100% GIỮA ĐỀ BÀI CÂU ĐÚNG/SAI VÀ LỜI GIẢI:
   - Với câu Đúng/Sai: Nếu muốn mệnh đề là SAI, BẮT BUỘC phải viết thẳng con số/nội dung sai vào trường "text" của option đó trong "options", và trong "explanation" giải thích rõ vì sao khẳng định với con số đó là SAI.
   - Tuyệt đối không được viết một đằng trong "options" rồi trong "explanation" lại giải thích cho một nội dung khác!
3. GIỮ NGUYÊN THỨ TỰ CÁC Ý a, b, c, d TRONG CÂU ĐÚNG/SAI:
   - Giữ nguyên thứ tự logic a -> b -> c -> d của câu Đúng/Sai.

### QUY CÁCH TRÌNH BÀY CODE (NẾU CÓ):
- Đoạn mã Python/C++ phải đặt trong khối \`\`\`python ... \`\`\` với dấu xuống dòng (\\n) và thụt lề 4 dấu cách rõ ràng.

### QUY CÁCH HÌNH HỌC SVG (NẾU CÓ):
- Nếu đề gốc có nhúng <svg>, câu mới cũng nhúng <svg> tương ứng với số liệu mới. Ký hiệu vuông góc nếu có phải dùng <polyline> trượt song song cạnh hoặc bỏ qua nếu không tính được phối cảnh 3D.

### DANH SÁCH CÂU HỎI ĐỀ GỐC (MÃ ĐỀ 101):
${JSON.stringify(simplifiedBase, null, 2)}

### ĐỊNH DẠNG JSON TRẢ VỀ:
BẮT BUỘC trả về DUY NHẤT một mảng JSON:
[
  {
    "order": "Câu 01",
    "type": "multiple_choice",
    "level": "Thông hiểu",
    "topic": "...",
    "content": "Đề bài mới với số liệu mới...",
    "options": [
      { "key": "A", "text": "...", "isCorrect": true },
      { "key": "B", "text": "...", "isCorrect": false },
      { "key": "C", "text": "...", "isCorrect": false },
      { "key": "D", "text": "...", "isCorrect": false }
    ],
    "correctAnswer": "A",
    "explanation": "Lời giải chi tiết mới tương ứng bộ số..."
  }
]`;

      const fallbackModels = (process.env.GEMINI_MODEL || 'gemini-3.7-flash, gemini-3.5-flash, gemini-3.8-flash')
        .split(/[,;]+/)
        .map((m) => m.trim())
        .filter((m) => m.length > 0);

      let lastErr: any = null;
      let text = '';

      for (const currentModel of fallbackModels) {
        try {
          const model = genAI.getGenerativeModel({
            model: currentModel,
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: Math.min(0.95, 0.75 + codeIndex * 0.05),
            },
          });
          const result = await model.generateContent(prompt);
          text = result.response.text();
          if (text) break;
        } catch (err: any) {
          lastErr = err;
          const msg = err?.message || '';
          console.warn(`[isomorphic-variants] Model ${currentModel} error: ${msg}. Trying next fallback model...`);
          if (msg.includes('429') || msg.includes('404') || msg.toLowerCase().includes('quota')) {
            continue;
          }
          throw err;
        }
      }

      if (!text) {
        throw lastErr || new Error('All fallback models failed to generate content');
      }

      const parsedArray = parseAiJson(text);

      if (!Array.isArray(parsedArray) || parsedArray.length === 0) {
        throw new Error('AI output is not a valid question array');
      }

      // Format parsed questions back into ExamQuestion format
      const formatted: ExamQuestion[] = parsedArray.map((q: any, idx: number) => {
        const baseRef = baseQuestions[idx] || {};
        const normType = normalizeQuestionType(q.type || baseRef.type);
        const level = q.level || baseRef.level || 'Thông hiểu';
        const levelClass =
          level === 'Nhận biết'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : level === 'Thông hiểu'
            ? 'bg-blue-50 text-blue-700 border-blue-200'
            : level === 'Vận dụng'
            ? 'bg-amber-50 text-amber-700 border-amber-200'
            : 'bg-rose-50 text-rose-700 border-rose-200';

        let options: any[] = [];
        let finalAnswer = q.correctAnswer || baseRef.correctAnswer;

        if (normType === 'true_false') {
          const tfResult = normalizeTfOptions(q.options || baseRef.options, q.correctAnswer);
          options = tfResult.options;
          finalAnswer = tfResult.correctAnswer;
        } else if (normType === 'multiple_choice') {
          options = normalizeOptions(q.options || baseRef.options, q.correctAnswer);
          const found = options.find((o) => o.isCorrect);
          finalAnswer = found ? found.key : (q.correctAnswer || 'A');
        } else if (normType === 'short_answer') {
          options = [];
          finalAnswer = extractCleanShortAnswerValue(null, q.explanation, q.correctAnswer);
        } else {
          options = [];
          finalAnswer = 'Xem hướng dẫn chấm';
        }

        return {
          id: Date.now() + idx + Math.floor(Math.random() * 1000),
          order: `Câu ${String(idx + 1).padStart(2, '0')}`,
          type: normType,
          section: normType,
          level,
          levelClass,
          topic: q.topic || baseRef.topic || subject,
          content: normalizeSvgGeometry(q.content),
          options,
          points: baseRef.points || (normType === 'essay' ? 1.5 : normType === 'true_false' ? 1.0 : normType === 'short_answer' ? 0.5 : 0.25),
          correctAnswer: finalAnswer,
          explanation: normalizeSvgGeometry(q.explanation || 'Lời giải chi tiết biên soạn bởi mô hình AI.'),
        };
      });

      return formatted;
    }

    // Mã 101 is always base questions
    const generatedVariants: ShuffledVariant[] = [
      {
        code: '101',
        title: `${baseTitle} - Mã đề 101`,
        questions: baseQuestions.map((q: any) => ({
          ...q,
          content: typeof q.content === 'string' ? normalizeSvgGeometry(q.content) : q.content,
          explanation: typeof q.explanation === 'string' ? normalizeSvgGeometry(q.explanation) : q.explanation,
        })),
      },
    ];

    // Batch requests in chunks of 2 to avoid Gemini rate limits
    const batchSize = 2;
    const variantResults: Array<{ code: string; status: 'fulfilled' | 'rejected'; questions?: ExamQuestion[] }> = [];

    for (let i = 0; i < variantCodes.length; i += batchSize) {
      const batch = variantCodes.slice(i, i + batchSize);
      const batchPromises = batch.map(async (code) => {
        const codeIndex = variantCodes.indexOf(code);
        try {
          const questions = await generateVariantQuestions(code, codeIndex);
          return { code, status: 'fulfilled' as const, questions };
        } catch (err) {
          console.error(`Error generating variant ${code}:`, err);
          return { code, status: 'rejected' as const };
        }
      });
      const res = await Promise.all(batchPromises);
      variantResults.push(...res);
    }

    variantResults.forEach((res) => {
      const code = res.code;
      if (res.status === 'fulfilled' && res.questions && res.questions.length > 0) {
        let qs = res.questions;

        // If shuffleOrder is true, shuffle question positions & options within sections
        if (shuffleOrder) {
          const shuffledResult = generateExamVariants(
            qs,
            baseTitle,
            {
              codeCount: 2, // 101: unchanged, 102: shuffled
              shuffleOrder: true,
              shuffleValues: false,
              baseCode: parseInt(code, 10),
            }
          );
          // Pick the shuffled variant (index 1)
          if (shuffledResult[1]) {
            qs = shuffledResult[1].questions;
          }
        }

        generatedVariants.push({
          code,
          title: `${baseTitle} - Mã đề ${code}`,
          questions: qs,
        });
      } else {
        // Fallback: Safe offline client shuffling for this code
        console.warn(`AI isomorphic generation failed for code ${code}, falling back to safe order shuffle`);
        const fallbackVariants = generateExamVariants(
          baseQuestions,
          baseTitle,
          {
            codeCount: 2,
            shuffleOrder: true,
            shuffleValues: false,
            baseCode: parseInt(code, 10),
          }
        );
        generatedVariants.push({
          code,
          title: `${baseTitle} - Mã đề ${code}`,
          questions: fallbackVariants[1] ? fallbackVariants[1].questions : baseQuestions,
        });
      }
    });

    return apiSuccess(
      {
        variants: generatedVariants,
        codesCount: generatedVariants.length,
      },
      `Đã tạo thành công ${generatedVariants.length} mã đề đồng dạng bằng AI với số liệu mới và đáp án tự động tính toán lại!`
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal error';
    return apiError(msg, 500);
  }
}
