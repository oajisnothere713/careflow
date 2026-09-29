const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  invoice_number: {
    type: String,
    unique: true,
    required: true
  },
  patient_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  doctor_id: { 
    type: require('mongoose').Schema.Types.ObjectId, 
    ref: 'Doctor' },
  clinic_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic',
    required: true
  },
  appointment_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  visit_record_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VisitRecord'
  },
  invoice_date: {
    type: Date,
    default: Date.now,
    required: true
  },
  due_date: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    }
  },
  line_items: [{
    description: {
      type: String,
      required: true
    },
    item_type: {
      type: String,
      enum: ['consultation', 'procedure', 'medicine', 'lab_test', 'room_charge', 'other'],
      required: true
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1
    },
    unit_price: {
      type: Number,
      required: true,
      min: 0
    },
    total_price: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  tax_percentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  tax_amount: {
    type: Number,
    default: 0,
    min: 0
  },
  discount_percentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  discount_amount: {
    type: Number,
    default: 0,
    min: 0
  },
  total_amount: {
    type: Number,
    required: true,
    min: 0
  },
  insurance_policy_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InsurancePolicy'
  },
  insurance_covered_amount: {
    type: Number,
    default: 0,
    min: 0
  },
  patient_payable: {
    type: Number,
    required: true,
    min: 0
  },
  amount_paid: {
    type: Number,
    default: 0,
    min: 0
  },
  balance_due: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'pending', 'paid', 'partial', 'overdue', 'cancelled'],
    default: 'pending'
  },
  payment_method: {
    type: String,
    enum: ['cash', 'card', 'upi', 'bank_transfer', 'insurance', 'multiple']
  },
  notes: String,
  generated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
invoiceSchema.index({ invoice_number: 1 }, { unique: true });
invoiceSchema.index({ patient_id: 1, invoice_date: -1 });
invoiceSchema.index({ clinic_id: 1, invoice_date: -1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ due_date: 1 });

// Pre-save hook to calculate totals
invoiceSchema.pre('save', function(next) {
  // Calculate subtotal
  this.subtotal = this.line_items.reduce((sum, item) => sum + item.total_price, 0);
  
  // Calculate tax
  this.tax_amount = (this.subtotal * this.tax_percentage) / 100;
  
  // Calculate discount
  this.discount_amount = (this.subtotal * this.discount_percentage) / 100;
  
  // Calculate total
  this.total_amount = this.subtotal + this.tax_amount - this.discount_amount;
  
  // Calculate patient payable
  this.patient_payable = this.total_amount - this.insurance_covered_amount;
  
  // Calculate balance due
  this.balance_due = this.patient_payable - this.amount_paid;
  
  // Update status based on payment
  if (this.balance_due === 0 && this.amount_paid > 0) {
    this.status = 'paid';
  } else if (this.amount_paid > 0 && this.amount_paid < this.patient_payable) {
    this.status = 'partial';
  }
  
  next();
});

// Static method to generate invoice number
invoiceSchema.statics.generateInvoiceNumber = async function(clinicId) {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  
  const prefix = `INV-${year}${month}`;
  
  // Find the last invoice for this month
  const lastInvoice = await this.findOne({
    invoice_number: new RegExp(`^${prefix}`)
  }).sort({ invoice_number: -1 });
  
  let sequence = 1;
  if (lastInvoice) {
    const lastSequence = parseInt(lastInvoice.invoice_number.split('-').pop());
    sequence = lastSequence + 1;
  }
  
  return `${prefix}-${String(sequence).padStart(4, '0')}`;
};

module.exports = mongoose.model('Invoice', invoiceSchema);
