import { io, type Socket } from "socket.io-client";
import type { Card, ScoreSummary } from "./models/card-animation.model";

export type PlayerId = "0" | "1";

export interface SocketResponse<T = never> {
  success: boolean;
  code: number | InviteErrorCode;
  message: string;
  data?: T;
}

export interface RoomMembership {
  matchId: string;
  playerId: PlayerId;
  bot: boolean;
}

export type InviteErrorCode =
  | "AUTH_REQUIRED"
  | "PLAYER_NOT_FOUND"
  | "CANNOT_INVITE_SELF"
  | "INVITE_ALREADY_PENDING"
  | "INVITE_RATE_LIMITED"
  | "PLAYER_BUSY"
  | "INVITE_NOT_FOUND"
  | "INVITE_FORBIDDEN"
  | "INVITE_ALREADY_PROCESSED"
  | "INVITE_EXPIRED"
  | "INTERNAL_ERROR";

export type InviteStatus = "pending" | "accepted" | "declined" | "cancelled" | "expired";

export interface PublicPlayerProfile {
  id: string;
  username: string;
  displayName: string;
}

export interface GameInvite {
  id: string;
  sender: PublicPlayerProfile;
  recipient: PublicPlayerProfile;
  status: InviteStatus;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

export interface InviteLists {
  received: GameInvite[];
  sent: GameInvite[];
}

export interface InviteMatchReady {
  inviteId: string | null;
  membership: RoomMembership;
  opponent: PublicPlayerProfile | null;
}

export interface OpponentLeftEvent {
  matchId: string;
  reason: "left";
  redirectDelayMs: number;
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
  "player:search": (payload: { query: string }, ack: (response: SocketResponse<PublicPlayerProfile[]>) => void) => void;
  "invite:list": (payload: Record<string, never>, ack: (response: SocketResponse<InviteLists>) => void) => void;
  "invite:send": (payload: { recipientUsername: string }, ack: (response: SocketResponse<GameInvite>) => void) => void;
  "invite:accept": (payload: { inviteId: string }, ack: (response: SocketResponse<InviteMatchReady>) => void) => void;
  "invite:decline": (payload: { inviteId: string }, ack: (response: SocketResponse<GameInvite>) => void) => void;
  "invite:cancel": (payload: { inviteId: string }, ack: (response: SocketResponse<GameInvite>) => void) => void;
  "room:leave": (payload: Record<string, never>, ack: (response: SocketResponse) => void) => void;
}

interface ServerToClientEvents {
  "room:created": (membership: RoomMembership) => void;
  "room:joined": (membership: RoomMembership) => void;
  "room:player-joined": (event: { matchId: string; playerId: PlayerId }) => void;
  "room:player-left": (event: { matchId: string; playerId: PlayerId }) => void;
  "game:opponent-left": (event: OpponentLeftEvent) => void;
  "game:started": (event: { matchId: string; startedBy: PlayerId }) => void;
  "game:dealing-started": (state: DealState) => void;
  "game:opponent-action": (event: GameOperationEvent) => void;
  "game:opponent-drew": (event: { matchId: string; playerId: PlayerId }) => void;
  "game:pass-status": (event: PassStatusEvent) => void;
  "game:knocked": (event: { matchId: string; round: number; playerId: PlayerId }) => void;
  "round:result": (event: RoundResultEvent) => void;
  "round:both-ready": (event: { matchId: string; round: number }) => void;
  "game:error": (response: SocketResponse) => void;
  "invite:received": (invite: GameInvite) => void;
  "invite:accepted": (event: InviteMatchReady) => void;
  "invite:declined": (invite: GameInvite) => void;
  "invite:cancelled": (invite: GameInvite) => void;
  "invite:expired": (invite: GameInvite) => void;
  "match:ready": (event: InviteMatchReady) => void;
}

const gameServiceUrl = process.env.NEXT_PUBLIC_GAME_WS_URL ?? "http://localhost:8080";

export const gameSocket: Socket<ServerToClientEvents, ClientToServerEvents> = io(gameServiceUrl, {
  auth: {},
  transports: ["websocket"],
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: Infinity,
});

let gameSocketAccessToken: string | null = null;

export function setGameSocketAccessToken(accessToken: string | null, reconnect = false): void {
  const tokenChanged = gameSocketAccessToken !== accessToken;
  gameSocketAccessToken = accessToken;
  gameSocket.auth = accessToken ? { accessToken } : {};

  if (!accessToken) {
    if (reconnect && gameSocket.connected) gameSocket.disconnect();
    return;
  }

  if (reconnect && tokenChanged && gameSocket.connected) {
    gameSocket.disconnect().connect();
  }
}

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
  gameSocket.auth = gameSocketAccessToken ? { accessToken: gameSocketAccessToken } : {};
  if (!gameSocket.connected) {
    gameSocket.connect();
  }
  return gameSocket;
}

export function waitForGameSocket(timeoutMs = 10_000): Promise<typeof gameSocket> {
  const socket = connectGameSocket();
  if (socket.connected) {
    return Promise.resolve(socket);
  }

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error(`Game service connection timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    const cleanup = () => {
      window.clearTimeout(timeout);
      socket.off("connect", onConnect);
      socket.off("connect_error", onConnectError);
    };
    const onConnect = () => {
      cleanup();
      resolve(socket);
    };
    const onConnectError = (error: Error) => {
      cleanup();
      reject(error);
    };

    socket.once("connect", onConnect);
    socket.once("connect_error", onConnectError);
  });
}
