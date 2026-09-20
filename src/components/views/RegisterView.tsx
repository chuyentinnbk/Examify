'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/lib/store/app-store';

export const RegisterView: React.FC = () => {
  const { setUser, setToken, setCurrentRoute, showToast, fetchExams } = useAppStore();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [school, setSchool] = useState('');
  const [department, setDepartment] = useState('Toán - Tin học');
  const [agreed, setAgreed] = useState(true);
  const [loading, setLoading] = useState(false);

  // Password strength calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: 'Chưa nhập', color: 'bg-slate-200' };
    let score = 0;
    if (pass.length >= 6) score++;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 2) return { score: 1, label: 'Yếu', color: 'bg-rose-500' };
    if (score <= 3) return { score: 2, label: 'Trung bình', color: 'bg-amber-500' };
    if (score <= 4) return { score: 3, label: 'Khá', color: 'bg-blue-500' };
    return { score: 4, label: 'Mạnh & An toàn', color: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      showToast('Vui lòng nhập họ và tên giáo viên', 'warning');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      showToast('Vui lòng nhập email hợp lệ', 'warning');
      return;
    }

    if (password.length < 6) {
      showToast('Mật khẩu phải có ít nhất 6 ký tự', 'warning');
      return;
    }

    if (password !== confirmPassword) {
      showToast('Mật khẩu xác nhận không khớp', 'error');
      return;
    }

    if (!agreed) {
      showToast('Vui lòng đồng ý với điều khoản & quy chế khảo thí', 'warning');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          password,
          school: school.trim() || 'Hệ thống Khảo thí Examify',
          department: department.trim(),
        }),
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
          name: authUser.fullName || fullName.trim(),
          email: authUser.email,
          role: 'Giáo viên bộ môn',
          school: authUser.institutionName || school.trim() || 'Hệ thống Khảo thí Examify',
          avatarStyle: 'identicon' as const,
        };

        setUser(profile);
        if (typeof window !== 'undefined') {
          localStorage.setItem('examify_user', JSON.stringify(profile));
        }

        if (authToken) {
          fetchExams(authToken);
        }

        showToast('Đăng ký tài khoản thành công! Đang chuyển đến Bảng điều khiển...', 'success');
        setTimeout(() => {
          setCurrentRoute('#dashboard');
        }, 500);
      } else {
        showToast(data.error || data.message || 'Lỗi khi đăng ký tài khoản', 'error');
      }
    } catch {
      showToast('Không thể kết nối máy chủ xác thực', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-80px)] flex items-center justify-center p-4">
      <div className="w-full max-w-5xl mx-auto py-6">
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[620px] border border-slate-200 dark:border-slate-800">
          {/* LEFT COLUMN: Educational Branding & Platform Highlights (5 cols) */}
          <div className="lg:col-span-5 bg-gradient-to-br from-indigo-700 via-blue-700 to-slate-900 p-8 lg:p-10 flex flex-col justify-between text-white relative overflow-hidden">
            <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-cyan-400/20 blur-3xl pointer-events-none" />
            <div className="absolute -left-12 -bottom-12 w-56 h-56 rounded-full bg-blue-400/20 blur-2xl pointer-events-none" />

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-11 h-11 rounded-2xl bg-white text-blue-700 flex items-center justify-center shadow-lg">
                  <span className="material-symbols-outlined text-2xl font-bold">how_to_reg</span>
                </div>
                <div>
                  <span className="text-xl font-bold tracking-tight block text-white">Examify AI</span>
                  <span className="text-[10px] text-blue-200 tracking-wider uppercase block font-semibold">
                    Hệ sinh thái Khảo thí Quốc gia
                  </span>
                </div>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-xs mb-5 backdrop-blur-sm border border-white/15">
                <span className="material-symbols-outlined text-cyan-300 text-sm">verified</span>
                <span>Chuẩn Kỳ Thi Bộ GD&amp;ĐT 2025</span>
              </div>

              <h2 className="text-2xl lg:text-3xl font-bold leading-tight mb-3 text-white">
                Khởi tạo Không gian Số Khảo thí Dành cho Giáo viên
              </h2>

              <p className="text-xs text-blue-100 leading-relaxed mb-6">
                Đăng ký ngay để trải nghiệm công cụ biên soạn đề thi chuyên nghiệp theo định dạng mới nhất: 4 dạng thức câu hỏi, tự động phân bố ma trận Bloom, và liên thông 34 Sở GD&amp;ĐT.
              </p>

              <div className="space-y-3">
                <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-2xl flex items-center gap-3 border border-white/10">
                  <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-cyan-300 text-lg">fact_check</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-white">4 Dạng thức Câu hỏi Mới</p>
                    <p className="text-[11px] text-blue-200 truncate">Trắc nghiệm, Đúng/Sai (a-d), Trả lời ngắn &amp; Tự luận</p>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-2xl flex items-center gap-3 border border-white/10">
                  <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-cyan-300 text-lg">download</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-white">Xuất File Đa Định Dạng</p>
                    <p className="text-[11px] text-blue-200 truncate">Word (.docx, .doc), LaTeX (.tex), PDF in chuẩn &amp; Trọn bộ Zip</p>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-2xl flex items-center gap-3 border border-white/10">
                  <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-cyan-300 text-lg">account_balance</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-white">Đầu đề chuẩn Sở GD&amp;ĐT</p>
                    <p className="text-[11px] text-blue-200 truncate">Tuỳ biến xuất xứ và mã đề thi trực tiếp linh hoạt</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-10 pt-6">
              <div className="flex items-center justify-between text-[11px] text-blue-200 border-t border-white/15 pt-4">
                <span>© 2026 Examify Platform</span>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Máy chủ Khảo thí sẵn sàng</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Registration Form (7 cols) */}
          <div className="lg:col-span-7 p-8 lg:p-10 flex flex-col justify-center bg-white dark:bg-slate-900">
            <div className="max-w-md w-full mx-auto">
              <div className="mb-6 text-left">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-semibold mb-2">
                  <span className="material-symbols-outlined text-sm">badge</span>
                  <span>Tài khoản Giáo viên &amp; Cán bộ chuyên môn</span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  Đăng Ký Tài Khoản Mới
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Nhập thông tin sư phạm để bắt đầu sử dụng hệ sinh thái khảo thí
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Full Name */}
                <div className="space-y-1 text-left">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Họ và tên giáo viên <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base">
                      person
                    </span>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ví dụ: ThS. Nguyễn Văn An"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1 text-left">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Email công vụ / Nhà trường <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base">
                      mail
                    </span>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="an.nguyen@thpt.edu.vn"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Password & Confirm Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1 text-left">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Mật khẩu <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base">
                        lock
                      </span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Tối thiểu 6 ký tự"
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">
                          {showPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1 text-left">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Xác nhận mật khẩu <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base">
                        lock_reset
                      </span>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Nhập lại mật khẩu"
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">
                          {showConfirmPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Password Strength Indicator */}
                {password && (
                  <div className="space-y-1 pt-0.5 text-left">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 dark:text-slate-400">Độ mạnh mật khẩu:</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {strength.label}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex gap-1">
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className={`h-full flex-1 rounded-full transition-all ${
                            strength.score >= level ? strength.color : 'bg-transparent'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* School & Department */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1 text-left">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Trường / Đơn vị
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base">
                        school
                      </span>
                      <input
                        type="text"
                        value={school}
                        onChange={(e) => setSchool(e.target.value)}
                        placeholder="THPT Chuyên Hà Nội..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1 text-left">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Tổ bộ môn
                    </label>
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all cursor-pointer"
                    >
                      <option value="Toán - Tin học">Toán - Tin học</option>
                      <option value="KHTN (Lý - Hóa - Sinh)">KHTN (Lý - Hóa - Sinh)</option>
                      <option value="KHXH (Sử - Địa - GDCD)">KHXH (Sử - Địa - GDCD)</option>
                      <option value="Ngoại ngữ">Ngoại ngữ</option>
                      <option value="Ngữ văn">Ngữ văn</option>
                      <option value="Công nghệ & Tin học">Công nghệ &amp; Tin học</option>
                    </select>
                  </div>
                </div>

                {/* Terms agreement */}
                <div className="pt-1 text-left">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      className="w-4 h-4 mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight">
                      Tôi đồng ý với <strong>Điều khoản Dịch vụ</strong> và cam kết tuân thủ{' '}
                      <strong>Quy chế Bảo mật Khảo thí Sư phạm</strong>.
                    </span>
                  </label>
                </div>

                {/* Submit button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Đang khởi tạo tài khoản...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-sm">person_add</span>
                        <span>Đăng Ký Tài Khoản</span>
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Back to Login */}
              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Đã có tài khoản giáo viên?{' '}
                  <button
                    type="button"
                    onClick={() => setCurrentRoute('#login')}
                    className="font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    Đăng nhập ngay
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterView;
