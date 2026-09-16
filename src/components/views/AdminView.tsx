'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store/app-store';
import UserAvatar from '@/components/common/UserAvatar';

interface TeacherItem {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  twoFactorEnabled: boolean;
  status: 'active' | 'suspended';
  tokensUsed: number;
}

interface AuditLogItem {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  resource: string;
  ip: string;
  status: 'success' | 'warning' | 'danger';
}

interface ProviderMultiKeySetting {
  keys: string[];
  maskedKeys: string[];
  model: string;
  baseUrl?: string;
  hasKey: boolean;
  rawMode: boolean;
  rawText: string;
  status: 'idle' | 'testing' | 'success' | 'error';
  statusMsg?: string;
  latencyMs?: number;
}

const initialTeachers: TeacherItem[] = [];
const initialAuditLogs: AuditLogItem[] = [];

export const AdminView: React.FC = () => {
  const { showToast } = useAppStore();
  const [activeTab, setActiveTab] = useState<'teachers' | 'ai-config' | 'audit-logs'>('ai-config');
  const [teachers, setTeachers] = useState<TeacherItem[]>(initialTeachers);
  const [auditLogs] = useState<AuditLogItem[]>(initialAuditLogs);
  const [searchTeacher, setSearchTeacher] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // New Teacher form state
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherEmail, setNewTeacherEmail] = useState('');
  const [newTeacherRole, setNewTeacherRole] = useState('Giáo viên bộ môn');
  const [newTeacherDept, setNewTeacherDept] = useState('Toán - Tin học');

  // AI Settings State
  const [defaultAiProvider, setDefaultAiProvider] = useState('gemini');
  const [dailyTokenLimit, setDailyTokenLimit] = useState(250000);
  const [maxPerRequest, setMaxPerRequest] = useState(8000);
  const [temperature, setTemperature] = useState(0.2);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isSavingAiSettings, setIsSavingAiSettings] = useState(false);

  // Multi-Key Provider states
  const [geminiConfig, setGeminiConfig] = useState<ProviderMultiKeySetting>({
    keys: [''],
    maskedKeys: [],
    model: 'gemini-3.6-flash',
    hasKey: false,
    rawMode: false,
    rawText: '',
    status: 'idle',
  });

  const [openaiConfig, setOpenaiConfig] = useState<ProviderMultiKeySetting>({
    keys: [''],
    maskedKeys: [],
    model: 'gpt-4o-mini',
    hasKey: false,
    rawMode: false,
    rawText: '',
    status: 'idle',
  });

  const [claudeConfig, setClaudeConfig] = useState<ProviderMultiKeySetting>({
    keys: [''],
    maskedKeys: [],
    model: 'claude-3-5-sonnet-20241022',
    hasKey: false,
    rawMode: false,
    rawText: '',
    status: 'idle',
  });

  const [selfHostedConfig, setSelfHostedConfig] = useState<ProviderMultiKeySetting>({
    keys: ['ollama'],
    maskedKeys: ['ollama'],
    baseUrl: 'http://localhost:11434/v1',
    model: 'llama3:8b',
    hasKey: true,
    rawMode: false,
    rawText: 'ollama',
    status: 'idle',
  });

  // State to toggle password visibility per input
  const [visibleKeyIndexes, setVisibleKeyIndexes] = useState<Record<string, boolean>>({});

  const toggleKeyVisibility = (keyId: string) => {
    setVisibleKeyIndexes((prev) => ({ ...prev, [keyId]: !prev[keyId] }));
  };

  // Fetch AI settings on mount
  const fetchAiSettings = async () => {
    setIsLoadingSettings(true);
    try {
      const res = await fetch('/api/v1/ai/settings');
      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        if (d.defaultProvider) setDefaultAiProvider(d.defaultProvider);
        if (d.dailyTokenLimit) setDailyTokenLimit(d.dailyTokenLimit);
        if (d.maxPerRequest) setMaxPerRequest(d.maxPerRequest);
        if (d.temperature !== undefined) setTemperature(d.temperature);

        if (d.providers?.gemini) {
          const mKeys = d.providers.gemini.maskedKeys || (d.providers.gemini.maskedKey ? [d.providers.gemini.maskedKey] : []);
          setGeminiConfig((prev) => ({
            ...prev,
            hasKey: d.providers.gemini.hasKey,
            maskedKeys: mKeys,
            keys: prev.keys.filter(Boolean).length > 0 ? prev.keys : mKeys.length > 0 ? mKeys.map(() => '') : [''],
            model: d.providers.gemini.currentModel || 'gemini-3.6-flash',
          }));
        }

        if (d.providers?.openai) {
          const mKeys = d.providers.openai.maskedKeys || (d.providers.openai.maskedKey ? [d.providers.openai.maskedKey] : []);
          setOpenaiConfig((prev) => ({
            ...prev,
            hasKey: d.providers.openai.hasKey,
            maskedKeys: mKeys,
            keys: prev.keys.filter(Boolean).length > 0 ? prev.keys : mKeys.length > 0 ? mKeys.map(() => '') : [''],
            model: d.providers.openai.currentModel || 'gpt-4o-mini',
          }));
        }

        if (d.providers?.claude) {
          const mKeys = d.providers.claude.maskedKeys || (d.providers.claude.maskedKey ? [d.providers.claude.maskedKey] : []);
          setClaudeConfig((prev) => ({
            ...prev,
            hasKey: d.providers.claude.hasKey,
            maskedKeys: mKeys,
            keys: prev.keys.filter(Boolean).length > 0 ? prev.keys : mKeys.length > 0 ? mKeys.map(() => '') : [''],
            model: d.providers.claude.currentModel || 'claude-3-5-sonnet-20241022',
          }));
        }

        if (d.providers?.['self-hosted']) {
          setSelfHostedConfig((prev) => ({
            ...prev,
            hasKey: d.providers['self-hosted'].hasKey,
            maskedKeys: [d.providers['self-hosted'].maskedKey || 'ollama'],
            baseUrl: d.providers['self-hosted'].baseUrl || 'http://localhost:11434/v1',
            model: d.providers['self-hosted'].currentModel || 'llama3:8b',
          }));
        }
      }
    } catch {
      // Ignored
    } finally {
      setIsLoadingSettings(false);
    }
  };

  useEffect(() => {
    fetchAiSettings();
  }, []);

  // Multi-key helpers
  const handleAddKey = (
    setter: React.Dispatch<React.SetStateAction<ProviderMultiKeySetting>>
  ) => {
    setter((prev) => ({
      ...prev,
      keys: [...prev.keys, ''],
    }));
  };

  const handleRemoveKey = (
    index: number,
    setter: React.Dispatch<React.SetStateAction<ProviderMultiKeySetting>>
  ) => {
    setter((prev) => {
      const nextKeys = prev.keys.filter((_, i) => i !== index);
      const nextMasked = prev.maskedKeys.filter((_, i) => i !== index);
      return {
        ...prev,
        keys: nextKeys.length > 0 ? nextKeys : [''],
        maskedKeys: nextMasked,
      };
    });
  };

  const handleKeyChange = (
    index: number,
    value: string,
    setter: React.Dispatch<React.SetStateAction<ProviderMultiKeySetting>>
  ) => {
    setter((prev) => {
      const nextKeys = [...prev.keys];
      nextKeys[index] = value;
      return {
        ...prev,
        keys: nextKeys,
      };
    });
  };

  // Test single key or full pool
  const handleTestConnection = async (
    provider: 'gemini' | 'openai' | 'claude' | 'self-hosted',
    config: ProviderMultiKeySetting,
    setter: React.Dispatch<React.SetStateAction<ProviderMultiKeySetting>>,
    testKeyOverride?: string
  ) => {
    setter((prev) => ({ ...prev, status: 'testing', statusMsg: 'Đang kiểm tra kết nối API & KeyPool...' }));

    const keysToTest = testKeyOverride
      ? testKeyOverride
      : config.rawMode
      ? config.rawText
      : config.keys.filter(Boolean).length > 0
      ? config.keys.filter(Boolean).join(', ')
      : config.hasKey
      ? undefined
      : '';

    try {
      const res = await fetch('/api/v1/setup/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'ai',
          config: {
            provider,
            apiKey: keysToTest,
            model: config.model,
            baseURL: config.baseUrl,
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        setter((prev) => ({
          ...prev,
          status: 'success',
          statusMsg: data.message || `Kết nối ${provider.toUpperCase()} thành công!`,
          latencyMs: data.data?.latencyMs,
          hasKey: true,
        }));
        showToast(`Kết nối ${provider.toUpperCase()} thành công (${data.data?.latencyMs || 0}ms)!`, 'success');
      } else {
        setter((prev) => ({
          ...prev,
          status: 'error',
          statusMsg: data.error || 'Xác thực API thất bại. Vui lòng kiểm tra lại Token/Key.',
        }));
        showToast(`Lỗi kết nối ${provider.toUpperCase()}: ${data.error}`, 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setter((prev) => ({ ...prev, status: 'error', statusMsg: `Không thể kết nối: ${msg}` }));
      showToast(`Không thể kết nối: ${msg}`, 'error');
    }
  };

  const handleSaveAiSettings = async () => {
    setIsSavingAiSettings(true);
    try {
      const payload: Record<string, any> = {
        defaultProvider: defaultAiProvider,
        dailyTokenLimit,
        maxPerRequest,
        temperature,
      };

      // Gemini
      if (geminiConfig.rawMode && geminiConfig.rawText) {
        payload.geminiApiKey = geminiConfig.rawText;
      } else {
        const validKeys = geminiConfig.keys.filter((k) => k && k.trim().length > 0);
        if (validKeys.length > 0) payload.geminiApiKeys = validKeys;
      }
      if (geminiConfig.model) payload.geminiModel = geminiConfig.model;

      // OpenAI
      if (openaiConfig.rawMode && openaiConfig.rawText) {
        payload.openaiApiKey = openaiConfig.rawText;
      } else {
        const validKeys = openaiConfig.keys.filter((k) => k && k.trim().length > 0);
        if (validKeys.length > 0) payload.openaiApiKeys = validKeys;
      }
      if (openaiConfig.model) payload.openaiModel = openaiConfig.model;

      // Claude
      if (claudeConfig.rawMode && claudeConfig.rawText) {
        payload.claudeApiKey = claudeConfig.rawText;
      } else {
        const validKeys = claudeConfig.keys.filter((k) => k && k.trim().length > 0);
        if (validKeys.length > 0) payload.claudeApiKeys = validKeys;
      }
      if (claudeConfig.model) payload.claudeModel = claudeConfig.model;

      // Self-Hosted
      if (selfHostedConfig.baseUrl) payload.selfHostedBaseUrl = selfHostedConfig.baseUrl;
      if (selfHostedConfig.keys[0]) payload.selfHostedApiKey = selfHostedConfig.keys[0];
      if (selfHostedConfig.model) payload.selfHostedModel = selfHostedConfig.model;

      const res = await fetch('/api/v1/ai/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        showToast('Đã lưu cấu hình Multi-API Keys thành công!', 'success');
        fetchAiSettings();
      } else {
        showToast(`Lỗi lưu cấu hình: ${data.error}`, 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Lỗi khi lưu: ${msg}`, 'error');
    } finally {
      setIsSavingAiSettings(false);
    }
  };

  const handleAddTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherName || !newTeacherEmail) {
      showToast('Vui lòng nhập họ tên và email giáo viên', 'warning');
      return;
    }

    const newTeacher: TeacherItem = {
      id: `GV-00${teachers.length + 1}`,
      name: newTeacherName,
      email: newTeacherEmail,
      role: newTeacherRole,
      department: newTeacherDept,
      twoFactorEnabled: false,
      status: 'active',
      tokensUsed: 0,
    };

    setTeachers([newTeacher, ...teachers]);
    showToast(`Đã cấp tài khoản khảo thí cho ${newTeacherName}`, 'success');
    setShowAddModal(false);
    setNewTeacherName('');
    setNewTeacherEmail('');
  };

  const handleToggleStatus = (id: string) => {
    setTeachers((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, status: t.status === 'active' ? 'suspended' : 'active' }
          : t
      )
    );
    showToast('Đã cập nhật trạng thái hoạt động tài khoản', 'info');
  };

  const filteredTeachers = teachers.filter(
    (t) =>
      t.name.toLowerCase().includes(searchTeacher.toLowerCase()) ||
      t.email.toLowerCase().includes(searchTeacher.toLowerCase()) ||
      t.department.toLowerCase().includes(searchTeacher.toLowerCase())
  );

  return (
    <div className="view-container flex flex-col w-full pb-16">
      {/* Title & Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 text-xs font-bold uppercase tracking-wider mb-1.5">
            <span className="material-symbols-outlined text-sm">admin_panel_settings</span>
            <span>Quản Trị Hệ Thống Khảo Thí</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">
            Bảng Điều Khiển Quản Trị & Multi-API Key Pool (Admin Console)
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Quản trị giáo viên, xoay tua nhiều Token API Key (Multi-Key Pool) chống nghẽn giới hạn và giám sát toàn hệ thống.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'teachers' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <span className="material-symbols-outlined text-base">person_add</span>
              <span>+ Thêm giáo viên mới</span>
            </button>
          )}
          {activeTab === 'ai-config' && (
            <button
              onClick={handleSaveAiSettings}
              disabled={isSavingAiSettings}
              className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-60"
            >
              <span className={`material-symbols-outlined text-base ${isSavingAiSettings ? 'animate-spin' : ''}`}>
                {isSavingAiSettings ? 'progress_activity' : 'save'}
              </span>
              <span>{isSavingAiSettings ? 'Đang lưu...' : 'Lưu Toàn Bộ Cấu Hình AI'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 Quick Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl">group</span>
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Giáo viên trực thuộc</span>
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100">{teachers.length} Thầy/Cô</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl">sync_saved_locally</span>
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Gemini KeyPool</span>
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {geminiConfig.maskedKeys.length || (geminiConfig.hasKey ? 1 : 0)} Keys Active
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl">verified_user</span>
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Cơ chế Xoay Tua</span>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              Auto Round-Robin
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl">speed</span>
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Mô hình Mặc định</span>
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100 uppercase">
              {defaultAiProvider}
            </div>
          </div>
        </div>
      </div>

      {/* Admin Tabs Container */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Tab Navigation */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 overflow-x-auto">
          <button
            onClick={() => setActiveTab('ai-config')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'ai-config'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <span className="material-symbols-outlined text-sm">tune</span>
            <span>1. Quản Trị Multi-API Key Pool (Edit AI Settings)</span>
          </button>
          <button
            onClick={() => setActiveTab('teachers')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'teachers'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <span className="material-symbols-outlined text-sm">badge</span>
            <span>2. Danh Sách Giáo Viên ({teachers.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('audit-logs')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'audit-logs'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <span className="material-symbols-outlined text-sm">receipt_long</span>
            <span>3. Nhật Ký Giám Sát Hệ Thống</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6">
          {/* TAB 1: EDIT MULTI-AI SETTINGS */}
          {activeTab === 'ai-config' && (
            <div className="space-y-8 max-w-4xl">
              {/* Header section */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-600">hub</span>
                    <span>Cấu hình Multi-API Key Rotation & Token Pool</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Hỗ trợ thêm <strong>nhiều API Keys</strong> cho mỗi nhà cung cấp. Hệ thống tự động xoay tua (Round-Robin) và chuyển key khi một key chạm hạn mức Rate Limit (429).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fetchAiSettings}
                  disabled={isLoadingSettings}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5"
                >
                  <span className={`material-symbols-outlined text-xs ${isLoadingSettings ? 'animate-spin' : ''}`}>
                    sync
                  </span>
                  <span>Làm mới trạng thái</span>
                </button>
              </div>

              {/* Provider 1: Google Gemini (Multi-Key) */}
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center font-bold text-base shrink-0">
                      G
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          Google Gemini (Khuyên dùng)
                        </span>
                        {defaultAiProvider === 'gemini' && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
                            Mặc định
                          </span>
                        )}
                        {geminiConfig.hasKey ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Multi-Key Pool: {geminiConfig.maskedKeys.length || 1} Key Sẵn sàng
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 text-[10px] font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            Chưa có Token
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Endpoint: generativelanguage.googleapis.com | Hỗ trợ xoay tua nhiều key đồng thời
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDefaultAiProvider('gemini')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        defaultAiProvider === 'gemini'
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 border border-blue-300 dark:border-blue-800'
                          : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      {defaultAiProvider === 'gemini' ? '✓ Đang là mặc định' : 'Đặt làm mặc định'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTestConnection('gemini', geminiConfig, setGeminiConfig)}
                      disabled={geminiConfig.status === 'testing'}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-black dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1 transition-all disabled:opacity-50"
                    >
                      <span className={`material-symbols-outlined text-xs ${geminiConfig.status === 'testing' ? 'animate-spin' : ''}`}>
                        {geminiConfig.status === 'testing' ? 'progress_activity' : 'network_ping'}
                      </span>
                      <span>{geminiConfig.status === 'testing' ? 'Đang test...' : 'Test Toàn Pool'}</span>
                    </button>
                  </div>
                </div>

                {/* Model selector & Mode toggle */}
                <div className="flex items-center justify-between gap-4 pt-1">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Model Gemini:</label>
                    <select
                      value={geminiConfig.model}
                      onChange={(e) => setGeminiConfig({ ...geminiConfig, model: e.target.value })}
                      className="h-8 px-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                    >
                      <option value="gemini-3.6-flash">gemini-3.6-flash (Mới & Tối ưu)</option>
                      <option value="gemini-3.7-flash">gemini-3.7-flash (Suy luận nâng cao)</option>
                      <option value="gemini-3.5-flash">gemini-3.5-flash</option>
                      <option value="gemini-1.5-pro">gemini-1.5-pro</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => setGeminiConfig({ ...geminiConfig, rawMode: !geminiConfig.rawMode })}
                    className="text-[11px] text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-xs">code</span>
                    <span>{geminiConfig.rawMode ? 'Chuyển sang dạng Danh sách Key' : 'Nhập nhanh dạng chuỗi (Raw Text)'}</span>
                  </button>
                </div>

                {/* Keys List (Multi-Key input fields) */}
                {!geminiConfig.rawMode ? (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <span>Danh sách API Keys trong Pool ({geminiConfig.keys.length} Keys):</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAddKey(setGeminiConfig)}
                        className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 text-[11px] font-bold flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-xs">add</span>
                        <span>+ Thêm Key vào Pool</span>
                      </button>
                    </div>

                    {geminiConfig.keys.map((k, idx) => {
                      const maskedVal = geminiConfig.maskedKeys[idx];
                      const keyId = `gemini_${idx}`;
                      const isVisible = visibleKeyIndexes[keyId];

                      return (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-[11px] font-mono font-bold text-slate-400 w-12 shrink-0">
                            Key #{idx + 1}:
                          </span>
                          <div className="relative flex-1">
                            <input
                              type={isVisible ? 'text' : 'password'}
                              value={k}
                              onChange={(e) => handleKeyChange(idx, e.target.value, setGeminiConfig)}
                              placeholder={maskedVal ? `Đang dùng: ${maskedVal} (nhập để thay đổi)` : `Nhập API Key thứ ${idx + 1}...`}
                              className="w-full pr-10 pl-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:bg-white focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                              type="button"
                              onClick={() => toggleKeyVisibility(keyId)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                              <span className="material-symbols-outlined text-sm">
                                {isVisible ? 'visibility_off' : 'visibility'}
                              </span>
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleTestConnection('gemini', geminiConfig, setGeminiConfig, k || maskedVal)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-100 text-xs shrink-0"
                            title="Test riêng Key này"
                          >
                            <span className="material-symbols-outlined text-sm">play_circle</span>
                          </button>

                          {geminiConfig.keys.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveKey(idx, setGeminiConfig)}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs shrink-0"
                              title="Xóa Key này khỏi Pool"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Nhập danh sách Key (mỗi key 1 dòng hoặc cách nhau bằng dấu phẩy):
                    </label>
                    <textarea
                      rows={3}
                      value={geminiConfig.rawText}
                      onChange={(e) => setGeminiConfig({ ...geminiConfig, rawText: e.target.value })}
                      placeholder="AQ.Ab8RN6Je...&#10;AQ.Key2...&#10;AQ.Key3..."
                      className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                    />
                  </div>
                )}

                {geminiConfig.statusMsg && (
                  <div
                    className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                      geminiConfig.status === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : geminiConfig.status === 'error'
                        ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                        : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm shrink-0">
                      {geminiConfig.status === 'success' ? 'check_circle' : geminiConfig.status === 'error' ? 'error' : 'info'}
                    </span>
                    <span>{geminiConfig.statusMsg}</span>
                  </div>
                )}
              </div>

              {/* Provider 2: OpenAI ChatGPT (Multi-Key) */}
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 flex items-center justify-center font-bold text-base shrink-0">
                      OA
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          OpenAI ChatGPT
                        </span>
                        {defaultAiProvider === 'openai' && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
                            Mặc định
                          </span>
                        )}
                        {openaiConfig.hasKey ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Multi-Key Pool: {openaiConfig.maskedKeys.length || 1} Key Sẵn sàng
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 text-[10px] font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            Chưa có Token
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Endpoint: api.openai.com/v1 | Hỗ trợ GPT-4o, GPT-4o-mini, o1-mini
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDefaultAiProvider('openai')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        defaultAiProvider === 'openai'
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 border border-blue-300 dark:border-blue-800'
                          : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      {defaultAiProvider === 'openai' ? '✓ Đang là mặc định' : 'Đặt làm mặc định'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTestConnection('openai', openaiConfig, setOpenaiConfig)}
                      disabled={openaiConfig.status === 'testing'}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-black dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1 transition-all disabled:opacity-50"
                    >
                      <span className={`material-symbols-outlined text-xs ${openaiConfig.status === 'testing' ? 'animate-spin' : ''}`}>
                        {openaiConfig.status === 'testing' ? 'progress_activity' : 'network_ping'}
                      </span>
                      <span>{openaiConfig.status === 'testing' ? 'Đang test...' : 'Test Toàn Pool'}</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 pt-1">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Model OpenAI:</label>
                    <select
                      value={openaiConfig.model}
                      onChange={(e) => setOpenaiConfig({ ...openaiConfig, model: e.target.value })}
                      className="h-8 px-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                    >
                      <option value="gpt-4o-mini">gpt-4o-mini (Nhanh & Rẻ)</option>
                      <option value="gpt-4o">gpt-4o (Đỉnh cao chất lượng)</option>
                      <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
                      <option value="o1-mini">o1-mini (Tư duy toán học)</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => setOpenaiConfig({ ...openaiConfig, rawMode: !openaiConfig.rawMode })}
                    className="text-[11px] text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-xs">code</span>
                    <span>{openaiConfig.rawMode ? 'Chuyển sang dạng Danh sách Key' : 'Nhập nhanh dạng chuỗi (Raw Text)'}</span>
                  </button>
                </div>

                {!openaiConfig.rawMode ? (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <span>Danh sách OpenAI API Keys ({openaiConfig.keys.length} Keys):</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAddKey(setOpenaiConfig)}
                        className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 text-[11px] font-bold flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-xs">add</span>
                        <span>+ Thêm Key vào Pool</span>
                      </button>
                    </div>

                    {openaiConfig.keys.map((k, idx) => {
                      const maskedVal = openaiConfig.maskedKeys[idx];
                      const keyId = `openai_${idx}`;
                      const isVisible = visibleKeyIndexes[keyId];

                      return (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-[11px] font-mono font-bold text-slate-400 w-12 shrink-0">
                            Key #{idx + 1}:
                          </span>
                          <div className="relative flex-1">
                            <input
                              type={isVisible ? 'text' : 'password'}
                              value={k}
                              onChange={(e) => handleKeyChange(idx, e.target.value, setOpenaiConfig)}
                              placeholder={maskedVal ? `Đang dùng: ${maskedVal} (nhập để thay đổi)` : `sk-proj-...`}
                              className="w-full pr-10 pl-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:bg-white focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                              type="button"
                              onClick={() => toggleKeyVisibility(keyId)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                              <span className="material-symbols-outlined text-sm">
                                {isVisible ? 'visibility_off' : 'visibility'}
                              </span>
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleTestConnection('openai', openaiConfig, setOpenaiConfig, k || maskedVal)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-100 text-xs shrink-0"
                            title="Test riêng Key này"
                          >
                            <span className="material-symbols-outlined text-sm">play_circle</span>
                          </button>

                          {openaiConfig.keys.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveKey(idx, setOpenaiConfig)}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs shrink-0"
                              title="Xóa Key này khỏi Pool"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Nhập danh sách Key (mỗi key 1 dòng hoặc cách nhau bằng dấu phẩy):
                    </label>
                    <textarea
                      rows={3}
                      value={openaiConfig.rawText}
                      onChange={(e) => setOpenaiConfig({ ...openaiConfig, rawText: e.target.value })}
                      placeholder="sk-proj-key1...&#10;sk-proj-key2..."
                      className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                    />
                  </div>
                )}

                {openaiConfig.statusMsg && (
                  <div
                    className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                      openaiConfig.status === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : openaiConfig.status === 'error'
                        ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                        : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm shrink-0">
                      {openaiConfig.status === 'success' ? 'check_circle' : openaiConfig.status === 'error' ? 'error' : 'info'}
                    </span>
                    <span>{openaiConfig.statusMsg}</span>
                  </div>
                )}
              </div>

              {/* Provider 3: Anthropic Claude (Multi-Key) */}
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 flex items-center justify-center font-bold text-base shrink-0">
                      C
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          Anthropic Claude
                        </span>
                        {defaultAiProvider === 'claude' && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
                            Mặc định
                          </span>
                        )}
                        {claudeConfig.hasKey ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Multi-Key Pool: {claudeConfig.maskedKeys.length || 1} Key Sẵn sàng
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 text-[10px] font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            Chưa có Token
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Endpoint: api.anthropic.com/v1 | Claude 3.5 Sonnet, Claude 3.5 Haiku
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDefaultAiProvider('claude')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        defaultAiProvider === 'claude'
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 border border-blue-300 dark:border-blue-800'
                          : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      {defaultAiProvider === 'claude' ? '✓ Đang là mặc định' : 'Đặt làm mặc định'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTestConnection('claude', claudeConfig, setClaudeConfig)}
                      disabled={claudeConfig.status === 'testing'}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-black dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1 transition-all disabled:opacity-50"
                    >
                      <span className={`material-symbols-outlined text-xs ${claudeConfig.status === 'testing' ? 'animate-spin' : ''}`}>
                        {claudeConfig.status === 'testing' ? 'progress_activity' : 'network_ping'}
                      </span>
                      <span>{claudeConfig.status === 'testing' ? 'Đang test...' : 'Test Toàn Pool'}</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 pt-1">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Model Claude:</label>
                    <select
                      value={claudeConfig.model}
                      onChange={(e) => setClaudeConfig({ ...claudeConfig, model: e.target.value })}
                      className="h-8 px-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                    >
                      <option value="claude-3-5-sonnet-20241022">claude-3-5-sonnet-20241022</option>
                      <option value="claude-3-5-haiku-20241022">claude-3-5-haiku-20241022</option>
                      <option value="claude-3-opus-20240229">claude-3-opus-20240229</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => setClaudeConfig({ ...claudeConfig, rawMode: !claudeConfig.rawMode })}
                    className="text-[11px] text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-xs">code</span>
                    <span>{claudeConfig.rawMode ? 'Chuyển sang dạng Danh sách Key' : 'Nhập nhanh dạng chuỗi (Raw Text)'}</span>
                  </button>
                </div>

                {!claudeConfig.rawMode ? (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <span>Danh sách Claude API Keys ({claudeConfig.keys.length} Keys):</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAddKey(setClaudeConfig)}
                        className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 text-[11px] font-bold flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-xs">add</span>
                        <span>+ Thêm Key vào Pool</span>
                      </button>
                    </div>

                    {claudeConfig.keys.map((k, idx) => {
                      const maskedVal = claudeConfig.maskedKeys[idx];
                      const keyId = `claude_${idx}`;
                      const isVisible = visibleKeyIndexes[keyId];

                      return (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-[11px] font-mono font-bold text-slate-400 w-12 shrink-0">
                            Key #{idx + 1}:
                          </span>
                          <div className="relative flex-1">
                            <input
                              type={isVisible ? 'text' : 'password'}
                              value={k}
                              onChange={(e) => handleKeyChange(idx, e.target.value, setClaudeConfig)}
                              placeholder={maskedVal ? `Đang dùng: ${maskedVal} (nhập để thay đổi)` : `sk-ant-api03-...`}
                              className="w-full pr-10 pl-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:bg-white focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                              type="button"
                              onClick={() => toggleKeyVisibility(keyId)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                              <span className="material-symbols-outlined text-sm">
                                {isVisible ? 'visibility_off' : 'visibility'}
                              </span>
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleTestConnection('claude', claudeConfig, setClaudeConfig, k || maskedVal)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-100 text-xs shrink-0"
                            title="Test riêng Key này"
                          >
                            <span className="material-symbols-outlined text-sm">play_circle</span>
                          </button>

                          {claudeConfig.keys.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveKey(idx, setClaudeConfig)}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs shrink-0"
                              title="Xóa Key này khỏi Pool"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Nhập danh sách Key (mỗi key 1 dòng hoặc cách nhau bằng dấu phẩy):
                    </label>
                    <textarea
                      rows={3}
                      value={claudeConfig.rawText}
                      onChange={(e) => setClaudeConfig({ ...claudeConfig, rawText: e.target.value })}
                      placeholder="sk-ant-key1...&#10;sk-ant-key2..."
                      className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                    />
                  </div>
                )}

                {claudeConfig.statusMsg && (
                  <div
                    className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                      claudeConfig.status === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : claudeConfig.status === 'error'
                        ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                        : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm shrink-0">
                      {claudeConfig.status === 'success' ? 'check_circle' : claudeConfig.status === 'error' ? 'error' : 'info'}
                    </span>
                    <span>{claudeConfig.statusMsg}</span>
                  </div>
                )}
              </div>

              {/* Provider 4: Local AI / Ollama / Self-Hosted */}
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 flex items-center justify-center font-bold text-base shrink-0">
                      OL
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          Self-Hosted / Ollama / Local MCP
                        </span>
                        {defaultAiProvider === 'self-hosted' && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
                            Mặc định
                          </span>
                        )}
                        {selfHostedConfig.hasKey ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Đã cấu hình Endpoint
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 text-[10px] font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            Chưa có Endpoint
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Chạy mô hình nội bộ trên máy chủ trường học (vLLM, Ollama, DeepSeek R1, Llama 3)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDefaultAiProvider('self-hosted')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        defaultAiProvider === 'self-hosted'
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 border border-blue-300 dark:border-blue-800'
                          : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      {defaultAiProvider === 'self-hosted' ? '✓ Đang là mặc định' : 'Đặt làm mặc định'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTestConnection('self-hosted', selfHostedConfig, setSelfHostedConfig)}
                      disabled={selfHostedConfig.status === 'testing'}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-black dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1 transition-all disabled:opacity-50"
                    >
                      <span className={`material-symbols-outlined text-xs ${selfHostedConfig.status === 'testing' ? 'animate-spin' : ''}`}>
                        {selfHostedConfig.status === 'testing' ? 'progress_activity' : 'network_ping'}
                      </span>
                      <span>{selfHostedConfig.status === 'testing' ? 'Đang test...' : 'Test Kết Nối'}</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Base URL</label>
                    <input
                      type="text"
                      value={selfHostedConfig.baseUrl}
                      onChange={(e) => setSelfHostedConfig({ ...selfHostedConfig, baseUrl: e.target.value })}
                      placeholder="http://localhost:11434/v1"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:bg-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex justify-between">
                      <span>API Token (Tùy chọn)</span>
                    </label>
                    <input
                      type="password"
                      value={selfHostedConfig.keys[0] || ''}
                      onChange={(e) => handleKeyChange(0, e.target.value, setSelfHostedConfig)}
                      placeholder="ollama"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:bg-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Model Name</label>
                    <input
                      type="text"
                      value={selfHostedConfig.model}
                      onChange={(e) => setSelfHostedConfig({ ...selfHostedConfig, model: e.target.value })}
                      placeholder="llama3:8b, qwen2.5:7b, deepseek-r1:8b"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:bg-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {selfHostedConfig.statusMsg && (
                  <div
                    className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                      selfHostedConfig.status === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : selfHostedConfig.status === 'error'
                        ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                        : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm shrink-0">
                      {selfHostedConfig.status === 'success' ? 'check_circle' : selfHostedConfig.status === 'error' ? 'error' : 'info'}
                    </span>
                    <span>{selfHostedConfig.statusMsg}</span>
                  </div>
                )}
              </div>

              {/* Section 2: Quota & Generation Parameters */}
              <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-600">tune</span>
                    <span>Hạn Mức & Tham Số AI Generator Toàn Trường</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Kiểm soát lưu lượng gọi mô hình ngôn ngữ lớn (LLMs), tối ưu chi phí và tính nhất quán của ma trận đề thi.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 bg-white dark:bg-slate-900/60">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Hạn mức Token Hằng Ngày (Quota/day)
                      </label>
                      <span className="text-xs font-mono font-bold text-blue-600">
                        {dailyTokenLimit.toLocaleString()} tokens
                      </span>
                    </div>
                    <input
                      type="range"
                      min="50000"
                      max="1000000"
                      step="25000"
                      value={dailyTokenLimit}
                      onChange={(e) => setDailyTokenLimit(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <p className="text-[11px] text-slate-500">
                      Khi vượt quá ngưỡng này, hệ thống sẽ chuyển sang chế độ dự phòng bộ đề mẫu sẵn có.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 bg-white dark:bg-slate-900/60">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Token Tối Đa / Mỗi Lần Sinh Đề
                      </label>
                      <span className="text-xs font-mono font-bold text-blue-600">
                        {maxPerRequest.toLocaleString()} tokens
                      </span>
                    </div>
                    <input
                      type="range"
                      min="2000"
                      max="16000"
                      step="1000"
                      value={maxPerRequest}
                      onChange={(e) => setMaxPerRequest(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <p className="text-[11px] text-slate-500">
                      Phù hợp cho đề 40 - 50 câu trắc nghiệm kèm ma trận Bloom và lời giải chi tiết.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 bg-white dark:bg-slate-900/60">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Độ sáng tạo mô hình (Temperature: {temperature})
                    </label>
                    <span className="text-xs font-medium text-slate-500">
                      {temperature <= 0.2 ? 'Chuẩn mực & Khách quan (Khuyên dùng)' : 'Linh hoạt & Đa dạng'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="1.0"
                    step="0.05"
                    value={temperature}
                    onChange={(e) => setTemperature(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <p className="text-[11px] text-slate-500">
                    Đối với đề thi trắc nghiệm Toán, Lý, Hóa, khuyến nghị giữ nhiệt độ từ 0.1 đến 0.25 để đảm bảo đáp án chính xác tuyệt đối.
                  </p>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    onClick={handleSaveAiSettings}
                    disabled={isSavingAiSettings}
                    className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-md transition-all flex items-center gap-2 disabled:opacity-60"
                  >
                    <span className={`material-symbols-outlined text-base ${isSavingAiSettings ? 'animate-spin' : ''}`}>
                      {isSavingAiSettings ? 'progress_activity' : 'save'}
                    </span>
                    <span>{isSavingAiSettings ? 'Đang lưu cấu hình...' : 'Lưu Toàn Bộ Multi-API Key Pool'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TEACHERS LIST */}
          {activeTab === 'teachers' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                    search
                  </span>
                  <input
                    type="text"
                    value={searchTeacher}
                    onChange={(e) => setSearchTeacher(e.target.value)}
                    placeholder="Tìm giáo viên theo tên, email, tổ bộ môn..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Hiển thị {filteredTeachers.length} / {teachers.length} tài khoản
                </span>
              </div>

              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="p-3">Giáo Viên / Mã số</th>
                      <th className="p-3">Tổ bộ môn & Chức vụ</th>
                      <th className="p-3">Bảo mật 2FA</th>
                      <th className="p-3">Tokens Đã dùng</th>
                      <th className="p-3">Trạng thái</th>
                      <th className="p-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredTeachers.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            <UserAvatar
                              name={t.name}
                              email={t.email}
                              size="sm"
                              rounded="rounded-full"
                              defaultType="identicon"
                            />
                            <div>
                              <div className="font-bold text-slate-900 dark:text-slate-100">{t.name}</div>
                              <div className="text-[11px] text-slate-400">{t.email} • {t.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-medium text-slate-800 dark:text-slate-200">{t.role}</div>
                          <div className="text-[11px] text-slate-400">{t.department}</div>
                        </td>
                        <td className="p-3">
                          {t.twoFactorEnabled ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold">
                              <span className="material-symbols-outlined text-xs">check_circle</span>
                              Đã kích hoạt
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 text-[11px] font-semibold">
                              <span className="material-symbols-outlined text-xs">warning</span>
                              Chưa bật
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-mono font-medium text-slate-700 dark:text-slate-300">
                          {t.tokensUsed.toLocaleString()}
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              t.status === 'active'
                                ? 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                                : 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300'
                            }`}
                          >
                            {t.status === 'active' ? 'Đang hoạt động' : 'Tạm khóa'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleToggleStatus(t.id)}
                              title={t.status === 'active' ? 'Khóa tài khoản' : 'Kích hoạt lại'}
                              className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                            >
                              <span className="material-symbols-outlined text-sm">
                                {t.status === 'active' ? 'block' : 'lock_open'}
                              </span>
                            </button>
                            <button
                              onClick={() => showToast(`Đã gửi email khôi phục mật khẩu tới ${t.email}`, 'info')}
                              title="Gửi link reset mật khẩu"
                              className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                            >
                              <span className="material-symbols-outlined text-sm">lock_reset</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredTeachers.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400">
                          <span className="material-symbols-outlined text-3xl mb-1 block">group_off</span>
                          <span>Chưa có tài khoản giáo viên nào. Bấm &quot;+ Thêm giáo viên mới&quot; để tạo.</span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: AUDIT LOGS */}
          {activeTab === 'audit-logs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Nhật Ký Truy Vết Hành Động (Audit Trail)
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Ghi nhận tự động theo chuẩn ISO/IEC 27001
                </span>
              </div>

              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="p-3">Thời gian</th>
                      <th className="p-3">Người thực hiện</th>
                      <th className="p-3">Hành động</th>
                      <th className="p-3">Đối tượng tác động</th>
                      <th className="p-3">IP Nguồn</th>
                      <th className="p-3 text-right">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="p-3 font-sans text-slate-500 text-[11px] whitespace-nowrap">
                          {log.timestamp}
                        </td>
                        <td className="p-3 font-medium text-slate-900 dark:text-slate-100 font-sans">
                          {log.actor}
                        </td>
                        <td className="p-3 font-sans font-semibold text-slate-800 dark:text-slate-200">
                          {log.action}
                        </td>
                        <td className="p-3 font-sans text-slate-600 dark:text-slate-400 truncate max-w-xs">
                          {log.resource}
                        </td>
                        <td className="p-3 text-slate-500 text-[11px]">{log.ip}</td>
                        <td className="p-3 text-right font-sans">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              log.status === 'success'
                                ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                                : log.status === 'warning'
                                ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300'
                                : 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400 font-sans">
                          <span className="material-symbols-outlined text-3xl mb-1 block">receipt_long</span>
                          <span>Chưa có nhật ký kiểm toán nào được ghi nhận.</span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Teacher Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">person_add</span>
                </div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  Cấp Tài Khoản Giáo Viên Mới
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleAddTeacher} className="p-5 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Họ và tên giáo viên</label>
                <input
                  type="text"
                  required
                  value={newTeacherName}
                  onChange={(e) => setNewTeacherName(e.target.value)}
                  placeholder="Ví dụ: ThS. Lê Văn Bình"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Email công vụ / Nhà trường</label>
                <input
                  type="email"
                  required
                  value={newTeacherEmail}
                  onChange={(e) => setNewTeacherEmail(e.target.value)}
                  placeholder="binh.le@spt.edu.vn"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Chức vụ / Quyền</label>
                  <select
                    value={newTeacherRole}
                    onChange={(e) => setNewTeacherRole(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Giáo viên bộ môn">Giáo viên bộ môn</option>
                    <option value="Tổ trưởng chuyên môn">Tổ trưởng chuyên môn</option>
                    <option value="Hội đồng Khảo thí">Hội đồng Khảo thí</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Tổ bộ môn</label>
                  <select
                    value={newTeacherDept}
                    onChange={(e) => setNewTeacherDept(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Toán - Tin học">Toán - Tin học</option>
                    <option value="KHTN (Lý - Hóa - Sinh)">KHTN (Lý - Hóa - Sinh)</option>
                    <option value="KHXH (Sử - Địa - GDCD)">KHXH (Sử - Địa - GDCD)</option>
                    <option value="Ngoại ngữ">Ngoại ngữ</option>
                    <option value="Ngữ văn">Ngữ văn</option>
                  </select>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-[11px] text-blue-700 dark:text-blue-300 flex items-start gap-2">
                <span className="material-symbols-outlined text-sm mt-0.5 shrink-0">info</span>
                <span>Hệ thống sẽ gửi email chứa mật khẩu tạm thời và hướng dẫn kích hoạt bảo mật 2FA lần đầu cho giáo viên.</span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm"
                >
                  Cấp tài khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminView;
