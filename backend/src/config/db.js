import mongoose from "mongoose";
import { getConfig } from "./env.js";

export async function connectDatabase() {
  const { MONGODB_URI } = getConfig();
  await mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    maxPoolSize: 20,
    autoIndex: true,
  });
  return mongoose.connection;
}

export async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

export function isDatabaseReady() {
  return mongoose.connection.readyState === 1;
}
