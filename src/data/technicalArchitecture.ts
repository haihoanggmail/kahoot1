export interface TechDocSection {
  id: string;
  title: string;
  badge: string;
  summary: string;
  content: string;
  codeBlocks?: {
    filename: string;
    language: string;
    code: string;
  }[];
}

export const TECHNICAL_DOCS: TechDocSection[] = [
  {
    id: 'architecture',
    title: '1. Kiến trúc Tổng quan Hệ thống (System Architecture)',
    badge: 'Edge Serverless',
    summary: 'Mô hình kiến trúc Cloudflare Pages + Edge Workers + D1 Database + Durable Objects / WebSockets đảm bảo chi phí 0đ và phục vụ 50 người/phòng.',
    content: `
### 1.1. Bối cảnh & Mục tiêu Kỹ thuật
HACHIHI Quiz được thiết kế để giải quyết bài toán:
- **Thay thế hoàn toàn Kahoot** cho đào tạo nội bộ và thi đua công ty/trường học.
- **Trải nghiệm Thí sinh tự do**: Người chơi quét QR hoặc nhập PIN + nickname trên điện thoại/máy tính, **không bắt buộc đăng nhập Gmail/Google**.
- **Trải nghiệm Host bảo mật**: Giảng viên / Quản lý đăng nhập Google Workspace theo chính sách tổ chức HACHIHI.
- **Quy mô phòng**: Giới hạn tối đa **50 người tham gia đồng thời** trên mỗi phòng thi với độ trễ phản hồi cực thấp (< 50ms).
- **2 chế độ cốt lõi**:
  1. *Live Game Room* (Đồng bộ thời gian thực theo Host, có tạm dừng/tiếp tục, đếm ngược đồng bộ).
  2. *Self-Paced Quiz* (Tự làm bài cá nhân, lưu bài thi và chấm điểm bền vững).
- **Chi phí vận hành**: Tận dụng tối đa **gói Free Tier của Cloudflare**, không phát sinh phí máy chủ cố định hàng tháng.

### 1.2. Sơ đồ Kiến trúc Thành phần (Topology)
\`\`\`
       [ User Browser / Mobile (Up to 50 players/room) ]
                             │
              HTTPS / WSS    │   Global Anycast Network (300+ PoPs)
                             ▼
              ┌─────────────────────────────┐
              │  Cloudflare CDN & Pages     │ ── SPA React 19 + Tailwind v4
              └──────────────┬──────────────┘
                             │
       ┌─────────────────────┴──────────────────────┐
       ▼                                            ▼
┌───────────────────────────────┐     ┌────────────────────────────────┐
│  Cloudflare Worker REST API   │     │ Cloudflare Durable Object (DO) │
│  - /api/auth/google           │     │ - Live Room State Machine      │
│  - /api/quizzes (CRUD)        │     │ - WebSocket Hub (50 conns/rm)  │
│  - /api/sessions (Lifecycle)  │     │ - Server 1-second Timers       │
│  - /api/self-paced/submit     │     │ - Server-side Speed Scoring    │
└──────────────┬────────────────┘     └──────────────┬─────────────────┘
               │                                     │
               └─────────────────┬───────────────────┘
                                 ▼
              ┌─────────────────────────────────────┐
              │      Cloudflare D1 SQL Database     │
              │  (Distributed SQLite at the Edge)   │
              │  - 8 Bảng: users, quizzes,          │
              │    questions, game_sessions,        │
              │    participants, answers,           │
              │    session_results, audit_logs      │
              └─────────────────────────────────────┘
\`\`\`

### 1.3. Tính toán Định mức Gói Miễn phí (Cloudflare Free Tier Analysis)
- **Cloudflare Pages**: Miễn phí băng thông không giới hạn, 500 builds/tháng.
- **Cloudflare Workers**: Miễn phí **100.000 requests/ngày** (Đủ phục vụ 50 - 100 phòng thi/ngày).
- **Cloudflare D1 Database**: Miễn phí **5.000.000 reads/ngày** và **100.000 writes/ngày**, dung lượng lưu trữ 5 GB.
- **WebSockets / Durable Objects**: 
  - *Phương án A (Workers WebSockets Hibernation API)*: Hoàn toàn miễn phí, giữ kết nối 50 người/phòng mà không tốn CPU time khi nhàn rỗi.
  - *Phương án B (Full-stack Node.js + Express WebSocket)*: Đang chạy trực tiếp trong source code hiện tại trên port 3000 để phục vụ test multi-device ngay lập tức.
    `,
    codeBlocks: [
      {
        filename: 'wrangler.toml',
        language: 'toml',
        code: `name = "hachihi-quiz-api"
main = "worker.ts"
compatibility_date = "2026-03-01"
compatibility_flags = ["nodejs_compat"]

# 1. Cloudflare D1 Database Binding (Section 4)
[[d1_databases]]
binding = "DB"
database_name = "hachihi-quiz-db"
database_id = "00000000-0000-0000-0000-000000000000"

# 2. Cloudflare Durable Objects Binding for 50-Player Live Rooms
[durable_objects]
bindings = [
  { name = "LIVE_ROOMS", class_name = "LiveRoomDurableObject" }
]

[[migrations]]
tag = "v1"
new_classes = ["LiveRoomDurableObject"]

# 3. Environment Variables
[vars]
ENVIRONMENT = "production"
MAX_ROOM_CAPACITY = "50"
ALLOWED_WORKSPACE_DOMAINS = "hachihi.vn"
GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com"`
      }
    ]
  },
  {
    id: 'database',
    title: '2. Database Schema D1 - 8 Bảng Chuẩn hóa (Section 4)',
    badge: 'SQL Schema',
    summary: 'Mô hình dữ liệu quan hệ chuẩn hóa cao trên SQLite/D1 theo đúng 8 bảng đặc tả kỹ thuật MVP.',
    content: `
### 2.1. Danh sách 8 Bảng Cốt lõi (Section 4 Spec)
1. \`users\`: Tài khoản quản trị và Host (Google Workspace). Không lưu mật khẩu Google.
2. \`quizzes\`: Danh mục các bộ đề thi trắc nghiệm.
3. \`questions\`: Chi tiết câu hỏi, thời gian, loại câu hỏi, điểm thưởng. Đáp án đúng giấu kín trên server.
4. \`game_sessions\`: Phiên đấu trực tiếp (PIN 6 chữ số, trạng thái: lobby, running, paused, finished).
5. \`participants\`: Thí sinh tham gia phòng thi (Biệt danh + token phiên, không bắt buộc Gmail).
6. \`answers\`: Lịch sử câu trả lời, ràng buộc UNIQUE(session_id, participant_id, question_id) chống nộp lặp.
7. \`session_results\`: Bảng kết quả tổng kết thứ hạng và điểm số bền vững.
8. \`audit_logs\`: Nhật ký nghiệp vụ quan trọng phục vụ đối soát và thanh tra hệ thống.
    `,
    codeBlocks: [
      {
        filename: 'schema.sql',
        language: 'sql',
        code: `-- =========================================================================
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
    settings_json TEXT,
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
    options_json TEXT NOT NULL,
    correct_answer_json TEXT NOT NULL, -- Tuyệt đối không gửi trước cho client
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
    pin TEXT NOT NULL UNIQUE,
    status TEXT CHECK(status IN ('lobby', 'running', 'paused', 'finished', 'cancelled')) DEFAULT 'lobby',
    current_question_index INTEGER DEFAULT 0,
    started_at DATETIME,
    ended_at DATETIME,
    settings_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sessions_pin ON game_sessions(pin);

-- 4.5. participants: Thí sinh tham gia phòng thi (Không bắt buộc Gmail)
CREATE TABLE IF NOT EXISTS participants (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
    nickname TEXT NOT NULL,
    participant_token TEXT NOT NULL,
    status TEXT CHECK(status IN ('active', 'disconnected', 'finished')) DEFAULT 'active',
    score INTEGER DEFAULT 0,
    streak INTEGER DEFAULT 0,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, nickname)
);
CREATE INDEX IF NOT EXISTS idx_participants_session ON participants(session_id);

-- 4.6. answers: Câu trả lời & Chống nộp lặp (Anti-Cheat)
CREATE TABLE IF NOT EXISTS answers (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
    participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    question_id TEXT NOT NULL REFERENCES questions(id),
    answer_json INTEGER NOT NULL,
    is_correct INTEGER NOT NULL,
    response_time_ms INTEGER NOT NULL,
    points_awarded INTEGER NOT NULL,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, participant_id, question_id)
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
    details_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_session ON audit_logs(session_id);`
      }
    ]
  },
  {
    id: 'api-specs',
    title: '3. Đặc tả API & Giao thức WebSocket (Section 5)',
    badge: 'REST + WSS',
    summary: 'Đặc tả chi tiết các endpoint RESTful và bảng tin nhắn WebSocket đồng bộ 50 người chơi.',
    content: `
### 3.1. Hợp đồng RESTful API Đã Hiện thực hóa
- **GET /api/me**: Thông tin danh tính Host đăng nhập Google Workspace.
- **POST /api/auth/verify-domain**: Kiểm tra email có thuộc domain được phép hay không.
- **GET /api/quizzes**: Lấy danh sách đề thi lưu trong database.
- **POST /api/quizzes**: Tạo mới đề thi vào database.
- **PATCH /api/quizzes/:id**: Cập nhật câu hỏi và cấu hình đề.
- **DELETE /api/quizzes/:id**: Xóa đề thi.
- **POST /api/sessions**: Host tạo phòng thi -> Server sinh PIN 6 số, tạo phiên \`game_sessions\`.
- **GET /api/sessions/:id**: Kiểm tra trạng thái phòng thi, sĩ số hiện tại.
- **POST /api/sessions/:id/pause**: Host tạm dừng phòng thi.
- **POST /api/sessions/:id/resume**: Host tiếp tục phòng thi.
- **GET /api/sessions/:id/export**: Xuất báo cáo kết quả thi ra file CSV theo chuẩn UTF-8.
- **POST /api/self-paced/submit**: Nộp bài thi tự luyện, lưu kết quả bền vững vào database.

### 3.2. Bảng Thông điệp WebSocket (Section 5.3)

| Event Type | Hướng | Dữ liệu kèm theo | Nghiệp vụ |
| :--- | :--- | :--- | :--- |
| \`PLAYER_JOIN\` | Client $\\to$ Server | \`{ pin, nickname, participantToken }\` | Người chơi gia nhập (kiểm tra trùng tên & max 50) |
| \`joined_success\` | Server $\\to$ Client | \`{ participantId, token, room }\` | Gửi token phục hồi phiên khi refresh |
| \`participant_joined\` | Server $\\to$ All | \`{ room }\` | Cập nhật lobby hiển thị tên thí sinh |
| \`START_GAME\` | Host $\\to$ Server | \`{}\` | Host ra lệnh bắt đầu thi |
| \`question_started\` | Server $\\to$ All | \`{ question: { id, text, options } }\` | Server phát câu hỏi (Giấu đáp án đúng) |
| \`SUBMIT_ANSWER\` | Player $\\to$ Server | \`{ optionIndex }\` | Nộp đáp án, server tính điểm theo tốc độ |
| \`answer_received\` | Server $\\to$ Player | \`{ isCorrect, pointsAwarded, score }\` | Xác nhận nộp bài thành công |
| \`answer_result\` | Server $\\to$ All | \`{ correctAnswers, distribution }\` | Hết giờ, công bố đáp án đúng & biểu đồ |
| \`session_paused\` | Server $\\to$ All | \`{ room }\` | Host bấm tạm dừng |
| \`session_resumed\` | Server $\\to$ All | \`{ room }\` | Host bấm tiếp tục |
| \`session_finished\` | Server $\\to$ All | \`{ results: DbSessionResult[] }\` | Bục vinh danh & kết thúc bài thi |
    `
  },
  {
    id: 'source-structure',
    title: '4. Báo cáo Kiểm kê Source & Nghiệm thu (Section 12 & 13)',
    badge: 'Code Audit',
    summary: 'Báo cáo chi tiết kiểm kê source code, bóc tách demo vs thực tế và các giải pháp đã hoàn thành.',
    content: `
### 4.1. Kết quả Kiểm kê & Xử lý Source Code Cũ
1. **Mã PIN**: Trước đây tạo ngẫu nhiên tại client; Hiện tại **100% sinh trên server** qua API \\\`POST /api/sessions\\\`.
2. **BOT ngẫu nhiên 75%**: Đã loại bỏ hoàn toàn khỏi luồng thi chính thức. Chuyển thành công cụ *"Thử tải 50 người"* có nhãn \\\`(Test)\\\` rõ ràng khi Host cần kiểm tra tải.
3. **Đồng bộ thời gian**: Trước đây từng client chạy \\\`setInterval\\\` riêng; Hiện tại **Server làm chủ đồng hồ (\\\`timer_update\\\`)**, broadcast từng giây xuống client.
4. **Bảo mật đáp án**: Câu hỏi gửi xuống thí sinh bị loại bỏ trường \\\`correct_answer_json\\\` cho đến khi server kích hoạt sự kiện \\\`answer_result\\\`.
5. **Chống nộp lặp**: Database áp dụng ràng buộc \\\`UNIQUE(session_id, participant_id, question_id)\\\`, từ chối nộp lần 2.
6. **Khôi phục phiên**: Thí sinh tải lại trang được tự động kết nối lại nhờ \\\`sessionStorage.getItem('hachihi_token')\\\`.
7. **Lưu trữ dữ liệu**: Toàn bộ đề thi, câu hỏi, phiên thi, câu trả lời, kết quả và nhật ký được lưu trữ bền vững vào database (\\\`server/database.ts\\\` & D1 \\\`schema.sql\\\`).
    `
  },
  {
    id: 'github-cloudflare',
    title: '5. Kế hoạch Triển khai GitHub & Cloudflare (CI/CD, D1, Bảo mật)',
    badge: 'DevOps & Cloud',
    summary: 'Quy trình chi tiết: Phân chia vai trò hạ tầng, tự động hóa GitHub Actions, quản lý D1 Migrations, bảo mật chống rò rỉ và phân tích chi phí gói Free Tier.',
    content: `
### 5.1. Phân chia Vai trò Hạ tầng Triển khai (Infrastructure Roles)

| Thành phần | Vai trò kỹ thuật & Trách nhiệm | Vị trí cấu hình |
| :--- | :--- | :--- |
| **GitHub Repository** | Quản lý source code chính thức, lịch sử commit, pull request, code review và quản lý nhánh phân quyền. | \`github.com/hachihi/hachihi-quiz\` |
| **GitHub Actions** | Tự động hóa CI/CD: Chạy linter, kiểm tra TypeScript, build frontend SPA, chạy migration D1 và deploy Cloudflare. | \`.github/workflows/deploy.yml\` |
| **Cloudflare Pages** | Phục vụ Frontend SPA (React 19 + Tailwind CSS) với CDN toàn cầu Anycast, chứng chỉ SSL tự động và băng thông không giới hạn. | \`hachihi-quiz-frontend\` |
| **Cloudflare Workers** | Backend API RESTful xử lý nghiệp vụ tạo đề, quản lý phiên thi, xuất CSV và tích hợp xác thực Google Workspace SSO. | \`cloudflare/worker.ts\` |
| **Durable Objects (DO)** | Điều phối đồng bộ trạng thái phòng thi 50 người thời gian thực, quản lý WebSocket Hub và đồng hồ đếm ngược server. | \`cloudflare/LiveRoomDurableObject.ts\` |
| **Cloudflare D1** | Cơ sở dữ liệu quan hệ SQL phân tán tại Edge lưu trữ 8 bảng: người dùng, đề thi, câu hỏi, phiên thi, kết quả, nhật ký. | \`cloudflare/migrations/\` |
| **Google OAuth 2.0** | Cổng xác thực định danh tập trung cho Host/Admin thuộc tổ chức HACHIHI (\`@hachihi.vn\`). | Google Cloud Console Credentials |
| **Cloudflare DNS** | Trỏ tên miền riêng công ty (ví dụ: \`quiz.hachihi.vn\`) vào Cloudflare Pages/Workers với bảo vệ DDoS Layer 3/4/7. | Cloudflare Dashboard DNS |

---

### 5.2. Quy trình Cập nhật & Triển khai Sau này (Release Pipeline)

\`\`\`
[1. Developer Lập trình] ──> [2. Git Push Branch] ──> [3. Pull Request Review]
                                                              │
                                                              ▼
[6. Production Live] <── [5. Staging Verify] <── [4. GitHub Actions CI/CD]
   (quiz.hachihi.vn)      (staging.quiz.hachihi.vn)    - Linter & Typecheck
                                                        - D1 Auto Migration
                                                        - Deploy Workers & Pages
\`\`\`

1. **Bước 1 (Phát triển)**: Lập trình viên tạo nhánh mới từ \`develop\` (ví dụ: \`feature/ranking-audio\` hoặc \`fix/d1-schema\`), chạy test trên máy local (\`npm run dev\`).
2. **Bước 2 (Kiểm tra PR)**: Tạo Pull Request vào nhánh \`staging\` hoặc \`main\`. GitHub Actions \`ci.yml\` tự động chạy kiểm tra lint, biên dịch TypeScript và quét bảo mật chống rò rỉ mã bí mật.
3. **Bước 3 (Triển khai Staging)**: Khi merge vào nhánh \`staging\`, workflow tự động chạy migration D1 trên database \`hachihi-quiz-db-staging\` và deploy lên môi trường thử nghiệm nội bộ.
4. **Bước 4 (Triển khai Production)**: Sau khi QA nghiệm thu phòng thi 50 người trên Staging, merge PR vào nhánh \`main\`. Hệ thống tự động kích hoạt migration D1 production và phát hành phiên bản chính thức trên \`quiz.hachihi.vn\`.

---

### 5.3. Bảng Yêu cầu Nghiêm ngặt Dành cho Đội Dev (Developer Checklist)

1. **Tuyệt đối không đưa mật khẩu, API key hoặc OAuth secret lên GitHub**:
   - Mọi khóa bí mật (\`GOOGLE_CLIENT_SECRET\`, \`JWT_SECRET\`, \`CLOUDFLARE_API_TOKEN\`) phải được lưu trữ trong **GitHub Secrets** và **Cloudflare Secrets** (\`wrangler secret put <KEY>\`).
   - Sử dụng pre-commit hook hoặc GitHub Action scan chuỗi nhạy cảm để chặn commit vô tình.
2. **Quản lý \`.gitignore\` và \`.env.example\` chuẩn mực**:
   - Đảm bảo \`.env\`, \`.env.*.local\`, \`.wrangler/\`, \`data/*.json\` không bao giờ xuất hiện trong git tree.
   - Luôn duy trì \`.env.example\` đầy đủ chú thích để lập trình viên mới có thể onboard trong 5 phút.
3. **Phân tách rạch ròi 3 môi trường**:
   - \`development\`: Chạy local với file json / SQLite tạm trên cổng 3000.
   - \`staging\`: Chạy trên Cloudflare Worker Staging với D1 database tách biệt (\`hachihi-quiz-db-staging\`).
   - \`production\`: Chạy trên domain chính thức (\`quiz.hachihi.vn\`) với database độc lập và bảo vệ dữ liệu thật.
4. **Quản lý D1 Schema bằng Migration có phiên bản**:
   - Mọi thay đổi cấu trúc bảng phải tạo file SQL mới theo định dạng \`migrations/XXXX_ten_thay_doi.sql\` (ví dụ: \`0001_initial_schema.sql\`, \`0002_add_audit_and_indexes.sql\`).
   - **Nghiêm cấm** sửa trực tiếp database trên Cloudflare Dashboard hoặc xóa file migration cũ đã apply.
5. **Kịch bản Khôi phục Khẩn cấp (Rollback Runbook)**:
   - Khi phiên bản Worker mới gặp sự cố: Chạy ngay lệnh \`wrangler rollback\` để quay về bản phát hành trước đó trong vòng 3 giây mà không cần deploy lại.
   - Khi cần khôi phục Frontend: Rollback 1-click trong mục Deployments của Cloudflare Pages.

---

### 5.4. Đánh giá Chi phí & Giới hạn Gói Miễn phí Cloudflare (Free Tier Analysis)

Mục tiêu của HACHIHI là tối ưu chi phí thấp nhất, ưu tiên 0đ:

| Dịch vụ Cloudflare | Hạn mức Gói Miễn Phí (Free Tier) | Mức sử dụng HACHIHI Quiz (Phòng 50 người) | Đánh giá Khả thi |
| :--- | :--- | :--- | :--- |
| **Cloudflare Pages** | **Miễn phí 100%**: Unlimited requests, Unlimited bandwidth, 500 builds/tháng | Hosting frontend SPA React tải cực nhanh toàn cầu | **Đạt 100% - Chi phí 0đ** |
| **Cloudflare D1 SQL** | **Miễn phí 100%**: 5.000.000 lượt đọc/ngày, 100.000 lượt ghi/ngày, 5 GB dung lượng | 1 bài thi 20 câu x 50 thí sinh chỉ tốn khoảng ~1.500 lượt ghi | **Đạt 100% - Chi phí 0đ** |
| **Cloudflare Workers** | **Miễn phí 100%**: 100.000 requests/ngày | Phục vụ REST API tạo đề, báo cáo, xác thực Google | **Đạt 100% - Chi phí 0đ** |
| **Durable Objects (DO)** | *Lưu ý kiến trúc*: Durable Objects hiện yêu cầu gói **Workers Paid ($5/tháng)** từ Cloudflare | Phục vụ WebSocket phòng thi đồng bộ 50 người, sub-millisecond | **Phương án linh hoạt** (Xem bên dưới) |

#### Khuyến nghị Giải pháp Chi phí cho Ban Lãnh đạo HACHIHI:
- **Phương án 1 (Khuyến nghị chuẩn mực - 5 USD/tháng ~ 125.000đ)**: Bật gói Cloudflare Workers Paid ($5/tháng). Toàn bộ hệ thống tận dụng **Cloudflare Durable Objects** với hiệu năng ngang ngửa Kahoot bản quyền (vốn tốn hàng chục triệu/năm), phòng thi 50 người mượt mà, chịu tải cao và mã nguồn sạch sẽ nhất.
- **Phương án 2 (Giải pháp 100% Hoàn toàn 0đ)**: Sử dụng Cloudflare Workers Free kết hợp Server-Sent Events (SSE) hoặc Long-polling + lưu state tạm thời trên Cloudflare KV / D1 Cache. Phương án này hoàn toàn 0đ nhưng độ trễ cập nhật đáp án khoảng 0.5s - 1s (chậm hơn một chút so với WebSocket DO trực tiếp).

---

### 5.5. Hướng dẫn Lệnh CLI Vận hành Nhanh (Cheat Sheet)

\`\`\`bash
# 1. Khởi tạo Database D1 mới trên Cloudflare
wrangler d1 create hachihi-quiz-db

# 2. Áp dụng Migration lên môi trường Staging
npm run cf:d1:migrate:staging

# 3. Áp dụng Migration lên môi trường Production
npm run cf:d1:migrate:prod

# 4. Triển khai API & Worker lên Production
npm run cf:deploy:prod

# 5. Cấu hình Bí mật an toàn (Secrets - Không lưu vào git)
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put JWT_SECRET

# 6. Lệnh Rollback khẩn cấp khi có sự cố
npm run cf:rollback
\`\`\`
`,
    codeBlocks: [
      {
        filename: '.github/workflows/deploy.yml',
        language: 'yaml',
        code: `name: CI/CD Pipeline - Deploy to Cloudflare

on:
  push:
    branches: [main, staging]

jobs:
  lint_and_test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: 'npm' }
      - run: npm ci
      - run: npm run lint

  deploy:
    needs: lint_and_test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci && npm run build
      - name: Apply D1 Migrations
        run: cd cloudflare && npx wrangler d1 migrations apply hachihi-quiz-db --remote
        env:
          CLOUDFLARE_API_TOKEN: \${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: \${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
      - name: Deploy Worker
        run: cd cloudflare && npx wrangler deploy --env production
        env:
          CLOUDFLARE_API_TOKEN: \${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: \${{ secrets.CLOUDFLARE_ACCOUNT_ID }}`
      },
      {
        filename: 'cloudflare/wrangler.toml',
        language: 'toml',
        code: `name = "hachihi-quiz-api"
main = "worker.ts"
compatibility_date = "2026-03-01"
compatibility_flags = ["nodejs_compat"]

[[d1_databases]]
binding = "DB"
database_name = "hachihi-quiz-db"
database_id = "00000000-0000-0000-0000-000000000000"
migrations_dir = "migrations"

[durable_objects]
bindings = [{ name = "LIVE_ROOMS", class_name = "LiveRoomDurableObject" }]

[[migrations]]
tag = "v1"
new_classes = ["LiveRoomDurableObject"]

[vars]
ENVIRONMENT = "production"
MAX_ROOM_CAPACITY = "50"
ALLOWED_WORKSPACE_DOMAINS = "hachihi.vn,gmail.com"`
      },
      {
        filename: 'cloudflare/migrations/0001_initial_schema.sql',
        language: 'sql',
        code: `-- Migration 0001: Khởi tạo 8 bảng chuẩn hóa HACHIHI Quiz
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE, name TEXT, role TEXT, domain TEXT);
CREATE TABLE IF NOT EXISTS quizzes (id TEXT PRIMARY KEY, title TEXT, created_by TEXT);
CREATE TABLE IF NOT EXISTS questions (id TEXT PRIMARY KEY, quiz_id TEXT, order_index INT, question_text TEXT, options_json TEXT, correct_answer_json TEXT, points INT);
CREATE TABLE IF NOT EXISTS game_sessions (id TEXT PRIMARY KEY, quiz_id TEXT, pin TEXT UNIQUE, host_token TEXT, status TEXT);
CREATE TABLE IF NOT EXISTS participants (id TEXT PRIMARY KEY, session_id TEXT, nickname TEXT, participant_token TEXT, score INT DEFAULT 0);
CREATE TABLE IF NOT EXISTS answers (id TEXT PRIMARY KEY, session_id TEXT, participant_id TEXT, question_id TEXT, is_correct INT, points_awarded INT, UNIQUE(session_id, participant_id, question_id));
CREATE TABLE IF NOT EXISTS session_results (id TEXT PRIMARY KEY, session_id TEXT, participant_id TEXT, rank INT, total_score INT);
CREATE TABLE IF NOT EXISTS audit_logs (id TEXT PRIMARY KEY, actor_type TEXT, action TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);`
      }
    ]
  }
];

