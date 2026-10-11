import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import JSZip from 'jszip';
import OpenAI from 'openai';
import fs from 'fs';
import os from 'os';
import path from 'path';

export class MultimodalParser {
  /**
   * Trích xuất văn bản từ file Word (.docx) bằng JSZip
   */
  public static async parseDocx(buffer: Buffer): Promise<string> {
    try {
      const zip = await JSZip.loadAsync(buffer);
      const docXmlFile = zip.file('word/document.xml');
      if (!docXmlFile) {
        throw new Error('Tệp không đúng định dạng Word (.docx)');
      }

      const xmlContent = await docXmlFile.async('text');

      // Tách theo từng thẻ paragraph <w:p>
      const paragraphs = xmlContent.split(/<\/w:p>/gi);
      const textLines: string[] = [];

      for (const p of paragraphs) {
        // Trích xuất tất cả text bên trong <w:t>...</w:t>
        const matches = p.match(/<w:t(?:\s+[^>]*)?>([^<]*)<\/w:t>/gi);
        if (matches) {
          const lineText = matches
            .map((m) => m.replace(/<[^>]+>/g, ''))
            .join('')
            .trim();
          if (lineText) {
            textLines.push(lineText);
          }
        }
      }

      if (textLines.length === 0) {
        // Fallback: strip all tags
        const stripped = xmlContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        return stripped;
      }

      return textLines.join('\n');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Lỗi đọc file Word .docx: ${msg}`);
    }
  }

  /**
   * Trích xuất nội dung từ Hình ảnh hoặc PDF bằng AI Vision & Multimodal
   */
  public static async parseImageOrPdf(
    buffer: Buffer,
    mimeType: string,
    customInstructions?: string
  ): Promise<string> {
    const isPdf = mimeType === 'application/pdf';
    const isImage = mimeType.startsWith('image/');

    // 0. Nếu là file PDF có sẵn Text Layer (PDF xuất từ Word/LaTeX), trích xuất nhanh offline bằng pdf-parse
    if (isPdf) {
      try {
        const { PDFParse } = await import('pdf-parse');
        const parser = new PDFParse(new Uint8Array(buffer));
        const parsed = await parser.getText();
        const rawPdfText = (parsed?.text || '').trim();
        // Loại bỏ các dòng đánh dấu trang dạng '-- 1 of 103 --'
        const cleaned = rawPdfText.replace(/--\s*\d+\s*of\s*\d+\s*--/gi, '').trim();
        if (cleaned.length > 50) {
          return cleaned;
        }
      } catch (pdfErr) {
        console.warn('Local PDF text parsing skipped, falling back to AI Vision/OCR:', pdfErr);
      }
    }

    const basePrompt = `Bạn là chuyên gia số hóa đề thi và tài liệu học thuật tại Việt Nam.
Nhiệm vụ của bạn là đọc và trích xuất TOÀN BỘ nội dung từ tài liệu/hình ảnh đính kèm:
1. Trích xuất chính xác 100% từng câu hỏi, bài tập, lý thuyết, bảng dữ liệu.
2. Giữ nguyên số thứ tự câu (Câu 1, Câu 2...), các phương án lựa chọn A, B, C, D (hoặc a, b, c, d).
3. Chuyển đổi TẤT CẢ các công thức Toán học, Vật lý, Hóa học sang chuẩn ký hiệu LaTeX:
   - Dùng $...$ cho công thức trong dòng.
   - Dùng $$...$$ cho công thức riêng một dòng.
4. Giữ nguyên dấu tiếng Việt chuẩn xác và định dạng phân đoạn.
5. CHỈ TRẢ VỀ NỘI DUNG VĂN BẢN TRÍCH XUẤT ĐÃ ĐƯỢC ĐỊNH DẠNG. Tuyệt đối không thêm lời chào, nhận xét hay bọc trong markdown code fence.`;

    const finalPrompt = customInstructions
      ? `${basePrompt}\n\nLưu ý thêm từ giáo viên: ${customInstructions}`
      : basePrompt;

    let detailedError = '';

    // 1. Thử qua Google Gemini (Hỗ trợ cả PDF lẫn Hình ảnh cực mạnh lên tới 1GB/2GB)
    const geminiKey = process.env.GEMINI_API_KEY?.split(/[,;\n]+/).map((k) => k.trim())[0];
    if (geminiKey && !geminiKey.includes('YourGemini')) {
      const primaryModel = (process.env.GEMINI_MODEL || 'gemini-flash-latest').split(',')[0].trim();
      const modelCandidates = Array.from(
        new Set([
          'gemini-3.7-flash',
          'gemini-3.5-flash-lite',
          'gemini-3.1-flash-lite',
          'gemini-flash-lite-latest',
          'gemini-3-flash-preview',
          primaryModel,
          'gemini-flash-latest',
          'gemini-3.5-flash',
          'gemini-3.8-flash',
        ])
      );

      const genAI = new GoogleGenerativeAI(geminiKey);

      // A. Nếu file > 20MB (tối đa 1GB), sử dụng GoogleAIFileManager để upload và xử lý
      if (buffer.length > 20 * 1024 * 1024) {
        const tempPath = path.join(
          os.tmpdir(),
          `academic_upload_${Date.now()}_${Math.random().toString(36).substring(7)}.${isPdf ? 'pdf' : 'bin'}`
        );
        await fs.promises.writeFile(tempPath, buffer);
        let fileManager: GoogleAIFileManager | null = null;
        let uploadedCloudFileName: string | null = null;
        try {
          fileManager = new GoogleAIFileManager(geminiKey);
          const uploadResult = await fileManager.uploadFile(tempPath, {
            mimeType: isPdf ? 'application/pdf' : mimeType,
            displayName: `academic-upload-${Date.now()}`,
          });
          uploadedCloudFileName = uploadResult.file.name;

          // Chờ nếu file đang trong trạng thái xử lý (PROCESSING)
          let fileInfo = await fileManager.getFile(uploadResult.file.name);
          let waitAttempts = 0;
          while (fileInfo.state === 'PROCESSING' && waitAttempts < 30) {
            await new Promise((r) => setTimeout(r, 2000));
            fileInfo = await fileManager.getFile(uploadResult.file.name);
            waitAttempts++;
          }

          if (fileInfo.state === 'FAILED') {
            throw new Error('Google AI File Manager: Tệp tải lên bị lỗi xử lý trên máy chủ.');
          }

          // Lần lượt thử qua danh sách model fallback với cùng fileUri đã upload
          for (const mName of modelCandidates) {
            try {
              const model = genAI.getGenerativeModel({ model: mName });
              const result = await model.generateContent([
                {
                  fileData: {
                    mimeType: uploadResult.file.mimeType,
                    fileUri: uploadResult.file.uri,
                  },
                },
                finalPrompt,
              ]);

              const text = result.response.text();
              if (text && text.trim()) {
                return text.trim();
              }
            } catch (modelErr: any) {
              const errMsg = modelErr?.message || String(modelErr);
              console.warn(`Gemini model ${mName} attempt failed:`, errMsg);

              if (errMsg.includes('CONSUMER_SUSPENDED')) {
                detailedError =
                  'Google Gemini API Key hiện tại đã bị tạm ngưng/khóa bởi Google (403 CONSUMER_SUSPENDED). Vui lòng cập nhật API Key mới trong trang Cài đặt AI (Admin) hoặc tệp .env.';
                break;
              } else if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('key not valid')) {
                detailedError = 'Google Gemini API Key không hợp lệ. Vui lòng kiểm tra lại cấu hình API Key.';
                break;
              } else if (errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('429')) {
                detailedError = 'Google Gemini API Key đã hết lượt gọi trong ngày (Rate Limit / Quota Exceeded).';
              }
            }
          }
        } finally {
          if (fileManager && uploadedCloudFileName) {
            fileManager.deleteFile(uploadedCloudFileName).catch(() => null);
          }
          fs.promises.unlink(tempPath).catch(() => null);
        }
      } else {
        // B. File <= 20MB: Sử dụng inlineData base64 trực tiếp
        for (const mName of modelCandidates) {
          try {
            const model = genAI.getGenerativeModel({ model: mName });
            const result = await model.generateContent([
              {
                inlineData: {
                  data: buffer.toString('base64'),
                  mimeType: isPdf ? 'application/pdf' : mimeType,
                },
              },
              finalPrompt,
            ]);

            const text = result.response.text();
            if (text && text.trim()) {
              return text.trim();
            }
          } catch (modelErr: any) {
            const errMsg = modelErr?.message || String(modelErr);
            console.warn(`Gemini model ${mName} inline attempt failed:`, errMsg);

            if (errMsg.includes('CONSUMER_SUSPENDED')) {
              detailedError =
                'Google Gemini API Key hiện tại đã bị tạm ngưng/khóa bởi Google (403 CONSUMER_SUSPENDED). Vui lòng cập nhật API Key mới trong trang Cài đặt AI (Admin) hoặc tệp .env.';
              break;
            } else if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('key not valid')) {
              detailedError = 'Google Gemini API Key không hợp lệ. Vui lòng kiểm tra lại cấu hình API Key.';
              break;
            } else if (errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('429')) {
              detailedError = 'Google Gemini API Key đã hết lượt gọi trong ngày (Rate Limit / Quota Exceeded).';
            }
          }
        }
      }
    }

    // 2. Thử qua OpenAI Vision (đối với ảnh)
    const openaiKey = process.env.OPENAI_API_KEY?.split(/[,;\n]+/).map((k) => k.trim())[0];
    if (openaiKey && !openaiKey.includes('your-openai') && isImage) {
      try {
        const openai = new OpenAI({ apiKey: openaiKey });
        const base64Image = buffer.toString('base64');
        const dataUrl = `data:${mimeType};base64,${base64Image}`;

        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: finalPrompt },
                {
                  type: 'image_url',
                  image_url: { url: dataUrl, detail: 'high' },
                },
              ],
            },
          ],
          max_tokens: 4000,
        });

        const text = response.choices[0]?.message?.content;
        if (text && text.trim()) {
          return text.trim();
        }
      } catch (openaiErr) {
        console.warn('OpenAI vision extraction failed:', openaiErr);
      }
    }

    throw new Error(
      detailedError ||
        `Không thể nhận diện nội dung từ tệp ${isPdf ? 'PDF' : 'ảnh'}. Tệp PDF này chứa hình ảnh quét (Scan) nên cần AI Vision để bóc tách, nhưng API Key hiện tại không khả dụng. Vui lòng cấu hình Gemini API Key hoặc OpenAI API Key trong trang Quản trị (#admin) hoặc tệp .env.`
    );
  }
}
