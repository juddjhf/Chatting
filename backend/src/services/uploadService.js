import { Readable } from "node:stream";
import Upload from "../models/Upload.js";
import { getCloudinary } from "../config/cloudinary.js";
import { AppError } from "../utils/AppError.js";
import { createCloudinaryPublicId, getProtectedFileUrl } from "../utils/fileHelpers.js";
import { validateUploadedFile } from "../validators/uploadValidator.js";

function uploadBuffer(cloudinary, buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) {
        reject(new AppError(502, "File storage upload failed. Please try again.", "CLOUDINARY_UPLOAD_FAILED"));
        return;
      }
      if (!result?.public_id || !result?.resource_type) {
        reject(new AppError(502, "File storage returned an invalid response.", "CLOUDINARY_INVALID_RESPONSE"));
        return;
      }
      resolve(result);
    });
    Readable.from([buffer]).pipe(stream);
  });
}

export async function uploadFile({ file, group, member }) {
  const validFile = await validateUploadedFile(file);
  const cloudinary = getCloudinary();
  const publicId = createCloudinaryPublicId(group._id, validFile.fileName, validFile.resourceType);
  const result = await uploadBuffer(cloudinary, file.buffer, {
    public_id: publicId,
    resource_type: validFile.resourceType,
    type: "authenticated",
    use_filename: false,
    unique_filename: false,
    overwrite: false,
    filename_override: validFile.fileName,
    context: {
      group_id: String(group._id),
      uploaded_by: String(member._id),
    },
  });

  if (result.resource_type !== validFile.resourceType || result.type !== "authenticated") {
    await cloudinary.uploader.destroy(result.public_id, {
      resource_type: result.resource_type,
      type: result.type || "authenticated",
      invalidate: true,
    });
    throw new AppError(502, "File storage did not apply private delivery.", "CLOUDINARY_DELIVERY_CONFIGURATION_FAILED");
  }

  try {
    const upload = await Upload.create({
      groupId: group._id,
      uploadedBy: member._id,
      publicId: result.public_id,
      resourceType: validFile.resourceType,
      deliveryType: "authenticated",
      format: result.format || validFile.extension.slice(1),
      fileName: validFile.fileName,
      fileSize: result.bytes || file.size,
      mimeType: validFile.mimeType,
      messageType: validFile.messageType,
      status: "uploaded",
      isActive: true,
    });
    return {
      uploadId: String(upload._id),
      fileUrl: getProtectedFileUrl(upload._id),
      fileName: upload.fileName,
      fileSize: upload.fileSize,
      mimeType: upload.mimeType,
      messageType: upload.messageType,
    };
  } catch (error) {
    try {
      await cloudinary.uploader.destroy(result.public_id, {
        resource_type: result.resource_type,
        type: "authenticated",
        invalidate: true,
      });
    } catch (cleanupError) {
      console.error("Cloudinary cleanup failed after metadata persistence error:", cleanupError?.name || "Error");
    }
    throw error;
  }
}

export async function getGroupUpload(uploadId, groupId) {
  const upload = await Upload.findOne({
    _id: uploadId,
    groupId,
    status: "attached",
    isActive: true,
  }).select("+publicId");
  if (!upload) throw new AppError(404, "File not found.", "UPLOAD_NOT_FOUND");
  return upload;
}

export function createAuthenticatedCloudinaryUrl(upload) {
  const cloudinary = getCloudinary();
  return cloudinary.url(upload.publicId, {
    secure: true,
    resource_type: upload.resourceType,
    type: "authenticated",
    sign_url: true,
    ...(upload.resourceType === "raw" ? {} : { format: upload.format }),
  });
}

export async function openCloudinaryStream(upload, range) {
  const url = createAuthenticatedCloudinaryUrl(upload);
  const response = await fetch(url, {
    headers: range ? { Range: range } : undefined,
    signal: AbortSignal.timeout(30000),
    redirect: "error",
  });
  if (!response.ok && response.status !== 206) {
    await response.body?.cancel();
    throw new AppError(502, "File storage could not deliver this file.", "CLOUDINARY_DELIVERY_FAILED");
  }
  return response;
}

export async function deactivateGroupUploads(groupId) {
  await Upload.updateMany({ groupId }, { $set: { isActive: false } });
}
