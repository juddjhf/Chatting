import mongoose from "mongoose";

const uploadSchema = new mongoose.Schema(
  {
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true, index: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true, index: true },
    publicId: { type: String, required: true, unique: true, select: false },
    resourceType: { type: String, enum: ["image", "video", "raw"], required: true },
    deliveryType: { type: String, default: "authenticated", immutable: true },
    format: { type: String, required: true, lowercase: true },
    fileName: { type: String, required: true, maxlength: 180 },
    fileSize: { type: Number, required: true, min: 1 },
    mimeType: { type: String, required: true, maxlength: 120 },
    messageType: { type: String, enum: ["image", "video", "document"], required: true },
    status: { type: String, enum: ["uploaded", "attached"], default: "uploaded", index: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

uploadSchema.index({ groupId: 1, createdAt: -1 });
uploadSchema.index({ uploadedBy: 1, status: 1 });

export default mongoose.models.Upload || mongoose.model("Upload", uploadSchema);
