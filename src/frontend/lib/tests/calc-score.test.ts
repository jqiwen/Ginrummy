import calculateGinRummyScore from '../cards-play/logics/calc-score';
import { CARDS } from '../data/cards.data';

function cards(names: string[]) {
  return names.map((name) => {
    const card = CARDS.find((candidate) => candidate.name === name);
    if (!card) throw new Error(`Card not found: ${name}`);
    return card;
  });
}

describe('client meld feedback', () => {
  it('recognizes the custom ↊, ↋, 10 rank sequence', () => {
    const result = calculateGinRummyScore(cards([
      'spades-09', 'spades-0A', 'spades-0B', 'spades-10',
    ]));
    expect(result.DeadwoodsPoint).toBe(0);
    expect(result.Runs?.map((card) => card.name)).toEqual([
      'spades-09', 'spades-0A', 'spades-0B', 'spades-10',
    ]);
  });

  it('chooses the overlapping meld combination with minimum Deadwood', () => {
    const result = calculateGinRummyScore(cards([
      'hearts-03', 'hearts-04', 'hearts-05', 'clubs-05', 'diamonds-05',
    ]));
    expect(result.DeadwoodsPoint).toBe(7);
    expect(result.Sets?.map((card) => card.name)).toEqual(expect.arrayContaining([
      'hearts-05', 'clubs-05', 'diamonds-05',
    ]));
  });
});
