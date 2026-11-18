import mongoose from "mongoose";

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    groupCode: { type: String, required: true, uppercase: true, trim: true, immutable: true },
    passwordHash: { type: String, required: true, select: false },
    creatorId: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "Member" }],
    isActive: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, result) {
        delete result.passwordHash;
        delete result.__v;
        return result;
      },
    },
  },
);

groupSchema.index({ groupCode: 1 }, { unique: true, name: "unique_group_code" });
groupSchema.index({ isActive: 1, createdAt: -1 });

export default mongoose.models.Group || mongoose.model("Group", groupSchema);
