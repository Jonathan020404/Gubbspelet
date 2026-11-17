import type { GameState, PropertyId } from "../types";
import "./DebtModal.css";

interface DebtModalProps {
  game: GameState;
  playerId: string;
  onSellProperty: (propertyId: PropertyId) => void;
}

export default function DebtModal({
  game,
  playerId,
  onSellProperty,
}: DebtModalProps) {
  const debt = game.pendingDebt;

  if (!debt) return null;

  const payer = game.players.find((p) => p.id === debt.playerId);

  if (!payer) return null;

  const recipient = debt.recipientId
    ? game.players.find((p) => p.id === debt.recipientId)
    : null;

  const isMyDebt = playerId === debt.playerId;

  const properties = (Object.keys(game.ownership) as PropertyId[]).filter(
    (id) => game.ownership[id] === debt.playerId,
  );

  const missing = Math.max(0, debt.amount - payer.money);

  const format = (amount: number) => amount.toLocaleString("sv-SE") + " kr";

  return (
    <div className="debt-overlay">
      <section
        className="debt-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="debt-heading"
      >
        <h2 id="debt-heading">Betalning saknas</h2>

        <p>
          <strong>{payer.name}</strong> måste betala{" "}
          <strong>{format(debt.amount)}</strong> till{" "}
          <strong>{recipient?.name ?? "Banken"}</strong>.
        </p>

        <p>
          Pengar: {format(payer.money)}
          <br />
          Saknas: {format(missing)}
        </p>

        <hr />

        <h3>Aktiebrev att sälja</h3>

        {properties.map((propertyId) => {
          const property = game.properties[propertyId];

          const sellPrice = Math.floor(property.price * 0.5);

          return (
            <div className="debt-property" key={propertyId}>
              <div>
                <strong>{property.name}</strong>
                <small>Säljpris: {format(sellPrice)}</small>
              </div>

              {isMyDebt && (
                <button
                  type="button"
                  onClick={() => onSellProperty(propertyId)}
                >
                  Sälj
                </button>
              )}
            </div>
          );
        })}

        {!isMyDebt && (
          <p className="debt-waiting">
            Väntar på att {payer.name} säljer aktiebrev...
          </p>
        )}

        {isMyDebt && (
          <p className="debt-note">
            När du har tillräckligt med pengar betalas skulden automatiskt.
          </p>
        )}
      </section>
    </div>
  );
}
