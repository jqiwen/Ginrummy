import type { Server } from "socket.io";
import { authentication, type Authentication } from "../state/authentication.js";
import { StoreError } from "../state/gameStore.js";
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from "../types/socketEvents.js";
import { handleError, isRecord, ok, requireString, type GameSocket } from "./handlerUtils.js";

type GameServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export function registerAuthHandlers(
  _io: GameServer,
  socket: GameSocket,
  auth: Authentication = authentication,
): void {
  socket.on("auth:signup", (payload, ack) => {
    try {
      if (!isRecord(payload)) {
        throw new StoreError(1, "Malformed signup payload");
      }
      const username = requireString(payload.username, "username");
      const password = requireString(payload.password, "password");
      if (!auth.createAccount(username, password)) {
        ack({ success: false, code: 1, message: "Account already exists" });
        return;
      }
      ack(ok());
    } catch (error) {
      handleError(socket, ack, error);
    }
  });

  socket.on("auth:login", (payload, ack) => {
    try {
      if (!isRecord(payload)) {
        throw new StoreError(1, "Malformed login payload");
      }
      const username = requireString(payload.username, "username");
      const password = requireString(payload.password, "password");
      const result = auth.verifyAccount(username, password);
      ack(result.code === 0
        ? ok()
        : { success: false, code: result.code, message: result.message });
    } catch (error) {
      handleError(socket, ack, error);
    }
  });
}
