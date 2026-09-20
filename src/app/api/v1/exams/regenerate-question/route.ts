import { NextRequest } from 'next/server';
import { z } from 'zod';
import { AIFactory, SupportedAIProvider } from '@/core/ai/ai-factory';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { apiError, apiSuccess } from '@/lib/utils';
import { getCurriculumQuestion } from '@/lib/curriculum-questions';

const RegenerateQuestionSchema = z.object({
  subject: z.string().default('Toán học'),
  grade: z.string().default('Lớp 12'),
  level: z.string().default('Thông hiểu'),
  type: z.enum(['multiple_choice', 'true_false', 'short_answer', 'essay']).optional(),
  currentTopic: z.string().optional(),
  customPrompt: z.string().max(1000).optional(),
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

    const { subject, grade, level, type = 'multiple_choice', currentTopic, customPrompt, existingQuestions = [] } = validation.data;

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

    if (geminiKey) {
      try {
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({
          model: process.env.GEMINI_MODEL?.split(/[,;]+/)[0]?.trim() || 'gemini-3.6-flash',
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.6,
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
          typeInstruction = `Hãy tạo MỘT (1) câu hỏi trắc nghiệm ĐÚNG / SAI (gồm bối cảnh/nội dung chung và 4 ý khẳng định a, b, c, d độc lập) theo chuẩn GDPT 2018 cho môn: ${subject}, khối: ${grade}, cấp độ Bloom: ${bloomLevel}.
Định dạng JSON trả về:
{
  "content": "Bối cảnh hoặc đề bài toán...",
  "options": ["Nội dung khẳng định ý a", "Nội dung khẳng định ý b", "Nội dung khẳng định ý c", "Nội dung khẳng định ý d"],
  "correctAnswer": "a: Đúng, b: Sai, c: Đúng, d: Sai",
  "explanation": "Giải thích chi tiết tính đúng/sai của từng ý a, b, c, d..."
}`;
        } else if (type === 'short_answer') {
          typeInstruction = `Hãy tạo MỘT (1) câu hỏi TRẮC NGHIỆM TRẢ LỜI NGẮN (thí sinh chỉ điền đáp số/kết quả cuối cùng, không có lựa chọn A,B,C,D) theo chuẩn GDPT 2018 cho môn: ${subject}, khối: ${grade}, cấp độ Bloom: ${bloomLevel}.
Định dạng JSON trả về:
{
  "content": "Nội dung bài toán yêu cầu tìm đáp số...",
  "options": [],
  "correctAnswer": "12",
  "explanation": "Các bước tính toán chi tiết dẫn tới kết quả 12..."
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

        const prompt = `Bạn là chuyên gia khảo thí biên soạn đề thi chuẩn GDPT 2018 tại Việt Nam.
${typeInstruction}
Chuyên đề/Chủ đề: ${currentTopic || subject}
QUY TẮC BẮT BUỘC: Không được trùng lặp với bất kỳ câu hỏi nào đã có trong đề thi.
${customPrompt ? `Yêu cầu thêm từ giáo viên: ${customPrompt}` : ''}
${existingQuestions.length > 0 ? `Các câu hỏi đã có trong đề (TUYỆT ĐỐI KHÔNG TRÙNG NỘI DUNG):\n${existingQuestions.slice(-5).map((q, i) => `- ${q}`).join('\n')}` : ''}`;

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
            formattedOptions = (parsed.options || []).map((opt: string, idx: number) => {
              const key = subKeys[idx] || 'a';
              const cleanText = String(opt || '').replace(/^[a-da-d][\.\:\)\-\s]+/i, '').trim();
              const isCorrect = parsed.correctAnswer
                ? new RegExp(`${key}\\s*[:=-]?\\s*(Đ|Đúng|True|T|1)`, 'i').test(parsed.correctAnswer)
                : idx % 2 === 0;
              return {
                key,
                text: cleanText || String(opt || ''),
                isCorrect,
              };
            });
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
            correctAnswer: parsed.correctAnswer || (type === 'essay' ? 'Xem hướng dẫn chấm' : 'A'),
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

    // Fallback: Return rich curriculum question bank item avoiding existing questions
    const fallbackQ = getCurriculumQuestion(
      subject,
      grade,
      level,
      Math.floor(Math.random() * 100),
      existingQuestions
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
