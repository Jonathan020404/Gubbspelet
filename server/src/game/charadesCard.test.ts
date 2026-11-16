import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createGame,
  rollTurn,
  respondToChance,
  advanceGroupMovement,
  hasGroupMovement,
} from "./engine";

import { CHANCE_CARDS } from "./chanceCards";

const charadesCard = CHANCE_CARDS.find((card) => card.id === "chance-006")!;

function setupGame() {
  return createGame(
    [
      { id: "1", name: "Player 1" },
      { id: "2", name: "Player 2" },
    ],
    [charadesCard],
  );
}

function drawCard(game: ReturnType<typeof createGame>) {
  rollTurn(game, "1", 2);

  const draw = game.chanceDraw;

  assert.ok(draw);

  assert.equal(respondToChance(game, "1", draw.token), true);
}

function finishMovement(game: ReturnType<typeof createGame>) {
  for (let i = 0; i < 20 && hasGroupMovement(game); i++) {
    advanceGroupMovement(game);
  }

  assert.equal(hasGroupMovement(game), false);
}

test("Charades moves Bilaffar's owner backwards", () => {
  const game = setupGame();

  game.ownership.carStore = "2";

  // Player 2 starts on Genväg.
  game.players[1].tileId = "r1-4";

  drawCard(game);

  assert.equal(game.players[0].skipTurnsRemaining, 1);

  assert.equal(game.phase, "moving");

  finishMovement(game);

  // Player 1 stays on the question square.
  assert.equal(game.players[0].tileId, "r1-2");

  // Player 2 moves 3 steps to Lotteri.
  assert.equal(game.players[1].tileId, "r1-1");

  assert.equal(game.phase, "rolling");
  assert.equal(game.turnIndex, 1);
});

test("The drawing player moves if they own Bilaffar", () => {
  const game = setupGame();

  game.ownership.carStore = "1";

  drawCard(game);

  finishMovement(game);

  // Player 1 stops at Start.
  assert.equal(game.players[0].tileId, "r1-0");

  assert.equal(game.players[0].skipTurnsRemaining, 1);

  assert.equal(game.turnIndex, 1);
});

test("Nobody moves if Banken owns Bilaffar", () => {
  const game = setupGame();

  drawCard(game);

  assert.equal(hasGroupMovement(game), false);

  assert.equal(game.players[0].skipTurnsRemaining, 1);

  assert.equal(game.players[0].tileId, "r1-2");

  assert.equal(game.players[1].tileId, "r1-0");

  assert.equal(game.phase, "rolling");
  assert.equal(game.turnIndex, 1);
});
