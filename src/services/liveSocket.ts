import { Quiz, Participant } from '../types/quiz';

export interface RoomSnapshot {
  id: string;
  pin: string;
  status: 'lobby' | 'running' | 'paused' | 'finished' | 'cancelled';
  isPaused: boolean;
  quizTitle: string;
  currentQuestionIndex: number;
  totalQuestions: number;
  timeRemaining: number;
  participantsCount: number;
  maxCapacity: number;
  participants: Participant[];
  distribution: number[];
  answeredCount: number;
  question?: {
    id: string;
    text: string;
    type: 'single' | 'boolean' | 'multiple' | 'type';
    options: string[];
    timeLimit: number;
    points: number;
    correctAnswers?: number[];
    explanation?: string;
  } | null;
}

export interface HostCallbacks {
  onStateUpdate: (snapshot: RoomSnapshot) => void;
  onTimerTick: (timeRemaining: number) => void;
  onAnswerCountUpdate?: (answeredCount: number, totalCount: number) => void;
  onError: (message: string) => void;
}

export interface PlayerCallbacks {
  onJoined: (participantId: string, participantToken: string, snapshot: RoomSnapshot) => void;
  onStateUpdate: (snapshot: RoomSnapshot) => void;
  onTimerTick: (timeRemaining: number) => void;
  onAnswerAccepted: (optionIndex: number, isCorrect: boolean, pointsAwarded: number, score: number, streak: number) => void;
  onError: (message: string) => void;
}

function getWsUrl(): string {
  if (typeof window === 'undefined') return 'ws://localhost:3000/ws';
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}

// REST: Create Room Session on Server
export async function createServerRoom(quiz: Quiz, hostName: string, hostEmail: string) {
  // First ensure quiz exists on server database
  await fetch('/api/quizzes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(quiz),
  }).catch(() => {});

  const res = await fetch('/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quizId: quiz.id,
      hostName,
      hostId: hostEmail,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Không thể tạo phòng trên server.');
  }

  return (await res.json()) as {
    sessionId: string;
    pin: string;
    hostToken: string;
    quizTitle: string;
    maxCapacity: number;
  };
}

// REST: Check Room Status by PIN
export async function checkRoomStatus(pin: string) {
  const res = await fetch(`/api/sessions/${pin}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Phòng thi không tồn tại.');
  }
  const data = await res.json();
  return {
    pin: data.session.pin,
    status: data.session.status,
    quizTitle: data.session.quiz_title,
    participantsCount: data.participantsCount,
    maxCapacity: data.maxCapacity,
    isFull: data.participantsCount >= data.maxCapacity,
  };
}

// HOST SOCKET SESSION
export class HostSocketSession {
  private ws: WebSocket | null = null;
  private pin: string;
  private hostToken: string;
  private callbacks: HostCallbacks;

  constructor(pin: string, hostToken: string, callbacks: HostCallbacks) {
    this.pin = pin;
    this.hostToken = hostToken;
    this.callbacks = callbacks;
    this.connect();
  }

  private connect() {
    this.ws = new WebSocket(getWsUrl());

    this.ws.onopen = () => {
      this.ws?.send(JSON.stringify({
        type: 'HOST_REGISTER',
        pin: this.pin,
        hostToken: this.hostToken,
      }));
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (
          data.type === 'host_connected' ||
          data.type === 'room_state' ||
          data.type === 'participant_joined' ||
          data.type === 'question_started' ||
          data.type === 'answer_result' ||
          data.type === 'leaderboard_updated' ||
          data.type === 'session_paused' ||
          data.type === 'session_resumed' ||
          data.type === 'session_finished'
        ) {
          if (data.room) this.callbacks.onStateUpdate(data.room);
        } else if (data.type === 'timer_update') {
          this.callbacks.onTimerTick(data.timeRemaining);
        } else if (data.type === 'answer_count_update') {
          this.callbacks.onAnswerCountUpdate?.(data.answeredCount, data.totalCount);
        } else if (data.type === 'error') {
          this.callbacks.onError(data.message);
        }
      } catch (err) {
        console.error('Host WS message parse error', err);
      }
    };

    this.ws.onerror = () => {
      this.callbacks.onError('Lỗi kết nối WebSocket tới server.');
    };
  }

  public startGame() {
    this.ws?.send(JSON.stringify({ type: 'START_GAME' }));
  }

  public pauseGame() {
    this.ws?.send(JSON.stringify({ type: 'PAUSE_GAME' }));
  }

  public resumeGame() {
    this.ws?.send(JSON.stringify({ type: 'RESUME_GAME' }));
  }

  public skipTimer() {
    this.ws?.send(JSON.stringify({ type: 'SKIP_TIMER' }));
  }

  public goLeaderboard() {
    this.ws?.send(JSON.stringify({ type: 'GO_LEADERBOARD' }));
  }

  public nextQuestion() {
    this.ws?.send(JSON.stringify({ type: 'NEXT_QUESTION' }));
  }

  public restartGame() {
    this.ws?.send(JSON.stringify({ type: 'RESTART_GAME' }));
  }

  public addSimulatedPlayers(count: number) {
    this.ws?.send(JSON.stringify({ type: 'ADD_SIMULATED_TEST_PLAYERS', count }));
  }

  public close() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// PLAYER SOCKET SESSION (NO GOOGLE ACCOUNT NEEDED - ANONYMOUS TOKEN RECONNECT)
export class PlayerSocketSession {
  private ws: WebSocket | null = null;
  private pin: string;
  private nickname: string;
  private participantToken: string | null = null;
  private callbacks: PlayerCallbacks;

  constructor(pin: string, nickname: string, participantToken: string | null, callbacks: PlayerCallbacks) {
    this.pin = pin;
    this.nickname = nickname;
    this.participantToken = participantToken;
    this.callbacks = callbacks;
    this.connect();
  }

  private connect() {
    this.ws = new WebSocket(getWsUrl());

    this.ws.onopen = () => {
      this.ws?.send(JSON.stringify({
        type: 'PLAYER_JOIN',
        pin: this.pin,
        nickname: this.nickname,
        participantToken: this.participantToken,
      }));
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'joined_success') {
          this.participantToken = data.participantToken;
          this.callbacks.onJoined(data.participantId, data.participantToken, data.room);
        } else if (
          data.type === 'room_state' ||
          data.type === 'question_started' ||
          data.type === 'answer_result' ||
          data.type === 'leaderboard_updated' ||
          data.type === 'session_paused' ||
          data.type === 'session_resumed' ||
          data.type === 'session_finished'
        ) {
          if (data.room) this.callbacks.onStateUpdate(data.room);
        } else if (data.type === 'timer_update') {
          this.callbacks.onTimerTick(data.timeRemaining);
        } else if (data.type === 'answer_received') {
          this.callbacks.onAnswerAccepted(
            data.optionIndex,
            data.isCorrect,
            data.pointsAwarded,
            data.score,
            data.streak
          );
        } else if (data.type === 'error') {
          this.callbacks.onError(data.message);
        }
      } catch (err) {
        console.error('Player WS message parse error', err);
      }
    };

    this.ws.onerror = () => {
      this.callbacks.onError('Không thể kết nối WebSocket tới phòng thi.');
    };
  }

  public submitAnswer(optionIndex: number) {
    this.ws?.send(JSON.stringify({
      type: 'SUBMIT_ANSWER',
      optionIndex,
    }));
  }

  public close() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
