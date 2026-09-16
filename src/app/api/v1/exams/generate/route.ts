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
  examType: z.nativeEnum(ExamType),
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
  customPrompt: z.string().max(1500).optional(),
  aiProvider: z.enum(['openai', 'gemini', 'claude', 'self-hosted', 'custom-mcp']).optional(),
  aiModel: z.string().optional(),
  language: z.string().default('Vietnamese'),
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
          customPrompt: safeCustomPrompt,
          language: payload.language,
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
        const { getCurriculumQuestion } = await import('@/lib/curriculum-questions');
        const seenSignatures = new Set<string>();
        const uniqueQuestions: any[] = [];
        const existingContents: string[] = [];

        for (let i = 0; i < generationResult.examData.questions.length; i++) {
          const q = generationResult.examData.questions[i];
          const signature = (q.content || '')
            .toLowerCase()
            .replace(/[^\p{L}\p{N}]+/gu, '')
            .slice(0, 80);

          if (!signature || seenSignatures.has(signature)) {
            const levelMap: Record<string, string> = {
              KNOWLEDGE: 'Nhận biết',
              COMPREHENSION: 'Thông hiểu',
              APPLICATION: 'Vận dụng',
              HIGH_APPLICATION: 'Vận dụng cao',
            };
            const levelStr = levelMap[q.cognitiveLevel] || 'Thông hiểu';
            const fresh = getCurriculumQuestion(
              payload.curriculum.subject,
              payload.curriculum.grade,
              levelStr,
              i,
              existingContents
            );

            const replacement = {
              questionNumber: i + 1,
              type: q.type || 'MULTIPLE_CHOICE',
              cognitiveLevel: q.cognitiveLevel || 'COMPREHENSION',
              content: fresh.content,
              options: fresh.options.map((opt) => `${opt.key}. ${opt.text}`),
              correctAnswer: fresh.correctAnswer,
              explanation: fresh.explanation,
              points: q.points || payload.totalPoints / payload.totalQuestions,
            };
            uniqueQuestions.push(replacement);
            seenSignatures.add(fresh.content.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '').slice(0, 80));
            existingContents.push(fresh.content);
          } else {
            seenSignatures.add(signature);
            existingContents.push(q.content);
            q.questionNumber = i + 1;
            if (Array.isArray(q.options)) {
              q.options = q.options.map((opt: string) =>
                typeof opt === 'string' ? opt.replace(/^[A-D\d]+[\.\:\)\-\s]+/i, '').trim() : opt
              );
            }
            uniqueQuestions.push(q);
          }
        }
        generationResult.examData.questions = uniqueQuestions;
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
