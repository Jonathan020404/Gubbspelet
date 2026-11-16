import type { PropertyId } from "./board";

import {
  FIRST_GROCERY_TILE_ID,
  REPAIR_SHOP_TILE_ID,
  HOSPITAL_TILE_ID,
  START_TILE_ID,
} from "./board";

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

// ------------------------------------
// REUSABLE CARD EFFECTS
// ------------------------------------

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
  /*{
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
  },*/
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
];
