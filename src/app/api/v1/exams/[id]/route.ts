import { NextRequest } from 'next/server';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';
import prisma from '@/lib/db';
import { apiError, apiSuccess } from '@/lib/utils';
import { ExamStatus } from '@prisma/client';
import { normalizeSvgGeometry } from '@/lib/exam-sections';
import { StorageManager } from '@/core/storage/storage-manager';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = req.headers.get('x-user-id');
  const userRole = req.headers.get('x-user-role');

  if (!userId) {
    return apiError('Authentication required', 401);
  }

  const { id } = await params;

  try {
    const existing = await prisma.exam.findUnique({
      where: { id },
    });

    if (!existing) {
      return apiError('Exam not found', 404);
    }

    if (existing.teacherId !== userId && userRole !== 'ADMIN') {
      return apiError('Permission denied', 403);
    }

    const body = await req.json();

    const updateData: any = {};

    if (body.title) updateData.title = body.title;
    // Parse existing structuredJson
    let existingStructured: Record<string, any> = {};
    try {
      if (existing.structuredJson) {
        existingStructured = JSON.parse(existing.structuredJson);
      }
    } catch {
      // ignore
    }

    const newStructured: Record<string, any> = {
      ...existingStructured,
      title: body.title || existingStructured.title || existing.title,
    };

    if (body.questions) {
      updateData.totalQuestions = body.questions.length;
      newStructured.questions = body.questions.map((q: any) => ({
        ...q,
        content: typeof q.content === 'string' ? normalizeSvgGeometry(q.content) : q.content,
        explanation: typeof q.explanation === 'string' ? normalizeSvgGeometry(q.explanation) : q.explanation,
      }));
    }
    if (body.department !== undefined) newStructured.department = body.department;
    if (body.schoolName !== undefined) newStructured.schoolName = body.schoolName;
    if (body.sessionTitle !== undefined) newStructured.sessionTitle = body.sessionTitle;
    if (body.academicYear !== undefined) newStructured.academicYear = body.academicYear;
    if (body.sectionTitles !== undefined) newStructured.sectionTitles = body.sectionTitles;
    if (body.sectionDescriptions !== undefined) newStructured.sectionDescriptions = body.sectionDescriptions;
    if (body.code !== undefined) newStructured.code = body.code;
    if (body.variants !== undefined) {
      newStructured.variants = Array.isArray(body.variants)
        ? body.variants.map((v: any) => ({
            ...v,
            questions: Array.isArray(v.questions)
              ? v.questions.map((q: any) => ({
                  ...q,
                  content: typeof q.content === 'string' ? normalizeSvgGeometry(q.content) : q.content,
                  explanation: typeof q.explanation === 'string' ? normalizeSvgGeometry(q.explanation) : q.explanation,
                }))
              : v.questions,
          }))
        : body.variants;
    }

    updateData.structuredJson = JSON.stringify(newStructured);

    if (body.matrix) {
      updateData.cognitiveMatrix = JSON.stringify({
        knowledge: body.matrix.easy,
        comprehension: body.matrix.medium,
        application: body.matrix.hard,
        highApplication: body.matrix.veryHard,
      });
    }

    if (body.status) {
      updateData.status =
        body.status === 'approved'
          ? ExamStatus.COMPLETED
          : body.status === 'review'
          ? ExamStatus.GENERATING
          : ExamStatus.DRAFT;
    }

    const updated = await prisma.exam.update({
      where: { id },
      data: updateData,
    });

    // Synchronize disk artifact file if present
    if (existing.filePath) {
      try {
        const fullPath = path.isAbsolute(existing.filePath)
          ? existing.filePath
          : path.join(process.cwd(), existing.filePath);
        const existingData = await StorageManager.getExamArtifact(existing.filePath);
        await fs.writeFile(
          fullPath,
          JSON.stringify(
            {
              ...(existingData || {}),
              examId: existing.id,
              title: newStructured.title || existing.title,
              content: newStructured,
              updatedAt: new Date().toISOString(),
            },
            null,
            2
          ),
          'utf-8'
        );
      } catch (fileErr) {
        console.warn('Failed to update disk artifact:', fileErr);
      }
    }

    return apiSuccess({ examId: updated.id }, 'Đã cập nhật đề thi vào cơ sở dữ liệu');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error updating exam';
    return apiError(message, 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = req.headers.get('x-user-id');
  const userRole = req.headers.get('x-user-role');

  if (!userId) {
    return apiError('Authentication required', 401);
  }

  const { id } = await params;

  try {
    const existing = await prisma.exam.findUnique({
      where: { id },
    });

    if (!existing) {
      return apiError('Exam not found', 404);
    }

    if (existing.teacherId !== userId && userRole !== 'ADMIN') {
      return apiError('Permission denied', 403);
    }

    await prisma.exam.delete({
      where: { id },
    });

    if (existing.filePath) {
      try {
        await StorageManager.deleteExamArtifact(existing.filePath);
      } catch (err) {
        console.warn('Failed to delete disk artifact file:', err);
      }
    }

    return apiSuccess({ id }, 'Đã xóa đề thi khỏi cơ sở dữ liệu');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error deleting exam';
    return apiError(message, 500);
  }
}
