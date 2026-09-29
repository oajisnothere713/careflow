const mongoose = require('mongoose');


const ChatSessionSchema = new mongoose.Schema(
  {
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }],
    clinic_id: { type: mongoose.Schema.Types.ObjectId, ref: "Clinic" },
    status: { type: String, default: "active" } // active | closed
  },
  { timestamps: true }
);

module.exports = mongoose.model("ChatSession", ChatSessionSchema);
