import { resolveSession } from "../middleware/authMiddleware.js";

function cookieToken(cookieHeader) {
  if (!cookieHeader) return null;
  for (const segment of cookieHeader.split(";")) {
    const [name, ...valueParts] = segment.trim().split("=");
    if (name === "group_session") {
      try {
        return decodeURIComponent(valueParts.join("="));
      } catch {
        return null;
      }
    }
  }
  return null;
}

export async function authenticateSocket(socket, next) {
  const token = socket.handshake.auth?.token || cookieToken(socket.handshake.headers.cookie);
  if (typeof token !== "string" || !token) {
    next(new Error("Authentication required."));
    return;
  }
  try {
    const { claims, member, group } = await resolveSession(token);
    socket.data.authToken = token;
    socket.data.session = {
      groupId: String(group._id),
      groupCode: group.groupCode,
      memberId: String(member._id),
      nickname: member.nickname,
      role: member.role,
    };
    socket.data.claims = claims;
    next();
  } catch {
    next(new Error("Invalid or expired session."));
  }
}
