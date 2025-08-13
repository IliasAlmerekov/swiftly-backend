import mongoose from "mongoose";

// Comment schema as a subdocument
const commentSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: true,
      trim: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Ticket-Schema mit Verweis auf den User (owner) und Status
const ticketSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    // Referenz auf den User, der das Ticket erstellt hat
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Referenz auf den Admin, dem das Ticket zugewiesen wurde
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    // Status des Tickets (z.B. offen, geschlossen)
    status: {
      type: String,
      enum: ["open", "in-progress", "resolved", "closed"],
      default: "open",
    },
    // Comments array as subdocuments
    comments: [commentSchema],
  },
  {
    // Automatisch Zeitstempel hinzufügen (createdAt, updatedAt)
    timestamps: true,
  }
);

ticketSchema.pre("save", function (next) {
  if (!this.isModified("title")) return next();
  this.title = this.title.trim();
  next();
});

ticketSchema.methods.getSummary = function () {
  return {
    id: this._id,
    title: this.title,
    priority: this.priority,
    description: this.description,
  };
};

export default mongoose.model("Ticket", ticketSchema);
