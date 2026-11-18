import { Readable } from "node:stream";
import { uploadFile, getGroupUpload, openCloudinaryStream } from "../services/uploadService.js";
import { formatContentDisposition } from "../utils/fileHelpers.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";

export const upload = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError(400, "Choose a file to upload.", "FILE_REQUIRED");
  if (req.body?.groupCode && req.body.groupCode.toUpperCase() !== req.group.groupCode) {
    throw new AppError(404, "Group not found.", "GROUP_NOT_FOUND");
  }
  const uploadData = await uploadFile({
    file: req.file,
    group: req.group,
    member: req.member,
  });
  sendSuccess(res, uploadData, "File uploaded.", 201);
});

export const streamUpload = asyncHandler(async (req, res, next) => {
  const upload = await getGroupUpload(req.params.uploadId, req.group._id);
  const upstream = await openCloudinaryStream(upload, req.get("range"));
  res.status(upstream.status);
  res.setHeader("Content-Type", upload.mimeType);
  res.setHeader("Content-Disposition", formatContentDisposition(upload.fileName, upload.messageType === "document"));
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Accept-Ranges", "bytes");
  const contentLength = upstream.headers.get("content-length");
  const contentRange = upstream.headers.get("content-range");
  if (contentLength) res.setHeader("Content-Length", contentLength);
  if (contentRange) res.setHeader("Content-Range", contentRange);
  if (!upstream.body) throw new AppError(502, "File storage returned an empty response.", "CLOUDINARY_EMPTY_RESPONSE");
  Readable.fromWeb(upstream.body).on("error", next).pipe(res);
});
