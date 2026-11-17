import type { PropertyId } from "./board";

import {
  FIRST_GROCERY_TILE_ID,
  REPAIR_SHOP_TILE_ID,
  HOSPITAL_TILE_ID,
  START_TILE_ID,
} from "./board";

export type ChanceEffect =
  | {
      type: "swapPlayerPositionsWithoutLanding";
      targetPlayerId: string;
    }
  | {
      type: "transferRentProperty";
      propertyId: PropertyId;
      recipientId: string;
    }
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

// ------------------------------------
// REUSABLE CARD EFFECTS
// ------------------------------------

export function movePlayerAndRightPlayerTo(tileId: string): ChanceEffect {
  return {
    type: "movePlayerAndRightPlayerTo",
    tileId,
  };
}

export function moveRightPlayerTo(tileId: string): ChanceEffect {
  return {
    type: "moveRightPlayerTo",
    tileId,
  };
}

export function moveLeftPlayerTo(tileId: string): ChanceEffect {
  return {
    type: "moveLeftPlayerTo",
    tileId,
  };
}

export function swapPropertyOwnersPositions(
  firstPropertyId: PropertyId,
  secondPropertyId: PropertyId,
): ChanceEffect {
  return {
    type: "swapPropertyOwnersPositions",
    firstPropertyId,
    secondPropertyId,
  };
}

export function givePropertyToRightPlayer(
  fallbackAmount: number,
): ChanceEffect {
  return {
    type: "givePropertyToRightPlayer",
    fallbackAmount,
  };
}

export function loseMoneyPercentage(percent: number): ChanceEffect {
  return {
    type: "loseMoneyPercentage",
    percent,
  };
}

export function moveBackwardWithSpecialLanding(amount: number): ChanceEffect {
  return {
    type: "moveBackwardWithSpecialLanding",
    amount,
  };
}

export function moveToNearestLottery(): ChanceEffect {
  return {
    type: "moveToNearestLottery",
  };
}
export function loseAllMoney(amount: number): ChanceEffect {
  return {
    type: "loseAllMoney",
    amount,
  };
}

export function propertyOwnerPayPerLeftProperty(
  propertyId: PropertyId,
  amount: number,
): ChanceEffect {
  return {
    type: "propertyOwnerPayPerLeftProperty",
    propertyId,
    amount,
  };
}

export function moveFirstAndLast(amount: number): ChanceEffect {
  return {
    type: "moveFirstAndLast",
    amount,
  };
}

export function drawBankModifiedChance(): ChanceEffect {
  return {
    type: "drawBankModifiedChance",
  };
}

export function winGame(): ChanceEffect {
  return {
    type: "winGame",
  };
}

export function loseEverythingAndRestart(): ChanceEffect {
  return {
    type: "loseEverythingAndRestart",
  };
}

export function payPropertyOwnerPercentage(
  propertyId: PropertyId,
  percent: number,
): ChanceEffect {
  return {
    type: "payPropertyOwnerPercentage",
    propertyId,
    percent,
  };
}
export function gainMoneyPerUnownedProperty(amount: number): ChanceEffect {
  return {
    type: "gainMoneyPerUnownedProperty",
    amount,
  };
}
export function returnRandomPropertyToBank(): ChanceEffect {
  return {
    type: "returnRandomPropertyToBank",
  };
}
export function chooseOpponentPropertyOrReset(): ChanceEffect {
  return {
    type: "chooseOpponentPropertyOrReset",
  };
}

export function moveToLeftPlayer(): ChanceEffect {
  return {
    type: "moveToLeftPlayer",
  };
}

export function rewardSwedenSupporters(amount: number): ChanceEffect {
  return {
    type: "rewardSwedenSupporters",
    amount,
  };
}

export function returnOwnedPropertyToBank(
  propertyId: PropertyId,
): ChanceEffect {
  return {
    type: "returnOwnedPropertyToBank",
    propertyId,
  };
}

export function moveAllToNearestPropertyWithFee(
  propertyId: PropertyId,
  fee: number,
): ChanceEffect {
  return {
    type: "moveAllToNearestPropertyWithFee",
    propertyId,
    fee,
  };
}

export function payAllOtherPlayersExceptTile(
  amount: number,
  excludedTileId: string,
): ChanceEffect {
  return {
    type: "payAllOtherPlayersExceptTile",
    amount,
    excludedTileId,
  };
}

export function payRightPlayer(amount: number): ChanceEffect {
  return {
    type: "payRightPlayer",
    amount,
  };
}

export function propertyOwnerCollectFromAll(
  propertyId: PropertyId,
  amount: number,
): ChanceEffect {
  return {
    type: "propertyOwnerCollectFromAll",
    propertyId,
    amount,
  };
}

export function returnAllPropertiesToBank(): ChanceEffect {
  return {
    type: "returnAllPropertiesToBank",
  };
}

export function propertyOwnerCollectPercentage(
  propertyId: PropertyId,
  percent: number,
): ChanceEffect {
  return {
    type: "propertyOwnerCollectPercentage",
    propertyId,
    percent,
  };
}

export function payLeftPlayer(amount: number): ChanceEffect {
  return {
    type: "payLeftPlayer",
    amount,
  };
}

export function setMoney(amount: number): ChanceEffect {
  return {
    type: "setMoney",
    amount,
  };
}

export function requestReturnProperty(
  propertyId: PropertyId,
  phrase: string,
): ChanceEffect {
  return {
    type: "requestReturnProperty",
    propertyId,
    phrase,
  };
}

export function movePlayerAndLeftPlayerTo(tileId: string): ChanceEffect {
  return {
    type: "movePlayerAndLeftPlayerTo",
    tileId,
  };
}

export function loseAllMoneyPercentage(percent: number): ChanceEffect {
  return {
    type: "loseAllMoneyPercentage",
    percent,
  };
}

export function moveTowardsLeftPlayer(
  amount: number,
  drawCardsOnCatch: number,
): ChanceEffect {
  return {
    type: "moveTowardsLeftPlayer",
    amount,
    drawCardsOnCatch,
  };
}

export function movePropertyOwnersBackward(amount: number): ChanceEffect {
  return {
    type: "movePropertyOwnersBackward",
    amount,
  };
}

export function moveTowardsNearestBus(amount: number): ChanceEffect {
  return {
    type: "moveTowardsNearestBus",
    amount,
  };
}

export function ifIPhone(effect: ChanceEffect): ChanceEffect {
  return {
    type: "ifIPhone",
    effect,
  };
}

export function moveTowardsTile(tileId: string, amount: number): ChanceEffect {
  return {
    type: "moveTowardsTile",
    tileId,
    amount,
  };
}

export function drawThemedChanceCard(): ChanceEffect {
  return {
    type: "drawThemedChanceCard",
  };
}

export function ifNearFinish(
  distance: number,
  ifNear: ChanceEffect,
  otherwise: ChanceEffect,
): ChanceEffect {
  return {
    type: "ifNearFinish",
    distance,
    ifNear,
    otherwise,
  };
}

export function extraOddRolls(amount: number): ChanceEffect {
  return {
    type: "extraOddRolls",
    amount,
  };
}

export function rockPaperScissorsRichestVsPoorest(
  reward: number,
): ChanceEffect {
  return {
    type: "rockPaperScissorsRichestVsPoorest",
    reward,
  };
}

export function choosePlayerToTakeMoney(amount: number): ChanceEffect {
  return {
    type: "choosePlayerToTakeMoney",
    amount,
  };
}

export function takePlayerMoney(
  targetPlayerId: string,
  amount: number,
): ChanceEffect {
  return {
    type: "takePlayerMoney",
    targetPlayerId,
    amount,
  };
}

export function rollTwoDiceProductForEffect(
  ...outcomes: {
    rolls: number[];
    label: string;
    effect: ChanceEffect;
  }[]
): ChanceEffect {
  return {
    type: "rollForEffect",
    diceCount: 2,
    calculation: "product",
    outcomes,
  };
}

export function moveAllForwardPerProperty(
  stepsPerProperty: number,
): ChanceEffect {
  return {
    type: "moveAllForwardPerProperty",
    stepsPerProperty,
  };
}

export function rollTwoDiceForEffect(
  ...outcomes: {
    rolls: number[];
    label: string;
    effect: ChanceEffect;
  }[]
): ChanceEffect {
  return {
    type: "rollForEffect",
    diceCount: 2,
    outcomes,
  };
}

export function gainAllMoneyPercentage(
  percent: number,
  roundUpTo: number,
): ChanceEffect {
  return {
    type: "gainAllMoneyPercentage",
    percent,
    roundUpTo,
  };
}

export function moveToOpponentPropertyWithFee(
  propertyId: PropertyId,
  fee: number,
): ChanceEffect {
  return {
    type: "moveToOpponentPropertyWithFee",
    propertyId,
    fee,
  };
}

export function payIfVisitedHospital(amount: number): ChanceEffect {
  return {
    type: "payIfVisitedHospital",
    amount,
  };
}

export function moveBackwardToPropertyWithDiscount(
  propertyId: PropertyId,
  fee: number,
): ChanceEffect {
  return {
    type: "moveBackwardToPropertyWithDiscount",
    propertyId,
    fee,
  };
}

export function addNextRollSteps(amount: number): ChanceEffect {
  return {
    type: "addNextRollSteps",
    amount,
  };
}

export function ifMoneyAbove(
  amount: number,
  ifAbove: ChanceEffect,
  otherwise: ChanceEffect,
): ChanceEffect {
  return {
    type: "ifMoneyAbove",
    amount,
    ifAbove,
    otherwise,
  };
}

export function drawLeftPlayerChanceCards(amount: number): ChanceEffect {
  return {
    type: "drawLeftPlayerChanceCards",
    amount,
  };
}

export function payAllOtherPlayers(amount: number): ChanceEffect {
  return {
    type: "payAllOtherPlayers",
    amount,
  };
}

export function moveToNextLottery(
  drawChanceIfNone: boolean = false,
): ChanceEffect {
  return {
    type: "moveToNextLottery",
    drawChanceIfNone,
  };
}

export function ifOwnsProperty(
  propertyId: PropertyId,
  ifOwned: ChanceEffect,
  otherwise: ChanceEffect,
): ChanceEffect {
  return {
    type: "ifOwnsProperty",
    propertyId,
    ifOwned,
    otherwise,
  };
}

export function gainMoneyIfOwnsEnoughProperties(
  minimum: number,
  amount: number,
): ChanceEffect {
  return {
    type: "gainMoneyIfOwnsEnoughProperties",
    minimum,
    amount,
  };
}

export function moveLeftPlayerBackward(amount: number): ChanceEffect {
  return {
    type: "moveLeftPlayerBackward",
    amount,
  };
}

export function resetPropertyOwnerWithMultiplier(
  propertyId: PropertyId,
  multiplier: number,
): ChanceEffect {
  return {
    type: "resetPropertyOwnerWithMultiplier",
    propertyId,
    multiplier,
  };
}

export function chooseRockPaperScissorsOpponent(
  reward: number,
  propertyPrize: boolean = false,
): ChanceEffect {
  return {
    type: "chooseRockPaperScissorsOpponent",
    reward,
    propertyPrize,
  };
}

export function gainAllMoneyPerProperty(amount: number): ChanceEffect {
  return {
    type: "gainAllMoneyPerProperty",
    amount,
  };
}

export function movePropertyOwnerForward(
  propertyId: PropertyId,
  amount: number,
): ChanceEffect {
  return {
    type: "movePropertyOwnerForward",
    propertyId,
    amount,
  };
}

export function collectMoneyFromOthers(amount: number): ChanceEffect {
  return {
    type: "collectMoneyFromOthers",
    amount,
  };
}

export function choosePlayerMoveByMoney(
  moneyPerGroup: number,
  stepsPerGroup: number,
): ChanceEffect {
  return {
    type: "choosePlayerMoveByMoney",
    moneyPerGroup,
    stepsPerGroup,
  };
}

export function moveSelectedPlayer(
  targetPlayerId: string,
  amount: number,
): ChanceEffect {
  return {
    type: "moveSelectedPlayer",
    targetPlayerId,
    amount,
  };
}

export function loseRichestPlayerMoney(amount: number): ChanceEffect {
  return {
    type: "loseRichestPlayerMoney",
    amount,
  };
}

export function losePropertyOwnerMoney(
  propertyId: PropertyId,
  amount: number,
): ChanceEffect {
  return {
    type: "losePropertyOwnerMoney",
    propertyId,
    amount,
  };
}

export function hospitalUntilLanding(
  propertyIds: PropertyId[],
  includeLottery = false,
): ChanceEffect {
  return {
    type: "hospitalUntilLanding",
    propertyIds,
    includeLottery,
  };
}

export function extraRolls(amount: number): ChanceEffect {
  return {
    type: "extraRolls",
    amount,
  };
}

export function chooseOpponentPropertyOrMoney(
  percent: number,
  ...before: ChanceEffect[]
): ChanceEffect {
  return {
    type: "chooseOpponentPropertyOrMoney",
    percent,
    before,
  };
}

export function takePlayerProperty(
  propertyId: PropertyId,
  targetPlayerId: string,
): ChanceEffect {
  return {
    type: "takePlayerProperty",
    propertyId,
    targetPlayerId,
  };
}

export function chooseBankProperty(
  price: number,
  ...after: ChanceEffect[]
): ChanceEffect {
  return {
    type: "chooseBankProperty",
    price,
    after,
  };
}

export function buyBankProperty(
  propertyId: PropertyId,
  price: number,
): ChanceEffect {
  return {
    type: "buyBankProperty",
    propertyId,
    price,
  };
}

export function choosePlayerToPassCard(): ChanceEffect {
  return {
    type: "choosePlayerToPassCard",
  };
}

export function passChanceCard(targetPlayerId: string): ChanceEffect {
  return {
    type: "passChanceCard",
    targetPlayerId,
  };
}

export function takeLoan(
  amount: number,
  repayment: number,
  discountedRepayment: number,
  discountPropertyId: PropertyId,
): ChanceEffect {
  return {
    type: "takeLoan",
    amount,
    repayment,
    discountedRepayment,
    discountPropertyId,
  };
}

export function moveToNearestOfProperties(
  ...propertyIds: PropertyId[]
): ChanceEffect {
  return {
    type: "moveToNearestOfProperties",
    propertyIds,
  };
}

export function ifRichestPlayer(
  ifRichest: ChanceEffect,
  otherwise: ChanceEffect,
): ChanceEffect {
  return {
    type: "ifRichestPlayer",
    ifRichest,
    otherwise,
  };
}

export function moveToNearestProperty(propertyId: PropertyId): ChanceEffect {
  return {
    type: "moveToNearestProperty",
    propertyId,
  };
}

export function moveForward(amount: number): ChanceEffect {
  return {
    type: "moveForward",
    amount,
  };
}

export function gainLeftPlayerMoney(amount: number): ChanceEffect {
  return {
    type: "gainLeftPlayerMoney",
    amount,
  };
}

export function moveAllTo(tileId: string): ChanceEffect {
  return {
    type: "moveAllTo",
    tileId,
  };
}

export function loseOthersMoney(amount: number): ChanceEffect {
  return {
    type: "loseOthersMoney",
    amount,
  };
}

export function gainPropertyOwnerMoney(
  propertyId: PropertyId,
  amount: number,
): ChanceEffect {
  return {
    type: "gainPropertyOwnerMoney",
    propertyId,
    amount,
  };
}

export function moneyPerRollUntilProperty(
  amount: number,
  propertyId: PropertyId,
): ChanceEffect {
  return {
    type: "moneyPerRollUntilProperty",
    amount,
    propertyId,
  };
}

export function payPerOwnedProperty(amount: number): ChanceEffect {
  return {
    type: "payPerOwnedProperty",
    amount,
  };
}

export function rollForEffect(
  ...outcomes: {
    rolls: number[];
    label: string;
    effect: ChanceEffect;
  }[]
): ChanceEffect {
  return {
    type: "rollForEffect",
    outcomes,
  };
}

export function moveAllBackward(amount: number): ChanceEffect {
  return {
    type: "moveAllBackward",
    amount,
  };
}

export function gainAllMoney(amount: number): ChanceEffect {
  return {
    type: "gainAllMoney",
    amount,
  };
}

export function movePlayerAndOthers(
  playerSteps: number,
  otherSteps: number,
): ChanceEffect {
  return {
    type: "movePlayerAndOthers",
    playerSteps,
    otherSteps,
  };
}

export function drawLottery(): ChanceEffect {
  return {
    type: "drawLottery",
  };
}

export function choosePlayerToPay(
  amount: number,
  ...before: ChanceEffect[]
): ChanceEffect {
  return {
    type: "choosePlayerToPay",
    amount,
    before,
  };
}

export function payPlayer(
  targetPlayerId: string,
  amount: number,
): ChanceEffect {
  return {
    type: "payPlayer",
    targetPlayerId,
    amount,
  };
}

export function choosePlayerMoneyPercentage(percent: number): ChanceEffect {
  return {
    type: "choosePlayerMoneyPercentage",
    percent,
  };
}

export function takePlayerMoneyPercentage(
  targetPlayerId: string,
  percent: number,
): ChanceEffect {
  return {
    type: "takePlayerMoneyPercentage",
    targetPlayerId,
    percent,
  };
}

export function unlessOwnsProperty(
  propertyId: PropertyId,
  effect: ChanceEffect,
): ChanceEffect {
  return {
    type: "unlessOwnsProperty",
    propertyId,
    effect,
  };
}

export function drawChanceCards(amount: number): ChanceEffect {
  return {
    type: "drawChanceCards",
    amount,
  };
}

export function drawAllChanceCards(amount: number): ChanceEffect {
  return {
    type: "drawAllChanceCards",
    amount,
  };
}

export function skipRichestPlayerTurns(amount: number): ChanceEffect {
  return {
    type: "skipRichestPlayerTurns",
    amount,
  };
}

export function skipTurns(amount: number): ChanceEffect {
  return {
    type: "skipTurns",
    amount,
  };
}

export function moveAllForward(amount: number): ChanceEffect {
  return {
    type: "moveAllForward",
    amount,
  };
}

export function payPropertyOwner(
  propertyId: PropertyId,
  amount: number,
): ChanceEffect {
  return {
    type: "payPropertyOwner",
    propertyId,
    amount,
  };
}

export function sequence(...effects: ChanceEffect[]): ChanceEffect {
  return {
    type: "sequence",
    effects,
  };
}

export function moveTo(tileId: string, resolveLanding = true): ChanceEffect {
  return {
    type: "moveTo",
    tileId,
    resolveLanding,
  };
}

export function loseMoney(amount: number): ChanceEffect {
  return {
    type: "loseMoney",
    amount,
  };
}

export function unlessSaturday(effect: ChanceEffect): ChanceEffect {
  return {
    type: "unlessSaturday",
    effect,
  };
}

export function gainMoney(amount: number): ChanceEffect {
  return {
    type: "gainMoney",
    amount,
  };
}

export function moveOthersBackward(amount: number): ChanceEffect {
  return {
    type: "moveOthersBackward",
    amount,
  };
}

export function choose(
  ...options: {
    label: string;
    effect: ChanceEffect;
  }[]
): ChanceEffect {
  return {
    type: "choose",
    options,
  };
}

export function movePropertyOwnerBackward(
  propertyId: PropertyId,
  amount: number,
): ChanceEffect {
  return {
    type: "movePropertyOwnerBackward",
    propertyId,
    amount,
  };
}

// ------------------------------------
// ALL QUESTION CARDS
// ------------------------------------

export const CHANCE_CARDS: ChanceCard[] = [
  {
    id: "chance-001",
    text: "Du stänger in din bror i en väska. Skäms och stå över 3 kast.",
    effect: skipTurns(3),
  },

  {
    id: "chance-002",
    text: "En bäver sket på din dator. Alla spelare skall gå 5 steg framåt. Du ska däremot betala 20000 till ägaren av Elektronikbutiken såvida inte du eller banken äger den.",
    effect: sequence(
      moveAllForward(5),
      payPropertyOwner("electronicsStore", 20_000),
    ),
  },
  {
    id: "chance-003",
    text: "Du är sugen på godis. Åk till Mataffären närmast Start och betala 10000. Gäller ej om det är lördag.",
    effect: unlessSaturday(
      sequence(moveTo(FIRST_GROCERY_TILE_ID, true), loseMoney(10_000)),
    ),
  },
  {
    id: "chance-004",
    text: "Du får klappa en kattunge. Du får välja mellan att inkassera 25000 eller låta alla spelare utom du springa 12 steg bakåt.",
    effect: choose(
      {
        label: "Inkassera 25 000 kr",
        effect: gainMoney(25_000),
      },
      {
        label: "Alla andra går 12 steg bakåt",
        effect: moveOthersBackward(12),
      },
    ),
  },
  {
    id: "chance-005",
    text: "Du vill åka till månen. Betala 5000.",
    effect: loseMoney(5_000),
  },
  {
    id: "chance-006",
    text: "Du vann i charader. Stå över 1 kast och reta förlorarna. Bilaffärens ägare ska gå 3 steg bakåt.",
    effect: sequence(skipTurns(1), movePropertyOwnerBackward("carStore", 3)),
  },

  {
    id: "chance-007",
    text: "Skalman är på konsert. Den spelare som har mest pengar ska stå över 1 kast och vattna Skalmans blommor.",
    effect: skipRichestPlayerTurns(1),
  },
  {
    id: "chance-008",
    text: "Det är din födelsedag idag. Alla ska ta 1 frågekort var.",
    effect: drawAllChanceCards(1),
  },
  {
    id: "chance-009",
    text: "Ta ett nytt frågekort.",
    effect: drawChanceCards(1),
  },

  {
    id: "chance-010",
    text: "Du känner dig sugen på en lyxig hamburgare. Betala 15000. Gäller ej om du äger Hamburgerrestaurangen.",
    effect: unlessOwnsProperty("burgerRestaurant", loseMoney(15_000)),
  },
  {
    id: "chance-011",
    text: "Du hittar en dammsugare. Rikta den mot valfri spelare. Den suger till sig 20% av hans/hennes pengar. Sen tar du pengarna.",
    effect: choosePlayerMoneyPercentage(20),
  },
  {
    id: "chance-012",
    text: "En gubbe fyller år idag. Betala 15000 och gratulera honom.",
    effect: loseMoney(15_000),
  },
  {
    id: "chance-013",
    text: "Gå till bilverkstan. Stå över ett kast och skäms. Betala 8000 till den du tror är äldst.",
    effect: choosePlayerToPay(8_000, moveTo(REPAIR_SHOP_TILE_ID), skipTurns(1)),
  },
  {
    id: "chance-014",
    text: "Slå tärningen. Får du 1-2 så ska alla gå 10 steg bakåt. Slår du 3 så ska alla gå 2 steg bakåt. Slår du 4 så ska alla gå 3 steg framåt och inkassera 7000. Slår du 5 ska alla inkassera 20000. Slår du 6 ska du gå 7 steg framåt, medan alla andra går 6 steg bakåt. Ta sedan ett lotteri.",
    effect: rollForEffect(
      {
        rolls: [1, 2],
        label: "Alla går 10 steg bakåt.",
        effect: sequence(moveAllBackward(10), drawLottery()),
      },
      {
        rolls: [3],
        label: "Alla går 2 steg bakåt.",
        effect: sequence(moveAllBackward(2), drawLottery()),
      },
      {
        rolls: [4],
        label: "Alla går 3 steg framåt och inkasserar 7 000 kr.",
        effect: sequence(moveAllForward(3), gainAllMoney(7_000), drawLottery()),
      },
      {
        rolls: [5],
        label: "Alla inkasserar 20 000 kr.",
        effect: sequence(gainAllMoney(20_000), drawLottery()),
      },
      {
        rolls: [6],
        label: "Du går 7 steg framåt. Alla andra går 6 steg bakåt.",
        effect: sequence(movePlayerAndOthers(7, -6), drawLottery()),
      },
    ),
  },
  {
    id: "chance-015",
    text: "Du måste städa dina företag från smuts. Betala 5000/aktiebrev du har.",
    effect: payPerOwnedProperty(5_000),
  },
  {
    id: "chance-016",
    text: "En antilop gick vilse bland ylletröjor. Inkassera 18000.",
    effect: gainMoney(18_000),
  },
  {
    id: "chance-017",
    text: "Du hittar ett pengaträd. Slår du 1-2 så ramlar det över dig och du måste gå till sjukhuset. Annars inkasserar du 3000 efter varje slag med tärning till någon hamnar på Bilaffären.",
    effect: rollForEffect(
      {
        rolls: [1, 2],
        label: "Pengaträdet ramlar över dig. Åk till Sjukhuset.",
        effect: moveTo(HOSPITAL_TILE_ID),
      },
      {
        rolls: [3, 4, 5, 6],
        label:
          "Inkassera 3 000 kr efter varje tärningsslag tills någon landar på Bilaffären.",
        effect: moneyPerRollUntilProperty(3_000, "carStore"),
      },
    ),
  },
  {
    id: "chance-018",
    text: "Du har ärvt 50000.",
    effect: gainMoney(50_000),
  },
  {
    id: "chance-019",
    text: "Ge 1000kr till UNICEF och ge dig själv en klapp på axeln.",
    effect: loseMoney(1_000),
  },
  {
    id: "chance-020",
    text: "Du får 7 rätt på måltipset men får dela med dig till dina syskon? -Ha Ha- Stå över 2 kast.",
    effect: skipTurns(2),
  },
  {
    id: "chance-021",
    text: "Den som äger Mataffären ska inkassera 30000 för att spelaren till vänster kommer i tid till jobbet ibland.",
    effect: gainPropertyOwnerMoney("groceryStore", 30_000),
  },
  {
    id: "chance-022",
    text: "Du möter en gubbe i fotboll. Slår du 1-6 vinner du och inkasserar 10000. Annars förlorar du och måste betala 150000.",
    effect: rollForEffect({
      rolls: [1, 2, 3, 4, 5, 6],
      label: "Du vann fotbollsmatchen! Inkassera 10 000 kr.",
      effect: gainMoney(10_000),
    }),
  },
  {
    id: "chance-023",
    text: "Slå tärningen. Slår du 1-2 så ska du inkassera 17000 och spelaren till vänster inkasserar 8000. Slår du 3 så inkasserar alla 23000. Slår du 4 så ska alla utom du gå 5 steg bakåt, och du inkasserar 30000. Slår du 5 så ska alla gå till start. Slår du 6 så inkasserar du 165000 medan alla andra betalar 20000.",
    effect: rollForEffect(
      {
        rolls: [1, 2],
        label:
          "Du inkasserar 17 000 kr. Spelaren till vänster inkasserar 8 000 kr.",
        effect: sequence(gainMoney(17_000), gainLeftPlayerMoney(8_000)),
      },
      {
        rolls: [3],
        label: "Alla inkasserar 23 000 kr.",
        effect: gainAllMoney(23_000),
      },
      {
        rolls: [4],
        label: "Alla andra går 5 steg bakåt. Du inkasserar 30 000 kr.",
        effect: sequence(moveOthersBackward(5), gainMoney(30_000)),
      },
      {
        rolls: [5],
        label: "Alla spelare går till Start.",
        effect: moveAllTo(START_TILE_ID),
      },
      {
        rolls: [6],
        label: "Du inkasserar 165 000 kr. Alla andra betalar 20 000 kr.",
        effect: sequence(gainMoney(165_000), loseOthersMoney(20_000)),
      },
    ),
  },
  {
    id: "chance-024",
    text: "Hej hej hej hej hej! Gå 5 steg framåt",
    effect: moveForward(5),
  },
  {
    id: "chance-025",
    text: "En duva sket på din mössa. Gå till bilverka",
    effect: moveTo(REPAIR_SHOP_TILE_ID),
  },
  {
    id: "chance-026",
    text: "Du glömde äta middag gå till närmaste Hamburgerrestaurang och äta",
    effect: moveToNearestProperty("burgerRestaurant"),
  },
  {
    id: "chance-027",
    text: "Kapten Skägg, Kapten Blod, och Kapten Krabba spelar poker. Är du den rikaste spelaren så förlorar Kapten Krabba och du måste betala 30000. Annars vinner Kapten Blod och du får 15000 och 1 frågekort.",
    effect: ifRichestPlayer(
      loseMoney(30_000),
      sequence(gainMoney(15_000), drawChanceCards(1)),
    ),
  },
  {
    id: "chance-028",
    text: "En gubbe spelar gubbspelet. Inkassera 40000",
    effect: gainMoney(40_000),
  },
  {
    id: "chance-029",
    text: "Du trampade på en lerpöl gå till närmaste Sportbutik och köp nya skor.",
    effect: moveToNearestProperty("sportsStore"),
  },
  {
    id: "chance-030",
    text: "Du glömde när din kompis fyller år. Åk till Sökmotorn och ta reda på det.",
    effect: moveToNearestProperty("searchEngine"),
  },
  {
    id: "chance-031",
    text: "Det regnar ute. Gå till närmsta Mataffär, Möbelbutik eller Sportbutik och köp ett paraply för 16000.",
    effect: sequence(
      moveToNearestOfProperties(
        "groceryStore",
        "furnitureStore",
        "sportsStore",
      ),
      loseMoney(16_000),
    ),
  },
  {
    id: "chance-032",
    text: "Du tar lån. Inkassera 100 000, men om du går in i mål så måste du betala 110 000. Har du ej råd så måste du börja om från start, men slipper betala nästa gång du kommer till mål. Äger du Svensk Bank så betalar du endast 100 000.",
    effect: takeLoan(100_000, 110_000, 100_000, "bank"),
  },
  {
    id: "chance-033",
    text: "Det har kommit en ny Star Wars film på bio. Betala 12000 för inträde, 3000 för godis, och 2000 för läsk. Stå sedan över 2 kast.",
    effect: sequence(
      loseMoney(12_000),
      loseMoney(3_000),
      loseMoney(2_000),
      skipTurns(2),
    ),
  },
  {
    id: "chance-034",
    text: "En laktosintolerant papegoja ger dig 10000",
    effect: gainMoney(10_000),
  },
  {
    id: "chance-035",
    text: "Du har fuskat i Gubbspelet. Gå tillbaka 1 steg och betala 1000. Hoppas du skärper dig i framtiden",
    effect: sequence(movePlayerAndOthers(-1, 0), loseMoney(1_000)),
  },
  {
    id: "chance-036",
    text: "Du får skjuts. Om du slår 1-4 krockar ni och måste gå till bilverksta. Om du slår 5-6 får du gå 10 steg framåt.",
    effect: rollForEffect(
      {
        rolls: [1, 2, 3, 4],
        label: "Ni krockade! Åk till Bilverkstan.",
        effect: moveTo(REPAIR_SHOP_TILE_ID),
      },
      {
        rolls: [5, 6],
        label: "Du fick skjuts! Gå 10 steg framåt.",
        effect: moveForward(10),
      },
    ),
  },
  {
    id: "chance-037",
    text: "Då blev det toapaus men du hittar ingen toalett. Betala 7000",
    effect: loseMoney(7_000),
  },
  {
    id: "chance-038",
    text: "Du vill träffa en oxe. Han bor bakom dig. Gå 12 steg bakåt.",
    effect: movePlayerAndOthers(-12, 0),
  },
  {
    id: "chance-039",
    text: "Du hittar ett ruttet äpple. Slår du 1-3 äter du upp det och måste gå till sjukhuset. Annars ger du det till valfri spelare som gör samma sak.",
    effect: rollForEffect(
      {
        rolls: [1, 2, 3],
        label: "Du åt det ruttna äpplet! Åk till Sjukhuset.",
        effect: moveTo(HOSPITAL_TILE_ID),
      },
      {
        rolls: [4, 5, 6],
        label: "Du klarade dig! Ge äpplet till valfri spelare.",
        effect: choosePlayerToPassCard(),
      },
    ),
  },
  {
    id: "chance-040",
    text: "Du vinner över världsmästaren i pingis. Köp vilket aktiebrev du vill av banken för 5000 och knuffa alla andra spelare 4 steg bakåt.",
    effect: chooseBankProperty(5_000, moveOthersBackward(4)),
  },
  {
    id: "chance-041",
    text: "Du glömde borsta tänderna. Åk till Mataffären och köp nya tänder för 5000.",
    effect: sequence(moveToNearestProperty("groceryStore"), loseMoney(5_000)),
  },
  {
    id: "chance-042",
    text: "Kungen ger Erik Hamrén en räkning på 1000. Du firar med att köpa en liten bulle för 20000",
    effect: loseMoney(20_000),
  },
  {
    id: "chance-043",
    text: "Detta verkar vara din lyckodag idag. Du har ärvt 70000 och du får ta valfri aktiebrev av valfri spelare. Om ingen medspelare har ett aktiebrev så tar du 40% av valfri spelares pengar.",
    effect: chooseOpponentPropertyOrMoney(40, gainMoney(70_000)),
  },
  {
    id: "chance-044",
    text: "Du blev spoilad på Twilight. Betala 30000.",
    effect: loseMoney(30_000),
  },
  {
    id: "chance-045",
    text: "En gubbe trodde Uppsala kyrka ligger i Norge. Inkassera 39000 eller slå 2 extra slag",
    effect: choose(
      {
        label: "Inkassera 39 000 kr",
        effect: gainMoney(39_000),
      },
      {
        label: "Slå 2 extra slag",
        effect: extraRolls(2),
      },
    ),
  },

  {
    id: "chance-046",
    text: "En enarmad bandit skjuter dig i benet. Gå till sjukhuset och stanna där tills någon går på Svensk Bank, Chokladfabriken, Spelstudion, Sökmotorn eller Lotteri.",
    effect: hospitalUntilLanding(
      ["bank", "chocolateFactory", "gameStudio", "searchEngine"],
      true,
    ),
  },
  {
    id: "chance-047",
    text: "Du råkar stöta på Erik Hamrén och du säger: Avgå Hamrén. Han sparkar dig 3 steg bakåt.",
    effect: movePlayerAndOthers(-3, 0),
  },
  {
    id: "chance-048",
    text: "Möbelbutiken har blivit dömd för skattefusk. Den som äger Möbelbutiken måste böta 17000.",
    effect: losePropertyOwnerMoney("furnitureStore", 17_000),
  },
  {
    id: "chance-049",
    text: "Du hittar ett pappersflygplan. Kasta den på valfri spelare. Den tar 10% av hans/hennes pengar som du får ta.",
    effect: choosePlayerMoneyPercentage(10),
  },
  {
    id: "chance-050",
    text: "En paddgroda åt upp din tårta. Åk till Chokladfabriken. Ta sedan ett Lotteri.",
    effect: sequence(moveToNearestProperty("chocolateFactory"), drawLottery()),
  },
  {
    id: "chance-051",
    text: "En skalpadda ger dig en räkning på 30000.",
    effect: loseMoney(30_000),
  },
  {
    id: "chance-052",
    text: "Du har glömt att betala räkningen. Betala 5000",
    effect: loseMoney(5_000),
  },
  {
    id: "chance-053",
    text: "Du pruttar när du gör en armhävning. Säg förlåt och stå över ett kast. Gäller ej om du äger Chokladfabriken.",
    effect: unlessOwnsProperty("chocolateFactory", skipTurns(1)),
  },
  {
    id: "chance-054",
    text: "Ta 2 frågekort.",
    effect: drawChanceCards(2),
  },
  {
    id: "chance-055",
    text: "Harry Potter ger Fantomen en räkning på 32000. Den som har mest pengar får hjälpa Fantomen att betala.",
    effect: loseRichestPlayerMoney(32_000),
  },
  {
    id: "chance-056",
    text: "Du hittar en katapult. Använd den på valfri spelare. Den kastar honom eller henne 2 steg bakåt/10000 du har. Avrunda nedåt.",
    effect: choosePlayerMoveByMoney(10_000, -2),
  },
  {
    id: "chance-057",
    text: "Du har vunnit första pris i en odlingstävling. Inkassera 5000 från varje spelare.",
    effect: collectMoneyFromOthers(5_000),
  },
  {
    id: "chance-058",
    text: "Du har vunnit på bingolotto inkassera 20000 grattis",
    effect: gainMoney(20_000),
  },
  {
    id: "chance-059",
    text: "Du hittar en rauk. Du försöker klättra upp till toppen. Om du slår 4-6 lyckas du och inkasserar 30000. Slår du 1-3 ramlar du ned och måste ta dig till sjukhuset.",
    effect: rollForEffect(
      {
        rolls: [4, 5, 6],
        label: "Du lyckades klättra upp! Inkassera 30 000 kr.",
        effect: gainMoney(30_000),
      },
      {
        rolls: [1, 2, 3],
        label: "Du ramlade ned! Åk till Sjukhuset.",
        effect: moveTo(HOSPITAL_TILE_ID),
      },
    ),
  },
  {
    id: "chance-060",
    text: "Du skulle spika upp någons brevlåda men slog dig på tummen. Gå till sjukhuset eller betala 25000. Gäller ej om du äger Mataffären.",
    effect: unlessOwnsProperty(
      "groceryStore",
      choose(
        {
          label: "Åk till Sjukhuset",
          effect: moveTo(HOSPITAL_TILE_ID),
        },
        {
          label: "Betala 25 000 kr",
          effect: loseMoney(25_000),
        },
      ),
    ),
  },
  {
    id: "chance-061",
    text: "En liten pyssling ger alla spelare 20000 per aktiebrev de har. Ägaren av Bilaffären ska gå 1 steg framåt.",
    effect: sequence(
      gainAllMoneyPerProperty(20_000),
      movePropertyOwnerForward("carStore", 1),
    ),
  },
  {
    id: "chance-062",
    text: "Du hittar en cykel. Slår du 1-4 ramlar du och måste kravla dig till sjukhuset. Annars får du cykla 5 steg framåt.",
    effect: rollForEffect(
      {
        rolls: [1, 2, 3, 4],
        label: "Du ramlade! Åk till Sjukhuset.",
        effect: moveTo(HOSPITAL_TILE_ID),
      },
      {
        rolls: [5, 6],
        label: "Du lyckades! Cykla 5 steg framåt.",
        effect: moveForward(5),
      },
    ),
  },
  {
    id: "chance-063",
    text: "Du äter mellanmål. Slår du 1 så blir du förgiftad och du får ta dig till sjukhuset. Slår du 2-5 så får du slå ett extra kast. Slår du 6 så har du vunnit 100 000 på lotto.",
    effect: rollForEffect(
      {
        rolls: [1],
        label: "Du blev förgiftad! Åk till Sjukhuset.",
        effect: moveTo(HOSPITAL_TILE_ID),
      },
      {
        rolls: [2, 3, 4, 5],
        label: "Du får slå ett extra kast!",
        effect: extraRolls(1),
      },
      {
        rolls: [6],
        label: "Grattis! Du vann 100 000 kr på lotto!",
        effect: gainMoney(100_000),
      },
    ),
  },
  {
    id: "chance-064",
    text: "Du blev biten av spindeln. Åk till sjukhus och ge spindel en utskällning.",
    effect: moveTo(HOSPITAL_TILE_ID),
  },
  {
    id: "chance-065",
    text: "Du vill kolla på film. Köp en film för 10000 och kolla på filmen (stå över 1 kast).",
    effect: sequence(loseMoney(10_000), skipTurns(1)),
  },
  {
    id: "chance-066",
    text: "Du får tävla mot valfri spelare i Sten-Sax-Påse (bäst av 3). Den som vinner får alla ära och inkasserar 30000.",
    effect: chooseRockPaperScissorsOpponent(30_000),
  },
  {
    id: "chance-067",
    text: "Du har stulit en banan från en gorilla. Stå över 2 kast i finkan eller betala 5000.",
    effect: choose(
      {
        label: "Stå över 2 kast i finkan",
        effect: skipTurns(2),
      },
      {
        label: "Betala 5 000 kr",
        effect: loseMoney(5_000),
      },
    ),
  },
  {
    id: "chance-068",
    text: "Du måste betala 1000/aktiebrev du har. Det är för lite. Betala 5000/aktiebrev",
    effect: payPerOwnedProperty(5_000),
  },

  {
    id: "chance-069",
    text: "En katt tycker det är kallt ute. Slå 4 extra slag eller köp Mataffären för 5000 om Banken äger Mataffären. Bilaffärens ägare ska gå 1 steg framåt.",
    effect: choose(
      {
        label: "Slå 4 extra slag",
        effect: sequence(
          movePropertyOwnerForward("carStore", 1),
          extraRolls(4),
        ),
      },
      {
        label: "Köp Mataffären för 5 000 kr",
        effect: sequence(
          buyBankProperty("groceryStore", 5_000),
          movePropertyOwnerForward("carStore", 1),
        ),
      },
    ),
  },
  {
    id: "chance-070",
    text: "Wow! Du träffar kungen. Gå 3 steg fram.",
    effect: moveForward(3),
  },
  {
    id: "chance-071",
    text: "Den som äger Bilaffären ska gå till Start. Sen när det är hans/hennes tur så ska han/hon gå 8 gånger så långt som tärningen visar.",
    effect: resetPropertyOwnerWithMultiplier("carStore", 8),
  },
  {
    id: "chance-072",
    text: "Om du äger minst 2 aktiebrev så inkasserar du 44000. Spelaren till vänster ska gå 1 steg bakåt.",
    effect: sequence(
      gainMoneyIfOwnsEnoughProperties(2, 44_000),
      moveLeftPlayerBackward(1),
    ),
  },
  {
    id: "chance-073",
    text: "En kattunge är hungrig. Åk till närmsta Mataffär och köp torsk för 12000. Om du äger Mataffären så ska du endast betala 3000.",
    effect: ifOwnsProperty(
      "groceryStore",
      loseMoney(3_000),
      sequence(moveToNearestProperty("groceryStore"), loseMoney(12_000)),
    ),
  },
  {
    id: "chance-074",
    text: "Det är kallt ute. Gå framåt till ett lotteri. Ägaren av Bilaffären ska gå 2 steg framåt.",
    effect: sequence(
      moveToNextLottery(),
      movePropertyOwnerForward("carStore", 2),
    ),
  },
  {
    id: "chance-075",
    text: "Du prutta när du var på bio. Be genast om ursäkt och betala 10000 till varje spelare.",
    effect: payAllOtherPlayers(10_000),
  },
  {
    id: "chance-076",
    text: "Det är kallt ute. Om du har mer än 150 000 så får du gå 10 steg framåt. Annars ska spelaren till vänster plocka 2 frågekort.",
    effect: ifMoneyAbove(
      150_000,
      moveForward(10),
      drawLeftPlayerChanceCards(2),
    ),
  },
  {
    id: "chance-077",
    text: "Kungen tycker det är kallt inne. Ta honom till sjukhuset. Sen när det är din tur så ska du addera 7 steg.",
    effect: sequence(moveTo(HOSPITAL_TILE_ID), addNextRollSteps(7)),
  },
  {
    id: "chance-078",
    text: "Du är Sveriges bästa komiker. Inkassera 8000 av varje spelare.",
    effect: collectMoneyFromOthers(8_000),
  },
  {
    id: "chance-079",
    text: "Du är sugen på att spela tvspel. Gå till Spelstudion.",
    effect: moveToNearestProperty("gameStudio"),
  },
  {
    id: "chance-080",
    text: "Du blev så förbanad så då slog igen hela nätet. Gå till Elektronikbutiken och köp en ny dator. Gäller ej om du äger Elektronikbutiken.",
    effect: unlessOwnsProperty(
      "electronicsStore",
      moveToNearestProperty("electronicsStore"),
    ),
  },
  {
    id: "chance-081",
    text: "Du möter en skojare i kubb. Slår du en 1a så förlorar du och måste börja om från Start. Annars vinner du och måste inkassera 15000.",
    effect: rollForEffect(
      {
        rolls: [1],
        label: "Du förlorar! Gå tillbaka till Start.",
        effect: moveTo(START_TILE_ID),
      },
      {
        rolls: [2, 3, 4, 5, 6],
        label: "Du vinner! Inkassera 15 000 kr.",
        effect: gainMoney(15_000),
      },
    ),
  },
  {
    id: "chance-082",
    text: "En tiger vill vara sig själv. Inkassera 42000.",
    effect: gainMoney(42_000),
  },
  {
    id: "chance-083",
    text: "Det är 50% rabatt på IKEA. Gå bakåt till närmsta IKEA och betala endast 3000 i hyra om någon annan spelare äger aktiebrevet. Men om du äger IKEA så får du gå 3 steg åt valfritt håll.",
    effect: ifOwnsProperty(
      "furnitureStore",
      choose(
        {
          label: "Gå 3 steg framåt",
          effect: moveForward(3),
        },
        {
          label: "Gå 3 steg bakåt",
          effect: movePlayerAndOthers(-3, 0),
        },
      ),
      moveBackwardToPropertyWithDiscount("furnitureStore", 3_000),
    ),
  },
  {
    id: "chance-084",
    text: "Sjukhusräkning. Om du varit på sjukhuset minst 1 gång ska du betala 30000.",
    effect: payIfVisitedHospital(30_000),
  },
  {
    id: "chance-085",
    text: "Din pappa missade ett avsnitt i UFC. Betala 23000, har du en son eller dotter så ska du betala 24000.",
    effect: choose(
      {
        label: "Jag har inga barn – betala 23 000 kr",
        effect: loseMoney(23_000),
      },
      {
        label: "Jag har en son eller dotter – betala 24 000 kr",
        effect: loseMoney(24_000),
      },
    ),
  },
  {
    id: "chance-086",
    text: "Du är sugen på choklad. Åk till Chokladfabriken och betala dubbel hyra. Gäller ej om du eller Banken äger Chokladfabriken, isåfall slå Krösus mellan bena.",
    effect: moveToOpponentPropertyWithFee("chocolateFactory", 60_000),
  },
  {
    id: "chance-087",
    text: "Du lagar mat. Stå över 3 kast och ät upp maten.",
    effect: skipTurns(3),
  },
  {
    id: "chance-088",
    text: "En duva sket på din mössa. Om du slår 4-6 ersätts du av en ny. Slår du 1-3 måste du köpa en ny för 4000.",
    effect: rollForEffect(
      {
        rolls: [1, 2, 3],
        label: "Köp en ny mössa för 4 000 kr.",
        effect: loseMoney(4_000),
      },
      {
        rolls: [4, 5, 6],
        label: "Du får en ny mössa gratis!",
        effect: sequence(),
      },
    ),
  },
  {
    id: "chance-089",
    text: "En kattunge svalde en flugsvamp. Gå med kattungen till sjukhuset.",
    effect: moveTo(HOSPITAL_TILE_ID),
  },
  {
    id: "chance-090",
    text: "Ditt batteri på telefonen är slut. Gå tillbaka till Start och hämta laddare. Gäller ej om du äger Elektronikbutiken.",
    effect: unlessOwnsProperty("electronicsStore", moveTo(START_TILE_ID)),
  },
  {
    id: "chance-091",
    text: "Det är storm ute. Slår du 1 måste alla spelare gå till Start. Annars inkasserar alla 10% av sina pengar. Avrunda uppåt till närmaste 1000.",
    effect: rollForEffect(
      {
        rolls: [1],
        label: "Alla spelare går tillbaka till Start!",
        effect: moveAllTo(START_TILE_ID),
      },
      {
        rolls: [2, 3, 4, 5, 6],
        label: "Alla inkasserar 10% av sina pengar!",
        effect: gainAllMoneyPercentage(10, 1_000),
      },
    ),
  },
  {
    id: "chance-092",
    text: "Du fuskar i Idoltävlingen och borde skämmas. Du får dessutom betala 15000 till Banken och gå 2 steg bakåt.",
    effect: sequence(loseMoney(15_000), movePlayerAndOthers(-2, 0)),
  },
  {
    id: "chance-093",
    text: "Å nej! Maten är slut. Gå till närmaste Mataffär.",
    effect: moveToNearestProperty("groceryStore"),
  },

  {
    id: "chance-094",
    text: "Det åskar och en åsna tror det är jordens undergång. Slår du 1-3 går du 15 steg bakåt. Slår du 4-5 går du 15 steg framåt. Slår du 6 går alla spelare utom du 5 steg bakåt medan du går 12 steg framåt.",
    effect: rollForEffect(
      {
        rolls: [1, 2, 3],
        label: "Gå 15 steg bakåt",
        effect: movePlayerAndOthers(-15, 0),
      },
      {
        rolls: [4, 5],
        label: "Gå 15 steg framåt",
        effect: moveForward(15),
      },
      {
        rolls: [6],
        label: "Du går 12 steg framåt, alla andra går 5 steg bakåt",
        effect: movePlayerAndOthers(12, -5),
      },
    ),
  },
  {
    id: "chance-095",
    text: "Du jagar en kattunge upp i ett träd. Betala 5000 för en ny motorsåg.",
    effect: loseMoney(5_000),
  },
  {
    id: "chance-096",
    text: "Du hittar en rauk. Du försöker klättra upp till toppen. Slå 2 tärningar. Får du 2 sexor lyckas du och inkasserar 275 000. Annars ska du ta dig till Bilverksta. Sedan ska alla spelare gå 1 steg framåt/aktiebrev man har.",
    effect: rollTwoDiceForEffect(
      {
        rolls: [12],
        label: "Två sexor! Inkassera 275 000 kr.",
        effect: sequence(gainMoney(275_000), moveAllForwardPerProperty(1)),
      },
      {
        rolls: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
        label: "Du lyckades inte! Åk till Bilverkstan.",
        effect: sequence(
          moveTo(REPAIR_SHOP_TILE_ID),
          moveAllForwardPerProperty(1),
        ),
      },
    ),
  },
  {
    id: "chance-097",
    text: "Slå 2 tärningar. Multiplicera antalet prickar, så många tusen ska du betala till valfri spelare.",
    effect: rollTwoDiceProductForEffect(
      ...[1, 2, 3, 4, 5, 6, 8, 9, 10, 12, 15, 16, 18, 20, 24, 25, 30, 36].map(
        (product) => ({
          rolls: [product],

          label:
            "Betala " +
            (product * 1_000).toLocaleString("sv-SE") +
            " kr till valfri spelare.",

          effect: choosePlayerToPay(product * 1_000),
        }),
      ),
    ),
  },
  {
    id: "chance-098",
    text: "Du får en tråkig bok i julklapp. Stå över 3 kast och läs boken.",
    effect: skipTurns(3),
  },
  {
    id: "chance-099",
    text: "Du möter 2 gamla gubbar i basket. Slår du 1 så förlorar du och alla ska gå till Start. Slår du 2-4 blir det lika och inget händer. Slår du 5-6 så vann du med 5-2 och alla spelare inkasserar 25000. Ta sedan ett lotteri.",
    effect: rollForEffect(
      {
        rolls: [1],
        label: "Du förlorar! Alla går till Start.",
        effect: sequence(moveAllTo(START_TILE_ID), drawLottery()),
      },
      {
        rolls: [2, 3, 4],
        label: "Oavgjort! Inget händer.",
        effect: drawLottery(),
      },
      {
        rolls: [5, 6],
        label: "Du vinner med 5-2! Alla inkasserar 25 000 kr.",
        effect: sequence(gainAllMoney(25_000), drawLottery()),
      },
    ),
  },
  {
    id: "chance-100",
    text: "Det är kallt ute. Välj mellan att ta ett lotteri eller ta 5000 av varje spelare eller gå 3 steg framåt. Gäller ej om du har mer än 120 000 pengar.",
    effect: ifMoneyAbove(
      120_000,
      sequence(),
      choose(
        {
          label: "Ta ett Lotteri",
          effect: drawLottery(),
        },
        {
          label: "Ta 5 000 kr av varje spelare",
          effect: collectMoneyFromOthers(5_000),
        },
        {
          label: "Gå 3 steg framåt",
          effect: moveForward(3),
        },
      ),
    ),
  },
  {
    id: "chance-101",
    text: "Du blir jagad av en norsk skidåkare. Gå ett varv runt ett bord eller betala 20000 till varje spelare.",
    effect: choose(
      {
        label: "Jag har gått ett varv runt ett bord",
        effect: sequence(),
      },
      {
        label: "Betala 20 000 kr till varje spelare",
        effect: payAllOtherPlayers(20_000),
      },
    ),
  },
  {
    id: "chance-102",
    text: "En kattunge avskyr Gubbspelet, en annan kattunge är vaken. Du får gå 5 steg framåt eller ta 20000 av valfri spelare.",
    effect: choose(
      {
        label: "Gå 5 steg framåt",
        effect: moveForward(5),
      },
      {
        label: "Ta 20 000 kr av valfri spelare",
        effect: choosePlayerToTakeMoney(20_000),
      },
    ),
  },

  {
    id: "chance-103",
    text: "Den som har mest pengar ska möta den som har minst pengar i sten-sax-påse. Bäst av en! Vinnaren får 10000 av Banken.",
    effect: rockPaperScissorsRichestVsPoorest(10_000),
  },
  {
    id: "chance-104",
    text: "Om du är 10 steg eller närmare Mål så måste du gå till Start. Annars får du slå 3 extra kast men bara gå om det blir udda. Ta sedan ett lotteri.",
    effect: sequence(
      ifNearFinish(10, moveTo(START_TILE_ID), extraOddRolls(3)),
      drawLottery(),
    ),
  },
  {
    id: "chance-105",
    text: "Plocka upp ett frågekort. Handlar det om katter eller hundar så inkasserar du 61000. Handlar det om en gubbe så får du backa 8 steg. Handlar det om en papegoja så ska alla gå till sjukhuset. Du måste också göra det som står på kortet.",
    effect: drawThemedChanceCard(),
  },
  {
    id: "chance-106",
    text: "Hunden springer snabbare än tåget. Inkassera 5000/prick på tärningen (slå igen).",
    effect: rollForEffect(
      ...[1, 2, 3, 4, 5, 6].map((roll) => ({
        rolls: [roll],
        label: "Inkassera " + (roll * 5_000).toLocaleString("sv-SE") + " kr!",
        effect: gainMoney(roll * 5_000),
      })),
    ),
  },
  {
    id: "chance-107",
    text: "Du gav Erik Löfven en räkning på 30000. Inkassera 30000.",
    effect: gainMoney(30_000),
  },
  {
    id: "chance-108",
    text: "Du jagar din egen skugga. Gå 4 steg mot sjukhuset.",
    effect: moveTowardsTile(HOSPITAL_TILE_ID, 4),
  },
  {
    id: "chance-109",
    text: "En ny uppdatering har kommit till iphone. Stå över 1 kast om du spelar på en iphone.",
    effect: ifIPhone(skipTurns(1)),
  },
  {
    id: "chance-110",
    text: "Du glömde din mobil på bussen. Gå 5 steg mot närmaste busshållplats. Gäller ej om du äger Elektronikbutiken.",
    effect: unlessOwnsProperty("electronicsStore", moveTowardsNearestBus(5)),
  },
  {
    id: "chance-111",
    text: "En snabeltandad tiger blåser alla spelare 10 steg bakåt. Gäller ej de som inte har något aktiebrev.",
    effect: movePropertyOwnersBackward(10),
  },
  {
    id: "chance-112",
    text: "Du vill äta köttbullar. Åk till Möbelbutiken och köp en ny tallrik för 5000.",
    effect: sequence(moveToNearestProperty("furnitureStore"), loseMoney(5_000)),
  },
  {
    id: "chance-113",
    text: "En katt tycker det är kallt ute. Gå 3 steg mot spelaren till vänster. Om du passerar spelaren med dem 3 stegen så stå på samma ruta som denne och dra 1 frågekort.",
    effect: moveTowardsLeftPlayer(3, 1),
  },
  {
    id: "chance-114",
    text: "Det är storm ute. Alla ska betala 10% av sina pengar till banken.",
    effect: loseAllMoneyPercentage(10),
  },
  {
    id: "chance-115",
    text: "Det blir strömavbrott. Du ser inget och råkar gå 7 steg bakåt.",
    effect: movePlayerAndOthers(-7, 0),
  },
  {
    id: "chance-116",
    text: "Du dricker 25 liter vatten och blir full. Spelaren till vänster får ta dig till sjukhuset.",
    effect: movePlayerAndLeftPlayerTo(HOSPITAL_TILE_ID),
  },
  {
    id: "chance-117",
    text: "Du hittar en magnet. Rikta den mot valfri spelare. Den tar 20% av hans/hennes pengar. Du får pengarna.",
    effect: choosePlayerMoneyPercentage(20),
  },
  {
    id: "chance-118",
    text: "En populär sportbutik går konken. Den som äger Sportbutiken inkasserar 25000. Bilaffärens ägare ska gå 5 steg bakåt.",
    effect: sequence(
      gainPropertyOwnerMoney("sportsStore", 25_000),
      movePropertyOwnerBackward("carStore", 5),
    ),
  },
  {
    id: "chance-119",
    text: 'Spelstudion går i konkurs. Den som äger Spelstudion ska lämna tillbaka aktiebrevet till Banken och säga "Avgå Hamrén".',
    effect: requestReturnProperty("gameStudio", "Avgå Hamrén"),
  },

  {
    id: "chance-120",
    text: "Du har fått en böteslapp av en rauk. Ge 10000 kronor till banken.",
    effect: loseMoney(10_000),
  },
  {
    id: "chance-121",
    text: "Någon vill göra en hot deal. Inkassera 32000 om du inte äger Bilaffären. Äger du Bilaffären ska du gå 8 steg mot sjukhuset.",
    effect: ifOwnsProperty(
      "carStore",
      moveTowardsTile(HOSPITAL_TILE_ID, 8),
      gainMoney(32_000),
    ),
  },
  {
    id: "chance-122",
    text: "Din dator har fått virus. Åk till Elektronikbutiken och betala 3 gånger mer hyra. Gäller ej om du äger Elektronikbutiken.",
    effect: moveToOpponentPropertyWithFee("electronicsStore", 21_000),
  },
  {
    id: "chance-123",
    text: "Drottningen får löneförhöjning. Inkassera eller betala pengar så du har exakt 47000. Ta sedan ett lotteri.",
    effect: sequence(setMoney(47_000), drawLottery()),
  },
  {
    id: "chance-124",
    text: "En tiger sket på dina skor. Betala 5000 till Sportbutikens ägare. Gäller ej om du eller banken äger Sportbutiken.",
    effect: payPropertyOwner("sportsStore", 5_000),
  },
  {
    id: "chance-125",
    text: "Du åt upp en foppatoffel. Åk till sjukhuset.",
    effect: moveTo(HOSPITAL_TILE_ID),
  },
  {
    id: "chance-126",
    text: "Betala spelaren till vänster 18000 för att han eller hon hjälpte dig med att köpa ett träd.",
    effect: payLeftPlayer(18_000),
  },
  {
    id: "chance-127",
    text: "Köp en plastsax för 14000.",
    effect: loseMoney(14_000),
  },
  {
    id: "chance-128",
    text: "En dansk bank går i konkurs. Svensk Bank är enda banken. Ägaren till Svensk Bank får ta 20% av allas pengar.",
    effect: propertyOwnerCollectPercentage("bank", 20),
  },
  {
    id: "chance-129",
    text: "Bråk med banken. Om du slår 1 måste alla spelare ge tillbaka sina aktiebrev. Annars är bråket löst och alla spelare inkasserar 20000.",
    effect: rollForEffect(
      {
        rolls: [1],
        label: "Alla lämnar tillbaka sina aktiebrev till Banken!",
        effect: returnAllPropertiesToBank(),
      },
      {
        rolls: [2, 3, 4, 5, 6],
        label: "Bråket är löst! Alla inkasserar 20 000 kr.",
        effect: gainAllMoney(20_000),
      },
    ),
  },
  {
    id: "chance-130",
    text: "En surikat gav dig en örfil. Slår du 1-2 slår du tillbaka och inkasserar 28000. Annars ska du gå till sjukhuset.",
    effect: rollForEffect(
      {
        rolls: [1, 2],
        label: "Inkassera 28 000 kr!",
        effect: gainMoney(28_000),
      },
      {
        rolls: [3, 4, 5, 6],
        label: "Åk till Sjukhuset!",
        effect: moveTo(HOSPITAL_TILE_ID),
      },
    ),
  },
  {
    id: "chance-131",
    text: "Du köpte nya fotbollsspelet men det var ett dåligt spel. Betala 10000 till Elektronikbutikens ägare för en ny handkontroll.",
    effect: payPropertyOwner("electronicsStore", 10_000),
  },
  {
    id: "chance-132",
    text: "En katt flyger luftballong. Inkassera 5000 och gå 2 steg bakåt.",
    effect: sequence(gainMoney(5_000), movePlayerAndOthers(-2, 0)),
  },
  {
    id: "chance-133",
    text: "En gubbe tar på sig babypants. Inkassera 37000 eller gå 2 steg bakåt.",
    effect: choose(
      {
        label: "Inkassera 37 000 kr",
        effect: gainMoney(37_000),
      },
      {
        label: "Gå 2 steg bakåt",
        effect: movePlayerAndOthers(-2, 0),
      },
    ),
  },
  {
    id: "chance-134",
    text: "En kattunge gjorde sönder en lampa. Alla ska betala 5000 till Möbelbutikens ägare.",
    effect: propertyOwnerCollectFromAll("furnitureStore", 5_000),
  },
  {
    id: "chance-135",
    text: "Fy skäms! Du har varit väldigt olydig idag. Gå 7 steg bakåt och ge 20000 till medspelarn till höger. SKÄRP DIG :(",
    effect: sequence(movePlayerAndOthers(-7, 0), payRightPlayer(20_000)),
  },
  {
    id: "chance-136",
    text: "Du hittar en hink med lera. Kasta hinken på valfri spelare. Han/hon måste betala dig 25000.",
    effect: choosePlayerToTakeMoney(25_000),
  },
  {
    id: "chance-137",
    text: "Du vinner 20000 på en trisslott. Inkassera 15000. Gäller ej gorillor.",
    effect: gainMoney(15_000),
  },
  {
    id: "chance-138",
    text: "Ånej! Du har tappat hemnycklarna du, du måste sova ute. Stå över ett kast.",
    effect: skipTurns(1),
  },
  {
    id: "chance-139",
    text: "Vikingen Hagbard ger en gubbe 80000. En gubbe delar med sig och ger 5000 till varje spelare. Gäller ej de som står på bilverkstaD.",
    effect: payAllOtherPlayersExceptTile(5_000, REPAIR_SHOP_TILE_ID),
  },
  {
    id: "chance-140",
    text: "Din foppatoffel rymmer. Åk till Sportbutiken och köp nya för 8000.",
    effect: sequence(moveToNearestProperty("sportsStore"), loseMoney(8_000)),
  },
  {
    id: "chance-141",
    text: "Nu är det tokbilligt på Elektronikbutiken. Alla ska gå till närmaste Elektronikbutik och bara betala 2000 i hyra. Gäller ej om ingen äger Elektronikbutiken.",
    effect: moveAllToNearestPropertyWithFee("electronicsStore", 2_000),
  },
  {
    id: "chance-142",
    text: "Du råkar kasta en snorkråka på en astronaut. Ge astronauten 4000 som ursäkt för att du kasta en snorkråka på en astronaut.",
    effect: loseMoney(4_000),
  },
  {
    id: "chance-143",
    text: "Svensk Bank går i konkurs. Aktiebrevet lämnas tillbaka till banken.",
    effect: returnOwnedPropertyToBank("bank"),
  },
  {
    id: "chance-144",
    text: "En hund gräver en grop som du ramlar i. Stå över 2 kast och torka bort all sand du fick i håret.",
    effect: skipTurns(2),
  },
  {
    id: "chance-145",
    text: "Du tar en paus. Gå till närmaste Spelstudio.",
    effect: moveToNearestProperty("gameStudio"),
  },
  {
    id: "chance-146",
    text: "Sverige vann över Finland i ishockey. Alla spelare som hejar på Sverige inkasserar 22000.",
    effect: rewardSwedenSupporters(22_000),
  },
  {
    id: "chance-147",
    text: "Ditt hus har brunnit upp. Betala 30000 eller stå över 3 kast.",
    effect: choose(
      {
        label: "Betala 30 000 kr",
        effect: loseMoney(30_000),
      },
      {
        label: "Stå över 3 kast",
        effect: skipTurns(3),
      },
    ),
  },
  {
    id: "chance-148",
    text: "Du brände middagskorven. Åk till närmaste Mataffär och köp en ny för 5000. Gäller ej om du äger Mataffären.",
    effect: unlessOwnsProperty(
      "groceryStore",
      sequence(moveToNearestProperty("groceryStore"), loseMoney(5_000)),
    ),
  },
  {
    id: "chance-149",
    text: "Du spelar på lotteri. Om du slår en 6a så får du 150 000. Annars ska du betala 10000.",
    effect: rollForEffect(
      {
        rolls: [6],
        label: "Inkassera 150 000 kr!",
        effect: gainMoney(150_000),
      },
      {
        rolls: [1, 2, 3, 4, 5],
        label: "Betala 10 000 kr till Banken!",
        effect: loseMoney(10_000),
      },
    ),
  },
  {
    id: "chance-150",
    text: "Du råka krocka med spelaren till vänster. Ställ dig på hans/hennes ruta och ge honom/henne 5000.",
    effect: sequence(moveToLeftPlayer(), payLeftPlayer(5_000)),
  },
  {
    id: "chance-151",
    text: "Krösus sork äter en rutten banan. Ta Krösus till sjukhuset och inkassera 1000.",
    effect: sequence(moveTo(HOSPITAL_TILE_ID), gainMoney(1_000)),
  },
  {
    id: "chance-152",
    text: "Du har namnsdag idag. Ta valfritt aktiebrev av valfri spelare. Äger ingen motståndare ett aktiebrev så ska alla utom du gå till start.",
    effect: chooseOpponentPropertyOrReset(),
  },
  {
    id: "chance-153",
    text: "Du gick in i en björk. Stå över ett kast.",
    effect: skipTurns(1),
  },
  {
    id: "chance-154",
    text: "Brummelisa vinner nobelpriset. Nyp dig själv 3 gånger i armen för att kolla om du drömmer.",
    effect: sequence(),
  },
  {
    id: "chance-155",
    text: "En hund jagar en katt. Inkassera 10000 eller dra 3 frågekort.",
    effect: choose(
      {
        label: "Inkassera 10 000 kr",
        effect: gainMoney(10_000),
      },
      {
        label: "Dra 3 frågekort",
        effect: drawChanceCards(3),
      },
    ),
  },
  {
    id: "chance-156",
    text: "Erik Hamrén ger dig en räkning på 10000.",
    effect: loseMoney(10_000),
  },
  {
    id: "chance-157",
    text: "Du har fått en böteslapp av en rauk. Betala 30000 till banken.",
    effect: loseMoney(30_000),
  },
  {
    id: "chance-158",
    text: "En gubbe fyller år. Äger du alla dessa: Bilaffären, Mataffären, Möbelbutiken, så får du 300 000. Annars ska du ta kungens bil till bilverkstad och betala 10000.",
    effect: ifOwnsProperty(
      "carStore",
      ifOwnsProperty(
        "groceryStore",
        ifOwnsProperty(
          "furnitureStore",
          gainMoney(300_000),
          sequence(moveTo(REPAIR_SHOP_TILE_ID), loseMoney(10_000)),
        ),
        sequence(moveTo(REPAIR_SHOP_TILE_ID), loseMoney(10_000)),
      ),
      sequence(moveTo(REPAIR_SHOP_TILE_ID), loseMoney(10_000)),
    ),
  },
  {
    id: "chance-159",
    text: "Å nej! En gorilla tar 1 av dina aktiebrev och ger den till banken. Gäller ej om du inte har något aktiebrev.",
    effect: returnRandomPropertyToBank(),
  },
  {
    id: "chance-160",
    text: "Nu säljs det godis för dubbla priset. Alla ska betala 10000 till ägaren av Mataffären. Gäller ej om ingen äger Mataffären.",
    effect: propertyOwnerCollectFromAll("groceryStore", 10_000),
  },
  {
    id: "chance-161",
    text: "Ta din hyrbil till bilverksta. Ta sedan ett frågekort och ett lotteri.",
    effect: sequence(
      moveTo(REPAIR_SHOP_TILE_ID),
      drawChanceCards(1),
      drawLottery(),
    ),
  },
  {
    id: "chance-162",
    text: "Stefan svetsar ihop en ny grundlag. Den går inte igenom riksdagen. Gå 5 steg framåt medan Sverige står still.",
    effect: moveForward(5),
  },
  {
    id: "chance-163",
    text: "En gubbe fyller år idag. Köp ett par baby-pants för 30000 till honom.",
    effect: loseMoney(30_000),
  },
  {
    id: "chance-164",
    text: "Du är sugen på skräpmat gå till närmaste Hamburgerrestaurang.",
    effect: moveToNearestProperty("burgerRestaurant"),
  },
  {
    id: "chance-165",
    text: "Ta nytt frågekort. Inkassera dessutom 2000/aktiebrev som ej är köpta ännu.",
    effect: sequence(drawChanceCards(1), gainMoneyPerUnownedProperty(2_000)),
  },
  {
    id: "chance-166",
    text: "Du sökte till Idol och fick en guldbiljett. Sälj den till en polis för 30000.",
    effect: gainMoney(30_000),
  },
  {
    id: "chance-167",
    text: "Du spelar monopol. Slå tärningen och gå bakåt. Ta sedan ett lotteri och inkassera 8000.",
    effect: rollForEffect(
      ...[1, 2, 3, 4, 5, 6].map((roll) => ({
        rolls: [roll],
        label:
          "Gå " + roll + " steg bakåt, ta ett lotteri och inkassera 8 000 kr!",
        effect: sequence(
          movePlayerAndOthers(-roll, 0),
          drawLottery(),
          gainMoney(8_000),
        ),
      })),
    ),
  },
  {
    id: "chance-168",
    text: "Du hittar en blomma som ser ut som en särskild sportkommentator. Stampa på den och gå 4 steg framåt.",
    effect: moveForward(4),
  },
  {
    id: "chance-169",
    text: "Du har fuskat i Gubbspelet. Betala 25% av dina pengar till ägaren av Bilaffären. Om banken äger Bilaffären betala till banken. Gäller ej om du äger Bilaffären.",
    effect: payPropertyOwnerPercentage("carStore", 25),
  },
  {
    id: "chance-170",
    text: "Din sko är trasig. Gå till bilverksta.",
    effect: moveTo(REPAIR_SHOP_TILE_ID),
  },
  {
    id: "chance-171",
    text: "Du har ätit upp all bearnaisesås. Åk till Mataffären och köp för 5000. Gäller ej om du äger Mataffären.",
    effect: unlessOwnsProperty(
      "groceryStore",
      sequence(moveToNearestProperty("groceryStore"), loseMoney(5_000)),
    ),
  },
  {
    id: "chance-172",
    text: "Slå 2 tärningar. Om båda visar 6 så har du vunnit spelet. Om båda visar 1 så ska du lämna ifrån dig alla pengar och aktiebrev och börja om från start. Annars går du bara antalet steg bakåt.",
    effect: rollTwoDiceForEffect(
      {
        rolls: [12],
        label: "Två sexor! Du har vunnit Gubbspelet!",
        effect: winGame(),
      },
      {
        rolls: [2],
        label:
          "Två ettor! Förlora alla pengar och aktiebrev och börja om från Start!",
        effect: loseEverythingAndRestart(),
      },
      ...[3, 4, 5, 6, 7, 8, 9, 10, 11].map((roll) => ({
        rolls: [roll],
        label: "Gå " + roll + " steg bakåt!",
        effect: movePlayerAndOthers(-roll, 0),
      })),
    ),
  },
  {
    id: "chance-173",
    text: "Plocka ett frågekort. Om det står att man ska betala till banken, betala 2 gånger så mycket. Ska man inkassera så får du ta ett lotteri om du vill.",
    effect: drawBankModifiedChance(),
  },
  {
    id: "chance-174",
    text: "Krösus somnar när han äter pannkakor. Inkassera 10000.",
    effect: gainMoney(10_000),
  },

  {
    id: "chance-175",
    text: "Spelaren längst bak ska gå 7 steg framåt och spelaren längst fram ska gå 7 steg bakåt. Gäller ej om 2 eller flera personer är längst fram/bak, isåfall ta nytt frågekort.",
    effect: moveFirstAndLast(7),
  },
  {
    id: "chance-176",
    text: "Wow du träffar en kattunge, gå 3 steg framåt",
    effect: moveForward(3),
  },
  {
    id: "chance-177",
    text: "Tävla mot valfri spelare i sten-sax-påse (bäst av 3). Vinnaren får ta valfritt av motståndarens aktiebrev eller 20000.",
    effect: chooseRockPaperScissorsOpponent(20_000, true),
  },
  {
    id: "chance-178",
    text: "Du vinner OS i pingis. Inkassera 79000. Gäller ej om du äger både Mataffären och Möbelbutiken.",
    effect: ifOwnsProperty(
      "groceryStore",
      unlessOwnsProperty("furnitureStore", gainMoney(79_000)),
      gainMoney(79_000),
    ),
  },
  {
    id: "chance-179",
    text: "Vägen är avspärrad. Stå över 2 kast",
    effect: skipTurns(2),
  },
  {
    id: "chance-180",
    text: "Du köper en vattenpistol för 1000. Skjut på valfri spelare. Han eller hon måste betala dig 5000.",
    effect: choosePlayerToTakeMoney(5_000),
  },
  {
    id: "chance-181",
    text: "En katt tycker det är kallt ute. Ägaren av Bilaffären ska betala 3000 för varje aktiebrev spelaren till vänster om honom har. Gäller ej Kungen",
    effect: propertyOwnerPayPerLeftProperty("carStore", 3_000),
  },
  {
    id: "chance-182",
    text: "Du har en gubbe på Island. Välj mellan om alla ska inkassera 10000 eller betala 10000",
    effect: choose(
      {
        label: "Alla inkasserar 10 000 kr",
        effect: gainAllMoney(10_000),
      },
      {
        label: "Alla betalar 10 000 kr",
        effect: loseAllMoney(10_000),
      },
    ),
  },
  {
    id: "chance-183",
    text: "En trollkarl vid namn Dumbledore trollar dig framåt till det närmsta lotteriet. Om det inte finns något lotteri framför dig tar du ett frågekort",
    effect: moveToNextLottery(true),
  },
  {
    id: "chance-184",
    text: "Gå till ett lotteri",
    effect: moveToNearestLottery(),
  },

  {
    id: "chance-185",
    text: "Slå tärningen och gå bakåt. Om du hamnar på frågekort så ska du ta 2 frågekort. Hamnar du på aktiebrev så får du ta den oavsett om banken eller en annan spelare äger den. Hamnar du på lotteri så går du 15 steg framåt utan att ta ett lotteri.",
    effect: rollForEffect(
      ...[1, 2, 3, 4, 5, 6].map((roll) => ({
        rolls: [roll],
        label: "Gå " + roll + " steg bakåt med specialregler!",
        effect: moveBackwardWithSpecialLanding(roll),
      })),
    ),
  },
  {
    id: "chance-186",
    text: "En bakterie blev träffad av en meteorit. Ta bakterien till sjukhuset och betala 5000/aktiebrev du har",
    effect: sequence(moveTo(HOSPITAL_TILE_ID), payPerOwnedProperty(5_000)),
  },

  {
    id: "chance-187",
    text: "Jag är ledsen men du blir av med 50% av dina pengar och du får stå över 1 kast.",
    effect: sequence(loseMoneyPercentage(50), skipTurns(1)),
  },
  {
    id: "chance-188",
    text: "Lille Skutt stjäl dina spelmarker. Lämna tillbaka alla pengar till banken eller följ med Lille Skutt till sjukhuset",
    effect: choose(
      {
        label: "Lämna tillbaka alla pengar",
        effect: loseMoneyPercentage(100),
      },
      {
        label: "Följ med Lille Skutt till Sjukhuset",
        effect: moveTo(HOSPITAL_TILE_ID),
      },
    ),
  },
  {
    id: "chance-189",
    text: "Ge 20000 till spelaren till vänster och 1 aktiebrev till spelaren till höger. Har du inget aktiebrev så ger du 20000 istället",
    effect: sequence(payLeftPlayer(20_000), givePropertyToRightPlayer(20_000)),
  },
  {
    id: "chance-190",
    text: "Du spelar poker. Inkassera 10000 per prick på tärningen. Du får alltså slå igen",
    effect: rollForEffect(
      ...[1, 2, 3, 4, 5, 6].map((roll) => ({
        rolls: [roll],
        label: "Inkassera " + (roll * 10_000).toLocaleString("sv-SE") + " kr",
        effect: gainMoney(roll * 10_000),
      })),
    ),
  },
  {
    id: "chance-191",
    text: "Då råka stöta på en gubbe. Betala 30000",
    effect: loseMoney(30_000),
  },
  {
    id: "chance-192",
    text: "Du försöker klappa en söt kattunge. Slår du 1-4 så springer kattungen 30km/h ifrån dig, och du behöver stå över 1 kast och hämta andan. Slår du 5-6 så vinner Hammarby med 3-0 och du inkasserar 30000. Spelaren till vänster ska gå till sjukhuset.",
    effect: rollForEffect(
      {
        rolls: [1, 2, 3, 4],
        label: "Stå över 1 kast",
        effect: sequence(skipTurns(1), moveLeftPlayerTo(HOSPITAL_TILE_ID)),
      },
      {
        rolls: [5, 6],
        label: "Inkassera 30 000 kr",
        effect: sequence(gainMoney(30_000), moveLeftPlayerTo(HOSPITAL_TILE_ID)),
      },
    ),
  },
  {
    id: "chance-193",
    text: "Du sa något roligt, inkassera 9000.",
    effect: gainMoney(9_000),
  },
  {
    id: "chance-194",
    text: "Du snor Krösus sorks hatt. Betala 40000 i skadestånd. Gäller ej om du har mellan 20000 och 50000 pengar, isåfall vinner du 10000 på lotto medans ägaren av Mataffären ska byta plats med ägaren av Möbelbutiken. Ägaren av Bilaffären ska betala 1000.",
    effect: sequence(
      ifMoneyAbove(
        19_999,
        ifMoneyAbove(
          50_000,
          loseMoney(40_000),
          sequence(
            gainMoney(10_000),
            swapPropertyOwnersPositions("groceryStore", "furnitureStore"),
          ),
        ),
        loseMoney(40_000),
      ),
      losePropertyOwnerMoney("carStore", 1_000),
    ),
  },
  {
    id: "chance-195",
    text: "Du åt upp din vänstra medspelares godis när du va på bio. Be genast om ursäkt och ge honom eller henne 35000.",
    effect: payLeftPlayer(35_000),
  },
  {
    id: "chance-196",
    text: "Du blandar ihop tandborsten med toaborsten. Köp en parfym för 7000.",
    effect: loseMoney(7_000),
  },
  {
    id: "chance-197",
    text: "Du tappar ditt sunda förnuft. Inkassera 20000.",
    effect: gainMoney(20_000),
  },
  {
    id: "chance-198",
    text: "Du tappar tvålen i duschen. Ta upp den igen och inkassera 6000.",
    effect: gainMoney(6_000),
  },
  {
    id: "chance-199",
    text: "Du hjälper Messi att göra mål. Betala 5000 och gå 1 steg fram.",
    effect: sequence(loseMoney(5_000), moveForward(1)),
  },
  {
    id: "chance-200",
    text: "Du är en minnesexpert, inkassera 10000.",
    effect: gainMoney(10_000),
  },
  {
    id: "chance-201",
    text: "En gubbe snubblar över en grå katt och hamnar i fängelse. Gå till start och hämta en gubbe som har hamnat i fängelse",
    effect: moveTo(START_TILE_ID),
  },
  {
    id: "chance-202",
    text: "Du var med på en björns konsert. Du bröt tån. Gå till närmaste sjukhus.",
    effect: moveTo(HOSPITAL_TILE_ID),
  },
  {
    id: "chance-203",
    text: "En gubbe försvinner spårlöst. Inkassera 10000.",
    effect: gainMoney(10_000),
  },
  {
    id: "chance-204",
    text: "Du blir nekad på tårta på Mataffärens 100-årsfirande. Gå hem och sticka en offerkofta, stå över 2 kast.",
    effect: skipTurns(2),
  },
  {
    id: "chance-205",
    text: "Polisen kommer och stoppar dig, välj mellan att böta 5000 eller 7000. Men om spelaren till vänster är rikare än dig så får han eller hon välja.",
    effect: {
      type: "policeFineChoice",
    },
  },

  {
    id: "chance-206",
    text: "Det är skyttetävling. En gubbe kommer med boulekloten. Gubben får 100 skott på sig att träffa en ladugårdsvägg inifrån. Missar. Inkassera 5000 och skratta magen ur led.",
    effect: gainMoney(5_000),
  },
  {
    id: "chance-207",
    text: "Du möter Donald Trump och en björn i pingis. Slår du 1 så inkasserar du 7000 men måste betala 2000, såvida inte du är spelaren som står längst fram eller längst bak, isåfall betala spelaren till vänster 4000 för han eller hon har hjälpt dig gå på toa. Slår du 2 så inkasserar du 12000 och får slå om. Slår du 3 så ska alla som inte heter player gå 4 steg bakåt, förutom dom som har mer än 30000, dom ska gå framåt såvida dom inte äger Bilaffären eller Flygbolaget. Slår du 4 så gör du samma sak som när du slog 3, fast inkassera även 4000. Slår du 5 så är en söt kattunge hungrig och spelaren till vänster måste betala 27000 såvida inte den rikaste spelaren äger Svensk Bank, isåfall gills 5an som en 2a istället. Slår du 6 så händer samma sak som 2an, fast spelaren som äger Mataffären måste gå 1 steg bakåt, betala 1000 och gå ett varv runt bordet. Men äger Mataffären-ägaren också Bilaffären så gills 6an som en 2a, men måste säga ‘Köttbit’. Slår du 7 så har du vunnit spelet.",
    effect: rollForEffect(
      ...[1, 2, 3, 4, 5, 6].map((roll) => ({
        rolls: [roll],
        label: "Resultat " + roll,
        effect: {
          type: "pingPongChaosOutcome",
          roll,
        } as ChanceEffect,
      })),
    ),
  },

  {
    id: "chance-208",
    text: "Lasse går vilse i sin egen trädgård. Om du följer med Lost People och letar efter honom får du böta 10000. Annars gå 1 steg fram.",
    effect: choose(
      {
        label: "Hjälp Lost People – betala 10 000 kr",
        effect: loseMoney(10_000),
      },
      {
        label: "Fortsätt – gå 1 steg fram",
        effect: moveForward(1),
      },
    ),
  },
  {
    id: "chance-209",
    text: "Efter en fest får du svårt att se. Gå till närmaste Svensk Bank och ta ett lån på 10000 för att korrigera din syn.",
    effect: sequence(
      moveToNearestProperty("bank"),
      takeLoan(10_000, 10_000, 10_000, "bank"),
    ),
  },
  {
    id: "chance-210",
    text: "Du tycker allt är JOBBIGT. Ta en paus och stå över 3 kast. Spelaren till höger ska gå till Svensk Bank närmast Start.",
    effect: sequence(skipTurns(3), moveRightPlayerTo("r2-6")),
  },
  {
    id: "chance-211",
    text: "Du är med i Vem Vet Mest men klarar ingen fråga och åker ut direkt. Köp en 2-veckors semester till Turkiet för SMS-lån. När räntan och återbetalning skall ske går du i personlig konkurs och blir utesluten ur spelet. Men om spelaren efter dig slår 2-6 så kommer du tillbaka in i spelet, men endast med 20000.",
    effect: {
      type: "temporaryBankruptcy",
    },
  },
  {
    id: "chance-212",
    text: "Du hittar en tusenlapp på stan, inkassera 1000.",
    effect: gainMoney(1_000),
  },
  {
    id: "chance-213",
    text: "Du vill ge en varg en rejäl omgång. Betala 20000 eftersom du inte lyckades.",
    effect: loseMoney(20_000),
  },
  {
    id: "chance-214",
    text: "Spelaren till vänster vet inte vilket år det är. Du lurar i han eller hon att det är 1563, vilket innebär att han eller hon inte är född. Du betalar 10000 till banken för att fira. Ägaren av Bilaffären ska gå 1 steg fram och inkassera 1000.",
    effect: sequence(
      loseMoney(10_000),
      movePropertyOwnerForward("carStore", 1),
      gainPropertyOwnerMoney("carStore", 1_000),
    ),
  },
  {
    id: "chance-215",
    text: "Ägaren av Mataffären ska inkassera 20000 för att en rolig person köpte 100 kilo kattmat.",
    effect: gainPropertyOwnerMoney("groceryStore", 20_000),
  },
  {
    id: "chance-216",
    text: "Slå tärningen. Slår du 1-3 så snubblar du över spelaren till vänster och båda ska gå till sjukhuset. Slår du 4-6 så snubblar du över spelaren till höger och båda ska gå till sjukhuset. Ägaren av Bilaffären ska gå 1 steg framåt.",
    effect: rollForEffect(
      {
        rolls: [1, 2, 3],
        label: "Du och spelaren till vänster går till sjukhuset",
        effect: sequence(
          movePlayerAndLeftPlayerTo(HOSPITAL_TILE_ID),
          movePropertyOwnerForward("carStore", 1),
        ),
      },
      {
        rolls: [4, 5, 6],
        label: "Du och spelaren till höger går till sjukhuset",
        effect: sequence(
          movePlayerAndRightPlayerTo(HOSPITAL_TILE_ID),
          movePropertyOwnerForward("carStore", 1),
        ),
      },
    ),
  },
  {
    id: "chance-217",
    text: "Du inser att du är allergisk mot syre. Inkassera 29000. Ägaren av Bilaffären ska gå 1 steg bakåt.",
    effect: sequence(
      gainMoney(29_000),
      movePropertyOwnerBackward("carStore", 1),
    ),
  },
  {
    id: "chance-218",
    text: "Du äter upp allas choklad på julaftonen. Betala 10000 till den som öppnade chokladasken.",
    effect: choosePlayerToPay(10_000),
  },
  {
    id: "chance-219",
    text: "Du ska baka lussebullar men du har inget mjöl hemma. gå till Mataffären och betala 10000.",
    effect: sequence(moveToNearestProperty("groceryStore"), loseMoney(10_000)),
  },
  {
    id: "chance-220",
    text: "Man är den manlige med lemmen i en popduo. Sen nånting om Kemetyl och kalsongen. Alla ska gå 5 steg bakåt.",
    effect: moveAllBackward(5),
  },
  {
    id: "chance-221",
    text: "En lång man vill bli en kort man. Han kapar av sina ben men misslyckas och måste åka till bilverkstan. Gå till bilverkstan om du är en man.",
    effect: choose(
      {
        label: "Jag är en man – gå till Bilverkstan",
        effect: moveTo(REPAIR_SHOP_TILE_ID),
      },
      {
        label: "Gäller inte mig",
        effect: sequence(),
      },
    ),
  },
  {
    id: "chance-222",
    text: "Du blir akut sugen på korv. Hoppa som en packad känguru till närmaste Möbelbutiken och köpa en hästköttsskandalskorv för 5 kr. Möbelbutiken har dock ingen växel så du får betala 5000kr.",
    effect: sequence(moveToNearestProperty("furnitureStore"), loseMoney(5_000)),
  },
  {
    id: "chance-223",
    text: "Du orkar inte gå på promenad. För att reta gallfeber på dina släktingar så går du långsammare än vad som är möjligt. Du blir passerad av en storväxt dam av finskt ursprung som bor på samma ort som din farfar och har ett förnamn från en sydamerikansk kultur, en enbent snigel, en död skata och en liten ful jävla grådvärg under promenaden. Betala de andra deltagarna 10 lök var som straff.",
    effect: payAllOtherPlayers(10_000),
  },
  {
    id: "chance-224",
    text: "Du tråkar ut dina släktingar med en massa jytyyyyybvidoes. Gå till närmaste Spelstudion och sök jobb som straff.",
    effect: moveToNearestProperty("gameStudio"),
  },
  {
    id: "chance-225",
    text: "Du köper 2 förpackningar fryspåsar för 26000 och råka skänka dom till busschauffören. Gå till första busshållplatsen och hämta dom.",
    effect: sequence(loseMoney(26_000), moveTo("r2-3", false)),
  },
  {
    id: "chance-226",
    text: "Du hamnar i klistret när du somnar på bussen så du missar att gå av på hållplatsen. Stå över 2 kast",
    effect: skipTurns(2),
  },
  {
    id: "chance-227",
    text: "En gubbe han äter lyxpotatissallad och fläskkotlett han tar köttet och lägger på lyxpotatissallad och äter han får maten i näsan. Inkassera 20000, äger du Bilaffären får du inkassera ytterligare 1000.",
    effect: sequence(
      gainMoney(20_000),
      ifOwnsProperty("carStore", gainMoney(1_000), sequence()),
    ),
  },
  {
    id: "chance-228",
    text: "En advokat försöker att starta sin bil. Det funkar inte så han försöker att låta som en bil. Åk till bilverksta och laga advokaten.  ",
    effect: moveTo(REPAIR_SHOP_TILE_ID),
  },
  {
    id: "chance-229",
    text: "Du råkar glömma bort någons födelsedag. Säg ’Jag ber så mycket om ursäkt’ utan att mena det. Inkassera 11000  ",
    effect: gainMoney(11_000),
  },
  {
    id: "chance-230",
    text: "Erik Hamrén, Stefan Löfven, Erik Löfven, Stefan Hamrén och Björn stöter på varandra i en skog. Efter att ha plockat svamp så inser dom att dom är vilse. Gå till närmaste skog och leta efter dom eller betala 20000 så spelet tar slut snabbare.  ",
    effect: choose(
      {
        label: "Gå till närmaste skog",
        effect: {
          type: "moveToNearestForest",
        },
      },
      {
        label: "Betala 20 000 kr",
        effect: loseMoney(20_000),
      },
    ),
  },
  {
    id: "chance-231",
    text: "Du blandar ihop vetekli med vetemjöl, och får skäll. Det kan hända den bäste, för det har hänt Erik Hamrén. Du är skyldig Gotlands Kommun 20000.  ",
    effect: loseMoney(20_000),
  },
  {
    id: "chance-232",
    text: "Spelaren till höger klagar på spisen när du gör pannkakor. Åk till Elektronikbutiken och köp världens dyraste spis som kostar 40000 så spelaren till höger blir glad.  ",
    effect: sequence(
      moveToNearestProperty("electronicsStore"),
      loseMoney(40_000),
    ),
  },
  {
    id: "chance-233",
    text: "En man utan hår smygäter chokladtårta på nätterna. Betala 10000 till dom andra deltagarna. Du slipper betala om du har hår på huvudet.  ",
    effect: choose(
      {
        label: "Jag har hår på huvudet",
        effect: sequence(),
      },
      {
        label: "Jag ska betala de andra",
        effect: payAllOtherPlayers(10_000),
      },
    ),
  },
  {
    id: "chance-234",
    text: "En glad speleman körde den kirgiziska helikoptern och knockar sig själv. Gå till sjukhuset och hälsa på honom",
    effect: moveTo(HOSPITAL_TILE_ID),
  },
  {
    id: "chance-235",
    text: "Du åker vilse i Sävedalen. Efter att ha tjatat hela dagen att du behöver diskmedel så glömmer du köpa på vägen hem. Åk tillbaka till närmaste Mataffären och betala 10000.",
    effect: sequence(moveToNearestProperty("groceryStore"), loseMoney(10_000)),
  },
  {
    id: "chance-236",
    text: "Du gör mer pannkakssmet än vad som får plats i bunken. Gå till Sjukhuset  ",
    effect: moveTo(HOSPITAL_TILE_ID),
  },
  {
    id: "chance-237",
    text: "Du blir irriterad på att en person du aldrig träffat kallas för ”Draken”. Rid på Draken, flyg 10 steg framåt såvida du inte har druckit rakvatten  ",
    effect: choose(
      {
        label: "Jag har inte druckit rakvatten",
        effect: moveForward(10),
      },
      {
        label: "Jag har druckit rakvatten",
        effect: sequence(),
      },
    ),
  },
  {
    id: "chance-238",
    text: "Du döper din egna stad till Skellefteå men uttalar det Skellefte. Smart! Betala 30000.",
    effect: loseMoney(30_000),
  },
  {
    id: "chance-239",
    text: "Du läser boken ”Omgiven av idioter”, författarens avsikt är att det inte är så. För varje dag som går blir du ännu mer övertygad om att du ÄR omgiven av idioter. Spelet är slut om du slår två 5:or i rad.",
    effect: rollForEffect(
      {
        rolls: [1, 2, 3, 4, 6],
        label: "Inte en femma – spelet fortsätter",
        effect: sequence(),
      },
      {
        rolls: [5],
        label: "Första femman! Slå igen",
        effect: {
          type: "secondFiveRoll",
        },
      },
    ),
  },
  {
    id: "chance-240",
    text: "Du har fobi mot att använda kam eller borste. Du ser ut som Carlos Valderama minus mustasch. Gå till närmaste Sportbutiken och köp en plastboll storlek 5.",
    effect: {
      type: "moveToNearestPropertyWithoutLanding",
      propertyId: "sportsStore",
    },
  },
  {
    id: "chance-241",
    text: "Du anser dig vara Gotlands starkaste man, men blir nedbrottad av en ekorre. Du är skyldig Gotlands kommun 20000.",
    effect: loseMoney(20_000),
  },
  {
    id: "chance-242",
    text: "Du hittar en gammal bil som en gubbe byggt av ost. Slå tärningen. Slår du 1-2 går bilen sönder och du måste till Bilverkstan. Slår du 3-6 fungerar bilen utmärkt och du får åka 10 steg framåt.",
    effect: rollForEffect(
      {
        rolls: [1, 2],
        label: "Bilen gick sönder! Åk till Bilverkstan.",
        effect: moveTo(REPAIR_SHOP_TILE_ID),
      },
      {
        rolls: [3, 4, 5, 6],
        label: "Bilen fungerar! Gå 10 steg framåt.",
        effect: moveForward(10),
      },
    ),
  },
  {
    id: "chance-243",
    text: "En apa har öppnat en körskola. Slå tärningen. Slår du 1-3 krockar apan och du måste gå till Bilverkstan. Slår du 4-6 kör apan som en mästare och du får gå 10 steg framåt.",
    effect: rollForEffect(
      {
        rolls: [1, 2, 3],
        label: "Apan krockade! Åk till Bilverkstan.",
        effect: moveTo(REPAIR_SHOP_TILE_ID),
      },
      {
        rolls: [4, 5, 6],
        label: "Apan körde perfekt! Gå 10 steg framåt.",
        effect: moveForward(10),
      },
    ),
  },
  {
    id: "chance-244",
    text: "En gubbe utmanar dig i kapplöpning. Gubben springer åt fel håll och du vinner enkelt. Gå 3 steg framåt.",
    effect: moveForward(3),
  },
  {
    id: "chance-245",
    text: "Du hittar ett par magiska skor som gör att du springer snabbare än en älg. Gå 15 steg framåt.",
    effect: moveForward(15),
  },
  {
    id: "chance-246",
    text: "En kattunge bygger en raket av gamla konservburkar. Du får följa med på en kort provtur. Gå 6 steg framåt.",
    effect: moveForward(6),
  },
  {
    id: "chance-247",
    text: "Du hjälper en gammal gubbe att hitta sina glasögon. De sitter på hans huvud. Som tack får du skjuts 8 steg framåt.",
    effect: moveForward(8),
  },
  {
    id: "chance-248",
    text: "En papegoja påstår att den är världens snabbaste taxichaufför. Du tror på den och får åka 9 steg framåt.",
    effect: moveForward(9),
  },
  {
    id: "chance-249",
    text: "Du vinner en hopptävling mot en mycket trött sköldpadda. Publiken jublar och du får gå 5 steg framåt.",
    effect: moveForward(5),
  },
  {
    id: "chance-250",
    text: "Kungen har uppfunnit en osynlig cykel. Du får låna den, men måste låtsas trampa hela vägen. Gå 10 steg framåt.",
    effect: moveForward(10),
  },
];
