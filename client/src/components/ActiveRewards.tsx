import type { GameState } from "../types";
import "./ActiveRewards.css";

interface ActiveRewardsProps {
  game: GameState;
}

export default function ActiveRewards({ game }: ActiveRewardsProps) {
  const rewards = game.moneyPerRollRewards;

  if (rewards.length === 0) {
    return null;
  }

  return (
    <section className="active-rewards" aria-label="Aktiva frågekortseffekter">
      {rewards.map((reward) => {
        const player = game.players.find((p) => p.id === reward.playerId);

        const property = game.properties[reward.untilPropertyId];

        if (!player || player.eliminated) {
          return null;
        }

        return (
          <div className="active-reward" key={reward.id}>
            <div className="active-reward-icon">🌳</div>

            <div className="active-reward-content">
              <strong>Pengaträdet – {player.name}</strong>

              <span className="active-reward-amount">
                +{reward.amount.toLocaleString("sv-SE")}
                {" kr efter varje tärningsslag"}
              </span>

              <small>Gäller tills någon landar på {property.name}.</small>
            </div>
          </div>
        );
      })}
    </section>
  );
}
