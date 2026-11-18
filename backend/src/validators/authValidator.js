import { z } from "zod";

const password = z.string().min(8).max(128);
const nickname = z.string().trim().max(32).optional().transform((value) => value || undefined);

export const createGroupSchema = z.object({
  groupName: z.string().trim().min(2).max(60),
  password,
  nickname,
}).strict();

export const joinGroupSchema = z.object({
  groupCode: z.string().trim().min(6).max(20).regex(/^[a-zA-Z0-9]+$/).transform((value) => value.toUpperCase()),
  password: z.string().min(1).max(128),
  nickname,
}).strict();

export const logoutSchema = z.object({}).strict();
