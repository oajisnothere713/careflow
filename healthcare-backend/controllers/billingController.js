const Invoice = require('../models/billing/Invoice');
const Payment = require('../models/billing/Payment');
const InsurancePolicy = require('../models/billing/InsurancePolicy');
const InsuranceClaim = require('../models/billing/InsuranceClaim');
const Appointment = require('../models/appointment/Appointment');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

exports.createInvoice = asyncHandler(async (req, res, next) => {
  const {
    patient_id,
    clinic_id,
    appointment_id,
    line_items,
    insurance_policy_id,
    discount_percentage,
    notes,
  } = req.body;

  let doctor_id = req.body.doctor_id;
  if (!doctor_id && appointment_id) {
    const appointment = await Appointment.findById(appointment_id);
    if (appointment && appointment.doctor_id) {
      doctor_id = appointment.doctor_id;
    } else if (!appointment) {
      return res
        .status(400)
        .json({ message: "Appointment not found. doctor_id is required." });
    } else {
      return res
        .status(400)
        .json({ message: "doctor_id not found in appointment." });
    }
  }
  if (!doctor_id) {
    return res.status(400).json({ message: "doctor_id is required." });
  }

  // Generate invoice number
  const invoice_number = await Invoice.generateInvoiceNumber(
    clinic_id || req.user.clinicId,
  );

  // Calculate invoice amounts (required fields must be set before creating invoice)
  const subtotal = line_items.reduce(
    (sum, item) => sum + item.total_price,
    0,
  );
  const tax_percentage = 0;
  const discount_percent = discount_percentage || 0;
  const tax_amount = (subtotal * tax_percentage) / 100;
  const discount_amount = (subtotal * discount_percent) / 100;
  const total_amount = subtotal + tax_amount - discount_amount;

  // Calculate insurance coverage if policy provided
  let insurance_covered_amount = 0;
  if (insurance_policy_id) {
    const policy = await InsurancePolicy.findById(insurance_policy_id);
    if (policy && policy.isValid()) {
      insurance_covered_amount =
        (subtotal * policy.coverage_percentage) / 100;
    }
  }

  const patient_payable = total_amount - insurance_covered_amount;

  const invoice = new Invoice({
    invoice_number,
    patient_id,
    clinic_id: clinic_id || req.user.clinicId,
    doctor_id,
    appointment_id,
    line_items,
    subtotal,
    tax_percentage,
    tax_amount,
    discount_percentage: discount_percent,
    discount_amount,
    total_amount,
    insurance_policy_id,
    insurance_covered_amount,
    patient_payable,
    notes,
    generated_by: req.user.userId,
    status: "pending",
  });

  await invoice.save();

  res.status(201).json({
    message: "Invoice generated successfully",
    invoice,
  });
});

exports.getInvoices = asyncHandler(async (req, res, next) => {
  const {
    page = 1,
    limit = 10,
    status,
    patient_id,
    doctor_id,
    clinic_id,
  } = req.query;

  let query = {};

  // Role-based filtering
  if (req.user.role === "patient") {
    const Patient = require('../models/patient/Patient');
    const patient = await Patient.findOne({ user_id: req.user.userId });
    if (patient) {
      query.patient_id = patient._id;
    }
  } else if (req.user.role !== "admin" && req.user.role !== "super_admin") {
    query.clinic_id = req.user.clinicId;
  }

  if (status) query.status = status;
  if (patient_id) query.patient_id = patient_id;

  // Optional: Filter by clinic_id
  if (clinic_id) {
    query.clinic_id = clinic_id;
  }

  // Optional: Filter by doctor_id (fetch all invoices for all patients under this doctor)
  if (doctor_id) {
    const Appointment = require('../models/appointment/Appointment');
    const appointments = await Appointment.find({ doctor_id }).select(
      "patient_id",
    );
    const patientIds = appointments.map((a) => a.patient_id);
    if (patientIds.length > 0) {
      query.patient_id = { $in: patientIds };
    } else {
      // No patients found for this doctor, return empty result
      return res.json({
        invoices: [],
        totalPages: 0,
        currentPage: page,
        total: 0,
      });
    }
  }

  const invoices = await Invoice.find(query)
    .populate({
      path: "patient_id",
      populate: { path: "user_id", select: "name email phone" },
    })
    .populate("clinic_id", "name")
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ invoice_date: -1 });

  const count = await Invoice.countDocuments(query);

  res.json({
    invoices,
    totalPages: Math.ceil(count / limit),
    currentPage: page,
    total: count,
  });
});

exports.getInvoiceById = asyncHandler(async (req, res, next) => {
  const invoice = await Invoice.findById(req.params.id)
    .populate({
      path: "patient_id",
      populate: { path: "user_id", select: "name email phone" },
    })
    .populate("clinic_id")
    .populate("insurance_policy_id");

  if (!invoice) {
    return res.status(404).json({ message: "Invoice not found" });
  }

  res.json({ invoice });
});

exports.recordPayment = asyncHandler(async (req, res, next) => {
  const {
    invoice_id,
    patient_id,
    amount,
    payment_method,
    transaction_reference,
    card_details,
    upi_details,
    cheque_details,
    notes,
  } = req.body;

  // Verify invoice exists
  const invoice = await Invoice.findById(invoice_id);
  if (!invoice) {
    return res.status(404).json({ message: "Invoice not found" });
  }

  // Generate receipt number
  const receipt_number = await Payment.generateReceiptNumber();

  const payment = new Payment({
    invoice_id,
    patient_id,
    doctor_id: invoice.doctor_id, // Ensure doctor_id is attached
    clinic_id: invoice.clinic_id,
    amount,
    payment_method,
    transaction_reference,
    card_details,
    upi_details,
    cheque_details,
    notes,
    received_by: req.user.userId,
    receipt_number,
    payment_status: "completed",
  });

  await payment.save();

  // Update invoice
  invoice.amount_paid += amount;
  invoice.balance_due = invoice.patient_payable - invoice.amount_paid;

  if (invoice.balance_due === 0) {
    invoice.status = "paid";
  } else if (invoice.amount_paid > 0) {
    invoice.status = "partial";
  }

  await invoice.save();

  res.status(201).json({
    message: "Payment recorded successfully",
    payment,
    invoice,
  });
});

exports.getPaymentsForInvoice = asyncHandler(async (req, res, next) => {
  const payments = await Payment.find({ invoice_id: req.params.invoiceId })
    .populate("received_by", "name")
    .sort({ payment_date: -1 });

  res.json({ payments });
});

exports.addInsurancePolicy = asyncHandler(async (req, res, next) => {
  const insurancePolicy = new InsurancePolicy(req.body);
  await insurancePolicy.save();

  // Update patient record
  const Patient = require('../models/patient/Patient');
  await Patient.findByIdAndUpdate(req.body.patient_id, {
    insurance_id: insurancePolicy._id,
  });

  res.status(201).json({
    message: "Insurance policy added successfully",
    insurancePolicy,
  });
});

exports.createInsuranceClaim = asyncHandler(async (req, res, next) => {
  const {
    patient_id,
    insurance_policy_id,
    invoice_id,
    treatment_date,
    diagnosis,
    treatment_details,
    claimed_amount,
    supporting_documents,
  } = req.body;

  // Generate claim number
  const claim_number = await InsuranceClaim.generateClaimNumber();

  const claim = new InsuranceClaim({
    claim_number,
    patient_id,
    insurance_policy_id,
    invoice_id,
    clinic_id: req.user.clinicId,
    treatment_date,
    diagnosis,
    treatment_details,
    claimed_amount,
    supporting_documents,
    status: "submitted",
    submission_date: new Date(),
    submitted_by: req.user.userId,
  });

  await claim.save();

  res.status(201).json({
    message: "Insurance claim submitted successfully",
    claim,
  });
});

exports.getInsuranceClaimsByPatient = asyncHandler(async (req, res, next) => {
  const claims = await InsuranceClaim.find({
    patient_id: req.params.patientId,
  })
    .populate("insurance_policy_id")
    .populate("invoice_id")
    .sort({ claim_date: -1 });

  res.json({ claims });
});

exports.updateInsuranceClaimStatus = asyncHandler(async (req, res, next) => {
  const { status, approved_amount, rejection_reason } = req.body;

  const updateData = { status };

  if (approved_amount !== undefined) {
    updateData.approved_amount = approved_amount;
    updateData.approval_date = new Date();
  }

  if (rejection_reason) {
    updateData.rejection_reason = rejection_reason;
  }

  const claim = await InsuranceClaim.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true },
  );

  if (!claim) {
    return res.status(404).json({ message: "Claim not found" });
  }

  res.json({
    message: "Claim status updated",
    claim,
  });
});

exports.generateConsultationInvoice = asyncHandler(async (req, res, next) => {
  const {
    doctor_id,
    appointment_date,
    appointment_time,
    insurance_policy_id,
  } = req.body;

  if (!doctor_id || !appointment_date || !appointment_time) {
    return res.status(400).json({
      message:
        "doctor_id, appointment_date, and appointment_time are required",
    });
  }

  // Get patient record
  const Patient = require('../models/patient/Patient');
  const patient = await Patient.findOne({ user_id: req.user.userId });
  if (!patient) {
    return res.status(404).json({
      message:
        "Patient profile not found. Please complete your profile first.",
    });
  }

  // Get doctor details
  const Doctor = require('../models/clinic/Doctor');
  const doctor = await Doctor.findById(doctor_id)
    .populate("user_id", "name")
    .populate("clinic_id", "name");

  if (!doctor) {
    return res.status(404).json({ message: "Doctor not found" });
  }

  // Generate invoice number
  const invoice_number = await Invoice.generateInvoiceNumber(
    doctor.clinic_id._id,
  );

  // Create line item for consultation fee
  const line_items = [
    {
      item_type: "consultation",
      description: `Consultation with Dr. ${doctor.user_id.name} - ${doctor.specialization}`,
      quantity: 1,
      unit_price: doctor.consultation_fee,
      total_price: doctor.consultation_fee,
    },
  ];

  // Calculate insurance coverage if applicable
  let insurance_covered_amount = 0;
  if (insurance_policy_id) {
    const policy = await InsurancePolicy.findById(insurance_policy_id);
    if (policy && policy.isValid()) {
      insurance_covered_amount =
        (doctor.consultation_fee * policy.coverage_percentage) / 100;
    }
  }

  // Calculate invoice amounts (required fields must be set before creating invoice)
  const subtotal = line_items.reduce(
    (sum, item) => sum + item.total_price,
    0,
  );
  const tax_percentage = 18; // 18% GST
  const discount_percentage = 0;
  const tax_amount = (subtotal * tax_percentage) / 100;
  const discount_amount = (subtotal * discount_percentage) / 100;
  const total_amount = subtotal + tax_amount - discount_amount;
  const patient_payable = total_amount - insurance_covered_amount;

  // Create invoice
  const invoiceData = {
    invoice_number,
    patient_id: patient._id,
    doctor_id: doctor._id,
    clinic_id: doctor.clinic_id._id,
    line_items,
    subtotal,
    tax_percentage,
    tax_amount,
    discount_percentage,
    discount_amount,
    total_amount,
    insurance_covered_amount,
    patient_payable,
    notes: `Consultation invoice for appointment on ${appointment_date} at ${appointment_time}`,
    generated_by: req.user.userId,
    status: "pending",
  };

  // Only add insurance_policy_id if it exists
  if (insurance_policy_id) {
    invoiceData.insurance_policy_id = insurance_policy_id;
  }

  const invoice = new Invoice(invoiceData);

  await invoice.save();
  await invoice.populate("patient_id");
  await invoice.populate("clinic_id", "name");

  res.status(201).json({
    message: "Consultation invoice generated successfully",
    invoice: {
      _id: invoice._id,
      invoice_number: invoice.invoice_number,
      patient_name: patient.user_id?.name || "Patient",
      clinic_name: doctor.clinic_id.name,
      doctor_name: doctor.user_id.name,
      consultation_fee: doctor.consultation_fee,
      subtotal: invoice.subtotal,
      tax_amount: invoice.tax_amount,
      discount_amount: invoice.discount_amount,
      insurance_covered_amount: invoice.insurance_covered_amount,
      patient_payable: invoice.patient_payable,
      total_amount: invoice.total_amount,
      status: invoice.status,
      created_at: invoice.created_at,
    },
  });
});

exports.payInvoiceDummy = asyncHandler(async (req, res, next) => {
  const { invoice_id, payment_method, amount_paid, transaction_id } =
    req.body;

  if (!invoice_id || !payment_method || !amount_paid) {
    return res.status(400).json({
      message: "invoice_id, payment_method, and amount_paid are required",
    });
  }

  // Get invoice
  const invoice = await Invoice.findById(invoice_id);
  if (!invoice) {
    return res.status(404).json({ message: "Invoice not found" });
  }

  // Check if already paid
  if (invoice.status === "paid") {
    return res.status(400).json({ message: "Invoice is already paid" });
  }

  // For patient role, verify they own this invoice
  if (req.user.role === "patient") {
    const Patient = require('../models/patient/Patient');
    const patient = await Patient.findOne({ user_id: req.user.userId });
    if (
      !patient ||
      invoice.patient_id.toString() !== patient._id.toString()
    ) {
      return res
        .status(403)
        .json({ message: "You can only pay your own invoices" });
    }
  }

  // Generate receipt number
  const receiptNumber = await Payment.generateReceiptNumber(
    invoice.clinic_id,
  );

  // Generate dummy transaction ID if not provided (simulating payment gateway)
  const dummyTransactionId =
    transaction_id || `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`;

  // Create payment record
  // Resolve doctor_id (from invoice or fallback from appointment)
  let doctorId = invoice.doctor_id;

  if (!doctorId && invoice.appointment_id) {
    const appointment = await Appointment.findById(invoice.appointment_id);
    doctorId = appointment?.doctor_id;
  }

  // Create payment record
  const payment = new Payment({
    invoice_id,
    patient_id: invoice.patient_id,
    doctor_id: doctorId, // ✅ always saved
    clinic_id: invoice.clinic_id,
    receipt_number: receiptNumber,
    payment_method,
    amount: amount_paid,
    transaction_reference: dummyTransactionId,
    payment_status: "completed",
    received_by: req.user.userId,
    notes: "Dummy payment - For testing purposes only",
  });

  console.log("doctor_id for payment:", invoice.doctor_id);

  await payment.save();

  // Update invoice status
  const totalPaid = invoice.amount_paid + amount_paid;
  if (totalPaid >= invoice.patient_payable) {
    invoice.status = "paid";
    invoice.paid_date = new Date();
  } else if (totalPaid > 0) {
    invoice.status = "partially_paid";
  }
  invoice.amount_paid = totalPaid;
  await invoice.save();

  // Populate for response
  await payment.populate("patient_id");
  await payment.populate("clinic_id", "name");

  res.status(201).json({
    message: "Payment recorded successfully (Dummy payment)",
    payment: {
      _id: payment._id,
      receipt_number: payment.receipt_number,
      invoice_id: payment.invoice_id,
      amount_paid: payment.amount,
      payment_method: payment.payment_method,
      transaction_id: payment.transaction_reference,
      payment_status: payment.payment_status,
      payment_date: payment.payment_date,
    },
    invoice_status: invoice.status,
    remaining_balance: invoice.patient_payable - totalPaid,
  });
});

exports.verifyPayment = asyncHandler(async (req, res, next) => {
  const invoice = await Invoice.findById(req.params.invoice_id);

  if (!invoice) {
    return res.status(404).json({ message: "Invoice not found" });
  }

  // For patient role, verify they own this invoice
  if (req.user.role === "patient") {
    const Patient = require('../models/patient/Patient');
    const patient = await Patient.findOne({ user_id: req.user.userId });
    if (
      !patient ||
      invoice.patient_id.toString() !== patient._id.toString()
    ) {
      return res
        .status(403)
        .json({ message: "You can only check your own invoices" });
    }
  }

  const isPaid = invoice.status === "paid";
  const isPartiallyPaid = invoice.status === "partially_paid";

  res.json({
    is_paid: isPaid,
    is_partially_paid: isPartiallyPaid,
    invoice_status: invoice.status,
    total_amount: invoice.total_amount,
    patient_payable_amount: invoice.patient_payable,
    amount_paid: invoice.amount_paid,
    remaining_balance: invoice.patient_payable - invoice.amount_paid,
    invoice: {
      _id: invoice._id,
      invoice_number: invoice.invoice_number,
      status: invoice.status,
      created_at: invoice.created_at,
      paid_date: invoice.paid_date,
    },
  });
});

exports.getMyPayments = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 10 } = req.query;

  // Get patient record
  const Patient = require('../models/patient/Patient');
  const patient = await Patient.findOne({ user_id: req.user.userId });
  if (!patient) {
    return res.status(404).json({
      message: "Patient profile not found",
    });
  }

  const payments = await Payment.find({ patient_id: patient._id })
    .populate("invoice_id")
    .populate("clinic_id", "name")
    .sort({ payment_date: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

  const total = await Payment.countDocuments({ patient_id: patient._id });

  res.json({
    payments,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      totalPayments: total,
      limit: parseInt(limit),
    },
  });
});
