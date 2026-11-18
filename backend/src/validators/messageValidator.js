import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i);
const groupCode = z.string().trim().min(6).max(20).regex(/^[a-zA-Z0-9]+$/).transform((value) => value.toUpperCase());

export const createMessageSchema = z.object({
  groupCode: groupCode.optional(),
  messageType: z.enum(["text", "image", "video", "document"]).default("text"),
  clientMessageId: z.string().uuid().optional(),
  text: z.string().trim().max(5000).optional(),
  uploadId: objectId.optional(),
  replyTo: objectId.optional(),
}).strict().superRefine((data, context) => {
  if (data.messageType === "text" && !data.text) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["text"], message: "Message text is required." });
  }
  if (data.messageType !== "text" && !data.uploadId) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["uploadId"], message: "Upload the attachment before sending it." });
  }
  if (data.messageType === "text" && data.uploadId) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["uploadId"], message: "Text messages cannot include an upload." });
  }
});

export const messageHistoryQuerySchema = z.object({
  cursor: objectId.optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
}).strict();

export const replyMessageSchema = z.object({
  text: z.string().trim().min(1).max(5000),
}).strict();
