import Poker from "poker-ts";
import type {
  GameConfig,
  GameState,
  PlayerState,
  BlindState,
  HandHistory,
  ActionRecord,
  HandResult,
  Card,
  BettingRound,
  AIContext,
  CurrentHandInfo,
  PlayerHandInfo,
  PotInfo,
  HandRanking,
  PokerAction,
} from "./types";
import type { Storage } from "./storage";
import { createAIDecision, validateDecision } from "./ai-agent";

interface PokerTable {
  sitDown(seatIndex: number, buyIn: number): void;
  standUp(seatIndex: number): void;
  startHand(buttonPosition?: number): void;
  isHandInProgress(): boolean;
  isBettingRoundInProgress(): boolean;
  areBettingRoundsCompleted(): boolean;
  endBettingRound(): void;
  showdown(): void;
  playerToAct(): number;
  legalActions(): { actions: string[]; chipRange?: { min: number; max: number } };
  actionTaken(action: string, amount?: number): void;
  seats(): (
    | { totalChips: number; stack: number; betSize: number }
    | null
  )[];
  holeCards(): (Card[] | null)[];
  communityCards(): Card[];
  pots(): PotInfo[];
  winners(): [number, { cards: Card[]; ranking: number; strength: number }, Card[]][];
  button(): number;
  roundOfBetting(): string;
  setForcedBets(blinds: { smallBlind: number; bigBlind: number }): void;
  handPlayers(): { totalChips: number; stack: number; betSize: number }[];
}

export interface GameModule {
  startGame(config: GameConfig): Promise<string>;
  resumeGame(runId: string, config: GameConfig): Promise<boolean>;
  getCurrentRunId(): string | null;
  getGameState(runId: string): Promise<GameState | null>;
  getCurrentHandInfo(): CurrentHandInfo | null;
  isRunning(): boolean;
}

// Global state for current game
let currentRunId: string | null = null;
let currentTable: PokerTable | null = null;
let currentConfig: GameConfig | null = null;
let isGameRunning = false;
let foldedPlayersThisHand: Set<number> = new Set();

export function createGameModule(storage: Storage): GameModule {
  return {
    async startGame(config: GameConfig): Promise<string> {
      if (isGameRunning) {
        throw new Error("Game already in progress");
      }

      currentConfig = config;
      const runId = await storage.createRun();
      currentRunId = runId;

      // Initialize poker table with first blind level
      const firstBlind = config.blindStructure[0]!;
      const table = new Poker.Table({
        smallBlind: firstBlind.smallBlind,
        bigBlind: firstBlind.bigBlind,
      }) as unknown as PokerTable;

      currentTable = table;

      // Seat all players
      for (const player of config.players) {
        table.sitDown(player.index, config.initialChips);
      }

      // Initialize game state
      const initialState: GameState = {
        runId,
        status: "in_progress",
        currentHandNumber: 0,
        players: config.players.map((p) => ({
          index: p.index,
          model: p.model,
          stack: config.initialChips,
          totalChips: config.initialChips,
          betSize: 0,
          isEliminated: false,
          isActive: true,
        })),
        blinds: {
          smallBlind: firstBlind.smallBlind,
          bigBlind: firstBlind.bigBlind,
          currentLevel: 0,
          handsUntilNext: firstBlind.handsUntilIncrease,
        },
        buttonPosition: 0,
        winner: null,
        startedAt: new Date().toISOString(),
        completedAt: null,
      };

      await storage.saveGameState(runId, initialState);

      // Start game loop in background
      isGameRunning = true;
      runGameLoop(config, table, storage, runId).catch((err) => {
        console.error("Game loop error:", err);
        isGameRunning = false;
      });

      return runId;
    },

    getCurrentRunId(): string | null {
      return currentRunId;
    },

    async getGameState(runId: string): Promise<GameState | null> {
      return storage.loadGameState(runId);
    },

    getCurrentHandInfo(): CurrentHandInfo | null {
      if (!currentTable || !currentRunId) return null;

      const table = currentTable;
      if (!table.isHandInProgress()) return null;

      const legal = table.legalActions();
      const seats = table.seats();
      const holeCards = table.holeCards();

      // Build player hand info - exclude folded players
      const players: PlayerHandInfo[] = [];
      for (let i = 0; i < seats.length; i++) {
        const seat = seats[i];
        const playerHoleCards = holeCards[i];
        // Only include players who haven't folded
        if (seat && playerHoleCards && !foldedPlayersThisHand.has(i)) {
          players.push({
            index: i,
            holeCards: playerHoleCards,
            stack: seat.stack,
            betSize: seat.betSize,
            isActive: true,
          });
        }
      }

      return {
        handNumber: 0, // Will be updated from game state
        round: table.roundOfBetting() as BettingRound,
        communityCards: table.communityCards(),
        pots: table.pots(),
        playerToAct: table.playerToAct(),
        players,
        legalActions: {
          actions: legal.actions as PokerAction[],
          minBet: legal.chipRange?.min,
          maxBet: legal.chipRange?.max,
        },
      };
    },

    isRunning(): boolean {
      return isGameRunning;
    },

    async resumeGame(runId: string, config: GameConfig): Promise<boolean> {
      if (isGameRunning) {
        console.log("Cannot resume: game already running");
        return false;
      }

      const state = await storage.loadGameState(runId);
      if (!state || state.status !== "in_progress") {
        console.log("Cannot resume: game not found or not in progress");
        return false;
      }

      currentConfig = config;
      currentRunId = runId;

      // Create new table with current blinds
      const table = new Poker.Table({
        smallBlind: state.blinds.smallBlind,
        bigBlind: state.blinds.bigBlind,
      }) as unknown as PokerTable;

      currentTable = table;

      // Seat players with saved stacks (not initial chips)
      for (const player of state.players) {
        if (!player.isEliminated && player.stack > 0) {
          table.sitDown(player.index, player.stack);
        }
      }

      // Determine starting hand number
      // If hand was in progress, restart that hand; otherwise start next hand
      const startingHand = state.handInProgress
        ? state.currentHandNumber
        : state.currentHandNumber + 1;

      console.log(
        `Resuming game ${runId} from hand ${startingHand} with ${state.players.filter((p) => !p.isEliminated).length} players`
      );

      // Start game loop in background
      isGameRunning = true;
      runGameLoop(config, table, storage, runId, startingHand).catch((err) => {
        console.error("Game loop error:", err);
        isGameRunning = false;
      });

      return true;
    },
  };
}

// Main game loop
async function runGameLoop(
  config: GameConfig,
  table: PokerTable,
  storage: Storage,
  runId: string,
  startingHandNumber: number = 1
): Promise<void> {
  let handNumber = startingHandNumber;
  let blindState = await getBlindState(storage, runId);

  console.log(`Starting game ${runId} with ${config.players.length} players`);

  while (true) {
    // Check how many players are still active
    const gameState = await storage.loadGameState(runId);
    if (!gameState) break;

    const activePlayers = gameState.players.filter((p) => !p.isEliminated);
    if (activePlayers.length <= 1) {
      // Game over
      const winner = activePlayers[0]?.index ?? null;
      await storage.saveGameState(runId, {
        ...gameState,
        status: "completed",
        winner,
        completedAt: new Date().toISOString(),
      });
      console.log(`Game complete! Winner: Player ${winner}`);
      break;
    }

    // Check blind increase
    blindState = checkBlindIncrease(config, blindState);
    table.setForcedBets({
      smallBlind: blindState.smallBlind,
      bigBlind: blindState.bigBlind,
    });

    console.log(
      `\n=== Hand ${handNumber} ===`
    );
    console.log(
      `Blinds: ${blindState.smallBlind}/${blindState.bigBlind}`
    );

    // Start hand - clear folded players from previous hand
    foldedPlayersThisHand.clear();
    table.startHand();

    // Mark hand as in progress for resume support
    await updateGameState(table, storage, runId, handNumber, blindState, true);

    // Send hand_start event via SSE
    const seats = table.seats();
    await storage.appendLog(runId, {
      type: "hand_start",
      timestamp: new Date().toISOString(),
      handNumber,
      playerIndex: -1,
      model: "",
      blinds: {
        smallBlind: blindState.smallBlind,
        bigBlind: blindState.bigBlind,
      },
      buttonPosition: table.button(),
      players: config.players
        .filter((p) => {
          const seat = seats[p.index];
          return seat && seat.stack > 0;
        })
        .map((p) => ({
          index: p.index,
          stack: seats[p.index]?.stack ?? 0,
          model: p.model,
        })),
    });

    // Record starting stacks
    const startingStacks = new Map<number, number>();
    for (let i = 0; i < seats.length; i++) {
      const seat = seats[i];
      if (seat) {
        startingStacks.set(i, seat.stack);
      }
    }

    // Hand action history
    const actions: ActionRecord[] = [];
    const handStartTime = new Date().toISOString();

    // Track state during the hand (needed because poker-ts doesn't allow access after hand ends)
    let trackedCommunityCards: Card[] = [];
    let trackedHoleCards: Record<number, Card[] | null> = {};
    let trackedRemainingPlayers: { player: unknown; idx: number }[] = [];
    let trackedPots: PotInfo[] = [];
    let trackedSeats: ReturnType<typeof table.seats> = [];
    const trackedButton = table.button(); // Button doesn't change during hand

    // Captured showdown data (must be captured BEFORE calling showdown())
    let capturedShowdownWinners: ReturnType<typeof table.winners> | null = null;
    let capturedCommunityCards: Card[] | null = null;
    let capturedHoleCards: (Card[] | null)[] | null = null;

    // Capture initial state
    try {
      const initialHoleCards = table.holeCards();
      config.players.forEach((p) => {
        trackedHoleCards[p.index] = initialHoleCards[p.index] ?? null;
      });
      trackedRemainingPlayers = table.handPlayers()
        .map((player, idx) => ({ player, idx }))
        .filter(({ player }) => player !== null);
      trackedSeats = table.seats();
      trackedPots = table.pots();
    } catch {
      // May not be available yet
    }

    // Raise cap tracking (2 raises per round max to reduce preflop folding)
    const MAX_RAISES_PER_ROUND = 2;
    let raisesThisRound = 0;

    // Hand loop
    while (table.isHandInProgress()) {
      if (table.isBettingRoundInProgress()) {
        const playerIndex = table.playerToAct();
        const round = table.roundOfBetting() as BettingRound;
        const legal = table.legalActions();

        // Find player config
        const playerConfig = config.players.find((p) => p.index === playerIndex);
        if (!playerConfig) {
          console.error(`Player config not found for seat ${playerIndex}`);
          table.actionTaken("fold");
          foldedPlayersThisHand.add(playerIndex);
          continue;
        }

        // Build AI context
        const context = buildAIContext(
          table,
          playerIndex,
          handNumber,
          blindState,
          gameState
        );

        // Get AI decision with timing
        const raiseCapReached = raisesThisRound >= MAX_RAISES_PER_ROUND;
        console.log(`Player ${playerIndex} (${playerConfig.model}) to act...${raiseCapReached ? ' [RAISE CAP]' : ''}`);
        const decisionStart = Date.now();
        const decision = await createAIDecision(
          playerIndex,
          playerConfig.model,
          context,
          storage,
          runId,
          actions.map((a) => ({
            playerIndex: a.playerIndex,
            action: a.action,
            amount: a.amount,
          })),
          raiseCapReached
        );
        const decisionDurationMs = Date.now() - decisionStart;

        // Validate decision
        let validatedDecision = validateDecision(decision, {
          actions: legal.actions as PokerAction[],
          minBet: legal.chipRange?.min,
          maxBet: legal.chipRange?.max,
        });

        // Force call if raise cap reached and AI tried to raise/bet
        if (raiseCapReached && (validatedDecision.action === 'raise' || validatedDecision.action === 'bet')) {
          console.log(`  -> Raise cap reached, forcing call instead of ${validatedDecision.action}`);
          validatedDecision = {
            action: legal.actions.includes('call' as PokerAction) ? 'call' : 'check',
            reasoning: `${validatedDecision.reasoning} [Raise cap reached - forced to call]`,
          };
        }

        // Track raises
        if (validatedDecision.action === 'raise' || validatedDecision.action === 'bet') {
          raisesThisRound++;
        }

        console.log(
          `  -> ${validatedDecision.action}${validatedDecision.amount ? ` ${validatedDecision.amount}` : ""} (${decisionDurationMs}ms)`
        );

        // Execute action
        table.actionTaken(validatedDecision.action, validatedDecision.amount);

        // Track folded players
        if (validatedDecision.action === 'fold') {
          foldedPlayersThisHand.add(playerIndex);
        }

        // Update tracking (must be done while hand is in progress)
        try {
          trackedRemainingPlayers = table.handPlayers()
            .map((player, idx) => ({ player, idx }))
            .filter(({ player }) => player !== null);
          trackedPots = table.pots();
          trackedSeats = table.seats();
        } catch {
          // Hand might have just ended, use last known state
        }

        // Record action with timing
        actions.push({
          playerIndex,
          action: validatedDecision.action,
          amount: validatedDecision.amount,
          timestamp: new Date().toISOString(),
          round,
          durationMs: decisionDurationMs,
        });

        // Update game state
        await updateGameState(table, storage, runId, handNumber, blindState);
      } else {
        // End betting round (deal next street)
        table.endBettingRound();
        raisesThisRound = 0; // Reset raise counter for next round

        // Track community cards after each street is dealt
        try {
          trackedCommunityCards = table.communityCards();
        } catch {
          // May fail if hand ended
        }

        if (table.areBettingRoundsCompleted()) {
          // Capture showdown data BEFORE calling showdown() - poker-ts ends hand state after showdown
          try {
            capturedShowdownWinners = table.winners();
            capturedCommunityCards = table.communityCards();
            capturedHoleCards = table.holeCards();
          } catch {
            // If capture fails, we'll use tracked data
          }
          table.showdown();
        }
      }
    }

    // Determine if hand ended via showdown or fold-out
    type WinnerEntry = [number, { ranking: number; cards: Card[] }, Card[]];
    let flatWinners: WinnerEntry[] = [];
    let communityCards: Card[] = trackedCommunityCards;
    let holeCardsData: (Card[] | null)[] = [];
    let foldWin = false;

    // Check if only one player remains (fold-out win)
    // Use tracked data since handPlayers() requires hand to still be in progress
    const remainingPlayers = trackedRemainingPlayers;

    if (remainingPlayers.length === 1) {
      // Fold-out: last remaining player wins
      foldWin = true;
      const winner = remainingPlayers[0]!;
      const totalPot = trackedPots.reduce((sum, pot) => sum + pot.size, 0);

      // Create a synthetic winner entry for fold-out
      flatWinners = [
        [
          winner.idx,
          { ranking: 0, cards: [] as Card[] }, // No hand ranking for fold win
          trackedHoleCards[winner.idx] ?? [],
        ]
      ];

      // Populate hole cards from tracked data
      config.players.forEach((p) => {
        holeCardsData[p.index] = trackedHoleCards[p.index] ?? null;
      });

      console.log(`Player ${winner.idx} wins ${totalPot} (everyone else folded)`);
    } else {
      // Normal showdown - use captured data (captured BEFORE showdown() was called)
      if (capturedShowdownWinners) {
        // poker-ts returns nested arrays for multiple pots: [[[winner1], [winner2]], [[winner3]]]
        // Flatten to get all winner entries
        for (const pot of capturedShowdownWinners) {
          for (const winners of pot) {
            flatWinners.push(winners as unknown as WinnerEntry);
          }
        }
        communityCards = capturedCommunityCards ?? trackedCommunityCards;
        holeCardsData = capturedHoleCards ?? [];
      } else {
        // Fallback to tracked data if capture failed
        console.warn("Showdown data was not captured, using tracked values");
        communityCards = trackedCommunityCards;
        config.players.forEach((p) => {
          holeCardsData[p.index] = trackedHoleCards[p.index] ?? null;
        });
        // If we can't get winners, we need to determine winner from remaining players
        if (flatWinners.length === 0 && trackedRemainingPlayers.length > 0) {
          // Create synthetic winner entries for remaining players (can't determine hand rankings)
          for (const { idx } of trackedRemainingPlayers) {
            flatWinners.push([
              idx,
              { ranking: 0, cards: [] as Card[] },
              trackedHoleCards[idx] ?? [],
            ]);
          }
        }
      }
    }

    // Build hand history
    const handHistory: HandHistory = {
      handNumber,
      players: config.players.map((p) => {
        const finalSeat = trackedSeats[p.index];
        return {
          index: p.index,
          startingStack: startingStacks.get(p.index) ?? 0,
          holeCards: holeCardsData[p.index] ?? null,
          endingStack: finalSeat?.stack ?? 0,
        };
      }),
      communityCards: {
        flop: communityCards.slice(0, 3),
        turn: communityCards[3] ?? null,
        river: communityCards[4] ?? null,
      },
      actions,
      pots: trackedPots,
      winners: flatWinners.map(([seatIndex, hand, holeCards]) => ({
        playerIndex: seatIndex,
        handRanking: foldWin ? 0 : (hand.ranking as HandRanking),
        handDescription: foldWin ? "Fold Win" : getHandRankingName(hand.ranking),
        cards: foldWin ? [] : hand.cards,
        amountWon: calculateWinnings(trackedPots, seatIndex),
      })),
      blinds: {
        smallBlind: blindState.smallBlind,
        bigBlind: blindState.bigBlind,
      },
      buttonPosition: trackedButton,
      timestamp: handStartTime,
    };

    await storage.saveHandHistory(runId, handHistory);

    // Send hand_end event via SSE
    const totalPotSize = handHistory.winners.reduce((sum, w) => sum + w.amountWon, 0);
    await storage.appendLog(runId, {
      type: "hand_end",
      timestamp: new Date().toISOString(),
      handNumber,
      playerIndex: -1,
      model: "",
      potSize: totalPotSize,
      winners: handHistory.winners.map((w) => ({
        playerIndex: w.playerIndex,
        amount: w.amountWon,
        handDescription: w.handDescription,
      })),
    });

    if (!foldWin) {
      console.log(
        `Winners: ${flatWinners.map(([i, h]) => `Player ${i} (${getHandRankingName(h.ranking)})`).join(", ")}`
      );
    }

    // Check for eliminated players
    const currentSeats = table.seats();
    for (const player of config.players) {
      const seat = currentSeats[player.index];
      if (seat && seat.stack === 0) {
        console.log(`Player ${player.index} eliminated!`);
        table.standUp(player.index);
      }
    }

    // Update blind state for next hand
    blindState = {
      ...blindState,
      handsUntilNext: blindState.handsUntilNext - 1,
    };

    // Update game state with new stacks and mark hand as complete
    // Pass trackedButton since table.button() throws after hand ends
    await updateGameState(table, storage, runId, handNumber, blindState, false, trackedButton);

    handNumber++;

    // Small delay between hands
    await Bun.sleep(100);
  }

  isGameRunning = false;
  currentTable = null;
  currentRunId = null;
  currentConfig = null;
}

// Build AI context from current table state
function buildAIContext(
  table: PokerTable,
  playerIndex: number,
  handNumber: number,
  blindState: BlindState,
  gameState: GameState
): AIContext {
  const seats = table.seats();
  const playerSeat = seats[playerIndex];
  const holeCards = table.holeCards()[playerIndex] ?? [];
  const communityCards = table.communityCards();
  const pots = table.pots();
  const legal = table.legalActions();
  const button = table.button();

  // Calculate pot size
  const potSize = pots.reduce((sum, p) => sum + p.size, 0);

  // Calculate to call amount
  const maxBet = Math.max(
    ...seats.filter((s) => s !== null).map((s) => s!.betSize)
  );
  const toCall = maxBet - (playerSeat?.betSize ?? 0);

  // Calculate position relative to button
  const activeSeatIndices = seats
    .map((s, i) => (s !== null ? i : -1))
    .filter((i) => i !== -1);
  const buttonIdx = activeSeatIndices.indexOf(button);
  const playerIdx = activeSeatIndices.indexOf(playerIndex);
  const position =
    (playerIdx - buttonIdx + activeSeatIndices.length) % activeSeatIndices.length;

  // Build opponents list
  const opponents = seats
    .map((seat, index) => {
      if (seat === null || index === playerIndex) return null;
      const playerState = gameState.players.find((p) => p.index === index);
      return {
        index,
        stack: seat.stack,
        betSize: seat.betSize,
        isActive: playerState?.isActive ?? false,
      };
    })
    .filter((o) => o !== null);

  return {
    holeCards,
    communityCards,
    stack: playerSeat?.stack ?? 0,
    pot: potSize,
    currentBet: playerSeat?.betSize ?? 0,
    toCall,
    legalActions: {
      actions: legal.actions as PokerAction[],
      minBet: legal.chipRange?.min,
      maxBet: legal.chipRange?.max,
    },
    round: table.roundOfBetting() as BettingRound,
    position,
    handNumber,
    blinds: {
      small: blindState.smallBlind,
      big: blindState.bigBlind,
    },
    opponents,
  };
}

// Check if blinds should increase
function checkBlindIncrease(
  config: GameConfig,
  currentBlinds: BlindState
): BlindState {
  if (currentBlinds.handsUntilNext > 0) {
    return currentBlinds;
  }

  const nextLevel = currentBlinds.currentLevel + 1;
  if (nextLevel >= config.blindStructure.length) {
    // Stay at max level
    const lastBlind = config.blindStructure[config.blindStructure.length - 1]!;
    return {
      ...currentBlinds,
      handsUntilNext: lastBlind.handsUntilIncrease,
    };
  }

  const newBlind = config.blindStructure[nextLevel]!;
  console.log(
    `Blinds increasing to ${newBlind.smallBlind}/${newBlind.bigBlind}`
  );

  return {
    smallBlind: newBlind.smallBlind,
    bigBlind: newBlind.bigBlind,
    currentLevel: nextLevel,
    handsUntilNext: newBlind.handsUntilIncrease,
  };
}

// Get current blind state from storage
async function getBlindState(
  storage: Storage,
  runId: string
): Promise<BlindState> {
  const state = await storage.loadGameState(runId);
  if (!state) {
    throw new Error("Game state not found");
  }
  return state.blinds;
}

// Update game state in storage
async function updateGameState(
  table: PokerTable,
  storage: Storage,
  runId: string,
  handNumber: number,
  blindState: BlindState,
  handInProgress?: boolean,
  trackedButton?: number,
  trackedSeats?: ReturnType<PokerTable["seats"]>
): Promise<void> {
  const state = await storage.loadGameState(runId);
  if (!state) return;

  // Use tracked seats if provided (hand ended), otherwise get from table
  const seats = trackedSeats ?? table.seats();

  // Update player states
  for (const player of state.players) {
    const seat = seats[player.index];
    if (seat) {
      player.stack = seat.stack;
      player.totalChips = seat.totalChips;
      player.betSize = seat.betSize;
      player.isEliminated = seat.stack === 0;
    } else {
      player.isEliminated = true;
    }
  }

  state.currentHandNumber = handNumber;
  state.blinds = blindState;
  // Use tracked button if provided (hand ended), otherwise get from table
  state.buttonPosition = trackedButton ?? table.button();
  if (handInProgress !== undefined) {
    state.handInProgress = handInProgress;
  }

  await storage.saveGameState(runId, state);
}

// Get hand ranking name
function getHandRankingName(ranking: number): string {
  const names = [
    "High Card",
    "Pair",
    "Two Pair",
    "Three of a Kind",
    "Straight",
    "Flush",
    "Full House",
    "Four of a Kind",
    "Straight Flush",
    "Royal Flush",
  ];
  return names[ranking] ?? "Unknown";
}

// Calculate winnings for a player from pots
function calculateWinnings(pots: PotInfo[], playerIndex: number): number {
  return pots
    .filter((pot) => pot.eligiblePlayers.includes(playerIndex))
    .reduce((sum, pot) => {
      const winners = pot.eligiblePlayers.length;
      return sum + Math.floor(pot.size / winners);
    }, 0);
}
