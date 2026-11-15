
export interface Player {
  id: string;
  name: string;
}

export type PropertyId =
  | "carStore"
  | "electronicsStore"
  | "furnitureStore"
  | "chocolateFactory"
  | "sportsStore"
  | "bank"
  | "groceryStore"
  | "burgerRestaurant"
  | "gameStudio"
  | "searchEngine";

export interface Property {
  id: PropertyId;
  name: string;
  price: number;
  fee: number;
}

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


export interface GamePlayer {
  id: string;
  name: string;
  money: number;
  tileId: string;
  color: string;
  eliminated: boolean;
  skipTurnsRemaining: number;
}



export type GamePhase =
  | "rolling"
  | "moving"
  | "purchase"
  | "chance"
  | "finished";


export interface PurchaseOffer {
  propertyId: PropertyId;
  playerId: string;
  price: number;
  eligiblePlayerIds: string[];
  offerIndex: number;
}




export type ChanceEffect =
  | {
      type: "skipTurns";
      amount: number;
    }
  | {
      type: "moveAllForward";
      amount: number;
    }
  | {
      type: "payPropertyOwner";
      propertyId: PropertyId;
      amount: number;
    }
  | {
      type: "sequence";
      effects: ChanceEffect[];
    }
  | {
      type: "moveTo";
      tileId: string;
      resolveLanding: boolean;
    }
  | {
      type: "loseMoney";
      amount: number;
    }
  | {
      type: "unlessSaturday";
      effect: ChanceEffect;
    };



export interface ChanceCard {
  id: string;
  text: string;
  effect: ChanceEffect;
}

export interface ChanceDraw {
  token: string;
  playerId: string;
  card: ChanceCard;
  remaining: number;
  total: number;
}


export interface GameState {
  board: Tile[];
  players: GamePlayer[];

  properties: Record<PropertyId, Property>;
  ownership: Partial<Record<PropertyId, string>>;

  phase: GamePhase;
  purchaseOffer: PurchaseOffer | null;

  turnIndex: number;
  lastRoll: number | null;
  winnerId: string | null;
  message: string;
  chanceDraw: ChanceDraw | null;
}

export interface Room {
  code: string;
  hostId: string;
  players: Player[];
  game?: GameState;
}
