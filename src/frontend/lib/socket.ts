import { io, type Socket } from "socket.io-client";
import type { Card, ScoreSummary } from "./models/card-animation.model";

export type PlayerId = "0" | "1";

export interface SocketResponse<T = never> {
  success: boolean;
  code: number;
  message: string;
  data?: T;
}

export interface RoomMembership {
  matchId: string;
  playerId: PlayerId;
  bot: boolean;
}

export interface DealState {
  matchId: string;
  round: number;
  dealer: PlayerId;
  firstPlayer: PlayerId;
  playerId: PlayerId;
  ownCards: Card[];
  opponentCards: Card[];
  dropCard: Card;
  remainingCards: number;
}

export interface DrawResult {
  card: Card;
  remainingCards: number;
}

export interface GameOperationEvent {
  matchId: string;
  playerId: PlayerId;
  operation: "stack" | "dropzone" | "knock";
  droppedCard: Card;
  pickedCard: Card;
  remainingCards: number;
}

export interface PassStatusEvent {
  matchId: string;
  round: number;
  status: "one-passed" | "both-passed";
  passedPlayerId: PlayerId;
  nextPlayerId: PlayerId;
}

export interface RoundResultEvent {
  matchId: string;
  round: number;
  submittedBy: PlayerId;
  winner: PlayerId;
  scoreSummary: ScoreSummary;
}

interface ClientToServerEvents {
  "auth:signup": (payload: { username: string; password: string }, ack: (response: SocketResponse) => void) => void;
  "auth:login": (payload: { username: string; password: string }, ack: (response: SocketResponse) => void) => void;
  "room:create": (payload: { bot: boolean }, ack: (response: SocketResponse<RoomMembership>) => void) => void;
  "room:join": (payload: { matchId: string }, ack: (response: SocketResponse<RoomMembership>) => void) => void;
  "room:resume": (payload: { matchId: string; playerId: PlayerId }, ack: (response: SocketResponse<RoomMembership>) => void) => void;
  "game:start": (payload: { matchId: string; playerId: PlayerId }, ack: (response: SocketResponse) => void) => void;
  "round:start": (payload: { matchId: string; playerId: PlayerId; round: number; startWith: PlayerId }, ack: (response: SocketResponse) => void) => void;
  "game:draw-stack": (payload: { matchId: string; playerId: PlayerId; round: number }, ack: (response: SocketResponse<DrawResult>) => void) => void;
  "game:draw-discard": (payload: { matchId: string; playerId: PlayerId; round: number }, ack: (response: SocketResponse<DrawResult>) => void) => void;
  "game:discard": (payload: { matchId: string; playerId: PlayerId; round: number; cardName: string }, ack: (response: SocketResponse<GameOperationEvent>) => void) => void;
  "game:pass": (payload: { matchId: string; playerId: PlayerId; round: number }, ack: (response: SocketResponse<PassStatusEvent>) => void) => void;
  "game:knock": (payload: { matchId: string; playerId: PlayerId; round: number }, ack: (response: SocketResponse) => void) => void;
  "round:submit-result": (payload: { matchId: string; playerId: PlayerId; round: number; scoreSummary: ScoreSummary; winner: PlayerId }, ack: (response: SocketResponse) => void) => void;
  "round:ready-next": (payload: { matchId: string; playerId: PlayerId; round: number }, ack: (response: SocketResponse) => void) => void;
}

interface ServerToClientEvents {
  "room:created": (membership: RoomMembership) => void;
  "room:joined": (membership: RoomMembership) => void;
  "room:player-joined": (event: { matchId: string; playerId: PlayerId }) => void;
  "room:player-left": (event: { matchId: string; playerId: PlayerId }) => void;
  "game:started": (event: { matchId: string; startedBy: PlayerId }) => void;
  "game:dealing-started": (state: DealState) => void;
  "game:opponent-action": (event: GameOperationEvent) => void;
  "game:pass-status": (event: PassStatusEvent) => void;
  "game:knocked": (event: { matchId: string; round: number; playerId: PlayerId }) => void;
  "round:result": (event: RoundResultEvent) => void;
  "round:both-ready": (event: { matchId: string; round: number }) => void;
  "game:error": (response: SocketResponse) => void;
}

const gameServiceUrl = process.env.NEXT_PUBLIC_GAME_WS_URL ?? "http://localhost:8080";

export const gameSocket: Socket<ServerToClientEvents, ClientToServerEvents> = io(gameServiceUrl, {
  transports: ["websocket"],
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: Infinity,
});

gameSocket.on("connect", () => {
  console.info("[game-service] connected");
});

gameSocket.on("disconnect", (reason) => {
  console.warn(`[game-service] disconnected: ${reason}`);
});

gameSocket.on("connect_error", (error) => {
  console.error("[game-service] connection error", error);
});

gameSocket.io.on("reconnect_attempt", (attempt) => {
  console.info(`[game-service] reconnect attempt ${attempt}`);
});

gameSocket.io.on("reconnect", (attempt) => {
  console.info(`[game-service] reconnected after ${attempt} attempt(s)`);
});

export function connectGameSocket(): typeof gameSocket {
  if (!gameSocket.connected) {
    gameSocket.connect();
  }
  return gameSocket;
}

export function authSignup(username: string, password: string): Promise<SocketResponse> {
  const socket = connectGameSocket();
  return new Promise((resolve) => socket.emit("auth:signup", { username, password }, resolve));
}

export function authLogin(username: string, password: string): Promise<SocketResponse> {
  const socket = connectGameSocket();
  return new Promise((resolve) => socket.emit("auth:login", { username, password }, resolve));
}
