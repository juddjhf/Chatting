import mongoose from "mongoose";
import Group from "../models/Group.js";
import Message from "../models/Message.js";
import Upload from "../models/Upload.js";
import { AppError } from "../utils/AppError.js";
import { serializeMessage } from "../utils/serializers.js";

function assertGroupCode(requestedCode, group) {
  if (requestedCode && requestedCode.toUpperCase() !== group.groupCode) {
    throw new AppError(404, "Group not found.", "GROUP_NOT_FOUND");
  }
}

export async function createMessage({ group, member, payload }) {
  assertGroupCode(payload.groupCode, group);
  if (payload.clientMessageId) {
    const existing = await Message.findOne({
      groupId: group._id,
      senderId: member._id,
      clientMessageId: payload.clientMessageId,
    }).populate({ path: "replyTo", select: "senderName text fileName messageType isDeleted" }).lean();
    if (existing) {
      const upload = existing.uploadId
        ? await Upload.findOne({ _id: existing.uploadId, groupId: group._id, isActive: true }).lean()
        : null;
      return {
        message: serializeMessage(existing, { groupCode: group.groupCode, upload }),
        duplicate: true,
      };
    }
  }
  const session = await mongoose.startSession();
  try {
    let created;
    await session.withTransaction(async () => {
      let upload = null;
      if (payload.uploadId) {
        upload = await Upload.findOne({
          _id: payload.uploadId,
          groupId: group._id,
          uploadedBy: member._id,
          status: "uploaded",
          isActive: true,
        }).session(session);
        if (!upload || upload.messageType !== payload.messageType) {
          throw new AppError(404, "Uploaded file not found.", "UPLOAD_NOT_FOUND");
        }
      }

      let reply = null;
      if (payload.replyTo) {
        reply = await Message.findOne({ _id: payload.replyTo, groupId: group._id }).session(session);
        if (!reply) throw new AppError(404, "Reply target not found.", "REPLY_NOT_FOUND");
      }

      const messageValues = {
        groupId: group._id,
        senderId: member._id,
        senderName: member.nickname,
        messageType: payload.messageType,
        clientMessageId: payload.clientMessageId || null,
        text: payload.text || "",
        replyTo: reply?._id || null,
      };
      if (upload) {
        messageValues.uploadId = upload._id;
        messageValues.fileUrl = "";
        messageValues.fileName = upload.fileName;
        messageValues.fileSize = upload.fileSize;
        messageValues.mimeType = upload.mimeType;
      }
      const [message] = await Message.create([messageValues], { session });
      if (upload) {
        upload.status = "attached";
        await upload.save({ session });
      }
      created = { message, upload };
    });
    const savedMessage = await Message.findById(created.message._id)
      .populate({ path: "replyTo", select: "senderName text fileName messageType isDeleted" })
      .lean();
    return {
      message: serializeMessage(savedMessage || created.message, { groupCode: group.groupCode, upload: created.upload }),
      duplicate: false,
    };
  } catch (error) {
    if (payload.clientMessageId && error?.code === 11000) {
      const existing = await Message.findOne({
        groupId: group._id,
        senderId: member._id,
        clientMessageId: payload.clientMessageId,
      }).populate({ path: "replyTo", select: "senderName text fileName messageType isDeleted" }).lean();
      if (existing) {
        const upload = existing.uploadId
          ? await Upload.findOne({ _id: existing.uploadId, groupId: group._id, isActive: true }).lean()
          : null;
        return {
          message: serializeMessage(existing, { groupCode: group.groupCode, upload }),
          duplicate: true,
        };
      }
    }
    throw error;
  } finally {
    await session.endSession();
  }
}

export async function listMessages({ group, query }) {
  const { cursor, page, limit } = query;
  const filter = { groupId: group._id };
  if (cursor) {
    if (!mongoose.isValidObjectId(cursor)) throw new AppError(400, "Invalid message cursor.", "INVALID_CURSOR");
    const cursorMessage = await Message.findOne({ _id: cursor, groupId: group._id }).select("createdAt");
    if (!cursorMessage) throw new AppError(400, "Invalid message cursor.", "INVALID_CURSOR");
    filter.$or = [
      { createdAt: { $lt: cursorMessage.createdAt } },
      { createdAt: cursorMessage.createdAt, _id: { $lt: cursorMessage._id } },
    ];
  }

  let request = Message.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .populate({ path: "replyTo", select: "senderName text fileName messageType isDeleted" })
    .lean();
  if (!cursor && page > 1) request = request.skip((page - 1) * limit);

  const descending = await request;
  const hasMore = descending.length > limit;
  const selected = descending.slice(0, limit);
  const messages = selected.reverse();
  const uploadIds = messages.map((message) => message.uploadId).filter(Boolean);
  const uploads = uploadIds.length
    ? await Upload.find({ _id: { $in: uploadIds }, groupId: group._id, isActive: true })
        .select("+publicId")
        .lean()
    : [];
  const uploadsById = new Map(uploads.map((upload) => [String(upload._id), upload]));
  const serialized = messages.map((message) =>
    serializeMessage(message, {
      groupCode: group.groupCode,
      upload: uploadsById.get(String(message.uploadId)),
    }),
  );
  return {
    messages: serialized,
    hasMore,
    nextCursor: hasMore && messages.length ? String(messages[0]._id) : null,
  };
}

export async function deleteMessage({ messageId, group, member, allowAdmin = false }) {
  if (!mongoose.isValidObjectId(messageId)) throw new AppError(404, "Message not found.", "MESSAGE_NOT_FOUND");
  const session = await mongoose.startSession();
  let message;
  try {
    await session.withTransaction(async () => {
      message = await Message.findOne({ _id: messageId, groupId: group._id }).session(session);
      if (!message) throw new AppError(404, "Message not found.", "MESSAGE_NOT_FOUND");
      const isOwner = message.senderId.toString() === member._id.toString();
      const isAdmin = member.role === "admin" && group.creatorId.toString() === member._id.toString();
      if (!isOwner && !(isAdmin || allowAdmin)) {
        throw new AppError(403, "You cannot delete this message.", "MESSAGE_DELETE_FORBIDDEN");
      }
      if (message.isDeleted) return;
      message.isDeleted = true;
      message.deletedAt = new Date();
      message.deletedBy = member._id;
      message.text = "";
      message.fileUrl = "";
      message.fileName = "";
      message.fileSize = 0;
      message.mimeType = "";
      await message.save({ session });
      if (message.uploadId) {
        await Upload.updateOne(
          { _id: message.uploadId, groupId: group._id },
          { $set: { isActive: false } },
          { session },
        );
      }
    });
  } finally {
    await session.endSession();
  }
  return { messageId: String(message._id), groupId: String(group._id), groupCode: group.groupCode };
}

export async function ensureActiveMembership(groupId, memberId) {
  const [group, member] = await Promise.all([
    Group.findOne({ _id: groupId, isActive: true }),
    Member.findOne({ _id: memberId, groupId, isActive: true }),
  ]);
  if (!group || !member) throw new AppError(401, "Invalid or expired session.", "INVALID_SESSION");
  return { group, member };
}
