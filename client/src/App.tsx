import { useEffect, useState, useRef } from "react";
import { socket } from "./socket";
import type { Room } from "./types";
import "./App.css";
import GameScreen from "./components/GameScreen";
import LotteryCardModal from "./components/LotteryCardModal";
import type { LotteryCard } from "./types";
import type { ChangeEvent } from "react";

type Screen = "menu" | "create" | "join" | "lobby";

function App() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [connected, setConnected] = useState(socket.connected);
  const [name, setName] = useState("");

  const [avatar, setAvatar] = useState<string | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);

  const [roomCode, setRoomCode] = useState("");
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState("");

  const [diceAnnouncement, setDiceAnnouncement] = useState<{
    playerName: string;
    dice: number;
  } | null>(null);

  const diceAnnouncementTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const [lotteryPopup, setLotteryPopup] = useState<LotteryCard | null>(null);

  const lastSeenLotteryVersion = useRef<number | null>(null);

  useEffect(() => {
    const game = room?.game;

    if (!game) {
      return;
    }

    const version = game.lotteryDrawVersion;

    if (lastSeenLotteryVersion.current === version) {
      return;
    }

    lastSeenLotteryVersion.current = version;

    if (version > 0 && game.activeLotteryCard) {
      setLotteryPopup(game.activeLotteryCard);
    }
  }, [room?.game?.lotteryDrawVersion, room?.game?.activeLotteryCard]);

  useEffect(() => {
    const onConnect = () => {
      setConnected(true);
    };

    const onDisconnect = () => {
      setConnected(false);
      setRoom(null);
      setScreen("menu");
    };

    const onRoomJoined = (newRoom: Room) => {
      setRoom(newRoom);
      setScreen("lobby");
      setError("");
    };

    const onRoomUpdated = (updatedRoom: Room) => {
      setRoom(updatedRoom);
    };

    const onDiceRolled = (data: { playerName: string; dice: number }) => {
      if (
        typeof data?.playerName !== "string" ||
        !Number.isInteger(data.dice) ||
        data.dice < 1 ||
        data.dice > 6
      ) {
        return;
      }

      setDiceAnnouncement(data);

      // Cancel an older dice announcement.
      if (diceAnnouncementTimer.current) {
        clearTimeout(diceAnnouncementTimer.current);
      }

      // Remove the overlay automatically.
      diceAnnouncementTimer.current = setTimeout(() => {
        setDiceAnnouncement(null);
        diceAnnouncementTimer.current = null;
      }, 1100);
    };

    const onRoomLeft = () => {
      setRoom(null);
      setScreen("menu");
    };

    const onRoomError = (message: string) => {
      setError(message);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("roomJoined", onRoomJoined);
    socket.on("roomUpdated", onRoomUpdated);
    socket.on("roomLeft", onRoomLeft);
    socket.on("diceRolled", onDiceRolled);
    socket.on("roomError", onRoomError);

    setConnected(socket.connected);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("roomJoined", onRoomJoined);
      socket.off("roomUpdated", onRoomUpdated);
      socket.off("roomLeft", onRoomLeft);
      socket.off("roomError", onRoomError);

      // NEW: Remove the dice event listener.
      socket.off("diceRolled", onDiceRolled);

      // NEW: Cancel any active dice announcement timer.
      if (diceAnnouncementTimer.current) {
        clearTimeout(diceAnnouncementTimer.current);
        diceAnnouncementTimer.current = null;
      }
    };
  }, []);

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    // Allow choosing the same file again.
    event.target.value = "";

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Välj en PNG-, JPG- eller WebP-bild.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Bilden får vara högst 10 MB.");
      return;
    }

    setAvatarLoading(true);
    setError("");

    const imageUrl = URL.createObjectURL(file);
    const image = new Image();

    try {
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Bilden kunde inte läsas."));
        image.src = imageUrl;
      });

      // Make a small square avatar.
      // This is much lighter than sending
      // an entire photo through Socket.IO.
      const size = 96;
      const canvas = document.createElement("canvas");

      canvas.width = size;
      canvas.height = size;

      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Kunde inte bearbeta bilden.");
      }

      const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);

      const sourceX = (image.naturalWidth - sourceSize) / 2;

      const sourceY = (image.naturalHeight - sourceSize) / 2;

      context.drawImage(
        image,
        sourceX,
        sourceY,
        sourceSize,
        sourceSize,
        0,
        0,
        size,
        size,
      );

      // WebP is supported by modern browsers.
      // Browsers without WebP support may use PNG.
      const resizedImage = canvas.toDataURL("image/webp", 0.75);

      if (resizedImage.length > 60_000) {
        throw new Error("Bilden blev för stor. Prova en annan bild.");
      }

      setAvatar(resizedImage);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Bilden kunde inte laddas.",
      );
    } finally {
      URL.revokeObjectURL(imageUrl);
      setAvatarLoading(false);
    }
  }

  function createRoom() {
    if (!name.trim()) {
      setError("Ange ditt namn.");
      return;
    }

    setError("");

    socket.emit("createRoom", {
      name: name.trim(),
      avatar,
    });
  }

  function joinRoom() {
    if (!name.trim() || !roomCode.trim()) {
      setError("Ange namn och rumskod.");
      return;
    }

    setError("");

    socket.emit("joinRoom", {
      name: name.trim(),
      code: roomCode.trim(),
      avatar,
    });
  }

  function leaveRoom() {
    socket.emit("leaveRoom");
  }

  function goToMenu() {
    setError("");
    setScreen("menu");
  }

  const isHost = room?.hostId === socket.id;

  return (
    <main className="app">
      <div
        className={
          "game-container" + (room?.game ? " game-container-wide" : "")
        }
      >
        <header className="game-header">
          <div className="board-decoration">
            <span className="tile blue">Bilaffär</span>
            <span className="tile yellow">?</span>
            <span className="tile orange">Lotteri</span>
          </div>

          <h1>Gubbspelet</h1>
          <p className="subtitle">Det klassiska familjespelet</p>
        </header>

        {screen === "menu" && (
          <div className="menu">
            <button
              className="primary-button"
              disabled={!connected}
              onClick={() => setScreen("create")}
            >
              Skapa spel
            </button>

            <button
              className="secondary-button"
              disabled={!connected}
              onClick={() => setScreen("join")}
            >
              Gå med i spel
            </button>
          </div>
        )}

        {screen === "create" && (
          <form
            className="menu"
            onSubmit={(event) => {
              event.preventDefault();
              createRoom();
            }}
          >
            <h2>Skapa spel</h2>

            <label htmlFor="create-name">Ditt namn</label>
            <input
              id="create-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Skriv ditt namn"
              maxLength={30}
            />

            <div className="avatar-picker">
              <label htmlFor="create-avatar">Spelarbild (valfritt)</label>

              <input
                id="create-avatar"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleAvatarChange}
              />

              {avatar && (
                <div className="avatar-preview">
                  <img src={avatar} alt="Din spelarbild" />

                  <button type="button" onClick={() => setAvatar(null)}>
                    Ta bort bild
                  </button>
                </div>
              )}

              {avatarLoading && <small>Bearbetar bilden...</small>}
            </div>

            <button
              className="primary-button"
              type="submit"
              disabled={!connected || avatarLoading}
            >
              Skapa rum
            </button>

            <button
              className="secondary-button"
              type="button"
              onClick={goToMenu}
            >
              Tillbaka
            </button>
          </form>
        )}

        {screen === "join" && (
          <form
            className="menu"
            onSubmit={(event) => {
              event.preventDefault();
              joinRoom();
            }}
          >
            <h2>Gå med i spel</h2>

            <label htmlFor="join-name">Ditt namn</label>
            <input
              id="join-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Skriv ditt namn"
              maxLength={30}
            />

            <div className="avatar-picker">
              <label htmlFor="join-avatar">Spelarbild (valfritt)</label>

              <input
                id="join-avatar"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleAvatarChange}
              />

              {avatar && (
                <div className="avatar-preview">
                  <img src={avatar} alt="Din spelarbild" />

                  <button type="button" onClick={() => setAvatar(null)}>
                    Ta bort bild
                  </button>
                </div>
              )}

              {avatarLoading && <small>Bearbetar bilden...</small>}
            </div>

            <label htmlFor="room-code">Rumskod</label>
            <input
              id="room-code"
              value={roomCode}
              onChange={(event) =>
                setRoomCode(event.target.value.toUpperCase())
              }
              placeholder="ABC123"
              maxLength={6}
            />

            <button
              className="primary-button"
              type="submit"
              disabled={!connected || avatarLoading}
            >
              Gå med
            </button>

            <button
              className="secondary-button"
              type="button"
              onClick={goToMenu}
            >
              Tillbaka
            </button>
          </form>
        )}

        {screen === "lobby" && room && !room.game && (
          <div className="menu">
            <div className="room-code">
              <p>Rumskod</p>
              <h2>{room.code}</h2>
              <small>Dela koden med dina medspelare</small>
            </div>

            <h3>Spelare ({room.players.length}/4)</h3>

            <div className="player-list">
              {room.players.map((player, index) => (
                <div className="player" key={player.id}>
                  <div className={"player-avatar color-" + index}>
                    {player.name.charAt(0).toUpperCase()}
                  </div>

                  <span>{player.name}</span>

                  {player.id === room.hostId && (
                    <span className="host-badge">Värd</span>
                  )}
                </div>
              ))}

              {Array.from({
                length: Math.max(0, 4 - room.players.length),
              }).map((_, index) => (
                <div className="player empty" key={index}>
                  <div className="player-avatar">?</div>
                  <span>Väntar på spelare...</span>
                </div>
              ))}
            </div>

            {isHost ? (
              <button
                className="primary-button"
                disabled={room.players.length < 2 || !connected}
                onClick={() => socket.emit("startGame")}
              >
                Starta spel
              </button>
            ) : (
              <p className="waiting-text">
                Väntar på att värden startar spelet...
              </p>
            )}

            <button className="secondary-button" onClick={leaveRoom}>
              Lämna rum
            </button>
          </div>
        )}

        {screen === "lobby" && room?.game && (
          <GameScreen
            game={room.game}
            playerId={socket.id ?? ""}
            roomCode={room.code}
            diceAnnouncement={diceAnnouncement}
            onRoll={() => socket.emit("rollDice")}
            onLeave={leaveRoom}
            onPurchaseDecision={(decision) =>
              socket.emit("purchaseDecision", decision)
            }
            onContinueChance={(token, choiceIndex) => {
              if (choiceIndex === undefined) {
                socket.emit("continueChance", token);
              } else {
                socket.emit("continueChance", token, choiceIndex);
              }
            }}
            onSellProperty={(propertyId) => {
              socket.emit("sellProperty", propertyId);
            }}
          />
        )}

        {error && <p className="error">{error}</p>}

        <footer className="connection-status">
          <span className={connected ? "status-dot online" : "status-dot"} />
          {connected ? "Ansluten till servern" : "Inte ansluten till servern"}
        </footer>
      </div>

      {/* NEW: Show the Lotteri popup to everyone */}
      {lotteryPopup && (
        <LotteryCardModal
          card={lotteryPopup}
          onClose={() => setLotteryPopup(null)}
        />
      )}
    </main>
  );
}

export default App;
