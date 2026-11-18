import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import Group from "../models/Group.js";
import Member from "../models/Member.js";
import Upload from "../models/Upload.js";
import { generateGroupCode } from "../utils/generateGroupCode.js";
import { generateToken } from "../utils/generateToken.js";
import { AppError } from "../utils/AppError.js";
import { serializeGroup, serializeMember } from "../utils/serializers.js";
import { getConfig } from "../config/env.js";

const BCRYPT_ROUNDS = 12;

function createGuestNickname() {
  return `Guest-${generateGroupCode().slice(0, 4)}`;
}

function asSafeSession(group, member) {
  const token = generateToken(member);
  return {
    token,
    groupCode: group.groupCode,
    group: serializeGroup(group, group.members.length, member.role === "admin" ? member : undefined),
    member: serializeMember(member),
    expiresIn: getConfig().JWT_EXPIRES_IN,
  };
}

export async function createGroup({ groupName, password, nickname }) {
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const session = await mongoose.startSession();
    try {
      let result;
      await session.withTransaction(async () => {
        const memberId = new mongoose.Types.ObjectId();
        const code = generateGroupCode();
        const [group] = await Group.create([{
          name: groupName,
          groupCode: code,
          passwordHash,
          creatorId: memberId,
          members: [memberId],
          isActive: true,
        }], { session });
        const [member] = await Member.create([{
          _id: memberId,
          groupId: group._id,
          nickname: nickname || createGuestNickname(),
          role: "admin",
          isActive: true,
        }], { session });
        result = asSafeSession(group, member);
      });
      return result;
    } catch (error) {
      if (error?.code === 11000 && attempt < 4) continue;
      throw error;
    } finally {
      await session.endSession();
    }
  }
  throw new AppError(503, "Unable to allocate a unique group code. Please try again.", "GROUP_CODE_EXHAUSTED");
}

export async function joinGroup({ groupCode, password, nickname }) {
  const group = await Group.findOne({ groupCode: groupCode.toUpperCase(), isActive: true }).select("+passwordHash");
  if (!group) throw new AppError(401, "Invalid group code or password.", "INVALID_GROUP_CREDENTIALS");
  const passwordMatches = await bcrypt.compare(password, group.passwordHash);
  if (!passwordMatches) throw new AppError(401, "Invalid group code or password.", "INVALID_GROUP_CREDENTIALS");

  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const currentGroup = await Group.findOne({ _id: group._id, isActive: true }).session(session);
      if (!currentGroup) throw new AppError(401, "Invalid group code or password.", "INVALID_GROUP_CREDENTIALS");
      const [member] = await Member.create([{
        groupId: currentGroup._id,
        nickname: nickname || createGuestNickname(),
        role: "member",
        isActive: true,
      }], { session });
      currentGroup.members.push(member._id);
      await currentGroup.save({ session });
      result = asSafeSession(currentGroup, member);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

export async function getGroupDetails(groupId) {
  const group = await Group.findOne({ _id: groupId, isActive: true }).populate({
    path: "creatorId",
    select: "nickname role isActive joinedAt lastSeen",
  });
  if (!group) throw new AppError(404, "Group not found.", "GROUP_NOT_FOUND");
  const memberCount = await Member.countDocuments({ groupId, isActive: true });
  return serializeGroup(group, memberCount, group.creatorId);
}

export async function listGroupMembers(groupId) {
  const members = await Member.find({ groupId, isActive: true })
    .select("nickname role isActive joinedAt lastSeen")
    .sort({ joinedAt: 1, _id: 1 })
    .lean();
  return members.map(serializeMember);
}

export async function leaveGroup(group, member) {
  if (member.role === "admin") {
    throw new AppError(409, "The group admin must delete the group or transfer administration before leaving.", "ADMIN_CANNOT_LEAVE");
  }
  const session = await mongoose.startSession();
  const lastSeen = new Date();
  try {
    await session.withTransaction(async () => {
      const membership = await Member.updateOne(
        { _id: member._id, groupId: group._id, isActive: true },
        { $set: { isActive: false, lastSeen } },
        { session },
      );
      if (membership.modifiedCount !== 1) throw new AppError(401, "Invalid or expired session.", "INVALID_SESSION");
      await Group.updateOne(
        { _id: group._id, isActive: true },
        { $pull: { members: member._id } },
        { session },
      );
    });
    return serializeMember({ ...member.toObject(), isActive: false, lastSeen });
  } finally {
    await session.endSession();
  }
}

export async function removeGroupMember(group, memberId) {
  if (!mongoose.isValidObjectId(memberId)) throw new AppError(404, "Member not found.", "MEMBER_NOT_FOUND");
  const target = await Member.findOne({ _id: memberId, groupId: group._id, isActive: true });
  if (!target || target.role === "admin") throw new AppError(404, "Member not found.", "MEMBER_NOT_FOUND");
  const now = new Date();
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const membership = await Member.updateOne(
        { _id: target._id, groupId: group._id, isActive: true },
        { $set: { isActive: false, lastSeen: now } },
        { session },
      );
      if (membership.modifiedCount !== 1) throw new AppError(404, "Member not found.", "MEMBER_NOT_FOUND");
      await Group.updateOne(
        { _id: group._id, isActive: true },
        { $pull: { members: target._id } },
        { session },
      );
    });
  } finally {
    await session.endSession();
  }
  return serializeMember({ ...target.toObject(), isActive: false, lastSeen: now });
}

export async function deleteGroup(group) {
  const members = await Member.find({ groupId: group._id, isActive: true }).select("_id").lean();
  const now = new Date();
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await Group.updateOne(
        { _id: group._id, isActive: true },
        { $set: { isActive: false, members: [] } },
        { session },
      );
      await Member.updateMany(
        { groupId: group._id, isActive: true },
        { $set: { isActive: false, lastSeen: now }, $inc: { tokenVersion: 1 } },
        { session },
      );
      await Upload.updateMany({ groupId: group._id }, { $set: { isActive: false } }, { session });
    });
  } finally {
    await session.endSession();
  }
  return { groupCode: group.groupCode, memberIds: members.map((member) => String(member._id)) };
}

export async function revokeMemberSessions(memberId) {
  const member = await Member.findOneAndUpdate(
    { _id: memberId, isActive: true },
    { $inc: { tokenVersion: 1 }, $set: { lastSeen: new Date() } },
    { new: true },
  );
  if (!member) throw new AppError(401, "Invalid or expired session.", "INVALID_SESSION");
  return member;
}
