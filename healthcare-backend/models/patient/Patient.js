const mongoose = require("mongoose");

const patientSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  clinic_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Clinic",
    required: true,
  },
  patient_id: {
    type: String,
    unique: true,
    required: true,
  },
  gender: {
    type: String,
    enum: ["male", "female", "other"],
    required: true,
  },
  date_of_birth: {
    type: Date,
    required: true,
  },
  blood_group: {
    type: String,
    enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    required: true,
  },
  address: {
    type: String,
    default: null,
  },
  emergency_contact: {
    type: String,
    default: null,
  },
  insurance_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "InsurancePolicy",
    default: null,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Patient", patientSchema);
