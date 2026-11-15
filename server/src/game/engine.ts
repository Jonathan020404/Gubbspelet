
import { randomInt } from "node:crypto";
import {
  board,
  getTile,
  STARTING_MONEY,
  START_TILE_ID,
} from "./board";
import type { Tile, PropertyId } from "./board";
import { PROPERTIES } from "./properties";
import type { Property } from "./properties";
import { randomUUID } from "node:crypto";
import { CHANCE_CARDS } from "./chanceCards";
import type { ChanceCard, ChanceEffect } from "./chanceCards";


export type GamePhase =
  | "rolling"
  | "moving"
  | "purchase"
  | "chance"
  | "finished";



export interface GamePlayer {
  id: string;
  name: string;
  money: number;
  tileId: string;
  color: string;
  eliminated: boolean;
  skipTurnsRemaining: number;
}


export interface ChanceDraw {
  token: string;
  playerId: string;
  card: ChanceCard;

  // How many cards still need to be resolved,
  // including the currently displayed card.
  remaining: number;

  // The original number of cards to draw.
  total: number;
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
}

const PLAYER_COLORS = [
  "#E74C3C",
  "#3498DB",
  "#F1C40F",
  "#2ECC71",
];


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
    };

const resolutionQueues = new WeakMap<
  GameState,
  ResolutionTask[]
>();

function getResolutionQueue(
  game: GameState
): ResolutionTask[] {
  let queue = resolutionQueues.get(game);

  if (!queue) {
    queue = [];
    resolutionQueues.set(game, queue);
  }

  return queue;
}

function prependTasks(
  game: GameState,
  ...tasks: ResolutionTask[]
) {
  getResolutionQueue(game).unshift(...tasks);
}

function getActivePlayer(
  game: GameState,
  playerId: string
): GamePlayer | undefined {
  return game.players.find(
    (player) =>
      player.id === playerId &&
      !player.eliminated
  );
}

// Get active players in turn order,
// starting with a particular player.
function playersInOrder(
  game: GameState,
  firstPlayerId: string
): GamePlayer[] {
  const startIndex = game.players.findIndex(
    (player) => player.id === firstPlayerId
  );

  if (startIndex === -1) return [];

  const result: GamePlayer[] = [];

  for (let offset = 0; offset < game.players.length; offset++) {
    const index =
      (startIndex + offset) % game.players.length;

    const player = game.players[index];

    if (!player.eliminated) {
      result.push(player);
    }
  }

  return result;
}


function resumeResolution(game: GameState) {
  if (game.winnerId) return;

  game.purchaseOffer = null;
  game.chanceDraw = null;

  // This is an internal state while we process
  // tasks. We broadcast only after processing.
  game.phase = "rolling";

  const queue = getResolutionQueue(game);

  while (queue.length > 0) {
    if (checkForWinner(game)) return;

    const task = queue.shift();

    if (!task) break;

    const player = getActivePlayer(
      game,
      task.playerId
    );

    if (!player) continue;

    switch (task.type) {
      case "landing": {
        resolveLanding(
          game,
          player,
          task.tileId
        );
        break;
      }

      case "effect": {
        applyChanceEffect(
          game,
          player,
          task.effect
        );
        break;
      }

      case "drawChance": {
        showChanceCard(
          game,
          player,
          task.remaining,
          task.total
        );
        break;
      }
    }

    if (game.winnerId || checkForWinner(game)) {
      return;
    }

    // A purchase, card or movement is waiting.
    // Stop processing until it is resolved.
    if (game.phase !== "rolling") {
      return;
    }
  }

  // There are no unfinished actions.
  endTurn(game);
}

export function createGame(
  players: { id: string; name: string }[],
  chanceCards: ChanceCard[] = CHANCE_CARDS,
  now: () => Date = () => new Date()
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
    })),

    properties: PROPERTIES,
    ownership: {},

    phase: "rolling",
    purchaseOffer: null,
    chanceDraw: null,

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

function calculateMovement(
  tileId: string,
  steps: number
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
    // starting a dice roll on Genväg or Senväg.
    if (
      step === 0 &&
      (current.type === "shortcut" ||
        current.type === "detour") &&
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

export function movePlayer(
  tileId: string,
  steps: number
): string {
  return calculateMovement(tileId, steps).tileId;
}

// ------------------------------------
// WINNING AND ELIMINATION
// ------------------------------------

function finishGame(
  game: GameState,
  winnerId: string
) {
  const winner = game.players.find(
    (player) => player.id === winnerId
  );

  game.winnerId = winnerId;
  game.phase = "finished";
  game.purchaseOffer = null;
  game.chanceDraw = null;
  resolutionQueues.delete(game);
  groupMovements.delete(game);

  game.message =
    (winner?.name ?? "En spelare") +
    " vann Gubbspelet!";
}

function eliminatePlayer(
  game: GameState,
  player: GamePlayer
) {
  if (player.eliminated) return;

  player.money = 0;
  player.eliminated = true;

  // Release all the eliminated player's Aktiebrev.
  for (const propertyId of Object.keys(
    game.ownership
  ) as PropertyId[]) {
    if (game.ownership[propertyId] === player.id) {
      delete game.ownership[propertyId];
    }
  }

  game.message +=
    " " + player.name + " är ute ur spelet!";
}

function checkForWinner(
  game: GameState
): boolean {
  const remaining = game.players.filter(
    (player) => !player.eliminated
  );

  if (remaining.length === 1) {
    finishGame(game, remaining[0].id);
    return true;
  }

  return false;
}

// ------------------------------------
// TURN MANAGEMENT
// ------------------------------------


function endTurn(game: GameState) {
  game.purchaseOffer = null;
  game.chanceDraw = null;

  if (checkForWinner(game)) {
    return;
  }

  game.phase = "rolling";

  let index = game.turnIndex;

  while (true) {
    // Move to the next player.
    index = (index + 1) % game.players.length;

    const player = game.players[index];

    // Eliminated players never take another turn.
    if (player.eliminated) {
      continue;
    }

    // Skip this player's turn if required.
    if (player.skipTurnsRemaining > 0) {
      player.skipTurnsRemaining--;

      game.message +=
        " " +
        player.name +
        " står över sitt kast (" +
        player.skipTurnsRemaining +
        " kvar).";

      continue;
    }

    // This player is allowed to roll.
    game.turnIndex = index;

    return;
  }
}


// ------------------------------------
// PURCHASE OFFERS
// ------------------------------------


function createPurchaseOffer(
  game: GameState,
  propertyId: PropertyId,
  landingPlayer: GamePlayer
) {
  const property = game.properties[propertyId];

  const eligiblePlayerIds = playersInOrder(
    game,
    landingPlayer.id
  ).map((player) => player.id);

  game.phase = "purchase";

  game.purchaseOffer = {
    propertyId,
    playerId: landingPlayer.id,
    price: property.price,
    eligiblePlayerIds,
    offerIndex: 0,
  };

  game.message =
    landingPlayer.name +
    " får köpa " +
    property.name +
    ".";
}


export function respondToPurchase(
  game: GameState,
  playerId: string,
  decision: "buy" | "decline"
): boolean {
  const offer = game.purchaseOffer;

  if (
    game.phase !== "purchase" ||
    !offer ||
    game.winnerId
  ) {
    return false;
  }

  // Only the player receiving the offer can respond.
  if (offer.playerId !== playerId) {
    return false;
  }

  const player = game.players.find(
    (p) => p.id === playerId
  );

  if (!player || player.eliminated) {
    return false;
  }

  const property =
    game.properties[offer.propertyId];

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
      (p) => p.id === offer.eligiblePlayerIds[nextIndex]
    );

    if (nextPlayer && !nextPlayer.eliminated) {
      break;
    }

    nextIndex++;
  }

  // Nobody wants to buy this Aktiebrev.
  if (nextIndex >= offer.eligiblePlayerIds.length) {
    game.message =
      "Ingen köpte " + property.name + ".";

    resumeResolution(game);
    return true;
  }

  // Give the next player the same half-price offer.
  // The price is NOT halved again.
  offer.offerIndex = nextIndex;
  offer.playerId =
    offer.eligiblePlayerIds[nextIndex];

  offer.price = property.price / 2;

  const nextPlayer = game.players.find(
    (p) => p.id === offer.playerId
  );

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
  propertyId: PropertyId
) {
  const property = game.properties[propertyId];

  const ownerId = game.ownership[propertyId];

  // Banken owns the property if it is unowned.
  if (!ownerId) {
    createPurchaseOffer(
      game,
      propertyId,
      player
    );

    return;
  }

  // You never pay yourself.
  if (ownerId === player.id) {
    game.message =
      player.name +
      " landade på sitt eget aktiebrev: " +
      property.name +
      ".";

    return;
  }

  const owner = getActivePlayer(
    game,
    ownerId
  );

  if (!owner) {
    delete game.ownership[propertyId];

    createPurchaseOffer(
      game,
      propertyId,
      player
    );

    return;
  }

  // Pay the owner.
  const amountPaid = Math.min(
    player.money,
    property.fee
  );

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
const chanceDecks = new WeakMap<
  GameState,
  ChanceCard[]
>();

const chanceDeckSources = new WeakMap<
  GameState,
  ChanceCard[]
>();


const gameClocks = new WeakMap<
  GameState,
  () => Date
>();



function shuffleChanceDeck(
  cards: ChanceCard[]
): ChanceCard[] {
  const deck = [...cards];

  for (let i = deck.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);

    [deck[i], deck[j]] = [
      deck[j],
      deck[i],
    ];
  }

  return deck;
}


function drawChanceCard(
  game: GameState
): ChanceCard {
  let deck = chanceDecks.get(game);

  // Create a new shuffled deck when the
  // game starts or the old deck runs out.
  if (!deck || deck.length === 0) {
    deck = shuffleChanceDeck(
      chanceDeckSources.get(game) ??
        CHANCE_CARDS
    );

    chanceDecks.set(game, deck);
  }

  const card = deck.pop();

  if (!card) {
    throw new Error("The chance deck is empty.");
  }

  return card;
}


function showChanceCard(
  game: GameState,
  player: GamePlayer,
  remaining: number,
  total: number
) {
  game.phase = "chance";

  game.chanceDraw = {
    token: randomUUID(),
    playerId: player.id,
    card: drawChanceCard(game),
    remaining,
    total,
  };

  game.message =
    player.name + " drog ett frågekort.";
}


export function isSaturday(
  date: Date = new Date()
): boolean {
  const weekday = new Intl.DateTimeFormat(
    "en-US",
    {
      weekday: "long",
      timeZone: "Europe/Stockholm",
    }
  ).format(date);

  return weekday === "Saturday";
}


// Apply an individual card effect.
function applyChanceEffect(
  game: GameState,
  player: GamePlayer,
  effect: ChanceEffect
) {
  switch (effect.type) {
    case "skipTurns": {
      player.skipTurnsRemaining += effect.amount;

      game.message =
        player.name +
        " måste stå över " +
        effect.amount +
        " kast.";

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
          })
        )
      );

      break;
    }

    case "moveAllForward": {
      startGroupMovement(
        game,
        player.id,
        effect.amount
      );

      break;
    }

    case "payPropertyOwner": {
      payPropertyOwnerFromCard(
        game,
        player,
        effect.propertyId,
        effect.amount
      );

      break;
    }

    case "moveTo": {
  const destination = getTile(effect.tileId);

  // Move directly to the destination.
  player.tileId = destination.id;

  game.message =
    player.name +
    " åkte till " +
    destination.name +
    ".";

  // Reaching Mål always ends the game.
  if (destination.type === "finish") {
    finishGame(game, player.id);
    break;
  }

  // Handle arrival at a bus stop.
  if (
    effect.resolveLanding &&
    destination.type === "bus" &&
    destination.targetTileId
  ) {
    player.tileId = destination.targetTileId;

    game.message =
      player.name +
      " åkte vidare till den andra busshållplatsen.";
  }

  // Resolve the destination's normal effect
  // before continuing with the next card effect.
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
  const amountPaid = Math.min(
    player.money,
    effect.amount
  );

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
  const today =
    gameClocks.get(game)?.() ?? new Date();

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
  }
}


function payPropertyOwnerFromCard(
  game: GameState,
  player: GamePlayer,
  propertyId: PropertyId,
  amount: number
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

  const owner = getActivePlayer(
    game,
    ownerId
  );

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

export function respondToChance(
  game: GameState,
  playerId: string,
  token: string
): boolean {
  const draw = game.chanceDraw;

  if (
    game.phase !== "chance" ||
    !draw ||
    game.winnerId
  ) {
    return false;
  }

  if (
    draw.playerId !== playerId ||
    draw.token !== token
  ) {
    return false;
  }

  const player = getActivePlayer(
    game,
    playerId
  );

  if (!player) {
    return false;
  }

  // If more cards are required, queue the
  // next draw AFTER the current card's effects.
  if (draw.remaining > 1) {
    prependTasks(game, {
      type: "drawChance",
      playerId,
      remaining: draw.remaining - 1,
      total: draw.total,
    });
  }

  // Put this card's effect first.
  prependTasks(game, {
    type: "effect",
    playerId,
    effect: draw.card.effect,
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

const groupMovements = new WeakMap<
  GameState,
  GroupMovement
>();

function startGroupMovement(
  game: GameState,
  firstPlayerId: string,
  amount: number
) {
  const players = playersInOrder(
    game,
    firstPlayerId
  );

  const moves: GroupMove[] = players.map(
    (player) => {
      const movement = calculateMovement(
        player.tileId,
        amount
      );

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
    }
  );

  groupMovements.set(game, {
    moves,
    step: 0,
    maxSteps: Math.max(
      0,
      ...moves.map(
        (move) => move.walkingPath.length
      )
    ),
    stage: "walking",
  });

  game.phase = "moving";

  game.message =
    "Alla spelare går " +
    amount +
    " steg framåt!";
}

export function hasGroupMovement(
  game: GameState
): boolean {
  return groupMovements.has(game);
}


export function advanceGroupMovement(
  game: GameState
): number | null {
  const movement = groupMovements.get(game);

  if (
    !movement ||
    game.phase !== "moving" ||
    game.winnerId
  ) {
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
      const player = getActivePlayer(
        game,
        move.playerId
      );

      if (!player) continue;

      const nextTileId =
        move.walkingPath[movement.step];

      if (!nextTileId) continue;

      player.tileId = nextTileId;

      if (getTile(nextTileId).type === "finish") {
        winners.push(player);
      }
    }

    movement.step++;

    // Mål wins immediately, even during a card.
    if (winners.length > 0) {
      groupMovements.delete(game);

      finishGame(game, winners[0].id);

      return null;
    }

    game.message =
      "Alla spelare går framåt... (" +
      movement.step +
      "/" +
      movement.maxSteps +
      ")";

    if (movement.step < movement.maxSteps) {
      return MOVE_DELAY;
    }

    // Check if anyone landed on a bus.
    const hasBus = movement.moves.some(
      (move) => move.busFrom !== null
    );

    if (hasBus) {
      movement.stage = "bus";

      game.message =
        "Spelare som landade på Buss åker vidare...";

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

      const player = getActivePlayer(
        game,
        move.playerId
      );

      if (!player) continue;

      player.tileId = move.finalTileId;
    }

    game.message =
      "Bussresorna är klara!";

    movement.stage = "landing";

    return LANDING_DELAY;
  }

  // ------------------------------------
  // RESOLVE ALL LANDINGS
  // ------------------------------------

  groupMovements.delete(game);

  // Everyone has finished moving.
  // Now resolve their destinations in order.
  const landingTasks: ResolutionTask[] =
    movement.moves.map((move) => ({
      type: "landing",
      playerId: move.playerId,
      tileId: move.finalTileId,
    }));

  prependTasks(game, ...landingTasks);

  resumeResolution(game);

  // If another group movement was started
  // by a queued effect, keep animating.
  return hasGroupMovement(game)
    ? MOVE_DELAY
    : null;
}


// ------------------------------------
// LANDING RESOLUTION
// ------------------------------------

function resolveLanding(
  game: GameState,
  player: GamePlayer,
  tileId: string
) {
  if (player.eliminated || game.winnerId) {
    return;
  }

  const destination = getTile(tileId);

  if (destination.type === "finish") {
    finishGame(game, player.id);
    return;
  }

  if (
    destination.type === "property" &&
    destination.propertyId
  ) {
    resolveProperty(
      game,
      player,
      destination.propertyId
    );

    return;
  }

  if (destination.type === "chance") {
    const count = destination.cardCount ?? 1;

    showChanceCard(
      game,
      player,
      count,
      count
    );

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
  dice: number = randomInt(1, 7)
): MovementPlan | null {
  if (
    game.phase !== "rolling" ||
    game.winnerId
  ) {
    return null;
  }

  const player = game.players[game.turnIndex];

  if (
    player.id !== playerId ||
    player.eliminated
  ) {
    return null;
  }

  if (
    !Number.isInteger(dice) ||
    dice < 1 ||
    dice > 6
  ) {
    return null;
  }

  const movement = calculateMovement(
    player.tileId,
    dice
  );

  game.lastRoll = dice;

  // Lock the game while the piece is moving.
  game.phase = "moving";

  game.message =
    player.name +
    " slog " +
    dice +
    " och flyttar sin spelpjäs...";

  return {
    playerId,
    dice,
    ...movement,
  };
}

// 2. Resolve the destination once movement is done.

export function completeRoll(
  game: GameState,
  movement: MovementPlan
): boolean {
  if (
    game.phase !== "moving" ||
    game.winnerId
  ) {
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
  dice: number = randomInt(1, 7)
): boolean {
  const movement = beginRoll(
    game,
    playerId,
    dice
  );

  if (!movement) {
    return false;
  }

  return completeRoll(game, movement);
}

