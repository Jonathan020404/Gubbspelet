import type { ChanceEffect, GameState } from "./types";

export interface EffectDescription {
  icon: string;
  title: string;
  description: string;
}

export function describeChanceEffect(
  effect: ChanceEffect,
  game: GameState,
): EffectDescription[] {
  switch (effect.type) {
    case "gainAllMoneyPerProperty": {
      return [
        {
          icon: "💰",
          title:
            "Alla får " +
            effect.amount.toLocaleString("sv-SE") +
            " kr per aktiebrev",

          description:
            "Varje spelare får pengar från Banken baserat på hur många aktiebrev spelaren äger.",
        },
      ];
    }

    case "movePropertyOwnerForward": {
      const property = game.properties[effect.propertyId];

      const ownerId = game.ownership[effect.propertyId];

      const owner = game.players.find(
        (player) => player.id === ownerId && !player.eliminated,
      );

      return [
        {
          icon: "👣",
          title:
            "Ägaren av " +
            property.name +
            " går " +
            effect.amount +
            " steg framåt",

          description: owner
            ? owner.name + " flyttas och utför rutans vanliga effekt."
            : "Banken äger aktiebrevet. Ingen spelare flyttas.",
        },
      ];
    }

    case "collectMoneyFromOthers": {
      return [
        {
          icon: "💰",
          title:
            "Inkassera " +
            effect.amount.toLocaleString("sv-SE") +
            " kr från varje medspelare",

          description:
            "Alla andra aktiva spelare betalar dig. Om någon inte har råd får du spelarens återstående pengar.",
        },
      ];
    }

    case "choosePlayerMoveByMoney": {
      const direction = effect.stepsPerGroup < 0 ? "bakåt" : "framåt";

      return [
        {
          icon: "🏰",
          title: "Använd katapulten",

          description:
            "Välj en medspelare som flyttas " +
            Math.abs(effect.stepsPerGroup) +
            " steg " +
            direction +
            " för varje " +
            effect.moneyPerGroup.toLocaleString("sv-SE") +
            " kr du har. Avrunda nedåt.",
        },
      ];
    }

    case "moveSelectedPlayer": {
      const target = game.players.find(
        (player) => player.id === effect.targetPlayerId,
      );

      const direction = effect.amount < 0 ? "bakåt" : "framåt";

      return [
        {
          icon: "👣",
          title:
            (target?.name ?? "Spelaren") +
            " flyttas " +
            Math.abs(effect.amount) +
            " steg " +
            direction,

          description:
            "Den valda spelaren flyttas och utför rutans vanliga effekt.",
        },
      ];
    }

    case "loseRichestPlayerMoney": {
      return [
        {
          icon: "💸",
          title:
            "Den rikaste spelaren betalar " +
            effect.amount.toLocaleString("sv-SE") +
            " kr",

          description:
            "Spelaren som har mest pengar måste betala Fantomens räkning till Banken.",
        },
      ];
    }

    case "losePropertyOwnerMoney": {
      const property = game.properties[effect.propertyId];

      const ownerId = game.ownership[effect.propertyId];

      const owner = game.players.find(
        (player) => player.id === ownerId && !player.eliminated,
      );

      return [
        {
          icon: "💸",
          title:
            "Ägaren av " +
            property.name +
            " betalar " +
            effect.amount.toLocaleString("sv-SE") +
            " kr",

          description: owner
            ? owner.name +
              " äger aktiebrevet och måste betala böterna till Banken."
            : "Banken äger aktiebrevet. Ingen spelare behöver betala.",
        },
      ];
    }

    case "hospitalUntilLanding": {
      const names = effect.propertyIds.map(
        (propertyId) => game.properties[propertyId].name,
      );

      if (effect.includeLottery) {
        names.push("Lotteri");
      }

      return [
        {
          icon: "🏥",
          title: "Åk till Sjukhuset",

          description:
            "Du får inte flytta din spelpjäs förrän du blir befriad.",
        },
        {
          icon: "🔓",
          title: "Vänta på rätt ruta",

          description:
            "Du får lämna Sjukhuset när någon landar på någon av följande rutor: " +
            names.join(", ") +
            ".",
        },
      ];
    }

    case "extraRolls":
      return [
        {
          icon: "🎲",
          title: "Slå " + effect.amount + " extra slag",

          description:
            "Du får slå tärningen igen och flytta din spelpjäs. Utför rutans effekt efter varje slag.",
        },
      ];

    case "chooseOpponentPropertyOrMoney":
      return [
        ...effect.before.flatMap((nextEffect) =>
          describeChanceEffect(nextEffect, game),
        ),
        {
          icon: "🏢",
          title: "Ta valfritt aktiebrev",

          description:
            "Välj ett aktiebrev som ägs av en annan spelare. Om ingen medspelare äger aktiebrev får du istället ta " +
            effect.percent +
            "% av en spelares pengar.",
        },
      ];

    case "takePlayerProperty": {
      const property = game.properties[effect.propertyId];

      const previousOwner = game.players.find(
        (player) => player.id === effect.targetPlayerId,
      );

      return [
        {
          icon: "🏢",
          title: "Ta " + property.name,

          description:
            "Du övertar aktiebrevet från " +
            (previousOwner?.name ?? "spelaren") +
            " utan att betala något.",
        },
      ];
    }

    case "chooseBankProperty":
      return [
        {
          icon: "🏢",
          title:
            "Köp valfritt aktiebrev för " +
            effect.price.toLocaleString("sv-SE") +
            " kr",

          description: "Välj ett aktiebrev som Banken fortfarande äger.",
        },
        ...effect.after.flatMap((nextEffect) =>
          describeChanceEffect(nextEffect, game),
        ),
      ];

    case "buyBankProperty": {
      const property = game.properties[effect.propertyId];

      return [
        {
          icon: "🏢",
          title:
            "Köp " +
            property.name +
            " för " +
            effect.price.toLocaleString("sv-SE") +
            " kr",

          description:
            "Ordinarie pris: " +
            property.price.toLocaleString("sv-SE") +
            " kr. Avgift: " +
            property.fee.toLocaleString("sv-SE") +
            " kr.",
        },
      ];
    }

    case "choosePlayerToPassCard":
      return [
        {
          icon: "🍎",
          title: "Ge äpplet vidare",
          description: "Välj en annan spelare som måste slå tärningen.",
        },
      ];

    case "passChanceCard": {
      const target = game.players.find(
        (player) => player.id === effect.targetPlayerId,
      );

      return [
        {
          icon: "🍎",
          title: "Ge äpplet till " + (target?.name ?? "spelaren"),

          description:
            "Spelaren måste slå tärningen. Vid 1–3 åker spelaren till Sjukhuset. Annars ges äpplet vidare igen.",
        },
      ];
    }

    case "takeLoan": {
      const property = game.properties[effect.discountPropertyId];

      return [
        {
          icon: "💰",
          title: "Inkassera " + effect.amount.toLocaleString("sv-SE") + " kr",

          description: "Du tar ett lån från Banken.",
        },
        {
          icon: "🏁",
          title:
            "Betala " +
            effect.repayment.toLocaleString("sv-SE") +
            " kr vid Mål",

          description:
            "Om du äger " +
            property.name +
            " betalar du endast " +
            effect.discountedRepayment.toLocaleString("sv-SE") +
            " kr.",
        },
        {
          icon: "↩️",
          title: "Har du inte råd?",

          description:
            "Du måste börja om från Start, men lånet avskrivs och du slipper betala det nästa gång du kommer till Mål.",
        },
      ];
    }

    case "moveToNearestOfProperties": {
      const propertyNames = effect.propertyIds.map(
        (propertyId) => game.properties[propertyId].name,
      );

      const shopNames = propertyNames.join(", ");

      return [
        {
          icon: "📍",
          title: "Gå till närmaste butik",
          description:
            "Du flyttas till närmaste av följande butiker: " +
            shopNames +
            ". Utför sedan rutans vanliga aktiebrevseffekt.",
        },
      ];
    }

    case "ifRichestPlayer": {
      const drawingPlayer = game.players.find(
        (player) => player.id === game.chanceDraw?.playerId,
      );

      const activePlayers = game.players.filter((player) => !player.eliminated);

      const highestMoney = Math.max(
        ...activePlayers.map((player) => player.money),
      );

      const isRichest = drawingPlayer?.money === highestMoney;

      const selectedEffect = isRichest ? effect.ifRichest : effect.otherwise;

      return [
        {
          icon: "👑",
          title: isRichest ? "Du är rikast!" : "Du är inte rikast",

          description: isRichest
            ? "Du har mest pengar bland de aktiva spelarna."
            : "En annan spelare har mer pengar än du.",
        },
        ...describeChanceEffect(selectedEffect, game),
      ];
    }

    case "moveToNearestProperty": {
      const property = game.properties[effect.propertyId];

      return [
        {
          icon: "😁",
          title: "Gå till närmaste " + property.name,
          description:
            "Du flyttas direkt till närmaste ruta för företaget och utför rutans vanliga aktiebrevseffekt.",
        },
      ];
    }

    case "moveForward":
      return [
        {
          icon: "👣",
          title: "Gå " + effect.amount + " steg framåt",
          description:
            "Din spelpjäs flyttas framåt och du utför effekten på din nya ruta.",
        },
      ];

    case "gainLeftPlayerMoney": {
      const drawingPlayerId = game.chanceDraw?.playerId;

      const drawingIndex = game.players.findIndex(
        (player) => player.id === drawingPlayerId,
      );

      const leftPlayer =
        drawingIndex >= 0
          ? game.players.find((_, index) => {
              const offset =
                (index - drawingIndex + game.players.length) %
                game.players.length;

              if (offset === 0) return false;

              // Find the first active player after
              // the drawing player in turn order.
              for (let step = 1; step < offset; step++) {
                const previousIndex =
                  (drawingIndex + step) % game.players.length;

                if (!game.players[previousIndex].eliminated) {
                  return false;
                }
              }

              return !game.players[index].eliminated;
            })
          : undefined;

      return [
        {
          icon: "💰",
          title:
            "Spelaren till vänster inkasserar " +
            effect.amount.toLocaleString("sv-SE") +
            " kr",

          description: leftPlayer
            ? leftPlayer.name + " får pengarna från Banken."
            : "Nästa aktiva spelare i turordningen får pengarna.",
        },
      ];
    }

    case "moveAllTo": {
      const tile = game.board.find((tile) => tile.id === effect.tileId);

      return [
        {
          icon: "📍",
          title: "Alla går till " + (tile?.name ?? "en annan ruta"),

          description: "Alla aktiva spelare flyttas direkt till rutan.",
        },
      ];
    }

    case "loseOthersMoney":
      return [
        {
          icon: "💸",
          title:
            "Alla andra betalar " +
            effect.amount.toLocaleString("sv-SE") +
            " kr",

          description: "Alla andra aktiva spelare betalar till Banken.",
        },
      ];

    case "gainPropertyOwnerMoney": {
      const property = game.properties[effect.propertyId];

      const ownerId = game.ownership[effect.propertyId];

      const owner = game.players.find(
        (player) => player.id === ownerId && !player.eliminated,
      );

      return [
        {
          icon: "💰",
          title:
            property.name +
            "s ägare inkasserar " +
            effect.amount.toLocaleString("sv-SE") +
            " kr",

          description: owner
            ? owner.name + " äger aktiebrevet och får pengarna från Banken."
            : "Banken äger aktiebrevet. Ingen spelare får några pengar.",
        },
      ];
    }

    case "moneyPerRollUntilProperty": {
      const property = game.properties[effect.propertyId];

      return [
        {
          icon: "🌳",
          title:
            "Inkassera " +
            effect.amount.toLocaleString("sv-SE") +
            " kr per tärningsslag",

          description:
            "Du får pengar efter varje tärningsslag tills någon landar på " +
            property.name +
            ".",
        },
      ];
    }

    case "payPerOwnedProperty": {
      const drawingPlayerId = game.chanceDraw?.playerId;

      const ownedCount = drawingPlayerId
        ? Object.values(game.ownership).filter(
            (ownerId) => ownerId === drawingPlayerId,
          ).length
        : 0;

      const totalAmount = ownedCount * effect.amount;

      return [
        {
          icon: "🧹",
          title: "Betala " + totalAmount.toLocaleString("sv-SE") + " kr",

          description:
            ownedCount === 0
              ? "Du äger inga aktiebrev och behöver inte betala."
              : "Du äger " +
                ownedCount +
                " aktiebrev och betalar " +
                effect.amount.toLocaleString("sv-SE") +
                " kr per aktiebrev.",
        },
      ];
    }

    case "moveAllBackward":
      return [
        {
          icon: "👣",
          title: "Alla går " + effect.amount + " steg bakåt",
          description: "Alla spelare utför effekten på sin nya ruta.",
        },
      ];

    case "gainAllMoney":
      return [
        {
          icon: "💰",
          title:
            "Alla inkasserar " + effect.amount.toLocaleString("sv-SE") + " kr",
          description: "Varje aktiv spelare får pengar från Banken.",
        },
      ];

    case "movePlayerAndOthers":
      return [
        {
          icon: "👣",
          title: "Spelarna flyttas",
          description:
            "Du går " +
            Math.abs(effect.playerSteps) +
            " steg " +
            (effect.playerSteps < 0 ? "bakåt" : "framåt") +
            ". Alla andra går " +
            Math.abs(effect.otherSteps) +
            " steg " +
            (effect.otherSteps < 0 ? "bakåt" : "framåt") +
            ".",
        },
      ];

    case "drawLottery":
      return [
        {
          icon: "🎟️",
          title: "Ta ett lotteri",
          description: "Lotterikort kommer i en framtida uppdatering.",
        },
      ];

    case "rollForEffect":
      return [
        {
          icon: "🎲",
          title: "Slå tärningen",
          description: "Tärningens resultat avgör vilken effekt som gäller.",
        },
      ];

    case "choosePlayerToPay":
      return [
        ...effect.before.flatMap((childEffect) =>
          describeChanceEffect(childEffect, game),
        ),
        {
          icon: "💰",
          title: "Välj en spelare",
          description:
            "Betala " +
            effect.amount.toLocaleString("sv-SE") +
            " kr till en spelare som du väljer.",
        },
      ];

    case "payPlayer": {
      const target = game.players.find(
        (player) => player.id === effect.targetPlayerId,
      );

      return [
        {
          icon: "💰",
          title: "Betala " + effect.amount.toLocaleString("sv-SE") + " kr",

          description:
            "Pengarna betalas till " +
            (target?.name ?? "den valda spelaren") +
            ".",
        },
      ];
    }

    case "choosePlayerMoneyPercentage":
      return [
        {
          icon: "💰",
          title: "Välj en spelare",
          description: "Du får ta " + effect.percent + "% av spelarens pengar.",
        },
      ];

    case "takePlayerMoneyPercentage": {
      const target = game.players.find(
        (player) => player.id === effect.targetPlayerId,
      );

      const amount = target
        ? Math.floor((target.money * effect.percent) / 100)
        : 0;

      return [
        {
          icon: "💰",
          title: "Ta " + amount.toLocaleString("sv-SE") + " kr",

          description:
            "Du får " +
            effect.percent +
            "% av " +
            (target?.name ?? "spelarens") +
            "s pengar.",
        },
      ];
    }

    case "unlessOwnsProperty": {
      const property = game.properties[effect.propertyId];

      const ownerId = game.ownership[effect.propertyId];

      const drawingPlayerId = game.chanceDraw?.playerId;

      const ownsProperty =
        drawingPlayerId !== undefined && ownerId === drawingPlayerId;

      if (ownsProperty) {
        return [
          {
            icon: "✅",
            title: "Du slipper straffet!",
            description:
              "Spelaren äger " +
              property.name +
              " och kortets effekt gäller därför inte.",
          },
        ];
      }

      return [
        {
          icon: "📋",
          title: "Gäller ej om du äger " + property.name,
          description:
            "Kortets effekt gäller eftersom spelaren inte äger aktiebrevet.",
        },
        ...describeChanceEffect(effect.effect, game),
      ];
    }

    case "drawChanceCards":
      return [
        {
          icon: "🎴",
          title: "Dra " + effect.amount + " extra frågekort",
          description: "Du får nya frågekort och utför deras effekter.",
        },
      ];

    case "drawAllChanceCards":
      return [
        {
          icon: "🎴",
          title: "Alla drar " + effect.amount + " frågekort",
          description:
            "Varje spelare får sina egna frågekort och utför deras effekter.",
        },
      ];

    case "skipRichestPlayerTurns": {
      const activePlayers = game.players.filter((player) => !player.eliminated);

      const highestBalance = Math.max(
        ...activePlayers.map((player) => player.money),
      );

      const richestPlayers = activePlayers.filter(
        (player) => player.money === highestBalance,
      );

      return [
        {
          icon: "⏳",
          title: "Rikaste spelaren står över " + effect.amount + " kast",
          description:
            richestPlayers.length === 1
              ? richestPlayers[0].name +
                " har mest pengar (" +
                highestBalance.toLocaleString("sv-SE") +
                " kr)."
              : "Flera spelare har lika mycket pengar. Turordningen avgör.",
        },
      ];
    }

    case "skipTurns":
      return [
        {
          icon: "⏳",
          title: "Stå över " + effect.amount + " kast",
          description:
            "Spelaren missar sina nästa " + effect.amount + " turer.",
        },
      ];

    case "moveAllForward":
      return [
        {
          icon: "👣",
          title: "Alla går " + effect.amount + " steg framåt",
          description:
            "Alla spelare flyttas och utför det som händer på deras nya ruta.",
        },
      ];

    case "payPropertyOwner": {
      const property = game.properties[effect.propertyId];

      return [
        {
          icon: "💰",
          title: "Betala " + effect.amount.toLocaleString("sv-SE") + " kr",
          description:
            "Till ägaren av " +
            property.name +
            ", om en annan spelare äger aktiebrevet.",
        },
      ];
    }

    case "sequence":
      return effect.effects.flatMap((childEffect) =>
        describeChanceEffect(childEffect, game),
      );

    case "moveTo": {
      const tile = game.board.find((tile) => tile.id === effect.tileId);

      return [
        {
          icon: "📍",
          title: "Åk till " + (tile?.name ?? "en annan ruta"),
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
          title: "Betala " + effect.amount.toLocaleString("sv-SE") + " kr",
          description: "Pengarna betalas till Banken.",
        },
      ];

    case "unlessSaturday":
      return [
        {
          icon: "📅",
          title: "Gäller inte på lördagar",
          description: "På lördagar slipper du alla kortets effekter.",
        },
        ...describeChanceEffect(effect.effect, game),
      ];

    case "gainMoney":
      return [
        {
          icon: "💰",
          title: "Inkassera " + effect.amount.toLocaleString("sv-SE") + " kr",
          description: "Du får pengar från Banken.",
        },
      ];

    case "moveOthersBackward":
      return [
        {
          icon: "👣",
          title: "Alla andra går " + effect.amount + " steg bakåt",
          description:
            "Din egen spelpjäs står kvar. Alla andra utför effekten på sin nya ruta.",
        },
      ];

    case "choose":
      return [
        {
          icon: "🤔",
          title: "Du får välja",
          description: "Välj ett av alternativen på kortet.",
        },
      ];

    case "movePropertyOwnerBackward": {
      const property = game.properties[effect.propertyId];

      const ownerId = game.ownership[effect.propertyId];

      const owner = game.players.find((player) => player.id === ownerId);

      return [
        {
          icon: "👣",
          title: property.name + "s ägare går " + effect.amount + " steg bakåt",
          description: owner
            ? owner.name + " äger aktiebrevet och flyttas bakåt."
            : "Banken äger aktiebrevet. Ingen spelare flyttas.",
        },
      ];
    }
  }
}
