'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store/app-store';
import PortalModal from '@/components/common/PortalModal';
import UserAvatar from '@/components/common/UserAvatar';
import { GRAVATAR_STYLES, GravatarDefault } from '@/lib/gravatar';

export default function ProfileView() {
  const { user, setUser, showToast } = useAppStore();

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState(user.role);
  const [school, setSchool] = useState(user.school);
  const [avatarStyle, setAvatarStyle] = useState<GravatarDefault>(user.avatarStyle || 'identicon');

  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  // 2FA Google Authenticator state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [setupData, setSetupData] = useState<{ qrCode: string; secret: string } | null>(null);
  const [confirmCode, setConfirmCode] = useState('');
  const [loading2FA, setLoading2FA] = useState(false);

  // Sync local state when user in appStore updates
  useEffect(() => {
    if (user.name) setName(user.name);
    if (user.email) setEmail(user.email);
    if (user.role) setRole(user.role);
    if (user.school) setSchool(user.school);
    if (user.avatarStyle) setAvatarStyle(user.avatarStyle);
  }, [user]);

  // Fetch initial profile & 2FA status from server
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('examify_token') : null;
    if (!token) return;

    fetch('/api/v1/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data?.user) {
          const u = data.data.user;
          setTwoFactorEnabled(!!u.twoFactorEnabled);
          if (u.fullName) setName(u.fullName);
          if (u.email) setEmail(u.email);
          if (u.role) setRole(u.role === 'ADMIN' ? 'Quản trị viên Khảo thí' : 'Giáo viên bộ môn');
          if (u.institutionName) setSchool(u.institutionName);
          if (u.avatarStyle) setAvatarStyle(u.avatarStyle);
        }
      })
      .catch(() => {});
  }, []);

  const handleOpenSetup2FA = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('examify_token') : null;
    if (!token) return;

    setLoading2FA(true);
    try {
      const res = await fetch('/api/v1/auth/2fa/setup', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.data) {
        setSetupData({ qrCode: data.data.qrCode, secret: data.data.secret });
        setShowSetupModal(true);
        setConfirmCode('');
      } else {
        showToast(data.error || 'Không thể tải mã cài đặt 2FA', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ', 'error');
    } finally {
      setLoading2FA(false);
    }
  };

  const handleConfirmEnable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = typeof window !== 'undefined' ? localStorage.getItem('examify_token') : null;
    if (!token || confirmCode.trim().length !== 6) {
      showToast('Vui lòng nhập đủ 6 chữ số từ app Google Authenticator', 'warning');
      return;
    }

    setLoading2FA(true);
    try {
      const res = await fetch('/api/v1/auth/2fa/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'enable', code: confirmCode.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setTwoFactorEnabled(true);
        setShowSetupModal(false);
        setSetupData(null);
        setConfirmCode('');
        showToast('Đã kích hoạt xác thực 2 bước Google Authenticator thành công!', 'success');
      } else {
        showToast(data.error || 'Mã xác thực không chính xác', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ', 'error');
    } finally {
      setLoading2FA(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!confirm('Bạn có chắc chắn muốn tắt xác thực 2 bước Google Authenticator?')) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('examify_token') : null;
    if (!token) return;

    setLoading2FA(true);
    try {
      const res = await fetch('/api/v1/auth/2fa/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'disable' }),
      });
      const data = await res.json();
      if (data.success) {
        setTwoFactorEnabled(false);
        showToast('Đã tắt tính năng xác thực 2 bước (2FA)', 'info');
      } else {
        showToast(data.error || 'Không thể tắt 2FA', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ', 'error');
    } finally {
      setLoading2FA(false);
    }
  };

  const handleCopySecret = () => {
    if (setupData?.secret) {
      navigator.clipboard.writeText(setupData.secret);
      showToast('Đã sao chép khóa bí mật vào bộ nhớ tạm', 'success');
    }
  };

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = typeof window !== 'undefined' ? localStorage.getItem('examify_token') : null;
    setIsSavingProfile(true);

    try {
      if (token) {
        const res = await fetch('/api/v1/auth/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            fullName: name,
            school,
            avatarStyle,
          }),
        });

        const data = await res.json();
        if (data.success && data.data?.user) {
          const u = data.data.user;
          const updated = {
            ...user,
            name: u.fullName || name,
            school: u.institutionName || school,
            avatarStyle: u.avatarStyle || avatarStyle,
          };
          setUser(updated);
          localStorage.setItem('examify_user', JSON.stringify(updated));
          showToast('Đã lưu thông tin tài khoản và cấu hình vào cơ sở dữ liệu!', 'success');
          return;
        } else {
          const errorMsg = typeof data.error === 'string' ? data.error : (data.message || 'Cập nhật thông tin thất bại');
          showToast(errorMsg, 'error');
          return;
        }
      }

      setUser({ ...user, name, email, role, school, avatarStyle });
      showToast('Đã cập nhật thông tin tài khoản', 'success');
    } catch {
      showToast('Lỗi khi lưu thông tin tài khoản', 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPass || !newPass) {
      showToast('Vui lòng điền đầy đủ các trường mật khẩu', 'warning');
      return;
    }
    if (newPass !== confirmPass) {
      showToast('Mật khẩu mới không trùng khớp', 'error');
      return;
    }
    if (newPass.length < 6) {
      showToast('Mật khẩu mới phải có tối thiểu 6 ký tự', 'warning');
      return;
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('examify_token') : null;
    if (!token) {
      showToast('Vui lòng đăng nhập lại để đổi mật khẩu', 'error');
      return;
    }

    setIsChangingPass(true);
    try {
      const res = await fetch('/api/v1/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: currentPass,
          newPassword: newPass,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setCurrentPass('');
        setNewPass('');
        setConfirmPass('');
        showToast('Đã đổi mật khẩu tài khoản thành công trong cơ sở dữ liệu!', 'success');
      } else {
        const errorMsg = typeof data.error === 'string' ? data.error : (data.message || 'Đổi mật khẩu thất bại');
        showToast(errorMsg, 'error');
      }
    } catch {
      showToast('Lỗi máy chủ khi đổi mật khẩu', 'error');
    } finally {
      setIsChangingPass(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full pb-16 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
          <span className="material-symbols-outlined text-blue-600 text-2xl">manage_accounts</span>
          <span>Tài Khoản Cá Nhân &amp; Bảo Mật</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Quản lý thông tin định danh sư phạm, khóa phiên làm việc và bảo vệ tài khoản 2 lớp.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Avatar & Summary */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col items-center text-center space-y-3">
            <div className="relative group">
              <UserAvatar
                name={name || user.name}
                email={email || user.email}
                size="xl"
                rounded="rounded-2xl"
                defaultType={avatarStyle}
                showIndicator={true}
                className="shadow-lg shadow-blue-500/20 ring-4 ring-white"
              />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">{name || user.name || 'Quản trị viên'}</h3>
              <p className="text-xs text-slate-400 font-medium">{role || user.role || 'Quản trị viên Khảo thí'}</p>
            </div>
            <div className="w-full pt-3 border-t border-slate-100 text-left text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span>Cơ sở GD:</span>
                <span className="font-semibold text-slate-800 truncate max-w-[140px]">{school || user.school || 'Chưa cập nhật'}</span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span>Email:</span>
                <span className="font-semibold text-slate-800 truncate max-w-[140px]" title={email || user.email}>
                  {email || user.email || 'Chưa thiết lập'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span>Trạng thái:</span>
                <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px]">
                  Hoạt động
                </span>
              </div>
            </div>
          </div>

          {/* Gravatar Customizer Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-blue-600 text-lg">account_circle</span>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Gravatar Tự Động
                </h4>
              </div>
              <a
                href="https://gravatar.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-blue-600 hover:underline flex items-center gap-0.5"
              >
                <span>Đổi ảnh gốc</span>
                <span className="material-symbols-outlined text-[12px]">open_in_new</span>
              </a>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Avatar được phân giải tự động từ mã băm SHA-256 của email. Chọn kiểu ảnh dự phòng mặc định khi chưa có ảnh trên Gravatar:
            </p>

            <div className="grid grid-cols-1 gap-1.5">
              {GRAVATAR_STYLES.map((style) => (
                <label
                  key={style.id}
                  className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                    avatarStyle === style.id
                      ? 'bg-blue-50/80 border-blue-300 text-blue-900 font-semibold shadow-2xs'
                      : 'bg-slate-50/50 border-slate-200 text-slate-600 hover:bg-slate-100/60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="avatarStyle"
                      value={style.id}
                      checked={avatarStyle === style.id}
                      onChange={() => setAvatarStyle(style.id)}
                      className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500"
                    />
                    <span>{style.label}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">d={style.id}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Forms */}
        <div className="md:col-span-2 space-y-6">
          {/* Profile Form */}
          <form onSubmit={handleSaveProfile} className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-600 text-lg">badge</span>
              <span>Thông Tin Cán Bộ &amp; Cơ Sở Giáo Dục</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Họ và tên</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">Địa chỉ Email</label>
                  <span className="text-[10px] text-slate-400 font-medium">Cố định</span>
                </div>
                <input
                  type="email"
                  value={email}
                  disabled
                  title="Địa chỉ email định danh tài khoản"
                  className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">Vai trò / Chức vụ</label>
                  <span className="text-[10px] text-slate-400 font-medium">Hệ thống</span>
                </div>
                <input
                  type="text"
                  value={role}
                  disabled
                  title="Vai trò tài khoản"
                  className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Cơ sở giáo dục</label>
                <input
                  type="text"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSavingProfile}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer disabled:opacity-60"
              >
                {isSavingProfile ? 'Đang lưu...' : 'Cập nhật thông tin'}
              </button>
            </div>
          </form>

          {/* Password & Security Form */}
          <form onSubmit={handleChangePassword} className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-600 text-lg">security</span>
              <span>Bảo Mật &amp; Đổi Mật Khẩu</span>
            </h3>

            {/* Google Authenticator 2FA Toggle Card */}
            <div className={`p-4 rounded-xl border transition-all ${twoFactorEnabled ? 'bg-blue-50/60 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`material-symbols-outlined text-xl ${twoFactorEnabled ? 'text-blue-600' : 'text-slate-400'}`}>
                    verified_user
                  </span>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Xác thực 2 bước (Google Authenticator)</span>
                    <span className="text-[11px] text-slate-500 block">
                      {twoFactorEnabled
                        ? 'Tài khoản đang được bảo vệ bằng mã OTP 6 số từ Google Authenticator.'
                        : 'Mặc định đang tắt. Bật tính năng này để yêu cầu mã OTP khi đăng nhập.'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                    twoFactorEnabled
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                      : 'bg-slate-200 text-slate-600 border-slate-300'
                  }`}>
                    {twoFactorEnabled ? 'Đang bật' : 'Đang tắt'}
                  </span>

                  {twoFactorEnabled ? (
                    <button
                      type="button"
                      disabled={loading2FA}
                      onClick={handleDisable2FA}
                      className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl border border-red-200 transition-colors cursor-pointer disabled:opacity-60"
                    >
                      {loading2FA ? 'Đang xử lý...' : 'Tắt 2FA'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={loading2FA}
                      onClick={handleOpenSetup2FA}
                      className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                    >
                      <span className="material-symbols-outlined text-sm">qr_code_scanner</span>
                      <span>{loading2FA ? 'Đang tải...' : 'Bật 2FA'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Mật khẩu hiện tại</label>
                <input
                  type="password"
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                  placeholder="Nhập mật khẩu hiện tại"
                  className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Mật khẩu mới</label>
                  <input
                    type="password"
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    placeholder="Mật khẩu mới"
                    className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Xác nhận mật khẩu</label>
                  <input
                    type="password"
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới"
                    className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isChangingPass}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer disabled:opacity-60"
              >
                {isChangingPass ? 'Đang xử lý...' : 'Lưu mật khẩu mới'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 2FA SETUP MODAL via PortalModal */}
      <PortalModal
        isOpen={Boolean(showSetupModal && setupData)}
        onClose={() => setShowSetupModal(false)}
        icon="verified_user"
        iconBg="bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400"
        title="Kích hoạt Google Authenticator (2FA)"
        subtitle="Bảo mật tài khoản 2 lớp"
        maxWidth="max-w-md"
      >
        {setupData && (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                <strong>Bước 1:</strong> Mở app <strong>Google Authenticator</strong> trên điện thoại, bấm dấu <strong>+</strong> và quét mã QR này:
              </p>
              <div className="flex justify-center p-2 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={setupData.qrCode}
                  alt="Google Authenticator QR"
                  className="w-40 h-40 object-contain rounded-xl bg-white p-2 shadow-xs"
                />
              </div>
              <div className="flex items-center justify-center gap-2 text-[11px] text-slate-600 dark:text-slate-400 pt-1">
                <span>Khóa bí mật:</span>
                <code className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                  {setupData.secret}
                </code>
                <button
                  type="button"
                  onClick={handleCopySecret}
                  className="text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
                >
                  Sao chép
                </button>
              </div>
            </div>

            <form onSubmit={handleConfirmEnable2FA} className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="space-y-1.5 text-center">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  Bước 2: Nhập mã 6 chữ số từ app để xác nhận
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  value={confirmCode}
                  onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  className="w-44 mx-auto py-2.5 text-xl font-mono tracking-[0.4em] text-center rounded-xl border-2 border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20 shadow-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSetupModal(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={loading2FA || confirmCode.trim().length !== 6}
                  className="w-1/2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {loading2FA ? 'Đang kiểm tra...' : 'Xác nhận & Bật'}
                </button>
              </div>
            </form>
          </div>
        )}
      </PortalModal>
    </div>
  );
}
