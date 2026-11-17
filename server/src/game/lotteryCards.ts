import type { PropertyId } from "./board";

export type LotteryEffect =
  | {
      type: "discountBankProperties";
      multiplier: number;
    }
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
    }
  | {
      type: "multiplyChanceCardsOnLanding";
      multiplier: number;
    }
  | {
      type: "givePropertyWhenPayingRent";
    }
  | {
      type: "multiplyPropertyRent";
      multiplier: number;
    }
  | {
      type: "drawChancePerRollIfOwnsProperties";
      minimumProperties: number;
      amount: number;
    }
  | {
      type: "losePropertyOnRoll";
      rolls: number[];
      fallbackAmount: number;
    }
  | {
      type: "payTaxPerDicePip";
      amountPerPip: number;
      exemptPropertyId: PropertyId;
    }
  | {
      type: "reverseChanceMoney";
      multiplier: -1;
    }
  | {
      type: "extraRollOrSkipTurn";
      extraRollOn: number[];
      skipTurnOn: number[];
      skipTurns: number;
    }
  | {
      type: "disableChanceCards";
    }
  | {
      type: "addMovementStepsOnRoll";
      extraSteps: number;
      exemptPropertyIds: PropertyId[];
    }
  | {
      type: "lastPlayerRollsMultipleDice";
      diceCount: number;
    }
  | {
      type: "swapPlayersOnRoll";
      rolls: number[];
    }
  | {
      type: "everyoneDrawsChanceOnLanding";
      amountPerPlayer: number;
    }
  | {
      type: "everyonePaysRent";
    }
  | {
      type: "disableAlternativeRoutes";
    }
  | {
      type: "gainMoneyPerDicePip";
      amountPerPip: number;
      exemptPropertyId: PropertyId;
    }
  | {
      type: "evilChanceSquares";
      stepsPerQuestionMark: number;
      tripleReward: number;
    }
  | {
      type: "backwardToPropertyOnRoll";
      destinations: {
        roll: number;
        propertyId: PropertyId;
      }[];
      fallbackPenaltyPropertyId: PropertyId;
      fallbackPenalty: number;
    }
  | {
      type: "closeHospitalAndRepairShop";
    }
  | {
      type: "badLotteryDiceMovement";
      startRoll: number;
      repairShopRoll: number;
      backwardLotteryRoll: number;
      backwardSteps: number;
    }
  | {
      type: "drawChanceWhenReceivingRent";
      amount: number;
    };

export interface LotteryCard {
  id: string;
  text: string;
  effect: LotteryEffect;
}

export const LOTTERY_CARDS: LotteryCard[] = [
  /*{
    id: "lottery-001",
    text: "Om du slår 5 eller 6 så ta ett frågekort.",
    effect: {
      type: "drawChanceOnRoll",
      rolls: [5, 6],
      amount: 1,
    },
  },
  {
    id: "lottery-002",
    text: "Varje gång någon kastar tärningen så inkasserar alla 5000. Dra nytt lotteri om någon slår 1.",
    effect: {
      type: "everyoneGainsOnRoll",
      amount: 5_000,
      redrawOnRolls: [1],
    },
  },

  {
    id: "lottery-003",
    text: "En blodvampyr snor hälften av dina pengar om du slår en 5a",
    effect: {
      type: "loseMoneyPercentageOnRoll",
      rolls: [5],
      percent: 50,
    },
  },

  {
    id: "lottery-004",
    text: "Varje gång man hamnar på frågekort så ska man plocka dubbelt så många kort",
    effect: {
      type: "multiplyChanceCardsOnLanding",
      multiplier: 2,
    },
  },
  {
    id: "lottery-005",
    text: "När du ska betala hyra så måste du även ge valfritt aktiebrev. Detta är pga att en svetsare höjde skatten med 2%",
    effect: {
      type: "givePropertyWhenPayingRent",
    },
  },
  {
    id: "lottery-006",
    text: "Många butiker har blivit anklagade för fusk. Därför blir andra företag mer värdefulla. Dubbel hyra.",
    effect: {
      type: "multiplyPropertyRent",
      multiplier: 2,
    },
  },
  {
    id: "lottery-007",
    text: "Det är hattparad. Nu ska man ta ett frågekort för varje slag man slår. Gäller ej de som inte har minst 2 aktiebrev",
    effect: {
      type: "drawChancePerRollIfOwnsProperties",
      minimumProperties: 2,
      amount: 1,
    },
  },
  {
    id: "lottery-008",
    text: "Aktiebreven har blivit osäkrade. Slår du en 1a tappar du valfritt aktiebrev och spelaren till vänster plockar upp det. Om du ej har aktiebrev tappar du 30000 istället",
    effect: {
      type: "losePropertyOnRoll",
      rolls: [1],
      fallbackAmount: 30_000,
    },
  },
  {
    id: "lottery-009",
    text: "Skatten är höjd! Spelaren som slår tärningen måste betala 1000 för varje prick. Gäller ej ägaren till Svensk Bank.",
    effect: {
      type: "payTaxPerDicePip",
      amountPerPip: 1_000,
      exemptPropertyId: "bank",
    },
  },
  {
    id: "lottery-010",
    text: "När du tar ett frågekort om pengar så är det tvärtom. När du inkasserar så ska du betala och när du betalar så ska du inkassera.",
    effect: {
      type: "reverseChanceMoney",
      multiplier: -1,
    },
  },
  {
    id: "lottery-011",
    text: "Kungen somnar på bussen. Slår du en 6a får du slå ett extra slag. Slår du en 1a får du stå över 1 kast",
    effect: {
      type: "extraRollOrSkipTurn",
      extraRollOn: [6],
      skipTurnOn: [1],
      skipTurns: 1,
    },
  },

  {
    id: "lottery-012",
    text: "Alla frågekort har blåst iväg och folk letar efter dem. Frågekorten är nu ogiltiga.",
    effect: {
      type: "disableChanceCards",
    },
  },
  {
    id: "lottery-013",
    text: "Solen skiner. Addera 3 prickar på alla slag. Gäller ej ägaren till Bilaffären och Elektronikbutiken.",
    effect: {
      type: "addMovementStepsOnRoll",
      extraSteps: 3,
      exemptPropertyIds: ["carStore", "electronicsStore"],
    },
  },
  {
    id: "lottery-014",
    text: "Kapten Krabba ger en rolig gubbe en matta. Spelaren längst bak ska använda 3 tärningar.",
    effect: {
      type: "lastPlayerRollsMultipleDice",
      diceCount: 3,
    },
  },
  {
    id: "lottery-015",
    text: "Ni hittar en teleporteringsmaskin. Slår man en 6a så byter man plats med valfri spelare. Man går ej de 6 stegen.",
    effect: {
      type: "swapPlayersOnRoll",
      rolls: [6],
    },
  },
  {
    id: "lottery-016",
    text: "2 kattungar slåss. Varje gång någon hamnar på frågekort ska alla ta ett frågekort. Den som hamnade där ska ta först, sedan fortsätter det åt vänster tills alla tagit.",
    effect: {
      type: "everyoneDrawsChanceOnLanding",
      amountPerPlayer: 1,
    },
  },
  {
    id: "lottery-017",
    text: "När någon betalar hyra så skall alla betala hyra till aktiebrev-ägaren. Gäller ej om det bara är 2 spelare, i så fall ta nytt lotteri.",
    effect: {
      type: "everyonePaysRent",
    },
  },
  {
    id: "lottery-018",
    text: "Gen och senvägarna är ogiltiga. Vägarna är avspärrade.",
    effect: {
      type: "disableAlternativeRoutes",
    },
  },
  {
    id: "lottery-019",
    text: "Extra pengar. Bankens fönster har varit öppet hela natten och pengar har blåst ut. För varje prick på tärningen man slår, får man 2000. Gäller ej ägaren till Svensk Bank.",
    effect: {
      type: "gainMoneyPerDicePip",
      amountPerPip: 2_000,
      exemptPropertyId: "bank",
    },
  },*/
  {
    id: "lottery-020",
    text: "Onda frågekort! Hamnar man på frågekort (?) så går man 3 steg bakåt och plockar inget kort. Hamnar man på ?? gå 6 steg bakåt. Hamnar man på ??? gå 9 steg bakåt och inkassera 1000.",
    effect: {
      type: "evilChanceSquares",
      stepsPerQuestionMark: 3,
      tripleReward: 1_000,
    },
  } /*
  {
    id: "lottery-021",
    text: "Det är lite kallt ute. Slår du 1 så ska du gå bakåt till närmaste Sportbutiken. Slår du 2 så ska du gå bakåt till närmaste Chokladfabriken. Finns ingen bakåt så går du till Start medan spelaren som äger Bilaffären ska betala 2000 till banken. Om alla står på Start så dras nytt lotteri.",
    effect: {
      type: "backwardToPropertyOnRoll",
      destinations: [
        { roll: 1, propertyId: "sportsStore" },
        { roll: 2, propertyId: "chocolateFactory" },
      ],
      fallbackPenaltyPropertyId: "carStore",
      fallbackPenalty: 2_000,
    },
  },
  {
    id: "lottery-022",
    text: "Bilverksta och Sjukhuset har gått i konkurs och är nedstängda. Om du måste gå till bilverksta eller sjukhuset så ska du stå kvar där du stod innan och stå över alla kast tills någon drar nytt lotteri. Om alla står över alla kast så går alla till start och nytt lotteri dras.",
    effect: {
      type: "closeHospitalAndRepairShop",
    },
  },
  {
    id: "lottery-023",
    text: "Dåligt lotteri! Om man slår 1 så ska man gå till Start. Slår man 2 så ska man gå till bilverksta. Slår man 6 så ska man gå 6 steg bakåt och ta ett lotteri.",
    effect: {
      type: "badLotteryDiceMovement",
      startRoll: 1,
      repairShopRoll: 2,
      backwardLotteryRoll: 6,
      backwardSteps: 6,
    },
  },
  {
    id: "lottery-024",
    text: "Det är nationaldagen idag. Det firar vi med att varje gång du får hyra av en annan spelare så tar du 1 frågekort.",
    effect: {
      type: "drawChanceWhenReceivingRent",
      amount: 1,
    },
  },
  {
    id: "lottery-025",
    text: "Rea! Alla aktiebrev är nu hälften så billiga att köpa från banken!",
    effect: {
      type: "discountBankProperties",
      multiplier: 0.5,
    },
  },*/,
];
