const mongoose = require("mongoose");

const audioRecordingSchema = new mongoose.Schema(
  {
    appointment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
    },
    doctor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },
    patient_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    clinic_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Clinic",
      required: true,
    },
    transcript: {
      type: String,
      default: "",
    },
    duration_seconds: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["recording", "transcribed", "processed", "failed"],
      default: "recording",
    },
  },
  {
    timestamps: true,
  },
);

audioRecordingSchema.index({ appointment_id: 1 });
audioRecordingSchema.index({ doctor_id: 1, createdAt: -1 });

module.exports = mongoose.model("AudioRecording", audioRecordingSchema);
