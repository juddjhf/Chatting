import { Router } from "express";
import { streamUpload, upload } from "../controllers/uploadController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { requireCurrentGroup } from "../middleware/groupAuthMiddleware.js";
import { uploadLimiter } from "../middleware/rateLimitMiddleware.js";
import { createUploadMiddleware } from "../middleware/uploadMiddleware.js";
import { validate } from "../middleware/validateMiddleware.js";
import { uploadIdParamSchema } from "../validators/groupValidator.js";

const router = Router();
const receiveFile = createUploadMiddleware();

router.post("/", authenticate, requireCurrentGroup, uploadLimiter, receiveFile, upload);
router.get("/:uploadId/content", authenticate, validate(uploadIdParamSchema, "params"), streamUpload);

export default router;
