
import express from "express";
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { Server } from "socket.io";

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
  },
});

interface Player {
  id: string;
  name: string;
}

interface Room {
  code: string;
  hostId: string;
  players: Player[];
}

const rooms = new Map<string, Room>();

const MAX_PLAYERS = 4;

// Generate a unique room code
function generateRoomCode(): string {
  let code: string;

  do {
    code = randomBytes(3).toString("hex").toUpperCase();
  } while (rooms.has(code));

  return code;
}

app.get("/", (_req, res) => {
  res.send("Gubbspelet server is running!");
});

io.on("connection", (socket) => {
  console.log("Player connected:", socket.id);

  // Create a new game room
  socket.on("createRoom", (name: unknown) => {
    if (typeof name !== "string" || !name.trim()) {
      socket.emit("roomError", "Ange ditt namn.");
      return;
    }

    if (socket.data.roomCode) {
      socket.emit("roomError", "Du är redan i ett rum.");
      return;
    }

    const code = generateRoomCode();

    const room: Room = {
      code,
      hostId: socket.id,
      players: [
        {
          id: socket.id,
          name: name.trim().slice(0, 30),
        },
      ],
    };

    rooms.set(code, room);
    socket.join(code);
    socket.data.roomCode = code;

    socket.emit("roomJoined", room);

    console.log("Room created:", code);
  });

  // Join an existing game room
  socket.on("joinRoom", (data: unknown) => {
    if (!data || typeof data !== "object") {
      return;
    }

    const { name, code } = data as {
      name?: unknown;
      code?: unknown;
    };

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof code !== "string"
    ) {
      socket.emit("roomError", "Ange namn och rumskod.");
      return;
    }

    if (socket.data.roomCode) {
      socket.emit("roomError", "Du är redan i ett rum.");
      return;
    }

    const roomCode = code.trim().toUpperCase();
    const room = rooms.get(roomCode);

    if (!room) {
      socket.emit("roomError", "Rummet finns inte.");
      return;
    }

    if (room.players.length >= MAX_PLAYERS) {
      socket.emit("roomError", "Rummet är fullt.");
      return;
    }

    room.players.push({
      id: socket.id,
      name: name.trim().slice(0, 30),
    });

    socket.join(roomCode);
    socket.data.roomCode = roomCode;

    socket.emit("roomJoined", room);
    io.to(roomCode).emit("roomUpdated", room);

    console.log(name, "joined room", roomCode);
  });

  // Remove a player from their current room
  function leaveRoom() {
    const code = socket.data.roomCode;
    if (!code) return;

    const room = rooms.get(code);

    socket.leave(code);
    delete socket.data.roomCode;

    if (!room) return;

    room.players = room.players.filter(
      (player) => player.id !== socket.id
    );

    if (room.players.length === 0) {
      rooms.delete(code);
      console.log("Room deleted:", code);
      return;
    }

    // Give another player host status
    if (room.hostId === socket.id) {
      room.hostId = room.players[0].id;
    }

    io.to(code).emit("roomUpdated", room);
  }

  socket.on("leaveRoom", () => {
    leaveRoom();
    socket.emit("roomLeft");
  });

  socket.on("disconnect", () => {
    leaveRoom();
    console.log("Player disconnected:", socket.id);
  });
});

const PORT = 3001;

httpServer.listen(PORT, () => {
  console.log("Gubbspelet server running on port", PORT);
});
