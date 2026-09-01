import { describe, expect, it } from "vitest";
import { GameStore, StoreError } from "../src/state/gameStore.js";

describe("GameStore rooms", () => {
  it("creates a room and joins one guest", () => {
    const store = new GameStore();
    const room = store.createRoom(false, "host-socket", "host-user");
    const joined = store.joinRoom(room.matchId, "guest-socket", "guest-user");

    expect(joined.players["1"]?.socketId).toBe("host-socket");
    expect(joined.players["0"]?.socketId).toBe("guest-socket");
    expect(store.hasBothPlayers(joined)).toBe(true);
  });

  it("preserves room-not-found and room-full result codes", () => {
    const store = new GameStore();
    expect(() => store.joinRoom("missing", "guest", "guest-user")).toThrowError(StoreError);

    const room = store.createRoom(false, "host", "host-user");
    store.joinRoom(room.matchId, "guest-one", "guest-user");
    try {
      store.joinRoom(room.matchId, "guest-two", "another-user");
      throw new Error("Expected the room to be full");
    } catch (error) {
      expect(error).toBeInstanceOf(StoreError);
      expect((error as StoreError).code).toBe(421);
    }
  });

  it("reserves player zero for a bot", () => {
    const store = new GameStore();
    const room = store.createRoom(true, "host");

    expect(room.match.bot).not.toBeNull();
    expect(room.players["0"]?.isBot).toBe(true);
    expect(store.hasBothPlayers(room)).toBe(true);
  });

  it("binds an online seat to its verified user identity", () => {
    const store = new GameStore();
    const room = store.createRoom(false, "host-socket", "host-user");
    store.leaveRoom("host-socket");

    expect(() => store.resumeRoom(room.matchId, "1", "intruder-socket", "intruder-user"))
      .toThrowError(/another account/);
    expect(() => store.resumeRoom(room.matchId, "1", "host-new-socket", "host-user"))
      .not.toThrow();
  });
});
