import { NextRequest } from 'next/server';
import { z } from 'zod';
import { AcademicStorage } from '@/core/storage/academic-storage';
import { AcademicParser } from '@/core/ai/academic-parser';
import { apiError, apiSuccess } from '@/lib/utils';

const GenerateSkillSchema = z.object({
  documentId: z.string().min(1, 'Thiếu documentId'),
  provider: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const teacherId = req.headers.get('x-user-id');
  if (!teacherId) {
    return apiError('Authentication required', 401);
  }

  try {
    const body = await req.json();
    const validation = GenerateSkillSchema.safeParse(body);
    if (!validation.success) {
      return apiError(validation.error.flatten().fieldErrors, 422, 'Tham số không hợp lệ');
    }

    const { documentId, provider } = validation.data;
    const document = await AcademicStorage.getDocumentById(documentId);
    if (!document) {
      return apiError('Không tìm thấy tài liệu học thuật', 404);
    }

    // Call AcademicParser to synthesize the skill
    const skillData = await AcademicParser.generateSkillFromDocument(document, provider);

    // Save the newly generated skill
    const savedSkill = await AcademicStorage.saveSkill({
      title: skillData.title,
      description: skillData.description,
      subject: document.subject,
      grade: document.grade,
      skillInstructions: skillData.skillInstructions,
      fewShotExamples: JSON.stringify(skillData.fewShotExamples || []),
      isActive: true,
      teacherId,
      documentId: document.id,
    });

    return apiSuccess(
      { skill: savedSkill },
      `Đã viết thành công kỹ năng AI từ tài liệu "${document.title}"!`,
      {},
      201
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return apiError(`Lỗi sinh kỹ năng AI từ tài liệu: ${msg}`, 500);
  }
}
