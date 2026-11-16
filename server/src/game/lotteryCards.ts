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
  },*/

  {
    id: "lottery-003",
    text: "En blodvampyr snor hälften av dina pengar om du slår en 5a",
    effect: {
      type: "loseMoneyPercentageOnRoll",
      rolls: [5],
      percent: 50,
    },
  },
];
