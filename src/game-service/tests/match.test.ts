import { describe, expect, it } from "vitest";
import { Match } from "../src/game/Match.js";

describe("Match", () => {
  it("deals twelve cards per player, one discard, and leaves 39 stack cards", () => {
    const match = new Match("deal", false, () => 0.5);

    expect(match.hostCards).toHaveLength(12);
    expect(match.guestCards).toHaveLength(12);
    expect(match.dropZone).toHaveLength(1);
    expect(match.getInitialCards()).toHaveLength(25);
    expect(match.getRemainingCards()).toBe(39);

    const names = [
      ...match.hostCards,
      ...match.guestCards,
      ...match.dropZone,
      ...match.deck,
    ].map((card) => card.name);
    expect(new Set(names).size).toBe(64);
  });

  it("draws from the stack and discards from the player's hand", () => {
    const match = new Match("stack", false, () => 0.25);
    const card = match.chooseStack("1");
    expect(match.hostCards).toContainEqual(card);
    expect(match.hostCards).toHaveLength(13);
    expect(match.getRemainingCards()).toBe(38);

    const discarded = match.dropCard("1", match.hostCards[0]!.name);
    expect(match.hostCards).toHaveLength(12);
    expect(match.dropZone.at(-1)).toEqual(discarded);
    expect(match.getLatestOperation()?.operation).toBe("stack");
  });

  it("draws the top discard using LIFO behavior", () => {
    const match = new Match("discard", false, () => 0.75);
    const topDiscard = match.dropZone.at(-1);
    const drawn = match.chooseDropZone("0");

    expect(drawn).toEqual(topDiscard);
    expect(match.dropZone).toHaveLength(0);
    expect(match.guestCards).toHaveLength(13);
    expect(match.latestOperation).toBe("dropzone");
  });

  it("records a knock without changing either hand", () => {
    const match = new Match("knock", false, () => 0.1);
    match.knockCard("0");

    expect(match.latestPlayer).toBe("0");
    expect(match.latestOperation).toBe("knock");
    expect(match.hostCards).toHaveLength(12);
    expect(match.guestCards).toHaveLength(12);
  });

  it("initializes and performs the same bot turn shape as the Python bot", () => {
    const match = new Match("bot", true, () => 0.4);
    const operation = match.performBotTurn();

    expect(match.bot).not.toBeNull();
    expect(["stack", "dropzone"]).toContain(operation.operation);
    expect(operation.playerId).toBe("0");
    expect(match.guestCards).toHaveLength(12);
  });
});
