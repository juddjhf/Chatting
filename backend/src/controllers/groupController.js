import {
  createGroup as createGroupService,
  deleteGroup as deleteGroupService,
  getGroupDetails,
  joinGroup as joinGroupService,
  leaveGroup as leaveGroupService,
  listGroupMembers,
  removeGroupMember,
} from "../services/groupService.js";
import {
  broadcastGroupDeleted,
  broadcastMemberJoined,
  broadcastMemberLeft,
  disconnectMemberSockets,
  removeMemberSockets,
} from "../services/notificationService.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { clearSessionCookie, setSessionCookie } from "../utils/sessionCookie.js";
import { serializeMember } from "../utils/serializers.js";

export const createGroup = asyncHandler(async (req, res) => {
  const session = await createGroupService(req.body);
  setSessionCookie(res, session.token);
  sendSuccess(
    res,
    { ...session, creator: session.member },
    "Group created successfully.",
    201,
  );
});

export const joinGroup = asyncHandler(async (req, res) => {
  const session = await joinGroupService(req.body);
  setSessionCookie(res, session.token);
  sendSuccess(res, session, "Joined group successfully.", 200);
  const io = req.app.get("io");
  if (io) broadcastMemberJoined(io, session.group._id, session.member);
});

export const getMyGroup = asyncHandler(async (req, res) => {
  const group = await getGroupDetails(req.group._id);
  sendSuccess(res, { group, member: serializeMember(req.member) }, "Group details retrieved.");
});

export const getGroup = asyncHandler(async (req, res) => {
  const group = await getGroupDetails(req.group._id);
  sendSuccess(res, group, "Group details retrieved.");
});

export const getMembers = asyncHandler(async (req, res) => {
  const members = await listGroupMembers(req.group._id);
  sendSuccess(res, { members, count: members.length }, "Group members retrieved.");
});

export const leaveGroup = asyncHandler(async (req, res) => {
  const member = await leaveGroupService(req.group, req.member);
  const io = req.app.get("io");
  if (io) {
    broadcastMemberLeft(io, req.group._id, member);
    disconnectMemberSockets(io, req.group._id, req.member._id);
  }
  clearSessionCookie(res);
  sendSuccess(res, { memberId: member.memberId }, "You left the group.");
});

export const removeMember = asyncHandler(async (req, res) => {
  const member = await removeGroupMember(req.group, req.params.memberId);
  const io = req.app.get("io");
  if (io) removeMemberSockets(io, req.group._id, member.memberId, member);
  sendSuccess(res, { member }, "Member removed.");
});

export const deleteGroup = asyncHandler(async (req, res) => {
  const result = await deleteGroupService(req.group);
  const io = req.app.get("io");
  if (io) broadcastGroupDeleted(io, req.group._id, result.groupCode);
  clearSessionCookie(res);
  sendSuccess(res, { groupCode: result.groupCode }, "Group deleted.");
});
