import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required."),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters."),
  JWT_EXPIRES_IN: z.string().default("7d"),
  FRONTEND_URL: z.string().default("http://localhost:5173"),
  API_PUBLIC_URL: z.string().default("http://localhost:5000"),
  CLOUDINARY_CLOUD_NAME: z.string().default(""),
  CLOUDINARY_API_KEY: z.string().default(""),
  CLOUDINARY_API_SECRET: z.string().default(""),
  MAX_FILE_SIZE_MB: z.coerce.number().int().min(1).max(200).default(50),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  UPLOAD_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(30),
  TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(1),
  COOKIE_DOMAIN: z.string().optional(),
});

export function getConfig() {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new Error(`Invalid environment configuration: ${errors}`);
  }
  return parsed.data;
}

export function validateRuntimeConfig() {
  const config = getConfig();
  if (config.NODE_ENV !== "test") {
    const missing = [
      ["CLOUDINARY_CLOUD_NAME", config.CLOUDINARY_CLOUD_NAME],
      ["CLOUDINARY_API_KEY", config.CLOUDINARY_API_KEY],
      ["CLOUDINARY_API_SECRET", config.CLOUDINARY_API_SECRET],
    ].filter(([, value]) => !value).map(([name]) => name);
    if (missing.length) {
      throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
    }
  }
  return config;
}

export function getAllowedOrigins() {
  return getConfig().FRONTEND_URL.split(",").map((origin) => origin.trim()).filter(Boolean);
}
