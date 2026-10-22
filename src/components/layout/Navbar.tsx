import React from 'react';
import { User } from '../../types/quiz';
import { 
  Volume2, VolumeX, ShieldCheck, PlayCircle, BookOpen, 
  Layers, Users, FileCode2, Sun, Moon, Smartphone 
} from 'lucide-react';
import { sound } from '../../utils/soundEffects';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: User;
  setCurrentUser: (user: User) => void;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  onOpenPlayerPad: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  isMuted,
  setIsMuted,
  darkMode,
  setDarkMode,
  onOpenPlayerPad,
}) => {
  const toggleSound = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    sound.setMuted(nextMuted);
  };

  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    if (next) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const navItems = [
    { id: 'live', label: 'Thi trực tiếp (Live)', icon: PlayCircle },
    { id: 'self-paced', label: 'Tự làm bài', icon: BookOpen },
    { id: 'quizzes', label: 'Ngân hàng đề thi', icon: Layers },
    { id: 'workspace', label: 'Google Workspace & Bảo mật', icon: Users },
    { id: 'architecture', label: 'Thiết kế Kỹ thuật & Deploy', icon: FileCode2 },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
        {/* Zone 1: Single text element wordmark */}
        <button
          onClick={() => setActiveTab('live')}
          className="flex items-center gap-2.5 text-left text-slate-900 dark:text-white focus:outline-none whitespace-nowrap shrink-0 group cursor-pointer"
        >
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm group-hover:bg-indigo-700 transition-colors">
            H
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              HACHIHI <span className="text-indigo-600 dark:text-indigo-400">Quiz</span>
            </span>
          </div>
        </button>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-slate-100 dark:bg-slate-800 text-indigo-700 dark:text-indigo-400'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Controls & User Profile */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Quick Player Mobile View button */}
          <button
            onClick={onOpenPlayerPad}
            title="Mở giao diện bấm dành cho Thí sinh (Mobile / PC)"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-800 transition-colors"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Màn Thí sinh</span>
          </button>

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDark}
            title={darkMode ? 'Chuyển sang Giao diện Sáng (Light)' : 'Chuyển sang Giao diện Tối (Dark mode)'}
            className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
            className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
          </button>

          <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800 text-xs">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-7 h-7 rounded-full border border-slate-200 dark:border-slate-700 object-cover"
            />
            <div className="leading-tight hidden md:block">
              <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1 text-[11px]">
                {currentUser.name}
                <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-slate-500 dark:text-slate-400 font-mono text-[10px] truncate max-w-[110px]">
                {currentUser.email}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile nav bar with smooth scroll */}
      <div className="lg:hidden flex items-center overflow-x-auto px-4 py-2 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 gap-1.5 text-xs scrollbar-none">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap text-xs font-medium transition-colors ${
              activeTab === item.id
                ? 'bg-indigo-600 text-white font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            {item.label}
          </button>
        ))}
        <button
          onClick={onOpenPlayerPad}
          className="px-3 py-1.5 rounded-lg whitespace-nowrap text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1"
        >
          <Smartphone className="w-3 h-3" />
          <span>Màn Thí sinh</span>
        </button>
      </div>
    </header>
  );
};
