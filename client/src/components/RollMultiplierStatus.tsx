import type { GameState } from "../types";
import "./RollMultiplierStatus.css";

interface RollMultiplierStatusProps {
  game: GameState;
}

export default function RollMultiplierStatus({
  game,
}: RollMultiplierStatusProps) {
  const boostedPlayers = game.players.filter(
    (player) =>
      !player.eliminated &&
      (player.nextRollMultiplier > 1 || player.nextRollBonus > 0),
  );

  if (boostedPlayers.length === 0) {
    return null;
  }

  return (
    <section className="roll-multiplier-status" aria-label="Aktiva superkast">
      {boostedPlayers.map((player) => (
        <div className="roll-multiplier-panel" key={player.id}>
          <div className="roll-multiplier-icon">🎲</div>

          <div className="roll-multiplier-info">
            <strong>Superkast – {player.name}</strong>

            <small>
              {player.nextRollMultiplier > 1 &&
                `Nästa kast ger ${player.nextRollMultiplier} gånger så många steg. `}
              {player.nextRollBonus > 0 &&
                `Gå ${player.nextRollBonus} extra steg vid nästa kast.`}
            </small>
          </div>

          <div className="roll-multiplier-value">
            {player.nextRollMultiplier > 1 && `×${player.nextRollMultiplier}`}
            {player.nextRollBonus > 0 && ` +${player.nextRollBonus}`}
          </div>
        </div>
      ))}
    </section>
  );
}
