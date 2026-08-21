import { Match } from "../game/Match.js";
import type {
  Card,
  DrawSource,
  PlayerId,
  RoundPhase,
  RoundResult,
  ScoreSummary,
} from "../game/gameTypes.js";

export interface PlayerConnection {
  isBot: boolean;
  socketId?: string;
}

export interface PendingDraw {
  playerId: PlayerId;
  source: DrawSource;
  card: Card;
}

export interface RoomState {
  matchId: string;
  bot: boolean;
  match: Match;
  players: Partial<Record<PlayerId, PlayerConnection>>;
  started: boolean;
  phase: RoundPhase;
  dealer: PlayerId;
  turn: PlayerId;
  initialPlayer: PlayerId;
  passed: Set<PlayerId>;
  pendingDraw?: PendingDraw;
  scoreSummary: ScoreSummary | null;
  roundResults: Map<number, RoundResult>;
  readyNextRound: Map<number, Set<PlayerId>>;
}

export interface SocketMembership {
  matchId: string;
  playerId: PlayerId;
}

export class StoreError extends Error {
  constructor(
    readonly code: number,
    message: string,
  ) {
    super(message);
  }
}

export class GameStore {
  private readonly rooms = new Map<string, RoomState>();
  private readonly memberships = new Map<string, SocketMembership>();

  createRoom(bot: boolean, socketId: string): RoomState {
    const matchId = this.generateMatchId(bot);
    const players: Partial<Record<PlayerId, PlayerConnection>> = {
      "1": { isBot: false, socketId },
    };
    if (bot) {
      players["0"] = { isBot: true };
    }

    const room: RoomState = {
      matchId,
      bot,
      match: new Match(matchId, bot),
      players,
      started: bot,
      phase: "waiting-deal",
      dealer: "1",
      turn: "1",
      initialPlayer: "1",
      passed: new Set<PlayerId>(),
      scoreSummary: null,
      roundResults: new Map<number, RoundResult>(),
      readyNextRound: new Map<number, Set<PlayerId>>(),
    };
    this.rooms.set(matchId, room);
    this.memberships.set(socketId, { matchId, playerId: "1" });
    return room;
  }

  joinRoom(matchId: string, socketId: string): RoomState {
    const room = this.getRoom(matchId);
    if (room.players["0"]) {
      throw new StoreError(421, "Room Already Full");
    }
    room.players["0"] = { isBot: false, socketId };
    this.memberships.set(socketId, { matchId, playerId: "0" });
    return room;
  }

  resumeRoom(matchId: string, playerId: PlayerId, socketId: string): RoomState {
    const room = this.getRoom(matchId);
    const player = room.players[playerId];
    if (!player || player.isBot) {
      throw new StoreError(1, "Invalid player");
    }
    player.socketId = socketId;
    this.memberships.set(socketId, { matchId, playerId });
    return room;
  }

  leaveRoom(socketId: string): SocketMembership | undefined {
    const membership = this.memberships.get(socketId);
    if (!membership) {
      return undefined;
    }
    const room = this.rooms.get(membership.matchId);
    const player = room?.players[membership.playerId];
    if (player && !player.isBot && player.socketId === socketId) {
      delete player.socketId;
    }
    this.memberships.delete(socketId);
    return membership;
  }

  getRoom(matchId: string): RoomState {
    const room = this.rooms.get(matchId);
    if (!room) {
      throw new StoreError(420, "Room Not Found");
    }
    return room;
  }

  findRoom(matchId: string): RoomState | undefined {
    return this.rooms.get(matchId);
  }

  getMembership(socketId: string): SocketMembership | undefined {
    return this.memberships.get(socketId);
  }

  requirePlayer(socketId: string, matchId: string, playerId: PlayerId): RoomState {
    const membership = this.memberships.get(socketId);
    if (!membership || membership.matchId !== matchId || membership.playerId !== playerId) {
      throw new StoreError(1, "Invalid player");
    }
    return this.getRoom(matchId);
  }

  getPlayerSocket(room: RoomState, playerId: PlayerId): string | undefined {
    return room.players[playerId]?.socketId;
  }

  hasBothPlayers(room: RoomState): boolean {
    return Boolean(room.players["0"] && room.players["1"]);
  }

  clearPendingDraw(room: RoomState): void {
    delete room.pendingDraw;
  }

  roomCount(): number {
    return this.rooms.size;
  }

  private generateMatchId(bot: boolean): string {
    if (!this.rooms.has("test")) {
      return "test";
    }
    const alphabet = "abcdefghijklmnopqrstuvwxyz";
    const length = bot ? 5 : 4;
    let matchId: string;
    do {
      matchId = Array.from(
        { length },
        () => alphabet[Math.floor(Math.random() * alphabet.length)]!,
      ).join("");
    } while (this.rooms.has(matchId));
    return matchId;
  }
}

export const gameStore = new GameStore();
