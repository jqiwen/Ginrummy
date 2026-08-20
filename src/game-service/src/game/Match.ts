import { Bot } from "./Bot.js";
import { cloneCard, DECK } from "./Card.js";
import type { Card, DrawSource, GameOperation, PlayerId } from "./gameTypes.js";

export interface BotTurn extends GameOperation {}

export class Match {
  readonly matchId: string;
  readonly bot: Bot | null;
  currentRound = -2;
  deck: Card[] = [];
  dropZone: Card[] = [];
  hostCards: Card[] = [];
  guestCards: Card[] = [];
  initialCards: Card[] = [];
  latestOperation: DrawSource | "knock" | null = null;
  latestPlayer: PlayerId = "1";
  newCard: Card | null = null;

  private readonly random: () => number;

  constructor(matchId: string, bot = false, random: () => number = Math.random) {
    this.matchId = matchId;
    this.bot = bot ? new Bot() : null;
    this.random = random;
    this.initializeMatch();
  }

  initializeMatch(currentRound = -1, startWith: PlayerId = "1"): boolean {
    if (currentRound <= this.currentRound) {
      return false;
    }

    this.currentRound = currentRound;
    this.deck = DECK.map(cloneCard);
    this.dropZone = [];
    this.hostCards = [];
    this.guestCards = [];
    this.initialCards = [];
    this.latestOperation = null;
    this.latestPlayer = startWith;
    this.shuffle(this.deck);

    const firstDrop = this.deck.pop();
    if (!firstDrop) {
      throw new Error("Unable to initialize an empty deck");
    }
    this.dropZone.push(firstDrop);
    this.initialCards.push(firstDrop);

    for (let index = 0; index < 12; index += 1) {
      const hostCard = this.deck.pop();
      const guestCard = this.deck.pop();
      if (!hostCard || !guestCard) {
        throw new Error("Deck exhausted while dealing");
      }
      this.hostCards.push(hostCard);
      this.guestCards.push(guestCard);
      this.initialCards.push(guestCard, hostCard);
    }

    this.newCard = this.hostCards.at(-1) ?? null;
    if (startWith === "0") {
      [this.hostCards, this.guestCards] = [this.guestCards, this.hostCards];
    }
    return true;
  }

  getMatchId(): string {
    return this.matchId;
  }

  getRemainingCards(): number {
    return this.deck.length;
  }

  getInitialCards(): readonly Card[] {
    return this.initialCards;
  }

  getHand(playerId: PlayerId): Card[] {
    return playerId === "1" ? this.hostCards : this.guestCards;
  }

  chooseStack(playerId: PlayerId): Card {
    const card = this.deck.pop();
    if (!card) {
      throw new Error("Stack is empty");
    }
    this.latestOperation = "stack";
    this.newCard = card;
    this.getHand(playerId).push(card);
    return card;
  }

  chooseDropZone(playerId: PlayerId): Card {
    const card = this.dropZone.pop();
    if (!card) {
      throw new Error("Drop zone is empty");
    }
    this.latestOperation = "dropzone";
    this.newCard = card;
    this.getHand(playerId).push(card);
    return card;
  }

  dropCard(playerId: PlayerId, cardName: string): Card {
    const hand = this.getHand(playerId);
    const index = hand.findIndex((card) => card.name === cardName);
    if (index < 0) {
      throw new Error("Card is not in the player's hand");
    }
    const [dropped] = hand.splice(index, 1);
    if (!dropped) {
      throw new Error("Unable to discard card");
    }
    this.dropZone.push(dropped);
    this.latestPlayer = playerId;
    return dropped;
  }

  knockCard(playerId: PlayerId): void {
    this.latestPlayer = playerId;
    this.latestOperation = "knock";
  }

  getLatestOperation(): GameOperation | null {
    const droppedCard = this.dropZone.at(-1);
    if (!this.latestOperation || !this.newCard || !droppedCard) {
      return null;
    }
    return {
      playerId: this.latestPlayer,
      operation: this.latestOperation,
      droppedCard,
      pickedCard: this.newCard,
      remainingCards: this.getRemainingCards(),
    };
  }

  performBotTurn(): BotTurn {
    if (!this.bot) {
      throw new Error("This match does not have a bot");
    }

    if (this.dropZone.length === 0) {
      const replacement = this.deck.pop();
      if (!replacement) {
        throw new Error("No cards available to replenish drop zone");
      }
      this.dropZone.push(replacement);
    }

    const topDrop = this.dropZone.at(-1);
    if (!topDrop) {
      throw new Error("Drop zone is empty");
    }
    const source = this.bot.botDraw(this.guestCards, topDrop, this.deck);
    const pickedCard = source === "stack"
      ? this.chooseStack("0")
      : this.chooseDropZone("0");
    const dropIndex = this.bot.botDrop(this.guestCards);
    const dropCard = this.guestCards[dropIndex];
    if (!dropCard) {
      throw new Error("Bot returned an invalid discard index");
    }
    const droppedCard = this.dropCard("0", dropCard.name);
    return {
      playerId: "0",
      operation: source,
      droppedCard,
      pickedCard,
      remainingCards: this.getRemainingCards(),
    };
  }

  private shuffle(cards: Card[]): void {
    for (let index = cards.length - 1; index > 0; index -= 1) {
      const otherIndex = Math.floor(this.random() * (index + 1));
      [cards[index], cards[otherIndex]] = [cards[otherIndex]!, cards[index]!];
    }
  }
}
