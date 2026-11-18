import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { getAllowedOrigins, getConfig } from "./config/env.js";
import authRoutes from "./routes/authRoutes.js";
import groupRoutes from "./routes/groupRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import { apiLimiter } from "./middleware/rateLimitMiddleware.js";
import { errorMiddleware, notFoundHandler } from "./middleware/errorMiddleware.js";
import { isDatabaseReady } from "./config/db.js";
import { sendError, sendSuccess } from "./utils/apiResponse.js";
import { AppError } from "./utils/AppError.js";

export function createApp() {
  const app = express();
  const config = getConfig();
  const allowedOrigins = getAllowedOrigins();

  app.disable("x-powered-by");
  app.set("trust proxy", config.TRUST_PROXY);
  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
  }));
  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new AppError(403, "Origin is not allowed by CORS.", "CORS_ORIGIN_DENIED"));
    },
    credentials: true,
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Range"],
    exposedHeaders: ["Content-Length", "Content-Range", "Accept-Ranges", "Content-Disposition"],
    maxAge: 86400,
  }));
  app.use(cookieParser());
  app.use(morgan(":method :status :response-time ms", {
    skip: (req) => req.path === "/api/health",
  }));
  app.use(express.json({ limit: "64kb", strict: true }));
  app.use(express.urlencoded({ extended: false, limit: "16kb" }));

  app.get("/api/health", (_req, res) => {
    if (!isDatabaseReady()) {
      sendError(res, "Database is unavailable.", 503, "DATABASE_UNAVAILABLE");
      return;
    }
    sendSuccess(res, { database: "connected" }, "Private Group Chat API is running.");
  });

  app.use("/api", apiLimiter);
  app.use("/api/auth", authRoutes);
  app.use("/api/groups", groupRoutes);
  app.use("/api/messages", messageRoutes);
  app.use("/api/upload", uploadRoutes);
  app.use("/api/uploads", uploadRoutes);
  app.use("/api/admin", adminRoutes);
  app.use(notFoundHandler);
  app.use(errorMiddleware);
  return app;
}
