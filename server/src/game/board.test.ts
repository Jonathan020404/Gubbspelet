
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  board,
  boardById,
  START_TILE_ID,
  FINISH_TILE_ID,
  getTile,
} from "./board";

test("Every tile has a unique ID", () => {
  assert.equal(board.length, boardById.size);
});

test("Every destination exists", () => {
  for (const tile of board) {
    if (tile.nextTileId) {
      assert.ok(
        boardById.has(tile.nextTileId),
        "Invalid next tile: " + tile.id
      );
    }

    if (tile.targetTileId) {
      assert.ok(
        boardById.has(tile.targetTileId),
        "Invalid target tile: " + tile.id
      );
    }
  }
});

test("The normal path reaches Mål", () => {
  const visited = new Set<string>();
  let current = getTile(START_TILE_ID);

  while (current.nextTileId) {
    assert.ok(!visited.has(current.id), "Loop detected");

    visited.add(current.id);
    current = getTile(current.nextTileId);
  }

  assert.equal(current.id, FINISH_TILE_ID);
});

test("Bus stops point to each other", () => {
  const buses = board.filter((tile) => tile.type === "bus");

  assert.equal(buses.length, 2);
  assert.equal(buses[0].targetTileId, buses[1].id);
  assert.equal(buses[1].targetTileId, buses[0].id);
});
