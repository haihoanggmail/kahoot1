import React, { useState, useEffect } from 'react';
import { Quiz, Question, User } from '../../types/quiz';
import { sound } from '../../utils/soundEffects';
import confetti from 'canvas-confetti';
import { 
  CheckCircle2, XCircle, Clock, Award, AlertCircle, 
  RotateCcw, ArrowRight, ArrowLeft, Bookmark, Check, 
  FileText, ShieldCheck, ChevronRight, BookOpen
} from 'lucide-react';

interface SelfPacedViewProps {
  quizzes: Quiz[];
  currentUser: User;
  onOpenLiveHost: (quiz: Quiz) => void;
}

export const SelfPacedView: React.FC<SelfPacedViewProps> = ({
  quizzes,
  currentUser,
  onOpenLiveHost,
}) => {
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 mins
  const [isCompleted, setIsCompleted] = useState(false);
  const [scoreResult, setScoreResult] = useState<{
    correctCount: number;
    totalCount: number;
    points: number;
    maxPoints: number;
    percentage: number;
    passed: boolean;
  } | null>(null);

  // Start a quiz attempt
  const startQuiz = (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setIsTesting(true);
    setCurrentIdx(0);
    setAnswers({});
    setFlagged({});
    setIsCompleted(false);
    setScoreResult(null);

    // Calculate total test time: sum of question time limits or 30s per question
    const totalSeconds = quiz.questions.reduce((acc, q) => acc + (q.timeLimit || 25), 0);
    setTimeRemaining(totalSeconds);
  };

  // Timer countdown
  useEffect(() => {
    let interval: any = null;
    if (isTesting && !isCompleted && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((t) => {
          if (t <= 1) {
            clearInterval(interval);
            submitTest();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTesting, isCompleted, timeRemaining]);

  const selectOption = (questionId: string, optionIdx: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionIdx,
    }));
    sound.playSubmit();
  };

  const toggleFlag = (questionId: string) => {
    setFlagged((prev) => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  };

  const submitTest = () => {
    if (!selectedQuiz) return;
    setIsTesting(false);
    setIsCompleted(true);

    let correct = 0;
    let earnedPoints = 0;
    let totalPoints = 0;

    selectedQuiz.questions.forEach((q) => {
      const userChoice = answers[q.id];
      const isCorrect = userChoice !== undefined && q.correctAnswers.includes(userChoice);
      totalPoints += q.points || 1000;
      if (isCorrect) {
        correct++;
        earnedPoints += q.points || 1000;
      }
    });

    const percentage = Math.round((correct / selectedQuiz.questions.length) * 100);
    const passed = percentage >= 70;

    setScoreResult({
      correctCount: correct,
      totalCount: selectedQuiz.questions.length,
      points: earnedPoints,
      maxPoints: totalPoints,
      percentage,
      passed,
    });

    // Save attempt persistently to database
    fetch('/api/self-paced/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: `att-${Date.now()}`,
        quiz_id: selectedQuiz.id,
        quiz_title: selectedQuiz.title,
        user_email: currentUser.email,
        user_name: currentUser.name,
        score: earnedPoints,
        max_score: totalPoints,
        correct_count: correct,
        total_count: selectedQuiz.questions.length,
        answers_json: answers,
        started_at: new Date(Date.now() - (selectedQuiz.questions.reduce((a, b) => a + (b.timeLimit || 20), 0) - timeRemaining) * 1000).toISOString(),
        completed_at: new Date().toISOString(),
        passed,
      }),
    }).catch((err) => console.error('Failed to save self paced attempt', err));

    if (passed) {
      sound.playFanfare();
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    } else {
      sound.playIncorrect();
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // If currently taking test
  if (isTesting && selectedQuiz) {
    const q = selectedQuiz.questions[currentIdx];
    const isLast = currentIdx === selectedQuiz.questions.length - 1;
    const answeredTotal = Object.keys(answers).length;

    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Test Header */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 mb-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1">
              {selectedQuiz.category} · Chế độ Tự làm bài
            </div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white truncate max-w-md">
              {selectedQuiz.title}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-mono font-bold text-slate-800 dark:text-slate-200">
              <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>{formatTime(timeRemaining)}</span>
            </div>

            <button
              onClick={submitTest}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors cursor-pointer"
            >
              Nộp bài ({answeredTotal}/{selectedQuiz.questions.length})
            </button>
          </div>
        </div>

        {/* Question Stage */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Question Body */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm flex flex-col justify-between transition-colors">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold font-mono text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/70 px-2.5 py-1 rounded-md">
                  Câu hỏi {currentIdx + 1} / {selectedQuiz.questions.length}
                </span>

                <button
                  onClick={() => toggleFlag(q.id)}
                  className={`text-xs font-medium flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    flagged[q.id]
                      ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold'
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${flagged[q.id] ? 'fill-amber-600 text-amber-600' : ''}`} />
                  <span>{flagged[q.id] ? 'Đã đánh dấu' : 'Đánh dấu xem lại'}</span>
                </button>
              </div>

              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-snug mb-6">
                {q.text}
              </h2>

              {/* Options */}
              <div className="space-y-3 mb-8">
                {q.options.map((opt, optIdx) => {
                  const isSelected = answers[q.id] === optIdx;
                  return (
                    <button
                      key={optIdx}
                      onClick={() => selectOption(q.id, optIdx)}
                      className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3.5 cursor-pointer ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50 text-indigo-950 dark:text-indigo-200 font-medium shadow-sm ring-1 ring-indigo-600'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                          isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600'
                        }`}
                      >
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <span className="text-sm leading-relaxed">{opt}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx((i) => i - 1)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Câu trước
              </button>

              {isLast ? (
                <button
                  onClick={submitTest}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  Hoàn thành & Chấm điểm
                </button>
              ) : (
                <button
                  onClick={() => setCurrentIdx((i) => i + 1)}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  Câu tiếp theo
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Question Grid Navigator */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm h-fit transition-colors">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              Danh sách câu hỏi
            </h3>
            <div className="grid grid-cols-5 gap-2 mb-4">
              {selectedQuiz.questions.map((item, idx) => {
                const isCurrent = idx === currentIdx;
                const isAnswered = answers[item.id] !== undefined;
                const isFlag = flagged[item.id];

                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentIdx(idx)}
                    className={`h-9 rounded-lg font-mono text-xs font-bold relative transition-all cursor-pointer ${
                      isCurrent
                        ? 'ring-2 ring-indigo-600 bg-indigo-600 text-white'
                        : isAnswered
                        ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {idx + 1}
                    {isFlag && (
                      <span className="w-2 h-2 rounded-full bg-amber-500 absolute -top-1 -right-1" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="space-y-1.5 text-[11px] text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-indigo-100 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800" />
                <span>Đã trả lời ({answeredTotal})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" />
                <span>Chưa làm ({selectedQuiz.questions.length - answeredTotal})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>Cần xem lại</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If completed and showing scorecard
  if (isCompleted && selectedQuiz && scoreResult) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Scorecard Hero */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm text-center mb-8 transition-colors">
          <div className="inline-flex p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-100 dark:border-indigo-800 mb-4">
            <Award className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-1">
            Kết quả Bài kiểm tra Tự luyện
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{selectedQuiz.title}</p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-xl mx-auto mb-8">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <div className="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400">
                {scoreResult.percentage}%
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Tỷ lệ chính xác</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                {scoreResult.correctCount}/{scoreResult.totalCount}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Số câu đúng</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                {scoreResult.points.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Điểm đạt được</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <div className={`text-base font-bold uppercase tracking-wider mt-1 ${scoreResult.passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {scoreResult.passed ? 'ĐẠT (PASS)' : 'CHƯA ĐẠT'}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Đánh giá chung</div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => startQuiz(selectedQuiz)}
              className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Làm lại bài thi
            </button>
            <button
              onClick={() => {
                setIsCompleted(false);
                setSelectedQuiz(null);
              }}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
            >
              Chọn đề thi khác
            </button>
          </div>
        </div>

        {/* Detailed Question Review */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Xem lại chi tiết & Lời giải bài làm
          </h2>

          {selectedQuiz.questions.map((q, idx) => {
            const userChoice = answers[q.id];
            const isCorrect = userChoice !== undefined && q.correctAnswers.includes(userChoice);

            return (
              <div
                key={q.id}
                className={`bg-white dark:bg-slate-900 rounded-xl border p-5 shadow-sm transition-all ${
                  isCorrect
                    ? 'border-emerald-200 dark:border-emerald-800'
                    : 'border-red-200 dark:border-red-800'
                }`}
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400">
                      Câu {idx + 1}:
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white text-sm">{q.text}</span>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1 shrink-0 ${
                      isCorrect
                        ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                        : 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400'
                    }`}
                  >
                    {isCorrect ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Đúng
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5" /> Sai
                      </>
                    )}
                  </span>
                </div>

                {/* Option list */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mb-3">
                  {q.options.map((opt, optIdx) => {
                    const isUserChoice = userChoice === optIdx;
                    const isRightAnswer = q.correctAnswers.includes(optIdx);

                    return (
                      <div
                        key={optIdx}
                        className={`p-2.5 rounded-lg border flex items-center justify-between ${
                          isRightAnswer
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-200 font-medium'
                            : isUserChoice
                            ? 'bg-red-50 dark:bg-red-950/60 border-red-300 dark:border-red-700 text-red-950 dark:text-red-200 font-medium'
                            : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <span>
                          <strong>{String.fromCharCode(65 + optIdx)}.</strong> {opt}
                        </span>
                        {isRightAnswer && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                        {!isRightAnswer && isUserChoice && (
                          <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Explanation */}
                {q.explanation && (
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-xs text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    <strong className="text-slate-800 dark:text-slate-200">Giải thích: </strong>
                    {q.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Default view: list of quizzes ready for self-paced practice
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Title & Info Banner */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1">
          <BookOpen className="w-4 h-4" />
          <span>Chế độ Tự làm bài (Self-Paced / Homework)</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Luyện tập & Kiểm tra Năng lực Cá nhân
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
          Học viên và nhân sự có thể làm bài độc lập theo tiến độ cá nhân, tự động chấm điểm và xem lời giải chi tiết ngay sau khi hoàn thành.
        </p>
      </div>

      {/* Quiz Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {quizzes.map((quiz) => (
          <div
            key={quiz.id}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-3">
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">{quiz.category}</span>
                <span className="font-mono">{quiz.questions.length} câu hỏi</span>
              </div>

              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2 leading-snug">
                {quiz.title}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 mb-4 leading-relaxed">
                {quiz.description}
              </p>

              <div className="flex flex-wrap gap-1.5 mb-6">
                {quiz.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
              <button
                onClick={() => onOpenLiveHost(quiz)}
                className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
              >
                Mở phòng Live
              </button>

              <button
                onClick={() => startQuiz(quiz)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>Bắt đầu làm bài</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
