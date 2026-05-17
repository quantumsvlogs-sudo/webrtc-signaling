const WebSocket = require("ws");


const PORT = process.env.PORT || 3000;
const wss = new WebSocket.Server({ port: PORT });

let rooms = new Map();

function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Set());
  }
  return rooms.get(roomId);
}

wss.on("connection", (ws) => {
  let currentRoom = null;

  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg.toString());

      // join room
      if (data.type === "join") {
        currentRoom = data.room;
        const room = getRoom(currentRoom);
        room.add(ws);

        // notify others
        room.forEach((client) => {
          if (client !== ws && client.readyState === 1) {
            client.send(JSON.stringify({ type: "peer-joined" }));
          }
        });
      }

      // relay signaling data
      if (
        data.type === "offer" ||
        data.type === "answer" ||
        data.type === "candidate"
      ) {
        const room = getRoom(currentRoom);
        room.forEach((client) => {
          if (client !== ws && client.readyState === 1) {
            client.send(JSON.stringify(data));
          }
        });
      }
    } catch (e) {
      console.error("bad message", e);
    }
  });

  ws.on("close", () => {
    if (currentRoom) {
      const room = getRoom(currentRoom);
      room.delete(ws);
    }
  });
});

console.log("WebRTC signaling server running on port", PORT);
