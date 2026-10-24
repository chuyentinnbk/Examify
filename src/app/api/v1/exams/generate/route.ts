import { NextRequest } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import redis, { REDIS_KEYS } from '@/lib/redis';
import { AIFactory, SupportedAIProvider } from '@/core/ai/ai-factory';
import { PromptGuard } from '@/core/security/prompt-guard';
import { StorageManager } from '@/core/storage/storage-manager';
import { AuditLogger } from '@/core/logger/audit-logger';
import { apiError, apiSuccess } from '@/lib/utils';
import { ExamStatus, ExamType } from '@prisma/client';
import { AcademicStorage } from '@/core/storage/academic-storage';
import { normalizeSvgGeometry } from '@/lib/exam-sections';

export const maxDuration = 300; // Tối đa 5 phút cho việc AI sinh trọn bộ đề thi (20-50 câu có SVG và lời giải)
export const dynamic = 'force-dynamic';

const GenerateExamSchema = z.object({
  title: z.string().min(3, 'Exam title must be at least 3 characters'),
  curriculum: z.object({
    level: z.string().min(1, 'Curriculum level is required'),
    grade: z.string().min(1, 'Grade is required'),
    subject: z.string().min(1, 'Subject is required'),
    semester: z.string().min(1, 'Semester is required'),
    topic: z.string().optional(),
    lesson: z.string().optional(),
  }),
  lessonId: z.string().optional(),
  sessionTitle: z.string().optional(),
  examType: z
    .union([
      z.nativeEnum(ExamType),
      z.literal('TOPIC_PRACTICE'),
      z.literal('CUSTOM'),
      z.literal('MID_TERM_1'),
      z.literal('MID_TERM_2'),
      z.literal('FINAL_TERM_1'),
      z.literal('FINAL_TERM_2'),
    ])
    .transform((val) => {
      if (val === 'TOPIC_PRACTICE' || val === 'CUSTOM') return ExamType.MID_TERM;
      if (val === 'MID_TERM_1' || val === 'MID_TERM_2') return ExamType.MID_TERM;
      if (val === 'FINAL_TERM_1' || val === 'FINAL_TERM_2') return ExamType.FINAL_TERM;
      return val as ExamType;
    }),
  durationMinutes: z.number().int().min(5).max(180).default(45),
  totalPoints: z.number().min(1).max(100).default(10),
  totalQuestions: z.number().int().min(1).max(50).default(20),
  cognitiveMatrix: z
    .object({
      knowledge: z.number().min(0).max(100),
      comprehension: z.number().min(0).max(100),
      application: z.number().min(0).max(100),
      highApplication: z.number().min(0).max(100),
    })
    .optional(),
  sectionDistribution: z
    .object({
      multipleChoice: z
        .object({
          count: z.number().int().min(0),
          matrix: z.object({
            knowledge: z.number().min(0).max(100),
            comprehension: z.number().min(0).max(100),
            application: z.number().min(0).max(100),
            highApplication: z.number().min(0).max(100),
          }),
        })
        .optional(),
      trueFalse: z
        .object({
          count: z.number().int().min(0),
          matrix: z.object({
            knowledge: z.number().min(0).max(100),
            comprehension: z.number().min(0).max(100),
            application: z.number().min(0).max(100),
            highApplication: z.number().min(0).max(100),
          }),
        })
        .optional(),
      shortAnswer: z
        .object({
          count: z.number().int().min(0),
          matrix: z.object({
            knowledge: z.number().min(0).max(100),
            comprehension: z.number().min(0).max(100),
            application: z.number().min(0).max(100),
            highApplication: z.number().min(0).max(100),
          }),
        })
        .optional(),
      essay: z
        .object({
          count: z.number().int().min(0),
          matrix: z.object({
            knowledge: z.number().min(0).max(100),
            comprehension: z.number().min(0).max(100),
            application: z.number().min(0).max(100),
            highApplication: z.number().min(0).max(100),
          }),
        })
        .optional(),
    })
    .optional(),
  customPrompt: z.string().max(1500).optional(),
  skillIds: z.array(z.string()).optional(),
  aiProvider: z.enum(['openai', 'gemini', 'claude', 'self-hosted', 'custom-mcp']).optional(),
  aiModel: z.string().optional(),
  language: z.string().default('Vietnamese'),
  customMatrixTable: z.union([z.string(), z.record(z.any())]).optional(),
  topicFocus: z.string().optional(),
  isTopicPractice: z.boolean().optional(),
  sampleExamText: z.string().optional(),
  sampleExamFileName: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const teacherId = req.headers.get('x-user-id');
  const teacherEmail = req.headers.get('x-user-email') || '';
  const teacherName = decodeURIComponent(req.headers.get('x-user-fullname') || 'Teacher');
  const clientIp = req.headers.get('x-client-ip') || '127.0.0.1';
  const country = req.headers.get('x-client-country') || 'UNKNOWN';
  const userAgent = req.headers.get('user-agent') || 'unknown';

  if (!teacherId) {
    return apiError('Authentication required', 401);
  }

  try {
    const body = await req.json();
    const validation = GenerateExamSchema.safeParse(body);

    if (!validation.success) {
      return apiError(validation.error.flatten().fieldErrors, 422, 'Invalid request payload');
    }

    const payload = validation.data;

    // Validate that sections sum matches totalQuestions if sectionDistribution is provided
    if (payload.sectionDistribution) {
      const dist = payload.sectionDistribution;
      const sum =
        (dist.multipleChoice?.count || 0) +
        (dist.trueFalse?.count || 0) +
        (dist.shortAnswer?.count || 0) +
        (dist.essay?.count || 0);
      if (sum > 0 && sum !== payload.totalQuestions) {
        return apiError(
          `Tổng số câu các phần (${sum} câu) không khớp với tổng số câu của đề thi (${payload.totalQuestions} câu).`,
          422,
          'Mismatched section question count'
        );
      }
    }

    // 1. Concurrency Lock: Prevent multiple concurrent generations from the same teacher
    const lockKey = REDIS_KEYS.EXAM_LOCK(teacherId);
    const acquiredLock = await redis.set(lockKey, 'locked', 'EX', 120, 'NX');

    if (!acquiredLock) {
      return apiError(
        'An exam generation is already in progress for your account. Please wait for completion.',
        429
      );
    }

    try {
      // 2. Anti-Prompt Injection & Jailbreak Filter
      let safeCustomPrompt: string | undefined = undefined;
      if (payload.customPrompt) {
        const guardResult = PromptGuard.sanitize(payload.customPrompt);

        if (!guardResult.isValid) {
          await AuditLogger.securityAlert(
            'PROMPT_INJECTION_BLOCKED',
            {
              rawPrompt: payload.customPrompt,
              riskScore: guardResult.riskScore,
              detectedThreats: guardResult.detectedThreats,
              reason: guardResult.rejectionReason,
            },
            { ip: clientIp, country, userAgent, userId: teacherId }
          );

          return apiError(
            `Custom prompt violates security guidelines: ${guardResult.rejectionReason}`,
            400
          );
        }

        safeCustomPrompt = guardResult.sanitizedText;
      }

      // 3. Resolve AI Provider & Execute with Auto-Fallback Pool
      const selectedProvider = payload.aiProvider || (process.env.DEFAULT_AI_PROVIDER as SupportedAIProvider) || 'gemini';
      const initialProvider = AIFactory.getProvider(selectedProvider, { model: payload.aiModel });

      // 3.5 Load Applied Pedagogical AI Skills
      const appliedSkills: Array<{ id: string; title: string; skillInstructions: string; fewShotExamples?: any[] }> = [];
      let targetSkillIds = payload.skillIds;

      // Auto-detect active skills for the requested subject and grade if not specified
      if (targetSkillIds === undefined) {
        const autoSkills = await AcademicStorage.getSkills({
          subject: payload.curriculum.subject,
          grade: payload.curriculum.grade,
          isActive: true,
        });
        targetSkillIds = autoSkills.map((s) => s.id);
      }

      if (targetSkillIds && targetSkillIds.length > 0) {
        for (const sid of targetSkillIds) {
          const sk = await AcademicStorage.getSkillById(sid);
          if (sk && sk.isActive) {
            let fewShot = [];
            try {
              if (sk.fewShotExamples) {
                fewShot = typeof sk.fewShotExamples === 'string' ? JSON.parse(sk.fewShotExamples) : sk.fewShotExamples;
              }
            } catch {
              // ignore
            }
            appliedSkills.push({
              id: sk.id,
              title: sk.title,
              skillInstructions: sk.skillInstructions,
              fewShotExamples: fewShot,
            });
          }
        }
      }

      // 4. Create initial DRAFT record in database
      const examRecord = await prisma.exam.create({
        data: {
          title: payload.title,
          examType: payload.examType,
          status: ExamStatus.GENERATING,
          teacherId,
          lessonId: payload.lessonId || null,
          curriculumMetadata: JSON.stringify(payload.curriculum),
          durationMinutes: payload.durationMinutes,
          totalPoints: payload.totalPoints,
          totalQuestions: payload.totalQuestions,
          cognitiveMatrix: payload.cognitiveMatrix ? JSON.stringify(payload.cognitiveMatrix) : null,
          customPrompt: safeCustomPrompt || null,
          appliedSkillIds: appliedSkills.length > 0 ? JSON.stringify(appliedSkills.map((s) => ({ id: s.id, title: s.title }))) : null,
          aiProvider: initialProvider.providerName,
          aiModel: initialProvider.modelName,
        },
      });

      // 5. Execute Multi-Key & Cross-Provider Fallback Generation
      const generationResult = await AIFactory.generateWithFallback(
        {
          curriculum: payload.curriculum,
          examType: payload.examType,
          durationMinutes: payload.durationMinutes,
          totalPoints: payload.totalPoints,
          totalQuestions: payload.totalQuestions,
          cognitiveMatrix: payload.cognitiveMatrix,
          sectionDistribution: payload.sectionDistribution,
          customPrompt: safeCustomPrompt,
          appliedSkills: appliedSkills.length > 0 ? appliedSkills : undefined,
          language: payload.language,
          customMatrixTable: payload.customMatrixTable,
          topicFocus: payload.topicFocus,
          isTopicPractice: payload.isTopicPractice,
          sampleExamText: payload.sampleExamText,
          sampleExamFileName: payload.sampleExamFileName,
        },
        selectedProvider
      );

      if (!generationResult.success || !generationResult.examData) {
        await prisma.exam.update({
          where: { id: examRecord.id },
          data: {
            status: ExamStatus.FAILED,
            errorMessage: generationResult.error || 'AI generation failed without specific error message',
          },
        });

        return apiError(
          `AI exam generation failed: ${generationResult.error || 'Unknown error'}`,
          502
        );
      }

      // 5.5 Deduplicate and ensure 100% uniqueness of all questions
      if (generationResult.examData?.questions && Array.isArray(generationResult.examData.questions)) {
        const { getCurriculumQuestion, isQuestionDuplicate, extractCleanShortAnswerValue } = await import('@/lib/curriculum-questions');
        const uniqueQuestions: any[] = [];
        const existingContents: string[] = [];

        for (let i = 0; i < generationResult.examData.questions.length; i++) {
          const q = generationResult.examData.questions[i];
          const isDup = isQuestionDuplicate(q.content, existingContents);

          if (isDup) {
            const levelMap: Record<string, string> = {
              KNOWLEDGE: 'Nhận biết',
              COMPREHENSION: 'Thông hiểu',
              APPLICATION: 'Vận dụng',
              HIGH_APPLICATION: 'Vận dụng cao',
            };
            const levelStr = levelMap[q.cognitiveLevel] || 'Thông hiểu';

            // Generate fresh unique curriculum question adapted to question type
            const fresh = getCurriculumQuestion(
              payload.curriculum.subject,
              payload.curriculum.grade,
              levelStr,
              i,
              existingContents,
              q.type
            );

            const isShortAnswer = String(q.type).toUpperCase().includes('SHORT');
            const replacement = {
              questionNumber: i + 1,
              type: q.type || 'MULTIPLE_CHOICE',
              cognitiveLevel: q.cognitiveLevel || 'COMPREHENSION',
              content: normalizeSvgGeometry(fresh.content),
              options: isShortAnswer ? [] : fresh.options.map((opt) => `${opt.key}. ${opt.text}`),
              correctAnswer: isShortAnswer
                ? extractCleanShortAnswerValue(fresh.options[0]?.text, fresh.explanation, fresh.correctAnswer)
                : fresh.correctAnswer,
              explanation: fresh.explanation ? normalizeSvgGeometry(fresh.explanation) : undefined,
              points: q.points || payload.totalPoints / payload.totalQuestions,
            };

            uniqueQuestions.push(replacement);
            existingContents.push(replacement.content);
          } else {
            existingContents.push(q.content);
            q.questionNumber = i + 1;
            const isSA = String(q.type).toUpperCase().includes('SHORT');
            const isTF = String(q.type).toUpperCase().includes('TRUE');
            if (isSA) {
              q.options = [];
              // Ensure clean numeric answer without multiple-choice letters
              q.correctAnswer = extractCleanShortAnswerValue(null, q.explanation, q.correctAnswer);
            } else if (isTF) {
              const subKeys = ['a', 'b', 'c', 'd'];
              let answerStr = String(q.correctAnswer || '');

              // If correctAnswer is missing or incomplete, try extracting verified truth values from explanation
              if (!/[a-d]\s*[:=-]/i.test(answerStr) && typeof q.explanation === 'string') {
                const extracted: string[] = [];
                subKeys.forEach((k) => {
                  const reg = new RegExp(`(?:^|\\n|\\s)${k}\\)[^\\n]*?\\((Đúng|Sai|Đ|S|True|False)\\)`, 'i');
                  const m = q.explanation.match(reg);
                  if (m) {
                    const isT = /[ĐđTt]/i.test(m[1]);
                    extracted.push(`${k}: ${isT ? 'Đ' : 'S'}`);
                  }
                });
                if (extracted.length === 4) {
                  answerStr = extracted.join(', ');
                  q.correctAnswer = answerStr;
                }
              }

              // Synchronize options array so each option has key, text, and isCorrect matching correctAnswer
              if (Array.isArray(q.options) && q.options.length > 0) {
                q.options = q.options.slice(0, 4).map((opt: any, optIdx: number) => {
                  const k = subKeys[optIdx] || 'a';
                  const rawText = typeof opt === 'string' ? opt : (opt.text || '');
                  const cleanText = rawText.replace(/^[a-da-d][\.\:\)\-\s]+/i, '').trim();
                  const isCorrect = /[a-d]\s*[:=-]/i.test(answerStr)
                    ? new RegExp(`${k}\\s*[:=-]?\\s*(?:Đ|Đúng|True|T|1)(?!\\w)`, 'i').test(answerStr)
                    : (typeof opt === 'object' && opt !== null && opt.isCorrect !== undefined ? !!opt.isCorrect : optIdx % 2 === 0);
                  return {
                    key: k,
                    text: cleanText || rawText,
                    isCorrect,
                  };
                });
              }
            } else if (Array.isArray(q.options)) {
              q.options = q.options.map((opt: string) =>
                typeof opt === 'string' ? opt.replace(/^[A-Da-d][\.\:\)\-\s]+/i, '').trim() : opt
              );
            }
            q.content = typeof q.content === 'string' ? normalizeSvgGeometry(q.content) : q.content;
            if (q.explanation && typeof q.explanation === 'string') {
              q.explanation = normalizeSvgGeometry(q.explanation);
            }
            uniqueQuestions.push(q);
          }
        }
        generationResult.examData.questions = uniqueQuestions;
      }

      if (generationResult.examData) {
        generationResult.examData.term = payload.curriculum.semester;
        if (payload.sessionTitle) {
          generationResult.examData.sessionTitle = payload.sessionTitle;
        }
      }

      // 6. Save JSON Artifact to Local File Storage (/storage/exams/YYYY/MM/{id}.json)
      const relativeFilePath = await StorageManager.saveExamArtifact({
        examId: examRecord.id,
        title: payload.title,
        metadata: {
          curriculum: payload.curriculum,
          examType: payload.examType,
          durationMinutes: payload.durationMinutes,
          totalPoints: payload.totalPoints,
          totalQuestions: payload.totalQuestions,
          aiProvider: generationResult.provider,
          aiModel: generationResult.model,
          usage: generationResult.usage,
        },
        content: generationResult.examData as unknown as Record<string, unknown>,
        rawOutput: generationResult.rawResponse,
        generatedAt: new Date().toISOString(),
      });

      // 7. Update Exam record to COMPLETED state
      const updatedExam = await prisma.exam.update({
        where: { id: examRecord.id },
        data: {
          status: ExamStatus.COMPLETED,
          aiProvider: generationResult.provider,
          aiModel: generationResult.model,
          rawOutput: generationResult.rawResponse || null,
          structuredJson: JSON.stringify(generationResult.examData),
          filePath: relativeFilePath,
        },
      });

      // 8. Log Structured Audit Event
      await AuditLogger.log({
        action: 'EXAM_GENERATED',
        entity: 'EXAM',
        entityId: updatedExam.id,
        userId: teacherId,
        clientIp,
        country,
        userAgent,
        details: {
          examTitle: payload.title,
          examType: payload.examType,
          totalQuestions: payload.totalQuestions,
          aiProvider: generationResult.provider,
          aiModel: generationResult.model,
          filePath: relativeFilePath,
          tokens: generationResult.usage,
        },
      });



      return apiSuccess(
        {
          examId: updatedExam.id,
          title: updatedExam.title,
          status: updatedExam.status,
          filePath: relativeFilePath,
          examData: generationResult.examData,
          usage: generationResult.usage,
          appliedSkills: appliedSkills.map((s) => ({ id: s.id, title: s.title })),
        },
        'Exam generated successfully',
        {},
        201
      );
    } finally {
      // Always release concurrency lock
      await redis.del(lockKey);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal generation error';
    return apiError(message, 500);
  }
}
