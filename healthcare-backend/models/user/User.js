const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: true,
    unique: true
  },
  role: {
    type: String,
    enum: ['super_admin', 'clinic_admin', 'doctor', 'staff', 'patient'],
    required: true
  },
  clinic_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic',
    required: function() {
      return !['super_admin'].includes(this.role);
    }
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['active', 'blocked', 'inactive'],
    default: 'active'
  },
  profile_completed: {
    type: Boolean,
    default: false
  },
  lastLogin: {
    type: Date
  },
  otp: {
    type: String,
    default: null
  },
  otpExpiresAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);