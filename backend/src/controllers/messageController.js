import {
  createMessage as createMessageService,
  deleteMessage as deleteMessageService,
  listMessages as listMessagesService,
} from "../services/messageService.js";
import {
  broadcastMessageDeleted,
  broadcastNewMessage,
} from "../services/notificationService.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";

export const createMessage = asyncHandler(async (req, res) => {
  const { message, duplicate } = await createMessageService({
    group: req.group,
    member: req.member,
    payload: req.body,
  });
  const io = req.app.get("io");
  if (io && !duplicate) broadcastNewMessage(io, message);
  sendSuccess(res, { message }, "Message sent.", 201);
});

export const listMessages = asyncHandler(async (req, res) => {
  const requestedCode = req.params.groupCode || req.query.groupCode;
  if (requestedCode && requestedCode.toUpperCase() !== req.group.groupCode) {
    throw new AppError(404, "Group not found.", "GROUP_NOT_FOUND");
  }
  const result = await listMessagesService({
    group: req.group,
    query: req.validatedQuery || req.query,
  });
  sendSuccess(res, result, "Messages retrieved.");
});

export const deleteMessage = asyncHandler(async (req, res) => {
  const result = await deleteMessageService({
    messageId: req.params.messageId,
    group: req.group,
    member: req.member,
  });
  const io = req.app.get("io");
  if (io) broadcastMessageDeleted(io, result);
  sendSuccess(res, { messageId: result.messageId }, "Message deleted.");
});

export const replyToMessage = asyncHandler(async (req, res) => {
  const { message, duplicate } = await createMessageService({
    group: req.group,
    member: req.member,
    payload: {
      ...req.body,
      messageType: "text",
      replyTo: req.params.messageId,
    },
  });
  const io = req.app.get("io");
  if (io && !duplicate) broadcastNewMessage(io, message);
  sendSuccess(res, { message }, "Reply sent.", 201);
});
