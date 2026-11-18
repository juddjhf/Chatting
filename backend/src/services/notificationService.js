import Member from "../models/Member.js";

const onlineByGroup = new Map();
const socketKeys = new Map();

export function groupRoom(groupId) {
  return `group:${groupId}`;
}

function memberKey(groupId, memberId) {
  return `${groupId}:${memberId}`;
}

function getGroupOnlineMap(groupId) {
  const key = String(groupId);
  if (!onlineByGroup.has(key)) onlineByGroup.set(key, new Map());
  return onlineByGroup.get(key);
}

export function emitOnlineMembers(io, groupId) {
  const groupMembers = onlineByGroup.get(String(groupId));
  const members = groupMembers
    ? [...groupMembers.values()].map(({ memberId, nickname }) => ({ memberId, nickname }))
    : [];
  io.to(groupRoom(groupId)).emit("online_members", { members, count: members.length });
}

export function attachOnlineSocket(io, socket) {
  const { groupId, memberId, nickname } = socket.data.session;
  const groupMembers = getGroupOnlineMap(groupId);
  const key = memberKey(groupId, memberId);
  const existing = groupMembers.get(memberId) || { memberId, nickname, socketIds: new Set() };
  existing.socketIds.add(socket.id);
  groupMembers.set(memberId, existing);
  socketKeys.set(socket.id, { groupId, memberId, key });
  emitOnlineMembers(io, groupId);
}

export async function detachOnlineSocket(io, socket) {
  const details = socketKeys.get(socket.id);
  if (!details) return;
  socketKeys.delete(socket.id);
  const groupMembers = onlineByGroup.get(String(details.groupId));
  const memberEntry = groupMembers?.get(details.memberId);
  if (!memberEntry) return;
  memberEntry.socketIds.delete(socket.id);
  if (memberEntry.socketIds.size === 0) {
    groupMembers.delete(details.memberId);
    await Member.updateOne(
      { _id: details.memberId, groupId: details.groupId, isActive: true },
      { $set: { lastSeen: new Date() } },
    );
  }
  if (groupMembers?.size === 0) onlineByGroup.delete(String(details.groupId));
  emitOnlineMembers(io, details.groupId);
}

export function broadcastNewMessage(io, message) {
  io.to(groupRoom(message.groupId)).emit("new_message", message);
}

export function broadcastMessageDeleted(io, result) {
  io.to(groupRoom(result.groupId)).emit("message_deleted", {
    messageId: result.messageId,
    groupCode: result.groupCode,
  });
}

export function broadcastMemberJoined(io, groupId, member) {
  io.to(groupRoom(groupId)).emit("member_joined", member);
}

export function broadcastMemberLeft(io, groupId, member) {
  io.to(groupRoom(groupId)).emit("member_left", member);
  emitOnlineMembers(io, groupId);
}

export function broadcastGroupDeleted(io, groupId, groupCode) {
  io.to(groupRoom(groupId)).emit("group_deleted", { groupCode });
  io.in(groupRoom(groupId)).disconnectSockets(true);
  onlineByGroup.delete(String(groupId));
}

export function removeMemberSockets(io, groupId, memberId, member) {
  const groupMembers = onlineByGroup.get(String(groupId));
  const socketIds = [...(groupMembers?.get(String(memberId))?.socketIds || [])];
  io.to(groupRoom(groupId)).emit("member_removed", { memberId: String(memberId) });
  broadcastMemberLeft(io, groupId, member);
  disconnectSockets(io, socketIds);
}

export function disconnectMemberSockets(io, groupId, memberId) {
  const groupMembers = onlineByGroup.get(String(groupId));
  const socketIds = [...(groupMembers?.get(String(memberId))?.socketIds || [])];
  disconnectSockets(io, socketIds);
}

function disconnectSockets(io, socketIds) {
  for (const socketId of socketIds) {
    const socket = io.sockets.sockets.get(socketId);
    if (socket) socket.disconnect(true);
  }
}

export function removeMemberSocketsOnLogout(io, groupId, memberId) {
  const socketIds = [...(onlineByGroup.get(String(groupId))?.get(String(memberId))?.socketIds || [])];
  for (const socketId of socketIds) {
    io.sockets.sockets.get(socketId)?.disconnect(true);
  }
}

export function resetOnlineStateForTests() {
  onlineByGroup.clear();
  socketKeys.clear();
}
