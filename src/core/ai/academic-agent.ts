import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  AcademicStorage,
  AcademicDocumentRecord,
  AiSkillRecord,
  ExtractedExamData,
  ExtractedLessonData,
  ExtractedQuestion,
  ExtractedTopic,
  ExtractedConcept,
} from '@/core/storage/academic-storage';
import { AcademicDocType, ParseStatus } from '@prisma/client';

export interface AgentStepProgress {
  step: 'INIT' | 'PLANNING' | 'DIGITIZING' | 'SYNTHESIZING' | 'COMPLETED' | 'ERROR';
  progress: number; // 0 - 100
  message: string;
  details?: any;
  result?: {
    document?: AcademicDocumentRecord;
    skill?: AiSkillRecord;
  };
}

export class AcademicAgent {
  private static extractJson(rawText: string): any {
    let clean = rawText.trim();
    if (clean.startsWith('```')) {
      clean = clean.replace(/^```[a-zA-Z]*\n?/, '').replace(/```\s*$/, '').trim();
    }
    try {
      return JSON.parse(clean);
    } catch {
      const firstBrace = clean.indexOf('{');
      const lastBrace = clean.lastIndexOf('}');
      if (firstBrace >= 0 && lastBrace > firstBrace) {
        return JSON.parse(clean.substring(firstBrace, lastBrace + 1));
      }
      throw new Error('Không thể phân tích dữ liệu JSON từ AI');
    }
  }

  /**
   * Khởi chạy toàn bộ chu trình xử lý tự động của Academic Agent
   */
  public static async processDocumentWithAgent(params: {
    fileBuffer?: Buffer;
    fileName?: string;
    mimeType?: string;
    existingDocId?: string;
    teacherId: string;
    customTitle?: string;
    customSubject?: string;
    customGrade?: string;
    onProgress: (progress: AgentStepProgress) => Promise<void> | void;
  }): Promise<{ document: AcademicDocumentRecord; skill: AiSkillRecord }> {
    const {
      fileBuffer,
      fileName = 'Tài liệu học thuật',
      mimeType = 'application/pdf',
      existingDocId,
      teacherId,
      customTitle,
      customSubject,
      customGrade,
      onProgress,
    } = params;

    await onProgress({
      step: 'INIT',
      progress: 5,
      message: 'Khởi động Academic Processing Agent...',
    });

    const geminiKey = process.env.GEMINI_API_KEY?.split(/[,;\n]+/).map((k) => k.trim())[0];
    if (!geminiKey || geminiKey.includes('YourGemini')) {
      throw new Error('Google Gemini API Key chưa được cấu hình hoặc không hợp lệ.');
    }

    const genAI = new GoogleGenerativeAI(geminiKey);
    const modelCandidates = [
      'gemini-3.7-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.1-flash-lite',
      'gemini-flash-lite-latest',
      'gemini-3-flash-preview',
      'gemini-flash-latest',
      'gemini-3.5-flash',
      'gemini-3.8-flash',
    ];

    let isTextDocument =
      mimeType === 'text/plain' ||
      mimeType === 'text/markdown' ||
      fileName.endsWith('.txt') ||
      fileName.endsWith('.md');

    let rawTextContent = '';
    if (fileBuffer && isTextDocument) {
      rawTextContent = fileBuffer.toString('utf-8');
    }

    let fileManager: GoogleAIFileManager | null = null;
    let uploadedCloudFileName: string | null = null;
    let fileUri: string | null = null;
    let cloudMimeType = mimeType;
    let tempPath: string | null = null;

    try {
      // 1. Quản lý Tệp tải lên Google AI File API nếu là file nhị phân lớn (PDF / Image)
      if (fileBuffer && fileBuffer.length > 0 && !isTextDocument) {
        const isPdf = mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
        cloudMimeType = isPdf ? 'application/pdf' : mimeType;

        if (fileBuffer.length > 20 * 1024 * 1024) {
          // File > 20MB -> GoogleAIFileManager
          await onProgress({
            step: 'INIT',
            progress: 10,
            message: `Đang tải tệp lên Google Cloud Vision (${(fileBuffer.length / (1024 * 1024)).toFixed(1)} MB)...`,
          });

          tempPath = path.join(
            os.tmpdir(),
            `academic_agent_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${isPdf ? 'pdf' : 'bin'}`
          );
          await fs.promises.writeFile(tempPath, fileBuffer);

          fileManager = new GoogleAIFileManager(geminiKey);
          const uploadResult = await fileManager.uploadFile(tempPath, {
            mimeType: cloudMimeType,
            displayName: `academic-agent-${Date.now()}`,
          });
          uploadedCloudFileName = uploadResult.file.name;
          fileUri = uploadResult.file.uri;

          let fileInfo = await fileManager.getFile(uploadedCloudFileName);
          let wait = 0;
          while (fileInfo.state === 'PROCESSING' && wait < 30) {
            await onProgress({
              step: 'INIT',
              progress: 12 + Math.min(wait, 5),
              message: 'Google Cloud đang phân tích các trang tài liệu...',
            });
            await new Promise((r) => setTimeout(r, 2000));
            fileInfo = await fileManager.getFile(uploadedCloudFileName);
            wait++;
          }
        }
      }

      // Chuẩn bị content parts cho Gemini
      const buildContentParts = (promptText: string): any[] => {
        const parts: any[] = [];
        if (fileUri) {
          parts.push({ fileData: { mimeType: cloudMimeType, fileUri } });
        } else if (fileBuffer && !isTextDocument && fileBuffer.length <= 20 * 1024 * 1024) {
          parts.push({
            inlineData: {
              data: fileBuffer.toString('base64'),
              mimeType: cloudMimeType,
            },
          });
        }
        parts.push(promptText);
        return parts;
      };

      // =========================================================================
      // PHA 1: PLANNER AGENT - XÁC ĐỊNH LOẠI TÀI LIỆU & LẬP BẢN ĐỒ
      // =========================================================================
      await onProgress({
        step: 'PLANNING',
        progress: 20,
        message: 'Planner Agent đang phân loại và trinh sát cấu trúc tài liệu...',
      });

      // Heuristic nhanh phát hiện Đề thi vs Bài học
      const sampleText = (rawTextContent || fileName).toLowerCase();
      const isExamHeuristic =
        sampleText.includes('đề thi') ||
        sampleText.includes('đề kiểm tra') ||
        sampleText.includes('đề ôn tập') ||
        sampleText.includes('khảo sát') ||
        sampleText.includes('trắc nghiệm') ||
        sampleText.includes('câu 1') ||
        sampleText.includes('bài 1') ||
        sampleText.includes('khoanh vào');

      const plannerPrompt = `Bạn là Chuyên gia Học thuật & Planner Agent tại Việt Nam.
Nhiệm vụ: Phân tích tài liệu đính kèm để phân loại và lập cấu trúc:
1. Xác định chính xác loại tài liệu (docType):
   - "EXAM": Nếu đây là Đề thi, Đề kiểm tra, Đề ôn tập, Phiếu bài tập, Bộ câu hỏi.
   - "LESSON": Nếu đây là Sách giáo khoa (SGK), Giáo án, Chuyên đề lý thuyết, Bài học.
2. Xác định: Tiêu đề, Môn học, Khối lớp.
3. Nếu là EXAM: Ước lượng tổng số câu hỏi (totalQuestions) và các phần (ví dụ: Phần Trắc nghiệm, Phần Tự luận).
4. Nếu là LESSON: Liệt kê các Chương / Cụm bài học chính (units).

QUY TẮC: CHỈ XUẤT RA DUY NHẤT 1 CHUỖI JSON HỢP LỆ:
{
  "detectedTitle": "Tên tài liệu chuẩn xác",
  "detectedSubject": "Toán học | Ngữ văn | Tiếng Việt | Tiếng Anh | Vật lí | Hóa học | Sinh học | Lịch sử | Địa lí",
  "detectedGrade": "Lớp 1 | Lớp 2 | ... | Lớp 12",
  "docType": "${isExamHeuristic ? 'EXAM' : 'LESSON'}",
  "summary": "Tóm tắt ngắn 1-2 câu về nội dung",
  "totalEstimatedQuestions": 10,
  "units": [
    { "unitNumber": 1, "title": "Tên phần hoặc bài", "scope": "Mô tả ngắn" }
  ]
}

${rawTextContent ? `NỘI DUNG TÀI LIỆU TRÍCH ĐOẠN:\n"""\n${rawTextContent.slice(0, 15000)}\n"""` : ''}`;

      let blueprint: any = null;
      for (const mName of modelCandidates) {
        try {
          const model = genAI.getGenerativeModel({
            model: mName,
            generationConfig: { responseMimeType: 'application/json' },
          });
          const result = await model.generateContent(buildContentParts(plannerPrompt));
          const text = result.response.text();
          if (text) {
            blueprint = this.extractJson(text);
            if (blueprint?.docType) break;
          }
        } catch (e: any) {
          console.warn(`Planner agent attempt failed with ${mName}:`, e?.message);
        }
      }

      const detectedDocType: AcademicDocType =
        blueprint?.docType === 'EXAM' || isExamHeuristic
          ? AcademicDocType.EXAM
          : AcademicDocType.LESSON;

      const finalTitle = customTitle || blueprint?.detectedTitle || fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      const finalSubject = customSubject || blueprint?.detectedSubject || 'Toán học';
      const finalGrade = customGrade || blueprint?.detectedGrade || 'Lớp 1';

      await onProgress({
        step: 'PLANNING',
        progress: 35,
        message: `Đã xác lập phân loại: [${detectedDocType === AcademicDocType.EXAM ? 'ĐỀ KIỂM TRA' : 'BÀI HỌC / SGK'}] - ${finalTitle}`,
        details: blueprint,
      });

      // =========================================================================
      // PHA 2: EXTRACTOR / CHUNK WORKER - BÓC TÁCH NỘI DUNG THỰC TẾ
      // =========================================================================
      let finalParsedData: any = null;
      const extractedQuestions: ExtractedQuestion[] = [];

      if (detectedDocType === AcademicDocType.EXAM) {
        // TRƯỜNG HỢP A: BÓC TÁCH ĐỀ THI (100% CÂU HỎI THẬT)
        await onProgress({
          step: 'DIGITIZING',
          progress: 50,
          message: 'Extractor Agent đang trích xuất nguyên văn toàn bộ câu hỏi trắc nghiệm & tự luận...',
        });

        const examExtractPrompt = `Bạn là Chuyên gia Khảo thí và Số hóa Đề thi hàng đầu tại Việt Nam.
NHIỆM VỤ: Hãy bóc tách CHÍNH XÁC 100% TOÀN BỘ các câu hỏi từ đề kiểm tra sau đây.

QUY TẮC BẮT BUỘC:
1. Bóc tách trung thực NGUYÊN VĂN TẤT CẢ các câu hỏi có trong đề (cả phần Trắc nghiệm và Tự luận). Tuyệt đối KHÔNG tự sáng tác câu hỏi mới.
2. Giữ nguyên số thứ tự câu (Câu 1, Câu 2... hoặc Bài 1, Bài 2...).
3. Với câu trắc nghiệm:
   - "type": "MULTIPLE_CHOICE"
   - "options": Mảng 4 phương án ["A. ...", "B. ...", "C. ...", "D. ..."].
   - "correctAnswer": Đáp án đúng ("A", "B", "C" hoặc "D").
   - "explanation": Lời giải chi tiết và phân tích tại sao đáp án đó đúng.
4. Với câu tự luận / điền số:
   - "type": "ESSAY" hoặc "SHORT_ANSWER"
   - "options": []
   - "correctAnswer": Đáp số / Hướng dẫn barem điểm.
   - "explanation": Lời giải chi tiết từng bước.
5. Bảo toàn công thức Toán/KHTN dưới dạng LaTeX: $...$ hoặc $$...$$.
6. Phân loại chuẩn xác cognitiveLevel:
   - "KNOWLEDGE" (Nhận biết)
   - "COMPREHENSION" (Thông hiểu)
   - "APPLICATION" (Vận dụng)
   - "HIGH_APPLICATION" (Vận dụng cao)
7. CHỈ TRẢ VỀ DUY NHẤT 1 CHUỖI JSON HỢP LỆ:
{
  "examTitle": "${finalTitle}",
  "totalExtractedQuestions": 10,
  "questions": [
    {
      "questionNumber": 1,
      "type": "MULTIPLE_CHOICE",
      "cognitiveLevel": "KNOWLEDGE",
      "content": "Nội dung câu hỏi nguyên văn...",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "correctAnswer": "A",
      "explanation": "Lời giải chi tiết...",
      "points": 0.5
    }
  ]
}

${rawTextContent ? `NỘI DUNG ĐỀ THI GỐC:\n"""\n${rawTextContent.slice(0, 30000)}\n"""` : ''}`;

        let examResultJson: any = null;
        for (const mName of modelCandidates) {
          try {
            const model = genAI.getGenerativeModel({
              model: mName,
              generationConfig: { responseMimeType: 'application/json' },
            });
            const res = await model.generateContent(buildContentParts(examExtractPrompt));
            const text = res.response.text();
            if (text) {
              examResultJson = this.extractJson(text);
              if (examResultJson?.questions && Array.isArray(examResultJson.questions)) break;
            }
          } catch (e: any) {
            console.warn(`Exam extraction failed with ${mName}:`, e?.message);
          }
        }

        if (examResultJson?.questions && Array.isArray(examResultJson.questions)) {
          extractedQuestions.push(...examResultJson.questions);
        }

        finalParsedData = {
          examTitle: finalTitle,
          totalExtractedQuestions: extractedQuestions.length,
          questions: extractedQuestions,
        } as ExtractedExamData;
      } else {
        // TRƯỜNG HỢP B: BÓC TÁCH SÁCH GIÁO KHOA / CHUYÊN ĐỀ BÀI HỌC
        await onProgress({
          step: 'DIGITIZING',
          progress: 50,
          message: 'Chunk Worker đang bóc tách chuyên sâu các bài học và bài tập trong sách...',
        });

        const lessonExtractPrompt = `Bạn là Chuyên gia Sư phạm Sách Giáo Khoa tại Việt Nam.
NHIỆM VỤ: Bóc tách cấu trúc bài học thực tế, lý thuyết trọng tâm và CÁC BÀI TẬP CÓ TRONG SÁCH từ tài liệu đính kèm:
1. Bóc tách trung thực các chủ đề/bài học có thật trong sách (mainTopics).
2. Tóm tắt các định nghĩa, quy tắc, công thức LaTeX (coreKnowledgePoints).
3. Trích xuất CÁC BÀI TẬP / CÂU HỎI CÓ THẬT TRONG SÁCH (extractedQuestions). Giữ nguyên ngữ liệu bài học, tuyệt đối không bịa câu hỏi chung chung.

CHỈ TRẢ VỀ DUY NHẤT 1 CHUỖI JSON HỢP LỆ:
{
  "lessonTitle": "${finalTitle}",
  "mainTopics": [
    {
      "title": "Tên bài học / chương cụ thể...",
      "summary": "Mục tiêu và kiến thức chính của bài...",
      "keyConcepts": ["Khái niệm 1", "Khái niệm 2"]
    }
  ],
  "coreKnowledgePoints": [
    {
      "concept": "Tên kiến thức / quy tắc / định lý...",
      "details": "Nội dung chi tiết kèm công thức LaTeX $...$...",
      "notes": "Lưu ý sư phạm..."
    }
  ],
  "extractedQuestions": [
    {
      "questionNumber": 1,
      "type": "MULTIPLE_CHOICE",
      "cognitiveLevel": "COMPREHENSION",
      "content": "Nội dung bài tập hoặc câu hỏi trong bài...",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "correctAnswer": "A",
      "explanation": "Hướng dẫn giải chi tiết...",
      "points": 1.0
    }
  ]
}

${rawTextContent ? `NỘI DUNG TÀI LIỆU GỐC:\n"""\n${rawTextContent.slice(0, 30000)}\n"""` : ''}`;

        let lessonResultJson: any = null;
        for (const mName of modelCandidates) {
          try {
            const model = genAI.getGenerativeModel({
              model: mName,
              generationConfig: { responseMimeType: 'application/json' },
            });
            const res = await model.generateContent(buildContentParts(lessonExtractPrompt));
            const text = res.response.text();
            if (text) {
              lessonResultJson = this.extractJson(text);
              if (lessonResultJson?.mainTopics) break;
            }
          } catch (e: any) {
            console.warn(`Lesson extraction failed with ${mName}:`, e?.message);
          }
        }

        const mainTopics: ExtractedTopic[] = lessonResultJson?.mainTopics || [
          { title: finalTitle, summary: 'Nội dung bài học', keyConcepts: ['Khái niệm trọng tâm'] },
        ];
        const coreKnowledgePoints: ExtractedConcept[] = lessonResultJson?.coreKnowledgePoints || [
          { concept: 'Kiến thức cốt lõi', details: 'Nội dung chi tiết bài học', notes: 'Ghi nhớ trọng tâm' },
        ];
        if (lessonResultJson?.extractedQuestions && Array.isArray(lessonResultJson.extractedQuestions)) {
          extractedQuestions.push(...lessonResultJson.extractedQuestions);
        }

        finalParsedData = {
          lessonTitle: finalTitle,
          mainTopics,
          coreKnowledgePoints,
          extractedQuestions,
        } as ExtractedLessonData;
      }

      await onProgress({
        step: 'DIGITIZING',
        progress: 80,
        message: `Đã bóc tách thành công: ${extractedQuestions.length} câu hỏi và dữ liệu cấu trúc chuẩn xác.`,
      });

      // =========================================================================
      // PHA 3: SYNTHESIZER AGENT - TỔNG HỢP & TẠO KỸ NĂNG AI (AI SKILL)
      // =========================================================================
      await onProgress({
        step: 'SYNTHESIZING',
        progress: 85,
        message: 'Synthesizer Agent đang đúc kết Kỹ năng Sư phạm độc quyền cho AI...',
      });

      const skillTitle = `Kỹ năng chuẩn sư phạm: ${finalTitle}`;
      const skillDescription = `Bộ quy chuẩn sư phạm bám sát "${finalTitle}" (${finalSubject} - ${finalGrade}), phân hóa Bloom và câu hỏi thực chứng.`;

      const skillInstructions = `=== BỘ QUY CHUẨN SƯ PHẠM: ${finalTitle} ===
1. ĐỊNH HƯỚNG MA TRẬN & NHẬN THỨC:
- Môn học: ${finalSubject} | Cấp độ: ${finalGrade}
- Loại tài liệu gốc: ${detectedDocType === AcademicDocType.EXAM ? 'Đề thi chuẩn hóa' : 'Sách giáo khoa / Chuyên đề'}
- Tuân thủ phân hóa 4 cấp độ nhận thức Bloom:
  + Nhận biết (40%): Tái hiện định nghĩa, công thức, nhận diện đại lượng.
  + Thông hiểu (30%): Giải thích, biến đổi công thức, so sánh, phân loại.
  + Vận dụng (20%): Áp dụng công thức vào bài toán đơn hoặc thực tiễn.
  + Vận dụng cao (10%): Bài toán tổng hợp, tư duy logic nhiều bước.

2. QUY CHUẨN ĐỊNH DẠNG & CÂU HỎI:
- Bắt buộc dùng ký hiệu LaTeX $...$ hoặc $$...$$ cho toàn bộ công thức Toán học, Vật lí, Hóa học.
- Các phương án nhiễu (B, C, D) phải xuất phát từ sai lầm tư duy điển hình của học sinh.
- Lời giải chi tiết phải giải thích lý do chọn đáp án đúng và phân tích lỗi sai của các phương án khác.`;

      // 4. Lưu vào AcademicStorage
      const savedDoc = await AcademicStorage.saveDocument({
        id: existingDocId,
        title: finalTitle,
        docType: detectedDocType,
        subject: finalSubject,
        grade: finalGrade,
        source: fileName,
        rawContent:
          rawTextContent ||
          `[Số hóa tự động bởi Autonomous Academic Agent]\n\nTiêu đề: ${finalTitle}\nMôn: ${finalSubject} - ${finalGrade}\nLoại: ${
            detectedDocType === AcademicDocType.EXAM ? 'Đề kiểm tra' : 'Sách giáo khoa'
          }\nSố câu hỏi trích xuất: ${extractedQuestions.length}`,
        teacherId,
        parseStatus: ParseStatus.PARSED,
        parsedData: JSON.stringify(finalParsedData),
      });

      await AcademicStorage.updateParsedData(savedDoc.id, finalParsedData, ParseStatus.PARSED);

      const savedSkill = await AcademicStorage.saveSkill({
        title: skillTitle,
        description: skillDescription,
        subject: finalSubject,
        grade: finalGrade,
        skillInstructions: skillInstructions,
        fewShotExamples: JSON.stringify(extractedQuestions.slice(0, 4)),
        isActive: true,
        teacherId,
        documentId: savedDoc.id,
      });

      await onProgress({
        step: 'COMPLETED',
        progress: 100,
        message: `Số hóa thành công [${detectedDocType === AcademicDocType.EXAM ? 'ĐỀ THI' : 'SGK'}]! Đã bóc tách ${extractedQuestions.length} câu hỏi và lưu Kỹ năng AI.`,
        result: {
          document: savedDoc,
          skill: savedSkill,
        },
      });

      return { document: savedDoc, skill: savedSkill };
    } finally {
      if (fileManager && uploadedCloudFileName) {
        fileManager.deleteFile(uploadedCloudFileName).catch(() => null);
      }
      if (tempPath) {
        fs.promises.unlink(tempPath).catch(() => null);
      }
    }
  }
}
