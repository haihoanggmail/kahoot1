import express, { Request, Response } from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { db, DbQuiz, DbGameSession, DbParticipant, DbAnswer, DbQuestion } from './server/database.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '10mb' }));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// Active in-memory Live Room sessions mapping to DB
interface ActiveRoom {
  session: DbGameSession;
  quiz: DbQuiz;
  hostWs: WebSocket | null;
  hostToken: string;
  clientSockets: Map<string, WebSocket>; // participantId -> ws
  timerInterval: NodeJS.Timeout | null;
  timeRemaining: number;
  questionStartTime: number;
  isPaused: boolean;
  maxCapacity: number;
}

const activeRooms = new Map<string, ActiveRoom>(); // pin -> ActiveRoom

// Helper: Broadcast event to all sockets in room
function broadcastToRoom(room: ActiveRoom, message: object) {
  const payload = JSON.stringify(message);

  // Send to host
  if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
    try {
      room.hostWs.send(payload);
    } catch {}
  }

  // Send to all connected participants
  for (const [, ws] of room.clientSockets) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(payload);
      } catch {}
    }
  }
}

// Generate Safe Room Snapshot (strips correct answers during active question!)
function getSafeRoomSnapshot(room: ActiveRoom, forHost = false) {
  const currentQ = room.quiz.questions[room.session.current_question_index];
  const participants = db.getParticipantsBySession(room.session.id);
  const answers = db.getAnswersForSession(room.session.id);

  // Calculate answer counts for current question
  const currentQAnswers = currentQ
    ? answers.filter((a) => a.question_id === currentQ.id)
    : [];

  const distribution = [0, 0, 0, 0];
  for (const ans of currentQAnswers) {
    if (ans.answer_json >= 0 && ans.answer_json < 4) {
      distribution[ans.answer_json]++;
    }
  }

  const isRevealed = room.session.status === 'finished' || (room as any).isRevealed === true;

  return {
    id: room.session.id,
    pin: room.session.pin,
    status: room.session.status,
    isPaused: room.isPaused,
    quizTitle: room.quiz.title,
    currentQuestionIndex: room.session.current_question_index,
    totalQuestions: room.quiz.questions.length,
    timeRemaining: room.timeRemaining,
    participantsCount: participants.length,
    maxCapacity: room.maxCapacity,
    participants: participants.sort((a, b) => b.score - a.score),
    distribution,
    answeredCount: currentQAnswers.length,
    question: currentQ
      ? {
          id: currentQ.id,
          text: currentQ.question_text,
          type: currentQ.question_type,
          options: currentQ.options_json,
          timeLimit: currentQ.time_limit_seconds,
          points: currentQ.points,
          // CRITICAL SECURITY: Never leak correct answer to players while question is running!
          correctAnswers: forHost || isRevealed ? currentQ.correct_answer_json : undefined,
          explanation: forHost || isRevealed ? currentQ.explanation : undefined,
        }
      : null,
  };
}

// Stop Room Timer
function stopTimer(room: ActiveRoom) {
  if (room.timerInterval) {
    clearInterval(room.timerInterval);
    room.timerInterval = null;
  }
}

// Start Question Timer
function startQuestionTimer(room: ActiveRoom) {
  stopTimer(room);
  (room as any).isRevealed = false;
  room.session.status = 'running';
  room.isPaused = false;
  db.updateGameSession(room.session.id, { status: 'running' });

  const currentQ = room.quiz.questions[room.session.current_question_index];
  room.timeRemaining = currentQ ? currentQ.time_limit_seconds : 20;
  room.questionStartTime = Date.now();

  broadcastToRoom(room, {
    type: 'question_started',
    room: getSafeRoomSnapshot(room),
  });

  room.timerInterval = setInterval(() => {
    if (room.isPaused) return;

    room.timeRemaining -= 1;
    if (room.timeRemaining <= 0) {
      stopTimer(room);
      revealQuestion(room);
    } else {
      broadcastToRoom(room, {
        type: 'timer_update',
        timeRemaining: room.timeRemaining,
      });
    }
  }, 1000);
}

// Reveal Answer
function revealQuestion(room: ActiveRoom) {
  stopTimer(room);
  (room as any).isRevealed = true;
  broadcastToRoom(room, {
    type: 'answer_result',
    room: getSafeRoomSnapshot(room),
  });
}

// ================= WEBSOCKET SERVER =================
wss.on('connection', (ws: WebSocket) => {
  let boundPin: string | null = null;
  let boundParticipantId: string | null = null;
  let isHost = false;

  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw.toString());

      // 1. HOST AUTHENTICATION & RECONNECT
      if (data.type === 'HOST_REGISTER') {
        const { pin, hostToken } = data;
        const room = activeRooms.get(pin);
        if (!room || room.hostToken !== hostToken) {
          ws.send(JSON.stringify({ type: 'error', message: 'Mã PIN hoặc token quản trị Host không hợp lệ.' }));
          return;
        }

        room.hostWs = ws;
        boundPin = pin;
        isHost = true;

        ws.send(JSON.stringify({
          type: 'host_connected',
          room: getSafeRoomSnapshot(room, true),
        }));
        return;
      }

      // 2. PLAYER JOIN VIA PIN & NICKNAME (No Google account required for players!)
      if (data.type === 'PLAYER_JOIN') {
        const { pin, nickname, participantToken } = data;
        const room = activeRooms.get(pin);
        if (!room) {
          ws.send(JSON.stringify({ type: 'error', message: 'Phòng thi không tồn tại hoặc đã đóng.' }));
          return;
        }

        const currentParticipants = db.getParticipantsBySession(room.session.id);

        // Check Room Capacity Limit: Max 50 players per room (MVP Rule)
        if (currentParticipants.length >= room.maxCapacity) {
          const existing = currentParticipants.find((p) => p.participant_token === participantToken);
          if (!existing) {
            ws.send(JSON.stringify({ type: 'error', message: 'Phòng đã đủ 50 thí sinh (Hạn mức phòng đạt tối đa).' }));
            return;
          }
        }

        // Token or ID recovery
        let participant = db.getParticipantByToken(room.session.id, participantToken);

        if (!participant) {
          // Check duplicate nickname in room
          const duplicateName = currentParticipants.find(
            (p) => p.nickname.trim().toLowerCase() === nickname.trim().toLowerCase()
          );
          if (duplicateName) {
            ws.send(JSON.stringify({ type: 'error', message: `Biệt danh "${nickname}" đã có người sử dụng trong phòng.` }));
            return;
          }

          const newId = `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          participant = {
            id: newId,
            session_id: room.session.id,
            nickname: nickname.trim(),
            participant_token: participantToken || `tok-${Date.now()}-${Math.random()}`,
            status: 'active',
            score: 0,
            streak: 0,
            joined_at: new Date().toISOString(),
            last_seen_at: new Date().toISOString(),
          };
          db.addOrUpdateParticipant(participant);
          db.logAudit('player', participant.id, 'PLAYER_JOINED', { nickname: participant.nickname }, room.session.id);
        } else {
          participant.status = 'active';
          participant.last_seen_at = new Date().toISOString();
          db.addOrUpdateParticipant(participant);
        }

        room.clientSockets.set(participant.id, ws);
        boundPin = pin;
        boundParticipantId = participant.id;

        // Send confirmed joined state to player
        ws.send(JSON.stringify({
          type: 'joined_success',
          participantId: participant.id,
          participantToken: participant.participant_token,
          room: getSafeRoomSnapshot(room),
        }));

        // Broadcast to Host & all players
        broadcastToRoom(room, {
          type: 'participant_joined',
          room: getSafeRoomSnapshot(room),
        });
        return;
      }

      // 3. HOST CONTROLS
      if (isHost && boundPin) {
        const room = activeRooms.get(boundPin);
        if (!room) return;

        if (data.type === 'START_GAME') {
          room.session.current_question_index = 0;
          db.updateGameSession(room.session.id, {
            status: 'running',
            current_question_index: 0,
            started_at: new Date().toISOString(),
          });
          startQuestionTimer(room);
          db.logAudit('host', room.session.host_id, 'SESSION_STARTED', {}, room.session.id);
        } else if (data.type === 'PAUSE_GAME') {
          room.isPaused = true;
          room.session.status = 'paused';
          db.updateGameSession(room.session.id, { status: 'paused' });
          broadcastToRoom(room, { type: 'session_paused', room: getSafeRoomSnapshot(room) });
        } else if (data.type === 'RESUME_GAME') {
          room.isPaused = false;
          room.session.status = 'running';
          db.updateGameSession(room.session.id, { status: 'running' });
          broadcastToRoom(room, { type: 'session_resumed', room: getSafeRoomSnapshot(room) });
        } else if (data.type === 'SKIP_TIMER') {
          stopTimer(room);
          revealQuestion(room);
        } else if (data.type === 'GO_LEADERBOARD') {
          stopTimer(room);
          broadcastToRoom(room, {
            type: 'leaderboard_updated',
            room: getSafeRoomSnapshot(room),
          });
        } else if (data.type === 'NEXT_QUESTION') {
          if (room.session.current_question_index + 1 < room.quiz.questions.length) {
            room.session.current_question_index += 1;
            db.updateGameSession(room.session.id, {
              current_question_index: room.session.current_question_index,
            });
            startQuestionTimer(room);
          } else {
            // Finish room & calculate official results into database
            stopTimer(room);
            const results = db.finishSessionAndCalculateResults(room.session.id);
            db.logAudit('host', room.session.host_id, 'SESSION_FINISHED', { totalResults: results.length }, room.session.id);
            broadcastToRoom(room, {
              type: 'session_finished',
              room: getSafeRoomSnapshot(room),
              results,
            });
          }
        } else if (data.type === 'RESTART_GAME') {
          stopTimer(room);
          room.session.current_question_index = 0;
          room.session.status = 'lobby';
          db.updateGameSession(room.session.id, { status: 'lobby', current_question_index: 0 });
          // Reset participant scores in DB
          const participants = db.getParticipantsBySession(room.session.id);
          for (const p of participants) {
            p.score = 0;
            p.streak = 0;
            db.addOrUpdateParticipant(p);
          }
          broadcastToRoom(room, {
            type: 'room_state',
            room: getSafeRoomSnapshot(room),
          });
        } else if (data.type === 'ADD_SIMULATED_TEST_PLAYERS') {
          // Explicit load testing tool with (Test) label
          const count = Math.min(data.count || 5, room.maxCapacity - db.getParticipantsBySession(room.session.id).length);
          const TEST_NAMES = ['Văn An', 'Thu Hà', 'Đăng Khoa', 'Bảo Hân', 'Trọng Hiếu', 'Phương Linh'];
          for (let i = 0; i < count; i++) {
            const bId = `bot-${Date.now()}-${i}`;
            const bName = `${TEST_NAMES[i % TEST_NAMES.length]} (Test)`;
            db.addOrUpdateParticipant({
              id: bId,
              session_id: room.session.id,
              nickname: bName,
              participant_token: `bot-token-${i}`,
              status: 'active',
              score: 0,
              streak: 0,
              joined_at: new Date().toISOString(),
              last_seen_at: new Date().toISOString(),
            });
          }
          broadcastToRoom(room, {
            type: 'participant_joined',
            room: getSafeRoomSnapshot(room),
          });
        }
        return;
      }

      // 4. PLAYER SUBMIT ANSWER (Server-side grading & anti-cheat unique constraint)
      if (boundPin && boundParticipantId && data.type === 'SUBMIT_ANSWER') {
        const room = activeRooms.get(boundPin);
        if (!room || room.session.status !== 'running' || room.isPaused) return;

        const currentQ = room.quiz.questions[room.session.current_question_index];
        if (!currentQ) return;

        const optionIndex = Number(data.optionIndex);
        const elapsedMs = Math.max(150, Date.now() - room.questionStartTime);
        const isCorrect = currentQ.correct_answer_json.includes(optionIndex);

        // Calculate speed-based score server-side
        const speedRatio = Math.max(0.3, room.timeRemaining / currentQ.time_limit_seconds);
        const pointsAwarded = isCorrect ? Math.round(currentQ.points * speedRatio) : 0;

        const answerRecord: DbAnswer = {
          id: `ans-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          session_id: room.session.id,
          participant_id: boundParticipantId,
          question_id: currentQ.id,
          answer_json: optionIndex,
          is_correct: isCorrect ? 1 : 0,
          response_time_ms: elapsedMs,
          points_awarded: pointsAwarded,
          submitted_at: new Date().toISOString(),
        };

        const result = db.recordAnswer(answerRecord);
        if (result.isDuplicate) {
          ws.send(JSON.stringify({ type: 'error', message: 'Bạn đã nộp đáp án cho câu này rồi.' }));
          return;
        }

        const updatedParticipant = db.getParticipantsBySession(room.session.id).find((p) => p.id === boundParticipantId);

        // Confirm to player
        ws.send(JSON.stringify({
          type: 'answer_received',
          optionIndex,
          isCorrect,
          pointsAwarded,
          score: updatedParticipant?.score || 0,
          streak: updatedParticipant?.streak || 0,
        }));

        // Broadcast answered count update
        const allSessionAnswers = db.getAnswersForSession(room.session.id).filter((a) => a.question_id === currentQ.id);
        broadcastToRoom(room, {
          type: 'answer_count_update',
          answeredCount: allSessionAnswers.length,
          totalCount: db.getParticipantsBySession(room.session.id).length,
        });

        // Instant reveal if 100% of room participants have answered
        const participants = db.getParticipantsBySession(room.session.id);
        if (allSessionAnswers.length >= participants.length && participants.length > 0) {
          stopTimer(room);
          setTimeout(() => revealQuestion(room), 500);
        }
      }
    } catch (err) {
      console.error('WebSocket message parsing error:', err);
    }
  });

  ws.on('close', () => {
    if (boundPin) {
      const room = activeRooms.get(boundPin);
      if (room) {
        if (isHost) {
          room.hostWs = null;
        } else if (boundParticipantId) {
          room.clientSockets.delete(boundParticipantId);
          broadcastToRoom(room, {
            type: 'participant_disconnected',
            participantId: boundParticipantId,
          });
        }
      }
    }
  });
});

// ================= REST API ROUTES (SECTION 5 SPECIFICATION) =================

// 5.1 Auth & Admin Profile
app.get('/api/me', (req: Request, res: Response) => {
  res.json({
    id: 'usr-admin-01',
    name: 'Hoàng Hải (TechLead)',
    email: 'haihoang.hch@gmail.com',
    role: 'admin',
    domain: 'hachihi.vn',
    isWhitelisted: true,
  });
});

app.post('/api/auth/verify-domain', (req: Request, res: Response) => {
  const { email, allowedDomains } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ allowed: false, message: 'Email không hợp lệ.' });
  }
  const domain = email.split('@')[1];
  const isAllowed = allowedDomains.includes(domain);
  res.json({
    allowed: isAllowed,
    domain,
    message: isAllowed
      ? `Tài khoản @${domain} hợp lệ theo chính sách Google Workspace.`
      : `Truy cập bị từ chối: Tên miền @${domain} không nằm trong danh sách tổ chức được duyệt.`,
  });
});

// 5.1 Quizzes Management (Database Backed)
app.get('/api/quizzes', (req: Request, res: Response) => {
  res.json(db.getQuizzes());
});

app.get('/api/quizzes/:id', (req: Request, res: Response) => {
  const quiz = db.getQuizById(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'Không tìm thấy bộ đề thi.' });
  res.json(quiz);
});

app.post('/api/quizzes', (req: Request, res: Response) => {
  const newQuiz = req.body;
  if (!newQuiz.title || !newQuiz.questions) {
    return res.status(400).json({ error: 'Dữ liệu đề thi không hợp lệ.' });
  }
  const created = db.createQuiz(newQuiz);
  res.json(created);
});

app.patch('/api/quizzes/:id', (req: Request, res: Response) => {
  const updated = db.updateQuiz(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Không tìm thấy đề thi.' });
  res.json(updated);
});

app.delete('/api/quizzes/:id', (req: Request, res: Response) => {
  const ok = db.deleteQuiz(req.params.id);
  res.json({ success: ok });
});

// 5.2 Game Sessions (Live Kahoot Room Server Creation)
app.post('/api/sessions', (req: Request, res: Response) => {
  const { quizId, hostId, hostName } = req.body;
  const quiz = db.getQuizById(quizId);
  if (!quiz) {
    return res.status(404).json({ error: 'Đề thi không tồn tại.' });
  }

  // Generate unique 6-digit PIN
  let pin = '';
  do {
    pin = Math.floor(100000 + Math.random() * 900000).toString();
  } while (activeRooms.has(pin));

  const sessionId = `ses-${Date.now()}-${pin}`;
  const sessionRecord: DbGameSession = {
    id: sessionId,
    quiz_id: quiz.id,
    quiz_title: quiz.title,
    host_id: hostId || 'usr-admin-01',
    host_name: hostName || 'Host',
    pin,
    status: 'lobby',
    current_question_index: 0,
    created_at: new Date().toISOString(),
  };

  db.createGameSession(sessionRecord);

  const hostToken = `host-tok-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  const activeRoom: ActiveRoom = {
    session: sessionRecord,
    quiz,
    hostWs: null,
    hostToken,
    clientSockets: new Map(),
    timerInterval: null,
    timeRemaining: 20,
    questionStartTime: 0,
    isPaused: false,
    maxCapacity: 50,
  };

  activeRooms.set(pin, activeRoom);
  db.logAudit('host', sessionRecord.host_id, 'SESSION_CREATED', { pin, quizId: quiz.id }, sessionId);

  res.json({
    sessionId,
    pin,
    hostToken,
    quizTitle: quiz.title,
    maxCapacity: 50,
  });
});

app.get('/api/sessions/:id', (req: Request, res: Response) => {
  const idOrPin = req.params.id;
  const session = db.getGameSessionById(idOrPin) || db.getGameSessionByPin(idOrPin);
  if (!session) return res.status(404).json({ error: 'Phòng thi không tồn tại.' });

  const participants = db.getParticipantsBySession(session.id);
  res.json({
    session,
    participantsCount: participants.length,
    maxCapacity: 50,
  });
});

// Export Session Results to CSV
app.get('/api/sessions/:id/export', (req: Request, res: Response) => {
  const sessionId = req.params.id;
  const session = db.getGameSessionById(sessionId);
  if (!session) return res.status(404).send('Session not found');

  const results = db.getSessionResults(sessionId);
  let csv = 'Xếp hạng,Biệt danh,Điểm tổng,Số câu đúng,Tổng câu làm,Thời điểm hoàn thành\n';
  results.forEach((r) => {
    csv += `${r.rank},"${r.nickname.replace(/"/g, '""')}",${r.final_score},${r.correct_count},${r.total_answered},${r.completed_at}\n`;
  });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="hachihi_quiz_${session.pin}_results.csv"`);
  res.send('\uFEFF' + csv);
});

// Historical Game Sessions List for Reports
app.get('/api/reports/sessions', (req: Request, res: Response) => {
  const history = db.getAllSessionsHistory();
  res.json(history);
});

// Self-Paced Exam Mode API (Section 7)
app.post('/api/self-paced/submit', (req: Request, res: Response) => {
  const attempt = req.body;
  const saved = db.saveSelfPacedAttempt(attempt);
  res.json({ success: true, attempt: saved });
});

app.get('/api/self-paced/history', (req: Request, res: Response) => {
  res.json(db.getSelfPacedAttempts());
});

// ================= VITE DEV MIDDLEWARE / STATIC ASSETS =================
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';
  const port = 3000;

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  server.listen(port, '0.0.0.0', () => {
    console.log(`[HACHIHI Quiz MVP] Full-stack Server listening on http://0.0.0.0:${port}`);
    console.log(`[HACHIHI Quiz MVP] WebSocket endpoint: ws://0.0.0.0:${port}/ws`);
  });
}

startServer();
