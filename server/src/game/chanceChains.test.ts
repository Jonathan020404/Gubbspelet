
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

import {
  CHANCE_CARDS,
} from "./chanceCards";

const skipCard = CHANCE_CARDS.find(
  (card) => card.id === "chance-001"
)!;

const beaverCard = CHANCE_CARDS.find(
  (card) => card.id === "chance-002"
)!;

// Create a deterministic game for testing.
//
// The first draw is replaced with the real
// beaver card. Any additional draws will
// use our skip-turn card.
function setupBeaverGame() {
  const game = createGame(
    [
      { id: "1", name: "Player 1" },
      { id: "2", name: "Player 2" },
    ],
    [skipCard]
  );

  // Player 1 lands on the first yellow square.
  assert.equal(
    rollTurn(game, "1", 2),
    true
  );

  const draw = game.chanceDraw;

  assert.ok(draw);

  draw.card = beaverCard;

  return game;
}

function confirmBeaver(game: GameState) {
  const draw = game.chanceDraw;

  assert.ok(draw);

  assert.equal(
    respondToChance(
      game,
      draw.playerId,
      draw.token
    ),
    true
  );
}

// Advance animations without waiting for
// real timers during automated tests.
function finishGroupMovement(
  game: GameState
) {
  for (
    let i = 0;
    i < 30 && hasGroupMovement(game);
    i++
  ) {
    advanceGroupMovement(game);
  }

  assert.equal(
    hasGroupMovement(game),
    false
  );
}

test("Beaver card starts group movement", () => {
  const game = setupBeaverGame();

  confirmBeaver(game);

  assert.equal(game.phase, "moving");
  assert.equal(hasGroupMovement(game), true);

  // Neither piece has moved yet.
  assert.equal(
    game.players[0].tileId,
    "r1-2"
  );

  assert.equal(
    game.players[1].tileId,
    "r1-0"
  );
});

test("All players move one step at a time", () => {
  const game = setupBeaverGame();

  confirmBeaver(game);

  advanceGroupMovement(game);

  assert.equal(
    game.players[0].tileId,
    "r1-3"
  );

  assert.equal(
    game.players[1].tileId,
    "r1-1"
  );

  advanceGroupMovement(game);

  assert.equal(
    game.players[0].tileId,
    "r1-4"
  );

  assert.equal(
    game.players[1].tileId,
    "r1-2"
  );

  // No additional dice rolls during movement.
  assert.equal(
    rollTurn(game, "1", 2),
    false
  );
});

test("Beaver payment goes to another owner", () => {
  const game = setupBeaverGame();

  game.ownership.electronicsStore = "2";
  game.ownership.carStore = "2";

  confirmBeaver(game);

  finishGroupMovement(game);

  // Player 1 lands on Elektronikbutik.
  assert.equal(
    game.players[0].tileId,
    "r1-7"
  );

  // Player 2 lands on Bilaffär.
  assert.equal(
    game.players[1].tileId,
    "r1-5"
  );

  // Player 1 pays the regular 7000 fee,
  // then the beaver card's 20000 payment.
  assert.equal(
    game.players[0].money,
    173_000
  );

  assert.equal(
    game.players[1].money,
    227_000
  );

  assert.equal(game.phase, "rolling");
  assert.equal(game.turnIndex, 1);
});

test("No payment if the drawing player owns Elektronikbutik", () => {
  const game = setupBeaverGame();

  game.ownership.electronicsStore = "1";
  game.ownership.carStore = "2";

  confirmBeaver(game);

  finishGroupMovement(game);

  assert.equal(
    game.players[0].money,
    200_000
  );

  assert.equal(
    game.players[1].money,
    200_000
  );
});

test("No beaver payment if Banken still owns Elektronikbutik", () => {
  const game = setupBeaverGame();

  game.ownership.carStore = "2";

  confirmBeaver(game);

  finishGroupMovement(game);

  // Player 1 landed on unowned
  // Elektronikbutik.
  assert.equal(
    game.purchaseOffer?.propertyId,
    "electronicsStore"
  );

  // Both players decline it.
  respondToPurchase(game, "1", "decline");
  respondToPurchase(game, "2", "decline");

  assert.equal(
    game.ownership.electronicsStore,
    undefined
  );

  assert.equal(
    game.players[0].money,
    200_000
  );

  assert.equal(
    game.players[1].money,
    200_000
  );

  assert.equal(game.phase, "rolling");
  assert.equal(game.turnIndex, 1);
});

test("Another player's landing creates their own purchase offer", () => {
  const game = setupBeaverGame();

  game.ownership.electronicsStore = "1";

  // Player 2 will land on unowned Bilaffär.
  confirmBeaver(game);

  finishGroupMovement(game);

  assert.equal(game.phase, "purchase");
  assert.equal(game.turnIndex, 0);

  assert.equal(
    game.purchaseOffer?.playerId,
    "2"
  );

  assert.equal(
    game.purchaseOffer?.price,
    10_000
  );

  respondToPurchase(game, "2", "decline");

  assert.equal(
    game.purchaseOffer?.playerId,
    "1"
  );

  assert.equal(
    game.purchaseOffer?.price,
    5_000
  );

  respondToPurchase(game, "1", "buy");

  assert.equal(
    game.ownership.carStore,
    "1"
  );

  assert.equal(game.turnIndex, 1);
});

test("Another player can draw and resolve their own cards", () => {
  const game = setupBeaverGame();

  game.ownership.electronicsStore = "1";

  // Player 2 moves five steps from r3-2
  // and lands on ?? at r3-7.
  game.players[1].tileId = "r3-2";

  confirmBeaver(game);

  finishGroupMovement(game);

  assert.equal(game.phase, "chance");

  const firstDraw = game.chanceDraw;

  assert.ok(firstDraw);

  assert.equal(firstDraw.playerId, "2");
  assert.equal(firstDraw.remaining, 2);

  // Player 1 cannot dismiss Player 2's card.
  assert.equal(
    respondToChance(
      game,
      "1",
      firstDraw.token
    ),
    false
  );

  // Player 2 resolves their first card.
  respondToChance(
    game,
    "2",
    firstDraw.token
  );

  const secondDraw = game.chanceDraw;

  assert.ok(secondDraw);
  assert.equal(secondDraw.remaining, 1);

  respondToChance(
    game,
    "2",
    secondDraw.token
  );

  // Both cards gave three skipped turns.
  // One is consumed as Player 2's next
  // normal turn is skipped.
  assert.equal(
    game.players[1].skipTurnsRemaining,
    5
  );

  // Player 1 gets the next turn because
  // Player 2 must skip theirs.
  assert.equal(game.phase, "rolling");
  assert.equal(game.turnIndex, 0);
});

test("Reaching Mal during the beaver card ends the game", () => {
  const game = setupBeaverGame();

  game.players[1].tileId = "r7-12";

  confirmBeaver(game);

  advanceGroupMovement(game);

  assert.equal(game.winnerId, "2");
  assert.equal(game.phase, "finished");

  assert.equal(
    hasGroupMovement(game),
    false
  );

  assert.equal(game.chanceDraw, null);
});
