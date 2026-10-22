import React, { useState, useEffect, useRef } from 'react';
import { Quiz, User } from '../../types/quiz';
import { sound } from '../../utils/soundEffects';
import { 
  PlayerSocketSession, 
  RoomSnapshot, 
  checkRoomStatus 
} from '../../services/liveSocket';
import { 
  Smartphone, Monitor, Zap, Trophy, CheckCircle, 
  XCircle, ArrowLeft, Eye, EyeOff, Sparkles, AlertCircle,
  Loader2, Wifi, WifiOff, Pause, UserCheck, ArrowRight
} from 'lucide-react';

interface PlayerViewProps {
  quiz?: Quiz;
  currentUser: User;
  onExit: () => void;
  pin: string;
}

export const PlayerView: React.FC<PlayerViewProps> = ({
  currentUser,
  onExit,
  pin,
}) => {
  const [deviceMode, setDeviceMode] = useState<'mobile' | 'desktop'>('mobile');
  const [showQuestionText, setShowQuestionText] = useState(true);

  // Player Nickname State (No Gmail login needed!)
  const [nickname, setNickname] = useState<string>(() => {
    return sessionStorage.getItem(`hachihi_nick_${pin}`) || currentUser.name || '';
  });
  const [hasEnteredNickname, setHasEnteredNickname] = useState<boolean>(() => {
    return Boolean(sessionStorage.getItem(`hachihi_nick_${pin}`) || currentUser.name);
  });
  const [nickInput, setNickInput] = useState<string>('');

  // Connection & Room state from Server
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [roomState, setRoomState] = useState<RoomSnapshot | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);

  // Player answer state
  const [timeRemaining, setTimeRemaining] = useState<number>(20);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [lastGain, setLastGain] = useState<number>(0);

  const sessionRef = useRef<PlayerSocketSession | null>(null);

  // Connect to room once nickname is confirmed
  useEffect(() => {
    if (!hasEnteredNickname || !nickname.trim()) return;

    let isCancelled = false;

    async function connectPlayer() {
      try {
        setIsConnecting(true);
        setErrorMsg(null);

        // Verify PIN first via REST
        const status = await checkRoomStatus(pin);
        if (isCancelled) return;

        if (status.isFull) {
          setErrorMsg('Phòng thi đã đủ 50 người. Không thể tham gia thêm.');
          setIsConnecting(false);
          return;
        }

        const savedToken = sessionStorage.getItem(`hachihi_token_${pin}`);

        // Establish real WebSocket connection
        sessionRef.current = new PlayerSocketSession(
          pin,
          nickname.trim(),
          savedToken,
          {
            onJoined: (id, token, snapshot) => {
              setParticipantId(id);
              sessionStorage.setItem(`hachihi_token_${pin}`, token);
              sessionStorage.setItem(`hachihi_nick_${pin}`, nickname.trim());
              setRoomState(snapshot);
              setIsConnecting(false);
            },
            onStateUpdate: (snapshot) => {
              setRoomState(snapshot);
              setTimeRemaining(snapshot.timeRemaining);

              if (snapshot.status === 'running' && !snapshot.isPaused) {
                setHasAnswered(false);
                setSelectedIdx(null);
                sound.playQuestionStart();
              } else if (snapshot.status === 'paused') {
                // Find own updated score
                const me = snapshot.participants.find((p) => p.id === participantId);
                if (me) {
                  setScore(me.score);
                  setStreak(me.streak);
                  if (me.isCorrectLast) {
                    sound.playCorrect();
                  } else {
                    sound.playIncorrect();
                  }
                }
              }
            },
            onTimerTick: (t) => {
              setTimeRemaining(t);
              if (t <= 5 && t > 1) {
                sound.playUrgentTick();
              }
            },
            onAnswerAccepted: (optionIndex, isCorrect, pointsAwarded, newScore, newStreak) => {
              setHasAnswered(true);
              setSelectedIdx(optionIndex);
              setScore(newScore);
              setStreak(newStreak);
              setLastGain(pointsAwarded);
              sound.playSubmit();
            },
            onError: (msg) => {
              setErrorMsg(msg);
              setIsConnecting(false);
            },
          }
        );
      } catch (err: any) {
        if (!isCancelled) {
          setErrorMsg(err.message || 'Không thể kết nối vào phòng thi.');
          setIsConnecting(false);
        }
      }
    }

    connectPlayer();

    return () => {
      isCancelled = true;
      if (sessionRef.current) {
        sessionRef.current.close();
      }
    };
  }, [hasEnteredNickname, nickname, pin]);

  const handleNicknameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickInput.trim()) return;
    setNickname(nickInput.trim());
    setHasEnteredNickname(true);
  };

  const submitAnswer = (idx: number) => {
    if (hasAnswered || roomState?.status !== 'running' || roomState?.isPaused) return;

    // Haptic vibration on phone
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(40);
    }

    sessionRef.current?.submitAnswer(idx);
  };

  const BUTTONS = [
    { bg: 'bg-red-600 active:bg-red-700 text-white', symbol: '▲', label: 'Tam giác Đỏ' },
    { bg: 'bg-blue-600 active:bg-blue-700 text-white', symbol: '◆', label: 'Hình thoi Xanh' },
    { bg: 'bg-amber-500 active:bg-amber-600 text-white', symbol: '●', label: 'Hình tròn Vàng' },
    { bg: 'bg-emerald-600 active:bg-emerald-700 text-white', symbol: '■', label: 'Hình vuông Xanh lá' },
  ];

  // Step 1: Nickname Entry (No login required)
  if (!hasEnteredNickname) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center text-white shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto mb-4 text-white font-black text-xl shadow-lg">
            H
          </div>
          <h2 className="text-xl font-extrabold mb-1">Tham gia phòng thi {pin}</h2>
          <p className="text-xs text-slate-400 mb-6">
            Không cần tài khoản Google. Hãy đặt một biệt danh để xuất hiện trên bảng đấu!
          </p>

          <form onSubmit={handleNicknameSubmit} className="space-y-4">
            <div>
              <input
                type="text"
                autoFocus
                placeholder="Nhập biệt danh của bạn..."
                maxLength={20}
                value={nickInput}
                onChange={(e) => setNickInput(e.target.value)}
                className="w-full text-center text-base font-bold px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 text-white transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={!nickInput.trim()}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Vào phòng ngay</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <button
            onClick={onExit}
            className="mt-4 text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
          >
            Quay lại trang chủ
          </button>
        </div>
      </div>
    );
  }

  if (isConnecting) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-900 flex flex-col items-center justify-center p-6 text-white text-center">
        <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mb-4" />
        <h2 className="text-lg font-bold">Đang kết nối vào phòng {pin}...</h2>
        <p className="text-xs text-slate-400 mt-1">Đồng bộ danh sách người chơi và trạng thái đề thi</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-900 flex flex-col items-center justify-center p-6 text-white text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
        <h2 className="text-xl font-bold text-red-300">Không thể vào phòng</h2>
        <p className="text-sm text-slate-300 mt-2 max-w-sm">{errorMsg}</p>
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
  const currentQ = roomState?.question;
  const isSelectedCorrect = selectedIdx !== null && currentQ?.correctAnswers?.includes(selectedIdx);

  // Compute player rank
  const myRank = roomState?.participants
    ? roomState.participants.findIndex((p) => p.id === participantId) + 1
    : 1;

  // The actual touch pad UI
  const renderController = () => (
    <div className="flex-1 flex flex-col justify-between p-4 h-full select-none">
      {/* Top Mobile Bar */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
            Câu {(roomState?.currentQuestionIndex || 0) + 1}/{roomState?.totalQuestions || 1}
          </span>
          {streak >= 2 && (
            <span className="font-bold text-amber-500 flex items-center gap-0.5">
              🔥 {streak}
            </span>
          )}
        </div>

        {/* Server-synced Countdown */}
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center font-mono font-bold text-sm border-2 ${
            roomState?.isPaused
              ? 'border-amber-400 text-amber-500 bg-amber-50 dark:bg-amber-950/50'
              : timeRemaining <= 5
              ? 'border-red-500 text-red-500 bg-red-50 dark:bg-red-950/50 animate-pulse'
              : 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50'
          }`}
        >
          {timeRemaining}
        </div>

        <div className="text-right">
          <div className="font-mono font-bold text-slate-900 dark:text-white">
            {score.toLocaleString()} pts
          </div>
          <div className="text-[10px] text-slate-400 font-medium">Hạng #{myRank || 1}</div>
        </div>
      </div>

      {/* Paused state notice */}
      {roomState?.isPaused && (
        <div className="my-2 p-2.5 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 rounded-xl text-xs text-amber-800 dark:text-amber-200 text-center font-bold flex items-center justify-center gap-2">
          <Pause className="w-3.5 h-3.5" />
          <span>Host đang tạm dừng phòng thi</span>
        </div>
      )}

      {/* Lobby State on Phone */}
      {currentStatus === 'lobby' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 my-auto">
          <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-950/70 border-2 border-indigo-500 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 animate-pulse">
            <UserCheck className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
            Bạn đã vào phòng thi!
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            Tên bạn đã xuất hiện trên màn hình Host. Hãy sẵn sàng bấm đáp án khi cuộc thi bắt đầu!
          </p>
          <div className="font-mono text-xs px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            Biệt danh: <strong>{nickname}</strong> · PIN: <strong>{pin}</strong>
          </div>
        </div>
      )}

      {/* Active Question State */}
      {currentStatus === 'running' && (
        <>
          {showQuestionText && currentQ && (
            <div className="my-2 p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug text-center">
              {currentQ.text}
            </div>
          )}

          {!hasAnswered ? (
            <div className="flex-1 grid grid-cols-2 gap-3 my-2">
              {BUTTONS.slice(0, currentQ?.options.length || 4).map((btn, idx) => (
                <button
                  key={idx}
                  disabled={roomState?.isPaused}
                  onClick={() => submitAnswer(idx)}
                  className={`${btn.bg} disabled:opacity-50 rounded-2xl flex flex-col items-center justify-center shadow-lg active:scale-95 transition-transform p-4 cursor-pointer`}
                >
                  <span className="text-4xl sm:text-5xl font-black drop-shadow-sm mb-1">
                    {btn.symbol}
                  </span>
                  {showQuestionText && currentQ && (
                    <span className="text-xs sm:text-sm font-bold text-center line-clamp-2 px-1 text-white/90">
                      {currentQ.options[idx]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 my-auto">
              <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-950/70 border-2 border-indigo-500 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 animate-bounce">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                Đã gửi đáp án lên máy chủ!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Đang chờ đồng hồ đếm ngược hết giờ để công bố kết quả...
              </p>
            </div>
          )}
        </>
      )}

      {/* Paused / Reveal State on Phone */}
      {currentStatus === 'paused' && !roomState?.isPaused && (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4 my-auto">
          {isSelectedCorrect ? (
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 border-2 border-emerald-500 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3">
              <CheckCircle className="w-9 h-9" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950 border-2 border-red-500 flex items-center justify-center text-red-600 dark:text-red-400 mb-3">
              <XCircle className="w-9 h-9" />
            </div>
          )}

          <h3 className={`text-xl font-extrabold mb-1 ${isSelectedCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {isSelectedCorrect ? 'CHÍNH XÁC!' : 'RẤT TIẾC, CHƯA ĐÚNG!'}
          </h3>

          <div className="text-sm font-mono font-bold text-slate-900 dark:text-white mb-2">
            {isSelectedCorrect ? `+${lastGain} điểm` : '+0 điểm'}
          </div>

          {currentQ?.explanation && (
            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-300 max-w-xs mb-3 text-left leading-relaxed">
              <strong>Lời giải:</strong> {currentQ.explanation}
            </div>
          )}

          <div className="text-xs text-slate-500 dark:text-slate-400">
            Hãy nhìn lên màn hình Host để xem bảng xếp hạng!
          </div>
        </div>
      )}

      {/* Finished State on Phone */}
      {currentStatus === 'finished' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 my-auto">
          <Trophy className="w-14 h-14 text-amber-400 mb-3 animate-bounce" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
            Kết thúc cuộc thi!
          </h3>
          <div className="text-2xl font-black font-mono text-amber-500 my-2">
            Hạng #{myRank} ({score.toLocaleString()} pts)
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Cảm ơn bạn đã tham gia bài thi HACHIHI Quiz!
          </p>
        </div>
      )}

      {/* Bottom Controls */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
        <button
          onClick={() => setShowQuestionText(!showQuestionText)}
          className="flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
        >
          {showQuestionText ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          <span>{showQuestionText ? 'Ẩn câu hỏi' : 'Hiện câu hỏi'}</span>
        </button>

        <span className="font-mono">PIN: {pin}</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-900 flex flex-col items-center justify-center p-4">
      {/* Viewport Control Bar */}
      <div className="w-full max-w-4xl flex items-center justify-between mb-4 text-xs text-slate-300">
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Thoát phòng</span>
        </button>

        {/* Device Mode Toggle */}
        <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setDeviceMode('mobile')}
            className={`px-3 py-1 rounded-lg flex items-center gap-1.5 font-medium transition-colors cursor-pointer ${
              deviceMode === 'mobile' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Màn hình Điện thoại</span>
          </button>
          <button
            onClick={() => setDeviceMode('desktop')}
            className={`px-3 py-1 rounded-lg flex items-center gap-1.5 font-medium transition-colors cursor-pointer ${
              deviceMode === 'desktop' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Toàn màn hình Máy tính</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      {deviceMode === 'mobile' ? (
        <div className="relative w-full max-w-[360px] h-[680px] bg-slate-950 rounded-[40px] p-3 shadow-2xl border-4 border-slate-700 flex flex-col">
          <div className="w-32 h-4 bg-slate-800 rounded-full mx-auto mb-2 shrink-0 flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-900 mr-2" />
            <div className="w-10 h-1 bg-slate-700 rounded-full" />
          </div>
          <div className="flex-1 bg-white dark:bg-slate-900 rounded-[28px] overflow-hidden flex flex-col shadow-inner">
            {renderController()}
          </div>
          <div className="w-32 h-1 bg-slate-700 rounded-full mx-auto mt-2 shrink-0" />
        </div>
      ) : (
        <div className="w-full max-w-3xl h-[600px] bg-white dark:bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden">
          {renderController()}
        </div>
      )}
    </div>
  );
};
