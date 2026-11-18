import { Server } from "socket.io";
import { getAllowedOrigins } from "./env.js";
import { registerSocketHandlers } from "../sockets/socketHandler.js";

export function createSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: getAllowedOrigins(),
      credentials: true,
      methods: ["GET", "POST"],
    },
    maxHttpBufferSize: 1024 * 1024,
    pingInterval: 25000,
    pingTimeout: 20000,
  });
  registerSocketHandlers(io);
  return io;
}
