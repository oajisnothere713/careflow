const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  invoice_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    required: true
  },
  patient_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  doctor_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Doctor' },
  clinic_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic',
    required: true
  },
  payment_date: {
    type: Date,
    default: Date.now,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  payment_method: {
    type: String,
    enum: ['cash', 'card', 'upi', 'bank_transfer', 'insurance', 'cheque'],
    required: true
  },
  transaction_reference: {
    type: String
  },
  card_details: {
    last_four_digits: String,
    card_type: String  // visa, mastercard, etc.
  },
  upi_details: {
    upi_id: String,
    transaction_id: String
  },
  cheque_details: {
    cheque_number: String,
    bank_name: String,
    cheque_date: Date
  },
  payment_status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'completed'
  },
  notes: String,
  received_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  receipt_number: {
    type: String,
    unique: true
  }
}, {
  timestamps: true
});

// Indexes
paymentSchema.index({ invoice_id: 1 });
paymentSchema.index({ patient_id: 1, payment_date: -1 });
paymentSchema.index({ clinic_id: 1, payment_date: -1 });
paymentSchema.index({ payment_status: 1 });
paymentSchema.index({ receipt_number: 1 }, { unique: true, sparse: true });

// Static method to generate receipt number
paymentSchema.statics.generateReceiptNumber = async function () {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');

  const prefix = `RCP-${year}${month}`;

  const lastReceipt = await this.findOne({
    receipt_number: new RegExp(`^${prefix}`)
  }).sort({ receipt_number: -1 });

  let sequence = 1;
  if (lastReceipt) {
    const lastSequence = parseInt(lastReceipt.receipt_number.split('-').pop());
    sequence = lastSequence + 1;
  }

  return `${prefix}-${String(sequence).padStart(4, '0')}`;
};

module.exports = mongoose.model('Payment', paymentSchema);
