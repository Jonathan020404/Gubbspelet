import type { GameState } from "../types";
import GameBoard from "./GameBoard";
import "./GameScreen.css";
import PurchaseCard from "./PurchaseCard";
import ChanceCardModal from "./ChanceCardModal";
import ActiveRewards from "./ActiveRewards";
import LoanStatus from "./LoanStatus";
import HospitalStatus from "./HospitalStatus";
import RockPaperScissorsModal from "./RockPaperScissorsModal";
import RollMultiplierStatus from "./RollMultiplierStatus";

interface GameScreenProps {
  game: GameState;
  playerId: string;
  roomCode: string;
  onRoll: () => void;
  onLeave: () => void;
  onPurchaseDecision: (decision: "buy" | "decline") => void;
  onContinueChance: (token: string, choiceIndex?: number) => void;
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
}: GameScreenProps) {
  const currentPlayer = game.players[game.turnIndex];

  const isMyTurn = currentPlayer.id === playerId;

  const winner = game.players.find((player) => player.id === game.winnerId);

  return (
    <div className="game-screen">
      <div className="game-info-bar">
        <span>Rum: {roomCode}</span>

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

      <div className="turn-panel">
        <div>
          <span className="turn-label">Nuvarande tur</span>

          <h2 style={{ color: currentPlayer.color }}>{currentPlayer.name}</h2>

          {!winner && (
            <p>
              {game.phase === "moving"
                ? game.message
                : game.phase === "purchase"
                  ? "Väntar på köpbeslut..."
                  : game.phase === "chance"
                    ? "Läser frågekort: " +
                      (game.players.find(
                        (player) => player.id === game.chanceDraw?.playerId,
                      )?.name ?? "")
                    : isMyTurn
                      ? "Det är din tur!"
                      : "Väntar på " + currentPlayer.name + "..."}
            </p>
          )}
        </div>

        <div className="dice-panel">
          <span className="dice-face">
            {game.lastRoll ? DICE_FACES[game.lastRoll - 1] : "🎲"}
          </span>

          <button
            className="primary-button"
            disabled={!isMyTurn || game.phase !== "rolling" || !!winner}
            onClick={onRoll}
          >
            {game.phase === "moving" ? "Flyttar..." : "Slå tärning"}
          </button>
        </div>
      </div>

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

                {player.id === playerId && <small> (Du)</small>}
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
                  ⏳ Står över {player.skipTurnsRemaining} kast
                </div>
              )}

              <div className="owned-properties">
                <strong>Aktiebrev ({ownedProperties.length})</strong>

                {ownedProperties.length === 0 ? (
                  <span className="no-properties">Inga aktiebrev</span>
                ) : (
                  ownedProperties.map((property) => (
                    <span
                      className="owned-property"
                      key={property.id}
                      title={
                        "Avgift: " +
                        property.fee.toLocaleString("sv-SE") +
                        " kr"
                      }
                    >
                      {property.name}
                    </span>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="game-message">{game.message}</div>

      {game.phase === "moving" && (
        <div className="movement-progress">
          <div className="movement-progress-bar" />
        </div>
      )}

      {game.phase === "purchase" && (
        <PurchaseCard
          game={game}
          playerId={playerId}
          onDecision={onPurchaseDecision}
        />
      )}

      <ActiveRewards game={game} />

      <LoanStatus game={game} />

      <HospitalStatus game={game} />

      <RollMultiplierStatus game={game} />

      <div className="active-lottery">
        <div className="active-lottery-heading">🎟️ AKTIVT LOTTERI</div>

        {game.activeLotteryCard ? (
          <>
            <p className="active-lottery-text">{game.activeLotteryCard.text}</p>

            <p className="active-lottery-note">
              Gäller alla spelare tills ett nytt Lotteri dras.
            </p>
          </>
        ) : (
          <p className="active-lottery-note">Inget Lotteri har dragits ännu.</p>
        )}
      </div>

      <GameBoard
        tiles={game.board}
        players={game.players.filter((player) => !player.eliminated)}
        ownership={game.ownership}
      />

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
    </div>
  );
}
