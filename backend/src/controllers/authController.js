import { revokeMemberSessions } from "../services/groupService.js";
import { removeMemberSocketsOnLogout } from "../services/notificationService.js";
import { getGroupDetails } from "../services/groupService.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { clearSessionCookie } from "../utils/sessionCookie.js";
import { serializeMember } from "../utils/serializers.js";

export const getCurrentSession = asyncHandler(async (req, res) => {
  const group = await getGroupDetails(req.group._id);
  sendSuccess(res, { group, member: serializeMember(req.member) }, "Session is active.");
});

export const logout = asyncHandler(async (req, res) => {
  const member = await revokeMemberSessions(req.member._id);
  const io = req.app.get("io");
  if (io) removeMemberSocketsOnLogout(io, member.groupId, member._id);
  clearSessionCookie(res);
  sendSuccess(res, null, "Signed out.");
});
