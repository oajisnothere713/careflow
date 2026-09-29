const mongoose = require('mongoose');

const medicalHistorySchema = new mongoose.Schema({
  patient_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
    unique: true
  },
  clinic_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic',
    required: true
  },
  known_conditions: [{
    condition: { type: String, required: true },
    diagnosed_date: { type: Date },
    status: { 
      type: String, 
      enum: ['active', 'resolved', 'chronic'],
      default: 'active'
    },
    notes: String
  }],
  allergies: [{
    allergen: { type: String, required: true },
    reaction: { type: String, required: true },
    severity: { 
      type: String, 
      enum: ['mild', 'moderate', 'severe'],
      required: true
    },
    identified_date: Date
  }],
  current_medications: [{
    medication_name: { type: String, required: true },
    dosage: { type: String, required: true },
    frequency: { type: String, required: true },
    started_date: { type: Date, required: true },
    prescribed_by: { type: String },
    purpose: String
  }],
  past_surgeries: [{
    procedure: { type: String, required: true },
    date: { type: Date, required: true },
    hospital: String,
    surgeon: String,
    complications: String,
    notes: String
  }],
  family_history: [{
    relation: { 
      type: String, 
      enum: ['father', 'mother', 'sibling', 'grandparent', 'other'],
      required: true
    },
    condition: { type: String, required: true },
    notes: String
  }],
  immunizations: [{
    vaccine_name: { type: String, required: true },
    date_administered: { type: Date, required: true },
    next_dose_date: Date,
    administered_by: String
  }],
  lifestyle: {
    smoking: { 
      type: String, 
      enum: ['never', 'former', 'current']
    },
    alcohol: { 
      type: String, 
      enum: ['never', 'occasional', 'regular']
    },
    exercise: {
      type: String,
      enum: ['sedentary', 'light', 'moderate', 'active']
    },
    diet: {
      type: String,
      enum: ['vegetarian', 'non-vegetarian', 'vegan', 'other']
    }
  },
  notes: {
    type: String,
    maxlength: 2000
  },
  last_updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
medicalHistorySchema.index({ patient_id: 1 });
medicalHistorySchema.index({ clinic_id: 1 });

module.exports = mongoose.model('MedicalHistory', medicalHistorySchema);
