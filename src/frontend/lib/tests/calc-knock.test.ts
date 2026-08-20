import { calculateRoundScore } from '../cards-play/logics/calc-knock';
import calculateGinRummyScore from '../cards-play/logics/calc-score'
import { CARDS } from '../data/cards.data';
import type { PlayerSummary, ScoreSummary } from '../models/card-animation.model';

const getCard = (name: string) => {
  const card = CARDS.find(c => c.name === name);
  if (!card) throw new Error(`Card not found: ${name}`);
  return card;
};

describe('calculateRoundScore – Knock with lay off', () => {
  it('should count correct score when knock with Q and allow opponent to lay off', () => {
    // 🟦 模拟 P2 的牌（13张，其中1张 Q 是 deadwood）
    const myHandCard = [
      'spades-06','spades-07', 'spades-08', 'spades-09', 'spades-0A', 'spades-0B',
      'diamonds-J', 'clubs-J','spades-J',
      'clubs-C','spades-C','diamonds-C',
      'diamonds-Q'

      // Big Gin
      // 'spades-03','spades-04', 'spades-05', 'spades-06', 
      // 'diamonds-J', 'clubs-J','spades-J',
      // 'hearts-C', 'clubs-C','spades-C',
      // 'hearts-Q', 'clubs-Q','spades-Q',
    ].map(getCard);

    const player2Cards =  calculateGinRummyScore(myHandCard)

    // 🟥 模拟 P1 的牌（原始 deadwood 为 56z，其中 J♥ 可 lay off）
    const opponentCards = [
      'diamonds-03','spades-03', 
      'hearts-04', 'hearts-05', 
      'diamonds-08', 'hearts-08',
      'hearts-C','hearts-0B','hearts-J',
      'hearts-K','spades-K','clubs-K'
    ].map(getCard);

    const player1Cards = calculateGinRummyScore(opponentCards)

    
    console.log(player2Cards.DeadwoodsPoint, player2Cards.DeadwoodsDozenalPoint);
    console.log(player1Cards.DeadwoodsPoint, player1Cards.DeadwoodsDozenalPoint);


    const scoreSummary: ScoreSummary | null = null;

    const result = calculateRoundScore({
      host: '1',
      player1Cards,
      player2Cards,
      scoreSummary
    });

    // ✅ 打印调试信息（可删）



  
    // console.log('p2Score:', result.newScoreSummary.rounds[0].p2Score);
    // console.log('p2Bonus:', result.newScoreSummary.rounds[0].p2Bonus);
    // console.log('p2Total:', result.newScoreSummary.rounds[0].p2Total);
    // console.log('result:', result.result);

    // ✅ 正确断言
    expect(result.result).toBe('Knock');
    // expect(result.result).toBe('Big Gin');
    // expect(result.newScoreSummary.rounds[0].p2Bonus).toBe(0);     // 不是 Gin 没 bonus
    expect(result.newScoreSummary.rounds[0].p2Score).toBe(42);    // 46 - 10
    expect(result.newScoreSummary.rounds[0].p2Total).toBe(42);    // total = score + bonus
  });
});
