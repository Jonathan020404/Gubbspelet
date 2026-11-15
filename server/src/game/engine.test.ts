
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createGame,
  movePlayer,
  rollTurn,
  beginRoll,
  completeRoll,
} from "./engine";
import {
  START_TILE_ID,
  FINISH_TILE_ID,
} from "./board";

test("Players start with 200000 kr", () => {
  const game = createGame([
    { id: "1", name: "Player 1" },
    { id: "2", name: "Player 2" },
  ]);

  for (const player of game.players) {
    assert.equal(player.money, 200_000);
    assert.equal(player.tileId, START_TILE_ID);
  }
});

test("Normal movement follows board arrows", () => {
  assert.equal(
    movePlayer(START_TILE_ID, 1),
    "r1-1"
  );
});

test("Landing on Genväg does not move instantly", () => {
  assert.equal(
    movePlayer("r1-3", 1),
    "r1-4"
  );
});

test("Starting on Genväg takes the shortcut", () => {
  assert.equal(
    movePlayer("r1-4", 1),
    "shortcut-chance"
  );
});

test("Passing through Genväg uses the normal path", () => {
  assert.equal(
    movePlayer("r1-3", 2),
    "r1-5"
  );
});

test("Starting on Senväg takes the detour", () => {
  assert.equal(
    movePlayer("r3-5", 1),
    "detour-chance-1"
  );
});

test("Landing on Buss teleports to the other Buss", () => {
  assert.equal(
    movePlayer("r2-4", 1),
    "r3-9"
  );
});

test("You do not need an exact roll to reach Mål", () => {
  assert.equal(
    movePlayer("r7-12", 6),
    FINISH_TILE_ID
  );
});


test("Only the current player can roll", () => {
  const game = createGame([
    { id: "1", name: "Player 1" },
    { id: "2", name: "Player 2" },
  ]);

  assert.equal(rollTurn(game, "2"), false);
  assert.equal(game.lastRoll, null);

  // Roll a 1 to land on Lotteri.
  // No purchase offer is triggered.
  assert.equal(rollTurn(game, "1", 1), true);
  assert.equal(game.turnIndex, 1);
});


test("Reaching Mål declares a winner", () => {
  const game = createGame([
    { id: "1", name: "Player 1" },
    { id: "2", name: "Player 2" },
  ]);

  game.players[0].tileId = "r7-12";

  assert.equal(rollTurn(game, "1"), true);
  assert.equal(game.winnerId, "1");

  // No more dice rolls after winning.
  assert.equal(rollTurn(game, "2"), false);
});


test("Player follows Senvag across multiple turns", () => {
  // Player lands on Senväg.
  let position = "r3-5";

  // Next turn: rolls a 1.
  position = movePlayer(position, 1);

  assert.equal(position, "detour-chance-1");

  // Following turn: rolls a 4.
  position = movePlayer(position, 4);

  // Lands on the upper Buss and teleports
  // to the lower Buss.
  assert.equal(position, "r3-9");
});

test("Both bus stops teleport correctly", () => {
  // Land on upper Buss.
  assert.equal(
    movePlayer("r2-4", 1),
    "r3-9"
  );

  // Land on lower Buss.
  assert.equal(
    movePlayer("r3-8", 1),
    "r2-3"
  );
});

test("Passing Buss does not teleport", () => {
  assert.equal(
    movePlayer("r3-8", 2),
    "r3-10"
  );
});


test("Beginning a roll records every movement step", () => {
  const game = createGame([
    { id: "1", name: "Player 1" },
    { id: "2", name: "Player 2" },
  ]);

  const movement = beginRoll(game, "1", 5);

  assert.ok(movement);

  assert.deepEqual(movement.path, [
    "r1-1",
    "r1-2",
    "r1-3",
    "r1-4",
    "r1-5",
  ]);

  assert.equal(game.phase, "moving");
  assert.equal(game.lastRoll, 5);

  // The piece has not moved yet.
  assert.equal(
    game.players[0].tileId,
    START_TILE_ID
  );
});

test("Nobody can roll during movement", () => {
  const game = createGame([
    { id: "1", name: "Player 1" },
    { id: "2", name: "Player 2" },
  ]);

  beginRoll(game, "1", 3);

  assert.equal(beginRoll(game, "1", 2), null);
  assert.equal(beginRoll(game, "2", 4), null);

  assert.equal(rollTurn(game, "1", 2), false);
  assert.equal(rollTurn(game, "2", 4), false);

  assert.equal(game.turnIndex, 0);
});


test("Purchase offers appear only after movement", () => {
  const game = createGame([
    { id: "1", name: "Player 1" },
    { id: "2", name: "Player 2" },
  ]);

  const movement = beginRoll(game, "1", 5);

  assert.ok(movement);

  assert.equal(Object.is(game.purchaseOffer, null), true);
  assert.equal(game.phase, "moving");

  // Resolve the final destination.
  completeRoll(game, movement);

  assert.equal(game.players[0].tileId, "r1-5");
  assert.equal(game.phase, "purchase");

  assert.equal(
    game.purchaseOffer?.propertyId,
    "carStore"
  );
});


test("Bus movement includes both bus stops", () => {
  const game = createGame([
    { id: "1", name: "Player 1" },
    { id: "2", name: "Player 2" },
  ]);

  game.players[0].tileId = "detour-chance-1";

  const movement = beginRoll(game, "1", 4);

  assert.ok(movement);

  assert.deepEqual(movement.path, [
    "detour-chance-2",
    "r2-5",
    "r2-4",
    "r2-3",
    "r3-9",
  ]);

  assert.equal(movement.busFrom, "r2-3");
  assert.equal(movement.tileId, "r3-9");
});

test("Winning is resolved after reaching Mal", () => {
  const game = createGame([
    { id: "1", name: "Player 1" },
    { id: "2", name: "Player 2" },
  ]);

  game.players[0].tileId = "r7-12";

  const movement = beginRoll(game, "1", 6);

  assert.ok(movement);

  // No extra steps beyond Mal.
  assert.deepEqual(movement.path, [
    FINISH_TILE_ID,
  ]);

  assert.equal(game.winnerId, null);

  completeRoll(game, movement);

  assert.equal(game.winnerId, "1");
  assert.equal(game.phase, "finished");
});
