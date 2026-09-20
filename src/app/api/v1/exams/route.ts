import { NextRequest } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { apiError, apiSuccess } from '@/lib/utils';
import { ExamStatus, ExamType } from '@prisma/client';

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  const userRole = req.headers.get('x-user-role');

  if (!userId) {
    return apiError('Authentication required', 401);
  }

  try {
    const whereClause = userRole === 'ADMIN' ? {} : { teacherId: userId };

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
            const rawOptions = q.options || ['A', 'B', 'C', 'D'];
            const formattedOptions = rawOptions.map((opt: any, optIdx: number) => {
              if (typeof opt === 'object' && opt !== null) {
                return {
                  key: opt.key || ['A', 'B', 'C', 'D'][optIdx] || String(optIdx),
                  text: opt.text || '',
                  isCorrect: opt.isCorrect ?? (q.correctAnswer === opt.key),
                };
              }
              const key = ['A', 'B', 'C', 'D'][optIdx] || String(optIdx);
              return {
                key,
                text: String(opt),
                isCorrect: q.correctAnswer === key,
              };
            });

            return {
              id: q.id ?? idx + 1,
              order: q.order ?? `Câu ${String(idx + 1).padStart(2, '0')}`,
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
              points: q.points || 0.25,
              correctAnswer: q.correctAnswer || 'A',
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
        questions,
      };
    });

    return apiSuccess({ exams }, 'Fetched exams successfully');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error fetching exams';
    return apiError(message, 500);
  }
}

const CreateManualExamSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(3),
  subject: z.string().default('Toán học'),
  grade: z.string().default('Lớp 12'),
  term: z.string().default('Học kỳ 1'),
  duration: z.number().default(45),
  status: z.enum(['approved', 'review', 'draft']).default('approved'),
  matrix: z
    .object({
      easy: z.number().default(40),
      medium: z.number().default(30),
      hard: z.number().default(20),
      veryHard: z.number().default(10),
    })
    .optional(),
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
