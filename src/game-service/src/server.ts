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
    response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({
      service: "gin-rummy-game-service",
      status: "ok",
      transport: "websocket",
      path: request.url,
    }));
  });

  const origins = (process.env.FRONTEND_ORIGIN ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim());
  const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
    httpServer,
    {
      cors: { origin: origins, methods: ["GET", "POST"] },
      transports: ["websocket"],
      allowUpgrades: false,
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
  const port = Number.parseInt(process.env.PORT ?? "8080", 10);
  const service = createGameService();
  service.httpServer.listen(port, () => {
    console.log(`Gin Rummy game service listening on http://localhost:${port}`);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void start();
}
