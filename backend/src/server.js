import dotenv from "dotenv";

dotenv.config();

const { validateRuntimeConfig } = await import("./config/env.js");
const config = validateRuntimeConfig();
const { connectDatabase, disconnectDatabase } = await import("./config/db.js");
const { createApp } = await import("./app.js");
const { createSocketServer } = await import("./config/socket.js");
const { createServer } = await import("node:http");

await connectDatabase();

const app = createApp();
const server = createServer(app);
const io = createSocketServer(server);
app.set("io", io);

server.listen(config.PORT, "0.0.0.0", () => {
  console.log(`Private Group Chat API listening on port ${config.PORT}.`);
});

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Received ${signal}; shutting down gracefully.`);
  const forceExit = setTimeout(() => {
    console.error("Graceful shutdown timed out.");
    process.exit(1);
  }, 10000);
  forceExit.unref();
  try {
    await new Promise((resolve) => io.close(resolve));
    await disconnectDatabase();
    clearTimeout(forceExit);
    process.exitCode = 0;
  } catch (error) {
    console.error("Shutdown failed:", error?.name || "Error");
    process.exitCode = 1;
  }
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
