import type { Card } from "./gameTypes.js";
import { RANKS, SUITS } from "./RuleConstants.js";

export const DECK: readonly Card[] = SUITS.flatMap((suit) =>
  RANKS.map((rank, index): Card => {
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
