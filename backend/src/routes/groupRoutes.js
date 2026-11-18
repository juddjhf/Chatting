import { Router } from "express";
import {
  createGroup,
  deleteGroup,
  getGroup,
  getMembers,
  getMyGroup,
  joinGroup,
  leaveGroup,
  removeMember,
} from "../controllers/groupController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";
import { requireCurrentGroup } from "../middleware/groupAuthMiddleware.js";
import { authLimiter } from "../middleware/rateLimitMiddleware.js";
import { validate } from "../middleware/validateMiddleware.js";
import { createGroupSchema, joinGroupSchema } from "../validators/authValidator.js";
import { groupCodeParamSchema, groupMemberParamsSchema, memberIdParamSchema } from "../validators/groupValidator.js";

const router = Router();

router.post("/create", authLimiter, validate(createGroupSchema), createGroup);
router.post("/join", authLimiter, validate(joinGroupSchema), joinGroup);
router.get("/me", authenticate, getMyGroup);
router.get("/details", authenticate, getMyGroup);
router.get("/members", authenticate, getMembers);
router.post("/leave", authenticate, leaveGroup);
router.delete("/members/:memberId", authenticate, requireAdmin, validate(memberIdParamSchema, "params"), removeMember);
router.delete("/", authenticate, requireAdmin, deleteGroup);

router.get("/:groupCode/members", authenticate, validate(groupCodeParamSchema, "params"), requireCurrentGroup, getMembers);
router.post("/:groupCode/leave", authenticate, validate(groupCodeParamSchema, "params"), requireCurrentGroup, leaveGroup);
router.delete("/:groupCode/members/:memberId", authenticate, requireAdmin, validate(groupMemberParamsSchema, "params"), requireCurrentGroup, removeMember);
router.delete("/:groupCode", authenticate, requireAdmin, validate(groupCodeParamSchema, "params"), requireCurrentGroup, deleteGroup);
router.get("/:groupCode", authenticate, validate(groupCodeParamSchema, "params"), requireCurrentGroup, getGroup);

export default router;
