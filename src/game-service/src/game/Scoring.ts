import type { Card, PlayerId, ScoreRound, ScoreSummary } from "./gameTypes.js";
import { otherPlayer } from "./gameTypes.js";
import {
  BIG_GIN_BONUS,
  CARDS_PER_HAND,
  GIN_BONUS,
  KNOCK_THRESHOLD,
  MAX_SET_SIZE,
  MIN_MELD_SIZE,
  UNDERCUT_BONUS,
} from "./RuleConstants.js";

export interface HandSummary {
  cards: Card[];
  meldGroups: Card[][];
  melds: Card[];
  deadwoods: Card[];
  deadwoodPoint: number;
}

export interface LayoffSummary {
  deadwoods: Card[];
  laidOff: Card[];
  deadwoodPoint: number;
}

interface RoundScoreResult {
  scoreSummary: ScoreSummary;
  result: "Knock" | "Gin" | "Big Gin" | "Undercut";
  winner: PlayerId;
}

function suitOf(card: Card): string {
  return card.name.split("-")[0] ?? "";
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

export function isValidSet(cards: readonly Card[]): boolean {
  if (cards.length < MIN_MELD_SIZE || cards.length > MAX_SET_SIZE) return false;
  const names = new Set(cards.map((card) => card.name));
  const suits = new Set(cards.map(suitOf));
  return names.size === cards.length
    && suits.size === cards.length
    && cards.every((card) => card.order === cards[0]?.order);
}

export function isValidRun(cards: readonly Card[]): boolean {
  if (cards.length < MIN_MELD_SIZE) return false;
  const names = new Set(cards.map((card) => card.name));
  if (names.size !== cards.length || new Set(cards.map(suitOf)).size !== 1) return false;
  const sorted = [...cards].sort((left, right) => left.order - right.order);
  return sorted.every((card, index) => index === 0 || card.order === sorted[index - 1]!.order + 1);
}

export function calculateHandSummary(inputCards: readonly Card[]): HandSummary {
  const cards = inputCards.map((card) => ({ ...card }));
  const suits = new Map<string, Card[]>();
  const ranks = new Map<number, Card[]>();

  for (const card of cards) {
    const suit = suitOf(card);
    suits.set(suit, [...(suits.get(suit) ?? []), card]);
    ranks.set(card.order, [...(ranks.get(card.order) ?? []), card]);
  }

  const runs: Card[][] = [];
  for (const suitedCards of suits.values()) {
    const sorted = [...new Map(suitedCards.map((card) => [card.name, card])).values()]
      .sort((left, right) => left.order - right.order);
    for (let start = 0; start < sorted.length; start += 1) {
      const run = [sorted[start]!];
      for (let index = start + 1; index < sorted.length; index += 1) {
        const current = sorted[index]!;
        const previous = run.at(-1)!;
        if (current.order === previous.order + 1) {
          run.push(current);
          if (isValidRun(run)) runs.push([...run]);
        } else if (current.order > previous.order + 1) {
          break;
        }
      }
    }
  }

  const sets: Card[][] = [];
  for (const rankedCards of ranks.values()) {
    const uniqueCards = [...new Map(rankedCards.map((card) => [suitOf(card), card])).values()];
    for (let size = MIN_MELD_SIZE; size <= Math.min(MAX_SET_SIZE, uniqueCards.length); size += 1) {
      sets.push(...combinations(uniqueCards, size).filter(isValidSet));
    }
  }

  const candidates = [...runs, ...sets];
  let bestMeldGroups: Card[][] = [];
  let bestDeadwood = cards.reduce((sum, card) => sum + card.point, 0);

  const explore = (meldGroups: Card[][], used: Set<string>, index: number): void => {
    if (index === candidates.length) {
      const deadwoodPoint = cards
        .filter((card) => !used.has(card.name))
        .reduce((sum, card) => sum + card.point, 0);
      const meldCardCount = meldGroups.reduce((sum, meld) => sum + meld.length, 0);
      const bestMeldCardCount = bestMeldGroups.reduce((sum, meld) => sum + meld.length, 0);
      if (deadwoodPoint < bestDeadwood
        || (deadwoodPoint === bestDeadwood && meldCardCount > bestMeldCardCount)) {
        bestDeadwood = deadwoodPoint;
        bestMeldGroups = [...meldGroups];
      }
      return;
    }

    explore(meldGroups, used, index + 1);
    const candidate = candidates[index]!;
    if (candidate.some((card) => used.has(card.name))) return;
    const nextUsed = new Set(used);
    candidate.forEach((card) => nextUsed.add(card.name));
    explore([...meldGroups, candidate], nextUsed, index + 1);
  };

  explore([], new Set<string>(), 0);
  const melds = bestMeldGroups.flat();
  const used = new Set(melds.map((card) => card.name));
  const deadwoods = cards.filter((card) => !used.has(card.name));
  return { cards, meldGroups: bestMeldGroups, melds, deadwoods, deadwoodPoint: bestDeadwood };
}

function canAddToMeld(card: Card, meld: readonly Card[]): boolean {
  if (isValidSet(meld)) {
    return meld.length < MAX_SET_SIZE
      && card.order === meld[0]?.order
      && !meld.some((meldCard) => suitOf(meldCard) === suitOf(card));
  }
  if (isValidRun(meld)) {
    if (suitOf(card) !== suitOf(meld[0]!)) return false;
    const orders = meld.map((meldCard) => meldCard.order);
    return card.order === Math.min(...orders) - 1 || card.order === Math.max(...orders) + 1;
  }
  return false;
}

export function calculateLayingOff(
  inputDeadwoods: readonly Card[],
  inputMeldGroups: readonly (readonly Card[])[],
): LayoffSummary {
  const original = inputDeadwoods.map((card) => ({ ...card }));
  const meldGroups = inputMeldGroups.map((meld) => meld.map((card) => ({ ...card })));

  const search = (deadwoods: Card[], melds: Card[][], laidOff: Card[]): LayoffSummary => {
    let best: LayoffSummary = {
      deadwoods,
      laidOff,
      deadwoodPoint: deadwoods.reduce((sum, card) => sum + card.point, 0),
    };

    for (let cardIndex = 0; cardIndex < deadwoods.length; cardIndex += 1) {
      const card = deadwoods[cardIndex]!;
      for (let meldIndex = 0; meldIndex < melds.length; meldIndex += 1) {
        const meld = melds[meldIndex]!;
        if (!canAddToMeld(card, meld)) continue;
        const nextDeadwoods = deadwoods.filter((_, index) => index !== cardIndex);
        const nextMelds = melds.map((group, index) => index === meldIndex ? [...group, card] : group);
        const candidate = search(nextDeadwoods, nextMelds, [...laidOff, card]);
        if (candidate.deadwoodPoint < best.deadwoodPoint
          || (candidate.deadwoodPoint === best.deadwoodPoint && candidate.laidOff.length > best.laidOff.length)) {
          best = candidate;
        }
      }
    }
    return best;
  };

  return search(original, meldGroups, []);
}

export function canKnock(cards: readonly Card[]): boolean {
  const summary = calculateHandSummary(cards);
  return cards.length === CARDS_PER_HAND
    ? summary.deadwoodPoint <= KNOCK_THRESHOLD
    : cards.length === CARDS_PER_HAND + 1 && summary.deadwoodPoint === 0;
}

export function calculateRoundScore(
  knocker: PlayerId,
  knockerCards: readonly Card[],
  opponentCards: readonly Card[],
  previousSummary: ScoreSummary | null,
): RoundScoreResult {
  const mine = calculateHandSummary(knockerCards);
  const opponent = calculateHandSummary(opponentCards);
  const isBigGin = mine.cards.length === CARDS_PER_HAND + 1 && mine.deadwoodPoint === 0;
  const isGin = mine.cards.length === CARDS_PER_HAND && mine.deadwoodPoint === 0;
  const adjustedOpponentDeadwood = isGin || isBigGin
    ? opponent.deadwoodPoint
    : calculateLayingOff(opponent.deadwoods, mine.meldGroups).deadwoodPoint;

  let baseScore = 0;
  let bonus = 0;
  let result: RoundScoreResult["result"] = "Knock";
  if (isGin || isBigGin) {
    baseScore = opponent.deadwoodPoint;
    bonus = isBigGin ? BIG_GIN_BONUS : GIN_BONUS;
    result = isBigGin ? "Big Gin" : "Gin";
  } else if (mine.deadwoodPoint < adjustedOpponentDeadwood) {
    baseScore = adjustedOpponentDeadwood - mine.deadwoodPoint;
  } else {
    baseScore = mine.deadwoodPoint - adjustedOpponentDeadwood;
    bonus = UNDERCUT_BONUS;
    result = "Undercut";
  }

  const winner = result === "Undercut" ? otherPlayer(knocker) : knocker;
  const winnerIsPlayerOne = winner === "0";
  const round: ScoreRound = {
    round: (previousSummary?.rounds.length ?? 0) + 1,
    p1Score: winnerIsPlayerOne ? baseScore : 0,
    p1Bonus: winnerIsPlayerOne ? bonus : 0,
    p1Total: winnerIsPlayerOne ? baseScore + bonus : 0,
    p2Score: winnerIsPlayerOne ? 0 : baseScore,
    p2Bonus: winnerIsPlayerOne ? 0 : bonus,
    p2Total: winnerIsPlayerOne ? 0 : baseScore + bonus,
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
    winner,
  };
}
