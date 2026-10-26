'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useAppStore, ExamQuestion, ExamQuestionVersion, ExamItem, QuestionType, QuestionOption, formatExamCode } from '@/lib/store/app-store';
import UserAvatar from '@/components/common/UserAvatar';
import MathText, { cleanOptionText } from '@/components/common/MathText';
import PortalModal from '@/components/common/PortalModal';
import { VIETNAM_EDUCATION_DEPARTMENTS, getShortLocation, normalizeDepartmentAccents } from '@/lib/education-departments';
import {
  EXAM_SESSION_PRESETS,
  DEFAULT_SECTION_TITLES,
  DEFAULT_SECTION_DESCRIPTIONS,
  normalizeQuestionType,
  reconcileTrueFalseQuestion,
  cleanseInternalMonologue,
  parseTrueFalseTruth,
  extractTruthFromExplanation,
  getMaxQuestionsForSubject,
} from '@/lib/exam-sections';
import {
  exportExamToDocx,
  exportExamToDoc,
  exportExamToPdf,
  exportExamToJson,
  exportExamToLatex,
  exportExamToZipAll,
  getOptionsLayout,
} from '@/lib/export-exam';
import { extractCleanShortAnswerValue } from '@/lib/curriculum-questions';
import { generateExamVariants } from '@/lib/exam-shuffler';

export default function EditorView() {
  const { activeExam, updateExam, showToast, setCurrentRoute, user, token } = useAppStore();

  const [title, setTitle] = useState(activeExam?.title || '');
  const [examCode, setExamCode] = useState(() => formatExamCode(activeExam?.id, activeExam?.code));
  const [questions, setQuestions] = useState<ExamQuestion[]>(activeExam?.questions || []);
  const [variants, setVariants] = useState<any[]>(() => activeExam?.variants || []);
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);
  const [isShuffleModalOpen, setIsShuffleModalOpen] = useState(false);
  const [shuffleCodesCount, setShuffleCodesCount] = useState<number>(4);
  const [shuffleOrderOpt, setShuffleOrderOpt] = useState(true);
  const [shuffleValuesOpt, setShuffleValuesOpt] = useState(false);
  const [isGeneratingAiVariants, setIsGeneratingAiVariants] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingQId, setEditingQId] = useState<number | string | null>(null);
  const [includeAnswers, setIncludeAnswers] = useState(true);
  const [regeneratingQId, setRegeneratingQId] = useState<number | string | null>(null);
  const [targetRegenQuestion, setTargetRegenQuestion] = useState<ExamQuestion | null>(null);
  const [regenPromptInput, setRegenPromptInput] = useState('');
  const [isRegeneratingExam, setIsRegeneratingExam] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isEditorMode, setIsEditorMode] = useState(false);
  const [history, setHistory] = useState<ExamQuestion[][]>(() => [activeExam?.questions || []]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [viewingHistoryQId, setViewingHistoryQId] = useState<number | string | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const exportDropdownRef = useRef<HTMLDivElement>(null);
  const addDropdownRef = useRef<HTMLDivElement>(null);

  const [department, setDepartment] = useState<string>(() => {
    return normalizeDepartmentAccents(activeExam?.department || 'SỞ GIÁO DỤC VÀ ĐÀO TẠO THÀNH PHỐ HẢI PHÒNG');
  });
  const [schoolName, setSchoolName] = useState<string>(() => {
    const rawSchool = activeExam?.schoolName || user.school || '';
    if (!rawSchool || rawSchool.trim() === 'HẢ') return 'TRƯỜNG THPT CHUYÊN TRẦN PHÚ';
    return rawSchool;
  });
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [deptSearch, setDeptSearch] = useState('');
  const [customDeptInput, setCustomDeptInput] = useState('');

  const [sessionTitle, setSessionTitle] = useState<string>(() => {
    return activeExam?.sessionTitle || activeExam?.term || 'KỲ THI KIỂM TRA ĐÁNH GIÁ CHẤT LƯỢNG';
  });
  const [academicYear, setAcademicYear] = useState<string>(() => {
    return (
      activeExam?.academicYear ||
      (activeExam?.year
        ? activeExam.year.startsWith('NĂM')
          ? activeExam.year
          : `NĂM HỌC ${activeExam.year}`
        : 'NĂM HỌC 2024 – 2025')
    );
  });
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [customSessionInput, setCustomSessionInput] = useState('');
  const [isPrintGuideOpen, setIsPrintGuideOpen] = useState(false);
  const [sectionTitles, setSectionTitles] = useState<Record<string, string>>(() => {
    return activeExam?.sectionTitles || { ...DEFAULT_SECTION_TITLES };
  });
  const [sectionDescriptions, setSectionDescriptions] = useState<Record<string, string>>(() => {
    return activeExam?.sectionDescriptions || { ...DEFAULT_SECTION_DESCRIPTIONS };
  });

  // Sync state if activeExam changes
  useEffect(() => {
    if (activeExam) {
      setTitle(activeExam.title);
      const incomingVariants = activeExam.variants && activeExam.variants.length > 0 ? activeExam.variants : [];
      setVariants(incomingVariants);
      setSelectedVariantIdx(0);
      setQuestions(activeExam.questions || []);
      setHistory([activeExam.questions || []]);
      setHistoryIndex(0);
      setExamCode(formatExamCode(activeExam.id, activeExam.code));
      if (activeExam.department) setDepartment(normalizeDepartmentAccents(activeExam.department));
      if (activeExam.schoolName) {
        const s = activeExam.schoolName.trim();
        setSchoolName(!s || s === 'HẢ' ? 'TRƯỜNG THPT CHUYÊN TRẦN PHÚ' : s);
      }
      if (activeExam.sessionTitle) setSessionTitle(activeExam.sessionTitle);
      if (activeExam.academicYear) setAcademicYear(activeExam.academicYear);
      if (activeExam.sectionTitles) setSectionTitles(activeExam.sectionTitles);
      if (activeExam.sectionDescriptions) setSectionDescriptions(activeExam.sectionDescriptions);
    }
  }, [activeExam]);

  // Filtered department list
  const filteredDepartments = useMemo(() => {
    if (!deptSearch.trim()) return VIETNAM_EDUCATION_DEPARTMENTS;
    const q = deptSearch.toLowerCase().trim();
    return VIETNAM_EDUCATION_DEPARTMENTS.filter((d) => d.toLowerCase().includes(q));
  }, [deptSearch]);

  const applyDepartment = (val: string) => {
    const trimmed = normalizeDepartmentAccents(val.trim());
    if (!trimmed) {
      showToast('Vui lòng nhập tên Sở hoặc chọn từ danh sách', 'warning');
      return;
    }
    setDepartment(trimmed);
    setCustomDeptInput(trimmed);
    setIsDeptModalOpen(false);
    if (activeExam?.id) {
      updateExam(activeExam.id, { department: trimmed });
    }
    showToast(`Đã chọn cơ quan xuất xứ đề: ${trimmed}`, 'success');
  };

  const applySessionTitle = (val: string) => {
    const trimmed = val.trim().toUpperCase();
    if (!trimmed) {
      showToast('Vui lòng nhập tên bài kiểm tra hoặc chọn mẫu', 'warning');
      return;
    }
    setSessionTitle(trimmed);
    setCustomSessionInput(trimmed);
    setIsSessionModalOpen(false);
    if (activeExam?.id) {
      updateExam(activeExam.id, { sessionTitle: trimmed });
    }
    showToast(`Đã đổi tên bài kiểm tra: ${trimmed}`, 'success');
  };

  const handleSelectVariant = (idx: number) => {
    if (idx === selectedVariantIdx || !variants[idx]) return;
    const updatedVariants = [...variants];
    updatedVariants[selectedVariantIdx] = {
      ...updatedVariants[selectedVariantIdx],
      code: examCode,
      questions,
    };
    setVariants(updatedVariants);
    setSelectedVariantIdx(idx);
    const target = updatedVariants[idx];
    setExamCode(target.code || String(101 + idx));
    setQuestions(target.questions || []);
    setHistory([target.questions || []]);
    setHistoryIndex(0);
    showToast(`Đang hiển thị đề thi: Mã đề ${target.code}`, 'info');
  };

  const handlePerformShuffle = async () => {
    if (shuffleCodesCount <= 1 && !shuffleOrderOpt && !shuffleValuesOpt) {
      showToast('Vui lòng chọn ít nhất 2 mã đề hoặc chọn phương thức xáo trộn', 'warning');
      return;
    }

    if (shuffleValuesOpt && shuffleCodesCount > 1) {
      setIsGeneratingAiVariants(true);
      showToast(`AI đang tiến hành đổi số liệu và tự động giải lại đáp án cho ${shuffleCodesCount} mã đề...`, 'info');
      try {
        const targetCodes = Array.from({ length: shuffleCodesCount - 1 }, (_, i) => String(102 + i));
        const storedToken = token || (typeof window !== 'undefined' ? localStorage.getItem('examify_token') : '');
        const res = await fetch('/api/v1/exams/isomorphic-variants', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(storedToken ? { Authorization: `Bearer ${storedToken}` } : {}),
          },
          body: JSON.stringify({
            baseQuestions: questions,
            baseTitle: title || activeExam?.title || 'Đề thi',
            subject: activeExam?.subject || 'Toán học',
            grade: activeExam?.grade || 'Lớp 12',
            term: activeExam?.term || 'Học kỳ 1',
            variantCodes: targetCodes,
            shuffleOrder: shuffleOrderOpt,
          }),
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.data?.variants) && data.data.variants.length > 0) {
          const newVariants = data.data.variants;
          setVariants(newVariants);
          setSelectedVariantIdx(0);
          if (newVariants[0]) {
            setExamCode(newVariants[0].code);
            setQuestions(newVariants[0].questions);
            setHistory([newVariants[0].questions || []]);
            setHistoryIndex(0);
          }
          if (activeExam?.id) {
            const baseCode = newVariants[0]?.code || '101';
            const baseQuestions = newVariants[0]?.questions || questions;
            updateExam(activeExam.id, {
              code: baseCode,
              questions: baseQuestions,
              questionsCount: baseQuestions.length,
              variants: newVariants,
            });
          }
          setIsShuffleModalOpen(false);
          showToast(`Đã tạo thành công ${newVariants.length} mã đề đồng dạng bằng AI với số liệu mới và đáp án tự động tính toán lại!`, 'success');
          return;
        }
      } catch (err) {
        console.warn('AI isomorphic shuffle failed, falling back to safe offline shuffle:', err);
        showToast('Không thể kết nối AI, hệ thống tự động chuyển sang chế độ xáo thứ tự câu an toàn.', 'warning');
      } finally {
        setIsGeneratingAiVariants(false);
      }
    }

    // Fast instant offline shuffle
    const newVariants = generateExamVariants(
      questions,
      title || activeExam?.title || 'Đề thi',
      {
        codeCount: shuffleCodesCount,
        shuffleOrder: shuffleOrderOpt,
        shuffleValues: false,
        baseCode: 101,
      }
    );
    setVariants(newVariants);
    setSelectedVariantIdx(0);
    if (newVariants[0]) {
      setExamCode(newVariants[0].code);
      setQuestions(newVariants[0].questions);
      setHistory([newVariants[0].questions || []]);
      setHistoryIndex(0);
    }
    if (activeExam?.id) {
      const baseCode = newVariants[0]?.code || '101';
      const baseQuestions = newVariants[0]?.questions || questions;
      updateExam(activeExam.id, {
        code: baseCode,
        questions: baseQuestions,
        questionsCount: baseQuestions.length,
        variants: newVariants,
      });
    }
    setIsShuffleModalOpen(false);
    showToast(`Đã tạo thành công ${shuffleCodesCount} mã đề thi (101 - ${100 + shuffleCodesCount})!`, 'success');
  };

  // Click outside listener for dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        exportDropdownRef.current &&
        !exportDropdownRef.current.contains(event.target as Node)
      ) {
        setIsExportOpen(false);
      }
      if (
        addDropdownRef.current &&
        !addDropdownRef.current.contains(event.target as Node)
      ) {
        setIsAddOpen(false);
      }
    }
    let printRestoreTimeout: NodeJS.Timeout | null = null;
    const handleBeforePrint = () => {
      document.title = '';
      if (printRestoreTimeout) clearTimeout(printRestoreTimeout);
      printRestoreTimeout = setTimeout(() => {
        document.title = 'Examify AI - Hệ Thống Khảo Thí & Tạo Đề Thi Thông Minh';
      }, 3000);
    };
    const handleAfterPrint = () => {
      if (printRestoreTimeout) clearTimeout(printRestoreTimeout);
      document.title = 'Examify AI - Hệ Thống Khảo Thí & Tạo Đề Thi Thông Minh';
    };
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      if (printRestoreTimeout) clearTimeout(printRestoreTimeout);
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  if (!activeExam) {
    return (
      <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 max-w-md mx-auto my-12">
        <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">
          folder_open
        </span>
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Chưa chọn bộ đề nào</h3>
        <p className="text-xs text-slate-400 mt-1 mb-4">
          Vui lòng chọn một đề thi từ bảng điều khiển để chỉnh sửa hoặc tạo đề thi mới.
        </p>
        <button
          type="button"
          onClick={() => setCurrentRoute('#dashboard')}
          className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-sm hover:bg-blue-700"
        >
          Về Bảng điều khiển
        </button>
      </div>
    );
  }

  const pushSnapshot = useCallback((snapshot: ExamQuestion[]) => {
    setHistory((prev) => {
      const current = prev.slice(0, historyIndex + 1);
      const next = [...current, snapshot];
      if (next.length > 30) return next.slice(next.length - 30);
      return next;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 29));
  }, [historyIndex]);

  const commitQuestionsImmediate = useCallback((newQuestions: ExamQuestion[]) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    setQuestions(newQuestions);
    pushSnapshot(newQuestions);

    if (variants && variants.length > 0) {
      setVariants((prev) =>
        prev.map((v, vIdx) => {
          if (vIdx === selectedVariantIdx) {
            return { ...v, questions: newQuestions };
          }
          return v;
        })
      );
    }
  }, [pushSnapshot, variants, selectedVariantIdx]);

  const commitQuestionsDebounced = useCallback((newQuestions: ExamQuestion[]) => {
    setQuestions(newQuestions);
    if (variants && variants.length > 0) {
      setVariants((prev) =>
        prev.map((v, vIdx) => {
          if (vIdx === selectedVariantIdx) {
            return { ...v, questions: newQuestions };
          }
          return v;
        })
      );
    }
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      pushSnapshot(newQuestions);
    }, 600);
  }, [pushSnapshot, variants, selectedVariantIdx]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const targetIdx = historyIndex - 1;
      const targetQuestions = history[targetIdx];
      setHistoryIndex(targetIdx);
      setQuestions(targetQuestions);
      if (variants && variants.length > 0) {
        setVariants((prev) =>
          prev.map((v, vIdx) => (vIdx === selectedVariantIdx ? { ...v, questions: targetQuestions } : v))
        );
      }
      showToast('Đã hoàn tác (Undo)', 'info');
    }
  }, [historyIndex, history, variants, selectedVariantIdx, showToast]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const targetIdx = historyIndex + 1;
      const targetQuestions = history[targetIdx];
      setHistoryIndex(targetIdx);
      setQuestions(targetQuestions);
      if (variants && variants.length > 0) {
        setVariants((prev) =>
          prev.map((v, vIdx) => (vIdx === selectedVariantIdx ? { ...v, questions: targetQuestions } : v))
        );
      }
      showToast('Đã làm lại (Redo)', 'info');
    }
  }, [historyIndex, history, variants, selectedVariantIdx, showToast]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl as HTMLElement).isContentEditable);

      if ((e.ctrlKey || e.metaKey) && !e.altKey) {
        if (e.key.toLowerCase() === 'z') {
          if (e.shiftKey) {
            if (!isInput) {
              e.preventDefault();
              handleRedo();
            }
          } else {
            if (!isInput) {
              e.preventDefault();
              handleUndo();
            }
          }
        } else if (e.key.toLowerCase() === 'y') {
          if (!isInput) {
            e.preventDefault();
            handleRedo();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  const getTypeLabel = (type?: string) => {
    const t = String(type || 'multiple_choice').toLowerCase().replace(/[\s_-]+/g, '');
    if (t.includes('true') || t.includes('dung')) return 'Đúng / Sai';
    if (t.includes('short') || t.includes('ngan')) return 'Trả lời ngắn';
    if (t.includes('essay') || t.includes('luan')) return 'Tự luận';
    return 'Trắc nghiệm';
  };

  const handleUpdateQuestion = (qId: number | string, field: keyof ExamQuestion, value: any) => {
    if (!isEditorMode) return;
    const updated = questions.map((q) => (q.id === qId ? { ...q, [field]: value } : q));
    if (field === 'content' || field === 'explanation' || field === 'correctAnswer') {
      commitQuestionsDebounced(updated);
    } else {
      commitQuestionsImmediate(updated);
    }
  };

  const handleUpdateOption = (qId: number | string, optKey: string, text: string) => {
    if (!isEditorMode) return;
    const cleaned = cleanOptionText(text);
    const updated = questions.map((q) => {
      if (q.id === qId) {
        const newOpts = (q.options || []).map((opt) =>
          opt.key.toLowerCase() === optKey.toLowerCase() ? { ...opt, text: cleaned } : opt
        );
        return { ...q, options: newOpts };
      }
      return q;
    });
    commitQuestionsDebounced(updated);
  };

  const handleSetCorrectAnswer = (qId: number | string, correctKey: string) => {
    if (!isEditorMode) {
      showToast('Vui lòng bật Chế độ chỉnh sửa để thay đổi đáp án', 'warning');
      return;
    }
    const normKey = correctKey.trim().toUpperCase();
    const updated = questions.map((q) => {
      if (q.id === qId) {
        const newOpts = (q.options || []).map((opt) => ({
          ...opt,
          key: opt.key.toUpperCase(),
          isCorrect: opt.key.toUpperCase() === normKey,
        }));
        return { ...q, correctAnswer: normKey, options: newOpts };
      }
      return q;
    });
    commitQuestionsImmediate(updated);
  };

  const handleToggleTrueFalse = (qId: number | string, optKey: string, isCorrect: boolean) => {
    if (!isEditorMode) {
      showToast('Vui lòng bật Chế độ chỉnh sửa để thay đổi đáp án Đúng/Sai', 'warning');
      return;
    }
    const targetKey = optKey.trim().toLowerCase();
    const updatedQuestions = questions.map((q) => {
      if (q.id === qId) {
        const subKeys = ['a', 'b', 'c', 'd'];
        const currentOpts =
          q.options && q.options.length > 0
            ? q.options
            : subKeys.map((k) => ({ key: k, text: `Mệnh đề ${k}`, isCorrect: true }));

        const newOpts = currentOpts.map((opt) =>
          opt.key.toLowerCase() === targetKey ? { ...opt, key: opt.key.toLowerCase(), isCorrect } : opt
        );
        const answerStr = newOpts
          .map((opt) => `${opt.key.toLowerCase()}: ${opt.isCorrect ? 'Đ' : 'S'}`)
          .join(', ');
        return { ...q, options: newOpts, correctAnswer: answerStr };
      }
      return q;
    });

    commitQuestionsImmediate(updatedQuestions);
  };

  const QUESTION_TYPE_ORDER: Record<string, number> = {
    multiple_choice: 1,
    true_false: 2,
    short_answer: 3,
    essay: 4,
  };

  const sortQuestionsBySection = (qList: ExamQuestion[]): ExamQuestion[] => {
    const sorted = [...qList].sort((a, b) => {
      const typeA = normalizeQuestionType(a.type);
      const typeB = normalizeQuestionType(b.type);
      const orderA = QUESTION_TYPE_ORDER[typeA] || 99;
      const orderB = QUESTION_TYPE_ORDER[typeB] || 99;
      return orderA - orderB;
    });

    return sorted.map((q, idx) => {
      const normType = normalizeQuestionType(q.type);
      return {
        ...q,
        type: normType,
        section: normType,
        order: `Câu ${String(idx + 1).padStart(2, '0')}`,
      };
    });
  };

  const handleChangeQuestionType = (qId: number | string, newType: QuestionType) => {
    if (!isEditorMode) {
      showToast('Vui lòng bật Chế độ chỉnh sửa để thay đổi dạng câu hỏi', 'warning');
      return;
    }
    const normNewType = normalizeQuestionType(newType) as QuestionType;

    const updatedQuestions = questions.map((q) => {
      if (q.id !== qId) return q;

      const oldType = normalizeQuestionType(q.type);
      if (oldType === normNewType) return q;

      let newOptions: QuestionOption[] = [];
      let newAns = q.correctAnswer || '';
      let points = q.points;
      const backupOptions = (q.options && q.options.length > 0) ? q.options : (q._backupOptions || []);
      const backupAnswer = q.correctAnswer || q._backupAnswer || '';

      // --- 1. CONVERT TO TRUE_FALSE (ĐÚNG / SAI 4 Ý a, b, c, d) ---
      if (normNewType === 'true_false') {
        const subKeys = ['a', 'b', 'c', 'd'];

        // Helper: Sinh phân bố Đúng / Sai thực tế chuẩn Bộ GD&ĐT (1Đ-3S, 2Đ-2S, hoặc 3Đ-1S; tuyệt đối không 4Đ hay 4S)
        const generateRealisticTfBooleans = (): boolean[] => {
          const patterns = [
            [true, false, false, false],
            [true, true, false, false],
            [true, true, false, false],
            [true, true, true, false],
          ];
          const chosen = [...patterns[Math.floor(Math.random() * patterns.length)]];
          for (let idx = chosen.length - 1; idx > 0; idx--) {
            const j = Math.floor(Math.random() * (idx + 1));
            [chosen[idx], chosen[j]] = [chosen[j], chosen[idx]];
          }
          return chosen;
        };

        if (oldType === 'multiple_choice') {
          // Map existing 4 options to a, b, c, d without losing their texts
          const existingOpts = (q.options && q.options.length >= 4) ? q.options : backupOptions;
          const tfBooleans = generateRealisticTfBooleans();
          newOptions = subKeys.map((k, i) => {
            const existing = existingOpts[i];
            return {
              key: k,
              text: existing ? cleanOptionText(existing.text) : `Mệnh đề khẳng định ý ${k}`,
              isCorrect: tfBooleans[i],
            };
          });
        } else if (oldType === 'short_answer' || oldType === 'essay') {
          // Check if previously had true_false options in backup
          const previousTfOpts = backupOptions.filter((o) => ['a', 'b', 'c', 'd'].includes(o.key.toLowerCase()));
          if (previousTfOpts.length === 4) {
            newOptions = previousTfOpts.map((o) => ({ ...o, key: o.key.toLowerCase() }));
          } else {
            const ansText = cleanOptionText(q.correctAnswer || backupAnswer);
            const tfBooleans = generateRealisticTfBooleans();
            newOptions = [
              { key: 'a', text: ansText && !ansText.includes('Xem') ? `Kết quả của bài toán là $${ansText}$` : 'Mệnh đề khẳng định ý a', isCorrect: tfBooleans[0] },
              { key: 'b', text: 'Mệnh đề phủ định của ý a', isCorrect: tfBooleans[1] },
              { key: 'c', text: 'Tập xác định của hàm số thỏa mãn yêu cầu bài toán', isCorrect: tfBooleans[2] },
              { key: 'd', text: 'Tập nghiệm của phương trình là tập hợp rỗng', isCorrect: tfBooleans[3] },
            ];
          }
        } else {
          const tfBooleans = generateRealisticTfBooleans();
          newOptions = subKeys.map((k, i) => {
            const existing = (q.options || [])[i] || backupOptions[i];
            return {
              key: k,
              text: existing ? cleanOptionText(existing.text) : `Mệnh đề khẳng định ý ${k}`,
              isCorrect: existing && typeof existing.isCorrect === 'boolean' ? existing.isCorrect : tfBooleans[i],
            };
          });
        }

        // Formulate correct answer string: "a: Đ, b: S, c: Đ, d: S"
        newAns = newOptions.map((o) => `${o.key}: ${o.isCorrect ? 'Đ' : 'S'}`).join(', ');
        points = 1.0;
      }

      // --- 2. CONVERT TO MULTIPLE_CHOICE (TRẮC NGHIỆM 4 LỰA CHỌN A, B, C, D) ---
      else if (normNewType === 'multiple_choice') {
        const optKeys = ['A', 'B', 'C', 'D'];

        if (oldType === 'true_false') {
          // Convert from true_false: preserve text of all 4 propositions!
          const existingOpts = (q.options && q.options.length >= 4) ? q.options : backupOptions;

          // Find which options were marked true
          const trueIndices = existingOpts
            .map((o, idx) => (o.isCorrect ? idx : -1))
            .filter((idx) => idx !== -1);

          // Pick the first true option as the single correct MC answer (or 'A' if none)
          const targetCorrectKey = optKeys[trueIndices.length > 0 ? trueIndices[0] : 0] || 'A';

          newOptions = optKeys.map((k, i) => {
            const existing = existingOpts[i];
            return {
              key: k,
              text: existing ? cleanOptionText(existing.text) : `Lựa chọn phương án ${k}`,
              isCorrect: k === targetCorrectKey,
            };
          });
          newAns = targetCorrectKey;
        } else if (oldType === 'short_answer' || oldType === 'essay') {
          // Check if backup has multiple_choice options
          const previousMcOpts = backupOptions.filter((o) => ['A', 'B', 'C', 'D'].includes(o.key.toUpperCase()));
          if (previousMcOpts.length === 4) {
            const savedAns = backupAnswer.trim().toUpperCase();
            const validKey = ['A', 'B', 'C', 'D'].includes(savedAns) ? savedAns : 'A';
            newOptions = previousMcOpts.map((o) => ({
              ...o,
              key: o.key.toUpperCase(),
              isCorrect: o.key.toUpperCase() === validKey,
            }));
            newAns = validKey;
          } else {
            // Keep the actual mathematical answer as Option A
            const ansText = cleanOptionText(q.correctAnswer || backupAnswer);
            newOptions = [
              { key: 'A', text: ansText && !ansText.includes('Xem') ? ansText : 'Lựa chọn phương án A (đáp án đúng)', isCorrect: true },
              { key: 'B', text: 'Lựa chọn phương án B', isCorrect: false },
              { key: 'C', text: 'Lựa chọn phương án C', isCorrect: false },
              { key: 'D', text: 'Lựa chọn phương án D', isCorrect: false },
            ];
            newAns = 'A';
          }
        } else {
          const existingOpts = (q.options && q.options.length > 0) ? q.options : backupOptions;
          let foundCorrect = false;
          newOptions = optKeys.map((k, i) => {
            const existing = existingOpts[i];
            const isMatchAns = q.correctAnswer && q.correctAnswer.trim().toUpperCase() === k;
            const isCorr = existing ? (isMatchAns || (!!existing.isCorrect && !foundCorrect)) : (k === 'A');
            if (isCorr) foundCorrect = true;
            return {
              key: k,
              text: existing ? cleanOptionText(existing.text) : `Lựa chọn phương án ${k}`,
              isCorrect: isCorr,
            };
          });
          if (!newOptions.some((o) => o.isCorrect)) {
            newOptions[0].isCorrect = true;
          }
          newAns = newOptions.find((o) => o.isCorrect)?.key || 'A';
        }

        points = 0.25;
      }

      // --- 3. CONVERT TO SHORT_ANSWER (TRẢ LỜI NGẮN) ---
      else if (normNewType === 'short_answer') {
        newOptions = []; // Clear options for display in short answer

        if (oldType === 'multiple_choice') {
          // CRITICAL: Extract the ACTUAL TEXT/VALUE of the correct option!
          const currentOpts = (q.options && q.options.length > 0) ? q.options : backupOptions;
          const correctKey = q.correctAnswer?.trim().toUpperCase();
          const correctOpt = currentOpts.find(
            (o) => o.key.toUpperCase() === correctKey || o.isCorrect
          );
          newAns = extractCleanShortAnswerValue(correctOpt?.text, q.explanation, q.correctAnswer);
        } else if (oldType === 'true_false') {
          newAns = extractCleanShortAnswerValue(null, q.explanation, backupAnswer && !backupAnswer.includes(':') ? backupAnswer : '');
        } else if (oldType === 'essay') {
          const rawEssayAns = q.correctAnswer && !q.correctAnswer.includes('Xem hướng dẫn')
            ? q.correctAnswer.replace(/^Đáp số:\s*/i, '').trim()
            : '';
          newAns = extractCleanShortAnswerValue(null, q.explanation, rawEssayAns);
        } else {
          newAns = extractCleanShortAnswerValue(null, q.explanation, q.correctAnswer);
        }

        // If still empty, use backup answer if available
        if (!newAns && q._backupAnswer) {
          newAns = extractCleanShortAnswerValue(null, null, q._backupAnswer);
        }

        points = 0.5;
      }

      // --- 4. CONVERT TO ESSAY (TỰ LUẬN) ---
      else if (normNewType === 'essay') {
        newOptions = [];
        newAns = 'Xem hướng dẫn chấm và barem điểm';
        points = 1.5;
      }

      return {
        ...q,
        type: normNewType,
        section: normNewType,
        options: newOptions,
        correctAnswer: newAns,
        points,
        _backupOptions: backupOptions.length > 0 ? backupOptions : q.options,
        _backupAnswer: backupAnswer || q.correctAnswer,
      };
    });

    // Auto-sort into official Ministry of Education sections (Phần I -> Phần II -> Phần III -> Phần IV)
    const sorted = sortQuestionsBySection(updatedQuestions);
    commitQuestionsImmediate(sorted);

    const qIndex = questions.findIndex((q) => q.id === qId);
    const convertedQuestion = sorted.find((q) => q.id === qId);

    if (variants && variants.length > 0) {
      const updatedVariants = variants.map((v, vIdx) => {
        if (vIdx === selectedVariantIdx) {
          return { ...v, questions: sorted };
        }
        const vQuestions = (v.questions || []).map((q: ExamQuestion, idx: number) => {
          if (q.id === qId || (qIndex >= 0 && idx === qIndex)) {
            return {
              ...q,
              type: normNewType,
              section: normNewType,
              points: convertedQuestion?.points ?? q.points,
              options: convertedQuestion?.options ?? q.options,
              correctAnswer: convertedQuestion?.correctAnswer ?? q.correctAnswer,
            };
          }
          return q;
        });
        return {
          ...v,
          questions: sortQuestionsBySection(vQuestions),
        };
      });
      setVariants(updatedVariants);
      if (activeExam?.id) {
        updateExam(activeExam.id, {
          variants: updatedVariants,
          questions: selectedVariantIdx === 0 ? sorted : (updatedVariants[0]?.questions || sorted),
          questionsCount: sorted.length,
        });
      }
    } else if (activeExam?.id) {
      updateExam(activeExam.id, {
        questions: sorted,
        questionsCount: sorted.length,
      });
    }

    showToast(`Đã chuyển câu hỏi sang dạng "${getTypeLabel(normNewType)}" và đồng bộ chuẩn hoá qua tất cả mã đề!`, 'success');
  };

  const handleDeleteQuestion = (qId: number | string) => {
    if (!isEditorMode) {
      showToast('Vui lòng bật Chế độ chỉnh sửa để xóa câu hỏi', 'warning');
      return;
    }
    const qIndex = questions.findIndex((q) => q.id === qId);
    const remaining = questions.filter((q) => q.id !== qId);
    const sorted = sortQuestionsBySection(remaining);
    commitQuestionsImmediate(sorted);

    if (variants && variants.length > 0) {
      const updatedVariants = variants.map((v, vIdx) => {
        if (vIdx === selectedVariantIdx) {
          return { ...v, questions: sorted };
        }
        let newVariantQuestions = (v.questions || []).filter((q: ExamQuestion) => q.id !== qId);
        if (newVariantQuestions.length === (v.questions || []).length && qIndex >= 0 && qIndex < (v.questions || []).length) {
          newVariantQuestions = (v.questions || []).filter((_: ExamQuestion, idx: number) => idx !== qIndex);
        }
        return {
          ...v,
          questions: sortQuestionsBySection(newVariantQuestions),
        };
      });
      setVariants(updatedVariants);
      if (activeExam?.id) {
        updateExam(activeExam.id, {
          variants: updatedVariants,
          questions: selectedVariantIdx === 0 ? sorted : (updatedVariants[0]?.questions || sorted),
          questionsCount: sorted.length,
        });
      }
    } else if (activeExam?.id) {
      updateExam(activeExam.id, {
        questions: sorted,
        questionsCount: sorted.length,
      });
    }
    showToast('Đã xóa câu hỏi và đồng bộ qua tất cả mã đề', 'info');
  };

  const handleAddQuestion = (type: QuestionType = 'multiple_choice') => {
    if (!isEditorMode) {
      showToast('Vui lòng bật Chế độ chỉnh sửa để thêm câu hỏi mới', 'warning');
      return;
    }
    const normType = normalizeQuestionType(type) as QuestionType;
    let options = [
      { key: 'A', text: 'Lựa chọn A ($x > 0$)', isCorrect: true },
      { key: 'B', text: 'Lựa chọn B ($x < 0$)', isCorrect: false },
      { key: 'C', text: 'Lựa chọn C ($x = 0$)', isCorrect: false },
      { key: 'D', text: 'Lựa chọn D ($x \\neq 0$)', isCorrect: false },
    ];
    let correctAnswer = 'A';
    let points = 0.25;
    let defaultContent = 'Nội dung câu hỏi mới biên soạn (hỗ trợ $công_thức_toán$)...';

    if (normType === 'true_false') {
      options = [
        { key: 'a', text: 'Khẳng định ý a', isCorrect: true },
        { key: 'b', text: 'Khẳng định ý b', isCorrect: false },
        { key: 'c', text: 'Khẳng định ý c', isCorrect: true },
        { key: 'd', text: 'Khẳng định ý d', isCorrect: false },
      ];
      correctAnswer = 'a: Đ, b: S, c: Đ, d: S';
      points = 1.0;
      defaultContent = 'Cho hàm số $y = f(x)$ xác định và liên tục trên $\\mathbb{R}$. Các mệnh đề sau đúng hay sai?';
    } else if (normType === 'short_answer') {
      options = [];
      correctAnswer = '4';
      points = 0.5;
      defaultContent = 'Cho hàm số $y = x^3 - 3x^2 + 4$. Điểm cực đại của đồ thị hàm số có tung độ bằng bao nhiêu?';
    } else if (normType === 'essay') {
      options = [];
      correctAnswer = 'Xem hướng dẫn chấm và barem điểm';
      points = 1.5;
      defaultContent = 'Giải phương trình và biện luận nghiệm theo tham số $m$: $x^2 - 2(m-1)x + m^2 - 3 = 0$.';
    }

    const newQ: ExamQuestion = {
      id: Date.now(),
      order: `Câu mới`,
      type: normType,
      section: normType,
      level: 'Thông hiểu',
      levelClass: 'bg-blue-50 text-blue-700 border-blue-200',
      topic: activeExam.subject,
      content: defaultContent,
      options,
      points,
      correctAnswer,
      explanation: normType === 'short_answer'
        ? 'Ta có $y\' = 3x^2 - 6x = 0 \\Leftrightarrow x = 0$ hoặc $x = 2$. Với $x = 0$ thì $y = 4$ là giá trị cực đại của đồ thị hàm số. Vậy đáp số là 4.'
        : 'Giải thích chi tiết đáp án đúng / barem điểm...',
    };

    const sorted = sortQuestionsBySection([...questions, newQ]);
    commitQuestionsImmediate(sorted);

    if (variants && variants.length > 0) {
      const updatedVariants = variants.map((v, vIdx) => {
        if (vIdx === selectedVariantIdx) {
          return { ...v, questions: sorted };
        }
        const clonedNewQ: ExamQuestion = {
          ...newQ,
          id: Date.now() + vIdx * 1000 + Math.floor(Math.random() * 500),
        };
        return {
          ...v,
          questions: sortQuestionsBySection([...v.questions, clonedNewQ]),
        };
      });
      setVariants(updatedVariants);
      if (activeExam?.id) {
        updateExam(activeExam.id, {
          variants: updatedVariants,
          questions: selectedVariantIdx === 0 ? sorted : (updatedVariants[0]?.questions || sorted),
          questionsCount: sorted.length,
        });
      }
    } else if (activeExam?.id) {
      updateExam(activeExam.id, {
        questions: sorted,
        questionsCount: sorted.length,
      });
    }
    showToast(`Đã thêm 1 câu hỏi (${getTypeLabel(normType)}) và đồng bộ vào tất cả các mã đề`, 'success');
  };

  // Single Question AI Regeneration
  const handleRegenerateQuestion = async (q: ExamQuestion, directive?: string) => {
    if (!isEditorMode) {
      showToast('Vui lòng bật Chế độ chỉnh sửa để tạo lại câu hỏi bằng AI', 'warning');
      return;
    }
    setRegeneratingQId(q.id);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('examify_token') : null;
      if (storedToken) {
        headers['Authorization'] = `Bearer ${storedToken}`;
      }

      let examTopic = activeExam.subject;
      if (activeExam.curriculumMetadata) {
        try {
          const meta = typeof activeExam.curriculumMetadata === 'string'
            ? JSON.parse(activeExam.curriculumMetadata)
            : activeExam.curriculumMetadata;
          if (meta.topic) examTopic = meta.topic;
          if (meta.lesson) examTopic = `${meta.topic} - ${meta.lesson}`;
        } catch {
          // ignore
        }
      }

      // Accumulate previous versions and contents for this question slot
      const previousVersions: ExamQuestionVersion[] = (q._previousVersions || []).map((v) => ({ ...v }));
      const currentSnapshot: ExamQuestionVersion = {
        timestamp: Date.now(),
        content: q.content,
        type: q.type,
        section: q.section,
        options: (q.options || []).map((o) => ({ ...o })),
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        level: q.level,
        points: q.points,
      };
      const updatedVersions = [currentSnapshot, ...previousVersions].slice(0, 10);
      const previousContents = (q._previousContents || []) as string[];
      const updatedHistory = Array.from(new Set([...previousContents, q.content].filter(Boolean)));

      const res = await fetch('/api/v1/exams/regenerate-question', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          subject: activeExam.subject,
          grade: activeExam.grade,
          term: activeExam.term || 'Học kỳ 1',
          level: q.level,
          type: q.type || 'multiple_choice',
          currentTopic: q.topic && q.topic !== activeExam.subject ? q.topic : examTopic,
          customPrompt: directive ? directive : (activeExam.customPrompt || ''),
          teacherDirective: directive || undefined,
          currentQuestionContent: q.content,
          avoidQuestions: Array.from(
            new Set([...updatedHistory, ...questions.map((item) => item.content).filter(Boolean)])
          ),
          existingQuestions: questions.map((item) => item.content).filter(Boolean),
        }),
      });

      const data = await res.json();
      if (data.success && data.data?.question) {
        const newQ = data.data.question;
        const normType = newQ.type || q.type || 'multiple_choice';
        const updatedList = questions.map((item) =>
          item.id === q.id
            ? {
                ...item,
                _previousVersions: updatedVersions,
                _previousContents: Array.from(new Set([...updatedHistory, newQ.content])),
                content: newQ.content,
                type: normType,
                section: normType,
                options: (newQ.options || []).map((opt: any) => ({
                  ...opt,
                  text: cleanOptionText(opt.text),
                })),
                correctAnswer: newQ.correctAnswer,
                explanation: newQ.explanation,
                level: newQ.level || item.level,
                points: newQ.points || item.points,
              }
            : item
        );
        const sorted = sortQuestionsBySection(updatedList);
        commitQuestionsImmediate(sorted);

        const qIndex = questions.findIndex((item) => item.id === q.id);
        const replacedItem = sorted.find((item) => item.id === q.id);

        if (variants && variants.length > 0) {
          const updatedVariants = variants.map((v, vIdx) => {
            if (vIdx === selectedVariantIdx) {
              return { ...v, questions: sorted };
            }
            const vQuestions = (v.questions || []).map((vQ: ExamQuestion, idx: number) => {
              if (vQ.id === q.id || (qIndex >= 0 && idx === qIndex)) {
                return {
                  ...vQ,
                  content: replacedItem?.content ?? newQ.content,
                  type: normType,
                  section: normType,
                  options: replacedItem?.options ?? newQ.options,
                  correctAnswer: replacedItem?.correctAnswer ?? newQ.correctAnswer,
                  explanation: replacedItem?.explanation ?? newQ.explanation,
                  level: replacedItem?.level ?? newQ.level,
                  points: replacedItem?.points ?? newQ.points,
                };
              }
              return vQ;
            });
            return {
              ...v,
              questions: sortQuestionsBySection(vQuestions),
            };
          });
          setVariants(updatedVariants);
          if (activeExam?.id) {
            updateExam(activeExam.id, {
              variants: updatedVariants,
              questions: selectedVariantIdx === 0 ? sorted : (updatedVariants[0]?.questions || sorted),
              questionsCount: sorted.length,
            });
          }
        } else if (activeExam?.id) {
          updateExam(activeExam.id, {
            questions: sorted,
            questionsCount: sorted.length,
          });
        }
        showToast(
          directive
            ? `Đã đổi câu hỏi ${q.order || ''} theo yêu cầu: "${directive.slice(0, 30)}${directive.length > 30 ? '...' : ''}"`
            : `Đã tạo mới câu hỏi số ${q.order || q.id} bằng AI và đồng bộ các mã đề!`,
          'success'
        );
      } else {
        showToast('Không thể tạo lại câu hỏi AI', 'error');
      }
    } catch {
      showToast('Lỗi khi kết nối dịch vụ tạo câu hỏi AI', 'error');
    } finally {
      setRegeneratingQId(null);
    }
  };

  const handleRestoreQuestionVersion = (qId: number | string, versionIndex: number) => {
    const targetQ = questions.find((item) => item.id === qId);
    if (!targetQ || !targetQ._previousVersions || !targetQ._previousVersions[versionIndex]) {
      return;
    }
    const versionToRestore = targetQ._previousVersions[versionIndex];
    const remainingVersions = targetQ._previousVersions.filter((_, idx) => idx !== versionIndex);
    const currentSnapshot: ExamQuestionVersion = {
      timestamp: Date.now(),
      content: targetQ.content,
      type: targetQ.type,
      section: targetQ.section,
      options: (targetQ.options || []).map((o) => ({ ...o })),
      correctAnswer: targetQ.correctAnswer,
      explanation: targetQ.explanation,
      level: targetQ.level,
      points: targetQ.points,
    };
    const newPreviousVersions = [currentSnapshot, ...remainingVersions].slice(0, 10);

    const normType = versionToRestore.type || targetQ.type || 'multiple_choice';
    const updatedList = questions.map((item) => {
      if (item.id === qId) {
        return {
          ...item,
          content: versionToRestore.content,
          type: normType,
          section: normType,
          options: versionToRestore.options || item.options,
          correctAnswer: versionToRestore.correctAnswer || item.correctAnswer,
          explanation: versionToRestore.explanation || item.explanation,
          level: versionToRestore.level || item.level,
          points: versionToRestore.points || item.points,
          _previousVersions: newPreviousVersions,
        };
      }
      return item;
    });

    const sorted = sortQuestionsBySection(updatedList);
    commitQuestionsImmediate(sorted);

    const qIndex = questions.findIndex((item) => item.id === qId);
    const replacedItem = sorted.find((item) => item.id === qId);

    if (variants && variants.length > 0) {
      const updatedVariants = variants.map((v, vIdx) => {
        if (vIdx === selectedVariantIdx) {
          return { ...v, questions: sorted };
        }
        const vQuestions = (v.questions || []).map((vQ: ExamQuestion, idx: number) => {
          if (vQ.id === qId || (qIndex >= 0 && idx === qIndex)) {
            return {
              ...vQ,
              content: replacedItem?.content ?? versionToRestore.content,
              type: normType,
              section: normType,
              options: replacedItem?.options ?? versionToRestore.options,
              correctAnswer: replacedItem?.correctAnswer ?? versionToRestore.correctAnswer,
              explanation: replacedItem?.explanation ?? versionToRestore.explanation,
              level: replacedItem?.level ?? versionToRestore.level,
              points: replacedItem?.points ?? versionToRestore.points,
            };
          }
          return vQ;
        });
        return {
          ...v,
          questions: sortQuestionsBySection(vQuestions),
        };
      });
      setVariants(updatedVariants);
      if (activeExam?.id) {
        updateExam(activeExam.id, {
          variants: updatedVariants,
          questions: selectedVariantIdx === 0 ? sorted : (updatedVariants[0]?.questions || sorted),
          questionsCount: sorted.length,
        });
      }
    } else if (activeExam?.id) {
      updateExam(activeExam.id, {
        questions: sorted,
        questionsCount: sorted.length,
      });
    }

    setViewingHistoryQId(null);
    showToast(`Đã khôi phục phiên bản trước của Câu ${targetQ.order || ''}!`, 'success');
  };

  // Entire Exam AI Regeneration
  const handleRegenerateEntireExam = async () => {
    if (!isEditorMode) {
      showToast('Vui lòng bật Chế độ chỉnh sửa để tạo lại toàn bộ đề thi', 'warning');
      return;
    }
    if (!window.confirm('Bạn có chắc chắn muốn AI tạo lại TOÀN BỘ câu hỏi cho đề thi này?')) {
      return;
    }

    setIsRegeneratingExam(true);
    try {
      const easy = activeExam.matrix?.easy || 40;
      const medium = activeExam.matrix?.medium || 30;
      const hard = activeExam.matrix?.hard || 20;
      const veryHard = activeExam.matrix?.veryHard || 10;
      const maxAllowed = getMaxQuestionsForSubject(activeExam.subject);
      const questionCount = Math.min(maxAllowed, Math.max(5, questions.length > 0 ? questions.length : 20));

      const payload = {
        title: title || activeExam.title,
        curriculum: {
          level: 'THPT',
          grade: activeExam.grade,
          subject: activeExam.subject,
          semester: activeExam.term || 'Học kỳ 1',
        },
        examType: 'MID_TERM',
        durationMinutes: activeExam.duration || 45,
        totalPoints: 10,
        totalQuestions: questionCount,
        cognitiveMatrix: {
          knowledge: easy,
          comprehension: medium,
          application: hard,
          highApplication: veryHard,
        },
        aiProvider: 'gemini',
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
      const generated = data.data?.exam || data.data?.examData;
      if (data.success && generated) {
        const rawList = generated.questions || [];
        const newQuestions: ExamQuestion[] = rawList.map((q: any, i: number) => {
          const rawType = String(q.type || 'multiple_choice').toLowerCase().replace(/[\s_-]+/g, '');
          const qType: QuestionType = rawType.includes('true') || rawType.includes('dung')
            ? 'true_false'
            : rawType.includes('short') || rawType.includes('ngan')
            ? 'short_answer'
            : rawType.includes('essay') || rawType.includes('luan')
            ? 'essay'
            : 'multiple_choice';

          const levelStr = q.level || 'Thông hiểu';
          let formattedOptions: any[] = [];
          if (qType === 'true_false') {
            const healed = reconcileTrueFalseQuestion(
              { options: q.options, correctAnswer: q.correctAnswer, explanation: q.explanation },
              true
            );
            formattedOptions = healed.options;
            q.correctAnswer = healed.correctAnswer;
            q.explanation = healed.explanation;
          } else if (qType === 'multiple_choice') {
            formattedOptions = (q.options || ['A', 'B', 'C', 'D']).map((opt: any, optIdx: number) => {
              const key = ['A', 'B', 'C', 'D'][optIdx] || 'A';
              const textVal = typeof opt === 'object' && opt !== null ? opt.text : String(opt || '');
              const cleanText = textVal.replace(/(?:^\([A-Da-d]\)|^[\[\{][A-Da-d][\]\}]|^[A-Da-d][\.\:\)\-–—])\s*/i, '').trim();
              return {
                key,
                text: cleanText || textVal,
                isCorrect: (q.correctAnswer || 'A').toUpperCase() === key,
              };
            });
          }

          const cleanExpl = cleanseInternalMonologue(q.explanation);
          let finalAnswer = q.correctAnswer || 'A';
          if (qType === 'short_answer') {
            finalAnswer = extractCleanShortAnswerValue(null, cleanExpl, q.correctAnswer);
          } else if (qType === 'essay') {
            finalAnswer = q.correctAnswer && !q.correctAnswer.includes('Xem') ? q.correctAnswer : 'Xem hướng dẫn chấm và barem điểm';
          } else if (qType === 'true_false') {
            finalAnswer = q.correctAnswer || 'a: Đ, b: S, c: Đ, d: S';
          }

          return {
            id: Date.now() + i,
            order: `Câu ${String(i + 1).padStart(2, '0')}`,
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
            topic: activeExam.subject,
            content: q.content,
            options: formattedOptions,
            points: q.points || (qType === 'essay' ? 1.5 : qType === 'true_false' ? 1.0 : qType === 'short_answer' ? 0.5 : 0.25),
            correctAnswer: finalAnswer,
            explanation: cleanExpl || 'Lời giải chi tiết biên soạn bởi mô hình AI.',
          };
        });

        const sorted = sortQuestionsBySection(newQuestions);
        sorted.forEach((item, idx) => {
          item.order = `Câu ${String(idx + 1).padStart(2, '0')}`;
        });
        commitQuestionsImmediate(sorted);

        let updatedVariants: any[] | undefined = undefined;
        if (variants && variants.length > 1) {
          updatedVariants = generateExamVariants(
            sorted,
            title || activeExam?.title || 'Đề thi',
            {
              codeCount: variants.length,
              shuffleOrder: true,
              shuffleValues: false,
              baseCode: 101,
            }
          );
          setVariants(updatedVariants);
        } else if (variants && variants.length === 1) {
          updatedVariants = [{ ...variants[0], questions: sorted }];
          setVariants(updatedVariants);
        }

        if (activeExam?.id) {
          updateExam(activeExam.id, {
            questions: sorted,
            questionsCount: sorted.length,
            variants: updatedVariants,
          });
        }
        showToast(`Đã tạo lại thành công toàn bộ ${sorted.length} câu hỏi mới bằng AI!`, 'success');
      } else {
        showToast(data.message || 'Lỗi khi tạo lại toàn bộ đề thi', 'error');
      }
    } catch {
      showToast('Lỗi khi kết nối dịch vụ tạo đề thi AI', 'error');
    } finally {
      setIsRegeneratingExam(false);
    }
  };

  const handleSave = () => {
    const updatedVariants = variants.length > 0
      ? variants.map((v, i) => (i === selectedVariantIdx ? { ...v, code: examCode, questions } : v))
      : undefined;

    const baseQuestions = updatedVariants && updatedVariants[0] ? updatedVariants[0].questions : questions;
    const baseCode = updatedVariants && updatedVariants[0] ? updatedVariants[0].code : examCode;

    updateExam(activeExam.id, {
      title,
      code: baseCode,
      department,
      schoolName,
      sessionTitle,
      academicYear,
      sectionTitles,
      sectionDescriptions,
      questions: baseQuestions,
      questionsCount: baseQuestions.length,
      variants: updatedVariants,
      updatedAt: 'Vừa lưu',
    });
    showToast('Đã lưu tất cả thay đổi bộ đề thi', 'success');
  };

  const currentExamData: ExamItem = {
    ...activeExam,
    title: title || activeExam.title,
    code: examCode,
    department,
    schoolName,
    sessionTitle,
    academicYear,
    sectionTitles,
    sectionDescriptions,
    questions,
    questionsCount: questions.length,
    variants: variants.length > 0
      ? variants.map((v, i) => (i === selectedVariantIdx ? { ...v, code: examCode, questions } : v))
      : undefined,
  };

  const handleExportDocx = async () => {
    setIsExportingDocx(true);
    try {
      await exportExamToDocx(currentExamData, {
        includeAnswers,
        departmentName: department,
        schoolName,
        sessionTitle,
        academicYear,
        sectionTitles,
        sectionDescriptions,
      });
      showToast('Đã tải xuống file Microsoft Word (.docx)', 'success');
      setIsExportOpen(false);
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi xuất file docx', 'error');
    } finally {
      setIsExportingDocx(false);
    }
  };

  const handleExportDoc = () => {
    exportExamToDoc(currentExamData, {
      includeAnswers,
      departmentName: department,
      schoolName,
      sessionTitle,
      academicYear,
      sectionTitles,
      sectionDescriptions,
    });
    showToast('Đã tải xuống file Word (.doc)', 'success');
    setIsExportOpen(false);
  };

  const handleExportPdf = async () => {
    setIsExportOpen(false);
    setIsExportingPdf(true);
    showToast('Đang tạo và tải file PDF về máy tính...', 'info');
    try {
      await exportExamToPdf(currentExamData, {
        includeAnswers,
        departmentName: department,
        schoolName,
        sessionTitle,
        academicYear,
        sectionTitles,
        sectionDescriptions,
      });
      showToast('Đã tải xuống file PDF thành công!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Có lỗi khi tạo file PDF, vui lòng thử lại', 'error');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleDirectPrint = () => {
    setIsExportOpen(false);
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.print();
      }
    }, 150);
  };

  const handleExportJson = () => {
    exportExamToJson(currentExamData);
    showToast('Đã tải xuống file cấu trúc JSON', 'success');
    setIsExportOpen(false);
  };

  const handleExportZipAll = async () => {
    setIsExportingZip(true);
    try {
      await exportExamToZipAll(currentExamData, {
        includeAnswers,
        departmentName: department,
        schoolName,
        sessionTitle,
        academicYear,
        sectionTitles,
        sectionDescriptions,
      });
      showToast('Đã tải xuống trọn bộ đề thi (.zip)', 'success');
      setIsExportOpen(false);
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi đóng gói file zip', 'error');
    } finally {
      setIsExportingZip(false);
    }
  };

  const handleExportLatex = () => {
    exportExamToLatex(currentExamData, {
      includeAnswers,
      departmentName: department,
      schoolName,
      sessionTitle,
      academicYear,
      sectionTitles,
      sectionDescriptions,
    });
    showToast('Đã tải xuống file LaTeX (.tex)', 'success');
    setIsExportOpen(false);
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full pb-20 animate-in fade-in duration-300">
      {/* Top Action Bar */}
      <div className="no-print bg-white dark:bg-slate-900 p-4 md:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setCurrentRoute('#dashboard')}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            title="Quay lại danh sách đề"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-400">{activeExam.id}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300">
                {activeExam.subject} • {activeExam.grade}
              </span>
              {activeExam.appliedSkills && activeExam.appliedSkills.length > 0 && (
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1 shadow-2xs"
                  title={`Kỹ năng sư phạm đã áp dụng:\n${activeExam.appliedSkills.map((s) => `• ${s.title}`).join('\n')}`}
                >
                  <span className="material-symbols-outlined text-xs text-emerald-600">psychology</span>
                  <span>{activeExam.appliedSkills.length} Kỹ năng AI</span>
                </span>
              )}
              <div className="flex items-center gap-1.5 pl-1 text-[11px] text-slate-500 font-medium">
                <UserAvatar
                  name={activeExam.author || user.name}
                  email={user.email}
                  size="xs"
                  rounded="rounded-full"
                  defaultType={user.avatarStyle || 'identicon'}
                />
                <span className="truncate max-w-[150px]">{activeExam.author || user.name || 'Cán bộ biên soạn'}</span>
              </div>
            </div>
            <input
              type="text"
              value={title}
              disabled={!isEditorMode}
              readOnly={!isEditorMode}
              onChange={(e) => setTitle(e.target.value)}
              className={`text-base font-extrabold text-slate-900 dark:text-slate-100 bg-transparent ${
                isEditorMode
                  ? 'border-b border-dashed border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:outline-none'
                  : 'border-b border-transparent cursor-default'
              } mt-1 w-full max-w-lg`}
              title={isEditorMode ? 'Nhấp để sửa tiêu đề đề thi' : 'Tiêu đề đề thi (Bật Chế độ chỉnh sửa để thay đổi)'}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto justify-end">
          {/* Editor Mode Toggle Button */}
          <button
            type="button"
            onClick={() => {
              const nextState = !isEditorMode;
              setIsEditorMode(nextState);
              if (!nextState) {
                setEditingQId(null);
                showToast('Đã chuyển về Chế độ xem trước (Chỉ đọc)', 'info');
              } else {
                showToast('Đã bật Chế độ chỉnh sửa đề thi. Bạn có thể sửa câu hỏi, đáp án và cấu trúc.', 'success');
              }
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-xs ${
              isEditorMode
                ? 'bg-amber-500 hover:bg-amber-600 text-white border border-amber-600 ring-2 ring-amber-300 dark:ring-amber-800'
                : 'border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
            }`}
            title={isEditorMode ? 'Đang ở Chế độ chỉnh sửa. Nhấp để chuyển về Chế độ xem trước (Chỉ đọc)' : 'Bật Chế độ chỉnh sửa để sửa câu hỏi, đáp án'}
          >
            <span className={`material-symbols-outlined text-base ${isEditorMode ? 'text-white' : 'text-slate-400'}`}>
              {isEditorMode ? 'edit' : 'edit_off'}
            </span>
            <span>{isEditorMode ? 'Chế độ: Đang sửa' : 'Chế độ: Chỉ đọc'}</span>
            <span className={`w-2 h-2 rounded-full ${isEditorMode ? 'bg-white animate-ping' : 'bg-slate-400'}`}></span>
          </button>

          {isEditorMode && (
            <>
              {/* Undo / Redo Controls */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={historyIndex <= 0}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                    historyIndex <= 0
                      ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 shadow-xs cursor-pointer'
                  }`}
                  title="Hoàn tác thay đổi vừa thực hiện (Ctrl + Z)"
                >
                  <span className="material-symbols-outlined text-sm">undo</span>
                  <span className="hidden sm:inline">Hoàn tác</span>
                </button>
                <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700"></div>
                <button
                  type="button"
                  onClick={handleRedo}
                  disabled={historyIndex >= history.length - 1}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                    historyIndex >= history.length - 1
                      ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 shadow-xs cursor-pointer'
                  }`}
                  title="Làm lại thao tác vừa hoàn tác (Ctrl + Y hoặc Ctrl + Shift + Z)"
                >
                  <span className="material-symbols-outlined text-sm">redo</span>
                  <span className="hidden sm:inline">Làm lại</span>
                </button>
              </div>

              {/* Regenerate Entire Exam Button */}
              <button
                type="button"
                onClick={handleRegenerateEntireExam}
                disabled={isRegeneratingExam}
                className={`px-3 py-2 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs ${
                  isRegeneratingExam ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                title="Sử dụng AI để tạo lại toàn bộ đề thi"
              >
                <span className={`material-symbols-outlined text-sm text-indigo-600 ${isRegeneratingExam ? 'animate-spin' : ''}`}>
                  {isRegeneratingExam ? 'progress_activity' : 'auto_awesome'}
                </span>
                <span>{isRegeneratingExam ? 'Đang tạo lại...' : 'Tạo lại đề (AI)'}</span>
              </button>

              {/* Add Question Dropdown */}
              <div className="relative" ref={addDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsAddOpen(!isAddOpen)}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm text-blue-600">add_circle</span>
                  <span>Thêm câu</span>
                  <span className="material-symbols-outlined text-xs">expand_more</span>
                </button>

                {isAddOpen && (
                  <div className="absolute right-0 mt-1.5 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-1.5 z-40 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Chọn dạng câu hỏi
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        handleAddQuestion('multiple_choice');
                        setIsAddOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-blue-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 transition-colors"
                    >
                      <span className="material-symbols-outlined text-blue-600 text-base">check_box</span>
                      <div>
                        <div>Trắc nghiệm (4 lựa chọn)</div>
                        <div className="text-[10px] text-slate-400 font-normal">A, B, C, D • 1 đáp án đúng</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleAddQuestion('true_false');
                        setIsAddOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-amber-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 transition-colors"
                    >
                      <span className="material-symbols-outlined text-amber-600 text-base">rule</span>
                      <div>
                        <div>Đúng / Sai (4 ý a, b, c, d)</div>
                        <div className="text-[10px] text-slate-400 font-normal">Định dạng trắc nghiệm 4 ý</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleAddQuestion('short_answer');
                        setIsAddOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-purple-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 transition-colors"
                    >
                      <span className="material-symbols-outlined text-purple-600 text-base">edit_note</span>
                      <div>
                        <div>Trả lời ngắn</div>
                        <div className="text-[10px] text-slate-400 font-normal">Điền số hoặc đáp số ngắn gọn</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleAddQuestion('essay');
                        setIsAddOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 transition-colors"
                    >
                      <span className="material-symbols-outlined text-rose-600 text-base">menu_book</span>
                      <div>
                        <div>Tự luận</div>
                        <div className="text-[10px] text-slate-400 font-normal">Kèm barem chấm điểm chi tiết</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Download / Export Dropdown */}
          <div className="relative" ref={exportDropdownRef}>
            <button
              type="button"
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="px-3.5 py-2 rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <span className="material-symbols-outlined text-sm text-emerald-600">download</span>
              <span>Xuất Đề</span>
              <span className="material-symbols-outlined text-xs">expand_more</span>
            </button>

            {isExportOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="p-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Định dạng tải về
                  </span>
                  <label className="flex items-center gap-2 mt-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeAnswers}
                      onChange={(e) => setIncludeAnswers(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                    />
                    <span>Kèm đáp án &amp; Lời giải</span>
                  </label>
                </div>

                {/* Xuất trọn bộ Tất Cả (.zip) Button */}
                <button
                  type="button"
                  onClick={handleExportZipAll}
                  disabled={isExportingZip}
                  className="w-full text-left p-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white flex items-center gap-2.5 transition-all text-xs font-bold shadow-xs disabled:opacity-50 mb-1"
                >
                  <span className="material-symbols-outlined text-white text-lg">folder_zip</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <span>Tải Trọn Bộ Tất Cả (.zip)</span>
                      {isExportingZip && <span className="animate-spin text-[10px]">⌛</span>}
                    </div>
                    <div className="text-[10px] text-emerald-100 font-normal">Gồm Docx, Doc, LaTeX, JSON &amp; Hướng dẫn</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleExportDocx}
                  disabled={isExportingDocx}
                  className="w-full text-left p-2 rounded-xl hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-blue-700 flex items-center gap-2.5 transition-colors text-xs font-semibold text-slate-700 dark:text-slate-300 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-blue-600 text-lg">description</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <span>Microsoft Word (.docx)</span>
                      {isExportingDocx && <span className="animate-spin text-[10px]">⌛</span>}
                    </div>
                    <div className="text-[10px] text-slate-400 font-normal">Chuẩn bảng 2x2 &amp; Đáp án</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleExportLatex}
                  className="w-full text-left p-2 rounded-xl hover:bg-indigo-50 dark:hover:bg-slate-800 hover:text-indigo-700 flex items-center gap-2.5 transition-colors text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  <span className="material-symbols-outlined text-indigo-600 text-lg">functions</span>
                  <div className="flex-1">
                    <div>Mã nguồn LaTeX (.tex)</div>
                    <div className="text-[10px] text-slate-400 font-normal">Biên dịch Overleaf / TeXStudio</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleDirectPrint}
                  className="w-full text-left p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-slate-800 hover:text-rose-700 flex items-center gap-2.5 transition-colors text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  <span className="material-symbols-outlined text-rose-600 text-lg">picture_as_pdf</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <span>Xuất file PDF (.pdf)</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-normal">Lưu dạng PDF hoặc in ấn (Ctrl + P)</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleExportDoc}
                  className="w-full text-left p-2 rounded-xl hover:bg-sky-50 dark:hover:bg-slate-800 hover:text-sky-700 flex items-center gap-2.5 transition-colors text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  <span className="material-symbols-outlined text-sky-600 text-lg">article</span>
                  <div className="flex-1">
                    <div>Word HTML (.doc)</div>
                    <div className="text-[10px] text-slate-400 font-normal">Tương thích mọi máy tính</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleExportJson}
                  className="w-full text-left p-2 rounded-xl hover:bg-amber-50 dark:hover:bg-slate-800 hover:text-amber-700 flex items-center gap-2.5 transition-colors text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  <span className="material-symbols-outlined text-amber-600 text-lg">data_object</span>
                  <div className="flex-1">
                    <div>Dữ liệu LMS (.json)</div>
                    <div className="text-[10px] text-slate-400 font-normal">Nhập vào hệ thống thi online</div>
                  </div>
                </button>

                <div className="pt-1 mt-1 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setIsExportOpen(false);
                      setIsPrintGuideOpen(true);
                    }}
                    className="w-full text-left p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors text-[11px] font-medium text-slate-500 dark:text-slate-400"
                  >
                    <span className="material-symbols-outlined text-slate-400 text-sm">help_outline</span>
                    <span>Mẹo in sạch (xóa link URL / ngày giờ)</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Auto Sort Button */}
          {isEditorMode && (
            <button
              type="button"
              onClick={() => {
                const sorted = sortQuestionsBySection(questions);
                commitQuestionsImmediate(sorted);
                showToast('Đã sắp xếp lại toàn bộ câu hỏi theo chuẩn Phần I, II, III, IV Bộ GD&ĐT!', 'success');
              }}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5"
              title="Sắp xếp câu hỏi theo đúng chuẩn: Phần I (Trắc nghiệm), Phần II (Đúng/Sai), Phần III (Trả lời ngắn), Phần IV (Tự luận)"
            >
              <span className="material-symbols-outlined text-sm text-indigo-600 dark:text-indigo-400">sort</span>
              <span>Sắp xếp chuẩn Bộ</span>
            </button>
          )}

          {/* Shuffle Exam Variants Button */}
          <button
            type="button"
            onClick={() => setIsShuffleModalOpen(true)}
            className="px-3.5 py-2 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-800 dark:text-amber-200 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5"
            title="Tạo nhiều mã đề (101, 102, 103, 104...) bằng cách xáo trộn câu hỏi, phương án và số liệu"
          >
            <span className="material-symbols-outlined text-sm text-amber-600 dark:text-amber-400">shuffle</span>
            <span>{variants && variants.length > 1 ? `Trộn đề (${variants.length} mã)` : 'Trộn đề phòng thi'}</span>
          </button>

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm">save</span>
            <span>Lưu Đề</span>
          </button>
        </div>
      </div>

      {/* Informative Mode Banner */}
      {!isEditorMode ? (
        <div className="no-print flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-slate-100/90 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-slate-400 text-base">visibility</span>
            <span>Đang ở <strong>Chế độ xem trước (Chỉ đọc)</strong>. Mọi chỉnh sửa nội dung, đáp án và cấu trúc đề thi đã được khóa an toàn.</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsEditorMode(true);
              showToast('Đã bật Chế độ chỉnh sửa đề thi.', 'success');
            }}
            className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 shrink-0"
          >
            <span className="material-symbols-outlined text-xs">edit</span>
            <span>Bật chỉnh sửa</span>
          </button>
        </div>
      ) : (
        <div className="no-print flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-200 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-600 text-base animate-pulse">edit</span>
            <span><strong>Chế độ chỉnh sửa đang BẬT:</strong> Bạn có thể đổi dạng câu hỏi, sửa nội dung, chọn đáp án đúng và thêm/xóa câu.</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsEditorMode(false);
              setEditingQId(null);
              showToast('Đã chuyển về Chế độ xem trước (Chỉ đọc).', 'info');
            }}
            className="text-xs font-bold text-amber-900 dark:text-amber-100 hover:underline flex items-center gap-1 shrink-0"
          >
            <span className="material-symbols-outlined text-xs">lock</span>
            <span>Khóa / Xong</span>
          </button>
        </div>
      )}

      {/* Multi-Code Exam Switcher Tabs */}
      {variants && variants.length > 1 && (
        <div className="no-print bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-xs shrink-0">
              <span className="material-symbols-outlined text-base">shuffle</span>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <span>BỘ MÃ ĐỀ THI TRỘN CHỐNG GIAN LẬN</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300">
                  {variants.length} Mã đề
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                Đang xem: <strong>Mã {variants[selectedVariantIdx]?.code || 101 + selectedVariantIdx}</strong>. Nhấp vào các tab dưới để chuyển mã đề cần xem hoặc in ấn riêng.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-stretch sm:self-auto overflow-x-auto">
            {variants.map((v, idx) => {
              const isSelected = idx === selectedVariantIdx;
              return (
                <button
                  key={v.code || idx}
                  type="button"
                  onClick={() => handleSelectVariant(idx)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-1.5 shrink-0 ${
                    isSelected
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs border border-blue-200/50 dark:border-blue-900/50'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-blue-600 dark:bg-blue-400 animate-pulse' : 'bg-slate-400'}`}></span>
                  <span>Mã {v.code}</span>
                  {idx === 0 && <span className="text-[9px] font-sans text-slate-400 font-normal">(Gốc)</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Official Vietnamese Exam Header (Chuẩn Bộ GD&ĐT) */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-3 border-b border-slate-100 dark:border-slate-800 text-xs">
          {/* Left Side: Sở / Trường & Khung Đề chính thức */}
          <div className="flex flex-col items-center justify-center text-center space-y-1">
            {/* Quick Action: Button Chọn Sở Giáo Dục */}
            {isEditorMode && (
              <div className="no-print mb-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setCustomDeptInput(department);
                    setIsDeptModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-[11px] font-bold border border-blue-200/90 dark:border-blue-800 transition-all shadow-2xs group"
                  title="Chọn Sở Giáo dục từ 34 tỉnh/thành hoặc tự nhập custom"
                >
                  <span className="material-symbols-outlined text-sm text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">account_balance</span>
                  <span>Chọn Sở Giáo Dục</span>
                  <span className="material-symbols-outlined text-xs opacity-70">expand_more</span>
                </button>
              </div>
            )}

            {/* Dòng Tên Sở Giáo Dục / Cơ quan quản lý (Gốc trên cùng bên trái - Cho phép sửa trực tiếp tại chỗ) */}
            <div className="w-full max-w-[340px]">
              <input
                type="text"
                value={department}
                readOnly={!isEditorMode}
                disabled={!isEditorMode}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                onChange={(e) => {
                  setDepartment(e.target.value);
                  setCustomDeptInput(e.target.value);
                }}
                onBlur={(e) => {
                  const val = normalizeDepartmentAccents(e.target.value.trim());
                  setDepartment(val);
                  if (activeExam?.id) {
                    updateExam(activeExam.id, { department: val });
                  }
                }}
                placeholder="SỞ GIÁO DỤC VÀ ĐÀO TẠO THÀNH PHỐ HẢI PHÒNG"
                className={`w-full text-center font-bold text-slate-800 dark:text-slate-200 text-xs tracking-wide bg-transparent border border-transparent ${
                  isEditorMode ? 'hover:border-slate-300 dark:hover:border-slate-700 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800' : 'cursor-default'
                } rounded px-1.5 py-0.5 outline-none transition-all print:border-none print:p-0 print:text-black`}
                title={isEditorMode ? "Gốc trên cùng bên trái đề: Nhấp để sửa trực tiếp Sở Giáo dục hoặc Cơ quan xuất xứ đề" : "Cơ quan xuất xứ đề"}
              />
            </div>

            {/* Dòng Tên Trường / Đơn Vị (Cho phép sửa trực tiếp tại chỗ) */}
            <div className="w-full max-w-[340px]">
              <input
                type="text"
                value={schoolName}
                readOnly={!isEditorMode}
                disabled={!isEditorMode}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                onChange={(e) => setSchoolName(e.target.value)}
                onBlur={(e) => {
                  let val = e.target.value.trim();
                  if (val === 'HẢ') val = 'TRƯỜNG THPT CHUYÊN TRẦN PHÚ';
                  if (activeExam?.id) {
                    updateExam(activeExam.id, { schoolName: val });
                  }
                }}
                placeholder="TRƯỜNG THPT CHUYÊN TRẦN PHÚ"
                className={`w-full text-center font-bold text-slate-900 dark:text-slate-100 text-sm bg-transparent border border-transparent ${
                  isEditorMode ? 'hover:border-slate-300 dark:hover:border-slate-700 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800' : 'cursor-default'
                } rounded px-1.5 py-0.5 outline-none transition-all print:border-none print:p-0`}
                title={isEditorMode ? "Nhấp để sửa tên Trường / Đơn vị" : "Đơn vị đào tạo"}
              />
            </div>

            <div className="mt-1 inline-block border-2 border-slate-900 dark:border-slate-100 px-3 py-0.5 text-xs font-extrabold tracking-wider uppercase print:border-black">
              ĐỀ CHÍNH THỨC
            </div>
          </div>

          {/* Right Side: Kỳ thi, Môn, Thời gian */}
          <div className="flex flex-col items-center justify-center text-center space-y-1">
            {/* Quick Action: Button Đặt Tên Bài Kiểm Tra */}
            {isEditorMode && (
              <div className="no-print mb-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setCustomSessionInput(sessionTitle);
                    setIsSessionModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold border border-indigo-200/90 dark:border-indigo-800 transition-all shadow-2xs group"
                  title="Đổi tên Bài kiểm tra / Kỳ thi hoặc chọn mẫu"
                >
                  <span className="material-symbols-outlined text-sm text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">assignment</span>
                  <span>Đặt Tên Bài Kiểm Tra</span>
                  <span className="material-symbols-outlined text-xs opacity-70">expand_more</span>
                </button>
              </div>
            )}

            {/* Dòng Tên Kỳ Thi / Bài Kiểm Tra (Cho phép sửa trực tiếp tại chỗ) */}
            <div className="w-full max-w-[340px]">
              <input
                type="text"
                value={sessionTitle}
                readOnly={!isEditorMode}
                disabled={!isEditorMode}
                onChange={(e) => {
                  setSessionTitle(e.target.value);
                  setCustomSessionInput(e.target.value);
                }}
                onBlur={(e) => {
                  const val = e.target.value.trim();
                  if (activeExam?.id) {
                    updateExam(activeExam.id, { sessionTitle: val });
                  }
                }}
                placeholder="KIỂM TRA ĐỊNH KỲ HỌC KỲ I..."
                className={`w-full text-center font-bold text-slate-900 dark:text-slate-100 text-xs md:text-sm bg-transparent border border-transparent ${
                  isEditorMode ? 'hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800' : 'cursor-default'
                } rounded px-1.5 py-0.5 outline-none transition-all print:border-none print:p-0`}
                title={isEditorMode ? "Nhấp để sửa trực tiếp tên Bài kiểm tra / Kỳ thi" : "Tên bài kiểm tra / Kỳ thi"}
              />
            </div>

            {/* Dòng Năm Học (Cho phép sửa trực tiếp) */}
            <div className="w-full max-w-[280px]">
              <input
                type="text"
                value={academicYear}
                readOnly={!isEditorMode}
                disabled={!isEditorMode}
                onChange={(e) => setAcademicYear(e.target.value)}
                onBlur={(e) => {
                  const val = e.target.value.trim();
                  if (activeExam?.id) {
                    updateExam(activeExam.id, { academicYear: val });
                  }
                }}
                placeholder="NĂM HỌC 2024 – 2025"
                className={`w-full text-center font-bold text-slate-900 dark:text-slate-100 text-xs bg-transparent border border-transparent ${
                  isEditorMode ? 'hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800' : 'cursor-default'
                } rounded px-1.5 py-0.5 outline-none transition-all print:border-none print:p-0`}
                title={isEditorMode ? "Nhấp để sửa Năm học" : "Năm học"}
              />
            </div>

            <div className="font-bold text-blue-600 dark:text-blue-400 mt-0.5 text-xs">
              Môn thi: {activeExam.subject.toUpperCase()} ({activeExam.grade.toUpperCase()})
            </div>
            <div className="text-[11px] text-slate-500 italic">
              Thời gian làm bài: {activeExam.duration} phút (không kể thời gian giao đề)
            </div>
          </div>
        </div>

        <div className="flex flex-row items-center justify-between gap-3 pt-1">
          <div className="text-xs text-slate-600 dark:text-slate-400 italic">
            (Đề thi gồm {questions.length} câu)
          </div>

          {/* Ô MÃ ĐỀ THI ĐÓNG KHUNG CHUẨN BỘ GD&ĐT */}
          <div className="exam-code-box border-2 border-slate-900 dark:border-slate-100 px-3.5 py-1 bg-white dark:bg-slate-900 shadow-2xs inline-flex items-center gap-1.5 print:border-black print:text-black">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
              Mã đề thi
            </span>
            <span className="no-print">
              <input
                type="text"
                value={examCode}
                readOnly={!isEditorMode}
                disabled={!isEditorMode}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9A-Za-z]/g, '').slice(0, 4);
                  setExamCode(val);
                }}
                className={`w-12 text-center font-extrabold text-sm font-mono text-slate-900 dark:text-slate-100 bg-transparent ${
                  isEditorMode ? 'border-b border-dashed border-slate-400 focus:border-blue-600 focus:outline-none' : 'border-b-transparent cursor-default'
                }`}
                title={isEditorMode ? "Nhấp để sửa mã đề (chuẩn 3 chữ số: 101, 102, 134...)" : "Mã đề thi"}
                placeholder="101"
              />
            </span>
            <strong className="hidden print:inline-block font-extrabold text-sm font-mono text-black">
              {examCode || '101'}
            </strong>
          </div>
        </div>

        <div className="text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-dashed border-slate-200 dark:border-slate-800 font-mono">
          Họ và tên thí sinh: ............................................................................................ Số báo danh: .....................
        </div>
      </div>

      {/* Full-width Question Stream */}
      <div className="space-y-4">
        {/* Tiêu đề CÂU HỎI chuẩn form đề in trên giấy Bộ GD&ĐT */}
        <div className="text-center font-bold text-red-600 dark:text-red-500 text-sm md:text-base tracking-wide uppercase py-1 select-none">
          CÂU HỎI
        </div>

        {questions.length === 0 && (
          <div className="no-print p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-500 my-4">
            <span className="material-symbols-outlined text-4xl text-amber-500 mb-2">warning</span>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Đề thi này chưa có nội dung câu hỏi</h4>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Bộ đề này có thể đã bị gián đoạn trong phiên làm việc cũ hoặc là bản tạo chưa hoàn tất. Vui lòng quay lại Trang chủ để chọn đề thi đã được AI sinh hoàn chỉnh.
            </p>
            <button
              type="button"
              onClick={() => setCurrentRoute('#dashboard')}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              Về Trang chủ / Danh sách đề thi
            </button>
          </div>
        )}

        {questions.map((q, qIndex) => {
          const isRegenThis = regeneratingQId === q.id;
          const isEditing = editingQId === q.id;
          const rawType = String(q.type || 'multiple_choice').toLowerCase().replace(/[\s_-]+/g, '');
          const isTF = rawType.includes('true') || rawType.includes('dung');
          const isSA = rawType.includes('short') || rawType.includes('ngan');
          const isEs = rawType.includes('essay') || rawType.includes('luan');
          const isMC = !isTF && !isSA && !isEs;

          const normType = normalizeQuestionType(q.type);
          const sectionKey = q.section || normType;
          const isFirstOfSection =
            qIndex === 0 ||
            normalizeQuestionType(questions[qIndex - 1]?.type) !== normType ||
            (questions[qIndex - 1]?.section || '') !== (q.section || '');

          const currentSectionTitle =
            sectionTitles[sectionKey] || q.section || DEFAULT_SECTION_TITLES[normType] || `PHẦN ${sectionKey.toUpperCase()}`;
          const currentSectionDesc =
            sectionDescriptions[sectionKey] !== undefined
              ? sectionDescriptions[sectionKey]
              : DEFAULT_SECTION_DESCRIPTIONS[normType] || '';

          return (
            <React.Fragment key={q.id}>
              {/* Section Header Divider */}
              {isFirstOfSection && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/90 via-indigo-50/60 to-purple-50/50 dark:from-slate-900 dark:via-slate-850 dark:to-slate-900 border-2 border-blue-200/80 dark:border-slate-700 shadow-2xs space-y-1.5 print:bg-transparent print:border-b-2 print:border-black print:border-t-0 print:border-l-0 print:border-r-0 print:rounded-none print:p-0 print:mb-3 print:space-y-0.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="no-print material-symbols-outlined text-blue-600 dark:text-blue-400 text-base">bookmark</span>
                      <input
                        type="text"
                        value={currentSectionTitle}
                        readOnly={!isEditorMode}
                        disabled={!isEditorMode}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSectionTitles((prev) => ({ ...prev, [sectionKey]: val }));
                        }}
                        placeholder="NHẬP TÊN PHẦN BÀI THI (VD: PHẦN I. CÂU HỎI TRẮC NGHIỆM)..."
                        className={`w-full font-extrabold text-xs md:text-sm text-slate-900 dark:text-slate-100 uppercase tracking-wide bg-transparent border-b border-transparent ${
                          isEditorMode ? 'hover:border-slate-300 dark:hover:border-slate-600 focus:border-blue-600 focus:bg-white dark:focus:bg-slate-800' : 'cursor-default'
                        } rounded px-1 py-0.5 outline-none transition-all print:border-none print:p-0`}
                        title={isEditorMode ? "Nhấp để đặt lại tên cho phần bài kiểm tra này" : "Tên phần bài thi"}
                      />
                    </div>
                    {isEditorMode && (
                      <span className="no-print text-[10px] text-blue-600 dark:text-blue-400 font-bold px-2.5 py-0.5 rounded-full bg-blue-100/70 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-900 shrink-0">
                        ✏️ Đổi tên phần
                      </span>
                    )}
                  </div>
                  <div>
                    <input
                      type="text"
                      value={currentSectionDesc}
                      readOnly={!isEditorMode}
                      disabled={!isEditorMode}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSectionDescriptions((prev) => ({ ...prev, [sectionKey]: val }));
                      }}
                      placeholder="Nhập ghi chú / hướng dẫn làm bài cho phần này..."
                      className={`w-full text-[11px] text-slate-600 dark:text-slate-400 italic bg-transparent border-b border-transparent ${
                        isEditorMode ? 'hover:border-slate-300 dark:hover:border-slate-600 focus:border-blue-400 focus:bg-white dark:focus:bg-slate-800' : 'cursor-default'
                      } rounded px-1 py-0.5 outline-none transition-all print:border-none print:p-0`}
                      title={isEditorMode ? "Nhấp để sửa hướng dẫn làm bài phần này" : "Hướng dẫn làm bài phần này"}
                    />
                  </div>
                </div>
              )}

              <div
                className={`bg-white dark:bg-slate-900 rounded-2xl p-6 border shadow-xs space-y-4 relative group transition-all question-card ${
                isRegenThis
                  ? 'border-blue-400 ring-2 ring-blue-100 dark:ring-blue-950'
                  : isEditing
                  ? 'border-blue-500 ring-2 ring-blue-50 dark:ring-blue-950/60'
                  : 'border-slate-200/80 dark:border-slate-800'
              }`}
            >
              {/* Card Header (Editor Controls - Hidden in print) */}
              <div className="no-print flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-3 py-1 rounded-lg bg-blue-600 text-white text-xs font-bold shadow-xs">
                    Câu {qIndex + 1}
                  </span>

                  {isEditorMode ? (
                    <>
                      {/* Question Type Selector */}
                      <select
                        value={normalizeQuestionType(q.type)}
                        onChange={(e) => handleChangeQuestionType(q.id, e.target.value as QuestionType)}
                        className="text-xs font-bold px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="multiple_choice">Trắc nghiệm (4 lựa chọn)</option>
                        <option value="true_false">Đúng / Sai (4 ý a,b,c,d)</option>
                        <option value="short_answer">Trả lời ngắn</option>
                        <option value="essay">Tự luận</option>
                      </select>

                      {/* Cognitive Level Selector */}
                      <select
                        value={q.level}
                        onChange={(e) => handleUpdateQuestion(q.id, 'level', e.target.value)}
                        className="text-xs font-bold px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none"
                      >
                        <option value="Nhận biết">Nhận biết</option>
                        <option value="Thông hiểu">Thông hiểu</option>
                        <option value="Vận dụng">Vận dụng</option>
                        <option value="Vận dụng cao">Vận dụng cao</option>
                      </select>

                      {/* Points Input */}
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                        <input
                          type="number"
                          step="0.05"
                          min="0"
                          max="10"
                          value={q.points !== undefined ? q.points : 0.25}
                          onChange={(e) => handleUpdateQuestion(q.id, 'points', parseFloat(e.target.value) || 0)}
                          className="w-14 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-transparent text-center font-bold text-slate-700 dark:text-slate-300 text-xs"
                          title="Điểm số câu hỏi"
                        />
                        <span>điểm</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {getTypeLabel(q.type)}
                      </span>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {q.level || 'Thông hiểu'}
                      </span>
                      <span className="text-xs font-semibold px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                        {q.points !== undefined ? q.points : 0.25} điểm
                      </span>
                    </>
                  )}
                </div>

                {isEditorMode && (
                  <div className="no-print flex items-center gap-1.5">
                    {/* Version History Button */}
                    {(q._previousVersions?.length || 0) > 0 && (
                      <button
                        type="button"
                        onClick={() => setViewingHistoryQId(viewingHistoryQId === q.id ? null : q.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                          viewingHistoryQId === q.id
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'border border-purple-200 dark:border-purple-900 bg-purple-50/70 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                        }`}
                        title="Xem và khôi phục các phiên bản trước của câu hỏi này"
                      >
                        <span className="material-symbols-outlined text-xs">history</span>
                        <span>Lịch sử ({q._previousVersions!.length})</span>
                      </button>
                    )}

                    {/* AI Regenerate Single Question */}
                    <button
                      type="button"
                      onClick={() => {
                        setTargetRegenQuestion(q);
                        setRegenPromptInput('');
                      }}
                      disabled={isRegenThis}
                      className={`px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-900 bg-indigo-50/70 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                        isRegenThis ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      title="Nhập yêu cầu và tạo lại câu hỏi này bằng AI"
                    >
                      <span className={`material-symbols-outlined text-xs text-indigo-600 ${isRegenThis ? 'animate-spin' : ''}`}>
                        {isRegenThis ? 'progress_activity' : 'auto_awesome'}
                      </span>
                      <span>{isRegenThis ? 'Đang tạo...' : 'Tạo lại (AI)'}</span>
                    </button>

                    {/* Inline Edit Toggle */}
                    <button
                      type="button"
                      onClick={() => setEditingQId(isEditing ? null : q.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors ${
                        isEditing
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                      title={isEditing ? 'Đóng chỉnh sửa' : 'Chỉnh sửa nội dung câu hỏi'}
                    >
                      <span className="material-symbols-outlined text-xs">
                        {isEditing ? 'check' : 'edit'}
                      </span>
                      <span>{isEditing ? 'Xong' : 'Sửa'}</span>
                    </button>

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={() => handleDeleteQuestion(q.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Xóa câu hỏi này"
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                  </div>
                )}
              </div>

              {/* QUESTION VERSION HISTORY PANEL */}
              {viewingHistoryQId === q.id && q._previousVersions && q._previousVersions.length > 0 && (
                <div className="no-print mt-2 mb-3 p-3.5 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-purple-800 dark:text-purple-300">
                      <span className="material-symbols-outlined text-sm">history_toggle_off</span>
                      <span>Lịch sử các phiên bản AI đã tạo ({q._previousVersions.length} bản trước)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setViewingHistoryQId(null)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-semibold px-2 py-0.5 rounded hover:bg-purple-100 dark:hover:bg-purple-900/40"
                    >
                      Đóng
                    </button>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {q._previousVersions.map((v, vIdx) => {
                      const timeStr = new Date(v.timestamp).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      });
                      return (
                        <div
                          key={vIdx}
                          className="p-2.5 rounded-lg border border-purple-100 dark:border-purple-900/40 bg-white dark:bg-slate-900 flex items-start justify-between gap-3 shadow-2xs"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
                                Bản #{q._previousVersions!.length - vIdx} • {timeStr}
                              </span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                Đáp án: <strong className="text-purple-700 dark:text-purple-300">{v.correctAnswer || 'Xem lời giải'}</strong>
                              </span>
                            </div>
                            <div className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2">
                              {v.content}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRestoreQuestionVersion(q.id, vIdx)}
                            className="shrink-0 px-2.5 py-1 rounded-md bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-xs">restore</span>
                            <span>Khôi phục</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* INLINE EDIT MODE */}
              {isEditing && isEditorMode ? (
                <div className="no-print space-y-4 pt-1 bg-slate-50/60 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>Nội dung câu hỏi (hỗ trợ KaTeX $công_thức$):</span>
                      <span className="text-[10px] font-normal text-slate-400">Có thể dùng LaTeX giữa dấu $...$</span>
                    </label>
                    <textarea
                      rows={3}
                      value={q.content}
                      onChange={(e) => handleUpdateQuestion(q.id, 'content', e.target.value)}
                      className="w-full text-xs text-slate-900 dark:text-slate-100 p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* Type-specific inputs in edit mode */}
                  {isMC && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                        Các lựa chọn (chọn đáp án đúng):
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {['A', 'B', 'C', 'D'].map((optKey) => {
                          const opt = (q.options || []).find((o) => o.key.toUpperCase() === optKey) || {
                            key: optKey,
                            text: '',
                            isCorrect: optKey === 'A',
                          };
                          return (
                            <div
                              key={optKey}
                              className={`p-2 rounded-lg border flex items-center gap-2 ${
                                opt.isCorrect
                                  ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 ring-1 ring-emerald-400'
                                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => handleSetCorrectAnswer(q.id, optKey)}
                                className={`w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center shrink-0 ${
                                  opt.isCorrect
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-emerald-200'
                                }`}
                                title="Nhấp để đặt làm đáp án đúng"
                              >
                                {optKey}
                              </button>
                              <input
                                type="text"
                                value={opt.text}
                                onChange={(e) => handleUpdateOption(q.id, optKey, e.target.value)}
                                placeholder={`Nội dung lựa chọn ${optKey}...`}
                                className="flex-1 text-xs text-slate-800 dark:text-slate-200 bg-transparent border-0 focus:outline-none"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {isTF && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Chỉnh sửa 4 mệnh đề khẳng định (a, b, c, d) &amp; chọn Đúng / Sai:
                        </label>
                        <span className="text-[11px] text-slate-400">
                          Hỗ trợ công thức Toán LaTeX kẹp trong $...$
                        </span>
                      </div>
                      <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-xs">
                        <table className="w-full border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              <th className="py-2 px-2 text-center font-bold w-10 border-b border-slate-200 dark:border-slate-700">Ý</th>
                              <th className="py-2 px-3 text-left font-bold border-b border-slate-200 dark:border-slate-700">Nội dung mệnh đề</th>
                              <th className="py-2 px-2 text-center font-bold w-28 border-b border-slate-200 dark:border-slate-700">Đáp án</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                            {['a', 'b', 'c', 'd'].map((subKey) => {
                              const rawOpt = (q.options || []).find((o) => o.key.toLowerCase() === subKey);
                              const hasExplicitTfAnswer = q.correctAnswer && /[a-d]\s*[:=-]/i.test(q.correctAnswer);
                              const isTruth = hasExplicitTfAnswer
                                ? new RegExp(`${subKey}\\s*[:=-]?\\s*(?:Đ|Đúng|True|T|1)`, 'i').test(q.correctAnswer)
                                : (rawOpt?.isCorrect !== undefined ? !!rawOpt.isCorrect : true);
                              const opt = {
                                key: subKey,
                                text: rawOpt ? rawOpt.text : '',
                                isCorrect: isTruth,
                              };
                              return (
                                <tr key={subKey} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                  <td className="py-2 px-2 text-center font-bold text-slate-800 dark:text-slate-200 align-middle">
                                    {subKey})
                                  </td>
                                  <td className="py-1.5 px-3 align-middle">
                                    <input
                                      type="text"
                                      value={opt.text}
                                      onChange={(e) => handleUpdateOption(q.id, subKey, e.target.value)}
                                      placeholder={`Nội dung mệnh đề khẳng định ý ${subKey}...`}
                                      className="w-full px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800"
                                    />
                                  </td>
                                  <td className="py-1.5 px-2 text-center align-middle">
                                    <div className="flex items-center justify-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => handleToggleTrueFalse(q.id, subKey, true)}
                                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 ${
                                          opt.isCorrect
                                            ? 'bg-emerald-600 text-white shadow-xs font-extrabold'
                                            : 'border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600'
                                        }`}
                                      >
                                        {opt.isCorrect && <span className="material-symbols-outlined text-xs">check</span>}
                                        <span>Đúng</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleToggleTrueFalse(q.id, subKey, false)}
                                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 ${
                                          !opt.isCorrect
                                            ? 'bg-rose-600 text-white shadow-xs font-extrabold'
                                            : 'border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600'
                                        }`}
                                      >
                                        {!opt.isCorrect && <span className="material-symbols-outlined text-xs">close</span>}
                                        <span>Sai</span>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {isSA && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-purple-900 dark:text-purple-300 block">
                          Đáp số / Kết quả ngắn:
                        </label>
                        <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">Số nguyên, thập phân hoặc phân số/căn thức kèm xấp xỉ</span>
                      </div>
                      <div className="relative flex items-center w-full">
                        <input
                          type="text"
                          value={q.correctAnswer || ''}
                          onChange={(e) => handleUpdateQuestion(q.id, 'correctAnswer', e.target.value)}
                          placeholder="Ví dụ: 15, \frac{24\sqrt{89}}{89} \approx 2.54, hoặc 2.54..."
                          className="w-full text-xs font-bold text-purple-900 dark:text-purple-200 pl-3 pr-28 py-2 rounded-lg border border-purple-300 dark:border-purple-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        />
                        {q.correctAnswer && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 max-w-[45%] truncate px-2 py-0.5 bg-purple-100/90 dark:bg-purple-900/60 rounded border border-purple-200 dark:border-purple-800 text-xs font-bold text-purple-800 dark:text-purple-300 pointer-events-none flex items-center gap-1 shadow-sm">
                            <span className="text-[10px] text-purple-400 select-none">=</span>
                            <MathText content={q.correctAnswer} inline />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {isEs && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-rose-900 dark:text-rose-300 flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm text-rose-600">menu_book</span>
                          <span>Barem chấm điểm / Hướng dẫn tự luận:</span>
                        </label>
                        <span className="text-[10px] font-normal text-slate-400">
                          Hỗ trợ công thức Toán KaTeX $...$
                        </span>
                      </div>
                      <textarea
                        rows={4}
                        value={q.explanation || ''}
                        onChange={(e) => handleUpdateQuestion(q.id, 'explanation', e.target.value)}
                        placeholder="Nhập barem chấm điểm chi tiết từng bước..."
                        className="w-full text-xs text-slate-800 dark:text-slate-200 p-2.5 rounded-lg border border-rose-300 dark:border-rose-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                      />
                      {q.explanation && (
                        <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 text-xs">
                          <div className="text-[10px] font-bold text-rose-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">visibility</span>
                            <span>Xem trước công thức (LaTeX Preview):</span>
                          </div>
                          <div className="text-slate-800 dark:text-slate-200 leading-relaxed">
                            <MathText content={q.explanation} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {!isEs && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Lời giải chi tiết:
                        </label>
                        <span className="text-[10px] font-normal text-slate-400">
                          Hỗ trợ công thức Toán KaTeX $...$
                        </span>
                      </div>
                      <textarea
                        rows={2}
                        value={q.explanation || ''}
                        onChange={(e) => handleUpdateQuestion(q.id, 'explanation', e.target.value)}
                        placeholder="Nhập hướng dẫn giải chi tiết..."
                        className="w-full text-xs text-slate-900 dark:text-slate-100 p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                      {q.explanation && (
                        <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                          <div className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">visibility</span>
                            <span>Xem trước lời giải (LaTeX Preview):</span>
                          </div>
                          <div className="text-slate-800 dark:text-slate-200 leading-relaxed">
                            <MathText content={q.explanation} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setEditingQId(null)}
                      className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-xs">check</span>
                      <span>Hoàn tất chỉnh sửa</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* NORMAL VIEW / RENDER MODE */
                <>
                  {/* Question Content (Rendered KaTeX Math & Text with inline Câu X. label) */}
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-relaxed pt-1">
                    <strong className="font-bold text-blue-600 dark:text-blue-400 mr-2 text-sm md:text-base">
                      Câu {qIndex + 1}.
                    </strong>
                    <MathText
                      content={q.content}
                      inline={!q.content?.includes('```') && !q.content?.includes('\n')}
                    />
                  </div>

                  {/* 1. TRẮC NGHIỆM 4 LỰA CHỌN */}
                  {isMC && (() => {
                    const safeOptions = ['A', 'B', 'C', 'D'].map((k) => {
                      const found = (q.options || []).find((o) => o.key.toUpperCase() === k);
                      const isTarget = (found && found.isCorrect) || (q.correctAnswer && q.correctAnswer.trim().toUpperCase() === k);
                      return {
                        key: k,
                        text: found ? found.text : '',
                        isCorrect: !!isTarget,
                      };
                    });

                    const optA = safeOptions[0].text;
                    const optB = safeOptions[1].text;
                    const optC = safeOptions[2].text;
                    const optD = safeOptions[3].text;
                    const layout = getOptionsLayout([
                      { text: optA },
                      { text: optB },
                      { text: optC },
                      { text: optD },
                    ]);

                    let gridClass = 'grid grid-cols-1 sm:grid-cols-2 gap-2.5';
                    let printColClass = 'exam-opt-col-2';
                    if (layout === 4) {
                      gridClass = 'grid grid-cols-2 sm:grid-cols-4 gap-2.5';
                      printColClass = 'exam-opt-col-4';
                    } else if (layout === 1) {
                      gridClass = 'grid grid-cols-1 gap-1.5';
                      printColClass = 'exam-opt-col-1';
                    }

                    return (
                      <div className={`pt-1 ${gridClass} exam-options-grid`}>
                        {safeOptions.map((opt) => (
                          <div
                            key={opt.key}
                            onClick={() => {
                              if (!isEditorMode) {
                                showToast('Vui lòng bật Chế độ chỉnh sửa để thay đổi đáp án đúng', 'warning');
                                return;
                              }
                              handleSetCorrectAnswer(q.id, opt.key);
                            }}
                            className={`exam-opt-item ${printColClass} px-3 py-2 rounded-xl border flex items-baseline gap-2 transition-all ${
                              isEditorMode ? 'cursor-pointer hover:border-blue-400' : 'cursor-default'
                            } ${
                              opt.isCorrect
                                ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 ring-1 ring-emerald-400'
                                : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            <strong className="font-bold text-slate-900 dark:text-slate-100 text-xs shrink-0">
                              {opt.key}.
                            </strong>
                            <div className="flex-1 text-xs font-normal leading-relaxed">
                              <MathText content={cleanOptionText(opt.text)} inline />
                            </div>
                            {opt.isCorrect && (
                              <span className="no-print material-symbols-outlined text-emerald-600 text-sm shrink-0" title="Đáp án đúng">
                                check_circle
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {/* 2. ĐÚNG / SAI (Bảng 4 cột chuẩn in giấy Bộ GD&ĐT: Mệnh đề - Đúng - Sai) */}
                  {isTF && (
                    <div className="pt-2">
                      <div className="w-full overflow-x-auto">
                        <table className="tf-print-table w-full border-collapse border border-black dark:border-slate-400 text-xs bg-white dark:bg-slate-900">
                          <thead>
                            <tr className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                              <th
                                colSpan={2}
                                className="border border-black dark:border-slate-400 py-1.5 px-3 text-center font-bold tracking-wide"
                              >
                                Mệnh đề
                              </th>
                              <th
                                className="border border-black dark:border-slate-400 py-1.5 px-2 text-center font-bold w-12 md:w-14 tracking-wide"
                              >
                                Đúng
                              </th>
                              <th
                                className="border border-black dark:border-slate-400 py-1.5 px-2 text-center font-bold w-12 md:w-14 tracking-wide"
                              >
                                Sai
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {['a', 'b', 'c', 'd'].map((subKey, subIdx) => {
                              const rawOpt = (q.options || []).find((o) => o.key.toLowerCase() === subKey);
                              const isTruth = typeof rawOpt?.isCorrect === 'boolean'
                                ? rawOpt.isCorrect
                                : (parseTrueFalseTruth(subKey, q.correctAnswer) ?? (extractTruthFromExplanation(subKey, q.explanation) ?? (subIdx % 2 === 0)));
                              const opt = {
                                key: subKey,
                                text: rawOpt ? rawOpt.text : `Mệnh đề khẳng định ý ${subKey}`,
                                isCorrect: isTruth,
                              };
                              return (
                                <tr
                                  key={subKey}
                                  className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                                >
                                  {/* Cột nhãn a), b), c), d) */}
                                  <td className="border border-black dark:border-slate-400 py-2 px-2 text-center font-bold text-black dark:text-white w-9 shrink-0 align-middle">
                                    {subKey})
                                  </td>
                                  {/* Cột nội dung mệnh đề */}
                                  <td className="border border-black dark:border-slate-400 py-2 px-3 text-left font-normal text-slate-900 dark:text-slate-100 leading-relaxed align-middle">
                                    <MathText content={cleanOptionText(opt.text)} inline />
                                  </td>
                                  {/* Cột Đúng (Ô trống in giấy, có X nếu kèm đáp án) */}
                                  <td
                                    onClick={() => {
                                      if (!isEditorMode) {
                                        showToast('Vui lòng bật Chế độ chỉnh sửa để thay đổi đáp án Đúng/Sai', 'warning');
                                        return;
                                      }
                                      handleToggleTrueFalse(q.id, subKey, true);
                                    }}
                                    className={`border border-black dark:border-slate-400 py-2 px-1 text-center align-middle w-12 md:w-14 select-none ${
                                      isEditorMode ? 'cursor-pointer hover:bg-slate-100/60 dark:hover:bg-slate-800 transition-colors' : 'cursor-default'
                                    }`}
                                    title={isEditorMode ? "Nhấp để đánh dấu Đúng" : "Mệnh đề Đúng"}
                                  >
                                    <span className="font-bold text-sm text-black dark:text-white">
                                      {includeAnswers && opt.isCorrect ? 'X' : ''}
                                    </span>
                                  </td>
                                  {/* Cột Sai (Ô trống in giấy, có X nếu kèm đáp án) */}
                                  <td
                                    onClick={() => {
                                      if (!isEditorMode) {
                                        showToast('Vui lòng bật Chế độ chỉnh sửa để thay đổi đáp án Đúng/Sai', 'warning');
                                        return;
                                      }
                                      handleToggleTrueFalse(q.id, subKey, false);
                                    }}
                                    className={`border border-black dark:border-slate-400 py-2 px-1 text-center align-middle w-12 md:w-14 select-none ${
                                      isEditorMode ? 'cursor-pointer hover:bg-slate-100/60 dark:hover:bg-slate-800 transition-colors' : 'cursor-default'
                                    }`}
                                    title={isEditorMode ? "Nhấp để đánh dấu Sai" : "Mệnh đề Sai"}
                                  >
                                    <span className="font-bold text-sm text-black dark:text-white">
                                      {includeAnswers && !opt.isCorrect ? 'X' : ''}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* 3. TRẢ LỜI NGẮN */}
                  {isSA && (
                    <div className="space-y-2 pt-1">
                      <div className="no-print p-3.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-sm text-purple-600">edit_note</span>
                            <span>Đáp số / Kết quả ngắn gọn:</span>
                          </label>
                          <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">Số nguyên, thập phân hoặc phân số/căn thức kèm xấp xỉ</span>
                        </div>
                        {isEditorMode ? (
                          <div className="relative flex items-center w-full">
                            <input
                              type="text"
                              value={q.correctAnswer || ''}
                              onChange={(e) => handleUpdateQuestion(q.id, 'correctAnswer', e.target.value)}
                              placeholder="Ví dụ: 15, \frac{24\sqrt{89}}{89} \approx 2.54, hoặc 2.54..."
                              className="w-full text-xs font-bold text-purple-900 dark:text-purple-200 pl-3 pr-28 py-2 rounded-lg border border-purple-300 dark:border-purple-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                            />
                            {q.correctAnswer && (
                              <div className="absolute right-2 top-1/2 -translate-y-1/2 max-w-[45%] truncate px-2 py-0.5 bg-purple-100/90 dark:bg-purple-900/60 rounded border border-purple-200 dark:border-purple-800 text-xs font-bold text-purple-800 dark:text-purple-300 pointer-events-none flex items-center gap-1 shadow-sm">
                                <span className="text-[10px] text-purple-400 select-none">=</span>
                                <MathText content={q.correctAnswer} inline />
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="w-full text-xs font-bold text-purple-900 dark:text-purple-200 px-3.5 py-2.5 rounded-lg border border-purple-300 dark:border-purple-800 bg-white dark:bg-slate-900 flex items-center gap-2">
                            <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">Đáp số:</span>
                            {q.correctAnswer ? (
                              <span className="text-sm px-2.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200 border border-purple-200 dark:border-purple-800 inline-flex items-center">
                                <MathText content={q.correctAnswer} inline />
                              </span>
                            ) : (
                              <span className="text-slate-400 italic font-normal">Chưa có đáp số</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Print Mode Line */}
                      <div className="hidden print:block pt-2 text-xs text-slate-700 font-bold">
                        Đáp số: ........................................................................................................................................................
                      </div>
                    </div>
                  )}

                  {/* 4. TỰ LUẬN */}
                  {isEs && (
                    <div className="space-y-2 pt-1">
                      <div className="no-print p-3.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-rose-900 dark:text-rose-300 flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-sm text-rose-600">menu_book</span>
                            <span>Barem điểm &amp; Hướng dẫn chấm tự luận:</span>
                          </label>
                          {isEditorMode && (
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-rose-600 dark:text-rose-400 font-medium hidden sm:inline">
                                Trình bày các bước chấm
                              </span>
                              <button
                                type="button"
                                onClick={() => setEditingQId(q.id)}
                                className="text-[11px] font-bold text-rose-700 dark:text-rose-300 hover:text-rose-900 dark:hover:text-rose-100 bg-rose-100/80 dark:bg-rose-900/50 hover:bg-rose-200 px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors"
                                title="Chỉnh sửa barem chấm điểm"
                              >
                                <span className="material-symbols-outlined text-xs">edit</span>
                                <span>Sửa barem</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {q.explanation ? (
                          <div className="w-full text-xs text-slate-800 dark:text-slate-200 p-3 rounded-lg border border-rose-200/80 dark:border-rose-900/50 bg-white/95 dark:bg-slate-900/90 leading-relaxed overflow-x-auto shadow-xs">
                            <MathText content={q.explanation} />
                          </div>
                        ) : (
                          <div
                            onClick={() => {
                              if (isEditorMode) setEditingQId(q.id);
                            }}
                            className={`text-xs text-rose-500/80 dark:text-rose-400/80 italic p-3 border border-dashed border-rose-300 dark:border-rose-800 rounded-lg ${
                              isEditorMode ? 'cursor-pointer hover:bg-rose-100/30 transition-colors' : 'cursor-default'
                            }`}
                          >
                            Chưa có barem chấm điểm.{isEditorMode ? ' Bấm vào đây hoặc nút "Sửa barem" để thêm hướng dẫn chấm và barem chi tiết.' : ''}
                          </div>
                        )}
                      </div>

                      {/* Print Mode Writing Space */}
                      <div className="hidden print:block pt-2 space-y-3 text-xs text-slate-400 font-mono">
                        <div className="font-bold text-slate-700">Bài làm:</div>
                        <div className="border-b border-dotted border-slate-400 h-6"></div>
                        <div className="border-b border-dotted border-slate-400 h-6"></div>
                        <div className="border-b border-dotted border-slate-400 h-6"></div>
                        <div className="border-b border-dotted border-slate-400 h-6"></div>
                      </div>
                    </div>
                  )}

                  {/* Explanation Section (Hidden in student print mode, shown in solution matrix) */}
                  {q.explanation && !isEs && (
                    <div className="no-print p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Lời giải chi tiết:
                      </div>
                      <MathText content={q.explanation} />
                    </div>
                  )}
                </>
              )}
            </div>
          </React.Fragment>
        );
      })}

        {/* Quick Add Question Bar at the bottom */}
        {isEditorMode && (
          <div className="no-print p-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
              <span className="material-symbols-outlined text-blue-600 text-lg">add_circle</span>
              <span>Thêm câu hỏi mới vào đề:</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleAddQuestion('multiple_choice')}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-xs">check_box</span>
                <span>+ Trắc nghiệm (4 lựa chọn)</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddQuestion('true_false')}
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-xs">rule</span>
                <span>+ Đúng / Sai (a,b,c,d)</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddQuestion('short_answer')}
                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-xs">edit_note</span>
                <span>+ Trả lời ngắn</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddQuestion('essay')}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-xs">menu_book</span>
                <span>+ Tự luận</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Official Exam Footer */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-center space-y-3 shadow-xs">
        <div className="text-base font-extrabold text-slate-900 dark:text-slate-100 tracking-wider">
          - HẾT -
        </div>
        <div className="text-xs text-slate-500 italic text-left max-w-md mx-auto space-y-1 border-t border-slate-100 dark:border-slate-800 pt-3">
          <div>- Thí sinh không được sử dụng tài liệu và máy tính không đúng quy định.</div>
          <div>- Cán bộ coi thi không giải thích gì thêm.</div>
        </div>
      </div>

      {/* Official Answer Key & Solutions Section (Visible on screen and printed on next page if enabled) */}
      {includeAnswers && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-5 shadow-xs print:break-before-page">
          <div className="text-center pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm md:text-base font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
              BẢNG ĐÁP ÁN &amp; HƯỚNG DẪN CHẤM CHI TIẾT
            </h3>
            <div className="text-xs text-slate-400 mt-0.5">Môn thi: {activeExam?.subject} ({activeExam?.grade}) • Mã đề: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{examCode || '101'}</span></div>
          </div>

          {/* Answer Key Grid */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Bảng tra cứu đáp án:
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 text-center text-xs">
              {questions.map((q, idx) => {
                const rawType = String(q.type || 'multiple_choice').toLowerCase().replace(/[\s_-]+/g, '');
                const isTF = rawType.includes('true') || rawType.includes('dung');
                const isSA = rawType.includes('short') || rawType.includes('ngan');
                const isEs = rawType.includes('essay') || rawType.includes('luan');

                return (
                  <div
                    key={q.id}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-col items-center justify-center min-h-[58px]"
                  >
                    <div className="flex items-center gap-1 font-semibold text-slate-500 text-[11px]">
                      <span>Câu {idx + 1}</span>
                      {isTF && <span className="text-[9px] px-1 rounded bg-amber-100 text-amber-800 font-bold">Đ/S</span>}
                      {isSA && <span className="text-[9px] px-1 rounded bg-purple-100 text-purple-800 font-bold">Ngắn</span>}
                      {isEs && <span className="text-[9px] px-1 rounded bg-rose-100 text-rose-800 font-bold">TL</span>}
                    </div>
                    <span
                      className={`font-bold text-xs mt-1 truncate max-w-full px-1 ${
                        isTF
                          ? 'text-amber-700 dark:text-amber-400 font-mono text-[10px]'
                          : isSA
                          ? 'text-purple-700 dark:text-purple-400 font-mono'
                          : isEs
                          ? 'text-rose-600 dark:text-rose-400 text-[10px]'
                          : 'text-emerald-600 dark:text-emerald-400 text-sm'
                      }`}
                      title={q.correctAnswer}
                    >
                      {q.correctAnswer && (q.correctAnswer.includes('$') || q.correctAnswer.includes('\\') || /[\^_\/]/.test(q.correctAnswer)) ? (
                        <MathText content={q.correctAnswer.includes('$') ? q.correctAnswer : `$${q.correctAnswer}$`} inline />
                      ) : (
                        q.correctAnswer || '---'
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detailed Solutions */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Hướng dẫn giải chi tiết từng câu:
            </h4>
            <div className="space-y-3">
              {questions.map((q, idx) => (
                <div key={q.id} className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50/50 dark:bg-slate-800/30 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/60 space-y-1.5">
                  <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 flex-wrap">
                    <span>Câu {idx + 1}:</span>
                    <span className="text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-900 font-mono">
                      {q.correctAnswer && (q.correctAnswer.includes('$') || q.correctAnswer.includes('\\') || /[\^_\/]/.test(q.correctAnswer)) ? (
                        <MathText content={q.correctAnswer.includes('$') ? q.correctAnswer : `$${q.correctAnswer}$`} inline />
                      ) : (
                        q.correctAnswer || '---'
                      )}
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      ({getTypeLabel(q.type)} • {q.level})
                    </span>
                  </div>
                  <div className="text-slate-600 dark:text-slate-400">
                    <MathText content={q.explanation || 'Xem chi tiết định nghĩa và phương pháp giải trong sách giáo khoa.'} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL CHỌN SỞ GIÁO DỤC VÀ ĐÀO TẠO (CÓ THỂ TỰ GHI CUSTOM) */}
      <PortalModal
        isOpen={isDeptModalOpen}
        onClose={() => setIsDeptModalOpen(false)}
        title="Chọn Sở Giáo dục và Đào tạo"
        subtitle="Chọn từ 34 tỉnh/thành phố chuẩn hoặc tự nhập custom theo ý muốn"
        icon="account_balance"
        maxWidth="max-w-3xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="text-xs text-slate-500">
              Đang chọn: <span className="font-bold text-blue-600 dark:text-blue-400">{department}</span>
            </div>
            <button
              type="button"
              onClick={() => setIsDeptModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all"
            >
              Đóng
            </button>
          </div>
        }
      >
        <div className="space-y-5">
          {/* Custom Input Box (Tự Ghi Custom) */}
          <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base text-blue-600">edit_note</span>
                <span>Tự ghi tên Sở / Cơ quan theo ý bạn (Custom):</span>
              </label>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold px-2 py-0.5 rounded-full bg-blue-100/60 dark:bg-blue-900/60">
                Hỗ trợ mọi cấp quản lý
              </span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={customDeptInput}
                onChange={(e) => setCustomDeptInput(e.target.value)}
                placeholder="Ví dụ: Sở Giáo dục và Đào tạo tỉnh Hưng Yên, Viện Đào Tạo..."
                className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    applyDepartment(customDeptInput);
                  }
                }}
              />
              <button
                type="button"
                onClick={() => applyDepartment(customDeptInput)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0"
              >
                <span className="material-symbols-outlined text-sm">check</span>
                <span>Áp dụng</span>
              </button>
            </div>
          </div>

          {/* Search Quick Filter */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-slate-500">format_list_bulleted</span>
                <span>Danh sách 34 Sở GD&ĐT chuẩn ({filteredDepartments.length}):</span>
              </span>
              {deptSearch && (
                <button
                  type="button"
                  onClick={() => setDeptSearch('')}
                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Xóa tìm kiếm
                </button>
              )}
            </div>

            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
              <input
                type="text"
                value={deptSearch}
                onChange={(e) => setDeptSearch(e.target.value)}
                placeholder="Tìm nhanh tỉnh/thành phố (Hà Nội, TP. HCM, Hải Phòng, Huế, Đà Nẵng, Cần Thơ...)"
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Department Cards Grid */}
          <div className="max-h-[340px] overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-2 custom-scrollbar">
            {filteredDepartments.map((dept) => {
              const isSelected = department.trim().toLowerCase() === dept.trim().toLowerCase();
              const shortLoc = getShortLocation(dept);
              return (
                <button
                  key={dept}
                  type="button"
                  onClick={() => applyDepartment(dept)}
                  className={`text-left p-2.5 rounded-xl border text-xs transition-all flex items-start justify-between gap-2 group ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs font-semibold'
                      : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/40 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className={`text-[10px] font-bold uppercase tracking-wider truncate ${
                      isSelected ? 'text-blue-100' : 'text-blue-600 dark:text-blue-400'
                    }`}>
                      {shortLoc}
                    </span>
                    <span className="line-clamp-2 leading-tight text-[11.5px]">
                      {dept}
                    </span>
                  </div>
                  {isSelected ? (
                    <span className="material-symbols-outlined text-base text-white shrink-0 mt-0.5">check_circle</span>
                  ) : (
                    <span className="material-symbols-outlined text-base text-slate-300 dark:text-slate-600 group-hover:text-blue-500 shrink-0 mt-0.5 transition-colors">
                      chevron_right
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </PortalModal>

      {/* MODAL ĐẶT TÊN BÀI KIỂM TRA / KỲ THI */}
      <PortalModal
        isOpen={isSessionModalOpen}
        onClose={() => setIsSessionModalOpen(false)}
        title="Đặt Tên Bài Kiểm Tra / Kỳ Thi"
        subtitle="Chọn mẫu chuẩn hoặc tự nhập tên đợt kiểm tra theo ý muốn"
        icon="assignment"
        maxWidth="max-w-2xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="text-xs text-slate-500 truncate max-w-[350px]">
              Đang chọn: <span className="font-bold text-indigo-600 dark:text-indigo-400">{sessionTitle}</span>
            </div>
            <button
              type="button"
              onClick={() => setIsSessionModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all"
            >
              Đóng
            </button>
          </div>
        }
      >
        <div className="space-y-5">
          {/* Custom Input */}
          <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/60 space-y-2.5">
            <label className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base text-indigo-600">edit_note</span>
              <span>Tự ghi tên Bài kiểm tra / Kỳ thi theo ý bạn:</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customSessionInput}
                onChange={(e) => setCustomSessionInput(e.target.value)}
                placeholder="Ví dụ: BÀI KIỂM TRA 1 TIẾT CHƯƠNG 1, KIỂM TRA GIỮA KỲ..."
                className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    applySessionTitle(customSessionInput);
                  }
                }}
              />
              <button
                type="button"
                onClick={() => applySessionTitle(customSessionInput)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0"
              >
                <span className="material-symbols-outlined text-sm">check</span>
                <span>Áp dụng</span>
              </button>
            </div>
          </div>

          {/* Presets List */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-slate-500">list_alt</span>
              <span>Các mẫu bài kiểm tra / kỳ thi thông dụng:</span>
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {EXAM_SESSION_PRESETS.map((preset) => {
                const isSelected = sessionTitle.trim().toUpperCase() === preset.toUpperCase();
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => applySessionTitle(preset)}
                    className={`text-left p-3 rounded-xl border text-xs transition-all flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-xs'
                        : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/40 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold'
                    }`}
                  >
                    <span>{preset}</span>
                    {isSelected ? (
                      <span className="material-symbols-outlined text-base text-white shrink-0">check_circle</span>
                    ) : (
                      <span className="material-symbols-outlined text-base text-slate-300 dark:text-slate-600 shrink-0">
                        arrow_forward
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </PortalModal>

      {/* MODAL HƯỚNG DẪN IN & XUẤT PDF SẠCH (KHÔNG DÍNH LINK VÀ NGÀY GIỜ) */}
      <PortalModal
        isOpen={isPrintGuideOpen}
        onClose={() => setIsPrintGuideOpen(false)}
        title="Hướng Dẫn In & Xuất Đề Thi PDF Sạch Đẹp"
        subtitle="Cách loại bỏ hoàn toàn link localhost và ngày giờ trên bản in của trình duyệt"
        icon="print"
        maxWidth="max-w-xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <button
              type="button"
              onClick={() => setIsPrintGuideOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all"
            >
              Đóng
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsPrintGuideOpen(false);
                  handleExportDocx();
                }}
                className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">description</span>
                <span>Xuất Word (.docx)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsPrintGuideOpen(false);
                  setTimeout(() => {
                    if (typeof window !== 'undefined') window.print();
                  }, 200);
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">print</span>
                <span>Mở Hộp Thoại In (Ctrl + P)</span>
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-start gap-2.5">
            <span className="material-symbols-outlined text-amber-600 text-base shrink-0 mt-0.5">info</span>
            <div className="space-y-1 text-slate-800 dark:text-slate-200">
              <div className="font-bold text-amber-900 dark:text-amber-300">
                Tại sao có dòng link `localhost:3000/#editor` và ngày giờ khi in?
              </div>
              <p className="text-[11.5px] leading-relaxed text-amber-950/80 dark:text-amber-200/80">
                Đây là tính năng mặc định do trình duyệt (Chrome, Edge, Cốc Cốc) tự động chèn vào lề trang. Bạn chỉ cần <strong>bỏ tích chọn 1 lần duy nhất</strong> theo hướng dẫn bên dưới, trình duyệt sẽ ghi nhớ vĩnh viễn:
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl border-2 border-dashed border-blue-300 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 space-y-3">
            <div className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] flex items-center justify-center font-bold">1</span>
              <span>Trong hộp thoại In của trình duyệt:</span>
            </div>
            <div className="pl-7 space-y-2 text-[11.5px]">
              <div className="flex items-center gap-2">
                <span>Nhấp mở rộng:</span>
                <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 font-bold border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100">
                  Cài đặt khác (More settings) ▾
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span>Bỏ tích ô:</span>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 font-bold">
                  <span className="w-3.5 h-3.5 border border-rose-500 rounded-sm inline-block bg-white dark:bg-slate-900"></span>
                  <span>Tiêu đề và chân trang (Headers and footers)</span>
                  <span className="text-[10px] text-rose-600 font-normal">← BỎ TÍCH Ô NÀY</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-blue-200/80 dark:border-blue-900/60 pl-7 text-[11px] text-slate-600 dark:text-slate-400">
              ✅ <strong>Số trang:</strong> Hệ thống đã tự động tích hợp số trang chuẩn Bộ GD&ĐT (<em>Trang 1 / 2</em>) vào góc dưới của đề. Bỏ tích ô trên sẽ xóa sạch link web và ngày giờ mà <strong>vẫn giữ nguyên số trang</strong>!
            </div>
          </div>
        </div>
      </PortalModal>

      {/* Modal Cấu hình Trộn Đề Phòng Thi */}
      <PortalModal
        isOpen={isShuffleModalOpen}
        onClose={() => setIsShuffleModalOpen(false)}
        title="Trộn đề thi phòng thi (Nhiều mã đề)"
        maxWidth="max-w-md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              type="button"
              onClick={() => setIsShuffleModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={isGeneratingAiVariants}
              onClick={handlePerformShuffle}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
            >
              {isGeneratingAiVariants ? (
                <>
                  <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                  <span>AI đang giải lại đáp án...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">shuffle</span>
                  <span>Tạo các mã đề</span>
                </>
              )}
            </button>
          </div>
        }
      >
        <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
          <p className="text-slate-500 leading-relaxed">
            Hệ thống sẽ giữ nguyên ma trận và các phần (I, II, III, IV), đồng thời tạo ra các biến thể đề thi độc lập để phát cho thí sinh trong phòng thi nhằm chống gian lận.
          </p>

          <div className="space-y-2">
            <label className="font-bold text-slate-800 dark:text-slate-200 block">
              Số lượng mã đề cần tạo:
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 4, 8].map((cnt) => (
                <button
                  key={cnt}
                  type="button"
                  onClick={() => setShuffleCodesCount(cnt)}
                  className={`py-2 rounded-xl font-bold font-mono text-xs border transition-all ${
                    shuffleCodesCount === cnt
                      ? 'bg-amber-500 border-amber-600 text-white shadow-xs ring-2 ring-amber-300 dark:ring-amber-800'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {cnt} mã
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400">
              Các mã đề tạo ra sẽ có số hiệu: {Array.from({ length: shuffleCodesCount }, (_, i) => 101 + i).join(', ')}
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
            <label className="font-bold text-slate-800 dark:text-slate-200 block">
              Tùy chọn xáo trộn độc lập:
            </label>

            <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={shuffleOrderOpt}
                onChange={(e) => setShuffleOrderOpt(e.target.checked)}
                className="mt-0.5 rounded text-amber-500 focus:ring-amber-400 w-4 h-4"
              />
              <div>
                <div className="font-bold text-slate-800 dark:text-slate-200">
                  Xáo thứ tự câu hỏi & phương án A, B, C, D
                </div>
                <div className="text-[11px] text-slate-400">
                  Đảo vị trí câu hỏi trong từng phần và tráo thứ tự phương án trắc nghiệm, tự động cập nhật lại đáp án đúng.
                </div>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={shuffleValuesOpt}
                onChange={(e) => setShuffleValuesOpt(e.target.checked)}
                className="mt-0.5 rounded text-amber-500 focus:ring-amber-400 w-4 h-4"
              />
              <div>
                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <span>Đổi thông số số liệu bằng AI (Tự động giải & tính lại đáp án)</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">AI Tương đương</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  AI giữ nguyên dạng bài từng câu của đề gốc, tạo bộ số liệu mới và tự động tính toán lại 100% đáp án đúng, phương án sai và lời giải chi tiết cho từng mã đề. Đồng bộ 1-1 ma trận giữa các mã đề!
                </div>
              </div>
            </label>
          </div>
        </div>
      </PortalModal>

      {/* Modal Nhập Yêu Cầu Đổi Câu Hỏi Bằng AI */}
      <PortalModal
        isOpen={Boolean(targetRegenQuestion)}
        onClose={() => {
          if (!regeneratingQId) {
            setTargetRegenQuestion(null);
            setRegenPromptInput('');
          }
        }}
        title={`Đổi câu hỏi bằng AI ${targetRegenQuestion ? `(Câu ${targetRegenQuestion.order || targetRegenQuestion.id})` : ''}`}
        maxWidth="max-w-md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              type="button"
              disabled={Boolean(regeneratingQId)}
              onClick={() => {
                setTargetRegenQuestion(null);
                setRegenPromptInput('');
              }}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={Boolean(regeneratingQId)}
              onClick={async () => {
                if (!targetRegenQuestion) return;
                const qToRegen = targetRegenQuestion;
                const directive = regenPromptInput.trim();
                setTargetRegenQuestion(null);
                await handleRegenerateQuestion(qToRegen, directive);
              }}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">auto_awesome</span>
              <span>Bắt đầu Sinh lại (AI)</span>
            </button>
          </div>
        }
      >
        <div className="space-y-3.5 text-xs text-slate-700 dark:text-slate-300">
          {targetRegenQuestion && (
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {getTypeLabel(targetRegenQuestion.type)} • Mức độ: {targetRegenQuestion.level || 'Thông hiểu'}
                </span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                  {targetRegenQuestion.points !== undefined ? `${targetRegenQuestion.points} điểm` : '0.25 điểm'}
                </span>
              </div>
              <p className="line-clamp-2 text-slate-600 dark:text-slate-400 italic">
                &ldquo;{targetRegenQuestion.content.replace(/<[^>]*>/g, '').slice(0, 150)}...&rdquo;
              </p>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1.5">
              Ý muốn / Yêu cầu cụ thể cho AI (Tùy chọn):
            </label>
            <textarea
              value={regenPromptInput}
              onChange={(e) => setRegenPromptInput(e.target.value)}
              placeholder="VD: Đổi sang bài toán ứng dụng thực tế, thay đổi số liệu, đổi sang dạng tìm tiệm cận, nâng độ khó một chút..."
              rows={3}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none transition-all"
            />
          </div>

          <div>
            <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
              Gợi ý nhanh yêu cầu:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                'Đổi sang bài toán thực tế',
                'Đổi số liệu và giữ nguyên dạng',
                'Dễ hơn một chút',
                'Nâng cao độ khó',
                'Đổi sang dạng khác cùng bài học',
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() =>
                    setRegenPromptInput((prev) => (prev ? `${prev}, ${chip.toLowerCase()}` : chip))
                  }
                  className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-[11px] transition-colors cursor-pointer"
                >
                  + {chip}
                </button>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-slate-400 dark:text-slate-500 italic">
            * Nếu để trống, AI sẽ tự động sinh câu hỏi tương đương mới (cùng bài học, ma trận và mức độ) khác hoàn toàn câu cũ.
          </p>
        </div>
      </PortalModal>
    </div>
  );
}


