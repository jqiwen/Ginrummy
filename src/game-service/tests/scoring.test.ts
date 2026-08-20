import { describe, expect, it } from "vitest";
import { DECK } from "../src/game/Card.js";
import { calculateRoundScore } from "../src/game/Scoring.js";

function cards(names: string[]) {
  return names.map((name) => {
    const card = DECK.find((candidate) => candidate.name === name);
    if (!card) throw new Error(`Card not found: ${name}`);
    return card;
  });
}

describe("authoritative scoring", () => {
  it("matches the existing knock and lay-off score", () => {
    const knocker = cards([
      "spades-06", "spades-07", "spades-08", "spades-09", "spades-0A", "spades-0B",
      "diamonds-J", "clubs-J", "spades-J",
      "clubs-C", "spades-C", "diamonds-C",
      "diamonds-Q",
    ]);
    const opponent = cards([
      "diamonds-03", "spades-03",
      "hearts-04", "hearts-05",
      "diamonds-08", "hearts-08",
      "hearts-C", "hearts-0B", "hearts-J",
      "hearts-K", "spades-K", "clubs-K",
    ]);

    const score = calculateRoundScore("1", knocker, opponent, null);
    expect(score.result).toBe("Knock");
    expect(score.scoreSummary.rounds[0]?.p2Score).toBe(42);
    expect(score.winner).toBe("1");
  });
});
