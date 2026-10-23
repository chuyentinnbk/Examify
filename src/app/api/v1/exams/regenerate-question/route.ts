import { NextRequest } from 'next/server';
import { z } from 'zod';
import { AIFactory, SupportedAIProvider } from '@/core/ai/ai-factory';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { apiError, apiSuccess, parseAiJson } from '@/lib/utils';
import { getCurriculumQuestion, extractCleanShortAnswerValue } from '@/lib/curriculum-questions';
import { ExamPromptBuilder } from '@/core/ai/prompt-builder';
import { normalizeSvgGeometry } from '@/lib/exam-sections';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const RegenerateQuestionSchema = z.object({
  subject: z.string().default('Toán học'),
  grade: z.string().default('Lớp 12'),
  term: z.string().optional(),
  level: z.string().default('Thông hiểu'),
  type: z.enum(['multiple_choice', 'true_false', 'short_answer', 'essay']).optional(),
  currentTopic: z.string().optional(),
  customPrompt: z.string().max(1500).optional(),
  teacherDirective: z.string().max(1500).optional(),
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
      teacherDirective,
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

${
  teacherDirective || customPrompt
    ? `### CHỈ THỊ ƯU TIÊN CAO NHẤT TỪ GIÁO VIÊN ĐỐI VỚI CÂU HỎI NÀY:
⚠️ GIÁO VIÊN ĐẶC BIỆT YÊU CẦU: "${teacherDirective || customPrompt}".
BẠN BẮT BUỘC PHẢI THỰC HIỆN ĐÚNG 100% THEO CHỈ THỊ NÀY (về bài học cụ thể, dạng toán, độ khó, bối cảnh thực tế...). Mọi yêu cầu của giáo viên có hiệu lực ưu tiên cao nhất!\n`
    : ''
}
### QUY CHUẨN CÂU HỎI VẬN DỤNG & VẬN DỤNG CAO (REAL-WORLD MODELING):
- Nếu câu hỏi ở cấp độ Vận dụng hoặc Vận dụng cao:
  * TUYỆT ĐỐI NGHIÊM CẤM ra đề bài cộc cằn, thuần túy hình thức toán học ("Cho tam giác có 3 cạnh... tính góc").
  * BẮT BUỘC đặt bài toán vào bối cảnh thực tiễn đời sống sinh động ("văn thơ", giàu ngôn ngữ thực tế): đo khoảng cách giữa hai ngôi nhà X và Y bị ngăn cách bởi hồ nước/dòng sông; vị trí tàu cứu hộ; tối ưu hóa chi phí sản xuất, vòm cầu parabol; lều cắm trại dã ngoại hình chóp... Lời văn tự nhiên, kích thích tư duy chuẩn GDPT 2018.

### QUY CHUẨN ĐỒ HỌA HÌNH HỌC BẰNG VECTOR SVG:
- Đối với câu hỏi Hình học (Hình học không gian hoặc hình học phẳng):
  * PHÂN BIỆT ĐỀ BÀI VÀ LỜI GIẢI:
    - Trong "content" (Đề bài): CHỈ nhúng hình vẽ SVG khi bài toán có ngữ cảnh thực tế (chiếc lều, vòm cầu, bể nước...) HOẶC đề bài nói rõ "như hình vẽ bên", "dựa vào hình sau". Với câu hình học thuần túy (như "Cho hình chóp S.ABC..."), KHÔNG vẽ hình vào đề bài để học sinh tự rèn kỹ năng vẽ hình.
    - Trong "explanation" (Lời giải): BẮT BUỘC 100% các câu hình học đều phải có hình vẽ SVG đầy đủ (gồm đường cao, nét đứt nét liền và các điểm phụ dựng thêm) để minh họa rõ ràng các bước chứng minh/tính toán.
  * BẮT BUỘC SỬ DỤNG HỆ TỌA ĐỘ MẪU CHUẨN (GOLDEN COORDINATES TEMPLATES) - TUYỆT ĐỐI CẤM TỰ BỊA TỌA ĐỘ KHIẾN HÌNH BỊ MÉO MÓ:
    - HÌNH HỘP CHỮ NHẬT / LẬP PHƯƠNG ABCD.A'B'C'D' (CHUẨN SGK HÌNH HỌC KHÔNG GIAN VIỆT NAM):
      Quy ước: Đỉnh A ở góc trong cùng bên trái (khuất). Đáy dưới ABCD, đáy trên A'B'C'D'.
      Đáy trên A'B'C'D' (toàn bộ nét liền ở trên cao): <polygon points="80,50 50,90 190,90 220,50" fill="none" stroke="black" stroke-width="1.5" />
      3 cạnh bên đứng nhìn thấy (nét liền): B'B(50,90 -> 50,180), C'C(190,90 -> 190,180), D'D(220,50 -> 220,140).
      2 cạnh đáy dưới nhìn thấy (nét liền): BC(50,180 -> 190,180), CD(190,180 -> 220,140).
      3 CẠNH KHUẤT DUY NHẤT ĐI QUA ĐỈNH A BÊN TRONG (BẮT BUỘC NÉT ĐỨT stroke-dasharray="4,4"):
      - Cạnh bên đứng A'A: <line x1="80" y1="50" x2="80" y2="140" stroke="black" stroke-width="1.5" stroke-dasharray="4,4" />
      - Cạnh đáy AB: <line x1="80" y1="140" x2="50" y2="180" stroke="black" stroke-width="1.5" stroke-dasharray="4,4" />
      - Cạnh đáy AD: <line x1="80" y1="140" x2="220" y2="140" stroke="black" stroke-width="1.5" stroke-dasharray="4,4" />
      Nhãn đỉnh chuẩn không đè nét: A'(75,40), B'(32,95), C'(198,95), D'(228,48), A(88,136), B(32,190), C(195,195), D(228,145).
    - HÌNH LĂNG TRỤ TAM GIÁC ABC.A'B'C' (ĐỈNH B Ở PHÍA SAU): Đáy trên A'B'C': <polygon points="60,60 140,40 220,60" fill="none" stroke="black" stroke-width="1.5" />. Cạnh bên A'A, C'C nét liền; đáy dưới AC nét liền. Cạnh khuất qua B: B'B, AB, CB nét đứt (stroke-dasharray="4,4").
    - HÌNH LĂNG TRỤ TAM GIÁC ABC.A'B'C' (ĐỈNH A/A' Ở PHÍA TRƯỚC, B/B' VÀ C/C' Ở PHÍA SAU):
      Đáy trên A'B'C' (BẮT BUỘC KHÉP KÍN 3 CẠNH kể cả cạnh sau B'C'): <polygon points="70,50 140,75 220,50" fill="none" stroke="black" stroke-width="1.5" />.
      3 cạnh bên đứng nhìn thấy (nét liền): B'B(70,50 -> 70,150), A'A(140,75 -> 140,175), C'C(220,50 -> 220,150).
      2 cạnh đáy dưới nhìn thấy (nét liền): BA(70,150 -> 140,175), AC(140,175 -> 220,150).
      1 cạnh đáy dưới khuất sau duy nhất (nét đứt): BC(70,150 -> 220,150 stroke-dasharray="4,4").
      TUYỆT ĐỐI KHÔNG ĐƯỢC QUÊN CẠNH TRÊN B'C'! Dùng thẻ <polygon points="70,50 140,75 220,50" /> để tự động vẽ cả 3 cạnh đáy trên. Nhãn: B'(60,42), A'(148,72), C'(228,42), B(50,155), A(136,195), C(228,155).
    - HÌNH CHÓP S.ABC (SA VUÔNG GÓC ĐÁY): Đỉnh S(90,35), A(90,130), B(45,175), C(235,175). SA, AB, AC nét đứt; SB, SC, BC nét liền. Nhãn S(88,22), A(72,132), B(28,185), C(245,185).
    - HÌNH CHÓP S.ABCD (SA VUÔNG GÓC ĐÁY): Đỉnh S(80,35), A(80,130), B(40,175), C(190,175), D(230,130). SA, AB, AD nét đứt; SB, SC, SD, BC, CD nét liền.
    - ĐOẠN VUÔNG GÓC CHUNG a VÀ b: a ngang (40,50 -> 260,50); b xiên (50,165 -> 250,135); đoạn HK (140,50 -> 140,150 thẳng đứng).
  * ĐẶC BIỆT ĐỐI VỚI TOÁN LỚP 12: ĐÂY LÀ HỌC SINH LỚP 12 ÔN THI TỐT NGHIỆP / ĐGNL, TUYỆT ĐỐI NGHIÊM CẤM RA CÂU HỎI ĐỊNH NGHĨA LÝ THUYẾT SGK LỚP 11 (CẤM: "Đoạn vuông góc chung được định nghĩa bằng đoạn nào?", "Khoảng cách giữa đường thẳng và mp song song bằng đoạn nào?"). Bắt buộc phải là bài toán tính toán cụ thể có số đo tham số a, a√2, a√3 hoặc gắn tọa độ Oxyz để tính khoảng cách!
  * Cạnh nhìn thấy: nét liền (stroke="black" stroke-width="1.5").
  * Cạnh bị khuất, đường cao, đường trung tuyến: nét đứt (stroke="black" stroke-width="1.5" stroke-dasharray="4,4").
  * Đoạn thẳng & đường phụ: Dùng thẻ <line x1="..." y1="..." x2="..." y2="..." stroke="black" ... /> (TUYỆT ĐỐI CẤM dùng points trong thẻ <line>). Vẽ đa giác thì dùng <polygon points="..." fill="none" />.
  * Nhãn đỉnh (S, A, B, C...): Dùng <text>, đặt lệch ra ngoài đỉnh ít nhất 12-18px. TUYỆT ĐỐI KHÔNG ĐỂ CHỮ ĐÈ LÊN ĐƯỜNG THẲNG HOẶC ĐÈ LÊN NHAU!
  * KÝ HIỆU VUÔNG GÓC (RIGHT-ANGLE MARK):
    - BẮT BUỘC dùng 1 thẻ <polyline> liên tục (fill="none" stroke="black" stroke-width="1"), nhỏ gọn khoảng 8-10px, hai cạnh phải song song với 2 cạnh chứa góc vuông theo phối cảnh 3D.
    - TUYỆT ĐỐI KHÔNG vẽ các nét gãy rời rạc, méo mó, xiên lệch hoặc đè lên chữ cái! NẾU KHÔNG TÍNH ĐƯỢC TỌA ĐỘ PHỐI CẢNH CHUẨN XÁC, HÃY BỎ QUA KÝ HIỆU VUÔNG GÓC (để giả thiết trong đề bài nêu "$SA \\perp (ABC)$") chứ KHÔNG ĐƯỢC vẽ cẩu thả!

### QUY TẮC BẮT BUỘC (CRITICAL MANDATE):
1. Đúng 100% phạm vi kiến thức khối lớp ${grade}, môn ${subject}, học kỳ ${term} và bám sát chủ đề "${currentTopic || subject}".
2. TUYỆT ĐỐI KHÔNG TRÙNG LẶP CÂU HỎI VỪA BỊ THAY THẾ HOẶC ĐÃ CÓ:
${currentQuestionContent ? `- Câu hỏi hiện tại vừa bị bấm tạo lại (TUYỆT ĐỐI KHÔNG DÙNG LẠI HOẶC TẠO TƯƠNG TỰ CÂU NÀY):\n  "${currentQuestionContent.slice(0, 300)}"` : ''}
${forbiddenList.length > 0 ? `Các câu hỏi khác đã từng xuất hiện trong đề thi (TUYỆT ĐỐI KHÔNG TRÙNG):\n${forbiddenList.slice(-10).map((q, i) => `- ${q.slice(0, 150)}`).join('\n')}` : ''}
3. ĐỔI MỚI SÁNG TẠO: Tạo câu hỏi mới mẻ với số liệu, hàm số, biến số hoặc tình huống hoàn toàn khác biệt, mang lại trải nghiệm tươi mới cho giáo viên.`;

        const candidateModels = Array.from(
          new Set(
            [
              process.env.GEMINI_MODEL?.split(/[,;]+/)[0]?.trim(),
              'gemini-3.7-flash',
              'gemini-3.5-flash',
              'gemini-3.8-flash',
            ].filter(Boolean) as string[]
          )
        );

        let result: any = null;
        let lastError: any = null;

        for (const candidateModel of candidateModels) {
          try {
            const genAI = new GoogleGenerativeAI(geminiKey);
            const model = genAI.getGenerativeModel({
              model: candidateModel,
              generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.85,
              },
            });

            result = await model.generateContent(prompt);
            if (result?.response?.text()) {
              break;
            }
          } catch (err) {
            lastError = err;
            await new Promise((r) => setTimeout(r, 1000));
          }
        }

        if (!result && lastError) {
          throw lastError;
        }

        const text = result.response.text();
        const parsed = parseAiJson(text);

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
            content: normalizeSvgGeometry(parsed.content),
            options: formattedOptions,
            points: type === 'essay' ? 1.5 : type === 'true_false' ? 1.0 : type === 'short_answer' ? 0.5 : 0.25,
            correctAnswer: type === 'short_answer'
              ? extractCleanShortAnswerValue(null, parsed.explanation, parsed.correctAnswer)
              : (parsed.correctAnswer || (type === 'essay' ? 'Xem hướng dẫn chấm' : 'A')),
            explanation: normalizeSvgGeometry(parsed.explanation || 'Lời giải chi tiết biên soạn bởi mô hình AI.'),
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
