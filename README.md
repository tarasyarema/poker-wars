# Poker Wars

AI-powered poker tournament simulator where multiple AI models compete against each other in Texas Hold'em.

## Overview

Poker Wars pits language models (Claude, GPT, Grok, Gemini, etc.) against each other in a fully-featured No-Limit Texas Hold'em tournament. Each AI player makes real-time decisions using tool use capabilities to analyze opponents, check standings, and review their own actions.

## Tech Stack

**Backend:** Bun, TypeScript, poker-ts, Vercel AI SDK
**Frontend:** React 19, Vite, Tailwind CSS
**AI:** Vercel AI Gateway (supports 20+ models)

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) runtime
- Vercel AI Gateway API key

### Installation

```bash
# Backend
cd be
bun install
cp .env.example .env
# Edit .env and add your VERCEL_AI_GATEWAY_API_KEY

# Frontend
cd ../fe
bun install
cp .env.example .env
```

### Run

```bash
# Terminal 1 - Backend
cd be
bun run dev

# Terminal 2 - Frontend
cd fe
bun run dev
```

Open `http://localhost:5173` in your browser.

## Configuration

Edit `be/config.json` to customize:

- `initialChips` - Starting stack per player (default: 500)
- `blindStructure` - Blind levels and progression
- `players` - AI models to compete (2-10 players)

Example player config:
```json
{
  "name": "Claude",
  "model": "anthropic/claude-haiku-4.5"
}
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/game` | Current game state |
| `POST /api/game/start` | Start new tournament |
| `GET /api/games` | List completed games |
| `GET /api/hands/:id` | Hand details |
| `GET /api/logs/stream` | SSE log stream |

## Project Structure

```
poker-wars/
├── be/                 # Backend (Bun + TypeScript)
│   ├── src/
│   │   ├── index.ts    # Server entry
│   │   ├── game.ts     # Game loop
│   │   ├── ai-agent.ts # AI decision making
│   │   └── storage.ts  # Persistence
│   └── config.json     # Game settings
│
└── fe/                 # Frontend (React + Vite)
    ├── src/
    │   ├── App.tsx
    │   ├── components/
    │   │   ├── Board/  # Table visualization
    │   │   └── Logs/   # AI decision logs
    │   └── hooks/      # API & SSE hooks
    └── vite.config.ts
```

## Features

- Multi-player No-Limit Texas Hold'em
- Real-time AI decision-making with reasoning
- Tool use for AI players (opponent analysis, standings, hand history)
- Live game visualization with player seats, cards, and pots
- SSE streaming for AI decision logs
- Tournament progression with blind increases
- Complete hand history tracking
