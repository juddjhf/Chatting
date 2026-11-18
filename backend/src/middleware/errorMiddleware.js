import { AppError } from "../utils/AppError.js";
import { sendError } from "../utils/apiResponse.js";

export function notFoundHandler(_req, _res, next) {
  next(new AppError(404, "Endpoint not found.", "NOT_FOUND"));
}

export function errorMiddleware(error, _req, res, _next) {
  if (res.headersSent) return;
  if (error?.name === "MulterError") {
    const tooLarge = error.code === "LIMIT_FILE_SIZE";
    sendError(
      res,
      tooLarge ? "File exceeds the configured size limit." : "Invalid file upload.",
      tooLarge ? 413 : 400,
      tooLarge ? "FILE_TOO_LARGE" : "UPLOAD_ERROR",
    );
    return;
  }
  if (error?.name === "ZodError") {
    sendError(res, "Invalid request.", 400, "VALIDATION_ERROR");
    return;
  }
  if (error?.name === "CastError") {
    sendError(res, "Resource not found.", 404, "NOT_FOUND");
    return;
  }
  if (error?.code === 11000) {
    sendError(res, "A resource with that value already exists.", 409, "DUPLICATE_RESOURCE");
    return;
  }
  if (error?.type === "entity.too.large") {
    sendError(res, "Request body is too large.", 413, "BODY_TOO_LARGE");
    return;
  }
  if (error instanceof AppError) {
    sendError(res, error.message, error.statusCode, error.code, error.details);
    return;
  }
  if (process.env.NODE_ENV !== "production") {
    console.error(error);
  } else {
    console.error("Unhandled request error:", error?.name || "Error");
  }
  sendError(res, "An unexpected server error occurred.", 500, "INTERNAL_ERROR");
}
