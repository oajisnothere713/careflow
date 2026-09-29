const mongoose = require('mongoose');


const ChatMessageSchema = new mongoose.Schema(
  {
    session_id: { type: mongoose.Schema.Types.ObjectId, ref: "ChatSession", required: true },
    sender_role: { type: String, enum: ["patient", "doctor", "clinic_admin", "super_admin"], required: true },
    sender_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, required: true },
    message_type: { type: String, default: "text" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("ChatMessage", ChatMessageSchema);
