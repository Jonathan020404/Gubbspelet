export type TileType =
  | "start"
  | "finish"
  | "property"
  | "chance"
  | "lottery"
  | "shortcut"
  | "detour"
  | "bus"
  | "hospital"
  | "repairShop";

export const PROPERTY_NAMES = {
  carStore: "Bilaffär",
  electronicsStore: "Elektronikbutik",
  furnitureStore: "Möbelbutik",
  chocolateFactory: "Chokladfabrik",
  sportsStore: "Sportbutik",
  bank: "Svensk Bank",
  groceryStore: "Mataffär",
  burgerRestaurant: "Hamburgerrestaurang",
  gameStudio: "Spelstudio",
  searchEngine: "Sökmotor",
} as const;

export type PropertyId = keyof typeof PROPERTY_NAMES;

export interface Tile {
  id: string;
  name: string;
  type: TileType;

  x: number;
  y: number;

  nextTileId: string | null;
  targetTileId?: string;

  propertyId?: PropertyId;
  cardCount?: 1 | 2 | 3;
}

export const STARTING_MONEY = 30_000;

type TileDefinition = Pick<Tile, "name" | "type" | "propertyId" | "cardCount">;

function property(id: PropertyId): TileDefinition {
  return {
    type: "property",
    name: PROPERTY_NAMES[id],
    propertyId: id,
  };
}

function chance(count: 1 | 2 | 3 = 1): TileDefinition {
  return {
    type: "chance",
    name: "?".repeat(count),
    cardCount: count,
  };
}

function special(type: TileType, name: string): TileDefinition {
  return { type, name };
}

const lottery = special("lottery", "Lotteri");
const bus = special("bus", "Buss");
const shortcut = special("shortcut", "Genväg");
const detour = special("detour", "Senväg");

// Short names to make the board easier to read.
const car = property("carStore");
const electronics = property("electronicsStore");
const furniture = property("furnitureStore");
const chocolate = property("chocolateFactory");
const sports = property("sportsStore");
const bank = property("bank");
const food = property("groceryStore");
const burger = property("burgerRestaurant");
const studio = property("gameStudio");
const search = property("searchEngine");

// Create a row of tiles in left-to-right visual order.
function createRow(
  row: number,
  y: number,
  definitions: TileDefinition[],
  startX = 0,
): Tile[] {
  return definitions.map((definition, index) => ({
    ...definition,
    id: "r" + row + "-" + index,
    x: startX + index,
    y,
    nextTileId: null,
  }));
}

// ROW 1 — Start, moving right.
const row1 = createRow(
  1,
  0,
  [
    special("start", "Start"),
    lottery,
    chance(),
    special("repairShop", "Bilverkstad"),
    shortcut,
    car,
    car,
    electronics,
    chance(),
    furniture,
    chocolate,
  ],
  1,
);

// ROW 2 — Moving left.
const row2 = createRow(2, 2, [
  studio,
  burger,
  chance(),
  bus,
  food,
  chance(),
  bank,
  chance(),
  chance(),
  sports,
  chance(),
  car,
]);

// Yellow square connecting row 2 to row 3.
const connector: Tile = {
  id: "connector-1",
  name: "?",
  type: "chance",
  cardCount: 1,
  x: 0,
  y: 3,
  nextTileId: null,
};

// ROW 3 — Moving right.
const row3 = createRow(3, 4, [
  furniture,
  chance(),
  food,
  sports,
  lottery,
  detour,
  burger,
  chance(2),
  chance(),
  bus,
  lottery,
  chance(),
  food,
  electronics,
]);

// ROW 4 — Moving left.
const row4 = createRow(4, 5.5, [
  electronics,
  food,
  chance(2),
  chance(),
  bank,
  lottery,
  studio,
  chance(),
  burger,
  furniture,
  chance(),
  chocolate,
  chance(),
  chance(),
]);

// ROW 5 — Moving right.
const row5 = createRow(5, 7, [
  chance(),
  chance(),
  car,
  bank,
  search,
  chance(),
  chance(2),
  lottery,
  studio,
  furniture,
  sports,
  burger,
  chance(),
  chance(),
]);

// ROW 6 — Moving left.
const row6 = createRow(6, 8.5, [
  chance(),
  chance(),
  lottery,
  burger,
  chocolate,
  bank,
  search,
  furniture,
  food,
  chance(),
  bank,
  lottery,
  sports,
  search,
]);

// ROW 7 — Moving right toward Mål.
const row7 = createRow(7, 10, [
  chance(),
  search,
  chance(2),
  chocolate,
  lottery,
  chance(),
  chance(),
  chance(3),
  chance(),
  detour,
  chance(2),
  detour,
  chance(3),
  special("finish", "Mål"),
]);

// Connect all normal routes in movement order.
const mainPath: Tile[] = [
  ...row1,
  ...[...row2].reverse(),
  connector,
  ...row3,
  ...[...row4].reverse(),
  ...row5,
  ...[...row6].reverse(),
  ...row7,
];

mainPath.forEach((tile, index) => {
  tile.nextTileId = mainPath[index + 1]?.id ?? null;
});

// Shortcut between row 1 and row 2.
const shortcutChance: Tile = {
  id: "shortcut-chance",
  name: "?",
  type: "chance",
  cardCount: 1,
  x: 5,
  y: 1,
  nextTileId: "r2-5",
};

// First detour between row 3 and row 2.
const detourChance1: Tile = {
  id: "detour-chance-1",
  name: "?",
  type: "chance",
  cardCount: 1,
  x: 5,
  y: 3.3,
  nextTileId: "detour-chance-2",
};

const detourChance2: Tile = {
  id: "detour-chance-2",
  name: "?",
  type: "chance",
  cardCount: 1,
  x: 5,
  y: 2.7,
  nextTileId: "r2-5",
};

// Hospital is outside the normal route.
const hospital: Tile = {
  id: "hospital",
  name: "Sjukhus",
  type: "hospital",
  x: 13,
  y: 1,
  nextTileId: "r2-11",
};

// Define alternative movement directions.
row1[4].targetTileId = shortcutChance.id;

row3[5].targetTileId = detourChance1.id;

// The two detours in the final row.
row7[9].targetTileId = "r6-9";
row7[11].targetTileId = "r6-11";

// Connect the two bus stops.
row2[3].targetTileId = row3[9].id;
row3[9].targetTileId = row2[3].id;

export const board: Tile[] = [
  ...mainPath,
  shortcutChance,
  detourChance1,
  detourChance2,
  hospital,
];

export const START_TILE_ID = row1[0].id;
export const FINISH_TILE_ID = row7[13].id;

export const HOSPITAL_TILE_ID = hospital.id;
export const REPAIR_SHOP_TILE_ID = row1[3].id;

// Find any square quickly using its unique ID.
export const boardById = new Map(board.map((tile) => [tile.id, tile]));

export function getTile(id: string): Tile {
  const tile = boardById.get(id);

  if (!tile) {
    throw new Error("Unknown tile: " + id);
  }

  return tile;
}

export const FIRST_GROCERY_TILE_ID = "r2-4";
