// 整体卡牌的data
export interface Card {
    order: number,
    point:number;
    name: string;
    image: string;
    color?: string;
    text?:string
    index?:number
}

// 卡牌的拖拽
export interface DraggableCardProps {
    card: Card;
    index: number;
    moveCard: (fromIndex: number, toIndex: number,wholeCardList:Card[]) => void;
    p2Playing: playingStatus
    wholeCardList: Card[]
}

// 气泡提示框
export interface ChatBubbleProps {
  content: string; 
  bgColor: string; 
}
export interface AvatarDisplayProps {
  image: string;
  player: 1 | 2;
  name: string;
  p2Playing: playingStatus;
  p1Playing: playingStatus;
  currentPass: passingStatus;
}

// knock结算
export interface RoundData {
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
  rounds: RoundData[];
  p1TotalScore: number;
  p2TotalScore: number;
}

// 每个player手上牌型的结算
export interface PlayerSummary{
    cards: Card[]
    Melds?: Card[]
    MeldsPoint?: number
    Deadwoods?: Card[]
    DeadwoodsPoint?: number
    DeadwoodsDozenalPoint?: string
    Sets?:Card[]
    Runs?:Card[]
  }

export type playingStatus = 'pickTop' |'toTake' |'toDrop' | 'toDeal' | 'passOrPick' | null
export type passingStatus = 1|2|null
export type sendingNewCardPlace = 'stack'|'dropzone' | null
