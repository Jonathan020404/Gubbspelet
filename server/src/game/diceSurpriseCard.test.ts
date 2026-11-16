import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createGame,
  rollTurn,
  respondToChance,
  advanceGroupMovement,
  hasGroupMovement,
} from "./engine";

import type { GameState } from "./engine";

import { CHANCE_CARDS } from "./chanceCards";
import { START_TILE_ID } from "./board";

const surpriseCard = CHANCE_CARDS.find((card) => card.id === "chance-023")!;

function setupGame() {
  const game = createGame(
    [
      { id: "1", name: "Player 1" },
      { id: "2", name: "Player 2" },
      { id: "3", name: "Player 3" },
    ],
    [surpriseCard],
  );

  // Player 1 lands on the first ?.
  assert.equal(rollTurn(game, "1", 2), true);

  return game;
}

function rollAndConfirm(game: GameState, dice: number) {
  const draw = game.chanceDraw;

  assert.ok(draw);

  // Roll the special card dice.
  assert.equal(
    respondToChance(game, draw.playerId, draw.token, undefined, dice),
    true,
  );

  const result = game.chanceDraw;

  assert.ok(result);
  assert.equal(result.diceResult?.value, dice);

  // Confirm the rolled result.
  assert.equal(respondToChance(game, result.playerId, result.token), true);
}

function finishMovement(game: GameState) {
  for (let i = 0; i < 40 && hasGroupMovement(game); i++) {
    advanceGroupMovement(game);
  }

  assert.equal(hasGroupMovement(game), false);
}

for (const dice of [1, 2]) {
  test(`Rolling ${dice} rewards the drawing player and the player to the left`, () => {
    const game = setupGame();

    rollAndConfirm(game, dice);

    assert.equal(game.players[0].money, 217_000);
    assert.equal(game.players[1].money, 208_000);
    assert.equal(game.players[2].money, 200_000);

    // Nobody moves.
    assert.equal(game.players[0].tileId, "r1-2");

    assert.equal(game.players[1].tileId, START_TILE_ID);

    assert.equal(game.phase, "rolling");
    assert.equal(game.turnIndex, 1);
  });
}

test("The left-player reward skips eliminated players", () => {
  const game = setupGame();

  game.players[1].eliminated = true;
  game.players[1].money = 0;

  rollAndConfirm(game, 1);

  assert.equal(game.players[0].money, 217_000);
  assert.equal(game.players[1].money, 0);
  assert.equal(game.players[2].money, 208_000);

  assert.equal(game.turnIndex, 2);
});

test("Rolling 3 gives everyone 23000 kr", () => {
  const game = setupGame();

  rollAndConfirm(game, 3);

  for (const player of game.players) {
    assert.equal(player.money, 223_000);
  }

  assert.equal(game.phase, "rolling");
  assert.equal(game.turnIndex, 1);
});

test("Rolling 4 moves everyone else backwards and rewards the drawing player", () => {
  const game = setupGame();

  game.players[1].tileId = "r1-5";
  game.players[2].tileId = "r1-6";

  rollAndConfirm(game, 4);

  assert.equal(game.phase, "moving");

  // The reward waits until movement
  // and landing effects finish.
  assert.equal(game.players[0].money, 200_000);

  finishMovement(game);

  // Drawing player stays on the ?.
  assert.equal(game.players[0].tileId, "r1-2");

  // Player 2 goes back five steps to Start.
  assert.equal(game.players[1].tileId, START_TILE_ID);

  // Player 3 goes back five steps to Lotteri.
  assert.equal(game.players[2].tileId, "r1-1");

  // Drawing player receives 30000.
  assert.equal(game.players[0].money, 230_000);

  assert.equal(game.players[1].money, 200_000);
  assert.equal(game.players[2].money, 200_000);

  assert.equal(game.phase, "rolling");
  assert.equal(game.turnIndex, 1);
});

test("Rolling 5 sends everyone to Start without resetting their game", () => {
  const game = setupGame();

  game.players[1].tileId = "r3-4";
  game.players[2].tileId = "r6-8";

  game.players[0].money = 350_000;
  game.players[1].money = 75_000;

  game.ownership.carStore = "1";
  game.ownership.groceryStore = "2";

  game.players[2].skipTurnsRemaining = 2;

  rollAndConfirm(game, 5);

  // Everyone returns directly to Start.
  for (const player of game.players) {
    assert.equal(player.tileId, START_TILE_ID);
  }

  // Money is unchanged.
  assert.equal(game.players[0].money, 350_000);
  assert.equal(game.players[1].money, 75_000);
  assert.equal(game.players[2].money, 200_000);

  // Ownership is unchanged.
  assert.equal(game.ownership.carStore, "1");
  assert.equal(game.ownership.groceryStore, "2");

  // Existing penalties remain.
  assert.equal(game.players[2].skipTurnsRemaining, 2);

  assert.equal(game.phase, "rolling");
  assert.equal(game.turnIndex, 1);
});

test("Rolling 6 rewards the drawing player and charges the others", () => {
  const game = setupGame();

  const positions = game.players.map((player) => player.tileId);

  rollAndConfirm(game, 6);

  assert.equal(game.players[0].money, 365_000);
  assert.equal(game.players[1].money, 180_000);
  assert.equal(game.players[2].money, 180_000);

  // Nobody moves.
  assert.deepEqual(
    game.players.map((player) => player.tileId),
    positions,
  );

  assert.equal(game.phase, "rolling");
  assert.equal(game.turnIndex, 1);
});

test("Rolling 6 can eliminate an opponent", () => {
  const game = setupGame();

  game.players[1].money = 15_000;
  game.ownership.carStore = "2";

  rollAndConfirm(game, 6);

  assert.equal(game.players[0].money, 365_000);

  assert.equal(game.players[1].money, 0);
  assert.equal(game.players[1].eliminated, true);

  assert.equal(game.players[2].money, 180_000);

  // Eliminated player's Aktiebrev
  // return to Banken.
  assert.equal(game.ownership.carStore, undefined);

  assert.equal(game.turnIndex, 2);
});

test("Rolling 6 can eliminate all opponents and win the game", () => {
  const game = setupGame();

  game.players[1].money = 10_000;
  game.players[2].money = 20_000;

  rollAndConfirm(game, 6);

  assert.equal(game.players[0].money, 365_000);

  assert.equal(game.players[1].money, 0);
  assert.equal(game.players[2].money, 0);

  assert.equal(game.players[1].eliminated, true);
  assert.equal(game.players[2].eliminated, true);

  assert.equal(game.winnerId, "1");
  assert.equal(game.phase, "finished");
});
