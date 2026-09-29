const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  clinic_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic',
    required: true
  },
  specialization: {
    type: String,
    required: true
  },
  license_number: {
    type: String,
    required: true,
    unique: true
  },
  experience_years: {
    type: Number,
    required: true
  },
  consultation_fee: {
    type: Number,
    required: true
  },
  availability_status: {
    type: String,
    enum: ['available', 'unavailable', 'on_leave'],
    default: 'available'
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Doctor', doctorSchema);