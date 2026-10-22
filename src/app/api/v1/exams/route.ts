import { NextRequest } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { apiError, apiSuccess } from '@/lib/utils';
import { ExamStatus, ExamType } from '@prisma/client';
import { extractCleanShortAnswerValue } from '@/lib/curriculum-questions';

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  const userRole = req.headers.get('x-user-role');

  if (!userId) {
    return apiError('Authentication required', 401);
  }

  try {
    const whereClause: any = {
      status: { notIn: [ExamStatus.FAILED, ExamStatus.GENERATING] },
      ...(userRole === 'ADMIN' ? {} : { teacherId: userId }),
    };

    const rawExams = await prisma.exam.findMany({
      where: whereClause,
      include: {
        teacher: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const exams = rawExams.map((e) => {
      let curriculum: any = {};
      let cognitiveMatrix: any = { easy: 40, medium: 30, hard: 20, veryHard: 10 };
      let questions: any[] = [];

      try {
        if (e.curriculumMetadata) {
          curriculum = JSON.parse(e.curriculumMetadata);
        }
      } catch {
        // ignore
      }

      try {
        if (e.cognitiveMatrix) {
          const m = JSON.parse(e.cognitiveMatrix);
          cognitiveMatrix = {
            easy: m.knowledge ?? 40,
            medium: m.comprehension ?? 30,
            hard: m.application ?? 20,
            veryHard: m.highApplication ?? 10,
          };
        }
      } catch {
        // ignore
      }

      let structuredMeta: Record<string, any> | null = null;
      try {
        if (e.structuredJson) {
          const structured = JSON.parse(e.structuredJson);
          structuredMeta = structured;
          const rawQ = structured.questions || [];
          questions = rawQ.map((q: any, idx: number) => {
            const rawType = String(q.type || 'multiple_choice').toLowerCase().replace(/[\s_-]+/g, '');
            const isTF = rawType.includes('true') || rawType.includes('dung');
            const isSA = rawType.includes('short') || rawType.includes('ngan');
            const isEs = rawType.includes('essay') || rawType.includes('luan');
            const normType = isTF ? 'true_false' : isSA ? 'short_answer' : isEs ? 'essay' : 'multiple_choice';

            let formattedOptions: any[] = [];
            if (!isSA && !isEs) {
              const defaultKeys = isTF ? ['a', 'b', 'c', 'd'] : ['A', 'B', 'C', 'D'];
              const rawOptions = Array.isArray(q.options) && q.options.length > 0 ? q.options : defaultKeys;
              formattedOptions = rawOptions.map((opt: any, optIdx: number) => {
                const defaultKey = defaultKeys[optIdx] || String(optIdx);
                if (typeof opt === 'object' && opt !== null) {
                  return {
                    key: opt.key || defaultKey,
                    text: opt.text || '',
                    isCorrect: opt.isCorrect ?? (isTF ? optIdx % 2 === 0 : q.correctAnswer === opt.key),
                  };
                }
                return {
                  key: defaultKey,
                  text: String(opt),
                  isCorrect: isTF ? optIdx % 2 === 0 : q.correctAnswer === defaultKey,
                };
              });
            }

            return {
              id: q.id ?? idx + 1,
              order: q.order ?? `Câu ${String(idx + 1).padStart(2, '0')}`,
              type: normType,
              section: q.section || normType,
              level:
                q.level ||
                (q.cognitiveLevel === 'KNOWLEDGE'
                  ? 'Nhận biết'
                  : q.cognitiveLevel === 'COMPREHENSION'
                  ? 'Thông hiểu'
                  : q.cognitiveLevel === 'APPLICATION'
                  ? 'Vận dụng'
                  : 'Vận dụng cao'),
              levelClass:
                q.levelClass ||
                (q.cognitiveLevel === 'KNOWLEDGE'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : q.cognitiveLevel === 'COMPREHENSION'
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : q.cognitiveLevel === 'APPLICATION'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'),
              topic: q.topic || curriculum.subject || 'Tổng hợp',
              content: q.content || '',
              options: formattedOptions,
              points: q.points || (normType === 'essay' ? 1.5 : normType === 'true_false' ? 1.0 : normType === 'short_answer' ? 0.5 : 0.25),
              correctAnswer: normType === 'short_answer'
                ? extractCleanShortAnswerValue(null, q.explanation, q.correctAnswer)
                : (q.correctAnswer || (normType === 'essay' ? 'Xem hướng dẫn chấm' : normType === 'true_false' ? 'a: Đ, b: S, c: Đ, d: S' : 'A')),
              explanation: q.explanation || 'Lời giải chi tiết biên soạn theo chuẩn chương trình.',
            };
          });
        }
      } catch {
        // ignore
      }

      const statusMap: Record<string, 'approved' | 'review' | 'draft'> = {
        COMPLETED: 'approved',
        GENERATING: 'approved',
        DRAFT: 'approved',
        FAILED: 'approved',
      };

      const statusLabelMap: Record<string, string> = {
        COMPLETED: 'Chính thức',
        GENERATING: 'Chính thức',
        DRAFT: 'Chính thức',
        FAILED: 'Chính thức',
      };

      return {
        id: e.id,
        code: structuredMeta?.code || undefined,
        title: e.title,
        subject: curriculum.subject || 'Toán học',
        grade: curriculum.grade || 'Lớp 12',
        term: curriculum.semester || 'Học kỳ 1',
        year: '2024-2025',
        sessionTitle: structuredMeta?.sessionTitle || undefined,
        academicYear: structuredMeta?.academicYear || undefined,
        department: structuredMeta?.department || undefined,
        schoolName: structuredMeta?.schoolName || undefined,
        sectionTitles: structuredMeta?.sectionTitles || undefined,
        sectionDescriptions: structuredMeta?.sectionDescriptions || undefined,
        questionsCount: questions.length > 0 ? questions.length : e.totalQuestions,
        duration: e.durationMinutes,
        status: 'approved',
        statusLabel: 'Chính thức',
        author: e.teacher?.fullName || 'Giáo viên',
        updatedAt: new Date(e.updatedAt).toLocaleDateString('vi-VN'),
        matrix: cognitiveMatrix,
        isAiGenerated: !!e.aiProvider,
        variants: structuredMeta?.variants || undefined,
        questions,
      };
    });

    const validExams = exams.filter((ex) => (ex.questions && ex.questions.length > 0));
    return apiSuccess({ exams: validExams }, 'Fetched exams successfully');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error fetching exams';
    return apiError(message, 500);
  }
}

const CreateManualExamSchema = z.object({
  id: z.string().optional(),
  code: z.string().optional(),
  title: z.string().min(3),
  subject: z.string().default('Toán học'),
  grade: z.string().default('Lớp 12'),
  term: z.string().default('Học kỳ 1'),
  duration: z.number().default(45),
  status: z.enum(['approved', 'review', 'draft']).default('approved'),
  department: z.string().optional(),
  schoolName: z.string().optional(),
  sessionTitle: z.string().optional(),
  academicYear: z.string().optional(),
  sectionTitles: z.record(z.string()).optional(),
  sectionDescriptions: z.record(z.string()).optional(),
  matrix: z
    .object({
      easy: z.number().default(40),
      medium: z.number().default(30),
      hard: z.number().default(20),
      veryHard: z.number().default(10),
    })
    .optional(),
  variants: z.array(z.any()).optional(),
  questions: z.array(z.any()).default([]),
});

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return apiError('Authentication required', 401);
  }

  try {
    const body = await req.json();
    const validation = CreateManualExamSchema.safeParse(body);

    if (!validation.success) {
      return apiError(validation.error.flatten().fieldErrors, 422, 'Invalid exam payload');
    }

    const data = validation.data;

    const curriculum = {
      subject: data.subject,
      grade: data.grade,
      semester: data.term,
      level: 'THPT',
    };

    const cognitiveMatrix = data.matrix
      ? {
          knowledge: data.matrix.easy,
          comprehension: data.matrix.medium,
          application: data.matrix.hard,
          highApplication: data.matrix.veryHard,
        }
      : { knowledge: 40, comprehension: 30, application: 20, highApplication: 10 };

    const structuredJson = JSON.stringify({
      title: data.title,
      code: data.code,
      department: data.department,
      schoolName: data.schoolName,
      sessionTitle: data.sessionTitle,
      academicYear: data.academicYear,
      sectionTitles: data.sectionTitles,
      sectionDescriptions: data.sectionDescriptions,
      variants: data.variants || undefined,
      questions: data.questions,
    });

    const statusEnum = ExamStatus.COMPLETED;

    const examPayload = {
      title: data.title,
      examType: ExamType.MID_TERM,
      status: statusEnum,
      teacherId: userId,
      curriculumMetadata: JSON.stringify(curriculum),
      durationMinutes: data.duration,
      totalPoints: 10,
      totalQuestions: data.questions.length || 20,
      cognitiveMatrix: JSON.stringify(cognitiveMatrix),
      aiProvider: 'system',
      aiModel: 'standard',
      structuredJson,
    };

    const savedExam = data.id
      ? await prisma.exam.upsert({
          where: { id: data.id },
          update: examPayload,
          create: { id: data.id, ...examPayload },
        })
      : await prisma.exam.create({
          data: examPayload,
        });

    return apiSuccess({ examId: savedExam.id }, 'Đã lưu đề thi thành công vào cơ sở dữ liệu', {}, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error creating exam';
    return apiError(message, 500);
  }
}
