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

import { LOTTERY_CARDS } from "./lotteryCards";
import type { LotteryCard } from "./lotteryCards";

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
  isIPhone: boolean;

  money: number;
  tileId: string;
  color: string;
  eliminated: boolean;
  skipTurnsRemaining: number;

  loans: PlayerLoan[];

  hospitalStay: HospitalStay | null;

  nextRollMultiplier: number;
  nextRollBonus: number;
}

export type RockPaperScissorsChoice = "rock" | "scissors" | "paper";

export interface RockPaperScissorsMatch {
  player1Id: string;
  player2Id: string;

  player1Score: number;
  player2Score: number;

  reward: number;
  round: number;

  // Number of rounds needed to win.
  winsRequired?: number;

  submittedPlayerIds: string[];

  lastRound: {
    player1Choice: RockPaperScissorsChoice;
    player2Choice: RockPaperScissorsChoice;
    winnerId: string | null;
  } | null;

  winnerId: string | null;
}

interface BankCardModifier {
  playerId: string;
  lotteryOffered: boolean;
}

export interface ChanceDraw {
  token: string;
  playerId: string;
  card: ChanceCard;
  remaining: number;
  total: number;

  diceResult?: {
    value: number;
    values?: number[];
    calculation?: "sum" | "product";
    label: string;
  };

  // The original player whose remaining
  // question cards must be resolved.
  continuationPlayerId?: string;

  rockPaperScissors?: RockPaperScissorsMatch;

  bankModifier?: BankCardModifier;
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
  activeLotteryCard: LotteryCard | null;
  lotteryDrawVersion: number;
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
      feeOverride?: number;
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
      oddOnly?: boolean;
    }
  | {
      type: "restoreTurn";
      turnIndex: number;
    }
  | {
      type: "lotteryPropertyLoss";
      playerId: string;
      fallbackAmount: number;
    }
  | {
      type: "teleportSwapChoice";
      playerId: string;
    };

const resolutionQueues = new WeakMap<GameState, ResolutionTask[]>();

const bankModifiedTasks = new WeakMap<ResolutionTask, BankCardModifier>();

const activeBankModifiers = new WeakMap<GameState, BankCardModifier>();

const oddOnlyBonusRolls = new WeakMap<GameState, string>();

const pendingBankruptcies = new WeakMap<GameState, Set<string>>();

const lottery022FrozenPlayers = new WeakMap<GameState, Set<string>>();

function getPendingBankruptcies(game: GameState): Set<string> {
  let pending = pendingBankruptcies.get(game);

  if (!pending) {
    pending = new Set<string>();
    pendingBankruptcies.set(game, pending);
  }

  return pending;
}

// Secret Sten-Sax-Påse choices.
// Only the server can access these.
const rockPaperScissorsChoices = new WeakMap<
  GameState,
  Map<string, RockPaperScissorsChoice>
>();

const hospitalVisitHistory = new WeakMap<GameState, Set<string>>();

function recordHospitalVisit(game: GameState, playerId: string): void {
  let visitors = hospitalVisitHistory.get(game);

  if (!visitors) {
    visitors = new Set<string>();
    hospitalVisitHistory.set(game, visitors);
  }

  visitors.add(playerId);
}

function hasVisitedHospital(game: GameState, playerId: string): boolean {
  return hospitalVisitHistory.get(game)?.has(playerId) ?? false;
}

function getResolutionQueue(game: GameState): ResolutionTask[] {
  let queue = resolutionQueues.get(game);

  if (!queue) {
    queue = [];
    resolutionQueues.set(game, queue);
  }

  return queue;
}

function prependTasks(game: GameState, ...tasks: ResolutionTask[]) {
  const modifier = activeBankModifiers.get(game);

  if (modifier) {
    for (const task of tasks) {
      // Only inherit the modifier
      // for effects of this card.
      if (task.type === "effect") {
        bankModifiedTasks.set(task, modifier);
      }
    }
  }

  getResolutionQueue(game).unshift(...tasks);
}

function prependCardEffect(
  game: GameState,
  playerId: string,
  effect: ChanceEffect,
  modifier?: BankCardModifier,
) {
  const task: ResolutionTask = {
    type: "effect",
    playerId,
    effect,
  };

  if (modifier) {
    bankModifiedTasks.set(task, modifier);
  }

  prependTasks(game, task);
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

function resolveModifiedCardEffect(
  game: GameState,
  player: GamePlayer,
  task: Extract<ResolutionTask, { type: "effect" }>,
): void {
  const modifier = bankModifiedTasks.get(task);

  // Normal cards work exactly
  // as they did before.
  if (!modifier) {
    applyChanceEffect(game, player, task.effect);

    return;
  }

  // A newly drawn card is separate.
  // Loan proceeds are not a reward.
  if (
    task.effect.type === "drawBankModifiedChance" ||
    task.effect.type === "drawThemedChanceCard" ||
    task.effect.type === "takeLoan"
  ) {
    applyChanceEffect(game, player, task.effect);

    return;
  }

  const originalPlayer = getActivePlayer(game, modifier.playerId);

  const moneyBefore = originalPlayer?.money ?? 0;

  let effect = task.effect;

  // Double payments to Banken,
  // but only for the original player.
  if (player.id === modifier.playerId && effect.type === "loseMoney") {
    effect = {
      ...effect,
      amount: effect.amount * 2,
    };
  }

  // Allow child effects to inherit
  // the same special rule.
  activeBankModifiers.set(game, modifier);

  try {
    applyChanceEffect(game, player, effect);
  } finally {
    activeBankModifiers.delete(game);
  }

  // Preserve the modifier if the
  // effect opens another choice
  // belonging to the same card.
  if (game.chanceDraw) {
    game.chanceDraw.bankModifier = modifier;
  }

  // Check whether the original player
  // actually received money.
  const recipient = getActivePlayer(game, modifier.playerId);

  if (
    !game.winnerId &&
    recipient &&
    recipient.money > moneyBefore &&
    !modifier.lotteryOffered
  ) {
    // Only one optional Lotteri
    // per modified card.
    modifier.lotteryOffered = true;

    prependCardEffect(game, recipient.id, {
      type: "offerBankBonusLottery",
    });
  }
}

function resolveLotteryPropertyLoss(
  game: GameState,
  player: GamePlayer,
  fallbackAmount: number,
): void {
  const ownedProperties = (Object.keys(game.ownership) as PropertyId[]).filter(
    (propertyId) => game.ownership[propertyId] === player.id,
  );

  // No Aktiebrev: lose 30,000 kr instead.
  if (ownedProperties.length === 0) {
    applyChanceEffect(game, player, {
      type: "loseMoney",
      amount: fallbackAmount,
    });

    return;
  }

  const leftPlayer = playersInOrder(game, player.id).find(
    (other) => other.id !== player.id,
  );

  if (!leftPlayer) {
    return;
  }

  // Use the existing Frågekort choice UI.
  game.chanceDraw = {
    token: randomUUID(),
    playerId: player.id,
    card: {
      id: "lottery-008-property-choice",
      text:
        "Lotteri 008: Du slog en 1a. " +
        "Välj vilket aktiebrev du ska ge till " +
        leftPlayer.name +
        ".",
      effect: {
        type: "choose",
        options: ownedProperties.map((propertyId) => ({
          label:
            "Ge " +
            game.properties[propertyId].name +
            " till " +
            leftPlayer.name,
          effect: {
            type: "transferRentProperty",
            propertyId,
            recipientId: leftPlayer.id,
          },
        })),
      },
    },
    remaining: 1,
    total: 1,
  };

  game.phase = "chance";
  game.message = player.name + " slog en 1a och måste ge bort ett aktiebrev!";
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
      case "teleportSwapChoice": {
        const opponents = game.players.filter(
          (other) => !other.eliminated && other.id !== player.id,
        );

        if (opponents.length === 0) {
          game.message = "Det finns ingen annan spelare att byta plats med.";
          break;
        }

        game.chanceDraw = {
          token: randomUUID(),
          playerId: player.id,
          card: {
            id: "lottery-015-teleport",
            text:
              "Du slog en 6a! Välj en spelare att byta plats med. " +
              "Ingen av er påverkas av rutan ni hamnar på.",
            effect: {
              type: "choose",
              options: opponents.map((opponent) => ({
                label: "Byt plats med " + opponent.name,
                effect: {
                  type: "swapPlayerPositionsWithoutLanding",
                  targetPlayerId: opponent.id,
                },
              })),
            },
          },
          remaining: 1,
          total: 1,
        };

        game.phase = "chance";
        game.message =
          player.name +
          " slog en 6a och ska välja en spelare att teleportera med!";

        break;
      }

      case "lotteryPropertyLoss": {
        resolveLotteryPropertyLoss(game, player, task.fallbackAmount);

        break;
      }

      case "landing": {
        resolveLanding(game, player, task.tileId, task.feeOverride);

        break;
      }

      case "effect": {
        resolveModifiedCardEffect(game, player, task);

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

        // Restore the original turn after
        // this extra roll has been resolved.
        prependTasks(game, {
          type: "restoreTurn",
          turnIndex: originalTurnIndex,
        });

        // NEW: Remember whether this extra
        // roll only allows odd results.
        if (task.oddOnly) {
          oddOnlyBonusRolls.set(game, player.id);
        } else {
          oddOnlyBonusRolls.delete(game);
        }

        game.turnIndex = bonusPlayerIndex;
        game.phase = "rolling";

        if (task.oddOnly) {
          game.message =
            player.name +
            " får slå ett extra kast! Gå endast om resultatet är udda.";
        } else {
          game.message = player.name + " får slå ett extra tärningsslag!";
        }

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
  players: {
    id: string;
    name: string;
    isIPhone?: boolean;
  }[],
  chanceCards: ChanceCard[] = CHANCE_CARDS,
  now: () => Date = () => new Date(),
): GameState {
  const game: GameState = {
    board,

    players: players.map((player, index) => ({
      id: player.id,
      name: player.name,

      // NEW: Remember the player's device.
      isIPhone: player.isIPhone ?? false,

      money: STARTING_MONEY,
      tileId: START_TILE_ID,
      color: PLAYER_COLORS[index % PLAYER_COLORS.length],

      eliminated: false,
      skipTurnsRemaining: 0,

      loans: [],

      hospitalStay: null,

      nextRollMultiplier: 1,
      nextRollBonus: 0,
    })),

    properties: PROPERTIES,
    ownership: {},

    phase: "rolling",
    purchaseOffer: null,
    chanceDraw: null,

    moneyPerRollRewards: [],

    turnIndex: 0,
    lastRoll: null,
    winnerId: null,
    message: "Spelet har börjat!",
    activeLotteryCard: null,
    lotteryDrawVersion: 0,
  };

  chanceDeckSources.set(game, chanceCards);
  gameClocks.set(game, now);

  return game;
}

// ------------------------------------
// MOVEMENT
// ------------------------------------

function getDistanceToFinish(tileId: string): number {
  let current = getTile(tileId);
  let distance = 0;

  const visited = new Set<string>();

  while (current.type !== "finish") {
    // Prevent accidental infinite loops.
    if (visited.has(current.id)) {
      return Infinity;
    }

    visited.add(current.id);

    // Follow the normal forward route.
    const nextId = current.nextTileId;

    if (!nextId) {
      return Infinity;
    }

    current = getTile(nextId);
    distance++;
  }

  return distance;
}

function calculateMovement(
  tileId: string,
  steps: number,
  disableAlternativeRoutes: boolean = false,
) {
  let current = getTile(tileId);

  const path: string[] = [];
  let busFrom: string | null = null;

  for (let step = 0; step < steps; step++) {
    if (current.type === "finish") {
      break;
    }

    let nextId = current.nextTileId;

    // Alternative routes only activate when
    // starting on Genväg or Senväg.
    //
    // Lotteri 018 disables both routes.
    if (
      !disableAlternativeRoutes &&
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
  player.nextRollMultiplier = 1;
  player.nextRollBonus = 0;

  // Lotteri 017 becomes invalid when
  // only two active players remain.
  const activePlayers = game.players.filter((p) => !p.eliminated);

  if (
    activePlayers.length === 2 &&
    game.activeLotteryCard?.effect.type === "everyonePaysRent"
  ) {
    drawLotteryCard(game, activePlayers[0].id);
  }

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

function isFrozenByLottery022(game: GameState, playerId: string): boolean {
  return lottery022FrozenPlayers.get(game)?.has(playerId) ?? false;
}

function blockClosedFacility(
  game: GameState,
  player: GamePlayer,
  destinationTileId: string,
): boolean {
  if (game.activeLotteryCard?.effect.type !== "closeHospitalAndRepairShop") {
    return false;
  }

  const destination = getTile(destinationTileId);

  if (destination.type !== "hospital" && destination.type !== "repairShop") {
    return false;
  }

  let frozen = lottery022FrozenPlayers.get(game);

  if (!frozen) {
    frozen = new Set<string>();
    lottery022FrozenPlayers.set(game, frozen);
  }

  frozen.add(player.id);

  game.message =
    player.name +
    " skulle till " +
    destination.name +
    ", men det är nedstängt! " +
    "Spelaren står kvar och får inte slå igen " +
    "förrän ett nytt Lotteri dras.";

  // Check whether every active player is frozen.
  const activePlayers = game.players.filter((p) => !p.eliminated);

  const everyoneFrozen =
    activePlayers.length > 0 && activePlayers.every((p) => frozen.has(p.id));

  if (everyoneFrozen) {
    for (const target of activePlayers) {
      target.tileId = START_TILE_ID;
    }

    // Release everyone before drawing
    // the replacement Lotteri.
    lottery022FrozenPlayers.delete(game);

    drawLotteryCard(game, player.id);
  }

  return true;
}

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

    // Lotteri 022: this player is frozen
    // until the next Lotteri is drawn.
    if (isFrozenByLottery022(game, player.id)) {
      game.message +=
        " " +
        player.name +
        " står över sitt kast eftersom " +
        "Sjukhuset och Bilverkstan är nedstängda.";

      continue;
    }

    if (getPendingBankruptcies(game).has(player.id)) {
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

function getBankPurchasePrice(
  game: GameState,
  propertyId: PropertyId,
  afterDecline = false,
): number {
  const property = game.properties[propertyId];

  const normalMultiplier = afterDecline ? 0.5 : 1;

  const lotteryEffect = game.activeLotteryCard?.effect;

  const lotteryMultiplier =
    lotteryEffect?.type === "discountBankProperties"
      ? lotteryEffect.multiplier
      : 1;

  return Math.ceil(property.price * normalMultiplier * lotteryMultiplier);
}

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
    price: getBankPurchasePrice(game, propertyId),
    eligiblePlayerIds,
    offerIndex: 0,
  };

  game.message = landingPlayer.name + " får köpa " + property.name + ".";
}

export function sellProperty(
  game: GameState,
  playerId: string,
  propertyId: PropertyId,
): boolean {
  // Selling is only allowed before a dice roll.
  if (game.phase !== "rolling" || game.winnerId) {
    return false;
  }

  const currentPlayer = game.players[game.turnIndex];

  // Only the player whose turn it is can sell.
  if (
    !currentPlayer ||
    currentPlayer.id !== playerId ||
    currentPlayer.eliminated
  ) {
    return false;
  }

  // The seller must own this Aktiebrev.
  if (game.ownership[propertyId] !== playerId) {
    return false;
  }

  const property = game.properties[propertyId];

  if (!property) {
    return false;
  }

  // Always 50% of the normal listed purchase price.
  const sellPrice = Math.floor(property.price * 0.5);

  // Return the Aktiebrev to Banken.
  delete game.ownership[propertyId];

  // Give the money to the seller.
  currentPlayer.money += sellPrice;

  game.message =
    currentPlayer.name +
    " sålde " +
    property.name +
    " till Banken för " +
    sellPrice.toLocaleString("sv-SE") +
    " kr.";

  return true;
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

  offer.price = getBankPurchasePrice(game, offer.propertyId, true);

  const nextPlayer = game.players.find((p) => p.id === offer.playerId);

  game.message =
    player.name +
    " tackade nej. " +
    (nextPlayer?.name ?? "Nästa spelare") +
    " får köpa " +
    property.name +
    " för " +
    offer.price.toLocaleString("sv-SE") +
    " kr.";

  return true;
}

// ------------------------------------
// LANDING ON AN AKTIEBREV
// ------------------------------------

function offerRentPropertyChoice(
  game: GameState,
  payer: GamePlayer,
  recipient: GamePlayer,
): void {
  const ownedProperties = (Object.keys(game.ownership) as PropertyId[]).filter(
    (propertyId) => game.ownership[propertyId] === payer.id,
  );

  // No Aktiebrev: nothing extra to give.
  if (ownedProperties.length === 0) {
    return;
  }

  // Reuse our existing choice interface.
  game.chanceDraw = {
    token: randomUUID(),
    playerId: payer.id,
    card: {
      id: "lottery-005-property-choice",
      text:
        "Lotteri 005: Du har betalat hyra. " +
        "Välj vilket aktiebrev du ska ge till " +
        recipient.name +
        ".",
      effect: {
        type: "choose",
        options: ownedProperties.map((propertyId) => ({
          label:
            "Ge " +
            game.properties[propertyId].name +
            " till " +
            recipient.name,
          effect: {
            type: "transferRentProperty",
            propertyId,
            recipientId: recipient.id,
          },
        })),
      },
    },
    remaining: 1,
    total: 1,
  };

  game.phase = "chance";

  game.message =
    payer.name + " ska välja ett aktiebrev att ge till " + recipient.name + "!";
}

function resolveProperty(
  game: GameState,
  player: GamePlayer,
  propertyId: PropertyId,
  feeOverride?: number,
) {
  const property = game.properties[propertyId];
  const ownerId = game.ownership[propertyId];

  // Banken owns the property.
  if (!ownerId) {
    createPurchaseOffer(game, propertyId, player);
    return;
  }

  // No rent when you own it yourself.
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

  // Normal rent, or a special rent amount.
  let fee = feeOverride ?? property.fee;

  const lotteryEffect = game.activeLotteryCard?.effect;

  // Lotteri 006: double rent.
  if (lotteryEffect?.type === "multiplyPropertyRent") {
    fee *= lotteryEffect.multiplier;
  }

  // ------------------------------------
  // LOTTERI 017 — EVERYONE PAYS RENT
  // ------------------------------------
  if (lotteryEffect?.type === "everyonePaysRent") {
    const payers = game.players.filter(
      (target) => !target.eliminated && target.id !== owner.id,
    );

    let totalReceived = 0;

    for (const payer of payers) {
      if (game.winnerId) {
        break;
      }
      const amountPaid = Math.min(Math.max(0, payer.money), fee);

      payer.money -= amountPaid;
      owner.money += amountPaid;
      totalReceived += amountPaid;

      // Preserve normal bankruptcy rules.
      if (payer.money <= 0) {
        eliminatePlayer(game, payer);
      }
    }

    game.message =
      "Alla andra spelare betalade hyra till " +
      owner.name +
      " för " +
      property.name +
      ". Totalt inkasserade ägaren " +
      totalReceived.toLocaleString("sv-SE") +
      " kr.";

    // IMPORTANT: Don't also charge the
    // landing player through normal rent.
    return;
  }

  // ------------------------------------
  // NORMAL RENT PAYMENT
  // ------------------------------------
  const amountPaid = Math.min(Math.max(0, player.money), fee);

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

  // Lotteri 024:
  // The property owner draws one Frågekort
  // whenever another player pays them rent.
  const rentLotteryEffect = game.activeLotteryCard?.effect;

  if (
    amountPaid > 0 &&
    rentLotteryEffect?.type === "drawChanceWhenReceivingRent"
  ) {
    prependTasks(game, {
      type: "drawChance",
      playerId: owner.id,
      remaining: rentLotteryEffect.amount,
      total: rentLotteryEffect.amount,
    });

    game.message +=
      " " + owner.name + " får ta ett frågekort tack vare Lotteri 024!";
  }

  // Keep our normal bankruptcy rules.
  if (player.money <= 0) {
    eliminatePlayer(game, player);
    return;
  }

  // Lotteri 005:
  // Paying rent also requires giving
  // one Aktiebrev to the rent recipient.
  if (
    amountPaid > 0 &&
    game.activeLotteryCard?.effect.type === "givePropertyWhenPayingRent"
  ) {
    offerRentPropertyChoice(game, player, owner);
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

  if (card.effect.type === "chooseOpponentPropertyOrReset") {
    // Find every other active player.
    const opponents = playersInOrder(game, player.id).filter(
      (target) => target.id !== player.id,
    );

    const propertyOptions: {
      label: string;
      effect: ChanceEffect;
    }[] = [];

    // Find every Aktiebrev owned
    // by an opponent.
    for (const opponent of opponents) {
      for (const propertyId of Object.keys(game.properties) as PropertyId[]) {
        if (game.ownership[propertyId] !== opponent.id) {
          continue;
        }

        const property = game.properties[propertyId];

        propertyOptions.push({
          label: "Ta " + property.name + " från " + opponent.name,

          effect: {
            type: "takePlayerProperty",
            propertyId,
            targetPlayerId: opponent.id,
          },
        });
      }
    }

    // If an opponent owns a property,
    // show all available choices.
    if (propertyOptions.length > 0) {
      return {
        ...card,
        effect: {
          type: "choose",
          options: propertyOptions,
        },
      };
    }

    // No opponent owns any Aktiebrev.
    // Keep the original effect so the
    // engine can send everyone else to Start.
    return card;
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

  if (card.effect.type === "chooseRockPaperScissorsOpponent") {
    const effect = card.effect;

    const opponents = playersInOrder(game, player.id).filter(
      (target) => target.id !== player.id,
    );

    if (opponents.length === 0) {
      return {
        ...card,
        effect: {
          type: "sequence",
          effects: [],
        },
      };
    }

    return {
      ...card,
      effect: {
        type: "choose",
        options: opponents.map((opponent) => ({
          label: "Utmana " + opponent.name,

          effect: {
            type: "startRockPaperScissors",
            targetPlayerId: opponent.id,
            reward: effect.reward,
            propertyPrize: effect.propertyPrize,
          },
        })),
      },
    };
  }

  // ------------------------------------
  // CHANCE 069 — THE COLD CAT
  // ------------------------------------

  if (card.id === "chance-069" && card.effect.type === "choose") {
    const bankOwnsGroceryStore = !game.ownership.groceryStore;

    const canAffordGroceryStore = player.money >= 5_000;

    // Both choices are available.
    if (bankOwnsGroceryStore && canAffordGroceryStore) {
      return card;
    }

    // Mataffären cannot be purchased.
    // Only the four extra rolls remain.
    return {
      ...card,
      effect: card.effect.options[0].effect,
    };
  }

  // Resolve ownership conditions containing choices.
  if (
    card.effect.type === "ifOwnsProperty" &&
    (card.effect.ifOwned.type === "choose" ||
      card.effect.otherwise.type === "choose")
  ) {
    const ownsProperty = game.ownership[card.effect.propertyId] === player.id;

    return {
      ...card,
      effect: ownsProperty ? card.effect.ifOwned : card.effect.otherwise,
    };
  }

  // Handle money conditions that lead to a choice.
  if (
    card.effect.type === "ifMoneyAbove" &&
    (card.effect.ifAbove.type === "choose" ||
      card.effect.otherwise.type === "choose")
  ) {
    const selectedEffect =
      player.money > card.effect.amount
        ? card.effect.ifAbove
        : card.effect.otherwise;

    return {
      ...card,
      effect: selectedEffect,
    };
  }

  // Choose a player to take a fixed amount from.

  if (card.effect.type === "choosePlayerToTakeMoney") {
    const amount = card.effect.amount;

    const opponents = playersInOrder(game, player.id).filter(
      (target) => target.id !== player.id,
    );

    // Nobody is available to choose.
    if (opponents.length === 0) {
      return {
        ...card,
        effect: {
          type: "sequence",
          effects: [],
        },
      };
    }

    // Card 180 requires buying a water pistol.
    const isWaterPistolCard = card.id === "chance-180";

    return {
      ...card,
      effect: {
        type: "choose",

        options: opponents.map((target) => {
          const paymentEffect: ChanceEffect = {
            type: "takePlayerMoney",
            targetPlayerId: target.id,
            amount,
          };

          return {
            label: isWaterPistolCard
              ? "Köp vattenpistol och skjut på " + target.name
              : "Ta " +
                amount.toLocaleString("sv-SE") +
                " kr av " +
                target.name,

            effect: isWaterPistolCard
              ? {
                  type: "sequence",
                  effects: [
                    {
                      type: "loseMoney",
                      amount: 1_000,
                    },
                    paymentEffect,
                  ],
                }
              : paymentEffect,
          };
        }),
      },
    };
  }

  // All other cards remain unchanged.
  return card;
}

function getThemedChanceEffects(card: ChanceCard): ChanceEffect[] {
  // Card 105 mentions all the categories
  // in its instructions, but is not itself
  // about any of those characters.
  if (card.id === "chance-105") {
    return [];
  }

  const words = card.text.toLocaleLowerCase("sv-SE").match(/\p{L}+/gu) ?? [];

  const effects: ChanceEffect[] = [];

  // ---------------------------------
  // CATS AND DOGS
  // ---------------------------------

  const hasCatOrDog = words.some(
    (word) =>
      /^katt(?:en|er|erna|unge|ungen|ungar|ungarna)?$/.test(word) ||
      /^hund(?:en|ar|arna|valp|valpen|valpar|valparna)?$/.test(word) ||
      /^valp(?:en|ar|arna)?$/.test(word),
  );

  if (hasCatOrDog) {
    effects.push({
      type: "gainMoney",
      amount: 61_000,
    });
  }

  // ---------------------------------
  // GUBBAR
  // ---------------------------------

  const hasGubbe = words.some((word) => /^gubb(?:e|en|ar|arna)$/.test(word));

  if (hasGubbe) {
    effects.push({
      type: "movePlayerAndOthers",
      playerSteps: -8,
      otherSteps: 0,
    });
  }

  // ---------------------------------
  // PARROTS
  // ---------------------------------

  const hasParrot = words.some((word) =>
    /^papegoj(?:a|an|or|orna)$/.test(word),
  );

  if (hasParrot) {
    effects.push({
      type: "moveAllTo",
      tileId: HOSPITAL_TILE_ID,
    });
  }

  return effects;
}

function showChanceCard(
  game: GameState,
  player: GamePlayer,
  remaining: number,
  total: number,
  checkThemes: boolean = false,
) {
  // Lotteri 012: Frågekort are disabled.
  if (game.activeLotteryCard?.effect.type === "disableChanceCards") {
    game.message = "Alla frågekort är ogiltiga på grund av Lotteri 012!";

    return;
  }

  // Draw ONE card from the shuffled deck.
  const card = drawChanceCard(game);

  // NEW: Card 105 checks the original
  // text of this newly drawn card.
  if (checkThemes) {
    const bonusEffects = getThemedChanceEffects(card);

    const bonusTasks: ResolutionTask[] = bonusEffects.map((effect) => ({
      type: "effect",
      playerId: player.id,
      effect,
    }));

    // Schedule the additional effects.
    // The actual card is still played first.
    prependTasks(game, ...bonusTasks);
  }

  // Prepare the card normally.
  // This preserves dice rolls, choices,
  // property conditions and minigames.
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

// Each game has its own shuffled Lotteri deck.
const lotteryDecks = new WeakMap<GameState, LotteryCard[]>();

function shuffleLotteryCards(cards: LotteryCard[]): LotteryCard[] {
  const shuffled = [...cards];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);

    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

export function drawLotteryCard(game: GameState, playerId: string): void {
  if (game.phase === "finished") {
    return;
  }

  const player = getActivePlayer(game, playerId);

  if (!player) {
    return;
  }

  const activePlayers = game.players.filter((p) => !p.eliminated);

  const activePlayerCount = activePlayers.length;

  const everyoneAtStart =
    activePlayerCount > 0 &&
    activePlayers.every((p) => p.tileId === START_TILE_ID);

  const eligibleCards = LOTTERY_CARDS.filter(
    (card) =>
      // Lotteri 017 requires at least 3 players.
      (activePlayerCount > 2 || card.effect.type !== "everyonePaysRent") &&
      // Lotteri 021 cannot be drawn when
      // everybody is standing at Start.
      (!everyoneAtStart || card.effect.type !== "backwardToPropertyOnRoll"),
  );

  if (eligibleCards.length === 0) {
    return;
  }

  // Refill and reshuffle when needed.
  let deck = lotteryDecks.get(game);

  if (!deck || deck.length === 0) {
    deck = shuffleLotteryCards(eligibleCards);
    lotteryDecks.set(game, deck);
  }

  let card = deck.pop();

  // The existing deck may still contain
  // Lotteri 017 from when more players
  // were active. Skip invalid cards.

  while (
    card &&
    ((activePlayerCount <= 2 && card.effect.type === "everyonePaysRent") ||
      (everyoneAtStart && card.effect.type === "backwardToPropertyOnRoll"))
  ) {
    card = deck.pop();
  }

  // The remaining deck contained no valid
  // cards. Refill using only eligible cards.
  if (!card) {
    deck = shuffleLotteryCards(eligibleCards);
    lotteryDecks.set(game, deck);
    card = deck.pop();
  }

  if (!card) {
    return;
  }

  // A new Lotteri releases everyone
  // frozen by Lotteri 022.
  lottery022FrozenPlayers.delete(game);

  // Replace the old Lotteri rule.
  game.activeLotteryCard = card;

  // Show the new card to everybody.
  game.lotteryDrawVersion += 1;

  game.message =
    player.name + " drog ett Lotteri! Ny regel för alla: " + card.text;
}

function getLotteryChanceDrawCount(
  game: GameState,
  dice: number,
  playerId: string,
): number {
  const card = game.activeLotteryCard;

  if (!card) {
    return 0;
  }

  switch (card.effect.type) {
    case "drawChanceOnRoll":
      return card.effect.rolls.includes(dice) ? card.effect.amount : 0;

    case "drawChancePerRollIfOwnsProperties": {
      const ownedCount = (Object.keys(game.ownership) as PropertyId[]).filter(
        (propertyId) => game.ownership[propertyId] === playerId,
      ).length;

      return ownedCount >= card.effect.minimumProperties
        ? card.effect.amount
        : 0;
    }
    case "discountBankProperties":
    case "drawChanceWhenReceivingRent":
    case "badLotteryDiceMovement":
    case "closeHospitalAndRepairShop":
    case "backwardToPropertyOnRoll":
    case "evilChanceSquares":
    case "gainMoneyPerDicePip":
    case "disableAlternativeRoutes":
    case "everyonePaysRent":
    case "everyoneDrawsChanceOnLanding":
    case "swapPlayersOnRoll":
    case "lastPlayerRollsMultipleDice":
    case "addMovementStepsOnRoll":
    case "disableChanceCards":
    case "extraRollOrSkipTurn":
    case "reverseChanceMoney":
    case "payTaxPerDicePip":
    case "losePropertyOnRoll":
    case "everyoneGainsOnRoll":
    case "loseMoneyPercentageOnRoll":
    case "multiplyChanceCardsOnLanding":
    case "givePropertyWhenPayingRent":
    case "multiplyPropertyRent":
      return 0;
  }
}

function applyLotteryRuleOnDice(
  game: GameState,
  playerId: string,
  diceValues: number[],
): void {
  // Remember the rule active when
  // this roll began.
  const card = game.activeLotteryCard;

  if (!card) {
    return;
  }

  switch (card.effect.type) {
    case "discountBankProperties":
      // Applied when the bank offers an Aktiebrev.
      break;
    case "drawChanceWhenReceivingRent":
      // Handled when an Aktiebrev owner receives rent.
      break;
    case "badLotteryDiceMovement":
      // Handled by beginRoll() and completeRoll().
      break;
    case "closeHospitalAndRepairShop":
      // Handled by movement and turn management.
      break;
    case "backwardToPropertyOnRoll":
      // Handled by beginRoll() and completeRoll().
      break;
    case "evilChanceSquares":
      // Handled when landing on a Frågekort square.
      break;
    case "disableAlternativeRoutes":
      // Handled by calculateMovement().
      break;
    case "everyonePaysRent":
      // Handled when a player pays property rent.
      break;
    case "everyoneDrawsChanceOnLanding":
      // Handled when landing on a Frågekort square.
      break;
    case "swapPlayersOnRoll":
      // Handled in beginRoll().
      break;
    case "lastPlayerRollsMultipleDice":
      // Extra dice are handled in beginRoll().
      break;
    case "addMovementStepsOnRoll":
      // The movement bonus is handled in beginRoll().
      break;
    case "disableChanceCards":
      // Handled by showChanceCard().
      break;
    case "extraRollOrSkipTurn":
      // Handled through the resolution queue.
      break;
    case "reverseChanceMoney":
      // Handled by Frågekort money effects.
      break;
    case "losePropertyOnRoll":
      // Handled through the resolution queue.
      break;
    case "drawChancePerRollIfOwnsProperties":
      // Handled in completeRoll() and rollChanceDice().
      break;
    case "multiplyPropertyRent":
      // Handled by resolveProperty().
      break;
    case "givePropertyWhenPayingRent":
      // Handled when paying rent in resolveProperty().
      break;
    case "multiplyChanceCardsOnLanding":
      // This rule is handled by resolveLanding().
      break;

    case "gainMoneyPerDicePip": {
      const effect = card.effect;

      // The owner of Svensk Bank is exempt.
      if (game.ownership[effect.exemptPropertyId] === playerId) {
        break;
      }

      const player = game.players.find(
        (p) => p.id === playerId && !p.eliminated,
      );

      if (!player) {
        break;
      }

      // Add the results of every physical die.
      const totalPips = diceValues.reduce((sum, dice) => sum + dice, 0);

      const reward = totalPips * effect.amountPerPip;

      player.money += reward;

      game.message =
        player.name +
        " inkasserade " +
        reward.toLocaleString("sv-SE") +
        " kr från Banken (" +
        totalPips +
        " prickar).";

      break;
    }

    case "payTaxPerDicePip": {
      const effect = card.effect;

      // The owner of Svensk Bank pays no tax.
      if (game.ownership[effect.exemptPropertyId] === playerId) {
        break;
      }

      const player = game.players.find(
        (p) => p.id === playerId && !p.eliminated,
      );

      if (!player) {
        break;
      }

      // Count every dot on every die.
      const totalPips = diceValues.reduce((sum, dice) => sum + dice, 0);

      const tax = totalPips * effect.amountPerPip;

      // Don't let the cash balance become negative.
      const amountPaid = Math.min(Math.max(0, player.money), tax);

      player.money -= amountPaid;

      game.message =
        player.name +
        " betalade " +
        amountPaid.toLocaleString("sv-SE") +
        " kr i skatt (" +
        totalPips +
        " prickar).";

      break;
    }
    case "loseMoneyPercentageOnRoll": {
      const effect = card.effect;

      const target = getActivePlayer(game, playerId);

      if (!target) {
        break;
      }

      for (const dice of diceValues) {
        if (!effect.rolls.includes(dice)) {
          continue;
        }

        const amount = Math.floor((target.money * effect.percent) / 100);

        target.money -= amount;

        game.message =
          target.name +
          " slog " +
          dice +
          " och förlorade " +
          amount.toLocaleString("sv-SE") +
          " kr till blodvampyren!";
      }

      break;
    }

    case "everyoneGainsOnRoll": {
      // Each physical die counts.
      for (const dice of diceValues) {
        // Every active player gets money,
        // including the player rolling.
        for (const player of game.players) {
          if (!player.eliminated) {
            player.money += card.effect.amount;
          }
        }
      }

      // Replace the active rule after
      // awarding money for this roll.

      const redrawOnRolls = card.effect.redrawOnRolls;

      const shouldDrawNewLottery = diceValues.some((dice) =>
        redrawOnRolls.includes(dice),
      );

      if (shouldDrawNewLottery) {
        drawLotteryCard(game, playerId);
      }

      break;
    }

    case "drawChanceOnRoll":
      // Lotteri 001 is already handled
      // by completeRoll().
      break;
  }
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

function findWalkingPathToTile(
  startTileId: string,
  targetTileId: string,
): string[] | null {
  if (startTileId === targetTileId) {
    return [];
  }

  const visited = new Set<string>([startTileId]);

  const queue: {
    tileId: string;
    path: string[];
  }[] = [
    {
      tileId: startTileId,
      path: [],
    },
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;

    const tile = getTile(current.tileId);

    const neighbors: string[] = [];

    // Walk forwards along the board.
    if (tile.nextTileId) {
      neighbors.push(tile.nextTileId);
    }

    // Walk backwards along the board.
    for (const otherTile of board) {
      if (otherTile.nextTileId === tile.id) {
        neighbors.push(otherTile.id);
      }
    }

    // Explore the connected squares.
    for (const neighborId of neighbors) {
      if (visited.has(neighborId)) {
        continue;
      }

      visited.add(neighborId);

      const newPath = [...current.path, neighborId];

      // We have reached our destination.
      if (neighborId === targetTileId) {
        return newPath;
      }

      queue.push({
        tileId: neighborId,
        path: newPath,
      });
    }
  }

  // No route could be found.
  return null;
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

function startRockPaperScissorsMatch(
  game: GameState,
  player: GamePlayer,
  targetPlayerId: string,
  reward: number,
  winsRequired: number = 2,
  cardId: string = "chance-066",
): void {
  const target = getActivePlayer(game, targetPlayerId);

  if (!target || target.id === player.id) {
    return;
  }

  const card = CHANCE_CARDS.find((item) => item.id === cardId);

  if (!card) {
    throw new Error("Rock paper scissors card not found");
  }

  // Keep both players' choices secret.
  rockPaperScissorsChoices.set(game, new Map());

  game.chanceDraw = {
    token: randomUUID(),
    playerId: player.id,
    card,
    remaining: 1,
    total: 1,

    rockPaperScissors: {
      player1Id: player.id,
      player2Id: target.id,

      player1Score: 0,
      player2Score: 0,

      reward,
      round: 1,
      winsRequired,

      submittedPlayerIds: [],
      lastRound: null,
      winnerId: null,
    },
  };

  game.phase = "chance";

  game.message =
    player.name +
    " möter " +
    target.name +
    " i Sten-Sax-Påse! " +
    "Först till " +
    winsRequired +
    " vinst" +
    (winsRequired === 1 ? "" : "er") +
    " vinner.";
}

function respondToRockPaperScissors(
  game: GameState,
  playerId: string,
  token: string,
  choiceIndex?: number,
): boolean {
  const draw = game.chanceDraw;
  const match = draw?.rockPaperScissors;

  if (
    game.phase !== "chance" ||
    game.winnerId ||
    !draw ||
    !match ||
    draw.token !== token
  ) {
    return false;
  }

  // Only the two participants can submit.
  if (playerId !== match.player1Id && playerId !== match.player2Id) {
    return false;
  }

  if (!getActivePlayer(game, playerId)) {
    return false;
  }

  // ---------------------------------
  // MATCH FINISHED: COLLECT THE PRIZE
  // ---------------------------------

  if (match.winnerId) {
    // The challenger closes the match.
    if (playerId !== match.player1Id || choiceIndex !== undefined) {
      return false;
    }

    const winnerId = match.winnerId;
    const reward = match.reward;

    const winner = getActivePlayer(game, winnerId);

    if (!winner) {
      return false;
    }

    // Identify the losing player.
    const loserId =
      winnerId === match.player1Id ? match.player2Id : match.player1Id;

    const loser = getActivePlayer(game, loserId);

    // Clean up the minigame.
    rockPaperScissorsChoices.delete(game);
    game.chanceDraw = null;

    // ---------------------------------
    // NEW: CARD 177 — CHOOSE THE PRIZE
    // ---------------------------------

    if (draw.card.id === "chance-177") {
      // The cash reward is always
      // available as an option.
      const options: {
        label: string;
        effect: ChanceEffect;
      }[] = [
        {
          label: "Inkassera " + reward.toLocaleString("sv-SE") + " kr",

          effect: {
            type: "gainMoney",
            amount: reward,
          },
        },
      ];

      // Find the losing player's
      // Aktiebrev.
      const loserProperties = (
        Object.keys(game.properties) as PropertyId[]
      ).filter((propertyId) => game.ownership[propertyId] === loserId);

      // Add each of the loser's
      // Aktiebrev as a prize option.
      for (const propertyId of loserProperties) {
        options.push({
          label:
            "Ta " +
            game.properties[propertyId].name +
            " från " +
            (loser?.name ?? "motståndaren"),

          effect: {
            type: "takePlayerProperty",
            propertyId,
            targetPlayerId: loserId,
          },
        });
      }

      // Open the ordinary Frågekort
      // modal for the WINNER.
      game.chanceDraw = {
        token: randomUUID(),

        playerId: winnerId,

        card: {
          id: "chance-177",

          text:
            winner.name +
            " vann Sten-Sax-Påse! " +
            (loserProperties.length > 0
              ? "Välj ett av motståndarens aktiebrev eller inkassera " +
                reward.toLocaleString("sv-SE") +
                " kr."
              : "Motståndaren äger inga aktiebrev. Inkassera " +
                reward.toLocaleString("sv-SE") +
                " kr."),

          effect: {
            type: "choose",
            options,
          },
        },

        remaining: 1,
        total: 1,

        // Preserve the modifier
        // from card 173, if present.
        bankModifier: draw.bankModifier,
      };

      game.phase = "chance";

      game.message = winner.name + " vann och får välja sitt pris!";

      return true;
    }

    // ---------------------------------
    // EXISTING CARDS 066 AND 103
    // ---------------------------------

    // These cards award cash directly.
    prependCardEffect(
      game,
      winnerId,
      {
        type: "gainMoney",
        amount: reward,
      },
      draw.bankModifier,
    );

    resumeResolution(game);

    return true;
  }

  // ---------------------------------
  // VALIDATE THE PLAYER'S CHOICE
  // ---------------------------------

  const choices: RockPaperScissorsChoice[] = ["rock", "scissors", "paper"];

  if (
    choiceIndex === undefined ||
    !Number.isInteger(choiceIndex) ||
    choiceIndex < 0 ||
    choiceIndex >= choices.length
  ) {
    return false;
  }

  const secretChoices = rockPaperScissorsChoices.get(game);

  if (!secretChoices) {
    return false;
  }

  // Players cannot change a locked choice.
  if (secretChoices.has(playerId)) {
    return false;
  }

  secretChoices.set(playerId, choices[choiceIndex]);

  match.submittedPlayerIds = [...secretChoices.keys()];

  // Wait until both players have chosen.
  if (secretChoices.size < 2) {
    return true;
  }

  // ---------------------------------
  // REVEAL THE COMPLETED ROUND
  // ---------------------------------

  const choice1 = secretChoices.get(match.player1Id);

  const choice2 = secretChoices.get(match.player2Id);

  if (!choice1 || !choice2) {
    return false;
  }

  let roundWinnerId: string | null = null;

  if (choice1 !== choice2) {
    const player1Wins =
      (choice1 === "rock" && choice2 === "scissors") ||
      (choice1 === "scissors" && choice2 === "paper") ||
      (choice1 === "paper" && choice2 === "rock");

    if (player1Wins) {
      match.player1Score++;

      roundWinnerId = match.player1Id;
    } else {
      match.player2Score++;

      roundWinnerId = match.player2Id;
    }
  }

  match.lastRound = {
    player1Choice: choice1,
    player2Choice: choice2,
    winnerId: roundWinnerId,
  };

  // Remove the previous secret choices.
  secretChoices.clear();
  match.submittedPlayerIds = [];

  // ---------------------------------
  // CHECK FOR THE MATCH WINNER
  // ---------------------------------

  const winsRequired = match.winsRequired ?? 2;

  if (match.player1Score >= winsRequired) {
    match.winnerId = match.player1Id;
  } else if (match.player2Score >= winsRequired) {
    match.winnerId = match.player2Id;
  }

  // A new token prevents stale submissions
  // from being accepted in the next round.
  draw.token = randomUUID();

  if (match.winnerId) {
    const winner = getActivePlayer(game, match.winnerId);

    const winnerName = winner?.name ?? "Spelaren";

    // NEW: Card 177 announces a
    // prize choice instead of cash.
    if (draw.card.id === "chance-177") {
      game.message =
        winnerName +
        " vann Sten-Sax-Påse och får " +
        "välja ett aktiebrev eller " +
        match.reward.toLocaleString("sv-SE") +
        " kr!";
    } else {
      game.message =
        winnerName +
        " vann Sten-Sax-Påse och får " +
        match.reward.toLocaleString("sv-SE") +
        " kr!";
    }

    return true;
  }

  match.round++;

  game.message = roundWinnerId
    ? "Nästa runda i Sten-Sax-Påse!"
    : "Oavgjort! Spela en ny runda.";

  return true;
}

function getChanceMoneyMultiplier(game: GameState): number {
  const effect = game.activeLotteryCard?.effect;

  if (effect?.type === "reverseChanceMoney") {
    return effect.multiplier;
  }

  return 1;
}

function changeChanceBankMoney(
  game: GameState,
  player: GamePlayer,
  amount: number,
): void {
  // Positive = receive money.
  // Negative = pay money.
  const adjustedAmount = amount * getChanceMoneyMultiplier(game);

  if (adjustedAmount >= 0) {
    player.money += adjustedAmount;

    game.message =
      player.name +
      " inkasserade " +
      adjustedAmount.toLocaleString("sv-SE") +
      " kr från Banken.";
  } else {
    const payment = Math.min(Math.max(0, player.money), -adjustedAmount);

    player.money -= payment;

    game.message =
      player.name +
      " betalade " +
      payment.toLocaleString("sv-SE") +
      " kr till Banken.";

    if (player.money <= 0) {
      eliminatePlayer(game, player);
    }
  }
}

// Apply an individual card effect.
function applyChanceEffect(
  game: GameState,
  player: GamePlayer,
  effect: ChanceEffect,
) {
  switch (effect.type) {
    case "swapPlayerPositionsWithoutLanding": {
      const target = game.players.find(
        (other) =>
          other.id === effect.targetPlayerId &&
          !other.eliminated &&
          other.id !== player.id,
      );

      if (!target) {
        game.message = "Det finns ingen spelare att byta plats med.";
        break;
      }

      // Remember both positions.
      const originalTileId = player.tileId;
      const targetTileId = target.tileId;

      // Exchange positions instantly.
      player.tileId = targetTileId;
      target.tileId = originalTileId;

      game.message =
        player.name +
        " bytte plats med " +
        target.name +
        " med teleporteringsmaskinen!";

      // IMPORTANT:
      // Do NOT call resolveLanding().
      // Do NOT queue a landing task.
      // Neither player activates the new square.

      break;
    }

    case "transferRentProperty": {
      const recipient = getActivePlayer(game, effect.recipientId);

      if (!recipient || player.eliminated) {
        break;
      }

      // Only transfer a property the
      // paying player still owns.
      if (game.ownership[effect.propertyId] !== player.id) {
        break;
      }

      game.ownership[effect.propertyId] = recipient.id;

      const property = game.properties[effect.propertyId];

      game.message =
        player.name +
        " gav aktiebrevet " +
        property.name +
        " till " +
        recipient.name +
        " på grund av Lotteri 005!";

      break;
    }

    case "moveToNearestForest": {
      if (player.hospitalStay) {
        game.message = player.name + " måste stanna på Sjukhuset.";
        break;
      }

      // Search for a board square with
      // "skog" in its name.
      const forests = game.board.filter((tile) =>
        tile.name.toLocaleLowerCase("sv-SE").includes("skog"),
      );

      let nearestId: string | null = null;
      let nearestDistance = Infinity;

      for (const forest of forests) {
        const path = findWalkingPathToTile(player.tileId, forest.id);

        if (path !== null && path.length < nearestDistance) {
          nearestId = forest.id;
          nearestDistance = path.length;
        }
      }

      if (nearestId === null) {
        game.message = "Det finns ingen skogsruta på spelplanen ännu.";
        break;
      }

      prependTasks(game, {
        type: "effect",
        playerId: player.id,
        effect: {
          type: "moveTo",
          tileId: nearestId,
          resolveLanding: true,
        },
      });

      break;
    }

    case "moveToNearestPropertyWithoutLanding": {
      if (player.hospitalStay) {
        game.message = player.name + " måste stanna på Sjukhuset.";
        break;
      }

      const destinationId = findNearestProperty(
        player.tileId,
        effect.propertyId,
      );

      if (!destinationId) {
        game.message = "Ingen sådan butik kunde hittas.";
        break;
      }

      // Move directly without activating the
      // normal property purchase or rent.
      player.tileId = destinationId;

      // Preserve persistent reward and
      // hospital-release checks.
      expireMoneyPerRollRewards(game, destinationId);

      game.message =
        player.name +
        " åkte till " +
        game.properties[effect.propertyId].name +
        ".";

      break;
    }

    case "secondFiveRoll": {
      // The first roll was a 5.
      // Open a NEW dice prompt for the
      // second consecutive roll.
      game.chanceDraw = {
        token: randomUUID(),
        playerId: player.id,
        card: {
          id: "chance-239-second-roll",
          text:
            "Du slog en femma. Slå tärningen igen. " +
            "Om du slår ytterligare en femma är spelet slut.",
          effect: {
            type: "rollForEffect",
            outcomes: [
              {
                rolls: [1, 2, 3, 4, 6],
                label: "Ingen andra femma – spelet fortsätter",
                effect: {
                  type: "sequence",
                  effects: [],
                },
              },
              {
                rolls: [5],
                label: "Två femmor i rad – spelet är slut",
                effect: {
                  type: "endGameWithoutWinner",
                },
              },
            ],
          },
        },
        remaining: 1,
        total: 1,
      };

      game.phase = "chance";
      game.message = player.name + " slog en femma och får slå igen!";

      break;
    }

    case "endGameWithoutWinner": {
      // The card says the game ends,
      // but doesn't declare a winner.
      game.phase = "finished";
      game.winnerId = null;
      game.chanceDraw = null;
      game.purchaseOffer = null;
      game.moneyPerRollRewards = [];

      resolutionQueues.delete(game);
      groupMovements.delete(game);

      game.message = "Två femmor i rad! Spelet är slut utan vinnare.";

      break;
    }

    case "movePlayerAndRightPlayerTo": {
      const players = playersInOrder(game, player.id);

      const rightPlayer = players.at(-1);

      if (!rightPlayer || rightPlayer.id === player.id) {
        break;
      }

      // Both players move to the destination.
      // In a two-player game, the other player
      // is the right-hand player.
      prependTasks(
        game,
        {
          type: "effect",
          playerId: player.id,
          effect: {
            type: "moveTo",
            tileId: effect.tileId,
            resolveLanding: true,
          },
        },
        {
          type: "effect",
          playerId: rightPlayer.id,
          effect: {
            type: "moveTo",
            tileId: effect.tileId,
            resolveLanding: true,
          },
        },
      );

      break;
    }

    case "temporaryBankruptcy": {
      // Lose all money.
      player.money = 0;

      // Lose all Aktiebrev.
      for (const propertyId of Object.keys(game.ownership) as PropertyId[]) {
        if (game.ownership[propertyId] === player.id) {
          delete game.ownership[propertyId];
        }
      }

      // Cancel existing loans and bonuses.
      player.loans = [];
      player.skipTurnsRemaining = 0;
      player.hospitalStay = null;
      player.nextRollMultiplier = 1;
      player.nextRollBonus = 0;

      game.moneyPerRollRewards = game.moneyPerRollRewards.filter(
        (reward) => reward.playerId !== player.id,
      );

      // Temporarily out, but NOT eliminated yet.
      getPendingBankruptcies(game).add(player.id);

      game.message =
        player.name +
        " har förlorat alla pengar och aktiebrev! " +
        "Om nästa spelare slår 2–6 kommer " +
        player.name +
        " tillbaka med 20 000 kr.";

      break;
    }

    case "repeatPingPongChaosRoll": {
      const original = CHANCE_CARDS.find((card) => card.id === "chance-207");

      if (!original) {
        break;
      }

      game.chanceDraw = {
        token: randomUUID(),
        playerId: player.id,
        card: original,
        remaining: 1,
        total: 1,
      };

      game.phase = "chance";
      game.message = player.name + " får slå om på pingiskortet!";

      break;
    }

    case "pingPongChaosOutcome": {
      const roll = effect.roll;

      // Result 2: collect money and roll
      // again on THIS card.
      const queueResultTwo = () => {
        prependTasks(
          game,
          {
            type: "effect",
            playerId: player.id,
            effect: {
              type: "gainMoney",
              amount: 12_000,
            },
          },
          {
            type: "effect",
            playerId: player.id,
            effect: {
              type: "repeatPingPongChaosRoll",
            },
          },
        );
      };

      if (roll === 1) {
        const active = game.players.filter(
          (candidate) => !candidate.eliminated,
        );

        const distances = active.map((candidate) =>
          getDistanceToFinish(candidate.tileId),
        );

        const distance = getDistanceToFinish(player.tileId);

        const isFirstOrLast =
          distance === Math.min(...distances) ||
          distance === Math.max(...distances);

        if (isFirstOrLast) {
          const leftPlayer = playersInOrder(game, player.id)[1];

          if (leftPlayer) {
            prependTasks(game, {
              type: "effect",
              playerId: player.id,
              effect: {
                type: "payPlayer",
                targetPlayerId: leftPlayer.id,
                amount: 4_000,
              },
            });
          }
        } else {
          prependTasks(
            game,
            {
              type: "effect",
              playerId: player.id,
              effect: {
                type: "gainMoney",
                amount: 7_000,
              },
            },
            {
              type: "effect",
              playerId: player.id,
              effect: {
                type: "loseMoney",
                amount: 2_000,
              },
            },
          );
        }

        break;
      }

      if (roll === 2) {
        queueResultTwo();
        break;
      }

      if (roll === 3 || roll === 4) {
        // On a 4, the drawing player
        // also receives 4,000 kr.
        if (roll === 4) {
          prependTasks(game, {
            type: "effect",
            playerId: player.id,
            effect: {
              type: "gainMoney",
              amount: 4_000,
            },
          });
        }

        startGroupMovement(
          game,
          player.id,
          4,
          "forward",
          false,
          undefined,
          (candidate) => {
            // Anyone named Stulf is exempt.
            if (candidate.name.trim().toLocaleLowerCase("sv-SE") === "stulf") {
              return 0;
            }

            // Over 30,000 kr: go forward,
            // except owners of Bilaffären.
            //
            // Flygbolaget is deliberately
            // not an actual Aktiebrev.
            if (candidate.money > 30_000) {
              return game.ownership.carStore === candidate.id ? 0 : 4;
            }

            // 30,000 kr or less: go back.
            return -4;
          },
        );

        break;
      }

      if (roll === 5) {
        const active = playersInOrder(game, player.id);

        const richest = active.reduce((best, candidate) =>
          candidate.money > best.money ? candidate : best,
        );

        // If the richest player owns
        // Svensk Bank, treat 5 as 2.
        if (game.ownership.bank === richest.id) {
          queueResultTwo();
          break;
        }

        const leftPlayer = active[1];

        if (leftPlayer) {
          prependTasks(game, {
            type: "effect",
            playerId: leftPlayer.id,
            effect: {
              type: "loseMoney",
              amount: 27_000,
            },
          });
        }

        break;
      }

      if (roll === 6) {
        queueResultTwo();

        const groceryOwnerId = game.ownership.groceryStore;

        if (!groceryOwnerId) {
          break;
        }

        // Also owns Bilaffären:
        // six behaves like two, but
        // they must say "Köttbit".
        if (game.ownership.carStore === groceryOwnerId) {
          const owner = getActivePlayer(game, groceryOwnerId);

          if (owner) {
            game.message = owner.name + ' måste säga "Köttbit"!';
          }

          break;
        }

        const owner = getActivePlayer(game, groceryOwnerId);

        if (!owner) {
          break;
        }

        // The owner pays 1,000 kr
        // and moves backwards once.
        prependTasks(game, {
          type: "effect",
          playerId: owner.id,
          effect: {
            type: "loseMoney",
            amount: 1_000,
          },
        });

        if (!owner.hospitalStay) {
          startGroupMovement(game, player.id, 1, "backward", false, owner.id);
        }

        // Walking around the physical
        // table is flavor text only.
        break;
      }

      // There is intentionally no roll 7
      // on a six-sided die.
      break;
    }

    case "moveRightPlayerTo": {
      const players = playersInOrder(game, player.id);

      if (players.length < 2) {
        break;
      }

      const rightPlayer = players[players.length - 1];

      prependTasks(game, {
        type: "effect",
        playerId: rightPlayer.id,
        effect: {
          type: "moveTo",
          tileId: effect.tileId,
          resolveLanding: true,
        },
      });

      break;
    }

    case "policeFineChoice": {
      const leftPlayer = playersInOrder(game, player.id)[1];

      const chooser =
        leftPlayer && leftPlayer.money > player.money ? leftPlayer : player;

      const chooserIsLeftPlayer = chooser.id !== player.id;

      game.chanceDraw = {
        token: randomUUID(),
        playerId: chooser.id,
        card: {
          id: "chance-205-choice",
          text: chooserIsLeftPlayer
            ? chooser.name +
              " är rikare och väljer bötesbelopp åt " +
              player.name +
              "."
            : player.name + " väljer sitt bötesbelopp.",
          effect: {
            type: "choose",
            options: [5_000, 7_000].map((amount) => ({
              label: "Böter " + amount.toLocaleString("sv-SE") + " kr",
              effect: {
                type: "policeFinePayment",
                targetPlayerId: player.id,
                amount,
              },
            })),
          },
        },
        remaining: 1,
        total: 1,
      };

      game.phase = "chance";
      game.message = chooser.name + " väljer bötesbelopp.";

      break;
    }

    case "policeFinePayment": {
      const target = getActivePlayer(game, effect.targetPlayerId);

      if (!target) {
        break;
      }

      prependTasks(game, {
        type: "effect",
        playerId: target.id,
        effect: {
          type: "loseMoney",
          amount: effect.amount,
        },
      });

      break;
    }

    case "moveLeftPlayerTo": {
      // Find the next active player
      // in turn order.
      const players = playersInOrder(game, player.id);

      const leftPlayer = players[1];

      if (!leftPlayer) {
        break;
      }

      // Reuse normal direct movement.
      prependTasks(game, {
        type: "effect",
        playerId: leftPlayer.id,
        effect: {
          type: "moveTo",
          tileId: effect.tileId,
          resolveLanding: true,
        },
      });

      game.message =
        leftPlayer.name + " ska gå till " + getTile(effect.tileId).name + "!";

      break;
    }

    case "swapPropertyOwnersPositions": {
      // Find the owners of both companies.
      const firstOwnerId = game.ownership[effect.firstPropertyId];

      const secondOwnerId = game.ownership[effect.secondPropertyId];

      const firstProperty = game.properties[effect.firstPropertyId];

      const secondProperty = game.properties[effect.secondPropertyId];

      // Both companies must have
      // an actual player as their owner.
      if (!firstOwnerId || !secondOwnerId) {
        game.message =
          "Det går inte att byta plats. " +
          "Banken äger " +
          "minst ett av företagen.";

        break;
      }

      // If the same player owns both,
      // there is nobody to swap with.
      if (firstOwnerId === secondOwnerId) {
        game.message =
          "Samma spelare äger både " +
          firstProperty.name +
          " och " +
          secondProperty.name +
          ". Ingen behöver byta plats.";

        break;
      }

      const firstOwner = getActivePlayer(game, firstOwnerId);

      const secondOwner = getActivePlayer(game, secondOwnerId);

      if (!firstOwner || !secondOwner) {
        break;
      }

      // Preserve hospital restrictions.
      if (firstOwner.hospitalStay || secondOwner.hospitalStay) {
        game.message =
          "Spelarna kan inte byta plats " +
          "eftersom en av dem måste " +
          "stanna på Sjukhuset.";

        break;
      }

      // Save both positions before
      // moving either player.
      const firstTileId = firstOwner.tileId;

      const secondTileId = secondOwner.tileId;

      // Swap their board positions.
      firstOwner.tileId = secondTileId;
      secondOwner.tileId = firstTileId;

      // Record any new hospital visits.
      if (firstOwner.tileId === HOSPITAL_TILE_ID) {
        recordHospitalVisit(game, firstOwner.id);
      }

      if (secondOwner.tileId === HOSPITAL_TILE_ID) {
        recordHospitalVisit(game, secondOwner.id);
      }

      // Check persistent rewards and
      // hospital release conditions.
      expireMoneyPerRollRewards(game, firstOwner.tileId);

      expireMoneyPerRollRewards(game, secondOwner.tileId);

      game.message =
        firstOwner.name +
        " (ägare av " +
        firstProperty.name +
        ") bytte plats med " +
        secondOwner.name +
        " (ägare av " +
        secondProperty.name +
        ")!";

      break;
    }

    case "givePropertyToRightPlayer": {
      // Find the player to the right.
      const players = playersInOrder(game, player.id);

      if (players.length < 2) {
        break;
      }

      const rightPlayer = players[players.length - 1];

      // Find every Aktiebrev owned
      // by the drawing player.
      const ownedProperties = (
        Object.keys(game.properties) as PropertyId[]
      ).filter((propertyId) => game.ownership[propertyId] === player.id);

      // ---------------------------------
      // NO AKTIEBREV: PAY MONEY INSTEAD
      // ---------------------------------

      if (ownedProperties.length === 0) {
        prependTasks(game, {
          type: "effect",
          playerId: player.id,
          effect: {
            type: "payPlayer",
            targetPlayerId: rightPlayer.id,
            amount: effect.fallbackAmount,
          },
        });

        break;
      }

      // ---------------------------------
      // AN AKTIEBREV HAS BEEN SELECTED
      // ---------------------------------

      if (effect.propertyId !== undefined) {
        const propertyId = effect.propertyId;

        // Verify that the player
        // still owns this Aktiebrev.
        if (game.ownership[propertyId] !== player.id) {
          break;
        }

        // Transfer the Aktiebrev directly.
        game.ownership[propertyId] = rightPlayer.id;

        game.message =
          player.name +
          " gav aktiebrevet för " +
          game.properties[propertyId].name +
          " till " +
          rightPlayer.name +
          "!";

        break;
      }

      // ---------------------------------
      // ONLY ONE AKTIEBREV: GIVE IT
      // AUTOMATICALLY
      // ---------------------------------

      if (ownedProperties.length === 1) {
        const propertyId = ownedProperties[0];

        game.ownership[propertyId] = rightPlayer.id;

        game.message =
          player.name +
          " gav aktiebrevet för " +
          game.properties[propertyId].name +
          " till " +
          rightPlayer.name +
          "!";

        break;
      }

      // ---------------------------------
      // MULTIPLE AKTIEBREV: LET THE
      // DRAWING PLAYER CHOOSE ONE
      // ---------------------------------

      game.chanceDraw = {
        token: randomUUID(),
        playerId: player.id,

        card: {
          id: "chance-189",
          text:
            "Välj vilket aktiebrev du vill " +
            "ge till " +
            rightPlayer.name +
            ".",

          effect: {
            type: "choose",

            options: ownedProperties.map((propertyId) => ({
              label:
                "Ge " +
                game.properties[propertyId].name +
                " till " +
                rightPlayer.name,

              effect: {
                type: "givePropertyToRightPlayer",
                fallbackAmount: effect.fallbackAmount,
                propertyId,
              },
            })),
          },
        },

        remaining: 1,
        total: 1,
      };

      game.phase = "chance";

      game.message =
        player.name +
        " väljer ett aktiebrev att ge till " +
        rightPlayer.name +
        ".";

      break;
    }

    case "loseMoneyPercentage": {
      // Calculate the payment based on
      // the player's current cash.
      const amount = Math.floor((player.money * effect.percent) / 100);

      if (amount <= 0) {
        break;
      }

      // Reuse our existing payment
      // and bankruptcy mechanics.
      prependTasks(game, {
        type: "effect",
        playerId: player.id,
        effect: {
          type: "loseMoney",
          amount,
        },
      });

      break;
    }

    case "moveBackwardWithSpecialLanding": {
      // Use our normal movement animation.
      startGroupMovement(
        game,
        player.id,
        effect.amount,
        "backward",
        false,
        player.id,
      );

      // Mark this specific movement
      // as using card 185's landing rules.
      const movement = groupMovements.get(game);

      if (movement) {
        movement.specialLanding = true;

        game.message =
          player.name +
          " går " +
          effect.amount +
          " steg bakåt med specialregler!";
      }

      break;
    }

    case "loseAllMoney": {
      // Find all active players,
      // including the drawing player.
      const players = playersInOrder(game, player.id);

      // Everyone pays the same amount
      // to Banken.
      const tasks: ResolutionTask[] = players.map((target) => ({
        type: "effect",
        playerId: target.id,
        effect: {
          type: "loseMoney",
          amount: effect.amount,
        },
      }));

      prependTasks(game, ...tasks);

      break;
    }

    case "propertyOwnerPayPerLeftProperty": {
      const property = game.properties[effect.propertyId];

      const ownerId = game.ownership[effect.propertyId];

      // If Banken owns the company,
      // nobody needs to pay.
      if (!ownerId) {
        game.message =
          "Banken äger " + property.name + ", så ingen spelare behöver betala.";

        break;
      }

      const owner = getActivePlayer(game, ownerId);

      if (!owner) {
        break;
      }

      // Kungen is exempt from the penalty.
      if (owner.name.trim().toLowerCase() === "kungen") {
        game.message = owner.name + " slipper betala. Kortet gäller ej Kungen!";

        break;
      }

      // Find the player to the LEFT
      // of the company's OWNER.
      const players = playersInOrder(game, owner.id);

      const leftPlayer = players[1];

      if (!leftPlayer) {
        break;
      }

      // Count the left player's Aktiebrev.
      const propertyCount = Object.values(game.ownership).filter(
        (id) => id === leftPlayer.id,
      ).length;

      const totalAmount = propertyCount * effect.amount;

      // Nothing to pay if the player
      // to the left owns no Aktiebrev.
      if (totalAmount === 0) {
        game.message =
          leftPlayer.name +
          " äger inga aktiebrev. " +
          owner.name +
          " behöver inte betala.";

        break;
      }

      // Charge the company's owner
      // using our existing bank payment
      // and bankruptcy mechanics.
      prependTasks(game, {
        type: "effect",
        playerId: owner.id,
        effect: {
          type: "loseMoney",
          amount: totalAmount,
        },
      });

      break;
    }

    case "moveFirstAndLast": {
      // Find all active players and
      // their remaining distance to Mål.
      const standings = game.players
        .filter((target) => !target.eliminated)
        .map((target) => ({
          player: target,
          distance: getDistanceToFinish(target.tileId),
        }));

      // Smaller distance = further ahead.
      const firstDistance = Math.min(
        ...standings.map((entry) => entry.distance),
      );

      // Larger distance = further behind.
      const lastDistance = Math.max(
        ...standings.map((entry) => entry.distance),
      );

      // Find everyone sharing first place.
      const firstPlayers = standings.filter(
        (entry) => entry.distance === firstDistance,
      );

      // Find everyone sharing last place.
      const lastPlayers = standings.filter(
        (entry) => entry.distance === lastDistance,
      );

      // If either position is shared,
      // the drawing player takes a new card.
      if (
        firstPlayers.length !== 1 ||
        lastPlayers.length !== 1 ||
        firstPlayers[0].player.id === lastPlayers[0].player.id ||
        standings.some((entry) => !Number.isFinite(entry.distance))
      ) {
        game.message =
          "Flera spelare delar första " +
          "eller sista platsen. " +
          player.name +
          " får ta ett nytt frågekort!";

        prependTasks(game, {
          type: "drawChance",
          playerId: player.id,
          remaining: 1,
          total: 1,
        });

        break;
      }

      // We now have exactly one player
      // in first place and one in last.
      const firstPlayer = firstPlayers[0].player;

      const lastPlayer = lastPlayers[0].player;

      // Move both players simultaneously.
      startGroupMovement(
        game,
        player.id,
        0,
        "forward",
        false,
        undefined,
        (target) => {
          if (target.id === lastPlayer.id) {
            return effect.amount;
          }

          if (target.id === firstPlayer.id) {
            return -effect.amount;
          }

          // Everyone else stays still.
          return 0;
        },
      );

      if (hasGroupMovement(game)) {
        game.message =
          lastPlayer.name +
          " går " +
          effect.amount +
          " steg framåt och " +
          firstPlayer.name +
          " går " +
          effect.amount +
          " steg bakåt!";
      }

      break;
    }

    case "drawBankModifiedChance": {
      // Draw one ordinary Frågekort.
      showChanceCard(game, player, 1, 1);

      const draw = game.chanceDraw;

      if (draw) {
        draw.bankModifier = {
          playerId: player.id,
          lotteryOffered: false,
        };

        // Keep the original card text,
        // but explain the special rule.
        draw.card = {
          ...draw.card,

          text:
            draw.card.text +
            "\n\nSpecialregel från frågekort 173: " +
            "Dina betalningar till Banken " +
            "fördubblas. Om du inkasserar " +
            "pengar får du välja att ta ett lotteri.",
        };
      }

      break;
    }

    case "offerBankBonusLottery": {
      // Show an optional Lotteri choice
      // using our existing choice modal.
      game.chanceDraw = {
        token: randomUUID(),
        playerId: player.id,

        card: {
          id: "chance-173",

          text: "Du inkasserade pengar! " + "Vill du ta ett extra lotteri?",

          effect: {
            type: "choose",

            options: [
              {
                label: "Ja, ta ett lotteri",

                effect: {
                  type: "drawLottery",
                },
              },
              {
                label: "Nej tack",

                effect: {
                  type: "sequence",
                  effects: [],
                },
              },
            ],
          },
        },

        remaining: 1,
        total: 1,
      };

      game.phase = "chance";

      game.message =
        player.name + " får välja om ett extra " + "lotteri ska dras!";

      break;
    }

    case "winGame": {
      // Winning through this card does
      // not require reaching Mål.
      finishGame(game, player.id);

      game.message = player.name + " slog två sexor och vann Gubbspelet!";

      break;
    }

    case "loseEverythingAndRestart": {
      // Return all of this player's
      // Aktiebrev to Banken.
      for (const propertyId of Object.keys(game.ownership) as PropertyId[]) {
        if (game.ownership[propertyId] === player.id) {
          delete game.ownership[propertyId];
        }
      }

      // Lose all current cash.
      // Do NOT call eliminatePlayer().
      player.money = 0;

      // Return directly to Start.
      player.tileId = START_TILE_ID;

      // Allow the player to restart
      // even if they were hospitalized.
      player.hospitalStay = null;

      game.message =
        player.name +
        " slog två ettor, förlorade alla " +
        "pengar och aktiebrev och börjar " +
        "om från Start!";

      break;
    }

    case "payPropertyOwnerPercentage": {
      const property = game.properties[effect.propertyId];

      const ownerId = game.ownership[effect.propertyId];

      // The player is exempt if they
      // own the company themselves.
      if (ownerId === player.id) {
        game.message =
          player.name + " äger " + property.name + " och slipper betala!";

        break;
      }

      // Calculate the payment based on
      // the drawing player's current money.
      const amount = Math.floor((player.money * effect.percent) / 100);

      if (amount <= 0) {
        break;
      }

      const owner = ownerId ? getActivePlayer(game, ownerId) : undefined;

      if (owner) {
        // Another player owns the company.
        // Pay that player directly.
        prependTasks(game, {
          type: "effect",
          playerId: player.id,
          effect: {
            type: "payPlayer",
            targetPlayerId: owner.id,
            amount,
          },
        });
      } else {
        // Banken owns the company.
        // Pay Banken instead.
        prependTasks(game, {
          type: "effect",
          playerId: player.id,
          effect: {
            type: "loseMoney",
            amount,
          },
        });
      }

      break;
    }

    case "gainMoneyPerUnownedProperty": {
      // Find every Aktiebrev still
      // owned by Banken.
      const unownedProperties = (
        Object.keys(game.properties) as PropertyId[]
      ).filter((propertyId) => !game.ownership[propertyId]);

      // Calculate the total reward.
      const reward = unownedProperties.length * effect.amount;

      if (reward > 0) {
        // Reuse our existing money
        // reward effect.
        prependTasks(game, {
          type: "effect",
          playerId: player.id,
          effect: {
            type: "gainMoney",
            amount: reward,
          },
        });
      } else {
        game.message =
          "Alla aktiebrev är redan köpta. " + player.name + " får inga pengar.";
      }

      break;
    }

    case "returnRandomPropertyToBank": {
      // Find every Aktiebrev owned
      // by the drawing player.
      const ownedProperties = (
        Object.keys(game.properties) as PropertyId[]
      ).filter((propertyId) => game.ownership[propertyId] === player.id);

      // The card has no effect if the
      // player doesn't own any Aktiebrev.
      if (ownedProperties.length === 0) {
        game.message =
          player.name + " äger inga aktiebrev. " + "Gorillan får ingenting!";

        break;
      }

      // Randomly select one of the
      // player's owned properties.
      const randomIndex = randomInt(ownedProperties.length);

      const propertyId = ownedProperties[randomIndex];

      // Reuse our existing property
      // return effect from card 119.
      prependTasks(game, {
        type: "effect",
        playerId: player.id,
        effect: {
          type: "returnPropertyToBank",
          propertyId,
        },
      });

      game.message =
        "Gorillan tog " +
        game.properties[propertyId].name +
        " från " +
        player.name +
        "!";

      break;
    }

    case "chooseOpponentPropertyOrReset": {
      // This effect only reaches the engine
      // when no opponent owns an Aktiebrev.
      const opponents = playersInOrder(game, player.id).filter(
        (target) => target.id !== player.id,
      );

      // Double-check that no opponent
      // owns any property.
      const opponentOwnsProperty = opponents.some((target) =>
        Object.values(game.ownership).some((ownerId) => ownerId === target.id),
      );

      if (opponentOwnsProperty) {
        throw new Error("Property choices must be prepared before resolution.");
      }

      // Send every opponent to Start.
      // Existing hospital restrictions apply.
      const tasks: ResolutionTask[] = opponents.map((target) => ({
        type: "effect",
        playerId: target.id,
        effect: {
          type: "moveTo",
          tileId: START_TILE_ID,
          resolveLanding: true,
        },
      }));

      prependTasks(game, ...tasks);

      game.message =
        "Ingen motståndare äger ett aktiebrev! " +
        "Alla utom " +
        player.name +
        " måste gå till Start!";

      break;
    }

    case "moveToLeftPlayer": {
      // Hospitalized players cannot move.
      if (player.hospitalStay) {
        game.message = player.name + " måste stanna på Sjukhuset.";

        break;
      }

      // Find the next active player
      // in turn order.
      const players = playersInOrder(game, player.id);

      const leftPlayer = players[1];

      if (!leftPlayer) {
        break;
      }

      // Move directly to the other
      // player's current square.
      player.tileId = leftPlayer.tileId;

      const destination = getTile(player.tileId);

      // Remember hospital visits.
      if (destination.type === "hospital") {
        recordHospitalVisit(game, player.id);
      }

      // Check existing rewards and
      // hospital release conditions.
      expireMoneyPerRollRewards(game, player.tileId);

      game.message =
        player.name + " flyttades till samma ruta som " + leftPlayer.name + "!";

      break;
    }

    case "rewardSwedenSupporters": {
      // Include every active player,
      // starting with the drawing player.
      const players = playersInOrder(game, player.id);

      // Give each player their own question.
      const tasks: ResolutionTask[] = players.map((target) => ({
        type: "effect",
        playerId: target.id,
        effect: {
          type: "askSwedenSupport",
          amount: effect.amount,
        },
      }));

      prependTasks(game, ...tasks);

      break;
    }

    case "askSwedenSupport": {
      // Find the original question card.
      const card = CHANCE_CARDS.find((item) => item.id === "chance-146");

      if (!card) {
        throw new Error("Chance card 146 not found.");
      }

      // Show this question to the specific
      // player currently answering.
      game.chanceDraw = {
        token: randomUUID(),
        playerId: player.id,

        card: {
          ...card,

          text: card.text + " " + player.name + ", hejar du på Sverige?",

          effect: {
            type: "choose",

            options: [
              {
                label: "🇸🇪 Ja, jag hejar på Sverige!",

                effect: {
                  type: "gainMoney",
                  amount: effect.amount,
                },
              },
              {
                label: "Nej, jag hejar inte på Sverige",

                effect: {
                  type: "sequence",
                  effects: [],
                },
              },
            ],
          },
        },

        remaining: 1,
        total: 1,
      };

      game.phase = "chance";

      game.message = player.name + ", hejar du på Sverige i ishockey?";

      break;
    }

    case "returnOwnedPropertyToBank": {
      const property = game.properties[effect.propertyId];

      const ownerId = game.ownership[effect.propertyId];

      // Banken already owns the property.
      if (!ownerId) {
        game.message = "Banken äger redan " + property.name + ".";

        break;
      }

      const owner = getActivePlayer(game, ownerId);

      if (!owner) {
        break;
      }

      // Reuse the existing effect from
      // card 119, targeting the actual owner.
      prependTasks(game, {
        type: "effect",
        playerId: owner.id,
        effect: {
          type: "returnPropertyToBank",
          propertyId: effect.propertyId,
        },
      });

      break;
    }

    case "moveAllToNearestPropertyWithFee": {
      const property = game.properties[effect.propertyId];

      const ownerId = game.ownership[effect.propertyId];

      // The entire card is skipped if
      // Banken owns the company.
      if (!ownerId) {
        game.message =
          "Banken äger " + property.name + ", så ingen behöver flytta.";

        break;
      }

      const owner = getActivePlayer(game, ownerId);

      if (!owner) {
        break;
      }

      // Include all active players,
      // including the property owner.
      // Hospitalized players cannot move.
      const players = playersInOrder(game, player.id).filter(
        (target) => !target.hospitalStay,
      );

      const landingTasks: ResolutionTask[] = [];

      // Move each player to their own
      // nearest matching property.
      for (const target of players) {
        const destinationId = findNearestProperty(
          target.tileId,
          effect.propertyId,
        );

        if (!destinationId) {
          continue;
        }

        target.tileId = destinationId;

        // Check persistent rewards and
        // hospital release conditions.
        expireMoneyPerRollRewards(game, target.tileId);

        // Resolve the landing with the
        // discounted property fee.
        landingTasks.push({
          type: "landing",
          playerId: target.id,
          tileId: destinationId,
          feeOverride: effect.fee,
        });
      }

      // Everyone moves before the
      // individual rent payments begin.
      prependTasks(game, ...landingTasks);

      game.message =
        "Alla åker till närmaste " +
        property.name +
        " och betalar bara " +
        effect.fee.toLocaleString("sv-SE") +
        " kr i hyra!";

      break;
    }

    case "payAllOtherPlayersExceptTile": {
      // Find all active opponents,
      // excluding players on the specified tile.
      const opponents = playersInOrder(game, player.id).filter(
        (target) =>
          target.id !== player.id && target.tileId !== effect.excludedTileId,
      );

      // Create one payment for each
      // eligible opponent.
      const tasks: ResolutionTask[] = opponents.map((opponent) => ({
        type: "effect",
        playerId: player.id,
        effect: {
          type: "payPlayer",
          targetPlayerId: opponent.id,
          amount: effect.amount,
        },
      }));

      prependTasks(game, ...tasks);

      game.message =
        player.name +
        " delar ut " +
        effect.amount.toLocaleString("sv-SE") +
        " kr till varje spelare utom de på " +
        getTile(effect.excludedTileId).name +
        "!";

      break;
    }

    case "payRightPlayer": {
      // Get active players in turn order,
      // starting with the drawing player.
      const players = playersInOrder(game, player.id);

      if (players.length < 2) {
        break;
      }

      // The player to the right is the
      // previous active player in turn order.
      const rightPlayer = players[players.length - 1];

      // Reuse our existing player-to-player
      // payment and bankruptcy mechanics.
      prependTasks(game, {
        type: "effect",
        playerId: player.id,
        effect: {
          type: "payPlayer",
          targetPlayerId: rightPlayer.id,
          amount: effect.amount,
        },
      });

      break;
    }

    case "propertyOwnerCollectFromAll": {
      const property = game.properties[effect.propertyId];

      const ownerId = game.ownership[effect.propertyId];

      // Nobody pays if Banken owns
      // the company.
      if (!ownerId) {
        game.message =
          "Banken äger " + property.name + ", så ingen spelare behöver betala.";

        break;
      }

      const owner = getActivePlayer(game, ownerId);

      if (!owner) {
        break;
      }

      // Every active player except
      // the property's owner must pay.
      const opponents = playersInOrder(game, owner.id).filter(
        (target) => target.id !== owner.id,
      );

      const tasks: ResolutionTask[] = opponents.map((target) => ({
        type: "effect",
        playerId: target.id,
        effect: {
          type: "payPlayer",
          targetPlayerId: owner.id,
          amount: effect.amount,
        },
      }));

      prependTasks(game, ...tasks);

      game.message =
        owner.name +
        " får " +
        effect.amount.toLocaleString("sv-SE") +
        " kr av alla andra spelare!";

      break;
    }

    case "returnAllPropertiesToBank": {
      // Return every Aktiebrev to Banken.
      // An empty ownership object means
      // Banken owns every company.
      game.ownership = {};

      game.message =
        "Alla spelare lämnade tillbaka " + "sina aktiebrev till Banken!";

      break;
    }

    case "propertyOwnerCollectPercentage": {
      const property = game.properties[effect.propertyId];

      const ownerId = game.ownership[effect.propertyId];

      // Nobody receives money if Banken
      // owns the property.
      if (!ownerId) {
        game.message =
          "Banken äger " + property.name + ", så ingen spelare behöver betala.";

        break;
      }

      const owner = getActivePlayer(game, ownerId);

      if (!owner) {
        break;
      }

      // Find all active players except
      // the property's owner.
      const opponents = playersInOrder(game, owner.id).filter(
        (target) => target.id !== owner.id,
      );

      const tasks: ResolutionTask[] = [];

      for (const target of opponents) {
        // Calculate each player's own
        // percentage payment.
        const amount = Math.floor((target.money * effect.percent) / 100);

        if (amount > 0) {
          tasks.push({
            type: "effect",
            playerId: target.id,
            effect: {
              type: "payPlayer",
              targetPlayerId: owner.id,
              amount,
            },
          });
        }
      }

      // Execute all the payments using
      // our existing resolution queue.
      prependTasks(game, ...tasks);

      game.message =
        owner.name +
        " äger " +
        property.name +
        " och får " +
        effect.percent +
        "% av alla andra spelares pengar!";

      break;
    }

    case "payLeftPlayer": {
      // Find the next active player
      // in turn order.
      const players = playersInOrder(game, player.id);

      const leftPlayer = players[1];

      if (!leftPlayer) {
        break;
      }

      // Reuse our existing player-to-player
      // payment and bankruptcy mechanics.
      prependTasks(game, {
        type: "effect",
        playerId: player.id,
        effect: {
          type: "payPlayer",
          targetPlayerId: leftPlayer.id,
          amount: effect.amount,
        },
      });

      break;
    }

    case "setMoney": {
      const difference = effect.amount - player.money;

      if (difference > 0) {
        // The player needs more money.
        prependTasks(game, {
          type: "effect",
          playerId: player.id,
          effect: {
            type: "gainMoney",
            amount: difference,
          },
        });
      } else if (difference < 0) {
        // The player has too much money.
        prependTasks(game, {
          type: "effect",
          playerId: player.id,
          effect: {
            type: "loseMoney",
            amount: Math.abs(difference),
          },
        });
      } else {
        // The player already has the correct amount.
        game.message =
          player.name +
          " har redan exakt " +
          effect.amount.toLocaleString("sv-SE") +
          " kr!";
      }

      break;
    }

    case "requestReturnProperty": {
      const property = game.properties[effect.propertyId];

      const ownerId = game.ownership[effect.propertyId];

      // Banken already owns the company.
      if (!ownerId) {
        game.message =
          "Banken äger redan " +
          property.name +
          ", så ingen behöver lämna tillbaka något.";

        break;
      }

      const owner = getActivePlayer(game, ownerId);

      if (!owner) {
        break;
      }

      // Find the original question card.
      const card = CHANCE_CARDS.find((item) => item.id === "chance-119");

      if (!card) {
        throw new Error("Chance card 119 not found.");
      }

      // Open a confirmation for the owner,
      // rather than the drawing player.
      game.chanceDraw = {
        token: randomUUID(),
        playerId: owner.id,

        card: {
          ...card,

          text:
            owner.name +
            ', säg "' +
            effect.phrase +
            '" och lämna tillbaka aktiebrevet för ' +
            property.name +
            " till Banken.",

          effect: {
            type: "choose",

            options: [
              {
                label: 'Jag har sagt "' + effect.phrase + '"',

                effect: {
                  type: "returnPropertyToBank",
                  propertyId: effect.propertyId,
                },
              },
            ],
          },
        },

        remaining: 1,
        total: 1,
      };

      game.phase = "chance";

      game.message =
        owner.name + " måste lämna tillbaka " + property.name + " till Banken!";

      break;
    }

    case "returnPropertyToBank": {
      const property = game.properties[effect.propertyId];

      // Only the actual owner can return
      // this Aktiebrev.
      if (game.ownership[effect.propertyId] !== player.id) {
        break;
      }

      // Removing ownership means that
      // Banken owns the company again.
      delete game.ownership[effect.propertyId];

      // No money is refunded.
      game.message =
        player.name + " lämnade tillbaka " + property.name + " till Banken.";

      break;
    }

    case "movePlayerAndLeftPlayerTo": {
      // Find the player to the left.
      const players = playersInOrder(game, player.id);

      const leftPlayer = players[1];

      const tasks: ResolutionTask[] = [
        {
          type: "effect",
          playerId: player.id,
          effect: {
            type: "moveTo",
            tileId: effect.tileId,
            resolveLanding: true,
          },
        },
      ];

      // The player to the left accompanies
      // the drawing player.
      if (leftPlayer) {
        tasks.push({
          type: "effect",
          playerId: leftPlayer.id,
          effect: {
            type: "moveTo",
            tileId: effect.tileId,
            resolveLanding: true,
          },
        });
      }

      prependTasks(game, ...tasks);

      break;
    }

    case "loseAllMoneyPercentage": {
      // Include every active player,
      // including the drawing player.
      const players = playersInOrder(game, player.id);

      const tasks: ResolutionTask[] = [];

      for (const target of players) {
        // Calculate the payment based on
        // each player's current money.
        const amount = Math.floor((target.money * effect.percent) / 100);

        if (amount > 0) {
          tasks.push({
            type: "effect",
            playerId: target.id,
            effect: {
              type: "loseMoney",
              amount,
            },
          });
        }
      }

      prependTasks(game, ...tasks);

      game.message =
        "Alla spelare betalar " +
        effect.percent +
        "% av sina pengar till Banken!";

      break;
    }

    case "moveTowardsLeftPlayer": {
      // Hospitalized players cannot move.
      if (player.hospitalStay) {
        game.message = player.name + " måste stanna på Sjukhuset.";

        break;
      }

      // Find the player to the left
      // using our existing turn order.
      const players = playersInOrder(game, player.id);

      const target = players[1];

      if (!target) {
        break;
      }

      // Find the shortest walking route
      // towards the other player's square.
      const path = findWalkingPathToTile(player.tileId, target.tileId);

      if (path === null) {
        break;
      }

      // Check whether we can catch up
      // within the allowed movement.
      const caughtPlayer = path.length <= effect.amount;

      // Stop at the other player's square
      // instead of walking past them.
      const walkingPath = path.slice(0, effect.amount);

      // If we catch up, draw the extra
      // question card after movement.
      if (caughtPlayer && effect.drawCardsOnCatch > 0) {
        prependTasks(game, {
          type: "drawChance",
          playerId: player.id,
          remaining: effect.drawCardsOnCatch,
          total: effect.drawCardsOnCatch,
        });
      }

      // Already standing together.
      // No movement or repeated landing.
      if (walkingPath.length === 0) {
        game.message =
          player.name + " står redan på samma ruta som " + target.name + "!";

        break;
      }

      let finalTileId = walkingPath[walkingPath.length - 1];

      const destination = getTile(finalTileId);

      let busFrom: string | null = null;

      // Normal bus rules apply if we
      // have not caught the other player.
      if (
        !caughtPlayer &&
        destination.type === "bus" &&
        destination.targetTileId
      ) {
        busFrom = destination.id;
        finalTileId = destination.targetTileId;
      }

      // Reuse the animated group
      // movement system for one player.
      groupMovements.set(game, {
        moves: [
          {
            playerId: player.id,
            walkingPath,
            busFrom,
            finalTileId,
          },
        ],

        step: 0,
        maxSteps: walkingPath.length,
        stage: "walking",
      });

      game.phase = "moving";

      if (caughtPlayer) {
        game.message =
          player.name +
          " kommer ikapp " +
          target.name +
          " och får dra ett frågekort!";
      } else {
        game.message =
          player.name +
          " går " +
          walkingPath.length +
          " steg mot " +
          target.name +
          "!";
      }

      break;
    }

    case "movePropertyOwnersBackward": {
      startGroupMovement(
        game,
        player.id,
        0,
        "forward",
        false,
        undefined,

        // Only players who own at least
        // one Aktiebrev move backwards.
        (target) => {
          const ownsProperty = Object.values(game.ownership).some(
            (ownerId) => ownerId === target.id,
          );

          return ownsProperty ? -effect.amount : 0;
        },
      );

      break;
    }

    case "moveTowardsNearestBus": {
      // Hospitalized players cannot move.
      if (player.hospitalStay) {
        game.message = player.name + " måste stanna på Sjukhuset.";

        break;
      }

      // Find every bus stop on the board.
      const busStops = board.filter((tile) => tile.type === "bus");

      let nearestBusId: string | null = null;
      let shortestDistance = Infinity;

      // Find the closest bus stop using
      // actual walking distance.
      for (const busStop of busStops) {
        const path = findWalkingPathToTile(player.tileId, busStop.id);

        if (path !== null && path.length < shortestDistance) {
          nearestBusId = busStop.id;
          shortestDistance = path.length;
        }
      }

      // No reachable bus stop.
      if (nearestBusId === null) {
        break;
      }

      // Reuse the movement effect from
      // card 108.
      prependTasks(game, {
        type: "effect",
        playerId: player.id,
        effect: {
          type: "moveTowardsTile",
          tileId: nearestBusId,
          amount: effect.amount,
        },
      });

      break;
    }

    case "ifIPhone": {
      // Only iPhone players are affected.
      if (player.isIPhone) {
        prependTasks(game, {
          type: "effect",
          playerId: player.id,
          effect: effect.effect,
        });

        game.message = player.name + " spelar på en iPhone!";
      } else {
        game.message =
          player.name + " spelar inte på en iPhone och slipper effekten.";
      }

      break;
    }

    case "moveTowardsTile": {
      // Hospitalized players cannot move.
      if (player.hospitalStay) {
        game.message = player.name + " måste stanna på Sjukhuset.";

        break;
      }

      // Find the shortest walking route.
      const path = findWalkingPathToTile(player.tileId, effect.tileId);

      // No movement is needed.
      if (!path || path.length === 0) {
        game.message = player.name + " är redan framme eller kan inte flyttas.";

        break;
      }

      // Walk at most the specified number
      // of steps, stopping at the target.
      const walkingPath = path.slice(0, effect.amount);

      if (walkingPath.length === 0) {
        break;
      }

      let finalTileId = walkingPath[walkingPath.length - 1];

      const destination = getTile(finalTileId);

      let busFrom: string | null = null;

      // Buss activates if the player ends
      // their movement on a bus square.
      if (destination.type === "bus" && destination.targetTileId) {
        busFrom = destination.id;
        finalTileId = destination.targetTileId;
      }

      // Reuse our existing animated
      // group movement system.
      groupMovements.set(game, {
        moves: [
          {
            playerId: player.id,
            walkingPath,
            busFrom,
            finalTileId,
          },
        ],

        step: 0,
        maxSteps: walkingPath.length,
        stage: "walking",
      });

      game.phase = "moving";

      game.message =
        player.name +
        " går " +
        walkingPath.length +
        " steg mot " +
        getTile(effect.tileId).name +
        "!";

      break;
    }

    case "drawThemedChanceCard": {
      // Draw one additional question card.
      // Enable the special text matching.
      showChanceCard(game, player, 1, 1, true);

      break;
    }

    case "ifNearFinish": {
      // Check whether the player can reach
      // Mål within the specified distance.
      const movement = calculateMovement(player.tileId, effect.distance);

      const isNearFinish = getTile(movement.tileId).type === "finish";

      const selectedEffect = isNearFinish ? effect.ifNear : effect.otherwise;

      prependTasks(game, {
        type: "effect",
        playerId: player.id,
        effect: selectedEffect,
      });

      break;
    }

    case "extraOddRolls": {
      const tasks: ResolutionTask[] = [];

      for (let i = 0; i < effect.amount; i++) {
        tasks.push({
          type: "bonusRoll",
          playerId: player.id,
          oddOnly: true,
        });
      }

      prependTasks(game, ...tasks);

      game.message =
        player.name +
        " får slå " +
        effect.amount +
        " extra kast, men får bara gå på udda resultat!";

      break;
    }

    case "rockPaperScissorsRichestVsPoorest": {
      // Get every active player in turn order.
      const players = playersInOrder(game, player.id);

      if (players.length < 2) {
        break;
      }

      // Find the richest player.
      const richest = players.reduce((best, candidate) =>
        candidate.money > best.money ? candidate : best,
      );

      // Find the poorest player, excluding
      // the already selected richest player.
      const poorest = players
        .filter((candidate) => candidate.id !== richest.id)
        .reduce((best, candidate) =>
          candidate.money < best.money ? candidate : best,
        );

      // Start a match between these two players.
      startRockPaperScissorsMatch(
        game,
        richest,
        poorest.id,
        effect.reward,
        1,
        "chance-103",
      );

      break;
    }

    case "takePlayerMoney": {
      const target = getActivePlayer(game, effect.targetPlayerId);

      if (!target || target.id === player.id) {
        break;
      }

      // The selected opponent pays the
      // player who drew the question card.
      prependTasks(game, {
        type: "effect",
        playerId: target.id,
        effect: {
          type: "payPlayer",
          targetPlayerId: player.id,
          amount: effect.amount,
        },
      });

      break;
    }

    case "choosePlayerToTakeMoney": {
      throw new Error(
        "choosePlayerToTakeMoney must be prepared before resolution.",
      );
    }

    case "moveAllForwardPerProperty": {
      startGroupMovement(
        game,
        player.id,
        0,
        "forward",
        false,
        undefined,

        // Each player moves a different distance
        // depending on their own Aktiebrev.
        (target) => {
          const propertyCount = Object.values(game.ownership).filter(
            (ownerId) => ownerId === target.id,
          ).length;

          return propertyCount * effect.stepsPerProperty;
        },
      );

      break;
    }

    case "gainAllMoneyPercentage": {
      // Find all active players, including
      // the player who drew the card.
      const players = playersInOrder(game, player.id);

      const tasks: ResolutionTask[] = [];

      for (const target of players) {
        // Calculate the reward and round upwards.
        const reward =
          Math.ceil(
            (target.money * effect.percent) / (100 * effect.roundUpTo),
          ) * effect.roundUpTo;

        // Award each player their own reward.
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

    case "moveToOpponentPropertyWithFee": {
      const ownerId = game.ownership[effect.propertyId];
      const property = game.properties[effect.propertyId];

      const feeText = effect.fee.toLocaleString("sv-SE") + " kr";

      // The card does not apply if Banken
      // or the drawing player owns the company.
      if (!ownerId || ownerId === player.id) {
        game.message =
          player.name +
          " slipper åka till " +
          property.name +
          " och betala " +
          feeText +
          " i hyra!";

        break;
      }

      const owner = getActivePlayer(game, ownerId);

      if (!owner) {
        break;
      }

      // Hospitalized players cannot move.
      if (player.hospitalStay) {
        game.message = player.name + " måste stanna på Sjukhuset.";

        break;
      }

      // Find the nearest matching property.
      const destinationId = findNearestProperty(
        player.tileId,
        effect.propertyId,
      );

      if (!destinationId) {
        break;
      }

      // Move directly to the destination.
      player.tileId = destinationId;

      game.message =
        player.name +
        " åkte till " +
        property.name +
        " och måste betala " +
        feeText +
        " i hyra!";

      // Check persistent rewards and
      // hospital release conditions.
      expireMoneyPerRollRewards(game, player.tileId);

      // Resolve the landing with the special fee.
      prependTasks(game, {
        type: "landing",
        playerId: player.id,
        tileId: destinationId,
        feeOverride: effect.fee,
      });

      break;
    }

    case "payIfVisitedHospital": {
      // Check the player's private hospital history.
      if (hasVisitedHospital(game, player.id)) {
        prependTasks(game, {
          type: "effect",
          playerId: player.id,
          effect: {
            type: "loseMoney",
            amount: effect.amount,
          },
        });
      } else {
        game.message =
          player.name + " har aldrig varit på Sjukhuset och slipper betala.";
      }

      break;
    }

    case "moveBackwardToPropertyWithDiscount": {
      if (player.hospitalStay) {
        game.message = player.name + " måste stanna på Sjukhuset.";

        break;
      }

      let stepsToProperty: number | null = null;

      // Search backwards for the first matching
      // property along the board.
      for (let steps = 1; steps <= board.length; steps++) {
        const movement = calculateBackwardMovement(player.tileId, steps);

        const destination = getTile(movement.tileId);

        if (
          destination.type === "property" &&
          destination.propertyId === effect.propertyId
        ) {
          stepsToProperty = steps;

          break;
        }

        // We cannot move backwards past Start.
        if (destination.type === "start" || movement.path.length === 0) {
          break;
        }
      }

      // No matching property exists behind
      // the player.
      if (stepsToProperty === null) {
        game.message =
          "Det finns ingen " +
          game.properties[effect.propertyId].name +
          " bakom " +
          player.name +
          ".";

        break;
      }

      // Walk backwards and use the discounted
      // fee when resolving the destination.
      startGroupMovement(
        game,
        player.id,
        stepsToProperty,
        "backward",
        false,
        player.id,
        undefined,
        effect.fee,
      );

      break;
    }

    case "addNextRollSteps": {
      player.nextRollBonus += effect.amount;

      game.message =
        player.name +
        " får gå " +
        effect.amount +
        " extra steg vid sitt nästa tärningsslag!";

      break;
    }

    case "ifMoneyAbove": {
      // Check the player's current cash balance.
      const selectedEffect =
        player.money > effect.amount ? effect.ifAbove : effect.otherwise;

      // Execute the correct alternative.
      prependTasks(game, {
        type: "effect",
        playerId: player.id,
        effect: selectedEffect,
      });

      break;
    }

    case "drawLeftPlayerChanceCards": {
      // Find the next active player in turn order.
      const leftPlayer = playersInOrder(game, player.id)[1];

      if (!leftPlayer) {
        break;
      }

      if (effect.amount <= 0) {
        break;
      }

      // The player to the left draws
      // the specified number of Frågekort.
      prependTasks(game, {
        type: "drawChance",
        playerId: leftPlayer.id,
        remaining: effect.amount,
        total: effect.amount,
      });

      game.message =
        leftPlayer.name + " ska dra " + effect.amount + " frågekort!";

      break;
    }

    case "payAllOtherPlayers": {
      // Find every other active player.
      const opponents = playersInOrder(game, player.id).filter(
        (target) => target.id !== player.id,
      );

      // Create one payment for each opponent.
      const tasks: ResolutionTask[] = opponents.map((opponent) => ({
        type: "effect",
        playerId: player.id,
        effect: {
          type: "payPlayer",
          targetPlayerId: opponent.id,
          amount: effect.amount,
        },
      }));

      // Reuse our existing payment system.
      prependTasks(game, ...tasks);

      break;
    }

    case "moveToNearestLottery": {
      // Hospitalized players cannot move.
      if (player.hospitalStay) {
        game.message = player.name + " måste stanna på Sjukhuset.";

        break;
      }

      let nearestTileId: string | null = null;
      let shortestDistance = Infinity;

      // Find every Lotteri on the board.
      const lotteryTiles = board.filter((tile) => tile.type === "lottery");

      for (const tile of lotteryTiles) {
        // Calculate the walking distance
        // in either direction.
        const path = findWalkingPathToTile(player.tileId, tile.id);

        if (path !== null && path.length < shortestDistance) {
          shortestDistance = path.length;
          nearestTileId = tile.id;
        }
      }

      if (nearestTileId === null) {
        game.message = "Inget lotteri kunde hittas.";

        break;
      }

      // Move directly to the nearest Lotteri.
      prependTasks(game, {
        type: "effect",
        playerId: player.id,
        effect: {
          type: "moveTo",
          tileId: nearestTileId,
          resolveLanding: true,
        },
      });

      break;
    }

    case "moveToNextLottery": {
      let stepsToLottery: number | null = null;

      // Search forward along the board.
      // Start at 1 so the current square
      // does not count.
      for (let steps = 1; steps <= board.length; steps++) {
        const movement = calculateMovement(player.tileId, steps);

        const destination = getTile(movement.tileId);

        // Found the next Lotteri.
        if (destination.type === "lottery") {
          stepsToLottery = steps;
          break;
        }

        // No Lotteri remains before Mål.
        if (destination.type === "finish") {
          if (!effect.drawChanceIfNone) {
            // Preserve card 074's behavior.
            stepsToLottery = steps;
          }

          break;
        }
      }

      // NEW: Card 183's fallback.
      if (stepsToLottery === null) {
        if (effect.drawChanceIfNone) {
          game.message =
            "Det finns inget lotteri framför " +
            player.name +
            ". Ta ett nytt frågekort!";

          prependTasks(game, {
            type: "drawChance",
            playerId: player.id,
            remaining: 1,
            total: 1,
          });
        }

        break;
      }

      // Hospitalized players cannot move.
      if (player.hospitalStay) {
        game.message = player.name + " måste stanna på Sjukhuset.";

        break;
      }

      // Animate movement to the destination.
      startGroupMovement(
        game,
        player.id,
        stepsToLottery,
        "forward",
        false,
        player.id,
      );

      break;
    }

    case "ifOwnsProperty": {
      // Check whether the drawing player
      // owns the specified company.
      const ownsProperty = game.ownership[effect.propertyId] === player.id;

      // Select the correct effect.
      const selectedEffect = ownsProperty ? effect.ifOwned : effect.otherwise;

      // Execute the selected effect.
      prependTasks(game, {
        type: "effect",
        playerId: player.id,
        effect: selectedEffect,
      });

      break;
    }

    case "gainMoneyIfOwnsEnoughProperties": {
      // Count the drawing player's Aktiebrev.
      const propertyCount = Object.values(game.ownership).filter(
        (ownerId) => ownerId === player.id,
      ).length;

      // Check whether the player qualifies.
      if (propertyCount >= effect.minimum) {
        prependTasks(game, {
          type: "effect",
          playerId: player.id,
          effect: {
            type: "gainMoney",
            amount: effect.amount,
          },
        });
      } else {
        game.message =
          player.name +
          " äger inte tillräckligt många aktiebrev för att få pengarna.";
      }

      break;
    }

    case "moveLeftPlayerBackward": {
      const players = playersInOrder(game, player.id);

      // The next active player in turn order
      // is the player to the left.
      const leftPlayer = players[1];

      if (!leftPlayer) {
        break;
      }

      // Hospitalized players cannot move.
      if (leftPlayer.hospitalStay) {
        game.message = leftPlayer.name + " måste stanna på Sjukhuset.";

        break;
      }

      // Move only the player to the left.
      startGroupMovement(
        game,
        player.id,
        effect.amount,
        "backward",
        false,
        leftPlayer.id,
      );

      break;
    }

    case "resetPropertyOwnerWithMultiplier": {
      const ownerId = game.ownership[effect.propertyId];

      const property = game.properties[effect.propertyId];

      // Banken owns the company.
      if (!ownerId) {
        game.message =
          "Banken äger " + property.name + ", så ingen spelare flyttas.";

        break;
      }

      const owner = getActivePlayer(game, ownerId);

      if (!owner) {
        break;
      }

      // Hospitalized players cannot leave Sjukhuset.
      if (owner.hospitalStay) {
        game.message = owner.name + " måste stanna på Sjukhuset.";

        break;
      }

      // Return the company's owner to Start.
      owner.tileId = START_TILE_ID;

      // Save the reward until their next movement roll.
      owner.nextRollMultiplier = effect.multiplier;

      game.message =
        owner.name +
        " flyttades till Start och får gå " +
        effect.multiplier +
        " gånger så långt vid sitt nästa tärningsslag!";

      break;
    }

    case "startRockPaperScissors": {
      startRockPaperScissorsMatch(
        game,
        player,
        effect.targetPlayerId,
        effect.reward,
        2,
        effect.propertyPrize ? "chance-177" : "chance-066",
      );

      break;
    }

    case "chooseRockPaperScissorsOpponent": {
      throw new Error(
        "Rock paper scissors choices must be prepared before entering the effect queue.",
      );
    }

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
      if (blockClosedFacility(game, player, HOSPITAL_TILE_ID)) {
        break;
      }

      // Send the player directly to Sjukhuset.
      player.tileId = HOSPITAL_TILE_ID;

      // Remember that the player has visited.
      recordHospitalVisit(game, player.id);

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
        if (blockClosedFacility(game, target, destination.id)) {
          continue;
        }

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

      const amount = effect.amount * getChanceMoneyMultiplier(game);

      for (const target of players) {
        if (amount >= 0) {
          target.money += amount;
        } else {
          const payment = Math.min(Math.max(0, target.money), -amount);

          target.money -= payment;

          if (target.money <= 0) {
            eliminatePlayer(game, target);
          }
        }
      }

      game.message =
        amount >= 0
          ? "Alla spelare inkasserade " +
            amount.toLocaleString("sv-SE") +
            " kr var."
          : "Alla spelare betalade upp till " +
            (-amount).toLocaleString("sv-SE") +
            " kr var.";

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

      if (blockClosedFacility(game, player, destination.id)) {
        break;
      }

      player.tileId = destination.id;

      // Remember hospital visits privately.
      if (destination.id === HOSPITAL_TILE_ID) {
        recordHospitalVisit(game, player.id);
      }

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
      changeChanceBankMoney(game, player, -effect.amount);
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
      changeChanceBankMoney(game, player, effect.amount);
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
  secondDice?: number,
): boolean {
  const effect = draw.card.effect;

  if (effect.type !== "rollForEffect") {
    return false;
  }

  // Validate the first die.
  if (!Number.isInteger(dice) || dice < 1 || dice > 6) {
    return false;
  }

  const diceCount = effect.diceCount ?? 1;

  const values: number[] = [dice];

  // Roll a second die when required.
  if (diceCount === 2) {
    const second = secondDice ?? randomInt(1, 7);

    if (!Number.isInteger(second) || second < 1 || second > 6) {
      return false;
    }

    values.push(second);
  }

  // ------------------------------------
  // CALCULATE THE DICE RESULT
  // ------------------------------------

  const calculation = effect.calculation ?? "sum";

  const total =
    calculation === "product"
      ? values.reduce((product, value) => product * value, 1)
      : values.reduce((sum, value) => sum + value, 0);

  // Find the matching outcome.
  const outcome = effect.outcomes.find((option) =>
    option.rolls.includes(total),
  );

  if (!outcome) {
    return false;
  }

  const player = getActivePlayer(game, draw.playerId);

  if (!player) {
    return false;
  }

  // Prepare the selected outcome.
  // This also prepares player choices.
  const preparedCard = prepareChanceCard(game, player, {
    ...draw.card,
    effect: outcome.effect,
  });

  game.chanceDraw = {
    ...draw,
    token: randomUUID(),
    card: preparedCard,

    diceResult: {
      value: total,
      values,
      calculation,
      label: outcome.label,
    },
  };

  // Display the correct calculation.
  if (diceCount === 2) {
    const operator = calculation === "product" ? " × " : " + ";

    game.message =
      player.name +
      " slog " +
      values.join(operator) +
      " = " +
      total +
      " på frågekortet.";
  } else {
    game.message = player.name + " slog " + dice + " på frågekortet.";
  }

  queueLotteryPropertyLoss(game, player.id, values);

  // Preserve Pengaträd rewards.
  awardMoneyPerRoll(game);

  // Lotteri 007: an extra Frågekort after
  // rolling dice inside a Frågekort.
  const lotteryEffect = game.activeLotteryCard?.effect;

  if (lotteryEffect?.type === "drawChancePerRollIfOwnsProperties") {
    const ownedCount = (Object.keys(game.ownership) as PropertyId[]).filter(
      (propertyId) => game.ownership[propertyId] === player.id,
    ).length;

    if (ownedCount >= lotteryEffect.minimumProperties) {
      const count = lotteryEffect.amount;

      // Queue the bonus Frågekort.
      // The current Frågekort is resolved first.
      prependTasks(game, {
        type: "drawChance",
        playerId: player.id,
        remaining: count,
        total: count,
      });
    }
  }

  queueLotteryExtraRollOrSkip(game, player.id, values);

  // Lotteri 002 also applies to dice
  // rolled inside Frågekort.
  applyLotteryRuleOnDice(game, player.id, values);

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
  testSecondDice?: number,
): boolean {
  if (game.phase !== "chance" || game.winnerId) {
    return false;
  }

  const draw = game.chanceDraw;

  if (!draw || draw.token !== token) {
    return false;
  }

  // ---------------------------------
  // STEN-SAX-PÅSE
  // ---------------------------------

  if (draw.rockPaperScissors) {
    return respondToRockPaperScissors(game, playerId, token, choiceIndex);
  }

  // ---------------------------------
  // NORMAL CHANCE CARD VALIDATION
  // ---------------------------------

  if (draw.playerId !== playerId) {
    return false;
  }

  const player = getActivePlayer(game, playerId);

  if (!player) {
    return false;
  }

  const effect = draw.card.effect;

  // ---------------------------------
  // SPECIAL CHANCE DICE
  // ---------------------------------

  if (effect.type === "rollForEffect") {
    if (choiceIndex !== undefined) {
      return false;
    }

    return rollChanceDice(
      game,
      draw,
      testDice ?? randomInt(1, 7),
      testSecondDice,
    );
  }

  // ---------------------------------
  // SELECT THE CARD EFFECT
  // ---------------------------------

  let selectedEffect: ChanceEffect;

  if (effect.type === "choose") {
    if (
      choiceIndex === undefined ||
      !Number.isInteger(choiceIndex) ||
      choiceIndex < 0 ||
      choiceIndex >= effect.options.length
    ) {
      return false;
    }

    selectedEffect = effect.options[choiceIndex].effect;
  } else {
    if (choiceIndex !== undefined) {
      return false;
    }

    selectedEffect = effect;
  }

  // ---------------------------------
  // NEW: CHOOSE A PLAYER TO TAKE MONEY
  // ---------------------------------

  if (selectedEffect.type === "choosePlayerToTakeMoney") {
    const preparedCard = prepareChanceCard(game, player, {
      ...draw.card,
      effect: selectedEffect,
    });

    game.chanceDraw = {
      ...draw,
      token: randomUUID(),
      card: preparedCard,
    };

    game.message = player.name + " väljer vem som ska betala.";

    return true;
  }

  // ---------------------------------
  // ROTTEN APPLE TRANSFER
  // ---------------------------------

  if (selectedEffect.type === "passChanceCard") {
    return transferChanceCard(game, draw, selectedEffect.targetPlayerId);
  }

  // ---------------------------------
  // CONTINUE THE ORIGINAL CARD DRAW
  // ---------------------------------

  const continuationPlayerId = draw.continuationPlayerId ?? draw.playerId;

  if (draw.remaining > 1) {
    prependTasks(game, {
      type: "drawChance",
      playerId: continuationPlayerId,
      remaining: draw.remaining - 1,
      total: draw.total,
    });
  }

  prependCardEffect(game, playerId, selectedEffect, draw.bankModifier);

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
  feeOverride?: number;

  // NEW: Special landing rules
  // from Frågekort 185.
  specialLanding?: boolean;
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
  feeOverride?: number,
) {
  const players = playersInOrder(game, firstPlayerId).filter(
    (player) =>
      !player.hospitalStay &&
      (!excludeDrawingPlayer || player.id !== firstPlayerId) &&
      (onlyPlayerId === undefined || player.id === onlyPlayerId),
  );

  const moves: GroupMove[] = players.map((player) => {
    const steps = customSteps
      ? customSteps(player)
      : direction === "backward"
        ? -amount
        : amount;

    const movement =
      steps < 0
        ? calculateBackwardMovement(player.tileId, Math.abs(steps))
        : calculateMovement(player.tileId, steps);

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

    // Save the special landing fee.
    feeOverride,
  });

  game.phase = "moving";

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

  // NEW: Card 185 uses special
  // destination-square rules.
  if (movement.specialLanding) {
    for (const move of movement.moves) {
      const player = getActivePlayer(game, move.playerId);

      if (!player) {
        continue;
      }

      // Mål was already handled
      // during the walking stage.
      if (getTile(move.finalTileId).type === "finish") {
        continue;
      }

      resolveSpecialBackwardLanding(game, player, move.finalTileId);
    }

    resumeResolution(game);

    // Continue animating if the
    // special landing started a
    // new forward movement.
    return hasGroupMovement(game) ? MOVE_DELAY : null;
  }

  // ------------------------------------
  // EXISTING NORMAL LANDING RULES
  // ------------------------------------

  const landingTasks: ResolutionTask[] = movement.moves
    .filter((move) => {
      const player = getActivePlayer(game, move.playerId);

      if (!player) {
        return false;
      }

      // Mål landings were already
      // handled during movement.
      return getTile(move.finalTileId).type !== "finish";
    })
    .map((move) => ({
      type: "landing",
      playerId: move.playerId,
      tileId: move.finalTileId,
      feeOverride: movement.feeOverride,
    }));

  prependTasks(game, ...landingTasks);

  resumeResolution(game);

  // If another movement was started,
  // keep animating.
  return hasGroupMovement(game) ? MOVE_DELAY : null;
}

// ------------------------------------
// LANDING RESOLUTION
// ------------------------------------

function resolveSpecialBackwardLanding(
  game: GameState,
  player: GamePlayer,
  tileId: string,
): void {
  if (player.eliminated || game.winnerId) {
    return;
  }

  const destination = getTile(tileId);

  // ---------------------------------
  // FRÅGEKORT: DRAW EXACTLY TWO
  // ---------------------------------

  if (destination.type === "chance") {
    game.message = player.name + " hamnade på Frågekort och får dra två kort!";

    prependTasks(game, {
      type: "drawChance",
      playerId: player.id,
      remaining: 2,
      total: 2,
    });

    return;
  }

  // ---------------------------------
  // AKTIEBREV: TAKE IT FOR FREE
  // ---------------------------------

  if (destination.type === "property" && destination.propertyId) {
    const propertyId = destination.propertyId;

    const property = game.properties[propertyId];

    const previousOwnerId = game.ownership[propertyId];

    // The player already owns it.
    if (previousOwnerId === player.id) {
      game.message = player.name + " äger redan " + property.name + ".";

      return;
    }

    // Find the previous owner for
    // the game message.
    const previousOwner = previousOwnerId
      ? getActivePlayer(game, previousOwnerId)
      : undefined;

    // Transfer ownership directly.
    // No purchase price or rent.
    game.ownership[propertyId] = player.id;

    game.message =
      player.name +
      " fick aktiebrevet för " +
      property.name +
      " gratis från " +
      (previousOwner?.name ?? "Banken") +
      "!";

    return;
  }

  // ---------------------------------
  // LOTTERI: MOVE 15 STEPS FORWARD
  // ---------------------------------

  if (destination.type === "lottery") {
    game.message =
      player.name +
      " hamnade på Lotteri och går " +
      "15 steg framåt utan att dra ett lotteri!";

    // Queue a NORMAL forward move.
    // The special rules do not repeat.
    prependTasks(game, {
      type: "effect",
      playerId: player.id,
      effect: {
        type: "moveForward",
        amount: 15,
      },
    });

    return;
  }

  // ---------------------------------
  // ALL OTHER SQUARES: NORMAL RULES
  // ---------------------------------

  resolveLanding(game, player, tileId);
}

function resolveLanding(
  game: GameState,
  player: GamePlayer,
  tileId: string,
  feeOverride?: number,
) {
  if (player.eliminated || game.winnerId) {
    return;
  }

  const destination = getTile(tileId);

  // Remember hospital landings.
  if (destination.id === HOSPITAL_TILE_ID) {
    recordHospitalVisit(game, player.id);
  }

  if (destination.type === "finish") {
    if (player.tileId === destination.id) {
      tryFinishPlayer(game, player);
    }

    return;
  }

  if (destination.type === "property" && destination.propertyId) {
    resolveProperty(game, player, destination.propertyId, feeOverride);

    return;
  }

  if (destination.type === "chance") {
    // Lotteri 020: evil Frågekort squares.
    const evilEffect = game.activeLotteryCard?.effect;

    if (evilEffect?.type === "evilChanceSquares") {
      const questionMarks = Math.min(
        3,
        Math.max(1, destination.cardCount ?? 1),
      );

      const steps = questionMarks * evilEffect.stepsPerQuestionMark;

      // Use the existing backward movement logic.
      const movement = calculateBackwardMovement(player.tileId, steps);

      // Move directly without resolving another landing.
      player.tileId = movement.tileId;

      // Only ??? awards 1,000 kr.
      const reward = questionMarks === 3 ? evilEffect.tripleReward : 0;

      if (reward > 0) {
        player.money += reward;
      }

      game.message =
        player.name +
        " hamnade på " +
        "?".repeat(questionMarks) +
        " och gick " +
        steps +
        " steg bakåt utan att dra frågekort." +
        (reward > 0
          ? " Inkasserade " +
            reward.toLocaleString("sv-SE") +
            " kr från Banken."
          : "");

      // Lotteri 020:
      // Resolve EVERY destination after moving backward,
      // not just another Frågekort square.
      if (movement.path.length > 0) {
        // Preserve existing rewards that expire
        // when a player reaches a particular square.
        expireMoneyPerRollRewards(game, player.tileId);

        prependTasks(game, {
          type: "landing",
          playerId: player.id,
          tileId: player.tileId,
        });
      }

      // Do not draw a card for the original
      // Frågekort square.
      // The destination is handled by the queue.
      return;
    }

    const lotteryEffect = game.activeLotteryCard?.effect;

    // Lotteri 016:
    // Everyone draws one Frågekort.
    // The player who landed here goes first,
    // followed by the players to the left.
    if (lotteryEffect?.type === "everyoneDrawsChanceOnLanding") {
      const players = playersInOrder(game, player.id);

      const tasks: ResolutionTask[] = players.map((targetPlayer) => ({
        type: "drawChance",
        playerId: targetPlayer.id,
        remaining: lotteryEffect.amountPerPlayer,
        total: lotteryEffect.amountPerPlayer,
      }));

      prependTasks(game, ...tasks);

      game.message =
        player.name +
        " hamnade på Frågekort! " +
        "Alla spelare ska ta ett frågekort.";

      return;
    }

    // Normal Frågekort rules.
    let count = destination.cardCount ?? 1;

    // Lotteri 004: draw twice as many
    // cards when landing on a Frågekort.
    if (lotteryEffect?.type === "multiplyChanceCardsOnLanding") {
      count *= lotteryEffect.multiplier;
    }

    showChanceCard(game, player, count, count);

    return;
  }

  if (destination.type === "lottery") {
    drawLotteryCard(game, player.id);
    return;
  }

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

  // An even odd-only roll must not
  // trigger the current square again.
  skipLanding?: boolean;

  coldFallback?: boolean;

  badLotteryDestination?: "start" | "repairShop" | "backwardLottery";
}

function queueLotteryPropertyLoss(
  game: GameState,
  playerId: string,
  diceValues: number[],
): void {
  const effect = game.activeLotteryCard?.effect;

  if (effect?.type !== "losePropertyOnRoll") {
    return;
  }

  // One penalty per roll, even if two dice
  // both show 1.
  const rolls = effect.rolls;

  const rolledOne = diceValues.some((dice) => rolls.includes(dice));

  if (!rolledOne) {
    return;
  }

  prependTasks(game, {
    type: "lotteryPropertyLoss",
    playerId,
    fallbackAmount: effect.fallbackAmount,
  });
}

function queueLotteryExtraRollOrSkip(
  game: GameState,
  playerId: string,
  diceValues: number[],
): void {
  const effect = game.activeLotteryCard?.effect;

  if (effect?.type !== "extraRollOrSkipTurn") {
    return;
  }

  // One bonus or penalty per rolling action.
  const rolledSix = diceValues.some((dice) =>
    effect.extraRollOn.includes(dice),
  );

  const rolledOne = diceValues.some((dice) => effect.skipTurnOn.includes(dice));

  const tasks: ResolutionTask[] = [];

  if (rolledOne) {
    tasks.push({
      type: "effect",
      playerId,
      effect: {
        type: "skipTurns",
        amount: effect.skipTurns,
      },
    });
  }

  if (rolledSix) {
    tasks.push({
      type: "bonusRoll",
      playerId,
    });
  }

  if (tasks.length > 0) {
    prependTasks(game, ...tasks);
  }
}

function getLastPlayerId(game: GameState): string | null {
  const activePlayers = game.players.filter((player) => !player.eliminated);

  if (activePlayers.length === 0) {
    return null;
  }

  const getPosition = (tileId: string) =>
    game.board.findIndex((tile) => tile.id === tileId);

  // Use turn order to break ties.
  const lastPlayer = activePlayers.reduce((last, current) =>
    getPosition(current.tileId) < getPosition(last.tileId) ? current : last,
  );

  return lastPlayer.id;
}

function findBackwardPathToProperty(
  game: GameState,
  fromTileId: string,
  propertyId: PropertyId,
): string[] | null {
  let currentTileId = fromTileId;
  const path: string[] = [];
  const visited = new Set<string>([fromTileId]);

  while (currentTileId !== START_TILE_ID) {
    // Follow the ordinary board route backward.
    const previousTile = game.board.find(
      (tile) => tile.nextTileId === currentTileId,
    );

    if (!previousTile || visited.has(previousTile.id)) {
      break;
    }

    path.push(previousTile.id);
    visited.add(previousTile.id);
    currentTileId = previousTile.id;

    if (
      previousTile.type === "property" &&
      previousTile.propertyId === propertyId
    ) {
      return path;
    }
  }

  // No matching property was found behind.
  return null;
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

  if (isFrozenByLottery022(game, player.id)) {
    return null;
  }

  if (player.id !== playerId || player.eliminated) {
    return null;
  }

  if (player.hospitalStay) {
    return null;
  }

  if (!Number.isInteger(dice) || dice < 1 || dice > 6) {
    return null;
  }

  // Lotteri 015: swap positions instead of moving.
  const teleportEffect = game.activeLotteryCard?.effect;

  if (
    teleportEffect?.type === "swapPlayersOnRoll" &&
    teleportEffect.rolls.includes(dice)
  ) {
    // Wait until the current roll is completed,
    // then ask which player to swap with.
    prependTasks(game, {
      type: "teleportSwapChoice",
      playerId: player.id,
    });

    game.lastRoll = dice;
    game.phase = "moving";

    game.message =
      player.name + " slog en 6a och aktiverade teleporteringsmaskinen!";

    // This was still a real dice roll.
    awardMoneyPerRoll(game);

    // No movement and no landing effects.
    return {
      playerId,
      dice,
      path: [],
      tileId: player.tileId,
      busFrom: null,
      skipLanding: true,
    };
  }

  // Lotteri 014: the last player uses three dice.
  const lotteryEffect = game.activeLotteryCard?.effect;

  const diceCount =
    lotteryEffect?.type === "lastPlayerRollsMultipleDice" &&
    getLastPlayerId(game) === player.id
      ? lotteryEffect.diceCount
      : 1;

  const diceValues = [dice];

  for (let i = 1; i < diceCount; i++) {
    diceValues.push(randomInt(1, 7));
  }

  const diceTotal = diceValues.reduce((sum, value) => sum + value, 0);

  queueLotteryExtraRollOrSkip(game, player.id, diceValues);

  queueLotteryPropertyLoss(game, player.id, diceValues);

  applyLotteryRuleOnDice(game, player.id, diceValues);

  // ---------------------------------
  // NEW: ODD-ONLY BONUS ROLLS
  // ---------------------------------

  // Lotteri 021: rolls of 1 or 2 replace
  // normal movement with backward movement.
  const coldEffect = game.activeLotteryCard?.effect;

  if (coldEffect?.type === "backwardToPropertyOnRoll") {
    const destination = coldEffect.destinations.find(
      (item) => item.roll === dice,
    );

    if (destination) {
      const propertyPath = findBackwardPathToProperty(
        game,
        player.tileId,
        destination.propertyId,
      );

      // If the property isn't behind us,
      // follow the ordinary route back to Start.
      const fallback = propertyPath === null;

      const movement = fallback
        ? calculateBackwardMovement(player.tileId, game.board.length)
        : null;

      const path = propertyPath ?? movement!.path;
      const destinationTileId = path[path.length - 1] ?? player.tileId;

      game.lastRoll = dice;
      game.phase = "moving";

      game.message = fallback
        ? player.name + " slog " + dice + " och går tillbaka till Start!"
        : player.name +
          " slog " +
          dice +
          " och går bakåt till " +
          game.properties[destination.propertyId].name +
          "!";

      awardMoneyPerRoll(game);

      return {
        playerId,
        dice,
        path,
        tileId: destinationTileId,
        busFrom: null,
        coldFallback: fallback,
      };
    }
  }

  const oddOnly = oddOnlyBonusRolls.get(game) === player.id;

  // This restriction applies to
  // exactly one roll.
  oddOnlyBonusRolls.delete(game);

  if (oddOnly && dice % 2 === 0) {
    game.lastRoll = dice;
    game.phase = "moving";

    game.message =
      player.name + " slog " + dice + ". Jämnt resultat – spelaren står kvar!";

    // Pengaträdet still rewards
    // this dice roll.
    awardMoneyPerRoll(game);

    return {
      playerId,
      dice,
      path: [],
      tileId: player.tileId,
      busFrom: null,
      skipLanding: true,
    };
  }

  // Lotteri 023: special movement on 1, 2 or 6.
  const badLotteryEffect = game.activeLotteryCard?.effect;

  if (
    badLotteryEffect?.type === "badLotteryDiceMovement" &&
    (dice === badLotteryEffect.startRoll ||
      dice === badLotteryEffect.repairShopRoll ||
      dice === badLotteryEffect.backwardLotteryRoll)
  ) {
    let destinationTileId = player.tileId;
    let path: string[] = [];

    let outcome: NonNullable<MovementPlan["badLotteryDestination"]>;

    if (dice === badLotteryEffect.startRoll) {
      // Roll 1: go directly to Start.
      destinationTileId = START_TILE_ID;
      outcome = "start";
    } else if (dice === badLotteryEffect.repairShopRoll) {
      // Roll 2: go directly to Bilverkstan.
      const repairShop = game.board.find((tile) => tile.type === "repairShop");

      if (!repairShop) {
        return null;
      }

      destinationTileId = repairShop.id;
      outcome = "repairShop";
    } else {
      // Roll 6: move six steps backward.
      const movement = calculateBackwardMovement(
        player.tileId,
        badLotteryEffect.backwardSteps,
      );

      // Don't activate a bus teleport.
      // This Lotteri only requires walking backward.
      destinationTileId = movement.busFrom ?? movement.tileId;

      path = movement.busFrom ? movement.path.slice(0, -1) : movement.path;

      outcome = "backwardLottery";
    }

    game.lastRoll = dice;
    game.phase = "moving";

    game.message =
      player.name + " slog " + dice + " och aktiverade Dåligt lotteri!";

    // This is still a normal dice roll.
    awardMoneyPerRoll(game);

    return {
      playerId,
      dice,
      path,
      tileId: destinationTileId,
      busFrom: null,
      badLotteryDestination: outcome,
    };
  }

  // ---------------------------------
  // EXISTING MOVEMENT BONUSES
  // ---------------------------------

  const multiplier = player.nextRollMultiplier;
  const bonus = player.nextRollBonus;

  // Lotteri 013: +3 movement steps,
  // except for owners of the listed properties.
  let lotteryBonus = 0;

  if (lotteryEffect?.type === "addMovementStepsOnRoll") {
    const isExempt = lotteryEffect.exemptPropertyIds.some(
      (propertyId) => game.ownership[propertyId] === player.id,
    );

    if (!isExempt) {
      lotteryBonus = lotteryEffect.extraSteps;
    }
  }

  const steps = diceTotal * multiplier + bonus + lotteryBonus;

  const disableAlternativeRoutes =
    game.activeLotteryCard?.effect.type === "disableAlternativeRoutes";

  const movement = calculateMovement(
    player.tileId,
    steps,
    disableAlternativeRoutes,
  );

  // Consume the saved bonuses.
  player.nextRollMultiplier = 1;
  player.nextRollBonus = 0;

  game.lastRoll = dice;

  // Lock the game during movement.
  game.phase = "moving";

  let calculation = diceValues.join(" + ");

  if (multiplier > 1) {
    calculation += " × " + multiplier;
  }

  if (bonus > 0) {
    calculation += " + " + bonus;
  }

  if (lotteryBonus > 0) {
    calculation += " + " + lotteryBonus;
  }

  if (diceCount > 1 || multiplier > 1 || bonus > 0 || lotteryBonus > 0) {
    game.message =
      player.name + " slog " + calculation + " = " + steps + " steg!";
  } else {
    game.message =
      player.name + " slog " + dice + " och flyttar sin spelpjäs...";
  }

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

  // Lotteri 023: finish special movement.
  if (movement.badLotteryDestination) {
    player.tileId = movement.tileId;

    const destination = getTile(player.tileId);

    // The card defines the entire landing effect.
    // Don't resolve the destination square.
    if (movement.badLotteryDestination === "backwardLottery") {
      // Roll 6: move backward and draw
      // a replacement Lotteri.
      drawLotteryCard(game, player.id);
    } else {
      game.message =
        player.name +
        " slog " +
        movement.dice +
        " och gick till " +
        destination.name +
        ".";
    }

    // IMPORTANT:
    // No resolveLanding() call.
    // No landing task is queued.
    resumeResolution(game);

    return true;
  }

  // Read the active Lotteri rule BEFORE
  // resolving the destination square.

  const lotteryChanceCount = getLotteryChanceDrawCount(
    game,
    movement.dice,
    player.id,
  );

  const lotteryChanceTask: ResolutionTask[] =
    lotteryChanceCount > 0
      ? [
          {
            type: "drawChance",
            playerId: player.id,
            remaining: lotteryChanceCount,
            total: lotteryChanceCount,
          },
        ]
      : [];

  // Card 211: resolve temporary bankruptcies
  // using the NEXT player's normal dice roll.
  const pending = getPendingBankruptcies(game);

  for (const playerId of pending) {
    const bankruptPlayer = game.players.find(
      (candidate) => candidate.id === playerId,
    );

    if (!bankruptPlayer) {
      continue;
    }

    if (movement.dice >= 2) {
      // The player returns!
      bankruptPlayer.money = 20_000;
      bankruptPlayer.tileId = START_TILE_ID;
      bankruptPlayer.eliminated = false;
    } else {
      // Rolled 1: permanently eliminated.
      eliminatePlayer(game, bankruptPlayer);
    }
  }

  // All pending bankruptcies are now resolved.
  pending.clear();

  // ---------------------------------
  // NEW: EVEN ODD-ONLY ROLL
  // ---------------------------------

  if (movement.skipLanding) {
    if (
      game.activeLotteryCard?.effect.type === "swapPlayersOnRoll" &&
      movement.dice === 6
    ) {
      game.message = player.name + " aktiverade teleporteringsmaskinen!";
    } else {
      game.message = player.name + " slog " + movement.dice + " och står kvar.";
    }

    prependTasks(game, ...lotteryChanceTask);

    // No movement, no landing effect,
    // no duplicate property fee or card.
    resumeResolution(game);

    return true;
  }

  // ---------------------------------
  // EXISTING LANDING LOGIC
  // ---------------------------------

  // Lotteri 022: do not enter a closed facility.
  if (blockClosedFacility(game, player, movement.tileId)) {
    // The player's original tileId is unchanged.
    // Continue the game's normal resolution queue.
    resumeResolution(game);
    return true;
  }

  player.tileId = movement.tileId;

  // Lotteri 021: penalty when no matching
  // property exists behind the player.
  if (movement.coldFallback) {
    const effect = game.activeLotteryCard?.effect;

    if (effect?.type === "backwardToPropertyOnRoll") {
      const ownerId = game.ownership[effect.fallbackPenaltyPropertyId];

      const owner = ownerId ? getActivePlayer(game, ownerId) : undefined;

      // Banken cannot pay a penalty to itself.
      if (owner) {
        const payment = Math.min(
          Math.max(0, owner.money),
          effect.fallbackPenalty,
        );

        owner.money -= payment;

        if (owner.money <= 0) {
          eliminatePlayer(game, owner);
        }
      }
    }
  }

  // Lotteri 021: if everyone is now at Start,
  // draw another Lotteri immediately.
  if (game.activeLotteryCard?.effect.type === "backwardToPropertyOnRoll") {
    const activePlayers = game.players.filter((p) => !p.eliminated);

    const everyoneAtStart =
      activePlayers.length > 0 &&
      activePlayers.every((p) => p.tileId === START_TILE_ID);

    if (everyoneAtStart) {
      drawLotteryCard(game, activePlayers[0].id);
    }
  }

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

  prependTasks(
    game,
    {
      type: "landing",
      playerId: player.id,
      tileId: player.tileId,
    },
    ...lotteryChanceTask,
  );

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
