import { useEffect, useRef } from "react";
import type { GameState } from "../types";
import "./ChanceCardModal.css";
import { describeChanceEffect } from "../chanceEffectText";

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
      dialog.close();
    };
  }, []);

  if (!draw) return null;

  const player = game.players.find((p) => p.id === draw.playerId);

  const isMyCard = draw.playerId === playerId;

  const cardNumber = draw.total - draw.remaining + 1;

  const effects = describeChanceEffect(draw.card.effect, game);

  const cardEffect = draw.card.effect;

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
        {/* CARD HEADER */}

        <div className="chance-card-header">
          <span>FRÅGEKORT</span>

          <span>
            {cardNumber} av {draw.total}
          </span>
        </div>

        <div className="chance-symbol">?</div>

        <p className="chance-player">{player?.name} drog ett frågekort</p>

        {/* ORIGINAL CARD TEXT */}

        <h2 id="chance-card-heading" className="chance-card-text">
          {draw.card.text}
        </h2>

        {/* SPECIAL DICE CARD: POSSIBLE OUTCOMES */}

        {cardEffect.type === "rollForEffect" && (
          <div className="chance-dice-outcomes">
            {cardEffect.outcomes.map((outcome) => (
              <div
                className="chance-dice-outcome"
                key={outcome.rolls.join("-")}
              >
                <span className="chance-dice-number">
                  {outcome.rolls.join("–")}
                </span>

                <span>{outcome.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* SPECIAL DICE CARD: ROLLED RESULT */}

        {draw.diceResult && (
          <div className="chance-dice-result">
            <div className="chance-dice-face">
              {DICE_FACES[draw.diceResult.value - 1]}
            </div>

            <h3>
              {player?.name} slog {draw.diceResult.value}!
            </h3>

            <p>{draw.diceResult.label}</p>
          </div>
        )}

        {/* EFFECT DESCRIPTIONS */}

        <div className="chance-effects">
          {effects.map((effect, index) => (
            <div className="chance-effect" key={index}>
              <span className="chance-effect-icon">{effect.icon}</span>

              <div>
                <strong>{effect.title}</strong>

                <small>{effect.description}</small>
              </div>
            </div>
          ))}
        </div>

        {/* CHOICE CARDS */}

        {cardEffect.type === "choose" ? (
          <div className="chance-choices">
            {isMyCard ? (
              <>
                <h3>Vad väljer du?</h3>

                {cardEffect.options.map((option, index) => {
                  const descriptions = describeChanceEffect(
                    option.effect,
                    game,
                  );

                  return (
                    <button
                      key={index}
                      className={
                        "chance-choice-button" +
                        (index === 0 ? " chance-choice-primary" : "")
                      }
                      onClick={() => onContinue(draw.token, index)}
                    >
                      <span className="chance-choice-icon">
                        {descriptions[0]?.icon ?? "?"}
                      </span>

                      <span className="chance-choice-content">
                        <strong>{option.label}</strong>

                        <small>
                          {descriptions
                            .map((description) => description.description)
                            .join(" ")}
                        </small>
                      </span>

                      <span className="chance-choice-arrow">›</span>
                    </button>
                  );
                })}
              </>
            ) : (
              <>
                <h3>{player?.name} får välja mellan:</h3>

                {cardEffect.options.map((option, index) => (
                  <div className="chance-choice-preview" key={index}>
                    {option.label}
                  </div>
                ))}

                <div className="chance-waiting">
                  Väntar på {player?.name}s val...
                </div>
              </>
            )}
          </div>
        ) : isMyCard ? (
          /* NORMAL AND DICE CARD BUTTON */

          <button
            className="chance-continue-button"
            onClick={() => onContinue(draw.token)}
          >
            {cardEffect.type === "rollForEffect"
              ? "🎲 Slå tärningen"
              : "Fortsätt"}
          </button>
        ) : (
          /* WAITING MESSAGE FOR OTHER PLAYERS */

          <div className="chance-waiting">Väntar på {player?.name}...</div>
        )}

        {/* CARD FOOTER */}

        <div className="chance-card-footer">GUBBSPELET</div>
      </div>
    </dialog>
  );
}
