
import { useEffect, useRef } from "react";
import type { GameState } from "../types";
import "./ChanceCardModal.css";
import { describeChanceEffect } from "../chanceEffectText";

interface ChanceCardModalProps {
  game: GameState;
  playerId: string;
  onContinue: (token: string) => void;
}

export default function ChanceCardModal({
  game,
  playerId,
  onContinue,
}: ChanceCardModalProps) {
  const dialogRef =
    useRef<HTMLDialogElement>(null);

  const draw = game.chanceDraw;

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) return;

    if (!dialog.open) {
      dialog.showModal();
    }

    return () => {
      dialog.close();
    };
  }, []);

  if (!draw) return null;

  const player = game.players.find(
    (p) => p.id === draw.playerId
  );

  const isMyCard = draw.playerId === playerId;

  const cardNumber =
    draw.total - draw.remaining + 1;

  const effects = describeChanceEffect(
    draw.card.effect,
    game
  );

  return (
    <dialog
      ref={dialogRef}
      className="chance-dialog"
      onCancel={(event) => {
        // Do not allow Escape to dismiss
        // an unresolved question card.
        event.preventDefault();
      }}
      aria-labelledby="chance-card-heading"
    >
      <div className="chance-card">
        <div className="chance-card-header">
          <span>FRÅGEKORT</span>

          <span>
            {cardNumber} av {draw.total}
          </span>
        </div>

        <div className="chance-symbol">?</div>

        <p className="chance-player">
          {player?.name} drog ett frågekort
        </p>

        <h2
          id="chance-card-heading"
          className="chance-card-text"
        >
          {draw.card.text}
        </h2>

        
<div className="chance-effects">
  {effects.map((effect, index) => (
    <div
      className="chance-effect"
      key={index}
    >
      <span className="chance-effect-icon">
        {effect.icon}
      </span>

      <div>
        <strong>{effect.title}</strong>

        <small>
          {effect.description}
        </small>
      </div>
    </div>
  ))}
</div>


        {isMyCard ? (
          <button
            className="chance-continue-button"
            onClick={() =>
              onContinue(draw.token)
            }
          >
            {draw.remaining > 1
              ? "Nästa kort"
              : "Fortsätt"}
          </button>
        ) : (
          <div className="chance-waiting">
            Väntar på {player?.name}...
          </div>
        )}

        <div className="chance-card-footer">
          GUBBSPELET
        </div>
      </div>
    </dialog>
  );
}
