import crypto from "crypto";
import mongoose from "mongoose";

const refreshTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    revokedAt: {
      type: Date,
      default: null,
      index: true,
    },
    replacedByTokenHash: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
refreshTokenSchema.index({ user: 1, revokedAt: 1, expiresAt: 1 });

refreshTokenSchema.statics.hashToken = token =>
  crypto.createHash("sha256").update(String(token)).digest("hex");

export default mongoose.model("RefreshToken", refreshTokenSchema);
