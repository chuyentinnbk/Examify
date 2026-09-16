'use client';

import React from 'react';
import { useAppStore } from '@/lib/store/app-store';
import UserAvatar from '@/components/common/UserAvatar';

export default function Sidebar() {
  const { currentRoute, setCurrentRoute, user, logout } = useAppStore();

  const navItems = [
    {
      route: '#dashboard',
      icon: 'grid_view',
      label: 'Trang chủ / Đề thi',
      badge: null,
    },
    {
      route: '#create-exam',
      icon: 'auto_awesome',
      label: 'Tạo đề thi AI',
      badge: (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
          AI
        </span>
      ),
    },
    {
      route: '#editor',
      icon: 'edit_document',
      label: 'Biên tập & Sửa đề',
      badge: null,
    },
    {
      route: '#profile',
      icon: 'manage_accounts',
      label: 'Tài khoản & 2FA',
      badge: null,
    },
    {
      route: '#admin',
      icon: 'admin_panel_settings',
      label: 'Quản trị hệ thống',
      badge: (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700">
          ADMIN
        </span>
      ),
    },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-slate-200 z-40 flex flex-col justify-between select-none shadow-sm">
      <div className="flex flex-col">
        {/* Logo & Brand Header */}
        <div
          onClick={() => setCurrentRoute('#dashboard')}
          className="h-16 px-5 flex items-center gap-2.5 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <span className="material-symbols-outlined text-xl">school</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="font-extrabold text-base tracking-tight text-slate-800">
                Examify
              </span>
              <span className="font-extrabold text-base text-blue-600">AI</span>
              <span className="text-[9px] font-bold uppercase bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded border border-blue-200">
                Beta
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium truncate max-w-[130px]">
              {user.school || 'Cơ sở giáo dục'}
            </span>
          </div>
        </div>

        {/* AI Model Status Pill */}
        <div className="p-4">
          <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-slate-600 font-semibold">Multi-AI Engine</span>
            </div>
            <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              ONLINE
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="px-3 space-y-1">
          {navItems.map((item) => {
            const isActive =
              currentRoute === item.route ||
              (item.route === '#dashboard' && currentRoute === '#');

            return (
              <button
                key={item.route}
                type="button"
                onClick={() => setCurrentRoute(item.route)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`material-symbols-outlined text-lg ${
                      isActive ? 'text-white' : 'text-slate-400'
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge && <div>{item.badge}</div>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer User Card */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50">
        <div className="p-2.5 rounded-xl bg-white border border-slate-200/70 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <UserAvatar
              name={user.name}
              email={user.email}
              size="sm"
              rounded="rounded-full"
              defaultType={user.avatarStyle || 'identicon'}
              showIndicator={true}
            />
            <div className="flex flex-col overflow-hidden text-left">
              <span className="text-xs font-bold text-slate-800 truncate">
                {user.name || 'Quản trị viên'}
              </span>
              <span className="text-[10px] text-slate-400 truncate">
                {user.email || 'Chưa đăng nhập'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            title="Đăng xuất khỏi hệ thống"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <span className="material-symbols-outlined text-base">logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
