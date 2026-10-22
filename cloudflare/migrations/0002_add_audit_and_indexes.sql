-- ==============================================================================
-- HACHIHI QUIZ - CLOUDFLARE D1 VERSIONED MIGRATION v0002
-- Description: Bổ sung chỉ mục tối ưu xếp hạng thời gian thực và nhật ký phòng
-- Apply via CLI: wrangler d1 migrations apply hachihi-quiz-db --remote
-- ==============================================================================

-- 1. Thêm chỉ mục tăng tốc độ truy vấn bảng điểm và xếp hạng
CREATE INDEX IF NOT EXISTS idx_participants_score ON participants(session_id, score DESC);

-- 2. Thêm chỉ mục tìm kiếm token khôi phục kết nối khi thí sinh bị rớt mạng
CREATE INDEX IF NOT EXISTS idx_participants_token ON participants(session_id, participant_token);

-- 3. Thêm chỉ mục tìm kiếm nhật ký kiểm toán theo thời gian
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action, created_at DESC);
