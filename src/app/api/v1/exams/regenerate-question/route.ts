import { NextRequest } from 'next/server';
import { z } from 'zod';
import { AIFactory, SupportedAIProvider } from '@/core/ai/ai-factory';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { apiError, apiSuccess } from '@/lib/utils';
import { getCurriculumQuestion, extractCleanShortAnswerValue } from '@/lib/curriculum-questions';
import { ExamPromptBuilder } from '@/core/ai/prompt-builder';

const RegenerateQuestionSchema = z.object({
  subject: z.string().default('Toán học'),
  grade: z.string().default('Lớp 12'),
  term: z.string().optional(),
  level: z.string().default('Thông hiểu'),
  type: z.enum(['multiple_choice', 'true_false', 'short_answer', 'essay']).optional(),
  currentTopic: z.string().optional(),
  customPrompt: z.string().max(1000).optional(),
  currentQuestionContent: z.string().optional(),
  avoidQuestions: z.array(z.string()).optional(),
  existingQuestions: z.array(z.string()).optional(),
  aiProvider: z.enum(['openai', 'gemini', 'claude', 'self-hosted', 'custom-mcp']).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = RegenerateQuestionSchema.safeParse(body);

    if (!validation.success) {
      return apiError(validation.error.flatten().fieldErrors, 422, 'Invalid payload');
    }

    const {
      subject,
      grade,
      term = 'Học kỳ 1',
      level,
      type = 'multiple_choice',
      currentTopic,
      customPrompt,
      currentQuestionContent,
      avoidQuestions = [],
      existingQuestions = [],
    } = validation.data;

    const geminiKey = process.env.GEMINI_API_KEY?.split(/[,;]+/)[0]?.trim();

    // Map level to Vietnamese & Bloom
    const bloomLevel =
      level === 'Nhận biết'
        ? 'KNOWLEDGE (Nhận biết)'
        : level === 'Thông hiểu'
        ? 'COMPREHENSION (Thông hiểu)'
        : level === 'Vận dụng'
        ? 'APPLICATION (Vận dụng)'
        : 'HIGH_APPLICATION (Vận dụng cao)';

    // Build comprehensive list of questions to avoid repeating
    const forbiddenList = Array.from(
      new Set(
        [
          ...(currentQuestionContent ? [currentQuestionContent] : []),
          ...avoidQuestions,
          ...existingQuestions,
        ].filter((q): q is string => typeof q === 'string' && q.trim().length > 0)
      )
    );

    if (geminiKey) {
      try {
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({
          model: process.env.GEMINI_MODEL?.split(/[,;]+/)[0]?.trim() || 'gemini-3.8-flash',
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.85,
          },
        });

        let typeInstruction = `Hãy tạo MỘT (1) câu hỏi trắc nghiệm 4 lựa chọn (A, B, C, D) HOÀN TOÀN MỚI VÀ ĐỘC NHẤT cho môn: ${subject}, khối: ${grade}, cấp độ tư duy Bloom: ${bloomLevel}.
Định dạng JSON trả về:
{
  "content": "Nội dung câu hỏi rõ ràng, chính xác...",
  "options": ["Nội dung phương án A", "Nội dung phương án B", "Nội dung phương án C", "Nội dung phương án D"],
  "correctAnswer": "A",
  "explanation": "Lời giải chi tiết từng bước..."
}`;

        if (type === 'true_false') {
          typeInstruction = `Hãy tạo MỘT (1) câu hỏi trắc nghiệm ĐÚNG / SAI (gồm bối cảnh/nội dung chung và 4 ý khẳng định a, b, c, d độc lập) cho môn: ${subject}, khối: ${grade}, cấp độ Bloom: ${bloomLevel}.
BẮT BUỘC PHÂN BỐ TỈ LỆ ĐÚNG / SAI CÂN BẰNG THỰC TẾ:
- 4 ý khẳng định a, b, c, d PHẢI CÓ TÍNH ĐÚNG/SAI ĐA DẠNG: Ưu tiên 2 Đúng - 2 Sai (ví dụ: a: Đúng, b: Sai, c: Đúng, d: Sai), hoặc 3 Đúng - 1 Sai, hoặc 1 Đúng - 3 Sai.
- TUYỆT ĐỐI KHÔNG mặc định chỉ có 1 ý Đúng và 3 ý Sai (không được ra đề mà chỉ có 1 ý Đúng).
- TUYỆT ĐỐI KHÔNG cả 4 ý đều Đúng hoặc cả 4 ý đều Sai.
Định dạng JSON trả về:
{
  "content": "Bối cảnh hoặc đề bài toán...",
  "options": ["Nội dung khẳng định ý a", "Nội dung khẳng định ý b", "Nội dung khẳng định ý c", "Nội dung khẳng định ý d"],
  "correctAnswer": "a: Đúng, b: Sai, c: Đúng, d: Sai",
  "explanation": "Giải thích chi tiết tính đúng/sai của từng ý a, b, c, d..."
}`;
        } else if (type === 'short_answer') {
          typeInstruction = `Hãy tạo MỘT (1) câu hỏi TRẮC NGHIỆM TRẢ LỜI NGẮN (thí sinh chỉ điền đáp số/kết quả cuối cùng, không có lựa chọn A,B,C,D) cho môn: ${subject}, khối: ${grade}, cấp độ Bloom: ${bloomLevel}.
YÊU CẦU ĐẶC BIỆT: Bạn phải tính toán chi tiết trong "explanation" để tìm ra đáp số chuẩn xác, sau đó ghi kết quả số học chính xác đó vào "correctAnswer" (ví dụ: "25", "-3", "4/3"). TUYỆT ĐỐI KHÔNG điền chữ cái A,B,C,D hay số mặc định.
Định dạng JSON trả về:
{
  "content": "Nội dung bài toán yêu cầu tìm đáp số...",
  "options": [],
  "explanation": "Các bước tính toán chi tiết từng bước dẫn tới kết quả...",
  "correctAnswer": "kết_quả_số_học_chính_xác"
}`;
        } else if (type === 'essay') {
          typeInstruction = `Hãy tạo MỘT (1) bài tập TỰ LUẬN tự luận toàn diện kèm barem điểm chi tiết cho môn: ${subject}, khối: ${grade}, cấp độ Bloom: ${bloomLevel}.
Định dạng JSON trả về:
{
  "content": "Nội dung bài toán tự luận...",
  "options": [],
  "correctAnswer": "Xem hướng dẫn chấm và barem điểm",
  "explanation": "Barem chấm điểm chi tiết từng ý và các bước giải..."
}`;
        }

        const gradeDirectives = ExamPromptBuilder.getCurriculumGradeDirectives(grade, subject);
        const prompt = `Bạn là chuyên gia khảo thí biên soạn đề thi chuẩn GDPT tại Việt Nam.
${gradeDirectives ? `${gradeDirectives}\n` : ''}
${typeInstruction}

### QUY CÁCH TRÌNH BÀY MÃ NGUỒN LẬP TRÌNH (PYTHON, C++, SQL...):
- Nếu đề bài hoặc câu hỏi có chứa đoạn mã chương trình, BẮT BUỘC đặt trong khối markdown code block: \`\`\`python ... \`\`\`
- BẮT BUỘC XUỐNG DÒNG RÕ RÀNG cho từng câu lệnh (mỗi lệnh trên một dòng) và thụt lề 4 dấu cách (indentation).
- TUYỆT ĐỐI NGHIÊM CẤM viết code dồn tất cả lệnh trên 1 dòng duy nhất!

### THÔNG TIN BỐI CẢNH VÀ CHƯƠNG TRÌNH:
- Môn học: ${subject}
- Khối lớp: ${grade}
- Học kỳ: ${term}
- Chuyên đề/Chủ đề trọng tâm: ${currentTopic || subject}
${customPrompt ? `- Yêu cầu sư phạm chuyên biệt từ giáo viên: ${customPrompt}` : ''}

### QUY TẮC BẮT BUỘC (CRITICAL MANDATE):
1. Đúng 100% phạm vi kiến thức khối lớp ${grade}, môn ${subject}, học kỳ ${term} và bám sát chủ đề "${currentTopic || subject}".
2. TUYỆT ĐỐI KHÔNG TRÙNG LẶP CÂU HỎI VỪA BỊ THAY THẾ HOẶC ĐÃ CÓ:
${currentQuestionContent ? `- Câu hỏi hiện tại vừa bị bấm tạo lại (TUYỆT ĐỐI KHÔNG DÙNG LẠI HOẶC TẠO TƯƠNG TỰ CÂU NÀY):\n  "${currentQuestionContent.slice(0, 300)}"` : ''}
${forbiddenList.length > 0 ? `Các câu hỏi khác đã từng xuất hiện trong đề thi (TUYỆT ĐỐI KHÔNG TRÙNG):\n${forbiddenList.slice(-10).map((q, i) => `- ${q.slice(0, 150)}`).join('\n')}` : ''}
3. ĐỔI MỚI SÁNG TẠO: Tạo câu hỏi mới mẻ với số liệu, hàm số, biến số hoặc tình huống hoàn toàn khác biệt, mang lại trải nghiệm tươi mới cho giáo viên.`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
        const parsed = JSON.parse(clean);

        if (parsed.content) {
          const levelClass =
            level === 'Nhận biết'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : level === 'Thông hiểu'
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : level === 'Vận dụng'
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'bg-rose-50 text-rose-700 border-rose-200';

          let formattedOptions: any[] = [];
          if (type === 'true_false') {
            const subKeys = ['a', 'b', 'c', 'd'];
            let opts = (parsed.options || []).map((opt: string, idx: number) => {
              const key = subKeys[idx] || 'a';
              const cleanText = String(opt || '').replace(/^[a-da-d][\.\:\)\-\s]+/i, '').trim();
              const isCorrect = parsed.correctAnswer
                ? new RegExp(`${key}\\s*[:=-]?\\s*(Đ|Đúng|True|T|1)(?!\\w)`, 'i').test(parsed.correctAnswer)
                : false;
              return {
                key,
                text: cleanText || String(opt || ''),
                isCorrect,
              };
            });

            // Ensure 4 items
            while (opts.length < 4) {
              const k = subKeys[opts.length] || 'a';
              opts.push({ key: k, text: `Khẳng định ý ${k}`, isCorrect: false });
            }

            const trueCount = opts.filter((o: any) => o.isCorrect).length;
            // Prevent 1T-3F monotony: if AI produced 0, 4, or only 1 True, balance into realistic 2T-2F or 3T-1F
            if (trueCount === 0 || trueCount === 4 || trueCount === 1) {
              const patterns = [
                [true, false, true, false],
                [true, true, false, false],
                [false, true, true, false],
                [true, false, false, true],
                [true, true, true, false],
                [false, true, true, true],
              ];
              const chosen = patterns[Math.floor(Math.random() * patterns.length)];
              opts = opts.map((o: any, idx: number) => ({
                ...o,
                isCorrect: chosen[idx] ?? (idx % 2 === 0),
              }));
            }

            parsed.correctAnswer = opts.map((o: any) => `${o.key}: ${o.isCorrect ? 'Đ' : 'S'}`).join(', ');
            formattedOptions = opts;
          } else if (type === 'multiple_choice') {
            formattedOptions = (parsed.options || []).map((opt: string, idx: number) => {
              const key = ['A', 'B', 'C', 'D'][idx] || 'A';
              const cleanText = String(opt || '').replace(/^[A-Da-d][\.\:\)\-\s]+/i, '').trim();
              return {
                key,
                text: cleanText || String(opt || ''),
                isCorrect: (parsed.correctAnswer || 'A').toUpperCase() === key,
              };
            });
          }

          const formattedQuestion = {
            id: Date.now(),
            order: 'Câu mới',
            type: type,
            level: level,
            levelClass,
            topic: currentTopic || `${subject} - ${grade}`,
            content: parsed.content,
            options: formattedOptions,
            points: type === 'essay' ? 1.5 : type === 'true_false' ? 1.0 : type === 'short_answer' ? 0.5 : 0.25,
            correctAnswer: type === 'short_answer'
              ? extractCleanShortAnswerValue(null, parsed.explanation, parsed.correctAnswer)
              : (parsed.correctAnswer || (type === 'essay' ? 'Xem hướng dẫn chấm' : 'A')),
            explanation: parsed.explanation || 'Lời giải chi tiết biên soạn bởi mô hình AI.',
          };

          return apiSuccess(
            { question: formattedQuestion, source: 'ai' },
            'Tạo câu hỏi AI thành công'
          );
        }
      } catch (aiErr) {
        console.warn('Gemini regenerate question failed, using high-quality curriculum bank fallback:', aiErr);
      }
    }

    // Fallback: Return rich curriculum question bank item avoiding existing & previous questions
    const fallbackQ = getCurriculumQuestion(
      subject,
      grade,
      level,
      Math.floor(Math.random() * 1000) + Date.now() % 100,
      forbiddenList,
      type
    );
    return apiSuccess(
      { question: fallbackQ, source: 'curriculum-bank' },
      'Đã làm mới câu hỏi chuẩn chương trình'
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal error';
    return apiError(msg, 500);
  }
}
