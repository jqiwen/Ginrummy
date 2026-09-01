import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { io as createClient, type Socket } from "socket.io-client";

import type { TokenVerifier } from "../src/auth/supabaseTokenVerifier.js";
import { InMemoryInviteRepository } from "../src/invites/inviteRepository.js";
import { createGameService, type GameService } from "../src/server.js";
import { GameStore } from "../src/state/gameStore.js";
import type {
  AuthenticatedSocketUser,
  GameInvite,
  InviteLists,
  InviteMatchReady,
  PublicPlayerProfile,
} from "../src/types/socketEvents.js";

interface Response<T = never> {
  success: boolean;
  code: number | string;
  message: string;
  data?: T;
}

function once<T>(socket: Socket, event: string): Promise<T> {
  return new Promise((resolve) => socket.once(event, resolve));
}

function emitAck<T>(socket: Socket, event: string, payload: object): Promise<Response<T>> {
  return new Promise((resolve) => socket.emit(event, payload, resolve));
}

const users: Record<string, AuthenticatedSocketUser> = {
  "host-token": { id: "host-user", email: "host@example.com", playerId: "hostplayer", avatarPath: "host-user/avatar.webp" },
  "guest-token": { id: "guest-user", email: "guest@example.com", playerId: "guestplayer", avatarPath: "guest-user/avatar.png" },
  "intruder-token": { id: "intruder-user", email: "intruder@example.com", playerId: "intruder", avatarPath: null },
};

const profiles: PublicPlayerProfile[] = Object.values(users).map(({ id, playerId, avatarPath }) => ({
  id,
  playerId,
  avatarPath,
}));

const verifier: TokenVerifier = {
  async verifyAccessToken(accessToken) {
    const user = users[accessToken];
    if (!user) throw new Error("Invalid token");
    return user;
  },
};

describe("registered-player invitations", () => {
  let service: GameService;
  let store: GameStore;
  let repository: InMemoryInviteRepository;
  let baseUrl: string;
  let host: Socket;
  let guest: Socket;
  const clients: Socket[] = [];

  async function connect(accessToken?: string): Promise<Socket> {
    const socket = createClient(baseUrl, {
      transports: ["websocket"],
      forceNew: true,
      ...(accessToken ? { auth: { accessToken } } : {}),
    });
    clients.push(socket);
    await once(socket, "connect");
    return socket;
  }

  beforeEach(async () => {
    store = new GameStore();
    repository = new InMemoryInviteRepository(profiles);
    service = createGameService(store, "", verifier, repository);
    await new Promise<void>((resolve) => service.httpServer.listen(0, "127.0.0.1", resolve));
    const port = (service.httpServer.address() as AddressInfo).port;
    baseUrl = `http://127.0.0.1:${port}`;
    host = await connect("host-token");
    guest = await connect("guest-token");
  });

  afterEach(async () => {
    for (const client of clients.splice(0)) client.disconnect();
    service.io.close();
    if (service.httpServer.listening) {
      await new Promise<void>((resolve) => service.httpServer.close(() => resolve()));
    }
  });

  it("rejects unauthenticated invite actions", async () => {
    const anonymous = await connect();
    const response = await emitAck(anonymous, "invite:send", { recipientPlayerId: "guestplayer" });
    expect(response).toMatchObject({ success: false, code: "AUTH_REQUIRED" });
  });

  it("searches public User IDs with avatars, without emails, and excludes the current user", async () => {
    const response = await emitAck<PublicPlayerProfile[]>(host, "player:search", { query: "player" });
    expect(response.success).toBe(true);
    expect(response.data).toEqual([
      { id: "guest-user", playerId: "guestplayer", avatarPath: "guest-user/avatar.png" },
    ]);
    expect(JSON.stringify(response.data)).not.toContain("@");
  });

  it("rejects nonexistent players, self-invites, and duplicate pending invites", async () => {
    await expect(emitAck(host, "invite:send", { recipientPlayerId: "missing" }))
      .resolves.toMatchObject({ success: false, code: "PLAYER_NOT_FOUND" });
    await expect(emitAck(host, "invite:send", { recipientPlayerId: "hostplayer" }))
      .resolves.toMatchObject({ success: false, code: "CANNOT_INVITE_SELF" });

    const received = once<GameInvite>(guest, "invite:received");
    const first = await emitAck<GameInvite>(host, "invite:send", { recipientPlayerId: "guestplayer" });
    expect(first.success).toBe(true);
    await expect(received).resolves.toMatchObject({ sender: { playerId: "hostplayer", avatarPath: "host-user/avatar.webp" } });
    await expect(emitAck(host, "invite:send", { recipientPlayerId: "guestplayer" }))
      .resolves.toMatchObject({ success: false, code: "INVITE_ALREADY_PENDING" });
  });

  it("prevents the wrong user accepting and allows recipients to decline", async () => {
    const sent = await emitAck<GameInvite>(host, "invite:send", { recipientPlayerId: "guestplayer" });
    const inviteId = sent.data!.id;
    const intruder = await connect("intruder-token");
    await expect(emitAck(intruder, "invite:accept", { inviteId }))
      .resolves.toMatchObject({ success: false, code: "INVITE_NOT_FOUND" });

    const senderEvent = once<GameInvite>(host, "invite:declined");
    const declined = await emitAck<GameInvite>(guest, "invite:decline", { inviteId });
    expect(declined.data?.status).toBe("declined");
    await expect(senderEvent).resolves.toMatchObject({ id: inviteId, status: "declined" });
  });

  it("allows only the sender to cancel a pending invitation", async () => {
    const sent = await emitAck<GameInvite>(host, "invite:send", { recipientPlayerId: "guestplayer" });
    const inviteId = sent.data!.id;
    await expect(emitAck(guest, "invite:cancel", { inviteId }))
      .resolves.toMatchObject({ success: false, code: "INVITE_FORBIDDEN" });
    const recipientEvent = once<GameInvite>(guest, "invite:cancelled");
    const cancelled = await emitAck<GameInvite>(host, "invite:cancel", { inviteId });
    expect(cancelled.data?.status).toBe("cancelled");
    await expect(recipientEvent).resolves.toMatchObject({ id: inviteId, status: "cancelled" });
  });

  it("accepts once, creates one internal room, seats both users, and restores a refreshed player", async () => {
    const sent = await emitAck<GameInvite>(host, "invite:send", { recipientPlayerId: "guestplayer" });
    const inviteId = sent.data!.id;
    const hostReady = once<InviteMatchReady>(host, "match:ready");
    const acceptedForSender = once<InviteMatchReady>(host, "invite:accepted");
    const accepted = await emitAck<InviteMatchReady>(guest, "invite:accept", { inviteId });
    expect(accepted.success, JSON.stringify(accepted)).toBe(true);
    expect(accepted.data?.membership.playerId).toBe("0");

    const senderMatch = await hostReady;
    expect(senderMatch.membership.playerId).toBe("1");
    expect(senderMatch.membership.matchId).toBe(accepted.data?.membership.matchId);
    await expect(acceptedForSender).resolves.toMatchObject({ inviteId });
    const room = store.getRoom(senderMatch.membership.matchId);
    expect(room.players["1"]?.userId).toBe("host-user");
    expect(room.players["0"]?.userId).toBe("guest-user");

    await expect(emitAck(guest, "invite:accept", { inviteId }))
      .resolves.toMatchObject({ success: false, code: "INVITE_ALREADY_PROCESSED" });
    expect(store.roomCount()).toBe(1);

    host.disconnect();
    const returningHost = createClient(baseUrl, {
      transports: ["websocket"],
      forceNew: true,
      auth: { accessToken: "host-token" },
    });
    clients.push(returningHost);
    const restored = once<InviteMatchReady>(returningHost, "match:ready");
    await once(returningHost, "connect");
    await expect(restored).resolves.toMatchObject({
      membership: { matchId: senderMatch.membership.matchId, playerId: "1" },
    });
  });

  it("persists an offline invite and returns it when the recipient reconnects", async () => {
    guest.disconnect();
    const sent = await emitAck<GameInvite>(host, "invite:send", { recipientPlayerId: "guestplayer" });
    expect(sent.success).toBe(true);

    const returningGuest = await connect("guest-token");
    const loaded = await emitAck<InviteLists>(returningGuest, "invite:list", {});
    expect(loaded.data?.received).toHaveLength(1);
    expect(loaded.data?.received[0]).toMatchObject({ id: sent.data?.id, sender: { playerId: "hostplayer" } });
  });

  it("does not accept expired invitations", async () => {
    const record = await repository.createInvite(
      { userId: "host-user", accessToken: "host-token" },
      "guest-user",
      new Date(Date.now() - 1_000).toISOString(),
    );
    const response = await emitAck(guest, "invite:accept", { inviteId: record.id });
    expect(response).toMatchObject({ success: false, code: "INVITE_EXPIRED" });
    expect(store.roomCount()).toBe(0);
  });
});
