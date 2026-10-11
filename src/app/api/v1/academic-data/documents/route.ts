import { NextRequest } from 'next/server';
import { z } from 'zod';
import { AcademicStorage } from '@/core/storage/academic-storage';
import { apiError, apiSuccess } from '@/lib/utils';
import { AcademicDocType } from '@prisma/client';

const CreateDocumentSchema = z.object({
  title: z.string().min(3, 'Tiêu đề tài liệu phải từ 3 ký tự trở lên'),
  docType: z.enum(['EXAM', 'LESSON']),
  subject: z.string().min(1, 'Môn học không được để trống'),
  grade: z.string().min(1, 'Khối lớp không được để trống'),
  semester: z.string().optional(),
  source: z.string().optional(),
  rawContent: z.string().min(10, 'Nội dung tài liệu gốc phải từ 10 ký tự trở lên'),
});

export async function GET(req: NextRequest) {
  const teacherId = req.headers.get('x-user-id');
  if (!teacherId) {
    return apiError('Authentication required', 401);
  }

  const { searchParams } = new URL(req.url);
  const docType = searchParams.get('docType') as AcademicDocType | null;
  const subject = searchParams.get('subject') || undefined;
  const grade = searchParams.get('grade') || undefined;
  const search = searchParams.get('search') || undefined;

  try {
    const documents = await AcademicStorage.getDocuments({
      teacherId,
      docType: docType || undefined,
      subject,
      grade,
      search,
    });

    return apiSuccess({ documents }, 'Lấy danh sách tài liệu học thuật thành công');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return apiError(`Lỗi tải tài liệu học thuật: ${msg}`, 500);
  }
}

export async function POST(req: NextRequest) {
  const teacherId = req.headers.get('x-user-id');
  if (!teacherId) {
    return apiError('Authentication required', 401);
  }

  try {
    const body = await req.json();
    const validation = CreateDocumentSchema.safeParse(body);

    if (!validation.success) {
      return apiError(validation.error.flatten().fieldErrors, 422, 'Dữ liệu không hợp lệ');
    }

    const data = validation.data;
    const document = await AcademicStorage.saveDocument({
      title: data.title,
      docType: data.docType as AcademicDocType,
      subject: data.subject,
      grade: data.grade,
      semester: data.semester,
      source: data.source,
      rawContent: data.rawContent,
      teacherId,
    });

    return apiSuccess({ document }, 'Thêm tài liệu học thuật thành công', {}, 201);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return apiError(`Lỗi lưu tài liệu học thuật: ${msg}`, 500);
  }
}
