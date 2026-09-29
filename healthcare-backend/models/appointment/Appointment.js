const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
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
    appointment_date: {
      type: Date,
      required: true,
    },
    appointment_time: {
      type: String,
      required: true,
      match: [
        /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
        "Please provide time in HH:MM format",
      ],
    },
    duration_minutes: {
      type: Number,
      default: 30,
    },
    status: {
      type: String,
      enum: [
        "booked",
        "confirmed",
        "completed",
        "cancelled",
        "no_show",
        "rescheduled",
      ],
      default: "booked",
    },
    booking_source: {
      type: String,
      enum: ["online", "staff", "walk_in"],
      default: "online",
    },
    reason_for_visit: {
      type: String,
      required: true,
      maxlength: 500,
    },
    symptoms: [
      {
        type: String,
      },
    ],
    visit_type: {
      type: String,
      enum: ["first_visit", "follow_up", "emergency"],
      default: "first_visit",
    },
    priority: {
      type: String,
      enum: ["normal", "urgent", "emergency"],
      default: "normal",
    },
    booked_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    cancelled_reason: String,
    cancelled_at: Date,
    cancelled_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    slot_release_notified: {
      type: Boolean,
      default: false,
    },
    rescheduled_from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
    },
    payment_status: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded", "not_required"],
      default: "pending",
    },
    invoice_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
    },
    is_paid: {
      type: Boolean,
      default: false,
    },
    notes: String,
    from_waitlist: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
appointmentSchema.index({ patient_id: 1, appointment_date: -1 });
appointmentSchema.index({
  doctor_id: 1,
  appointment_date: 1,
  appointment_time: 1,
});
appointmentSchema.index({ clinic_id: 1, appointment_date: 1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ appointment_date: 1 });

// Prevent double booking
appointmentSchema.index(
  { doctor_id: 1, appointment_date: 1, appointment_time: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $nin: ["cancelled", "no_show", "rescheduled"] },
    },
  },
);

// Virtual for full appointment datetime
appointmentSchema.virtual("fullDateTime").get(function () {
  const date = new Date(this.appointment_date);
  const [hours, minutes] = this.appointment_time.split(":");
  date.setHours(parseInt(hours), parseInt(minutes));
  return date;
});

module.exports = mongoose.model("Appointment", appointmentSchema);
