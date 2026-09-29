/**
 * @swagger
 * tags:
 *   - name: Consultation
 *     description: Medical consultation, prescriptions, and lab reports
 */

const express = require("express");
const router = express.Router();
const { verifyToken, checkRole } = require("../middleware/auth");
const consultationController = require("../controllers/consultationController");

/**
 * @swagger
 * /api/consultations:
 *   post:
 *     summary: Create consultation note (Doctor only)
 *     description: Create a consultation note linked to an appointment. Appointment must exist and be in 'booked' or 'confirmed' status.
 *     tags: [Consultation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [appointment_id, chief_complaint, vital_signs, diagnosis]
 *             properties:
 *               appointment_id:
 *                 type: string
 *                 description: Required - Must be a valid appointment ID
 *               chief_complaint:
 *                 type: string
 *                 example: "Chest pain"
 *               symptoms:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     symptom:
 *                       type: string
 *                     duration:
 *                       type: string
 *                     severity:
 *                       type: string
 *                       enum: [mild, moderate, severe]
 *               vital_signs:
 *                 type: object
 *                 required: [blood_pressure, heart_rate, temperature]
 *                 properties:
 *                   blood_pressure:
 *                     type: string
 *                   heart_rate:
 *                     type: number
 *                   temperature:
 *                     type: number
 *                   respiratory_rate:
 *                     type: number
 *                   oxygen_saturation:
 *                     type: number
 *                   weight:
 *                     type: number
 *                   height:
 *                     type: number
 *               physical_examination:
 *                 type: string
 *               diagnosis:
 *                 type: string
 *               treatment_plan:
 *                 type: string
 *               follow_up_instructions:
 *                 type: string
 *               follow_up_date:
 *                 type: string
 *                 format: date
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Consultation created successfully
 *       400:
 *         description: Appointment not found or invalid status
 *       403:
 *         description: Doctor can only consult their own appointments
 *       404:
 *         description: Appointment, patient, or doctor not found
 */
router.post(
  "/",
  verifyToken,
  checkRole("doctor"),
  consultationController.createConsultation
);

/**
 * @swagger
 * /api/consultations/by-appointment/{appointmentId}:
 *   get:
 *     summary: Get consultation by appointment ID
 *     description: Retrieve consultation using appointment ID. Returns consultation_id and appointment_id for use in prescription endpoints.
 *     tags: [Consultation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appointmentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Consultation details with IDs retrieved
 *       403:
 *         description: Access denied
 *       404:
 *         description: Consultation not found for this appointment
 */
router.get(
  "/by-appointment/:appointmentId",
  verifyToken,
  consultationController.getConsultationByAppointment
);

/**
 * @swagger
 * /api/consultations/{id}:
 *   get:
 *     summary: Get consultation by ID
 *     tags: [Consultation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Consultation ID
 *     responses:
 *       200:
 *         description: Consultation details retrieved
 *       403:
 *         description: Access denied
 *       404:
 *         description: Consultation not found
 */
router.get(
  "/:id",
  verifyToken,
  consultationController.getConsultationById
);

/**
 * @swagger
 * /api/consultations/patient/{patientId}:
 *   get:
 *     summary: Get all consultations for a patient
 *     tags: [Consultation]
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
 *         description: List of consultations retrieved
 *       403:
 *         description: Access denied
 */
router.get(
  "/patient/:patientId",
  verifyToken,
  consultationController.getConsultationsByPatient
);

/**
 * @swagger
 * /api/consultations/{id}/prescriptions:
 *   post:
 *     summary: Add prescription to consultation
 *     description: Create prescription for a consultation. Requires consultation_id in path and appointment_id in body.
 *     tags: [Consultation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Consultation ID (required)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [medications, appointment_id]
 *             properties:
 *               appointment_id:
 *                 type: string
 *                 description: Required — must equal the consultation's appointment ID
 *               medications:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [medication_name, dosage, frequency]
 *                   properties:
 *                     medication_name:
 *                       type: string
 *                     dosage:
 *                       type: string
 *                     frequency:
 *                       type: string
 *                     duration:
 *                       type: string
 *                     instructions:
 *                       type: string
 *               additional_instructions:
 *                 type: string
 *     responses:
 *       201:
 *         description: Prescription added successfully
 *       400:
 *         description: Invalid medications array
 *       404:
 *         description: Consultation not found
 */
router.post(
  "/:id/prescriptions",
  verifyToken,
  checkRole("doctor"),
  consultationController.addPrescription
);

/**
 * @swagger
 * /api/consultations/prescriptions/patient/{patientId}:
 *   get:
 *     summary: Get all prescriptions for a patient
 *     tags: [Consultation]
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
 *         description: List of prescriptions retrieved
 */
router.get(
  "/prescriptions/patient/:patientId",
  verifyToken,
  consultationController.getPrescriptionsByPatient
);

/**
 * @swagger
 * /api/consultations/lab-reports:
 *   post:
 *     summary: Add lab report
 *     tags: [Consultation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [patient_id, test_name, test_date, test_result]
 *             properties:
 *               patient_id:
 *                 type: string
 *               test_name:
 *                 type: string
 *               test_date:
 *                 type: string
 *                 format: date
 *               test_result:
 *                 type: string
 *               normal_range:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Lab report added successfully
 */
router.post(
  "/lab-reports",
  verifyToken,
  checkRole("doctor", "staff", "admin"),
  consultationController.addLabReport
);

/**
 * @swagger
 * /api/consultations/lab-reports/patient/{patientId}:
 *   get:
 *     summary: Get all lab reports for a patient
 *     tags: [Consultation]
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
 *         description: List of lab reports retrieved
 */
router.get(
  "/lab-reports/patient/:patientId",
  verifyToken,
  consultationController.getLabReportsByPatient
);

/**
 * @swagger
 * /api/consultations/visit-records:
 *   post:
 *     summary: Create visit record
 *     tags: [Consultation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [appointment_id, patient_id, visit_type, summary]
 *             properties:
 *               appointment_id:
 *                 type: string
 *               patient_id:
 *                 type: string
 *               visit_type:
 *                 type: string
 *                 enum: [follow_up, checkup, emergency]
 *               summary:
 *                 type: string
 *     responses:
 *       201:
 *         description: Visit record created
 */
router.post(
  "/visit-records",
  verifyToken,
  checkRole("doctor", "staff", "admin"),
  consultationController.createVisitRecord
);

/**
 * @swagger
 * /api/consultations/visit-records/patient/{patientId}:
 *   get:
 *     summary: Get all visit records for a patient
 *     tags: [Consultation]
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
 *         description: List of visit records retrieved
 */
router.get(
  "/visit-records/patient/:patientId",
  verifyToken,
  consultationController.getVisitRecordsByPatient
);

/**
 * @swagger
 * /api/appointments/{appointmentId}/prescriptions:
 *   post:
 *     summary: Add prescription directly via appointment ID
 *     description: Create prescription for an appointment. Auto-creates consultation if missing.
 *     tags: [Consultation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appointmentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [medications]
 *             properties:
 *               medications:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [medication_name, dosage, frequency]
 *                   properties:
 *                     medication_name:
 *                       type: string
 *                     dosage:
 *                       type: string
 *                     frequency:
 *                       type: string
 *                     duration:
 *                       type: string
 *                     instructions:
 *                       type: string
 *               additional_instructions:
 *                 type: string
 *               chief_complaint:
 *                 type: string
 *                 description: Required if consultation doesn't exist
 *               vital_signs:
 *                 type: object
 *                 description: Required if consultation doesn't exist
 *               diagnosis:
 *                 type: string
 *                 description: Required if consultation doesn't exist
 *     responses:
 *       201:
 *         description: Prescription created successfully
 *       400:
 *         description: Invalid medications or missing consultation fields
 *       404:
 *         description: Appointment not found
 */
router.post(
  "/appointments/:appointmentId/prescriptions",
  verifyToken,
  checkRole("doctor"),
  consultationController.addPrescriptionByAppointment
);

module.exports = router;
