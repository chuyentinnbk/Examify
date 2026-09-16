'use client';

import React from 'react';
import { useAppStore, ToastMessage } from '@/lib/store/app-store';

export default function ToastContainer() {
  const { toasts, removeToast } = useAppStore();

  if (toasts.length === 0) return null;

  const getStyle = (type: ToastMessage['type']) => {
    switch (type) {
      case 'success':
        return {
          icon: 'check_circle',
          bg: 'bg-emerald-50 border-emerald-300 text-emerald-800',
          iconColor: 'text-emerald-600',
        };
      case 'error':
        return {
          icon: 'error',
          bg: 'bg-rose-50 border-rose-300 text-rose-800',
          iconColor: 'text-rose-600',
        };
      case 'warning':
        return {
          icon: 'warning',
          bg: 'bg-amber-50 border-amber-300 text-amber-800',
          iconColor: 'text-amber-600',
        };
      default:
        return {
          icon: 'info',
          bg: 'bg-blue-50 border-blue-300 text-blue-800',
          iconColor: 'text-blue-600',
        };
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const style = getStyle(toast.type);
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-lg backdrop-blur-md transition-all duration-300 animate-in slide-in-from-bottom-5 ${style.bg}`}
          >
            <span
              className={`material-symbols-outlined text-xl shrink-0 mt-0.5 ${style.iconColor}`}
            >
              {style.icon}
            </span>
            <div className="flex-1 text-xs font-semibold leading-relaxed">
              {toast.message}
            </div>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded-md"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
