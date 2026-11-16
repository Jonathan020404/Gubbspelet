import { useEffect, useRef } from "react";

import type { GameState, RockPaperScissorsChoice } from "../types";

import "./RockPaperScissorsModal.css";

interface RockPaperScissorsModalProps {
  game: GameState;
  playerId: string;
  onContinue: (token: string, choiceIndex?: number) => void;
}

const CHOICES: {
  value: RockPaperScissorsChoice;
  label: string;
  emoji: string;
}[] = [
  {
    value: "rock",
    label: "Sten",
    emoji: "✊",
  },
  {
    value: "scissors",
    label: "Sax",
    emoji: "✌️",
  },
  {
    value: "paper",
    label: "Påse",
    emoji: "✋",
  },
];

function getChoiceEmoji(choice: RockPaperScissorsChoice) {
  return CHOICES.find((item) => item.value === choice)?.emoji ?? "?";
}

export default function RockPaperScissorsModal({
  game,
  playerId,
  onContinue,
}: RockPaperScissorsModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const draw = game.chanceDraw;
  const match = draw?.rockPaperScissors;

  useEffect(() => {
    const dialog = dialogRef.current;

    if (dialog && !dialog.open) {
      dialog.showModal();
    }

    return () => {
      if (dialog?.open) {
        dialog.close();
      }
    };
  }, []);

  if (!draw || !match) {
    return null;
  }

  // NEW: Card 177 has a choice of prizes.
  const hasPropertyPrize = draw.card.id === "chance-177";

  const prizeText = hasPropertyPrize
    ? "Ett av motståndarens aktiebrev eller " +
      match.reward.toLocaleString("sv-SE") +
      " kr"
    : match.reward.toLocaleString("sv-SE") + " kr";

  const player1 = game.players.find((player) => player.id === match.player1Id);

  const player2 = game.players.find((player) => player.id === match.player2Id);

  const winner = game.players.find((player) => player.id === match.winnerId);

  const isParticipant =
    playerId === match.player1Id || playerId === match.player2Id;

  const hasSubmitted = match.submittedPlayerIds.includes(playerId);

  const player1Submitted = match.submittedPlayerIds.includes(match.player1Id);

  const player2Submitted = match.submittedPlayerIds.includes(match.player2Id);

  const lastRoundWinner = game.players.find(
    (player) => player.id === match.lastRound?.winnerId,
  );

  return (
    <dialog
      ref={dialogRef}
      className="rps-modal"
      onCancel={(event) => event.preventDefault()}
    >
      <div className="rps-card">
        <div className="rps-kicker">
          FRÅGEKORT · {draw.card.id.replace("chance-", "")}
        </div>

        <h2>Sten-Sax-Påse</h2>

        <p className="rps-subtitle">
          {(match.winsRequired ?? 2) === 1 ? "Bäst av 1" : "Bäst av 3"}
        </p>

        <div className="rps-prize">
          🏆 {hasPropertyPrize ? "Vinnaren väljer: " : "Vinnaren får "}
          {prizeText}
        </div>

        <div className="rps-scoreboard">
          <div className="rps-player">
            <strong>{player1?.name ?? "Spelare 1"}</strong>

            <div className="rps-score">{match.player1Score}</div>

            {!match.winnerId && (
              <small>{player1Submitted ? "✓ Har valt" : "Väljer..."}</small>
            )}
          </div>

          <div className="rps-versus">VS</div>

          <div className="rps-player">
            <strong>{player2?.name ?? "Spelare 2"}</strong>

            <div className="rps-score">{match.player2Score}</div>

            {!match.winnerId && (
              <small>{player2Submitted ? "✓ Har valt" : "Väljer..."}</small>
            )}
          </div>
        </div>

        {match.lastRound && (
          <div className="rps-last-round">
            <small>Senaste rundan</small>

            <div className="rps-reveal">
              <span>{getChoiceEmoji(match.lastRound.player1Choice)}</span>

              <span>VS</span>

              <span>{getChoiceEmoji(match.lastRound.player2Choice)}</span>
            </div>

            <strong>
              {match.lastRound.winnerId
                ? (lastRoundWinner?.name ?? "Spelaren") + " vann rundan!"
                : "Oavgjort!"}
            </strong>
          </div>
        )}

        {match.winnerId ? (
          <div className="rps-winner">
            <div className="rps-trophy">🏆</div>

            <h3>{winner?.name ?? "Spelaren"} vinner!</h3>

            {/* NEW: Show the correct prize message. */}
            <p>
              {hasPropertyPrize
                ? "Vinnaren får välja sitt pris!"
                : "Inkasserar " + prizeText}
            </p>

            {playerId === match.player1Id ? (
              <button
                className="rps-continue"
                onClick={() => onContinue(draw.token)}
              >
                Fortsätt
              </button>
            ) : (
              <small>
                Väntar på att {player1?.name ?? "spelaren"} fortsätter...
              </small>
            )}
          </div>
        ) : (
          <>
            <div className="rps-round">Runda {match.round}</div>

            {isParticipant ? (
              hasSubmitted ? (
                <div className="rps-waiting">
                  ✓ Ditt val är låst!
                  <small>Väntar på motståndaren...</small>
                </div>
              ) : (
                <>
                  <p className="rps-prompt">Gör ditt val!</p>

                  <div className="rps-choices">
                    {CHOICES.map((choice, index) => (
                      <button
                        key={choice.value}
                        className="rps-choice"
                        onClick={() => onContinue(draw.token, index)}
                      >
                        <span>{choice.emoji}</span>

                        <strong>{choice.label}</strong>
                      </button>
                    ))}
                  </div>
                </>
              )
            ) : (
              <div className="rps-waiting">
                Du tittar på matchen.
                <small>Väntar på spelarnas val...</small>
              </div>
            )}
          </>
        )}

        <div className="rps-footer">GUBBSPELET</div>
      </div>
    </dialog>
  );
}
