import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";


const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
cors: {
origin: "http://localhost:5173",
},
});

app.get("/", (_req, res) => {
res.send("Gubbspelet server is running!");
});

io.on("connection", (socket) => {
console.log("Player connected:", socket.id);

socket.on("disconnect", () => {
console.log("Player disconnected:", socket.id);
});
});

const PORT = 3001;

httpServer.listen(PORT, () => {
console.log("Gubbspelet server running on port $DIL0");
});