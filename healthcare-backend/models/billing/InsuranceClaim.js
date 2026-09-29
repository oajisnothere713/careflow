const mongoose = require('mongoose');

const insuranceClaimSchema = new mongoose.Schema({
  claim_number: {
    type: String,
    unique: true,
    required: true
  },
  patient_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  insurance_policy_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InsurancePolicy',
    required: true
  },
  invoice_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    required: true
  },
  clinic_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic',
    required: true
  },
  claim_date: {
    type: Date,
    default: Date.now,
    required: true
  },
  treatment_date: {
    type: Date,
    required: true
  },
  diagnosis: {
    type: String,
    required: true
  },
  treatment_details: {
    type: String,
    required: true,
    maxlength: 2000
  },
  claimed_amount: {
    type: Number,
    required: true,
    min: 0
  },
  approved_amount: {
    type: Number,
    default: 0,
    min: 0
  },
  rejected_amount: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'under_review', 'approved', 'partially_approved', 'rejected', 'settled'],
    default: 'draft'
  },
  submission_date: Date,
  approval_date: Date,
  settlement_date: Date,
  rejection_reason: String,
  supporting_documents: [{
    document_type: {
      type: String,
      enum: ['prescription', 'lab_report', 'bill', 'medical_certificate', 'other']
    },
    file_url: String,
    uploaded_at: { type: Date, default: Date.now }
  }],
  insurance_reference_number: String,
  reviewed_by: String,  // Insurance company reviewer name
  notes: String,
  submitted_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
insuranceClaimSchema.index({ claim_number: 1 }, { unique: true });
insuranceClaimSchema.index({ patient_id: 1, claim_date: -1 });
insuranceClaimSchema.index({ insurance_policy_id: 1 });
insuranceClaimSchema.index({ clinic_id: 1, claim_date: -1 });
insuranceClaimSchema.index({ status: 1 });

// Static method to generate claim number
insuranceClaimSchema.statics.generateClaimNumber = async function() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  
  const prefix = `CLM-${year}${month}`;
  
  const lastClaim = await this.findOne({
    claim_number: new RegExp(`^${prefix}`)
  }).sort({ claim_number: -1 });
  
  let sequence = 1;
  if (lastClaim) {
    const lastSequence = parseInt(lastClaim.claim_number.split('-').pop());
    sequence = lastSequence + 1;
  }
  
  return `${prefix}-${String(sequence).padStart(4, '0')}`;
};

module.exports = mongoose.model('InsuranceClaim', insuranceClaimSchema);
