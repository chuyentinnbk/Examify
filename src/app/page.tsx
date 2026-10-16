'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { AppProvider, useAppStore } from '@/lib/store/app-store';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import ToastContainer from '@/components/layout/Toast';

// Lightweight auth views loaded eagerly for instantaneous 0ms display
import LoginView from '@/components/views/LoginView';
import RegisterView from '@/components/views/RegisterView';

// Generic Loading Skeleton for dynamic workspace views
function ViewLoadingSkeleton({ title }: { title: string }) {
  return (
    <div className="w-full flex-1 flex flex-col gap-6 animate-pulse p-4">
      <div className="flex items-center gap-3">
        <div className="h-7 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg" />
      </div>
      <div className="h-32 w-full bg-slate-200/80 dark:bg-slate-800/80 rounded-2xl" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="h-28 bg-slate-200/60 dark:bg-slate-800/60 rounded-xl" />
        <div className="h-28 bg-slate-200/60 dark:bg-slate-800/60 rounded-xl" />
        <div className="h-28 bg-slate-200/60 dark:bg-slate-800/60 rounded-xl" />
      </div>
    </div>
  );
}

// Heavy workspace views loaded dynamically on demand to optimize initial page bundle
const DashboardView = dynamic(() => import('@/components/views/DashboardView'), {
  loading: () => <ViewLoadingSkeleton title="Bảng điều khiển" />,
});

const CreateExamView = dynamic(() => import('@/components/views/CreateExamView'), {
  loading: () => <ViewLoadingSkeleton title="Tạo đề thi mới" />,
});

const EditorView = dynamic(() => import('@/components/views/EditorView'), {
  loading: () => <ViewLoadingSkeleton title="Trình soạn thảo đề thi" />,
});

const ProfileView = dynamic(() => import('@/components/views/ProfileView'), {
  loading: () => <ViewLoadingSkeleton title="Hồ sơ cá nhân" />,
});

const AdminView = dynamic(() => import('@/components/views/AdminView'), {
  loading: () => <ViewLoadingSkeleton title="Quản trị hệ thống" />,
});

const AcademicDataView = dynamic(() => import('@/components/views/AcademicDataView'), {
  loading: () => <ViewLoadingSkeleton title="Dữ liệu học thuật" />,
});

const SetupWizardView = dynamic(() => import('@/components/views/SetupWizardView'), {
  loading: () => <ViewLoadingSkeleton title="Cài đặt hệ thống" />,
});

function AppContent() {
  const { currentRoute, isSetupRequired, token } = useAppStore();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Only show setup loading screen if explicitly navigating to setup wizard while checking status
  if (mounted && currentRoute === '#setup-wizard' && isSetupRequired === null) {
    return (
      <main className="w-full min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center justify-center text-center max-w-sm w-full mx-auto">
          <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25 text-white mb-4">
            <span className="material-symbols-outlined text-3xl">school</span>
          </div>
          <div className="w-48 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden relative mb-3">
            <div className="absolute top-0 bottom-0 bg-blue-600 rounded-full animate-indeterminate" />
          </div>
          <p className="text-xs text-slate-400 font-medium">Đang kiểm tra cấu hình hệ thống...</p>
        </div>
      </main>
    );
  }

  // Full-screen setup view - Only show if setup is strictly required and user navigated to #setup-wizard
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

  // Authentication Guard: If no valid token or route is #login, enforce LoginView immediately
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
      case '#academic-data':
      case '#data':
        return <AcademicDataView />;
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
