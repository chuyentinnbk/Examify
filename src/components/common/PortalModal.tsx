'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

export interface PortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: string;
  icon?: string;
  iconBg?: string;
  maxWidth?: string; // e.g. 'max-w-md', 'max-w-xl', 'max-w-2xl', 'max-w-3xl', 'max-w-4xl'
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export default function PortalModal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  iconBg = 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  maxWidth = 'max-w-xl',
  children,
  footer,
}: PortalModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle ESC key to dismiss
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    },
    [isOpen, onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Lock background scrolling
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen, handleKeyDown]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={`relative w-full ${maxWidth} bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto animate-in zoom-in-95 duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || icon) && (
          <div className="p-4 md:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40 shrink-0 gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {icon && (
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-base shrink-0 ${iconBg}`}
                >
                  <span className="material-symbols-outlined text-lg">{icon}</span>
                </div>
              )}
              <div className="min-w-0 flex-1">
                {typeof title === 'string' ? (
                  <h3 className="font-bold text-sm md:text-base text-slate-900 dark:text-slate-100 truncate">
                    {title}
                  </h3>
                ) : (
                  title
                )}
                {subtitle && (
                  <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors shrink-0 cursor-pointer"
              title="Đóng cửa sổ"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-5 md:p-6 overflow-y-auto flex-1 overscroll-contain">
          {children}
        </div>

        {/* Footer (Optional) */}
        {footer && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-end gap-2 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
