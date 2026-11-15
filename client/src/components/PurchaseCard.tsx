
import type { GameState } from "../types";
import "./PurchaseCard.css";

interface PurchaseCardProps {
  game: GameState;
  playerId: string;
  onDecision: (decision: "buy" | "decline") => void;
}

function formatMoney(amount: number) {
  return amount.toLocaleString("sv-SE") + " kr";
}

export default function PurchaseCard({
  game,
  playerId,
  onDecision,
}: PurchaseCardProps) {
  const offer = game.purchaseOffer;

  if (!offer) return null;

  const property =
    game.properties[offer.propertyId];

  const offeredPlayer = game.players.find(
    (player) => player.id === offer.playerId
  );

  if (!offeredPlayer) return null;

  const isMyOffer = offer.playerId === playerId;

  const canAfford =
    offeredPlayer.money >= offer.price;

  const isDiscounted =
    offer.price < property.price;

  return (
    <section className="purchase-panel">
      <div className="purchase-header">
        <span className="purchase-icon">📜</span>

        <div>
          <span className="purchase-kicker">
            AKTIEBREV
          </span>
          <h2>{property.name}</h2>
        </div>

        {isDiscounted && (
          <span className="discount-badge">
            −50%
          </span>
        )}
      </div>

      <div className="purchase-details">
        <div>
          <span>Köppris</span>

          {isDiscounted && (
            <del>{formatMoney(property.price)}</del>
          )}

          <strong>{formatMoney(offer.price)}</strong>
        </div>

        <div>
          <span>Avgift</span>
          <strong>{formatMoney(property.fee)}</strong>
        </div>
      </div>

      {isMyOffer ? (
        <>
          <h3>Vill du köpa detta aktiebrev?</h3>

          <p>
            Ditt saldo: {formatMoney(offeredPlayer.money)}
          </p>

          {canAfford ? (
            <p className="purchase-balance">
              Kvar efter köp:{" "}
              {formatMoney(
                offeredPlayer.money - offer.price
              )}
            </p>
          ) : (
            <p className="purchase-warning">
              Du har inte tillräckligt med pengar.
            </p>
          )}

          {offeredPlayer.money === offer.price && (
            <p className="purchase-warning">
              Om du köper aktiebrevet får du 0 kr
              och åker ut ur spelet.
            </p>
          )}

          <div className="purchase-buttons">
            <button
              className="primary-button"
              disabled={!canAfford}
              onClick={() => onDecision("buy")}
            >
              Köp aktiebrev
            </button>

            <button
              className="secondary-button"
              onClick={() => onDecision("decline")}
            >
              Tacka nej
            </button>
          </div>
        </>
      ) : (
        <div className="purchase-waiting">
          <span>⏳</span>

          <strong>
            Väntar på {offeredPlayer.name}...
          </strong>

          <p>
            {offeredPlayer.name} har fått ett
            erbjudande att köpa {property.name}.
          </p>
        </div>
      )}

      <p className="purchase-progress">
        Erbjudande {offer.offerIndex + 1} av{" "}
        {offer.eligiblePlayerIds.length}
      </p>
    </section>
  );
}
