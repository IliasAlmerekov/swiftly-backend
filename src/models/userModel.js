import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  company: {
    type: String,
    default: null,
  },
  department: {
    type: String,
    default: null,
  },
  position: {
    type: String,
    default: null,
  },
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  country: {
    type: String,
    default: null,
  },
  city: {
    type: String,
    default: null,
  },
  address: {
    type: String,
    default: null,
  },
  postalCode: {
    type: Number,
    default: null,
  },
  role: {
    type: String,
    enum: ["user", "support1", "admin"],
    default: "user",
  },
  isOnline: {
    type: Boolean,
    default: false,
  },
  lastSeen: {
    type: Date,
    default: Date.now,
  },
  avatar: {
    public_id: {
      type: String,
      default: null,
    },
    url: {
      type: String,
      default: null,
    },
  },
});

export default mongoose.model("User", userSchema);
