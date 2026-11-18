import { Router } from "express";
import { createMessage, deleteMessage, listMessages, replyToMessage } from "../controllers/messageController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { requireCurrentGroup } from "../middleware/groupAuthMiddleware.js";
import { validate } from "../middleware/validateMiddleware.js";
import { createMessageSchema, messageHistoryQuerySchema, replyMessageSchema } from "../validators/messageValidator.js";
import { objectIdParamSchema, groupCodeParamSchema } from "../validators/groupValidator.js";

const router = Router();

router.get("/", authenticate, validate(messageHistoryQuerySchema, "query"), listMessages);
router.post("/", authenticate, validate(createMessageSchema), requireCurrentGroup, createMessage);
router.get("/:groupCode", authenticate, validate(groupCodeParamSchema, "params"), requireCurrentGroup, validate(messageHistoryQuerySchema, "query"), listMessages);
router.post("/:messageId/reply", authenticate, validate(objectIdParamSchema, "params"), validate(replyMessageSchema), replyToMessage);
router.delete("/:messageId", authenticate, validate(objectIdParamSchema, "params"), deleteMessage);

export default router;
