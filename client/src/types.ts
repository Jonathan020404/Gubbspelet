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

export interface PlayerLoan {
  id: string;
  amount: number;
  repayment: number;
  discountedRepayment: number;
  discountPropertyId: PropertyId;
}

export interface HospitalStay {
  propertyIds: PropertyId[];
  includeLottery: boolean;
}

export interface GamePlayer {
  id: string;
  name: string;
  money: number;
  tileId: string;
  color: string;
  eliminated: boolean;
  skipTurnsRemaining: number;
  loans: PlayerLoan[];
  hospitalStay: HospitalStay | null;
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
    }
  | {
      type: "gainMoney";
      amount: number;
    }
  | {
      type: "moveOthersBackward";
      amount: number;
    }
  | {
      type: "choose";
      options: {
        label: string;
        effect: ChanceEffect;
      }[];
    }
  | {
      type: "movePropertyOwnerBackward";
      propertyId: PropertyId;
      amount: number;
    }
  | {
      type: "skipRichestPlayerTurns";
      amount: number;
    }
  | {
      type: "drawAllChanceCards";
      amount: number;
    }
  | {
      type: "drawChanceCards";
      amount: number;
    }
  | {
      type: "unlessOwnsProperty";
      propertyId: PropertyId;
      effect: ChanceEffect;
    }
  | {
      type: "choosePlayerMoneyPercentage";
      percent: number;
    }
  | {
      type: "takePlayerMoneyPercentage";
      targetPlayerId: string;
      percent: number;
    }
  | {
      type: "choosePlayerToPay";
      amount: number;
      before: ChanceEffect[];
    }
  | {
      type: "payPlayer";
      targetPlayerId: string;
      amount: number;
    }
  | {
      type: "rollForEffect";
      outcomes: {
        rolls: number[];
        label: string;
        effect: ChanceEffect;
      }[];
    }
  | {
      type: "moveAllBackward";
      amount: number;
    }
  | {
      type: "gainAllMoney";
      amount: number;
    }
  | {
      type: "movePlayerAndOthers";
      playerSteps: number;
      otherSteps: number;
    }
  | {
      type: "drawLottery";
    }
  | {
      type: "payPerOwnedProperty";
      amount: number;
    }
  | {
      type: "moneyPerRollUntilProperty";
      amount: number;
      propertyId: PropertyId;
    }
  | {
      type: "gainPropertyOwnerMoney";
      propertyId: PropertyId;
      amount: number;
    }
  | {
      type: "gainLeftPlayerMoney";
      amount: number;
    }
  | {
      type: "moveAllTo";
      tileId: string;
    }
  | {
      type: "loseOthersMoney";
      amount: number;
    }
  | {
      type: "moveForward";
      amount: number;
    }
  | {
      type: "moveToNearestProperty";
      propertyId: PropertyId;
    }
  | {
      type: "ifRichestPlayer";
      ifRichest: ChanceEffect;
      otherwise: ChanceEffect;
    }
  | {
      type: "moveToNearestOfProperties";
      propertyIds: PropertyId[];
    }
  | {
      type: "takeLoan";
      amount: number;
      repayment: number;
      discountedRepayment: number;
      discountPropertyId: PropertyId;
    }
  | {
      type: "choosePlayerToPassCard";
    }
  | {
      type: "passChanceCard";
      targetPlayerId: string;
    }
  | {
      type: "chooseBankProperty";
      price: number;
      after: ChanceEffect[];
    }
  | {
      type: "buyBankProperty";
      propertyId: PropertyId;
      price: number;
    }
  | {
      type: "chooseOpponentPropertyOrMoney";
      percent: number;
      before: ChanceEffect[];
    }
  | {
      type: "takePlayerProperty";
      propertyId: PropertyId;
      targetPlayerId: string;
    }
  | {
      type: "extraRolls";
      amount: number;
    }
  | {
      type: "hospitalUntilLanding";
      propertyIds: PropertyId[];
      includeLottery: boolean;
    }
  | {
      type: "losePropertyOwnerMoney";
      propertyId: PropertyId;
      amount: number;
    }
  | {
      type: "loseRichestPlayerMoney";
      amount: number;
    }
  | {
      type: "choosePlayerMoveByMoney";
      moneyPerGroup: number;
      stepsPerGroup: number;
    }
  | {
      type: "moveSelectedPlayer";
      targetPlayerId: string;
      amount: number;
    }
  | {
      type: "collectMoneyFromOthers";
      amount: number;
    }
  | {
      type: "gainAllMoneyPerProperty";
      amount: number;
    }
  | {
      type: "movePropertyOwnerForward";
      propertyId: PropertyId;
      amount: number;
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

  diceResult?: {
    value: number;
    label: string;
  };

  continuationPlayerId?: string;
}

export interface MoneyPerRollReward {
  id: string;
  playerId: string;
  amount: number;
  untilPropertyId: PropertyId;
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
  moneyPerRollRewards: MoneyPerRollReward[];
}

export interface Room {
  code: string;
  hostId: string;
  players: Player[];
  game?: GameState;
}
