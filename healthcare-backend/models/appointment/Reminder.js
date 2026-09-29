const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  patient_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient'
  },
  clinic_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic',
    required: true
  },
  type: {
    type: String,
    enum: ['appointment', 'follow_up', 'payment', 'medication', 'lab_test', 'other'],
    required: true
  },
  related_id: {
    type: mongoose.Schema.Types.ObjectId
  },
  related_model: {
    type: String,
    enum: ['Appointment', 'FollowUp', 'Invoice', 'Prescription']
  },
  subject: {
    type: String,
    required: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    maxlength: 1000
  },
  channel: {
    type: String,
    enum: ['email', 'sms', 'push', 'in_app'],
    default: 'email'
  },
  scheduled_at: {
    type: Date,
    required: true
  },
  sent_at: Date,
  status: {
    type: String,
    enum: ['scheduled', 'sent', 'failed', 'cancelled'],
    default: 'scheduled'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  retry_count: {
    type: Number,
    default: 0
  },
  error_message: String,
  metadata: {
    type: Map,
    of: String
  }
}, {
  timestamps: true
});

// Indexes
reminderSchema.index({ user_id: 1, scheduled_at: 1 });
reminderSchema.index({ patient_id: 1, type: 1 });
reminderSchema.index({ clinic_id: 1, scheduled_at: 1 });
reminderSchema.index({ status: 1, scheduled_at: 1 });
reminderSchema.index({ related_id: 1, related_model: 1 });

module.exports = mongoose.model('Reminder', reminderSchema);
