import { Question } from '../types/quiz';

export interface ParsedSheetResult {
  success: boolean;
  title?: string;
  questions: Question[];
  errors: string[];
}

export function parseGoogleSheetsText(text: string): ParsedSheetResult {
  const errors: string[] = [];
  const questions: Question[] = [];

  if (!text || !text.trim()) {
    return {
      success: false,
      questions: [],
      errors: ['Nội dung trống. Vui lòng dán dữ liệu từ Google Sheets hoặc nhập liên kết.'],
    };
  }

  // Split lines
  const rawLines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (rawLines.length === 0) {
    return { success: false, questions: [], errors: ['Không tìm thấy dòng dữ liệu nào.'] };
  }

  // Determine delimiter (Tab or Comma or Semicolon)
  const firstLine = rawLines[0];
  let delimiter = '\t';
  if (firstLine.includes('\t')) {
    delimiter = '\t';
  } else if (firstLine.includes(',')) {
    delimiter = ',';
  } else if (firstLine.includes(';')) {
    delimiter = ';';
  }

  // Helper for simple CSV/TSV splitting with quoted strings
  const splitLine = (line: string): string[] => {
    if (delimiter === '\t') {
      return line.split('\t').map((c) => c.replace(/^["']|["']$/g, '').trim());
    }
    // Simple regex for CSV splitting
    const regex = /(?:,|\n|^)("(?:(?:"")*[^"]*)*"|[^",\n]*|(?:\n|$))/g;
    const matches: string[] = [];
    let match;
    while ((match = regex.exec(line)) !== null) {
      let val = match[1];
      if (val === undefined) break;
      val = val.replace(/^["']|["']$/g, '').replace(/""/g, '"').trim();
      matches.push(val);
      if (regex.lastIndex >= line.length) break;
    }
    return matches.length > 0 ? matches : line.split(delimiter).map((c) => c.trim());
  };

  // Check if first line is header
  let startIdx = 0;
  const headerCols = splitLine(firstLine).map((c) => c.toLowerCase());
  if (
    headerCols.some(
      (c) =>
        c.includes('câu hỏi') ||
        c.includes('question') ||
        c.includes('lựa chọn') ||
        c.includes('đáp án') ||
        c.includes('option')
    )
  ) {
    startIdx = 1;
  }

  for (let i = startIdx; i < rawLines.length; i++) {
    const cols = splitLine(rawLines[i]);
    if (cols.length < 3) continue; // Minimum: question + 2 options

    const questionText = cols[0];
    if (!questionText || questionText.trim().length === 0) continue;

    // Collect options from Col B, C, D, E (index 1, 2, 3, 4)
    const options: string[] = [];
    if (cols[1]) options.push(cols[1]);
    if (cols[2]) options.push(cols[2]);
    if (cols[3]) options.push(cols[3]);
    if (cols[4]) options.push(cols[4]);

    if (options.length < 2) {
      errors.push(`Dòng ${i + 1}: Cần ít nhất 2 phương án lựa chọn.`);
      continue;
    }

    // Correct Answer (Col F / index 5)
    let correctAnswers = [0];
    const rawCorrect = (cols[5] || 'A').toUpperCase().trim();

    if (rawCorrect === 'A' || rawCorrect === '1') correctAnswers = [0];
    else if (rawCorrect === 'B' || rawCorrect === '2') correctAnswers = [1];
    else if (rawCorrect === 'C' || rawCorrect === '3') correctAnswers = [Math.min(2, options.length - 1)];
    else if (rawCorrect === 'D' || rawCorrect === '4') correctAnswers = [Math.min(3, options.length - 1)];
    else {
      // Try to find matching option text
      const foundIdx = options.findIndex((opt) => opt.toLowerCase() === rawCorrect.toLowerCase());
      if (foundIdx !== -1) {
        correctAnswers = [foundIdx];
      }
    }

    // Time limit (Col G / index 6)
    const timeLimit = parseInt(cols[6], 10) || 20;

    // Points (Col H / index 7)
    const points = parseInt(cols[7], 10) || 1000;

    // Explanation (Col I / index 8)
    const explanation = cols[8] || '';

    questions.push({
      id: `q-sheet-${Date.now()}-${i}`,
      text: questionText,
      type: options.length === 2 && (options[0].toLowerCase().includes('đúng') || options[0].toLowerCase().includes('true')) ? 'boolean' : 'single',
      options,
      correctAnswers,
      timeLimit: Math.max(5, Math.min(120, timeLimit)),
      points: points > 0 ? points : 1000,
      explanation,
    });
  }

  if (questions.length === 0) {
    errors.push('Không nhận diện được câu hỏi nào hợp lệ. Vui lòng kiểm tra lại cấu trúc các cột.');
  }

  return {
    success: questions.length > 0,
    questions,
    errors,
  };
}

export function extractGoogleSheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

export const SAMPLE_SHEET_DATA = `Câu hỏi\tLựa chọn A\tLựa chọn B\tLựa chọn C\tLựa chọn D\tĐáp án đúng\tThời gian (giây)\tĐiểm\tGiải thích
Phòng thi HACHIHI Quiz giới hạn tối đa bao nhiêu người?\t30 người\t50 người\t100 người\tKhông giới hạn\tB\t20\t1000\tTheo chốt thiết kế kỹ thuật MVP, quy mô tối đa 50 người để chạy mượt mà trên Cloudflare Free Tier.
Phương thức xác thực nào được sử dụng để giới hạn người dùng?\tĐăng nhập ẩn danh\tGoogle Workspace SSO\tFacebook Login\tSố điện thoại SMS\tB\t20\t1000\tHệ thống dùng Google Workspace OAuth2 với claim hd để khóa theo tên miền doanh nghiệp.
Cloudflare D1 là cơ sở dữ liệu gì?\tMongoDB\tSQLite phân tán tại Edge\tPostgreSQL Server\tRedis Cache\tB\t20\t1000\tCloudflare D1 là cơ sở dữ liệu quan hệ SQL xây dựng trên nền SQLite chạy trực tiếp tại Edge.
Cơ chế nào giúp tạo âm thanh trực tiếp mà không cần tải file MP3?\tWeb Audio API\tFlash Player\tQuickTime\tWindows Media\tA\t15\t1000\tWeb Audio API tạo sóng dao động âm thanh trực tiếp trong trình duyệt, không lo lỗi mạng tải audio.
Chế độ nào cho phép học viên tự làm bài thi độc lập?\tChế độ Thi trực tiếp (Live)\tChế độ Tự làm bài (Self-Paced)\tChế độ Khán giả\tChế độ Ban giám khảo\tB\t20\t1000\tChế độ Tự làm bài cho phép cá nhân bấm giờ và xem lời giải chi tiết sau khi nộp bài.`;
