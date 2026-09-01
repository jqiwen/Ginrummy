import type { AddressInfo } from "node:net";
import { get } from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { io as createClient, type Socket } from "socket.io-client";
import { createGameService, parseAllowedOrigins, type GameService } from "../src/server.js";
import { GameStore } from "../src/state/gameStore.js";
import type { Card, DealState, GameOperation, RoundResult } from "../src/game/gameTypes.js";
import { calculateRoundScore } from "../src/game/Scoring.js";
import { DECK } from "../src/game/Card.js";
import type { TokenVerifier } from "../src/auth/supabaseTokenVerifier.js";
import type { AuthenticatedSocketUser } from "../src/types/socketEvents.js";
import { InMemoryInviteRepository } from "../src/invites/inviteRepository.js";

interface Response<T = never> {
  success: boolean;
  code: number;
  message: string;
  data?: T;
}

interface Membership {
  matchId: string;
  playerId: "0" | "1";
  bot: boolean;
}

function once<T>(socket: Socket, event: string): Promise<T> {
  return new Promise((resolve) => socket.once(event, resolve));
}

function emitAck<T>(socket: Socket, event: string, payload: object): Promise<Response<T>> {
  return new Promise((resolve) => socket.emit(event, payload, resolve));
}

const users: Record<string, AuthenticatedSocketUser> = {
  "host-token": { id: "host-user", email: "host@example.com", username: "host", displayName: "Host" },
  "guest-token": { id: "guest-user", email: "guest@example.com", username: "guest", displayName: "Guest" },
  "intruder-token": { id: "intruder-user", email: "intruder@example.com", username: "intruder", displayName: "Intruder" },
};

const tokenVerifier: TokenVerifier = {
  async verifyAccessToken(accessToken) {
    const user = users[accessToken];
    if (!user) throw new Error("Invalid token");
    return user;
  },
};

describe("Socket.IO origin configuration", () => {
  it("includes the local default and normalizes configured production origins", () => {
    expect(
      parseAllowedOrigins(
        " https://preview.example.com,https://ginrummy.jqiwen.com,,https://preview.example.com ",
      ),
    ).toEqual([
      "http://localhost:3000",
      "https://preview.example.com",
      "https://ginrummy.jqiwen.com",
    ]);
  });
});

describe("Socket.IO game flow", () => {
  let service: GameService;
  let host: Socket;
  let guest: Socket;
  let store: GameStore;

  beforeEach(async () => {
    store = new GameStore();
    const inviteRepository = new InMemoryInviteRepository(
      Object.values(users).map(({ id, username, displayName }) => ({ id, username, displayName })),
    );
    service = createGameService(store, "https://ginrummy.jqiwen.com", tokenVerifier, inviteRepository);
    await new Promise<void>((resolve) => service.httpServer.listen(0, "127.0.0.1", resolve));
    const port = (service.httpServer.address() as AddressInfo).port;
    const url = `http://127.0.0.1:${port}`;
    host = createClient(url, { transports: ["websocket"], forceNew: true, auth: { accessToken: "host-token" } });
    guest = createClient(url, { transports: ["websocket"], forceNew: true, auth: { accessToken: "guest-token" } });
    await Promise.all([once(host, "connect"), once(guest, "connect")]);
  });

  afterEach(async () => {
    host.disconnect();
    guest.disconnect();
    service.io.close();
    if (service.httpServer.listening) {
      await new Promise<void>((resolve) => service.httpServer.close(() => resolve()));
    }
  });

  it("serves the Cloud Run health endpoint", async () => {
    const port = (service.httpServer.address() as AddressInfo).port;
    const response = await new Promise<{ statusCode?: number; body: string }>((resolve, reject) => {
      get(`http://127.0.0.1:${port}/health`, (healthResponse) => {
        let body = "";
        healthResponse.setEncoding("utf8");
        healthResponse.on("data", (chunk) => {
          body += chunk;
        });
        healthResponse.on("end", () => resolve({ statusCode: healthResponse.statusCode, body }));
      }).on("error", reject);
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ status: "ok" });
  });

  it("accepts the production Origin and logs rejected WebSocket handshakes", async () => {
    const port = (service.httpServer.address() as AddressInfo).port;
    const url = `http://127.0.0.1:${port}`;
    const productionClient = createClient(url, {
      transports: ["websocket"],
      forceNew: true,
      extraHeaders: { Origin: "https://ginrummy.jqiwen.com" },
    });

    await once(productionClient, "connect");
    expect(productionClient.io.engine.transport.name).toBe("websocket");
    productionClient.disconnect();

    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const rejectedClient = createClient(url, {
      transports: ["websocket"],
      forceNew: true,
      reconnection: false,
      timeout: 2_000,
      extraHeaders: { Origin: "https://untrusted.example.com" },
    });

    try {
      await new Promise<void>((resolve) => rejectedClient.once("connect_error", () => resolve()));
      expect(rejectedClient.connected).toBe(false);
      expect(warning).toHaveBeenCalledWith(
        "[game-service] rejected Socket.IO handshake",
        expect.stringContaining('"origin":"https://untrusted.example.com"'),
      );
      expect(warning).toHaveBeenCalledWith(
        "[game-service] rejected Socket.IO handshake",
        expect.stringContaining('"transport":"websocket"'),
      );
      expect(warning).toHaveBeenCalledWith(
        "[game-service] rejected Socket.IO handshake",
        expect.stringContaining('"path":"/socket.io/"'),
      );
    } finally {
      rejectedClient.disconnect();
      warning.mockRestore();
    }
  });

  it("allows guests to play the bot but rejects guest multiplayer rooms", async () => {
    const port = (service.httpServer.address() as AddressInfo).port;
    const anonymous = createClient(`http://127.0.0.1:${port}`, {
      transports: ["websocket"],
      forceNew: true,
    });
    await once(anonymous, "connect");
    try {
      const tutorial = await emitAck<Membership>(anonymous, "room:create", { bot: true });
      expect(tutorial.success).toBe(true);
      const online = await emitAck<Membership>(anonymous, "room:create", { bot: false });
      expect(online).toMatchObject({ success: false, code: 401, message: "Authentication required" });
    } finally {
      anonymous.disconnect();
    }
  });

  it("rejects invalid tokens during the Socket.IO handshake", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const port = (service.httpServer.address() as AddressInfo).port;
    const invalid = createClient(`http://127.0.0.1:${port}`, {
      transports: ["websocket"],
      forceNew: true,
      reconnection: false,
      auth: { accessToken: "invalid-token" },
    });
    try {
      const error = await once<Error>(invalid, "connect_error");
      expect(error.message).toBe("Invalid or expired access token");
      expect(warning).toHaveBeenCalledWith(
        "[game-service] rejected unauthenticated Socket.IO handshake",
        expect.stringContaining('"reason":"token_verification_failed"'),
      );
    } finally {
      invalid.disconnect();
      warning.mockRestore();
    }
  });

  it("prevents another authenticated user from resuming an occupied identity", async () => {
    const created = await emitAck<Membership>(host, "room:create", { bot: false });
    const matchId = created.data!.matchId;
    host.disconnect();

    const port = (service.httpServer.address() as AddressInfo).port;
    const url = `http://127.0.0.1:${port}`;
    const intruder = createClient(url, { transports: ["websocket"], forceNew: true, auth: { accessToken: "intruder-token" } });
    const returningHost = createClient(url, { transports: ["websocket"], forceNew: true, auth: { accessToken: "host-token" } });
    await Promise.all([once(intruder, "connect"), once(returningHost, "connect")]);
    try {
      const denied = await emitAck<Membership>(intruder, "room:resume", { matchId, playerId: "1" });
      expect(denied).toMatchObject({ success: false, code: 403 });
      const resumed = await emitAck<Membership>(returningHost, "room:resume", { matchId, playerId: "1" });
      expect(resumed.success).toBe(true);
    } finally {
      intruder.disconnect();
      returningHost.disconnect();
    }
  });

  it("creates, joins, deals, pushes moves/passes/knock, and synchronizes rounds", async () => {
    const created = await emitAck<Membership>(host, "room:create", { bot: false });
    expect(created.code).toBe(0);
    const matchId = created.data!.matchId;

    const playerJoined = once<{ matchId: string }>(host, "room:player-joined");
    const joined = await emitAck<Membership>(guest, "room:join", { matchId });
    expect(joined.code).toBe(200);
    await expect(playerJoined).resolves.toMatchObject({ matchId });

    const startedForGuest = once<{ matchId: string }>(guest, "game:started");
    const started = await emitAck(host, "game:start", { matchId, playerId: "1" });
    expect(started.success).toBe(true);
    await expect(startedForGuest).resolves.toMatchObject({ matchId });

    const hostDealPromise = once<DealState>(host, "game:dealing-started");
    const guestDealPromise = once<DealState>(guest, "game:dealing-started");
    const roundStarted = await emitAck(host, "round:start", {
      matchId,
      playerId: "1",
      round: 1,
      startWith: "1",
    });
    expect(roundStarted.success).toBe(true);
    const [hostDeal, guestDeal] = await Promise.all([hostDealPromise, guestDealPromise]);
    expect(hostDeal.ownCards).toHaveLength(12);
    expect(guestDeal.ownCards).toHaveLength(12);
    expect(hostDeal.ownCards).toEqual(guestDeal.opponentCards);

    const draw = await emitAck<{ card: Card; remainingCards: number }>(guest, "game:draw-discard", {
      matchId,
      playerId: "0",
      round: 1,
    });
    expect(draw.success).toBe(true);
    const rejectedDiscard = await emitAck<GameOperation>(guest, "game:discard", {
      matchId,
      playerId: "0",
      round: 1,
      cardName: draw.data!.card.name,
    });
    expect(rejectedDiscard.success).toBe(false);
    const actionPromise = once<GameOperation & { matchId: string }>(host, "game:opponent-action");
    const discard = await emitAck<GameOperation>(guest, "game:discard", {
      matchId,
      playerId: "0",
      round: 1,
      cardName: guestDeal.ownCards[0]!.name,
    });
    expect(discard.success).toBe(true);
    await expect(actionPromise).resolves.toMatchObject({ playerId: "0", operation: "dropzone" });

    const nextHostDeal = once<DealState>(host, "game:dealing-started");
    const nextGuestDeal = once<DealState>(guest, "game:dealing-started");
    await emitAck(host, "round:start", { matchId, playerId: "1", round: 2, startWith: "1" });
    const [, guestRoundTwo] = await Promise.all([nextHostDeal, nextGuestDeal]);

    const firstPassStatus = once<{ status: string }>(guest, "game:pass-status");
    const firstPass = await emitAck(guest, "game:pass", { matchId, playerId: "0", round: 2 });
    expect(firstPass.success).toBe(true);
    await expect(firstPassStatus).resolves.toMatchObject({ status: "one-passed" });
    const bothPassed = once<{ status: string }>(guest, "game:pass-status");
    await emitAck(host, "game:pass", { matchId, playerId: "1", round: 2 });
    await expect(bothPassed).resolves.toMatchObject({ status: "both-passed" });

    const earlyKnock = await emitAck(guest, "game:knock", { matchId, playerId: "0", round: 2 });
    expect(earlyKnock.success).toBe(false);

    const opponentDrew = once<{ playerId: string }>(host, "game:opponent-drew");
    await emitAck(guest, "game:draw-stack", { matchId, playerId: "0", round: 2 });
    await expect(opponentDrew).resolves.toMatchObject({ playerId: "0" });
    const turnDiscard = await emitAck(guest, "game:discard", {
      matchId,
      playerId: "0",
      round: 2,
      cardName: guestRoundTwo.ownCards[0]!.name,
    });
    expect(turnDiscard.success).toBe(true);

    const ginNames = [
      "spades-01", "spades-02", "spades-03",
      "hearts-04", "hearts-05", "hearts-06",
      "clubs-07", "clubs-08", "clubs-09",
      "diamonds-J", "diamonds-C", "diamonds-Q",
    ];
    store.getRoom(matchId).match.guestCards = ginNames.map((name) => ({
      ...DECK.find((card) => card.name === name)!,
    }));

    const knocked = once<{ playerId: string }>(host, "game:knocked");
    const resultEvent = once<RoundResult>(host, "round:result");
    const knock = await emitAck(guest, "game:knock", { matchId, playerId: "0", round: 2 });
    expect(knock.success).toBe(true);
    await expect(knocked).resolves.toMatchObject({ playerId: "0" });
    const serverResult = await resultEvent;

    const room = store.getRoom(matchId);
    const authoritativeScore = calculateRoundScore(
      "0",
      room.match.getHand("0"),
      room.match.getHand("1"),
      null,
    );
    expect(serverResult).toMatchObject({
      winner: authoritativeScore.winner,
      submittedBy: "0",
      scoreSummary: authoritativeScore.scoreSummary,
    });

    const legacySubmit = await emitAck(guest, "round:submit-result", {
      matchId,
      playerId: "0",
      round: 2,
      winner: "0",
      scoreSummary: { rounds: [], p1TotalScore: 0, p2TotalScore: 0 },
    });
    expect(legacySubmit.success).toBe(true);

    const bothReady = once<{ round: number }>(host, "round:both-ready");
    await emitAck(host, "round:ready-next", { matchId, playerId: "1", round: 2 });
    await emitAck(guest, "round:ready-next", { matchId, playerId: "0", round: 2 });
    await expect(bothReady).resolves.toMatchObject({ round: 2 });

    const malformedError = once<Response>(guest, "game:error");
    guest.emit("game:draw-stack", { malformed: true });
    await expect(malformedError).resolves.toMatchObject({ success: false, code: 1 });
  });
});
