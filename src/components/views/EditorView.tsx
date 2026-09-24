'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAppStore, ExamQuestion, ExamItem, QuestionType, formatExamCode } from '@/lib/store/app-store';
import UserAvatar from '@/components/common/UserAvatar';
import MathText, { cleanOptionText } from '@/components/common/MathText';
import PortalModal from '@/components/common/PortalModal';
import { VIETNAM_EDUCATION_DEPARTMENTS, getShortLocation, normalizeDepartmentAccents } from '@/lib/education-departments';
import {
  EXAM_SESSION_PRESETS,
  DEFAULT_SECTION_TITLES,
  DEFAULT_SECTION_DESCRIPTIONS,
  normalizeQuestionType,
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

export default function EditorView() {
  const { activeExam, updateExam, showToast, setCurrentRoute, user } = useAppStore();

  const [title, setTitle] = useState(activeExam?.title || '');
  const [examCode, setExamCode] = useState(() => formatExamCode(activeExam?.id, activeExam?.code));
  const [questions, setQuestions] = useState<ExamQuestion[]>(activeExam?.questions || []);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingQId, setEditingQId] = useState<number | string | null>(null);
  const [includeAnswers, setIncludeAnswers] = useState(true);
  const [regeneratingQId, setRegeneratingQId] = useState<number | string | null>(null);
  const [isRegeneratingExam, setIsRegeneratingExam] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

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
      setQuestions(activeExam.questions || []);
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
    const handleBeforePrint = () => {
      document.title = '';
    };
    const handleAfterPrint = () => {
      document.title = 'Examify AI - Hệ Thống Khảo Thí & Tạo Đề Thi Thông Minh';
    };
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
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

  const getTypeLabel = (type?: string) => {
    const t = String(type || 'multiple_choice').toLowerCase().replace(/[\s_-]+/g, '');
    if (t.includes('true') || t.includes('dung')) return 'Đúng / Sai';
    if (t.includes('short') || t.includes('ngan')) return 'Trả lời ngắn';
    if (t.includes('essay') || t.includes('luan')) return 'Tự luận';
    return 'Trắc nghiệm';
  };

  const handleUpdateQuestion = (qId: number | string, field: keyof ExamQuestion, value: any) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === qId ? { ...q, [field]: value } : q))
    );
  };

  const handleUpdateOption = (qId: number | string, optKey: string, text: string) => {
    const cleaned = cleanOptionText(text);
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id === qId) {
          const newOpts = (q.options || []).map((opt) =>
            opt.key.toLowerCase() === optKey.toLowerCase() ? { ...opt, text: cleaned } : opt
          );
          return { ...q, options: newOpts };
        }
        return q;
      })
    );
  };

  const handleSetCorrectAnswer = (qId: number | string, correctKey: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id === qId) {
          const newOpts = (q.options || []).map((opt) => ({
            ...opt,
            isCorrect: opt.key === correctKey,
          }));
          return { ...q, correctAnswer: correctKey, options: newOpts };
        }
        return q;
      })
    );
  };

  const handleToggleTrueFalse = (qId: number | string, optKey: string, isCorrect: boolean) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id === qId) {
          const subKeys = ['a', 'b', 'c', 'd'];
          const currentOpts = q.options && q.options.length > 0 ? q.options : subKeys.map(k => ({ key: k, text: `Mệnh đề ${k}`, isCorrect: true }));
          const newOpts = currentOpts.map((opt) =>
            opt.key.toLowerCase() === optKey.toLowerCase() ? { ...opt, isCorrect } : opt
          );
          const answerStr = newOpts
            .map((opt) => `${opt.key}: ${opt.isCorrect ? 'Đ' : 'S'}`)
            .join(', ');
          return { ...q, options: newOpts, correctAnswer: answerStr };
        }
        return q;
      })
    );
  };

  const handleChangeQuestionType = (qId: number | string, newType: QuestionType) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id === qId) {
          let newOptions = q.options || [];
          let newAns = q.correctAnswer;
          let points = q.points;

          if (newType === 'true_false') {
            const subKeys = ['a', 'b', 'c', 'd'];
            newOptions = subKeys.map((k, i) => {
              const existing = (q.options || [])[i];
              return {
                key: k,
                text: existing ? cleanOptionText(existing.text) : `Mệnh đề khẳng định ý ${k}`,
                isCorrect: existing ? !!existing.isCorrect : i % 2 === 0,
              };
            });
            newAns = newOptions.map(o => `${o.key}: ${o.isCorrect ? 'Đ' : 'S'}`).join(', ');
            points = 1.0;
          } else if (newType === 'multiple_choice') {
            const optKeys = ['A', 'B', 'C', 'D'];
            newOptions = optKeys.map((k, i) => {
              const existing = (q.options || [])[i];
              return {
                key: k,
                text: existing ? cleanOptionText(existing.text) : `Lựa chọn phương án ${k}`,
                isCorrect: k === 'A',
              };
            });
            newAns = 'A';
            points = 0.25;
          } else if (newType === 'short_answer') {
            newOptions = [];
            newAns = newAns && !newAns.includes(':') && newAns.length <= 20 ? newAns : '12';
            points = 0.5;
          } else if (newType === 'essay') {
            newOptions = [];
            newAns = 'Xem hướng dẫn chấm và barem điểm';
            points = 1.5;
          }

          return {
            ...q,
            type: newType,
            options: newOptions,
            correctAnswer: newAns,
            points,
          };
        }
        return q;
      })
    );
  };

  const handleDeleteQuestion = (qId: number | string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== qId));
    showToast('Đã xóa câu hỏi khỏi bộ đề', 'info');
  };

  const handleAddQuestion = (type: QuestionType = 'multiple_choice') => {
    const nextNum = questions.length + 1;
    let options = [
      { key: 'A', text: 'Lựa chọn A ($x > 0$)', isCorrect: true },
      { key: 'B', text: 'Lựa chọn B ($x < 0$)', isCorrect: false },
      { key: 'C', text: 'Lựa chọn C ($x = 0$)', isCorrect: false },
      { key: 'D', text: 'Lựa chọn D ($x \\neq 0$)', isCorrect: false },
    ];
    let correctAnswer = 'A';
    let points = 0.25;
    let defaultContent = 'Nội dung câu hỏi mới biên soạn (hỗ trợ $công_thức_toán$)...';

    if (type === 'true_false') {
      options = [
        { key: 'a', text: 'Khẳng định ý a', isCorrect: true },
        { key: 'b', text: 'Khẳng định ý b', isCorrect: false },
        { key: 'c', text: 'Khẳng định ý c', isCorrect: true },
        { key: 'd', text: 'Khẳng định ý d', isCorrect: false },
      ];
      correctAnswer = 'a: Đ, b: S, c: Đ, d: S';
      points = 1.0;
      defaultContent = 'Cho hàm số $y = f(x)$ xác định và liên tục trên $\\mathbb{R}$. Các mệnh đề sau đúng hay sai?';
    } else if (type === 'short_answer') {
      options = [];
      correctAnswer = '12';
      points = 0.5;
      defaultContent = 'Tìm giá trị của tham số $m$ để đồ thị hàm số có đúng 3 điểm cực trị.';
    } else if (type === 'essay') {
      options = [];
      correctAnswer = 'Xem hướng dẫn chấm và barem điểm';
      points = 1.5;
      defaultContent = 'Giải phương trình và biện luận nghiệm theo tham số $m$: $x^2 - 2(m-1)x + m^2 - 3 = 0$.';
    }

    const newQ: ExamQuestion = {
      id: Date.now(),
      order: `Câu ${String(nextNum).padStart(2, '0')}`,
      type,
      level: 'Thông hiểu',
      levelClass: 'bg-blue-50 text-blue-700 border-blue-200',
      topic: activeExam.subject,
      content: defaultContent,
      options,
      points,
      correctAnswer,
      explanation: 'Giải thích chi tiết đáp án đúng / barem điểm...',
    };
    setQuestions((prev) => [...prev, newQ]);
    showToast(`Đã thêm 1 câu hỏi (${getTypeLabel(type)})`, 'success');
  };

  // Single Question AI Regeneration
  const handleRegenerateQuestion = async (q: ExamQuestion) => {
    setRegeneratingQId(q.id);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('examify_token') : null;
      if (storedToken) {
        headers['Authorization'] = `Bearer ${storedToken}`;
      }

      const res = await fetch('/api/v1/exams/regenerate-question', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          subject: activeExam.subject,
          grade: activeExam.grade,
          level: q.level,
          type: q.type || 'multiple_choice',
          currentTopic: q.topic || activeExam.subject,
          existingQuestions: questions.map((item) => item.content).filter(Boolean),
        }),
      });

      const data = await res.json();
      if (data.success && data.data?.question) {
        const newQ = data.data.question;
        setQuestions((prev) =>
          prev.map((item) =>
            item.id === q.id
              ? {
                  ...item,
                  content: newQ.content,
                  type: newQ.type || q.type || 'multiple_choice',
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
          )
        );
        showToast(`Đã tạo mới câu hỏi số ${q.order || q.id} bằng AI`, 'success');
      } else {
        showToast('Không thể tạo lại câu hỏi AI', 'error');
      }
    } catch {
      showToast('Lỗi khi kết nối dịch vụ tạo câu hỏi AI', 'error');
    } finally {
      setRegeneratingQId(null);
    }
  };

  // Entire Exam AI Regeneration
  const handleRegenerateEntireExam = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn AI tạo lại TOÀN BỘ câu hỏi cho đề thi này?')) {
      return;
    }

    setIsRegeneratingExam(true);
    try {
      const easy = activeExam.matrix?.easy || 40;
      const medium = activeExam.matrix?.medium || 30;
      const hard = activeExam.matrix?.hard || 20;
      const veryHard = activeExam.matrix?.veryHard || 10;
      const questionCount = questions.length > 0 ? questions.length : 20;

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
      if (data.success && data.data?.exam) {
        const generated = data.data.exam;
        const newQuestions: ExamQuestion[] = (generated.questions || []).map((q: any, i: number) => ({
          id: Date.now() + i,
          order: `Câu ${String(i + 1).padStart(2, '0')}`,
          level: q.level || 'Thông hiểu',
          levelClass:
            q.level === 'Nhận biết'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : q.level === 'Thông hiểu'
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : q.level === 'Vận dụng'
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'bg-rose-50 text-rose-700 border-rose-200',
          topic: activeExam.subject,
          content: q.content,
          options: (q.options || []).map((opt: any, optIdx: number) => {
            const key = ['A', 'B', 'C', 'D'][optIdx] || 'A';
            const optText = typeof opt === 'string' ? opt : opt.text || '';
            return {
              key,
              text: cleanOptionText(optText),
              isCorrect: (q.correctAnswer || 'A').toUpperCase() === key,
            };
          }),
          points: q.points || 0.25,
          correctAnswer: q.correctAnswer || 'A',
          explanation: q.explanation || 'Lời giải chi tiết biên soạn bởi mô hình AI.',
        }));

        setQuestions(newQuestions);
        showToast(`Đã tạo lại thành công toàn bộ ${newQuestions.length} câu hỏi mới bằng AI!`, 'success');
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
    updateExam(activeExam.id, {
      title,
      code: examCode,
      department,
      schoolName,
      sessionTitle,
      academicYear,
      sectionTitles,
      sectionDescriptions,
      questions,
      questionsCount: questions.length,
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
              onChange={(e) => setTitle(e.target.value)}
              className="text-base font-extrabold text-slate-900 dark:text-slate-100 bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:outline-none mt-1 w-full max-w-lg"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto justify-end">
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
                    <div className="text-[10px] text-slate-400 font-normal">Chuẩn thi tốt nghiệp GDPT 2018</div>
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

      {/* Official Vietnamese Exam Header (Chuẩn Bộ GD&ĐT) */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-3 border-b border-slate-100 dark:border-slate-800 text-xs">
          {/* Left Side: Sở / Trường & Khung Đề chính thức */}
          <div className="flex flex-col items-center justify-center text-center space-y-1">
            {/* Quick Action: Button Chọn Sở Giáo Dục */}
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

            {/* Dòng Tên Sở Giáo Dục / Cơ quan quản lý (Gốc trên cùng bên trái - Cho phép sửa trực tiếp tại chỗ) */}
            <div className="w-full max-w-[340px]">
              <input
                type="text"
                value={department}
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
                className="w-full text-center font-bold text-slate-800 dark:text-slate-200 text-xs tracking-wide bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 rounded px-1.5 py-0.5 outline-none transition-all print:border-none print:p-0 print:text-black"
                title="Gốc trên cùng bên trái đề: Nhấp để sửa trực tiếp Sở Giáo dục hoặc Cơ quan xuất xứ đề"
              />
            </div>

            {/* Dòng Tên Trường / Đơn Vị (Cho phép sửa trực tiếp tại chỗ) */}
            <div className="w-full max-w-[340px]">
              <input
                type="text"
                value={schoolName}
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
                className="w-full text-center font-bold text-slate-900 dark:text-slate-100 text-sm bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 rounded px-1.5 py-0.5 outline-none transition-all print:border-none print:p-0"
                title="Nhấp để sửa tên Trường / Đơn vị"
              />
            </div>

            <div className="mt-1 inline-block border-2 border-slate-900 dark:border-slate-100 px-3 py-0.5 text-xs font-extrabold tracking-wider uppercase print:border-black">
              ĐỀ CHÍNH THỨC
            </div>
          </div>

          {/* Right Side: Kỳ thi, Môn, Thời gian */}
          <div className="flex flex-col items-center justify-center text-center space-y-1">
            {/* Quick Action: Button Đặt Tên Bài Kiểm Tra */}
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

            {/* Dòng Tên Kỳ Thi / Bài Kiểm Tra (Cho phép sửa trực tiếp tại chỗ) */}
            <div className="w-full max-w-[340px]">
              <input
                type="text"
                value={sessionTitle}
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
                className="w-full text-center font-bold text-slate-900 dark:text-slate-100 text-xs md:text-sm bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 rounded px-1.5 py-0.5 outline-none transition-all print:border-none print:p-0"
                title="Nhấp để sửa trực tiếp tên Bài kiểm tra / Kỳ thi"
              />
            </div>

            {/* Dòng Năm Học (Cho phép sửa trực tiếp) */}
            <div className="w-full max-w-[280px]">
              <input
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                onBlur={(e) => {
                  const val = e.target.value.trim();
                  if (activeExam?.id) {
                    updateExam(activeExam.id, { academicYear: val });
                  }
                }}
                placeholder="NĂM HỌC 2024 – 2025"
                className="w-full text-center font-bold text-slate-900 dark:text-slate-100 text-xs bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 rounded px-1.5 py-0.5 outline-none transition-all print:border-none print:p-0"
                title="Nhấp để sửa Năm học"
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
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9A-Za-z]/g, '').slice(0, 4);
                  setExamCode(val);
                }}
                className="w-12 text-center font-extrabold text-sm font-mono text-slate-900 dark:text-slate-100 bg-transparent border-b border-dashed border-slate-400 focus:border-blue-600 focus:outline-none"
                title="Nhấp để sửa mã đề (chuẩn 3 chữ số: 101, 102, 134...)"
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
                        onChange={(e) => {
                          const val = e.target.value;
                          setSectionTitles((prev) => ({ ...prev, [sectionKey]: val }));
                        }}
                        placeholder="NHẬP TÊN PHẦN BÀI THI (VD: PHẦN I. CÂU HỎI TRẮC NGHIỆM)..."
                        className="w-full font-extrabold text-xs md:text-sm text-slate-900 dark:text-slate-100 uppercase tracking-wide bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-blue-600 focus:bg-white dark:focus:bg-slate-800 rounded px-1 py-0.5 outline-none transition-all print:border-none print:p-0"
                        title="Nhấp để đặt lại tên cho phần bài kiểm tra này"
                      />
                    </div>
                    <span className="no-print text-[10px] text-blue-600 dark:text-blue-400 font-bold px-2.5 py-0.5 rounded-full bg-blue-100/70 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-900 shrink-0">
                      ✏️ Đổi tên phần
                    </span>
                  </div>
                  <div>
                    <input
                      type="text"
                      value={currentSectionDesc}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSectionDescriptions((prev) => ({ ...prev, [sectionKey]: val }));
                      }}
                      placeholder="Nhập ghi chú / hướng dẫn làm bài cho phần này..."
                      className="w-full text-[11px] text-slate-600 dark:text-slate-400 italic bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-blue-400 focus:bg-white dark:focus:bg-slate-800 rounded px-1 py-0.5 outline-none transition-all print:border-none print:p-0"
                      title="Nhấp để sửa hướng dẫn làm bài phần này"
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

                  {/* Question Type Selector */}
                  <select
                    value={q.type || 'multiple_choice'}
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
                </div>

                <div className="no-print flex items-center gap-1.5">
                  {/* AI Regenerate Single Question */}
                  <button
                    type="button"
                    onClick={() => handleRegenerateQuestion(q)}
                    disabled={isRegenThis}
                    className={`px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-900 bg-indigo-50/70 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold flex items-center gap-1 transition-colors ${
                      isRegenThis ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    title="Tạo lại câu hỏi này bằng AI"
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
              </div>

              {/* INLINE EDIT MODE */}
              {isEditing ? (
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
                              const opt = (q.options || []).find((o) => o.key.toLowerCase() === subKey) || {
                                key: subKey,
                                text: '',
                                isCorrect: true,
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
                      <label className="text-xs font-bold text-purple-900 dark:text-purple-300 block">
                        Đáp số / Kết quả ngắn:
                      </label>
                      <input
                        type="text"
                        value={q.correctAnswer || ''}
                        onChange={(e) => handleUpdateQuestion(q.id, 'correctAnswer', e.target.value)}
                        placeholder="Ví dụ: 12, -3.5, hoặc 4/3..."
                        className="w-full text-xs font-bold text-purple-900 dark:text-purple-200 px-3 py-2 rounded-lg border border-purple-300 dark:border-purple-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      />
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
                    <MathText content={q.content} inline />
                  </div>

                  {/* 1. TRẮC NGHIỆM 4 LỰA CHỌN */}
                  {isMC && (() => {
                    const optA = q.options.find((o) => o.key === 'A')?.text || '';
                    const optB = q.options.find((o) => o.key === 'B')?.text || '';
                    const optC = q.options.find((o) => o.key === 'C')?.text || '';
                    const optD = q.options.find((o) => o.key === 'D')?.text || '';
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
                        {q.options.map((opt) => (
                          <div
                            key={opt.key}
                            onClick={() => handleSetCorrectAnswer(q.id, opt.key)}
                            className={`exam-opt-item ${printColClass} px-3 py-2 rounded-xl border flex items-baseline gap-2 transition-all cursor-pointer ${
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
                            {['a', 'b', 'c', 'd'].map((subKey) => {
                              const opt = (q.options || []).find((o) => o.key.toLowerCase() === subKey) || {
                                key: subKey,
                                text: `Mệnh đề khẳng định ý ${subKey}`,
                                isCorrect: true,
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
                                    onClick={() => handleToggleTrueFalse(q.id, subKey, true)}
                                    className="border border-black dark:border-slate-400 py-2 px-1 text-center align-middle w-12 md:w-14 cursor-pointer hover:bg-slate-100/60 dark:hover:bg-slate-800 transition-colors select-none"
                                    title="Nhấp để đánh dấu Đúng"
                                  >
                                    <span className="font-bold text-sm text-black dark:text-white">
                                      {includeAnswers && opt.isCorrect ? 'X' : ''}
                                    </span>
                                  </td>
                                  {/* Cột Sai (Ô trống in giấy, có X nếu kèm đáp án) */}
                                  <td
                                    onClick={() => handleToggleTrueFalse(q.id, subKey, false)}
                                    className="border border-black dark:border-slate-400 py-2 px-1 text-center align-middle w-12 md:w-14 cursor-pointer hover:bg-slate-100/60 dark:hover:bg-slate-800 transition-colors select-none"
                                    title="Nhấp để đánh dấu Sai"
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
                            <span>Đáp số / Kết quả ngắn gọn (học sinh tự điền):</span>
                          </label>
                          <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">Số hoặc biểu thức ngắn</span>
                        </div>
                        <input
                          type="text"
                          value={q.correctAnswer || ''}
                          onChange={(e) => handleUpdateQuestion(q.id, 'correctAnswer', e.target.value)}
                          placeholder="Ví dụ: 12, -3.5, hoặc 4/3..."
                          className="w-full text-xs font-bold text-purple-900 dark:text-purple-200 px-3 py-2 rounded-lg border border-purple-300 dark:border-purple-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        />
                        {q.correctAnswer && (q.correctAnswer.includes('$') || q.correctAnswer.includes('\\')) && (
                          <div className="px-3 py-1.5 bg-white/90 dark:bg-slate-900/90 rounded-md border border-purple-200/80 dark:border-purple-900/40 text-xs flex items-center gap-2">
                            <span className="text-[10px] font-bold text-purple-500 uppercase tracking-wider">Hiển thị công thức:</span>
                            <MathText content={q.correctAnswer} inline />
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
                        </div>

                        {q.explanation ? (
                          <div className="w-full text-xs text-slate-800 dark:text-slate-200 p-3 rounded-lg border border-rose-200/80 dark:border-rose-900/50 bg-white/95 dark:bg-slate-900/90 leading-relaxed overflow-x-auto shadow-xs">
                            <MathText content={q.explanation} />
                          </div>
                        ) : (
                          <div
                            onClick={() => setEditingQId(q.id)}
                            className="text-xs text-rose-500/80 dark:text-rose-400/80 italic p-3 border border-dashed border-rose-300 dark:border-rose-800 rounded-lg cursor-pointer hover:bg-rose-100/30 transition-colors"
                          >
                            Chưa có barem chấm điểm. Bấm vào đây hoặc nút "Sửa barem" để thêm hướng dẫn chấm và barem chi tiết.
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
                      {q.correctAnswer}
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
                      {q.correctAnswer}
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
    </div>
  );
}


