/**
 * @swagger
 * tags:
 *   - name: Doctor
 *     description: Doctor management operations
 */

const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');
const { verifyToken, checkRole, checkClinicAdminOrSuper } = require('../middleware/auth');

/**
 * @swagger
 * /api/doctors/{id}/profile:
 *   get:
 *     summary: Get doctor profile with statistics
 *     description: Returns doctor profile info and statistics (today's appointments, total patients, completed/pending consultations, today's revenue, upcoming appointments this week)
 *     tags: [Doctor]
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
 *         description: Doctor profile and stats
 *       404:
 *         description: Doctor not found
 */
router.get("/:id/profile", verifyToken, doctorController.getDoctorProfile);

/**
 * @swagger
 * /api/doctors:
 *   get:
 *     summary: Get all doctors of a specific clinic
 *     description: Retrieve all doctors for a clinic. Super Admin can see all clinics, Clinic Admin sees only their clinic.
 *     tags: [Doctor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: clinic_id
 *         schema:
 *           type: string
 *         description: Clinic ID (super admin can filter by clinic)
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
 *         name: specialization
 *         schema:
 *           type: string
 *       - in: query
 *         name: availability_status
 *         schema:
 *           type: string
 *           enum: [available, unavailable, on_leave]
 *     responses:
 *       200:
 *         description: List of doctors retrieved successfully
 *       403:
 *         description: Access denied
 */
router.get("/", verifyToken, doctorController.getAllDoctors);

/**
 * @swagger
 * /api/doctors/clinic/{clinicId}:
 *   get:
 *     summary: Get all doctors for a clinic
 *     description: Retrieve all doctors associated with a specific clinic. No authentication required.
 *     tags: [Doctor]
 *     parameters:
 *       - in: path
 *         name: clinicId
 *         required: true
 *         schema:
 *           type: string
 *         description: Clinic MongoDB ID
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
 *         name: specialization
 *         schema:
 *           type: string
 *       - in: query
 *         name: availability_status
 *         schema:
 *           type: string
 *           enum: [available, on_leave, busy]
 *     responses:
 *       200:
 *         description: Doctors retrieved successfully
 *       404:
 *         description: Clinic not found
 */
router.get("/clinic/:clinicId", doctorController.getClinicDoctors);

/**
 * @swagger
 * /api/doctors/{id}/slots:
 *   post:
 *     summary: Set or update a doctor's weekly slot (visiting hours)
 *     description: Clinic Admin or the doctor can define availability for a specific weekday with start/end time and slot duration.
 *     tags: [Doctor]
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
 *             required: [day_of_week, start_time, end_time]
 *             properties:
 *               day_of_week:
 *                 type: string
 *                 enum: [monday, tuesday, wednesday, thursday, friday, saturday, sunday]
 *               start_time:
 *                 type: string
 *                 example: "14:00"
 *               end_time:
 *                 type: string
 *                 example: "18:00"
 *               slot_duration:
 *                 type: number
 *                 example: 30
 *               max_patients:
 *                 type: number
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Slot upserted successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Access denied
 */
router.post("/onboard", verifyToken, checkClinicAdminOrSuper, doctorController.onboardDoctor);

/**
 * @swagger
 * /api/doctors/{id}:
 *   put:
 *     summary: Update doctor information
 *     description: Update doctor profile. Clinic Admin can only update doctors in their clinic.
 *     tags: [Doctor]
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
 *               specialization:
 *                 type: string
 *               experience_years:
 *                 type: number
 *               consultation_fee:
 *                 type: number
 *               availability_status:
 *                 type: string
 *                 enum: [available, unavailable, on_leave]
 *     responses:
 *       200:
 *         description: Doctor updated successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: Doctor not found
 */
router.put("/:id", verifyToken, checkClinicAdminOrSuper, doctorController.updateDoctor);

/**
 * @swagger
 * /api/doctors/{id}:
 *   delete:
 *     summary: Remove a doctor
 *     description: Delete doctor profile and associated user account. Clinic Admin can only delete doctors from their clinic.
 *     tags: [Doctor]
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
 *         description: Doctor deleted successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: Doctor not found
 */
router.delete("/:id", verifyToken, checkClinicAdminOrSuper, doctorController.removeDoctor);

/**
 * GET /api/doctors/:id/calendar-data
 * Returns structured calendar data for the Teams-style calendar view
 * Query params: startDate, endDate
 */
router.get("/:id/calendar-data", doctorController.getDoctorCalendarData);

module.exports = router;
