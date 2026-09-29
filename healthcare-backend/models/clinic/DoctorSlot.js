const mongoose = require('mongoose');

const doctorSlotSchema = new mongoose.Schema({
  doctor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
  clinic_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic',
    required: true
  },
  day_of_week: {
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    required: true
  },
  start_time: {
    type: String,
    required: true,
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please provide time in HH:MM format']
  },
  end_time: {
    type: String,
    required: true,
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please provide time in HH:MM format']
  },
  slot_duration: {
    type: Number,
    default: 30, // minutes
    min: 15,
    max: 120
  },
  max_patients: {
    type: Number,
    default: 1,
    min: 1
  },
  is_active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
doctorSlotSchema.index({ doctor_id: 1, day_of_week: 1 });
doctorSlotSchema.index({ clinic_id: 1, doctor_id: 1 });

// Prevent overlapping slots for same doctor on same day
doctorSlotSchema.index(
  { doctor_id: 1, day_of_week: 1, start_time: 1, end_time: 1 },
  { unique: true }
);

module.exports = mongoose.model('DoctorSlot', doctorSlotSchema);
