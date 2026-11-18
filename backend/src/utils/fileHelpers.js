import path from "node:path";
import { randomUUID } from "node:crypto";
import { getConfig } from "../config/env.js";

export function sanitizeFileName(input) {
  const baseName = path.posix.basename(path.win32.basename(String(input || "")));
  const cleaned = baseName
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[^\p{L}\p{N}._ -]/gu, "_")
    .replace(/\.{2,}/g, ".")
    .replace(/^[.\s]+|[.\s]+$/g, "")
    .slice(0, 150);
  return cleaned || "shared-file";
}

export function createCloudinaryPublicId(groupId, fileName, resourceType) {
  const extension = path.extname(sanitizeFileName(fileName)).toLowerCase();
  const suffix = resourceType === "raw" ? extension : "";
  return `private-chat/${groupId}/${randomUUID()}${suffix}`;
}

export function getProtectedFileUrl(uploadId) {
  const { API_PUBLIC_URL } = getConfig();
  return `${API_PUBLIC_URL.replace(/\/+$/, "")}/api/uploads/${uploadId}/content`;
}

export function formatContentDisposition(fileName, attachment = false) {
  const safeName = sanitizeFileName(fileName);
  const disposition = attachment ? "attachment" : "inline";
  const asciiName = safeName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `${disposition}; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`;
}
