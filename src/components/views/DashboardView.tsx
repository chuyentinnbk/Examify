'use client';

import React, { useState } from 'react';
import { useAppStore, ExamItem } from '@/lib/store/app-store';
import PortalModal from '@/components/common/PortalModal';
import UserAvatar from '@/components/common/UserAvatar';

export default function DashboardView() {
  const { exams, user, setCurrentRoute, setActiveExam, deleteExam, showToast } = useAppStore();
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [previewExam, setPreviewExam] = useState<ExamItem | null>(null);

  const filteredExams = exams.filter((exam) => {
    let matchesFilter = true;
    if (filter === 'math') matchesFilter = exam.subject.includes('Toán');
    else if (filter === 'natural') matchesFilter = exam.subject.includes('Lý') || exam.subject.includes('Hóa') || exam.subject.includes('Sinh') || exam.subject.includes('KHTN');
    else if (filter === 'social') matchesFilter = exam.subject.includes('Anh') || exam.subject.includes('Văn') || exam.subject.includes('Sử') || exam.subject.includes('Địa');

    const matchesSearch =
      search === '' ||
      exam.title.toLowerCase().includes(search.toLowerCase()) ||
      exam.subject.toLowerCase().includes(search.toLowerCase()) ||
      exam.grade.toLowerCase().includes(search.toLowerCase()) ||
      exam.author.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleEdit = (exam: ExamItem) => {
    setActiveExam(exam);
    setCurrentRoute('#editor');
  };

  const getStatusBadge = (status?: any) => {
    return (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        Chính thức
      </span>
    );
  };

  const getSubjectIcon = (subject: string) => {
    if (subject.includes('Toán')) return 'functions';
    if (subject.includes('Vật lý')) return 'science';
    if (subject.includes('Hóa')) return 'biotech';
    if (subject.includes('Sinh')) return 'psychology';
    if (subject.includes('Anh')) return 'translate';
    return 'menu_book';
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full pb-12 animate-in fade-in duration-300">
      {/* Hero Banner */}
      <div className="w-full relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 p-6 md:p-8 text-white shadow-xl">
        <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-cyan-400/20 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -bottom-20 w-64 h-64 rounded-full bg-indigo-300/15 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6">
          <div className="flex flex-col gap-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md w-fit text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-cyan-300 animate-ping" />
              <span>Hệ Khảo Thí Chuẩn Hóa GDPT 2018</span>
            </div>

            <div className="flex items-center gap-4 pt-1">
              <UserAvatar
                name={user.name}
                email={user.email}
                size="lg"
                rounded="rounded-2xl"
                defaultType={user.avatarStyle || 'identicon'}
                showIndicator={true}
                className="ring-4 ring-white/20 shadow-xl shrink-0"
              />
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
                  Xin chào, {user.name || 'Quý Thầy/Cô'}
                </h1>
                <p className="text-xs text-blue-200 mt-0.5">
                  {user.email ? `${user.email} • ${user.role || 'Cán bộ Khảo thí'}` : (user.role || 'Cán bộ Khảo thí')}
                </p>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-3 pt-2 max-w-md">
              <div className="px-3.5 py-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15">
                <span className="text-[11px] text-blue-200">Đề đã tạo</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl font-bold text-white">{exams.length}</span>
                  <span className="text-[11px] text-blue-200">bộ</span>
                </div>
              </div>

              <div className="px-3.5 py-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15">
                <span className="text-[11px] text-blue-200">Câu hỏi AI</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl font-bold text-cyan-300">
                    {exams.reduce((sum, e) => sum + (e.questionsCount || 0), 0)}
                  </span>
                  <span className="text-[11px] text-blue-200">mục</span>
                </div>
              </div>

              <div className="px-3.5 py-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15">
                <span className="text-[11px] text-blue-200">Độ chuẩn Bloom</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl font-bold text-emerald-300">
                    {exams.length > 0 ? '99.4%' : '100%'}
                  </span>
                  <span className="text-[11px] text-blue-200">tối ưu</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row xl:flex-col gap-2.5 w-full xl:w-auto">
            <button
              type="button"
              onClick={() => setCurrentRoute('#create-exam')}
              className="px-6 py-3 rounded-xl bg-white text-blue-700 hover:bg-blue-50 font-bold text-xs transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">auto_awesome</span>
              <span>Tạo Đề Thi Mới Bằng AI</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentRoute('#editor')}
              className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 backdrop-blur-sm"
            >
              <span className="material-symbols-outlined text-base">edit_document</span>
              <span>Mở Trình Biên Tập Đề</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        {/* Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { key: 'all', label: 'Tất cả đề thi', count: exams.length },
            { key: 'math', label: 'Toán học', count: exams.filter((e) => e.subject.includes('Toán')).length },
            { key: 'natural', label: 'KHTN / Lý - Hóa - Sinh', count: exams.filter((e) => e.subject.includes('Lý') || e.subject.includes('Hóa') || e.subject.includes('Sinh') || e.subject.includes('KHTN')).length },
            { key: 'social', label: 'Tiếng Anh & Xã hội', count: exams.filter((e) => e.subject.includes('Anh') || e.subject.includes('Văn') || e.subject.includes('Sử') || e.subject.includes('Địa')).length },
          ].map((pill) => {
            const isActive = filter === pill.key;
            return (
              <button
                key={pill.key}
                type="button"
                onClick={() => setFilter(pill.key as any)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>{pill.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {pill.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative min-w-[260px]">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-base">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Lọc theo tên, môn học..."
            className="w-full h-9 pl-9 pr-3 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Exam Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredExams.map((exam) => (
          <div
            key={exam.id}
            className="bg-white rounded-2xl border border-slate-200/80 p-5 flex flex-col justify-between hover:shadow-md hover:border-blue-300 transition-all group"
          >
            <div>
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <span className="material-symbols-outlined text-base">
                      {getSubjectIcon(exam.subject)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block">
                      {exam.id} • {exam.grade}
                    </span>
                    <span className="text-xs font-bold text-slate-800">
                      {exam.subject}
                    </span>
                  </div>
                </div>
                {getStatusBadge(exam.status)}
              </div>

              {/* Title */}
              <h3
                onClick={() => handleEdit(exam)}
                className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 cursor-pointer mb-3"
              >
                {exam.title}
              </h3>

              {/* Matrix Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium mb-1">
                  <span>Ma trận Bloom</span>
                  <span>{exam.questionsCount} câu • {exam.duration} phút</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full flex overflow-hidden">
                  <div style={{ width: `${exam.matrix.easy}%` }} className="bg-emerald-400" title={`Nhận biết: ${exam.matrix.easy}%`} />
                  <div style={{ width: `${exam.matrix.medium}%` }} className="bg-blue-400" title={`Thông hiểu: ${exam.matrix.medium}%`} />
                  <div style={{ width: `${exam.matrix.hard}%` }} className="bg-amber-400" title={`Vận dụng: ${exam.matrix.hard}%`} />
                  <div style={{ width: `${exam.matrix.veryHard}%` }} className="bg-rose-400" title={`Vận dụng cao: ${exam.matrix.veryHard}%`} />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2 overflow-hidden">
                <UserAvatar
                  name={exam.author}
                  size="xs"
                  rounded="rounded-full"
                  defaultType="identicon"
                />
                <span className="text-[11px] text-slate-500 font-medium truncate max-w-[120px]" title={exam.author}>
                  {exam.author}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPreviewExam(exam)}
                  title="Xem nhanh"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  <span className="material-symbols-outlined text-base">visibility</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleEdit(exam)}
                  title="Chỉnh sửa đề thi"
                  className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-xs">edit</span>
                  <span>Sửa</span>
                </button>
                <button
                  type="button"
                  onClick={() => deleteExam(exam.id)}
                  title="Xóa đề"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <span className="material-symbols-outlined text-base">delete</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredExams.length === 0 && (
        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400">
          <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">
            description
          </span>
          <p className="text-sm font-semibold text-slate-700">
            {exams.length === 0
              ? 'Chưa có bộ đề thi nào trong hệ thống'
              : 'Không tìm thấy bộ đề thi nào phù hợp'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {exams.length === 0
              ? 'Bắt đầu bằng cách tạo ma trận chuẩn GDPT 2018 hoặc sinh tự động bằng AI.'
              : 'Thử thay đổi từ khóa tìm kiếm hoặc chuyển bộ lọc trạng thái.'}
          </p>
          {exams.length === 0 && (
            <button
              type="button"
              onClick={() => setCurrentRoute('#create-exam')}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/20"
            >
              <span className="material-symbols-outlined text-sm">add_circle</span>
              <span>Tạo Đề Thi Mới</span>
            </button>
          )}
        </div>
      )}

      {/* Preview Modal via PortalModal */}
      <PortalModal
        isOpen={Boolean(previewExam)}
        onClose={() => setPreviewExam(null)}
        title={previewExam ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">{previewExam.id}</span>
            {getStatusBadge(previewExam.status)}
          </div>
        ) : undefined}
        maxWidth="max-w-2xl"
        footer={
          previewExam ? (
            <div className="w-full flex items-center justify-between">
              <button
                type="button"
                onClick={() => setPreviewExam(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = previewExam;
                  setPreviewExam(null);
                  handleEdit(target);
                }}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">edit_document</span>
                <span>Mở trong Trình Biên tập</span>
              </button>
            </div>
          ) : undefined
        }
      >
        {previewExam && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{previewExam.title}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px]">Môn học</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{previewExam.subject}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px]">Khối lớp</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{previewExam.grade}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px]">Thời gian làm bài</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{previewExam.duration} phút</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px]">Tổng số câu</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{previewExam.questionsCount} câu</span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Phân bổ Bloom (Ma trận đề)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-bold">
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Nhận biết: {previewExam.matrix.easy}%
                </div>
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Thông hiểu: {previewExam.matrix.medium}%
                </div>
                <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  Vận dụng: {previewExam.matrix.hard}%
                </div>
                <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                  Vận dụng cao: {previewExam.matrix.veryHard}%
                </div>
              </div>
            </div>
          </div>
        )}
      </PortalModal>
    </div>
  );
}
