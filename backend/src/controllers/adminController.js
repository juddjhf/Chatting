import { deleteMessage as deleteMessageService } from "../services/messageService.js";
import { removeGroupMember } from "../services/groupService.js";
import {
  broadcastMessageDeleted,
  removeMemberSockets,
} from "../services/notificationService.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const removeMemberAsAdmin = asyncHandler(async (req, res) => {
  const member = await removeGroupMember(req.group, req.params.memberId);
  const io = req.app.get("io");
  if (io) removeMemberSockets(io, req.group._id, member.memberId, member);
  sendSuccess(res, { member }, "Member removed.");
});

export const deleteMessageAsAdmin = asyncHandler(async (req, res) => {
  const result = await deleteMessageService({
    messageId: req.params.messageId,
    group: req.group,
    member: req.member,
    allowAdmin: true,
  });
  const io = req.app.get("io");
  if (io) broadcastMessageDeleted(io, result);
  sendSuccess(res, { messageId: result.messageId }, "Message deleted.");
});
