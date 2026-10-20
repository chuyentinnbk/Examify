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

    let examSpecs = this.getExamTypeSpecs(examType);
    if (payload.isTopicPractice || payload.topicFocus) {
      examSpecs = {
        name: `Topic Review & Mastery Examination (Đề ôn tập chuyên đề: ${payload.topicFocus || curriculum.topic || 'Chuyên đề trọng tâm'})`,
        focus: `Laser-focused topical evaluation strictly testing ONLY the selected topic: "${payload.topicFocus || curriculum.topic}". Strictly forbidden from including other curriculum chapters or unrelated topics.`,
      };
    }

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
   - TRUE_FALSE (Đúng / Sai): 1 question statement with context, plus exactly 4 sub-items in "options" corresponding to a, b, c, d.
     * "correctAnswer" formatted as "a: Đ, b: S, c: Đ, d: S" (or "a: Đúng, b: Sai, c: Đúng, d: Đúng").
     * BẮT BUỘC CÂN BẰNG TÍNH ĐÚNG/SAI: Phân bố tính đúng/sai của 4 ý a, b, c, d phải đa dạng và cân bằng theo chuẩn đề thi của Bộ GD&ĐT (ví dụ: 2 Đúng - 2 Sai, 3 Đúng - 1 Sai, hoặc 1 Đúng - 3 Sai). TUYỆT ĐỐI NGHIÊM CẤM tạo câu hỏi mà cả 4 ý đều Sai, hoặc chỉ có duy nhất 1 ý Đúng và 3 ý còn lại đều mặc định là Sai một cách rập khuôn.
   - SHORT_ANSWER (Trả lời ngắn):
     * Yêu cầu bài toán dẫn đến một đáp số cụ thể. "options" bắt buộc là mảng rỗng [].
     * BẮT BUỘC GIẢI CHI TIẾT TRƯỚC: Bạn PHẢI tính toán cẩn thận từng bước trong "explanation" trước khi kết luận đáp số.
     * "correctAnswer" PHẢI LÀ KẾT QUẢ SỐ HỌC HOẶC BIỂU THỨC RÚT GỌN CHÍNH XÁC (ví dụ: "15", "-4.5", "2/3", "\\sqrt{2}").
     * TUYỆT ĐỐI KHÔNG điền chữ cái A, B, C, D vào correctAnswer của SHORT_ANSWER.
     * TUYỆT ĐỐI KHÔNG dùng số mặc định hay đoán mò. Mọi đáp số phải khớp 100% với lời giải trong explanation.
   - ESSAY (Tự luận): Multi-step analytical problem. "options" must be empty array []. "correctAnswer": "Xem hướng dẫn chấm". "explanation" must provide step-by-step scoring rubric with partial points.
7. QUY TẮC ĐỊNH DẠNG ĐOẠN MÃ LẬP TRÌNH (CODE SNIPPETS):
   - Đối với các câu hỏi môn Tin học / Lập trình có chứa mã nguồn (Python, C++, SQL...):
     * TUYỆT ĐỐI KHÔNG VIẾT DỒN CODE TRÊN 1 DÒNG DUY NHẤT.
     * BẮT BUỘC đặt trong khối markdown code fence chuẩn xác (\`\`\`python ... \`\`\`) với dấu xuống dòng (\n) và thụt lề 4 dấu cách rõ ràng cho mỗi khối lệnh (if, elif, else, for, while, def).
     * Mọi câu lệnh, rẽ nhánh, khối lặp phải xuống dòng độc lập và thụt lề theo đúng chuẩn cú pháp ngôn ngữ để hiển thị trải dài dọc trên giao diện IDE.
8. DETAILED EXPLANATIONS: Provide step-by-step pedagogical explanations and clear scoring rubrics for all questions.
9. LANGUAGE: All content, options, and explanations must be in: ${language}.
10. QUY CHUẨN CÂU HỎI VẬN DỤNG & VẬN DỤNG CAO (REAL-WORLD MODELING & RICH CONTEXT):
   - ĐẶC BIỆT ĐỐI VỚI CÁC CÂU HỎI Ở MỨC ĐỘ VẬN DỤNG (APPLICATION) VÀ VẬN DỤNG CAO (HIGH_APPLICATION):
     * TUYỆT ĐỐI NGHIÊM CẤM ra đề bài cộc cằn, khô khan, thuần túy hình thức toán học (CẤM: "Cho tam giác ABC có a=5, b=7, c=8 tính góc A" hay "Cho 2 điểm A, B tính khoảng cách AB").
     * BẮT BUỘC đặt bài toán vào bối cảnh thực tiễn đời sống sinh động, giàu hình tượng ("văn thơ", giàu ngôn ngữ thực tế):
       + Đo đạc, khoảng cách: Khoảng cách giữa hai ngôi nhà X và Y bị ngăn cách bởi một hồ nước / khúc sông; vị trí tàu cứu hộ đến ngọn hải đăng; hai con tàu xuất phát từ cảng với vận tốc khác nhau; đo chiều cao ngọn tháp / cột cờ bằng giác kế.
       + Tối ưu hóa & chuyển động: Quỹ đạo bắn pháo hoa, vòm cổng đường bộ hình parabol, bài toán thiết kế bao bì tiết kiệm nguyên liệu, tối ưu chi phí sản xuất và lợi nhuận kinh doanh.
       + Không gian thực tế: Lều cắm trại dã ngoại hình chóp, mái nhà chống bão hình lăng trụ, bể chứa nước công nghiệp.
       + Tin học: Mô phỏng bài toán xếp hàng mua vé, quản lý kho hàng, giải thuật tối ưu hóa đường đi giao hàng.
     * Lời văn phải mềm mại, trau chuốt, tự nhiên, kích thích tư duy giải quyết vấn đề theo chuẩn GDPT 2018.
11. QUY CHUẨN ĐỒ HỌA HÌNH HỌC BẰNG VECTOR SVG (GEOMETRIC DIAGRAMS & RIGHT-ANGLE MARKS):
   - Đối với các câu hỏi Hình học (Hình học không gian như hình chóp S.ABC, tứ diện, lăng trụ, nón, trụ; hoặc Hình học phẳng):
     * BẮT BUỘC nhúng một đoạn mã Vector SVG chuẩn vào trong trường "content" của câu hỏi:
       <svg viewBox="0 0 300 200" width="300" height="200" xmlns="http://www.w3.org/2000/svg" class="exam-geo-svg"> ... </svg>
     * QUY ƯỚC ĐỒ HỌA BẮT BUỘC:
       - Đường nét: stroke="black", stroke-width="1.5", fill="none".
       - Cạnh nhìn thấy: Nét liền (stroke="black").
       - Cạnh bị che khuất bên trong, đường cao, đường trung tuyến: BẮT BUỘC dùng nét đứt với thuộc tính stroke-dasharray="4,4" (hoặc "3,3").
       - Đoạn thẳng & đường phụ: Dùng thẻ <line x1="..." y1="..." x2="..." y2="..." stroke="black" ... />.
         + CẢNH BÁO QUAN TRỌNG: Thẻ <line> CHỈ CHẤP NHẬN 4 thuộc tính x1, y1, x2, y2. TUYỆT ĐỐI CẤM dùng thuộc tính points="..." trong thẻ <line> (dùng points trong thẻ <line> là vi phạm chuẩn SVG làm đường vẽ bị tàng hình trong trình duyệt).
         + Nếu vẽ đường gấp khúc, tam giác, đa giác: dùng <polyline points="..." fill="none" /> hoặc <polygon points="..." fill="none" />.
       - Nhãn đỉnh (S, A, B, C, D...): Dùng thẻ <text x="..." y="..." font-size="13" font-family="Times New Roman, serif" font-weight="bold" fill="black">S</text>.
         + QUY TẮC TRÁNH ĐÈ CHỮ: Nhãn đỉnh phải đặt lệch ra ngoài đỉnh ít nhất 10-15px (Ví dụ: S đặt ở trên y-12; B đặt ở góc dưới bên trái x-16, y+10; C đặt ở góc dưới bên phải x+12, y+10; đỉnh trong A đặt lệch hẳn sang bên trái x-18, y-4). TUYỆT ĐỐI KHÔNG ĐỂ CHỮ ĐÈ LÊN ĐƯỜNG THẲNG!
         + QUY TẮC ĐẶT NHÃN SỐ LIỆU ĐO CẠNH (ví dụ: '12 km', '20 km', 'a', 'h_a'): BẮT BUỘC đặt nhãn lệch hẳn ra ngoài hoặc bên trên/dưới đoạn thẳng ít nhất 8-12px (không đặt toạ độ trùng khít vào trung điểm thân đường kẻ làm nét vẽ đâm xuyên qua chữ).
       - KÝ HIỆU VUÔNG GÓC (RIGHT-ANGLE MARK) CHUẨN XÁC:
         + BẮT BUỘC dùng 1 thẻ <polyline> liên tục (fill="none" stroke="black" stroke-width="1"), góc vuông phải song song tuyệt đối với 2 cạnh chứa góc vuông đó (theo phép chiếu phối cảnh 3D).
         + Kích thước góc vuông phải nhỏ gọn (cạnh khoảng 8px đến 10px).
         + Ví dụ tại đỉnh A(100, 120) vuông góc với SA(thẳng đứng) và AC(xiên): dùng <polyline points="100,110 112,114 112,124" fill="none" stroke="black" stroke-width="1" />.
         + TUYỆT ĐỐI KHÔNG vẽ các nét gãy rời rạc, méo mó, xiên lệch hoặc đè lên chữ cái! Nếu không tính được tọa độ góc vuông phối cảnh chuẩn xác, HÃY BỎ QUA ký hiệu vuông góc trên hình vẽ (để giả thiết trong đề bài nêu "$SA \\perp (ABC)$") chứ KHÔNG ĐƯỢC vẽ cẩu thả!`;

    if (payload.appliedSkills && payload.appliedSkills.length > 0) {
      systemPrompt += `\n\n### HIGHEST PRIORITY MANDATE - ENFORCE SPECIALIZED PEDAGOGICAL SKILLS & STRICT ZERO-DUPLICATION:
You have been provided with specialized pedagogical skills extracted from official academic materials. You MUST apply the question styles, difficulty tiers, and pedagogical rigor defined in these skills:
- TUYỆT ĐỐI KHÔNG COPY NGUYÊN VĂN CÂU MẪU: Treat few-shot examples solely as structural templates. Author 100% fresh, novel questions with completely different parameters, numbers, context, and functions.
- KHÔNG LẶP LẠI DẠNG TOÁN HAY PHƯƠNG TRÌNH: Every single question in the exam MUST test a different sub-topic, formula, or concept. Never create multiple questions that solve the same equation pattern with trivial variable changes.
- TOÀN DIỆN CHƯƠNG TRÌNH: Đảm bảo phủ đều các chủ đề, chuyên đề và bài học của môn học trong học kỳ, không dồn vào một dạng bài duy nhất.`;
    }

    // 2.5 Grade-level curriculum directives (GDPT 2018)
    const gradeDirectives = this.getCurriculumGradeDirectives(curriculum.grade, curriculum.subject, safeCustomPrompt);
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
      "content": "string (The question statement, formatted with LaTeX math $...$ if needed. For programming/code questions, format using standard multi-line markdown code fences with line breaks and 4-space indentation; NEVER flatten code onto a single line)",
      "options": [
        "First option content (WITHOUT leading A. prefix for MULTIPLE_CHOICE, or sub-item a for TRUE_FALSE, or empty array for SHORT_ANSWER and ESSAY)"
      ],
      "explanation": "string (Step-by-step pedagogical explanation and calculations FIRST before writing final answer)",
      "correctAnswer": "A | B | C | D (for MULTIPLE_CHOICE) or balanced propositions like 'a: Đ, b: S, c: Đ, d: S' or 'a: S, b: Đ, c: Đ, d: S' (for TRUE_FALSE, must have realistic 2T-2F, 3T-1F, or 1T-3F mix; NEVER default to 1T-3F) or 'exact_concise_numerical_value' (for SHORT_ANSWER) or 'Xem hướng dẫn chấm' (for ESSAY)",
      "points": 0.5
    }
  ]
}`;

    // Safely append custom teacher directives if present
    if (safeCustomPrompt) {
      userPrompt += `\n\n### ADDITIONAL TEACHER INSTRUCTIONS (Within Exam Scope):\n"${safeCustomPrompt}"`;
    }

    // Append Strict Single-Topic Mandate for Topic Review exams
    if (payload.isTopicPractice || payload.topicFocus) {
      const topic = payload.topicFocus || payload.curriculum.topic || payload.curriculum.lesson || 'Chuyên đề đã chọn';
      userPrompt += `\n\n======================================================================`;
      userPrompt += `\n### YÊU CẦU ĐỘC TÔN CHO ĐỀ ÔN TẬP CHUYÊN ĐỀ (STRICT SINGLE-TOPIC SCOPE):`;
      userPrompt += `\n- CHUYÊN ĐỀ DUY NHẤT ĐƯỢC PHÉP KIỂM TRA: "${topic}".`;
      userPrompt += `\n- 100% tất cả ${totalQuestions} câu hỏi PHẢI CHỈ HỎI VỀ CHUYÊN ĐỀ NÀY!`;
      userPrompt += `\n- TUYỆT ĐỐI NGHIÊM CẤM đưa kiến thức từ các chương khác, bài học khác vào đề (Ví dụ: đề ôn tập "Định lý sin, côsin trong tam giác" thì TUYỆT ĐỐI KHÔNG được có bất kỳ câu nào về Mệnh đề, Tập hợp, Bất phương trình hay Hàm số).`;
      userPrompt += `\n======================================================================`;
    }

    // Append School Assessment Matrix Specification if provided
    if (payload.customMatrixTable) {
      const matrixStr = typeof payload.customMatrixTable === 'string'
        ? payload.customMatrixTable
        : JSON.stringify(payload.customMatrixTable, null, 2);
      userPrompt += `\n\n======================================================================`;
      userPrompt += `\n### BẢN ĐẶC TẢ MA TRẬN ĐỀ THI CHÍNH THỨC CỦA TRƯỜNG / TỔ BỘ MÔN (BẮT BUỘC TUÂN THỦ 100%):`;
      userPrompt += `\nGiáo viên đã cung cấp Ma trận chi tiết sau đây:\n${matrixStr}`;
      userPrompt += `\nBẠN PHẢI TUÂN THỦ NGHIÊM NGẶT SỐ LƯỢNG VÀ MỨC ĐỘ TỪNG PHẦN THEO ĐÚNG MA TRẬN NÀY!`;
      userPrompt += `\n======================================================================`;
    }

    // Append Sample Exam Reference Directive if provided
    if (payload.sampleExamText && payload.sampleExamText.trim()) {
      userPrompt += `\n\n======================================================================`;
      userPrompt += `\n### TẠO ĐỀ THI TƯƠNG ĐƯƠNG DỰA TRÊN ĐỀ THI MẪU (REVERSE-ENGINEER REFERENCE EXAM):`;
      userPrompt += `\nGiáo viên đã cung cấp một ĐỀ THI MẪU THAM CHIẾU${payload.sampleExamFileName ? ` (Tệp: "${payload.sampleExamFileName}")` : ''}.`;
      userPrompt += `\nNhiệm vụ của bạn là:`;
      userPrompt += `\n1. Phân tích kỹ ma trận nhận thức, cấu trúc các phần (Phần I, II, III...), mức độ khó dễ và phong cách ra đề của ĐỀ THI MẪU dưới đây.`;
      userPrompt += `\n2. Biên soạn một ĐỀ THI MỚI TƯƠNG ĐƯƠNG CÙNG DẠNG, CÙNG MA TRẬN nhưng THAY ĐỔI TOÀN BỘ SỐ LIỆU, ĐỐI TƯỢNG, HÀM SỐ hoặc TÌNH HUỐNG THỰC TẾ.`;
      userPrompt += `\n3. TUYỆT ĐỐI KHÔNG sao chép nguyên văn câu hỏi cũ, mà sinh câu hỏi mới cùng dạng bài và cùng mức độ tư duy nhận thức.`;
      userPrompt += `\n\n--- [NỘI DUNG ĐỀ THI MẪU THAM CHIẾU] ---`;
      userPrompt += `\n${payload.sampleExamText.slice(0, 30000)}`;
      userPrompt += `\n--- [HẾT NỘI DUNG ĐỀ THI MẪU] ---`;
      userPrompt += `\n======================================================================`;
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
  public static getCurriculumGradeDirectives(grade: string, subject: string, customPrompt?: string): string {
    const norm = (grade || '').toLowerCase();
    const match = norm.match(/(?:lớp|khối|grade)?\s*(\d{1,2})(?!\d)/i);
    const num = match ? parseInt(match[1], 10) : null;

    const isCustom =
      norm.includes('tùy chỉnh') ||
      norm.includes('custom') ||
      norm.includes('tự do') ||
      norm.includes('chuyên');

    if (isCustom) {
      const isTinHoc = subject.toLowerCase().includes('tin');
      const hasAlgorithmKeywords = !!(customPrompt && /dp|quy hoạch động|dynamic programming|lis|fenwick|segment tree|dsu|dijkstra|thuật toán|code|lập trình/i.test(customPrompt));

      let cpDirective = '';
      if (isTinHoc || hasAlgorithmKeywords) {
        cpDirective = `
3. ĐẶC BIỆT ĐỐI VỚI MÔN TIN HỌC / CHUYÊN TIN / HỌC SINH GIỎI (HSG / COMPETITIVE PROGRAMMING):
   - Nếu giáo viên yêu cầu về các chủ đề thuật toán chuyên sâu (như Quy hoạch động / Dynamic Programming / DP, Dãy con tăng dài nhất LIS, Tìm kiếm nhị phân / Binary Search nâng cao hoặc chặt nhị phân trên tập kết quả, Cấu trúc dữ liệu nâng cao như Cây Fenwick / Binary Indexed Tree / BIT, Cây phân đoạn / Segment Tree, Disjoint Set Union / DSU, Thuật toán đồ thị Dijkstra / Kruskal...):
   - Hãy biên soạn các câu hỏi học thuật chất lượng cao, đánh giá chính xác độ phức tạp thời gian/bộ nhớ ($O(N \\log N)$, $O(\\log N)$, $O(N)$), điều kiện biên, bài toán tối ưu hoá và cấu trúc dữ liệu tương ứng.`;
      }

      return `
### CHẾ ĐỘ THI TÙY CHỈNH (CUSTOM / FREE-FORM ASSESSMENT):
1. Đề thi không bị gò bó bởi khung chương trình phân phối tiết cố định của một khối lớp phổ thông cụ thể.
2. Thiết kế câu hỏi bám sát 100% vào yêu cầu tùy chỉnh của giáo viên trong mục "Additional Teacher Instructions" (Custom Prompt).${cpDirective}`;
    }

    const isTinHoc = subject.toLowerCase().includes('tin');
    if (isTinHoc) {
      if (num === 10 || norm.includes('10')) {
        return `
### BẮT BUỘC TUÂN THỦ CHUẨN ĐỘ KHÓ CHƯƠNG TRÌNH GDPT 2018 - TIN HỌC LỚP 10:
1. TUYỆT ĐỐI NGHIÊM CẤM: KHÔNG đưa các thuật toán thi đấu nâng cao (Quy hoạch động, LIS, Segment Tree, Fenwick Tree, Đồ thị, DSU...) vào đề thi phổ thông lớp 10! Lớp 10 chỉ học Python cơ bản và nhập môn khoa học máy tính.
2. NỘI DUNG TRỌNG TÂM TIN HỌC LỚP 10 (GDPT 2018):
   - Máy tính và xã hội tri thức: Hệ nhị phân (chuyển đổi nhị phân - thập phân), bit, byte, biểu diễn dữ liệu trong máy tính, mạng máy tính cơ bản và an toàn thông tin số.
   - Lập trình Python cơ bản:
     * Cú pháp, biến, các kiểu dữ liệu cơ sở: số nguyên (int), số thực (float), xâu ký tự (str), logic (bool).
     * Phép toán số học (+, -, *, /, //, %, **) và phép toán logic (and, or, not, so sánh ==, !=, >, <, >=, <=).
     * Cấu trúc rẽ nhánh: if, if-else, if-elif-else.
     * Cấu trúc lặp: Vòng lặp for với hàm range(start, stop, step), vòng lặp while.
     * Danh sách (list) cơ bản: Khởi tạo list, chỉ số phần tử (index), phương thức append(), duyệt danh sách.
     * Các hàm dựng sẵn thường dùng: print(), input(), len(), type().
   - Thuật toán cơ bản: Tính tổng các phần tử trong danh sách, đếm số phần tử thỏa mãn điều kiện, tìm giá trị lớn nhất (Max) và nhỏ nhất (Min) bằng duyệt tuần tự một lượt.
3. PHÂN PHỐI 4 CẤP ĐỘ BLOOM CHO LỚP 10:
   - Nhận biết: Nhận diện cú pháp Python cơ bản, từ khóa, kiểu dữ liệu, biểu diễn nhị phân.
   - Thông hiểu: Dự đoán kết quả thực thi của đoạn mã ngắn (vòng lặp đơn, rẽ nhánh if), chuyển đổi nhị phân/thập phân.
   - Vận dụng: Viết hoặc hoàn thiện đoạn code Python giải quyết bài toán cơ bản (tính tổng mảng, đếm số chẵn lẻ...).
   - Vận dụng cao: Xử lý bài toán danh sách số học với các điều kiện rẽ nhánh và lặp lồng nhau ở mức độ học sinh lớp 10.`;
      }

      if (num === 11 || norm.includes('11')) {
        return `
### BẮT BUỘC TUÂN THỦ CHUẨN ĐỘ KHÓ CHƯƠNG TRÌNH GDPT 2018 - TIN HỌC LỚP 11:
1. TUYỆT ĐỐI NGHIÊM CẤM: KHÔNG đưa thuật toán chuyên sâu (Quy hoạch động DP, LIS O(N log N), Segment Tree, Fenwick Tree, Dijkstra...) vào đề thi phổ thông lớp 11!
2. NỘI DUNG TRỌNG TÂM TIN HỌC LỚP 11 (GDPT 2018):
   - Lập trình hàm trong Python: Định nghĩa hàm (def), tham số hình thức, tham số thực tế, biến toàn cục (global) và cục bộ (local), câu lệnh trả về giá trị (return).
   - Xử lý xâu ký tự (str): Cắt lát xâu s[start:end:step], các phương thức xử lý chuỗi (split, join, find, count, replace, strip, lower, upper).
   - Danh sách nâng cao: Danh sách lồng nhau (ma trận 2 chiều cơ bản), danh sách nén (list comprehension cơ bản).
   - Kiểu dữ liệu Tuple và Dictionary (từ điển) cơ bản: Cặp key-value, truy xuất phần tử theo khóa.
   - Thao tác với tệp dữ liệu văn bản: Mở tệp (open), đọc tệp (read, readline, readlines), ghi tệp (write), đóng tệp (close hoặc with open).
   - Thuật toán cơ bản trong SGK lớp 11:
     * Thuật toán tìm kiếm: Tìm kiếm tuần tự (Linear Search), Tìm kiếm nhị phân cơ bản (Binary Search trên mảng số đã sắp xếp).
     * Thuật toán sắp xếp cơ bản: Sắp xếp chọn (Selection Sort), Sắp xếp chèn (Insertion Sort), Sắp xếp nổi bọt (Bubble Sort).
     * Khái niệm hàm đệ quy cơ bản (tính giai thừa, Fibonacci đơn giản).
3. PHÂN PHỐI 4 CẤP ĐỘ BLOOM CHO LỚP 11:
   - Nhận biết: Cú pháp khai báo hàm, tham số, phương thức xâu, thao tác mở tệp, định nghĩa thuật toán tìm kiếm/sắp xếp cơ bản.
   - Thông hiểu: Phân tích cơ chế truyền tham số, kết quả xử lý chuỗi và tệp, số bước thực hiện của thuật toán tìm kiếm/sắp xếp cơ bản.
   - Vận dụng: Viết hàm Python xử lý dữ liệu từ tệp hoặc xâu ký tự, áp dụng tìm kiếm tuần tự/nhị phân cơ bản hoặc sắp xếp đơn giản.
   - Vận dụng cao: Tối ưu hoá hàm xử lý dữ liệu (kết hợp chuỗi, danh sách 2 chiều, tệp) trong phạm vi chuẩn GDPT lớp 11.`;
      }

      if (num === 12 || norm.includes('12')) {
        return `
### BẮT BUỘC TUÂN THỦ CHUẨN ĐỘ KHÓ CHƯƠNG TRÌNH GDPT 2018 - TIN HỌC LỚP 12:
1. TUYỆT ĐỐI NGHIÊM CẤM: KHÔNG đưa thuật toán lập trình thi đấu (CP / HSG) vào đề thi lớp 12! Lớp 12 tập trung vào Cơ sở dữ liệu, SQL và Mạng máy tính / AI.
2. NỘI DUNG TRỌNG TÂM TIN HỌC LỚP 12 (GDPT 2018):
   - Mạng máy tính & Internet:
     * Thiết bị mạng (Switch, Router, Access Point, Modem), môi trường truyền dẫn (cáp xoắn, cáp quang, sóng vô tuyến).
     * Địa chỉ IP (IPv4 cấu trúc 32-bit và IPv6), phân loại IP tĩnh/động, hệ thống phân giải tên miền (DNS).
     * Các giao thức mạng thông dụng (TCP/IP, HTTP, HTTPS, FTP, SMTP).
   - Trí tuệ nhân tạo (AI) cơ bản:
     * Khái niệm AI, phân loại AI hẹp (Narrow AI) và AI tổng quát (AGI).
     * Học máy (Machine Learning) ở mức nhận biết khái niệm (học có giám sát, không giám sát).
     * Ứng dụng thực tế của AI và các vấn đề về đạo đức, quyền riêng tư, bản quyền dữ liệu khi sử dụng AI.
   - Hệ cơ sở dữ liệu quan hệ (RDBMS):
     * Khái niệm CSDL và Hệ quản trị CSDL (DBMS).
     * Cấu trúc bảng (Table): Cột/Thuộc tính (Field/Attribute), Hàng/Bản ghi (Record/Tuple).
     * Khóa trong CSDL: Khóa chính (Primary Key - tính duy nhất, NOT NULL), Khóa ngoại (Foreign Key - tham chiếu quan hệ).
     * Các mối quan hệ giữa các bảng: 1-1 (Một - Một), 1-n (Một - Nhiều), n-n (Nhiều - Nhiều).
   - Ngôn ngữ truy vấn SQL cơ bản:
     * Cú pháp lệnh SELECT ... FROM ... WHERE ... ORDER BY ...
     * Điều kiện lọc với AND, OR, LIKE, BETWEEN, IN.
     * Sắp xếp kết quả với ORDER BY (ASC / DESC).
   - An toàn, bảo mật và sao lưu dữ liệu trong hệ CSDL.
3. PHÂN PHỐI 4 CẤP ĐỘ BLOOM CHO LỚP 12:
   - Nhận biết: Khái niệm bảng, khóa chính, khóa ngoại, thiết bị mạng, giao thức, địa chỉ IP.
   - Thông hiểu: Xác định mối quan hệ giữa các thực thể/bảng, phân biệt IPv4 và DNS, giải thích vai trò của câu lệnh SQL.
   - Vận dụng: Viết câu lệnh truy vấn SQL (SELECT, WHERE, ORDER BY) để trích xuất dữ liệu theo yêu cầu thực tế; thiết lập khóa chính/khóa ngoại.
   - Vận dụng cao: Phân tích và thiết kế mô hình CSDL quan hệ cho bài toán quản lý (thư viện, bán hàng, học sinh), tối ưu hóa cấu trúc bảng và ràng buộc toàn vẹn.`;
      }
    }

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
