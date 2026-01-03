export interface Card {
  rank: '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A';
  suit: 'clubs' | 'diamonds' | 'hearts' | 'spades';
}

export type PokerAction = 'fold' | 'check' | 'call' | 'bet' | 'raise';
export type BettingRound = 'preflop' | 'flop' | 'turn' | 'river';
export type GameStatus = 'waiting' | 'in_progress' | 'completed';

export interface Player {
  index: number;
  model: string;
  stack: number;
  totalChips?: number;
  betSize: number;
  isEliminated: boolean;
  isActive: boolean;
  holeCards?: Card[];
}

export interface Blinds {
  smallBlind: number;
  bigBlind: number;
  currentLevel: number;
  handsUntilNext: number;
}

export interface Pot {
  size: number;
  eligiblePlayers: number[];
}

export interface LegalActions {
  actions: PokerAction[];
  minBet: number;
  maxBet: number;
}

export interface CurrentHand {
  handNumber: number;
  round: BettingRound;
  communityCards: Card[];
  pots: Pot[];
  playerToAct: number;
  players: Player[];
  legalActions: LegalActions;
}

export interface HandSummary {
  handNumber: number;
  winners: number[];
  potSize: number;
  timestamp: string;
}

export interface Game {
  runId: string;
  status: GameStatus;
  currentHandNumber: number;
  players: Player[];
  blinds: Blinds;
  buttonPosition: number;
  winner: number | null;
  startedAt: string;
  completedAt: string | null;
}

export interface GameState {
  game: Game;
  currentHand: CurrentHand | null;
  hands: HandSummary[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface GameSummary {
  runId: string;
  status: GameStatus;
  winner: { playerIndex: number; model: string } | null;
  startedAt: string;
  completedAt: string | null;
  handsPlayed: number;
  playerCount: number;
}

export interface GamesListResponse {
  games: GameSummary[];
  total: number;
}

// Log stream event types
export interface LogEventBase {
  timestamp: string;
  handNumber: number;
  playerIndex: number;
  model: string;
}

export interface LogEventStart extends LogEventBase {
  type: 'start';
  prompt: string;
}

export interface LogEventReasoning extends LogEventBase {
  type: 'reasoning';
  reasoning: string;
}

export interface LogEventToolCall extends LogEventBase {
  type: 'tool_call';
  toolCall: {
    name: string;
    input: Record<string, unknown>;
    output: unknown;
  };
}

export interface ToolCall {
  name: string;
  input: Record<string, unknown>;
  output: unknown;
}

export interface LogEventDecision extends LogEventBase {
  type: 'decision';
  holeCards?: Card[];
  prompt?: string;
  toolCalls?: ToolCall[];
  decision: {
    action: PokerAction;
    amount?: number;
    reasoning: string;
  };
  durationMs: number;
}

export interface LogEventHandStart extends LogEventBase {
  type: 'hand_start';
  blinds: { smallBlind: number; bigBlind: number };
  buttonPosition: number;
  players: { index: number; stack: number; model: string }[];
}

export interface LogEventHandEnd extends LogEventBase {
  type: 'hand_end';
  potSize: number;
  winners: { playerIndex: number; amount: number; handDescription?: string }[];
}

export type LogEvent = LogEventStart | LogEventReasoning | LogEventToolCall | LogEventDecision | LogEventHandStart | LogEventHandEnd;
