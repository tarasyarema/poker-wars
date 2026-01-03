import { z } from "zod/v4";

// ============================================================================
// Configuration Types
// ============================================================================

export const BlindLevelSchema = z.object({
  smallBlind: z.number().positive(),
  bigBlind: z.number().positive(),
  handsUntilIncrease: z.number().positive(),
});

export const PlayerConfigSchema = z.object({
  index: z.number().int().min(0).max(9),
  model: z.string(), // e.g., "anthropic/claude-sonnet-4", "openai/gpt-4o"
});

export const GameConfigSchema = z.object({
  initialChips: z.number().positive(),
  blindStructure: z.array(BlindLevelSchema).min(1),
  players: z.array(PlayerConfigSchema).min(2).max(10),
});

export type BlindLevel = z.infer<typeof BlindLevelSchema>;
export type PlayerConfig = z.infer<typeof PlayerConfigSchema>;
export type GameConfig = z.infer<typeof GameConfigSchema>;

// ============================================================================
// Poker Types (based on poker-ts)
// ============================================================================

export type CardRank =
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "T"
  | "J"
  | "Q"
  | "K"
  | "A";
export type CardSuit = "clubs" | "diamonds" | "hearts" | "spades";

export interface Card {
  rank: CardRank;
  suit: CardSuit;
}

export type PokerAction = "fold" | "check" | "call" | "bet" | "raise";
export type BettingRound = "preflop" | "flop" | "turn" | "river";

export enum HandRanking {
  HIGH_CARD = 0,
  PAIR = 1,
  TWO_PAIR = 2,
  THREE_OF_A_KIND = 3,
  STRAIGHT = 4,
  FLUSH = 5,
  FULL_HOUSE = 6,
  FOUR_OF_A_KIND = 7,
  STRAIGHT_FLUSH = 8,
  ROYAL_FLUSH = 9,
}

// ============================================================================
// Player State Types
// ============================================================================

export interface PlayerState {
  index: number;
  model: string;
  stack: number;
  totalChips: number;
  betSize: number;
  isEliminated: boolean;
  isActive: boolean; // still in current hand
}

export interface PlayerSeat {
  totalChips: number;
  stack: number;
  betSize: number;
}

// ============================================================================
// Game State Types
// ============================================================================

export interface PotInfo {
  size: number;
  eligiblePlayers: number[];
}

export interface BlindState {
  smallBlind: number;
  bigBlind: number;
  currentLevel: number;
  handsUntilNext: number;
}

export type GameStatus = "waiting" | "in_progress" | "completed";

export interface GameState {
  runId: string;
  status: GameStatus;
  currentHandNumber: number;
  players: PlayerState[];
  blinds: BlindState;
  buttonPosition: number;
  winner: number | null;
  startedAt: string;
  completedAt: string | null;
  handInProgress?: boolean;
}

// ============================================================================
// Hand History Types
// ============================================================================

export interface ActionRecord {
  playerIndex: number;
  action: PokerAction;
  amount?: number;
  timestamp: string;
  round: BettingRound;
  durationMs: number; // How long the player took to decide
}

export interface HandResult {
  playerIndex: number;
  handRanking: HandRanking;
  handDescription: string;
  cards: Card[];
  amountWon: number;
}

export interface HandPlayerInfo {
  index: number;
  startingStack: number;
  holeCards: Card[] | null; // null if folded before showdown
  endingStack: number;
}

export interface HandHistory {
  handNumber: number;
  players: HandPlayerInfo[];
  communityCards: {
    flop: Card[];
    turn: Card | null;
    river: Card | null;
  };
  actions: ActionRecord[];
  pots: PotInfo[];
  winners: HandResult[];
  blinds: { smallBlind: number; bigBlind: number };
  buttonPosition: number;
  timestamp: string;
}

// ============================================================================
// AI Agent Types
// ============================================================================

export const AIDecisionSchema = z.object({
  action: z.enum(["fold", "check", "call", "bet", "raise"]),
  amount: z.number().optional(),
  reasoning: z.string(),
});

export type AIDecision = z.infer<typeof AIDecisionSchema>;

export interface AIToolCall {
  name: string;
  input: unknown;
  output: unknown;
}

export type AILogEntryType = "decision" | "hand_start" | "hand_end";

export interface AILogEntry {
  type: AILogEntryType;
  timestamp: string;
  handNumber: number;
  playerIndex: number;
  model: string;
  // The prompt sent to the AI
  prompt?: string;
  // Tool calls made during decision
  toolCalls?: AIToolCall[];
  // Final decision with reasoning
  decision?: AIDecision;
  durationMs?: number;
  // Hand start/end event data
  blinds?: { smallBlind: number; bigBlind: number };
  buttonPosition?: number;
  players?: { index: number; stack: number; model: string }[];
  winners?: { playerIndex: number; amount: number; handDescription?: string }[];
  potSize?: number;
}

export interface AIContext {
  // Current state
  holeCards: Card[];
  communityCards: Card[];
  stack: number;
  pot: number;
  currentBet: number;
  toCall: number;
  legalActions: {
    actions: PokerAction[];
    minBet?: number;
    maxBet?: number;
  };
  round: BettingRound;
  position: number; // relative to button

  // Game context
  handNumber: number;
  blinds: { small: number; big: number };
  opponents: {
    index: number;
    stack: number;
    betSize: number;
    isActive: boolean;
  }[];
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PlayerHandInfo {
  index: number;
  holeCards: Card[] | null;
  stack: number;
  betSize: number;
  isActive: boolean;
}

export interface CurrentHandInfo {
  handNumber: number;
  round: BettingRound;
  communityCards: Card[];
  pots: PotInfo[];
  playerToAct: number;
  players: PlayerHandInfo[];
  legalActions: {
    actions: PokerAction[];
    minBet?: number;
    maxBet?: number;
  };
}

export interface GameStateResponse {
  game: GameState;
  currentHand?: CurrentHandInfo;
  hands: HandSummary[];
}

export interface HandSummary {
  handNumber: number;
  winners: number[];
  potSize: number;
  timestamp: string;
}

export interface HandsListResponse {
  hands: HandSummary[];
  total: number;
}

export interface HandDetailResponse {
  hand: HandHistory;
}

export interface StartGameResponse {
  runId: string;
  game: GameState;
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

// ============================================================================
// Utility Types
// ============================================================================

export interface LegalActions {
  actions: PokerAction[];
  chipRange?: {
    min: number;
    max: number;
  };
}
