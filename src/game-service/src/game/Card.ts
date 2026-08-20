import type { Card } from "./gameTypes.js";

const ranks = [
  { suffix: "01", text: "1", point: 1 },
  { suffix: "02", text: "2", point: 2 },
  { suffix: "03", text: "3", point: 3 },
  { suffix: "04", text: "4", point: 4 },
  { suffix: "05", text: "5", point: 5 },
  { suffix: "06", text: "6", point: 6 },
  { suffix: "07", text: "7", point: 7 },
  { suffix: "08", text: "8", point: 8 },
  { suffix: "09", text: "9", point: 9 },
  { suffix: "0A", text: "↊", point: 10 },
  { suffix: "0B", text: "↋", point: 11 },
  { suffix: "10", text: "10", point: 12 },
  { suffix: "J", text: "J", point: 12 },
  { suffix: "C", text: "C", point: 12 },
  { suffix: "Q", text: "Q", point: 12 },
  { suffix: "K", text: "K", point: 12 },
] as const;

const suits = [
  { name: "clubs", directory: "clubs", display: "Clubs", color: "text-green-700" },
  { name: "diamonds", directory: "diamonds", display: "Diamonds", color: "text-yellow-600" },
  { name: "hearts", directory: "Hearts", display: "Hearts", color: "text-red-600" },
  { name: "spades", directory: "spades", display: "Spades", color: "text-black" },
] as const;

export const DECK: readonly Card[] = suits.flatMap((suit) =>
  ranks.map((rank, index): Card => {
    const filename = index < 12
      ? `${suit.name}-${rank.suffix}.svg.png`
      : `${suit.display}-${rank.suffix}.svg.png`;

    return {
      order: index + 1,
      point: rank.point,
      name: `${suit.name}-${rank.suffix}`,
      image: `/cards-image/${suit.directory}/${filename}`,
      color: suit.color,
      text: rank.text,
    };
  }),
);

export function cloneCard(card: Card): Card {
  return { ...card };
}
