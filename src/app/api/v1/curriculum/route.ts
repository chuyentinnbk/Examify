import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { apiError, apiSuccess } from '@/lib/utils';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const levelCode = searchParams.get('level');
  const gradeCode = searchParams.get('grade');

  try {
    const levels = await prisma.curriculumLevel.findMany({
      where: levelCode ? { code: levelCode } : undefined,
      orderBy: { order: 'asc' },
      include: {
        grades: {
          where: gradeCode ? { code: gradeCode } : undefined,
          orderBy: { order: 'asc' },
          include: {
            subjects: {
              include: {
                semesters: {
                  include: {
                    topics: {
                      include: {
                        lessons: {
                          orderBy: { order: 'asc' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    return apiSuccess({ levels });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch curriculum';
    return apiError(message, 500);
  }
}
