'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/lib/store/app-store';
import UserAvatar from '@/components/common/UserAvatar';

export const LoginView: React.FC = () => {
  const { setUser, setToken, setCurrentRoute, showToast, fetchExams } = useAppStore();

  // Multi-step authentication: 1. Credentials -> 2. Google Authenticator
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  // Google Authenticator state returned after credentials check
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secretKey, setSecretKey] = useState<string | null>(null);
  const [verifiedUser, setVerifiedUser] = useState<{
    id: string;
    email: string;
    fullName?: string;
    role?: string;
    institutionName?: string;
  } | null>(null);

  // Step 1: Verify Email and Password
  const handleVerifyCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      showToast('Vui lòng nhập đầy đủ email và mật khẩu', 'warning');
      return;
    }
    setLoading(true);

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (!data.data.requires2FA) {
          // Direct login (Default when 2FA is OFF in account settings)
          const authToken = data.data.token;
          const authUser = data.data.user;

          if (authToken) {
            setToken(authToken);
            if (typeof window !== 'undefined') {
              localStorage.setItem('examify_token', authToken);
              document.cookie = `examify_token=${authToken}; path=/; max-age=604800; SameSite=Lax`;
            }
          }

          const profile = {
            id: authUser.id,
            name: authUser.fullName || email.split('@')[0] || 'Cán bộ Khảo thí',
            email: authUser.email,
            role: authUser.role === 'ADMIN' ? 'Quản trị viên Khảo thí' : 'Giáo viên bộ môn',
            school: authUser.institutionName || 'Hệ thống Khảo thí Examify',
            avatarStyle: 'identicon' as const,
          };

          setUser(profile);
          if (typeof window !== 'undefined') {
            localStorage.setItem('examify_user', JSON.stringify(profile));
          }

          if (authToken) {
            fetchExams(authToken);
          }

          showToast('Đăng nhập thành công! Đang vào bảng điều khiển...', 'success');
          setTimeout(() => {
            setCurrentRoute('#dashboard');
          }, 300);
          return;
        }

        // 2FA is turned ON in account settings -> Transition to Step 2: Google Authenticator
        setTempToken(data.data.tempToken);
        setVerifiedUser(data.data.user);
        setStep('otp');
        setOtp('');
        showToast('Mật khẩu chính xác! Vui lòng nhập mã Google Authenticator.', 'info');
      } else {
        showToast(data.error || 'Email hoặc mật khẩu không chính xác', 'error');
      }
    } catch {
      showToast('Không thể kết nối đến máy chủ xác thực', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify 6-digit Google Authenticator TOTP Code
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOtp = otp.trim().replace(/\s+/g, '');
    if (!cleanOtp || cleanOtp.length !== 6) {
      showToast('Vui lòng nhập đủ 6 chữ số từ ứng dụng Google Authenticator', 'warning');
      return;
    }

    if (!tempToken) {
      showToast('Phiên xác thực đã hết hạn, vui lòng đăng nhập lại', 'error');
      handleBackToCredentials();
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/v1/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken, code: cleanOtp }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const authToken = data.data.token;
        const authUser = data.data.user;

        if (authToken) {
          setToken(authToken);
          if (typeof window !== 'undefined') {
            localStorage.setItem('examify_token', authToken);
            document.cookie = `examify_token=${authToken}; path=/; max-age=604800; SameSite=Lax`;
          }
        }

        const profile = {
          id: authUser.id,
          name: authUser.fullName || email.split('@')[0] || 'Cán bộ Khảo thí',
          email: authUser.email,
          role: authUser.role === 'ADMIN' ? 'Quản trị viên Khảo thí' : 'Giáo viên bộ môn',
          school: authUser.institutionName || 'Hệ thống Khảo thí Examify',
          avatarStyle: 'identicon' as const,
        };

        setUser(profile);
        if (typeof window !== 'undefined') {
          localStorage.setItem('examify_user', JSON.stringify(profile));
        }

        if (authToken) {
          fetchExams(authToken);
        }

        showToast('Xác thực Google Authenticator thành công! Đang vào hệ thống...', 'success');
        setTimeout(() => {
          setCurrentRoute('#dashboard');
        }, 500);
      } else {
        showToast(data.error || 'Mã Google Authenticator không chính xác hoặc đã hết hạn', 'error');
      }
    } catch {
      showToast('Không thể kết nối đến máy chủ xác thực', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToCredentials = () => {
    setStep('credentials');
    setOtp('');
    setPassword('');
    setTempToken(null);
    setVerifiedUser(null);
    setQrCode(null);
    setSecretKey(null);
  };

  const handleCopySecret = () => {
    if (secretKey) {
      navigator.clipboard.writeText(secretKey);
      showToast('Đã sao chép khóa bí mật vào bộ nhớ tạm', 'success');
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-80px)] flex items-center justify-center p-4">
      <div className="w-full max-w-5xl mx-auto py-6">
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[580px] border border-slate-200 dark:border-slate-800">
          {/* LEFT COLUMN: Institutional Visual & AI Examination Hero (5 cols) */}
          <div className="lg:col-span-5 bg-gradient-to-br from-blue-700 via-indigo-700 to-slate-900 p-8 lg:p-10 flex flex-col justify-between text-white relative overflow-hidden">
            <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-cyan-400/20 blur-3xl pointer-events-none" />
            <div className="absolute -left-12 -bottom-12 w-56 h-56 rounded-full bg-indigo-400/20 blur-2xl pointer-events-none" />

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-11 h-11 rounded-2xl bg-white text-blue-700 flex items-center justify-center shadow-lg">
                  <span className="material-symbols-outlined text-2xl font-bold">psychology</span>
                </div>
                <div>
                  <span className="text-xl font-bold tracking-tight block text-white">Examify AI</span>
                  <span className="text-[10px] text-blue-200 tracking-wider uppercase block font-semibold">
                    Hệ sinh thái Khảo thí Quốc gia
                  </span>
                </div>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-xs mb-5 backdrop-blur-sm border border-white/15">
                <span className="material-symbols-outlined text-cyan-300 text-sm">verified_user</span>
                <span>Bảo mật cấp độ Sư phạm &amp; ISO/IEC 27001</span>
              </div>

              <h2 className="text-2xl lg:text-3xl font-bold leading-tight mb-3 text-white">
                Hạ tầng số hoá Ma trận &amp; Khảo thí Trí tuệ nhân tạo
              </h2>

              <p className="text-xs text-blue-100 leading-relaxed mb-6">
                Bảo vệ tài khoản khảo thí giáo dục bằng xác thực 2 lớp chuẩn RFC 6238 TOTP thông qua Google Authenticator trên thiết bị cá nhân.
              </p>

              <div className="space-y-3">
                <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-2xl flex items-center gap-3 border border-white/10">
                  <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-cyan-300 text-lg">auto_graph</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-white">Ma trận đề tự động Bloom</p>
                    <p className="text-[11px] text-blue-200 truncate">4 cấp độ: Nhận biết, Thông hiểu, Vận dụng, Vận dụng cao</p>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-2xl flex items-center gap-3 border border-white/10">
                  <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-cyan-300 text-lg">shield</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-white">Google Authenticator (2FA)</p>
                    <p className="text-[11px] text-blue-200 truncate">Chuẩn mã hoá RFC 6238 TOTP bảo mật thời gian thực</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-10 pt-6">
              <div className="flex items-center justify-between text-[11px] text-blue-200 border-t border-white/10 pt-4">
                <span>© 2025 Trung tâm Khảo thí Quốc gia</span>
                <span className="inline-flex items-center gap-1.5 font-semibold text-cyan-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Hệ thống Hoạt động
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Authentication Area (7 cols) */}
          <div className="lg:col-span-7 p-8 lg:p-12 flex flex-col justify-between bg-white dark:bg-slate-900">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
                <div className="flex items-center gap-3">
                  <UserAvatar
                    name={email ? email.split('@')[0] : 'Examify'}
                    email={email}
                    size="md"
                    rounded="rounded-2xl"
                    defaultType="identicon"
                    showIndicator={!!email.includes('@')}
                    className="shadow-md shadow-blue-500/10"
                  />
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      {step === 'credentials' ? 'Đăng nhập Cổng Khảo thí' : 'Xác thực Google Authenticator (2FA)'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {step === 'credentials' ? (
                        email.includes('@') ? (
                          <span className="text-blue-600 dark:text-blue-400 font-semibold truncate max-w-[220px] inline-block align-bottom">
                            {email}
                          </span>
                        ) : (
                          'Dành cho Cán bộ Quản lý & Giáo viên'
                        )
                      ) : (
                        'Mở app Google Authenticator để lấy mã xác thực'
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* STEP 1: CREDENTIALS (Email & Password) */}
              {step === 'credentials' && (
                <form onSubmit={handleVerifyCredentials} className="space-y-4 animate-in fade-in duration-200">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Email sư phạm / Tên đăng nhập *
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">
                        mail
                      </span>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="minhmcpc.tao@gmail.com"
                        className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Mật khẩu *
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          showToast('Vui lòng liên hệ Quản trị viên trường để nhận liên kết đặt lại mật khẩu', 'info')
                        }
                        className="text-[11px] text-blue-600 hover:underline cursor-pointer"
                      >
                        Quên mật khẩu?
                      </button>
                    </div>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">
                        lock
                      </span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-9 pr-10 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">
                          {showPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="text-xs text-slate-600 dark:text-slate-400">
                        Ghi nhớ tài khoản này
                      </span>
                    </label>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Đang kiểm tra tài khoản...</span>
                        </>
                      ) : (
                        <>
                          <span>Đăng nhập</span>
                          <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 2: GOOGLE AUTHENTICATOR 2FA VERIFICATION */}
              {step === 'otp' && (
                <form onSubmit={handleVerifyOtp} className="space-y-4 animate-in fade-in duration-200">
                  {/* Account Badge */}
                  <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar
                        name={verifiedUser?.fullName || email}
                        email={email}
                        size="md"
                        rounded="rounded-xl"
                        defaultType="identicon"
                        showIndicator={true}
                      />
                      <div className="min-w-0 text-left">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate block">
                          {verifiedUser?.fullName || email.split('@')[0]}
                        </span>
                        <span className="text-[11px] text-blue-700 dark:text-blue-300 font-medium truncate block">
                          {email}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleBackToCredentials}
                      className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:underline font-semibold shrink-0 cursor-pointer"
                    >
                      Đổi tài khoản
                    </button>
                  </div>

                  {/* If First Time Setup: Show QR Code & Manual Key */}
                  {isFirstTimeSetup && qrCode ? (
                    <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-center space-y-3">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 text-[11px] font-bold">
                        <span className="material-symbols-outlined text-xs">qr_code_scanner</span>
                        <span>Cài đặt Google Authenticator lần đầu</span>
                      </div>

                      <p className="text-xs text-slate-700 dark:text-slate-300 max-w-sm mx-auto">
                        Mở app <strong>Google Authenticator</strong> trên điện thoại, bấm dấu <strong>+</strong> và quét mã QR dưới đây:
                      </p>

                      <div className="flex justify-center my-2">
                        <div className="p-2 bg-white rounded-2xl shadow-sm border border-slate-200 inline-block">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={qrCode}
                            alt="Google Authenticator QR Code"
                            className="w-40 h-40 object-contain mx-auto"
                          />
                        </div>
                      </div>

                      {secretKey && (
                        <div className="flex items-center justify-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                          <span>Khóa nhập tay:</span>
                          <code className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                            {secretKey}
                          </code>
                          <button
                            type="button"
                            onClick={handleCopySecret}
                            className="text-blue-600 hover:underline font-semibold cursor-pointer"
                          >
                            Sao chép
                          </button>
                        </div>
                      )}
                    </div>
                  ) : null}

                  {/* 6-digit TOTP Input */}
                  <div className="space-y-2 pt-2 text-center">
                    {!isFirstTimeSetup && (
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto shadow-xs">
                        <span className="material-symbols-outlined text-2xl">verified_user</span>
                      </div>
                    )}
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      Nhập mã 6 chữ số từ Google Authenticator
                    </label>
                    <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                      Mã gồm 6 số và tự động thay đổi mỗi 30 giây trên điện thoại của bạn.
                    </p>

                    <div className="pt-2 max-w-xs mx-auto">
                      <input
                        type="text"
                        maxLength={6}
                        required
                        autoFocus
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••••"
                        className="w-full py-3 text-2xl font-mono tracking-[0.5em] text-center rounded-2xl border-2 border-blue-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-blue-500/20 shadow-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <button
                      type="submit"
                      disabled={loading || otp.trim().length !== 6}
                      className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Đang kiểm tra mã xác thực...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-sm">check_circle</span>
                          <span>Xác nhận &amp; Vào hệ thống</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleBackToCredentials}
                      className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">arrow_back</span>
                      <span>Quay lại nhập mật khẩu</span>
                    </button>
                  </div>
                </form>
              )}
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800 text-center">
              <p className="text-[11px] text-slate-400">
                Chưa cài ứng dụng? Tải <strong>Google Authenticator</strong> trên App Store hoặc Google Play Store để kích hoạt 2FA.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
