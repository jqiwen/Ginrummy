export const CARDS_PER_HAND = 12;
export const KNOCK_THRESHOLD = 12;
export const GIN_BONUS = 36;
export const BIG_GIN_BONUS = 45;
export const UNDERCUT_BONUS = 36;
export const MIN_MELD_SIZE = 3;
export const MAX_SET_SIZE = 4;
export const MATCH_TARGET = 144;

export const RANK_ORDER = [
  "1", "2", "3", "4", "5", "6", "7", "8", "9", "↊", "↋", "10", "J", "C", "Q", "K",
] as const;

const DOZENAL_DIGITS = "0123456789↊↋";

export function decimalToDozenal(decimal: number): string {
  if (!Number.isSafeInteger(decimal) || decimal < 0) {
    throw new RangeError("Dozenal scores must be non-negative safe integers");
  }
  if (decimal === 0) return "0";

  let value = decimal;
  let result = "";
  while (value > 0) {
    result = DOZENAL_DIGITS[value % 12] + result;
    value = Math.floor(value / 12);
  }
  return result;
}

export function formatDozenal(decimal: number): string {
  return `${decimalToDozenal(decimal)}₁₂`;
}
