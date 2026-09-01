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
  userId?: string;
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
  private readonly userRooms = new Map<string, SocketMembership>();

  createRoom(bot: boolean, socketId: string, userId?: string): RoomState {
    const matchId = this.generateMatchId(bot);
    const players: Partial<Record<PlayerId, PlayerConnection>> = {
      "1": { isBot: false, socketId, ...(userId ? { userId } : {}) },
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
    if (userId) this.userRooms.set(userId, { matchId, playerId: "1" });
    return room;
  }

  createInvitedRoom(senderUserId: string, recipientUserId: string, internalMatchId?: string): RoomState {
    if (senderUserId === recipientUserId) {
      throw new StoreError(1, "A private match requires two players");
    }
    if (this.findActiveMembershipByUserId(senderUserId) || this.findActiveMembershipByUserId(recipientUserId)) {
      throw new StoreError(409, "A player is already in an active match");
    }

    const matchId = internalMatchId ?? this.generateMatchId(false);
    if (this.rooms.has(matchId)) {
      throw new StoreError(409, "Private match already exists");
    }
    const room: RoomState = {
      matchId,
      bot: false,
      match: new Match(matchId, false),
      players: {
        "1": { isBot: false, userId: senderUserId },
        "0": { isBot: false, userId: recipientUserId },
      },
      started: true,
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
    this.userRooms.set(senderUserId, { matchId, playerId: "1" });
    this.userRooms.set(recipientUserId, { matchId, playerId: "0" });
    return room;
  }

  joinRoom(matchId: string, socketId: string, userId: string): RoomState {
    const room = this.getRoom(matchId);
    if (room.players["0"]) {
      throw new StoreError(421, "Room Already Full");
    }
    room.players["0"] = { isBot: false, socketId, userId };
    this.memberships.set(socketId, { matchId, playerId: "0" });
    this.userRooms.set(userId, { matchId, playerId: "0" });
    return room;
  }

  resumeRoom(matchId: string, playerId: PlayerId, socketId: string, userId?: string): RoomState {
    const room = this.getRoom(matchId);
    const player = room.players[playerId];
    if (!player || player.isBot) {
      throw new StoreError(1, "Invalid player");
    }
    if (!room.bot && !userId) {
      throw new StoreError(401, "Authentication required");
    }
    if (player.userId && player.userId !== userId) {
      throw new StoreError(403, "This player seat belongs to another account");
    }
    player.socketId = socketId;
    this.memberships.set(socketId, { matchId, playerId });
    if (userId) this.userRooms.set(userId, { matchId, playerId });
    return room;
  }

  resumeActiveRoom(userId: string, socketId: string): SocketMembership | undefined {
    const membership = this.findActiveMembershipByUserId(userId);
    if (!membership) return undefined;
    this.resumeRoom(membership.matchId, membership.playerId, socketId, userId);
    return membership;
  }

  leaveRoom(socketId: string): SocketMembership | undefined {
    const membership = this.memberships.get(socketId);
    if (!membership) {
      return undefined;
    }
    const room = this.rooms.get(membership.matchId);
    const player = room?.players[membership.playerId];
    if (player && !player.isBot && player.socketId === socketId) {
      const fallback = [...this.memberships.entries()].find(
        ([candidateSocketId, candidate]) => candidateSocketId !== socketId
          && candidate.matchId === membership.matchId
          && candidate.playerId === membership.playerId,
      );
      if (fallback) player.socketId = fallback[0];
      else delete player.socketId;
    }
    this.memberships.delete(socketId);
    return membership;
  }

  endRoom(matchId: string): void {
    const room = this.rooms.get(matchId);
    if (!room) return;
    for (const player of Object.values(room.players)) {
      if (player?.userId) {
        const active = this.userRooms.get(player.userId);
        if (active?.matchId === matchId) this.userRooms.delete(player.userId);
      }
    }
    for (const [socketId, membership] of this.memberships) {
      if (membership.matchId === matchId) this.memberships.delete(socketId);
    }
    this.rooms.delete(matchId);
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

  findActiveMembershipByUserId(userId: string): SocketMembership | undefined {
    const membership = this.userRooms.get(userId);
    if (!membership) return undefined;
    const room = this.rooms.get(membership.matchId);
    const player = room?.players[membership.playerId];
    if (!room || !player || player.userId !== userId) {
      this.userRooms.delete(userId);
      return undefined;
    }
    return { ...membership };
  }

  requirePlayer(socketId: string, matchId: string, playerId: PlayerId, userId?: string): RoomState {
    const membership = this.memberships.get(socketId);
    if (!membership || membership.matchId !== matchId || membership.playerId !== playerId) {
      throw new StoreError(1, "Invalid player");
    }
    const room = this.getRoom(matchId);
    const player = room.players[playerId];
    if (!player || player.isBot) {
      throw new StoreError(1, "Invalid player");
    }
    if (!room.bot && !userId) {
      throw new StoreError(401, "Authentication required");
    }
    if (player.userId && player.userId !== userId) {
      throw new StoreError(403, "This player seat belongs to another account");
    }
    return room;
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
