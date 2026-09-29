/**
 * @swagger
 * tags:
 *   - name: Appointment
 *     description: Appointment scheduling and management
 */

const express = require("express");
const router = express.Router();
const controller = require('../controllers/appointmentController');
const {
  verifyToken,
  checkRole
} = require("../middleware/auth");
/**
 * @swagger
 * /api/appointments:
 *   post:
 *     summary: Book a new appointment
 *     description: Create appointment with conflict detection and automatic reminder scheduling
 *     tags: [Appointment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [patient_id, doctor_id, clinic_id, appointment_date, appointment_time, reason_for_visit]
 *             properties:
 *               patient_id:
 *                 type: string
 *                 example: "507f1f77bcf86cd799439011"
 *               doctor_id:
 *                 type: string
 *                 example: "507f1f77bcf86cd799439012"
 *               clinic_id:
 *                 type: string
 *               appointment_date:
 *                 type: string
 *                 format: date
 *                 example: "2026-01-15"
 *               appointment_time:
 *                 type: string
 *                 example: "14:00"
 *               reason_for_visit:
 *                 type: string
 *                 example: "Regular checkup"
 *               symptoms:
 *                 type: array
 *                 items:
 *                   type: string
 *               visit_type:
 *                 type: string
 *                 enum: [first_visit, follow_up, checkup]
 *               priority:
 *                 type: string
 *                 enum: [normal, urgent, emergency]
 *     responses:
 *       201:
 *         description: Appointment booked successfully
 *       400:
 *         description: Time slot already booked or invalid input
 *       404:
 *         description: Patient or doctor not found
 */
router.post("/", verifyToken, controller.postIndex);

/**
 * @swagger
 * /api/appointments:
 *   get:
 *     summary: Get all appointments with filters
 *     description: Retrieve appointments filtered by user role, status, date, doctor, or patient
 *     tags: [Appointment]
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
 *           enum: [booked, confirmed, completed, cancelled, no_show]
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: doctor_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: patient_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: clinic_id
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of appointments retrieved successfully
 */
router.get("/", verifyToken, controller.getIndex);

/**
 * @swagger
 * /api/appointments/{id}:
 *   get:
 *     summary: Get appointment details by ID
 *     tags: [Appointment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Appointment ID
 *     responses:
 *       200:
 *         description: Appointment details retrieved
 *       404:
 *         description: Appointment not found
 */
router.get("/:id", verifyToken, controller.getById);

/**
 * @swagger
 * /api/appointments/doctor/{doctorId}/available-slots:
 *   get:
 *     summary: Get available time slots for a doctor
 *     description: Returns available slots for a date window (up to 6 months) based on doctor schedule and existing bookings
 *     tags: [Appointment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: doctorId
 *         required: true
 *         schema:
 *           type: string
 *         description: Doctor ID
 *       - in: query
 *         name: date
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for slot availability (YYYY-MM-DD). Defaults to today.
 *       - in: query
 *         name: days
 *         required: false
 *         schema:
 *           type: integer
 *           default: 180
 *           minimum: 1
 *           maximum: 180
 *         description: Number of days to check for availability (max 180 days / 6 months)
 *     responses:
 *       200:
 *         description: List of available time slots per day
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 days:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                         format: date
 *                       available_slots:
 *                         type: array
 *                         items:
 *                           type: string
 *                       booked_slots:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             time:
 *                               type: string
 *                             status:
 *                               type: string
 *       404:
 *         description: Doctor not found
 */
router.get("/doctor/:doctorId/available-slots", verifyToken, controller.getDoctorByDoctorIdAvailableSlots);

/**
 * @swagger
 * /api/appointments/{id}/reschedule:
 *   put:
 *     summary: Reschedule an appointment
 *     description: Move appointment to new date/time with conflict checking
 *     tags: [Appointment]
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
 *                 example: "2026-01-20"
 *               appointment_time:
 *                 type: string
 *                 example: "15:00"
 *     responses:
 *       200:
 *         description: Appointment rescheduled successfully
 *       400:
 *         description: New time slot already booked
 */
router.put("/:id/reschedule", verifyToken, checkRole("patient", "doctor", "staff", "admin"), controller.putByIdReschedule);

/**
 * @swagger
 * /api/appointments/{id}/cancel:
 *   put:
 *     summary: Cancel an appointment
 *     tags: [Appointment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cancelled_reason:
 *                 type: string
 *                 example: "Patient requested cancellation"
 *     responses:
 *       200:
 *         description: Appointment cancelled successfully
 *       404:
 *         description: Appointment not found
 */
router.put("/:id/cancel", verifyToken, controller.putByIdCancel);

/**
 * @swagger
 * /api/appointments/{id}/status:
 *   put:
 *     summary: Update appointment status
 *     description: Change status to confirmed, completed, or no-show
 *     tags: [Appointment]
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
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [booked, confirmed, completed, no_show]
 *                 example: "completed"
 *     responses:
 *       200:
 *         description: Appointment status updated
 *       400:
 *         description: Invalid status value
 */
router.put("/:id/status", verifyToken, checkRole("doctor", "staff", "admin"), controller.putByIdStatus);

/**
 * GET /api/appointments/doctor/:doctorId/calendar
 * Returns appointments for a doctor grouped by date with color-coding info
 * Query params: startDate, endDate (ISO date strings)
 */
router.get("/doctor/:doctorId/calendar", controller.getDoctorByDoctorIdCalendar);

/**
 * POST /api/appointments/:id/waiting-queue
 * Add a patient to the waiting queue for a doctor's slot
 */
router.post("/:id/waiting-queue", controller.postByIdWaitingQueue);
module.exports = router;
