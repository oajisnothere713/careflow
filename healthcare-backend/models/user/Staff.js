const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  clinic_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic',
    required: true
  },
  designation: {
    type: String,
    enum: ['nurse', 'receptionist', 'technician', 'pharmacist', 'admin_staff', 'other'],
    required: true
  },
  department: {
    type: String
  },
  shift: {
    type: String,
    enum: ['morning', 'evening', 'night', 'rotating']
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Staff', staffSchema);