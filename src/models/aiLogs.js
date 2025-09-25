import mongoose from "mongoose";

const aiRequestLogSchema = new mongoose.Schema({
    createdAt: {type: Date, default: Date.now },
    prompt: String
});

export default mongoose.model("AIRequestLog", aiRequestLogSchema);