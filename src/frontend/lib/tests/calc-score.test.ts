import calculateGinRummyScore from '../cards-play/logics/calc-score';
import { CARDS } from '../data/cards.data';

const getCard = (name: string) => {
  const card = CARDS.find(c => c.name === name);
  if (!card) throw new Error(`Card not found: ${name}`);
  return card;
};

test('should not recognize invalid run when a card is missing', () => {
  // 少了 hearts-0B
  const cards = [
    // 'hearts-08',
    // 'hearts-09',
    // 'hearts-0A',
    // 'hearts-10',
    // 'hearts-J'

    // 'spades-03','spades-04', 'spades-05', 'spades-06', 
    // 'diamonds-J', 'clubs-J','spades-J',
    // 'hearts-C', 'clubs-C','spades-C',
    // 'hearts-Q', 'clubs-Q','spades-Q',

    'diamonds-03','spades-03', 
    'hearts-04', 'hearts-05', 
    'diamonds-08', 'hearts-08',
    'hearts-C','hearts-0B','hearts-J',
    'hearts-K','spades-K','clubs-K'
  ].map(getCard);

  const result = calculateGinRummyScore(cards);

  const runNames = result.Runs.map(c => c.name);

  // // 不应包含 hearts-0↋（因为根本没有）
  // expect(runNames).not.toContain('hearts-0↋');

  // // 应该识别到最合理的 run（例如 08 09 0↊）
  // expect(runNames).toEqual(expect.arrayContaining([
  //   'hearts-08', 'hearts-09', 'hearts-0A'
  // ]));

  console.log(result.DeadwoodsPoint);
  console.log(result.DeadwoodsDozenalPoint);
  
  expect(result.DeadwoodsPoint).toBe(66);

});
