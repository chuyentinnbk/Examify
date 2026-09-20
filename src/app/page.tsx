'use client';

import React from 'react';
import { AppProvider, useAppStore } from '@/lib/store/app-store';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import ToastContainer from '@/components/layout/Toast';

import DashboardView from '@/components/views/DashboardView';
import CreateExamView from '@/components/views/CreateExamView';
import EditorView from '@/components/views/EditorView';
import ProfileView from '@/components/views/ProfileView';
import AdminView from '@/components/views/AdminView';
import LoginView from '@/components/views/LoginView';
import RegisterView from '@/components/views/RegisterView';
import SetupWizardView from '@/components/views/SetupWizardView';

function AppContent() {
  const { currentRoute, isSetupRequired, token } = useAppStore();

  // If setup status is still being determined, show the smooth centered loading screen
  if (isSetupRequired === null) {
    return (
      <main className="w-full min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center justify-center text-center max-w-sm w-full mx-auto">
          {/* Logo with Glow Effect */}
          <div className="relative w-20 h-20 mb-5 flex items-center justify-center">
            <div className="absolute inset-0 rounded-2xl bg-blue-500/20 blur-xl animate-pulse" />
            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25 text-white">
              <span className="material-symbols-outlined text-3xl">school</span>
            </div>
          </div>

          {/* System Title */}
          <div className="flex items-center justify-center gap-1.5 mb-1.5">
            <span className="text-xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Examify</span>
            <span className="text-xl font-extrabold text-blue-600">AI</span>
            <span className="text-[10px] font-extrabold uppercase bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800 ml-1">
              Beta
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-6">
            Hệ Thống Khảo Thí &amp; Tạo Đề Thi Thông Minh
          </p>

          {/* Indeterminate Progress Track */}
          <div className="w-52 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden relative mb-3">
            <div className="absolute top-0 bottom-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full animate-indeterminate" />
          </div>

          <p className="text-[11px] text-slate-400 font-medium">
            Đang tải dữ liệu cấu hình hệ thống...
          </p>
        </div>
      </main>
    );
  }

  // Full-screen setup view - Only show if setup is strictly required and not yet configured
  if (currentRoute === '#setup-wizard' && isSetupRequired === true) {
    return (
      <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950">
        <SetupWizardView />
        <ToastContainer />
      </div>
    );
  }

  // Registration View: Show RegisterView when route is #register
  if (currentRoute === '#register') {
    return (
      <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <RegisterView />
        <ToastContainer />
      </div>
    );
  }

  // Authentication Guard: If no valid token or route is #login, enforce LoginView
  if (!token || currentRoute === '#login') {
    return (
      <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <LoginView />
        <ToastContainer />
      </div>
    );
  }

  // Active view renderer for dashboard workspace
  const renderActiveView = () => {
    switch (currentRoute) {
      case '#create-exam':
      case '#create':
        return <CreateExamView />;
      case '#editor':
        return <EditorView />;
      case '#profile':
        return <ProfileView />;
      case '#admin':
        return <AdminView />;
      case '#dashboard':
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Global Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="md:pl-64 flex flex-col flex-1 min-w-0 min-h-screen transition-all">
        {/* Global Header */}
        <Header />

        {/* View Body */}
        <main className="flex-1 w-full mt-16 p-4 md:p-6 lg:p-8 flex flex-col">
          <div className="max-w-7xl w-full mx-auto flex-1 flex flex-col">
            {renderActiveView()}
          </div>
        </main>
      </div>

      {/* Dynamic Toast Notifications */}
      <ToastContainer />
    </div>
  );
}

export default function ExamifyApp() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
