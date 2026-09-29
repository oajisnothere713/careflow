const mongoose = require("mongoose");

const aiConsultationSchema = new mongoose.Schema(
  {
    appointment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
    },
    recording_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AudioRecording",
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
    raw_transcript: {
      type: String,
      required: true,
    },
    summary: {
      type: String,
      default: "",
    },
    patient_summary: {
      type: String,
      default: "",
    },
    doctor_summary: {
      type: String,
      default: "",
    },
    chief_complaint: {
      type: String,
      default: "",
    },
    diagnosis: {
      type: String,
      default: "",
    },
    prescription_data: [
      {
        medicine_name: String,
        dosage: String,
        frequency: String,
        duration: String,
        instructions: String,
      },
    ],
    follow_up_date: Date,
    status: {
      type: String,
      enum: ["draft", "reviewed", "saved"],
      default: "draft",
    },
    doctor_edits: {
      summary: String,
      patient_summary: String,
      doctor_summary: String,
      chief_complaint: String,
      diagnosis: String,
      prescription_data: [
        {
          medicine_name: String,
          dosage: String,
          frequency: String,
          duration: String,
          instructions: String,
        },
      ],
      follow_up_date: Date,
    },
    saved_at: Date,
  },
  {
    timestamps: true,
  },
);

aiConsultationSchema.index({ appointment_id: 1 });
aiConsultationSchema.index({ doctor_id: 1, createdAt: -1 });
aiConsultationSchema.index({ status: 1 });

module.exports = mongoose.model("AIConsultation", aiConsultationSchema);
