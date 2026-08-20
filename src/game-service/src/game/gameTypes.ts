export type PlayerId = "0" | "1";

export type DrawSource = "stack" | "dropzone";

export interface Card {
  order: number;
  point: number;
  name: string;
  image: string;
  color: string;
  text: string;
}

export interface GameOperation {
  playerId: PlayerId;
  operation: DrawSource | "knock";
  droppedCard: Card;
  pickedCard: Card;
  remainingCards: number;
}

export interface DealState {
  matchId: string;
  round: number;
  dealer: PlayerId;
  firstPlayer: PlayerId;
  playerId: PlayerId;
  ownCards: Card[];
  opponentCards: Card[];
  dropCard: Card;
  remainingCards: number;
}

export type RoundPhase =
  | "waiting-deal"
  | "initial-offer"
  | "draw"
  | "discard"
  | "round-over";

export interface ScoreRound {
  round: number;
  p1Score: number;
  p1Bonus: number;
  p1Total: number;
  p2Score: number;
  p2Bonus: number;
  p2Total: number;
  result: string;
}

export interface ScoreSummary {
  rounds: ScoreRound[];
  p1TotalScore: number;
  p2TotalScore: number;
}

export interface RoundResult {
  matchId: string;
  round: number;
  submittedBy: PlayerId;
  winner: PlayerId;
  scoreSummary: ScoreSummary;
}

export function otherPlayer(playerId: PlayerId): PlayerId {
  return playerId === "1" ? "0" : "1";
}
