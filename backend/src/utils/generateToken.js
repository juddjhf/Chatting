import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { getConfig } from "../config/env.js";

export function generateToken(member) {
  const { JWT_SECRET, JWT_EXPIRES_IN } = getConfig();
  return jwt.sign(
    { groupId: member.groupId.toString(), jti: randomUUID(), ver: member.tokenVersion || 0 },
    JWT_SECRET,
    {
      subject: member._id.toString(),
      expiresIn: JWT_EXPIRES_IN,
      algorithm: "HS256",
      issuer: "private-group-chat",
      audience: "private-group-chat-client",
    },
  );
}
