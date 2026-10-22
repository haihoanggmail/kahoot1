import React, { useState } from 'react';
import { Quiz, Question, User } from '../../types/quiz';
import { GoogleSheetImportModal } from './GoogleSheetImportModal';
import { 
  Plus, Edit, Trash2, Download, Upload, Copy, 
  Check, Play, BookOpen, AlertCircle, Sparkles, X,
  FileSpreadsheet
} from 'lucide-react';

interface QuizManagerProps {
  quizzes: Quiz[];
  setQuizzes: React.Dispatch<React.SetStateAction<Quiz[]>>;
  currentUser: User;
  onLaunchLive: (quiz: Quiz) => void;
  onLaunchSelfPaced: (quiz: Quiz) => void;
}

export const QuizManager: React.FC<QuizManagerProps> = ({
  quizzes,
  setQuizzes,
  currentUser,
  onLaunchLive,
  onLaunchSelfPaced,
}) => {
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form states for creating / editing
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Bảo mật & CNTT');
  const [questions, setQuestions] = useState<Question[]>([]);

  const openCreateModal = () => {
    setEditingQuiz(null);
    setTitle('');
    setDescription('');
    setCategory('Bảo mật & CNTT');
    setQuestions([
      {
        id: `q-${Date.now()}-1`,
        text: 'Nội dung câu hỏi mẫu số 1 của bạn là gì?',
        type: 'single',
        options: ['Lựa chọn A', 'Lựa chọn B', 'Lựa chọn C', 'Lựa chọn D'],
        correctAnswers: [0],
        timeLimit: 20,
        points: 1000,
        explanation: 'Giải thích lý do lựa chọn này là chính xác.',
      },
    ]);
    setIsModalOpen(true);
  };

  const openEditModal = (quiz: Quiz) => {
    setEditingQuiz(quiz);
    setTitle(quiz.title);
    setDescription(quiz.description);
    setCategory(quiz.category);
    setQuestions([...quiz.questions]);
    setIsModalOpen(true);
  };

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        id: `q-${Date.now()}-${prev.length + 1}`,
        text: `Câu hỏi số ${prev.length + 1}`,
        type: 'single',
        options: ['Lựa chọn A', 'Lựa chọn B', 'Lựa chọn C', 'Lựa chọn D'],
        correctAnswers: [0],
        timeLimit: 20,
        points: 1000,
        explanation: '',
      },
    ]);
  };

  const removeQuestion = (idx: number) => {
    if (questions.length <= 1) return;
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateQuestionText = (idx: number, text: string) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], text };
      return copy;
    });
  };

  const updateOptionText = (qIdx: number, optIdx: number, text: string) => {
    setQuestions((prev) => {
      const copy = [...prev];
      const newOpts = [...copy[qIdx].options];
      newOpts[optIdx] = text;
      copy[qIdx] = { ...copy[qIdx], options: newOpts };
      return copy;
    });
  };

  const setCorrectOption = (qIdx: number, optIdx: number) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[qIdx] = { ...copy[qIdx], correctAnswers: [optIdx] };
      return copy;
    });
  };

  const updateExplanation = (qIdx: number, explanation: string) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[qIdx] = { ...copy[qIdx], explanation };
      return copy;
    });
  };

  const saveQuiz = () => {
    if (!title.trim()) return;

    if (editingQuiz) {
      setQuizzes((prev) =>
        prev.map((q) =>
          q.id === editingQuiz.id
            ? {
                ...q,
                title,
                description,
                category,
                questions,
                updatedAt: new Date().toISOString().split('T')[0],
              }
            : q
        )
      );
    } else {
      const newQuiz: Quiz = {
        id: `quiz-custom-${Date.now()}`,
        title,
        description,
        category,
        questions,
        createdBy: currentUser.email,
        authorName: currentUser.name,
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0],
        isPublic: true,
        targetDomain: currentUser.domain,
        tags: [category, 'Tự tạo'],
      };
      setQuizzes((prev) => [newQuiz, ...prev]);
    }

    setIsModalOpen(false);
  };

  const deleteQuiz = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa bộ đề thi này?')) {
      setQuizzes((prev) => prev.filter((q) => q.id !== id));
    }
  };

  const exportQuizJson = (quiz: Quiz) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(quiz, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', dataStr);
    dlAnchorElem.setAttribute('download', `${quiz.title.replace(/\\s+/g, '_')}.json`);
    dlAnchorElem.click();
  };

  const handleImportSheetSuccess = (newQuiz: Quiz) => {
    setQuizzes((prev) => [newQuiz, ...prev]);
  };

  const filteredQuizzes = quizzes.filter(
    (q) =>
      q.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block mb-1">
            Quản trị & Soạn thảo Đề thi
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Ngân hàng Đề thi Trắc nghiệm
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Tạo mới, chỉnh sửa, nhập từ Google Sheets và phát động thi đấu trực tiếp cho tổ chức {currentUser.domain}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Import from Google Sheets Button */}
          <button
            onClick={() => setIsSheetModalOpen(true)}
            className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center gap-2 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Nạp từ Google Sheet</span>
          </button>

          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo đề thi mới</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Tìm kiếm theo tên đề thi hoặc danh mục..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:max-w-md px-4 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:text-white shadow-sm"
        />
      </div>

      {/* Quizzes Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm transition-colors">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
              <th className="py-3 px-4">Tên bộ đề thi</th>
              <th className="py-3 px-4">Danh mục</th>
              <th className="py-3 px-4">Số câu</th>
              <th className="py-3 px-4">Tác giả</th>
              <th className="py-3 px-4">Ngày tạo</th>
              <th className="py-3 px-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredQuizzes.map((quiz) => (
              <tr key={quiz.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                <td className="py-3.5 px-4">
                  <div className="font-bold text-slate-900 dark:text-white text-sm">{quiz.title}</div>
                  <div className="text-slate-500 dark:text-slate-400 text-[11px] line-clamp-1 max-w-xs">
                    {quiz.description}
                  </div>
                </td>
                <td className="py-3.5 px-4">
                  <span className="font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded">
                    {quiz.category}
                  </span>
                </td>
                <td className="py-3.5 px-4 font-mono font-semibold text-slate-800 dark:text-slate-200">
                  {quiz.questions.length} câu
                </td>
                <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">{quiz.authorName}</td>
                <td className="py-3.5 px-4 font-mono text-slate-500 dark:text-slate-400">{quiz.createdAt}</td>
                <td className="py-3.5 px-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => onLaunchLive(quiz)}
                      title="Phát trực tiếp phòng Kahoot"
                      className="p-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 rounded-lg transition-colors cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-indigo-600" />
                    </button>
                    <button
                      onClick={() => onLaunchSelfPaced(quiz)}
                      title="Làm bài tự luyện"
                      className="p-1.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 rounded-lg transition-colors cursor-pointer"
                    >
                      <BookOpen className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => exportQuizJson(quiz)}
                      title="Xuất file JSON"
                      className="p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openEditModal(quiz)}
                      title="Sửa đề thi"
                      className="p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteQuiz(quiz.id)}
                      title="Xóa đề thi"
                      className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Google Sheets Importer Modal */}
      <GoogleSheetImportModal
        isOpen={isSheetModalOpen}
        onClose={() => setIsSheetModalOpen(false)}
        onImportSuccess={handleImportSheetSuccess}
        currentUser={currentUser}
      />

      {/* Editor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl my-8 transition-colors">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {editingQuiz ? 'Chỉnh sửa bộ đề thi' : 'Tạo mới bộ đề thi trắc nghiệm'}
                </h2>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Chuẩn hóa theo format Kahoot 4 đáp án & tương thích Cloudflare D1
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tiêu đề đề thi
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="VD: Kiểm tra An toàn Thông tin Quý 1"
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Danh mục
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="Bảo mật & CNTT">Bảo mật & CNTT</option>
                    <option value="Kỹ thuật Cloud">Kỹ thuật Cloud</option>
                    <option value="Văn hóa & Team">Văn hóa & Team</option>
                    <option value="Google Workspace">Google Workspace</option>
                    <option value="Chuyên môn Nghiệp vụ">Chuyên môn Nghiệp vụ</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mô tả bài thi
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Mô tả mục đích, thời lượng và đối tượng tham gia bài thi..."
                  rows={2}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              {/* Questions Builder */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Danh sách câu hỏi ({questions.length})
                  </span>
                  <button
                    onClick={addQuestion}
                    className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Thêm câu hỏi
                  </button>
                </div>

                <div className="space-y-4">
                  {questions.map((q, qIdx) => (
                    <div
                      key={q.id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 font-mono">
                          Câu {qIdx + 1}
                        </span>
                        {questions.length > 1 && (
                          <button
                            onClick={() => removeQuestion(qIdx)}
                            className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Xóa
                          </button>
                        )}
                      </div>

                      <input
                        type="text"
                        value={q.text}
                        onChange={(e) => updateQuestionText(qIdx, e.target.value)}
                        placeholder="Nội dung câu hỏi..."
                        className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600 font-medium"
                      />

                      {/* 4 Choices */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {q.options.map((opt, optIdx) => {
                          const isCorrect = q.correctAnswers.includes(optIdx);
                          return (
                            <div
                              key={optIdx}
                              className={`p-2 rounded-lg border flex items-center gap-2 ${
                                isCorrect
                                  ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/50'
                                  : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => setCorrectOption(qIdx, optIdx)}
                                title="Đánh dấu đây là đáp án đúng"
                                className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 transition-colors cursor-pointer ${
                                  isCorrect
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300'
                                }`}
                              >
                                {String.fromCharCode(65 + optIdx)}
                              </button>
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => updateOptionText(qIdx, optIdx, e.target.value)}
                                className="w-full text-xs bg-transparent dark:text-white focus:outline-none"
                              />
                            </div>
                          );
                        })}
                      </div>

                      {/* Explanation */}
                      <div>
                        <input
                          type="text"
                          value={q.explanation || ''}
                          onChange={(e) => updateExplanation(qIdx, e.target.value)}
                          placeholder="Lời giải thích sau khi thí sinh trả lời xong (Tùy chọn)..."
                          className="w-full px-3 py-1.5 text-[11px] border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3 bg-slate-50 dark:bg-slate-950 rounded-b-2xl">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={saveQuiz}
                className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                Lưu đề thi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
