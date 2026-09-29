const mongoose = require('mongoose');

const clinicSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Clinic name is required'],
    trim: true,
    minlength: [3, 'Clinic name must be at least 3 characters'],
    maxlength: [100, 'Clinic name cannot exceed 100 characters']
  },
  registration_number: {
    type: String,
    required: [true, 'Registration number is required'],
    unique: true,
    trim: true
  },
  address: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postal_code: { type: String, required: true },
    country: { type: String, default: 'India' }
  },
  contact: {
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
    },
    website: {
      type: String,
      trim: true
    }
  },
  timings: {
    monday: { open: String, close: String, isClosed: { type: Boolean, default: false } },
    tuesday: { open: String, close: String, isClosed: { type: Boolean, default: false } },
    wednesday: { open: String, close: String, isClosed: { type: Boolean, default: false } },
    thursday: { open: String, close: String, isClosed: { type: Boolean, default: false } },
    friday: { open: String, close: String, isClosed: { type: Boolean, default: false } },
    saturday: { open: String, close: String, isClosed: { type: Boolean, default: false } },
    sunday: { open: String, close: String, isClosed: { type: Boolean, default: true } }
  },
  specialties: [{
    type: String,
    enum: [
      'General Medicine', 'Cardiology', 'Dermatology', 'Pediatrics', 
      'Orthopedics', 'Neurology', 'Gynecology', 'Psychiatry',
      'Dentistry', 'Ophthalmology', 'ENT', 'Radiology', 'Oncology',
      'Urology', 'Nephrology', 'Gastroenterology', 'Pulmonology', 'Endocrinology'
    ]
  }],
  facilities: [{
    type: String,
    enum: [
      'Emergency', '24x7 Emergency', 'ICU', 'Laboratory', 'Pharmacy', 
      'Radiology', 'MRI & CT Scan', 'Surgery', 'Ambulance', 'Ambulance Service',
      'Blood Bank', 'Dialysis', 'X-Ray', 'Ultrasound', 'Cafeteria', 'Parking'
    ]
  }],
  total_beds: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'temporarily_closed'],
    default: 'active'
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
clinicSchema.index({ name: 1 });
clinicSchema.index({ 'address.city': 1 });
clinicSchema.index({ status: 1 });
clinicSchema.index({ registration_number: 1 }, { unique: true });

// Virtual for full address
clinicSchema.virtual('fullAddress').get(function() {
  return `${this.address.street}, ${this.address.city}, ${this.address.state} - ${this.address.postal_code}`;
});

// Method to check if clinic is open on a given day
clinicSchema.methods.isOpenOn = function(day) {
  const dayLower = day.toLowerCase();
  return this.timings[dayLower] && !this.timings[dayLower].isClosed;
};

module.exports = mongoose.model('Clinic', clinicSchema);
