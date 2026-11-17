import type { GameState, PropertyId } from "../types";
import GameBoard from "./GameBoard";
import PurchaseCard from "./PurchaseCard";
import ChanceCardModal from "./ChanceCardModal";
import ActiveRewards from "./ActiveRewards";
import LoanStatus from "./LoanStatus";
import HospitalStatus from "./HospitalStatus";
import RockPaperScissorsModal from "./RockPaperScissorsModal";
import RollMultiplierStatus from "./RollMultiplierStatus";
import PropertyInfo from "./PropertyInfo";
import "./GameScreen.css";
import DebtModal from "./DebtModal";

interface GameScreenProps {
  game: GameState;
  playerId: string;
  roomCode: string;
  onRoll: () => void;
  onLeave: () => void;
  onPurchaseDecision: (decision: "buy" | "decline") => void;
  onContinueChance: (token: string, choiceIndex?: number) => void;
  onSellProperty: (propertyId: PropertyId) => void;
  diceAnnouncement: {
    playerName: string;
    dice: number;
  } | null;
}

const DICE_FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

export default function GameScreen({
  game,
  playerId,
  roomCode,
  onRoll,
  onLeave,
  onPurchaseDecision,
  onContinueChance,
  onSellProperty,
  diceAnnouncement,
}: GameScreenProps) {
  const currentPlayer = game.players[game.turnIndex];
  const isMyTurn = currentPlayer.id === playerId;

  const winner = game.players.find((player) => player.id === game.winnerId);

  const canSellProperties =
    isMyTurn &&
    game.phase === "rolling" &&
    !currentPlayer.eliminated &&
    !game.winnerId;

  const canRoll =
    isMyTurn &&
    game.phase === "rolling" &&
    !currentPlayer.eliminated &&
    !winner;

  return (
    <div className="game-screen">
      {/* Small top bar */}
      <div className="game-info-bar">
        <span>Gubbspelet — Rum: {roomCode}</span>

        <button
          className="leave-game-button"
          onClick={() => {
            if (window.confirm("Vill du lämna spelet?")) {
              onLeave();
            }
          }}
        >
          Lämna spel
        </button>
      </div>

      {winner && (
        <div className="winner-banner">
          <h2>🏆 {winner.name} vann!</h2>
          <p>Gubbspelet är avslutat.</p>
        </div>
      )}

      {/* Compact player cards */}
      <div className="game-players">
        {game.players.map((player) => {
          const isCurrent = player.id === currentPlayer.id;

          const ownedProperties = Object.values(game.properties).filter(
            (property) => game.ownership[property.id] === player.id,
          );

          return (
            <div
              key={player.id}
              className={
                "game-player-card" +
                (isCurrent && !player.eliminated ? " active-player" : "") +
                (player.eliminated ? " eliminated-player" : "")
              }
            >
              <div className="game-player-name">
                <span
                  className="game-player-piece"
                  style={{
                    backgroundColor: player.color,
                  }}
                />

                <strong>{player.name}</strong>

                {player.id === playerId && <small>(Du)</small>}

                {isCurrent && !player.eliminated && (
                  <span className="current-turn-tag">Tur</span>
                )}
              </div>

              <div className="player-money">
                {player.money.toLocaleString("sv-SE")} kr
              </div>

              <div className="player-location">
                {player.eliminated
                  ? "Ute ur spelet"
                  : game.board.find((tile) => tile.id === player.tileId)?.name}
              </div>

              {!player.eliminated && player.skipTurnsRemaining > 0 && (
                <div className="player-skip-status">
                  Står över {player.skipTurnsRemaining} kast
                </div>
              )}

              <details className="player-properties">
                <summary>Aktiebrev ({ownedProperties.length})</summary>

                <div className="owned-properties">
                  {ownedProperties.length === 0 ? (
                    <span className="no-properties">Inga aktiebrev</span>
                  ) : (
                    ownedProperties.map((property) => (
                      <PropertyInfo
                        key={property.id}
                        propertyId={property.id}
                        name={property.name}
                        price={property.price}
                        fee={property.fee}
                        ownedByMe={player.id === playerId}
                        canSell={player.id === playerId && canSellProperties}
                        onSell={onSellProperty}
                      />
                    ))
                  )}
                </div>
              </details>
            </div>
          );
        })}
      </div>

      {/* Compact turn and dice controls */}
      <div className="turn-panel">
        <div className="turn-information">
          <strong>
            Tur:{" "}
            <span style={{ color: currentPlayer.color }}>
              {currentPlayer.name}
            </span>
          </strong>

          <span className="turn-description">
            {game.phase === "moving"
              ? "Flyttar..."
              : game.phase === "purchase"
                ? "Köpbeslut pågår"
                : game.phase === "chance"
                  ? "Frågekort pågår"
                  : game.phase === "debt"
                    ? "Väntar på betalning"
                    : isMyTurn
                      ? "Din tur att slå!"
                      : "Väntar på spelaren..."}
          </span>
        </div>

        <div className="dice-panel">
          <span className="dice-face">
            {game.lastRoll ? DICE_FACES[game.lastRoll - 1] : "🎲"}
          </span>

          <button
            className="primary-button"
            disabled={!canRoll}
            onClick={onRoll}
          >
            Slå tärning
          </button>
        </div>
      </div>

      {/* Small message instead of a big panel */}
      <div className="game-message" role="status">
        {game.message}
      </div>

      {/* THE BOARD IS THE MAIN CONTENT */}
      <GameBoard
        tiles={game.board}
        players={game.players.filter((player) => !player.eliminated)}
        ownership={game.ownership}
      />

      {/* Optional information below the board */}
      <details className="game-extra-information">
        <summary>🎟️ Aktivt Lotteri och spelstatus</summary>

        <div className="extra-information-content">
          <div className="active-lottery">
            <strong>Aktivt Lotteri</strong>

            {game.activeLotteryCard ? (
              <p>{game.activeLotteryCard.text}</p>
            ) : (
              <p>Inget Lotteri har dragits ännu.</p>
            )}
          </div>

          <ActiveRewards game={game} />
          <LoanStatus game={game} />
          <HospitalStatus game={game} />
          <RollMultiplierStatus game={game} />
        </div>
      </details>

      {/* Purchase offer floats over the board */}
      {game.phase === "purchase" && (
        <div className="purchase-overlay">
          <div className="purchase-overlay-content">
            <PurchaseCard
              game={game}
              playerId={playerId}
              onDecision={onPurchaseDecision}
            />
          </div>
        </div>
      )}

      {/* Keep the existing Frågekort modals */}
      {game.chanceDraw &&
        (game.chanceDraw.rockPaperScissors ? (
          <RockPaperScissorsModal
            game={game}
            playerId={playerId}
            onContinue={onContinueChance}
          />
        ) : (
          <ChanceCardModal
            key={game.chanceDraw.token}
            game={game}
            playerId={playerId}
            onContinue={onContinueChance}
          />
        ))}

      {/* Shared dice announcement */}
      {diceAnnouncement && (
        <div
          className="dice-announcement-overlay"
          role="status"
          aria-live="assertive"
        >
          <div className="dice-announcement-box">
            <strong>{diceAnnouncement.playerName} slog</strong>

            <div className="dice-announcement-face">
              {DICE_FACES[diceAnnouncement.dice - 1]}
            </div>

            <div className="dice-announcement-number">
              {diceAnnouncement.dice}
            </div>
          </div>
        </div>
      )}

      {/* NEW: Debt popup */}
      {game.phase === "debt" && game.pendingDebt && (
        <DebtModal
          game={game}
          playerId={playerId}
          onSellProperty={onSellProperty}
        />
      )}
    </div>
  );
}
