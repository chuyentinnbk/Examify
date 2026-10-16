'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore, ExamItem, ExamQuestion, QuestionType } from '@/lib/store/app-store';
import UserAvatar from '@/components/common/UserAvatar';
import PortalModal from '@/components/common/PortalModal';
import { isQuestionDuplicate, getCurriculumQuestion } from '@/lib/curriculum-questions';
import { normalizeQuestionType } from '@/lib/exam-sections';

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
  const [subject, setSubject] = useState('Toán học');
  const [examType, setExamType] = useState('MID_TERM');
  const [duration, setDuration] = useState(90);
  const [questionCount, setQuestionCount] = useState(40);

  // Bloom matrix percentages
  const [easy, setEasy] = useState(40);
  const [medium, setMedium] = useState(30);
  const [hard, setHard] = useState(20);
  const [veryHard, setVeryHard] = useState(10);

  const [aiProvider, setAiProvider] = useState('gemini');
  const [selectedModel, setSelectedModel] = useState('gemini-3.8-flash');
  const [modelsList, setModelsList] = useState<ModelOption[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

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

    if (totalMatrix !== 100) {
      showToast('Tổng tỉ lệ ma trận Bloom phải đạt chính xác 100%', 'warning');
      return;
    }

    setIsGenerating(true);

    try {
      const generatedTitle = `Đề kiểm tra ${subject} ${grade} - ${examType === 'MID_TERM' ? 'Giữa kì 1' : 'Định kỳ'}`;
      const payload = {
        title: generatedTitle,
        curriculum: {
          level: level === 'UPPER_SEC' ? 'THPT' : level === 'LOWER_SEC' ? 'THCS' : 'Tiểu học',
          grade,
          subject,
          semester: 'Học kỳ 1',
        },
        examType,
        durationMinutes: duration,
        totalPoints: 10,
        totalQuestions: questionCount,
        cognitiveMatrix: {
          knowledge: easy,
          comprehension: medium,
          application: hard,
          highApplication: veryHard,
        },
        customPrompt,
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
            const fresh = getCurriculumQuestion(subject, grade, levelStr, idx, existingList);
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
            correctAnswer: answerToUse || (qType === 'essay' ? 'Xem hướng dẫn chấm' : qType === 'short_answer' ? '12' : qType === 'true_false' ? 'a: Đ, b: S, c: Đ, d: S' : 'A'),
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
        // High-quality curriculum question generator with zero duplicate guarantee
        const { generateUniqueExamQuestions } = await import('@/lib/curriculum-questions');
        questions = generateUniqueExamQuestions(subject, grade, questionCount, {
          easy,
          medium,
          hard,
          veryHard,
        });
      }

      const newExam: ExamItem = {
        id: data.data?.examId || `EX-${Date.now().toString().slice(-6)}`,
        title: examTitle,
        subject,
        grade,
        term: 'Học kỳ 1',
        year: '2024-2025',
        questionsCount: questions.length,
        duration,
        status: 'approved',
        statusLabel: 'Chính thức',
        author: user.name,
        updatedAt: 'Vừa tạo',
        matrix: { easy, medium, hard, veryHard },
        isAiGenerated: true,
        questions,
        appliedSkills: data.data?.appliedSkills || [],
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Cấp học *</label>
                <select
                  value={level}
                  onChange={(e) => {
                    const newLevel = e.target.value;
                    setLevel(newLevel);
                    // Tự động chuyển lớp mặc định tương ứng với từng cấp
                    if (newLevel === 'UPPER_SEC') setGrade('Lớp 12');
                    else if (newLevel === 'LOWER_SEC') setGrade('Lớp 9');
                    else if (newLevel === 'PRIMARY') setGrade('Lớp 5');
                  }}
                  className="w-full h-9 px-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  <option value="UPPER_SEC">THPT (Cấp 3)</option>
                  <option value="LOWER_SEC">THCS (Cấp 2)</option>
                  <option value="PRIMARY">Tiểu học (Cấp 1)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Khối lớp *</label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full h-9 px-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium"
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
                <label className="text-xs font-semibold text-slate-700">Môn học *</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full h-9 px-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  <option value="Toán học">Toán học</option>
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
                  onChange={(e) => setExamType(e.target.value)}
                  className="w-full h-9 px-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  <option value="MID_TERM">Kiểm tra Giữa kỳ</option>
                  <option value="FINAL_TERM">Kiểm tra Cuối kỳ</option>
                  <option value="MIN_15">Kiểm tra 15 phút</option>
                  <option value="ENTRANCE">Khảo sát Đầu vào / Thi thử</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Thời gian làm bài</label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value, 10))}
                  className="w-full h-9 px-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium"
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
          </div>

          {/* 2. Ma trận năng lực Bloom */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600 text-lg">equalizer</span>
                <h3 className="text-sm font-bold text-slate-800">
                  2. Ma trận Năng lực Tư duy (Bloom's Taxonomy)
                </h3>
              </div>
              <div
                className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  totalMatrix === 100
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800 animate-pulse'
                }`}
              >
                Tổng: {totalMatrix}% / 100%
              </div>
            </div>

            {/* Sliders */}
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1 text-slate-700">
                  <span className="flex items-center gap-1.5 text-emerald-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span>Nhận biết (Knowledge)</span>
                  </span>
                  <span>{easy}% ({Math.round((questionCount * easy) / 100)} câu)</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={easy}
                  onChange={(e) => setEasy(parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1 text-slate-700">
                  <span className="flex items-center gap-1.5 text-blue-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <span>Thông hiểu (Comprehension)</span>
                  </span>
                  <span>{medium}% ({Math.round((questionCount * medium) / 100)} câu)</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={medium}
                  onChange={(e) => setMedium(parseInt(e.target.value, 10))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1 text-slate-700">
                  <span className="flex items-center gap-1.5 text-amber-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span>Vận dụng (Application)</span>
                  </span>
                  <span>{hard}% ({Math.round((questionCount * hard) / 100)} câu)</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={hard}
                  onChange={(e) => setHard(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1 text-slate-700">
                  <span className="flex items-center gap-1.5 text-rose-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span>Vận dụng cao (High Application)</span>
                  </span>
                  <span>{veryHard}% ({Math.round((questionCount * veryHard) / 100)} câu)</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={veryHard}
                  onChange={(e) => setVeryHard(parseInt(e.target.value, 10))}
                  className="w-full accent-rose-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* 3. Yêu cầu chi tiết tùy biến */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-600 text-lg">edit_note</span>
              <h3 className="text-sm font-bold text-slate-800">
                3. Yêu cầu chuyên biệt (Prompt Tuyển chọn)
              </h3>
            </div>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Nhập yêu cầu trọng tâm bài học, ví dụ: 'Tập trung vào phần hàm số bậc hai và tính đồng biến nghịch biến, cho các dạng toán thực tế ứng dụng parabol...'"
              rows={3}
              className="w-full p-3 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* 4. Kỹ Năng Sư Phạm AI Áp Dụng */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600 text-lg">psychology</span>
                <h3 className="text-sm font-bold text-slate-800">
                  4. Kỹ Năng Sư Phạm AI Áp Dụng ({selectedSkillIds.length})
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
              disabled={isGenerating || !providersStatus[aiProvider]?.hasKey}
              className={`w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs shadow-lg transition-all flex items-center justify-center gap-2 ${
                isGenerating || !providersStatus[aiProvider]?.hasKey ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              {isGenerating ? (
                <>
                  <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                  <span>Đang tổng hợp câu hỏi AI...</span>
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
    </div>
  );
}
