import type { GameState, HandHistory, AILogEntry, HandSummary, GameSummary } from "./types";

const RUNS_DIR = "./runs";

export interface Storage {
  createRun(): Promise<string>;
  getRunPath(runId: string): string;

  // Game state
  saveGameState(runId: string, state: GameState): Promise<void>;
  loadGameState(runId: string): Promise<GameState | null>;
  findLatestIncompleteGame(): Promise<string | null>;

  // Hand histories
  saveHandHistory(runId: string, hand: HandHistory): Promise<void>;
  loadHandHistory(runId: string, handNumber: number): Promise<HandHistory | null>;
  listHands(runId: string): Promise<HandSummary[]>;

  // Games list
  listGames(): Promise<GameSummary[]>;

  // Logs
  appendLog(runId: string, entry: AILogEntry): Promise<void>;
  streamLogs(runId: string): AsyncGenerator<AILogEntry>;
  getLogFilePath(runId: string): string;
}

export function createStorage(): Storage {
  return {
    async createRun(): Promise<string> {
      const date = new Date().toISOString().split("T")[0];
      const shortId = crypto.randomUUID().slice(0, 8);
      const runId = `${date}-${shortId}`;
      const runPath = `${RUNS_DIR}/${runId}`;

      await Bun.$`mkdir -p ${runPath}`;

      return runId;
    },

    getRunPath(runId: string): string {
      return `${RUNS_DIR}/${runId}`;
    },

    async saveGameState(runId: string, state: GameState): Promise<void> {
      const path = `${RUNS_DIR}/${runId}/game.json`;
      await Bun.write(path, JSON.stringify(state, null, 2));
    },

    async loadGameState(runId: string): Promise<GameState | null> {
      const path = `${RUNS_DIR}/${runId}/game.json`;
      const file = Bun.file(path);

      if (!(await file.exists())) {
        return null;
      }

      return (await file.json()) as GameState;
    },

    async findLatestIncompleteGame(): Promise<string | null> {
      // Check if runs directory exists using fs
      const { existsSync } = await import("node:fs");
      if (!existsSync(RUNS_DIR)) {
        return null;
      }

      const glob = new Bun.Glob("*/game.json");
      let latestRunId: string | null = null;
      let latestDate = "";

      for await (const file of glob.scan(RUNS_DIR)) {
        const runId = file.split("/")[0];
        if (!runId) continue;

        try {
          const state = await this.loadGameState(runId);
          if (state?.status === "in_progress" && runId > latestDate) {
            latestDate = runId;
            latestRunId = runId;
          }
        } catch {
          // Skip corrupted files
        }
      }

      return latestRunId;
    },

    async saveHandHistory(runId: string, hand: HandHistory): Promise<void> {
      const path = `${RUNS_DIR}/${runId}/hand-${hand.handNumber}.json`;
      await Bun.write(path, JSON.stringify(hand, null, 2));
    },

    async loadHandHistory(
      runId: string,
      handNumber: number
    ): Promise<HandHistory | null> {
      const path = `${RUNS_DIR}/${runId}/hand-${handNumber}.json`;
      const file = Bun.file(path);

      if (!(await file.exists())) {
        return null;
      }

      return (await file.json()) as HandHistory;
    },

    async listHands(runId: string): Promise<HandSummary[]> {
      const runPath = `${RUNS_DIR}/${runId}`;
      const glob = new Bun.Glob("hand-*.json");
      const hands: HandSummary[] = [];

      for await (const file of glob.scan(runPath)) {
        const match = file.match(/hand-(\d+)\.json$/);
        if (match && match[1]) {
          const handNumber = parseInt(match[1], 10);
          const history = await this.loadHandHistory(runId, handNumber);
          if (history) {
            const potSize = history.winners.reduce((sum, w) => sum + w.amountWon, 0);
            hands.push({
              handNumber,
              winners: history.winners.map((w) => w.playerIndex),
              potSize,
              timestamp: history.timestamp,
            });
          }
        }
      }

      return hands.sort((a, b) => a.handNumber - b.handNumber);
    },

    async listGames(): Promise<GameSummary[]> {
      const { existsSync } = await import("node:fs");
      if (!existsSync(RUNS_DIR)) {
        return [];
      }

      const glob = new Bun.Glob("*/game.json");
      const games: GameSummary[] = [];

      for await (const file of glob.scan(RUNS_DIR)) {
        const runId = file.split("/")[0];
        if (!runId) continue;

        try {
          const state = await this.loadGameState(runId);
          if (state) {
            // Count hand files to get hands played
            const handGlob = new Bun.Glob("hand-*.json");
            let handsPlayed = 0;
            for await (const _ of handGlob.scan(`${RUNS_DIR}/${runId}`)) {
              handsPlayed++;
            }

            // Find winner info
            let winner: GameSummary["winner"] = null;
            if (state.winner !== null) {
              const winnerPlayer = state.players.find(p => p.index === state.winner);
              if (winnerPlayer) {
                winner = {
                  playerIndex: state.winner,
                  model: winnerPlayer.model,
                };
              }
            }

            games.push({
              runId: state.runId,
              status: state.status,
              winner,
              startedAt: state.startedAt,
              completedAt: state.completedAt,
              handsPlayed,
              playerCount: state.players.length,
            });
          }
        } catch {
          // Skip corrupted files
        }
      }

      // Sort by startedAt descending (newest first)
      return games.sort((a, b) =>
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      );
    },

    async appendLog(runId: string, entry: AILogEntry): Promise<void> {
      const path = `${RUNS_DIR}/${runId}/logs.jsonl`;
      const file = Bun.file(path);
      const line = JSON.stringify(entry) + "\n";

      if (await file.exists()) {
        const existing = await file.text();
        await Bun.write(path, existing + line);
      } else {
        await Bun.write(path, line);
      }
    },

    async *streamLogs(runId: string): AsyncGenerator<AILogEntry> {
      const path = `${RUNS_DIR}/${runId}/logs.jsonl`;
      const file = Bun.file(path);

      if (!(await file.exists())) {
        return;
      }

      const text = await file.text();
      const lines = text.trim().split("\n").filter(Boolean);

      for (const line of lines) {
        yield JSON.parse(line) as AILogEntry;
      }
    },

    getLogFilePath(runId: string): string {
      return `${RUNS_DIR}/${runId}/logs.jsonl`;
    },
  };
}

// Utility function for watching logs (used by SSE endpoint)
export async function watchLogs(
  runId: string,
  onEntry: (entry: AILogEntry) => void,
  signal: AbortSignal
): Promise<void> {
  const storage = createStorage();
  const path = storage.getLogFilePath(runId);
  let lastSize = 0;

  // Check if file exists, create empty if not
  const file = Bun.file(path);
  if (!(await file.exists())) {
    await Bun.write(path, "");
  }

  // Poll for new content
  const poll = async () => {
    if (signal.aborted) return;

    const file = Bun.file(path);
    if (await file.exists()) {
      const currentSize = file.size;

      if (currentSize > lastSize) {
        const text = await file.text();
        const lines = text.trim().split("\n").filter(Boolean);

        // Process only new lines
        const newLines = lines.slice(
          lines.findIndex(
            (_, i) =>
              lines
                .slice(0, i + 1)
                .reduce((acc, l) => acc + l.length + 1, 0) > lastSize
          )
        );

        for (const line of newLines) {
          try {
            const entry = JSON.parse(line) as AILogEntry;
            onEntry(entry);
          } catch {
            // Skip malformed lines
          }
        }

        lastSize = currentSize;
      }
    }

    // Continue polling if not aborted
    if (!signal.aborted) {
      setTimeout(poll, 500);
    }
  };

  poll();
}
