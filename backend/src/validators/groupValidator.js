import { z } from "zod";

export const groupCodeParamSchema = z.object({
  groupCode: z.string().trim().min(6).max(20).regex(/^[a-zA-Z0-9]+$/).transform((value) => value.toUpperCase()),
});

export const memberIdParamSchema = z.object({
  memberId: z.string().regex(/^[a-f\d]{24}$/i),
});

export const groupMemberParamsSchema = groupCodeParamSchema.extend({
  memberId: z.string().regex(/^[a-f\d]{24}$/i),
});

export const uploadIdParamSchema = z.object({
  uploadId: z.string().regex(/^[a-f\d]{24}$/i),
});

export const objectIdParamSchema = z.object({
  messageId: z.string().regex(/^[a-f\d]{24}$/i),
});

export const groupDetailsQuerySchema = z.object({}).passthrough();
