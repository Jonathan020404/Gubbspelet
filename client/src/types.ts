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
  isIPhone: boolean;
  money: number;
  tileId: string;
  color: string;
  eliminated: boolean;
  skipTurnsRemaining: number;
  loans: PlayerLoan[];
  hospitalStay: HospitalStay | null;
  nextRollMultiplier: number;
  nextRollBonus: number;
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

export type LotteryEffect =
  | {
      type: "drawChanceOnRoll";
      rolls: number[];
      amount: number;
    }
  | {
      type: "everyoneGainsOnRoll";
      amount: number;
      redrawOnRolls: number[];
    }
  | {
      type: "loseMoneyPercentageOnRoll";
      rolls: number[];
      percent: number;
    };

export interface LotteryCard {
  id: string;
  text: string;
  effect: LotteryEffect;
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
      diceCount?: 1 | 2;
      calculation?: "sum" | "product";
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
    }
  | {
      type: "chooseRockPaperScissorsOpponent";
      reward: number;
      propertyPrize?: boolean;
    }
  | {
      type: "startRockPaperScissors";
      targetPlayerId: string;
      reward: number;
      propertyPrize?: boolean;
    }
  | {
      type: "resetPropertyOwnerWithMultiplier";
      propertyId: PropertyId;
      multiplier: number;
    }
  | {
      type: "gainMoneyIfOwnsEnoughProperties";
      minimum: number;
      amount: number;
    }
  | {
      type: "moveLeftPlayerBackward";
      amount: number;
    }
  | {
      type: "ifOwnsProperty";
      propertyId: PropertyId;
      ifOwned: ChanceEffect;
      otherwise: ChanceEffect;
    }
  | {
      type: "moveToNextLottery";
      drawChanceIfNone?: boolean;
    }
  | {
      type: "payAllOtherPlayers";
      amount: number;
    }
  | {
      type: "ifMoneyAbove";
      amount: number;
      ifAbove: ChanceEffect;
      otherwise: ChanceEffect;
    }
  | {
      type: "drawLeftPlayerChanceCards";
      amount: number;
    }
  | {
      type: "addNextRollSteps";
      amount: number;
    }
  | {
      type: "moveBackwardToPropertyWithDiscount";
      propertyId: PropertyId;
      fee: number;
    }
  | {
      type: "payIfVisitedHospital";
      amount: number;
    }
  | {
      type: "moveToOpponentPropertyWithFee";
      propertyId: PropertyId;
      fee: number;
    }
  | {
      type: "gainAllMoneyPercentage";
      percent: number;
      roundUpTo: number;
    }
  | {
      type: "moveAllForwardPerProperty";
      stepsPerProperty: number;
    }
  | {
      type: "choosePlayerToTakeMoney";
      amount: number;
    }
  | {
      type: "takePlayerMoney";
      targetPlayerId: string;
      amount: number;
    }
  | {
      type: "rockPaperScissorsRichestVsPoorest";
      reward: number;
    }
  | {
      type: "ifNearFinish";
      distance: number;
      ifNear: ChanceEffect;
      otherwise: ChanceEffect;
    }
  | {
      type: "extraOddRolls";
      amount: number;
    }
  | {
      type: "drawThemedChanceCard";
    }
  | {
      type: "moveTowardsTile";
      tileId: string;
      amount: number;
    }
  | {
      type: "ifIPhone";
      effect: ChanceEffect;
    }
  | {
      type: "moveTowardsNearestBus";
      amount: number;
    }
  | {
      type: "movePropertyOwnersBackward";
      amount: number;
    }
  | {
      type: "moveTowardsLeftPlayer";
      amount: number;
      drawCardsOnCatch: number;
    }
  | {
      type: "loseAllMoneyPercentage";
      percent: number;
    }
  | {
      type: "movePlayerAndLeftPlayerTo";
      tileId: string;
    }
  | {
      type: "requestReturnProperty";
      propertyId: PropertyId;
      phrase: string;
    }
  | {
      type: "returnPropertyToBank";
      propertyId: PropertyId;
    }
  | {
      type: "setMoney";
      amount: number;
    }
  | {
      type: "payLeftPlayer";
      amount: number;
    }
  | {
      type: "propertyOwnerCollectPercentage";
      propertyId: PropertyId;
      percent: number;
    }
  | {
      type: "returnAllPropertiesToBank";
    }
  | {
      type: "propertyOwnerCollectFromAll";
      propertyId: PropertyId;
      amount: number;
    }
  | {
      type: "payRightPlayer";
      amount: number;
    }
  | {
      type: "payAllOtherPlayersExceptTile";
      amount: number;
      excludedTileId: string;
    }
  | {
      type: "moveAllToNearestPropertyWithFee";
      propertyId: PropertyId;
      fee: number;
    }
  | {
      type: "returnOwnedPropertyToBank";
      propertyId: PropertyId;
    }
  | {
      type: "rewardSwedenSupporters";
      amount: number;
    }
  | {
      type: "askSwedenSupport";
      amount: number;
    }
  | {
      type: "moveToLeftPlayer";
    }
  | {
      type: "chooseOpponentPropertyOrReset";
    }
  | {
      type: "returnRandomPropertyToBank";
    }
  | {
      type: "gainMoneyPerUnownedProperty";
      amount: number;
    }
  | {
      type: "payPropertyOwnerPercentage";
      propertyId: PropertyId;
      percent: number;
    }
  | {
      type: "winGame";
    }
  | {
      type: "loseEverythingAndRestart";
    }
  | {
      type: "drawBankModifiedChance";
    }
  | {
      type: "offerBankBonusLottery";
    }
  | {
      type: "moveFirstAndLast";
      amount: number;
    }
  | {
      type: "propertyOwnerPayPerLeftProperty";
      propertyId: PropertyId;
      amount: number;
    }
  | {
      type: "loseAllMoney";
      amount: number;
    }
  | {
      type: "moveToNearestLottery";
    }
  | {
      type: "moveBackwardWithSpecialLanding";
      amount: number;
    }
  | {
      type: "loseMoneyPercentage";
      percent: number;
    }
  | {
      type: "givePropertyToRightPlayer";
      fallbackAmount: number;
      propertyId?: PropertyId;
    }
  | {
      type: "moveLeftPlayerTo";
      tileId: string;
    }
  | {
      type: "swapPropertyOwnersPositions";
      firstPropertyId: PropertyId;
      secondPropertyId: PropertyId;
    }
  | {
      type: "moveRightPlayerTo";
      tileId: string;
    }
  | {
      type: "policeFineChoice";
    }
  | {
      type: "policeFinePayment";
      targetPlayerId: string;
      amount: number;
    }
  | {
      type: "pingPongChaosOutcome";
      roll: number;
    }
  | {
      type: "repeatPingPongChaosRoll";
    }
  | {
      type: "temporaryBankruptcy";
    }
  | {
      type: "movePlayerAndRightPlayerTo";
      tileId: string;
    }
  | {
      type: "moveToNearestForest";
    }
  | {
      type: "moveToNearestPropertyWithoutLanding";
      propertyId: PropertyId;
    }
  | {
      type: "secondFiveRoll";
    }
  | {
      type: "endGameWithoutWinner";
    };

export interface ChanceCard {
  id: string;
  text: string;
  effect: ChanceEffect;
}

export type RockPaperScissorsChoice = "rock" | "scissors" | "paper";

export interface RockPaperScissorsMatch {
  player1Id: string;
  player2Id: string;

  player1Score: number;
  player2Score: number;

  reward: number;
  round: number;
  winsRequired?: number;

  submittedPlayerIds: string[];

  lastRound: {
    player1Choice: RockPaperScissorsChoice;
    player2Choice: RockPaperScissorsChoice;
    winnerId: string | null;
  } | null;

  winnerId: string | null;
}

export interface ChanceDraw {
  token: string;
  playerId: string;
  card: ChanceCard;
  remaining: number;
  total: number;

  diceResult?: {
    value: number;
    values?: number[];
    calculation?: "sum" | "product";
    label: string;
  };

  continuationPlayerId?: string;

  rockPaperScissors?: RockPaperScissorsMatch;

  bankModifier?: {
    playerId: string;
    lotteryOffered: boolean;
  };
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
  activeLotteryCard: LotteryCard | null;
}

export interface Room {
  code: string;
  hostId: string;
  players: Player[];
  game?: GameState;
}
