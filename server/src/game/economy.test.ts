
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createGame,
  rollTurn,
  respondToPurchase,
} from "./engine";

import { PROPERTIES } from "./properties";

function setupGame() {
  return createGame([
    { id: "1", name: "Player 1" },
    { id: "2", name: "Player 2" },
    { id: "3", name: "Player 3" },
    { id: "4", name: "Player 4" },
  ]);
}

function landOnCarStore() {
  const game = setupGame();

  // Roll 5 from Start to Bilaffär.
  assert.equal(rollTurn(game, "1", 5), true);

  return game;
}

test("All ten Aktiebrev are defined", () => {
  assert.equal(Object.keys(PROPERTIES).length, 10);

  assert.equal(PROPERTIES.carStore.price, 10_000);
  assert.equal(PROPERTIES.carStore.fee, 3_000);

  assert.equal(
    PROPERTIES.searchEngine.price,
    200_000
  );

  assert.equal(
    PROPERTIES.searchEngine.fee,
    65_000
  );
});

test("Landing on an unowned Aktiebrev creates an offer", () => {
  const game = landOnCarStore();

  assert.equal(game.phase, "purchase");
  assert.equal(game.turnIndex, 0);

  assert.equal(
    game.purchaseOffer?.propertyId,
    "carStore"
  );

  assert.equal(
    game.purchaseOffer?.price,
    10_000
  );

  assert.equal(
    game.purchaseOffer?.playerId,
    "1"
  );
});

test("The landing player can buy at full price", () => {
  const game = landOnCarStore();

  assert.equal(
    respondToPurchase(game, "1", "buy"),
    true
  );

  assert.equal(game.players[0].money, 190_000);
  assert.equal(game.ownership.carStore, "1");

  assert.equal(game.purchaseOffer, null);
  assert.equal(game.phase, "rolling");
  assert.equal(game.turnIndex, 1);
});

test("Declining gives the next player a half-price offer", () => {
  const game = landOnCarStore();

  assert.equal(
    respondToPurchase(game, "1", "decline"),
    true
  );

  assert.equal(game.purchaseOffer?.playerId, "2");
  assert.equal(game.purchaseOffer?.price, 5_000);

  // It is still Player 1's original turn.
  assert.equal(game.turnIndex, 0);
});

test("Later offers stay at half the original price", () => {
  const game = landOnCarStore();

  respondToPurchase(game, "1", "decline");
  respondToPurchase(game, "2", "decline");

  assert.equal(game.purchaseOffer?.playerId, "3");
  assert.equal(game.purchaseOffer?.price, 5_000);

  respondToPurchase(game, "3", "decline");

  assert.equal(game.purchaseOffer?.playerId, "4");
  assert.equal(game.purchaseOffer?.price, 5_000);
});

test("A different player can buy at half price", () => {
  const game = landOnCarStore();

  respondToPurchase(game, "1", "decline");
  respondToPurchase(game, "2", "decline");

  assert.equal(
    respondToPurchase(game, "3", "buy"),
    true
  );

  assert.equal(game.players[2].money, 195_000);
  assert.equal(game.ownership.carStore, "3");

  // Player 2 is next, even though Player 3 bought it.
  assert.equal(game.turnIndex, 1);
});

test("If everyone declines the property stays unowned", () => {
  const game = landOnCarStore();

  for (const id of ["1", "2", "3", "4"]) {
    assert.equal(
      respondToPurchase(game, id, "decline"),
      true
    );
  }

  assert.equal(game.ownership.carStore, undefined);
  assert.equal(game.purchaseOffer, null);
  assert.equal(game.phase, "rolling");
  assert.equal(game.turnIndex, 1);
});

test("Only the offered player can respond", () => {
  const game = landOnCarStore();

  assert.equal(
    respondToPurchase(game, "2", "buy"),
    false
  );

  assert.equal(game.ownership.carStore, undefined);
  assert.equal(game.players[1].money, 200_000);
});

test("Nobody can roll while a purchase is pending", () => {
  const game = landOnCarStore();

  assert.equal(rollTurn(game, "1", 3), false);
  assert.equal(rollTurn(game, "2", 3), false);
});

test("Players cannot buy without enough money", () => {
  const game = landOnCarStore();

  game.players[0].money = 5_000;

  assert.equal(
    respondToPurchase(game, "1", "buy"),
    false
  );

  assert.equal(game.players[0].money, 5_000);
  assert.equal(game.ownership.carStore, undefined);
  assert.equal(game.phase, "purchase");
});

test("All squares of the same company share ownership", () => {
  const game = landOnCarStore();

  respondToPurchase(game, "1", "buy");

  const carTiles = game.board.filter(
    (tile) => tile.propertyId === "carStore"
  );

  assert.ok(carTiles.length > 1);

  for (const tile of carTiles) {
    assert.equal(
      game.ownership[tile.propertyId!],
      "1"
    );
  }
});

test("Landing on an owned Aktiebrev pays its fee", () => {
  const game = landOnCarStore();

  respondToPurchase(game, "1", "buy");

  // Player 2 lands on the second Bilaffär square.
  rollTurn(game, "2", 6);

  assert.equal(game.players[0].money, 193_000);
  assert.equal(game.players[1].money, 197_000);
  assert.equal(game.turnIndex, 2);
});

test("Landing on your own property costs nothing", () => {
  const game = setupGame();

  game.ownership.carStore = "1";

  rollTurn(game, "1", 5);

  assert.equal(game.players[0].money, 200_000);
  assert.equal(game.phase, "rolling");
  assert.equal(game.turnIndex, 1);
});

test("Buying for all your money eliminates you", () => {
  const game = landOnCarStore();

  game.players[0].money = 10_000;

  respondToPurchase(game, "1", "buy");

  assert.equal(game.players[0].money, 0);
  assert.equal(game.players[0].eliminated, true);
  assert.equal(game.ownership.carStore, undefined);
  assert.equal(game.turnIndex, 1);
});

test("A player who cannot afford a fee is eliminated", () => {
  const game = setupGame();

  game.ownership.carStore = "2";
  game.ownership.bank = "1";

  game.players[0].money = 1_000;

  rollTurn(game, "1", 5);

  assert.equal(game.players[0].money, 0);
  assert.equal(game.players[0].eliminated, true);

  // Owner receives the remaining 1000 kr.
  assert.equal(game.players[1].money, 201_000);

  // Eliminated player's property becomes unowned.
  assert.equal(game.ownership.bank, undefined);
});

test("Eliminated players are skipped during turns", () => {
  const game = setupGame();

  game.players[1].eliminated = true;
  game.players[1].money = 0;

  rollTurn(game, "1", 1);

  assert.equal(game.turnIndex, 2);
});

test("Eliminated players do not receive purchase offers", () => {
  const game = setupGame();

  game.players[1].eliminated = true;
  game.players[1].money = 0;

  rollTurn(game, "1", 5);

  respondToPurchase(game, "1", "decline");

  assert.equal(game.purchaseOffer?.playerId, "3");

  assert.deepEqual(
    game.purchaseOffer?.eligiblePlayerIds,
    ["1", "3", "4"]
  );
});

test("The last player with money wins", () => {
  const game = createGame([
    { id: "1", name: "Player 1" },
    { id: "2", name: "Player 2" },
  ]);

  game.ownership.carStore = "2";

  game.players[0].money = 3_000;

  rollTurn(game, "1", 5);

  assert.equal(game.players[0].eliminated, true);
  assert.equal(game.players[0].money, 0);
  assert.equal(game.players[1].money, 203_000);

  assert.equal(game.winnerId, "2");
  assert.equal(game.phase, "finished");
});
