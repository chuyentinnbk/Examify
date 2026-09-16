'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAppStore, ExamQuestion, ExamItem } from '@/lib/store/app-store';
import UserAvatar from '@/components/common/UserAvatar';
import MathText, { cleanOptionText } from '@/components/common/MathText';
import {
  exportExamToDocx,
  exportExamToDoc,
  exportExamToPdf,
  exportExamToJson,
} from '@/lib/export-exam';

export default function EditorView() {
  const { activeExam, updateExam, showToast, setCurrentRoute, user } = useAppStore();

  const [title, setTitle] = useState(activeExam?.title || '');
  const [questions, setQuestions] = useState<ExamQuestion[]>(activeExam?.questions || []);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [includeAnswers, setIncludeAnswers] = useState(true);
  const [regeneratingQId, setRegeneratingQId] = useState<number | string | null>(null);
  const [isRegeneratingExam, setIsRegeneratingExam] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'split' | 'stacked' | 'preview' | 'editor'>('split');

  const exportDropdownRef = useRef<HTMLDivElement>(null);

  // Sync state if activeExam changes & clean option texts
  useEffect(() => {
    if (activeExam) {
      setTitle(activeExam.title);
      const sanitized = (activeExam.questions || []).map((q) => ({
        ...q,
        options: (q.options || []).map((opt) => ({
          ...opt,
          text: cleanOptionText(opt.text),
        })),
      }));
      setQuestions(sanitized);
    }
  }, [activeExam]);

  // Click outside listener for export dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        exportDropdownRef.current &&
        !exportDropdownRef.current.contains(event.target as Node)
      ) {
        setIsExportOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!activeExam) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 max-w-md mx-auto my-12">
        <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">
          folder_open
        </span>
        <h3 className="text-base font-bold text-slate-800">Chưa chọn bộ đề nào</h3>
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
          const newOpts = q.options.map((opt) =>
            opt.key === optKey ? { ...opt, text: cleaned } : opt
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
          const newOpts = q.options.map((opt) => ({
            ...opt,
            isCorrect: opt.key === correctKey,
          }));
          return { ...q, correctAnswer: correctKey, options: newOpts };
        }
        return q;
      })
    );
  };

  const handleDeleteQuestion = (qId: number | string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== qId));
    showToast('Đã xóa câu hỏi khỏi bộ đề', 'info');
  };

  const handleAddQuestion = () => {
    const nextNum = questions.length + 1;
    const newQ: ExamQuestion = {
      id: Date.now(),
      order: `Câu ${String(nextNum).padStart(2, '0')}`,
      level: 'Thông hiểu',
      levelClass: 'bg-blue-50 text-blue-700 border-blue-200',
      topic: activeExam.subject,
      content: 'Nội dung câu hỏi mới biên soạn...',
      options: [
        { key: 'A', text: 'Lựa chọn A', isCorrect: true },
        { key: 'B', text: 'Lựa chọn B', isCorrect: false },
        { key: 'C', text: 'Lựa chọn C', isCorrect: false },
        { key: 'D', text: 'Lựa chọn D', isCorrect: false },
      ],
      points: 0.25,
      correctAnswer: 'A',
      explanation: 'Giải thích chi tiết đáp án đúng...',
    };
    setQuestions((prev) => [...prev, newQ]);
    showToast('Đã thêm 1 câu hỏi mới', 'success');
  };

  // 1. Single Question AI Regeneration
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
                  options: (newQ.options || []).map((opt: any) => ({
                    ...opt,
                    text: cleanOptionText(opt.text),
                  })),
                  correctAnswer: newQ.correctAnswer,
                  explanation: newQ.explanation,
                  level: newQ.level || item.level,
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

  // 2. Entire Exam AI Regeneration
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
      questions,
      questionsCount: questions.length,
      updatedAt: 'Vừa lưu',
    });
    showToast('Đã lưu tất cả thay đổi bộ đề thi', 'success');
  };

  // Current Exam Payload for Exports
  const currentExamData: ExamItem = {
    ...activeExam,
    title: title || activeExam.title,
    questions,
    questionsCount: questions.length,
  };

  const handleExportDocx = async () => {
    setIsExportingDocx(true);
    try {
      await exportExamToDocx(currentExamData, {
        includeAnswers,
        schoolName: user.school || 'TRƯỜNG TRUNG HỌC PHỔ THÔNG CHUYÊN',
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
      schoolName: user.school || 'TRƯỜNG TRUNG HỌC PHỔ THÔNG CHUYÊN',
    });
    showToast('Đã tải xuống file Word (.doc)', 'success');
    setIsExportOpen(false);
  };

  const handleExportPdf = () => {
    setIsExportOpen(false);
    exportExamToPdf();
  };

  const handleExportJson = () => {
    exportExamToJson(currentExamData);
    showToast('Đã tải xuống file cấu trúc JSON', 'success');
    setIsExportOpen(false);
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full pb-20 animate-in fade-in duration-300">
      {/* Top Action Bar (hidden in print) */}
      <div className="no-print bg-white p-4 md:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setCurrentRoute('#dashboard')}
            className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
            title="Quay lại danh sách đề"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-400">{activeExam.id}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
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
              className="text-base font-extrabold text-slate-900 bg-transparent border-b border-dashed border-slate-300 focus:border-blue-500 focus:outline-none mt-1 w-full max-w-lg"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto justify-end">
          {/* Layout Mode Switcher (2 Phần: Nội dung & LaTeX) */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setLayoutMode('split')}
              className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-all ${
                layoutMode === 'split'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Chia 2 cột song song: 1 cột Soạn nội dung, 1 cột Hiển thị LaTeX"
            >
              <span className="material-symbols-outlined text-sm">view_column</span>
              <span>2 Cột Song song</span>
            </button>

            <button
              type="button"
              onClick={() => setLayoutMode('stacked')}
              className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-all ${
                layoutMode === 'stacked'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Xếp 2 phần trên dưới: Trên Soạn thảo, Dưới Hiển thị LaTeX"
            >
              <span className="material-symbols-outlined text-sm">table_rows</span>
              <span>Trên / Dưới</span>
            </button>

            <button
              type="button"
              onClick={() => setLayoutMode('preview')}
              className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-all ${
                layoutMode === 'preview'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Chỉ hiển thị đề thi hoàn chỉnh với công thức LaTeX (In ấn)"
            >
              <span className="material-symbols-outlined text-sm">functions</span>
              <span>Chỉ xem LaTeX</span>
            </button>
          </div>

          {/* Regenerate Entire Exam Button */}
          <button
            type="button"
            onClick={handleRegenerateEntireExam}
            disabled={isRegeneratingExam}
            className={`px-3 py-2 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs ${
              isRegeneratingExam ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            title="Sử dụng AI để tạo lại toàn bộ đề thi"
          >
            <span className={`material-symbols-outlined text-sm text-indigo-600 ${isRegeneratingExam ? 'animate-spin' : ''}`}>
              {isRegeneratingExam ? 'progress_activity' : 'auto_awesome'}
            </span>
            <span>{isRegeneratingExam ? 'Đang tạo lại...' : 'Tạo lại đề (AI)'}</span>
          </button>

          {/* Add Question Button */}
          <button
            type="button"
            onClick={handleAddQuestion}
            className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-sm text-blue-600">add</span>
            <span>Thêm câu</span>
          </button>

          {/* Download / Export Dropdown */}
          <div className="relative" ref={exportDropdownRef}>
            <button
              type="button"
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="px-3.5 py-2 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <span className="material-symbols-outlined text-sm text-emerald-600">download</span>
              <span>Tải về / Xuất đề</span>
              <span className="material-symbols-outlined text-xs">expand_more</span>
            </button>

            {isExportOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="p-2 border-b border-slate-100 mb-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Định dạng tải về
                  </span>
                  <label className="flex items-center gap-2 mt-2 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeAnswers}
                      onChange={(e) => setIncludeAnswers(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                    />
                    <span>Kèm đáp án &amp; Lời giải</span>
                  </label>
                </div>

                {/* DOCX */}
                <button
                  type="button"
                  onClick={handleExportDocx}
                  disabled={isExportingDocx}
                  className="w-full text-left p-2 rounded-xl hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2.5 transition-colors text-xs font-semibold text-slate-700 disabled:opacity-50"
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

                {/* Word DOC */}
                <button
                  type="button"
                  onClick={handleExportDoc}
                  className="w-full text-left p-2 rounded-xl hover:bg-sky-50 hover:text-sky-700 flex items-center gap-2.5 transition-colors text-xs font-semibold text-slate-700"
                >
                  <span className="material-symbols-outlined text-sky-600 text-lg">article</span>
                  <div className="flex-1">
                    <div>Word HTML (.doc)</div>
                    <div className="text-[10px] text-slate-400 font-normal">Tương thích tốt mọi phiên bản Word</div>
                  </div>
                </button>

                {/* PDF */}
                <button
                  type="button"
                  onClick={handleExportPdf}
                  className="w-full text-left p-2 rounded-xl hover:bg-rose-50 hover:text-rose-700 flex items-center gap-2.5 transition-colors text-xs font-semibold text-slate-700"
                >
                  <span className="material-symbols-outlined text-rose-600 text-lg">picture_as_pdf</span>
                  <div className="flex-1">
                    <div>In / Xuất PDF (.pdf)</div>
                    <div className="text-[10px] text-slate-400 font-normal">Định dạng A4 chuẩn in ấn khảo thí</div>
                  </div>
                </button>

                {/* JSON */}
                <button
                  type="button"
                  onClick={handleExportJson}
                  className="w-full text-left p-2 rounded-xl hover:bg-amber-50 hover:text-amber-700 flex items-center gap-2.5 transition-colors text-xs font-semibold text-slate-700"
                >
                  <span className="material-symbols-outlined text-amber-600 text-lg">data_object</span>
                  <div className="flex-1">
                    <div>Dữ liệu LMS (.json)</div>
                    <div className="text-[10px] text-slate-400 font-normal">Nhập vào hệ thống thi online</div>
                  </div>
                </button>
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
            <span>Lưu</span>
          </button>
        </div>
      </div>

      {/* Printable Exam Paper Content */}
      <div className="print-area space-y-6">
        {/* Exam Header for Print */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 text-center space-y-1">
          <div className="flex justify-between items-start text-xs font-semibold text-slate-600 mb-2 border-b border-slate-100 pb-3">
            <div className="text-left">
              <div className="font-bold text-slate-800">{user.school ? user.school.toUpperCase() : 'TRUNG TÂM KHẢO THÍ CHẤT LƯỢNG CAO'}</div>
              <div className="text-[11px] text-slate-500">ĐỀ THI CHÍNH THỨC</div>
            </div>
            <div className="text-right">
              <div className="font-bold text-slate-800">KỲ THI KIỂM TRA ĐỊNH KỲ</div>
              <div className="text-[11px] text-slate-500">Năm học 2024 - 2025</div>
            </div>
          </div>
          <h2 className="text-lg font-bold text-slate-900 uppercase tracking-tight">{title}</h2>
          <p className="text-xs text-slate-500">
            Môn thi: {activeExam.subject} ({activeExam.grade}) • Thời gian làm bài: {activeExam.duration} phút (Đề gồm {questions.length} câu trắc nghiệm)
          </p>
          <div className="text-[11px] text-slate-400 pt-2">
            Họ và tên thí sinh: ............................................................................ Số báo danh: ..................... Mã đề thi: <strong>{activeExam.id}</strong>
          </div>
        </div>

        {/* Question Cards */}
        {questions.map((q, qIndex) => {
          const isRegenThis = regeneratingQId === q.id;

          return (
            <div
              key={q.id}
              className={`bg-white rounded-2xl p-6 border shadow-xs space-y-5 relative group transition-all ${
                isRegenThis ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-200/80'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-lg bg-blue-600 text-white text-xs font-bold shadow-xs">
                    Câu {qIndex + 1}
                  </span>
                  <select
                    value={q.level}
                    onChange={(e) => handleUpdateQuestion(q.id, 'level', e.target.value)}
                    className="text-xs font-bold px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-700"
                  >
                    <option value="Nhận biết">Nhận biết</option>
                    <option value="Thông hiểu">Thông hiểu</option>
                    <option value="Vận dụng">Vận dụng</option>
                    <option value="Vận dụng cao">Vận dụng cao</option>
                  </select>
                  <span className="text-[11px] text-slate-400 font-medium">({q.points || 0.25} điểm)</span>
                </div>

                <div className="no-print flex items-center gap-1.5">
                  {/* Regenerate Single Question Button */}
                  <button
                    type="button"
                    onClick={() => handleRegenerateQuestion(q)}
                    disabled={isRegenThis}
                    className={`px-2.5 py-1 rounded-lg border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold flex items-center gap-1 transition-colors ${
                      isRegenThis ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    title="Tạo lại câu hỏi này bằng AI"
                  >
                    <span className={`material-symbols-outlined text-xs text-indigo-600 ${isRegenThis ? 'animate-spin' : ''}`}>
                      {isRegenThis ? 'progress_activity' : 'auto_awesome'}
                    </span>
                    <span>{isRegenThis ? 'Đang tạo...' : 'Tạo lại câu (AI)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteQuestion(q.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Xóa câu hỏi này"
                  >
                    <span className="material-symbols-outlined text-base">delete</span>
                  </button>
                </div>
              </div>

              {/* Layout Mode: ONLY PREVIEW (Chỉ xem LaTeX) */}
              {layoutMode === 'preview' ? (
                <div className="space-y-4">
                  {/* Question Title Rendered */}
                  <div className="text-sm font-medium text-slate-900 leading-relaxed">
                    <MathText content={q.content} />
                  </div>

                  {/* Options List Rendered */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {q.options.map((opt) => (
                      <div
                        key={opt.key}
                        onClick={() => handleSetCorrectAnswer(q.id, opt.key)}
                        className={`p-3 rounded-xl border flex items-center gap-2.5 transition-all cursor-pointer ${
                          opt.isCorrect
                            ? 'border-emerald-500 bg-emerald-50/60 text-emerald-950 font-semibold'
                            : 'border-slate-200 bg-slate-50/50 text-slate-800 hover:bg-slate-100/60'
                        }`}
                      >
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            opt.isCorrect
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-white border border-slate-300 text-slate-600'
                          }`}
                        >
                          {opt.key}
                        </span>
                        <div className="flex-1 text-xs font-medium">
                          <MathText content={cleanOptionText(opt.text)} inline />
                        </div>
                        {opt.isCorrect && (
                          <span className="material-symbols-outlined text-emerald-600 text-base" title="Đáp án đúng">
                            check_circle
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Explanation Rendered */}
                  {q.explanation && (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 space-y-1">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Lời giải chi tiết:
                      </div>
                      <MathText content={q.explanation} />
                    </div>
                  )}
                </div>
              ) : (
                /* Layout Mode: SPLIT (2 Cột) HOẶC STACKED (Trên / Dưới) */
                <div
                  className={`grid gap-6 items-start ${
                    layoutMode === 'split' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'
                  }`}
                >
                  {/* ======================================================== */}
                  {/* PHẦN 1: SOẠN THẢO & NHẬP NỘI DUNG THÔ (MÃ LATEX)        */}
                  {/* ======================================================== */}
                  <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200 space-y-4">
                    <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200 text-xs font-bold text-slate-700">
                      <span className="material-symbols-outlined text-blue-600 text-base">edit_note</span>
                      <span>PHẦN 1: SOẠN THẢO NỘI DUNG</span>
                      <span className="text-[10px] font-normal text-slate-400 ml-auto">(Gõ text &amp; $mã_toán$)</span>
                    </div>

                    {/* Question Content Input */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-600 block">
                        Đề bài câu hỏi:
                      </label>
                      <textarea
                        value={q.content}
                        onChange={(e) => handleUpdateQuestion(q.id, 'content', e.target.value)}
                        rows={3}
                        className="w-full p-3 text-xs rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono leading-relaxed"
                        placeholder="Nhập nội dung đề bài (hỗ trợ $công_thức$)..."
                      />
                    </div>

                    {/* Options Inputs */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-semibold text-slate-600 block">
                        4 Phương án lựa chọn (Click chữ cái để chọn đáp án đúng):
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {q.options.map((opt) => {
                          const cleanText = cleanOptionText(opt.text);
                          return (
                            <div
                              key={opt.key}
                              className={`p-2 rounded-xl border flex items-center gap-2 bg-white transition-all ${
                                opt.isCorrect
                                  ? 'border-emerald-500 ring-2 ring-emerald-100 bg-emerald-50/30'
                                  : 'border-slate-200'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => handleSetCorrectAnswer(q.id, opt.key)}
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0 ${
                                  opt.isCorrect
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                                title={opt.isCorrect ? 'Đáp án đúng' : 'Click để chọn làm đáp án đúng'}
                              >
                                {opt.key}
                              </button>
                              <input
                                type="text"
                                value={cleanText}
                                onChange={(e) => handleUpdateOption(q.id, opt.key, e.target.value)}
                                className="flex-1 text-xs bg-transparent focus:outline-none font-mono"
                                placeholder={`Nội dung phương án ${opt.key}...`}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Explanation Input */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-600 block">
                        Lời giải chi tiết &amp; Hướng dẫn giải:
                      </label>
                      <textarea
                        value={q.explanation}
                        onChange={(e) => handleUpdateQuestion(q.id, 'explanation', e.target.value)}
                        rows={2}
                        className="w-full p-2.5 text-xs rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono leading-relaxed"
                        placeholder="Nhập lời giải chi tiết..."
                      />
                    </div>
                  </div>

                  {/* ======================================================== */}
                  {/* PHẦN 2: HIỂN THỊ CÔNG THỨC LATEX (TRỰC QUAN KATEX)       */}
                  {/* ======================================================== */}
                  <div className="bg-white rounded-2xl p-4 border border-indigo-200/90 shadow-xs space-y-4">
                    <div className="flex items-center gap-2 pb-2.5 border-b border-indigo-100 text-xs font-bold text-indigo-900">
                      <span className="material-symbols-outlined text-indigo-600 text-base">functions</span>
                      <span>PHẦN 2: HIỂN THỊ CÔNG THỨC LATEX</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 ml-auto">
                        KaTeX Live
                      </span>
                    </div>

                    {/* Question Content Rendered */}
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Đề bài hiển thị:
                      </div>
                      <div className="p-3.5 rounded-xl bg-indigo-50/20 border border-indigo-100 text-xs font-medium text-slate-900 leading-relaxed min-h-[4.5rem]">
                        <MathText content={q.content || '*(Chưa có nội dung)*'} />
                      </div>
                    </div>

                    {/* Options Rendered */}
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Các phương án hiển thị:
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {q.options.map((opt) => (
                          <div
                            key={opt.key}
                            onClick={() => handleSetCorrectAnswer(q.id, opt.key)}
                            className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-all cursor-pointer ${
                              opt.isCorrect
                                ? 'border-emerald-500 bg-emerald-50/50 text-emerald-950 font-semibold'
                                : 'border-slate-200 bg-slate-50/60 text-slate-800 hover:bg-slate-100/70'
                            }`}
                          >
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                                opt.isCorrect
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'bg-white border border-slate-300 text-slate-700'
                              }`}
                            >
                              {opt.key}
                            </span>
                            <div className="flex-1 text-xs font-medium overflow-x-auto">
                              <MathText content={cleanOptionText(opt.text) || `(Chưa nhập phương án ${opt.key})`} inline />
                            </div>
                            {opt.isCorrect && (
                              <span className="material-symbols-outlined text-emerald-600 text-base" title="Đáp án đúng">
                                check_circle
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Explanation Rendered */}
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Lời giải chi tiết hiển thị:
                      </div>
                      <div className="p-3 rounded-xl bg-amber-50/30 border border-amber-200/70 text-xs text-slate-700 leading-relaxed min-h-[3.5rem]">
                        <MathText content={q.explanation || '*(Chưa có lời giải chi tiết)*'} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
