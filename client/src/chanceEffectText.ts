
import type {
  ChanceEffect,
  GameState,
} from "./types";

export interface EffectDescription {
  icon: string;
  title: string;
  description: string;
}

export function describeChanceEffect(
  effect: ChanceEffect,
  game: GameState
): EffectDescription[] {
  switch (effect.type) {
    case "skipTurns":
      return [
        {
          icon: "⏳",
          title:
            "Stå över " +
            effect.amount +
            " kast",
          description:
            "Spelaren missar sina nästa " +
            effect.amount +
            " turer.",
        },
      ];

    case "moveAllForward":
      return [
        {
          icon: "👣",
          title:
            "Alla går " +
            effect.amount +
            " steg framåt",
          description:
            "Alla spelare flyttas och utför det som händer på deras nya ruta.",
        },
      ];

    case "payPropertyOwner": {
      const property =
        game.properties[effect.propertyId];

      return [
        {
          icon: "💰",
          title:
            "Betala " +
            effect.amount.toLocaleString("sv-SE") +
            " kr",
          description:
            "Till ägaren av " +
            property.name +
            ", om en annan spelare äger aktiebrevet.",
        },
      ];
    }

    case "sequence":
      return effect.effects.flatMap(
        (childEffect) =>
          describeChanceEffect(
            childEffect,
            game
          )
      );

    
case "moveTo": {
  const tile = game.board.find(
    (tile) => tile.id === effect.tileId
  );

  return [
    {
      icon: "📍",
      title:
        "Åk till " + (tile?.name ?? "en annan ruta"),
      description: effect.resolveLanding
        ? "Flytta till rutan och utför dess vanliga effekt."
        : "Flytta direkt till den angivna rutan.",
    },
  ];
}

case "loseMoney":
  return [
    {
      icon: "💸",
      title:
        "Betala " +
        effect.amount.toLocaleString("sv-SE") +
        " kr",
      description:
        "Pengarna betalas till Banken.",
    },
  ];

case "unlessSaturday":
  return [
    {
      icon: "📅",
      title: "Gäller inte på lördagar",
      description:
        "På lördagar slipper du alla kortets effekter.",
    },
    ...describeChanceEffect(
      effect.effect,
      game
    ),
  ];

  }
}
