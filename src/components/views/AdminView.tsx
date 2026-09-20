'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/lib/store/app-store';
import UserAvatar from '@/components/common/UserAvatar';
import PortalModal from '@/components/common/PortalModal';

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

interface LogEntryItem {
  id: string;
  action: string;
  entity: string; // 'INPUT' | 'OUTPUT' | 'SECURITY' | 'SYSTEM' | 'USER'
  entityId?: string | null;
  userId?: string | null;
  user?: {
    fullName?: string;
    email?: string;
    role?: string;
  } | null;
  clientIp?: string | null;
  country?: string | null;
  userAgent?: string | null;
  details?: string | Record<string, unknown> | null;
  createdAt: string;
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

interface CountryInfo {
  code: string;
  name: string;
  flag: string;
}

const COMMON_COUNTRIES: CountryInfo[] = [
  { code: 'VN', name: 'Việt Nam', flag: '🇻🇳' },
  { code: 'US', name: 'Hoa Kỳ (United States)', flag: '🇺🇸' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'JP', name: 'Nhật Bản (Japan)', flag: '🇯🇵' },
  { code: 'KR', name: 'Hàn Quốc (South Korea)', flag: '🇰🇷' },
  { code: 'CN', name: 'Trung Quốc (China)', flag: '🇨🇳' },
  { code: 'RU', name: 'Nga (Russia)', flag: '🇷🇺' },
  { code: 'GB', name: 'Vương Quốc Anh (United Kingdom)', flag: '🇬🇧' },
  { code: 'DE', name: 'Đức (Germany)', flag: '🇩🇪' },
  { code: 'FR', name: 'Pháp (France)', flag: '🇫🇷' },
  { code: 'AU', name: 'Úc (Australia)', flag: '🇦🇺' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'IN', name: 'Ấn Độ (India)', flag: '🇮🇳' },
  { code: 'TH', name: 'Thái Lan (Thailand)', flag: '🇹🇭' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
  { code: 'TW', name: 'Đài Loan (Taiwan)', flag: '🇹🇼' },
  { code: 'HK', name: 'Hồng Kông (Hong Kong)', flag: '🇭🇰' },
];

const initialTeachers: TeacherItem[] = [
  {
    id: 'GV-001',
    name: 'ThS. Nguyễn Văn An',
    email: 'an.nguyen@spt.edu.vn',
    role: 'Tổ trưởng chuyên môn',
    department: 'Toán - Tin học',
    twoFactorEnabled: true,
    status: 'active',
    tokensUsed: 142500,
  },
  {
    id: 'GV-002',
    name: 'Cô Trần Thị Mai',
    email: 'mai.tran@spt.edu.vn',
    role: 'Giáo viên bộ môn',
    department: 'KHTN (Lý - Hóa - Sinh)',
    twoFactorEnabled: false,
    status: 'active',
    tokensUsed: 68400,
  },
  {
    id: 'GV-003',
    name: 'Thầy Lê Hoàng Long',
    email: 'long.le@spt.edu.vn',
    role: 'Hội đồng Khảo thí',
    department: 'Ngoại ngữ',
    twoFactorEnabled: true,
    status: 'active',
    tokensUsed: 312000,
  },
];

export const AdminView: React.FC = () => {
  const { showToast } = useAppStore();
  const [activeTab, setActiveTab] = useState<'ai-config' | 'teachers' | 'audit-logs' | 'security'>('ai-config');
  const [teachers, setTeachers] = useState<TeacherItem[]>(initialTeachers);
  const [searchTeacher, setSearchTeacher] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // New Teacher form state
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherEmail, setNewTeacherEmail] = useState('');
  const [newTeacherPassword, setNewTeacherPassword] = useState('Examify@2026');
  const [showNewTeacherPassword, setShowNewTeacherPassword] = useState(false);
  const [newTeacherRole, setNewTeacherRole] = useState('Giáo viên bộ môn');
  const [newTeacherDept, setNewTeacherDept] = useState('Toán - Tin học');

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    let pwd = 'Ex@';
    for (let i = 0; i < 6; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewTeacherPassword(pwd);
    showToast(`Đã tạo mật khẩu ngẫu nhiên: ${pwd}`, 'info');
  };

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

  const [visibleKeyIndexes, setVisibleKeyIndexes] = useState<Record<string, boolean>>({});

  const toggleKeyVisibility = (keyId: string) => {
    setVisibleKeyIndexes((prev) => ({ ...prev, [keyId]: !prev[keyId] }));
  };

  // --------------------------------------------------------------------------
  // LOGS MANAGEMENT STATE (ALL, INPUT, OUTPUT, SECURITY)
  // --------------------------------------------------------------------------
  const [logCategory, setLogCategory] = useState<'all' | 'input' | 'output' | 'security'>('all');
  const [logSearch, setLogSearch] = useState('');
  const [logsList, setLogsList] = useState<LogEntryItem[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [autoRefreshLogs, setAutoRefreshLogs] = useState(false);
  const [selectedLogDetail, setSelectedLogDetail] = useState<LogEntryItem | null>(null);
  const [logStats, setLogStats] = useState({
    total: 0,
    inputCount: 0,
    outputCount: 0,
    securityCount: 0,
    successCount: 0,
    errorCount: 0,
  });

  // --------------------------------------------------------------------------
  // SECURITY, RATE LIMITING & GEO-BLOCKING STATE
  // --------------------------------------------------------------------------
  const [geoMode, setGeoMode] = useState<'disabled' | 'whitelist' | 'blacklist'>('disabled');
  const [allowedCountries, setAllowedCountries] = useState<string[]>(['VN']);
  const [blockedCountries, setBlockedCountries] = useState<string[]>([]);
  const [ipWhitelistText, setIpWhitelistText] = useState('127.0.0.1\n::1');
  const [ipBlacklistText, setIpBlacklistText] = useState('');
  const [authMaxRequests, setAuthMaxRequests] = useState(20);
  const [apiMaxRequests, setApiMaxRequests] = useState(120);
  const [windowSeconds, setWindowSeconds] = useState(60);
  const [countrySearch, setCountrySearch] = useState('');
  const [isSavingSecurity, setIsSavingSecurity] = useState(false);

  // Simulator
  const [simulatorIp, setSimulatorIp] = useState('127.0.0.1');
  const [simulatorCountry, setSimulatorCountry] = useState('VN');
  const [simulatorResult, setSimulatorResult] = useState<{ isAllowed: boolean; reason?: string; country: string } | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Fetch AI settings
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

  // Fetch Logs
  const fetchLogs = useCallback(async () => {
    setIsLoadingLogs(true);
    try {
      const q = new URLSearchParams();
      if (logCategory !== 'all') q.set('category', logCategory);
      if (logSearch) q.set('search', logSearch);
      q.set('limit', '60');

      const res = await fetch(`/api/v1/admin/logs?${q.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setLogsList(json.data.logs || []);
        if (json.data.stats) {
          setLogStats(json.data.stats);
        }
      }
    } catch (err) {
      console.warn('Could not fetch logs:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  }, [logCategory, logSearch]);

  // Fetch Security & Geo-block settings
  const fetchSecuritySettings = async () => {
    try {
      const res = await fetch('/api/v1/admin/security');
      const json = await res.json();
      if (json.success && json.data) {
        const { geoBlocking, rateLimiting } = json.data;
        if (geoBlocking) {
          setGeoMode(geoBlocking.mode || 'disabled');
          setAllowedCountries(geoBlocking.allowedCountries || ['VN']);
          setBlockedCountries(geoBlocking.blockedCountries || []);
          setIpWhitelistText((geoBlocking.ipWhitelist || []).join('\n'));
          setIpBlacklistText((geoBlocking.ipBlacklist || []).join('\n'));
        }
        if (rateLimiting) {
          setAuthMaxRequests(rateLimiting.authMaxRequests || 20);
          setApiMaxRequests(rateLimiting.apiMaxRequests || 120);
          setWindowSeconds(rateLimiting.windowSeconds || 60);
        }
      }
    } catch (err) {
      console.warn('Could not fetch security settings:', err);
    }
  };

  useEffect(() => {
    fetchAiSettings();
    fetchSecuritySettings();
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (!autoRefreshLogs) return;
    const interval = setInterval(() => {
      fetchLogs();
    }, 4000);
    return () => clearInterval(interval);
  }, [autoRefreshLogs, fetchLogs]);

  // Multi-key helpers
  const handleAddKey = (setter: React.Dispatch<React.SetStateAction<ProviderMultiKeySetting>>) => {
    setter((prev) => ({
      ...prev,
      keys: [...prev.keys, ''],
    }));
  };

  const handleRemoveKey = (index: number, setter: React.Dispatch<React.SetStateAction<ProviderMultiKeySetting>>) => {
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

  const handleKeyChange = (index: number, value: string, setter: React.Dispatch<React.SetStateAction<ProviderMultiKeySetting>>) => {
    setter((prev) => {
      const nextKeys = [...prev.keys];
      nextKeys[index] = value;
      return {
        ...prev,
        keys: nextKeys,
      };
    });
  };

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

      if (geminiConfig.rawMode && geminiConfig.rawText) {
        payload.geminiApiKey = geminiConfig.rawText;
      } else {
        const validKeys = geminiConfig.keys.filter((k) => k && k.trim().length > 0);
        if (validKeys.length > 0) payload.geminiApiKeys = validKeys;
      }
      if (geminiConfig.model) payload.geminiModel = geminiConfig.model;

      if (openaiConfig.rawMode && openaiConfig.rawText) {
        payload.openaiApiKey = openaiConfig.rawText;
      } else {
        const validKeys = openaiConfig.keys.filter((k) => k && k.trim().length > 0);
        if (validKeys.length > 0) payload.openaiApiKeys = validKeys;
      }
      if (openaiConfig.model) payload.openaiModel = openaiConfig.model;

      if (claudeConfig.rawMode && claudeConfig.rawText) {
        payload.claudeApiKey = claudeConfig.rawText;
      } else {
        const validKeys = claudeConfig.keys.filter((k) => k && k.trim().length > 0);
        if (validKeys.length > 0) payload.claudeApiKeys = validKeys;
      }
      if (claudeConfig.model) payload.claudeModel = claudeConfig.model;

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

  // Save Security & Geo-blocking settings
  const handleSaveSecuritySettings = async () => {
    setIsSavingSecurity(true);
    try {
      const ipWhitelist = ipWhitelistText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      const ipBlacklist = ipBlacklistText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        geoBlocking: {
          mode: geoMode,
          allowedCountries,
          blockedCountries,
          ipWhitelist,
          ipBlacklist,
        },
        rateLimiting: {
          authMaxRequests,
          apiMaxRequests,
          windowSeconds,
        },
      };

      const res = await fetch('/api/v1/admin/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        showToast('Đã lưu chính sách Geo-Blocking & Rate Limit thành công!', 'success');
        fetchSecuritySettings();
      } else {
        showToast(`Lỗi lưu bảo mật: ${data.error}`, 'error');
      }
    } catch (err: any) {
      showToast(`Lỗi khi lưu: ${err.message}`, 'error');
    } finally {
      setIsSavingSecurity(false);
    }
  };

  // Run Geo-Block Simulator
  const handleRunSimulator = async () => {
    setIsSimulating(true);
    try {
      const ipWhitelist = ipWhitelistText.split('\n').map((s) => s.trim()).filter(Boolean);
      const ipBlacklist = ipBlacklistText.split('\n').map((s) => s.trim()).filter(Boolean);

      const res = await fetch('/api/v1/admin/security', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip: simulatorIp,
          country: simulatorCountry,
          customConfig: {
            mode: geoMode,
            allowedCountries,
            blockedCountries,
            ipWhitelist,
            ipBlacklist,
          },
        }),
      });

      const data = await res.json();
      if (data.success && data.data) {
        setSimulatorResult({
          isAllowed: data.data.isAllowed,
          reason: data.data.reason,
          country: data.data.testCountry,
        });
      }
    } catch (err: any) {
      showToast(`Lỗi simulator: ${err.message}`, 'error');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleToggleCountry = (code: string, listType: 'allowed' | 'blocked') => {
    if (listType === 'allowed') {
      if (allowedCountries.includes(code)) {
        setAllowedCountries(allowedCountries.filter((c) => c !== code));
      } else {
        setAllowedCountries([...allowedCountries, code]);
      }
    } else {
      if (blockedCountries.includes(code)) {
        setBlockedCountries(blockedCountries.filter((c) => c !== code));
      } else {
        setBlockedCountries([...blockedCountries, code]);
      }
    }
  };

  // --------------------------------------------------------------------------
  // TEACHERS MANAGEMENT WITH REAL API
  // --------------------------------------------------------------------------
  const [isLoadingTeachers, setIsLoadingTeachers] = useState(false);

  const fetchTeachers = useCallback(async () => {
    setIsLoadingTeachers(true);
    try {
      const res = await fetch('/api/v1/admin/teachers');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setTeachers(data.data);
      }
    } catch {
      // Fallback in case of network issue
    } finally {
      setIsLoadingTeachers(false);
    }
  }, []);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherName || !newTeacherEmail) {
      showToast('Vui lòng nhập họ tên và email giáo viên', 'warning');
      return;
    }

    if (newTeacherPassword && newTeacherPassword.length < 6) {
      showToast('Mật khẩu khởi tạo phải có ít nhất 6 ký tự', 'warning');
      return;
    }

    try {
      const res = await fetch('/api/v1/admin/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTeacherName,
          email: newTeacherEmail,
          role: newTeacherRole,
          department: newTeacherDept,
          password: newTeacherPassword,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message || `Đã cấp tài khoản cho ${newTeacherName}`, 'success');
        setShowAddModal(false);
        setNewTeacherName('');
        setNewTeacherEmail('');
        setNewTeacherPassword('Examify@2026');
        fetchTeachers();
      } else {
        showToast(data.message || 'Lỗi khi tạo tài khoản', 'error');
      }
    } catch (err: unknown) {
      showToast('Lỗi kết nối: ' + (err instanceof Error ? err.message : String(err)), 'error');
    }
  };

  const handleToggleStatus = async (id: string) => {
    const currentTeacher = teachers.find((t) => t.id === id);
    if (!currentTeacher) return;

    const nextStatus = currentTeacher.status === 'active' ? 'suspended' : 'active';
    try {
      const res = await fetch('/api/v1/admin/teachers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          status: nextStatus,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setTeachers((prev) =>
          prev.map((t) => (t.id === id ? { ...t, status: nextStatus } : t))
        );
        showToast(
          nextStatus === 'active' ? 'Đã kích hoạt lại tài khoản' : 'Đã tạm khóa tài khoản giáo viên',
          'info'
        );
      } else {
        showToast(data.message || 'Lỗi khi cập nhật trạng thái', 'error');
      }
    } catch {
      showToast('Lỗi kết nối khi cập nhật', 'error');
    }
  };

  const filteredTeachers = teachers.filter(
    (t) =>
      t.name.toLowerCase().includes(searchTeacher.toLowerCase()) ||
      t.email.toLowerCase().includes(searchTeacher.toLowerCase()) ||
      t.department.toLowerCase().includes(searchTeacher.toLowerCase())
  );

  const filteredCountries = COMMON_COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
      c.code.toLowerCase().includes(countrySearch.toLowerCase())
  );

  return (
    <div className="view-container flex flex-col w-full pb-16">
      {/* Title & Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 text-xs font-bold uppercase tracking-wider mb-1.5">
            <span className="material-symbols-outlined text-sm">admin_panel_settings</span>
            <span>Trang Quản Trị Hệ Thống Khảo Thí</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">
            Trung Tâm Quản Trị, Nhật Ký Logs & Bảo Mật Khảo Thí
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Giám sát toàn diện Request Đầu vào (INPUT) / Đầu ra (OUTPUT), xoay tua Multi-API Key Pool và phòng chống tấn công với Rate Limit & Geo-Blocking.
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
              <span>{isSavingAiSettings ? 'Đang lưu...' : 'Lưu Cấu Hình Multi-AI Pool'}</span>
            </button>
          )}
          {activeTab === 'security' && (
            <button
              onClick={handleSaveSecuritySettings}
              disabled={isSavingSecurity}
              className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-60"
            >
              <span className={`material-symbols-outlined text-base ${isSavingSecurity ? 'animate-spin' : ''}`}>
                {isSavingSecurity ? 'progress_activity' : 'shield_with_heart'}
              </span>
              <span>{isSavingSecurity ? 'Đang lưu...' : 'Lưu Quy Tắc Geo-Block & Rate Limit'}</span>
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
            <span className="material-symbols-outlined text-2xl">hub</span>
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
            <span className="material-symbols-outlined text-2xl">public</span>
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Geo-Blocking</span>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 capitalize">
              {geoMode === 'disabled' ? 'Tắt (Mở toàn cầu)' : geoMode === 'whitelist' ? 'Whitelist (Chỉ định)' : 'Blacklist (Chặn)'}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl">speed</span>
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Rate Limit Max</span>
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {apiMaxRequests} req/phút
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
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'ai-config'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <span className="material-symbols-outlined text-sm">tune</span>
            <span>1. Multi-API Key Pool (AI Config)</span>
          </button>
          <button
            onClick={() => setActiveTab('teachers')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
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
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'audit-logs'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <span className="material-symbols-outlined text-sm">receipt_long</span>
            <span>3. Nhật Ký Logs (INPUT / OUTPUT / ALL)</span>
            <span className="px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800 text-[10px] font-extrabold ml-0.5">
              {logsList.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'security'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <span className="material-symbols-outlined text-sm">shield</span>
            <span>4. Rate Limit & Geo-Blocking</span>
            {geoMode !== 'disabled' && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
            )}
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6">
          {/* ========================================================================= */}
          {/* TAB 1: EDIT MULTI-AI SETTINGS                                             */}
          {/* ========================================================================= */}
          {activeTab === 'ai-config' && (
            <div className="space-y-8 max-w-4xl">
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

              {/* Gemini Provider */}
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

                {!geminiConfig.rawMode ? (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Danh sách API Keys trong Pool ({geminiConfig.keys.length} Keys):
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

              {/* OpenAI Provider */}
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
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Danh sách OpenAI API Keys ({openaiConfig.keys.length} Keys):
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
                      placeholder="sk-key1...&#10;sk-key2..."
                      className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Quota & Generation Parameters */}
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
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TEACHERS LIST */}
          {activeTab === 'teachers' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3 w-full sm:w-auto flex-1 max-w-md">
                  <div className="relative w-full">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                      search
                    </span>
                    <input
                      type="text"
                      value={searchTeacher}
                      onChange={(e) => setSearchTeacher(e.target.value)}
                      placeholder="Tìm giáo viên theo tên, email, tổ bộ môn..."
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                  <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap font-medium">
                    Hiển thị {filteredTeachers.length} / {teachers.length} tài khoản
                  </span>

                  <button
                    type="button"
                    onClick={() => setShowAddModal(true)}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all shrink-0 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">person_add</span>
                    <span>+ Thêm Giáo Viên</span>
                  </button>
                </div>
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
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: AUDIT LOGS (ALL, INPUT, OUTPUT, SECURITY)                          */}
          {/* ========================================================================= */}
          {activeTab === 'audit-logs' && (
            <div className="space-y-5">
              {/* Header & Category Tabs */}
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-600">receipt_long</span>
                    <span>Trung Tâm Nhật Ký Giám Sát & Truy Vết Hoạt Động</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Lưu trữ Dual-Channel (Disk JSON Winston & MariaDB Database). Hỗ trợ xem chi tiết toàn bộ Request Input & Response Output.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setAutoRefreshLogs(!autoRefreshLogs)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      autoRefreshLogs
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300'
                        : 'border border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${autoRefreshLogs ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                    <span>Auto-Refresh (4s)</span>
                  </button>

                  <button
                    type="button"
                    onClick={fetchLogs}
                    disabled={isLoadingLogs}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition-all"
                  >
                    <span className={`material-symbols-outlined text-xs ${isLoadingLogs ? 'animate-spin' : ''}`}>
                      refresh
                    </span>
                    <span>Làm mới Logs</span>
                  </button>
                </div>
              </div>

              {/* Category Pills: ALL | INPUT | OUTPUT | SECURITY */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
                  <button
                    onClick={() => setLogCategory('all')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      logCategory === 'all'
                        ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">apps</span>
                    <span>ALL (Tất cả logs)</span>
                    <span className="px-1.5 py-0.2 rounded-md bg-slate-200 dark:bg-slate-700 text-[10px]">
                      {logStats.total || logsList.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setLogCategory('input')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      logCategory === 'input'
                        ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">input</span>
                    <span>INPUT (All Requests)</span>
                    <span className="px-1.5 py-0.2 rounded-md bg-blue-100 text-blue-800 text-[10px]">
                      {logStats.inputCount}
                    </span>
                  </button>

                  <button
                    onClick={() => setLogCategory('output')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      logCategory === 'output'
                        ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">output</span>
                    <span>OUTPUT (All Outputs & AI)</span>
                    <span className="px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800 text-[10px]">
                      {logStats.outputCount}
                    </span>
                  </button>

                  <button
                    onClick={() => setLogCategory('security')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      logCategory === 'security'
                        ? 'bg-white dark:bg-slate-900 text-rose-600 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">security</span>
                    <span>SECURITY (Cảnh báo)</span>
                    <span className="px-1.5 py-0.2 rounded-md bg-rose-100 text-rose-800 text-[10px]">
                      {logStats.securityCount}
                    </span>
                  </button>
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-72">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                    search
                  </span>
                  <input
                    type="text"
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    placeholder="Tìm theo Route, IP, Quốc gia, Action..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Logs Table */}
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="p-3">Thời gian</th>
                      <th className="p-3">Loại (Category)</th>
                      <th className="p-3">Hành động / Route Endpoint</th>
                      <th className="p-3">Client IP & Quốc gia</th>
                      <th className="p-3">Tác nhân / User</th>
                      <th className="p-3 text-right">Chi tiết JSON</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                    {logsList.map((log) => {
                      const isInput = log.entity === 'INPUT';
                      const isOutput = log.entity === 'OUTPUT';
                      const isSecurity = log.entity === 'SECURITY';

                      return (
                        <tr
                          key={log.id}
                          onClick={() => setSelectedLogDetail(log)}
                          className="hover:bg-blue-50/40 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                        >
                          <td className="p-3 font-sans text-slate-500 text-[11px] whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleTimeString('vi-VN')}
                            <span className="text-[10px] text-slate-400 block font-mono">
                              {new Date(log.createdAt).toISOString().split('T')[0]}
                            </span>
                          </td>
                          <td className="p-3 font-sans">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${
                                isInput
                                  ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                                  : isOutput
                                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                  : isSecurity
                                  ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <span className="material-symbols-outlined text-xs">
                                {isInput ? 'input' : isOutput ? 'output' : isSecurity ? 'security' : 'info'}
                              </span>
                              <span>{log.entity}</span>
                            </span>
                          </td>
                          <td className="p-3 font-sans font-semibold text-slate-900 dark:text-slate-100 max-w-sm truncate">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs">{log.action}</span>
                            </div>
                          </td>
                          <td className="p-3 text-[11px] text-slate-600 dark:text-slate-400">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-medium">{log.clientIp || '127.0.0.1'}</span>
                              <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                                {log.country === 'VN' ? '🇻🇳 VN' : log.country || 'LOCAL'}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 font-sans text-slate-600 dark:text-slate-300 text-[11px]">
                            {log.user?.fullName || log.userId || 'Hệ thống'}
                          </td>
                          <td className="p-3 text-right font-sans">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedLogDetail(log);
                              }}
                              className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold inline-flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-xs">visibility</span>
                              <span>Xem Raw</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {logsList.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-10 text-center text-slate-400 font-sans">
                          <span className="material-symbols-outlined text-4xl mb-2 block text-slate-300">
                            manage_search
                          </span>
                          <span className="font-medium">Chưa có bản ghi nhật ký nào trong danh mục này.</span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: RATE LIMITING & GEO-BLOCKING                                       */}
          {/* ========================================================================= */}
          {activeTab === 'security' && (
            <div className="space-y-8 max-w-4xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-600">shield</span>
                    <span>Tường Lửa Khảo Thí: Rate Limiting & Geo-Blocking</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Ngăn chặn tấn công DDoS, Brute-Force mật khẩu và giới hạn quyền truy cập theo Quốc gia (Geo-Blocking) hoặc địa chỉ IP.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSaveSecuritySettings}
                  disabled={isSavingSecurity}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <span className={`material-symbols-outlined text-sm ${isSavingSecurity ? 'animate-spin' : ''}`}>
                    {isSavingSecurity ? 'progress_activity' : 'save'}
                  </span>
                  <span>{isSavingSecurity ? 'Đang lưu...' : 'Lưu Quy Tắc Bảo Mật'}</span>
                </button>
              </div>

              {/* 1. Geo-Blocking Mode Selector */}
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center font-bold">
                      <span className="material-symbols-outlined text-xl">public</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        Chính Sách Chặn Địa Lý (Geo-Blocking Mode)
                      </h4>
                      <p className="text-xs text-slate-500">
                        Xác định cách Edge Middleware đối chiếu vị trí quốc gia của Client IP.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div
                    onClick={() => setGeoMode('disabled')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      geoMode === 'disabled'
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 ring-2 ring-blue-500/20'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">1. Tắt (Disabled)</span>
                      <input type="radio" checked={geoMode === 'disabled'} onChange={() => {}} />
                    </div>
                    <p className="text-[11px] text-slate-500">Cho phép truy cập từ mọi quốc gia không giới hạn.</p>
                  </div>

                  <div
                    onClick={() => setGeoMode('whitelist')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      geoMode === 'whitelist'
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                        2. Whitelist (Chỉ cho phép)
                      </span>
                      <input type="radio" checked={geoMode === 'whitelist'} onChange={() => {}} />
                    </div>
                    <p className="text-[11px] text-slate-500">
                      <strong>Khuyên dùng:</strong> Chỉ cho phép IP thuộc các quốc gia được cấp phép (vd: Chỉ Việt Nam VN).
                    </p>
                  </div>

                  <div
                    onClick={() => setGeoMode('blacklist')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      geoMode === 'blacklist'
                        ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/30 ring-2 ring-rose-500/20'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-rose-700 dark:text-rose-300">
                        3. Blacklist (Chặn quốc gia)
                      </span>
                      <input type="radio" checked={geoMode === 'blacklist'} onChange={() => {}} />
                    </div>
                    <p className="text-[11px] text-slate-500">Chặn tuyệt đối danh sách các quốc gia nghi ngờ tấn công.</p>
                  </div>
                </div>

                {/* Country List Selector */}
                {geoMode !== 'disabled' && (
                  <div className="space-y-3 pt-2">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {geoMode === 'whitelist'
                          ? 'Danh sách Quốc gia ĐƯỢC PHÉP TRUY CẬP (Whitelist):'
                          : 'Danh sách Quốc gia BỊ CẤM TRUY CẬP (Blacklist):'}
                      </label>
                      <input
                        type="text"
                        value={countrySearch}
                        onChange={(e) => setCountrySearch(e.target.value)}
                        placeholder="Tìm quốc gia hoặc mã ISO..."
                        className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 w-48"
                      />
                    </div>

                    <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40">
                      {filteredCountries.map((c) => {
                        const isSelected =
                          geoMode === 'whitelist'
                            ? allowedCountries.includes(c.code)
                            : blockedCountries.includes(c.code);

                        return (
                          <button
                            key={c.code}
                            type="button"
                            onClick={() => handleToggleCountry(c.code, geoMode === 'whitelist' ? 'allowed' : 'blocked')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                              isSelected
                                ? geoMode === 'whitelist'
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'bg-rose-600 text-white shadow-xs'
                                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                            }`}
                          >
                            <span className="text-sm">{c.flag}</span>
                            <span>{c.name}</span>
                            <span className="font-mono text-[10px] opacity-80">[{c.code}]</span>
                            {isSelected && <span className="material-symbols-outlined text-xs">check</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Direct IP Whitelist & Blacklist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 bg-white dark:bg-slate-900/60">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-emerald-600 text-sm">verified</span>
                      <span>IP Whitelist (Miễn trừ kiểm tra)</span>
                    </label>
                  </div>
                  <textarea
                    rows={3}
                    value={ipWhitelistText}
                    onChange={(e) => setIpWhitelistText(e.target.value)}
                    placeholder="127.0.0.1&#10;192.168.1.1"
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                  />
                  <p className="text-[10px] text-slate-400">Các IP này sẽ luôn được bỏ qua kiểm tra Geo-Block và Rate Limit.</p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 bg-white dark:bg-slate-900/60">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-rose-600 text-sm">block</span>
                      <span>IP Blacklist (Chặn cứng tức thì)</span>
                    </label>
                  </div>
                  <textarea
                    rows={3}
                    value={ipBlacklistText}
                    onChange={(e) => setIpBlacklistText(e.target.value)}
                    placeholder="203.0.113.1&#10;198.51.100.2"
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                  />
                  <p className="text-[10px] text-slate-400">Bất kỳ request nào từ IP này sẽ bị chặn với mã 403 Forbidden.</p>
                </div>
              </div>

              {/* 3. Rate Limit Configuration */}
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center font-bold">
                    <span className="material-symbols-outlined text-xl">speed</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Cấu Hình Ngưỡng Giới Hạn Tần Suất (Rate Limiting Thresholds)
                    </h4>
                    <p className="text-xs text-slate-500">
                      Sử dụng thuật toán Sliding Window Log (Cửa sổ trượt) bảo vệ máy chủ.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Xác thực / Đăng nhập (Auth Routes)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="5"
                        max="100"
                        value={authMaxRequests}
                        onChange={(e) => setAuthMaxRequests(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">
                        req/phút
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Tuyến API Chung (General API)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="30"
                        max="1000"
                        value={apiMaxRequests}
                        onChange={(e) => setApiMaxRequests(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">
                        req/phút
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Cửa sổ kiểm tra (Window Seconds)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="10"
                        max="300"
                        value={windowSeconds}
                        onChange={(e) => setWindowSeconds(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">
                        giây
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Live Geo-Block Simulator */}
              <div className="p-5 rounded-2xl border border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/20 space-y-3">
                <h4 className="text-sm font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-blue-600">science</span>
                  <span>Trình Mô Phỏng & Thử Nghiệm Tường Lửa (Live Geo-IP Simulator)</span>
                </h4>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Nhập thử IP hoặc Quốc gia để kiểm tra xem hệ thống sẽ Cho phép (Allow) hay Chặn (Block) theo cấu hình hiện tại.
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                  <input
                    type="text"
                    value={simulatorIp}
                    onChange={(e) => setSimulatorIp(e.target.value)}
                    placeholder="Nhập IP (vd: 127.0.0.1 hoặc 198.51.100.44)"
                    className="w-full sm:w-64 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                  <select
                    value={simulatorCountry}
                    onChange={(e) => setSimulatorCountry(e.target.value)}
                    className="w-full sm:w-48 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    {COMMON_COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleRunSimulator}
                    disabled={isSimulating}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 shrink-0"
                  >
                    <span className={`material-symbols-outlined text-xs ${isSimulating ? 'animate-spin' : ''}`}>
                      {isSimulating ? 'progress_activity' : 'play_arrow'}
                    </span>
                    <span>Test Thử Nghiệm</span>
                  </button>
                </div>

                {simulatorResult && (
                  <div
                    className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 mt-2 ${
                      simulatorResult.isAllowed
                        ? 'bg-emerald-100/80 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200'
                        : 'bg-rose-100/80 text-rose-900 border-rose-300 dark:bg-rose-950/60 dark:text-rose-200'
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg shrink-0">
                      {simulatorResult.isAllowed ? 'check_circle' : 'block'}
                    </span>
                    <div>
                      <div className="font-bold">
                        {simulatorResult.isAllowed ? 'KẾT QUẢ: ĐƯỢC PHÉP TRUY CẬP (PASSED)' : 'KẾT QUẢ: BỊ CHẶN BỞI TƯỜNG LỬA (GEO-BLOCKED 403)'}
                      </div>
                      {simulatorResult.reason && <div className="text-[11px] mt-0.5">{simulatorResult.reason}</div>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* JSON Inspector Modal for Detailed Log Viewing */}
      <PortalModal
        isOpen={Boolean(selectedLogDetail)}
        onClose={() => setSelectedLogDetail(null)}
        title={
          selectedLogDetail
            ? `Chi Tiết Nhật Ký (${selectedLogDetail.entity}): ${selectedLogDetail.action}`
            : ''
        }
        subtitle={
          selectedLogDetail
            ? `ID: ${selectedLogDetail.id} • ${new Date(selectedLogDetail.createdAt).toLocaleString('vi-VN')}`
            : ''
        }
        icon={
          selectedLogDetail?.entity === 'INPUT'
            ? 'input'
            : selectedLogDetail?.entity === 'OUTPUT'
            ? 'output'
            : 'security'
        }
        iconBg={
          selectedLogDetail?.entity === 'INPUT'
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
            : selectedLogDetail?.entity === 'OUTPUT'
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
            : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
        }
        maxWidth="max-w-3xl"
        footer={
          <button
            onClick={() => setSelectedLogDetail(null)}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs"
          >
            Đóng cửa sổ
          </button>
        }
      >
        {selectedLogDetail && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">Danh mục</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{selectedLogDetail.entity}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">Client IP</span>
                <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                  {selectedLogDetail.clientIp || '127.0.0.1'}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">Quốc gia</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedLogDetail.country === 'VN' ? '🇻🇳 Việt Nam' : selectedLogDetail.country || 'LOCAL'}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">Người dùng</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedLogDetail.user?.fullName || selectedLogDetail.userId || 'Hệ thống'}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  Dữ Liệu JSON Chi Tiết ({selectedLogDetail.entity === 'INPUT' ? 'Request Payload & Query' : 'Response & Telemetry'}):
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      typeof selectedLogDetail.details === 'string'
                        ? selectedLogDetail.details
                        : JSON.stringify(selectedLogDetail.details, null, 2)
                    );
                    showToast('Đã sao chép JSON vào Clipboard!', 'info');
                  }}
                  className="text-[11px] text-blue-600 hover:underline flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-xs">content_copy</span>
                  <span>Sao chép JSON</span>
                </button>
              </div>

              <pre className="p-4 rounded-xl bg-slate-950 text-emerald-400 font-mono text-xs overflow-x-auto max-h-72 border border-slate-800">
                {typeof selectedLogDetail.details === 'string'
                  ? (() => {
                      try {
                        return JSON.stringify(JSON.parse(selectedLogDetail.details), null, 2);
                      } catch {
                        return selectedLogDetail.details;
                      }
                    })()
                  : JSON.stringify(selectedLogDetail.details, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </PortalModal>

      {/* Add Teacher Modal */}
      <PortalModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Cấp Tài Khoản Giáo Viên Mới"
        icon="person_add"
        iconBg="bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-300"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAddTeacher} className="space-y-4 text-xs">
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

          {/* Mật khẩu khởi tạo */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Mật khẩu khởi tạo <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={generateRandomPassword}
                className="text-[11px] text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-xs">autorenew</span>
                <span>Tạo ngẫu nhiên</span>
              </button>
            </div>
            <div className="relative">
              <input
                type={showNewTeacherPassword ? 'text' : 'password'}
                required
                value={newTeacherPassword}
                onChange={(e) => setNewTeacherPassword(e.target.value)}
                placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)"
                className="w-full pl-3 pr-10 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => setShowNewTeacherPassword(!showNewTeacherPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">
                  {showNewTeacherPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            <p className="text-[10px] text-slate-400">
              Giáo viên dùng mật khẩu này để đăng nhập lần đầu vào hệ thống.
            </p>
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
      </PortalModal>
    </div>
  );
};

export default AdminView;
