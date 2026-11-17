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
    case "swapPlayerPositionsWithoutLanding": {
      const target = game.players.find((p) => p.id === effect.targetPlayerId);

      return [
        {
          icon: "🌀",
          title: "Byt plats med " + (target?.name ?? "spelaren"),
          description:
            "Ni byter plats direkt. " +
            "Ingen av er påverkas av rutan " +
            "som ni hamnar på.",
        },
      ];
    }

    case "drawChancePerRollIfOwnsProperties":
      return [
        {
          icon: "🎩",
          title: "Extra frågekort vid tärningsslag",
          description:
            "Om du äger minst " +
            effect.minimumProperties +
            " aktiebrev ska du dra " +
            effect.amount +
            " extra frågekort varje gång du slår tärningen.",
        },
      ];

    case "transferRentProperty": {
      const property = game.properties[effect.propertyId];

      const recipient = game.players.find(
        (player) => player.id === effect.recipientId,
      );

      return [
        {
          icon: "📜",
          title: "Överlämna aktiebrev",
          description:
            "Ge " +
            property.name +
            " till " +
            (recipient?.name ?? "den andra spelaren") +
            ".",
        },
      ];
    }

    case "moveToNearestForest":
      return [
        {
          icon: "🌲",
          title: "Gå till närmaste skog",
          description:
            "Flytta till den närmaste skogsrutan. " +
            "Ingen skogsruta finns ännu på spelplanen.",
        },
      ];

    case "moveToNearestPropertyWithoutLanding": {
      const property = game.properties[effect.propertyId];

      return [
        {
          icon: "🏪",
          title: "Åk till " + property.name,
          description:
            "Flytta till närmaste " +
            property.name +
            " utan att betala vanlig hyra " +
            "eller köpa ett aktiebrev.",
        },
      ];
    }

    case "secondFiveRoll":
      return [
        {
          icon: "🎲",
          title: "Slå en gång till",
          description:
            "Du slog en femma. Slår du fem igen " + "är spelet slut!",
        },
      ];

    case "endGameWithoutWinner":
      return [
        {
          icon: "🏁",
          title: "Spelet är slut",
          description: "Två femmor i rad avslutar spelet.",
        },
      ];

    case "movePlayerAndRightPlayerTo": {
      const tile = game.board.find((tile) => tile.id === effect.tileId);

      return [
        {
          icon: "🏥",
          title: "Du och spelaren till höger flyttas",
          description:
            "Ni ska båda gå till " + (tile?.name ?? "den angivna rutan") + ".",
        },
      ];
    }

    case "temporaryBankruptcy":
      return [
        {
          icon: "💸",
          title: "Tillfällig konkurs",
          description:
            "Du förlorar alla pengar och aktiebrev. " +
            "Om nästa spelare slår 2–6 kommer du " +
            "tillbaka vid Start med 20 000 kr. " +
            "Slår spelaren 1 är du ute ur spelet.",
        },
      ];

    case "pingPongChaosOutcome":
      return [
        {
          icon: "🏓",
          title: "Tärningen visade " + effect.roll,
          description:
            "Spelets specialregler för resultat " + effect.roll + " genomförs.",
        },
      ];

    case "repeatPingPongChaosRoll":
      return [
        {
          icon: "🎲",
          title: "Slå om!",
          description: "Du får slå tärningen igen på samma frågekort.",
        },
      ];

    case "moveRightPlayerTo":
      return [
        {
          icon: "🏦",
          title: "Spelaren till höger flyttas",
          description: "Spelaren till höger går till den angivna rutan.",
        },
      ];

    case "policeFineChoice":
      return [
        {
          icon: "🚓",
          title: "Välj böter",
          description:
            "Välj mellan 5 000 och 7 000 kr. " +
            "Om spelaren till vänster har mer pengar " +
            "än du får den spelaren välja.",
        },
      ];

    case "policeFinePayment":
      return [
        {
          icon: "💸",
          title: "Betala böter",
          description:
            effect.amount.toLocaleString("sv-SE") + " kr betalas till Banken.",
        },
      ];

    case "moveLeftPlayerTo": {
      const tile = game.board.find((tile) => tile.id === effect.tileId);

      const destinationName = tile?.name ?? "Sjukhuset";

      return [
        {
          icon: "🏥",

          title: "Spelaren till vänster flyttas",

          description:
            "Spelaren till vänster om dig " +
            "ska gå till " +
            destinationName +
            ".",
        },
      ];
    }

    case "swapPropertyOwnersPositions": {
      const firstProperty = game.properties[effect.firstPropertyId];

      const secondProperty = game.properties[effect.secondPropertyId];

      return [
        {
          icon: "🔄",

          title: "Ägarna byter plats",

          description:
            "Ägaren av " +
            firstProperty.name +
            " byter plats på spelplanen " +
            "med ägaren av " +
            secondProperty.name +
            ". Båda behåller sina aktiebrev.",
        },
      ];
    }

    case "givePropertyToRightPlayer": {
      // Show the selected Aktiebrev
      // when displaying a choice.
      if (effect.propertyId !== undefined) {
        const property = game.properties[effect.propertyId];

        return [
          {
            icon: "📜",

            title: "Ge bort " + property.name,

            description: "Spelaren till höger får " + "detta aktiebrev gratis.",
          },
        ];
      }

      // Show the general rule
      // on the original card.
      return [
        {
          icon: "📜",

          title: "Ge ett aktiebrev till höger",

          description:
            "Ge ett av dina aktiebrev till " +
            "spelaren till höger. Har du " +
            "inget aktiebrev betalar du " +
            effect.fallbackAmount.toLocaleString("sv-SE") +
            " kr istället.",
        },
      ];
    }

    case "loseMoneyPercentage": {
      return [
        {
          icon: "💸",

          title: "Förlora " + effect.percent + "% av dina pengar",

          description:
            "Betala " +
            effect.percent +
            "% av dina nuvarande pengar " +
            "till Banken.",
        },
      ];
    }

    case "moveBackwardWithSpecialLanding": {
      return [
        {
          icon: "👣",

          title: "Gå " + effect.amount + " steg bakåt",

          description: "Specialregler gäller för " + "rutan du landar på.",
        },
        {
          icon: "❓",

          title: "Frågekort: Dra två kort",

          description: "Oavsett om rutan visar " + "?, ?? eller ???.",
        },
        {
          icon: "📜",

          title: "Aktiebrev: Ta det gratis",

          description: "Du får aktiebrevet " + "oavsett vem som äger det.",
        },
        {
          icon: "🎟️",

          title: "Lotteri: Gå 15 steg framåt",

          description:
            "Dra inget lotteri på " +
            "den första rutan. " +
            "Gå istället framåt.",
        },
      ];
    }

    case "moveToNearestLottery": {
      return [
        {
          icon: "🎟️",

          title: "Gå till närmaste Lotteri",

          description:
            "Du flyttas automatiskt till " +
            "närmaste lotteriruta, " +
            "framåt eller bakåt.",
        },
      ];
    }

    case "loseAllMoney": {
      return [
        {
          icon: "💸",

          title:
            "Alla betalar " + effect.amount.toLocaleString("sv-SE") + " kr",

          description:
            "Alla aktiva spelare, inklusive " +
            "du själv, betalar beloppet " +
            "till Banken.",
        },
      ];
    }

    case "propertyOwnerPayPerLeftProperty": {
      const property = game.properties[effect.propertyId];

      return [
        {
          icon: "💸",

          title: "Ägaren av " + property.name + " betalar",

          description:
            "Betala " +
            effect.amount.toLocaleString("sv-SE") +
            " kr till Banken för varje " +
            "aktiebrev som spelaren till " +
            "vänster om ägaren har. " +
            "Gäller ej Kungen.",
        },
      ];
    }

    case "moveFirstAndLast": {
      return [
        {
          icon: "🏁",

          title: "Längst bak går " + effect.amount + " steg framåt",

          description: "Spelaren på sista plats " + "flyttas framåt.",
        },
        {
          icon: "👣",

          title: "Längst fram går " + effect.amount + " steg bakåt",

          description: "Spelaren på första plats " + "flyttas bakåt.",
        },
        {
          icon: "❓",

          title: "Oavgjort? Ta nytt frågekort!",

          description:
            "Om flera spelare delar första " +
            "eller sista platsen flyttas " +
            "ingen. Du får istället ta " +
            "ett nytt frågekort.",
        },
      ];
    }

    case "drawBankModifiedChance": {
      return [
        {
          icon: "❓",

          title: "Dra ett nytt frågekort",

          description:
            "Betalningar till Banken " +
            "fördubblas. Om du inkasserar " +
            "pengar får du välja att dra " +
            "ett extra lotteri.",
        },
      ];
    }

    case "offerBankBonusLottery": {
      return [
        {
          icon: "🎟️",

          title: "Vill du ta ett lotteri?",

          description:
            "Du får välja att dra ett " +
            "extra lotteri eftersom du " +
            "inkasserade pengar.",
        },
      ];
    }

    case "winGame": {
      return [
        {
          icon: "🏆",

          title: "Du vinner Gubbspelet!",

          description:
            "Spelet avslutas direkt. " +
            "Du har vunnit genom att slå två sexor.",
        },
      ];
    }

    case "loseEverythingAndRestart": {
      return [
        {
          icon: "💸",

          title: "Förlora allt och börja om",

          description:
            "Lämna tillbaka alla dina " +
            "pengar och aktiebrev till Banken. " +
            "Flytta din spelpjäs till Start. " +
            "Du får fortsätta spela med 0 kr.",
        },
      ];
    }

    case "payPropertyOwnerPercentage": {
      const property = game.properties[effect.propertyId];

      return [
        {
          icon: "💸",

          title: "Betala " + effect.percent + "% av dina pengar",

          description:
            "Betala till ägaren av " +
            property.name +
            ". Om Banken äger företaget " +
            "betalar du till Banken istället. " +
            "Gäller ej om du själv äger " +
            property.name +
            ".",
        },
      ];
    }

    case "gainMoneyPerUnownedProperty": {
      return [
        {
          icon: "💰",

          title:
            "Inkassera " +
            effect.amount.toLocaleString("sv-SE") +
            " kr per osålt aktiebrev",

          description:
            "Du får pengar från Banken " +
            "för varje aktiebrev som ännu " +
            "inte ägs av någon spelare.",
        },
      ];
    }

    case "returnRandomPropertyToBank": {
      return [
        {
          icon: "🦍",

          title: "Förlora ett slumpmässigt aktiebrev",

          description:
            "Gorillan väljer slumpmässigt " +
            "ett av dina aktiebrev och " +
            "lämnar tillbaka det till Banken. " +
            "Gäller ej om du inte äger något aktiebrev.",
        },
      ];
    }

    case "chooseOpponentPropertyOrReset": {
      return [
        {
          icon: "📜",

          title: "Ta ett valfritt aktiebrev",

          description:
            "Välj ett aktiebrev som ägs av " +
            "en annan spelare. Om ingen " +
            "motståndare äger ett aktiebrev " +
            "måste alla utom du gå till Start.",
        },
      ];
    }

    case "moveToLeftPlayer": {
      return [
        {
          icon: "🚗",

          title: "Flytta till spelaren till vänster",

          description:
            "Ställ din spelpjäs på samma ruta " + "som spelaren till vänster.",
        },
      ];
    }

    case "rewardSwedenSupporters": {
      return [
        {
          icon: "🇸🇪",

          title: "Heja Sverige!",

          description:
            "Alla spelare som hejar på Sverige " +
            "i ishockey inkasserar " +
            effect.amount.toLocaleString("sv-SE") +
            " kr var.",
        },
      ];
    }

    case "askSwedenSupport": {
      return [
        {
          icon: "🏒",

          title: "Hejar du på Sverige?",

          description:
            "Svara ja för att inkassera " +
            effect.amount.toLocaleString("sv-SE") +
            " kr om du hejar på Sverige.",
        },
      ];
    }

    case "returnOwnedPropertyToBank": {
      const property = game.properties[effect.propertyId];

      return [
        {
          icon: "🏦",
          title: property.name + " går i konkurs",

          description:
            "Ägaren måste lämna tillbaka " +
            "aktiebrevet till Banken " +
            "utan ersättning.",
        },
      ];
    }

    case "moveAllToNearestPropertyWithFee": {
      const property = game.properties[effect.propertyId];

      return [
        {
          icon: "🏷️",

          title: "Alla åker till " + property.name,

          description:
            "Alla flyttas till sin närmaste " +
            property.name +
            " och betalar bara " +
            effect.fee.toLocaleString("sv-SE") +
            " kr i hyra. Gäller ej om Banken äger " +
            property.name +
            ".",
        },
      ];
    }

    case "payAllOtherPlayersExceptTile": {
      const excludedTile = game.board.find(
        (tile) => tile.id === effect.excludedTileId,
      );

      return [
        {
          icon: "🤝",

          title:
            "Ge " +
            effect.amount.toLocaleString("sv-SE") +
            " kr till varje spelare",

          description:
            "Alla andra spelare får pengar " +
            "av dig, utom de som står på " +
            (excludedTile?.name ?? "den undantagna rutan") +
            ".",
        },
      ];
    }

    case "payRightPlayer": {
      return [
        {
          icon: "💸",

          title: "Betala " + effect.amount.toLocaleString("sv-SE") + " kr",

          description: "Ge pengarna till spelaren " + "till höger.",
        },
      ];
    }

    case "propertyOwnerCollectFromAll": {
      const property = game.properties[effect.propertyId];

      return [
        {
          icon: "💰",

          title: property.name + "s ägare inkasserar pengar",

          description:
            "Alla andra spelare betalar " +
            effect.amount.toLocaleString("sv-SE") +
            " kr var till ägaren av " +
            property.name +
            ".",
        },
      ];
    }

    case "returnAllPropertiesToBank": {
      return [
        {
          icon: "🏦",

          title: "Alla aktiebrev återgår till Banken",

          description:
            "Alla spelare måste lämna tillbaka " +
            "samtliga sina aktiebrev till Banken " +
            "utan ersättning.",
        },
      ];
    }

    case "propertyOwnerCollectPercentage": {
      const property = game.properties[effect.propertyId];

      return [
        {
          icon: "🏦",

          title: "Inkassera " + effect.percent + "%",

          description:
            "Ägaren till " +
            property.name +
            " får " +
            effect.percent +
            "% av alla andra spelares " +
            "nuvarande pengar.",
        },
      ];
    }

    case "payLeftPlayer": {
      return [
        {
          icon: "💸",
          title: "Betala " + effect.amount.toLocaleString("sv-SE") + " kr",

          description: "Ge pengarna till spelaren " + "till vänster.",
        },
      ];
    }

    case "setMoney": {
      return [
        {
          icon: "💰",

          title: "Ha exakt " + effect.amount.toLocaleString("sv-SE") + " kr",

          description:
            "Inkassera eller betala pengar " +
            "till Banken tills du har exakt " +
            effect.amount.toLocaleString("sv-SE") +
            " kr.",
        },
      ];
    }

    case "requestReturnProperty": {
      const property = game.properties[effect.propertyId];

      return [
        {
          icon: "📜",

          title: property.name + " går i konkurs",

          description:
            'Ägaren måste säga "' +
            effect.phrase +
            '" och lämna tillbaka aktiebrevet ' +
            "till Banken utan ersättning.",
        },
      ];
    }

    case "returnPropertyToBank": {
      const property = game.properties[effect.propertyId];

      return [
        {
          icon: "🏦",

          title: "Lämna tillbaka " + property.name,

          description:
            "Aktiebrevet återgår till Banken. " +
            "Du får inga pengar tillbaka.",
        },
      ];
    }

    case "movePlayerAndLeftPlayerTo": {
      const destination = game.board.find((tile) => tile.id === effect.tileId);

      return [
        {
          icon: "🏥",
          title: "Åk till " + (destination?.name ?? "målet"),

          description:
            "Spelaren till vänster följer " + "med dig till samma ruta.",
        },
      ];
    }

    case "loseAllMoneyPercentage": {
      return [
        {
          icon: "🌪️",
          title: "Alla betalar " + effect.percent + "%",

          description:
            "Alla spelare betalar " +
            effect.percent +
            "% av sina nuvarande pengar " +
            "till Banken.",
        },
      ];
    }

    case "moveTowardsLeftPlayer": {
      return [
        {
          icon: "👣",
          title: "Gå " + effect.amount + " steg mot spelaren till vänster",

          description:
            "Om du kommer ikapp spelaren " +
            "stannar du på samma ruta och drar " +
            effect.drawCardsOnCatch +
            " extra frågekort.",
        },
      ];
    }

    case "movePropertyOwnersBackward": {
      return [
        {
          icon: "💨",
          title: "Backa " + effect.amount + " steg",

          description:
            "Alla spelare som äger minst " +
            "ett Aktiebrev flyttas bakåt. " +
            "Spelare utan Aktiebrev står kvar.",
        },
      ];
    }

    case "moveTowardsNearestBus": {
      return [
        {
          icon: "🚌",
          title: "Gå " + effect.amount + " steg mot närmaste busshållplats",

          description:
            "Följ den kortaste vägen till " +
            "närmaste Buss. Om du når " +
            "busshållplatsen tidigare " +
            "stannar du där.",
        },
      ];
    }

    case "ifIPhone": {
      return [
        {
          icon: "📱",
          title: "Spelar du på en iPhone?",

          description: "Effekten gäller endast om du " + "spelar på en iPhone.",
        },

        ...describeChanceEffect(effect.effect, game),
      ];
    }

    case "moveTowardsTile": {
      const destination = game.board.find((tile) => tile.id === effect.tileId);

      return [
        {
          icon: "👣",
          title:
            "Gå " +
            effect.amount +
            " steg mot " +
            (destination?.name ?? "målet"),

          description:
            "Följ vägen mot rutan. " + "Om du når den tidigare stannar du där.",
        },
      ];
    }

    case "drawThemedChanceCard": {
      return [
        {
          icon: "❓",
          title: "Dra ett nytt frågekort",
          description:
            "Du måste göra det som står på kortet. " +
            "Katter eller hundar: inkassera 61 000 kr. " +
            "Gubbar: backa 8 steg. " +
            "Papegojor: alla går till Sjukhuset.",
        },
      ];
    }

    case "ifNearFinish": {
      return [
        {
          icon: "🏁",
          title: "Är du " + effect.distance + " steg eller närmare Mål?",

          description:
            "Om du är tillräckligt nära Mål " +
            "gäller det första alternativet. " +
            "Annars gäller det andra alternativet.",
        },
        ...describeChanceEffect(effect.ifNear, game),
        ...describeChanceEffect(effect.otherwise, game),
      ];
    }

    case "extraOddRolls": {
      return [
        {
          icon: "🎲",
          title: "Slå " + effect.amount + " extra kast",

          description:
            "Du får bara gå framåt om " +
            "tärningen visar 1, 3 eller 5. " +
            "Vid 2, 4 eller 6 står du kvar.",
        },
      ];
    }

    case "rockPaperScissorsRichestVsPoorest": {
      return [
        {
          icon: "✊",
          title: "Rikast mot fattigast",

          description:
            "Spelaren med mest pengar möter " +
            "spelaren med minst pengar i " +
            "Sten-Sax-Påse. Bäst av en! " +
            "Vinnaren får " +
            effect.reward.toLocaleString("sv-SE") +
            " kr av Banken.",
        },
      ];
    }

    case "choosePlayerToTakeMoney": {
      return [
        {
          icon: "💰",
          title:
            "Ta " +
            effect.amount.toLocaleString("sv-SE") +
            " kr av valfri spelare",

          description: "Välj en annan spelare som ska betala dig.",
        },
      ];
    }

    case "takePlayerMoney": {
      const target = game.players.find((p) => p.id === effect.targetPlayerId);

      return [
        {
          icon: "💰",
          title:
            "Ta " +
            effect.amount.toLocaleString("sv-SE") +
            " kr av " +
            (target?.name ?? "spelaren"),

          description: "Pengarna överförs från den valda spelaren till dig.",
        },
      ];
    }

    case "moveAllForwardPerProperty": {
      return [
        {
          icon: "👣",
          title:
            "Alla spelare går " +
            effect.stepsPerProperty +
            " steg per aktiebrev",

          description:
            "Varje spelare går framåt baserat på hur många aktiebrev de själva äger. Spelare utan aktiebrev står kvar.",
        },
      ];
    }

    case "gainAllMoneyPercentage": {
      return [
        {
          icon: "💰",
          title: "Alla inkasserar " + effect.percent + "% av sina pengar",

          description:
            "Varje spelare får en belöning baserad på sina egna pengar. Avrunda uppåt till närmaste " +
            effect.roundUpTo.toLocaleString("sv-SE") +
            " kr.",
        },
      ];
    }

    case "moveToOpponentPropertyWithFee": {
      const property = game.properties[effect.propertyId];

      return [
        {
          icon: "💸",
          title: "Åk till " + property.name,

          description:
            "Om en annan spelare äger " +
            property.name +
            " måste du åka dit och betala " +
            effect.fee.toLocaleString("sv-SE") +
            " kr i hyra. Annars slipper du.",
        },
      ];
    }

    case "payIfVisitedHospital": {
      return [
        {
          icon: "🏥",
          title: "Sjukhusräkning",

          description:
            "Betala " +
            effect.amount.toLocaleString("sv-SE") +
            " kr om du har varit på Sjukhuset minst en gång under spelet. Annars slipper du betala.",
        },
      ];
    }

    case "moveBackwardToPropertyWithDiscount": {
      const property = game.properties[effect.propertyId];

      return [
        {
          icon: "👣",
          title: "Gå bakåt till närmsta " + property.name,

          description: "Flytta bakåt längs spelplanen till närmsta aktiebrev.",
        },
        {
          icon: "💸",
          title:
            "Rabatterad hyra: " + effect.fee.toLocaleString("sv-SE") + " kr",

          description:
            "Betala den rabatterade hyran om en annan spelare äger aktiebrevet. Om Banken äger det får du köpa det till ordinarie pris.",
        },
      ];
    }

    case "addNextRollSteps": {
      return [
        {
          icon: "🎲",
          title: "Nästa tärningsslag + " + effect.amount + " steg",

          description:
            "När det är din tur får du gå " +
            effect.amount +
            " steg extra utöver vad tärningen visar.",
        },
      ];
    }

    case "ifMoneyAbove": {
      return [
        {
          icon: "💰",
          title:
            "Om du har mer än " + effect.amount.toLocaleString("sv-SE") + " kr",

          description:
            "Följ detta alternativ om du har tillräckligt med pengar.",
        },

        ...describeChanceEffect(effect.ifAbove, game),

        {
          icon: "🔀",
          title: "Annars",

          description:
            "Följ detta alternativ om du har " +
            effect.amount.toLocaleString("sv-SE") +
            " kr eller mindre.",
        },

        ...describeChanceEffect(effect.otherwise, game),
      ];
    }

    case "drawLeftPlayerChanceCards": {
      return [
        {
          icon: "🃏",
          title: "Spelaren till vänster drar " + effect.amount + " frågekort",

          description:
            "Nästa aktiva spelare i turordningen drar och utför frågekorten.",
        },
      ];
    }

    case "payAllOtherPlayers": {
      return [
        {
          icon: "💸",
          title:
            "Betala " +
            effect.amount.toLocaleString("sv-SE") +
            " kr till varje spelare",

          description: "Be om ursäkt och betala alla andra aktiva spelare.",
        },
      ];
    }

    case "moveToNextLottery": {
      return [
        {
          icon: "🎟️",

          title: "Åk till nästa Lotteri",

          description:
            "Flytta framåt till närmaste " +
            "lotteriruta. " +
            (effect.drawChanceIfNone
              ? "Om det inte finns något lotteri framför dig tar du ett nytt frågekort istället."
              : "Om det inte finns något lotteri kvar går du till Mål."),
        },
      ];
    }

    case "ifOwnsProperty": {
      const property = game.properties[effect.propertyId];

      return [
        {
          icon: "🏢",
          title: "Om du äger " + property.name,

          description: "Följ detta alternativ om du äger aktiebrevet.",
        },

        ...describeChanceEffect(effect.ifOwned, game),

        {
          icon: "👣",
          title: "Om du inte äger " + property.name,

          description:
            "Följ istället detta alternativ om du inte äger aktiebrevet.",
        },

        ...describeChanceEffect(effect.otherwise, game),
      ];
    }

    case "gainMoneyIfOwnsEnoughProperties": {
      return [
        {
          icon: "💰",
          title: "Inkassera " + effect.amount.toLocaleString("sv-SE") + " kr",

          description:
            "Gäller endast om du äger minst " + effect.minimum + " aktiebrev.",
        },
      ];
    }

    case "moveLeftPlayerBackward": {
      return [
        {
          icon: "👣",
          title: "Spelaren till vänster går " + effect.amount + " steg bakåt",

          description:
            "Nästa aktiva spelare i turordningen flyttas bakåt och utför rutans vanliga effekt.",
        },
      ];
    }

    case "resetPropertyOwnerWithMultiplier": {
      const property = game.properties[effect.propertyId];

      const ownerId = game.ownership[effect.propertyId];

      const owner = game.players.find(
        (player) => player.id === ownerId && !player.eliminated,
      );

      return [
        {
          icon: "🏁",
          title: "Ägaren av " + property.name + " går till Start",

          description: owner
            ? owner.name + " flyttas direkt tillbaka till Start."
            : "Banken äger aktiebrevet. Ingen spelare flyttas.",
        },
        {
          icon: "🎲",
          title: "Nästa tärningsslag × " + effect.multiplier,

          description:
            "Ägaren får gå " +
            effect.multiplier +
            " gånger så långt som tärningen visar vid sitt nästa vanliga kast.",
        },
      ];
    }

    case "chooseRockPaperScissorsOpponent": {
      return [
        {
          icon: "✊",

          title: "Utmana en spelare i Sten-Sax-Påse",

          description:
            "Välj en motståndare. Bäst av 3. " +
            (effect.propertyPrize
              ? "Vinnaren väljer ett av motståndarens aktiebrev eller "
              : "Vinnaren inkasserar ") +
            effect.reward.toLocaleString("sv-SE") +
            " kr.",
        },
      ];
    }

    case "startRockPaperScissors": {
      const opponent = game.players.find(
        (target) => target.id === effect.targetPlayerId,
      );

      return [
        {
          icon: "✊",

          title: "Utmana " + (opponent?.name ?? "spelaren"),

          description:
            "Sten-Sax-Påse, bäst av 3. " +
            (effect.propertyPrize
              ? "Vinnaren får välja ett av förlorarens aktiebrev eller "
              : "Vinnaren får ") +
            effect.reward.toLocaleString("sv-SE") +
            " kr.",
        },
      ];
    }

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

    case "rollForEffect": {
      return [
        {
          icon: "🎲",
          title: effect.diceCount === 2 ? "Slå två tärningar" : "Slå tärningen",

          description:
            effect.diceCount === 2
              ? "Båda tärningarnas resultat avgör vad som händer."
              : "Tärningens resultat avgör vad som händer.",
        },
      ];
    }

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
