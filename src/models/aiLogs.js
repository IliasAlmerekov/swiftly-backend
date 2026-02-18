import mongoose from "mongoose";

const aiRequestLogSchema = new mongoose.Schema({
  createdAt: { type: Date, default: Date.now, expires: "30d" },
  prompt: String,
});

export default mongoose.model("AIRequestLog", aiRequestLogSchema);
