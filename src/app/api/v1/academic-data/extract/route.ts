import { NextRequest } from 'next/server';
import { z } from 'zod';
import { AcademicStorage } from '@/core/storage/academic-storage';
import { AcademicParser } from '@/core/ai/academic-parser';
import { apiError, apiSuccess } from '@/lib/utils';
import { ParseStatus } from '@prisma/client';

const ExtractSchema = z.object({
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
    const validation = ExtractSchema.safeParse(body);
    if (!validation.success) {
      return apiError(validation.error.flatten().fieldErrors, 422, 'Tham số không hợp lệ');
    }

    const { documentId, provider } = validation.data;
    const document = await AcademicStorage.getDocumentById(documentId);
    if (!document) {
      return apiError('Không tìm thấy tài liệu cần bóc tách', 404);
    }

    // Set parsing status
    await AcademicStorage.saveDocument({
      ...document,
      parseStatus: ParseStatus.PARSING,
    });

    // Execute AI extraction
    try {
      const parsedData = await AcademicParser.extractDocument(document, provider);
      const updatedDoc = await AcademicStorage.updateParsedData(
        documentId,
        parsedData,
        ParseStatus.PARSED
      );

      return apiSuccess(
        {
          document: updatedDoc,
          parsedData,
        },
        document.docType === 'EXAM'
          ? 'Bóc tách câu hỏi từ đề kiểm tra thành công!'
          : 'Bóc tách chủ đề, nội dung và câu hỏi từ bài học thành công!'
      );
    } catch (parseErr: unknown) {
      const errMsg = parseErr instanceof Error ? parseErr.message : String(parseErr);
      await AcademicStorage.saveDocument({
        ...document,
        parseStatus: ParseStatus.FAILED,
      });
      return apiError(`Lỗi trong quá trình bóc tách AI: ${errMsg}`, 500);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return apiError(`Lỗi yêu cầu bóc tách dữ liệu: ${msg}`, 500);
  }
}
