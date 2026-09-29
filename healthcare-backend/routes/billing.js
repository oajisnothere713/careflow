/**
 * @swagger
 * tags:
 *   - name: Billing
 *     description: Invoicing, payments, and insurance management
 */

const express = require("express");
const router = express.Router();
const { verifyToken, checkRole } = require("../middleware/auth");
const billingController = require("../controllers/billingController");

/**
 * @swagger
 * /api/billing/invoices:
 *   post:
 *     summary: Create invoice
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [patient_id, clinic_id, appointment_id, line_items]
 *             properties:
 *               patient_id:
 *                 type: string
 *               clinic_id:
 *                 type: string
 *               appointment_id:
 *                 type: string
 *               doctor_id:
 *                 type: string
 *                 description: Doctor ID (auto-fetched from appointment if not provided)
 *               line_items:
 *                 type: array
 *               discount_percentage:
 *                 type: number
 *               tax_percentage:
 *                 type: number
 *     responses:
 *       201:
 *         description: Invoice created
 */
/**
 * @route   POST /api/billing/invoices
 * @desc    Generate invoice (auto-generate after consultation)
 * @access  Doctor, Staff, Admin
 */
router.post(
  "/invoices",
  verifyToken,
  checkRole("doctor", "staff", "admin"),
  billingController.createInvoice
);

/**
 * @swagger
 * /api/billing/invoices:
 *   get:
 *     summary: Get invoices (filtered by role or doctor)
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, paid, partially_paid, overdue, cancelled]
 *       - in: query
 *         name: patient_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: doctor_id
 *         schema:
 *           type: string
 *         description: (Optional) Fetch all invoices for all patients under this doctor
 *       - in: query
 *         name: clinic_id
 *         schema:
 *           type: string
 *         description: (Optional) Fetch all invoices for a specific clinic
 *     responses:
 *       200:
 *         description: List of invoices retrieved
 *       401:
 *         description: Unauthorized
 */
router.get("/invoices", verifyToken, billingController.getInvoices);

/**
 * @swagger
 * /api/billing/invoices/{id}:
 *   get:
 *     summary: Get single invoice
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invoice details retrieved
 *       404:
 *         description: Invoice not found
 */
router.get("/invoices/:id", verifyToken, billingController.getInvoiceById);

/**
 * @swagger
 * /api/billing/payments:
 *   post:
 *     summary: Record a payment
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [invoice_id, patient_id, amount, payment_method]
 *             properties:
 *               invoice_id:
 *                 type: string
 *               patient_id:
 *                 type: string
 *               amount:
 *                 type: number
 *                 example: 1500.00
 *               payment_method:
 *                 type: string
 *                 enum: [cash, card, upi, cheque, insurance]
 *                 example: "card"
 *               transaction_id:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Payment recorded successfully
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/payments",
  verifyToken,
  checkRole("staff", "admin"),
  billingController.recordPayment
);

/**
 * @swagger
 * /api/billing/payments/invoice/{invoiceId}:
 *   get:
 *     summary: Get payments for an invoice
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: invoiceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of payments
 */
/**
 * @route   GET /api/billing/payments/invoice/:invoiceId
 * @desc    Get all payments for an invoice
 * @access  Staff, Admin, Patient (own invoices)
 */
router.get("/payments/invoice/:invoiceId", verifyToken, billingController.getPaymentsForInvoice);

/**
 * @swagger
 * /api/billing/insurance-policies:
 *   post:
 *     summary: Add insurance policy for a patient
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               patient_id:
 *                 type: string
 *               policy_number:
 *                 type: string
 *               provider_name:
 *                 type: string
 *               coverage_type:
 *                 type: string
 *               coverage_amount:
 *                 type: number
 *               expiry_date:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Insurance policy added successfully
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/insurance-policies",
  verifyToken,
  checkRole("staff", "admin"),
  billingController.addInsurancePolicy
);

/** * @swagger
 * /api/billing/insurance-claims:
 *   post:
 *     summary: Create insurance claim
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [invoice_id, insurance_policy_id, claimed_amount]
 *             properties:
 *               invoice_id:
 *                 type: string
 *               insurance_policy_id:
 *                 type: string
 *               claimed_amount:
 *                 type: number
 *               supporting_documents:
 *                 type: array
 *     responses:
 *       201:
 *         description: Insurance claim created
 */
/** * @route   POST /api/billing/insurance-claims
 * @desc    Submit insurance claim
 * @access  Staff, Admin
 */
router.post(
  "/insurance-claims",
  verifyToken,
  checkRole("staff", "admin"),
  billingController.createInsuranceClaim
);

/**
 * @swagger
 * /api/billing/insurance-claims/patient/{patientId}:
 *   get:
 *     summary: Get all insurance claims for a patient
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of insurance claims retrieved
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/insurance-claims/patient/:patientId",
  verifyToken,
  billingController.getInsuranceClaimsByPatient
);

/**
 * @swagger
 * /api/billing/insurance-claims/{id}/status:
 *   put:
 *     summary: Update insurance claim status
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, approved, rejected, processing]
 *               approved_amount:
 *                 type: number
 *               rejection_reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Claim status updated successfully
 *       404:
 *         description: Claim not found
 */
router.put(
  "/insurance-claims/:id/status",
  verifyToken,
  checkRole("admin"),
  billingController.updateInsuranceClaimStatus
);

/**
 * @swagger
 * /api/billing/invoices/consultation:
 *   post:
 *     summary: Generate consultation fee invoice before appointment booking
 *     description: Creates an invoice for doctor consultation fee before patient books an appointment
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [doctor_id, appointment_date, appointment_time]
 *             properties:
 *               doctor_id:
 *                 type: string
 *               appointment_date:
 *                 type: string
 *                 format: date
 *               appointment_time:
 *                 type: string
 *               insurance_policy_id:
 *                 type: string
 *     responses:
 *       201:
 *         description: Consultation invoice generated successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Doctor or patient not found
 */
router.post(
  "/invoices/consultation",
  verifyToken,
  checkRole("patient"),
  billingController.generateConsultationInvoice
);

/**
 * @swagger
 * /api/billing/payments/pay-invoice:
 *   post:
 *     summary: Record payment for invoice (Dummy payment - no actual gateway)
 *     description: Records a dummy payment for an invoice. In production, integrate with real payment gateway.
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [invoice_id, payment_method, amount_paid]
 *             properties:
 *               invoice_id:
 *                 type: string
 *               payment_method:
 *                 type: string
 *                 enum: [cash, card, upi, bank_transfer, insurance]
 *               amount_paid:
 *                 type: number
 *               transaction_id:
 *                 type: string
 *     responses:
 *       201:
 *         description: Payment recorded successfully
 *       400:
 *         description: Invalid payment data
 *       404:
 *         description: Invoice not found
 */
router.post("/payments/pay-invoice", verifyToken, billingController.payInvoiceDummy);

/**
 * @swagger
 * /api/billing/invoices/{invoice_id}/verify-payment:
 *   get:
 *     summary: Verify if invoice is paid
 *     description: Check payment status of an invoice before allowing appointment booking
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: invoice_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment status retrieved
 *       404:
 *         description: Invoice not found
 */
router.get(
  "/invoices/:invoice_id/verify-payment",
  verifyToken,
  billingController.verifyPayment
);

/**
 * @swagger
 * /api/billing/payments/my-payments:
 *   get:
 *     summary: Get patient's payment history
 *     description: Patient can view their payment history
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 10
 *     responses:
 *       200:
 *         description: Payment history retrieved
 */
router.get(
  "/payments/my-payments",
  verifyToken,
  checkRole("patient"),
  billingController.getMyPayments
);

module.exports = router;
