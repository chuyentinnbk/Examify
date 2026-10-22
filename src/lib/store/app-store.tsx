'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { GravatarDefault } from '@/lib/gravatar';

export interface ExamMatrix {
  easy: number;
  medium: number;
  hard: number;
  veryHard: number;
}

export interface QuestionOption {
  key: string;
  text: string;
  isCorrect: boolean;
}

export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer' | 'essay';

export interface ExamQuestion {
  id: number | string;
  order: string;
  level: string;
  levelClass?: string;
  topic: string;
  content: string;
  type?: QuestionType | string;
  section?: string;
  options: QuestionOption[];
  points: number;
  correctAnswer: string;
  explanation: string;
  _backupOptions?: QuestionOption[];
  _backupAnswer?: string;
}

export interface ExamItem {
  id: string;
  code?: string;
  title: string;
  subject: string;
  grade: string;
  term: string;
  year: string;
  sessionTitle?: string;
  academicYear?: string;
  sectionTitles?: Record<string, string>;
  sectionDescriptions?: Record<string, string>;
  questionsCount: number;
  duration: number;
  status: 'approved' | 'review' | 'draft';
  statusLabel: string;
  author: string;
  updatedAt: string;
  matrix: ExamMatrix;
  isAiGenerated: boolean;
  department?: string;
  schoolName?: string;
  questions?: ExamQuestion[];
  appliedSkills?: Array<{ id: string; title: string }>;
  customPrompt?: string;
  curriculumMetadata?: any;
  variants?: any[];
}

/**
 * Rút gọn và chuẩn hóa Mã đề thi theo chuẩn kỳ thi Việt Nam (3 chữ số: 101, 102, 134...).
 */
export function formatExamCode(id?: string, code?: string): string {
  if (code && code.trim()) return code.trim();
  if (!id) return '101';
  const cleanId = id.trim();
  // Nếu đã là 3-4 chữ số (ví dụ '101', '134') thì dùng luôn
  if (/^\d{3,4}$/.test(cleanId)) return cleanId;
  // Lấy các chữ số cuối cùng
  const digits = cleanId.replace(/\D/g, '');
  if (digits.length >= 3) {
    return digits.slice(-3);
  }
  if (digits.length > 0) {
    return digits.padStart(3, '1');
  }
  // Băm chuỗi ra số ngẫu nhiên cố định từ 101 đến 999
  let hash = 0;
  for (let i = 0; i < cleanId.length; i++) {
    hash = (hash * 31 + cleanId.charCodeAt(i)) % 900;
  }
  return String(101 + Math.abs(hash));
}

export interface UserProfile {
  id?: string;
  name: string;
  email: string;
  role: string;
  school: string;
  avatarStyle?: GravatarDefault;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

interface AppContextType {
  currentRoute: string;
  setCurrentRoute: (route: string) => void;
  user: UserProfile;
  setUser: (user: UserProfile) => void;
  token: string | null;
  setToken: (token: string | null) => void;
  exams: ExamItem[];
  fetchExams: (authToken?: string) => Promise<void>;
  addExam: (exam: ExamItem) => Promise<void>;
  updateExam: (id: string, updated: Partial<ExamItem>) => Promise<void>;
  deleteExam: (id: string) => Promise<void>;
  activeExam: ExamItem | null;
  setActiveExam: (exam: ExamItem | null) => void;
  toasts: ToastMessage[];
  showToast: (message: string, type?: ToastMessage['type']) => void;
  removeToast: (id: string) => void;
  isSetupRequired: boolean | null;
  setIsSetupRequired: (req: boolean) => void;
  checkSetupStatus: () => Promise<boolean>;
  logout: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentRoute, setCurrentRouteState] = useState<string>('#dashboard');
  const [user, setUser] = useState<UserProfile>({
    name: '',
    email: '',
    role: '',
    school: '',
    avatarStyle: 'identicon',
  });
  const [token, setToken] = useState<string | null>(null);
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [activeExam, setActiveExam] = useState<ExamItem | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isSetupRequired, setIsSetupRequired] = useState<boolean | null>(false);

  const setCurrentRoute = (route: string) => {
    const currentToken = typeof window !== 'undefined' ? localStorage.getItem('examify_token') : null;
    let targetRoute = route;

    // If setup is completed, block navigation to #setup-wizard
    if (targetRoute === '#setup-wizard' && isSetupRequired === false) {
      targetRoute = currentToken ? '#dashboard' : '#login';
    }

    if (!currentToken && targetRoute !== '#setup-wizard' && targetRoute !== '#login' && targetRoute !== '#register') {
      setCurrentRouteState('#login');
      if (typeof window !== 'undefined') {
        window.location.hash = '#login';
      }
      return;
    }
    setCurrentRouteState(targetRoute);
    if (typeof window !== 'undefined') {
      window.location.hash = targetRoute;
    }
  };

  const showToast = (message: string, type: ToastMessage['type'] = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  /**
   * Fetch all exams from database /api/v1/exams
   */
  const fetchExams = async (authToken?: string) => {
    const activeToken =
      authToken || token || (typeof window !== 'undefined' ? localStorage.getItem('examify_token') : null);
    if (!activeToken) return;

    try {
      const res = await fetch('/api/v1/exams', {
        headers: {
          Authorization: `Bearer ${activeToken}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data?.exams)) {
          setExams(data.data.exams);
        }
      }
    } catch (err) {
      console.warn('Error syncing exams from database:', err);
    }
  };

  const addExam = async (exam: ExamItem) => {
    setExams((prev) => [exam, ...prev.filter((e) => e.id !== exam.id)]);
    showToast(`Đã lưu đề thi: "${exam.title}"`, 'success');

    const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('examify_token') : null);
    if (activeToken) {
      try {
        await fetch('/api/v1/exams', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${activeToken}`,
          },
          body: JSON.stringify({
            id: exam.id,
            title: exam.title,
            subject: exam.subject,
            grade: exam.grade,
            term: exam.term,
            duration: exam.duration,
            status: exam.status,
            matrix: exam.matrix,
            department: exam.department,
            schoolName: exam.schoolName,
            sessionTitle: exam.sessionTitle,
            academicYear: exam.academicYear,
            sectionTitles: exam.sectionTitles,
            sectionDescriptions: exam.sectionDescriptions,
            code: exam.code,
            variants: exam.variants,
            questions: exam.questions || [],
          }),
        });
      } catch (err) {
        console.warn('Failed to sync new exam to database:', err);
      }
    }
  };

  const updateExam = async (id: string, updated: Partial<ExamItem>) => {
    setExams((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updated } : item))
    );
    if (activeExam && activeExam.id === id) {
      setActiveExam((prev) => (prev ? { ...prev, ...updated } : null));
    }

    const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('examify_token') : null);
    if (activeToken) {
      try {
        await fetch(`/api/v1/exams/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${activeToken}`,
          },
          body: JSON.stringify(updated),
        });
      } catch (err) {
        console.warn('Failed to update exam in database:', err);
      }
    }
  };

  const deleteExam = async (id: string) => {
    setExams((prev) => prev.filter((item) => item.id !== id));
    showToast('Đã xóa đề thi khỏi hệ thống', 'info');

    const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('examify_token') : null);
    if (activeToken) {
      try {
        await fetch(`/api/v1/exams/${id}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${activeToken}`,
          },
        });
      } catch (err) {
        console.warn('Failed to delete exam from database:', err);
      }
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await fetch('/api/v1/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }).catch(() => null);
      }
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('examify_token');
        localStorage.removeItem('examify_user');
        document.cookie = 'examify_token=; path=/; max-age=0; SameSite=Lax';
      }
      setToken(null);
      setExams([]);
      setActiveExam(null);
      setUser({
        name: '',
        email: '',
        role: '',
        school: '',
        avatarStyle: 'identicon',
      });
      setCurrentRoute('#login');
      showToast('Đã đăng xuất an toàn khỏi hệ thống', 'info');
    }
  };

  const checkSetupStatus = async (): Promise<boolean> => {
    if (typeof window === 'undefined') return false;

    const storedToken = localStorage.getItem('examify_token');
    const storedUser = localStorage.getItem('examify_user');
    const currentHash = window.location.hash;

    // Fast path: If unauthenticated, immediately display login or register without waiting for setup API
    if (!storedToken) {
      setToken(null);
      if (currentHash === '#setup-wizard') {
        try {
          const res = await fetch('/api/v1/setup');
          const data = await res.json();
          const req = !!(data.success && data.data?.setupRequired);
          setIsSetupRequired(req);
          if (req) {
            setCurrentRoute('#setup-wizard');
            return true;
          }
        } catch {
          // ignore
        }
      }
      setIsSetupRequired(false);
      if (currentHash === '#register') {
        setCurrentRoute('#register');
      } else {
        setCurrentRoute('#login');
      }
      return false;
    }

    // Fast restore local user cache so dashboard is visible immediately (0ms)
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        setToken(storedToken);
      } catch {
        // ignore
      }
    }

    // Verify session in background with 4s timeout
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const meRes = await fetch('/api/v1/auth/me', {
        headers: {
          Authorization: `Bearer ${storedToken}`,
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (meRes.ok) {
        const meData = await meRes.json();
        if (meData.success && meData.data?.user) {
          const u = meData.data.user;
          const activeProfile: UserProfile = {
            id: u.id,
            name: u.fullName || u.email.split('@')[0],
            email: u.email,
            role: u.role === 'ADMIN' ? 'Quản trị viên Khảo thí' : 'Giáo viên bộ môn',
            school: u.institutionName || 'Hệ thống Khảo thí Examify',
            avatarStyle: u.avatarStyle || 'identicon',
          };
          setToken(storedToken);
          setUser(activeProfile);
          localStorage.setItem('examify_user', JSON.stringify(activeProfile));

          // Load all exams in background
          fetchExams(storedToken);

          if (!currentHash || currentHash === '#login' || currentHash === '#setup-wizard') {
            setCurrentRoute('#dashboard');
          } else {
            setCurrentRoute(currentHash);
          }
          return false;
        }
      }

      // If token expired or unauthorized
      if (meRes.status === 401 || meRes.status === 403) {
        localStorage.removeItem('examify_token');
        localStorage.removeItem('examify_user');
        setToken(null);
        setCurrentRoute('#login');
      } else {
        fetchExams(storedToken);
      }
    } catch {
      // If network timeout or offline, keep local session and attempt exams fetch
      fetchExams(storedToken);
    }

    return false;
  };

  useEffect(() => {
    // Initial sync with browser hash & local storage
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('examify_token');
      const storedUser = localStorage.getItem('examify_user');
      const cachedSetup = localStorage.getItem('examify_setup_required');

      if (cachedSetup !== null) {
        setIsSetupRequired(cachedSetup === 'true');
      } else if (storedToken) {
        setIsSetupRequired(false);
      }

      const hash = window.location.hash || (storedToken ? '#dashboard' : '#login');

      // Fast restore user profile immediately from local cache so UI renders in 0ms without waiting for network
      if (storedToken) {
        setToken(storedToken);
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch {
            // ignore
          }
        }
        const safeHash = hash === '#setup-wizard' ? '#dashboard' : hash;
        setCurrentRouteState(safeHash);
        if (hash === '#setup-wizard') {
          window.location.hash = '#dashboard';
        }
      } else {
        const safeHash = hash === '#register' ? '#register' : '#login';
        setCurrentRouteState(safeHash);
        if (hash === '#setup-wizard') {
          window.location.hash = '#login';
        }
      }

      const handleHashChange = () => {
        let currentHash = window.location.hash || '#dashboard';
        const currentToken = localStorage.getItem('examify_token');

        if (currentHash === '#setup-wizard' && isSetupRequired === false) {
          currentHash = currentToken ? '#dashboard' : '#login';
          window.location.hash = currentHash;
        }

        if (!currentToken && currentHash !== '#setup-wizard' && currentHash !== '#login' && currentHash !== '#register') {
          setCurrentRouteState('#login');
          window.location.hash = '#login';
          return;
        }
        setCurrentRouteState(currentHash);
      };
      window.addEventListener('hashchange', handleHashChange);

      // Perform background setup check and session validation (once on mount)
      checkSetupStatus();

      return () => {
        window.removeEventListener('hashchange', handleHashChange);
      };
    }
  }, []); // Run only ONCE on mount

  return (
    <AppContext.Provider
      value={{
        currentRoute,
        setCurrentRoute,
        user,
        setUser,
        token,
        setToken,
        exams,
        fetchExams,
        addExam,
        updateExam,
        deleteExam,
        activeExam,
        setActiveExam,
        toasts,
        showToast,
        removeToast,
        isSetupRequired,
        setIsSetupRequired,
        checkSetupStatus,
        logout,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppStore() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppStore must be used within an AppProvider');
  }
  return context;
}
