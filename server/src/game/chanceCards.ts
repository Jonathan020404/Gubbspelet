
import type { PropertyId } from "./board";
import { FIRST_GROCERY_TILE_ID } from "./board";

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

// ------------------------------------
// REUSABLE CARD EFFECTS
// ------------------------------------

export function skipTurns(
  amount: number
): ChanceEffect {
  return {
    type: "skipTurns",
    amount,
  };
}

export function moveAllForward(
  amount: number
): ChanceEffect {
  return {
    type: "moveAllForward",
    amount,
  };
}

export function payPropertyOwner(
  propertyId: PropertyId,
  amount: number
): ChanceEffect {
  return {
    type: "payPropertyOwner",
    propertyId,
    amount,
  };
}

export function sequence(
  ...effects: ChanceEffect[]
): ChanceEffect {
  return {
    type: "sequence",
    effects,
  };
}


export function moveTo(
  tileId: string,
  resolveLanding = true
): ChanceEffect {
  return {
    type: "moveTo",
    tileId,
    resolveLanding,
  };
}

export function loseMoney(
  amount: number
): ChanceEffect {
  return {
    type: "loseMoney",
    amount,
  };
}

export function unlessSaturday(
  effect: ChanceEffect
): ChanceEffect {
  return {
    type: "unlessSaturday",
    effect,
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
      payPropertyOwner("electronicsStore", 20_000)
    ),
  },{
    id: "chance-003",
    text: "Du är sugen på godis. Åk till Mataffären närmast Start och betala 10000. Gäller ej om det är lördag.",
    effect: unlessSaturday(
      sequence(
        moveTo(FIRST_GROCERY_TILE_ID, true),
        loseMoney(10_000)
      )
    ),
  },

];
