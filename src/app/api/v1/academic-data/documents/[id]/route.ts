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
  const doc = await AcademicStorage.getDocumentById(id);
  if (!doc) {
    return apiError('Không tìm thấy tài liệu học thuật', 404);
  }

  return apiSuccess({ document: doc }, 'Lấy chi tiết tài liệu thành công');
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
  const existing = await AcademicStorage.getDocumentById(id);
  if (!existing) {
    return apiError('Không tìm thấy tài liệu học thuật', 404);
  }

  try {
    const body = await req.json();
    const updated = await AcademicStorage.saveDocument({
      id,
      title: body.title !== undefined ? body.title : existing.title,
      docType: body.docType !== undefined ? body.docType : existing.docType,
      subject: body.subject !== undefined ? body.subject : existing.subject,
      grade: body.grade !== undefined ? body.grade : existing.grade,
      semester: body.semester !== undefined ? body.semester : existing.semester,
      source: body.source !== undefined ? body.source : existing.source,
      rawContent: body.rawContent !== undefined ? body.rawContent : existing.rawContent,
      teacherId,
      parseStatus: body.parseStatus !== undefined ? body.parseStatus : existing.parseStatus,
      parsedData: body.parsedData !== undefined ? body.parsedData : existing.parsedData,
    });

    return apiSuccess({ document: updated }, 'Cập nhật tài liệu thành công');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return apiError(`Lỗi cập nhật tài liệu: ${msg}`, 500);
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
  await AcademicStorage.deleteDocument(id);
  return apiSuccess({ deletedId: id }, 'Đã xóa tài liệu học thuật thành công');
}
