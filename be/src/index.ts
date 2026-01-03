import { loadConfig } from "./config";
import { createStorage } from "./storage";
import { createGameModule } from "./game";
import { createApiRoutes } from "./api";

const PORT = parseInt(process.env.PORT || "6010", 10);

// CORS headers for cross-origin requests
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Helper to add CORS headers to a response
function withCors(response: Response): Response {
  const newHeaders = new Headers(response.headers);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    newHeaders.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

// Helper to wrap a handler with CORS
function corsHandler(handler: (req: Request) => Response | Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    // Handle preflight OPTIONS request
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    const response = await handler(req);
    return withCors(response);
  };
}

async function main() {
  console.log("Initializing Poker Wars server...");

  // Initialize modules
  const storage = createStorage();
  const game = createGameModule(storage);

  // Check for incomplete game to resume
  const incompleteRunId = await storage.findLatestIncompleteGame();
  if (incompleteRunId) {
    console.log(`Found incomplete game: ${incompleteRunId}`);
    try {
      const config = await loadConfig();
      const resumed = await game.resumeGame(incompleteRunId, config);
      if (resumed) {
        console.log(`Resumed game: ${incompleteRunId}`);
      }
    } catch (err) {
      console.error("Failed to resume game:", err);
    }
  }

  // Create API routes
  const routes = createApiRoutes(game, storage, loadConfig);

  // Start server
  Bun.serve({
    port: PORT,
    idleTimeout: 255, // Max value (seconds) - needed for SSE connections
    routes: {
      // Game state
      "/api/game": {
        GET: corsHandler(routes["/api/game"]!.GET!),
        OPTIONS: corsHandler(() => new Response(null, { status: 204 })),
      },

      // Start game
      "/api/game/start": {
        POST: corsHandler(routes["/api/game/start"]!.POST!),
        OPTIONS: corsHandler(() => new Response(null, { status: 204 })),
      },

      // Games list (all games history)
      "/api/games": {
        GET: corsHandler(routes["/api/games"]!.GET!),
        OPTIONS: corsHandler(() => new Response(null, { status: 204 })),
      },

      // Hands list
      "/api/hands": {
        GET: corsHandler(routes["/api/hands"]!.GET!),
        OPTIONS: corsHandler(() => new Response(null, { status: 204 })),
      },

      // SSE logs stream
      "/api/logs/stream": {
        GET: corsHandler(routes["/api/logs/stream"]!.GET!),
        OPTIONS: corsHandler(() => new Response(null, { status: 204 })),
      },

      // Health check
      "/health": {
        GET: corsHandler(() => Response.json({ status: "ok" })),
      },
    },

    // Handle dynamic routes (hands/:id) and OPTIONS preflight
    fetch(req) {
      const url = new URL(req.url);
      const pathname = url.pathname;

      // Handle OPTIONS preflight for any route
      if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: CORS_HEADERS });
      }

      // Match /api/hands/:id pattern
      const handsMatch = pathname.match(/^\/api\/hands\/(\d+)$/);
      if (handsMatch && req.method === "GET") {
        const handler = routes["/api/hands/:id"]?.GET;
        if (handler) {
          return corsHandler(handler)(req);
        }
      }

      return withCors(new Response("Not Found", { status: 404 }));
    },

    development: {
      hmr: true,
      console: true,
    },
  });

  console.log(`Poker Wars server running on http://localhost:${PORT}`);
  console.log(`
Available endpoints:
  GET  /api/game        - Current game state
  POST /api/game/start  - Start a new game
  GET  /api/games       - List all games
  GET  /api/hands       - List completed hands
  GET  /api/hands/:id   - Get specific hand details
  GET  /api/logs/stream - SSE stream of AI logs
  GET  /health          - Health check
`);
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
