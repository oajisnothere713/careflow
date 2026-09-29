const mongoose = require("mongoose");

const prescriptionSchema = new mongoose.Schema(
  {
    consultation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ConsultationNote",
      required: true,
    },
    appointment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
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
    medications: [
      {
        medicine_name: {
          type: String,
          required: true,
        },
        dosage: {
          type: String,
          default: "",
        },
        frequency: {
          type: String,
          default: "",
        },
        duration: {
          type: String,
          default: "",
        },
        instructions: {
          type: String, // e.g., "after meals", "before sleep"
        },
        quantity: Number,
      },
    ],
    additional_instructions: {
      type: String,
      maxlength: 1000,
    },
    valid_until: {
      type: Date,
      default: function () {
        return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      },
    },
    status: {
      type: String,
      enum: ["active", "completed", "cancelled"],
      default: "active",
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
prescriptionSchema.index({ patient_id: 1, createdAt: -1 });
prescriptionSchema.index({ doctor_id: 1 });
prescriptionSchema.index({ consultation_id: 1 });
prescriptionSchema.index({ clinic_id: 1 });

module.exports = mongoose.model("Prescription", prescriptionSchema);
