import mongoose from "mongoose";

const memberSchema = new mongoose.Schema(
  {
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true, index: true },
    nickname: { type: String, required: true, trim: true, minlength: 1, maxlength: 32 },
    role: { type: String, enum: ["admin", "member"], default: "member", required: true },
    isActive: { type: Boolean, default: true, index: true },
    tokenVersion: { type: Number, default: 0, select: false },
    joinedAt: { type: Date, default: Date.now },
    lastSeen: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

memberSchema.index({ groupId: 1, isActive: 1, joinedAt: 1 });
memberSchema.virtual("memberId").get(function memberId() {
  return this._id.toString();
});

export default mongoose.models.Member || mongoose.model("Member", memberSchema);
