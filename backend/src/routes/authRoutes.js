import { Router } from "express";
import { getCurrentSession, logout } from "../controllers/authController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authLimiter } from "../middleware/rateLimitMiddleware.js";

const router = Router();

router.get("/me", authenticate, getCurrentSession);
router.post("/logout", authLimiter, authenticate, logout);

export default router;
