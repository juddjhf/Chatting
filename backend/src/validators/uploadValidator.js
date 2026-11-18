import path from "node:path";
import yauzl from "yauzl";
import { fileTypeFromBuffer } from "file-type";
import { z } from "zod";
import { AppError } from "../utils/AppError.js";
import { sanitizeFileName } from "../utils/fileHelpers.js";

export const uploadRules = Object.freeze({
  ".jpg": { messageType: "image", resourceType: "image", mimeTypes: ["image/jpeg"] },
  ".jpeg": { messageType: "image", resourceType: "image", mimeTypes: ["image/jpeg"] },
  ".png": { messageType: "image", resourceType: "image", mimeTypes: ["image/png"] },
  ".webp": { messageType: "image", resourceType: "image", mimeTypes: ["image/webp"] },
  ".mp4": { messageType: "video", resourceType: "video", mimeTypes: ["video/mp4"] },
  ".webm": { messageType: "video", resourceType: "video", mimeTypes: ["video/webm"] },
  ".mov": { messageType: "video", resourceType: "video", mimeTypes: ["video/quicktime"] },
  ".pdf": { messageType: "document", resourceType: "raw", mimeTypes: ["application/pdf"] },
  ".doc": { messageType: "document", resourceType: "raw", mimeTypes: ["application/msword"] },
  ".docx": { messageType: "document", resourceType: "raw", mimeTypes: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"] },
  ".xls": { messageType: "document", resourceType: "raw", mimeTypes: ["application/vnd.ms-excel"] },
  ".xlsx": { messageType: "document", resourceType: "raw", mimeTypes: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"] },
  ".txt": { messageType: "document", resourceType: "raw", mimeTypes: ["text/plain"] },
  ".ppt": { messageType: "document", resourceType: "raw", mimeTypes: ["application/vnd.ms-powerpoint"] },
  ".pptx": { messageType: "document", resourceType: "raw", mimeTypes: ["application/vnd.openxmlformats-officedocument.presentationml.presentation"] },
});

const uploadMetadataSchema = z.object({
  fileName: z.string().min(1).max(180),
  fileSize: z.number().int().positive(),
  mimeType: z.string().min(1).max(120),
});

function hasBytes(buffer, signature, offset = 0) {
  return buffer.length >= offset + signature.length && signature.every((byte, index) => buffer[offset + index] === byte);
}

function zipContainsEntry(buffer, expectedEntry) {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(buffer, { lazyEntries: true, autoClose: true }, (error, zipFile) => {
      if (error) {
        reject(error);
        return;
      }
      if (zipFile.entryCount > 10000) {
        zipFile.close();
        resolve(false);
        return;
      }
      zipFile.on("error", reject);
      zipFile.on("entry", (entry) => {
        if (entry.fileName === expectedEntry) {
          zipFile.close();
          resolve(true);
          return;
        }
        zipFile.readEntry();
      });
      zipFile.on("end", () => resolve(false));
      zipFile.readEntry();
    });
  });
}

async function validateContent(extension, buffer) {
  const detected = await fileTypeFromBuffer(buffer);
  if ([".jpg", ".jpeg"].includes(extension)) return detected?.ext === "jpg";
  if (extension === ".png") return detected?.ext === "png";
  if (extension === ".webp") return detected?.ext === "webp";
  if (extension === ".pdf") return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  if (extension === ".mp4") return detected?.ext === "mp4" && buffer.toString("ascii", 4, 8) === "ftyp";
  if (extension === ".mov") {
    return buffer.toString("ascii", 4, 8) === "ftyp" &&
      (buffer.toString("ascii", 8, 12) === "qt  " || detected?.ext === "mov");
  }
  if (extension === ".webm") return detected?.ext === "webm";
  if ([".doc", ".xls", ".ppt"].includes(extension)) {
    return hasBytes(buffer, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  }
  const officeEntries = {
    ".docx": "word/document.xml",
    ".xlsx": "xl/workbook.xml",
    ".pptx": "ppt/presentation.xml",
  };
  if (officeEntries[extension]) {
    if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) return false;
    try {
      return await zipContainsEntry(buffer, officeEntries[extension]);
    } catch {
      return false;
    }
  }
  if (extension === ".txt") {
    try {
      const decoded = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
      return !decoded.includes("\u0000");
    } catch {
      return false;
    }
  }
  return false;
}

export async function validateUploadedFile(file) {
  if (!file?.buffer?.length) throw new AppError(400, "The uploaded file is empty.", "EMPTY_UPLOAD");
  const fileName = sanitizeFileName(file.originalname);
  const extension = path.extname(fileName).toLowerCase();
  const rule = uploadRules[extension];
  if (!rule || !rule.mimeTypes.includes(file.mimetype)) {
    throw new AppError(415, "Unsupported file type.", "UNSUPPORTED_FILE_TYPE");
  }
  if (!(await validateContent(extension, file.buffer))) {
    throw new AppError(415, "File content does not match its extension.", "INVALID_FILE_CONTENT");
  }
  const metadata = uploadMetadataSchema.safeParse({
    fileName,
    fileSize: file.size,
    mimeType: file.mimetype,
  });
  if (!metadata.success) throw new AppError(400, "Invalid file metadata.", "INVALID_FILE_METADATA");
  return {
    ...metadata.data,
    extension,
    messageType: rule.messageType,
    resourceType: rule.resourceType,
  };
}

export function isAllowedUploadMetadata(file) {
  const extension = path.extname(sanitizeFileName(file.originalname)).toLowerCase();
  const rule = uploadRules[extension];
  return Boolean(rule && rule.mimeTypes.includes(file.mimetype));
}
