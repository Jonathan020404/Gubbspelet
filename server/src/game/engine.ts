import { randomInt } from "node:crypto";
import {
  board,
  getTile,
  STARTING_MONEY,
  START_TILE_ID,
  HOSPITAL_TILE_ID,
} from "./board";
import type { Tile, PropertyId } from "./board";
import { PROPERTIES } from "./properties";
import type { Property } from "./properties";
import { randomUUID } from "node:crypto";

import {
  CHANCE_CARDS,
  choose,
  takePlayerMoneyPercentage,
  payPlayer,
  sequence,
} from "./chanceCards";

import type { ChanceCard, ChanceEffect } from "./chanceCards";

export type GamePhase =
  | "rolling"
  | "moving"
  | "purchase"
  | "chance"
  | "finished";

export interface PlayerLoan {
  id: string;
  amount: number;
  repayment: number;
  discountedRepayment: number;
  discountPropertyId: PropertyId;
}

export interface HospitalStay {
  propertyIds: PropertyId[];
  includeLottery: boolean;
}

export interface GamePlayer {
  id: string;
  name: string;
  money: number;
  tileId: string;
  color: string;
  eliminated: boolean;
  skipTurnsRemaining: number;

  loans: PlayerLoan[];

  hospitalStay: HospitalStay | null;
}

export interface ChanceDraw {
  token: string;
  playerId: string;
  card: ChanceCard;
  remaining: number;
  total: number;

  diceResult?: {
    value: number;
    label: string;
  };

  // The original player whose remaining
  // question cards must be resolved.
  continuationPlayerId?: string;
}

export interface PurchaseOffer {
  propertyId: PropertyId;
  playerId: string;
  price: number;

  // Everyone who can receive this offer,
  // starting with the player who landed here.
  eligiblePlayerIds: string[];

  offerIndex: number;
}

export interface MoneyPerRollReward {
  id: string;
  playerId: string;
  amount: number;
  untilPropertyId: PropertyId;
}

export interface GameState {
  board: Tile[];
  players: GamePlayer[];

  // The permanent definitions of the Aktiebrev.
  properties: Record<PropertyId, Property>;

  // Maps each Aktiebrev to its owner's player ID.
  ownership: Partial<Record<PropertyId, string>>;

  phase: GamePhase;
  purchaseOffer: PurchaseOffer | null;

  turnIndex: number;
  lastRoll: number | null;
  winnerId: string | null;
  message: string;
  chanceDraw: ChanceDraw | null;
  moneyPerRollRewards: MoneyPerRollReward[];
}

const PLAYER_COLORS = ["#E74C3C", "#3498DB", "#F1C40F", "#2ECC71"];

// ------------------------------------
// RESOLUTION QUEUE
// ------------------------------------

type ResolutionTask =
  | {
      type: "landing";
      playerId: string;
      tileId: string;
    }
  | {
      type: "effect";
      playerId: string;
      effect: ChanceEffect;
    }
  | {
      type: "drawChance";
      playerId: string;
      remaining: number;
      total: number;
    }
  | {
      type: "bonusRoll";
      playerId: string;
    }
  | {
      type: "restoreTurn";
      turnIndex: number;
    };

const resolutionQueues = new WeakMap<GameState, ResolutionTask[]>();

function getResolutionQueue(game: GameState): ResolutionTask[] {
  let queue = resolutionQueues.get(game);

  if (!queue) {
    queue = [];
    resolutionQueues.set(game, queue);
  }

  return queue;
}

function prependTasks(game: GameState, ...tasks: ResolutionTask[]) {
  getResolutionQueue(game).unshift(...tasks);
}

function getActivePlayer(
  game: GameState,
  playerId: string,
): GamePlayer | undefined {
  return game.players.find(
    (player) => player.id === playerId && !player.eliminated,
  );
}

// Get active players in turn order,
// starting with a particular player.
function playersInOrder(game: GameState, firstPlayerId: string): GamePlayer[] {
  const startIndex = game.players.findIndex(
    (player) => player.id === firstPlayerId,
  );

  if (startIndex === -1) return [];

  const result: GamePlayer[] = [];

  for (let offset = 0; offset < game.players.length; offset++) {
    const index = (startIndex + offset) % game.players.length;

    const player = game.players[index];

    if (!player.eliminated) {
      result.push(player);
    }
  }

  return result;
}

function resumeResolution(game: GameState): void {
  if (game.winnerId) {
    return;
  }

  game.purchaseOffer = null;
  game.chanceDraw = null;
  game.phase = "rolling";

  const queue = getResolutionQueue(game);

  while (queue.length > 0) {
    checkForWinner(game);

    if (game.winnerId) {
      return;
    }

    const task = queue.shift();

    if (!task) {
      break;
    }

    // ------------------------------------
    // RESTORE THE ORIGINAL TURN
    // ------------------------------------

    if (task.type === "restoreTurn") {
      game.turnIndex = task.turnIndex;
      continue;
    }

    // All other tasks belong to a player.
    const player = getActivePlayer(game, task.playerId);

    if (!player) {
      continue;
    }

    // ------------------------------------
    // RESOLVE THE NEXT TASK
    // ------------------------------------

    switch (task.type) {
      case "landing": {
        resolveLanding(game, player, task.tileId);

        break;
      }

      case "effect": {
        applyChanceEffect(game, player, task.effect);

        break;
      }

      case "drawChance": {
        showChanceCard(game, player, task.remaining, task.total);

        break;
      }

      // ------------------------------------
      // ALLOW ONE EXTRA NORMAL DICE ROLL
      // ------------------------------------

      case "bonusRoll": {
        // Hospitalized players cannot use
        // bonus movement rolls.
        if (player.hospitalStay) {
          game.message =
            player.name +
            " kan inte slå extra slag förrän spelaren får lämna Sjukhuset.";

          continue;
        }

        const originalTurnIndex = game.turnIndex;

        const bonusPlayerIndex = game.players.findIndex(
          (target) => target.id === player.id,
        );

        if (bonusPlayerIndex < 0) {
          continue;
        }

        prependTasks(game, {
          type: "restoreTurn",
          turnIndex: originalTurnIndex,
        });

        game.turnIndex = bonusPlayerIndex;
        game.phase = "rolling";

        game.message = player.name + " får slå ett extra tärningsslag!";

        return;
      }
    }

    checkForWinner(game);

    if (game.winnerId) {
      return;
    }

    // Purchase offers, question cards and
    // movement animations must finish before
    // processing any further queued tasks.
    if ((game.phase as GamePhase) !== "rolling") {
      return;
    }
  }

  // All effects and extra rolls are finished.
  endTurn(game);
}

export function createGame(
  players: { id: string; name: string }[],
  chanceCards: ChanceCard[] = CHANCE_CARDS,
  now: () => Date = () => new Date(),
): GameState {
  const game: GameState = {
    board,

    players: players.map((player, index) => ({
      id: player.id,
      name: player.name,
      money: STARTING_MONEY,
      tileId: START_TILE_ID,
      color: PLAYER_COLORS[index % PLAYER_COLORS.length],
      eliminated: false,
      skipTurnsRemaining: 0,

      loans: [],

      hospitalStay: null,
    })),

    properties: PROPERTIES,
    ownership: {},

    phase: "rolling",
    purchaseOffer: null,
    chanceDraw: null,

    // Persistent rewards from Frågekort.
    moneyPerRollRewards: [],

    turnIndex: 0,
    lastRoll: null,
    winnerId: null,
    message: "Spelet har börjat!",
  };

  chanceDeckSources.set(game, chanceCards);
  gameClocks.set(game, now);

  return game;
}

// ------------------------------------
// MOVEMENT
// ------------------------------------

function calculateMovement(tileId: string, steps: number) {
  let current = getTile(tileId);

  const path: string[] = [];
  let busFrom: string | null = null;

  for (let step = 0; step < steps; step++) {
    if (current.type === "finish") {
      break;
    }

    let nextId = current.nextTileId;

    // Alternative routes only activate when
    // starting a dice roll on Genväg or Senväg.
    if (
      step === 0 &&
      (current.type === "shortcut" || current.type === "detour") &&
      current.targetTileId
    ) {
      nextId = current.targetTileId;
    }

    if (!nextId) {
      break;
    }

    current = getTile(nextId);

    path.push(current.id);
  }

  // Activate Buss exactly once.
  if (current.type === "bus" && current.targetTileId) {
    busFrom = current.id;

    current = getTile(current.targetTileId);
    path.push(current.id);
  }

  return {
    tileId: current.id,
    path,
    busFrom,
  };
}

function calculateBackwardMovement(tileId: string, steps: number) {
  let current = getTile(tileId);

  const path: string[] = [];
  let busFrom: string | null = null;

  for (let step = 0; step < steps; step++) {
    // Never move backwards past Start.
    if (current.type === "start") {
      break;
    }

    // Find the previous square on the board.
    const previous = board.find((tile) => tile.nextTileId === current.id);

    // No previous square exists.
    if (!previous) {
      break;
    }

    current = previous;

    path.push(current.id);
  }

  // Buss only activates on the final landing.
  // It does not activate when passing through.
  if (path.length > 0 && current.type === "bus" && current.targetTileId) {
    busFrom = current.id;

    current = getTile(current.targetTileId);

    path.push(current.id);
  }

  return {
    tileId: current.id,
    path,
    busFrom,
  };
}

export function movePlayer(tileId: string, steps: number): string {
  return calculateMovement(tileId, steps).tileId;
}

// ------------------------------------
// WINNING AND ELIMINATION
// ------------------------------------

function calculateLoanRepayment(game: GameState, player: GamePlayer): number {
  return player.loans.reduce((total, loan) => {
    const ownsDiscountProperty =
      game.ownership[loan.discountPropertyId] === player.id;

    const repayment = ownsDiscountProperty
      ? loan.discountedRepayment
      : loan.repayment;

    return total + repayment;
  }, 0);
}

function tryFinishPlayer(game: GameState, player: GamePlayer): boolean {
  const repayment = calculateLoanRepayment(game, player);

  // The player cannot afford to repay their loans.
  if (player.money < repayment) {
    player.tileId = START_TILE_ID;

    // The player does not need to repay
    // these loans on their next attempt.
    player.loans = [];

    game.message =
      player.name +
      " hade inte råd att betala sitt lån på " +
      repayment.toLocaleString("sv-SE") +
      " kr och måste börja om från Start. " +
      "Lånet är nu avskrivet!";

    return false;
  }

  // The player can afford all outstanding loans.
  player.money -= repayment;
  player.loans = [];

  // Reaching Mål successfully wins the game.
  finishGame(game, player.id);

  if (repayment > 0) {
    game.message =
      player.name +
      " betalade tillbaka sitt lån på " +
      repayment.toLocaleString("sv-SE") +
      " kr och vann spelet!";
  }

  return true;
}

function finishGame(game: GameState, winnerId: string) {
  const winner = game.players.find((player) => player.id === winnerId);

  game.moneyPerRollRewards = [];
  game.winnerId = winnerId;
  game.phase = "finished";
  game.purchaseOffer = null;
  game.chanceDraw = null;
  resolutionQueues.delete(game);
  groupMovements.delete(game);

  game.message = (winner?.name ?? "En spelare") + " vann Gubbspelet!";
}

function eliminatePlayer(game: GameState, player: GamePlayer) {
  if (player.eliminated) return;

  player.money = 0;
  player.eliminated = true;
  player.loans = [];
  player.hospitalStay = null;

  game.moneyPerRollRewards = game.moneyPerRollRewards.filter(
    (reward) => reward.playerId !== player.id,
  );

  // Release all the eliminated player's Aktiebrev.
  for (const propertyId of Object.keys(game.ownership) as PropertyId[]) {
    if (game.ownership[propertyId] === player.id) {
      delete game.ownership[propertyId];
    }
  }

  game.message += " " + player.name + " är ute ur spelet!";
}

function checkForWinner(game: GameState): boolean {
  const remaining = game.players.filter((player) => !player.eliminated);

  if (remaining.length === 1) {
    finishGame(game, remaining[0].id);
    return true;
  }

  return false;
}

// ------------------------------------
// TURN MANAGEMENT
// ------------------------------------

function endTurn(game: GameState): void {
  game.purchaseOffer = null;
  game.chanceDraw = null;

  checkForWinner(game);

  if (game.winnerId) {
    return;
  }

  game.phase = "rolling";

  const activePlayers = game.players.filter((player) => !player.eliminated);

  // DEADLOCK SAFEGUARD:
  // If everyone is hospitalized, nobody
  // can land on a release square.
  const everyoneHospitalized =
    activePlayers.length > 0 &&
    activePlayers.every((player) => player.hospitalStay !== null);

  if (everyoneHospitalized) {
    for (const player of activePlayers) {
      player.hospitalStay = null;
    }

    game.message +=
      " Alla spelare satt fast på Sjukhuset, så alla får lämna det.";
  }

  // Find the next player who can take a turn.
  while (true) {
    game.turnIndex = (game.turnIndex + 1) % game.players.length;

    const player = game.players[game.turnIndex];

    // Eliminated players never take turns.
    if (player.eliminated) {
      continue;
    }

    // Hospitalized players must stay
    // in Sjukhuset until released.
    if (player.hospitalStay) {
      game.message += " " + player.name + " måste stanna på Sjukhuset.";

      continue;
    }

    // Preserve our existing skipped-turn rules.
    if (player.skipTurnsRemaining > 0) {
      player.skipTurnsRemaining--;

      game.message += " " + player.name + " står över ett kast.";

      continue;
    }

    // This player can take the next turn.
    break;
  }
}

// ------------------------------------
// PURCHASE OFFERS
// ------------------------------------

function createPurchaseOffer(
  game: GameState,
  propertyId: PropertyId,
  landingPlayer: GamePlayer,
) {
  const property = game.properties[propertyId];

  const eligiblePlayerIds = playersInOrder(game, landingPlayer.id).map(
    (player) => player.id,
  );

  game.phase = "purchase";

  game.purchaseOffer = {
    propertyId,
    playerId: landingPlayer.id,
    price: property.price,
    eligiblePlayerIds,
    offerIndex: 0,
  };

  game.message = landingPlayer.name + " får köpa " + property.name + ".";
}

export function respondToPurchase(
  game: GameState,
  playerId: string,
  decision: "buy" | "decline",
): boolean {
  const offer = game.purchaseOffer;

  if (game.phase !== "purchase" || !offer || game.winnerId) {
    return false;
  }

  // Only the player receiving the offer can respond.
  if (offer.playerId !== playerId) {
    return false;
  }

  const player = game.players.find((p) => p.id === playerId);

  if (!player || player.eliminated) {
    return false;
  }

  const property = game.properties[offer.propertyId];

  if (decision === "buy") {
    // Validate everything on the server.
    if (game.ownership[offer.propertyId]) {
      return false;
    }

    if (player.money < offer.price) {
      return false;
    }

    player.money -= offer.price;

    game.ownership[offer.propertyId] = player.id;

    game.message =
      player.name +
      " köpte " +
      property.name +
      " för " +
      offer.price.toLocaleString("sv-SE") +
      " kr.";

    if (player.money <= 0) {
      eliminatePlayer(game, player);
    }

    resumeResolution(game);
    return true;
  }

  if (decision !== "decline") {
    return false;
  }

  // The current offer was declined.
  let nextIndex = offer.offerIndex + 1;

  // Skip anyone who has been eliminated.
  while (nextIndex < offer.eligiblePlayerIds.length) {
    const nextPlayer = game.players.find(
      (p) => p.id === offer.eligiblePlayerIds[nextIndex],
    );

    if (nextPlayer && !nextPlayer.eliminated) {
      break;
    }

    nextIndex++;
  }

  // Nobody wants to buy this Aktiebrev.
  if (nextIndex >= offer.eligiblePlayerIds.length) {
    game.message = "Ingen köpte " + property.name + ".";

    resumeResolution(game);
    return true;
  }

  // Give the next player the same half-price offer.
  // The price is NOT halved again.
  offer.offerIndex = nextIndex;
  offer.playerId = offer.eligiblePlayerIds[nextIndex];

  offer.price = property.price / 2;

  const nextPlayer = game.players.find((p) => p.id === offer.playerId);

  game.message =
    player.name +
    " tackade nej. " +
    (nextPlayer?.name ?? "Nästa spelare") +
    " får köpa " +
    property.name +
    " för halva priset.";

  return true;
}

// ------------------------------------
// LANDING ON AN AKTIEBREV
// ------------------------------------

function resolveProperty(
  game: GameState,
  player: GamePlayer,
  propertyId: PropertyId,
) {
  const property = game.properties[propertyId];

  const ownerId = game.ownership[propertyId];

  // Banken owns the property if it is unowned.
  if (!ownerId) {
    createPurchaseOffer(game, propertyId, player);

    return;
  }

  // You never pay yourself.
  if (ownerId === player.id) {
    game.message =
      player.name + " landade på sitt eget aktiebrev: " + property.name + ".";

    return;
  }

  const owner = getActivePlayer(game, ownerId);

  if (!owner) {
    delete game.ownership[propertyId];

    createPurchaseOffer(game, propertyId, player);

    return;
  }

  // Pay the owner.
  const amountPaid = Math.min(player.money, property.fee);

  player.money -= amountPaid;
  owner.money += amountPaid;

  game.message =
    player.name +
    " betalade " +
    amountPaid.toLocaleString("sv-SE") +
    " kr till " +
    owner.name +
    " för " +
    property.name +
    ".";

  if (player.money <= 0) {
    eliminatePlayer(game, player);
  }
}

// ------------------------------------
// CHANCE CARDS
// ------------------------------------

// Each game gets its own deck.
// Future cards remain on the server.
const chanceDecks = new WeakMap<GameState, ChanceCard[]>();

const chanceDeckSources = new WeakMap<GameState, ChanceCard[]>();

const gameClocks = new WeakMap<GameState, () => Date>();

function shuffleChanceDeck(cards: ChanceCard[]): ChanceCard[] {
  const deck = [...cards];

  for (let i = deck.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);

    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

function drawChanceCard(game: GameState): ChanceCard {
  let deck = chanceDecks.get(game);

  // Create a new shuffled deck when the
  // game starts or the old deck runs out.
  if (!deck || deck.length === 0) {
    deck = shuffleChanceDeck(chanceDeckSources.get(game) ?? CHANCE_CARDS);

    chanceDecks.set(game, deck);
  }

  const card = deck.pop();

  if (!card) {
    throw new Error("The chance deck is empty.");
  }

  return card;
}

function prepareChanceCard(
  game: GameState,
  player: GamePlayer,
  card: ChanceCard,
): ChanceCard {
  const effect = card.effect;

  const opponents = playersInOrder(game, player.id).filter(
    (target) => target.id !== player.id,
  );

  // ------------------------------------
  // CHOOSE A PLAYER TO TAKE MONEY FROM
  // ------------------------------------

  if (effect.type === "choosePlayerMoneyPercentage") {
    const options = opponents.map((target) => {
      const amount = Math.floor((target.money * effect.percent) / 100);

      return {
        label: target.name + " (+" + amount.toLocaleString("sv-SE") + " kr)",

        effect: takePlayerMoneyPercentage(target.id, effect.percent),
      };
    });

    return {
      ...card,
      effect: choose(...options),
    };
  }

  // ------------------------------------
  // CHOOSE A PLAYER TO PAY
  // ------------------------------------

  if (effect.type === "choosePlayerToPay") {
    const options = opponents.map((target) => ({
      label:
        "Betala " +
        effect.amount.toLocaleString("sv-SE") +
        " kr till " +
        target.name,

      effect: sequence(...effect.before, payPlayer(target.id, effect.amount)),
    }));

    return {
      ...card,
      effect: choose(...options),
    };
  }

  if (card.effect.type === "choosePlayerToPassCard") {
    const opponents = playersInOrder(game, player.id).filter(
      (target) => target.id !== player.id,
    );

    return {
      ...card,
      effect: {
        type: "choose",
        options: opponents.map((target) => ({
          label: "Ge äpplet till " + target.name,
          effect: {
            type: "passChanceCard",
            targetPlayerId: target.id,
          },
        })),
      },
    };
  }

  if (card.effect.type === "chooseBankProperty") {
    const effect = card.effect;

    // Find every company still owned by Banken.
    const availableProperties = (
      Object.keys(game.properties) as PropertyId[]
    ).filter((propertyId) => !game.ownership[propertyId]);

    // If buying is impossible, skip the purchase
    // but still perform the remaining effects.
    if (availableProperties.length === 0 || player.money < effect.price) {
      return {
        ...card,
        effect: {
          type: "sequence",
          effects: effect.after,
        },
      };
    }

    // Turn the available companies into choices.
    return {
      ...card,
      effect: {
        type: "choose",
        options: availableProperties.map((propertyId) => {
          const property = game.properties[propertyId];

          return {
            label:
              "Köp " +
              property.name +
              " för " +
              effect.price.toLocaleString("sv-SE") +
              " kr",

            effect: {
              type: "sequence",
              effects: [
                {
                  type: "buyBankProperty",
                  propertyId,
                  price: effect.price,
                },
                ...effect.after,
              ],
            },
          };
        }),
      },
    };
  }

  if (card.effect.type === "chooseOpponentPropertyOrMoney") {
    const effect = card.effect;

    // Find all other active players.
    const opponents = playersInOrder(game, player.id).filter(
      (target) => target.id !== player.id,
    );

    // Find every property owned by an opponent.
    const propertyOptions: {
      label: string;
      effect: ChanceEffect;
    }[] = [];

    for (const opponent of opponents) {
      for (const propertyId of Object.keys(game.properties) as PropertyId[]) {
        if (game.ownership[propertyId] !== opponent.id) {
          continue;
        }

        const property = game.properties[propertyId];

        propertyOptions.push({
          label: "Ta " + property.name + " från " + opponent.name,

          effect: {
            type: "sequence",
            effects: [
              ...effect.before,
              {
                type: "takePlayerProperty",
                propertyId,
                targetPlayerId: opponent.id,
              },
            ],
          },
        });
      }
    }

    // If any opponent owns a property,
    // the player must choose a property.
    if (propertyOptions.length > 0) {
      return {
        ...card,
        effect: {
          type: "choose",
          options: propertyOptions,
        },
      };
    }

    // Otherwise, choose a player and
    // take a percentage of their money.
    return {
      ...card,
      effect: {
        type: "choose",
        options: opponents.map((opponent) => {
          const amount = Math.floor((opponent.money * effect.percent) / 100);

          return {
            label:
              "Ta " +
              effect.percent +
              "% från " +
              opponent.name +
              " (+" +
              amount.toLocaleString("sv-SE") +
              " kr)",

            effect: {
              type: "sequence",
              effects: [
                ...effect.before,
                {
                  type: "takePlayerMoneyPercentage",
                  targetPlayerId: opponent.id,
                  percent: effect.percent,
                },
              ],
            },
          };
        }),
      },
    };
  }

  if (card.effect.type === "choosePlayerMoveByMoney") {
    const effect = card.effect;

    // Calculate the distance using the
    // drawing player's current money.
    const amount =
      Math.floor(player.money / effect.moneyPerGroup) * effect.stepsPerGroup;

    // Find other active players who
    // are allowed to move.
    const opponents = playersInOrder(game, player.id).filter(
      (target) => target.id !== player.id && !target.hospitalStay,
    );

    // Nobody can be moved, or the
    // calculated distance is zero.
    if (opponents.length === 0 || amount === 0) {
      return {
        ...card,
        effect: {
          type: "sequence",
          effects: [],
        },
      };
    }

    const direction = amount < 0 ? "bakåt" : "framåt";

    return {
      ...card,
      effect: {
        type: "choose",
        options: opponents.map((opponent) => ({
          label:
            "Kasta " +
            opponent.name +
            " " +
            Math.abs(amount) +
            " steg " +
            direction,

          effect: {
            type: "moveSelectedPlayer",
            targetPlayerId: opponent.id,
            amount,
          },
        })),
      },
    };
  }

  if (
    card.effect.type === "unlessOwnsProperty" &&
    card.effect.effect.type === "choose"
  ) {
    const effect = card.effect;

    // The player owns the required property.
    // They are exempt from the punishment.
    if (game.ownership[effect.propertyId] === player.id) {
      return {
        ...card,
        effect: {
          type: "sequence",
          effects: [],
        },
      };
    }

    // Otherwise, display the choice buttons.
    return {
      ...card,
      effect: effect.effect,
    };
  }

  // All other cards remain unchanged.
  return card;
}

function showChanceCard(
  game: GameState,
  player: GamePlayer,
  remaining: number,
  total: number,
) {
  // Draw a card from the shuffled deck.
  const card = drawChanceCard(game);

  // Prepare dynamic choices if needed.
  const preparedCard = prepareChanceCard(game, player, card);

  game.phase = "chance";

  game.chanceDraw = {
    token: randomUUID(),
    playerId: player.id,
    card: preparedCard,
    remaining,
    total,
  };

  game.message = player.name + " drog ett frågekort.";
}

export function isSaturday(date: Date = new Date()): boolean {
  const weekday = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone: "Europe/Stockholm",
  }).format(date);

  return weekday === "Saturday";
}

export function drawLotteryCard(_game: GameState, _playerId: string): void {
  // TODO: Implement the Lotteri deck.
  //
  // For now, drawing a Lotteri card
  // has no effect on the game.
}

// ------------------------------------
// PERSISTENT CARD REWARDS
// ------------------------------------

function activateMoneyPerRollReward(
  game: GameState,
  player: GamePlayer,
  amount: number,
  untilPropertyId: PropertyId,
) {
  game.moneyPerRollRewards.push({
    id: randomUUID(),
    playerId: player.id,
    amount,
    untilPropertyId,
  });

  game.message =
    player.name +
    " får nu " +
    amount.toLocaleString("sv-SE") +
    " kr efter varje tärningsslag.";
}

function awardMoneyPerRoll(game: GameState) {
  // Remove rewards belonging to eliminated players.
  game.moneyPerRollRewards = game.moneyPerRollRewards.filter((reward) =>
    getActivePlayer(game, reward.playerId),
  );

  const messages: string[] = [];

  for (const reward of game.moneyPerRollRewards) {
    const player = getActivePlayer(game, reward.playerId);

    if (!player) continue;

    player.money += reward.amount;

    messages.push(
      player.name +
        " fick " +
        reward.amount.toLocaleString("sv-SE") +
        " kr från Pengaträdet.",
    );
  }

  if (messages.length > 0) {
    game.message += " " + messages.join(" ");
  }
}

function releaseHospitalPlayers(game: GameState, tileId: string): void {
  const tile = getTile(tileId);

  for (const player of game.players) {
    if (player.eliminated || !player.hospitalStay) {
      continue;
    }

    const stay = player.hospitalStay;

    const matchesProperty =
      tile.type === "property" &&
      tile.propertyId !== undefined &&
      stay.propertyIds.includes(tile.propertyId);

    const matchesLottery = tile.type === "lottery" && stay.includeLottery;

    if (!matchesProperty && !matchesLottery) {
      continue;
    }

    // The player is free to move again.
    player.hospitalStay = null;

    game.message +=
      " " +
      player.name +
      " får nu lämna Sjukhuset eftersom någon landade på " +
      tile.name +
      "!";
  }
}

function expireMoneyPerRollRewards(game: GameState, tileId: string) {
  // NEW: Check whether this landing
  // releases anyone from Sjukhuset.
  releaseHospitalPlayers(game, tileId);

  // EXISTING PENGATRÄD LOGIC
  const tile = getTile(tileId);

  if (tile.type !== "property" || !tile.propertyId) {
    return;
  }

  const propertyId = tile.propertyId;

  const expiredRewards = game.moneyPerRollRewards.filter(
    (reward) => reward.untilPropertyId === propertyId,
  );

  if (expiredRewards.length === 0) {
    return;
  }

  game.moneyPerRollRewards = game.moneyPerRollRewards.filter(
    (reward) => reward.untilPropertyId !== propertyId,
  );

  game.message +=
    " Pengaträdets effekt upphörde när en spelare landade på " +
    game.properties[propertyId].name +
    ".";
}

function findNearestProperty(
  startTileId: string,
  propertyIds: PropertyId | PropertyId[],
): string | null {
  // Support both a single company and multiple companies.
  const matchingProperties = new Set<PropertyId>(
    typeof propertyIds === "string" ? [propertyIds] : propertyIds,
  );

  const visited = new Set<string>([startTileId]);
  const queue: string[] = [startTileId];

  function getConnections(tileId: string): string[] {
    const tile = getTile(tileId);
    const connections: string[] = [];

    // Normal forward connection.
    if (tile.nextTileId) {
      connections.push(tile.nextTileId);
    }

    // Include shortcuts and detours.
    if (
      (tile.type === "shortcut" || tile.type === "detour") &&
      tile.targetTileId
    ) {
      connections.push(tile.targetTileId);
    }

    return connections;
  }

  while (queue.length > 0) {
    const tileId = queue.shift()!;
    const tile = getTile(tileId);

    // Check whether this tile belongs to ANY
    // of the requested companies.
    if (
      tile.type === "property" &&
      tile.propertyId &&
      matchingProperties.has(tile.propertyId)
    ) {
      return tileId;
    }

    // Find forward connections.
    const neighbors = getConnections(tileId);

    // Find backward connections.
    for (const otherTile of board) {
      if (getConnections(otherTile.id).includes(tileId)) {
        neighbors.push(otherTile.id);
      }
    }

    // Visit each connected tile only once.
    for (const neighborId of neighbors) {
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        queue.push(neighborId);
      }
    }
  }

  return null;
}

// Apply an individual card effect.
function applyChanceEffect(
  game: GameState,
  player: GamePlayer,
  effect: ChanceEffect,
) {
  switch (effect.type) {
    case "gainAllMoneyPerProperty": {
      const players = playersInOrder(game, player.id);

      const tasks: ResolutionTask[] = [];

      for (const target of players) {
        // Count the companies owned by this player.
        const propertyCount = Object.values(game.ownership).filter(
          (ownerId) => ownerId === target.id,
        ).length;

        // Calculate the player's individual reward.
        const reward = propertyCount * effect.amount;

        if (reward > 0) {
          tasks.push({
            type: "effect",
            playerId: target.id,
            effect: {
              type: "gainMoney",
              amount: reward,
            },
          });
        }
      }

      prependTasks(game, ...tasks);

      break;
    }

    case "movePropertyOwnerForward": {
      const ownerId = game.ownership[effect.propertyId];

      // Banken owns the company.
      if (!ownerId) {
        game.message =
          "Banken äger " +
          game.properties[effect.propertyId].name +
          ", så ingen spelare flyttas.";

        break;
      }

      const owner = getActivePlayer(game, ownerId);

      if (!owner || owner.hospitalStay) {
        break;
      }

      // Move only the company's owner.
      startGroupMovement(
        game,
        player.id,
        effect.amount,
        "forward",
        false,
        owner.id,
      );

      break;
    }

    case "collectMoneyFromOthers": {
      // Find all other active players.
      const opponents = playersInOrder(game, player.id).filter(
        (target) => target.id !== player.id,
      );

      // Each opponent pays the drawing player.
      const tasks: ResolutionTask[] = opponents.map((opponent) => ({
        type: "effect",
        playerId: opponent.id,
        effect: {
          type: "payPlayer",
          targetPlayerId: player.id,
          amount: effect.amount,
        },
      }));

      prependTasks(game, ...tasks);

      break;
    }

    case "moveSelectedPlayer": {
      const target = getActivePlayer(game, effect.targetPlayerId);

      if (
        !target ||
        target.id === player.id ||
        target.hospitalStay ||
        effect.amount === 0
      ) {
        break;
      }

      // Move only the selected player.
      startGroupMovement(
        game,
        player.id,
        Math.abs(effect.amount),
        effect.amount < 0 ? "backward" : "forward",
        false,
        target.id,
      );

      break;
    }

    case "choosePlayerMoveByMoney": {
      throw new Error(
        "Player movement choices must be prepared before entering the effect queue.",
      );
    }

    case "loseRichestPlayerMoney": {
      const players = playersInOrder(game, player.id);

      if (players.length === 0) {
        break;
      }

      // Find the player with the most money.
      const richestPlayer = players.reduce((richest, candidate) =>
        candidate.money > richest.money ? candidate : richest,
      );

      // Charge the richest player using our
      // existing payment and bankruptcy logic.
      prependTasks(game, {
        type: "effect",
        playerId: richestPlayer.id,
        effect: {
          type: "loseMoney",
          amount: effect.amount,
        },
      });

      break;
    }

    case "losePropertyOwnerMoney": {
      const property = game.properties[effect.propertyId];

      const ownerId = game.ownership[effect.propertyId];

      // Banken owns the property.
      if (!ownerId) {
        game.message =
          "Banken äger " + property.name + ", så ingen spelare behöver betala.";

        break;
      }

      const owner = getActivePlayer(game, ownerId);

      if (!owner) {
        break;
      }

      // Reuse our existing payment effect,
      // but charge the property's owner.
      prependTasks(game, {
        type: "effect",
        playerId: owner.id,
        effect: {
          type: "loseMoney",
          amount: effect.amount,
        },
      });

      break;
    }

    case "hospitalUntilLanding": {
      // Send the player directly to Sjukhuset.
      player.tileId = HOSPITAL_TILE_ID;

      // Store the conditions for leaving.
      player.hospitalStay = {
        propertyIds: [...effect.propertyIds],
        includeLottery: effect.includeLottery,
      };

      game.message =
        player.name +
        " måste stanna på Sjukhuset tills någon landar på en av de angivna rutorna.";

      break;
    }

    case "extraRolls": {
      const tasks: ResolutionTask[] = [];

      for (let i = 0; i < effect.amount; i++) {
        tasks.push({
          type: "bonusRoll",
          playerId: player.id,
        });
      }

      prependTasks(game, ...tasks);

      game.message =
        player.name + " får slå tärningen " + effect.amount + " extra gånger!";

      break;
    }

    case "takePlayerProperty": {
      const property = game.properties[effect.propertyId];

      const previousOwner = getActivePlayer(game, effect.targetPlayerId);

      // Verify that the property still belongs
      // to the selected opponent.
      if (
        !previousOwner ||
        previousOwner.id === player.id ||
        game.ownership[effect.propertyId] !== previousOwner.id
      ) {
        break;
      }

      // Transfer ownership to the drawing player.
      game.ownership[effect.propertyId] = player.id;

      game.message =
        player.name +
        " tog " +
        property.name +
        " från " +
        previousOwner.name +
        "!";

      break;
    }

    case "chooseOpponentPropertyOrMoney": {
      throw new Error(
        "Property choices must be prepared before entering the effect queue.",
      );
    }

    case "buyBankProperty": {
      const property = game.properties[effect.propertyId];

      // Verify that Banken still owns the company.
      if (game.ownership[effect.propertyId]) {
        game.message = property.name + " ägs redan av en annan spelare.";

        break;
      }

      // Verify that the player can afford it.
      if (player.money < effect.price) {
        game.message =
          player.name + " har inte råd att köpa " + property.name + ".";

        break;
      }

      // Deduct the special purchase price.
      player.money -= effect.price;

      // Transfer ownership from Banken.
      game.ownership[effect.propertyId] = player.id;

      game.message =
        player.name +
        " köpte " +
        property.name +
        " för " +
        effect.price.toLocaleString("sv-SE") +
        " kr!";

      // Apply our normal bankruptcy rule.
      if (player.money <= 0) {
        eliminatePlayer(game, player);
      }

      break;
    }

    case "chooseBankProperty": {
      throw new Error(
        "Bank property choices must be prepared before entering the effect queue.",
      );
    }

    case "choosePlayerToPassCard":
    case "passChanceCard": {
      throw new Error(
        "Card passing must be resolved before entering the effect queue.",
      );
    }

    case "takeLoan": {
      player.loans.push({
        id: randomUUID(),
        amount: effect.amount,
        repayment: effect.repayment,
        discountedRepayment: effect.discountedRepayment,
        discountPropertyId: effect.discountPropertyId,
      });

      // Reuse our existing money reward effect.
      prependTasks(game, {
        type: "effect",
        playerId: player.id,
        effect: {
          type: "gainMoney",
          amount: effect.amount,
        },
      });

      break;
    }

    case "moveToNearestProperty":
    case "moveToNearestOfProperties": {
      const propertyIds =
        effect.type === "moveToNearestProperty"
          ? [effect.propertyId]
          : effect.propertyIds;

      const destinationId = findNearestProperty(player.tileId, propertyIds);

      if (!destinationId) {
        game.message = "Ingen sådan butik kunde hittas.";

        break;
      }

      // Reuse our existing direct movement effect.
      prependTasks(game, {
        type: "effect",
        playerId: player.id,
        effect: {
          type: "moveTo",
          tileId: destinationId,
          resolveLanding: true,
        },
      });

      break;
    }

    case "ifRichestPlayer": {
      const activePlayers = game.players.filter((target) => !target.eliminated);

      const highestMoney = Math.max(
        ...activePlayers.map((target) => target.money),
      );

      const isRichest = player.money === highestMoney;

      const selectedEffect = isRichest ? effect.ifRichest : effect.otherwise;

      prependTasks(game, {
        type: "effect",
        playerId: player.id,
        effect: selectedEffect,
      });

      break;
    }

    case "moveForward": {
      startGroupMovement(
        game,
        player.id,
        effect.amount,
        "forward",
        false,
        player.id,
      );

      break;
    }

    case "loseOthersMoney": {
      const opponents = playersInOrder(game, player.id).filter(
        (target) => target.id !== player.id,
      );

      // Apply the payment to every opponent
      // before checking whether the game is won.
      for (const target of opponents) {
        const amountPaid = Math.min(target.money, effect.amount);

        target.money -= amountPaid;

        if (target.money <= 0) {
          eliminatePlayer(game, target);
        }
      }

      game.message =
        "Alla andra spelare betalade upp till " +
        effect.amount.toLocaleString("sv-SE") +
        " kr var till Banken.";

      break;
    }

    case "moveAllTo": {
      const players = playersInOrder(game, player.id).filter(
        (target) => !target.hospitalStay,
      );

      if (players.length === 0) {
        break;
      }

      const destination = getTile(effect.tileId);

      const landingTasks: ResolutionTask[] = [];

      // Move everyone before resolving
      // any of the destination effects.
      for (const target of players) {
        target.tileId = destination.id;

        // Handle a possible bus destination.
        if (destination.type === "bus" && destination.targetTileId) {
          target.tileId = destination.targetTileId;
        }

        // Check persistent rewards, such as
        // Pengaträdet, at the actual destination.
        expireMoneyPerRollRewards(game, target.tileId);

        landingTasks.push({
          type: "landing",
          playerId: target.id,
          tileId: target.tileId,
        });
      }

      game.message = "Alla spelare flyttades till " + destination.name + ".";

      if (destination.type === "finish") {
        for (const candidate of players) {
          if (tryFinishPlayer(game, candidate)) {
            break;
          }
        }

        break;
      }

      prependTasks(game, ...landingTasks);

      break;
    }

    case "gainLeftPlayerMoney": {
      const players = playersInOrder(game, player.id);

      // The next active player in turn order
      // is considered the player to the left.
      const leftPlayer = players[1];

      if (!leftPlayer) {
        break;
      }

      // Reuse our existing gainMoney effect.
      prependTasks(game, {
        type: "effect",
        playerId: leftPlayer.id,
        effect: {
          type: "gainMoney",
          amount: effect.amount,
        },
      });

      break;
    }

    case "gainPropertyOwnerMoney": {
      const property = game.properties[effect.propertyId];

      const ownerId = game.ownership[effect.propertyId];

      // Banken owns the property.
      if (!ownerId) {
        game.message =
          "Banken äger " +
          property.name +
          ", så ingen spelare får några pengar.";

        break;
      }

      const owner = getActivePlayer(game, ownerId);

      if (!owner) {
        break;
      }

      // Reuse our existing gainMoney effect,
      // but give the money to the property owner.
      prependTasks(game, {
        type: "effect",
        playerId: owner.id,
        effect: {
          type: "gainMoney",
          amount: effect.amount,
        },
      });

      break;
    }

    case "moneyPerRollUntilProperty": {
      activateMoneyPerRollReward(
        game,
        player,
        effect.amount,
        effect.propertyId,
      );

      break;
    }

    case "payPerOwnedProperty": {
      // Count how many Aktiebrev the player owns.
      const ownedCount = Object.values(game.ownership).filter(
        (ownerId) => ownerId === player.id,
      ).length;

      // Calculate the total payment.
      const totalAmount = ownedCount * effect.amount;

      if (totalAmount === 0) {
        game.message =
          player.name + " äger inga aktiebrev och behöver inte betala.";

        break;
      }

      // Reuse our existing payment effect.
      prependTasks(game, {
        type: "effect",
        playerId: player.id,
        effect: {
          type: "loseMoney",
          amount: totalAmount,
        },
      });

      break;
    }

    case "moveAllBackward": {
      startGroupMovement(game, player.id, effect.amount, "backward");

      break;
    }

    case "gainAllMoney": {
      const players = playersInOrder(game, player.id);

      for (const target of players) {
        target.money += effect.amount;
      }

      game.message =
        "Alla spelare inkasserade " +
        effect.amount.toLocaleString("sv-SE") +
        " kr var från Banken.";

      break;
    }

    case "movePlayerAndOthers": {
      startGroupMovement(
        game,
        player.id,
        0,
        "forward",
        false,
        undefined,
        (target) =>
          target.id === player.id ? effect.playerSteps : effect.otherSteps,
      );

      break;
    }

    case "drawLottery": {
      drawLotteryCard(game, player.id);
      break;
    }

    case "rollForEffect": {
      // This is handled by respondToChance().
      // The dice must be rolled before an
      // outcome can be executed.
      throw new Error("The card dice must be rolled first.");
    }

    case "payPlayer": {
      const target = getActivePlayer(game, effect.targetPlayerId);

      // Only another active player can receive
      // the payment.
      if (!target || target.id === player.id) {
        break;
      }

      // A player cannot pay more money
      // than they currently have.
      const amountPaid = Math.min(player.money, effect.amount);

      // Transfer the money.
      player.money -= amountPaid;
      target.money += amountPaid;

      game.message =
        player.name +
        " betalade " +
        amountPaid.toLocaleString("sv-SE") +
        " kr till " +
        target.name +
        ".";

      if (player.money <= 0) {
        eliminatePlayer(game, player);
      }

      break;
    }

    case "choosePlayerToPay": {
      // prepareChanceCard() converts this
      // into a regular choice card.
      throw new Error("A payment recipient must be selected first.");
    }

    case "takePlayerMoneyPercentage": {
      const target = getActivePlayer(game, effect.targetPlayerId);

      // The target must be another active player.
      if (!target || target.id === player.id) {
        break;
      }

      // Calculate the percentage of their
      // current money, rounded down.
      const amount = Math.floor((target.money * effect.percent) / 100);

      // Transfer the money.
      target.money -= amount;
      player.money += amount;

      game.message =
        player.name +
        " tog " +
        amount.toLocaleString("sv-SE") +
        " kr från " +
        target.name +
        " med dammsugaren!";

      if (target.money <= 0) {
        eliminatePlayer(game, target);
      }

      break;
    }

    case "choosePlayerMoneyPercentage": {
      // This effect is converted into a normal
      // choice card by prepareChanceCard().
      //
      // It should never be executed directly.
      throw new Error("A player must be selected first.");
    }

    case "unlessOwnsProperty": {
      const property = game.properties[effect.propertyId];

      const ownerId = game.ownership[effect.propertyId];

      // The player owns the property.
      // Skip the effect entirely.
      if (ownerId === player.id) {
        game.message =
          player.name +
          " äger " +
          property.name +
          " och slipper kortets straff.";

        break;
      }

      // The property belongs to Banken
      // or another player.
      prependTasks(game, {
        type: "effect",
        playerId: player.id,
        effect: effect.effect,
      });

      break;
    }

    case "drawChanceCards": {
      prependTasks(game, {
        type: "drawChance",
        playerId: player.id,
        remaining: effect.amount,
        total: effect.amount,
      });

      game.message =
        player.name + " ska dra " + effect.amount + " nya frågekort.";

      break;
    }

    case "drawAllChanceCards": {
      // Get all active players in turn order,
      // starting with the drawing player.
      const players = playersInOrder(game, player.id);

      // Give each player their own card draw.
      const tasks: ResolutionTask[] = players.map((targetPlayer) => ({
        type: "drawChance",
        playerId: targetPlayer.id,
        remaining: effect.amount,
        total: effect.amount,
      }));

      // Resolve these cards before continuing
      // with any other unfinished effects.
      prependTasks(game, ...tasks);

      game.message =
        "Alla spelare ska dra " + effect.amount + " frågekort var!";

      break;
    }

    case "skipRichestPlayerTurns": {
      // Get all active players in turn order,
      // starting with the drawing player.
      const players = playersInOrder(game, player.id);

      if (players.length === 0) {
        break;
      }

      // Find the player with the most money.
      const richest = players.reduce((richestSoFar, candidate) =>
        candidate.money > richestSoFar.money ? candidate : richestSoFar,
      );

      richest.skipTurnsRemaining += effect.amount;

      game.message =
        richest.name +
        " har mest pengar och måste stå över " +
        effect.amount +
        " kast.";

      break;
    }

    case "skipTurns": {
      player.skipTurnsRemaining += effect.amount;

      game.message =
        player.name + " måste stå över " + effect.amount + " kast.";

      break;
    }

    case "sequence": {
      // Resolve each effect in its original order.
      prependTasks(
        game,
        ...effect.effects.map(
          (childEffect): ResolutionTask => ({
            type: "effect",
            playerId: player.id,
            effect: childEffect,
          }),
        ),
      );

      break;
    }

    case "moveAllForward": {
      startGroupMovement(game, player.id, effect.amount);

      break;
    }

    case "payPropertyOwner": {
      payPropertyOwnerFromCard(game, player, effect.propertyId, effect.amount);

      break;
    }

    case "moveTo": {
      if (player.hospitalStay) {
        game.message = player.name + " måste stanna på Sjukhuset.";

        break;
      }
      const destination = getTile(effect.tileId);

      player.tileId = destination.id;

      game.message = player.name + " åkte till " + destination.name + ".";

      if (destination.type === "finish") {
        tryFinishPlayer(game, player);
        break;
      }

      if (
        effect.resolveLanding &&
        destination.type === "bus" &&
        destination.targetTileId
      ) {
        player.tileId = destination.targetTileId;

        game.message =
          player.name + " åkte vidare till den andra busshållplatsen.";
      }

      expireMoneyPerRollRewards(game, player.tileId);

      if (effect.resolveLanding) {
        prependTasks(game, {
          type: "landing",
          playerId: player.id,
          tileId: player.tileId,
        });
      }

      break;
    }

    case "loseMoney": {
      // Money is paid to Banken.
      const amountPaid = Math.min(player.money, effect.amount);

      player.money -= amountPaid;

      game.message =
        player.name +
        " betalade " +
        amountPaid.toLocaleString("sv-SE") +
        " kr till Banken.";

      // Eliminate players who reach zero.
      if (player.money <= 0) {
        eliminatePlayer(game, player);
      }

      break;
    }

    case "unlessSaturday": {
      const today = gameClocks.get(game)?.() ?? new Date();

      if (isSaturday(today)) {
        game.message =
          "Det är lördag! " +
          player.name +
          " slipper åka till Mataffären och betala.";

        break;
      }

      // It is not Saturday.
      // Add the effect to the resolution queue.
      prependTasks(game, {
        type: "effect",
        playerId: player.id,
        effect: effect.effect,
      });

      break;
    }

    case "gainMoney": {
      player.money += effect.amount;

      game.message =
        player.name +
        " inkasserade " +
        effect.amount.toLocaleString("sv-SE") +
        " kr från Banken.";

      break;
    }

    case "moveOthersBackward": {
      startGroupMovement(game, player.id, effect.amount, "backward", true);

      break;
    }

    case "choose": {
      // Choice effects must be selected by the
      // drawing player before reaching this function.
      throw new Error("A choice effect must be selected first.");
    }

    case "movePropertyOwnerBackward": {
      const property = game.properties[effect.propertyId];

      const ownerId = game.ownership[effect.propertyId];

      // Banken owns the Aktiebrev.
      if (!ownerId) {
        game.message += " Banken äger " + property.name + ", så ingen flyttas.";

        break;
      }

      const owner = getActivePlayer(game, ownerId);

      if (!owner) {
        break;
      }

      // Move only the owner backwards.
      startGroupMovement(
        game,
        owner.id,
        effect.amount,
        "backward",
        false,
        owner.id,
      );

      break;
    }
  }
}

function payPropertyOwnerFromCard(
  game: GameState,
  player: GamePlayer,
  propertyId: PropertyId,
  amount: number,
) {
  const property = game.properties[propertyId];

  const ownerId = game.ownership[propertyId];

  // Banken owns the Aktiebrev.
  if (!ownerId) {
    game.message =
      "Banken äger " +
      property.name +
      ". " +
      player.name +
      " behöver inte betala.";

    return;
  }

  // The drawing player owns it themselves.
  if (ownerId === player.id) {
    game.message =
      player.name +
      " äger själv " +
      property.name +
      " och behöver inte betala.";

    return;
  }

  const owner = getActivePlayer(game, ownerId);

  if (!owner) {
    return;
  }

  // The player cannot pay more than they have.
  const paid = Math.min(player.money, amount);

  player.money -= paid;
  owner.money += paid;

  game.message =
    player.name +
    " betalade " +
    paid.toLocaleString("sv-SE") +
    " kr till " +
    owner.name +
    " för " +
    property.name +
    ".";

  if (player.money <= 0) {
    eliminatePlayer(game, player);
  }
}

// The player confirms that the card has been read.

function rollChanceDice(
  game: GameState,
  draw: ChanceDraw,
  dice: number,
): boolean {
  const effect = draw.card.effect;

  if (effect.type !== "rollForEffect") {
    return false;
  }

  if (!Number.isInteger(dice) || dice < 1 || dice > 6) {
    return false;
  }

  const outcome = effect.outcomes.find((option) => option.rolls.includes(dice));

  if (!outcome) {
    return false;
  }

  const player = getActivePlayer(game, draw.playerId);

  if (!player) {
    return false;
  }

  // Prepare the selected outcome.
  // This can turn a dynamic player-selection
  // effect into actual choice buttons.
  const preparedCard = prepareChanceCard(game, player, {
    ...draw.card,
    effect: outcome.effect,
  });

  game.chanceDraw = {
    ...draw,

    // A new token prevents this roll
    // from being submitted twice.
    token: randomUUID(),

    card: preparedCard,

    diceResult: {
      value: dice,
      label: outcome.label,
    },
  };

  game.message = player.name + " slog " + dice + " på frågekortet.";

  // Preserve our existing Pengaträd rewards.
  awardMoneyPerRoll(game);

  return true;
}

function transferChanceCard(
  game: GameState,
  draw: ChanceDraw,
  targetPlayerId: string,
): boolean {
  // The current holder cannot pass
  // the card to themselves.
  if (targetPlayerId === draw.playerId) {
    return false;
  }

  const target = getActivePlayer(game, targetPlayerId);

  if (!target) {
    return false;
  }

  const previousHolder = getActivePlayer(game, draw.playerId);

  if (!previousHolder) {
    return false;
  }

  // Restore the original card definition,
  // including its special dice effect.
  const originalCard = CHANCE_CARDS.find((card) => card.id === draw.card.id);

  if (!originalCard) {
    return false;
  }

  if (originalCard.effect.type !== "rollForEffect") {
    return false;
  }

  game.chanceDraw = {
    token: randomUUID(),

    // The new holder controls the card.
    playerId: target.id,

    card: prepareChanceCard(game, target, originalCard),

    // Preserve the original card count.
    remaining: draw.remaining,
    total: draw.total,

    // Remember who originally drew the card.
    continuationPlayerId: draw.continuationPlayerId ?? draw.playerId,
  };

  // The previous diceResult is intentionally
  // not copied. The new holder must roll again.

  game.phase = "chance";

  game.message =
    previousHolder.name + " gav det ruttna äpplet till " + target.name + ".";

  return true;
}

export function respondToChance(
  game: GameState,
  playerId: string,
  token: string,
  choiceIndex?: number,
  testDice?: number,
): boolean {
  if (game.phase !== "chance" || game.winnerId) {
    return false;
  }

  const draw = game.chanceDraw;

  if (!draw) {
    return false;
  }

  // Only the current card holder
  // may interact with this card.
  if (draw.playerId !== playerId || draw.token !== token) {
    return false;
  }

  const player = getActivePlayer(game, playerId);

  if (!player) {
    return false;
  }

  const cardEffect = draw.card.effect;

  // ------------------------------------
  // SPECIAL DICE ROLL
  // ------------------------------------

  if (cardEffect.type === "rollForEffect") {
    if (choiceIndex !== undefined) {
      return false;
    }

    return rollChanceDice(game, draw, testDice ?? randomInt(1, 7));
  }

  // ------------------------------------
  // SELECT THE EFFECT
  // ------------------------------------

  let selectedEffect: ChanceEffect;

  if (cardEffect.type === "choose") {
    if (
      typeof choiceIndex !== "number" ||
      !Number.isInteger(choiceIndex) ||
      choiceIndex < 0 ||
      choiceIndex >= cardEffect.options.length
    ) {
      return false;
    }

    selectedEffect = cardEffect.options[choiceIndex].effect;
  } else {
    if (choiceIndex !== undefined) {
      return false;
    }

    selectedEffect = cardEffect;
  }

  // ------------------------------------
  // PASS AN UNRESOLVED CARD
  // ------------------------------------

  if (selectedEffect.type === "passChanceCard") {
    return transferChanceCard(game, draw, selectedEffect.targetPlayerId);
  }

  // ------------------------------------
  // RESOLVE THE CARD NORMALLY
  // ------------------------------------

  // If a card has been passed around,
  // its remaining cards belong to the
  // ORIGINAL drawing player.
  const continuationPlayerId = draw.continuationPlayerId ?? draw.playerId;

  if (draw.remaining > 1) {
    prependTasks(game, {
      type: "drawChance",
      playerId: continuationPlayerId,
      remaining: draw.remaining - 1,
      total: draw.total,
    });
  }

  // The actual selected effect applies
  // to the CURRENT card holder.
  prependTasks(game, {
    type: "effect",
    playerId: player.id,
    effect: selectedEffect,
  });

  game.chanceDraw = null;

  resumeResolution(game);

  return true;
}

// ------------------------------------
// GROUP MOVEMENT
// ------------------------------------

interface GroupMove {
  playerId: string;
  walkingPath: string[];
  busFrom: string | null;
  finalTileId: string;
}

interface GroupMovement {
  moves: GroupMove[];

  step: number;
  maxSteps: number;

  stage: "walking" | "bus" | "landing";
}

const groupMovements = new WeakMap<GameState, GroupMovement>();

function startGroupMovement(
  game: GameState,
  firstPlayerId: string,
  amount: number,
  direction: "forward" | "backward" = "forward",
  excludeDrawingPlayer = false,
  onlyPlayerId?: string,
  customSteps?: (player: GamePlayer) => number,
) {
  const players = playersInOrder(game, firstPlayerId).filter(
    (player) =>
      // Hospitalized players cannot participate in movement.
      !player.hospitalStay &&
      (!excludeDrawingPlayer || player.id !== firstPlayerId) &&
      (onlyPlayerId === undefined || player.id === onlyPlayerId),
  );

  const moves: GroupMove[] = players.map((player) => {
    // Positive = forward, negative = backward.
    const steps = customSteps
      ? customSteps(player)
      : direction === "backward"
        ? -amount
        : amount;

    // Calculate the correct path for this player.
    const movement =
      steps < 0
        ? calculateBackwardMovement(player.tileId, Math.abs(steps))
        : calculateMovement(player.tileId, steps);

    // Separate walking from bus teleporting.
    const walkingPath = movement.busFrom
      ? movement.path.slice(0, -1)
      : movement.path;

    return {
      playerId: player.id,
      walkingPath,
      busFrom: movement.busFrom,
      finalTileId: movement.tileId,
    };
  });

  const movingPlayers = moves.filter((move) => move.walkingPath.length > 0);

  if (movingPlayers.length === 0) {
    game.message = "Ingen spelare kunde flyttas.";
    return;
  }

  groupMovements.set(game, {
    moves: movingPlayers,
    step: 0,
    maxSteps: Math.max(...movingPlayers.map((move) => move.walkingPath.length)),
    stage: "walking",
  });

  game.phase = "moving";

  // Custom movement can have different
  // directions and distances for each player.
  if (customSteps) {
    game.message = "Spelarna flyttas åt olika håll!";
    return;
  }

  const subject = onlyPlayerId
    ? players[0].name + " går "
    : excludeDrawingPlayer
      ? "Alla andra spelare går "
      : "Alla spelare går ";

  game.message =
    subject +
    amount +
    " steg " +
    (direction === "backward" ? "bakåt!" : "framåt!");
}

export function hasGroupMovement(game: GameState): boolean {
  return groupMovements.has(game);
}

export function advanceGroupMovement(game: GameState): number | null {
  const movement = groupMovements.get(game);

  if (!movement || game.phase !== "moving" || game.winnerId) {
    return null;
  }

  const MOVE_DELAY = 300;
  const BUS_DELAY = 750;
  const LANDING_DELAY = 350;

  // ------------------------------------
  // WALKING
  // ------------------------------------

  if (movement.stage === "walking") {
    const winners: GamePlayer[] = [];

    // Move every player one step.
    for (const move of movement.moves) {
      const player = getActivePlayer(game, move.playerId);

      if (!player) continue;

      const nextTileId = move.walkingPath[movement.step];

      if (!nextTileId) continue;

      player.tileId = nextTileId;

      // Only check the player's final destination,
      // not every square they pass during movement.
      if (nextTileId === move.finalTileId) {
        expireMoneyPerRollRewards(game, nextTileId);
      }

      if (getTile(nextTileId).type === "finish") {
        winners.push(player);
      }
    }

    movement.step++;

    // Check whether players reaching Mål
    // can repay their outstanding loans.
    if (winners.length > 0) {
      for (const candidate of winners) {
        if (tryFinishPlayer(game, candidate)) {
          return null;
        }

        // If the player cannot afford repayment,
        // tryFinishPlayer sends them back to Start.
        // Everyone else continues moving.
      }
    } else {
      game.message =
        "Flyttar spelpjäser... (" +
        movement.step +
        "/" +
        movement.maxSteps +
        ")";
    }

    if (movement.step < movement.maxSteps) {
      return MOVE_DELAY;
    }

    // Check if anyone landed on a bus.
    const hasBus = movement.moves.some((move) => move.busFrom !== null);

    if (hasBus) {
      movement.stage = "bus";

      game.message = "Spelare som landade på Buss åker vidare...";

      return BUS_DELAY;
    }

    movement.stage = "landing";

    return LANDING_DELAY;
  }

  // ------------------------------------
  // BUS TELEPORTS
  // ------------------------------------

  if (movement.stage === "bus") {
    for (const move of movement.moves) {
      if (!move.busFrom) continue;

      const player = getActivePlayer(game, move.playerId);

      if (!player) continue;

      player.tileId = move.finalTileId;
    }

    game.message = "Bussresorna är klara!";

    movement.stage = "landing";

    return LANDING_DELAY;
  }

  // ------------------------------------
  // RESOLVE ALL LANDINGS
  // ------------------------------------

  groupMovements.delete(game);

  // Everyone has finished moving.
  // Now resolve their destinations in order.
  const landingTasks: ResolutionTask[] = movement.moves
    .filter((move) => {
      const player = getActivePlayer(game, move.playerId);

      if (!player) return false;

      // Finish landings were already handled
      // during the walking stage.
      //
      // A player who could not repay their loan
      // has already been sent back to Start.
      // Do not resolve their old Mål landing again.
      return getTile(move.finalTileId).type !== "finish";
    })
    .map((move) => ({
      type: "landing",
      playerId: move.playerId,
      tileId: move.finalTileId,
    }));

  prependTasks(game, ...landingTasks);

  resumeResolution(game);

  // If another group movement was started
  // by a queued effect, keep animating.
  return hasGroupMovement(game) ? MOVE_DELAY : null;
}

// ------------------------------------
// LANDING RESOLUTION
// ------------------------------------

function resolveLanding(game: GameState, player: GamePlayer, tileId: string) {
  if (player.eliminated || game.winnerId) {
    return;
  }

  const destination = getTile(tileId);

  if (destination.type === "finish") {
    // Ignore an old queued landing if the player
    // has already been sent back to Start.
    if (player.tileId === destination.id) {
      tryFinishPlayer(game, player);
    }

    return;
  }

  if (destination.type === "property" && destination.propertyId) {
    resolveProperty(game, player, destination.propertyId);

    return;
  }

  if (destination.type === "chance") {
    const count = destination.cardCount ?? 1;

    showChanceCard(game, player, count, count);

    return;
  }

  // Lotteri will be handled here later.
  //
  // Buss is handled during movement.
  // Genväg and Senväg affect the next move.
  // Other squares require no action.
}

// ------------------------------------
// ROLLING THE DICE
// ------------------------------------

export interface MovementPlan {
  playerId: string;
  dice: number;
  path: string[];
  tileId: string;
  busFrom: string | null;
}

// 1. Begin the roll and calculate the journey.
export function beginRoll(
  game: GameState,
  playerId: string,
  dice: number = randomInt(1, 7),
): MovementPlan | null {
  if (game.phase !== "rolling" || game.winnerId) {
    return null;
  }

  const player = game.players[game.turnIndex];

  if (player.id !== playerId || player.eliminated) {
    return null;
  }

  if (player.hospitalStay) {
    return null;
  }

  if (!Number.isInteger(dice) || dice < 1 || dice > 6) {
    return null;
  }

  const movement = calculateMovement(player.tileId, dice);

  game.lastRoll = dice;

  // Lock the game while the piece is moving.
  game.phase = "moving";

  game.message = player.name + " slog " + dice + " och flyttar sin spelpjäs...";

  awardMoneyPerRoll(game);

  return {
    playerId,
    dice,
    ...movement,
  };
}

// 2. Resolve the destination once movement is done.

export function completeRoll(game: GameState, movement: MovementPlan): boolean {
  if (game.phase !== "moving" || game.winnerId) {
    return false;
  }

  const player = game.players[game.turnIndex];

  if (player.id !== movement.playerId) {
    return false;
  }

  player.tileId = movement.tileId;

  const destination = getTile(player.tileId);

  console.log("Movement:", movement.path);

  if (movement.busFrom) {
    game.message =
      player.name +
      " slog " +
      movement.dice +
      ", landade på Buss och åkte till " +
      "den andra busshållplatsen.";
  } else {
    game.message =
      player.name +
      " slog " +
      movement.dice +
      " och landade på " +
      destination.name +
      ".";
  }

  expireMoneyPerRollRewards(game, player.tileId);

  prependTasks(game, {
    type: "landing",
    playerId: player.id,
    tileId: player.tileId,
  });

  resumeResolution(game);

  return true;
}

// 3. Keep the original instant roll function.
// Used by our automated tests.
export function rollTurn(
  game: GameState,
  playerId: string,
  dice: number = randomInt(1, 7),
): boolean {
  const movement = beginRoll(game, playerId, dice);

  if (!movement) {
    return false;
  }

  return completeRoll(game, movement);
}
