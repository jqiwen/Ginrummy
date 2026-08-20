import type { Socket } from "socket.io";
import { StoreError } from "../state/gameStore.js";
import type {
  Ack,
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
  SocketResponse,
} from "../types/socketEvents.js";

export type GameSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export function ok<T>(code: number, message: string, data: T): SocketResponse<T>;
export function ok(code?: number, message?: string): SocketResponse;
export function ok<T>(code = 0, message = "OK", data?: T): SocketResponse<T> {
  return data === undefined
    ? { success: true, code, message }
    : { success: true, code, message, data };
}

export function failure(code: number, message: string): SocketResponse {
  return { success: false, code, message };
}

export function handleError<T>(socket: GameSocket, ack: Ack<T>, error: unknown): void {
  const response = error instanceof StoreError
    ? failure(error.code, error.message)
    : failure(1, error instanceof Error ? error.message : "Unexpected game service error");
  ack(response);
  socket.emit("game:error", response);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isPlayerId(value: unknown): value is "0" | "1" {
  return value === "0" || value === "1";
}

export function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new StoreError(1, `Invalid ${field}`);
  }
  return value;
}

export function requireRound(value: unknown): number {
  if (!Number.isInteger(value) || (value as number) < 0) {
    throw new StoreError(1, "Invalid round");
  }
  return value as number;
}
