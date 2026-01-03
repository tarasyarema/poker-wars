# 2026-01-03: AI Poker Game Service Implementation

## Summary

Built a complete poker game service where AI models compete against each other in Texas Hold'em tournaments using Bun, poker-ts, and Vercel AI SDK with AI Gateway.

## Files Created

```
be/
├── src/
│   ├── types.ts      # TypeScript types & Zod schemas for config, game state, hands, AI
│   ├── config.ts     # Config loading/validation from config.json
│   ├── storage.ts    # File persistence (game.json, hand-*.json, logs.jsonl)
│   ├── ai-agent.ts   # AI player agents with tools for querying game history
│   ├── game.ts       # Game orchestration loop with poker-ts integration
│   ├── api.ts        # Type-safe API routes
│   └── index.ts      # Entry point with Bun.serve() on port 6010
├── config.json       # Game configuration (chips, blinds, players/models)
├── runs/.gitkeep     # Directory for game run data (git tracked)
├── .env.example      # Environment variable template
└── package.json      # Added dev/start/typecheck scripts
```

## Key Features

- **AI Agents with Tools**: Each AI player has access to:
  - `getPreviousHands` - Query hand history
  - `getGameStandings` - Current chip standings
  - `getMyHandActions` - Actions taken in current hand

- **Configurable Blind Structure**: Blinds increase based on `handsUntilIncrease` in config

- **Player Elimination**: Players removed when stack reaches 0, game ends with 1 remaining

- **Storage Structure** (`runs/yyyy-mm-dd-<short_id>/`):
  - `game.json` - Current game state (updated after each action)
  - `hand-<n>.json` - Complete hand history
  - `logs.jsonl` - AI reasoning logs (streaming JSONL)

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/game` | GET | Current game state |
| `/api/game/start` | POST | Start a new game |
| `/api/hands` | GET | List completed hands |
| `/api/hands/:id` | GET | Specific hand details |
| `/api/logs/stream` | GET | SSE stream of AI logs |
| `/health` | GET | Health check |

## Configuration

```json
{
  "initialChips": 1000,
  "blindStructure": [
    { "smallBlind": 10, "bigBlind": 20, "handsUntilIncrease": 10 }
  ],
  "players": [
    { "index": 0, "model": "google/gemini-3-flash" },
    { "index": 1, "model": "anthropic/claude-haiku-4.5" },
    { "index": 2, "model": "openai/gpt-5-mini" }
  ]
}
```

## Dependencies Added

- `@ai-sdk/gateway` - Vercel AI Gateway provider
- `zod` - Schema validation

## Running

```bash
# Set up environment
cp .env.example .env
# Add VERCEL_AI_GATEWAY_API_KEY

# Start server
bun run dev

# Trigger a game
curl -X POST http://localhost:6010/api/game/start
```

## Next Steps

- Frontend to display game state and stream logs
- More sophisticated AI prompts/strategies
- Game replay functionality
- Multiple concurrent games support
