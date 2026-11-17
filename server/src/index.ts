import express from "express";
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { Server } from "socket.io";

import {
  createGame,
  beginRoll,
  completeRoll,
  respondToPurchase,
  respondToChance,
  hasGroupMovement,
  advanceGroupMovement,
  sellProperty,
} from "./game/engine";

import type { GameState } from "./game/engine";

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
  isIPhone: boolean;
  avatar?: string;
}

interface Room {
  code: string;
  hostId: string;
  players: Player[];
  game?: GameState;
}

const rooms = new Map<string, Room>();

const MAX_PLAYERS = 4;
const MOVE_DELAY = 300;
const BUS_DELAY = 750;
const LANDING_DELAY = 350;

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

// Allow only small PNG, JPEG or WebP image data.
// SVG is deliberately not accepted.
function validateAvatar(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  if (value.length > 60_000) {
    return undefined;
  }

  const validImage =
    /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value);

  return validImage ? value : undefined;
}

io.on("connection", (socket) => {
  console.log("Player connected:", socket.id);

  // Detect whether the player is using an iPhone.
  const userAgent = socket.handshake.headers["user-agent"] ?? "";

  const isIPhone = /\biPhone\b/i.test(userAgent);

  // Create a new game room

  socket.on("createRoom", (data: unknown) => {
    if (!data || typeof data !== "object") {
      socket.emit("roomError", "Ogiltiga spelaruppgifter.");
      return;
    }

    const { name, avatar } = data as {
      name?: unknown;
      avatar?: unknown;
    };

    if (typeof name !== "string" || !name.trim()) {
      socket.emit("roomError", "Ange ditt namn.");
      return;
    }

    const safeAvatar = validateAvatar(avatar);

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
          isIPhone,
          avatar: safeAvatar,
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

    const { name, code, avatar } = data as {
      name?: unknown;
      code?: unknown;
      avatar?: unknown;
    };

    const safeAvatar = validateAvatar(avatar);

    if (typeof name !== "string" || !name.trim() || typeof code !== "string") {
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

    if (room.game) {
      socket.emit("roomError", "Spelet har redan börjat.");
      return;
    }

    room.players.push({
      id: socket.id,
      name: name.trim().slice(0, 30),
      isIPhone,
      avatar: safeAvatar,
    });

    socket.join(roomCode);
    socket.data.roomCode = roomCode;

    socket.emit("roomJoined", room);
    io.to(roomCode).emit("roomUpdated", room);

    console.log(name, "joined room", roomCode);
  });

  socket.on("startGame", () => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);

    if (!room) return;

    // Only the host can start the game.
    if (room.hostId !== socket.id) {
      return;
    }

    if (room.players.length < 2) {
      socket.emit("roomError", "Minst två spelare krävs.");
      return;
    }

    if (room.game) {
      return;
    }

    room.game = createGame(room.players);

    io.to(code).emit("roomUpdated", room);

    console.log("Game started in room", code);
  });

  socket.on("rollDice", () => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);

    if (!room?.game) return;

    const game = room.game;

    // Calculate the dice roll and movement path.
    const movement = beginRoll(game, socket.id);

    if (!movement) return;

    const player = game.players.find((p) => p.id === movement.playerId);

    if (!player) return;

    // Announce the dice result to EVERY player
    // in the room, including the person who rolled.
    io.to(code).emit("diceRolled", {
      playerName: player.name,
      dice: movement.dice,
    });

    // Broadcast the updated game state.
    io.to(code).emit("roomUpdated", room);

    let stepIndex = 0;

    const playNextStep = () => {
      // Stop if the room or game was removed.
      // This also handles someone leaving mid-game.
      if (
        rooms.get(code) !== room ||
        room.game !== game ||
        game.phase !== "moving"
      ) {
        return;
      }

      // All movement steps are finished.
      if (stepIndex >= movement.path.length) {
        completeRoll(game, movement);

        io.to(code).emit("roomUpdated", room);

        // Animate any group movement caused
        // by the remaining queued effects.
        scheduleGroupMovement(room);

        return;
      }

      // Move the piece one square.
      const nextTileId = movement.path[stepIndex];

      player.tileId = nextTileId;

      stepIndex++;

      // Show a special message at the first bus stop.
      if (
        movement.busFrom &&
        nextTileId === movement.busFrom &&
        stepIndex === movement.path.length - 1
      ) {
        game.message = player.name + " landade på Buss och åker vidare...";
      }

      // Broadcast this step to all players.
      io.to(code).emit("roomUpdated", room);

      const isWaitingForBus =
        movement.busFrom !== null &&
        nextTileId === movement.busFrom &&
        stepIndex === movement.path.length - 1;

      let delay = MOVE_DELAY;

      if (isWaitingForBus) {
        delay = BUS_DELAY;
      } else if (stepIndex === movement.path.length) {
        delay = LANDING_DELAY;
      }

      setTimeout(playNextStep, delay);
    };

    // Show the dice result before movement starts.
    setTimeout(playNextStep, 1200);
  });

  const groupTimers = new WeakMap<GameState, ReturnType<typeof setTimeout>>();

  function scheduleGroupMovement(room: Room, delay: number = MOVE_DELAY) {
    const game = room.game;

    if (!game || !hasGroupMovement(game)) {
      return;
    }

    // Avoid starting two timers for the same game.
    if (groupTimers.has(game)) {
      return;
    }

    const timer = setTimeout(() => {
      groupTimers.delete(game);

      // Stop if someone left or the game ended.
      if (
        rooms.get(room.code) !== room ||
        room.game !== game ||
        game.phase !== "moving"
      ) {
        return;
      }

      const nextDelay = advanceGroupMovement(game);

      // Send the updated positions to everyone.
      io.to(room.code).emit("roomUpdated", room);

      // Continue the animation if needed.
      if (nextDelay !== null) {
        scheduleGroupMovement(room, nextDelay);
      }
    }, delay);

    groupTimers.set(game, timer);
  }

  socket.on("purchaseDecision", (decision: unknown) => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);

    if (!room?.game) return;

    if (decision !== "buy" && decision !== "decline") {
      return;
    }

    const success = respondToPurchase(room.game, socket.id, decision);

    if (!success) {
      socket.emit("roomError", "Det gick inte att genomföra köpet.");
      return;
    }

    io.to(code).emit("roomUpdated", room);
    scheduleGroupMovement(room);
  });

  // Sell an owned Aktiebrev back to Banken.
  socket.on("sellProperty", (propertyId: unknown) => {
    const code = socket.data.roomCode;

    if (typeof code !== "string") {
      return;
    }

    const room = rooms.get(code);

    if (!room?.game) {
      return;
    }

    // Never trust a property ID sent by the client.
    if (
      typeof propertyId !== "string" ||
      !Object.prototype.hasOwnProperty.call(room.game.properties, propertyId)
    ) {
      return;
    }

    // socket.id identifies the player.
    // The engine verifies ownership and turn permissions.
    const success = sellProperty(
      room.game,
      socket.id,
      propertyId as keyof typeof room.game.properties,
    );

    if (!success) {
      socket.emit("roomError", "Du kan inte sälja detta aktiebrev just nu.");
      return;
    }

    // Update the money and ownership for everyone.
    io.to(code).emit("roomUpdated", room);
  });

  socket.on("continueChance", (token: unknown, choiceIndex?: unknown) => {
    const code = socket.data.roomCode;
    const room = rooms.get(code);

    if (!room?.game) return;

    if (typeof token !== "string") {
      return;
    }

    // Choices are optional, but if provided,
    // they must be valid integer numbers.
    if (
      choiceIndex !== undefined &&
      (typeof choiceIndex !== "number" || !Number.isInteger(choiceIndex))
    ) {
      return;
    }

    const success = respondToChance(
      room.game,
      socket.id,
      token,
      typeof choiceIndex === "number" ? choiceIndex : undefined,
    );

    if (!success) {
      return;
    }

    io.to(code).emit("roomUpdated", room);

    // Animate any group movement caused
    // by the selected card effect.
    scheduleGroupMovement(room);
  });

  // Remove a player from their current room
  function leaveRoom() {
    const code = socket.data.roomCode;
    if (!code) return;

    const room = rooms.get(code);

    socket.leave(code);
    delete socket.data.roomCode;

    if (!room) return;

    // Temporarily cancel the active game if a player leaves.
    if (room.game) {
      delete room.game;
    }

    room.players = room.players.filter((player) => player.id !== socket.id);

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
