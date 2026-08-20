import type { Server } from "socket.io";
import { otherPlayer, type DealState, type GameOperation, type PlayerId } from "../game/gameTypes.js";
import { calculateRoundScore, previousScoreSummary } from "../game/Scoring.js";
import { gameStore, GameStore, type RoomState, StoreError } from "../state/gameStore.js";
import type {
  ClientToServerEvents,
  InterServerEvents,
  PassStatusEvent,
  ServerToClientEvents,
  SocketData,
} from "../types/socketEvents.js";
import {
  handleError,
  isPlayerId,
  isRecord,
  ok,
  requireRound,
  requireString,
  type GameSocket,
} from "./handlerUtils.js";

type GameServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

function requirePlayerPayload(
  store: GameStore,
  socket: GameSocket,
  payload: unknown,
): { room: RoomState; matchId: string; playerId: PlayerId } {
  if (!isRecord(payload)) {
    throw new StoreError(1, "Malformed game payload");
  }
  const matchId = requireString(payload.matchId, "match ID");
  if (!isPlayerId(payload.playerId)) {
    throw new StoreError(1, "Invalid player");
  }
  return {
    room: store.requirePlayer(socket.id, matchId, payload.playerId),
    matchId,
    playerId: payload.playerId,
  };
}

function requireCurrentRound(room: RoomState, roundValue: unknown): number {
  const round = requireRound(roundValue);
  if (round !== room.match.currentRound) {
    throw new StoreError(1, "Round is not active");
  }
  return round;
}

function dealFor(room: RoomState, playerId: PlayerId): DealState {
  const dropCard = room.match.dropZone.at(-1);
  if (!dropCard) {
    throw new StoreError(1, "Drop zone is empty");
  }
  return {
    matchId: room.matchId,
    round: room.match.currentRound,
    dealer: room.dealer,
    firstPlayer: room.initialPlayer,
    playerId,
    ownCards: room.match.getHand(playerId).map((card) => ({ ...card })),
    opponentCards: room.match.getHand(otherPlayer(playerId)).map((card) => ({ ...card })),
    dropCard: { ...dropCard },
    remainingCards: room.match.getRemainingCards(),
  };
}

function broadcastDeal(io: GameServer, store: GameStore, room: RoomState): void {
  for (const playerId of ["0", "1"] as const) {
    const socketId = store.getPlayerSocket(room, playerId);
    if (!socketId) {
      continue;
    }
    const state = dealFor(room, playerId);
    io.to(socketId).emit("game:dealing-started", state);
    io.to(socketId).emit("round:started", state);
  }
}

function scheduleBotTurn(io: GameServer, room: RoomState): void {
  if (!room.bot || room.turn !== "0" || room.phase !== "draw") {
    return;
  }
  setTimeout(() => {
    try {
      const operation = room.match.performBotTurn();
      room.phase = "draw";
      room.turn = "1";
      io.to(room.matchId).emit("game:opponent-action", {
        matchId: room.matchId,
        ...operation,
      });
    } catch (error) {
      io.to(room.matchId).emit("game:error", {
        success: false,
        code: 1,
        message: error instanceof Error ? error.message : "Bot turn failed",
      });
    }
  }, 400);
}

export function registerGameHandlers(
  io: GameServer,
  socket: GameSocket,
  store: GameStore = gameStore,
): void {
  socket.on("game:start", (payload, ack) => {
    try {
      const { room, matchId, playerId } = requirePlayerPayload(store, socket, payload);
      if (playerId !== "1") {
        throw new StoreError(1, "Only the room creator can start the game");
      }
      if (!store.hasBothPlayers(room)) {
        throw new StoreError(2, "Second player not yet joined");
      }
      room.started = true;
      ack(ok(0, "Game started successfully"));
      io.to(matchId).emit("game:started", { matchId, startedBy: playerId });
    } catch (error) {
      handleError(socket, ack, error);
    }
  });

  socket.on("round:start", (payload, ack) => {
    try {
      const { room, playerId } = requirePlayerPayload(store, socket, payload);
      if (!isRecord(payload) || !isPlayerId(payload.startWith)) {
        throw new StoreError(1, "Malformed round start payload");
      }
      const round = requireRound(payload.round);
      if (!room.started) {
        throw new StoreError(2, "Game not started yet");
      }
      if (playerId !== payload.startWith) {
        throw new StoreError(1, "Only the current dealer can deal");
      }
      if (round < room.match.currentRound) {
        throw new StoreError(1, "Round has already finished");
      }

      if (round > room.match.currentRound) {
        room.match.initializeMatch(round, payload.startWith);
        room.dealer = payload.startWith;
        room.initialPlayer = room.bot ? "1" : otherPlayer(payload.startWith);
        room.turn = room.initialPlayer;
        room.phase = "initial-offer";
        room.passed.clear();
        store.clearPendingDraw(room);
      }
      broadcastDeal(io, store, room);
      ack(ok(0, "Round started"));
    } catch (error) {
      handleError(socket, ack, error);
    }
  });

  socket.on("game:draw-stack", (payload, ack) => {
    try {
      const { room, playerId } = requirePlayerPayload(store, socket, payload);
      const round = isRecord(payload) ? requireCurrentRound(room, payload.round) : -1;
      void round;
      if (room.phase !== "draw" || room.turn !== playerId) {
        throw new StoreError(1, "Drawing from the stack is not allowed now");
      }
      const card = room.match.chooseStack(playerId);
      room.pendingDraw = { playerId, source: "stack", card };
      room.phase = "discard";
      const data = { card, remainingCards: room.match.getRemainingCards() };
      ack(ok(0, "OK", data));
      socket.emit("game:card-drawn", { matchId: room.matchId, playerId, ...data });
    } catch (error) {
      handleError(socket, ack, error);
    }
  });

  socket.on("game:draw-discard", (payload, ack) => {
    try {
      const { room, playerId } = requirePlayerPayload(store, socket, payload);
      if (isRecord(payload)) {
        requireCurrentRound(room, payload.round);
      }
      const phaseAllowed = room.phase === "draw" || room.phase === "initial-offer";
      if (!phaseAllowed || room.turn !== playerId) {
        throw new StoreError(1, "Drawing from the discard pile is not allowed now");
      }
      const card = room.match.chooseDropZone(playerId);
      room.pendingDraw = { playerId, source: "dropzone", card };
      room.phase = "discard";
      const data = { card, remainingCards: room.match.getRemainingCards() };
      ack(ok(0, "OK", data));
      socket.emit("game:card-drawn", { matchId: room.matchId, playerId, ...data });
    } catch (error) {
      handleError(socket, ack, error);
    }
  });

  socket.on("game:discard", (payload, ack) => {
    try {
      const { room, matchId, playerId } = requirePlayerPayload(store, socket, payload);
      if (!isRecord(payload)) {
        throw new StoreError(1, "Malformed discard payload");
      }
      requireCurrentRound(room, payload.round);
      const cardName = requireString(payload.cardName, "card name");
      const pending = room.pendingDraw;
      if (room.phase !== "discard" || !pending || pending.playerId !== playerId) {
        throw new StoreError(1, "Discarding is not allowed before drawing");
      }
      if (pending.source === "dropzone" && pending.card.name === cardName) {
        throw new StoreError(1, "The card just picked from the discard pile cannot be discarded");
      }

      const droppedCard = room.match.dropCard(playerId, cardName);
      const operation: GameOperation = {
        playerId,
        operation: pending.source,
        droppedCard,
        pickedCard: pending.card,
        remainingCards: room.match.getRemainingCards(),
      };
      room.phase = "draw";
      room.turn = otherPlayer(playerId);
      store.clearPendingDraw(room);
      ack(ok(0, "OK", operation));
      io.to(matchId).emit("game:card-discarded", { matchId, playerId, card: droppedCard });
      socket.to(matchId).emit("game:opponent-action", { matchId, ...operation });
      scheduleBotTurn(io, room);
    } catch (error) {
      handleError(socket, ack, error);
    }
  });

  socket.on("game:pass", (payload, ack) => {
    try {
      const { room, matchId, playerId } = requirePlayerPayload(store, socket, payload);
      if (!isRecord(payload)) {
        throw new StoreError(1, "Malformed pass payload");
      }
      const round = requireCurrentRound(room, payload.round);
      if (room.phase !== "initial-offer" || room.turn !== playerId || room.passed.has(playerId)) {
        throw new StoreError(1, "Passing is not allowed now");
      }
      room.passed.add(playerId);
      io.to(matchId).emit("game:player-passed", { matchId, playerId, round });

      let event: PassStatusEvent;
      if (room.bot) {
        room.phase = "draw";
        room.turn = "0";
        event = {
          matchId,
          round,
          status: "one-passed",
          passedPlayerId: playerId,
          nextPlayerId: "0",
        };
      } else if (room.passed.size === 1) {
        room.turn = otherPlayer(playerId);
        event = {
          matchId,
          round,
          status: "one-passed",
          passedPlayerId: playerId,
          nextPlayerId: room.turn,
        };
      } else {
        room.phase = "draw";
        room.turn = room.initialPlayer;
        event = {
          matchId,
          round,
          status: "both-passed",
          passedPlayerId: playerId,
          nextPlayerId: room.turn,
        };
      }

      ack(ok(0, `Player ${playerId} passed`, event));
      io.to(matchId).emit("game:pass-status", event);
      scheduleBotTurn(io, room);
    } catch (error) {
      handleError(socket, ack, error);
    }
  });

  socket.on("game:knock", (payload, ack) => {
    try {
      const { room, matchId, playerId } = requirePlayerPayload(store, socket, payload);
      if (!isRecord(payload)) {
        throw new StoreError(1, "Malformed knock payload");
      }
      const round = requireCurrentRound(room, payload.round);
      const handLength = room.match.getHand(playerId).length;
      if (handLength !== 12 && handLength !== 13) {
        throw new StoreError(1, "A player can only knock with a complete hand or Big Gin");
      }
      room.match.knockCard(playerId);
      room.phase = "round-over";
      ack(ok(0, "Knock received"));
      socket.to(matchId).emit("game:knocked", { matchId, round, playerId });
    } catch (error) {
      handleError(socket, ack, error);
    }
  });

  socket.on("round:submit-result", (payload, ack) => {
    try {
      const { room, matchId, playerId } = requirePlayerPayload(store, socket, payload);
      if (!isRecord(payload) || !isPlayerId(payload.winner) || !isRecord(payload.scoreSummary)) {
        throw new StoreError(1, "Malformed round result payload");
      }
      const round = requireCurrentRound(room, payload.round);
      const expected = calculateRoundScore(
        playerId,
        room.match.getHand(playerId),
        room.match.getHand(otherPlayer(playerId)),
        previousScoreSummary(payload.scoreSummary),
      );
      if (
        expected.winner !== payload.winner
        || JSON.stringify(expected.scoreSummary) !== JSON.stringify(payload.scoreSummary)
      ) {
        throw new StoreError(1, "Round result does not match authoritative game state");
      }
      const result = {
        matchId,
        round,
        submittedBy: playerId,
        winner: expected.winner,
        scoreSummary: expected.scoreSummary,
      };
      room.roundResults.set(round, result);
      room.phase = "round-over";
      ack(ok(0, "Move submitted"));
      io.to(matchId).emit("round:result", result);
    } catch (error) {
      handleError(socket, ack, error);
    }
  });

  socket.on("round:ready-next", (payload, ack) => {
    try {
      const { room, matchId, playerId } = requirePlayerPayload(store, socket, payload);
      if (!isRecord(payload)) {
        throw new StoreError(1, "Malformed next-round payload");
      }
      const round = requireCurrentRound(room, payload.round);
      const ready = room.readyNextRound.get(round) ?? new Set<PlayerId>();
      ready.add(playerId);
      room.readyNextRound.set(round, ready);
      ack(ok(0, "Waiting flag set"));
      if (room.bot || ready.size === 2) {
        io.to(matchId).emit("round:both-ready", { matchId, round });
      }
    } catch (error) {
      handleError(socket, ack, error);
    }
  });
}
