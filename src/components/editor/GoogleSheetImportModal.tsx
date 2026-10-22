import React, { useState } from 'react';
import { Quiz, Question, User } from '../../types/quiz';
import { 
  parseGoogleSheetsText, 
  extractGoogleSheetId, 
  SAMPLE_SHEET_DATA,
  ParsedSheetResult 
} from '../../utils/googleSheetsParser';
import { 
  FileSpreadsheet, X, Check, AlertCircle, 
  Download, Sparkles, Link as LinkIcon, Clipboard,
  HelpCircle, ArrowRight
} from 'lucide-react';

interface GoogleSheetImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (newQuiz: Quiz) => void;
  currentUser: User;
}

export const GoogleSheetImportModal: React.FC<GoogleSheetImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
  currentUser,
}) => {
  const [activeInputTab, setActiveInputTab] = useState<'paste' | 'link'>('paste');
  const [pastedContent, setPastedContent] = useState('');
  const [sheetUrl, setSheetUrl] = useState('');
  const [quizTitle, setQuizTitle] = useState('Đề thi nhập từ Google Sheet');
  const [quizCategory, setQuizCategory] = useState('Google Workspace');
  const [quizDescription, setQuizDescription] = useState('Bộ câu hỏi được đồng bộ hóa từ bảng tính Google Sheets.');
  
  const [parseResult, setParseResult] = useState<ParsedSheetResult | null>(null);
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle parsing pasted content
  const handleParsePasted = (text: string) => {
    setPastedContent(text);
    if (!text.trim()) {
      setParseResult(null);
      return;
    }
    const result = parseGoogleSheetsText(text);
    setParseResult(result);
  };

  // Load sample dataset
  const handleLoadSample = () => {
    setPastedContent(SAMPLE_SHEET_DATA);
    setQuizTitle('Đề thi Kiến thức Hệ thống HACHIHI (Sheet Sample)');
    const result = parseGoogleSheetsText(SAMPLE_SHEET_DATA);
    setParseResult(result);
  };

  // Fetch from Google Sheet URL
  const handleFetchFromUrl = async () => {
    setFetchError(null);
    const sheetId = extractGoogleSheetId(sheetUrl);
    if (!sheetId) {
      setFetchError('Đường link Google Sheet không hợp lệ. Hãy kiểm tra định dạng docs.google.com/spreadsheets/d/...');
      return;
    }

    setIsLoadingUrl(true);
    // Google Sheets public CSV export endpoints
    const exportUrls = [
      `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`,
      `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`,
    ];

    try {
      let fetchedText = '';
      for (const url of exportUrls) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            fetchedText = await res.text();
            if (fetchedText && fetchedText.trim()) break;
          }
        } catch {
          // try next
        }
      }

      if (fetchedText) {
        setPastedContent(fetchedText);
        const result = parseGoogleSheetsText(fetchedText);
        setParseResult(result);
        setActiveInputTab('paste');
      } else {
        setFetchError(
          'Không thể tải trực tiếp qua link do chính sách chia sẻ của Google. Bạn hãy mở Google Sheet, bôi đen các ô, nhấn Ctrl+C và dán vào tab "Dán dữ liệu (Copy & Paste)"!'
        );
      }
    } catch (err: any) {
      setFetchError('Lỗi kết nối. Vui lòng chuyển sang tab "Dán dữ liệu (Copy & Paste)" để nhập ngay.');
    } finally {
      setIsLoadingUrl(false);
    }
  };

  // Download CSV template
  const downloadTemplate = () => {
    const blob = new Blob([SAMPLE_SHEET_DATA], { type: 'text/tab-separated-values;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hachihi_quiz_template.tsv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Confirm save
  const handleConfirmImport = () => {
    if (!parseResult || !parseResult.success || parseResult.questions.length === 0) return;

    const newQuiz: Quiz = {
      id: `quiz-sheet-${Date.now()}`,
      title: quizTitle || 'Đề thi nhập từ Google Sheet',
      description: quizDescription,
      category: quizCategory,
      questions: parseResult.questions,
      createdBy: currentUser.email,
      authorName: currentUser.name,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      isPublic: true,
      targetDomain: currentUser.domain,
      tags: ['Google Sheet', quizCategory],
    };

    onImportSuccess(newQuiz);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl my-6 transition-colors">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Nạp danh sách câu hỏi từ Google Sheets
              </h2>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Tự động trích xuất câu hỏi, 4 đáp án, thời gian và lời giải từ bảng tính
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 dark:text-slate-200">
          {/* Method Tabs & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                onClick={() => setActiveInputTab('paste')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                  activeInputTab === 'paste'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Clipboard className="w-3.5 h-3.5" />
                <span>Dán từ Google Sheets (Ctrl+V)</span>
              </button>
              <button
                onClick={() => setActiveInputTab('link')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                  activeInputTab === 'link'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>Nhập Link Google Sheet</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleLoadSample}
                className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-xs font-semibold rounded-lg border border-indigo-200 dark:border-indigo-800 flex items-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span>Thử dữ liệu mẫu (Sample)</span>
              </button>

              <button
                onClick={downloadTemplate}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải bảng mẫu</span>
              </button>
            </div>
          </div>

          {/* Tab 1: Paste Mode */}
          {activeInputTab === 'paste' && (
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                <span>Sao chép các dòng trong Google Sheet và dán vào ô bên dưới:</span>
                <span className="text-[11px] font-mono">Cột: Câu hỏi | Lựa chọn A | B | C | D | Đáp án đúng | Thời gian | Điểm</span>
              </div>
              <textarea
                value={pastedContent}
                onChange={(e) => handleParsePasted(e.target.value)}
                rows={6}
                placeholder="Dán dữ liệu được copy trực tiếp từ Google Sheet vào đây..."
                className="w-full p-3 font-mono text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 text-slate-800 dark:text-slate-200"
              />
            </div>
          )}

          {/* Tab 2: Link Mode */}
          {activeInputTab === 'link' && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Đường dẫn liên kết Google Sheet (Chế độ xem công khai hoặc Bất kỳ ai có liên kết)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5.../edit"
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
                <button
                  onClick={handleFetchFromUrl}
                  disabled={isLoadingUrl}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
                >
                  {isLoadingUrl ? 'Đang tải...' : 'Tải bảng tính'}
                </button>
              </div>

              {fetchError && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>{fetchError}</span>
                </div>
              )}
            </div>
          )}

          {/* Quiz Metadata Configuration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tiêu đề bộ đề thi
              </label>
              <input
                type="text"
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Danh mục
              </label>
              <select
                value={quizCategory}
                onChange={(e) => setQuizCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="Google Workspace">Google Workspace</option>
                <option value="Bảo mật & CNTT">Bảo mật & CNTT</option>
                <option value="Kỹ thuật Cloud">Kỹ thuật Cloud</option>
                <option value="Văn hóa & Team">Văn hóa & Team</option>
                <option value="Đào tạo Nội bộ">Đào tạo Nội bộ</option>
              </select>
            </div>
          </div>

          {/* Parse Result Preview */}
          {parseResult && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <span>Xem trước danh sách câu hỏi nhận diện được</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-mono text-xs font-bold">
                    {parseResult.questions.length} câu
                  </span>
                </span>
              </div>

              {parseResult.errors.length > 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300 space-y-1">
                  {parseResult.errors.map((err, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>{err}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Table Preview */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold sticky top-0">
                    <tr>
                      <th className="py-2 px-3 w-8">#</th>
                      <th className="py-2 px-3">Câu hỏi</th>
                      <th className="py-2 px-3">Các lựa chọn</th>
                      <th className="py-2 px-3 w-28">Đáp án đúng</th>
                      <th className="py-2 px-3 w-20">Thời gian</th>
                      <th className="py-2 px-3 w-20">Điểm</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {parseResult.questions.map((q, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100 max-w-xs truncate">
                          {q.text}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                          {q.options.map((opt, oIdx) => (
                            <span key={oIdx} className="mr-2">
                              {String.fromCharCode(65 + oIdx)}. {opt}
                            </span>
                          ))}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded">
                            {String.fromCharCode(65 + q.correctAnswers[0])}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                          {q.timeLimit}s
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                          {q.points}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Hủy
          </button>

          <button
            onClick={handleConfirmImport}
            disabled={!parseResult || !parseResult.success || parseResult.questions.length === 0}
            className="px-6 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl shadow-sm transition-colors flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>
              Lưu {parseResult?.questions.length || 0} câu hỏi vào Ngân hàng
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
