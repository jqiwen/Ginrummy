import type { Card, DrawSource } from "./gameTypes.js";

export class Bot {
  botDraw(myCards: readonly Card[], dropZone: Card, stack: readonly Card[]): DrawSource {
    const topOfStack = stack.at(-1);
    if (!topOfStack) {
      return "dropzone";
    }

    const chooseDropZoneValue = this.botEvaluate([...myCards, dropZone]);
    const chooseStackValue = this.botEvaluate([...myCards, topOfStack]);
    return chooseStackValue < chooseDropZoneValue ? "dropzone" : "stack";
  }

  botDrop(myCards: readonly Card[]): number {
    // These initial values and the comparison intentionally preserve the Python bot.
    let maxDropIndex = 0;
    let maxDropValue = 100;

    for (let index = 0; index < myCards.length; index += 1) {
      const withoutCard = [...myCards.slice(0, index), ...myCards.slice(index + 1)];
      const currentDropValue = this.botEvaluate(withoutCard);
      if (currentDropValue > maxDropValue) {
        maxDropIndex = index;
        maxDropValue = currentDropValue;
      }
    }

    return maxDropIndex;
  }

  botEvaluate(myCards: readonly Card[]): number {
    let setPotential = 0;
    let runPotential = 0;
    const convertedCards: Record<string, number[]> = {
      "text-red-600": [],
      "text-black": [],
      "text-green-700": [],
      "text-yellow-600": [],
    };

    for (const card of myCards) {
      convertedCards[card.color]?.push(card.order);
    }

    for (const orders of Object.values(convertedCards)) {
      orders.sort((left, right) => left - right);
      if (orders.length > 1 && orders[1]! - orders[0]! === 1) {
        runPotential += 1;
      }

      for (let index = 2; index < orders.length; index += 1) {
        if (orders[index]! - orders[index - 1]! !== 1) {
          continue;
        }

        runPotential += 1;
        let currentRunLength = 2;
        while (index - currentRunLength > -1) {
          if (orders[index - currentRunLength + 1]! - orders[index - currentRunLength]! > 1) {
            break;
          }
          runPotential += 1;
          currentRunLength += 1;
        }
      }
    }

    return runPotential + setPotential;
  }
}
