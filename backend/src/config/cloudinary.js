import { v2 as cloudinary } from "cloudinary";
import { getConfig } from "./env.js";

let configured = false;

export function getCloudinary() {
  if (!configured) {
    const {
      CLOUDINARY_CLOUD_NAME,
      CLOUDINARY_API_KEY,
      CLOUDINARY_API_SECRET,
    } = getConfig();
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      throw new Error("Cloudinary is not configured. Set its environment variables before uploading files.");
    }
    cloudinary.config({
      cloud_name: CLOUDINARY_CLOUD_NAME,
      api_key: CLOUDINARY_API_KEY,
      api_secret: CLOUDINARY_API_SECRET,
      secure: true,
    });
    configured = true;
  }
  return cloudinary;
}

export function resetCloudinaryConfigurationForTests() {
  configured = false;
}
