import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/utils';
import { MultimodalParser } from '@/core/ai/multimodal-parser';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Tối đa 5 phút cho việc upload & OCR các tệp dung lượng lớn lên đến 1GB

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let buffer: Buffer | null = null;
    let mimeType = '';
    let fileName = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return apiError('Không tìm thấy tệp được tải lên', 400);
      }

      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      mimeType = file.type || '';
      fileName = file.name || 'uploaded_document';

      // Fallback mime type if empty based on extension
      if (!mimeType) {
        const ext = fileName.split('.').pop()?.toLowerCase();
        if (ext === 'pdf') mimeType = 'application/pdf';
        else if (ext === 'docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        else if (ext === 'doc') mimeType = 'application/msword';
        else if (ext === 'png') mimeType = 'image/png';
        else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
        else if (ext === 'webp') mimeType = 'image/webp';
        else if (ext === 'txt') mimeType = 'text/plain';
      }
    } else if (contentType.includes('application/json')) {
      const body = await req.json();
      const { fileBase64, mimeType: bodyMime, fileName: bodyName } = body;

      if (!fileBase64) {
        return apiError('Dữ liệu base64 không hợp lệ', 400);
      }

      // Xử lý base64 string có thể có tiền tố data:image/png;base64,...
      const match = fileBase64.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        buffer = Buffer.from(match[2], 'base64');
      } else {
        mimeType = bodyMime || 'image/png';
        buffer = Buffer.from(fileBase64, 'base64');
      }
      fileName = bodyName || 'clipboard-image.png';
    } else {
      return apiError('Định dạng yêu cầu không được hỗ trợ', 400);
    }

    if (!buffer || buffer.length === 0) {
      return apiError('Tệp rỗng hoặc không thể xử lý', 400);
    }

    // Kiểm tra kích thước (tối đa 1GB)
    const MAX_UPLOAD_SIZE = 1024 * 1024 * 1024; // 1GB (1,073,741,824 bytes)
    if (buffer.length > MAX_UPLOAD_SIZE) {
      return apiError('Kích thước tệp quá lớn. Vui lòng tải lên tệp dưới 1GB', 400);
    }

    let extractedText = '';
    const lowerName = fileName.toLowerCase();

    // 1. Xử lý file Word .docx
    if (
      lowerName.endsWith('.docx') ||
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      extractedText = await MultimodalParser.parseDocx(buffer);
    }
    // 2. Xử lý file text / markdown
    else if (
      lowerName.endsWith('.txt') ||
      lowerName.endsWith('.md') ||
      mimeType === 'text/plain' ||
      mimeType === 'text/markdown'
    ) {
      extractedText = buffer.toString('utf-8');
    }
    // 3. Xử lý hình ảnh hoặc PDF bằng AI Multimodal / OCR
    else if (
      mimeType === 'application/pdf' ||
      mimeType.startsWith('image/') ||
      lowerName.endsWith('.pdf') ||
      /\.(png|jpg|jpeg|webp|gif|bmp)$/i.test(lowerName)
    ) {
      const effectiveMime = lowerName.endsWith('.pdf') ? 'application/pdf' : mimeType || 'image/png';
      extractedText = await MultimodalParser.parseImageOrPdf(buffer, effectiveMime);
    } else if (lowerName.endsWith('.doc')) {
      return apiError(
        'Định dạng Word cũ (.doc) không được hỗ trợ trực tiếp. Vui lòng lưu thành định dạng .docx hoặc xuất file PDF/ảnh để hệ thống xử lý tốt nhất.',
        400
      );
    } else {
      return apiError(`Định dạng tệp ${fileName} (${mimeType}) chưa được hỗ trợ.`, 400);
    }

    return apiSuccess({
      text: extractedText,
      fileName,
      mimeType,
      fileSize: buffer.length,
    });
  } catch (error: unknown) {
    console.error('Lỗi API OCR / Multimodal:', error);
    const message = error instanceof Error ? error.message : 'Lỗi xử lý trích xuất tài liệu';
    return apiError(message, 500);
  }
}
