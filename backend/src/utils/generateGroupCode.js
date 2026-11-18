import { randomBytes } from "node:crypto";

export function generateGroupCode() {
  return randomBytes(5).toString("hex").toUpperCase();
}
