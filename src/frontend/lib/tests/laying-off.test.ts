import { calculateLayingOff } from '../cards-play/logics/laying-off';
import { CARDS } from '../data/cards.data';

const getCard = (name: string) => {
  const card = CARDS.find(c => c.name === name);
  if (!card) throw new Error(`Card not found: ${name}`);
  return card;
};

test('opponent ↋ should be laid off onto knocker set of ↋ ↋ ↋', () => {

  const knockerMelds = [
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

  // const opponentDeadwoods = [
  //   getCard('hearts-J'),        // ✅lay off
  //   getCard('clubs-03'),       // point: 3
  //   getCard('diamonds-05'),     // point: 5
  // ];

  const opponentDeadwoods  = [
    'diamonds-03','spades-03', 
    'hearts-04', 'hearts-05', 
    'diamonds-08', 'hearts-08',
    'hearts-C','hearts-0B','hearts-J',
    // 'hearts-K','spades-K','clubs-K'
  ].map(getCard);

  const result = calculateLayingOff(opponentDeadwoods, knockerMelds);

  // console.log(result);
  

  expect(result.adjustedDeadwoodPoint).toBe(54); 

});
