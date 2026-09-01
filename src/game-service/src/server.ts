import "dotenv/config";
import { createServer as createHttpServer, type Server as HttpServer } from "node:http";
import { pathToFileURL } from "node:url";
import { Server } from "socket.io";
import { createSupabaseTokenVerifier, type TokenVerifier } from "./auth/supabaseTokenVerifier.js";
import { createSupabaseInviteRepository, type InviteRepository } from "./invites/inviteRepository.js";
import { registerGameHandlers } from "./socket/gameHandlers.js";
import { registerInviteHandlers, userChannel } from "./socket/inviteHandlers.js";
import { registerRoomHandlers } from "./socket/roomHandlers.js";
import { GameStore, gameStore } from "./state/gameStore.js";
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from "./types/socketEvents.js";

export interface GameService {
  httpServer: HttpServer;
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
}

export const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:3000",
] as const;

export function parseAllowedOrigins(configuredOrigins = ""): string[] {
  return [...DEFAULT_ALLOWED_ORIGINS, ...configuredOrigins.split(",")]
    .map((origin) => origin.trim())
    .filter((origin, index, allOrigins) => origin.length > 0 && allOrigins.indexOf(origin) === index);
}

export function createGameService(
  store: GameStore = gameStore,
  configuredOrigins = process.env.FRONTEND_ORIGIN ?? "",
  tokenVerifier: TokenVerifier = createSupabaseTokenVerifier(),
  inviteRepository: InviteRepository = createSupabaseInviteRepository(),
): GameService {
  const httpServer = createHttpServer((request, response) => {
    const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
    if (request.method === "GET" && pathname === "/health") {
      response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ status: "ok" }));
      return;
    }

    response.writeHead(404, { "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ error: "not_found" }));
  });

  const origins = parseAllowedOrigins(configuredOrigins);
  const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
    httpServer,
    {
      cors: { origin: origins, methods: ["GET", "POST"] },
      transports: ["websocket"],
      allowUpgrades: false,
      allowRequest: (request, callback) => {
        const origin = request.headers.origin;
        const allowed = origin === undefined || origins.includes(origin);

        if (!allowed) {
          const requestUrl = new URL(request.url ?? "/", "http://localhost");
          console.warn(
            "[game-service] rejected Socket.IO handshake",
            JSON.stringify({
              timestamp: new Date().toISOString(),
              origin,
              transport: requestUrl.searchParams.get("transport") ?? "unknown",
              path: requestUrl.pathname,
            }),
          );
        }

        callback(null, allowed);
      },
    },
  );

  io.use(async (socket, next) => {
    const accessToken: unknown = socket.handshake.auth.accessToken;
    if (accessToken === undefined || accessToken === null) {
      next();
      return;
    }

    if (typeof accessToken !== "string" || accessToken.trim() === "") {
      next(new Error("Invalid or expired access token"));
      return;
    }

    try {
      socket.data.user = await tokenVerifier.verifyAccessToken(accessToken);
      socket.data.accessToken = accessToken;
      next();
    } catch {
      console.warn(
        "[game-service] rejected unauthenticated Socket.IO handshake",
        JSON.stringify({ timestamp: new Date().toISOString(), reason: "token_verification_failed" }),
      );
      next(new Error("Invalid or expired access token"));
    }
  });

  io.on("connection", (socket) => {
    socket.use((packet, next) => {
      if (typeof packet.at(-1) !== "function") {
        socket.emit("game:error", {
          success: false,
          code: 1,
          message: "Socket requests require an acknowledgement callback",
        });
        return;
      }
      next();
    });
    registerRoomHandlers(io, socket, store);
    registerGameHandlers(io, socket, store);
    registerInviteHandlers(io, socket, inviteRepository, store);

    const user = socket.data.user;
    if (user) {
      void (async () => {
        await socket.join(userChannel(user.id));
        const active = store.resumeActiveRoom(user.id, socket.id);
        if (!active) return;
        socket.data.matchId = active.matchId;
        socket.data.playerId = active.playerId;
        await socket.join(active.matchId);
        socket.emit("match:ready", {
          inviteId: null,
          membership: { ...active, bot: false },
          opponent: null,
        });
      })();
    }
  });

  return { httpServer, io };
}

async function start(): Promise<void> {
  const port = Number(process.env.PORT) || 8080;
  const service = createGameService();
  service.httpServer.listen(port, "0.0.0.0", () => {
    console.log(`Game service listening on port ${port}`);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void start().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown startup error";
    console.error(`[game-service] Startup failed\n\n${message}`);
    process.exitCode = 1;
  });
}
