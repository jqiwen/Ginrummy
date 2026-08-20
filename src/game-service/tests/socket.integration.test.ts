import type { AddressInfo } from "node:net";
import { get } from "node:http";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { io as createClient, type Socket } from "socket.io-client";
import { createGameService, type GameService } from "../src/server.js";
import { GameStore } from "../src/state/gameStore.js";
import type { Card, DealState, GameOperation, RoundResult } from "../src/game/gameTypes.js";
import { calculateRoundScore } from "../src/game/Scoring.js";

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

describe("Socket.IO game flow", () => {
  let service: GameService;
  let host: Socket;
  let guest: Socket;

  beforeEach(async () => {
    service = createGameService(new GameStore());
    await new Promise<void>((resolve) => service.httpServer.listen(0, "127.0.0.1", resolve));
    const port = (service.httpServer.address() as AddressInfo).port;
    const url = `http://127.0.0.1:${port}`;
    host = createClient(url, { transports: ["websocket"], forceNew: true });
    guest = createClient(url, { transports: ["websocket"], forceNew: true });
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

    const knocked = once<{ playerId: string }>(host, "game:knocked");
    await emitAck(guest, "game:knock", { matchId, playerId: "0", round: 2 });
    await expect(knocked).resolves.toMatchObject({ playerId: "0" });

    const authoritativeScore = calculateRoundScore(
      "0",
      guestRoundTwo.ownCards,
      guestRoundTwo.opponentCards,
      null,
    );
    const rejectedScore = await emitAck(guest, "round:submit-result", {
      matchId,
      playerId: "0",
      round: 2,
      winner: "0",
      scoreSummary: { rounds: [], p1TotalScore: 0, p2TotalScore: 0 },
    });
    expect(rejectedScore.success).toBe(false);
    const resultEvent = once<RoundResult>(host, "round:result");
    await emitAck(guest, "round:submit-result", {
      matchId,
      playerId: "0",
      round: 2,
      winner: authoritativeScore.winner,
      scoreSummary: authoritativeScore.scoreSummary,
    });
    await expect(resultEvent).resolves.toMatchObject({
      winner: authoritativeScore.winner,
      submittedBy: "0",
    });

    const bothReady = once<{ round: number }>(host, "round:both-ready");
    await emitAck(host, "round:ready-next", { matchId, playerId: "1", round: 2 });
    await emitAck(guest, "round:ready-next", { matchId, playerId: "0", round: 2 });
    await expect(bothReady).resolves.toMatchObject({ round: 2 });

    const malformedError = once<Response>(guest, "game:error");
    guest.emit("game:draw-stack", { malformed: true });
    await expect(malformedError).resolves.toMatchObject({ success: false, code: 1 });
  });
});
