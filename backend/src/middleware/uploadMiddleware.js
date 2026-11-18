import multer from "multer";
import { getConfig } from "../config/env.js";
import { isAllowedUploadMetadata } from "../validators/uploadValidator.js";
import { AppError } from "../utils/AppError.js";

const storage = multer.memoryStorage();

export function createUploadMiddleware() {
  const { MAX_FILE_SIZE_MB } = getConfig();
  return multer({
    storage,
    limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024, files: 1, fields: 4, parts: 6 },
    fileFilter(_req, file, callback) {
      if (!isAllowedUploadMetadata(file)) {
        callback(new AppError(415, "Unsupported file type.", "UNSUPPORTED_FILE_TYPE"));
        return;
      }
      callback(null, true);
    },
  }).single("file");
}
