import { Card } from '../../models/card-animation.model';
import {decimalToDozenal} from './count-dozenal'

interface LayingOffResult {
  adjustedDeadwoodPoint: number;
  updatedDeadwoods: Card[];
  updatedDeadwoodsPoint: number;
  updatedDeadwoodsDozenalPoint: string;
}

function getSuitAndRank(card: Card): { suit: string; rank: string } {
  const [suit, rank] = card.name.split('-');
  return { suit, rank };
}

export function calculateLayingOff(deadwoods: Card[], melds: Card[]): LayingOffResult {
  if (!deadwoods || !melds) {
    return {
      adjustedDeadwoodPoint: 0,
      updatedDeadwoods: [],
      updatedDeadwoodsPoint: 0,
      updatedDeadwoodsDozenalPoint: '0',
    };
  }

  // Build sets and runs
  const setsByRank: { [rank: string]: Set<string> } = {};
  const runsBySuit: { [suit: string]: Set<number> } = {};

  for (const card of melds) {
    const { suit, rank } = getSuitAndRank(card);

    // Set
    if (!setsByRank[rank]) setsByRank[rank] = new Set();
    setsByRank[rank].add(suit);

    // Run
    const rankNum = parseInt(rank, 16);
    if (!isNaN(rankNum)) {
      if (!runsBySuit[suit]) runsBySuit[suit] = new Set();
      runsBySuit[suit].add(rankNum);
    }
  }

  const remainingDeadwoods: Card[] = [];
  const layOffCandidates: Card[] = [];

  for (const card of deadwoods) {
    const { suit, rank } = getSuitAndRank(card);
    const point = card.point;

    // Check if card can be laid off to set
    const set = setsByRank[rank];
    const canLayOffToSet = set && set.size >= 3 && !set.has(suit);

    // Check if card can be laid off to run
    const rankNum = parseInt(rank, 16);
    const suitRanks = runsBySuit[suit];
    let canLayOffToRun = false;

    if (suitRanks && !isNaN(rankNum)) {
      const sorted = Array.from(suitRanks).sort((a, b) => a - b);
      const min = sorted[0];
      const max = sorted[sorted.length - 1];
      canLayOffToRun = rankNum === min - 1 || rankNum === max + 1;
    }

    if (canLayOffToSet || canLayOffToRun) {
      layOffCandidates.push(card);
    } else {
      remainingDeadwoods.push(card);
    }
  }

  // ⚠️ 只选择最大 point 的 lay off 候选牌
  if (layOffCandidates.length > 0) {
    const bestLayoff = layOffCandidates.reduce((max, curr) => curr.point > max.point ? curr : max, layOffCandidates[0]);
    // 保留其他未被 lay off 的牌
    for (const card of layOffCandidates) {
      if (card !== bestLayoff) remainingDeadwoods.push(card);
    }
  } else {
    // 如果没人能 lay off，全都保留
    remainingDeadwoods.push(...layOffCandidates);
  }

  const totalPoint = remainingDeadwoods.reduce((sum, card) => sum + card.point, 0);

  return {
    adjustedDeadwoodPoint: totalPoint,
    updatedDeadwoods: remainingDeadwoods,
    updatedDeadwoodsPoint: totalPoint,
    updatedDeadwoodsDozenalPoint: decimalToDozenal(totalPoint),
  };
}
