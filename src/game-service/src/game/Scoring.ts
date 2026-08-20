import type { Card, PlayerId, ScoreRound, ScoreSummary } from "./gameTypes.js";
import { otherPlayer } from "./gameTypes.js";

interface HandSummary {
  cards: Card[];
  melds: Card[];
  deadwoods: Card[];
  deadwoodPoint: number;
}

interface RoundScoreResult {
  scoreSummary: ScoreSummary;
  result: "Knock" | "Gin" | "Big Gin" | "Undercut";
  winner: PlayerId;
}

function combinations(cards: Card[], size: number): Card[][] {
  if (size > cards.length) return [];
  if (size === cards.length) return [cards];
  if (size === 1) return cards.map((card) => [card]);
  const result: Card[][] = [];
  cards.forEach((card, index) => {
    for (const rest of combinations(cards.slice(index + 1), size - 1)) {
      result.push([card, ...rest]);
    }
  });
  return result;
}

export function calculateHandSummary(inputCards: readonly Card[]): HandSummary {
  const cards = inputCards.map((card) => ({ ...card }));
  const suits = new Map<string, Card[]>();
  const ranks = new Map<string, Card[]>();

  for (const card of cards) {
    const [suit = "", rank = ""] = card.name.split("-");
    suits.set(suit, [...(suits.get(suit) ?? []), card]);
    ranks.set(rank, [...(ranks.get(rank) ?? []), card]);
  }

  const runs: Card[][] = [];
  for (const suitedCards of suits.values()) {
    const sorted = [...suitedCards].sort((left, right) => left.order - right.order);
    for (let start = 0; start < sorted.length; start += 1) {
      const first = sorted[start];
      if (!first) continue;
      const run = [first];
      for (let index = start + 1; index < sorted.length; index += 1) {
        const previous = run.at(-1);
        const current = sorted[index];
        if (!previous || !current) continue;
        if (current.order === previous.order + 1) {
          run.push(current);
          if (run.length >= 3) runs.push([...run]);
        } else if (current.order > previous.order + 1) {
          break;
        }
      }
    }
  }

  const sets: Card[][] = [];
  for (const rankedCards of ranks.values()) {
    if (rankedCards.length < 3) continue;
    for (let size = 3; size <= rankedCards.length; size += 1) {
      sets.push(...combinations(rankedCards, size));
    }
  }

  const candidates = [...runs, ...sets];
  let bestMelds: Card[][] = [];
  let bestDeadwood = Number.POSITIVE_INFINITY;

  const explore = (melds: Card[][], used: Set<string>, index: number): void => {
    if (index === candidates.length) {
      const deadwoods = cards.filter((card) => !used.has(card.name));
      const deadwoodPoint = deadwoods.reduce((sum, card) => sum + card.point, 0);
      const meldCardCount = melds.flat().length;
      if (
        deadwoodPoint < bestDeadwood
        || (deadwoodPoint === bestDeadwood && meldCardCount > bestMelds.flat().length)
      ) {
        bestDeadwood = deadwoodPoint;
        bestMelds = [...melds];
      }
      return;
    }

    explore(melds, used, index + 1);
    const candidate = candidates[index];
    if (!candidate || candidate.some((card) => used.has(card.name))) return;
    const nextUsed = new Set(used);
    candidate.forEach((card) => nextUsed.add(card.name));
    explore([...melds, candidate], nextUsed, index + 1);
  };

  explore([], new Set<string>(), 0);
  const melds = bestMelds.flat();
  const used = new Set(melds.map((card) => card.name));
  const deadwoods = cards.filter((card) => !used.has(card.name));
  return { cards, melds, deadwoods, deadwoodPoint: bestDeadwood };
}

function calculateLayingOff(deadwoods: readonly Card[], melds: readonly Card[]): number {
  const setsByRank = new Map<string, Set<string>>();
  const runsBySuit = new Map<string, Set<number>>();

  for (const card of melds) {
    const [suit = "", rank = ""] = card.name.split("-");
    const suits = setsByRank.get(rank) ?? new Set<string>();
    suits.add(suit);
    setsByRank.set(rank, suits);

    const rankNumber = Number.parseInt(rank, 16);
    if (!Number.isNaN(rankNumber)) {
      const ranks = runsBySuit.get(suit) ?? new Set<number>();
      ranks.add(rankNumber);
      runsBySuit.set(suit, ranks);
    }
  }

  const remaining: Card[] = [];
  const candidates: Card[] = [];
  for (const card of deadwoods) {
    const [suit = "", rank = ""] = card.name.split("-");
    const matchingSet = setsByRank.get(rank);
    const canLayOffToSet = Boolean(matchingSet && matchingSet.size >= 3 && !matchingSet.has(suit));

    const rankNumber = Number.parseInt(rank, 16);
    const suitedRun = runsBySuit.get(suit);
    let canLayOffToRun = false;
    if (suitedRun && !Number.isNaN(rankNumber)) {
      const sorted = [...suitedRun].sort((left, right) => left - right);
      const minimum = sorted[0];
      const maximum = sorted.at(-1);
      canLayOffToRun = minimum !== undefined
        && maximum !== undefined
        && (rankNumber === minimum - 1 || rankNumber === maximum + 1);
    }

    (canLayOffToSet || canLayOffToRun ? candidates : remaining).push(card);
  }

  if (candidates.length > 0) {
    const best = candidates.reduce((maximum, card) => card.point > maximum.point ? card : maximum);
    for (const card of candidates) {
      if (card !== best) remaining.push(card);
    }
  }
  return remaining.reduce((sum, card) => sum + card.point, 0);
}

export function calculateRoundScore(
  knocker: PlayerId,
  knockerCards: readonly Card[],
  opponentCards: readonly Card[],
  previousSummary: ScoreSummary | null,
): RoundScoreResult {
  const mine = calculateHandSummary(knockerCards);
  const opponent = calculateHandSummary(opponentCards);
  const isGin = mine.deadwoodPoint === 0;
  const isBigGin = isGin && mine.cards.length === 13;
  const adjustedOpponentDeadwood = isGin
    ? opponent.deadwoodPoint
    : calculateLayingOff(opponent.deadwoods, mine.melds);

  let baseScore = 0;
  let bonus = 0;
  let result: RoundScoreResult["result"] = "Knock";
  if (isGin) {
    baseScore = opponent.deadwoodPoint;
    bonus = isBigGin ? 45 : 36;
    result = isBigGin ? "Big Gin" : "Gin";
  } else if (mine.deadwoodPoint < adjustedOpponentDeadwood) {
    baseScore = adjustedOpponentDeadwood - mine.deadwoodPoint;
  } else {
    baseScore = mine.deadwoodPoint - adjustedOpponentDeadwood;
    bonus = 36;
    result = "Undercut";
  }

  const round: ScoreRound = {
    round: (previousSummary?.rounds.length ?? 0) + 1,
    p1Score: result === "Undercut" ? baseScore : 0,
    p1Bonus: result === "Undercut" ? bonus : 0,
    p1Total: result === "Undercut" ? baseScore + bonus : 0,
    p2Score: result === "Undercut" ? 0 : baseScore,
    p2Bonus: result === "Undercut" ? 0 : bonus,
    p2Total: result === "Undercut" ? 0 : baseScore + bonus,
    result,
  };
  const rounds = [...(previousSummary?.rounds ?? []), round];
  const scoreSummary: ScoreSummary = {
    rounds,
    p1TotalScore: rounds.reduce((sum, item) => sum + item.p1Total, 0),
    p2TotalScore: rounds.reduce((sum, item) => sum + item.p2Total, 0),
  };
  return {
    scoreSummary,
    result,
    winner: result === "Undercut" ? otherPlayer(knocker) : knocker,
  };
}

export function previousScoreSummary(summary: ScoreSummary): ScoreSummary | null {
  const rounds = summary.rounds.slice(0, -1);
  if (rounds.length === 0) return null;
  return {
    rounds,
    p1TotalScore: rounds.reduce((sum, round) => sum + round.p1Total, 0),
    p2TotalScore: rounds.reduce((sum, round) => sum + round.p2Total, 0),
  };
}
