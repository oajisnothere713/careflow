const mongoose = require("mongoose");

const waitingQueueSchema = new mongoose.Schema(
  {
    patient_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    doctor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },
    clinic_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Clinic",
      required: true,
    },
    preferred_date: {
      type: Date,
      required: true,
    },
    preferred_time_range: {
      start: String,
      end: String,
    },
    reason: {
      type: String,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ["waiting", "notified", "confirmed", "expired", "cancelled"],
      default: "waiting",
    },
    notification_token: {
      type: String,
      unique: true,
      sparse: true,
    },
    token_expires_at: Date,
    notified_at: Date,
    confirmed_at: Date,
  },
  {
    timestamps: true,
  },
);

waitingQueueSchema.index({ doctor_id: 1, preferred_date: 1, status: 1 });
waitingQueueSchema.index({ notification_token: 1 });
waitingQueueSchema.index({ status: 1, token_expires_at: 1 });

module.exports = mongoose.model("WaitingQueue", waitingQueueSchema);
