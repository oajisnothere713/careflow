const mongoose = require("mongoose");

const consultationNoteSchema = new mongoose.Schema(
  {
    appointment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
    },
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
    chief_complaint: {
      type: String,
      required: true,
      maxlength: 500,
    },
    symptoms: [
      {
        symptom: String,
        duration: String,
        severity: {
          type: String,
          enum: ["mild", "moderate", "severe"],
        },
      },
    ],
    vital_signs: {
      blood_pressure: String, // e.g., "120/80"
      heart_rate: Number, // bpm
      temperature: Number, // celsius
      respiratory_rate: Number, // breaths per minute
      oxygen_saturation: Number, // percentage
      weight: Number, // kg
      height: Number, // cm
    },
    physical_examination: {
      type: String,
      maxlength: 2000,
    },
    diagnosis: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    treatment_plan: {
      type: String,
      maxlength: 2000,
    },
    follow_up_instructions: {
      type: String,
      maxlength: 1000,
    },
    follow_up_date: Date,
    notes: {
      type: String,
      maxlength: 2000,
    },
    patient_summary: {
      type: String,
      maxlength: 1000,
    },
    ai_consultation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AIConsultation",
    },
    audio_recording_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AudioRecording",
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
consultationNoteSchema.index({ appointment_id: 1 });
consultationNoteSchema.index({ patient_id: 1, createdAt: -1 });
consultationNoteSchema.index({ doctor_id: 1, createdAt: -1 });
consultationNoteSchema.index({ clinic_id: 1 });

module.exports = mongoose.model("ConsultationNote", consultationNoteSchema);
