import { NextRequest } from 'next/server';
import { AcademicAgent } from '@/core/ai/academic-agent';
import { AcademicStorage } from '@/core/storage/academic-storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Tối đa 5 phút cho việc số hóa đa luồng qua Agent

export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') || '';
  let fileBuffer: Buffer | undefined = undefined;
  let fileName = 'academic_document';
  let mimeType = 'application/pdf';
  let existingDocId: string | undefined = undefined;
  let customTitle: string | undefined = undefined;
  let customSubject: string | undefined = undefined;
  let customGrade: string | undefined = undefined;
  let teacherId = 'teacher_default';

  // Trích xuất teacherId từ auth header nếu có
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
        if (payload?.sub) teacherId = payload.sub;
      }
    } catch {
      // Dùng fallback teacher_default
    }
  }

  try {
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      if (file) {
        const ab = await file.arrayBuffer();
        fileBuffer = Buffer.from(ab);
        fileName = file.name;
        mimeType = file.type || 'application/pdf';
      }

      existingDocId = (formData.get('existingDocId') as string) || undefined;
      customTitle = (formData.get('title') as string) || undefined;
      customSubject = (formData.get('subject') as string) || undefined;
      customGrade = (formData.get('grade') as string) || undefined;
    } else if (contentType.includes('application/json')) {
      const body = await req.json();
      existingDocId = body.existingDocId;
      customTitle = body.title;
      customSubject = body.subject;
      customGrade = body.grade;

      if (body.fileBase64) {
        const match = body.fileBase64.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          mimeType = match[1];
          fileBuffer = Buffer.from(match[2], 'base64');
        } else {
          mimeType = body.mimeType || 'application/pdf';
          fileBuffer = Buffer.from(body.fileBase64, 'base64');
        }
        fileName = body.fileName || 'uploaded_document.pdf';
      }
    }

    // Nếu không có file mới nhưng có existingDocId, lấy nội dung từ tài liệu có sẵn
    if ((!fileBuffer || fileBuffer.length === 0) && existingDocId) {
      const existing = await AcademicStorage.getDocumentById(existingDocId);
      if (existing) {
        fileBuffer = Buffer.from(existing.rawContent, 'utf-8');
        fileName = `${existing.title}.txt`;
        mimeType = 'text/plain';
        if (!customTitle) customTitle = existing.title;
        if (!customSubject) customSubject = existing.subject;
        if (!customGrade) customGrade = existing.grade;
      }
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'Vui lòng cung cấp tệp tải lên hoặc mã tài liệu hợp lệ.',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      );
    }

    // Thiết lập Server-Sent Events (SSE) Stream
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();

    const sendEvent = async (data: any) => {
      try {
        await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      } catch {
        // connection closed
      }
    };

    // Chạy background Agent và truyền luồng sự kiện
    (async () => {
      try {
        await AcademicAgent.processDocumentWithAgent({
          fileBuffer,
          fileName,
          mimeType,
          existingDocId,
          teacherId,
          customTitle,
          customSubject,
          customGrade,
          onProgress: async (p) => {
            await sendEvent(p);
          },
        });
      } catch (err: any) {
        console.error('Academic Agent execution error:', err);
        await sendEvent({
          step: 'ERROR',
          progress: 0,
          message: err?.message || 'Lỗi không xác định khi chạy Academic Agent.',
        });
      } finally {
        try {
          await writer.close();
        } catch {
          // ignore
        }
      }
    })();

    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Tắt buffering trên Nginx / reverse proxies
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        error: err?.message || 'Lỗi khởi chạy tác vụ Agent',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  }
}
