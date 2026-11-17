import { useEffect, useRef } from "react";
import type { GameState } from "../types";
import "./ChanceCardModal.css";

interface ChanceCardModalProps {
  game: GameState;
  playerId: string;
  onContinue: (token: string, choiceIndex?: number) => void;
}

const DICE_FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

export default function ChanceCardModal({
  game,
  playerId,
  onContinue,
}: ChanceCardModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const draw = game.chanceDraw;

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) return;

    if (!dialog.open) {
      dialog.showModal();
    }

    return () => {
      if (dialog.open) {
        dialog.close();
      }
    };
  }, []);

  if (!draw) return null;

  const player = game.players.find((p) => p.id === draw.playerId);

  const isMyCard = draw.playerId === playerId;

  const cardNumber = draw.total - draw.remaining + 1;

  const cardEffect = draw.card.effect;

  const isTwoDiceCard =
    cardEffect.type === "rollForEffect" && cardEffect.diceCount === 2;

  const rolledDice = draw.diceResult
    ? (draw.diceResult.values ?? [draw.diceResult.value])
    : [];

  return (
    <dialog
      ref={dialogRef}
      className="chance-dialog"
      aria-labelledby="chance-card-heading"
      onCancel={(event) => {
        // A Frågekort must be resolved.
        event.preventDefault();
      }}
    >
      <div className="chance-card">
        <div className="chance-card-header">
          <strong>FRÅGEKORT</strong>

          <span>
            {cardNumber} av {draw.total}
          </span>
        </div>

        <p className="chance-player">
          {player?.name ?? "En spelare"} drog ett frågekort
        </p>

        <h2 id="chance-card-heading" className="chance-card-text">
          {draw.card.id === "chance-077" ? (
            <>
              <s>Någon</s> Kungen tycker det är kallt <s>ute</s> inne. Ta honom
              till sjukhuset. Sen när det är din tur så ska du addera 7 steg.
            </>
          ) : (
            draw.card.text
          )}
        </h2>

        {/* Show the result only AFTER a dice roll. */}
        {draw.diceResult && (
          <div className="chance-dice-result">
            <div className="chance-result-dice">
              {rolledDice.map((value, index) => (
                <span key={index}>{DICE_FACES[value - 1] ?? "🎲"}</span>
              ))}
            </div>

            <strong>
              {rolledDice.length === 2
                ? rolledDice[0] +
                  (draw.diceResult.calculation === "product" ? " × " : " + ") +
                  rolledDice[1] +
                  " = " +
                  draw.diceResult.value
                : player?.name + " slog " + draw.diceResult.value}
            </strong>

            <p>{draw.diceResult.label}</p>
          </div>
        )}

        {/* Choice cards still need buttons. */}
        {cardEffect.type === "choose" ? (
          <div className="chance-choices">
            {isMyCard ? (
              <>
                <p className="chance-instruction">Vad väljer du?</p>

                {cardEffect.options.map((option, index) => (
                  <button
                    key={index}
                    type="button"
                    className="chance-choice-button"
                    onClick={() => onContinue(draw.token, index)}
                  >
                    {option.label}
                  </button>
                ))}
              </>
            ) : (
              <>
                <p className="chance-instruction">{player?.name} får välja:</p>

                {cardEffect.options.map((option, index) => (
                  <div key={index} className="chance-choice-preview">
                    {option.label}
                  </div>
                ))}

                <p className="chance-waiting">
                  Väntar på {player?.name}s val...
                </p>
              </>
            )}
          </div>
        ) : isMyCard ? (
          <button
            type="button"
            className="chance-continue-button"
            onClick={() => onContinue(draw.token)}
          >
            {cardEffect.type === "rollForEffect"
              ? isTwoDiceCard
                ? "🎲🎲 Slå två tärningar"
                : "🎲 Slå tärningen"
              : "Fortsätt"}
          </button>
        ) : (
          <p className="chance-waiting">Väntar på {player?.name}...</p>
        )}
      </div>
    </dialog>
  );
}
