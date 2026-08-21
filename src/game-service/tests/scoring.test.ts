import { describe, expect, it } from "vitest";
import { DECK } from "../src/game/Card.js";
import {
  calculateHandSummary,
  calculateLayingOff,
  calculateRoundScore,
  canKnock,
  isValidRun,
  isValidSet,
} from "../src/game/Scoring.js";
import { RANKS, SUITS } from "../src/game/RuleConstants.js";

function cards(names: string[]) {
  return names.map((name) => {
    const card = DECK.find((candidate) => candidate.name === name);
    if (!card) throw new Error(`Card not found: ${name}`);
    return { ...card };
  });
}

const nineMeldCards = [
  "spades-01", "spades-02", "spades-03",
  "hearts-04", "hearts-05", "hearts-06",
  "clubs-07", "clubs-08", "clubs-09",
];

describe("Base-12 deck", () => {
  it("contains exactly 64 unique cards and all 16 ordered ranks in every suit", () => {
    expect(DECK).toHaveLength(64);
    expect(new Set(DECK.map((card) => card.name)).size).toBe(64);
    expect(RANKS.map((rank) => rank.text)).toEqual([
      "1", "2", "3", "4", "5", "6", "7", "8", "9", "↊", "↋", "10", "J", "C", "Q", "K",
    ]);
    for (const suit of SUITS) {
      const suitedCards = DECK.filter((card) => card.name.startsWith(`${suit.name}-`));
      expect(suitedCards).toHaveLength(16);
      expect(suitedCards.map((card) => card.order)).toEqual(Array.from({ length: 16 }, (_, index) => index + 1));
    }
  });

  it.each([
    ["spades-09", 9],
    ["spades-0A", 10],
    ["spades-0B", 11],
    ["spades-10", 12],
    ["spades-J", 12],
    ["spades-C", 12],
    ["spades-Q", 12],
    ["spades-K", 12],
  ])("assigns %s a decimal deadwood value of %i", (name, point) => {
    expect(cards([name])[0]!.point).toBe(point);
  });
});

describe("meld validation and optimization", () => {
  it("accepts three- and four-card Sets, but rejects two cards and duplicate suits", () => {
    expect(isValidSet(cards(["spades-07", "hearts-07", "diamonds-07"]))).toBe(true);
    expect(isValidSet(cards(["spades-0B", "hearts-0B", "diamonds-0B", "clubs-0B"]))).toBe(true);
    expect(isValidSet(cards(["spades-07", "hearts-07"]))).toBe(false);
    const duplicate = cards(["spades-07", "hearts-07"]);
    duplicate.push({ ...duplicate[0]! });
    expect(isValidSet(duplicate)).toBe(false);
  });

  it("uses the exact 16-rank sequence for same-suit Runs", () => {
    expect(isValidRun(cards(["hearts-04", "hearts-05", "hearts-06"]))).toBe(true);
    expect(isValidRun(cards(["spades-09", "spades-0A", "spades-0B", "spades-10"]))).toBe(true);
    expect(isValidRun(cards(["diamonds-0B", "diamonds-10", "diamonds-J", "diamonds-C", "diamonds-Q", "diamonds-K"]))).toBe(true);
    expect(isValidRun(cards(["hearts-04", "spades-05", "hearts-06"]))).toBe(false);
  });

  it("chooses the overlapping Set/Run combination with minimum Deadwood", () => {
    const summary = calculateHandSummary(cards([
      "hearts-03", "hearts-04", "hearts-05", "clubs-05", "diamonds-05",
    ]));
    expect(summary.deadwoodPoint).toBe(7);
    expect(summary.meldGroups.map((meld) => meld.map((card) => card.name))).toContainEqual([
      "hearts-05", "clubs-05", "diamonds-05",
    ]);
  });
});

describe("Knock, Gin, and Big Gin", () => {
  it.each([
    [["diamonds-01", "diamonds-02", "hearts-08"], 11, true],
    [["diamonds-01", "diamonds-02", "hearts-09"], 12, true],
    [["diamonds-01", "diamonds-02", "hearts-0A"], 13, false],
  ])("validates the 10₁₂ Knock threshold", (deadwoodNames, deadwood, allowed) => {
    const hand = cards([...nineMeldCards, ...deadwoodNames]);
    expect(calculateHandSummary(hand).deadwoodPoint).toBe(deadwood);
    expect(canKnock(hand)).toBe(allowed);
  });

  it("detects 12-card Gin and applies the 30₁₂ bonus without Lay Off", () => {
    const gin = cards([
      "spades-01", "spades-02", "spades-03",
      "hearts-04", "hearts-05", "hearts-06",
      "clubs-07", "clubs-08", "clubs-09",
      "diamonds-J", "diamonds-C", "diamonds-Q",
    ]);
    const opponent = cards(["spades-04", "spades-05"]);
    expect(calculateHandSummary(gin).deadwoodPoint).toBe(0);
    const score = calculateRoundScore("1", gin, opponent, null);
    expect(score.result).toBe("Gin");
    expect(score.scoreSummary.rounds[0]).toMatchObject({ p2Score: 9, p2Bonus: 36, p2Total: 45 });
  });

  it("detects 13-card Big Gin without a discard and applies the 39₁₂ bonus", () => {
    const bigGin = cards([
      "spades-01", "spades-02", "spades-03", "spades-04",
      "hearts-05", "hearts-06", "hearts-07",
      "spades-08", "hearts-08", "diamonds-08",
      "clubs-J", "clubs-C", "clubs-Q",
    ]);
    expect(bigGin).toHaveLength(13);
    expect(calculateHandSummary(bigGin).deadwoodPoint).toBe(0);
    expect(canKnock(bigGin)).toBe(true);
    const score = calculateRoundScore("0", bigGin, cards(["diamonds-01"]), null);
    expect(score.result).toBe("Big Gin");
    expect(score.scoreSummary.rounds[0]).toMatchObject({ p1Score: 1, p1Bonus: 45, p1Total: 46 });
  });
});

describe("Lay Off and Undercut", () => {
  it("lays off multiple cards sequentially onto a Run", () => {
    const result = calculateLayingOff(
      cards(["hearts-04", "hearts-05", "clubs-02"]),
      [cards(["hearts-06", "hearts-07", "hearts-08"])],
    );
    expect(result.laidOff.map((card) => card.name)).toEqual(expect.arrayContaining(["hearts-04", "hearts-05"]));
    expect(result.deadwoodPoint).toBe(2);
  });

  it("lays the fourth suit onto a three-card Set", () => {
    const result = calculateLayingOff(
      cards(["spades-07", "clubs-02"]),
      [cards(["clubs-07", "hearts-07", "diamonds-07"])],
    );
    expect(result.laidOff.map((card) => card.name)).toContain("spades-07");
    expect(result.deadwoodPoint).toBe(2);
  });

  it("scores the Deadwood difference for a normal Knock", () => {
    const knocker = cards([...nineMeldCards, "diamonds-01", "diamonds-02", "hearts-08"]);
    const opponent = cards([...nineMeldCards, "diamonds-01", "diamonds-02", "hearts-0A"]);
    const score = calculateRoundScore("1", knocker, opponent, null);
    expect(score.result).toBe("Knock");
    expect(score.winner).toBe("1");
    expect(score.scoreSummary.rounds[0]).toMatchObject({ p2Score: 2, p2Bonus: 0, p2Total: 2 });
  });

  it.each([
    [["diamonds-01", "diamonds-02", "clubs-03"], 6, 38],
    [["diamonds-01", "diamonds-02", "clubs-05"], 8, 36],
  ])("awards an Undercut when opponent Deadwood is lower or equal", (opponentDeadwoods, expectedDeadwood, expectedScore) => {
    const knocker = cards([...nineMeldCards, "diamonds-01", "diamonds-02", "diamonds-05"]);
    const opponent = cards([...nineMeldCards, ...opponentDeadwoods]);
    expect(calculateHandSummary(knocker).deadwoodPoint).toBe(8);
    expect(calculateHandSummary(opponent).deadwoodPoint).toBe(expectedDeadwood);
    const score = calculateRoundScore("1", knocker, opponent, null);
    expect(score.result).toBe("Undercut");
    expect(score.winner).toBe("0");
    expect(score.scoreSummary.rounds[0]?.p1Total).toBe(expectedScore);
  });
});
