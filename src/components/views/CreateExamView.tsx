'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAppStore, ExamItem, ExamQuestion, QuestionType } from '@/lib/store/app-store';
import UserAvatar from '@/components/common/UserAvatar';
import PortalModal from '@/components/common/PortalModal';
import { isQuestionDuplicate, getCurriculumQuestion, extractCleanShortAnswerValue } from '@/lib/curriculum-questions';
import {
  normalizeQuestionType,
  calculateMinOneCognitiveCounts,
  EXAM_FORMAT_PRESETS,
  CognitiveMatrixPercent,
} from '@/lib/exam-sections';
import { generateExamVariants } from '@/lib/exam-shuffler';

interface SkillOption {
  id: string;
  title: string;
  description?: string | null;
  subject: string;
  grade: string;
  skillInstructions: string;
  fewShotExamples?: string | null;
  isActive: boolean;
}

interface ModelOption {
  id: string;
  name: string;
  provider?: string;
  description?: string;
  isDefault?: boolean;
}

interface ProviderInfo {
  id: string;
  name: string;
  hasKey: boolean;
  maskedKey?: string;
  currentModel?: string;
  endpoint?: string;
}

export default function CreateExamView() {
  const { addExam, setActiveExam, setCurrentRoute, showToast, user } = useAppStore();

  const [level, setLevel] = useState('UPPER_SEC');
  const [grade, setGrade] = useState('Lớp 12');
  const [semester, setSemester] = useState<'Học kỳ 1' | 'Học kỳ 2'>('Học kỳ 1');
  const [subject, setSubject] = useState('Toán học');
  const [examType, setExamType] = useState('MID_TERM_1');
  const [duration, setDuration] = useState(90);
  const [questionCount, setQuestionCount] = useState(22);

  const handleExamTypeChange = (newType: string) => {
    setExamType(newType);
    if (newType === 'MID_TERM_1' || newType === 'FINAL_TERM_1') {
      setSemester('Học kỳ 1');
    } else if (newType === 'MID_TERM_2' || newType === 'FINAL_TERM_2') {
      setSemester('Học kỳ 2');
    }
  };

  const handleSemesterChange = (newSem: 'Học kỳ 1' | 'Học kỳ 2') => {
    setSemester(newSem);
    if (newSem === 'Học kỳ 1') {
      if (examType === 'MID_TERM_2') setExamType('MID_TERM_1');
      else if (examType === 'FINAL_TERM_2') setExamType('FINAL_TERM_1');
    } else if (newSem === 'Học kỳ 2') {
      if (examType === 'MID_TERM_1') setExamType('MID_TERM_2');
      else if (examType === 'FINAL_TERM_1') setExamType('FINAL_TERM_2');
    }
  };

  // Phân bổ số câu theo từng phần (Chuẩn Bộ GD&ĐT 2025: 12 TN + 4 Đ/S + 6 TLN + 0 TL = 22 câu)
  const [mcCount, setMcCount] = useState(12);
  const [tfCount, setTfCount] = useState(4);
  const [saCount, setSaCount] = useState(6);
  const [essayCount, setEssayCount] = useState(0);

  // Tùy chỉnh riêng ma trận nhận thức cho từng phần
  const [mcMatrix, setMcMatrix] = useState<CognitiveMatrixPercent>({
    knowledge: 60,
    comprehension: 40,
    application: 0,
    highApplication: 0,
  });
  const [tfMatrix, setTfMatrix] = useState<CognitiveMatrixPercent>({
    knowledge: 0,
    comprehension: 50,
    application: 50,
    highApplication: 0,
  });
  const [saMatrix, setSaMatrix] = useState<CognitiveMatrixPercent>({
    knowledge: 0,
    comprehension: 0,
    application: 60,
    highApplication: 40,
  });
  const [essayMatrix, setEssayMatrix] = useState<CognitiveMatrixPercent>({
    knowledge: 0,
    comprehension: 0,
    application: 50,
    highApplication: 50,
  });

  // Tab đang chọn để chỉnh ma trận nhận thức
  const [activeSectionTab, setActiveSectionTab] = useState<'multiple_choice' | 'true_false' | 'short_answer' | 'essay'>('multiple_choice');

  // Kiểm tra tổng câu các phần
  const totalSectionQuestions = mcCount + tfCount + saCount + essayCount;
  const isSectionCountValid = totalSectionQuestions === questionCount;

  // Tính toán số câu thực tế từng phần theo thuật toán Min-1
  const mcAlloc = calculateMinOneCognitiveCounts(mcCount, mcMatrix);
  const tfAlloc = calculateMinOneCognitiveCounts(tfCount, tfMatrix);
  const saAlloc = calculateMinOneCognitiveCounts(saCount, saMatrix);
  const essayAlloc = calculateMinOneCognitiveCounts(essayCount, essayMatrix);

  // Tổng hợp mức độ nhận thức của toàn bộ đề thi
  const totalKnowledge = mcAlloc.knowledge + tfAlloc.knowledge + saAlloc.knowledge + essayAlloc.knowledge;
  const totalComprehension = mcAlloc.comprehension + tfAlloc.comprehension + saAlloc.comprehension + essayAlloc.comprehension;
  const totalApplication = mcAlloc.application + tfAlloc.application + saAlloc.application + essayAlloc.application;
  const totalHighApplication = mcAlloc.highApplication + tfAlloc.highApplication + saAlloc.highApplication + essayAlloc.highApplication;

  // Tỉ lệ tổng hợp
  const easy = totalSectionQuestions > 0 ? Math.round((totalKnowledge / totalSectionQuestions) * 100) : 40;
  const medium = totalSectionQuestions > 0 ? Math.round((totalComprehension / totalSectionQuestions) * 100) : 30;
  const hard = totalSectionQuestions > 0 ? Math.round((totalApplication / totalSectionQuestions) * 100) : 20;
  const veryHard = totalSectionQuestions > 0 ? Math.max(0, 100 - (easy + medium + hard)) : 10;

  const [aiProvider, setAiProvider] = useState('gemini');
  const [selectedModel, setSelectedModel] = useState('gemini-3.8-flash');
  const [modelsList, setModelsList] = useState<ModelOption[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Topic Practice & Topic Focus
  const [topicFocus, setTopicFocus] = useState('');

  // School Custom Matrix (NBK / Tổ bộ môn)
  const [customMatrixTable, setCustomMatrixTable] = useState('');
  const [isMatrixModalOpen, setIsMatrixModalOpen] = useState(false);

  // Multi-code Exam Shuffling (Chống gian lận phòng thi)
  const [examCodesCount, setExamCodesCount] = useState<number>(1);
  const [shuffleOrder, setShuffleOrder] = useState(true);
  const [shuffleValues, setShuffleValues] = useState(false);

  // Sample Exam Reference (Đề thi mẫu)
  const [useSampleExam, setUseSampleExam] = useState(false);
  const [sampleExamFile, setSampleExamFile] = useState<File | null>(null);
  const [sampleExamFileName, setSampleExamFileName] = useState('');
  const [sampleExamFileSize, setSampleExamFileSize] = useState<number>(0);
  const [sampleExamText, setSampleExamText] = useState('');
  const [isReadingSampleExam, setIsReadingSampleExam] = useState(false);
  const [sampleExamError, setSampleExamError] = useState('');
  const [isSampleExamPreviewOpen, setIsSampleExamPreviewOpen] = useState(false);
  const sampleExamInputRef = useRef<HTMLInputElement>(null);

  const handleSampleExamFileUpload = async (file: File) => {
    if (!file) return;
    setSampleExamFile(file);
    setSampleExamFileName(file.name);
    setSampleExamFileSize(file.size);
    setIsReadingSampleExam(true);
    setSampleExamError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = typeof window !== 'undefined' ? localStorage.getItem('examify_token') : null;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/v1/academic-data/ocr', {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.data?.text) {
        setSampleExamText(data.data.text);
        showToast(`Đã đọc thành công đề thi mẫu (${data.data.text.length.toLocaleString('vi-VN')} ký tự)!`, 'success');
      } else {
        const errMsg = data.message || 'Không thể trích xuất nội dung từ tệp đề thi mẫu.';
        setSampleExamError(errMsg);
        showToast(errMsg, 'error');
      }
    } catch (err: any) {
      const errMsg = err?.message || 'Lỗi kết nối khi tải và đọc đề thi mẫu.';
      setSampleExamError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setIsReadingSampleExam(false);
    }
  };

  const isOfficialExam =
    examType.startsWith('MID_TERM') ||
    examType.startsWith('FINAL_TERM') ||
    examType === 'MIN_15' ||
    examType === 'ENTRANCE';

  // Pedagogical Skills
  const [availableSkills, setAvailableSkills] = useState<SkillOption[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);
  const [previewingSkill, setPreviewingSkill] = useState<SkillOption | null>(null);

  // AI Provider Status from /api/v1/ai/settings
  const [providersStatus, setProvidersStatus] = useState<Record<string, ProviderInfo>>({
    gemini: { id: 'gemini', name: 'Google Gemini', hasKey: true },
    openai: { id: 'openai', name: 'ChatGPT (OpenAI)', hasKey: false },
    claude: { id: 'claude', name: 'Anthropic Claude', hasKey: false },
    'self-hosted': { id: 'self-hosted', name: 'Local AI / Ollama', hasKey: true },
    'custom-mcp': { id: 'custom-mcp', name: 'Custom MCP / Local', hasKey: true },
  });

  const totalMatrix = easy + medium + hard + veryHard;

  // Fetch configured AI providers status from backend
  const fetchProviderStatus = async () => {
    try {
      const res = await fetch('/api/v1/ai/settings');
      const data = await res.json();
      if (data.success && data.data?.providers) {
        setProvidersStatus(data.data.providers);

        // Auto-select the first provider that HAS a valid key
        const currentHasKey = data.data.providers[aiProvider]?.hasKey;
        if (!currentHasKey) {
          const available = Object.keys(data.data.providers).find(
            (k) => data.data.providers[k].hasKey
          );
          if (available) {
            setAiProvider(available);
          }
        }
      }
    } catch {
      // Keep defaults
    }
  };

  // Fetch available AI Pedagogical Skills from backend
  const fetchAvailableSkills = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('examify_token') : null;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(
        `/api/v1/academic-data/skills?subject=${encodeURIComponent(subject)}&grade=${encodeURIComponent(grade)}&isActive=true`,
        { headers }
      );
      const data = await res.json();
      if (data.success && Array.isArray(data.data?.skills)) {
        const skills = data.data.skills;
        setAvailableSkills(skills);
        // Tự động kích hoạt toàn bộ kỹ năng sư phạm phù hợp cho môn & khối này
        setSelectedSkillIds(skills.map((s: any) => s.id));
      } else {
        setAvailableSkills([]);
        setSelectedSkillIds([]);
      }
    } catch {
      // Keep silent
    }
  };

  useEffect(() => {
    fetchProviderStatus();
  }, []);

  useEffect(() => {
    fetchAvailableSkills();
  }, [subject, grade]);

  // Real-time Model Fetching from official APIs
  const fetchLiveModels = async (providerName: string) => {
    if (providerName === 'custom-mcp' || providerName === 'self-hosted') {
      setModelsList([
        { id: 'llama3:8b', name: 'Llama 3 (8B Instruct)', isDefault: true },
        { id: 'qwen2.5:7b', name: 'Qwen 2.5 (7B Sư phạm)' },
        { id: 'deepseek-r1:8b', name: 'DeepSeek R1 (8B Reasoning)' },
        { id: 'mistral:7b', name: 'Mistral 7B' },
      ]);
      setSelectedModel('llama3:8b');
      return;
    }

    setIsLoadingModels(true);
    try {
      const res = await fetch(`/api/v1/ai/models?provider=${providerName}`);
      const data = await res.json();

      if (data.success && Array.isArray(data.data?.models)) {
        const models = data.data.models as ModelOption[];
        setModelsList(models);
        const defaultM = models.find((m) => m.isDefault) || models[0];
        if (defaultM) {
          setSelectedModel(defaultM.id);
        }
      }
    } catch {
      // Fallback defaults
      if (providerName === 'gemini') {
        setModelsList([
          { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', isDefault: true },
          { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash' },
          { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash' },
        ]);
        setSelectedModel('gemini-3.8-flash');
      } else if (providerName === 'openai') {
        setModelsList([
          { id: 'gpt-4o-mini', name: 'GPT-4o Mini', isDefault: true },
          { id: 'gpt-4o', name: 'GPT-4o' },
          { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
        ]);
        setSelectedModel('gpt-4o-mini');
      } else if (providerName === 'claude') {
        setModelsList([
          { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', isDefault: true },
          { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
        ]);
        setSelectedModel('claude-3-5-sonnet-20241022');
      }
    } finally {
      setIsLoadingModels(false);
    }
  };

  useEffect(() => {
    fetchLiveModels(aiProvider);
  }, [aiProvider]);

  const handleApplyPreset = (presetId: string) => {
    const preset = EXAM_FORMAT_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setQuestionCount(preset.totalQuestions);
    setMcCount(preset.sections.multiple_choice.count);
    setMcMatrix(preset.sections.multiple_choice.matrix);
    setTfCount(preset.sections.true_false.count);
    setTfMatrix(preset.sections.true_false.matrix);
    setSaCount(preset.sections.short_answer.count);
    setSaMatrix(preset.sections.short_answer.matrix);
    setEssayCount(preset.sections.essay.count);
    setEssayMatrix(preset.sections.essay.matrix);
    showToast(`Đã áp dụng định dạng: ${preset.name}`, 'info');
  };

  const handleGenerate = async () => {
    // Check if selected AI has valid token
    const selectedProviderInfo = providersStatus[aiProvider];
    if (selectedProviderInfo && !selectedProviderInfo.hasKey) {
      showToast(
        `Nhà cung cấp AI "${selectedProviderInfo.name}" chưa có API Key/Token. Vui lòng chọn AI khác hoặc liên hệ Quản trị viên!`,
        'error'
      );
      return;
    }

    if (!isSectionCountValid) {
      showToast(
        `Tổng số câu các phần (${totalSectionQuestions}) chưa khớp với Tổng số câu hỏi của đề (${questionCount}). Vui lòng điều chỉnh hoặc đồng bộ lại!`,
        'error'
      );
      return;
    }

    const validateMatrix = (name: string, count: number, m: CognitiveMatrixPercent) => {
      if (count > 0) {
        const sum = m.knowledge + m.comprehension + m.application + m.highApplication;
        if (sum !== 100) {
          showToast(`Ma trận năng lực của "${name}" có tổng là ${sum}%, vui lòng điều chỉnh về đúng 100%!`, 'warning');
          return false;
        }
      }
      return true;
    };

    if (!validateMatrix('Phần I: Trắc nghiệm', mcCount, mcMatrix)) return;
    if (!validateMatrix('Phần II: Đúng / Sai', tfCount, tfMatrix)) return;
    if (!validateMatrix('Phần III: Trả lời ngắn', saCount, saMatrix)) return;
    if (!validateMatrix('Phần IV: Tự luận', essayCount, essayMatrix)) return;

    setIsGenerating(true);

    try {
      const effectiveSemester =
        examType === 'CUSTOM'
          ? 'Tùy chỉnh'
          : examType === 'TOPIC_PRACTICE'
          ? 'Ôn tập chuyên đề'
          : semester;

      const generatedTitle =
        examType === 'CUSTOM'
          ? `Đề thi Tùy chỉnh - Môn ${subject}`
          : examType === 'TOPIC_PRACTICE'
          ? `Đề ôn tập chuyên đề: ${topicFocus || subject} - ${grade}`
          : examType === 'MID_TERM_1'
          ? `Đề thi Kiểm tra Giữa học kỳ 1 - Môn ${subject} ${grade} (Chương trình GDPT 2018)`
          : examType === 'FINAL_TERM_1'
          ? `Đề thi Kiểm tra Cuối học kỳ 1 - Môn ${subject} ${grade} (Chương trình GDPT 2018)`
          : examType === 'MID_TERM_2'
          ? `Đề thi Kiểm tra Giữa học kỳ 2 - Môn ${subject} ${grade} (Chương trình GDPT 2018)`
          : examType === 'FINAL_TERM_2'
          ? `Đề thi Kiểm tra Cuối học kỳ 2 - Môn ${subject} ${grade} (Chương trình GDPT 2018)`
          : examType === 'MIN_15'
          ? `Đề kiểm tra 15 phút - Môn ${subject} ${grade} (${effectiveSemester})`
          : examType === 'ENTRANCE'
          ? `Đề thi Khảo sát chất lượng / Thi thử - Môn ${subject} ${grade}`
          : `Đề kiểm tra ${subject} ${grade} - ${effectiveSemester}`;

      const generatedSessionTitle =
        examType === 'MID_TERM_1'
          ? 'BÀI KIỂM TRA GIỮA HỌC KỲ I'
          : examType === 'FINAL_TERM_1'
          ? 'BÀI KIỂM TRA CUỐI HỌC KỲ I'
          : examType === 'MID_TERM_2'
          ? 'BÀI KIỂM TRA GIỮA HỌC KỲ II'
          : examType === 'FINAL_TERM_2'
          ? 'BÀI KIỂM TRA CUỐI HỌC KỲ II'
          : examType === 'MIN_15'
          ? 'BÀI KIỂM TRA THƯỜNG XUYÊN (15 PHÚT)'
          : examType === 'ENTRANCE'
          ? 'ĐỀ KHẢO SÁT CHẤT LƯỢNG ĐẦU NĂM'
          : examType === 'TOPIC_PRACTICE'
          ? 'BÀI KIỂM TRA ĐỊNH KỲ (1 TIẾT)'
          : 'KỲ THI KIỂM TRA ĐÁNH GIÁ CHẤT LƯỢNG';

      const payload = {
        title: generatedTitle,
        sessionTitle: generatedSessionTitle,
        curriculum: {
          level:
            examType === 'CUSTOM'
              ? 'Tùy chỉnh'
              : level === 'UPPER_SEC'
              ? 'THPT'
              : level === 'LOWER_SEC'
              ? 'THCS'
              : 'Tiểu học',
          grade: examType === 'CUSTOM' ? 'Tùy chỉnh' : grade,
          subject,
          semester: effectiveSemester,
          topic: examType === 'TOPIC_PRACTICE' ? topicFocus : undefined,
        },
        examType:
          examType === 'CUSTOM' || examType === 'TOPIC_PRACTICE'
            ? 'MID_TERM'
            : examType.startsWith('MID_TERM')
            ? 'MID_TERM'
            : examType.startsWith('FINAL_TERM')
            ? 'FINAL_TERM'
            : examType,
        durationMinutes: duration,
        totalPoints: 10,
        totalQuestions: questionCount,
        cognitiveMatrix: {
          knowledge: easy,
          comprehension: medium,
          application: hard,
          highApplication: veryHard,
        },
        sectionDistribution: {
          multipleChoice: { count: mcCount, matrix: mcMatrix },
          trueFalse: { count: tfCount, matrix: tfMatrix },
          shortAnswer: { count: saCount, matrix: saMatrix },
          essay: { count: essayCount, matrix: essayMatrix },
        },
        customPrompt: isOfficialExam ? undefined : customPrompt,
        customMatrixTable: customMatrixTable || undefined,
        topicFocus: examType === 'TOPIC_PRACTICE' ? topicFocus : undefined,
        isTopicPractice: examType === 'TOPIC_PRACTICE',
        sampleExamText: useSampleExam && sampleExamText ? sampleExamText : undefined,
        sampleExamFileName: useSampleExam && sampleExamFileName ? sampleExamFileName : undefined,
        skillIds: selectedSkillIds.length > 0 ? selectedSkillIds : undefined,
        aiProvider,
        aiModel: selectedModel,
      };

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('examify_token') : null;
      if (storedToken) {
        headers['Authorization'] = `Bearer ${storedToken}`;
      }

      const res = await fetch('/api/v1/exams/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      let questions: ExamQuestion[] = [];
      let examTitle = generatedTitle;

      if (data.success && data.data?.examData) {
        const d = data.data.examData;
        examTitle = d.title || examTitle;
        const rawQuestionsList = d.questions || [];
        const uniqueFormatted: ExamQuestion[] = [];
        rawQuestionsList.forEach((q: any, idx: number) => {
          let questionContent = q.content || '';
          const existingList = uniqueFormatted.map((item) => item.content);

          const rawType = String(q.type || 'multiple_choice').toLowerCase().replace(/[\s_-]+/g, '');
          const qType: QuestionType = rawType.includes('true') || rawType.includes('dung')
            ? 'true_false'
            : rawType.includes('short') || rawType.includes('ngan')
            ? 'short_answer'
            : rawType.includes('essay') || rawType.includes('luan')
            ? 'essay'
            : 'multiple_choice';

          const levelMap: Record<string, string> = {
            KNOWLEDGE: 'Nhận biết',
            COMPREHENSION: 'Thông hiểu',
            APPLICATION: 'Vận dụng',
            HIGH_APPLICATION: 'Vận dụng cao',
          };
          const levelStr = q.level || levelMap[q.cognitiveLevel] || 'Thông hiểu';

          let optionsToUse = q.options;
          let answerToUse = q.correctAnswer;
          let explanationToUse = q.explanation;

          // If duplicate, replace with fresh procedural question so total count is preserved
          if (isQuestionDuplicate(questionContent, existingList)) {
            const fresh = getCurriculumQuestion(subject, grade, levelStr, idx, existingList, qType);
            questionContent = fresh.content;
            optionsToUse = fresh.options;
            answerToUse = fresh.correctAnswer;
            explanationToUse = fresh.explanation;
          }

          let formattedOptions: any[] = [];
          if (qType === 'true_false') {
            const subKeys = ['a', 'b', 'c', 'd'];
            formattedOptions = (optionsToUse && optionsToUse.length > 0 ? optionsToUse : ['Ý mệnh đề a', 'Ý mệnh đề b', 'Ý mệnh đề c', 'Ý mệnh đề d']).map((opt: any, optIdx: number) => {
              const key = subKeys[optIdx] || String(optIdx);
              const textVal = typeof opt === 'object' && opt !== null ? opt.text : String(opt || '');
              const cleanText = textVal.replace(/^[a-da-d][\.\:\)\-\s]+/i, '').trim();
              const isCorrect = answerToUse
                ? new RegExp(`${key}\\s*[:=-]?\\s*(Đ|Đúng|True|T|1)`, 'i').test(answerToUse)
                : optIdx % 2 === 0;
              return {
                key,
                text: cleanText || textVal,
                isCorrect,
              };
            });
          } else if (qType === 'multiple_choice') {
            formattedOptions = (optionsToUse || ['A', 'B', 'C', 'D']).map((opt: any, optIdx: number) => {
              const key = ['A', 'B', 'C', 'D'][optIdx] || String(optIdx);
              const textVal = typeof opt === 'object' && opt !== null ? opt.text : String(opt || '');
              const cleanText = textVal.replace(/^[A-Da-d][\.\:\)\-\s]+/i, '').trim();
              return {
                key,
                text: cleanText || textVal,
                isCorrect: (answerToUse || 'A').toUpperCase() === key,
              };
            });
          }

          let finalAnswer = answerToUse || '';
          if (qType === 'short_answer') {
            // Guarantee short answer is NEVER a multiple-choice letter (A/B/C/D) or a True/False string
            const firstOptText = (optionsToUse && optionsToUse.length > 0)
              ? (typeof optionsToUse[0] === 'object' ? optionsToUse[0]?.text : String(optionsToUse[0]))
              : null;
            finalAnswer = extractCleanShortAnswerValue(firstOptText, explanationToUse, answerToUse);
          } else if (qType === 'essay') {
            finalAnswer = answerToUse && !answerToUse.includes('Xem') ? answerToUse : 'Xem hướng dẫn chấm';
          } else if (qType === 'true_false') {
            finalAnswer = answerToUse || 'a: Đ, b: S, c: Đ, d: S';
          } else {
            finalAnswer = answerToUse || 'A';
          }

          uniqueFormatted.push({
            id: idx + 1,
            order: `Câu ${String(uniqueFormatted.length + 1).padStart(2, '0')}`,
            type: qType,
            section: qType,
            level: levelStr,
            levelClass:
              levelStr === 'Nhận biết'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : levelStr === 'Thông hiểu'
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : levelStr === 'Vận dụng'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-rose-50 text-rose-700 border-rose-200',
            topic: subject,
            content: questionContent,
            options: formattedOptions,
            points: q.points || (qType === 'essay' ? 1.5 : qType === 'true_false' ? 1.0 : qType === 'short_answer' ? 0.5 : 0.25),
            correctAnswer: finalAnswer,
            explanation: explanationToUse || 'Lời giải chi tiết biên soạn bởi mô hình AI.',
          });
        });

        // Auto-sort into official exam sections: Phần I (Trắc nghiệm) -> Phần II (Đúng/Sai) -> Phần III (Trả lời ngắn) -> Phần IV (Tự luận)
        const TYPE_ORDER: Record<string, number> = {
          multiple_choice: 1,
          true_false: 2,
          short_answer: 3,
          essay: 4,
        };
        uniqueFormatted.sort((a, b) => {
          const tA = normalizeQuestionType(a.type);
          const tB = normalizeQuestionType(b.type);
          return (TYPE_ORDER[tA] || 99) - (TYPE_ORDER[tB] || 99);
        });
        uniqueFormatted.forEach((q, i) => {
          q.order = `Câu ${String(i + 1).padStart(2, '0')}`;
        });

        questions = uniqueFormatted;
      } else {
        const errorMsg = data.error || data.message || 'Không thể tạo đề thi bằng AI. Vui lòng kiểm tra lại API Key hoặc hạn mức dịch vụ.';
        showToast(errorMsg, 'error');
        return;
      }

      // Multi-code Shuffling & AI Isomorphic Variants (101, 102, 103, 104...)
      let examVariants = generateExamVariants(
        questions,
        examTitle,
        {
          codeCount: examCodesCount,
          shuffleOrder,
          shuffleValues: false,
          baseCode: 101,
        }
      );

      // If user enabled AI Parameter Variation (Đổi số liệu bằng AI & tự động giải lại đáp án)
      if (examCodesCount > 1 && shuffleValues) {
        try {
          const targetCodes = Array.from({ length: examCodesCount - 1 }, (_, i) => String(102 + i));
          const varHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
          const authToken = typeof window !== 'undefined' ? localStorage.getItem('examify_token') : null;
          if (authToken) varHeaders['Authorization'] = `Bearer ${authToken}`;

          const varRes = await fetch('/api/v1/exams/isomorphic-variants', {
            method: 'POST',
            headers: varHeaders,
            body: JSON.stringify({
              baseQuestions: questions,
              baseTitle: examTitle,
              subject,
              grade,
              term: examType === 'CUSTOM' ? 'Tùy chỉnh' : effectiveSemester,
              variantCodes: targetCodes,
              shuffleOrder,
            }),
          });
          const varData = await varRes.json();
          if (varData.success && Array.isArray(varData.data?.variants) && varData.data.variants.length > 0) {
            examVariants = varData.data.variants;
          }
        } catch (varErr) {
          console.warn('AI isomorphic variants call failed, falling back to safe offline shuffle:', varErr);
        }
      }

      const newExam: ExamItem = {
        id: data.data?.examId || `EX-${Date.now().toString().slice(-6)}`,
        title: examTitle,
        code: examVariants[0]?.code || '101',
        subject,
        grade: examType === 'CUSTOM' ? 'Tùy chỉnh' : grade,
        term:
          examType === 'CUSTOM'
            ? 'Tùy chỉnh'
            : examType === 'TOPIC_PRACTICE'
            ? 'Ôn tập chuyên đề'
            : effectiveSemester,
        year: '2024-2025',
        questionsCount: questions.length,
        duration,
        sessionTitle: generatedSessionTitle,
        status: 'approved',
        statusLabel:
          examType === 'CUSTOM'
            ? 'Tùy chỉnh'
            : examType === 'TOPIC_PRACTICE'
            ? 'Ôn tập'
            : 'Chính thức',
        author: user.name,
        updatedAt: 'Vừa tạo',
        matrix: { easy, medium, hard, veryHard },
        isAiGenerated: true,
        questions,
        appliedSkills: data.data?.appliedSkills || [],
        customPrompt,
        variants: examVariants,
        curriculumMetadata: {
          level:
            examType === 'CUSTOM'
              ? 'Tùy chỉnh'
              : level === 'UPPER_SEC'
              ? 'THPT'
              : level === 'LOWER_SEC'
              ? 'THCS'
              : 'Tiểu học',
          grade: examType === 'CUSTOM' ? 'Tùy chỉnh' : grade,
          subject,
          semester:
            examType === 'CUSTOM'
              ? 'Tùy chỉnh'
              : examType === 'TOPIC_PRACTICE'
              ? 'Ôn tập chuyên đề'
              : effectiveSemester,
        },
      };

      await addExam(newExam);
      setActiveExam(newExam);
      showToast('Bộ đề thi AI đã được tạo thành công!', 'success');
      setCurrentRoute('#editor');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Không thể sinh đề thi: ${msg}`, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const aiProvidersConfig = [
    {
      id: 'gemini',
      label: 'Google Gemini',
      sub: 'Tốc độ nhanh, phản hồi tức thì',
      hasKey: providersStatus['gemini']?.hasKey ?? true,
    },
    {
      id: 'openai',
      label: 'ChatGPT (OpenAI)',
      sub: 'Tư duy logic và trắc nghiệm',
      hasKey: providersStatus['openai']?.hasKey ?? false,
    },
    {
      id: 'claude',
      label: 'Anthropic Claude',
      sub: 'Đối soát chuẩn xác ngữ liệu',
      hasKey: providersStatus['claude']?.hasKey ?? false,
    },
    {
      id: 'custom-mcp',
      label: 'Custom MCP / Local AI',
      sub: 'Chạy nội bộ trường học (Ollama)',
      hasKey: providersStatus['self-hosted']?.hasKey ?? providersStatus['custom-mcp']?.hasKey ?? true,
    },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full pb-16 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-600 text-2xl">auto_awesome</span>
            <span>Tạo Đề Thi Mới Bằng Trí Tuệ Nhân Tạo</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Thiết lập ma trận chuẩn sư phạm Bloom và để Examify AI tự động tổng hợp câu hỏi chuẩn hóa.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCurrentRoute('#dashboard')}
          className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Quay lại Bảng điều khiển
        </button>
      </div>

      {/* Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1 & 2: Main Matrix Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Phân cấp Chương trình Giáo dục */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-600 text-lg">category</span>
              <h3 className="text-sm font-bold text-slate-800">
                1. Phân cấp Chương trình Giáo dục
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">Cấp học *</label>
                  {examType === 'CUSTOM' && (
                    <span className="text-[10px] text-amber-600 font-bold">(Tự do)</span>
                  )}
                </div>
                <select
                  disabled={examType === 'CUSTOM'}
                  value={level}
                  onChange={(e) => {
                    const newLevel = e.target.value;
                    setLevel(newLevel);
                    // Tự động chuyển lớp mặc định tương ứng với từng cấp
                    if (newLevel === 'UPPER_SEC') setGrade('Lớp 12');
                    else if (newLevel === 'LOWER_SEC') setGrade('Lớp 9');
                    else if (newLevel === 'PRIMARY') setGrade('Lớp 5');
                  }}
                  className={`w-full h-9 px-2 text-xs rounded-xl border border-slate-200 font-medium transition ${
                    examType === 'CUSTOM'
                      ? 'bg-slate-100/90 text-slate-400 cursor-not-allowed opacity-60'
                      : 'bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500'
                  }`}
                >
                  <option value="UPPER_SEC">THPT (Cấp 3)</option>
                  <option value="LOWER_SEC">THCS (Cấp 2)</option>
                  <option value="PRIMARY">Tiểu học (Cấp 1)</option>
                </select>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">Khối lớp *</label>
                  {examType === 'CUSTOM' && (
                    <span className="text-[10px] text-amber-600 font-bold">(Tự do)</span>
                  )}
                </div>
                <select
                  disabled={examType === 'CUSTOM'}
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className={`w-full h-9 px-2 text-xs rounded-xl border border-slate-200 font-medium transition ${
                    examType === 'CUSTOM'
                      ? 'bg-slate-100/90 text-slate-400 cursor-not-allowed opacity-60'
                      : 'bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500'
                  }`}
                >
                  {level === 'UPPER_SEC' && (
                    <>
                      <option value="Lớp 12">Lớp 12</option>
                      <option value="Lớp 11">Lớp 11</option>
                      <option value="Lớp 10">Lớp 10</option>
                    </>
                  )}
                  {level === 'LOWER_SEC' && (
                    <>
                      <option value="Lớp 9">Lớp 9</option>
                      <option value="Lớp 8">Lớp 8</option>
                      <option value="Lớp 7">Lớp 7</option>
                      <option value="Lớp 6">Lớp 6</option>
                    </>
                  )}
                  {level === 'PRIMARY' && (
                    <>
                      <option value="Lớp 5">Lớp 5</option>
                      <option value="Lớp 4">Lớp 4</option>
                      <option value="Lớp 3">Lớp 3</option>
                      <option value="Lớp 2">Lớp 2</option>
                      <option value="Lớp 1">Lớp 1</option>
                    </>
                  )}
                </select>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">Học kỳ *</label>
                  {examType === 'CUSTOM' && (
                    <span className="text-[10px] text-amber-600 font-bold">(Tự do)</span>
                  )}
                  {examType === 'TOPIC_PRACTICE' && (
                    <span className="text-[10px] text-blue-600 font-bold">(Chuyên đề)</span>
                  )}
                </div>
                <select
                  disabled={examType === 'CUSTOM' || examType === 'TOPIC_PRACTICE'}
                  value={semester}
                  onChange={(e) => handleSemesterChange(e.target.value as 'Học kỳ 1' | 'Học kỳ 2')}
                  className={`w-full h-9 px-2 text-xs rounded-xl border border-slate-200 font-medium transition ${
                    examType === 'CUSTOM' || examType === 'TOPIC_PRACTICE'
                      ? 'bg-slate-100/90 text-slate-400 cursor-not-allowed opacity-60'
                      : 'bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500'
                  }`}
                >
                  <option value="Học kỳ 1">Học kỳ 1 (Kỳ I)</option>
                  <option value="Học kỳ 2">Học kỳ 2 (Kỳ II)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Môn học *</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full h-9 px-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  <option value="Toán học">Toán học</option>
                  <option value="Tin học">Tin học</option>
                  <option value="Vật lý">Vật lý</option>
                  <option value="Hóa học">Hóa học</option>
                  <option value="Sinh học">Sinh học</option>
                  <option value="Tiếng Anh">Tiếng Anh</option>
                  <option value="Lịch sử">Lịch sử</option>
                  <option value="Địa lý">Địa lý</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Loại kỳ thi *</label>
                <select
                  value={examType}
                  onChange={(e) => handleExamTypeChange(e.target.value)}
                  className="w-full h-9 px-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  <optgroup label="Kỳ thi Học kỳ 1 (Kỳ I)">
                    <option value="MID_TERM_1">Kiểm tra Giữa học kỳ 1 (Giữa kì 1)</option>
                    <option value="FINAL_TERM_1">Kiểm tra Cuối học kỳ 1 (Cuối kì 1)</option>
                  </optgroup>
                  <optgroup label="Kỳ thi Học kỳ 2 (Kỳ II)">
                    <option value="MID_TERM_2">Kiểm tra Giữa học kỳ 2 (Giữa kì 2)</option>
                    <option value="FINAL_TERM_2">Kiểm tra Cuối học kỳ 2 (Cuối kì 2)</option>
                  </optgroup>
                  <optgroup label="Định kỳ & Khảo sát khác">
                    <option value="MIN_15">Kiểm tra thường xuyên (15 phút)</option>
                    <option value="ENTRANCE">Khảo sát Đầu vào / Thi thử</option>
                    <option value="TOPIC_PRACTICE">Đề ôn tập chuyên đề / Luyện tập</option>
                    <option value="CUSTOM">Tùy chỉnh (Tự do)</option>
                  </optgroup>
                </select>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">Thời gian làm bài</label>
                  {examType === 'CUSTOM' && (
                    <span className="text-[10px] text-amber-600 font-bold">(Tự do)</span>
                  )}
                </div>
                <select
                  disabled={examType === 'CUSTOM'}
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value, 10))}
                  className={`w-full h-9 px-2 text-xs rounded-xl border border-slate-200 font-medium transition ${
                    examType === 'CUSTOM'
                      ? 'bg-slate-100/90 text-slate-400 cursor-not-allowed opacity-60'
                      : 'bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500'
                  }`}
                >
                  <option value="15">15 phút</option>
                  <option value="45">45 phút</option>
                  <option value="50">50 phút</option>
                  <option value="60">60 phút</option>
                  <option value="90">90 phút</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Tổng số câu hỏi</label>
                <input
                  type="number"
                  value={questionCount}
                  onChange={(e) => setQuestionCount(parseInt(e.target.value, 10) || 10)}
                  min={5}
                  max={100}
                  className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>
            </div>

            {/* Chuyên đề trọng tâm (Chỉ hiển thị khi chọn Đề ôn tập chuyên đề) */}
            {examType === 'TOPIC_PRACTICE' && (
              <div className="mt-3 p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-blue-600 text-sm">filter_center_focus</span>
                    <label className="text-xs font-bold text-blue-900">
                      Chuyên đề / Bài học trọng tâm * (Bắt buộc)
                    </label>
                  </div>
                  <span className="text-[10px] bg-blue-200/80 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                    Phạm vi chuyên đề đơn
                  </span>
                </div>
                <input
                  type="text"
                  value={topicFocus}
                  onChange={(e) => setTopicFocus(e.target.value)}
                  placeholder="Ví dụ: Định lý sin, côsin trong tam giác | Phương trình bậc hai | Vòng lặp while..."
                  className="w-full h-9 px-3 text-xs rounded-lg border border-blue-300 bg-white focus:ring-2 focus:ring-blue-500 font-medium text-slate-800 placeholder:text-slate-400"
                />
                <p className="text-[11px] text-blue-700 leading-relaxed">
                  🎯 <strong>Luật bất khả xâm phạm:</strong> 100% câu hỏi sinh ra sẽ CHỈ tập trung vào chuyên đề này, tuyệt đối không bị lọt kiến thức từ các chương khác!
                </p>
              </div>
            )}

            {/* Toggle Đề thi mẫu (Tạo đề tương đương từ tệp) */}
            <div className="mt-4 pt-3.5 border-t border-slate-150 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-lg">upload_file</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800">Đề thi mẫu (Tạo đề tương đương)</span>
                    <p className="text-[11px] text-slate-500">
                      Tải lên tệp đề thi có sẵn (PDF, Word, Ảnh) để AI đọc ma trận và sinh đề mới cùng dạng
                    </p>
                  </div>
                </div>

                {/* Toggle Switch */}
                <button
                  type="button"
                  onClick={() => {
                    const next = !useSampleExam;
                    setUseSampleExam(next);
                    if (!next) {
                      setSampleExamFile(null);
                      setSampleExamFileName('');
                      setSampleExamFileSize(0);
                      setSampleExamText('');
                      setSampleExamError('');
                    }
                  }}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out cursor-pointer shrink-0 ${
                    useSampleExam ? 'bg-indigo-600' : 'bg-slate-300'
                  }`}
                  title={useSampleExam ? 'Tắt sử dụng đề thi mẫu' : 'Bật tải lên đề thi mẫu'}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                      useSampleExam ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Upload Dropzone & Extracted Content Card */}
              {useSampleExam && (
                <div className="p-4 bg-indigo-50/70 border border-indigo-200/80 rounded-xl space-y-3 animate-in fade-in duration-200">
                  {!sampleExamFile ? (
                    <div
                      onClick={() => sampleExamInputRef.current?.click()}
                      className="border-2 border-dashed border-indigo-300 hover:border-indigo-500 bg-white/80 hover:bg-white rounded-xl p-5 text-center cursor-pointer transition group"
                    >
                      <input
                        ref={sampleExamInputRef}
                        type="file"
                        accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg,.webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleSampleExamFileUpload(file);
                        }}
                      />
                      <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-xl">cloud_upload</span>
                      </div>
                      <div className="text-xs font-bold text-slate-800">
                        Nhấp để tải lên tệp đề thi mẫu hoặc kéo thả tệp vào đây
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Hỗ trợ: PDF (.pdf), Word (.docx), Ảnh chụp đề (.jpg, .png), Văn bản (.txt)
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 bg-white rounded-xl border border-indigo-200 space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-lg">
                              {sampleExamFileName.endsWith('.pdf') ? 'picture_as_pdf' : sampleExamFileName.endsWith('.docx') ? 'description' : 'image'}
                            </span>
                          </div>
                          <div className="truncate">
                            <div className="text-xs font-bold text-slate-800 truncate" title={sampleExamFileName}>
                              {sampleExamFileName}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {(sampleExamFileSize / 1024).toFixed(1)} KB • {isReadingSampleExam ? 'Đang trích xuất OCR/Multimodal...' : sampleExamText ? `Đã đọc ${sampleExamText.length.toLocaleString('vi-VN')} ký tự` : 'Chưa có nội dung'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {sampleExamText && (
                            <button
                              type="button"
                              onClick={() => setIsSampleExamPreviewOpen(true)}
                              className="px-2.5 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg flex items-center gap-1 transition"
                            >
                              <span className="material-symbols-outlined text-xs">visibility</span>
                              <span>Xem nội dung</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setSampleExamFile(null);
                              setSampleExamFileName('');
                              setSampleExamFileSize(0);
                              setSampleExamText('');
                              setSampleExamError('');
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 transition"
                            title="Xóa tệp và tải lại"
                          >
                            <span className="material-symbols-outlined text-base">close</span>
                          </button>
                        </div>
                      </div>

                      {isReadingSampleExam && (
                        <div className="flex items-center gap-2 text-[11px] text-indigo-600 font-medium py-1 animate-pulse">
                          <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                          <span>Hệ thống AI Multimodal đang quét và giải mã nội dung đề thi mẫu...</span>
                        </div>
                      )}

                      {sampleExamError && (
                        <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-[11px] text-rose-700 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm shrink-0">error</span>
                          <span>{sampleExamError}</span>
                        </div>
                      )}

                      {sampleExamText && !isReadingSampleExam && (
                        <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] text-emerald-800 flex items-center gap-2">
                          <span className="material-symbols-outlined text-base shrink-0 text-emerald-600">check_circle</span>
                          <span>
                            AI đã giải mã xong cấu trúc đề. Khi bấm <strong>Tạo Đề Thi</strong>, AI sẽ tự động mô phỏng ma trận và độ khó của đề mẫu này để sinh đề mới tương đương!
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 2. Cấu trúc định dạng & Phân bổ câu hỏi theo phần (Chuẩn Bộ GD&ĐT) */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600 text-lg">format_list_numbered</span>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    2. Cấu trúc định dạng & Phân bổ câu hỏi theo phần
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Phân bổ số câu cho từng dạng. Tổng các phần bắt buộc phải bằng Tổng số câu đề thi ({questionCount} câu).
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {/* Button: Thêm Ma trận riêng của trường */}
                <button
                  type="button"
                  onClick={() => setIsMatrixModalOpen(true)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full border transition shadow-2xs ${
                    customMatrixTable
                      ? 'bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700'
                      : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                  }`}
                  title="Nhập hoặc dán bảng ma trận phân bổ câu hỏi chi tiết của trường/tổ bộ môn"
                >
                  <span className="material-symbols-outlined text-sm">grid_view</span>
                  <span>{customMatrixTable ? 'Đã gán Ma trận trường ✓' : 'Thêm Ma trận trường (NBK...)'}</span>
                </button>

                {/* Status Badge */}
                <div
                  className={`text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 ${
                    isSectionCountValid
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">
                    {isSectionCountValid ? 'check_circle' : 'warning'}
                  </span>
                  <span>
                    Tổng các phần: {totalSectionQuestions} / {questionCount} câu
                  </span>
                </div>
              </div>
            </div>

            {/* 1-Click Format Presets */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-indigo-600">tune</span>
                <span>Chọn mẫu cấu trúc định dạng chuẩn:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {EXAM_FORMAT_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplyPreset(preset.id)}
                    className="p-2.5 rounded-xl border border-slate-200 bg-white hover:border-blue-500 hover:bg-blue-50/50 text-left transition group shadow-2xs"
                  >
                    <div className="text-xs font-bold text-slate-800 group-hover:text-blue-600">
                      {preset.name}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                      {preset.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Inputs for Section Counts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5 focus-within:border-blue-500 focus-within:bg-white transition">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Phần I: Trắc nghiệm</label>
                  <span className="text-[10px] text-slate-400 font-semibold">4 lựa chọn</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={mcCount}
                    onChange={(e) => setMcCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full h-8 px-2.5 text-xs rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 font-bold text-slate-800"
                  />
                  <span className="text-xs text-slate-500 font-medium shrink-0">câu</span>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5 focus-within:border-blue-500 focus-within:bg-white transition">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Phần II: Đúng / Sai</label>
                  <span className="text-[10px] text-slate-400 font-semibold">4 ý a,b,c,d</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={tfCount}
                    onChange={(e) => setTfCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full h-8 px-2.5 text-xs rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 font-bold text-slate-800"
                  />
                  <span className="text-xs text-slate-500 font-medium shrink-0">câu</span>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5 focus-within:border-blue-500 focus-within:bg-white transition">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Phần III: Trả lời ngắn</label>
                  <span className="text-[10px] text-slate-400 font-semibold">Điền đáp số</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={saCount}
                    onChange={(e) => setSaCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full h-8 px-2.5 text-xs rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 font-bold text-slate-800"
                  />
                  <span className="text-xs text-slate-500 font-medium shrink-0">câu</span>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5 focus-within:border-blue-500 focus-within:bg-white transition">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Phần IV: Tự luận</label>
                  <span className="text-[10px] text-slate-400 font-semibold">Trình bày bài</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={essayCount}
                    onChange={(e) => setEssayCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full h-8 px-2.5 text-xs rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 font-bold text-slate-800"
                  />
                  <span className="text-xs text-slate-500 font-medium shrink-0">câu</span>
                </div>
              </div>
            </div>

            {/* Validation Banner */}
            {!isSectionCountValid ? (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 font-medium">
                  <span className="material-symbols-outlined text-base text-rose-600">error</span>
                  <span>
                    Tổng số câu các phần (<strong>{totalSectionQuestions} câu</strong>) chưa khớp với Tổng số câu đề thi (<strong>{questionCount} câu</strong>).
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setQuestionCount(totalSectionQuestions)}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shrink-0 transition shadow-2xs cursor-pointer"
                >
                  Đồng bộ Tổng số câu = {totalSectionQuestions}
                </button>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2 text-xs font-medium">
                <span className="material-symbols-outlined text-sm text-emerald-600">check_circle</span>
                <span>
                  Cấu trúc phân bổ câu hỏi hợp lệ: Đúng {totalSectionQuestions} câu cho 4 phần.
                </span>
              </div>
            )}
          </div>

          {/* 3. Ma trận Năng lực Tư duy theo từng phần (Bloom's Taxonomy) */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600 text-lg">equalizer</span>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    3. Ma trận Năng lực Tư duy từng phần (Bloom's Taxonomy)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Tùy chỉnh riêng tỷ lệ Nhận biết, Thông hiểu, Vận dụng, Vận dụng cao cho từng dạng câu hỏi.
                  </p>
                </div>
              </div>
              <div className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full flex items-center gap-1 shrink-0">
                <span className="material-symbols-outlined text-xs">verified</span>
                <span>Quy tắc Min-1: Mức có % &gt; 0 luôn có tối thiểu 1 câu</span>
              </div>
            </div>

            {/* Section Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
              {[
                { id: 'multiple_choice', label: 'Phần I: Trắc nghiệm', count: mcCount },
                { id: 'true_false', label: 'Phần II: Đúng / Sai', count: tfCount },
                { id: 'short_answer', label: 'Phần III: Trả lời ngắn', count: saCount },
                { id: 'essay', label: 'Phần IV: Tự luận', count: essayCount },
              ].map((tab) => {
                const isActive = activeSectionTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveSectionTab(tab.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {tab.count} câu
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Active Section Matrix Customizer */}
            {(() => {
              const tabConfig = {
                multiple_choice: {
                  title: 'Phần I: Câu trắc nghiệm nhiều phương án lựa chọn',
                  count: mcCount,
                  matrix: mcMatrix,
                  setMatrix: setMcMatrix,
                  alloc: mcAlloc,
                },
                true_false: {
                  title: 'Phần II: Câu trắc nghiệm Đúng / Sai',
                  count: tfCount,
                  matrix: tfMatrix,
                  setMatrix: setTfMatrix,
                  alloc: tfAlloc,
                },
                short_answer: {
                  title: 'Phần III: Câu trả lời ngắn (Điền số)',
                  count: saCount,
                  matrix: saMatrix,
                  setMatrix: setSaMatrix,
                  alloc: saAlloc,
                },
                essay: {
                  title: 'Phần IV: Tự luận',
                  count: essayCount,
                  matrix: essayMatrix,
                  setMatrix: setEssayMatrix,
                  alloc: essayAlloc,
                },
              }[activeSectionTab];

              const curTotal =
                tabConfig.matrix.knowledge +
                tabConfig.matrix.comprehension +
                tabConfig.matrix.application +
                tabConfig.matrix.highApplication;

              if (tabConfig.count === 0) {
                return (
                  <div className="p-6 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-1">
                    <p className="text-xs font-semibold text-slate-600">
                      {tabConfig.title} hiện đang có 0 câu hỏi.
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Tăng số câu hỏi ở Mục 2 để kích hoạt ma trận năng lực cho phần này.
                    </p>
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div>
                      <div className="text-xs font-bold text-slate-800">{tabConfig.title}</div>
                      <div className="text-[11px] text-slate-500">
                        Số lượng: <strong>{tabConfig.count} câu</strong> • Phân bổ thực tế:{' '}
                        <span className="font-semibold text-emerald-700">
                          {tabConfig.alloc.knowledge} NB
                        </span>
                        ,{' '}
                        <span className="font-semibold text-blue-700">
                          {tabConfig.alloc.comprehension} TH
                        </span>
                        ,{' '}
                        <span className="font-semibold text-amber-700">
                          {tabConfig.alloc.application} VD
                        </span>
                        ,{' '}
                        <span className="font-semibold text-rose-700">
                          {tabConfig.alloc.highApplication} VDC
                        </span>
                      </div>
                    </div>
                    <div
                      className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${
                        curTotal === 100
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
                      }`}
                    >
                      Tổng: {curTotal}% / 100%
                    </div>
                  </div>

                  {/* 4 Sliders */}
                  <div className="space-y-3.5">
                    {/* Knowledge */}
                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1 text-slate-700">
                        <span className="flex items-center gap-1.5 text-emerald-700">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          <span>Nhận biết (Knowledge)</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-500">
                            Thực tế: <strong>{tabConfig.alloc.knowledge} câu</strong>
                          </span>
                          <span className="font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            {tabConfig.matrix.knowledge}%
                          </span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={tabConfig.matrix.knowledge}
                        onChange={(e) =>
                          tabConfig.setMatrix((prev) => ({
                            ...prev,
                            knowledge: parseInt(e.target.value, 10) || 0,
                          }))
                        }
                        className="w-full accent-emerald-500 cursor-pointer"
                      />
                    </div>

                    {/* Comprehension */}
                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1 text-slate-700">
                        <span className="flex items-center gap-1.5 text-blue-700">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                          <span>Thông hiểu (Comprehension)</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-500">
                            Thực tế: <strong>{tabConfig.alloc.comprehension} câu</strong>
                          </span>
                          <span className="font-bold text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                            {tabConfig.matrix.comprehension}%
                          </span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={tabConfig.matrix.comprehension}
                        onChange={(e) =>
                          tabConfig.setMatrix((prev) => ({
                            ...prev,
                            comprehension: parseInt(e.target.value, 10) || 0,
                          }))
                        }
                        className="w-full accent-blue-500 cursor-pointer"
                      />
                    </div>

                    {/* Application */}
                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1 text-slate-700">
                        <span className="flex items-center gap-1.5 text-amber-700">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                          <span>Vận dụng (Application)</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-500">
                            Thực tế: <strong>{tabConfig.alloc.application} câu</strong>
                          </span>
                          <span className="font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            {tabConfig.matrix.application}%
                          </span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={tabConfig.matrix.application}
                        onChange={(e) =>
                          tabConfig.setMatrix((prev) => ({
                            ...prev,
                            application: parseInt(e.target.value, 10) || 0,
                          }))
                        }
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>

                    {/* High Application */}
                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1 text-slate-700">
                        <span className="flex items-center gap-1.5 text-rose-700">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                          <span>Vận dụng cao (High Application)</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-500">
                            Thực tế: <strong>{tabConfig.alloc.highApplication} câu</strong>
                          </span>
                          <span className="font-bold text-rose-800 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                            {tabConfig.matrix.highApplication}%
                          </span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={tabConfig.matrix.highApplication}
                        onChange={(e) =>
                          tabConfig.setMatrix((prev) => ({
                            ...prev,
                            highApplication: parseInt(e.target.value, 10) || 0,
                          }))
                        }
                        className="w-full accent-rose-500 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Summary Across Full Exam */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <span className="font-bold text-slate-700">Tổng hợp toàn bộ đề thi ({totalSectionQuestions} câu):</span>
              <div className="flex items-center gap-2 font-semibold">
                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {easy}% NB ({totalKnowledge} câu)
                </span>
                <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {medium}% TH ({totalComprehension} câu)
                </span>
                <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  {hard}% VD ({totalApplication} câu)
                </span>
                <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  {veryHard}% VDC ({totalHighApplication} câu)
                </span>
              </div>
            </div>
          </div>

          {/* 3. Cấu hình Mã đề thi & Trộn đề phòng thi (Chống gian lận) */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-600 text-lg">shuffle</span>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    3. Cấu hình Mã đề thi & Trộn đề phòng thi
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Tự động tạo nhiều mã đề (101, 102...) từ đề gốc để chống nhìn bài khi thi tập trung
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl shrink-0">
                {[1, 2, 4, 8].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setExamCodesCount(count)}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                      examCodesCount === count
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {count === 1 ? '1 Mã đề gốc' : `${count} Mã đề`}
                  </button>
                ))}
              </div>
            </div>

            {examCodesCount > 1 && (
              <div className="p-4 bg-indigo-50/70 border border-indigo-200/80 rounded-xl space-y-3 animate-in fade-in duration-200">
                <div className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-indigo-600">checklist</span>
                  <span>Tùy chọn phương thức trộn đề (Có thể tick cả hai):</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Option 1: Xáo thứ tự câu hỏi & phương án */}
                  <label
                    className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition ${
                      shuffleOrder
                        ? 'bg-white border-indigo-400 ring-1 ring-indigo-400'
                        : 'bg-white/60 border-slate-200 hover:bg-white'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={shuffleOrder}
                      onChange={(e) => setShuffleOrder(e.target.checked)}
                      className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        Xáo thứ tự câu hỏi & phương án A, B, C, D
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Đảo trật tự câu hỏi trong từng phần và tráo ngẫu nhiên vị trí các lựa chọn đáp án.
                      </p>
                    </div>
                  </label>

                  {/* Option 2: Đổi thông số số liệu bằng AI */}
                  <label
                    className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition ${
                      shuffleValues
                        ? 'bg-white border-indigo-400 ring-1 ring-indigo-400'
                        : 'bg-white/60 border-slate-200 hover:bg-white'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={shuffleValues}
                      onChange={(e) => setShuffleValues(e.target.checked)}
                      className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <span>Đổi thông số số liệu bằng AI (Tự động giải & tính lại đáp án)</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-100 text-indigo-700">AI Tương đương</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        AI giữ nguyên dạng bài từng câu của đề gốc, tạo bộ số liệu mới và tự động tính toán lại 100% đáp án đúng, phương án sai và lời giải chi tiết cho từng mã đề (102, 103, 104...). Đồng bộ 1-1 ma trận giữa các mã đề!
                      </p>
                    </div>
                  </label>
                </div>

                <div className="text-[11px] text-indigo-700 bg-white/80 p-2.5 rounded-lg border border-indigo-100 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-indigo-600">verified</span>
                  <span>
                    Hệ thống sẽ tự động xuất <strong>{examCodesCount} mã đề: {Array.from({ length: examCodesCount }, (_, i) => 101 + i).join(', ')}</strong> với bảng đáp án riêng biệt được đồng bộ tự động!
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 4. Yêu cầu chi tiết tùy biến */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600 text-lg">edit_note</span>
                <h3 className="text-sm font-bold text-slate-800">
                  4. Yêu cầu chuyên biệt (Prompt Tuyển chọn)
                </h3>
              </div>
              {isOfficialExam && (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">lock</span>
                  Khóa ở kỳ thi chính khóa
                </span>
              )}
            </div>
            {isOfficialExam ? (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-start gap-2.5">
                <span className="material-symbols-outlined text-slate-400 text-base mt-0.5">verified_user</span>
                <div className="space-y-1">
                  <p className="font-bold text-slate-800">Kỳ thi chính khóa tuân thủ chuẩn Ma trận GDPT 2018</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Prompt tự do được khóa để đảm bảo đề thi bám sát phân phối chương trình của Bộ/Sở và ma trận khảo thí đã duyệt.
                    Nếu muốn ra đề tự do hoặc theo chuyên đề riêng, vui lòng chọn loại kỳ thi là <strong>"Đề ôn tập chuyên đề"</strong> hoặc <strong>"Tùy chỉnh"</strong>.
                  </p>
                </div>
              </div>
            ) : (
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder={
                  examType === 'CUSTOM'
                    ? subject === 'Tin học'
                      ? "Nhập chủ đề chuyên sâu tùy chọn (ví dụ: 'Chuyên đề HSG Tin học: Quy hoạch động LIS, Tìm kiếm nhị phân, Cây Fenwick (BIT), Segment Tree, đồ thị...')"
                      : "Nhập chủ đề và yêu cầu tùy chọn tự do cho đề thi..."
                    : "Nhập yêu cầu trọng tâm cho chuyên đề ôn tập, ví dụ: 'Tập trung sâu vào phần giải tam giác, hệ thức lượng, không ra câu hỏi ngoài chủ đề...'"
                }
                rows={3}
                className="w-full p-3 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            )}
          </div>

          {/* 5. Kỹ Năng Sư Phạm AI Áp Dụng */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600 text-lg">psychology</span>
                <h3 className="text-sm font-bold text-slate-800">
                  5. Kỹ Năng Sư Phạm AI Áp Dụng ({selectedSkillIds.length})
                </h3>
                {selectedSkillIds.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                    Đang kích hoạt
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentRoute('#academic-data')}
                  className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline px-2 py-1 rounded-lg hover:bg-blue-50 transition"
                  title="Quản lý và tải thêm dữ liệu học thuật gốc / viết kỹ năng mới"
                >
                  <span className="material-symbols-outlined text-xs">folder_open</span>
                  <span>Quản lý Dữ liệu</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsSkillModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold rounded-xl transition shadow-xs"
                >
                  <span className="material-symbols-outlined text-base">add_task</span>
                  Tùy chỉnh Kỹ Năng
                </button>
              </div>
            </div>

            {selectedSkillIds.length === 0 ? (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center flex flex-col items-center justify-center">
                <p className="text-xs text-slate-500 font-medium">
                  {availableSkills.length > 0
                    ? `Có ${availableSkills.length} kỹ năng khả dụng nhưng chưa được chọn.`
                    : `Chưa có kỹ năng sư phạm nào cho môn ${subject} (${grade}). AI sẽ sinh đề theo ma trận mặc định.`}
                </p>
                {availableSkills.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setSelectedSkillIds(availableSkills.map((s) => s.id))}
                    className="mt-2 text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    Bấm để kích hoạt toàn bộ ({availableSkills.length} kỹ năng)
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setCurrentRoute('#academic-data')}
                    className="mt-2 text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">upload_file</span>
                    Tải tài liệu vào Dữ liệu học thuật để AI tạo kỹ năng mới
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {selectedSkillIds.map((sid) => {
                  const skill = availableSkills.find((s) => s.id === sid);
                  if (!skill) return null;
                  return (
                    <div
                      key={sid}
                      className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/80 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="material-symbols-outlined text-emerald-600 text-base shrink-0">
                          check_circle
                        </span>
                        <div className="truncate">
                          <p className="text-xs font-bold text-emerald-950 truncate">
                            {skill.title}
                          </p>
                          {skill.description && (
                            <p className="text-[10px] text-slate-500 truncate">
                              {skill.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setPreviewingSkill(skill)}
                          title="Xem quy chuẩn kỹ năng"
                          className="p-1 text-emerald-700 hover:bg-emerald-100 rounded-lg transition"
                        >
                          <span className="material-symbols-outlined text-base">visibility</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedSkillIds((prev) => prev.filter((id) => id !== sid))
                          }
                          title="Bỏ chọn kỹ năng"
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        >
                          <span className="material-symbols-outlined text-base">close</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Column 3: AI Engine & Action Summary */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600 text-lg">smart_toy</span>
                <h3 className="text-sm font-bold text-slate-800">Mô hình AI Xử lý</h3>
              </div>
              <button
                type="button"
                onClick={() => setCurrentRoute('#admin')}
                className="text-[11px] text-blue-600 hover:underline flex items-center gap-0.5"
                title="Quản trị cấu hình Token AI trong Admin Console"
              >
                <span className="material-symbols-outlined text-xs">settings</span>
                <span>Cài đặt AI</span>
              </button>
            </div>

            {/* AI Providers Selection (Disabled if no Token) */}
            <div className="space-y-2">
              {aiProvidersConfig.map((p) => {
                const isConfigured = p.hasKey;
                const isSelected = aiProvider === p.id;

                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      if (isConfigured) {
                        setAiProvider(p.id);
                      } else {
                        showToast(
                          `Mô hình ${p.label} chưa được cấu hình API Key. Hãy cấu hình trong phần Quản trị hệ thống!`,
                          'warning'
                        );
                      }
                    }}
                    className={`p-3 rounded-xl border transition-all select-none ${
                      !isConfigured
                        ? 'opacity-60 bg-slate-50/80 border-dashed border-slate-200 cursor-not-allowed'
                        : isSelected
                        ? 'border-blue-600 bg-blue-50/40 text-blue-900 font-bold cursor-pointer shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs">{p.label}</span>
                          {!isConfigured ? (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-rose-100 text-rose-700">
                              <span className="material-symbols-outlined text-[10px]">lock</span>
                              Chưa có Token
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                              Sẵn sàng
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-normal truncate mt-0.5">
                          {!isConfigured ? 'Không thể chọn do chưa cấu hình Token trong Admin' : p.sub}
                        </div>
                      </div>

                      <input
                        type="radio"
                        name="ai-gen-pick"
                        disabled={!isConfigured}
                        checked={isSelected && isConfigured}
                        onChange={() => {
                          if (isConfigured) setAiProvider(p.id);
                        }}
                        className="w-4 h-4 text-blue-600 disabled:opacity-40 shrink-0"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Real-time Dynamic Model Selector */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-slate-700 flex items-center gap-1">
                  <span>Phiên bản Model ({aiProvider.toUpperCase()}):</span>
                </label>
                <button
                  type="button"
                  onClick={() => fetchLiveModels(aiProvider)}
                  disabled={isLoadingModels}
                  className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                  title="Tải lại danh sách model từ API chính thức"
                >
                  <span className={`material-symbols-outlined text-xs ${isLoadingModels ? 'animate-spin' : ''}`}>
                    refresh
                  </span>
                  <span>{isLoadingModels ? 'Đang tải...' : 'Lấy Live'}</span>
                </button>
              </div>

              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                disabled={isLoadingModels || !providersStatus[aiProvider]?.hasKey}
                className="w-full h-9 px-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium text-slate-800 disabled:opacity-50"
              >
                {modelsList.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name || m.id} {m.isDefault ? '⭐' : ''}
                  </option>
                ))}
              </select>
              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                <span>API Endpoint: {
                  aiProvider === 'gemini' ? 'generativelanguage.googleapis.com' :
                  aiProvider === 'openai' ? 'api.openai.com/v1/models' :
                  aiProvider === 'claude' ? 'api.anthropic.com/v1/models' : 'localhost:11434'
                }</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 space-y-1">
              <div className="font-semibold text-slate-700 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm text-emerald-600">verified</span>
                <span>PromptGuard Engine Kích hoạt:</span>
              </div>
              <p>Tự động rà soát và loại bỏ các chỉ thị độc hại, jailbreak hoặc rò rỉ dữ liệu.</p>
            </div>

            {/* Teacher Profile Card */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
              <UserAvatar
                name={user.name}
                email={user.email}
                size="sm"
                rounded="rounded-xl"
                defaultType={user.avatarStyle || 'identicon'}
                showIndicator={true}
              />
              <div className="min-w-0 text-left">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                  Giáo viên biên soạn:
                </span>
                <span className="text-xs font-bold text-slate-800 truncate block">
                  {user.name || 'Quản trị viên'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || !providersStatus[aiProvider]?.hasKey || !isSectionCountValid}
              className={`w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs shadow-lg transition-all flex items-center justify-center gap-2 ${
                isGenerating || !providersStatus[aiProvider]?.hasKey || !isSectionCountValid ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              {isGenerating ? (
                <>
                  <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                  <span>Đang tổng hợp câu hỏi AI...</span>
                </>
              ) : !isSectionCountValid ? (
                <>
                  <span className="material-symbols-outlined text-base text-amber-300">warning</span>
                  <span>Chưa khớp số câu các phần ({totalSectionQuestions}/{questionCount})</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">auto_awesome</span>
                  <span>
                    Bắt đầu Sinh Đề Thi ({selectedModel})
                    {selectedSkillIds.length > 0 && ` • ${selectedSkillIds.length} Kỹ năng AI`}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: CHỌN KỸ NĂNG SƯ PHẠM AI */}
      {/* ========================================================================= */}
      <PortalModal
        isOpen={isSkillModalOpen}
        onClose={() => setIsSkillModalOpen(false)}
        title="Chọn Kỹ Năng Sư Phạm AI Áp Dụng Cho Đề Thi"
      >
        <div className="flex flex-col gap-4">
          <p className="text-xs text-slate-500 font-medium">
            Chọn 1 hoặc nhiều kỹ năng ra đề chuyên sâu (được bóc tách từ tài liệu học thuật hoặc do giáo viên tự thiết lập) để AI bám sát ma trận và cài cắm dạng bài.
          </p>

          {availableSkills.length === 0 ? (
            <div className="p-8 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center flex flex-col items-center">
              <span className="material-symbols-outlined text-3xl text-slate-400 mb-2">
                psychology_alt
              </span>
              <p className="text-xs font-bold text-slate-700">
                Chưa có kỹ năng nào cho môn {subject} ({grade})
              </p>
              <p className="text-[11px] text-slate-500 mt-1 mb-3">
                Bạn có thể vào trang &quot;Dữ liệu học thuật&quot; để nạp đề thi/bài học và cho AI tự động viết kỹ năng mới.
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsSkillModalOpen(false);
                  setCurrentRoute('#academic-data');
                }}
                className="px-3.5 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition"
              >
                Đến Trang Dữ Liệu Học Thuật
              </button>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto space-y-2.5 pr-1">
              {availableSkills.map((sk) => {
                const isChecked = selectedSkillIds.includes(sk.id);
                return (
                  <div
                    key={sk.id}
                    onClick={() => {
                      setSelectedSkillIds((prev) =>
                        isChecked ? prev.filter((id) => id !== sk.id) : [...prev, sk.id]
                      );
                    }}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                      isChecked
                        ? 'bg-emerald-50/80 border-emerald-400 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-bold text-slate-800 truncate">{sk.title}</h4>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewingSkill(sk);
                          }}
                          className="text-[11px] text-blue-600 hover:underline flex items-center gap-0.5 shrink-0"
                        >
                          <span className="material-symbols-outlined text-xs">visibility</span>
                          Chi tiết
                        </button>
                      </div>
                      {sk.description && (
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                          {sk.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400 font-semibold">
                        <span className="bg-slate-100 px-1.5 py-0.2 rounded text-slate-600">
                          {sk.subject}
                        </span>
                        <span className="bg-slate-100 px-1.5 py-0.2 rounded text-slate-600">
                          {sk.grade}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <span className="text-xs font-semibold text-slate-600">
              Đã chọn: <strong className="text-emerald-700">{selectedSkillIds.length}</strong> kỹ năng
            </span>
            <button
              type="button"
              onClick={() => setIsSkillModalOpen(false)}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-xs"
            >
              Áp Dụng ({selectedSkillIds.length})
            </button>
          </div>
        </div>
      </PortalModal>

      {/* ========================================================================= */}
      {/* MODAL: XEM TRƯỚC CHI TIẾT KỸ NĂNG */}
      {/* ========================================================================= */}
      <PortalModal
        isOpen={!!previewingSkill}
        onClose={() => setPreviewingSkill(null)}
        title={previewingSkill ? previewingSkill.title : 'Quy Chuẩn Kỹ Năng Sư Phạm'}
      >
        {previewingSkill && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                {previewingSkill.subject}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                {previewingSkill.grade}
              </span>
            </div>

            {previewingSkill.description && (
              <p className="text-xs text-slate-600 font-medium bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                {previewingSkill.description}
              </p>
            )}

            <div>
              <span className="block text-xs font-bold text-slate-700 mb-1">
                Hướng dẫn quy chuẩn sư phạm cho AI:
              </span>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono whitespace-pre-wrap text-slate-800 max-h-56 overflow-y-auto">
                {previewingSkill.skillInstructions}
              </div>
            </div>

            {previewingSkill.fewShotExamples && (
              <div>
                <span className="block text-xs font-bold text-slate-700 mb-1">
                  Câu hỏi mẫu tham khảo (Few-shot Examples):
                </span>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono whitespace-pre-wrap text-slate-700 max-h-40 overflow-y-auto">
                  {previewingSkill.fewShotExamples}
                </div>
              </div>
            )}
          </div>
        )}
      </PortalModal>

      {/* ========================================================================= */}
      {/* MODAL: NHẬP BẢN ĐẶC TẢ MA TRẬN RIÊNG CỦA TRƯỜNG / TỔ BỘ MÔN */}
      {/* ========================================================================= */}
      <PortalModal
        isOpen={isMatrixModalOpen}
        onClose={() => setIsMatrixModalOpen(false)}
        title="Bản Đặc Tả Ma Trận Đề Thi Riêng (NBK / Tổ Bộ Môn)"
      >
        <div className="flex flex-col gap-3.5">
          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-indigo-600">verified</span>
              <span>Áp dụng quy chuẩn khảo thí riêng của Nhà trường</span>
            </div>
            <p className="text-[11px] text-indigo-700 leading-relaxed">
              Dán hoặc nhập bảng ma trận phân bổ câu hỏi chi tiết theo từng chương/bài học đã được Tổ bộ môn phê duyệt.
              AI sẽ xem bản đặc tả này là <strong>Mệnh lệnh tối cao</strong> để bốc đúng số câu và dạng bài.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">
                Nội dung Ma trận đề thi (Văn bản / Markdown / Bảng đặc tả):
              </label>
              <button
                type="button"
                onClick={() => {
                  setCustomMatrixTable(
`### BẢNG ĐẶC TẢ MA TRẬN ĐỀ THI - TỔ BỘ MÔN
- Bài 1 (Khái niệm & Định nghĩa): 2 câu Nhận biết, 1 câu Thông hiểu
- Bài 2 (Phương pháp & Công thức): 1 câu Thông hiểu, 1 câu Vận dụng
- Bài 3 (Bài toán thực tiễn đời sống): 1 câu Vận dụng, 1 câu Vận dụng cao (bối cảnh thực tế)
- Yêu cầu đặc biệt: Không ra các dạng bài đã giảm tải theo công văn của Sở GD&ĐT.`
                  );
                }}
                className="text-[11px] font-semibold text-indigo-600 hover:underline flex items-center gap-0.5"
              >
                <span className="material-symbols-outlined text-xs">auto_fix_high</span>
                Điền mẫu tham khảo
              </button>
            </div>
            <textarea
              value={customMatrixTable}
              onChange={(e) => setCustomMatrixTable(e.target.value)}
              placeholder="Dán nội dung ma trận của tổ bộ môn tại đây..."
              rows={8}
              className="w-full p-3 text-xs font-mono rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setCustomMatrixTable('');
                setIsMatrixModalOpen(false);
              }}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline"
            >
              Xóa ma trận riêng
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsMatrixModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl transition"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsMatrixModalOpen(false);
                  showToast('Đã lưu Bản đặc tả ma trận riêng của trường thành công!', 'success');
                }}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-xs"
              >
                Lưu & Áp Dụng
              </button>
            </div>
          </div>
        </div>
      </PortalModal>

      {/* Modal Preview Đề Thi Mẫu */}
      <PortalModal
        isOpen={isSampleExamPreviewOpen}
        onClose={() => setIsSampleExamPreviewOpen(false)}
        title={`Nội dung AI đã trích xuất từ đề thi mẫu: ${sampleExamFileName}`}
        maxWidth="max-w-2xl"
        footer={
          <button
            type="button"
            onClick={() => setIsSampleExamPreviewOpen(false)}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
          >
            Đóng
          </button>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            Dưới đây là toàn bộ văn bản và công thức được trích xuất từ tệp đề mẫu của bạn qua AI Multimodal OCR. AI sẽ tự động phân tích ma trận nhận thức từ nội dung này để sinh đề thi mới tương đương.
          </p>
          <pre className="p-3.5 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono max-h-96 overflow-y-auto whitespace-pre-wrap leading-relaxed select-text">
            {sampleExamText}
          </pre>
        </div>
      </PortalModal>
    </div>
  );
}
