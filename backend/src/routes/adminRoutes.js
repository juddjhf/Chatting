import { Router } from "express";
import { deleteMessageAsAdmin, removeMemberAsAdmin } from "../controllers/adminController.js";
import { deleteGroup } from "../controllers/groupController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";
import { validate } from "../middleware/validateMiddleware.js";
import { memberIdParamSchema, objectIdParamSchema } from "../validators/groupValidator.js";

const router = Router();

router.use(authenticate, requireAdmin);
router.delete("/groups", deleteGroup);
router.delete("/groups/members/:memberId", validate(memberIdParamSchema, "params"), removeMemberAsAdmin);
router.delete("/messages/:messageId", validate(objectIdParamSchema, "params"), deleteMessageAsAdmin);

export default router;
