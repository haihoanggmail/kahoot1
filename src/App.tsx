import React, { useState, useEffect } from 'react';
import { Quiz, User, WorkspaceSettings } from './types/quiz';
import { INITIAL_QUIZZES } from './data/sampleQuizzes';
import { Navbar } from './components/layout/Navbar';
import { HostScreen } from './components/live/HostScreen';
import { PlayerView } from './components/live/PlayerView';
import { SelfPacedView } from './components/self-paced/SelfPacedView';
import { QuizManager } from './components/editor/QuizManager';
import { WorkspaceControl } from './components/admin/WorkspaceControl';
import { TechnicalBlueprint } from './components/docs/TechnicalBlueprint';
import { 
  Play, Users, BookOpen, Layers, ShieldCheck, 
  FileCode2, Sparkles, CheckCircle, ArrowRight, Zap,
  KeyRound, Smartphone, FileSpreadsheet
} from 'lucide-react';

export default function App() {
  const [quizzes, setQuizzes] = useState<Quiz[]>(INITIAL_QUIZZES);
  const [activeTab, setActiveTab] = useState<string>('live');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  
  // Dark mode state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hachihi_theme');
      return saved ? saved === 'dark' : false;
    }
    return false;
  });

  // Sync dark class on mount and change
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('hachihi_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('hachihi_theme', 'light');
    }
  }, [darkMode]);

  // Active current user session
  const [currentUser, setCurrentUser] = useState<User>({
    id: 'usr-lead-01',
    name: 'Hoàng Hải (TechLead)',
    email: 'haihoang.hch@gmail.com',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=HaiHoangTech',
    role: 'admin',
    domain: 'hachihi.vn',
    isWhitelisted: true,
    department: 'Software Engineering',
  });

  // Global Workspace & Access settings
  const [settings, setSettings] = useState<WorkspaceSettings>({
    allowedDomains: ['hachihi.vn', 'gmail.com'],
    enforceDomain: true,
    whitelistEmails: [
      'haihoang.hch@gmail.com',
      'admin@hachihi.vn',
      'minhanh@hachihi.vn',
      'nam.hoang@hachihi.vn',
      'truc.thanh@hachihi.vn',
    ],
    maxRoomParticipants: 50,
    allowGuestAccess: false,
    autoKickUnauthorized: true,
  });

  // Live Host room states
  const [activeLiveQuiz, setActiveLiveQuiz] = useState<Quiz | null>(null);

  // Dedicated Player Mode state
  const [isPlayerMode, setIsPlayerMode] = useState<boolean>(false);
  const [playerPin, setPlayerPin] = useState<string>('');
  const [inputPin, setInputPin] = useState('');
  const [pinError, setPinError] = useState('');

  // Auto-detect ?pin= query parameter for direct invites across devices
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchPin = new URLSearchParams(window.location.search).get('pin');
      if (searchPin && searchPin.length === 6) {
        setInputPin(searchPin);
        setPlayerPin(searchPin);
        setIsPlayerMode(true);
        setActiveTab('live');
      }
    }
  }, []);

  // Handle launching live host
  const handleLaunchLive = (quiz: Quiz) => {
    setIsPlayerMode(false);
    setActiveLiveQuiz(quiz);
    setActiveTab('live');
  };

  // Handle launching self-paced mode
  const handleLaunchSelfPaced = (quiz: Quiz) => {
    setIsPlayerMode(false);
    setActiveLiveQuiz(null);
    setActiveTab('self-paced');
  };

  // Open Player Pad directly
  const handleOpenPlayerPad = () => {
    setIsPlayerMode(true);
    setActiveLiveQuiz(null);
    setActiveTab('live');
  };

  // Handle manual PIN entry simulation
  const handleJoinPin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = inputPin.trim();
    if (!cleanPin || cleanPin.length < 6) {
      setPinError('Vui lòng nhập mã PIN gồm 6 chữ số hợp lệ.');
      return;
    }
    setPinError('');
    setPlayerPin(cleanPin);
    setIsPlayerMode(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab !== 'live') {
            setActiveLiveQuiz(null);
            setIsPlayerMode(false);
          }
        }}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        isMuted={isMuted}
        setIsMuted={setIsMuted}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        onOpenPlayerPad={handleOpenPlayerPad}
      />

      {/* Main Content Sections */}
      <main className="flex-1 flex flex-col">
        {/* ================= TAB 1: THI TRỰC TIẾP (LIVE ROOM) ================= */}
        {activeTab === 'live' && (
          <>
            {isPlayerMode ? (
              /* Dedicated Player Mobile / Desktop Pad */
              <PlayerView
                quiz={quizzes[0]}
                currentUser={currentUser}
                onExit={() => setIsPlayerMode(false)}
                pin={playerPin}
              />
            ) : activeLiveQuiz ? (
              /* Host Screen */
              <HostScreen
                quiz={activeLiveQuiz}
                currentUser={currentUser}
                onExit={() => setActiveLiveQuiz(null)}
                onSelectQuiz={() => setActiveLiveQuiz(null)}
              />
            ) : (
              <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12 w-full">
                {/* Hero / Quick Join Header */}
                <div className="text-center max-w-3xl mx-auto mb-10">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-100 dark:border-indigo-800 rounded-full text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-3">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Nền tảng thi đấu trắc nghiệm Kahoot Alternative</span>
                  </div>
                  <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                    HACHIHI Quiz Live Room
                  </h1>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-3 leading-relaxed">
                    Tổ chức phòng thi đấu thời gian thực lên tới 50 người, bảo mật bằng Google Workspace SSO và tối ưu chi phí 0đ với Cloudflare Edge Serverless.
                  </p>
                </div>

                {/* Quick Join PIN Box & Host Action */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-12">
                  {/* Join as Player */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between transition-colors">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-2">
                        <Smartphone className="w-4 h-4" />
                        <span>Dành cho Thí sinh (Mobile & PC)</span>
                      </div>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                        Nhập PIN gia nhập phòng
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                        Nhập mã PIN 6 số do Host cung cấp để mở bảng bấm 4 màu tương tác.
                      </p>
                    </div>

                    <form onSubmit={handleJoinPin} className="space-y-3">
                      <div>
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="VD: 849201"
                          value={inputPin}
                          onChange={(e) => setInputPin(e.target.value.replace(/\\D/g, ''))}
                          className="w-full text-center tracking-widest text-xl font-bold font-mono px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:text-white transition-all"
                        />
                        {pinError && (
                          <div className="text-xs text-red-600 dark:text-red-400 mt-1">{pinError}</div>
                        )}
                      </div>
                      <button
                        type="submit"
                        className="w-full py-3 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span>Vào phòng thi ngay</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  </div>

                  {/* Host a New Live Room */}
                  <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white rounded-2xl p-6 shadow-md border border-indigo-800/40 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-300 mb-2">
                        <Users className="w-4 h-4" />
                        <span>Dành cho Giảng viên / Host</span>
                      </div>
                      <h2 className="text-lg font-bold text-white mb-1">
                        Mở phòng thi đấu trực tiếp (50 người)
                      </h2>
                      <p className="text-xs text-indigo-200/80 mb-4 leading-relaxed">
                        Tạo mã PIN tự động, trình chiếu câu hỏi lớn, đếm ngược đồng bộ và vinh danh bục chiến thắng.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="text-[11px] text-indigo-300 font-mono flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Hỗ trợ cả màn hình chiếu PC & điện thoại thí sinh</span>
                      </div>
                      <button
                        onClick={() => setActiveLiveQuiz(quizzes[0])}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Play className="w-4 h-4 fill-white" />
                        <span>Mở phòng Host với bộ đề: An toàn thông tin</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Available Quizzes to Host */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      Hoặc chọn một bộ đề thi dưới đây để làm Host:
                    </h2>
                    <button
                      onClick={() => setActiveTab('quizzes')}
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      Quản lý & Nhập đề thi từ Google Sheets &rarr;
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {quizzes.map((q) => (
                      <div
                        key={q.id}
                        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1">
                            {q.category}
                          </div>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 leading-snug">
                            {q.title}
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
                            {q.description}
                          </p>
                          <div className="text-xs font-mono text-slate-400 dark:text-slate-500 mb-4">
                            {q.questions.length} câu hỏi · Max 50 người
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                          <button
                            onClick={() => handleLaunchLive(q)}
                            className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5 fill-white" />
                            <span>Mở phòng Host</span>
                          </button>
                          <button
                            onClick={() => {
                              setActiveTab('self-paced');
                            }}
                            className="py-2 px-3 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                          >
                            Tự làm
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ================= TAB 2: TỰ LÀM BÀI (SELF-PACED) ================= */}
        {activeTab === 'self-paced' && (
          <SelfPacedView
            quizzes={quizzes}
            currentUser={currentUser}
            onOpenLiveHost={handleLaunchLive}
          />
        )}

        {/* ================= TAB 3: NGÂN HÀNG ĐỀ THI ================= */}
        {activeTab === 'quizzes' && (
          <QuizManager
            quizzes={quizzes}
            setQuizzes={setQuizzes}
            currentUser={currentUser}
            onLaunchLive={handleLaunchLive}
            onLaunchSelfPaced={handleLaunchSelfPaced}
          />
        )}

        {/* ================= TAB 4: GOOGLE WORKSPACE & BẢO MẬT ================= */}
        {activeTab === 'workspace' && (
          <WorkspaceControl
            currentUser={currentUser}
            setCurrentUser={setCurrentUser}
            settings={settings}
            setSettings={setSettings}
          />
        )}

        {/* ================= TAB 5: THIẾT KẾ KỸ THUẬT & DEPLOY BLUEPRINT ================= */}
        {activeTab === 'architecture' && <TechnicalBlueprint />}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-4 px-6 text-xs text-slate-500 dark:text-slate-400 transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <span className="font-semibold text-slate-800 dark:text-slate-200">HACHIHI Quiz MVP</span>
            <span className="mx-2">·</span>
            <span>Nền tảng trắc nghiệm Google Workspace SSO & Cloudflare Edge 0đ</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span>Room Capacity: 50 Users</span>
            <span>·</span>
            <span>Edge Runtime: Workers + D1</span>
            <span>·</span>
            <span>Latency &lt; 50ms</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
