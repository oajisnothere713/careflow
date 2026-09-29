const mongoose = require('mongoose');

const labReportSchema = new mongoose.Schema({
  patient_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  doctor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor'
  },
  clinic_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic',
    required: true
  },
  appointment_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  test_name: {
    type: String,
    required: true
  },
  test_type: {
    type: String,
    enum: ['blood', 'urine', 'xray', 'mri', 'ct_scan', 'ultrasound', 'ecg', 'other'],
    required: true
  },
  test_date: {
    type: Date,
    required: true
  },
  results: [{
    parameter: String,
    value: String,
    unit: String,
    reference_range: String,
    status: {
      type: String,
      enum: ['normal', 'abnormal', 'critical']
    }
  }],
  findings: {
    type: String,
    maxlength: 2000
  },
  interpretation: {
    type: String,
    maxlength: 2000
  },
  lab_name: String,
  technician_name: String,
  verified_by: String,
  report_file_url: String,  // For storing uploaded report files
  status: {
    type: String,
    enum: ['pending', 'completed', 'reviewed'],
    default: 'pending'
  },
  notes: String
}, {
  timestamps: true
});

// Indexes
labReportSchema.index({ patient_id: 1, test_date: -1 });
labReportSchema.index({ clinic_id: 1 });
labReportSchema.index({ test_type: 1 });

module.exports = mongoose.model('LabReport', labReportSchema);
