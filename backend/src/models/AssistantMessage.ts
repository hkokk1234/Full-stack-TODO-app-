import mongoose, { Schema } from "mongoose";

export type AssistantMessageRole = "user" | "assistant";

export type AssistantMessageDocument = {
  userId: mongoose.Types.ObjectId;
  role: AssistantMessageRole;
  content: string;
  createdAt: Date;
};

const assistantMessageSchema = new Schema<AssistantMessageDocument>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true, trim: true, maxlength: 4000 }
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

assistantMessageSchema.index({ userId: 1, createdAt: -1 });

const AssistantMessage = mongoose.model<AssistantMessageDocument>("AssistantMessage", assistantMessageSchema);

export default AssistantMessage;
