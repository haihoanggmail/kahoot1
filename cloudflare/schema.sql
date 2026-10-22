-- =========================================================================
-- HACHIHI QUIZ - D1 SQL SCHEMA DEFINITIONS (CLOUDFLARE D1 / SQLITE)
-- Specifications Section 4: users, quizzes, questions, game_sessions,
-- participants, answers, session_results, audit_logs
-- =========================================================================

-- 4.1. users: Quản trị viên và Host (Google Workspace)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    role TEXT CHECK(role IN ('admin', 'host', 'viewer')) DEFAULT 'host',
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 4.2. quizzes: Đề thi trắc nghiệm
CREATE TABLE IF NOT EXISTS quizzes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'Chung',
    owner_id TEXT NOT NULL REFERENCES users(id),
    status TEXT CHECK(status IN ('draft', 'published', 'archived')) DEFAULT 'published',
    settings_json TEXT, -- JSON configuration (e.g. shuffle, pass percentage)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_quizzes_owner ON quizzes(owner_id);

-- 4.3. questions: Câu hỏi trắc nghiệm
CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    question_type TEXT CHECK(question_type IN ('single', 'boolean', 'multiple')) DEFAULT 'single',
    options_json TEXT NOT NULL, -- JSON Array of 2 to 4 choices
    correct_answer_json TEXT NOT NULL, -- JSON Array of correct indexes [0] or [1] (NEVER sent to client during quiz)
    time_limit_seconds INTEGER DEFAULT 20,
    points INTEGER DEFAULT 1000,
    explanation TEXT,
    media_url TEXT
);
CREATE INDEX IF NOT EXISTS idx_questions_quiz_pos ON questions(quiz_id, position);

-- 4.4. game_sessions: Thông tin phòng thi trực tiếp
CREATE TABLE IF NOT EXISTS game_sessions (
    id TEXT PRIMARY KEY,
    quiz_id TEXT NOT NULL REFERENCES quizzes(id),
    host_id TEXT NOT NULL REFERENCES users(id),
    pin TEXT NOT NULL UNIQUE, -- 6-digit numeric PIN
    status TEXT CHECK(status IN ('lobby', 'running', 'paused', 'finished', 'cancelled')) DEFAULT 'lobby',
    current_question_index INTEGER DEFAULT 0,
    started_at DATETIME,
    ended_at DATETIME,
    settings_json TEXT, -- Max 50 capacity, auto-reveal, sound config
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sessions_pin ON game_sessions(pin);
CREATE INDEX IF NOT EXISTS idx_sessions_host ON game_sessions(host_id);

-- 4.5. participants: Thí sinh tham gia phòng thi (Không bắt buộc có Gmail)
CREATE TABLE IF NOT EXISTS participants (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
    nickname TEXT NOT NULL,
    participant_token TEXT NOT NULL, -- Token phục hồi phiên khi refresh
    status TEXT CHECK(status IN ('active', 'disconnected', 'finished')) DEFAULT 'active',
    score INTEGER DEFAULT 0,
    streak INTEGER DEFAULT 0,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, nickname) -- Chính sách biệt danh duy nhất trong mỗi phòng
);
CREATE INDEX IF NOT EXISTS idx_participants_session ON participants(session_id);
CREATE INDEX IF NOT EXISTS idx_participants_token ON participants(session_id, participant_token);

-- 4.6. answers: Lịch sử câu trả lời & Chống nộp lặp (Anti-Cheat)
CREATE TABLE IF NOT EXISTS answers (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
    participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    question_id TEXT NOT NULL REFERENCES questions(id),
    answer_json INTEGER NOT NULL, -- Selected option index (0-3)
    is_correct INTEGER NOT NULL, -- 1: Correct, 0: Incorrect (Chấm phía server)
    response_time_ms INTEGER NOT NULL, -- Server measured latency
    points_awarded INTEGER NOT NULL, -- Server computed score with speed bonus
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, participant_id, question_id) -- Bắt buộc chỉ 1 đáp án/người/câu
);
CREATE INDEX IF NOT EXISTS idx_answers_session_q ON answers(session_id, question_id);

-- 4.7. session_results: Kết quả tổng kết và xếp hạng phiên thi
CREATE TABLE IF NOT EXISTS session_results (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
    participant_id TEXT NOT NULL REFERENCES participants(id),
    nickname TEXT NOT NULL,
    final_score INTEGER NOT NULL,
    rank INTEGER NOT NULL,
    correct_count INTEGER NOT NULL,
    total_answered INTEGER NOT NULL,
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_results_session ON session_results(session_id, rank);

-- 4.8. audit_logs: Nhật ký nghiệp vụ quan trọng
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    actor_type TEXT CHECK(actor_type IN ('host', 'player', 'system')) NOT NULL,
    actor_id TEXT NOT NULL,
    session_id TEXT,
    event_type TEXT NOT NULL,
    details_json TEXT, -- JSON metadata không nhạy cảm
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_session ON audit_logs(session_id);
