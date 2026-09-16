'use client';

import React from 'react';
import { useAppStore } from '@/lib/store/app-store';
import UserAvatar from '@/components/common/UserAvatar';

export default function Header() {
  const { setCurrentRoute, user, showToast } = useAppStore();

  return (
    <header className="fixed top-0 right-0 left-64 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 z-30 px-6 flex items-center justify-between">
      {/* Search Input */}
      <div className="flex items-center gap-2 max-w-md w-full">
        <div className="relative w-full">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-lg">
            search
          </span>
          <input
            type="text"
            placeholder="Tìm kiếm đề thi theo mã, môn học, khối lớp hoặc giáo viên..."
            className="w-full h-9 pl-9 pr-4 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all placeholder:text-slate-400 font-medium"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* API Docs Button */}
        <a
          href="/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-600 transition-colors"
        >
          <span className="material-symbols-outlined text-sm text-purple-600">
            menu_book
          </span>
          <span>API Docs</span>
        </a>

        {/* Quick Generate CTA */}
        <button
          type="button"
          onClick={() => setCurrentRoute('#create-exam')}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-sm">add_circle</span>
          <span>Tạo Đề Thi Mới</span>
        </button>

        <div className="h-5 w-px bg-slate-200 mx-1" />

        {/* Notifications */}
        <button
          type="button"
          onClick={() => showToast('Không có thông báo mới', 'info')}
          className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors relative"
        >
          <span className="material-symbols-outlined text-xl">notifications</span>
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white" />
        </button>

        {/* User Pill */}
        <div
          onClick={() => setCurrentRoute('#profile')}
          className="flex items-center gap-2.5 pl-2 cursor-pointer hover:opacity-90 transition-opacity"
        >
          <UserAvatar
            name={user.name}
            email={user.email}
            size="sm"
            rounded="rounded-xl"
            defaultType={user.avatarStyle || 'identicon'}
            showIndicator={true}
          />
          <div className="hidden lg:flex flex-col text-left">
            <span className="text-xs font-bold text-slate-800 leading-tight">
              {user.name || 'Quản trị viên'}
            </span>
            <span className="text-[10px] text-slate-400">{user.role || 'Cán bộ Khảo thí'}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
