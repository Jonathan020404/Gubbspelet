import type { GameState } from "../types";
import "./LoanStatus.css";

interface LoanStatusProps {
  game: GameState;
}

export default function LoanStatus({ game }: LoanStatusProps) {
  const borrowers = game.players.filter(
    (player) => !player.eliminated && player.loans.length > 0,
  );

  if (borrowers.length === 0) {
    return null;
  }

  return (
    <section className="loan-status" aria-label="Utestående banklån">
      {borrowers.map((player) => {
        const repayment = player.loans.reduce((total, loan) => {
          const ownsDiscountProperty =
            game.ownership[loan.discountPropertyId] === player.id;

          return (
            total +
            (ownsDiscountProperty ? loan.discountedRepayment : loan.repayment)
          );
        }, 0);

        const ordinaryRepayment = player.loans.reduce(
          (total, loan) => total + loan.repayment,
          0,
        );

        const discount = ordinaryRepayment - repayment;

        return (
          <div className="loan-panel" key={player.id}>
            <div className="loan-panel-header">
              <div className="loan-icon">🏦</div>

              <div className="loan-header-text">
                <strong>Banklån – {player.name}</strong>

                <small>{player.loans.length} utestående lån</small>
              </div>
            </div>

            <div className="loan-repayment">
              <span>Återbetalning vid Mål</span>

              <strong>{repayment.toLocaleString("sv-SE")} kr</strong>
            </div>

            {discount > 0 ? (
              <small className="loan-discount">
                Rabatt: {discount.toLocaleString("sv-SE")} kr eftersom du äger
                rätt aktiebrev.
              </small>
            ) : (
              <small className="loan-note">
                Äger du Svensk Bank vid Mål betalar du mindre.
              </small>
            )}

            <small className="loan-note">
              Har du inte råd måste du börja om från Start. Lånet avskrivs.
            </small>
          </div>
        );
      })}
    </section>
  );
}
