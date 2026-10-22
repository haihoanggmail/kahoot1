-- ==============================================================================
-- HACHIHI QUIZ - CLOUDFLARE D1 VERSIONED MIGRATION v0001
-- Description: Khởi tạo 8 bảng chuẩn hóa theo Đặc tả Kỹ thuật HACHIHI Quiz
-- Author: HACHIHI Engineering
-- Apply via CLI: wrangler d1 migrations apply hachihi-quiz-db --remote
-- ==============================================================================

-- 1. Bảng USERS (Quản trị viên & Host Google Workspace)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    google_id TEXT UNIQUE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    avatar TEXT,
    role TEXT CHECK(role IN ('admin', 'host', 'viewer')) DEFAULT 'host',
    domain TEXT NOT NULL,
    is_whitelisted INTEGER DEFAULT 1,
    department TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
);

-- 2. Bảng QUIZZES (Bộ đề thi & Khảo sát)
CREATE TABLE IF NOT EXISTS quizzes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    created_by TEXT NOT NULL,
    category TEXT,
    is_public INTEGER DEFAULT 0,
    cover_image TEXT,
    settings_json TEXT, -- JSON cấu hình điểm, xáo trộn
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Bảng QUESTIONS (Ngân hàng câu hỏi trắc nghiệm)
CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    quiz_id TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    question_type TEXT CHECK(question_type IN ('single', 'multiple', 'true_false')) DEFAULT 'single',
    options_json TEXT NOT NULL,          -- JSON mảng 4 đáp án: ["A", "B", "C", "D"]
    correct_answer_json TEXT NOT NULL,   -- JSON mảng index đúng: [0]
    time_limit_seconds INTEGER DEFAULT 20,
    points INTEGER DEFAULT 1000,
    media_url TEXT,
    explanation TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);

-- 4. Bảng GAME_SESSIONS (Phòng thi trực tiếp & Mã PIN 6 số)
CREATE TABLE IF NOT EXISTS game_sessions (
    id TEXT PRIMARY KEY,
    quiz_id TEXT NOT NULL,
    host_id TEXT NOT NULL,
    pin TEXT UNIQUE NOT NULL,             -- Mã PIN 6 số do Server sinh
    host_token TEXT NOT NULL,             -- Token bí mật của Host quản trị
    status TEXT CHECK(status IN ('lobby', 'running', 'paused', 'finished')) DEFAULT 'lobby',
    current_question_index INTEGER DEFAULT 0,
    settings_json TEXT,
    started_at DATETIME,
    ended_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id),
    FOREIGN KEY (host_id) REFERENCES users(id)
);

-- 5. Bảng PARTICIPANTS (Thí sinh trong phòng thi - Tối đa 50 người)
CREATE TABLE IF NOT EXISTS participants (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    nickname TEXT NOT NULL,
    participant_token TEXT NOT NULL,     -- Token duy trì phiên trên thiết bị
    status TEXT CHECK(status IN ('active', 'disconnected', 'kicked')) DEFAULT 'active',
    score INTEGER DEFAULT 0,
    streak INTEGER DEFAULT 0,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE
);

-- 6. Bảng ANSWERS (Lịch sử câu trả lời & Chống gian lận)
CREATE TABLE IF NOT EXISTS answers (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    participant_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    answer_json TEXT NOT NULL,
    is_correct INTEGER NOT NULL,         -- 1: Đúng, 0: Sai
    response_time_ms INTEGER NOT NULL,
    points_awarded INTEGER DEFAULT 0,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    -- RÀNG BUỘC ĐỘC BẢN: Chống nộp đáp án nhiều lần cho cùng một câu hỏi
    UNIQUE(session_id, participant_id, question_id),
    FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

-- 7. Bảng SESSION_RESULTS (Kết quả tổng kết & Bảng vinh danh)
CREATE TABLE IF NOT EXISTS session_results (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    participant_id TEXT NOT NULL,
    rank INTEGER NOT NULL,
    total_score INTEGER NOT NULL,
    correct_count INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    accuracy_percentage REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE
);

-- 8. Bảng AUDIT_LOGS (Nhật ký kiểm toán an toàn & phân quyền)
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    action TEXT NOT NULL,
    details_json TEXT,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CÁC CHỈ MỤC TỐC ĐỘ CAO (INDEXES FOR ULTRA-LOW LATENCY)
CREATE INDEX IF NOT EXISTS idx_sessions_pin ON game_sessions(pin);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON game_sessions(status);
CREATE INDEX IF NOT EXISTS idx_participants_session ON participants(session_id);
CREATE INDEX IF NOT EXISTS idx_answers_session_question ON answers(session_id, question_id);
CREATE INDEX IF NOT EXISTS idx_questions_quiz ON questions(quiz_id);
