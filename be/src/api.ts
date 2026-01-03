import type {
  ApiResponse,
  GameStateResponse,
  HandsListResponse,
  HandDetailResponse,
  StartGameResponse,
  GamesListResponse,
  GameConfig,
} from "./types";
import { GameConfigSchema } from "./types";
import type { Storage } from "./storage";
import { watchLogs } from "./storage";
import type { GameModule } from "./game";

// Helper to create JSON response with proper typing
function jsonResponse<T>(
  data: ApiResponse<T>,
  status: number = 200
): Response {
  return Response.json(data, { status });
}

// Helper to create error response
function errorResponse(error: string, status: number = 400): Response {
  return jsonResponse<never>({ success: false, error }, status);
}

// Helper to create success response
function successResponse<T>(data: T): Response {
  return jsonResponse<T>({ success: true, data });
}

export interface ApiRoutes {
  "/api/game": {
    GET: (req: Request) => Promise<Response>;
  };
  "/api/game/start": {
    POST: (req: Request) => Promise<Response>;
  };
  "/api/games": {
    GET: (req: Request) => Promise<Response>;
  };
  "/api/hands": {
    GET: (req: Request) => Promise<Response>;
  };
  "/api/hands/:id": {
    GET: (req: Request) => Promise<Response>;
  };
  "/api/logs/stream": {
    GET: (req: Request) => Response;
  };
}

export function createApiRoutes(
  game: GameModule,
  storage: Storage,
  loadConfig: () => Promise<GameConfig>
): Record<string, { GET?: (req: Request) => Response | Promise<Response>; POST?: (req: Request) => Response | Promise<Response> }> {
  return {
    "/api/game": {
      GET: async (req: Request): Promise<Response> => {
        const runId = game.getCurrentRunId();

        if (!runId) {
          return errorResponse("No game in progress", 404);
        }

        const state = await game.getGameState(runId);
        if (!state) {
          return errorResponse("Game state not found", 404);
        }

        const currentHand = game.getCurrentHandInfo();
        const hands = await storage.listHands(runId);

        const response: GameStateResponse = {
          game: state,
          currentHand: currentHand ?? undefined,
          hands,
        };

        return successResponse(response);
      },
    },

    "/api/game/start": {
      POST: async (req: Request): Promise<Response> => {
        // Check if game already in progress
        if (game.isRunning()) {
          return errorResponse("Game already in progress", 400);
        }

        let config: GameConfig;
        try {
          const body = (await req.json().catch(() => ({}))) as { config?: unknown };

          if (body.config) {
            // Validate provided config
            const result = GameConfigSchema.safeParse(body.config);
            if (!result.success) {
              const errors = result.error.issues
                .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
                .join(", ");
              return errorResponse(`Invalid config: ${errors}`, 400);
            }
            config = result.data;
          } else {
            // Use default config file
            config = await loadConfig();
          }
        } catch (e) {
          return errorResponse(
            `Failed to load config: ${e instanceof Error ? e.message : "Unknown error"}`,
            400
          );
        }

        try {
          const runId = await game.startGame(config);
          const state = await game.getGameState(runId);

          if (!state) {
            return errorResponse("Failed to get game state", 500);
          }

          const response: StartGameResponse = {
            runId,
            game: state,
          };

          return successResponse(response);
        } catch (e) {
          return errorResponse(
            `Failed to start game: ${e instanceof Error ? e.message : "Unknown error"}`,
            500
          );
        }
      },
    },

    "/api/games": {
      GET: async (req: Request): Promise<Response> => {
        const games = await storage.listGames();

        const response: GamesListResponse = {
          games,
          total: games.length,
        };

        return successResponse(response);
      },
    },

    "/api/hands": {
      GET: async (req: Request): Promise<Response> => {
        const runId = game.getCurrentRunId();

        if (!runId) {
          return errorResponse("No game in progress", 404);
        }

        const hands = await storage.listHands(runId);

        const response: HandsListResponse = {
          hands,
          total: hands.length,
        };

        return successResponse(response);
      },
    },

    "/api/hands/:id": {
      GET: async (req: Request): Promise<Response> => {
        const runId = game.getCurrentRunId();

        if (!runId) {
          return errorResponse("No game in progress", 404);
        }

        // Extract hand ID from URL
        const url = new URL(req.url);
        const pathParts = url.pathname.split("/");
        const handIdStr = pathParts[pathParts.length - 1] ?? "";
        const handNumber = parseInt(handIdStr, 10);

        if (isNaN(handNumber) || handNumber < 1) {
          return errorResponse("Invalid hand number", 400);
        }

        const hand = await storage.loadHandHistory(runId, handNumber);

        if (!hand) {
          return errorResponse("Hand not found", 404);
        }

        const response: HandDetailResponse = { hand };

        return successResponse(response);
      },
    },

    "/api/logs/stream": {
      GET: (req: Request): Response => {
        const runId = game.getCurrentRunId();

        if (!runId) {
          return errorResponse("No game in progress", 404);
        }

        const stream = new ReadableStream({
          async start(controller) {
            const encoder = new TextEncoder();

            // Send existing logs first
            for await (const entry of storage.streamLogs(runId)) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(entry)}\n\n`)
              );
            }

            // Watch for new logs
            const abortController = new AbortController();

            // Keep-alive: send a comment every 30 seconds to prevent timeout
            const keepAliveInterval = setInterval(() => {
              try {
                controller.enqueue(encoder.encode(": keep-alive\n\n"));
              } catch {
                clearInterval(keepAliveInterval);
              }
            }, 30000);

            req.signal.addEventListener("abort", () => {
              clearInterval(keepAliveInterval);
              abortController.abort();
              controller.close();
            });

            watchLogs(
              runId,
              (entry) => {
                try {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify(entry)}\n\n`)
                  );
                } catch {
                  // Stream closed
                  clearInterval(keepAliveInterval);
                }
              },
              abortController.signal
            );
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
          },
        });
      },
    },
  };
}
