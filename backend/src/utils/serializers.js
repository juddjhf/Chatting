import { getProtectedFileUrl } from "./fileHelpers.js";

export function serializeMember(member) {
  if (!member) return null;
  const memberId = String(member._id || member.memberId || member.id);
  return {
    _id: memberId,
    id: memberId,
    memberId,
    nickname: member.nickname,
    role: member.role,
    isActive: member.isActive,
    joinedAt: member.joinedAt,
    lastSeen: member.lastSeen,
  };
}

export function serializeGroup(group, memberCount, creator) {
  if (!group) return null;
  const creatorMember = creator || group.creatorId;
  const creatorId = String(creatorMember?._id || creatorMember?.id || creatorMember);
  const isPopulatedCreator = Boolean(creatorMember?.nickname && creatorMember?.role);
  return {
    _id: String(group._id),
    id: String(group._id),
    name: group.name,
    groupCode: group.groupCode,
    creatorId,
    creator: isPopulatedCreator ? serializeMember(creatorMember) : creatorId,
    memberCount,
    isActive: group.isActive,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
  };
}

export function serializeMessage(message, { groupCode, upload } = {}) {
  const messageId = String(message._id || message.id);
  const replyDocument = message.replyTo && typeof message.replyTo === "object" ? message.replyTo : null;
  const fileUrl = !message.isDeleted && upload?.isActive ? getProtectedFileUrl(upload._id) : "";
  return {
    _id: messageId,
    id: messageId,
    groupId: String(message.groupId),
    groupCode,
    senderId: String(message.senderId?._id || message.senderId),
    senderName: message.senderName,
    messageType: message.messageType,
    text: message.isDeleted ? "" : message.text,
    fileUrl,
    fileName: message.isDeleted ? "" : (upload?.fileName || message.fileName),
    fileSize: message.isDeleted ? 0 : (upload?.fileSize || message.fileSize),
    mimeType: message.isDeleted ? "" : (upload?.mimeType || message.mimeType),
    uploadId: message.uploadId ? String(message.uploadId) : undefined,
    replyTo: replyDocument
      ? {
          _id: String(replyDocument._id),
          senderName: replyDocument.senderName,
          text: replyDocument.isDeleted ? "This message was deleted." : replyDocument.text,
          fileName: replyDocument.fileName,
          messageType: replyDocument.messageType,
          isDeleted: replyDocument.isDeleted,
        }
      : message.replyTo ? String(message.replyTo) : null,
    isDeleted: message.isDeleted,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
  };
}
