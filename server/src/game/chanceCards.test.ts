
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createGame,
  rollTurn,
  respondToChance,
} from "./engine";

import { START_TILE_ID } from "./board";
import { CHANCE_CARDS } from "./chanceCards";


function setupGame() {
  const firstCard = CHANCE_CARDS.find(
    (card) => card.id === "chance-001"
  );

  assert.ok(firstCard);

  return createGame(
    [
      { id: "1", name: "Player 1" },
      { id: "2", name: "Player 2" },
    ],
    [firstCard]
  );
}


test("Landing on a yellow square draws a card", () => {
  const game = setupGame();

  // Roll 2 from Start to the first ?.
  assert.equal(rollTurn(game, "1", 2), true);

  assert.equal(game.phase, "chance");
  assert.equal(game.turnIndex, 0);

  const draw = game.chanceDraw;

  assert.ok(draw);
  assert.equal(draw.card.id, "chance-001");
  assert.equal(draw.playerId, "1");
  assert.equal(draw.remaining, 1);

  // Effect is not applied until confirmed.
  assert.equal(
    game.players[0].skipTurnsRemaining,
    0
  );

  assert.equal(
    respondToChance(game, "1", draw.token),
    true
  );

  assert.equal(
    game.players[0].skipTurnsRemaining,
    3
  );

  assert.equal(game.chanceDraw, null);
  assert.equal(game.turnIndex, 1);
});

test("Only the correct player can resolve a card", () => {
  const game = setupGame();

  // Position before the ?? in row 3.
  game.players[0].tileId = "r3-6";

  rollTurn(game, "1", 1);

  const firstDraw = game.chanceDraw;

  assert.ok(firstDraw);
  assert.equal(firstDraw.remaining, 2);

  // Wrong player cannot dismiss the card.
  assert.equal(
    respondToChance(
      game,
      "2",
      firstDraw.token
    ),
    false
  );

  // Nobody can roll during a card.
  assert.equal(rollTurn(game, "1", 1), false);
  assert.equal(rollTurn(game, "2", 1), false);

  // Resolve the first card.
  assert.equal(
    respondToChance(
      game,
      "1",
      firstDraw.token
    ),
    true
  );

  const secondDraw = game.chanceDraw;

  assert.ok(secondDraw);
  assert.equal(secondDraw.remaining, 1);
  assert.notEqual(
    secondDraw.token,
    firstDraw.token
  );

  // Double-clicking the old card cannot
  // accidentally resolve the next one.
  assert.equal(
    respondToChance(
      game,
      "1",
      firstDraw.token
    ),
    false
  );

  assert.equal(
    game.players[0].skipTurnsRemaining,
    3
  );

  respondToChance(
    game,
    "1",
    secondDraw.token
  );

  assert.equal(
    game.players[0].skipTurnsRemaining,
    6
  );
});

test("Landing on triple question marks draws three cards", () => {
  const game = setupGame();

  // Position before the ??? in row 7.
  game.players[0].tileId = "r7-6";

  rollTurn(game, "1", 1);

  for (const remaining of [3, 2, 1]) {
    const draw = game.chanceDraw;

    assert.ok(draw);
    assert.equal(draw.remaining, remaining);
    assert.equal(draw.total, 3);

    assert.equal(
      respondToChance(
        game,
        "1",
        draw.token
      ),
      true
    );
  }

  // All three cards were the only
  // test card currently in our deck.
  assert.equal(
    game.players[0].skipTurnsRemaining,
    9
  );

  assert.equal(game.chanceDraw, null);
  assert.equal(game.turnIndex, 1);
});

test("A player skips their next three turns", () => {
  const game = setupGame();

  rollTurn(game, "1", 2);

  const draw = game.chanceDraw;

  assert.ok(draw);

  respondToChance(game, "1", draw.token);

  // Player 2 takes three turns.
  for (let i = 0; i < 3; i++) {
    assert.equal(game.turnIndex, 1);

    // Reset Player 2's position for the
    // test so their roll always lands on
    // Lotteri and triggers no other effects.
    game.players[1].tileId = START_TILE_ID;

    assert.equal(
      rollTurn(game, "2", 1),
      true
    );

    assert.equal(
      game.players[0].skipTurnsRemaining,
      2 - i
    );
  }

  // Player 1 has now missed three turns.
  // Player 2 still has this next turn.
  assert.equal(game.turnIndex, 1);

  game.players[1].tileId = START_TILE_ID;

  rollTurn(game, "2", 1);

  // Player 1 can finally roll again.
  assert.equal(game.turnIndex, 0);

  assert.equal(
    game.players[0].skipTurnsRemaining,
    0
  );
});

test("The game continues when both players must skip", () => {
  const game = setupGame();

  // Player 2 already has one missed turn.
  game.players[1].skipTurnsRemaining = 1;

  rollTurn(game, "1", 2);

  const draw = game.chanceDraw;

  assert.ok(draw);

  respondToChance(game, "1", draw.token);

  // Player 2 skips once.
  // Player 1 skips once.
  // Player 2 is then allowed to roll.
  assert.equal(game.turnIndex, 1);

  assert.equal(
    game.players[0].skipTurnsRemaining,
    2
  );

  assert.equal(
    game.players[1].skipTurnsRemaining,
    0
  );

  assert.equal(game.phase, "rolling");
});
