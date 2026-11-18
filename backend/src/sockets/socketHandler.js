import mongoose from "mongoose";
import { resolveSession } from "../middleware/authMiddleware.js";
import { createMessage, deleteMessage } from "../services/messageService.js";
import {
  attachOnlineSocket,
  broadcastMessageDeleted,
  broadcastNewMessage,
  detachOnlineSocket,
  groupRoom,
} from "../services/notificationService.js";
import { AppError } from "../utils/AppError.js";
import { createMessageSchema } from "../validators/messageValidator.js";
import { CLIENT_EVENTS, SERVER_EVENTS } from "./socketEvents.js";
import { authenticateSocket } from "./socketAuth.js";

function acknowledge(callback, success, data, message) {
  if (typeof callback !== "function") return;
  callback(success
    ? { success: true, data }
    : { success: false, message, code: data });
}

function takeEventToken(socket, key, limit, windowMs) {
  const now = Date.now();
  const events = socket.data.eventTimes || new Map();
  const timestamps = (events.get(key) || []).filter((timestamp) => now - timestamp < windowMs);
  if (timestamps.length >= limit) {
    events.set(key, timestamps);
    socket.data.eventTimes = events;
    return false;
  }
  timestamps.push(now);
  events.set(key, timestamps);
  socket.data.eventTimes = events;
  return true;
}

async function refreshSession(socket) {
  const session = await resolveSession(socket.data.authToken);
  socket.data.session = {
    groupId: String(session.group._id),
    groupCode: session.group.groupCode,
    memberId: String(session.member._id),
    nickname: session.member.nickname,
    role: session.member.role,
  };
  return session;
}

async function requireJoinedGroup(socket) {
  if (!socket.data.joinedGroupId || socket.data.joinedGroupId !== socket.data.session.groupId) {
    throw new AppError(403, "Join your authenticated group before using chat events.", "GROUP_NOT_JOINED");
  }
  return refreshSession(socket);
}

function verifyEventGroup(payload, group) {
  if (payload?.groupCode && payload.groupCode.toUpperCase() !== group.groupCode) {
    throw new AppError(404, "Group not found.", "GROUP_NOT_FOUND");
  }
}

function sendSocketError(socket, callback, error) {
  const message = error instanceof AppError ? error.message : "The socket request could not be completed.";
  const code = error instanceof AppError ? error.code : "SOCKET_REQUEST_FAILED";
  acknowledge(callback, false, code, message);
  if (error instanceof AppError && error.statusCode >= 500) {
    console.error("Socket operation failed:", error.code);
  }
}

export function registerSocketHandlers(io) {
  io.use(authenticateSocket);

  io.on("connection", (socket) => {
    socket.on(CLIENT_EVENTS.JOIN_GROUP, async (payload = {}, callback) => {
      try {
        const session = await refreshSession(socket);
        verifyEventGroup(payload, session.group);
        const room = groupRoom(session.group._id);
        if (socket.data.joinedGroupId && socket.data.joinedGroupId !== String(session.group._id)) {
          throw new AppError(403, "This session cannot join another group.", "GROUP_ACCESS_DENIED");
        }
        await socket.join(room);
        socket.data.joinedGroupId = String(session.group._id);
        attachOnlineSocket(io, socket);
        acknowledge(callback, true, { groupCode: session.group.groupCode }, "Joined group.");
      } catch (error) {
        sendSocketError(socket, callback, error);
      }
    });

    socket.on(CLIENT_EVENTS.LEAVE_GROUP, async (_payload, callback) => {
      const groupId = socket.data.joinedGroupId;
      if (groupId) {
        await socket.leave(groupRoom(groupId));
        socket.data.joinedGroupId = null;
        try {
          await detachOnlineSocket(io, socket);
        } catch (error) {
          console.error("Socket presence cleanup failed:", error?.name || "Error");
        }
      }
      acknowledge(callback, true, null, "Left group.");
    });

    socket.on(CLIENT_EVENTS.SEND_MESSAGE, async (payload, callback) => {
      try {
        if (!takeEventToken(socket, "messages", 20, 10000)) {
          throw new AppError(429, "You are sending messages too quickly.", "SOCKET_RATE_LIMITED");
        }
        const { group, member } = await requireJoinedGroup(socket);
        verifyEventGroup(payload, group);
        const parsed = createMessageSchema.parse(payload);
        const { message, duplicate } = await createMessage({ group, member, payload: parsed });
        if (!duplicate) broadcastNewMessage(io, message);
        acknowledge(callback, true, { message }, "Message sent.");
      } catch (error) {
        sendSocketError(socket, callback, error);
      }
    });

    socket.on(CLIENT_EVENTS.DELETE_MESSAGE, async (payload, callback) => {
      try {
        const { group, member } = await requireJoinedGroup(socket);
        const messageId = payload?.messageId;
        if (!mongoose.isValidObjectId(messageId)) {
          throw new AppError(400, "Invalid message id.", "INVALID_MESSAGE_ID");
        }
        const deleted = await deleteMessage({ messageId, group, member });
        broadcastMessageDeleted(io, deleted);
        acknowledge(callback, true, { messageId: deleted.messageId }, "Message deleted.");
      } catch (error) {
        sendSocketError(socket, callback, error);
      }
    });

    for (const [event, outgoingEvent] of [
      [CLIENT_EVENTS.TYPING_START, SERVER_EVENTS.USER_TYPING],
      [CLIENT_EVENTS.TYPING_STOP, SERVER_EVENTS.USER_STOPPED_TYPING],
    ]) {
      socket.on(event, async (payload = {}, callback) => {
        try {
          if (!takeEventToken(socket, "typing", 12, 10000)) {
            throw new AppError(429, "Typing events are being sent too quickly.", "SOCKET_RATE_LIMITED");
          }
          const { group, member } = await requireJoinedGroup(socket);
          verifyEventGroup(payload, group);
          socket.to(groupRoom(group._id)).emit(outgoingEvent, {
            memberId: String(member._id),
            nickname: member.nickname,
          });
          acknowledge(callback, true, null, "Typing status updated.");
        } catch (error) {
          sendSocketError(socket, callback, error);
        }
      });
    }

    socket.on("disconnect", async () => {
      try {
        await detachOnlineSocket(io, socket);
      } catch (error) {
        console.error("Socket disconnect cleanup failed:", error?.name || "Error");
      }
    });
  });
}
