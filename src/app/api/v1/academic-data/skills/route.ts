import { NextRequest } from 'next/server';
import { z } from 'zod';
import { AcademicStorage } from '@/core/storage/academic-storage';
import { apiError, apiSuccess } from '@/lib/utils';

const CreateSkillSchema = z.object({
  title: z.string().min(3, 'Tên kỹ năng phải từ 3 ký tự trở lên'),
  description: z.string().optional(),
  subject: z.string().min(1, 'Môn học không được để trống'),
  grade: z.string().min(1, 'Khối lớp không được để trống'),
  skillInstructions: z.string().min(10, 'Hướng dẫn quy chuẩn kỹ năng phải từ 10 ký tự trở lên'),
  fewShotExamples: z.any().optional(),
  documentId: z.string().optional(),
  isActive: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  const teacherId = req.headers.get('x-user-id');
  if (!teacherId) {
    return apiError('Authentication required', 401);
  }

  const { searchParams } = new URL(req.url);
  const subject = searchParams.get('subject') || undefined;
  const grade = searchParams.get('grade') || undefined;
  const activeParam = searchParams.get('isActive');
  const isActive = activeParam !== null ? activeParam === 'true' : undefined;

  try {
    const skills = await AcademicStorage.getSkills({
      teacherId,
      subject,
      grade,
      isActive,
    });

    return apiSuccess({ skills }, 'Lấy danh sách kỹ năng AI thành công');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return apiError(`Lỗi tải kỹ năng AI: ${msg}`, 500);
  }
}

export async function POST(req: NextRequest) {
  const teacherId = req.headers.get('x-user-id');
  if (!teacherId) {
    return apiError('Authentication required', 401);
  }

  try {
    const body = await req.json();
    const validation = CreateSkillSchema.safeParse(body);

    if (!validation.success) {
      return apiError(validation.error.flatten().fieldErrors, 422, 'Dữ liệu không hợp lệ');
    }

    const data = validation.data;
    const fewShotExamplesStr =
      typeof data.fewShotExamples === 'string'
        ? data.fewShotExamples
        : data.fewShotExamples
        ? JSON.stringify(data.fewShotExamples)
        : null;

    const skill = await AcademicStorage.saveSkill({
      title: data.title,
      description: data.description,
      subject: data.subject,
      grade: data.grade,
      skillInstructions: data.skillInstructions,
      fewShotExamples: fewShotExamplesStr,
      isActive: data.isActive,
      teacherId,
      documentId: data.documentId,
    });

    return apiSuccess({ skill }, 'Tạo kỹ năng AI thành công', {}, 201);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return apiError(`Lỗi lưu kỹ năng AI: ${msg}`, 500);
  }
}
