const mongoose = require("mongoose");

const followUpSchema = new mongoose.Schema(
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
    appointment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
    },
    consultation_note_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ConsultationNote",
    },
    follow_up_date: {
      type: Date,
      required: true,
    },
    follow_up_time: {
      type: String,
      match: [
        /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
        "Please provide time in HH:MM format",
      ],
    },
    purpose: {
      type: String,
      required: true,
      maxlength: 500,
    },
    instructions: {
      type: String,
      maxlength: 1000,
    },
    priority: {
      type: String,
      enum: ["routine", "important", "urgent"],
      default: "routine",
    },
    status: {
      type: String,
      enum: ["pending", "scheduled", "completed", "cancelled", "missed"],
      default: "pending",
    },
    reminder_sent: {
      type: Boolean,
      default: false,
    },
    reminder_date: Date,
    completed_date: Date,
    notes: String,
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    new_appointment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
    },
    suggested_slots: [
      {
        date: Date,
        time: String,
      },
    ],
    confirmation_token: String,
    token_expires_at: Date,
    patient_notified_at: Date,
  },
  {
    timestamps: true,
  },
);

// Ensure virtuals (e.g., reason) are returned in JSON/object outputs
followUpSchema.set("toJSON", { virtuals: true });
followUpSchema.set("toObject", { virtuals: true });

// Backward compatible alias so existing clients can read `reason`
followUpSchema.virtual("reason").get(function () {
  return this.purpose;
});

// Backward compatible alias for older responses expecting consultation_id
followUpSchema.virtual("consultation_id").get(function () {
  return this.consultation_note_id;
});

// Indexes
followUpSchema.index({ patient_id: 1, follow_up_date: 1 });
followUpSchema.index({ doctor_id: 1, follow_up_date: 1 });
followUpSchema.index({ clinic_id: 1, follow_up_date: 1 });
followUpSchema.index({ status: 1, follow_up_date: 1 });

module.exports = mongoose.model("FollowUp", followUpSchema);
