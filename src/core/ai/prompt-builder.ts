import { ExamType } from '@prisma/client';
import { ExamGenerationPayload } from './types';
import { PromptGuard } from '@/core/security/prompt-guard';

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
    const systemPrompt = `You are an elite educational assessment and pedagogical examination engine ("Examify AI").
Your sole objective is to author high-quality, academically rigorous, and curriculum-aligned exam questions formatted strictly as a single valid JSON object.

### CRITICAL ANTI-DUPLICATION & QUALITY RULES:
1. ABSOLUTELY ZERO DUPLICATE QUESTIONS: Every single question in the generated exam must be 100% unique, distinct, and independent. Under NO circumstances should two questions have identical, repetitive, or near-identical problem statements, parameters, contexts, or answer choices.
2. DIVERSE CURRICULUM COVERAGE: Broadly distribute questions across different topics, sub-skills, theories, and practical applications within the specified subject and grade.
3. OUTPUT ONLY RAW VALID JSON: Never output markdown code fences (like \`\`\`json), markdown explanations, or conversational filler.
4. STRICT JSON SCHEMA: The entire exam output must adhere strictly to the JSON schema.
5. PRECISE & PEDAGOGICAL: Questions must be unambiguous, factually accurate according to Vietnam's GDPT 2018 standards, and mathematically verified.
6. FOUR DISTINCT OPTIONS: Every multiple-choice question must have exactly 4 unique options (A, B, C, D) with exactly one correct option.
7. DETAILED EXPLANATIONS: Provide step-by-step explanations and clear scoring rubrics for all questions.
8. LANGUAGE: All content, options, and explanations must be in: ${language}.`;

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
    const matrixSpecs = `
- Total Duration: ${durationMinutes} minutes
- Total Score: ${totalPoints} points
- Total Number of Questions: ${totalQuestions}
- Cognitive Distribution Matrix:
  * Knowledge (Nhận biết): ${cognitiveMatrix.knowledge}%
  * Comprehension (Thông hiểu): ${cognitiveMatrix.comprehension}%
  * Application (Vận dụng): ${cognitiveMatrix.application}%
  * High-Level Application (Vận dụng cao): ${cognitiveMatrix.highApplication}%
`.trim();

    // 5. Assemble User Prompt
    let userPrompt = `Generate a complete exam of exactly ${totalQuestions} DISTINCT AND UNIQUE questions with the following specifications:

### EXAM CLASSIFICATION:
- Exam Type: ${examSpecs.name}
- Pedagogical Focus: ${examSpecs.focus}

### CURRICULUM HIERARCHY:
${curriculumHierarchy}

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
        "First option content (WITHOUT leading A. prefix)",
        "Second option content (WITHOUT leading B. prefix)",
        "Third option content (WITHOUT leading C. prefix)",
        "Fourth option content (WITHOUT leading D. prefix)"
      ],
      "correctAnswer": "A | B | C | D",
      "explanation": "string (Step-by-step pedagogical explanation with LaTeX math if needed)",
      "points": 0.5
    }
  ]
}`;

    // Safely append custom teacher directives if present
    if (safeCustomPrompt) {
      userPrompt += `\n\n### ADDITIONAL TEACHER INSTRUCTIONS (Within Exam Scope):\n"${safeCustomPrompt}"`;
    }

    return {
      systemPrompt,
      userPrompt,
      sanitizationNotes: sanitizationNotes.length ? sanitizationNotes : undefined,
    };
  }
}
