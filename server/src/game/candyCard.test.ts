import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createGame,
  rollTurn,
  respondToChance,
  respondToPurchase,
  isSaturday,
} from "./engine";

import { CHANCE_CARDS } from "./chanceCards";

import { FIRST_GROCERY_TILE_ID } from "./board";

const candyCard = CHANCE_CARDS.find((card) => card.id === "chance-003")!;

const FRIDAY = "2026-11-13T12:00:00+01:00";
const SATURDAY = "2026-11-14T12:00:00+01:00";

function setupGame(date = FRIDAY) {
  return createGame(
    [
      { id: "1", name: "Player 1" },
      { id: "2", name: "Player 2" },
    ],
    [candyCard],
    () => new Date(date),
  );
}

function drawCandyCard(game: ReturnType<typeof createGame>) {
  // Land on the first yellow square.
  assert.equal(rollTurn(game, "1", 2), true);

  const draw = game.chanceDraw;

  assert.ok(draw);

  assert.equal(draw.card.id, "chance-003");

  assert.equal(respondToChance(game, "1", draw.token), true);
}

test("Candy card moves the player to the first Mataffar", () => {
  const game = setupGame();

  // Player 1 already owns Mataffär.
  game.ownership.groceryStore = "1";

  drawCandyCard(game);

  assert.equal(game.players[0].tileId, FIRST_GROCERY_TILE_ID);

  assert.equal(game.players[0].money, 190_000);

  assert.equal(game.phase, "rolling");
  assert.equal(game.turnIndex, 1);
});

test("Candy card charges the normal property fee too", () => {
  const game = setupGame();

  game.ownership.groceryStore = "2";

  drawCandyCard(game);

  // 3000 fee + 10000 to Banken.
  assert.equal(game.players[0].money, 187_000);

  // The owner receives only the normal fee.
  assert.equal(game.players[1].money, 203_000);

  assert.equal(game.turnIndex, 1);
});

test("Unowned Mataffar triggers a purchase offer", () => {
  const game = setupGame();

  drawCandyCard(game);

  assert.equal(game.phase, "purchase");

  assert.equal(game.purchaseOffer?.propertyId, "groceryStore");

  assert.equal(game.purchaseOffer?.playerId, "1");

  // The card payment is still waiting.
  assert.equal(game.players[0].money, 200_000);

  // Buy Mataffär for 10000.
  assert.equal(respondToPurchase(game, "1", "buy"), true);

  // Purchase price + card payment.
  assert.equal(game.players[0].money, 180_000);

  assert.equal(game.ownership.groceryStore, "1");

  assert.equal(game.phase, "rolling");
  assert.equal(game.turnIndex, 1);
});

test("Declining still gives the next player half price", () => {
  const game = setupGame();

  drawCandyCard(game);

  respondToPurchase(game, "1", "decline");

  assert.equal(game.purchaseOffer?.playerId, "2");

  assert.equal(game.purchaseOffer?.price, 5_000);

  respondToPurchase(game, "2", "buy");

  assert.equal(game.players[0].money, 190_000);

  assert.equal(game.players[1].money, 195_000);

  assert.equal(game.ownership.groceryStore, "2");

  assert.equal(game.turnIndex, 1);
});

test("Candy card has no effect on Saturday", () => {
  const game = setupGame(SATURDAY);

  game.ownership.groceryStore = "2";

  drawCandyCard(game);

  // Player stays on the original ? square.
  assert.equal(game.players[0].tileId, "r1-2");

  assert.equal(game.players[0].money, 200_000);

  assert.equal(game.players[1].money, 200_000);

  assert.equal(game.purchaseOffer, null);
  assert.equal(game.phase, "rolling");
  assert.equal(game.turnIndex, 1);
});

test("Candy card payment can eliminate a player", () => {
  const game = setupGame();

  game.players[0].money = 10_000;
  game.ownership.groceryStore = "1";

  drawCandyCard(game);

  assert.equal(game.players[0].money, 0);

  assert.equal(game.players[0].eliminated, true);

  assert.equal(game.winnerId, "2");
  assert.equal(game.phase, "finished");
});

test("Saturday is determined by Swedish time", () => {
  // Friday in UTC, Saturday in Sweden.
  assert.equal(isSaturday(new Date("2026-11-13T23:30:00Z")), true);

  // Saturday in UTC, Sunday in Sweden.
  assert.equal(isSaturday(new Date("2026-11-14T23:30:00Z")), false);

  assert.equal(isSaturday(new Date(FRIDAY)), false);
});
