/**
 * @swagger
 * tags:
 *   - name: FollowUp
 *     description: Follow-up appointment management and reminders
 */

const express = require("express");
const router = express.Router();
const { verifyToken, checkRole } = require("../middleware/auth");
const followupController = require("../controllers/followupController");

/**
 * @swagger
 * /api/follow-ups:
 *   post:
 *     summary: Create a follow-up record
 *     description: Doctor creates a follow-up recommendation for a patient
 *     tags: [FollowUp]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [patient_id, doctor_id, consultation_id, follow_up_date, reason]
 *             properties:
 *               patient_id:
 *                 type: string
 *               doctor_id:
 *                 type: string
 *               consultation_id:
 *                 type: string
 *               follow_up_date:
 *                 type: string
 *                 format: date
 *               reason:
 *                 type: string
 *               priority:
 *                 type: string
 *                 enum: [routine, important, urgent]
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Follow-up created successfully
 */
router.post(
  "/",
  verifyToken,
  checkRole("doctor", "staff", "clinic_admin"),
  followupController.createFollowUp
);

/**
 * @swagger
 * /api/follow-ups/my-follow-ups:
 *   get:
 *     summary: Get patient's follow-ups
 *     description: Patient retrieves their pending and scheduled follow-ups
 *     tags: [FollowUp]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, scheduled, completed, cancelled, missed]
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
 *         description: Follow-ups retrieved successfully
 */
router.get(
  "/my-follow-ups",
  verifyToken,
  checkRole("patient"),
  followupController.getMyFollowUps
);

/**
 * @swagger
 * /api/follow-ups/doctor:
 *   get:
 *     summary: Get doctor's follow-ups
 *     description: Doctor retrieves their patients' follow-ups
 *     tags: [FollowUp]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
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
 *         description: Follow-ups retrieved successfully
 */
router.get(
  "/doctor",
  verifyToken,
  checkRole("doctor"),
  followupController.getDoctorFollowUps
);

/**
 * @swagger
 * /api/follow-ups/{id}/schedule-appointment:
 *   post:
 *     summary: Convert follow-up to appointment
 *     description: Patient books an appointment for a pending follow-up
 *     tags: [FollowUp]
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
 *             required: [appointment_date, appointment_time]
 *             properties:
 *               appointment_date:
 *                 type: string
 *                 format: date
 *               appointment_time:
 *                 type: string
 *               invoice_id:
 *                 type: string
 *                 description: Invoice ID if payment already made
 *     responses:
 *       201:
 *         description: Appointment scheduled successfully
 */
router.post(
  "/:id/schedule-appointment",
  verifyToken,
  checkRole("patient"),
  followupController.scheduleAppointment
);

/**
 * @swagger
 * /api/follow-ups/{id}:
 *   put:
 *     summary: Update follow-up status
 *     description: Update follow-up record (doctor/staff only)
 *     tags: [FollowUp]
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
 *                 enum: [pending, scheduled, completed, cancelled, missed]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Follow-up updated successfully
 */
router.put(
  "/:id",
  verifyToken,
  checkRole("doctor", "staff", "clinic_admin"),
  followupController.updateFollowUpStatus
);

/**
 * @swagger
 * /api/follow-ups/{id}/send-reminder:
 *   post:
 *     summary: Send follow-up reminder
 *     description: Manually trigger a follow-up reminder email
 *     tags: [FollowUp]
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
 *         description: Reminder sent successfully
 */
router.post(
  "/:id/send-reminder",
  verifyToken,
  checkRole("doctor", "staff", "clinic_admin"),
  followupController.sendReminder
);

/**
 * GET /api/follow-ups/clinic
 * Clinic admin view: all follow-ups for a given clinic,
 * with planned date, confirmed date, time slot and early-slot detection.
 */
router.get(
  "/clinic",
  verifyToken,
  checkRole("clinic_admin", "staff", "super_admin"),
  followupController.getClinicFollowUps
);

module.exports = router;
