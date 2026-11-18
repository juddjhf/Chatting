import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true },
    senderName: { type: String, required: true, trim: true, maxlength: 32 },
    messageType: { type: String, enum: ["text", "image", "video", "document"], required: true },
    clientMessageId: { type: String, maxlength: 64, default: null },
    text: { type: String, default: "", maxlength: 5000 },
    fileUrl: { type: String, default: "" },
    fileName: { type: String, default: "", maxlength: 180 },
    fileSize: { type: Number, default: 0, min: 0 },
    mimeType: { type: String, default: "", maxlength: 120 },
    uploadId: { type: mongoose.Schema.Types.ObjectId, ref: "Upload", default: null },
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: "Message", default: null },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Member", default: null },
  },
  { timestamps: true },
);

messageSchema.index({ groupId: 1, createdAt: -1, _id: -1 }, { name: "group_message_history" });
messageSchema.index({ senderId: 1, createdAt: -1 });
messageSchema.index({ groupId: 1, replyTo: 1 });
messageSchema.index(
  { groupId: 1, senderId: 1, clientMessageId: 1 },
  { unique: true, partialFilterExpression: { clientMessageId: { $type: "string" } }, name: "message_idempotency" },
);

export default mongoose.models.Message || mongoose.model("Message", messageSchema);
