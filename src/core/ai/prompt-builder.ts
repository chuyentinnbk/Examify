import { ExamType } from '@prisma/client';
import { ExamGenerationPayload } from './types';
import { PromptGuard } from '@/core/security/prompt-guard';
import { calculateMinOneCognitiveCounts } from '@/lib/exam-sections';

export interface BuiltPrompt {
  systemPrompt: string;
  userPrompt: string;
  sanitizationNotes?: string[];
}

export class ExamPromptBuilder {
  /**
   * Translates exam type into Vietnamese & English academic specifications.
   */
  private static getExamTypeSpecs(examType: ExamType): { name: string; focus: string } {
    switch (examType) {
      case ExamType.MIN_15:
        return {
          name: '15-Minute Quiz (Kiểm tra 15 phút)',
          focus: 'Quick knowledge assessment focusing directly on recent lessons with straightforward questions.',
        };
      case ExamType.MID_TERM:
        return {
          name: 'Mid-Term Examination (Kiểm tra Giữa kỳ)',
          focus: 'Comprehensive mid-semester evaluation balancing foundational theory and practical problem-solving.',
        };
      case ExamType.FINAL_TERM:
        return {
          name: 'Final-Term Examination (Kiểm tra Cuối kỳ / Học kỳ)',
          focus: 'Full semester mastery exam covering all core topics, multi-concept problems, and deep understanding.',
        };
      case ExamType.ENTRANCE:
        return {
          name: 'Entrance / Selection Examination (Khảo sát Đầu vào / Tuyển sinh)',
          focus: 'High-discrimination placement exam with advanced questions testing analytical thinking and problem synthesis.',
        };
    }
  }

  /**
   * Constructs the System and User prompts for LLM execution.
   */
  public static build(payload: ExamGenerationPayload): BuiltPrompt {
    const {
      curriculum,
      examType,
      durationMinutes,
      totalPoints,
      totalQuestions,
      cognitiveMatrix = { knowledge: 40, comprehension: 30, application: 20, highApplication: 10 },
      customPrompt,
      language = 'Vietnamese',
    } = payload;

    const examSpecs = this.getExamTypeSpecs(examType);

    // 1. Sanitize custom teacher instructions with PromptGuard
    let safeCustomPrompt = '';
    const sanitizationNotes: string[] = [];

    if (customPrompt) {
      const guardResult = PromptGuard.sanitize(customPrompt);
      if (guardResult.isValid && guardResult.sanitizedText) {
        safeCustomPrompt = guardResult.sanitizedText;
      } else if (!guardResult.isValid) {
        sanitizationNotes.push(
          `Custom prompt was blocked by PromptGuard: ${guardResult.rejectionReason}`
        );
      }
    }

    // 2. Build the System Directive
    let systemPrompt = `You are an elite educational assessment and pedagogical examination engine ("Examify AI").
Your sole objective is to author high-quality, academically rigorous, and curriculum-aligned exam questions formatted strictly as a single valid JSON object.

### CRITICAL ANTI-DUPLICATION & QUALITY RULES:
1. ABSOLUTELY ZERO DUPLICATE QUESTIONS: Every single question in the generated exam must be 100% unique, distinct, and independent. Under NO circumstances should two questions have identical, repetitive, or near-identical problem statements, parameters, contexts, or answer choices.
2. DIVERSE CURRICULUM COVERAGE: Broadly distribute questions across different topics, sub-skills, theories, and practical applications within the specified subject and grade.
3. OUTPUT ONLY RAW VALID JSON: Never output markdown code fences (like \`\`\`json), markdown explanations, or conversational filler.
4. STRICT JSON SCHEMA: The entire exam output must adhere strictly to the JSON schema.
5. PRECISE & PEDAGOGICAL: Questions must be unambiguous, factually accurate, and mathematically verified.
6. QUESTION TYPES & SPECIFICATIONS:
   - MULTIPLE_CHOICE: 4 distinct choices (A, B, C, D) in "options", exactly one correct option in "correctAnswer" ("A", "B", "C", or "D").
   - TRUE_FALSE (Đúng / Sai): 1 question statement with context, plus exactly 4 sub-items in "options" corresponding to a, b, c, d. "correctAnswer" formatted as "a: Đ, b: S, c: Đ, d: S" (or "a: Đúng, b: Sai, c: Đúng, d: Đúng").
   - SHORT_ANSWER (Trả lời ngắn):
     * Yêu cầu bài toán dẫn đến một đáp số cụ thể. "options" bắt buộc là mảng rỗng [].
     * BẮT BUỘC GIẢI CHI TIẾT TRƯỚC: Bạn PHẢI tính toán cẩn thận từng bước trong "explanation" trước khi kết luận đáp số.
     * "correctAnswer" PHẢI LÀ KẾT QUẢ SỐ HỌC HOẶC BIỂU THỨC RÚT GỌN CHÍNH XÁC (ví dụ: "15", "-4.5", "2/3", "\\sqrt{2}").
     * TUYỆT ĐỐI KHÔNG điền chữ cái A, B, C, D vào correctAnswer của SHORT_ANSWER.
     * TUYỆT ĐỐI KHÔNG dùng số mặc định hay đoán mò. Mọi đáp số phải khớp 100% với lời giải trong explanation.
   - ESSAY (Tự luận): Multi-step analytical problem. "options" must be empty array []. "correctAnswer": "Xem hướng dẫn chấm". "explanation" must provide step-by-step scoring rubric with partial points.
7. DETAILED EXPLANATIONS: Provide step-by-step pedagogical explanations and clear scoring rubrics for all questions.
8. LANGUAGE: All content, options, and explanations must be in: ${language}.`;

    if (payload.appliedSkills && payload.appliedSkills.length > 0) {
      systemPrompt += `\n\n### HIGHEST PRIORITY MANDATE - ENFORCE SPECIALIZED PEDAGOGICAL SKILLS & STRICT ZERO-DUPLICATION:
You have been provided with specialized pedagogical skills extracted from official academic materials. You MUST apply the question styles, difficulty tiers, and pedagogical rigor defined in these skills:
- TUYỆT ĐỐI KHÔNG COPY NGUYÊN VĂN CÂU MẪU: Treat few-shot examples solely as structural templates. Author 100% fresh, novel questions with completely different parameters, numbers, context, and functions.
- KHÔNG LẶP LẠI DẠNG TOÁN HAY PHƯƠNG TRÌNH: Every single question in the exam MUST test a different sub-topic, formula, or concept. Never create multiple questions that solve the same equation pattern with trivial variable changes.
- TOÀN DIỆN CHƯƠNG TRÌNH: Đảm bảo phủ đều các chủ đề, chuyên đề và bài học của môn học trong học kỳ, không dồn vào một dạng bài duy nhất.`;
    }

    // 2.5 Grade-level curriculum directives (GDPT 2018)
    const gradeDirectives = this.getCurriculumGradeDirectives(curriculum.grade, curriculum.subject);
    if (gradeDirectives) {
      systemPrompt += `\n\n${gradeDirectives}`;
    }

    // 3. Assemble Curriculum Hierarchy Details
    const curriculumHierarchy = `
- Education Level: ${curriculum.level}
- Grade: ${curriculum.grade}
- Subject: ${curriculum.subject}
- Semester: ${curriculum.semester}
${curriculum.topic ? `- Topic: ${curriculum.topic}` : ''}
${curriculum.lesson ? `- Lesson Focus: ${curriculum.lesson}` : ''}
`.trim();

    // 4. Assemble Matrix & Structure Specifications
    let sectionSpecs = '';
    if (payload.sectionDistribution) {
      const dist = payload.sectionDistribution;
      const parts: string[] = [];

      if (dist.multipleChoice && dist.multipleChoice.count > 0) {
        const counts = calculateMinOneCognitiveCounts(dist.multipleChoice.count, dist.multipleChoice.matrix);
        parts.push(`- PHẦN I: CÂU TRẮC NGHIỆM NHIỀU PHƯƠNG ÁN LỰA CHỌN (MULTIPLE_CHOICE)
  * Số lượng: ĐÚNG ${dist.multipleChoice.count} câu
  * Phân bổ mức độ nhận thức cụ thể:
    + ${counts.knowledge} câu Nhận biết (KNOWLEDGE)
    + ${counts.comprehension} câu Thông hiểu (COMPREHENSION)
    + ${counts.application} câu Vận dụng (APPLICATION)
    + ${counts.highApplication} câu Vận dụng cao (HIGH_APPLICATION)`);
      }

      if (dist.trueFalse && dist.trueFalse.count > 0) {
        const counts = calculateMinOneCognitiveCounts(dist.trueFalse.count, dist.trueFalse.matrix);
        parts.push(`- PHẦN II: CÂU TRẮC NGHIỆM ĐÚNG SAI (TRUE_FALSE)
  * Số lượng: ĐÚNG ${dist.trueFalse.count} câu (mỗi câu gồm ngữ cảnh chung và 4 ý khẳng định a, b, c, d độc lập)
  * Phân bổ mức độ nhận thức cụ thể:
    + ${counts.knowledge} câu Nhận biết (KNOWLEDGE)
    + ${counts.comprehension} câu Thông hiểu (COMPREHENSION)
    + ${counts.application} câu Vận dụng (APPLICATION)
    + ${counts.highApplication} câu Vận dụng cao (HIGH_APPLICATION)`);
      }

      if (dist.shortAnswer && dist.shortAnswer.count > 0) {
        const counts = calculateMinOneCognitiveCounts(dist.shortAnswer.count, dist.shortAnswer.matrix);
        parts.push(`- PHẦN III: CÂU TRẮC NGHIỆM TRẢ LỜI NGẮN (SHORT_ANSWER)
  * Số lượng: ĐÚNG ${dist.shortAnswer.count} câu (options: [], correctAnswer là đáp số số học/biểu thức rút gọn chính xác)
  * Phân bổ mức độ nhận thức cụ thể:
    + ${counts.knowledge} câu Nhận biết (KNOWLEDGE)
    + ${counts.comprehension} câu Thông hiểu (COMPREHENSION)
    + ${counts.application} câu Vận dụng (APPLICATION)
    + ${counts.highApplication} câu Vận dụng cao (HIGH_APPLICATION)`);
      }

      if (dist.essay && dist.essay.count > 0) {
        const counts = calculateMinOneCognitiveCounts(dist.essay.count, dist.essay.matrix);
        parts.push(`- PHẦN IV: TỰ LUẬN (ESSAY)
  * Số lượng: ĐÚNG ${dist.essay.count} câu
  * Phân bổ mức độ nhận thức cụ thể:
    + ${counts.knowledge} câu Nhận biết (KNOWLEDGE)
    + ${counts.comprehension} câu Thông hiểu (COMPREHENSION)
    + ${counts.application} câu Vận dụng (APPLICATION)
    + ${counts.highApplication} câu Vận dụng cao (HIGH_APPLICATION)`);
      }

      if (parts.length > 0) {
        sectionSpecs = `\n\n### CẤU TRÚC VÀ ĐẶC TẢ CHI TIẾT TỪNG PHẦN (BẮT BUỘC TUÂN THỦ 100% SỐ CÂU VÀ MỨC ĐỘ TỪNG PHẦN):\n${parts.join('\n\n')}`;
      }
    }

    const matrixSpecs = `
- Total Duration: ${durationMinutes} minutes
- Total Score: ${totalPoints} points
- Total Number of Questions: ${totalQuestions}
- Cognitive Distribution Matrix:
  * Knowledge (Nhận biết): ${cognitiveMatrix.knowledge}%
  * Comprehension (Thông hiểu): ${cognitiveMatrix.comprehension}%
  * Application (Vận dụng): ${cognitiveMatrix.application}%
  * High-Level Application (Vận dụng cao): ${cognitiveMatrix.highApplication}%
${sectionSpecs}
`.trim();

    // 5. Assemble User Prompt
    let userPrompt = `Generate a complete exam of exactly ${totalQuestions} DISTINCT AND UNIQUE questions with the following specifications:

### EXAM CLASSIFICATION:
- Exam Type: ${examSpecs.name}
- Pedagogical Focus: ${examSpecs.focus}

### CURRICULUM HIERARCHY:
${curriculumHierarchy}

${gradeDirectives ? `${gradeDirectives}\n` : ''}
### EXAM MATRIX & CONSTRAINTS:
${matrixSpecs}
- IMPORTANT: All ${totalQuestions} questions MUST BE COMPLETELY UNIQUE. Do not repeat any questions, numbers, or problem types!

### REQUIRED JSON SCHEMA SPECIFICATION:
{
  "title": "string (Descriptive title of the exam)",
  "curriculumSummary": "string (Summary of subjects and topics covered)",
  "examType": "${examType}",
  "durationMinutes": ${durationMinutes},
  "totalPoints": ${totalPoints},
  "totalQuestions": ${totalQuestions},
  "instructions": ["string (Guidelines for students)"],
  "questions": [
    {
      "questionNumber": 1,
      "type": "MULTIPLE_CHOICE | TRUE_FALSE | SHORT_ANSWER | ESSAY",
      "cognitiveLevel": "KNOWLEDGE | COMPREHENSION | APPLICATION | HIGH_APPLICATION",
      "content": "string (The question statement, formatted with LaTeX math $...$ if needed)",
      "options": [
        "First option content (WITHOUT leading A. prefix for MULTIPLE_CHOICE, or sub-item a for TRUE_FALSE, or empty array for SHORT_ANSWER and ESSAY)"
      ],
      "explanation": "string (Step-by-step pedagogical explanation and calculations FIRST before writing final answer)",
      "correctAnswer": "A | B | C | D (for MULTIPLE_CHOICE) or 'a: Đ, b: S, c: Đ, d: S' (for TRUE_FALSE) or 'exact_concise_numerical_value' (for SHORT_ANSWER) or 'Xem hướng dẫn chấm' (for ESSAY)",
      "points": 0.5
    }
  ]
}`;

    // Safely append custom teacher directives if present
    if (safeCustomPrompt) {
      userPrompt += `\n\n### ADDITIONAL TEACHER INSTRUCTIONS (Within Exam Scope):\n"${safeCustomPrompt}"`;
    }

    // Apply Pedagogical AI Skills if selected
    if (payload.appliedSkills && payload.appliedSkills.length > 0) {
      userPrompt += `\n\n======================================================================`;
      userPrompt += `\n### BỘ QUY CHUẨN KỸ NĂNG SƯ PHẠM ĐỘC QUYỀN (BẮT BUỘC ÁP DỤNG TRIỆT ĐỂ):`;
      userPrompt += `\nCác câu hỏi tạo ra PHẢI TUÂN THỦ NGHIÊM NGẶT các quy tắc sư phạm, ma trận, dạng bài và câu hỏi mẫu sau đây:`;
      payload.appliedSkills.forEach((skill, idx) => {
        const instStr = Array.isArray(skill.skillInstructions)
          ? skill.skillInstructions.join('\n')
          : typeof skill.skillInstructions === 'string'
          ? skill.skillInstructions
          : JSON.stringify(skill.skillInstructions, null, 2);

        userPrompt += `\n\n--- [KỸ NĂNG ${idx + 1}: ${skill.title}] ---`;
        userPrompt += `\n${instStr}`;
        if (skill.fewShotExamples && Array.isArray(skill.fewShotExamples) && skill.fewShotExamples.length > 0) {
          userPrompt += `\n\n* CÂU HỎI MẪU TIÊU BIỂU (FEW-SHOT TEMPLATES - CHỈ DÙNG THAM KHẢO PHONG CÁCH SƯ PHẠM, TUYỆT ĐỐI KHÔNG COPY NGUYÊN VĂN HAY LẶP LẠI CÂU MẪU):\n${JSON.stringify(skill.fewShotExamples, null, 2)}`;
        }
      });
      userPrompt += `\n======================================================================`;
    }

    return {
      systemPrompt,
      userPrompt,
      sanitizationNotes: sanitizationNotes.length ? sanitizationNotes : undefined,
    };
  }

  /**
   * Generates strict GDPT 2018 grade-level difficulty and scope directives.
   */
  public static getCurriculumGradeDirectives(grade: string, subject: string): string {
    const norm = (grade || '').toLowerCase();
    const match = norm.match(/(?:lớp|khối|grade)?\s*(\d{1,2})(?!\d)/i);
    const num = match ? parseInt(match[1], 10) : null;

    if (num === 10 || norm.includes('10')) {
      return `
### BẮT BUỘC TUÂN THỦ CHUẨN ĐỘ KHÓ CHƯƠNG TRÌNH GDPT 2018 - KHỐI LỚP 10:
1. TUYỆT ĐỐI NGHIÊM CẤM: KHÔNG BAO GIỜ sinh câu hỏi cấp tiểu học (như phép cộng trừ số học 4 + 7, số liền sau, so sánh số nhỏ) hay toán THCS cấp 2. Mọi câu hỏi phải kiểm tra đúng chuẩn kiến thức THPT Lớp 10!
2. NỘI DUNG TRỌNG TÂM MÔN ${subject} LỚP 10:
   - Mệnh đề toán học, Tập hợp và các phép toán trên tập hợp (giao, hợp, hiệu, phần bù).
   - Bất phương trình và hệ bất phương trình bậc nhất hai ẩn (miền nghiệm trên mặt phẳng toạ độ Oxy).
   - Hàm số bậc hai, đồ thị parabol (toạ độ đỉnh, trục đối xứng), Dấu của tam thức bậc hai ax² + bx + c và bất phương trình bậc hai một ẩn.
   - Hệ thức lượng trong tam giác: Định lí côsin (a² = b² + c² - 2bc*cos(A)), Định lí sin (a/sin(A) = 2R), Công thức tính diện tích tam giác (Heron, S = 1/2*ab*sin(C)).
   - Vectơ trong mặt phẳng: Các phép toán vectơ, Tích vô hướng của hai vectơ (a.b = |a||b|cos(a,b)), Toạ độ của vectơ trong Oxy.
   - Thống kê: Các số đặc trưng đo xu thế trung tâm (số trung bình, trung vị, tứ phân vị, mốt), đo độ phân tán (khoảng biến thiên, khoảng tứ phân vị, phương sai, độ lệch chuẩn).
   - Đại số tổ hợp: Quy tắc cộng, quy tắc nhân, Hoán vị, Chỉnh hợp, Tổ hợp, Nhị thức Newton; Xác suất của biến cố.
3. PHÂN PHỐI 4 CẤP ĐỘ BLOOM CHO LỚP 10:
   - Nhận biết (Knowledge): Nhận diện định nghĩa, kí hiệu, công thức chuẩn mực của lớp 10.
   - Thông hiểu (Comprehension): Vận dụng trực tiếp 1-2 bước tính toán, biến đổi cơ bản trong chương trình lớp 10.
   - Vận dụng (Application): Bài toán tổng hợp, kết hợp nhiều công thức hoặc giải quyết bài toán thực tế đo đạc/tối ưu hoá.
   - Vận dụng cao (High Application): Bài toán nâng cao, cực trị hình học toạ độ Oxy, quy hoạch tuyến tính, mô hình xác suất phức tạp.`;
    }

    if (num === 11 || norm.includes('11')) {
      return `
### BẮT BUỘC TUÂN THỦ CHUẨN ĐỘ KHÓ CHƯƠNG TRÌNH GDPT 2018 - KHỐI LỚP 11:
1. TUYỆT ĐỐI KHÔNG sinh câu hỏi dưới trình độ Lớp 11.
2. NỘI DUNG TRỌNG TÂM LỚP 11:
   - Hàm số lượng giác và phương trình lượng giác cơ bản.
   - Dãy số, Cấp số cộng (u_n = u_1 + (n - 1)d), Cấp số nhân (u_n = u_1 * q^(n-1)).
   - Giới hạn dãy số, giới hạn hàm số, hàm số liên tục.
   - Đạo hàm và quy tắc tính đạo hàm, ý nghĩa hình học của đạo hàm (phương trình tiếp tuyến).
   - Quan hệ song song và quan hệ vuông góc trong không gian, góc và khoảng cách trong không gian.`;
    }

    if (num === 12 || norm.includes('12')) {
      return `
### BẮT BUỘC TUÂN THỦ CHUẨN ĐỘ KHÓ CHƯƠNG TRÌNH GDPT 2018 - KHỐI LỚP 12:
1. NỘI DUNG TRỌNG TÂM LỚP 12:
   - Ứng dụng đạo hàm để khảo sát và vẽ đồ thị hàm số (đơn điệu, cực trị, GTLN-GTNN, tiệm cận).
   - Hàm số luỹ thừa, hàm số mũ và hàm số logarit; phương trình, bất phương trình mũ - logarit.
   - Nguyên hàm, tích phân và ứng dụng tính diện tích hình phẳng, thể tích khối tròn xoay.
   - Phương pháp toạ độ trong không gian Oxyz (mặt phẳng, đường thẳng, mặt cầu).
   - Số phức (các phép toán số phức, môđun, tập hợp điểm biểu diễn).`;
    }

    if (num && num >= 6 && num <= 9) {
      return `
### BẮT BUỘC TUÂN THỦ CHUẨN ĐỘ KHÓ THCS (KHỐI LỚP ${num}):
Mọi câu hỏi phải kiểm tra chuẩn kiến thức THCS Lớp ${num}, không sử dụng kiến thức tiểu học hay cấp 3.`;
    }

    if (num && num >= 1 && num <= 5) {
      return `
### BẮT BUỘC TUÂN THỦ CHUẨN ĐỘ KHÓ TIỂU HỌC (KHỐI LỚP ${num}):
Câu hỏi phù hợp lứa tuổi học sinh tiểu học Lớp ${num}.`;
    }

    return '';
  }
}
