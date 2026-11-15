import { useEffect, useState } from "react";
import { socket } from "./socket";
import "./App.css";


function App() {
const [connected, setConnected] = useState(socket.connected);

useEffect(() => {
const onConnect = () => setConnected(true);
const onDisconnect = () => setConnected(false);

socket.on("connect", onConnect);
socket.on("disconnect", onDisconnect);

return () => {
socket.off("connect", onConnect);
socket.off("disconnect", onDisconnect);
};
}, []);

return (
<main>
<h1>🎲 Gubbspelet</h1>
<p>Welcome to Gubbspelet!</p>

<p style={{ color: connected ? "green" : "red" }}>
{connected
? "Connected to server"
: "Disconnected from server"}
</p>
</main>
);
}

export default App;