# Poker Wars API Documentation

**Last Updated:** 2026-01-03

API for the AI Poker Tournament backend. Use this to build a Twitch-style viewer that displays the game in real-time.

## Base URL

```
http://localhost:3000
```

---

## Endpoints

### GET /api/game

Returns the current game state, active hand info, and completed hand summaries.

**Response:**

```json
{
  "success": true,
  "data": {
    "game": {
      "runId": "2026-01-03-a1b2c3d4",
      "status": "in_progress",
      "currentHandNumber": 5,
      "players": [
        {
          "index": 0,
          "model": "anthropic/claude-sonnet-4",
          "stack": 1250,
          "totalChips": 1250,
          "betSize": 50,
          "isEliminated": false,
          "isActive": true
        }
      ],
      "blinds": {
        "smallBlind": 10,
        "bigBlind": 20,
        "currentLevel": 0,
        "handsUntilNext": 5
      },
      "buttonPosition": 1,
      "winner": null,
      "startedAt": "2026-01-03T10:30:00Z",
      "completedAt": null
    },
    "currentHand": {
      "handNumber": 5,
      "round": "flop",
      "communityCards": [
        { "rank": "K", "suit": "hearts" },
        { "rank": "Q", "suit": "diamonds" },
        { "rank": "7", "suit": "clubs" }
      ],
      "pots": [{ "size": 150, "eligiblePlayers": [0, 2] }],
      "playerToAct": 2,
      "players": [
        {
          "index": 0,
          "holeCards": [
            { "rank": "A", "suit": "spades" },
            { "rank": "K", "suit": "clubs" }
          ],
          "stack": 900,
          "betSize": 50,
          "isActive": true
        }
      ],
      "legalActions": {
        "actions": ["fold", "check", "raise"],
        "minBet": 20,
        "maxBet": 900
      }
    },
    "hands": [
      { "handNumber": 1, "winners": [1], "timestamp": "2026-01-03T10:30:05Z" }
    ]
  }
}
```

---

### POST /api/game/start

Starts a new game. Optionally accepts a config override.

**Request Body (optional):**

```json
{
  "config": {
    "initialChips": 1000,
    "blindStructure": [
      { "smallBlind": 10, "bigBlind": 20, "handsUntilIncrease": 10 },
      { "smallBlind": 25, "bigBlind": 50, "handsUntilIncrease": 10 }
    ],
    "players": [
      { "index": 0, "model": "anthropic/claude-sonnet-4" },
      { "index": 1, "model": "openai/gpt-4o" },
      { "index": 2, "model": "google/gemini-2.5-flash" }
    ]
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "runId": "2026-01-03-a1b2c3d4",
    "game": { ... }
  }
}
```

---

### GET /api/hands

Returns a list of completed hand summaries.

**Response:**

```json
{
  "success": true,
  "data": {
    "hands": [
      { "handNumber": 1, "winners": [0], "timestamp": "2026-01-03T10:30:05Z" },
      { "handNumber": 2, "winners": [1], "timestamp": "2026-01-03T10:30:15Z" }
    ],
    "total": 2
  }
}
```

---

### GET /api/hands/:id

Returns the full history of a specific hand.

**Example:** `GET /api/hands/1`

**Response:**

```json
{
  "success": true,
  "data": {
    "hand": {
      "handNumber": 1,
      "players": [
        {
          "index": 0,
          "startingStack": 1000,
          "holeCards": [
            { "rank": "A", "suit": "spades" },
            { "rank": "K", "suit": "clubs" }
          ],
          "endingStack": 1200
        }
      ],
      "communityCards": {
        "flop": [
          { "rank": "K", "suit": "hearts" },
          { "rank": "Q", "suit": "diamonds" },
          { "rank": "7", "suit": "clubs" }
        ],
        "turn": { "rank": "2", "suit": "spades" },
        "river": { "rank": "3", "suit": "hearts" }
      },
      "actions": [
        {
          "playerIndex": 0,
          "action": "raise",
          "amount": 100,
          "timestamp": "2026-01-03T10:30:05Z",
          "round": "preflop",
          "durationMs": 234
        }
      ],
      "pots": [{ "size": 300, "eligiblePlayers": [0, 1] }],
      "winners": [
        {
          "playerIndex": 0,
          "handRanking": 6,
          "handDescription": "Full House",
          "cards": [...],
          "amountWon": 300
        }
      ],
      "blinds": { "smallBlind": 10, "bigBlind": 20 },
      "buttonPosition": 1,
      "timestamp": "2026-01-03T10:30:05Z"
    }
  }
}
```

---

### GET /api/logs/stream

**Server-Sent Events (SSE)** stream of real-time AI reasoning logs.

- Sends keep-alive comments every 30 seconds to prevent timeout
- Connection stays open indefinitely until client disconnects

**Usage:**

```typescript
const eventSource = new EventSource('/api/logs/stream');

eventSource.onmessage = (event) => {
  const log = JSON.parse(event.data);
  console.log(log);
};

eventSource.onerror = (error) => {
  console.error('SSE error:', error);
};
```

**Event Types:**

#### `start` - Decision process begins

```json
{
  "type": "start",
  "timestamp": "2026-01-03T10:30:05Z",
  "handNumber": 1,
  "playerIndex": 0,
  "model": "anthropic/claude-sonnet-4",
  "prompt": "Your hole cards are AS KS..."
}
```

#### `reasoning` - Streaming reasoning chunks

```json
{
  "type": "reasoning",
  "timestamp": "2026-01-03T10:30:05.234Z",
  "handNumber": 1,
  "playerIndex": 0,
  "model": "anthropic/claude-sonnet-4",
  "reasoning": "Looking at my hand AK with a King on the flop..."
}
```

#### `tool_call` - AI tool invocation

```json
{
  "type": "tool_call",
  "timestamp": "2026-01-03T10:30:05.456Z",
  "handNumber": 1,
  "playerIndex": 0,
  "model": "anthropic/claude-sonnet-4",
  "toolCall": {
    "name": "getPreviousHands",
    "input": { "limit": 5 },
    "output": [...]
  }
}
```

#### `decision` - Final action

```json
{
  "type": "decision",
  "timestamp": "2026-01-03T10:30:06Z",
  "handNumber": 1,
  "playerIndex": 0,
  "model": "anthropic/claude-sonnet-4",
  "decision": {
    "action": "raise",
    "amount": 250,
    "reasoning": "Full reasoning text..."
  },
  "durationMs": 1234
}
```

---

### GET /health

Health check endpoint.

**Response:**

```json
{ "status": "ok" }
```

---

## Data Types

### Card

```typescript
interface Card {
  rank: "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K" | "A";
  suit: "clubs" | "diamonds" | "hearts" | "spades";
}
```

### PokerAction

```typescript
type PokerAction = "fold" | "check" | "call" | "bet" | "raise";
```

### BettingRound

```typescript
type BettingRound = "preflop" | "flop" | "turn" | "river";
```

### GameStatus

```typescript
type GameStatus = "waiting" | "in_progress" | "completed";
```

### HandRanking

| Value | Name           |
|-------|----------------|
| 0     | HIGH_CARD      |
| 1     | PAIR           |
| 2     | TWO_PAIR       |
| 3     | THREE_OF_A_KIND|
| 4     | STRAIGHT       |
| 5     | FLUSH          |
| 6     | FULL_HOUSE     |
| 7     | FOUR_OF_A_KIND |
| 8     | STRAIGHT_FLUSH |
| 9     | ROYAL_FLUSH    |

---

## Frontend Integration Guide

### Polling for Game State

Poll `/api/game` every 500ms to get the current state:

```typescript
const pollInterval = 500;

async function pollGameState() {
  const res = await fetch('/api/game');
  const { success, data, error } = await res.json();

  if (success) {
    updateUI(data);
  }
}

setInterval(pollGameState, pollInterval);
```

### Streaming AI Logs

Connect to the SSE stream for real-time AI reasoning:

```typescript
function connectToLogs() {
  const eventSource = new EventSource('/api/logs/stream');

  eventSource.onmessage = (event) => {
    const log = JSON.parse(event.data);

    switch (log.type) {
      case 'start':
        showPlayerThinking(log.playerIndex, log.model);
        break;
      case 'reasoning':
        appendReasoning(log.playerIndex, log.reasoning);
        break;
      case 'tool_call':
        showToolCall(log.playerIndex, log.toolCall);
        break;
      case 'decision':
        showDecision(log.playerIndex, log.decision);
        break;
    }
  };

  eventSource.onerror = () => {
    // Reconnect after a delay
    setTimeout(connectToLogs, 2000);
  };
}
```

### Display Recommendations

For a Twitch-style viewer:

1. **Table View**: Show player seats around a poker table with:
   - Player name (model name like "claude-sonnet-4")
   - Current stack
   - Hole cards (when available)
   - Bet amount
   - Active/folded status

2. **Community Cards**: Display in the center with the pot amount

3. **Action Log**: Scrolling panel showing recent actions

4. **AI Reasoning Panel**: Show streaming thoughts from the current player:
   - Model name and avatar
   - Reasoning text as it streams
   - Tool calls (e.g., "Checking previous hands...")
   - Final decision highlighted

5. **Hand History**: Sidebar or drawer with completed hands

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

| Status | Meaning                      |
|--------|------------------------------|
| 400    | Bad request / invalid input  |
| 404    | Not found / no game running  |
| 500    | Internal server error        |
