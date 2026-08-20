import { Card, PlayerSummary, ScoreSummary } from '../../models/card-animation.model';
import { calculateLayingOff } from './laying-off';

export function calculateRoundScore({
  host,
  player1Cards,
  player2Cards,
  scoreSummary,
}: {
  host: string;
  player1Cards: PlayerSummary;
  player2Cards: PlayerSummary;
  scoreSummary: ScoreSummary | null;
}) {
  const isHost = host === '1';
  const myCards = player2Cards;
  const opponentCards = player1Cards;

  const myDeadwood = myCards.DeadwoodsPoint || 0;
  let adjustedOpponentDeadwood = opponentCards.DeadwoodsPoint || 0;
  const opponentDeadwood = opponentCards.DeadwoodsPoint || 0;

  const myHandLength = myCards?.cards?.length || 0;
  const isGin = myDeadwood === 0;
  const isBigGin = isGin && myHandLength === 13;

  if (!isGin && myCards.Melds && opponentCards.cards) {
    // const layingOffResult = calculateLayingOff(opponentCards.cards, myCards.Melds);
    const layingOffResult = calculateLayingOff(opponentCards.Deadwoods ?? [], myCards.Melds);

    adjustedOpponentDeadwood = layingOffResult.adjustedDeadwoodPoint;
    opponentCards.Deadwoods = layingOffResult.updatedDeadwoods;
    opponentCards.DeadwoodsPoint = layingOffResult.updatedDeadwoodsPoint;
    opponentCards.DeadwoodsDozenalPoint = layingOffResult.updatedDeadwoodsDozenalPoint;

  }

  let baseScore = 0;
  let bonus = 0;
  let result = 'Knock';

  if (isGin) {
    baseScore = opponentDeadwood;
    bonus = isBigGin ? 45 : 36;
    result = isBigGin ? 'Big Gin' : 'Gin';
  } else if (myDeadwood < adjustedOpponentDeadwood) {
    baseScore = adjustedOpponentDeadwood - myDeadwood;
  } else {
    baseScore = myDeadwood - adjustedOpponentDeadwood;
    bonus = 36;
    result = 'Undercut';
  }

  let p1Score = 0,
    p1Bonus = 0,
    p2Score = 0,
    p2Bonus = 0;

  if (result === 'Undercut') {
    p1Score = baseScore;
    p1Bonus = bonus;
  } else {
    p2Score = baseScore;
    p2Bonus = bonus;
  }

  const roundData = {
    round: (scoreSummary?.rounds?.length || 0) + 1,
    p1Score,
    p1Bonus,
    p1Total: p1Score + p1Bonus,
    p2Score,
    p2Bonus,
    p2Total: p2Score + p2Bonus,
    result,
  };

  const prevSummary: ScoreSummary =
    scoreSummary || { rounds: [], p1TotalScore: 0, p2TotalScore: 0 };
  const updatedRounds = [...prevSummary.rounds, roundData];
  const p1TotalScore = updatedRounds.reduce((acc, r) => acc + r.p1Total, 0);
  const p2TotalScore = updatedRounds.reduce((acc, r) => acc + r.p2Total, 0);

  const newScoreSummary: ScoreSummary = {
    rounds: updatedRounds,
    p1TotalScore,
    p2TotalScore,
  };

  return {
    newScoreSummary,
    result,
    isBigGin,
  };
}
