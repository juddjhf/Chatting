import { AppError } from "../utils/AppError.js";

export function requireCurrentGroup(req, _res, next) {
  const requestedCode = req.params.groupCode || req.body?.groupCode;
  if (requestedCode && requestedCode.toUpperCase() !== req.group.groupCode) {
    next(new AppError(404, "Group not found.", "GROUP_NOT_FOUND"));
    return;
  }
  next();
}
