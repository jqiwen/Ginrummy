import type { Server } from "socket.io";
import { gameStore, GameStore, StoreError } from "../state/gameStore.js";
import type {
  ClientToServerEvents,
  InterServerEvents,
  RoomMembership,
  ServerToClientEvents,
  SocketData,
} from "../types/socketEvents.js";
import {
  handleError,
  isPlayerId,
  isRecord,
  ok,
  requireString,
  type GameSocket,
} from "./handlerUtils.js";

type GameServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

function membership(matchId: string, playerId: "0" | "1", bot: boolean): RoomMembership {
  return { matchId, playerId, bot };
}

export function registerRoomHandlers(
  io: GameServer,
  socket: GameSocket,
  store: GameStore = gameStore,
): void {
  socket.on("room:create", async (payload, ack) => {
    try {
      if (!isRecord(payload) || typeof payload.bot !== "boolean") {
        throw new StoreError(1, "Malformed room creation payload");
      }
      const room = store.createRoom(payload.bot, socket.id);
      socket.data.matchId = room.matchId;
      socket.data.playerId = "1";
      await socket.join(room.matchId);
      const data = membership(room.matchId, "1", room.bot);
      ack(ok(0, "OK", data));
      socket.emit("room:created", data);
    } catch (error) {
      handleError(socket, ack, error);
    }
  });

  socket.on("room:join", async (payload, ack) => {
    try {
      if (!isRecord(payload)) {
        throw new StoreError(1, "Malformed room join payload");
      }
      const matchId = requireString(payload.matchId, "match ID");
      const room = store.joinRoom(matchId, socket.id);
      socket.data.matchId = matchId;
      socket.data.playerId = "0";
      await socket.join(matchId);
      const data = membership(matchId, "0", room.bot);
      ack(ok(200, "Joined", data));
      socket.emit("room:joined", data);
      socket.to(matchId).emit("room:player-joined", { matchId, playerId: "0" });
    } catch (error) {
      handleError(socket, ack, error);
    }
  });

  socket.on("room:resume", async (payload, ack) => {
    try {
      if (!isRecord(payload)) {
        throw new StoreError(1, "Malformed room resume payload");
      }
      const matchId = requireString(payload.matchId, "match ID");
      if (!isPlayerId(payload.playerId)) {
        throw new StoreError(1, "Invalid player");
      }
      const room = store.resumeRoom(matchId, payload.playerId, socket.id);
      socket.data.matchId = matchId;
      socket.data.playerId = payload.playerId;
      await socket.join(matchId);
      ack(ok(0, "Room resumed", membership(matchId, payload.playerId, room.bot)));
    } catch (error) {
      handleError(socket, ack, error);
    }
  });

  socket.on("room:leave", async (payload, ack) => {
    try {
      if (!isRecord(payload)) {
        throw new StoreError(1, "Malformed room leave payload");
      }
      const matchId = requireString(payload.matchId, "match ID");
      if (!isPlayerId(payload.playerId)) {
        throw new StoreError(1, "Invalid player");
      }
      store.requirePlayer(socket.id, matchId, payload.playerId);
      store.leaveRoom(socket.id);
      await socket.leave(matchId);
      socket.to(matchId).emit("room:player-left", { matchId, playerId: payload.playerId });
      ack(ok(0, "Room left"));
    } catch (error) {
      handleError(socket, ack, error);
    }
  });

  socket.on("disconnect", () => {
    const left = store.leaveRoom(socket.id);
    if (left) {
      io.to(left.matchId).emit("room:player-left", left);
    }
  });
}
