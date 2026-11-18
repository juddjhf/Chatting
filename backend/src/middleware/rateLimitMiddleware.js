import { rateLimit } from "express-rate-limit";
import { getConfig } from "../config/env.js";

function buildLimiter({ limit, windowMs, message }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === "test",
    handler(_req, res) {
      res.status(429).json({ success: false, message, code: "RATE_LIMITED" });
    },
  });
}

export const apiLimiter = (() => {
  const config = getConfig();
  return buildLimiter({
    windowMs: config.RATE_LIMIT_WINDOW_MS,
    limit: config.RATE_LIMIT_MAX,
    message: "Too many requests. Please try again later.",
  });
})();

export const authLimiter = (() => {
  const config = getConfig();
  return buildLimiter({
    windowMs: 15 * 60 * 1000,
    limit: config.AUTH_RATE_LIMIT_MAX,
    message: "Too many group authentication attempts. Please try again later.",
  });
})();

export const uploadLimiter = (() => {
  const config = getConfig();
  return buildLimiter({
    windowMs: 60 * 60 * 1000,
    limit: config.UPLOAD_RATE_LIMIT_MAX,
    message: "Upload limit reached. Please try again later.",
  });
})();
