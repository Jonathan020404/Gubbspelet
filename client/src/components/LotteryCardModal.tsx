import type { LotteryCard } from "../types";
import "./LotteryCardModal.css";

interface LotteryCardModalProps {
  card: LotteryCard;
  onClose: () => void;
}

export default function LotteryCardModal({
  card,
  onClose,
}: LotteryCardModalProps) {
  return (
    <div className="lottery-modal-overlay">
      <div
        className="lottery-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Nytt Lotteri"
      >
        <div className="lottery-modal-icon">🎟️</div>

        <div className="lottery-modal-heading">NYTT LOTTERI!</div>

        <div className="lottery-modal-card">
          <div className="lottery-modal-label">LOTTERI</div>

          <p className="lottery-modal-text">{card.text}</p>
        </div>

        <p className="lottery-modal-info">
          Denna regel gäller alla spelare tills ett nytt Lotteri dras.
        </p>

        <button className="lottery-modal-button" onClick={onClose}>
          OK
        </button>
      </div>
    </div>
  );
}
