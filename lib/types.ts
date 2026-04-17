export interface Question {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  timeLimit?: number;
}

export interface Quiz {
  id: string;
  ownerId?: string;
  ownerEmail?: string | null;
  teamId?: string | null;
  teamName?: string | null;
  title: string;
  createdAt: any;
  updatedAt?: any;
  hostPassword?: string;
  settings: {
    timePerQuestion: number;
    autoAdvance: boolean;
    autoReveal: boolean;
  };
  questions: Question[];
}

export interface Session {
  id: string;
  quizId: string;
  ownerId?: string;
  teamId?: string | null;
  joinCode: string;
  status: 'lobby' | 'active' | 'ended';
  currentQuestionIndex: number;
  answerRevealed: boolean;
  showAnswerCounts?: boolean;
  questionStartedAt: any | null;
  autoAdvance: boolean;
  createdAt: any;
}

export interface PlayerAnswer {
  questionIndex: number;
  selectedIndex: number;
  isCorrect: boolean;
  responseTimeMs: number;
  score: number;
}

export interface Player {
  id: string;
  name: string;
  joinedAt: any;
  totalScore: number;
  avgResponseTime: number;
  answers: PlayerAnswer[];
}

export interface TeamMember {
  uid: string;
  email: string;
  role: 'owner' | 'member';
  joinedAt: any;
}

export interface Team {
  id: string;
  name: string;
  ownerId: string;
  ownerEmail: string;
  lastAcceptedInviteId?: string | null;
  members: TeamMember[];
  memberIds: string[];
  createdAt: any;
  updatedAt: any;
}

export interface TeamInvite {
  id: string;
  teamId: string;
  teamName: string;
  invitedEmail: string;
  invitedById: string;
  invitedByEmail: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: any;
  respondedAt?: any;
}