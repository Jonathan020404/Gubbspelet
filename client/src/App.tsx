
import { useEffect, useState } from "react";
import { socket } from "./socket";
import type { Room } from "./types";
import "./App.css";
import GameScreen from "./components/GameScreen";

type Screen = "menu" | "create" | "join" | "lobby";

function App() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [connected, setConnected] = useState(socket.connected);
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState("");

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
    socket.on("roomError", onRoomError);

    setConnected(socket.connected);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("roomJoined", onRoomJoined);
      socket.off("roomUpdated", onRoomUpdated);
      socket.off("roomLeft", onRoomLeft);
      socket.off("roomError", onRoomError);
    };
  }, []);

  function createRoom() {
    if (!name.trim()) {
      setError("Ange ditt namn.");
      return;
    }

    setError("");
    socket.emit("createRoom", name.trim());
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
          "game-container" +
          (room?.game ? " game-container-wide" : "")
        }
      >
        <header className="game-header">
          <div className="board-decoration">
            <span className="tile blue">Bilaffär</span>
            <span className="tile yellow">?</span>
            <span className="tile orange">Lotteri</span>
          </div>

          <h1>Gubbspelet</h1>
          <p className="subtitle">
            Det klassiska familjespelet
          </p>
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

            <button
              className="primary-button"
              type="submit"
              disabled={!connected}
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
              disabled={!connected}
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
                  <div
                    className={"player-avatar color-" + index}
                  >
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

            <button
              className="secondary-button"
              onClick={leaveRoom}
            >
              Lämna rum
            </button>
          </div>
        )}


        
        
        {screen === "lobby" && room?.game && (
          <GameScreen
            game={room.game}
            playerId={socket.id ?? ""}
            roomCode={room.code}
            onRoll={() => socket.emit("rollDice")}
            onLeave={leaveRoom}
            onPurchaseDecision={(decision) =>
              socket.emit("purchaseDecision", decision)
            }
            onContinueChance={(token) =>
              socket.emit("continueChance", token)
            }
          />
        )}



        {error && <p className="error">{error}</p>}

        <footer className="connection-status">
          <span
            className={
              connected ? "status-dot online" : "status-dot"
            }
          />
          {connected
            ? "Ansluten till servern"
            : "Inte ansluten till servern"}
        </footer>
      </div>
    </main>
  );
}

export default App;
