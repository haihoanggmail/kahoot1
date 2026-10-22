import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface DbUser {
  id: string;
  email: string;
  display_name: string;
  role: 'admin' | 'host' | 'viewer';
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface DbQuestion {
  id: string;
  quiz_id: string;
  position: number;
  question_text: string;
  question_type: 'single' | 'boolean' | 'multiple';
  options_json: string[];
  correct_answer_json: number[];
  time_limit_seconds: number;
  points: number;
  explanation?: string;
  media_url?: string;
}

export interface DbQuiz {
  id: string;
  title: string;
  description: string;
  category: string;
  owner_id: string;
  status: 'draft' | 'published' | 'archived';
  questions: DbQuestion[];
  created_at: string;
  updated_at: string;
}

export interface DbGameSession {
  id: string;
  quiz_id: string;
  quiz_title: string;
  host_id: string;
  host_name: string;
  pin: string;
  status: 'lobby' | 'running' | 'paused' | 'finished' | 'cancelled';
  current_question_index: number;
  started_at?: string;
  ended_at?: string;
  created_at: string;
}

export interface DbParticipant {
  id: string;
  session_id: string;
  nickname: string;
  participant_token: string;
  status: 'active' | 'disconnected' | 'finished';
  score: number;
  streak: number;
  joined_at: string;
  last_seen_at: string;
}

export interface DbAnswer {
  id: string;
  session_id: string;
  participant_id: string;
  question_id: string;
  answer_json: number;
  is_correct: number;
  response_time_ms: number;
  points_awarded: number;
  submitted_at: string;
}

export interface DbSessionResult {
  id: string;
  session_id: string;
  participant_id: string;
  nickname: string;
  final_score: number;
  rank: number;
  correct_count: number;
  total_answered: number;
  completed_at: string;
}

export interface DbAuditLog {
  id: string;
  actor_type: 'host' | 'player' | 'system';
  actor_id: string;
  session_id?: string;
  event_type: string;
  details_json: Record<string, any>;
  created_at: string;
}

export interface DbSelfPacedAttempt {
  id: string;
  quiz_id: string;
  quiz_title: string;
  user_email: string;
  user_name: string;
  score: number;
  max_score: number;
  correct_count: number;
  total_count: number;
  answers_json: Record<string, number>;
  started_at: string;
  completed_at: string;
  passed: boolean;
}

interface DatabaseSchema {
  users: DbUser[];
  quizzes: DbQuiz[];
  game_sessions: DbGameSession[];
  participants: DbParticipant[];
  answers: DbAnswer[];
  session_results: DbSessionResult[];
  audit_logs: DbAuditLog[];
  self_paced_attempts: DbSelfPacedAttempt[];
}

const DATA_DIR = path.resolve(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'hachihi_quiz_store.json');

class DatabaseStore {
  private data: DatabaseSchema;

  constructor() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    this.data = this.load();
    if (this.data.quizzes.length === 0) {
      this.seedInitialData();
    }
  }

  private load(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('Failed to load database JSON, initializing fresh.', e);
    }
    return {
      users: [],
      quizzes: [],
      game_sessions: [],
      participants: [],
      answers: [],
      session_results: [],
      audit_logs: [],
      self_paced_attempts: [],
    };
  }

  private persist() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to persist database file', e);
    }
  }

  private seedInitialData() {
    const adminUser: DbUser = {
      id: 'usr-admin-01',
      email: 'haihoang.hch@gmail.com',
      display_name: 'Hoàng Hải (TechLead)',
      role: 'admin',
      is_active: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const initialQuiz: DbQuiz = {
      id: 'quiz-sec-01',
      title: 'An toàn Thông tin & Bảo mật Dữ liệu Workspace 2026',
      description: 'Bài kiểm tra định kỳ về an toàn thông tin, nhận diện lừa đảo Phishing và quản trị mật khẩu nội bộ.',
      category: 'Bảo mật & CNTT',
      owner_id: adminUser.id,
      status: 'published',
      created_at: '2026-03-15',
      updated_at: '2026-03-20',
      questions: [
        {
          id: 'q1',
          quiz_id: 'quiz-sec-01',
          position: 1,
          question_text: 'Khi nhận được email khẩn cấp từ "CEO" yêu cầu mua thẻ nạp tiền hoặc chuyển tiền gấp qua tài khoản cá nhân, bạn cần làm gì?',
          question_type: 'single',
          options_json: [
            'Thực hiện ngay lập tức để không làm chậm trễ công việc cấp bách',
            'Xác minh trực tiếp qua cuộc gọi hoặc kênh nội bộ trước khi thực hiện',
            'Chuyển tiếp cho đồng nghiệp khác trong team thực hiện thay',
            'Nhấn vào link trong email để xem chi tiết hóa đơn thanh toán',
          ],
          correct_answer_json: [1],
          time_limit_seconds: 20,
          points: 1000,
          explanation: 'Đây là hình thức lừa đảo BEC (Business Email Compromise). Tuyệt đối luôn xác minh qua kênh thứ hai.',
        },
        {
          id: 'q2',
          quiz_id: 'quiz-sec-01',
          position: 2,
          question_text: 'Đâu là tiêu chí quan trọng nhất của một mật khẩu mạnh theo chuẩn NIST & Google Workspace?',
          question_type: 'single',
          options_json: [
            'Mật khẩu ngắn nhưng đổi 1 tuần 1 lần',
            'Độ dài từ 14-16 ký tự trở lên (Passphrase) kết hợp 2FA khóa bảo mật',
            'Sử dụng ngày tháng năm sinh đảo ngược và thêm số 123',
            'Mật khẩu giống nhau cho cả tài khoản cá nhân và tài khoản công ty',
          ],
          correct_answer_json: [1],
          time_limit_seconds: 20,
          points: 1000,
          explanation: 'Độ dài ký tự (Passphrase) và bảo mật 2 lớp (2FA/FIDO2) tạo rào cản an toàn nhất trước các cuộc tấn công.',
        },
        {
          id: 'q3',
          quiz_id: 'quiz-sec-01',
          position: 3,
          question_text: 'Xác thực 2 yếu tố (2FA) là bắt buộc đối với tất cả thành viên trong tổ chức HACHIHI?',
          question_type: 'boolean',
          options_json: [
            'ĐÚNG - Bắt buộc trên toàn bộ hệ thống Google Workspace',
            'SAI - Chỉ dành riêng cho phòng IT và Kế toán',
          ],
          correct_answer_json: [0],
          time_limit_seconds: 15,
          points: 1000,
          explanation: 'Chính sách bảo mật Zero-Trust yêu cầu 100% tài khoản công ty phải bật xác thực 2 lớp.',
        },
        {
          id: 'q4',
          quiz_id: 'quiz-sec-01',
          position: 4,
          question_text: 'Phương thức triển khai nào giúp Cloudflare Workers bảo vệ hệ thống khỏi các cuộc tấn công DDoS và BOT?',
          question_type: 'single',
          options_json: [
            'Chạy trên 1 máy chủ duy nhất tại văn phòng',
            'Anycast Network toàn cầu với Edge Rate Limiting và WebSockets xác thực',
            'Tắt toàn bộ cổng Internet và chỉ mở trong giờ hành chính',
            'Chỉ cho phép người dùng dùng trình duyệt Internet Explorer',
          ],
          correct_answer_json: [1],
          time_limit_seconds: 20,
          points: 1000,
          explanation: 'Cloudflare sở hữu mạng lưới Anycast tại hơn 300 thành phố, tự động chặn DDoS ở tầng Edge.',
        },
      ],
    };

    this.data.users.push(adminUser);
    this.data.quizzes.push(initialQuiz);
    this.persist();
  }

  // Quizzes CRUD
  getQuizzes(): DbQuiz[] {
    return this.data.quizzes;
  }

  getQuizById(id: string): DbQuiz | undefined {
    return this.data.quizzes.find((q) => q.id === id);
  }

  createQuiz(quiz: DbQuiz): DbQuiz {
    this.data.quizzes.unshift(quiz);
    this.persist();
    return quiz;
  }

  updateQuiz(id: string, updates: Partial<DbQuiz>): DbQuiz | undefined {
    const idx = this.data.quizzes.findIndex((q) => q.id === id);
    if (idx === -1) return undefined;
    this.data.quizzes[idx] = {
      ...this.data.quizzes[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.persist();
    return this.data.quizzes[idx];
  }

  deleteQuiz(id: string): boolean {
    const initialLen = this.data.quizzes.length;
    this.data.quizzes = this.data.quizzes.filter((q) => q.id !== id);
    if (this.data.quizzes.length !== initialLen) {
      this.persist();
      return true;
    }
    return false;
  }

  // Game Sessions (Room Lifecycle)
  createGameSession(session: DbGameSession): DbGameSession {
    this.data.game_sessions.unshift(session);
    this.persist();
    return session;
  }

  getGameSessionByPin(pin: string): DbGameSession | undefined {
    return this.data.game_sessions.find((s) => s.pin === pin);
  }

  getGameSessionById(id: string): DbGameSession | undefined {
    return this.data.game_sessions.find((s) => s.id === id);
  }

  updateGameSession(id: string, updates: Partial<DbGameSession>): DbGameSession | undefined {
    const idx = this.data.game_sessions.findIndex((s) => s.id === id || s.pin === id);
    if (idx === -1) return undefined;
    this.data.game_sessions[idx] = {
      ...this.data.game_sessions[idx],
      ...updates,
    };
    this.persist();
    return this.data.game_sessions[idx];
  }

  // Participants
  addOrUpdateParticipant(participant: DbParticipant): DbParticipant {
    const idx = this.data.participants.findIndex(
      (p) => p.session_id === participant.session_id && (p.id === participant.id || p.participant_token === participant.participant_token)
    );
    if (idx !== -1) {
      this.data.participants[idx] = {
        ...this.data.participants[idx],
        ...participant,
        last_seen_at: new Date().toISOString(),
      };
      this.persist();
      return this.data.participants[idx];
    }
    this.data.participants.push(participant);
    this.persist();
    return participant;
  }

  getParticipantsBySession(sessionId: string): DbParticipant[] {
    return this.data.participants.filter((p) => p.session_id === sessionId);
  }

  getParticipantByToken(sessionId: string, token: string): DbParticipant | undefined {
    return this.data.participants.find((p) => p.session_id === sessionId && p.participant_token === token);
  }

  // Answers & Anti-Cheat Duplicate Enforcement
  recordAnswer(answer: DbAnswer): { success: boolean; isDuplicate: boolean; answer: DbAnswer } {
    // Unique constraint: (session_id, participant_id, question_id)
    const existing = this.data.answers.find(
      (a) => a.session_id === answer.session_id && a.participant_id === answer.participant_id && a.question_id === answer.question_id
    );
    if (existing) {
      return { success: false, isDuplicate: true, answer: existing };
    }

    this.data.answers.push(answer);

    // Update participant score and streak
    const p = this.data.participants.find((item) => item.id === answer.participant_id);
    if (p) {
      p.score += answer.points_awarded;
      p.streak = answer.is_correct ? p.streak + 1 : 0;
      p.last_seen_at = new Date().toISOString();
    }

    this.persist();
    return { success: true, isDuplicate: false, answer };
  }

  getAnswersForSession(sessionId: string): DbAnswer[] {
    return this.data.answers.filter((a) => a.session_id === sessionId);
  }

  // Final Session Results & Export
  finishSessionAndCalculateResults(sessionId: string): DbSessionResult[] {
    const session = this.getGameSessionById(sessionId);
    if (!session) return [];

    session.status = 'finished';
    session.ended_at = new Date().toISOString();

    const participants = this.getParticipantsBySession(sessionId);
    const answers = this.getAnswersForSession(sessionId);

    // Sort by final score descending
    const sorted = [...participants].sort((a, b) => b.score - a.score);

    const results: DbSessionResult[] = sorted.map((p, idx) => {
      const pAnswers = answers.filter((a) => a.participant_id === p.id);
      const correctCount = pAnswers.filter((a) => a.is_correct === 1).length;

      return {
        id: `res-${sessionId}-${p.id}`,
        session_id: sessionId,
        participant_id: p.id,
        nickname: p.nickname,
        final_score: p.score,
        rank: idx + 1,
        correct_count: correctCount,
        total_answered: pAnswers.length,
        completed_at: new Date().toISOString(),
      };
    });

    // Remove old results for this session if any, and add new
    this.data.session_results = this.data.session_results.filter((r) => r.session_id !== sessionId);
    this.data.session_results.push(...results);
    this.persist();

    return results;
  }

  getSessionResults(sessionId: string): DbSessionResult[] {
    return this.data.session_results.filter((r) => r.session_id === sessionId);
  }

  getAllSessionsHistory(): {
    session: DbGameSession;
    participantsCount: number;
    results: DbSessionResult[];
  }[] {
    return this.data.game_sessions.map((s) => {
      const results = this.data.session_results.filter((r) => r.session_id === s.id);
      const participants = this.data.participants.filter((p) => p.session_id === s.id);
      return {
        session: s,
        participantsCount: participants.length,
        results,
      };
    });
  }

  // Audit Logs
  logAudit(actorType: 'host' | 'player' | 'system', actorId: string, eventType: string, details: Record<string, any>, sessionId?: string) {
    const entry: DbAuditLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      actor_type: actorType,
      actor_id: actorId,
      session_id: sessionId,
      event_type: eventType,
      details_json: details,
      created_at: new Date().toISOString(),
    };
    this.data.audit_logs.unshift(entry);
    if (this.data.audit_logs.length > 500) {
      this.data.audit_logs.pop();
    }
    this.persist();
  }

  // Self Paced
  saveSelfPacedAttempt(attempt: DbSelfPacedAttempt): DbSelfPacedAttempt {
    this.data.self_paced_attempts.unshift(attempt);
    this.persist();
    return attempt;
  }

  getSelfPacedAttempts(): DbSelfPacedAttempt[] {
    return this.data.self_paced_attempts;
  }
}

export const db = new DatabaseStore();
