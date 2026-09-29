const mongoose = require("mongoose");

const confirmationTokenSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["follow_up_confirm", "waitlist_confirm", "slot_release_confirm"],
      required: true,
    },
    patient_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    related_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    related_model: {
      type: String,
      enum: ["FollowUp", "WaitingQueue", "Appointment"],
      required: true,
    },
    slot_data: {
      date: Date,
      time: String,
      doctor_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Doctor",
      },
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "expired"],
      default: "pending",
    },
    expires_at: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 48 * 60 * 60 * 1000),
    },
  },
  {
    timestamps: true,
  },
);

confirmationTokenSchema.index({ status: 1, expires_at: 1 });

module.exports = mongoose.model("ConfirmationToken", confirmationTokenSchema);
