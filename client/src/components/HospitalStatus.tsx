import type { GameState } from "../types";
import "./HospitalStatus.css";

interface HospitalStatusProps {
  game: GameState;
}

export default function HospitalStatus({ game }: HospitalStatusProps) {
  const hospitalizedPlayers = game.players.filter(
    (player) => !player.eliminated && player.hospitalStay !== null,
  );

  if (hospitalizedPlayers.length === 0) {
    return null;
  }

  return (
    <section className="hospital-status" aria-label="Spelare på Sjukhuset">
      {hospitalizedPlayers.map((player) => {
        const stay = player.hospitalStay;

        if (!stay) {
          return null;
        }

        const releaseSquares = stay.propertyIds.map(
          (propertyId) => game.properties[propertyId].name,
        );

        if (stay.includeLottery) {
          releaseSquares.push("Lotteri");
        }

        return (
          <div className="hospital-panel" key={player.id}>
            <div className="hospital-panel-header">
              <div className="hospital-icon">🏥</div>

              <div className="hospital-header-text">
                <strong>Sjukhuset – {player.name}</strong>

                <small>Väntar på att bli befriad</small>
              </div>
            </div>

            <div className="hospital-release">
              <small>Någon måste landa på:</small>

              <div className="hospital-squares">
                {releaseSquares.map((name) => (
                  <span className="hospital-square" key={name}>
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
