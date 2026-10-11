import {
  AcademicDocumentRecord,
  ExtractedExamData,
  ExtractedLessonData,
  ParsedDocumentPayload,
} from '@/core/storage/academic-storage';

export class AcademicParser {
  /**
   * Cleans AI JSON output by stripping markdown fences.
   */
  private static extractJson(rawText: string): any {
    let clean = rawText.trim();
    if (clean.startsWith('```')) {
      clean = clean.replace(/^```[a-zA-Z]*\n?/, '').replace(/```\s*$/, '').trim();
    }
    try {
      return JSON.parse(clean);
    } catch {
      const firstBrace = clean.indexOf('{');
      const lastBrace = clean.lastIndexOf('}');
      if (firstBrace >= 0 && lastBrace > firstBrace) {
        return JSON.parse(clean.substring(firstBrace, lastBrace + 1));
      }
      throw new Error('AI output is not valid JSON');
    }
  }

  /**
   * Gọi LLM trả về chuỗi JSON với cơ chế multi-model fallback tự động
   */
  private static async callLlmJson(prompt: string): Promise<string> {
    const geminiKey = process.env.GEMINI_API_KEY?.split(/[,;\n]+/).map((k) => k.trim())[0];
    if (geminiKey && !geminiKey.includes('YourGemini')) {
      try {
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(geminiKey);
        const candidates = [
          'gemini-3.7-flash',
          'gemini-3.5-flash-lite',
          'gemini-3.1-flash-lite',
          'gemini-flash-lite-latest',
          'gemini-3-flash-preview',
          'gemini-flash-latest',
          'gemini-3.5-flash',
          'gemini-3.8-flash',
        ];

        for (const m of candidates) {
          try {
            const model = genAI.getGenerativeModel({
              model: m,
              generationConfig: { responseMimeType: 'application/json' },
            });
            const result = await model.generateContent(prompt);
            const text = result.response.text();
            if (text && text.trim()) return text.trim();
          } catch (mErr: any) {
            console.warn(`Gemini model ${m} call failed in AcademicParser:`, mErr?.message);
          }
        }
      } catch (geminiErr: any) {
        console.warn('Google Generative AI initialization failed:', geminiErr?.message);
      }
    }

    const openaiKey = process.env.OPENAI_API_KEY?.split(/[,;\n]+/).map((k) => k.trim())[0];
    if (openaiKey && !openaiKey.includes('your-openai')) {
      try {
        const { default: OpenAI } = await import('openai');
        const openai = new OpenAI({ apiKey: openaiKey });
        const resp = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
        });
        const text = resp.choices[0]?.message?.content;
        if (text && text.trim()) return text.trim();
      } catch (openaiErr: any) {
        console.warn('OpenAI call failed in AcademicParser:', openaiErr?.message);
      }
    }

    throw new Error('Không thể kết nối đến AI Provider để trích xuất JSON.');
  }

  /**
   * Bóc tách dữ liệu gốc (Đề kiểm tra -> Câu hỏi; Bài học -> Chủ đề, Nội dung, Câu hỏi)
   */
  public static async extractDocument(
    doc: AcademicDocumentRecord,
    preferredProvider?: string
  ): Promise<ParsedDocumentPayload> {
    const isExam = doc.docType === 'EXAM';

    let prompt = '';

    if (isExam) {
      prompt = `Bạn là Chuyên gia Khảo thí và Số hóa Đề thi hàng đầu tại Việt Nam.
NHIỆM VỤ: Hãy bóc tách CHÍNH XÁC 100% TOÀN BỘ các câu hỏi từ đề kiểm tra/đề thi sau đây.

QUY TẮC BẮT BUỘC:
1. KHÔNG tự sáng tác câu hỏi mới. Bóc tách trung thực nguyên văn toàn bộ các câu hỏi có trong tài liệu (bao gồm cả Phần Trắc nghiệm và Tự luận).
2. Giữ nguyên số thứ tự câu (Câu 1, Câu 2... hoặc Bài 1, Bài 2...).
3. Đối với câu trắc nghiệm:
   - "type": "MULTIPLE_CHOICE"
   - "options": Trích xuất đầy đủ các phương án ["A. ...", "B. ...", "C. ...", "D. ..."].
   - "correctAnswer": Xác định đáp án đúng chuẩn xác ("A", "B", "C" hoặc "D").
   - "explanation": Lời giải chi tiết từng bước cho câu hỏi.
4. Đối với câu tự luận / điền số:
   - "type": "ESSAY" hoặc "SHORT_ANSWER".
   - "options": để mảng rỗng [].
   - "correctAnswer": Đáp số hoặc hướng dẫn barem điểm.
   - "explanation": Lời giải chi tiết các bước.
5. Bảo toàn công thức Toán/KHTN dưới dạng LaTeX: $...$ hoặc $$...$$.
6. Phân loại chuẩn xác cognitiveLevel:
   - "KNOWLEDGE" (Nhận biết)
   - "COMPREHENSION" (Thông hiểu)
   - "APPLICATION" (Vận dụng)
   - "HIGH_APPLICATION" (Vận dụng cao)
7. CHỈ TRẢ VỀ DUY NHẤT 1 CHUỖI JSON HỢP LỆ.

THÔNG TIN ĐỀ THI:
- Tiêu đề: ${doc.title}
- Môn: ${doc.subject} | Khối: ${doc.grade}

NỘI DUNG ĐỀ THI GỐC CẦN BÓC TÁCH:
"""
${doc.rawContent.slice(0, 35000)}
"""

CẤU TRÚC JSON BẮT BUỘC TRẢ VỀ:
{
  "examTitle": "${doc.title}",
  "totalExtractedQuestions": 10,
  "questions": [
    {
      "questionNumber": 1,
      "type": "MULTIPLE_CHOICE",
      "cognitiveLevel": "KNOWLEDGE",
      "content": "Nội dung câu hỏi nguyên văn...",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "correctAnswer": "A",
      "explanation": "Lời giải chi tiết...",
      "points": 0.5
    }
  ]
}`;
    } else {
      prompt = `Bạn là Chuyên gia Sư phạm và Biên soạn Sách Giáo Khoa tại Việt Nam.
NHIỆM VỤ: Bóc tách cấu trúc bài học/chuyên đề và TẤT CẢ các câu hỏi, bài tập có trong tài liệu sau.

QUY TẮC BẮT BUỘC:
1. Bóc tách trung thực các chủ đề chính (mainTopics), lý thuyết cốt lõi (coreKnowledgePoints).
2. Trích xuất CHÍNH XÁC các bài tập, ví dụ, câu hỏi (extractedQuestions) có trong tài liệu.
3. Bảo toàn công thức LaTeX $...$ hoặc $$...$$.
4. CHỈ TRẢ VỀ DUY NHẤT 1 CHUỖI JSON HỢP LỆ.

THÔNG TIN TÀI LIỆU:
- Tiêu đề: ${doc.title}
- Môn: ${doc.subject} | Khối: ${doc.grade}

NỘI DUNG TÀI LIỆU GỐC:
"""
${doc.rawContent.slice(0, 35000)}
"""

CẤU TRÚC JSON PHẢI TRẢ VỀ:
{
  "lessonTitle": "${doc.title}",
  "mainTopics": [
    {
      "title": "Tên chủ đề / bài học...",
      "summary": "Tóm tắt mục tiêu kiến thức...",
      "keyConcepts": ["Khái niệm 1", "Khái niệm 2"]
    }
  ],
  "coreKnowledgePoints": [
    {
      "concept": "Tên định lý, công thức, quy tắc cốt lõi...",
      "details": "Nội dung chi tiết kèm công thức LaTeX $...$...",
      "notes": "Lưu ý sư phạm..."
    }
  ],
  "extractedQuestions": [
    {
      "questionNumber": 1,
      "type": "MULTIPLE_CHOICE",
      "cognitiveLevel": "COMPREHENSION",
      "content": "Nội dung bài tập / câu hỏi thực tế trong bài...",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "correctAnswer": "A",
      "explanation": "Phương pháp giải hoặc đáp án...",
      "points": 1.0
    }
  ]
}`;
    }

    try {
      const rawText = await this.callLlmJson(prompt);
      const parsedJson = this.extractJson(rawText);
      return parsedJson;
    } catch (err: any) {
      console.warn('AI Extraction failed, falling back to rule-based parser:', err?.message);
      return this.fallbackParse(doc);
    }
  }

  /**
   * Fallback rule-based parser khi không kết nối được AI
   */
  private static fallbackParse(doc: AcademicDocumentRecord): ParsedDocumentPayload {
    const lines = doc.rawContent.split('\n').map((l) => l.trim()).filter(Boolean);

    if (doc.docType === 'EXAM') {
      const questions: any[] = [];
      let currentQ: any = null;
      let qNum = 1;

      for (const line of lines) {
        const qMatch = line.match(/^(?:Câu|Bài|Question)\s*(\d+)[:.]\s*(.*)/i);
        if (qMatch) {
          if (currentQ) questions.push(currentQ);
          currentQ = {
            questionNumber: parseInt(qMatch[1], 10) || qNum++,
            type: 'MULTIPLE_CHOICE',
            cognitiveLevel: 'COMPREHENSION',
            content: qMatch[2] || line,
            options: [],
            correctAnswer: 'A',
            explanation: 'Xem lại kiến thức lý thuyết tương ứng.',
            points: 0.25,
          };
          continue;
        }

        const optMatch = line.match(/^([A-D])[.:]\s*(.*)/i);
        if (optMatch && currentQ) {
          currentQ.options.push(`${optMatch[1].toUpperCase()}. ${optMatch[2]}`);
          continue;
        }

        if (currentQ) {
          if (currentQ.options.length === 0) {
            currentQ.content += ' ' + line;
          }
        }
      }

      if (currentQ) questions.push(currentQ);

      if (questions.length === 0) {
        questions.push({
          questionNumber: 1,
          type: 'MULTIPLE_CHOICE',
          cognitiveLevel: 'KNOWLEDGE',
          content: doc.rawContent.slice(0, 200),
          options: ['A. Phương án 1', 'B. Phương án 2', 'C. Phương án 3', 'D. Phương án 4'],
          correctAnswer: 'A',
          explanation: 'Bóc tách trực tiếp từ văn bản gốc.',
          points: 1.0,
        });
      }

      return {
        examTitle: doc.title,
        totalExtractedQuestions: questions.length,
        questions,
      } as ExtractedExamData;
    } else {
      return {
        lessonTitle: doc.title,
        mainTopics: [
          {
            title: doc.title,
            summary: `Tổng hợp kiến thức trọng tâm môn ${doc.subject} ${doc.grade}.`,
            keyConcepts: ['Khái niệm cốt lõi', 'Quy tắc ứng dụng'],
          },
        ],
        coreKnowledgePoints: [
          {
            concept: 'Kiến thức trọng tâm bài học',
            details: doc.rawContent.slice(0, 300),
            notes: 'Cần nắm vững lý thuyết và các ví dụ rèn luyện.',
          },
        ],
        extractedQuestions: [
          {
            questionNumber: 1,
            type: 'SHORT_ANSWER',
            cognitiveLevel: 'KNOWLEDGE',
            content: `Nêu các nội dung chính của bài học ${doc.title}?`,
            options: [],
            correctAnswer: 'Xem nội dung bài học',
            explanation: 'Dựa trên phần lý thuyết cơ bản.',
            points: 1.0,
          },
        ],
      } as ExtractedLessonData;
    }
  }

  /**
   * Sử dụng dữ liệu đã tách để AI viết thành một Kỹ năng sư phạm (AI Skill)
   */
  public static async generateSkillFromDocument(
    doc: AcademicDocumentRecord,
    preferredProvider?: string
  ): Promise<{
    title: string;
    description: string;
    skillInstructions: string;
    fewShotExamples: any[];
  }> {
    let parsedContext = '';
    let sampleQuestions: any[] = [];

    if (doc.parsedData) {
      try {
        const parsed = JSON.parse(doc.parsedData);
        if ('questions' in parsed && Array.isArray(parsed.questions)) {
          sampleQuestions = parsed.questions.slice(0, 4);
          parsedContext = `Các câu hỏi tiêu biểu đã bóc tách từ đề thi:\n` + JSON.stringify(sampleQuestions, null, 2);
        } else if ('mainTopics' in parsed) {
          sampleQuestions = (parsed.extractedQuestions || []).slice(0, 4);
          parsedContext = `Chủ đề và kiến thức trọng tâm:\n` + JSON.stringify({
            topics: parsed.mainTopics,
            corePoints: parsed.coreKnowledgePoints,
            sampleExercises: sampleQuestions,
          }, null, 2);
        }
      } catch {
        parsedContext = doc.rawContent.slice(0, 3000);
      }
    } else {
      parsedContext = doc.rawContent.slice(0, 3000);
    }

    const prompt = `Bạn là Chuyên gia Sư phạm và Kỹ sư Prompt Engineering Giáo dục cao cấp tại Việt Nam.
NHIỆM VỤ: Dựa trên dữ liệu học thuật đã bóc tách, hãy đúc kết thành một "KỸ NĂNG RA ĐỀ CHO AI" (AI Exam Generation Skill).
Kỹ năng này sẽ được dùng làm bộ quy chuẩn sư phạm để AI tạo ra các đề thi mới bám sát chuẩn kiến thức, phân hóa Bloom và phong cách sư phạm của tài liệu này.

YÊU CẦU ĐẦU RA (JSON BẮT BUỘC):
{
  "title": "Tên kỹ năng súc tích, chuyên nghiệp",
  "description": "Mô tả 1-2 câu về phạm vi và giá trị của kỹ năng",
  "skillInstructions": "Bộ quy chuẩn sư phạm chi tiết: Ma trận nhận thức, Dạng bài trọng tâm, Quy tắc đặt bẫy sai lầm, Hướng dẫn giải",
  "fewShotExamples": [ /* 2-3 câu hỏi mẫu tiêu biểu trích lọc từ dữ liệu */ ]
}

THÔNG TIN TÀI LIỆU GỐC:
- Môn học: ${doc.subject} | Khối: ${doc.grade}
- Tiêu đề: ${doc.title}
- Loại: ${doc.docType === 'EXAM' ? 'Đề kiểm tra' : 'Bài học / Chuyên đề'}

DỮ LIỆU ĐÃ BÓC TÁCH:
"""
${parsedContext}
"""`;

    try {
      const rawText = await this.callLlmJson(prompt);
      const parsedJson = this.extractJson(rawText);

      return {
        title: parsedJson.title || `Kỹ năng ra đề ${doc.subject} ${doc.grade} - ${doc.title}`,
        description: parsedJson.description || `Được trích xuất và tổng hợp từ tài liệu học thuật "${doc.title}".`,
        skillInstructions: parsedJson.skillInstructions || parsedJson.instructions || 'Tuân thủ chuẩn ma trận và phân hóa nhận thức.',
        fewShotExamples: parsedJson.fewShotExamples || sampleQuestions,
      };
    } catch {
      return {
        title: `Kỹ năng ra đề ${doc.subject} ${doc.grade} - ${doc.title}`,
        description: `Quy tắc sư phạm bám sát chuẩn kiến thức tài liệu "${doc.title}".`,
        skillInstructions: `1. MỤC TIÊU SƯ PHẠM:
- Bám sát trọng tâm kiến thức: ${doc.title} (${doc.subject} - ${doc.grade}).
- Đảm bảo phân hóa 4 cấp độ: Nhận biết (40%), Thông hiểu (30%), Vận dụng (20%), Vận dụng cao (10%).

2. ĐẶC TRƯNG DẠNG BÀI:
- Trình bày công thức Toán/KHTN chuẩn ký hiệu LaTeX $...$.
- Phương án nhiễu phải xuất phát từ các sai lầm tư duy điển hình của học sinh.

3. LỜI GIẢI & BAREM:
- Lời giải chi tiết từng bước, nêu rõ công thức áp dụng và kết luận đáp số.`,
        fewShotExamples: sampleQuestions.length > 0 ? sampleQuestions : [
          {
            questionNumber: 1,
            type: 'MULTIPLE_CHOICE',
            cognitiveLevel: 'COMPREHENSION',
            content: `Ví dụ mẫu chuẩn trích từ ${doc.title}`,
            options: ['A. Phương án chuẩn', 'B. Phương án sai', 'C. Phương án sai', 'D. Phương án sai'],
            correctAnswer: 'A',
            explanation: 'Dựa trên định lý và phương pháp giải trong bài.',
          },
        ],
      };
    }
  }
}
