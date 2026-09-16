'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store/app-store';

interface TestStatus {
  state: 'idle' | 'testing' | 'success' | 'error';
  message: string;
  latency?: number;
}

export default function SetupWizardView() {
  const { setCurrentRoute, setToken, setUser, showToast, setIsSetupRequired } = useAppStore();
  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Configuration State
  const [dbHost, setDbHost] = useState('localhost');
  const [dbPort, setDbPort] = useState('3306');
  const [dbUser, setDbUser] = useState('examify_user');
  const [dbPass, setDbPass] = useState('');
  const [dbName, setDbName] = useState('examify_db');
  const [jdbcString, setJdbcString] = useState('');
  const [isJdbcOpen, setIsJdbcOpen] = useState(false);

  const [redisEnabled, setRedisEnabled] = useState(false);
  const [redisHost, setRedisHost] = useState('localhost');
  const [redisPort, setRedisPort] = useState('6379');
  const [redisPass, setRedisPass] = useState('');
  const [redisDb, setRedisDb] = useState('0');

  const [defaultAi, setDefaultAi] = useState<'gemini' | 'openai' | 'claude' | 'custom-mcp'>('gemini');
  const [geminiKeys, setGeminiKeys] = useState<string[]>(['']);
  const [geminiModel, setGeminiModel] = useState('gemini-1.5-flash');
  const [openaiKeys, setOpenaiKeys] = useState<string[]>(['']);
  const [openaiModel, setOpenaiModel] = useState('gpt-4o-mini');
  const [claudeKeys, setClaudeKeys] = useState<string[]>(['']);
  const [claudeModel, setClaudeModel] = useState('claude-3-5-sonnet-20241022');
  const [customMcpUrl, setCustomMcpUrl] = useState('http://localhost:11434/v1');
  const [customMcpKeys, setCustomMcpKeys] = useState<string[]>(['ollama']);
  const [customMcpModel, setCustomMcpModel] = useState('llama3:8b');
  const [showKeyMap, setShowKeyMap] = useState<Record<string, boolean>>({});

  const [rateWindow, setRateWindow] = useState('60');
  const [rateMax, setRateMax] = useState('100');

  const [schoolName, setSchoolName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [adminPassConfirm, setAdminPassConfirm] = useState('');

  // Test states
  const [mysqlTest, setMysqlTest] = useState<TestStatus>({ state: 'idle', message: '' });
  const [redisTest, setRedisTest] = useState<TestStatus>({ state: 'idle', message: '' });
  const [geminiTest, setGeminiTest] = useState<TestStatus>({ state: 'idle', message: '' });
  const [openaiTest, setOpenaiTest] = useState<TestStatus>({ state: 'idle', message: '' });
  const [claudeTest, setClaudeTest] = useState<TestStatus>({ state: 'idle', message: '' });
  const [mcpTest, setMcpTest] = useState<TestStatus>({ state: 'idle', message: '' });

  // Live real-time models from official endpoints
  const [geminiLiveModels, setGeminiLiveModels] = useState<Array<{ id: string; name: string }>>([
    { id: 'gemini-3.6-flash', name: 'gemini-3.6-flash (Thế hệ mới nhất)' },
    { id: 'gemini-3.7-flash', name: 'gemini-3.7-flash (Hiệu năng cao)' },
    { id: 'gemini-3.5-flash', name: 'gemini-3.5-flash (Tối ưu)' },
  ]);
  const [openaiLiveModels, setOpenaiLiveModels] = useState<Array<{ id: string; name: string }>>([
    { id: 'gpt-4o-mini', name: 'gpt-4o-mini (Tiết kiệm, nhanh)' },
    { id: 'gpt-4o', name: 'gpt-4o (Đỉnh cao chất lượng)' },
    { id: 'gpt-3.5-turbo', name: 'gpt-3.5-turbo' },
  ]);
  const [claudeLiveModels, setClaudeLiveModels] = useState<Array<{ id: string; name: string }>>([
    { id: 'claude-3-5-sonnet-20241022', name: 'claude-3-5-sonnet (Mới nhất)' },
    { id: 'claude-3-5-haiku-20241022', name: 'claude-3-5-haiku (Tốc độ cao)' },
  ]);
  const [loadingLiveProvider, setLoadingLiveProvider] = useState<string | null>(null);

  const fetchLiveModelsForSetup = async (provider: 'gemini' | 'openai' | 'claude', keys: string[]) => {
    const key = keys.map((k) => k.trim()).filter(Boolean).join(',');
    setLoadingLiveProvider(provider);
    try {
      const url = key
        ? `/api/v1/ai/models?provider=${provider}&apiKey=${encodeURIComponent(key)}`
        : `/api/v1/ai/models?provider=${provider}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.data?.models) && data.data.models.length > 0) {
        if (provider === 'gemini') {
          setGeminiLiveModels(data.data.models);
          if (data.data.models[0]) setGeminiModel(data.data.models[0].id);
        }
        if (provider === 'openai') {
          setOpenaiLiveModels(data.data.models);
          if (data.data.models[0]) setOpenaiModel(data.data.models[0].id);
        }
        if (provider === 'claude') {
          setClaudeLiveModels(data.data.models);
          if (data.data.models[0]) setClaudeModel(data.data.models[0].id);
        }
        showToast(`Đã lấy ${data.data.models.length} model ${provider.toUpperCase()} theo thời gian thực từ API!`, 'success');
      }
    } catch {
      showToast(`Không thể tải danh sách model trực tiếp từ ${provider}`, 'warning');
    } finally {
      setLoadingLiveProvider(null);
    }
  };

  // Prefill from server if available
  useEffect(() => {
    fetch('/api/v1/setup')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data?.currentConfig) {
          const c = json.data.currentConfig;
          if (c.database) {
            setDbHost(c.database.host || 'localhost');
            setDbPort(String(c.database.port || '3306'));
            setDbUser(c.database.user || 'examify_user');
            setDbPass(c.database.password || '');
            setDbName(c.database.database || 'examify_db');
          }
          if (c.redis) {
            setRedisEnabled(!!c.redis.enabled);
            setRedisHost(c.redis.host || 'localhost');
            setRedisPort(String(c.redis.port || '6379'));
            setRedisPass(c.redis.password || '');
            setRedisDb(String(c.redis.db || '0'));
          }
          if (c.ai) {
            setDefaultAi(c.ai.defaultProvider || 'gemini');
            setGeminiKeys(
              c.ai.geminiApiKey
                ? c.ai.geminiApiKey.split(/[,;\n]+/).map((s: string) => s.trim()).filter(Boolean)
                : ['']
            );
            setGeminiModel(c.ai.geminiModel || 'gemini-1.5-flash');
            setOpenaiKeys(
              c.ai.openaiApiKey
                ? c.ai.openaiApiKey.split(/[,;\n]+/).map((s: string) => s.trim()).filter(Boolean)
                : ['']
            );
            setOpenaiModel(c.ai.openaiModel || 'gpt-4o-mini');
            setClaudeKeys(
              c.ai.claudeApiKey
                ? c.ai.claudeApiKey.split(/[,;\n]+/).map((s: string) => s.trim()).filter(Boolean)
                : ['']
            );
            setClaudeModel(c.ai.claudeModel || 'claude-3-5-sonnet-20241022');
            setCustomMcpUrl(c.ai.customMcpBaseUrl || 'http://localhost:11434/v1');
            setCustomMcpKeys(
              c.ai.customMcpApiKey
                ? c.ai.customMcpApiKey.split(/[,;\n]+/).map((s: string) => s.trim()).filter(Boolean)
                : ['ollama']
            );
            setCustomMcpModel(c.ai.customMcpModel || 'llama3:8b');
          }
          if (c.rateLimit) {
            setRateWindow(String(c.rateLimit.windowSeconds || '60'));
            setRateMax(String(c.rateLimit.maxRequests || '100'));
          }
        }
      })
      .catch(() => {});
  }, []);

  const renderBadge = (status: TestStatus) => {
    if (status.state === 'testing') {
      return (
        <div className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200 animate-pulse font-medium">
          <span className="material-symbols-outlined text-sm animate-spin">sync</span>
          <span>Đang kiểm tra...</span>
        </div>
      );
    }
    if (status.state === 'success') {
      return (
        <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-300 font-medium">
          <span className="material-symbols-outlined text-sm">check_circle</span>
          <span>{status.message}</span>
          {status.latency && (
            <span className="text-[10px] bg-emerald-200/80 px-1.5 py-0.2 rounded font-bold">
              {status.latency}ms
            </span>
          )}
        </div>
      );
    }
    if (status.state === 'error') {
      return (
        <div className="flex items-center gap-1.5 text-xs text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-300 font-medium max-w-xs">
          <span className="material-symbols-outlined text-sm shrink-0">error</span>
          <span className="truncate" title={status.message}>
            {status.message}
          </span>
        </div>
      );
    }
    return null;
  };

  const handleImportJdbc = (customString?: string) => {
    const raw = (customString !== undefined ? customString : jdbcString).trim();
    if (!raw) {
      showToast('Vui lòng nhập chuỗi JDBC Connection String', 'warning');
      return;
    }

    try {
      let clean = raw;
      if (clean.toLowerCase().startsWith('jdbc:')) {
        clean = clean.substring(5);
      }
      if (!clean.includes('://')) {
        clean = 'mysql://' + clean;
      }

      const url = new URL(clean);
      const host = url.hostname || 'localhost';
      const port = url.port || '3306';
      const database = url.pathname.replace(/^\//, '') || 'examify_db';
      let username = decodeURIComponent(url.username || '');
      let password = decodeURIComponent(url.password || '');

      if (!username && url.searchParams.has('user')) {
        username = url.searchParams.get('user') || '';
      }
      if (!password && url.searchParams.has('password')) {
        password = url.searchParams.get('password') || '';
      }

      setDbHost(host);
      setDbPort(port);
      setDbName(database);
      if (username) setDbUser(username);
      if (password) setDbPass(password);
      setMysqlTest({ state: 'idle', message: '' });

      showToast(`Đã nạp cấu hình MySQL từ JDBC: ${host}:${port}/${database}`, 'success');
      setIsJdbcOpen(false);
    } catch {
      // Regex fallback for varied connection string formats
      const match = raw.match(/(?:jdbc:)?(?:(\w+):\/\/)?(?:([^:@]+)(?::([^@]+))?@)?([^:\/?#]+)(?::(\d+))?(?:\/([^?#]+))?(?:\?(.*))?/);
      if (match) {
        const searchParams = new URLSearchParams(match[7] || '');
        const host = match[4] || 'localhost';
        const port = match[5] || '3306';
        const database = match[6] || 'examify_db';
        const username = match[2] || searchParams.get('user') || '';
        const password = match[3] || searchParams.get('password') || '';

        setDbHost(host);
        setDbPort(port);
        setDbName(database);
        if (username) setDbUser(username);
        if (password) setDbPass(password);
        setMysqlTest({ state: 'idle', message: '' });

        showToast(`Đã nạp cấu hình MySQL từ JDBC: ${host}:${port}/${database}`, 'success');
        setIsJdbcOpen(false);
      } else {
        showToast('Định dạng JDBC không hợp lệ. Ví dụ: jdbc:mysql://root:password@localhost:3306/examify_db', 'error');
      }
    }
  };

  const handleDbChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value);
    if (mysqlTest.state !== 'idle') {
      setMysqlTest({ state: 'idle', message: '' });
    }
  };

  const handleKeyListChange = (
    keys: string[],
    setKeys: React.Dispatch<React.SetStateAction<string[]>>,
    index: number,
    val: string
  ) => {
    if (val.includes(',') || val.includes(';') || val.includes('\n')) {
      const parts = val.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
      if (parts.length > 0) {
        const next = [...keys];
        next.splice(index, 1, ...parts);
        setKeys(next);
        return;
      }
    }
    const next = [...keys];
    next[index] = val;
    setKeys(next);
  };

  const handleAddKeyRow = (
    keys: string[],
    setKeys: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setKeys([...keys, '']);
  };

  const handleRemoveKeyRow = (
    keys: string[],
    setKeys: React.Dispatch<React.SetStateAction<string[]>>,
    index: number
  ) => {
    if (keys.length <= 1) {
      setKeys(['']);
    } else {
      setKeys(keys.filter((_, i) => i !== index));
    }
  };

  const toggleKeyVisibility = (keyId: string) => {
    setShowKeyMap((prev) => ({ ...prev, [keyId]: !prev[keyId] }));
  };

  const handleTestMySQL = async () => {
    setMysqlTest({ state: 'testing', message: '' });
    try {
      const res = await fetch('/api/v1/setup/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'mysql',
          config: {
            host: dbHost,
            port: dbPort,
            user: dbUser,
            password: dbPass,
            database: dbName,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMysqlTest({ state: 'success', message: data.message, latency: data.data?.latencyMs });
        showToast(`MySQL: ${data.message}`, 'success');
      } else {
        setMysqlTest({ state: 'error', message: data.error });
        showToast(`Lỗi MySQL: ${data.error}`, 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setMysqlTest({ state: 'error', message: msg });
      showToast(`Lỗi: ${msg}`, 'error');
    }
  };

  const handleTestRedis = async () => {
    if (!redisEnabled) {
      setRedisTest({ state: 'success', message: 'Redis đang TẮT (Hệ thống dùng In-Memory Cache an toàn)' });
      showToast('Redis đang Tắt (Tùy chọn - Dùng In-Memory)', 'info');
      return;
    }
    setRedisTest({ state: 'testing', message: '' });
    try {
      const res = await fetch('/api/v1/setup/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'redis',
          config: {
            enabled: redisEnabled,
            host: redisHost,
            port: redisPort,
            password: redisPass,
            db: redisDb,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRedisTest({ state: 'success', message: data.message, latency: data.data?.latencyMs });
        showToast(`Redis: ${data.message}`, 'success');
      } else {
        setRedisTest({ state: 'error', message: data.error });
        showToast(`Lỗi Redis: ${data.error}`, 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setRedisTest({ state: 'error', message: msg });
      showToast(`Lỗi: ${msg}`, 'error');
    }
  };

  const handleTestAI = async (providerType: 'gemini' | 'openai' | 'claude' | 'custom-mcp') => {
    const setStatus =
      providerType === 'gemini'
        ? setGeminiTest
        : providerType === 'openai'
        ? setOpenaiTest
        : providerType === 'claude'
        ? setClaudeTest
        : setMcpTest;

    setStatus({ state: 'testing', message: '' });

    let apiKey = '';
    let model = '';
    let baseURL = '';

    if (providerType === 'gemini') {
      apiKey = geminiKeys.map((k) => k.trim()).filter(Boolean).join(',');
      model = geminiModel;
      if (!apiKey) {
        setStatus({ state: 'error', message: 'Vui lòng nhập ít nhất một Gemini API Key' });
        showToast('Vui lòng nhập ít nhất một Gemini API Key', 'warning');
        return;
      }
    } else if (providerType === 'openai') {
      apiKey = openaiKeys.map((k) => k.trim()).filter(Boolean).join(',');
      model = openaiModel;
      if (!apiKey) {
        setStatus({ state: 'error', message: 'Vui lòng nhập ít nhất một OpenAI API Key' });
        showToast('Vui lòng nhập ít nhất một OpenAI API Key', 'warning');
        return;
      }
    } else if (providerType === 'claude') {
      apiKey = claudeKeys.map((k) => k.trim()).filter(Boolean).join(',');
      model = claudeModel;
      if (!apiKey) {
        setStatus({ state: 'error', message: 'Vui lòng nhập ít nhất một Claude API Key' });
        showToast('Vui lòng nhập ít nhất một Claude API Key', 'warning');
        return;
      }
    } else {
      apiKey = customMcpKeys.map((k) => k.trim()).filter(Boolean).join(',');
      model = customMcpModel;
      baseURL = customMcpUrl;
    }

    try {
      const res = await fetch('/api/v1/setup/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'ai',
          config: { provider: providerType, apiKey, model, baseURL },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus({ state: 'success', message: data.message, latency: data.data?.latencyMs });
        showToast(data.message, 'success');
      } else {
        setStatus({ state: 'error', message: data.error });
        showToast(data.error, 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus({ state: 'error', message: msg });
      showToast(`Lỗi AI: ${msg}`, 'error');
    }
  };



  const handleFinishSetup = async () => {
    if (!schoolName.trim()) {
      showToast('Vui lòng nhập tên cơ sở giáo dục / trường học', 'error');
      return;
    }
    if (!adminName.trim()) {
      showToast('Vui lòng nhập họ tên quản trị viên', 'error');
      return;
    }
    if (!adminEmail.trim() || !adminEmail.includes('@')) {
      showToast('Vui lòng nhập địa chỉ email hợp lệ', 'error');
      return;
    }
    if (!adminPass || adminPass.length < 8) {
      showToast('Mật khẩu phải có ít nhất 8 ký tự', 'error');
      return;
    }
    if (adminPass !== adminPassConfirm) {
      showToast('Xác nhận mật khẩu không trùng khớp', 'error');
      return;
    }

    setIsSubmitting(true);

    const payload = {
      email: adminEmail.trim(),
      password: adminPass,
      fullName: adminName.trim(),
      institutionName: schoolName.trim(),
      database: {
        host: dbHost,
        port: parseInt(dbPort, 10),
        user: dbUser,
        password: dbPass,
        database: dbName,
      },
      redis: {
        enabled: redisEnabled,
        host: redisEnabled ? redisHost : '',
        port: redisEnabled ? parseInt(redisPort, 10) : 6379,
        password: redisEnabled ? redisPass : '',
        db: redisEnabled ? parseInt(redisDb, 10) : 0,
      },
      ai: {
        defaultProvider: defaultAi,
        geminiApiKey: geminiKeys.map((k) => k.trim()).filter(Boolean).join(','),
        geminiModel,
        openaiApiKey: openaiKeys.map((k) => k.trim()).filter(Boolean).join(','),
        openaiModel,
        claudeApiKey: claudeKeys.map((k) => k.trim()).filter(Boolean).join(','),
        claudeModel,
        customMcpBaseUrl: customMcpUrl,
        customMcpApiKey: customMcpKeys.map((k) => k.trim()).filter(Boolean).join(','),
        customMcpModel: customMcpModel,
      },
      rateLimit: {
        windowSeconds: parseInt(rateWindow, 10),
        maxRequests: parseInt(rateMax, 10),
      },
    };

    try {
      const res = await fetch('/api/v1/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        const authToken = data.data?.token;
        const authUser = data.data?.user;

        if (authToken) {
          setToken(authToken);
          if (typeof window !== 'undefined') {
            localStorage.setItem('examify_token', authToken);
            document.cookie = `examify_token=${authToken}; path=/; max-age=604800; SameSite=Lax`;
          }
        }

        if (authUser) {
          const profile = {
            id: authUser.id,
            name: authUser.fullName,
            email: authUser.email,
            role: 'Quản trị viên Khảo thí',
            school: schoolName.trim() || 'Hệ thống Khảo thí Examify',
            avatarStyle: 'identicon' as const,
          };
          setUser(profile);
          if (typeof window !== 'undefined') {
            localStorage.setItem('examify_user', JSON.stringify(profile));
          }
        }

        setIsSetupRequired(false);
        showToast('Khởi tạo hệ thống thành công! Chuyển vào Dashboard...', 'success');
        setTimeout(() => {
          setCurrentRoute('#dashboard');
        }, 1200);
      } else {
        setIsSubmitting(false);
        const err = typeof data.error === 'object' ? JSON.stringify(data.error) : data.error;
        showToast(`Khởi tạo thất bại: ${err}`, 'error');
      }
    } catch (err: unknown) {
      setIsSubmitting(false);
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Lỗi hệ thống: ${msg}`, 'error');
    }
  };

  return (
    <div className="w-full min-h-screen bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] bg-slate-50/50 flex flex-col justify-between p-4 md:p-8">
      {/* Top Bar */}
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <span className="material-symbols-outlined text-xl">school</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-xl tracking-tight text-slate-800">Examify</span>
            <span className="font-extrabold text-xl text-blue-600">AI</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300 ml-1">
              BETA SETUP
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span>Zero-Day Configuration</span>
        </div>
      </div>

      {/* Stepper Tabs */}
      <div className="max-w-4xl mx-auto w-full my-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          {[
            { s: 1, label: '1. Cơ sở dữ liệu', icon: 'database' },
            { s: 2, label: '2. AI Providers', icon: 'psychology' },
            { s: 3, label: '3. Rate Limit & Bảo Mật 2FA', icon: 'shield' },
            { s: 4, label: '4. Master Admin', icon: 'admin_panel_settings' },
          ].map((item) => {
            const isActive = step === item.s;
            const isStep1Verified = mysqlTest.state === 'success';
            const isCompleted = item.s === 1 ? isStep1Verified : step > item.s;
            const canNavigate = item.s === 1 || isStep1Verified;

            let tabClasses = '';
            if (item.s === 1) {
              if (isActive) {
                tabClasses = isStep1Verified
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-md font-bold'
                  : 'bg-blue-600 text-white border-blue-700 shadow-md font-bold';
              } else {
                tabClasses = isStep1Verified
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold'
                  : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200/60';
              }
            } else {
              if (isActive) {
                tabClasses = 'bg-blue-600 text-white border-blue-700 shadow-md font-bold';
              } else if (isCompleted) {
                tabClasses = 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold';
              } else {
                tabClasses = canNavigate
                  ? 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                  : 'bg-slate-50 text-slate-400 border-slate-200/70 cursor-not-allowed opacity-75';
              }
            }

            return (
              <button
                key={item.s}
                type="button"
                onClick={() => {
                  if (!canNavigate) {
                    showToast('Vui lòng kiểm tra kết nối MySQL / MariaDB thành công (báo xanh) trước khi chuyển bước!', 'warning');
                    return;
                  }
                  setStep(item.s);
                }}
                className={`p-3 rounded-xl border flex items-center justify-between gap-2 transition-all text-left ${tabClasses}`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span
                    className={`material-symbols-outlined text-base ${
                      isActive
                        ? 'text-white'
                        : isCompleted
                        ? 'text-emerald-600'
                        : 'text-slate-400'
                    }`}
                  >
                    {isCompleted ? 'check_circle' : item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                </div>
                {item.s === 1 && isStep1Verified && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-bold shrink-0 ${
                      isActive ? 'bg-emerald-700 text-white' : 'bg-emerald-200 text-emerald-900'
                    }`}
                  >
                    ✓ ĐÃ XÁC THỰC
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Form Card */}
      <div className="max-w-4xl mx-auto w-full flex-1 mb-8">
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-xl border border-slate-200/80">
          {/* STEP 1: DATABASE */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-600">database</span>
                  <span>Bước 1: Cấu hình Cơ sở dữ liệu & Bộ nhớ đệm</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Thiết lập kết nối MySQL / MariaDB và Redis. Bấm nút kiểm tra kết nối để xác thực thông tin ngay lập tức.
                </p>
              </div>

              {/* MySQL Section */}
              <div
                className={`p-5 rounded-2xl border-2 transition-all bg-white shadow-sm space-y-4 ${
                  mysqlTest.state === 'success'
                    ? 'border-emerald-500 ring-2 ring-emerald-500/10'
                    : mysqlTest.state === 'error'
                    ? 'border-rose-400 ring-1 ring-rose-400/20'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        mysqlTest.state === 'success'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-blue-100 text-blue-600'
                      }`}
                    >
                      <span className="material-symbols-outlined text-xl">storage</span>
                    </div>
                    <div>
                      <span className="text-sm font-bold text-slate-900 block">
                        1. MariaDB / MySQL Database
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Cơ sở dữ liệu lưu trữ người dùng, ngân hàng câu hỏi & ma trận đề
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {renderBadge(mysqlTest)}
                    <button
                      type="button"
                      onClick={handleTestMySQL}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-blue-500/20 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">wifi_protected_setup</span>
                      <span>Kiểm tra kết nối MySQL</span>
                    </button>
                  </div>
                </div>

                {/* Database Connection Verification Status Banner */}
                {mysqlTest.state === 'success' ? (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 flex items-center justify-between flex-wrap gap-2 text-xs">
                    <div className="flex items-center gap-2 font-medium">
                      <span className="material-symbols-outlined text-emerald-600 text-lg">check_circle</span>
                      <span>
                        <strong>Kết nối thành công!</strong> MariaDB / MySQL đã phản hồi trong {mysqlTest.latency || 0}ms. Sẵn sàng cấu hình các bước tiếp theo.
                      </span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-bold shadow-xs">
                      ✓ ĐÃ XÁC THỰC (BÁO XANH)
                    </span>
                  </div>
                ) : mysqlTest.state === 'error' ? (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 flex items-start gap-2 text-xs">
                    <span className="material-symbols-outlined text-rose-600 text-lg shrink-0 mt-0.5">error</span>
                    <div>
                      <div className="font-bold">Kiểm tra kết nối MariaDB / MySQL thất bại:</div>
                      <div className="text-[11px] font-mono mt-0.5 text-rose-700">{mysqlTest.message}</div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Vui lòng kiểm tra lại Host, Port, User, Password hoặc xem dịch vụ MySQL / MariaDB đã khởi động chưa.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-800 flex items-center gap-2 text-xs">
                    <span className="material-symbols-outlined text-amber-600 text-base shrink-0">info</span>
                    <span>
                      ⚠️ <strong>Yêu cầu xác thực:</strong> Bạn cần bấm nút <strong>&quot;Kiểm tra kết nối MySQL&quot;</strong>. Hệ thống chỉ cho phép chuyển bước khi kiểm tra thành công (báo xanh).
                    </span>
                  </div>
                )}

                {/* JDBC Connection String Box - ALWAYS PROMINENTLY VISIBLE */}
                <div className="p-4 rounded-xl border-2 border-indigo-300 dark:border-indigo-700 bg-indigo-50/70 dark:bg-indigo-950/40 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <label className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-indigo-600 text-lg">link</span>
                      <span>Nhập nhanh bằng chuỗi kết nối JDBC (Connection String):</span>
                    </label>
                    <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/70 px-2 py-0.5 rounded-full border border-indigo-200">
                      ⚡ Tự động điền 5 thông số
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500 text-base">
                        terminal
                      </span>
                      <input
                        type="text"
                        value={jdbcString}
                        onChange={(e) => setJdbcString(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleImportJdbc();
                          }
                        }}
                        placeholder="jdbc:mysql://root:password@localhost:3306/examify_db?useSSL=false"
                        className="w-full h-10 pl-9 pr-3 text-xs font-mono rounded-lg border-2 border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleImportJdbc()}
                      className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-600/20 shrink-0 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">flash_on</span>
                      <span>Phân tích & Tự động điền</span>
                    </button>
                  </div>

                  {/* Quick Sample Chips */}
                  <div className="flex items-center gap-2 flex-wrap pt-0.5">
                    <span className="text-[11px] font-bold text-indigo-900 dark:text-indigo-300">Bấm để thử chuỗi mẫu:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const str = 'jdbc:mysql://examify_user:examify_password@localhost:3306/examify_db';
                        setJdbcString(str);
                        handleImportJdbc(str);
                      }}
                      className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-300 text-[11px] font-mono transition-colors cursor-pointer"
                    >
                      examify_user@localhost:3306
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const str = 'jdbc:mysql://root:root@127.0.0.1:3306/examify_db';
                        setJdbcString(str);
                        handleImportJdbc(str);
                      }}
                      className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-300 text-[11px] font-mono transition-colors cursor-pointer"
                    >
                      root:root@127.0.0.1:3306
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const str = 'jdbc:mysql://localhost:3306/examify_db?user=examify_user&password=examify_password';
                        setJdbcString(str);
                        handleImportJdbc(str);
                      }}
                      className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-300 text-[11px] font-mono transition-colors cursor-pointer"
                    >
                      Query params (?user=...&password=...)
                    </button>
                  </div>
                </div>

                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider pt-1">
                  Hoặc kiểm tra & chỉnh sửa thủ công từng trường:
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Host / IP *</label>
                    <input
                      type="text"
                      value={dbHost}
                      onChange={handleDbChange(setDbHost)}
                      placeholder="localhost"
                      className="w-full h-9 px-3 text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Port *</label>
                    <input
                      type="number"
                      value={dbPort}
                      onChange={handleDbChange(setDbPort)}
                      placeholder="3306"
                      className="w-full h-9 px-3 text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Database Name *</label>
                    <input
                      type="text"
                      value={dbName}
                      onChange={handleDbChange(setDbName)}
                      placeholder="examify_db"
                      className="w-full h-9 px-3 text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Username *</label>
                    <input
                      type="text"
                      value={dbUser}
                      onChange={handleDbChange(setDbUser)}
                      placeholder="root"
                      className="w-full h-9 px-3 text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Password</label>
                    <input
                      type="password"
                      value={dbPass}
                      onChange={handleDbChange(setDbPass)}
                      placeholder="Mật khẩu database"
                      className="w-full h-9 px-3 text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                {/* Generated JDBC String Indicator */}
                <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px] truncate max-w-lg">
                    <span className="text-slate-400 font-sans font-semibold">JDBC URL:</span>
                    <span className="text-indigo-700 font-semibold truncate">
                      jdbc:mysql://{dbUser ? `${dbUser}:••••@` : ''}{dbHost}:{dbPort}/{dbName}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const fullJdbc = `jdbc:mysql://${dbUser ? `${dbUser}:${dbPass}@` : ''}${dbHost}:{dbPort}/{dbName}?useSSL=false&serverTimezone=UTC`;
                      navigator.clipboard.writeText(fullJdbc);
                      showToast('Đã sao chép chuỗi JDBC URL đầy đủ vào clipboard', 'info');
                    }}
                    className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-xs">content_copy</span>
                    <span>Sao chép chuỗi JDBC</span>
                  </button>
                </div>
              </div>

              {/* Redis Section */}
              <div
                className={`p-5 rounded-2xl border-2 transition-all bg-white shadow-sm space-y-4 ${
                  redisEnabled ? 'border-slate-200' : 'border-slate-200/70 bg-slate-50/40'
                }`}
              >
                <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        redisEnabled ? 'bg-red-100 text-red-600' : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      <span className="material-symbols-outlined text-xl">cached</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 block">
                          2. Redis Cache & Job Queue
                        </span>
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                            redisEnabled
                              ? 'bg-red-100 text-red-700 border border-red-200'
                              : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {redisEnabled ? 'ĐANG BẬT' : 'IN-MEMORY MẶC ĐỊNH'}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {redisEnabled
                          ? 'Dùng máy chủ Redis ngoài cho hàng đợi Mail & Token cache'
                          : 'Tùy chọn: Hệ thống tự động dùng bộ nhớ trong In-Memory siêu nhanh, không cần cài Redis'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Toggle Redis Switch Button */}
                    <button
                      type="button"
                      onClick={() => {
                        const next = !redisEnabled;
                        setRedisEnabled(next);
                        if (!next) {
                          setRedisTest({
                            state: 'success',
                            message: 'Redis đã TẮT (Dùng In-Memory Cache an toàn)',
                          });
                        } else {
                          setRedisTest({ state: 'idle', message: '' });
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                        redisEnabled
                          ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">
                        {redisEnabled ? 'toggle_on' : 'toggle_off'}
                      </span>
                      <span>{redisEnabled ? 'Tắt Redis (Dùng In-Memory)' : 'Bật Redis Riêng'}</span>
                    </button>

                    {redisEnabled && (
                      <>
                        {renderBadge(redisTest)}
                        <button
                          type="button"
                          onClick={handleTestRedis}
                          className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-red-500/20 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm">network_check</span>
                          <span>Kiểm tra Redis</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Redis Config Inputs only when enabled */}
                {redisEnabled ? (
                  <div className="space-y-3 pt-1">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700">Host / IP *</label>
                        <input
                          type="text"
                          value={redisHost}
                          onChange={(e) => setRedisHost(e.target.value)}
                          placeholder="localhost"
                          className="w-full h-9 px-3 text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700">Port *</label>
                        <input
                          type="number"
                          value={redisPort}
                          onChange={(e) => setRedisPort(e.target.value)}
                          placeholder="6379"
                          className="w-full h-9 px-3 text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700">DB Index</label>
                        <input
                          type="number"
                          value={redisDb}
                          onChange={(e) => setRedisDb(e.target.value)}
                          placeholder="0"
                          className="w-full h-9 px-3 text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Mật khẩu Redis (nếu có)</label>
                      <input
                        type="password"
                        value={redisPass}
                        onChange={(e) => setRedisPass(e.target.value)}
                        placeholder="Bỏ trống nếu không có mật khẩu"
                        className="w-full h-9 px-3 text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-emerald-600">check_circle</span>
                    <span>
                      Đang bật <strong>In-Memory Mode</strong>: Không cần cài đặt hay chạy dịch vụ Redis. Phù hợp cho môi trường phát triển & kiểm thử!
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                  {mysqlTest.state === 'success' ? (
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined text-base">verified</span>
                      <span>Đã xác thực thành công (Báo xanh). Sẵn sàng sang Bước 2.</span>
                    </span>
                  ) : (
                    <span className="text-amber-600 flex items-center gap-1">
                      <span className="material-symbols-outlined text-base">warning</span>
                      <span>Chưa kiểm tra kết nối MySQL thành công. Vui lòng kiểm tra để tiếp tục.</span>
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (mysqlTest.state !== 'success') {
                      showToast('Vui lòng kiểm tra kết nối MariaDB / MySQL thành công (báo xanh) trước khi tiếp tục!', 'warning');
                      return;
                    }
                    setStep(2);
                  }}
                  className={`px-6 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shadow-md ${
                    mysqlTest.state === 'success'
                      ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                  }`}
                >
                  <span>Tiếp tục: Cấu hình AI</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: AI PROVIDERS */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-600">psychology</span>
                  <span>Bước 2: Cấu hình Bộ tứ Mô hình AI</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Chọn nhà cung cấp mặc định chính (PRIMARY) và nhập API Key cho các mô hình.
                </p>
              </div>

              {/* Providers Radio Selection Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { id: 'gemini', title: 'Google Gemini', icon: 'auto_awesome', sub: 'Khuyến nghị: Nhanh' },
                  { id: 'openai', title: 'ChatGPT (OpenAI)', icon: 'smart_toy', sub: 'Chuẩn logic & tự luận' },
                  { id: 'claude', title: 'Anthropic Claude', icon: 'neurology', sub: 'Đối soát sư phạm' },
                  { id: 'custom-mcp', title: 'Custom MCP / Local', icon: 'terminal', sub: 'vLLM, Ollama, Local' },
                ].map((item) => {
                  const isSelected = defaultAi === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setDefaultAi(item.id as any)}
                      className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span
                          className={`material-symbols-outlined text-xl ${
                            isSelected ? 'text-blue-600' : 'text-slate-400'
                          }`}
                        >
                          {item.icon}
                        </span>
                        <input
                          type="radio"
                          name="default-ai-pick"
                          checked={isSelected}
                          onChange={() => setDefaultAi(item.id as any)}
                          className="w-4 h-4 text-blue-600"
                        />
                      </div>
                      <div className="font-bold text-xs text-slate-800">{item.title}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{item.sub}</div>
                    </div>
                  );
                })}
              </div>

              {/* Form Panels for Each AI Provider */}
              <div className="space-y-4">
                {/* 1. Gemini */}
                <div
                  className={`p-4 rounded-xl border transition-all ${
                    defaultAi === 'gemini' ? 'border-blue-500 bg-blue-50/20 shadow-xs ring-1 ring-blue-500/20' : 'border-slate-200 bg-white'
                  } space-y-3`}
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
                      <span className="material-symbols-outlined text-blue-600 text-base">auto_awesome</span>
                      <span>1. Google Gemini</span>
                      {defaultAi === 'gemini' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-100 text-blue-800">
                          PRIMARY
                        </span>
                      )}
                      {geminiKeys.filter((k) => k.trim()).length > 1 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                          ⚡ {geminiKeys.filter((k) => k.trim()).length} API Keys Pool
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {renderBadge(geminiTest)}
                      <button
                        type="button"
                        onClick={() => handleTestAI('gemini')}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 border border-slate-300 transition-colors shadow-xs cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-xs">network_check</span>
                        <span>Test Gemini Pool</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
                    {/* Multi-Key Manager for Gemini */}
                    <div className="md:col-span-2 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                          <span>Danh sách Gemini API Key</span>
                          <span className="text-[10px] text-slate-400 font-normal">(Tự động xoay tua Round-Robin)</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => handleAddKeyRow(geminiKeys, setGeminiKeys)}
                          className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-xs">add_circle</span>
                          <span>+ Thêm API Key</span>
                        </button>
                      </div>

                      <div className="space-y-2">
                        {geminiKeys.map((keyVal, idx) => {
                          const keyId = `gemini_${idx}`;
                          const isShown = !!showKeyMap[keyId];
                          return (
                            <div key={idx} className="flex items-center gap-1.5">
                              <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200 shrink-0">
                                #{idx + 1}
                              </span>
                              <div className="relative flex-1">
                                <input
                                  type={isShown ? 'text' : 'password'}
                                  value={keyVal}
                                  onChange={(e) => handleKeyListChange(geminiKeys, setGeminiKeys, idx, e.target.value)}
                                  placeholder={idx === 0 ? 'AIzaSy... (Khóa chính)' : 'AIzaSy... (Khóa dự phòng)'}
                                  className="w-full h-9 pl-3 pr-8 text-xs rounded-lg border border-slate-300 font-mono bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => toggleKeyVisibility(keyId)}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                                  title={isShown ? 'Ẩn Key' : 'Hiện Key'}
                                >
                                  <span className="material-symbols-outlined text-sm">
                                    {isShown ? 'visibility_off' : 'visibility'}
                                  </span>
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveKeyRow(geminiKeys, setGeminiKeys, idx)}
                                className="w-8 h-9 rounded-lg border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                                title="Xóa Key này"
                              >
                                <span className="material-symbols-outlined text-sm">delete</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      <div className="text-[10px] text-slate-400">
                        💡 Hỗ trợ dán trực tiếp nhiều API Key cách nhau bằng dấu phẩy (<code>,</code>) hoặc xuống dòng.
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-700">Mô hình Gemini</label>
                        <button
                          type="button"
                          onClick={() => fetchLiveModelsForSetup('gemini', geminiKeys)}
                          disabled={loadingLiveProvider === 'gemini'}
                          className="text-[10px] text-blue-600 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                          title="https://generativelanguage.googleapis.com/v1beta/models"
                        >
                          <span className={`material-symbols-outlined text-xs ${loadingLiveProvider === 'gemini' ? 'animate-spin' : ''}`}>
                            refresh
                          </span>
                          <span>{loadingLiveProvider === 'gemini' ? 'Đang tải...' : 'Lấy Live API'}</span>
                        </button>
                      </div>
                      <select
                        value={geminiModel}
                        onChange={(e) => setGeminiModel(e.target.value)}
                        className="w-full h-9 px-2 text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
                      >
                        {geminiLiveModels.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name || m.id}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Endpoint: <code>https://generativelanguage.googleapis.com/v1beta/models</code>
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. OpenAI */}
                <div
                  className={`p-4 rounded-xl border transition-all ${
                    defaultAi === 'openai' ? 'border-blue-500 bg-blue-50/20 shadow-xs ring-1 ring-blue-500/20' : 'border-slate-200 bg-white'
                  } space-y-3`}
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
                      <span className="material-symbols-outlined text-emerald-600 text-base">smart_toy</span>
                      <span>2. ChatGPT (OpenAI)</span>
                      {defaultAi === 'openai' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-100 text-blue-800">
                          PRIMARY
                        </span>
                      )}
                      {openaiKeys.filter((k) => k.trim()).length > 1 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                          ⚡ {openaiKeys.filter((k) => k.trim()).length} API Keys Pool
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {renderBadge(openaiTest)}
                      <button
                        type="button"
                        onClick={() => handleTestAI('openai')}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 border border-slate-300 transition-colors shadow-xs cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-xs">network_check</span>
                        <span>Test OpenAI Pool</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
                    {/* Multi-Key Manager for OpenAI */}
                    <div className="md:col-span-2 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                          <span>Danh sách OpenAI API Key</span>
                          <span className="text-[10px] text-slate-400 font-normal">(Tự động xoay tua Round-Robin)</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => handleAddKeyRow(openaiKeys, setOpenaiKeys)}
                          className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-xs">add_circle</span>
                          <span>+ Thêm API Key</span>
                        </button>
                      </div>

                      <div className="space-y-2">
                        {openaiKeys.map((keyVal, idx) => {
                          const keyId = `openai_${idx}`;
                          const isShown = !!showKeyMap[keyId];
                          return (
                            <div key={idx} className="flex items-center gap-1.5">
                              <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200 shrink-0">
                                #{idx + 1}
                              </span>
                              <div className="relative flex-1">
                                <input
                                  type={isShown ? 'text' : 'password'}
                                  value={keyVal}
                                  onChange={(e) => handleKeyListChange(openaiKeys, setOpenaiKeys, idx, e.target.value)}
                                  placeholder={idx === 0 ? 'sk-proj-... (Khóa chính)' : 'sk-proj-... (Khóa dự phòng)'}
                                  className="w-full h-9 pl-3 pr-8 text-xs rounded-lg border border-slate-300 font-mono bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => toggleKeyVisibility(keyId)}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                                  title={isShown ? 'Ẩn Key' : 'Hiện Key'}
                                >
                                  <span className="material-symbols-outlined text-sm">
                                    {isShown ? 'visibility_off' : 'visibility'}
                                  </span>
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveKeyRow(openaiKeys, setOpenaiKeys, idx)}
                                className="w-8 h-9 rounded-lg border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                                title="Xóa Key này"
                              >
                                <span className="material-symbols-outlined text-sm">delete</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      <div className="text-[10px] text-slate-400">
                        💡 Hỗ trợ dán trực tiếp nhiều API Key cách nhau bằng dấu phẩy (<code>,</code>) hoặc xuống dòng.
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-700">Mô hình OpenAI</label>
                        <button
                          type="button"
                          onClick={() => fetchLiveModelsForSetup('openai', openaiKeys)}
                          disabled={loadingLiveProvider === 'openai'}
                          className="text-[10px] text-blue-600 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                          title="https://api.openai.com/v1/models"
                        >
                          <span className={`material-symbols-outlined text-xs ${loadingLiveProvider === 'openai' ? 'animate-spin' : ''}`}>
                            refresh
                          </span>
                          <span>{loadingLiveProvider === 'openai' ? 'Đang tải...' : 'Lấy Live API'}</span>
                        </button>
                      </div>
                      <select
                        value={openaiModel}
                        onChange={(e) => setOpenaiModel(e.target.value)}
                        className="w-full h-9 px-2 text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
                      >
                        {openaiLiveModels.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name || m.id}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Endpoint: <code>https://api.openai.com/v1/models</code>
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. Claude */}
                <div
                  className={`p-4 rounded-xl border transition-all ${
                    defaultAi === 'claude' ? 'border-blue-500 bg-blue-50/20 shadow-xs ring-1 ring-blue-500/20' : 'border-slate-200 bg-white'
                  } space-y-3`}
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
                      <span className="material-symbols-outlined text-amber-600 text-base">neurology</span>
                      <span>3. Anthropic Claude</span>
                      {defaultAi === 'claude' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-100 text-blue-800">
                          PRIMARY
                        </span>
                      )}
                      {claudeKeys.filter((k) => k.trim()).length > 1 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                          ⚡ {claudeKeys.filter((k) => k.trim()).length} API Keys Pool
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {renderBadge(claudeTest)}
                      <button
                        type="button"
                        onClick={() => handleTestAI('claude')}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 border border-slate-300 transition-colors shadow-xs cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-xs">network_check</span>
                        <span>Test Claude Pool</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
                    {/* Multi-Key Manager for Claude */}
                    <div className="md:col-span-2 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                          <span>Danh sách Claude API Key</span>
                          <span className="text-[10px] text-slate-400 font-normal">(Tự động xoay tua Round-Robin)</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => handleAddKeyRow(claudeKeys, setClaudeKeys)}
                          className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-xs">add_circle</span>
                          <span>+ Thêm API Key</span>
                        </button>
                      </div>

                      <div className="space-y-2">
                        {claudeKeys.map((keyVal, idx) => {
                          const keyId = `claude_${idx}`;
                          const isShown = !!showKeyMap[keyId];
                          return (
                            <div key={idx} className="flex items-center gap-1.5">
                              <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200 shrink-0">
                                #{idx + 1}
                              </span>
                              <div className="relative flex-1">
                                <input
                                  type={isShown ? 'text' : 'password'}
                                  value={keyVal}
                                  onChange={(e) => handleKeyListChange(claudeKeys, setClaudeKeys, idx, e.target.value)}
                                  placeholder={idx === 0 ? 'sk-ant-... (Khóa chính)' : 'sk-ant-... (Khóa dự phòng)'}
                                  className="w-full h-9 pl-3 pr-8 text-xs rounded-lg border border-slate-300 font-mono bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => toggleKeyVisibility(keyId)}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                                  title={isShown ? 'Ẩn Key' : 'Hiện Key'}
                                >
                                  <span className="material-symbols-outlined text-sm">
                                    {isShown ? 'visibility_off' : 'visibility'}
                                  </span>
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveKeyRow(claudeKeys, setClaudeKeys, idx)}
                                className="w-8 h-9 rounded-lg border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                                title="Xóa Key này"
                              >
                                <span className="material-symbols-outlined text-sm">delete</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      <div className="text-[10px] text-slate-400">
                        💡 Hỗ trợ dán trực tiếp nhiều API Key cách nhau bằng dấu phẩy (<code>,</code>) hoặc xuống dòng.
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-700">Mô hình Claude</label>
                        <button
                          type="button"
                          onClick={() => fetchLiveModelsForSetup('claude', claudeKeys)}
                          disabled={loadingLiveProvider === 'claude'}
                          className="text-[10px] text-blue-600 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                          title="https://api.anthropic.com/v1/models"
                        >
                          <span className={`material-symbols-outlined text-xs ${loadingLiveProvider === 'claude' ? 'animate-spin' : ''}`}>
                            refresh
                          </span>
                          <span>{loadingLiveProvider === 'claude' ? 'Đang tải...' : 'Lấy Live API'}</span>
                        </button>
                      </div>
                      <select
                        value={claudeModel}
                        onChange={(e) => setClaudeModel(e.target.value)}
                        className="w-full h-9 px-2 text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
                      >
                        {claudeLiveModels.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name || m.id}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Endpoint: <code>https://api.anthropic.com/v1/models</code>
                      </p>
                    </div>
                  </div>
                </div>

                {/* 4. Custom MCP */}
                <div
                  className={`p-4 rounded-xl border transition-all ${
                    defaultAi === 'custom-mcp' ? 'border-blue-500 bg-blue-50/20 shadow-xs ring-1 ring-blue-500/20' : 'border-slate-200 bg-white'
                  } space-y-3`}
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
                      <span className="material-symbols-outlined text-purple-600 text-base">terminal</span>
                      <span>4. Custom MCP / Local LLM</span>
                      {defaultAi === 'custom-mcp' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-100 text-blue-800">
                          PRIMARY
                        </span>
                      )}
                      {customMcpKeys.filter((k) => k.trim()).length > 1 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                          ⚡ {customMcpKeys.filter((k) => k.trim()).length} Keys Pool
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {renderBadge(mcpTest)}
                      <button
                        type="button"
                        onClick={() => handleTestAI('custom-mcp')}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 border border-slate-300 transition-colors shadow-xs cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-xs">network_check</span>
                        <span>Test Endpoint</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700">Base URL Endpoint *</label>
                        <input
                          type="text"
                          value={customMcpUrl}
                          onChange={(e) => setCustomMcpUrl(e.target.value)}
                          placeholder="http://localhost:11434/v1"
                          className="w-full h-9 px-3 text-xs rounded-lg border border-slate-300 font-mono bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700">Model Name</label>
                        <input
                          type="text"
                          value={customMcpModel}
                          onChange={(e) => setCustomMcpModel(e.target.value)}
                          placeholder="llama3:8b, mistral, qwen2.5"
                          className="w-full h-9 px-3 text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Multi-Key Manager for Custom MCP */}
                    <div className="space-y-2 pt-1 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                          <span>API Key / Bearer Tokens (Custom MCP / Ollama)</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => handleAddKeyRow(customMcpKeys, setCustomMcpKeys)}
                          className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-xs">add_circle</span>
                          <span>+ Thêm Token</span>
                        </button>
                      </div>

                      <div className="space-y-2">
                        {customMcpKeys.map((keyVal, idx) => {
                          const keyId = `mcp_${idx}`;
                          const isShown = !!showKeyMap[keyId];
                          return (
                            <div key={idx} className="flex items-center gap-1.5">
                              <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200 shrink-0">
                                #{idx + 1}
                              </span>
                              <div className="relative flex-1">
                                <input
                                  type={isShown ? 'text' : 'password'}
                                  value={keyVal}
                                  onChange={(e) => handleKeyListChange(customMcpKeys, setCustomMcpKeys, idx, e.target.value)}
                                  placeholder="ollama hoặc Bearer token..."
                                  className="w-full h-9 pl-3 pr-8 text-xs rounded-lg border border-slate-300 font-mono bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => toggleKeyVisibility(keyId)}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                                  title={isShown ? 'Ẩn Token' : 'Hiện Token'}
                                >
                                  <span className="material-symbols-outlined text-sm">
                                    {isShown ? 'visibility_off' : 'visibility'}
                                  </span>
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveKeyRow(customMcpKeys, setCustomMcpKeys, idx)}
                                className="w-8 h-9 rounded-lg border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                                title="Xóa Token này"
                              >
                                <span className="material-symbols-outlined text-sm">delete</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-5 py-2 rounded-lg border border-slate-300 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  Quay lại Bước 1
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-6 py-2.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-md"
                >
                  <span>Tiếp tục: Rate Limit & Bảo Mật 2FA</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: RATE LIMIT & GOOGLE AUTHENTICATOR 2FA */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-600">shield</span>
                  <span>Bước 3: Thiết lập Giới hạn Tần suất & Bảo Mật 2FA</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Sliding Window Rate Limiter bảo vệ API và Google Authenticator (RFC 6238 TOTP) bảo mật tài khoản.
                </p>
              </div>

              {/* Rate Limit Section */}
              <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-600 text-xl">speed</span>
                  <span className="text-sm font-bold text-slate-800">1. Sliding Window Rate Limiter</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Khung thời gian cửa sổ trượt (Giây)</label>
                    <input
                      type="number"
                      value={rateWindow}
                      onChange={(e) => setRateWindow(e.target.value)}
                      placeholder="60"
                      className="w-full h-9 px-3 text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Số lượng yêu cầu tối đa cho mỗi IP</label>
                    <input
                      type="number"
                      value={rateMax}
                      onChange={(e) => setRateMax(e.target.value)}
                      placeholder="100"
                      className="w-full h-9 px-3 text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Google Authenticator Section (Replacing SMTP) */}
              <div className="p-5 rounded-xl border border-blue-200 bg-blue-50/50 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-600 text-xl">verified_user</span>
                  <span className="text-sm font-bold text-slate-800">2. Xác thực 2 lớp Google Authenticator (2FA)</span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Tài khoản hệ thống được bảo vệ bằng mã OTP 6 số theo chuẩn bảo mật thời gian thực <strong>RFC 6238 TOTP</strong>. Trong lần đăng nhập đầu tiên, hệ thống sẽ tự động cung cấp mã QR và chuỗi khóa Base32 để bạn quét vào app <strong>Google Authenticator</strong> trên điện thoại.
                </p>

                <div className="p-3.5 rounded-lg bg-white border border-blue-200 flex items-start gap-3">
                  <span className="material-symbols-outlined text-emerald-600 text-xl shrink-0 mt-0.5">check_circle</span>
                  <div className="text-xs text-slate-700 space-y-1">
                    <span className="font-bold text-emerald-700 block">Đã cấu hình sẵn &amp; Miễn phí trọn đời</span>
                    <p className="text-slate-500 text-[11px]">
                      Hoàn toàn không phụ thuộc vào máy chủ gửi Mail (SMTP), không lo chậm trễ hoặc rơi vào hòm thư rác (Spam).
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-5 py-2 rounded-lg border border-slate-300 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  Quay lại Bước 2
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="px-6 py-2.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-md"
                >
                  <span>Tiếp tục: Tạo Master Admin</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: MASTER ADMIN & LAUNCH */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-600">admin_panel_settings</span>
                  <span>Bước 4: Khởi tạo Tài khoản Quản trị Tối cao (Master Admin)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Tài khoản có quyền kiểm soát toàn bộ cơ sở và khóa bảo mật hệ thống vĩnh viễn sau thiết lập.
                </p>
              </div>

              <div className="p-5 rounded-xl border border-blue-200 bg-blue-50/40 flex items-start gap-3">
                <span className="material-symbols-outlined text-blue-600 text-2xl mt-0.5">lock_person</span>
                <div className="text-xs text-blue-900 leading-relaxed">
                  <strong>Khóa vĩnh viễn (Permanent Zero-Day Lock):</strong> Toàn bộ cấu hình sẽ được lưu vào file{' '}
                  <code>.env</code> và tạo bảng cơ sở dữ liệu. Endpoint <code>/setup</code> sẽ khóa sau khi tạo xong.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Tên cơ sở giáo dục / Trường học *</label>
                  <input
                    type="text"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder="Ví dụ: Trường THPT Chuyên Quốc Gia"
                    className="w-full h-10 px-3 text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Họ và tên Quản trị viên *</label>
                  <input
                    type="text"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="Ví dụ: ThS. Nguyễn Văn Quản Trị"
                    className="w-full h-10 px-3 text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Email Quản trị viên (Đăng nhập) *</label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@truonghoc.edu.vn"
                  className="w-full h-10 px-3 text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Mật khẩu Quản trị viên *</label>
                  <input
                    type="password"
                    value={adminPass}
                    onChange={(e) => setAdminPass(e.target.value)}
                    placeholder="Tối thiểu 8 ký tự, 1 chữ hoa, 1 số"
                    className="w-full h-10 px-3 text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Xác nhận Mật khẩu *</label>
                  <input
                    type="password"
                    value={adminPassConfirm}
                    onChange={(e) => setAdminPassConfirm(e.target.value)}
                    placeholder="Nhập lại mật khẩu"
                    className="w-full h-10 px-3 text-xs rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  Quay lại Bước 3
                </button>
                <button
                  type="button"
                  onClick={handleFinishSetup}
                  disabled={isSubmitting}
                  className={`px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-extrabold transition-all shadow-lg flex items-center gap-2 ${
                    isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isSubmitting ? (
                    <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                  ) : (
                    <span className="material-symbols-outlined text-base">rocket_launch</span>
                  )}
                  <span>{isSubmitting ? 'Đang Khởi tạo Hệ thống...' : 'Hoàn tất Cài đặt & Kích hoạt Beta 1.0'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full text-center py-2 text-xs text-slate-400">
        <span>Examify Academic Assessment Platform • Beta 1.0 Initial Setup Engine</span>
      </div>
    </div>
  );
}
