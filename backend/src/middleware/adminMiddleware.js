import { AppError } from "../utils/AppError.js";

export function requireAdmin(req, _res, next) {
  if (req.member?.role !== "admin" || req.group?.creatorId.toString() !== req.member._id.toString()) {
    next(new AppError(403, "Group administrator access required.", "ADMIN_REQUIRED"));
    return;
  }
  next();
}
