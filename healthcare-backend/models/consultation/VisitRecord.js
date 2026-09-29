const mongoose = require('mongoose');

const visitRecordSchema = new mongoose.Schema({
  patient_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  appointment_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: true
  },
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
  visit_date: {
    type: Date,
    required: true,
    default: Date.now
  },
  visit_type: {
    type: String,
    enum: ['consultation', 'follow_up', 'emergency', 'procedure'],
    required: true
  },
  consultation_note_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ConsultationNote'
  },
  prescription_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prescription'
  },
  lab_reports: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LabReport'
  }],
  invoice_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice'
  },
  summary: {
    type: String,
    maxlength: 1000
  },
  next_visit_date: Date,
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'cancelled'],
    default: 'in_progress'
  }
}, {
  timestamps: true
});

// Indexes
visitRecordSchema.index({ patient_id: 1, visit_date: -1 });
visitRecordSchema.index({ doctor_id: 1, visit_date: -1 });
visitRecordSchema.index({ clinic_id: 1, visit_date: -1 });
visitRecordSchema.index({ appointment_id: 1 }, { unique: true });

module.exports = mongoose.model('VisitRecord', visitRecordSchema);
