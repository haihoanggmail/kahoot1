import React, { useState } from 'react';
import { User, WorkspaceSettings } from '../../types/quiz';
import { 
  ShieldCheck, Globe, Users, Plus, Trash2, 
  CheckCircle2, AlertTriangle, Key, Lock, UserCheck, 
  Settings, RefreshCw, Upload, Download
} from 'lucide-react';

interface WorkspaceControlProps {
  currentUser: User;
  setCurrentUser: (user: User) => void;
  settings: WorkspaceSettings;
  setSettings: React.Dispatch<React.SetStateAction<WorkspaceSettings>>;
}

export const WorkspaceControl: React.FC<WorkspaceControlProps> = ({
  currentUser,
  setCurrentUser,
  settings,
  setSettings,
}) => {
  const [newDomain, setNewDomain] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [testEmailInput, setTestEmailInput] = useState('');
  const [testResult, setTestResult] = useState<{
    allowed: boolean;
    reason: string;
  } | null>(null);

  // Add Domain
  const addDomain = () => {
    const cleaned = newDomain.trim().toLowerCase().replace(/^@/, '');
    if (cleaned && !settings.allowedDomains.includes(cleaned)) {
      setSettings((prev) => ({
        ...prev,
        allowedDomains: [...prev.allowedDomains, cleaned],
      }));
      setNewDomain('');
    }
  };

  // Remove Domain
  const removeDomain = (domainToRemove: string) => {
    setSettings((prev) => ({
      ...prev,
      allowedDomains: prev.allowedDomains.filter((d) => d !== domainToRemove),
    }));
  };

  // Add Whitelist Email
  const addEmail = () => {
    const cleaned = newEmail.trim().toLowerCase();
    if (cleaned && !settings.whitelistEmails.includes(cleaned)) {
      setSettings((prev) => ({
        ...prev,
        whitelistEmails: [cleaned, ...prev.whitelistEmails],
      }));
      setNewEmail('');
    }
  };

  // Remove Whitelist Email
  const removeEmail = (emailToRemove: string) => {
    setSettings((prev) => ({
      ...prev,
      whitelistEmails: prev.whitelistEmails.filter((e) => e !== emailToRemove),
    }));
  };

  // Test Access Rule
  const runAccessTest = () => {
    const email = testEmailInput.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      setTestResult({
        allowed: false,
        reason: 'Email không hợp lệ.',
      });
      return;
    }

    const domain = email.split('@')[1];

    if (settings.enforceDomain && !settings.allowedDomains.includes(domain)) {
      setTestResult({
        allowed: false,
        reason: `Từ chối: Tên miền @${domain} không nằm trong danh sách Google Workspace được phép (${settings.allowedDomains.join(', ')}).`,
      });
      return;
    }

    if (settings.whitelistEmails.length > 0 && !settings.whitelistEmails.includes(email)) {
      setTestResult({
        allowed: false,
        reason: `Từ chối: Email ${email} chưa được cấp quyền trong danh sách Whitelist nội bộ.`,
      });
      return;
    }

    setTestResult({
      allowed: true,
      reason: `Chấp thuận: Người dùng ${email} thỏa mãn điều kiện xác thực Google Workspace và Whitelist!`,
    });
  };

  // Quick Switch Simulated Roles
  const switchRole = (role: 'admin' | 'host' | 'player') => {
    setCurrentUser({
      ...currentUser,
      role,
      name:
        role === 'admin'
          ? 'Quản trị viên Hệ thống'
          : role === 'host'
          ? 'Giảng viên Chủ trì'
          : 'Học viên / Nhân sự',
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Title */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1">
          <ShieldCheck className="w-4 h-4" />
          <span>Bảo mật & Kiểm soát Truy cập (Security & Identity)</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Cấu hình Google Workspace & Whitelist
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
          Đảm bảo chỉ người dùng thuộc tổ chức hoặc danh sách cho phép mới có thể gia nhập phòng thi 50 người hoặc làm bài tự luyện.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Organization & Domain rules */}
        <div className="lg:col-span-2 space-y-6">
          {/* Domain Restriction Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <Globe className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Giới hạn Tên miền Google Workspace (Domain Lock)
                </h2>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enforceDomain}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, enforceDomain: e.target.checked }))
                  }
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              Khi bật, bất kỳ tài khoản nào đăng nhập qua Google OAuth có claim <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-indigo-600 dark:text-indigo-400">hd</code> không khớp với danh sách bên dưới sẽ bị chặn tức thời tại Cloudflare Edge Worker.
            </p>

            {/* Allowed Domains Tags */}
            <div className="flex flex-wrap gap-2 mb-4">
              {settings.allowedDomains.map((d) => (
                <span
                  key={d}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300 rounded-lg text-xs font-semibold"
                >
                  <span>@{d}</span>
                  {settings.allowedDomains.length > 1 && (
                    <button
                      onClick={() => removeDomain(d)}
                      className="text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-200 cursor-pointer"
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
            </div>

            {/* Add Domain Input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="VD: hachihi.vn, mycompany.com"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addDomain()}
                className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:text-white"
              />
              <button
                onClick={addDomain}
                className="px-4 py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Thêm domain
              </button>
            </div>
          </div>

          {/* Whitelist Emails Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Danh bạ Whitelist Email Ủy quyền ({settings.whitelistEmails.length})
                </h2>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              Quản lý danh sách email cụ thể được phép tham gia thi đấu hoặc chủ trì phòng. Có thể bổ sung hoặc xóa trực tiếp.
            </p>

            {/* Add Email Bar */}
            <div className="flex items-center gap-2 mb-4">
              <input
                type="email"
                placeholder="VD: nguyenvana@hachihi.vn"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addEmail()}
                className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:text-white"
              />
              <button
                onClick={addEmail}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm Email</span>
              </button>
            </div>

            {/* Email list box */}
            <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
              {settings.whitelistEmails.map((email) => (
                <div
                  key={email}
                  className="px-3.5 py-2.5 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-mono text-slate-700 dark:text-slate-300">{email}</span>
                  </div>
                  <button
                    onClick={() => removeEmail(email)}
                    className="text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Simulators & Capacity */}
        <div className="space-y-6">
          {/* Room Capacity Enforcer (50 people rule) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm transition-colors">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <Lock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Quy mô Phòng thi: Tối đa 50 Người</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              Theo chốt yêu cầu kỹ thuật MVP, mỗi phòng thi được giới hạn cứng <strong className="text-slate-800 dark:text-slate-200">50 kết nối đồng thời</strong> để tối ưu 100% trong hạn mức Cloudflare Free Tier.
            </p>

            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-800 rounded-xl text-xs text-indigo-900 dark:text-indigo-300 space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span>Hạn mức phòng:</span>
                <strong className="text-indigo-700 dark:text-indigo-400">50 slots</strong>
              </div>
              <div className="flex justify-between">
                <span>WebSocket Engine:</span>
                <span>Cloudflare Hibernation</span>
              </div>
              <div className="flex justify-between">
                <span>Xử lý người thứ 51:</span>
                <span className="text-red-600 dark:text-red-400 font-bold">Auto-reject (ROOM_FULL)</span>
              </div>
            </div>
          </div>

          {/* Access Policy Prober (Test Email Access) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm transition-colors">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <Key className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Kiểm thử Chính sách Truy cập (Prober)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Nhập email bất kỳ để kiểm tra bộ lọc Cloudflare Worker:
            </p>

            <div className="space-y-2 mb-3">
              <input
                type="email"
                placeholder="VD: intruder@gmail.com"
                value={testEmailInput}
                onChange={(e) => setTestEmailInput(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:text-white"
              />
              <button
                onClick={runAccessTest}
                className="w-full py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Kiểm tra quyền truy cập
              </button>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-xl border text-xs leading-relaxed flex items-start gap-2 ${
                  testResult.allowed
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                    : 'bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
                }`}
              >
                {testResult.allowed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                )}
                <span>{testResult.reason}</span>
              </div>
            )}
          </div>

          {/* Role Switcher for Testing */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm transition-colors">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
              Chuyển đổi Vai trò Mô phỏng (Role Switcher)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Thử nghiệm góc nhìn của từng nhóm người dùng:
            </p>
            <div className="grid grid-cols-3 gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                onClick={() => switchRole('admin')}
                className={`py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  currentUser.role === 'admin'
                    ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Admin
              </button>
              <button
                onClick={() => switchRole('host')}
                className={`py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  currentUser.role === 'host'
                    ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Host
              </button>
              <button
                onClick={() => switchRole('player')}
                className={`py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  currentUser.role === 'player'
                    ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Player
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
