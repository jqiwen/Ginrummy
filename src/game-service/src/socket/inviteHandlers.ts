import type { Server } from "socket.io";
import {
  InviteRepositoryError,
  type InviteRecord,
  type InviteRepository,
  type InviteRequestContext,
} from "../invites/inviteRepository.js";
import { gameStore, GameStore } from "../state/gameStore.js";
import type {
  ClientToServerEvents,
  GameInvite,
  InterServerEvents,
  InviteMatchReady,
  PublicPlayerProfile,
  RoomMembership,
  ServerToClientEvents,
  SocketData,
} from "../types/socketEvents.js";
import {
  handleError,
  isRecord,
  ok,
  requireString,
  ServiceError,
  type GameSocket,
} from "./handlerUtils.js";

type GameServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

const INVITE_LIFETIME_MS = 30 * 60 * 1_000;
const PLAYER_SEARCH_LIMIT = 8;

export function userChannel(userId: string): string {
  return `user:${userId}`;
}

function contextFor(socket: GameSocket): InviteRequestContext {
  if (!socket.data.user || !socket.data.accessToken) {
    throw new ServiceError("AUTH_REQUIRED", "Authentication required");
  }
  return { userId: socket.data.user.id, accessToken: socket.data.accessToken };
}

function mapRepositoryError(error: unknown): never {
  if (error instanceof InviteRepositoryError) {
    throw new ServiceError(error.code, error.message);
  }
  throw error;
}

async function hydrateInvite(
  repository: InviteRepository,
  context: InviteRequestContext,
  record: InviteRecord,
): Promise<GameInvite> {
  const profiles = await repository.getProfilesByIds(context, [record.senderId, record.recipientId]);
  const sender = profiles.get(record.senderId);
  const recipient = profiles.get(record.recipientId);
  if (!sender || !recipient) {
    throw new ServiceError("PLAYER_NOT_FOUND", "One of the invited players no longer exists");
  }
  return {
    id: record.id,
    sender,
    recipient,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    expiresAt: record.expiresAt,
  };
}

async function attachUserSockets(
  io: GameServer,
  store: GameStore,
  userId: string,
  membership: RoomMembership,
): Promise<void> {
  const sockets = await io.in(userChannel(userId)).fetchSockets();
  for (const activeSocket of sockets) {
    store.resumeRoom(membership.matchId, membership.playerId, activeSocket.id, userId);
    activeSocket.data.matchId = membership.matchId;
    activeSocket.data.playerId = membership.playerId;
    await activeSocket.join(membership.matchId);
  }
}

function ensurePlayerAvailable(store: GameStore, userId: string): void {
  if (store.findActiveMembershipByUserId(userId)) {
    throw new ServiceError("PLAYER_BUSY", "That player is already in an active match");
  }
}

function requireInvitePayload(payload: unknown): string {
  if (!isRecord(payload)) throw new ServiceError("INVITE_NOT_FOUND", "Malformed invitation request");
  return requireString(payload.inviteId, "invite ID");
}

export function registerInviteHandlers(
  io: GameServer,
  socket: GameSocket,
  repository: InviteRepository,
  store: GameStore = gameStore,
): void {
  socket.on("player:search", async (payload, ack) => {
    try {
      const context = contextFor(socket);
      if (!isRecord(payload) || typeof payload.query !== "string") {
        throw new ServiceError("PLAYER_NOT_FOUND", "Enter a User ID to search");
      }
      const query = payload.query.trim().toLowerCase();
      if (query.length < 2) {
        ack(ok(0, "Enter at least two characters", []));
        return;
      }
      const profiles = await repository.searchProfiles(context, query, PLAYER_SEARCH_LIMIT);
      ack(ok(0, "Players found", profiles));
    } catch (error) {
      try { mapRepositoryError(error); } catch (mapped) { handleError(socket, ack, mapped); }
    }
  });

  socket.on("invite:list", async (payload, ack) => {
    try {
      const context = contextFor(socket);
      if (!isRecord(payload)) throw new ServiceError("INVITE_NOT_FOUND", "Malformed invitation request");
      const expiredRecords = await repository.expireInvites(context);
      for (const record of expiredRecords) {
        const expiredInvite = await hydrateInvite(repository, context, record);
        io.to(userChannel(record.senderId)).emit("invite:expired", expiredInvite);
        io.to(userChannel(record.recipientId)).emit("invite:expired", expiredInvite);
      }
      const records = await repository.listInvites(context);
      const pending = records.filter((invite) => invite.status === "pending");
      const invites = await Promise.all(pending.map((invite) => hydrateInvite(repository, context, invite)));
      ack(ok(0, "Invitations loaded", {
        received: invites.filter((invite) => invite.recipient.id === context.userId),
        sent: invites.filter((invite) => invite.sender.id === context.userId),
      }));
    } catch (error) {
      try { mapRepositoryError(error); } catch (mapped) { handleError(socket, ack, mapped); }
    }
  });

  socket.on("invite:send", async (payload, ack) => {
    try {
      const context = contextFor(socket);
      if (!isRecord(payload) || typeof payload.recipientPlayerId !== "string") {
        throw new ServiceError("PLAYER_NOT_FOUND", "Choose a registered player");
      }
      const recipientPlayerId = payload.recipientPlayerId.trim().toLowerCase();
      if (!/^[a-z0-9_]{3,20}$/.test(recipientPlayerId)) {
        throw new ServiceError("PLAYER_NOT_FOUND", "Player not found");
      }
      const recipient = await repository.getProfileByPlayerId(context, recipientPlayerId);
      if (!recipient) throw new ServiceError("PLAYER_NOT_FOUND", "Player not found");
      if (recipient.id === context.userId) {
        throw new ServiceError("CANNOT_INVITE_SELF", "You cannot invite yourself");
      }
      ensurePlayerAvailable(store, context.userId);
      ensurePlayerAvailable(store, recipient.id);
      const expiresAt = new Date(Date.now() + INVITE_LIFETIME_MS).toISOString();
      const record = await repository.createInvite(context, recipient.id, expiresAt);
      const invite = await hydrateInvite(repository, context, record);
      ack(ok(0, "Invitation sent", invite));
      io.to(userChannel(recipient.id)).emit("invite:received", invite);
    } catch (error) {
      try { mapRepositoryError(error); } catch (mapped) { handleError(socket, ack, mapped); }
    }
  });

  socket.on("invite:accept", async (payload, ack) => {
    try {
      const context = contextFor(socket);
      const inviteId = requireInvitePayload(payload);
      const record = await repository.getInvite(context, inviteId);
      if (!record) throw new ServiceError("INVITE_NOT_FOUND", "Invitation not found");
      if (record.recipientId !== context.userId) {
        throw new ServiceError("INVITE_FORBIDDEN", "Only the invited player can accept");
      }
      if (record.status !== "pending") {
        throw new ServiceError("INVITE_ALREADY_PROCESSED", "Invitation has already been processed");
      }
      if (new Date(record.expiresAt).getTime() <= Date.now()) {
        await repository.transitionInvite(context, inviteId, "accept");
        throw new ServiceError("INVITE_EXPIRED", "Invitation has expired");
      }
      ensurePlayerAvailable(store, record.senderId);
      ensurePlayerAvailable(store, record.recipientId);
      const sender = (await repository.getProfilesByIds(context, [record.senderId])).get(record.senderId);
      const recipient = (await repository.getProfilesByIds(context, [record.recipientId])).get(record.recipientId);
      if (!sender || !recipient) throw new ServiceError("PLAYER_NOT_FOUND", "A player no longer exists");

      const accepted = await repository.transitionInvite(context, inviteId, "accept");
      if (!accepted) {
        throw new ServiceError("INVITE_ALREADY_PROCESSED", "Invitation has already been processed");
      }
      if (accepted.status === "expired") {
        const expiredInvite = await hydrateInvite(repository, context, accepted);
        io.to(userChannel(record.senderId)).emit("invite:expired", expiredInvite);
        throw new ServiceError("INVITE_EXPIRED", "Invitation has expired");
      }
      if (!accepted.roomId) throw new ServiceError("INTERNAL_ERROR", "The private table was not created");

      const room = store.createInvitedRoom(record.senderId, record.recipientId, accepted.roomId);
      const senderMembership: RoomMembership = { matchId: room.matchId, playerId: "1", bot: false };
      const recipientMembership: RoomMembership = { matchId: room.matchId, playerId: "0", bot: false };
      await Promise.all([
        attachUserSockets(io, store, record.senderId, senderMembership),
        attachUserSockets(io, store, record.recipientId, recipientMembership),
      ]);

      const senderReady: InviteMatchReady = { inviteId, membership: senderMembership, opponent: recipient };
      const recipientReady: InviteMatchReady = { inviteId, membership: recipientMembership, opponent: sender };
      ack(ok(0, "Invitation accepted", recipientReady));
      io.to(userChannel(record.senderId)).emit("invite:accepted", senderReady);
      io.to(userChannel(record.senderId)).emit("match:ready", senderReady);
      io.to(userChannel(record.recipientId)).emit("match:ready", recipientReady);
      io.to(room.matchId).emit("game:started", { matchId: room.matchId, startedBy: "1" });
    } catch (error) {
      try { mapRepositoryError(error); } catch (mapped) { handleError(socket, ack, mapped); }
    }
  });

  socket.on("invite:decline", async (payload, ack) => {
    try {
      const context = contextFor(socket);
      const inviteId = requireInvitePayload(payload);
      const record = await repository.getInvite(context, inviteId);
      if (!record) throw new ServiceError("INVITE_NOT_FOUND", "Invitation not found");
      if (record.recipientId !== context.userId) {
        throw new ServiceError("INVITE_FORBIDDEN", "Only the invited player can decline");
      }
      if (record.status !== "pending") {
        throw new ServiceError("INVITE_ALREADY_PROCESSED", "Invitation has already been processed");
      }
      const declined = await repository.transitionInvite(context, inviteId, "decline");
      if (!declined) throw new ServiceError("INVITE_ALREADY_PROCESSED", "Invitation has already been processed");
      const invite = await hydrateInvite(repository, context, declined);
      ack(ok(0, declined.status === "expired" ? "Invitation expired" : "Invitation declined", invite));
      io.to(userChannel(record.senderId)).emit(
        declined.status === "expired" ? "invite:expired" : "invite:declined",
        invite,
      );
    } catch (error) {
      try { mapRepositoryError(error); } catch (mapped) { handleError(socket, ack, mapped); }
    }
  });

  socket.on("invite:cancel", async (payload, ack) => {
    try {
      const context = contextFor(socket);
      const inviteId = requireInvitePayload(payload);
      const record = await repository.getInvite(context, inviteId);
      if (!record) throw new ServiceError("INVITE_NOT_FOUND", "Invitation not found");
      if (record.senderId !== context.userId) {
        throw new ServiceError("INVITE_FORBIDDEN", "Only the sender can cancel");
      }
      if (record.status !== "pending") {
        throw new ServiceError("INVITE_ALREADY_PROCESSED", "Invitation has already been processed");
      }
      const cancelled = await repository.transitionInvite(context, inviteId, "cancel");
      if (!cancelled) throw new ServiceError("INVITE_ALREADY_PROCESSED", "Invitation has already been processed");
      const invite = await hydrateInvite(repository, context, cancelled);
      ack(ok(0, cancelled.status === "expired" ? "Invitation expired" : "Invitation cancelled", invite));
      io.to(userChannel(record.recipientId)).emit(
        cancelled.status === "expired" ? "invite:expired" : "invite:cancelled",
        invite,
      );
    } catch (error) {
      try { mapRepositoryError(error); } catch (mapped) { handleError(socket, ack, mapped); }
    }
  });
}

export function profileForUser(user: { id: string; playerId: string; avatarPath: string | null }): PublicPlayerProfile {
  return { id: user.id, playerId: user.playerId, avatarPath: user.avatarPath };
}
