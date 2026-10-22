export type Role = 'admin' | 'host' | 'player';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: Role;
  domain: string;
  isWhitelisted: boolean;
  department?: string;
}

export type QuestionType = 'single' | 'boolean' | 'multiple' | 'type';

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options: string[]; // typically 4 options, or 2 for boolean
  correctAnswers: number[]; // indices of correct options (0-3)
  timeLimit: number; // in seconds (e.g., 10, 20, 30, 60)
  points: number; // default 1000, 2000 for double points, 0 for no points
  explanation?: string;
  mediaUrl?: string;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  category: string;
  timeLimitTotal?: number;
  questions: Question[];
  createdBy: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
  targetDomain?: string; // e.g., 'hachihi.vn'
  tags: string[];
}

export type GameState =
  | 'lobby'
  | 'countdown'
  | 'question'
  | 'reveal'
  | 'leaderboard'
  | 'podium'
  | 'ended';

export interface Participant {
  id: string;
  nickname: string;
  name?: string;
  avatar?: string;
  email?: string;
  score: number;
  streak: number;
  lastScoreGain?: number;
  lastAnswerIndex?: number | null;
  lastAnswerTimeMs?: number;
  isCorrectLast?: boolean;
  connected?: boolean;
  isBot?: boolean;
}

export interface LiveSession {
  pin: string;
  quizId: string;
  quizTitle: string;
  hostId: string;
  hostName: string;
  state: GameState;
  currentQuestionIndex: number;
  totalQuestions: number;
  timeRemaining: number;
  participants: Participant[];
  maxCapacity: number; // 50 for MVP
  startedAt?: string;
}

export interface SelfPacedAttempt {
  id: string;
  quizId: string;
  quizTitle: string;
  userEmail: string;
  userName: string;
  startedAt: string;
  finishedAt?: string;
  answers: Record<string, number[]>; // questionId -> selectedOptionIndexes
  score: number;
  maxScore: number;
  correctCount: number;
  totalCount: number;
  isCompleted: boolean;
}

export interface WorkspaceSettings {
  allowedDomains: string[];
  enforceDomain: boolean;
  whitelistEmails: string[];
  maxRoomParticipants: number;
  allowGuestAccess: boolean;
  autoKickUnauthorized: boolean;
}
