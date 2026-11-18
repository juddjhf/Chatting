import { io } from "socket.io-client";

function getSocketOrigin() {
  const configured = import.meta.env.VITE_API_URL || "http://localhost:5000";
  return configured.replace(/\/api\/?$/, "").replace(/\/+$/, "");
}

export function createChatSocket(token) {
  return io(getSocketOrigin(), {
    auth: { token },
    autoConnect: false,
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 8,
    reconnectionDelayMax: 5000,
  });
}
