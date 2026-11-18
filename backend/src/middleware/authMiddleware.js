import jwt from "jsonwebtoken";
import Member from "../models/Member.js";
import Group from "../models/Group.js";
import { getConfig } from "../config/env.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export function extractToken(req) {
  const authorization = req.get("authorization");
  if (authorization?.startsWith("Bearer ")) return authorization.slice(7).trim();
  return req.cookies?.group_session || null;
}

export function verifyToken(token) {
  const { JWT_SECRET } = getConfig();
  return jwt.verify(token, JWT_SECRET, {
    algorithms: ["HS256"],
    issuer: "private-group-chat",
    audience: "private-group-chat-client",
  });
}

export async function resolveSession(token) {
  const claims = verifyToken(token);
  const member = await Member.findOne({
    _id: claims.sub,
    groupId: claims.groupId,
    isActive: true,
  }).select("+tokenVersion");
  if (!member || member.tokenVersion !== claims.ver) {
    throw new AppError(401, "Invalid or expired session.", "INVALID_SESSION");
  }
  const group = await Group.findOne({ _id: claims.groupId, isActive: true });
  if (!group) throw new AppError(401, "Invalid or expired session.", "INVALID_SESSION");
  return { claims, member, group };
}

export const authenticate = asyncHandler(async (req, _res, next) => {
  const token = extractToken(req);
  if (!token) throw new AppError(401, "Authentication required.", "AUTHENTICATION_REQUIRED");
  try {
    const session = await resolveSession(token);
    req.auth = session.claims;
    req.member = session.member;
    req.group = session.group;
    next();
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error.name === "TokenExpiredError" || error.name === "JsonWebTokenError" || error.name === "NotBeforeError") {
      throw new AppError(401, "Invalid or expired session.", "INVALID_SESSION");
    }
    throw error;
  }
});
