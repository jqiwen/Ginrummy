import "dotenv/config";
import { createServer as createHttpServer, type Server as HttpServer } from "node:http";
import { pathToFileURL } from "node:url";
import { Server } from "socket.io";
import { registerAuthHandlers } from "./socket/authHandlers.js";
import { registerGameHandlers } from "./socket/gameHandlers.js";
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

export function createGameService(store: GameStore = gameStore): GameService {
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

  const origins = [
    "http://localhost:3000",
    "https://ginrummy.jqiwen.com",
    ...(process.env.FRONTEND_ORIGIN ?? "").split(","),
  ]
    .map((origin) => origin.trim())
    .filter((origin, index, allOrigins) => origin.length > 0 && allOrigins.indexOf(origin) === index);
  const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
    httpServer,
    {
      cors: { origin: origins, methods: ["GET", "POST"] },
      transports: ["websocket"],
      allowUpgrades: false,
      allowRequest: (request, callback) => {
        const origin = request.headers.origin;
        callback(null, origin === undefined || origins.includes(origin));
      },
    },
  );

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
    registerAuthHandlers(io, socket);
    registerRoomHandlers(io, socket, store);
    registerGameHandlers(io, socket, store);
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
  void start();
}
