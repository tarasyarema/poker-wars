import { generateText, Output, tool, stepCountIs } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { z } from "zod/v4";
import type {
  AIContext,
  AIDecision,
  AILogEntry,
  AIToolCall,
  Card,
  PokerAction,
} from "./types";
import { HandRanking } from "./types";
import type { Storage } from "./storage";


// Format cards for display
function formatCards(cards: Card[]): string {
  if (cards.length === 0) return "None";
  return cards
    .map((c) => {
      const suitSymbol =
        c.suit === "hearts"
          ? "\u2665"
          : c.suit === "diamonds"
            ? "\u2666"
            : c.suit === "clubs"
              ? "\u2663"
              : "\u2660";
      return `${c.rank}${suitSymbol}`;
    })
    .join(" ");
}

// Get position description
function getPositionDescription(
  position: number,
  totalPlayers: number
): string {
  if (position === 0) return "Button (BTN)";
  if (position === 1) return "Small Blind (SB)";
  if (position === 2) return "Big Blind (BB)";
  if (position === totalPlayers - 1) return "Cut-off (CO)";
  return `Middle Position (MP+${position - 2})`;
}

// Build system prompt for AI player
function buildSystemPrompt(
  playerIndex: number,
  context: AIContext,
  totalPlayers: number,
  raiseCapReached: boolean = false
): string {
  const positionDesc = getPositionDescription(context.position, totalPlayers);

  return `You are a professional poker player. Make decisions quickly and confidently - don't overthink.

## Your Seat
- Seat ${playerIndex} | Stack: ${context.stack} chips | Position: ${positionDesc}
- Blinds: ${context.blinds.small}/${context.blinds.big}

## Rules
- No-Limit Texas Hold'em tournament
- **2-raise cap per betting round** - after 2 raises, you must call or fold
- Last player standing wins
${raiseCapReached ? '\n⚠️ **RAISE CAP REACHED** - You MUST call or fold. Raising is NOT allowed this round.\n' : ''}
## Tools Available
- getPreviousHands: Check opponent tendencies
- getGameStandings: See chip positions
- getMyHandActions: Review your actions this hand

## Decision Format
You MUST return a structured JSON object with:
- action: exactly one of "fold", "check", "call", "bet", "raise"
- amount: number (required for bet/raise, omit for fold/check/call)
- reasoning: brief explanation of your decision`;
}

// Build decision prompt with current hand state
function buildDecisionPrompt(context: AIContext): string {
  const {
    holeCards,
    communityCards,
    stack,
    pot,
    toCall,
    legalActions,
    round,
    opponents,
  } = context;

  const activeOpponents = opponents.filter((o) => o.isActive);

  return `## Current Hand Situation

**Your Cards**: ${formatCards(holeCards)}
**Community Cards**: ${formatCards(communityCards)} (${round})
**Pot**: ${pot} chips
**Your Stack**: ${stack} chips
**To Call**: ${toCall} chips

**Opponents in Hand**:
${activeOpponents.map((o) => `- Seat ${o.index}: ${o.stack} chips, bet ${o.betSize}`).join("\n")}

**Legal Actions**: ${legalActions.actions.join(", ")}
${legalActions.minBet !== undefined ? `- Minimum bet/raise: ${legalActions.minBet}` : ""}
${legalActions.maxBet !== undefined ? `- Maximum bet/raise: ${legalActions.maxBet} (all-in)` : ""}

Use the available tools if you need more context about previous hands or game standings.
Then make your decision.`;
}

// Create AI decision with tools
export async function createAIDecision(
  playerIndex: number,
  model: string,
  context: AIContext,
  storage: Storage,
  runId: string,
  currentHandActions: { playerIndex: number; action: string; amount?: number }[],
  raiseCapReached: boolean = false
): Promise<AIDecision> {
  const startTime = Date.now();
  const toolCallsLog: AIToolCall[] = [];
  const totalPlayers = context.opponents.length + 1;

  // Define tools for the AI agent
  const tools = {
    getPreviousHands: tool({
      description: "Get history of previous hands in this game",
      inputSchema: z.object({
        limit: z
          .number()
          .min(1)
          .max(20)
          .default(5)
          .describe("Number of recent hands to retrieve"),
      }),
      execute: async ({ limit }) => {
        const hands = await storage.listHands(runId);
        const recent = hands.slice(-(limit ?? 5));

        const histories = await Promise.all(
          recent.map((h) => storage.loadHandHistory(runId, h.handNumber))
        );

        const result = histories
          .filter((h): h is NonNullable<typeof h> => h !== null)
          .map((h) => ({
            handNumber: h.handNumber,
            winners: h.winners.map((w) => ({
              index: w.playerIndex,
              amount: w.amountWon,
            })),
            showdownHands: h.winners.map((w) => ({
              playerIndex: w.playerIndex,
              ranking: HandRanking[w.handRanking],
            })),
            significantActions: h.actions
              .filter((a) => a.action === "raise" || a.action === "bet")
              .map((a) => ({
                player: a.playerIndex,
                action: a.action,
                amount: a.amount,
                round: a.round,
              })),
          }));

        toolCallsLog.push({
          name: "getPreviousHands",
          input: { limit },
          output: result,
        });

        return result;
      },
    }),

    getGameStandings: tool({
      description: "Get current chip standings for all players",
      inputSchema: z.object({}),
      execute: async () => {
        const state = await storage.loadGameState(runId);
        if (!state) return [];

        const result = state.players
          .filter((p) => !p.isEliminated)
          .sort((a, b) => b.stack - a.stack)
          .map((p, rank) => ({
            rank: rank + 1,
            playerIndex: p.index,
            stack: p.stack,
            isMe: p.index === playerIndex,
          }));

        toolCallsLog.push({
          name: "getGameStandings",
          input: {},
          output: result,
        });

        return result;
      },
    }),

    getMyHandActions: tool({
      description: "Get all actions you have taken in the current hand",
      inputSchema: z.object({}),
      execute: async () => {
        const result = currentHandActions.filter(
          (a) => a.playerIndex === playerIndex
        );

        toolCallsLog.push({
          name: "getMyHandActions",
          input: {},
          output: result,
        });

        return result;
      },
    }),
  };

  try {
    const result = await generateText({
      model: gateway(model),
      system: buildSystemPrompt(playerIndex, context, totalPlayers, raiseCapReached),
      prompt: buildDecisionPrompt(context),
      tools,
      output: Output.object({
        schema: z.object({
          action: z.enum(["fold", "check", "call", "bet", "raise"]),
          amount: z.number().nullable(),
          reasoning: z.string(),
        }),
      }),
      stopWhen: stepCountIs(5),
    });

    // Extract structured decision directly from output
    const output = result.output;
    if (!output) {
      throw new Error("No structured output received from AI");
    }

    const decision: AIDecision = {
      action: output.action as PokerAction,
      amount: output.amount ?? undefined,
      reasoning: output.reasoning,
    };

    // Log complete decision with prompt, tool calls, and reasoning
    await storage.appendLog(runId, {
      type: "decision",
      timestamp: new Date().toISOString(),
      handNumber: context.handNumber,
      playerIndex,
      model,
      holeCards: context.holeCards,
      prompt: buildDecisionPrompt(context),
      toolCalls: toolCallsLog.length > 0 ? toolCallsLog : undefined,
      decision,
      durationMs: Date.now() - startTime,
    });

    return decision;
  } catch (error) {
    console.error(`AI decision error for player ${playerIndex}:`, error);

    // Fallback decision: check if possible, otherwise fold
    const fallbackDecision: AIDecision = {
      action: context.legalActions.actions.includes("check") ? "check" : "fold",
      reasoning: `Error occurred, falling back to safe action: ${error instanceof Error ? error.message : "Unknown error"}`,
    };

    // Log the fallback
    await storage.appendLog(runId, {
      type: "decision",
      timestamp: new Date().toISOString(),
      handNumber: context.handNumber,
      playerIndex,
      model,
      decision: fallbackDecision,
      durationMs: Date.now() - startTime,
    });

    return fallbackDecision;
  }
}

// Validate that decision is legal
export function validateDecision(
  decision: AIDecision,
  legalActions: { actions: PokerAction[]; minBet?: number; maxBet?: number }
): AIDecision {
  // Check if action is legal
  if (!legalActions.actions.includes(decision.action)) {
    // Fallback to first legal action
    const fallbackAction = legalActions.actions[0] ?? "fold";
    return {
      action: fallbackAction,
      amount:
        (fallbackAction === "bet" || fallbackAction === "raise") &&
        legalActions.minBet !== undefined
          ? legalActions.minBet
          : undefined,
      reasoning: `${decision.reasoning} [Action ${decision.action} was invalid, using ${fallbackAction}]`,
    };
  }

  // Validate amount for bet/raise
  if (decision.action === "bet" || decision.action === "raise") {
    if (decision.amount === undefined && legalActions.minBet !== undefined) {
      return {
        ...decision,
        amount: legalActions.minBet,
      };
    }
    if (
      decision.amount !== undefined &&
      legalActions.minBet !== undefined &&
      decision.amount < legalActions.minBet
    ) {
      return {
        ...decision,
        amount: legalActions.minBet,
      };
    }
    if (
      decision.amount !== undefined &&
      legalActions.maxBet !== undefined &&
      decision.amount > legalActions.maxBet
    ) {
      return {
        ...decision,
        amount: legalActions.maxBet,
      };
    }
  }

  return decision;
}
