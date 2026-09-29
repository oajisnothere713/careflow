const mongoose = require('mongoose');

const insurancePolicySchema = new mongoose.Schema({
  patient_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  provider_name: {
    type: String,
    required: true
  },
  policy_number: {
    type: String,
    required: true,
    unique: true
  },
  policy_holder_name: {
    type: String,
    required: true
  },
  relationship_to_patient: {
    type: String,
    enum: ['self', 'spouse', 'parent', 'child', 'other'],
    default: 'self'
  },
  coverage_type: {
    type: String,
    enum: ['individual', 'family', 'group'],
    required: true
  },
  coverage_amount: {
    type: Number,
    required: true
  },
  coverage_percentage: {
    type: Number,
    default: 80,
    min: 0,
    max: 100
  },
  deductible: {
    type: Number,
    default: 0
  },
  co_payment: {
    type: Number,
    default: 0
  },
  valid_from: {
    type: Date,
    required: true
  },
  valid_till: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'cancelled'],
    default: 'active'
  },
  contact_info: {
    phone: String,
    email: String,
    website: String
  },
  documents: [{
    document_type: String,
    file_url: String,
    uploaded_at: { type: Date, default: Date.now }
  }],
  notes: String
}, {
  timestamps: true
});

// Indexes
insurancePolicySchema.index({ patient_id: 1 });
insurancePolicySchema.index({ policy_number: 1 }, { unique: true });
insurancePolicySchema.index({ status: 1 });

// Method to check if policy is currently valid
insurancePolicySchema.methods.isValid = function() {
  const now = new Date();
  return this.status === 'active' && 
         this.valid_from <= now && 
         this.valid_till >= now;
};

module.exports = mongoose.model('InsurancePolicy', insurancePolicySchema);
