import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createGame,
  rollTurn,
  respondToChance,
  respondToPurchase,
  advanceGroupMovement,
  hasGroupMovement,
} from "./engine";

import type { GameState } from "./engine";
import { CHANCE_CARDS } from "./chanceCards";

const kittenCard = CHANCE_CARDS.find((card) => card.id === "chance-004")!;

const skipCard = CHANCE_CARDS.find((card) => card.id === "chance-001")!;

function setupKittenGame() {
  const game = createGame(
    [
      { id: "1", name: "Player 1" },
      { id: "2", name: "Player 2" },
      { id: "3", name: "Player 3" },
    ],
    [skipCard],
  );

  // Player 1 lands on the first ?.
  assert.equal(rollTurn(game, "1", 2), true);

  const draw = game.chanceDraw;

  assert.ok(draw);

  // Test the real kitten card first.
  // Subsequent draws use the skip card.
  draw.card = kittenCard;

  return game;
}

function chooseOption(game: GameState, choiceIndex: number) {
  const draw = game.chanceDraw;

  assert.ok(draw);

  return respondToChance(game, draw.playerId, draw.token, choiceIndex);
}

function finishGroupMovement(game: GameState) {
  for (let i = 0; i < 40 && hasGroupMovement(game); i++) {
    advanceGroupMovement(game);
  }

  assert.equal(hasGroupMovement(game), false);
}

test("Choosing money gives the player 25000 kr", () => {
  const game = setupKittenGame();

  assert.equal(chooseOption(game, 0), true);

  assert.equal(game.players[0].money, 225_000);

  assert.equal(game.players[1].money, 200_000);

  assert.equal(game.players[2].money, 200_000);

  assert.equal(hasGroupMovement(game), false);

  assert.equal(game.phase, "rolling");
  assert.equal(game.turnIndex, 1);
});

test("A choice card requires a valid option", () => {
  const game = setupKittenGame();

  const draw = game.chanceDraw;

  assert.ok(draw);

  // No choice provided.
  assert.equal(respondToChance(game, "1", draw.token), false);

  // Invalid choices.
  for (const index of [-1, 2, 99, 0.5]) {
    assert.equal(respondToChance(game, "1", draw.token, index), false);
  }

  assert.equal(game.phase, "chance");
  assert.equal(game.players[0].money, 200_000);
});

test("Other players cannot choose the reward", () => {
  const game = setupKittenGame();

  const draw = game.chanceDraw;

  assert.ok(draw);

  assert.equal(respondToChance(game, "2", draw.token, 0), false);

  assert.equal(game.phase, "chance");
});

test("The same choice cannot be applied twice", () => {
  const game = setupKittenGame();

  const draw = game.chanceDraw;

  assert.ok(draw);

  assert.equal(respondToChance(game, "1", draw.token, 0), true);

  assert.equal(respondToChance(game, "1", draw.token, 0), false);

  assert.equal(game.players[0].money, 225_000);
});

test("Backward movement excludes the drawing player", () => {
  const game = setupKittenGame();

  game.players[1].tileId = "r2-5";
  game.players[2].tileId = "r2-6";

  // Avoid purchase offers in this test.
  game.ownership.carStore = "2";

  assert.equal(chooseOption(game, 1), true);

  assert.equal(game.phase, "moving");

  advanceGroupMovement(game);

  // Player 1 has not moved.
  assert.equal(game.players[0].tileId, "r1-2");

  // Row 2 normally goes right to left.
  // Backwards means moving right.
  assert.equal(game.players[1].tileId, "r2-6");

  assert.equal(game.players[2].tileId, "r2-7");

  finishGroupMovement(game);

  // 12 steps backwards.
  assert.equal(game.players[1].tileId, "r1-5");

  assert.equal(game.players[2].tileId, "r1-4");

  // Choosing movement gives no money.
  assert.equal(game.players[0].money, 200_000);

  assert.equal(game.phase, "rolling");
  assert.equal(game.turnIndex, 1);
});

test("Backward movement stops at Start", () => {
  const game = setupKittenGame();

  game.players[1].tileId = "r1-5";

  // Player 3 is already on Start.
  game.players[2].tileId = "r1-0";

  chooseOption(game, 1);

  finishGroupMovement(game);

  assert.equal(game.players[1].tileId, "r1-0");

  assert.equal(game.players[2].tileId, "r1-0");

  assert.equal(game.phase, "rolling");
});

test("Backward movement triggers a property purchase", () => {
  const game = setupKittenGame();

  game.players[1].tileId = "r2-5";

  chooseOption(game, 1);

  finishGroupMovement(game);

  assert.equal(game.phase, "purchase");

  // Player 2 lands on Bilaffär.
  assert.equal(game.purchaseOffer?.propertyId, "carStore");

  assert.equal(game.purchaseOffer?.playerId, "2");

  respondToPurchase(game, "2", "buy");

  assert.equal(game.players[1].money, 190_000);

  assert.equal(game.ownership.carStore, "2");

  assert.equal(game.phase, "rolling");
  assert.equal(game.turnIndex, 1);
});

test("Backward movement can trigger another player's chance card", () => {
  const game = setupKittenGame();

  // 12 steps backwards from here
  // lands on the first yellow square.
  game.players[1].tileId = "r2-8";

  chooseOption(game, 1);

  finishGroupMovement(game);

  assert.equal(game.players[1].tileId, "r1-2");

  assert.equal(game.phase, "chance");

  const draw = game.chanceDraw;

  assert.ok(draw);

  assert.equal(draw.playerId, "2");
  assert.equal(draw.card.id, "chance-001");

  // Player 2 resolves their own card.
  respondToChance(game, "2", draw.token);

  // Player 2 skips their upcoming turn.
  assert.equal(game.players[1].skipTurnsRemaining, 2);

  assert.equal(game.phase, "rolling");
  assert.equal(game.turnIndex, 2);
});

test("Nobody moves if all other players are on Start", () => {
  const game = setupKittenGame();

  chooseOption(game, 1);

  assert.equal(hasGroupMovement(game), false);

  assert.equal(game.phase, "rolling");
  assert.equal(game.turnIndex, 1);

  assert.equal(game.players[0].tileId, "r1-2");
});
