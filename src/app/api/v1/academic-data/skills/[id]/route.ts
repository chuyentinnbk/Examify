import { NextRequest } from 'next/server';
import { AcademicStorage } from '@/core/storage/academic-storage';
import { apiError, apiSuccess } from '@/lib/utils';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const teacherId = req.headers.get('x-user-id');
  if (!teacherId) {
    return apiError('Authentication required', 401);
  }

  const { id } = await params;
  const skill = await AcademicStorage.getSkillById(id);
  if (!skill) {
    return apiError('Không tìm thấy kỹ năng AI', 404);
  }

  return apiSuccess({ skill }, 'Lấy chi tiết kỹ năng AI thành công');
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const teacherId = req.headers.get('x-user-id');
  if (!teacherId) {
    return apiError('Authentication required', 401);
  }

  const { id } = await params;
  const existing = await AcademicStorage.getSkillById(id);
  if (!existing) {
    return apiError('Không tìm thấy kỹ năng AI', 404);
  }

  try {
    const body = await req.json();

    if (typeof body.isActive === 'boolean' && Object.keys(body).length === 1) {
      const updated = await AcademicStorage.toggleSkillActive(id, body.isActive);
      return apiSuccess({ skill: updated }, 'Cập nhật trạng thái kỹ năng AI thành công');
    }

    const fewShotExamplesStr =
      body.fewShotExamples !== undefined
        ? typeof body.fewShotExamples === 'string'
          ? body.fewShotExamples
          : JSON.stringify(body.fewShotExamples)
        : existing.fewShotExamples;

    const updated = await AcademicStorage.saveSkill({
      id,
      title: body.title !== undefined ? body.title : existing.title,
      description: body.description !== undefined ? body.description : existing.description,
      subject: body.subject !== undefined ? body.subject : existing.subject,
      grade: body.grade !== undefined ? body.grade : existing.grade,
      skillInstructions: body.skillInstructions !== undefined ? body.skillInstructions : existing.skillInstructions,
      fewShotExamples: fewShotExamplesStr,
      isActive: body.isActive !== undefined ? body.isActive : existing.isActive,
      teacherId,
      documentId: body.documentId !== undefined ? body.documentId : existing.documentId,
    });

    return apiSuccess({ skill: updated }, 'Cập nhật kỹ năng AI thành công');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return apiError(`Lỗi cập nhật kỹ năng AI: ${msg}`, 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const teacherId = req.headers.get('x-user-id');
  if (!teacherId) {
    return apiError('Authentication required', 401);
  }

  const { id } = await params;
  await AcademicStorage.deleteSkill(id);
  return apiSuccess({ deletedId: id }, 'Đã xóa kỹ năng AI thành công');
}
