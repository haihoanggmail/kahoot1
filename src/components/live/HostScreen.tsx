import React, { useState, useEffect, useRef } from 'react';
import { Quiz, Participant, User } from '../../types/quiz';
import { sound } from '../../utils/soundEffects';
import confetti from 'canvas-confetti';
import QRCode from 'qrcode';
import { 
  createServerRoom, 
  HostSocketSession, 
  RoomSnapshot 
} from '../../services/liveSocket';
import { 
  Play, Users, Trophy, Award, ArrowRight, RotateCcw, 
  Copy, Check, UserPlus, Sparkles, Smartphone,
  Info, BarChart3, AlertCircle, Loader2, Wifi, ShieldCheck,
  Pause, PlayCircle, Download, QrCode as QrIcon
} from 'lucide-react';

interface HostScreenProps {
  quiz: Quiz;
  currentUser: User;
  onExit: () => void;
  onSelectQuiz: () => void;
}

export const HostScreen: React.FC<HostScreenProps> = ({
  quiz,
  currentUser,
  onExit,
  onSelectQuiz,
}) => {
  const [pin, setPin] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');
  const [hostToken, setHostToken] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Authoritative Room Snapshot from Server
  const [roomState, setRoomState] = useState<RoomSnapshot | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(20);
  const [answeredCount, setAnsweredCount] = useState<number>(0);
  const [copiedPin, setCopiedPin] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [showQrModal, setShowQrModal] = useState<boolean>(false);

  const sessionRef = useRef<HostSocketSession | null>(null);

  // 1. Initialize Server Room & Generate QR Code on Mount
  useEffect(() => {
    let isCancelled = false;

    async function initRoom() {
      try {
        setIsLoading(true);
        setErrorMsg(null);
        const res = await createServerRoom(quiz, currentUser.name, currentUser.email);
        if (isCancelled) return;

        setPin(res.pin);
        setSessionId(res.sessionId);
        setHostToken(res.hostToken);

        // Generate Join QR Code
        const joinUrl = `${window.location.origin}/?pin=${res.pin}`;
        const qrUrl = await QRCode.toDataURL(joinUrl, {
          width: 256,
          margin: 1.5,
          color: { dark: '#0f172a', light: '#ffffff' },
        });
        if (!isCancelled) setQrDataUrl(qrUrl);

        // Connect Host WebSocket
        sessionRef.current = new HostSocketSession(res.pin, res.hostToken, {
          onStateUpdate: (snapshot) => {
            setRoomState(snapshot);
            setTimeRemaining(snapshot.timeRemaining);
            if (snapshot.status === 'running' && !snapshot.isPaused) {
              sound.playQuestionStart();
            } else if (snapshot.status === 'finished') {
              sound.playFanfare();
              confetti({
                particleCount: 140,
                spread: 100,
                origin: { y: 0.6 },
              });
            }
          },
          onTimerTick: (t) => {
            setTimeRemaining(t);
            if (t <= 5 && t > 1) {
              sound.playUrgentTick();
            } else if (t > 5) {
              sound.playTick();
            }
          },
          onAnswerCountUpdate: (answered, total) => {
            setAnsweredCount(answered);
          },
          onError: (msg) => {
            setErrorMsg(msg);
          },
        });
      } catch (err: any) {
        if (!isCancelled) {
          setErrorMsg(err.message || 'Không thể khởi tạo phòng thi trên máy chủ.');
        }
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    initRoom();

    return () => {
      isCancelled = true;
      if (sessionRef.current) {
        sessionRef.current.close();
      }
      sound.stopLobbyMusic();
    };
  }, [quiz]);

  // Handle lobby sound
  useEffect(() => {
    if (roomState?.status === 'lobby') {
      sound.startLobbyMusic();
    } else {
      sound.stopLobbyMusic();
    }
  }, [roomState?.status]);

  const handleStartGame = () => {
    sessionRef.current?.startGame();
  };

  const handleTogglePause = () => {
    if (roomState?.isPaused) {
      sessionRef.current?.resumeGame();
    } else {
      sessionRef.current?.pauseGame();
    }
  };

  const handleSkipTimer = () => {
    sessionRef.current?.skipTimer();
  };

  const handleGoLeaderboard = () => {
    sessionRef.current?.goLeaderboard();
  };

  const handleNextQuestion = () => {
    sessionRef.current?.nextQuestion();
  };

  const handleRestart = () => {
    sessionRef.current?.restartGame();
  };

  // Optional Load testing tool
  const handleAddLoadTestBots = (count: number) => {
    sessionRef.current?.addSimulatedPlayers(count);
  };

  const copyPin = () => {
    navigator.clipboard.writeText(pin);
    setCopiedPin(true);
    setTimeout(() => setCopiedPin(false), 2000);
  };

  const copyInviteLink = () => {
    const url = `${window.location.origin}/?pin=${pin}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const exportResultsCsv = () => {
    if (!sessionId) return;
    window.open(`/api/sessions/${sessionId}/export`, '_blank');
  };

  // Kahoot color configurations
  const ANSWER_CONFIGS = [
    { bg: 'bg-red-600 text-white', symbol: '▲', name: 'Đỏ' },
    { bg: 'bg-blue-600 text-white', symbol: '◆', name: 'Xanh dương' },
    { bg: 'bg-amber-500 text-white', symbol: '●', name: 'Vàng' },
    { bg: 'bg-emerald-600 text-white', symbol: '■', name: 'Xanh lá' },
  ];

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-slate-900 text-white p-6">
        <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mb-4" />
        <h2 className="text-lg font-bold">Đang cấp phát mã PIN phòng thi trên máy chủ...</h2>
        <p className="text-xs text-slate-400 mt-1">Khởi tạo WebSocket Hub và đồng bộ trạng thái</p>
      </div>
    );
  }

  if (errorMsg && !pin) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-slate-900 text-white p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
        <h2 className="text-xl font-bold text-red-300">Không thể mở phòng thi</h2>
        <p className="text-sm text-slate-300 mt-2 max-w-md">{errorMsg}</p>
        <button
          onClick={onExit}
          className="mt-6 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl cursor-pointer"
        >
          Quay lại
        </button>
      </div>
    );
  }

  const currentStatus = roomState?.status || 'lobby';
  const participants = roomState?.participants || [];
  const currentQ = roomState?.question || quiz.questions[roomState?.currentQuestionIndex || 0];
  const sortedParticipants = [...participants].sort((a, b) => b.score - a.score);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col bg-slate-900 text-white relative overflow-hidden">
      {/* Top Status Banner */}
      <div className="bg-slate-950/80 border-b border-slate-800 px-4 sm:px-6 py-2.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-300 truncate max-w-[180px] sm:max-w-md">
            {quiz.title}
          </span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-400 font-mono">
            Mã PIN: <strong className="text-amber-400 text-sm tracking-wider">{pin}</strong>
          </span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-400 flex items-center gap-1 font-mono">
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            <strong className="text-indigo-300">{participants.length}</strong>/50 thí sinh
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Pause / Resume button if running */}
          {currentStatus === 'running' && (
            <button
              onClick={handleTogglePause}
              className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                roomState?.isPaused
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 animate-pulse'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              {roomState?.isPaused ? <PlayCircle className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              <span>{roomState?.isPaused ? 'Tiếp tục' : 'Tạm dừng'}</span>
            </button>
          )}

          <button
            onClick={() => setShowQrModal(true)}
            className="px-2.5 py-1 rounded text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <QrIcon className="w-3.5 h-3.5 text-indigo-400" />
            <span>Xem mã QR</span>
          </button>

          <button
            onClick={copyInviteLink}
            className="px-2.5 py-1 rounded text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
          >
            {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copiedLink ? 'Đã sao chép' : 'Sao chép link'}</span>
          </button>

          <button
            onClick={onSelectQuiz}
            className="px-2.5 py-1 rounded text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Đổi đề
          </button>
        </div>
      </div>

      {/* Main Interactive Stage */}
      <div className="flex-1 flex flex-col relative p-4 sm:p-6 max-w-7xl mx-auto w-full">
        {/* ================= STATE 1: LOBBY ================= */}
        {currentStatus === 'lobby' && (
          <div className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto w-full text-center py-6">
            <div className="mb-6">
              <span className="text-xs uppercase tracking-widest text-indigo-400 font-bold flex items-center justify-center gap-1.5 mb-1">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Phòng Thi đấu Thực tế Qua Internet · Tối đa 50 người</span>
              </span>
              <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
                Chờ thí sinh gia nhập...
              </h1>
              <p className="text-xs text-slate-400 mt-2">
                Thí sinh mở website trên điện thoại/máy tính hoặc quét mã QR để vào phòng (Không cần tài khoản Google)
              </p>
            </div>

            {/* PIN Code Box & QR Display */}
            <div className="bg-slate-800/90 border border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl max-w-lg w-full mb-8 backdrop-blur-sm flex flex-col sm:flex-row items-center gap-6">
              {/* QR Code */}
              {qrDataUrl && (
                <div className="bg-white p-2 rounded-2xl shadow-md shrink-0">
                  <img src={qrDataUrl} alt="Mã QR phòng thi" className="w-32 h-32 rounded-xl" />
                  <div className="text-[10px] text-slate-600 font-bold mt-1">Quét bằng camera</div>
                </div>
              )}

              <div className="flex-1 text-center sm:text-left">
                <div className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">
                  Mã PIN Tham gia Phòng
                </div>
                <div className="flex items-center justify-center sm:justify-start gap-3">
                  <span className="text-5xl font-black font-mono tracking-widest text-amber-400">
                    {pin}
                  </span>
                  <button
                    onClick={copyPin}
                    title="Sao chép mã PIN"
                    className="p-2.5 bg-slate-700 hover:bg-slate-600 rounded-xl text-slate-200 transition-colors cursor-pointer"
                  >
                    {copiedPin ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-700/60 text-xs text-slate-400">
                  Thí sinh không cần đăng nhập Gmail. Chỉ cần nhập biệt danh!
                </div>
              </div>
            </div>

            {/* Real Connected Participants Box */}
            <div className="w-full mb-8">
              <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-2 text-sm text-slate-300 font-medium">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <span>
                    Thí sinh thật đã vào phòng: <strong className="text-white">{participants.length}</strong> / 50 người
                  </span>
                </div>

                {/* Explicit Load Testing Tool */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAddLoadTestBots(5)}
                    disabled={participants.length >= 50}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-xs font-medium rounded-lg text-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Dùng cho Host thử nghiệm tải trước khi thi chính thức"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Thử tải (+5 bot test)</span>
                  </button>
                  <button
                    onClick={() => handleAddLoadTestBots(50 - participants.length)}
                    disabled={participants.length >= 50}
                    className="px-3 py-1.5 bg-indigo-950/80 hover:bg-indigo-900 disabled:opacity-50 text-xs font-medium rounded-lg text-indigo-200 border border-indigo-800 transition-colors cursor-pointer"
                  >
                    <span>Lấp đầy 50 (Stress Test)</span>
                  </button>
                </div>
              </div>

              {/* Grid of Players */}
              {participants.length === 0 ? (
                <div className="p-8 rounded-2xl bg-slate-950/40 border border-slate-800 text-center">
                  <Loader2 className="w-6 h-6 text-indigo-400 animate-spin mx-auto mb-2" />
                  <div className="text-sm font-semibold text-slate-300">Đang chờ thí sinh kết nối...</div>
                  <div className="text-xs text-slate-500 mt-1">
                    Hãy quét mã QR hoặc mở một tab khác nhập PIN {pin} để vào phòng thật!
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5 max-h-56 overflow-y-auto p-3 bg-slate-950/40 rounded-xl border border-slate-800">
                  {participants.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium border bg-indigo-950/60 border-indigo-500/50 text-indigo-200 shadow-sm"
                    >
                      <div className="w-6 h-6 rounded-full bg-indigo-700 flex items-center justify-center font-bold text-[10px] text-white shrink-0">
                        {p.nickname.charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate">{p.nickname}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Start Button */}
            <div className="flex items-center gap-4">
              <button
                onClick={handleStartGame}
                disabled={participants.length === 0}
                className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-base rounded-2xl shadow-xl hover:shadow-indigo-500/25 transition-all flex items-center gap-2.5 cursor-pointer group"
              >
                <Play className="w-5 h-5 fill-white group-hover:scale-110 transition-transform" />
                <span>Bắt đầu cuộc thi ({quiz.questions.length} câu)</span>
              </button>
            </div>
          </div>
        )}

        {/* ================= STATE 2: ACTIVE QUESTION ================= */}
        {currentStatus === 'running' && (
          <div className="flex-1 flex flex-col justify-between py-2">
            {/* Top Bar Info */}
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-md bg-slate-800 text-xs font-mono font-bold text-indigo-400">
                  Câu {(roomState?.currentQuestionIndex || 0) + 1} / {roomState?.totalQuestions || quiz.questions.length}
                </span>
                <span className="text-xs text-slate-400 hidden sm:inline">
                  {currentQ?.points || 1000} điểm
                </span>
                {roomState?.isPaused && (
                  <span className="px-2.5 py-0.5 rounded bg-amber-500 text-slate-950 font-bold text-xs">
                    ĐANG TẠM DỪNG
                  </span>
                )}
              </div>

              {/* Server-Synchronized Timer Ring */}
              <div className="flex items-center gap-3">
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center font-mono font-black text-2xl border-4 transition-colors ${
                    roomState?.isPaused
                      ? 'border-amber-400 text-amber-300 bg-amber-950/40'
                      : timeRemaining <= 5
                      ? 'border-red-500 text-red-400 bg-red-950/40 animate-pulse'
                      : 'border-indigo-500 text-indigo-300 bg-indigo-950/40'
                  }`}
                >
                  {timeRemaining}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-mono">
                  Đã nộp: <strong className="text-emerald-400">{answeredCount}</strong>/{participants.length}
                </span>
                <button
                  onClick={handleSkipTimer}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                >
                  Bỏ qua đếm ngược
                </button>
              </div>
            </div>

            {/* Question Text Prompt */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 sm:p-10 text-center my-auto shadow-xl backdrop-blur-sm">
              <h2 className="text-xl sm:text-3xl font-extrabold text-white leading-snug">
                {currentQ?.text}
              </h2>
            </div>

            {/* 4 Kahoot-style Answer Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-6">
              {currentQ?.options.map((opt, idx) => {
                const config = ANSWER_CONFIGS[idx % ANSWER_CONFIGS.length];
                return (
                  <div
                    key={idx}
                    className={`${config.bg} rounded-xl p-4 sm:p-5 flex items-center gap-4 shadow-md transition-transform`}
                  >
                    <span className="w-10 h-10 rounded-lg bg-black/20 flex items-center justify-center text-xl font-bold shrink-0">
                      {config.symbol}
                    </span>
                    <span className="text-base sm:text-lg font-semibold leading-snug">
                      {opt}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= STATE 3: ANSWER REVEAL / LEADERBOARD ================= */}
        {currentStatus === 'paused' && !roomState?.isPaused && (
          <div className="flex-1 flex flex-col justify-between py-2">
            <div className="flex items-center justify-between mb-4">
              <span className="px-3 py-1 rounded-md bg-slate-800 text-xs font-mono font-bold text-indigo-400">
                Kết quả Câu {(roomState?.currentQuestionIndex || 0) + 1}
              </span>
              <button
                onClick={handleNextQuestion}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl flex items-center gap-2 shadow-lg transition-all cursor-pointer"
              >
                <span>
                  {(roomState?.currentQuestionIndex || 0) + 1 < (roomState?.totalQuestions || quiz.questions.length)
                    ? 'Câu tiếp theo'
                    : 'Bục trao giải chung cuộc'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 text-center mb-4">
              <h3 className="text-lg sm:text-xl font-bold text-slate-200">
                {currentQ?.text}
              </h3>
            </div>

            {/* Distribution Bar Chart */}
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-6 mb-4">
              <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-400" />
                <span>Phân bố đáp án từ thí sinh thật</span>
              </div>

              <div className="grid grid-cols-4 gap-4 h-44 items-end pt-4 pb-2">
                {currentQ?.options.map((opt, idx) => {
                  const count = roomState?.distribution[idx] || 0;
                  const total = participants.length || 1;
                  const percentage = Math.round((count / total) * 100);
                  const isCorrect = currentQ.correctAnswers?.includes(idx);
                  const config = ANSWER_CONFIGS[idx % ANSWER_CONFIGS.length];

                  return (
                    <div key={idx} className="flex flex-col items-center h-full justify-end group">
                      <span className="text-xs font-mono font-bold text-slate-300 mb-1">
                        {count} ({percentage}%)
                      </span>
                      <div className="w-full max-w-[70px] bg-slate-700/40 rounded-t-lg h-full flex flex-col justify-end overflow-hidden">
                        <div
                          style={{ height: `${Math.max(percentage, 8)}%` }}
                          className={`w-full rounded-t-lg transition-all duration-700 ${
                            isCorrect ? `${config.bg} ring-2 ring-emerald-400` : 'bg-slate-600'
                          }`}
                        />
                      </div>
                      <div className="mt-2 flex items-center gap-1 text-xs font-bold">
                        <span>{config.symbol}</span>
                        {isCorrect && <Check className="w-4 h-4 text-emerald-400" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top 5 Leaderboard strip */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
              <div className="text-xs uppercase tracking-wider text-amber-400 font-bold mb-2">
                Top dẫn đầu hiện tại:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {sortedParticipants.slice(0, 3).map((p, idx) => (
                  <div key={p.id} className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-amber-400">#{idx + 1}</span>
                      <span className="font-semibold text-white truncate max-w-[100px]">{p.nickname}</span>
                    </div>
                    <span className="font-mono font-bold text-amber-300">{p.score} pts</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= STATE 4: FINAL PODIUM & RESULTS ================= */}
        {currentStatus === 'finished' && (
          <div className="flex-1 flex flex-col justify-center items-center py-6 max-w-4xl mx-auto w-full text-center">
            <span className="text-xs uppercase tracking-widest text-amber-400 font-bold mb-2">
              HACHIHI Quiz Final Podium
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white mb-6">
              Bục Vinh Danh Chiến Thắng!
            </h2>

            {/* 3-Step Podium */}
            <div className="flex items-end justify-center gap-4 sm:gap-6 w-full max-w-2xl mb-8 h-64">
              {/* 2nd Place */}
              {sortedParticipants[1] && (
                <div className="flex-1 flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-slate-400 text-slate-950 font-bold text-lg flex items-center justify-center mb-2 shadow-lg">
                    {sortedParticipants[1].nickname.charAt(0).toUpperCase()}
                  </div>
                  <div className="font-bold text-sm text-slate-200 truncate max-w-[110px]">
                    {sortedParticipants[1].nickname}
                  </div>
                  <div className="text-xs font-mono text-slate-400 mb-2">
                    {sortedParticipants[1].score.toLocaleString()} pts
                  </div>
                  <div className="w-full bg-slate-700/80 border-t-4 border-slate-300 rounded-t-xl h-36 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-slate-300">2</span>
                    <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Á quân</span>
                  </div>
                </div>
              )}

              {/* 1st Place */}
              {sortedParticipants[0] && (
                <div className="flex-1 flex flex-col items-center">
                  <div className="relative mb-2">
                    <Trophy className="w-7 h-7 text-amber-400 absolute -top-5 left-1/2 -translate-x-1/2 animate-bounce" />
                    <div className="w-16 h-16 rounded-full bg-amber-400 text-slate-950 font-black text-2xl flex items-center justify-center border-4 border-amber-300 shadow-xl">
                      {sortedParticipants[0].nickname.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <div className="font-extrabold text-base text-amber-300 truncate max-w-[130px]">
                    {sortedParticipants[0].nickname}
                  </div>
                  <div className="text-xs font-mono text-amber-400/90 font-bold mb-2">
                    {sortedParticipants[0].score.toLocaleString()} pts
                  </div>
                  <div className="w-full bg-gradient-to-t from-amber-600/40 to-amber-500/80 border-t-4 border-amber-400 rounded-t-xl h-48 flex flex-col items-center justify-center shadow-lg">
                    <span className="text-4xl font-black text-amber-300">1</span>
                    <span className="text-xs uppercase tracking-wider text-amber-200 font-extrabold">Quán quân</span>
                  </div>
                </div>
              )}

              {/* 3rd Place */}
              {sortedParticipants[2] && (
                <div className="flex-1 flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-amber-800 text-white font-bold text-lg flex items-center justify-center mb-2 shadow-lg">
                    {sortedParticipants[2].nickname.charAt(0).toUpperCase()}
                  </div>
                  <div className="font-bold text-sm text-slate-200 truncate max-w-[110px]">
                    {sortedParticipants[2].nickname}
                  </div>
                  <div className="text-xs font-mono text-slate-400 mb-2">
                    {sortedParticipants[2].score.toLocaleString()} pts
                  </div>
                  <div className="w-full bg-slate-800/80 border-t-4 border-amber-700 rounded-t-xl h-28 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-amber-600">3</span>
                    <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Hạng Ba</span>
                  </div>
                </div>
              )}
            </div>

            {/* Official Export & Actions */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={exportResultsCsv}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Xuất Báo Cáo Kết Quả (CSV)</span>
              </button>

              <button
                onClick={handleRestart}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Thi lại bộ đề</span>
              </button>

              <button
                onClick={onExit}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Về Trang chủ
              </button>
            </div>
          </div>
        )}
      </div>

      {/* QR Code Big Modal */}
      {showQrModal && qrDataUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center text-slate-900 shadow-2xl">
            <h3 className="text-lg font-extrabold text-slate-900 mb-1">
              Quét mã QR để vào phòng thi
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Mở camera trên điện thoại và quét để gia nhập tức thì
            </p>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 inline-block mb-4">
              <img src={qrDataUrl} alt="QR Code" className="w-60 h-60 rounded-xl" />
            </div>

            <div className="text-xl font-black font-mono tracking-widest text-indigo-600 mb-4">
              PIN: {pin}
            </div>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer"
            >
              Đóng cửa sổ
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
