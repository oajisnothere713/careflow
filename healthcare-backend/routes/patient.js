/**
 * @swagger
 * tags:
 *   - name: Patient
 *     description: Patient management and medical records
 */

const express = require("express");
const router = express.Router();
const controller = require('../controllers/patientController');
const {
  verifyToken,
  checkRole,
  checkClinicAccess
} = require("../middleware/auth");
/**
 * @swagger
 * /api/patients/onboard:
 *   post:
 *     summary: Onboard a new patient (Clinic Admin/Doctor)
 *     description: Clinic Admin or Doctor can onboard a new patient by creating user account and patient profile
 *     tags: [Patient]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, phone, gender, date_of_birth, blood_group, address, emergency_contact]
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *               date_of_birth:
 *                 type: string
 *                 format: date
 *               blood_group:
 *                 type: string
 *                 enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
 *               address:
 *                 type: string
 *               emergency_contact:
 *                 type: string
 *     responses:
 *       201:
 *         description: Patient onboarded successfully
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Only clinic admin or doctor can onboard patients
 */
router.post("/onboard", verifyToken, controller.postOnboard);

/**
 * @swagger
 * /api/patients:
 *   get:
 *     summary: Get all patients (clinic-scoped)
 *     tags: [Patient]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: clinic_id
 *         schema:
 *           type: string
 *         description: Filter patients by clinic. Pass the clinic's ObjectId to get patients of a specific clinic.
 *       # ... other parameters ...
 *     responses:
 *       200:
 *         description: List of patients retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get("/", verifyToken, checkRole("clinic_admin", "doctor", "staff", "admin"), controller.getIndex);

/**
 * @swagger
 * /api/patients/complete-profile:
 *   post:
 *     summary: Complete patient profile after OTP signup (Self-registration)
 *     description: After a patient signs up with OTP, they must complete their profile with demographics and medical history
 *     tags: [Patient]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [gender, date_of_birth, blood_group, address, emergency_contact, clinic_id]
 *             properties:
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *               date_of_birth:
 *                 type: string
 *                 format: date
 *               blood_group:
 *                 type: string
 *                 enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
 *               address:
 *                 type: string
 *               emergency_contact:
 *                 type: string
 *               clinic_id:
 *                 type: string
 *                 description: Clinic ID to associate with this patient
 *               insurance_id:
 *                 type: string
 *                 description: Optional insurance policy ID
 *               medical_history:
 *                 type: object
 *                 description: Optional initial medical history data
 *                 properties:
 *                   known_conditions:
 *                     type: array
 *                   allergies:
 *                     type: array
 *                   current_medications:
 *                     type: array
 *                   past_surgeries:
 *                     type: array
 *                   family_history:
 *                     type: array
 *     responses:
 *       201:
 *         description: Profile completed successfully
 *       400:
 *         description: Invalid input or profile already completed
 *       403:
 *         description: Only patients can complete their own profile
 */
router.post("/complete-profile", verifyToken, checkRole("patient"), controller.postCompleteProfile);

/**
 * @swagger
 * /api/patients/complete-profile:
 *   put:
 *     summary: Edit patient complete profile (self-service)
 *     description: Allows an authenticated patient to update their demographics and optionally medical history.
 *     tags: [Patient]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *               date_of_birth:
 *                 type: string
 *                 format: date
 *               blood_group:
 *                 type: string
 *                 enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
 *               address:
 *                 type: string
 *               emergency_contact:
 *                 type: string
 *               insurance_id:
 *                 type: string
 *                 description: Optional insurance policy ID
 *               medical_history:
 *                 type: object
 *                 description: Optional medical history updates
 *                 properties:
 *                   known_conditions:
 *                     type: array
 *                   allergies:
 *                     type: array
 *                   current_medications:
 *                     type: array
 *                   past_surgeries:
 *                     type: array
 *                   family_history:
 *                     type: array
 *                   immunizations:
 *                     type: array
 *                   lifestyle:
 *                     type: object
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       404:
 *         description: Patient profile not found
 */
router.put("/complete-profile", verifyToken, checkRole("patient"), controller.putCompleteProfile);

/**
 * @swagger
 * /api/patients/my-medical-history:
 *   get:
 *     summary: Get own medical history (Patient self-access)
 *     description: Patient can retrieve their own medical history
 *     tags: [Patient]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Medical history retrieved successfully
 *       404:
 *         description: Medical history not found
 */
router.get("/my-medical-history", verifyToken, checkRole("patient"), controller.getMyMedicalHistory);

/**
 * @swagger
 * /api/patients/my-medical-history:
 *   put:
 *     summary: Update own medical history (Patient self-update)
 *     description: Patient can update their own medical history
 *     tags: [Patient]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               known_conditions:
 *                 type: array
 *               allergies:
 *                 type: array
 *               current_medications:
 *                 type: array
 *               past_surgeries:
 *                 type: array
 *               family_history:
 *                 type: array
 *               immunizations:
 *                 type: array
 *               lifestyle:
 *                 type: object
 *     responses:
 *       200:
 *         description: Medical history updated successfully
 */
router.put("/my-medical-history", verifyToken, checkRole("patient"), controller.putMyMedicalHistory);

/**
 * @swagger
 * /api/patients:
 *   post:
 *     summary: Admit/Register a new patient
 *     tags: [Patient]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_id, gender, date_of_birth, blood_group, address, emergency_contact]
 *             properties:
 *               user_id:
 *                 type: string
 *               gender:
 *                 type: string
 *                 enum: [Male, Female, Other]
 *               date_of_birth:
 *                 type: string
 *                 format: date
 *               blood_group:
 *                 type: string
 *                 enum: [O+, O-, A+, A-, B+, B-, AB+, AB-]
 *               address:
 *                 type: object
 *               emergency_contact:
 *                 type: object
 *     responses:
 *       201:
 *         description: Patient admitted successfully
 *       400:
 *         description: Invalid input
 */
router.post("/", verifyToken, checkRole("staff", "admin"), controller.postIndex);

/**
 * @swagger
 * /api/patients:
 *   get:
 *     summary: Get all patients (clinic-scoped)
 *     tags: [Patient]
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
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: blood_group
 *         schema:
 *           type: string
 *       - in: query
 *         name: clinic_id
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of patients retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get("/", verifyToken, checkRole("clinic_admin", "doctor", "staff", "admin"), controller.getIndex);

/**
 * @swagger
 * /api/patients/{id}:
 *   get:
 *     summary: Get patient by ID with full details
 *     tags: [Patient]
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
 *         description: Patient details retrieved
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Patient not found
 */
router.get("/:id", verifyToken, controller.getById);

/**
 * @swagger
 * /api/patients/{id}/medical-history:
 *   get:
 *     summary: Get patient's medical history
 *     tags: [Patient]
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
 *         description: Medical history retrieved
 *       404:
 *         description: Medical history not found
 */
router.get("/:id/medical-history", verifyToken, controller.getByIdMedicalHistory);

/** * @swagger
 * /api/patients/{id}/medical-history:
 *   put:
 *     summary: Update patient medical history
 *     tags: [Patient]
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
 *               known_conditions:
 *                 type: array
 *               allergies:
 *                 type: array
 *               current_medications:
 *                 type: array
 *               past_surgeries:
 *                 type: array
 *     responses:
 *       200:
 *         description: Medical history updated
 */
/** * @route   PUT /api/patients/:id/medical-history
 * @desc    Update patient's medical history
 * @access  Doctor, Staff, Admin
 */
router.put("/:id/medical-history", verifyToken, checkRole("doctor", "staff", "admin"), controller.putByIdMedicalHistory);

/**
 * @swagger
 * /api/patients/{id}/allergies:
 *   post:
 *     summary: Add allergy to patient's medical history
 *     tags: [Patient]
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
 *             required: [allergen, reaction, severity]
 *             properties:
 *               allergen:
 *                 type: string
 *                 example: "Peanuts"
 *               reaction:
 *                 type: string
 *                 example: "Hives and swelling"
 *               severity:
 *                 type: string
 *                 enum: [mild, moderate, severe]
 *               identified_date:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Allergy added successfully
 *       400:
 *         description: Missing required fields
 *       404:
 *         description: Medical history not found
 */
router.post("/:id/allergies", verifyToken, checkRole("doctor", "staff", "admin"), controller.postByIdAllergies);

/**
 * @swagger
 * /api/patients/{id}/medications:
 *   post:
 *     summary: Add current medication to patient's medical history
 *     tags: [Patient]
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
 *             required: [medication_name, dosage, frequency, started_date]
 *             properties:
 *               medication_name:
 *                 type: string
 *                 example: "Metformin"
 *               dosage:
 *                 type: string
 *                 example: "500mg"
 *               frequency:
 *                 type: string
 *                 example: "Twice daily"
 *               started_date:
 *                 type: string
 *                 format: date
 *               prescribed_by:
 *                 type: string
 *               purpose:
 *                 type: string
 *     responses:
 *       200:
 *         description: Medication added successfully
 *       400:
 *         description: Missing required fields
 *       404:
 *         description: Medical history not found
 */
router.post("/:id/medications", verifyToken, checkRole("doctor", "staff", "admin"), controller.postByIdMedications);

/**
 * @swagger
 * /api/patients/{id}:
 *   put:
 *     summary: Update patient information
 *     tags: [Patient]
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
 *     responses:
 *       200:
 *         description: Patient updated successfully
 *       404:
 *         description: Patient not found
 */
router.put("/:id", verifyToken, checkRole("staff", "admin"), controller.putById);

/**
 * @swagger
 * /api/patients/{id}:
 *   delete:
 *     summary: Delete a patient
 *     description: Remove patient profile and associated user account. Clinic Admin and Doctor can only delete patients from their clinic.
 *     tags: [Patient]
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
 *         description: Patient deleted successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: Patient not found
 */
router.delete("/:id", verifyToken, controller.deleteById);

/**
 * @swagger
 * /api/patients/{id}/medical-records:
 *   get:
 *     summary: Get complete medical records for a patient
 *     description: Returns consolidated medical records including demographics, history, consultations, prescriptions, appointments, lab reports, and visit records
 *     tags: [Patient]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Patient ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Limit for recent records (consultations, prescriptions, etc.)
 *     responses:
 *       200:
 *         description: Complete medical records retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 patient:
 *                   type: object
 *                   description: Patient demographics
 *                 medicalHistory:
 *                   type: object
 *                   description: Medical history (conditions, allergies, medications, etc.)
 *                 consultations:
 *                   type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                     total:
 *                       type: integer
 *                 prescriptions:
 *                   type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                     total:
 *                       type: integer
 *                 appointments:
 *                   type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                     total:
 *                       type: integer
 *                 labReports:
 *                   type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                     total:
 *                       type: integer
 *                 visitRecords:
 *                   type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                     total:
 *                       type: integer
 *       403:
 *         description: Access denied
 *       404:
 *         description: Patient not found
 */
router.get("/:id/medical-records", verifyToken, controller.getByIdMedicalRecords);

/**
 * GET /api/patients/:patientId/history
 * Aggregated patient history — demographics + timeline of past visits
 * Each visit includes consultation, prescription, AI summary, follow-up info
 */
router.get("/:patientId/history", controller.getByPatientIdHistory);
module.exports = router;
