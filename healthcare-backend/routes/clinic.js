/**
 * @swagger
 * tags:
 *   - name: Clinic
 *     description: Clinic management operations
 */

const express = require('express');
const router = express.Router();
const clinicController = require('../controllers/clinicController');
const { verifyToken, checkRole, checkClinicAccess, checkSuperAdmin, checkClinicAdminOrSuper } = require('../middleware/auth');

/**
 * @swagger
 * /api/clinics:
 *   post:
 *     summary: Create a new clinic
 *     description: Super Admin only endpoint to create and register a new clinic in the system.
 *     tags: [Clinic]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, registration_number, address, contact]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Apollo Hospital
 *               registration_number:
 *                 type: string
 *                 example: REG123456
 *               address:
 *                 type: object
 *                 properties:
 *                   street:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   postal_code:
 *                     type: string
 *               contact:
 *                 type: object
 *                 properties:
 *                   phone:
 *                     type: string
 *                   email:
 *                     type: string
 *               specialties:
 *                 type: array
 *                 items:
 *                   type: string
 *               facilities:
 *                 type: array
 *                 items:
 *                   type: string
 *               total_beds:
 *                 type: number
 *     responses:
 *       201:
 *         description: Clinic created successfully
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Forbidden - Super Admin only
 */
router.post("/", verifyToken, checkSuperAdmin, clinicController.createClinic);

/**
 * @swagger
 * /api/clinics:
 *   get:
 *     summary: Get all clinics with filters
 *     description: Super Admin can view all clinics. Clinic Admin and Staff can only see their own clinic.
 *     tags: [Clinic]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, temporarily_closed]
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *       - in: query
 *         name: specialty
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of clinics
 */
router.get("/", verifyToken, clinicController.getAllClinics);

/**
 * @swagger
 * /api/clinics/{id}:
 *   get:
 *     summary: Get clinic by ID
 *     description: Super Admin can view any clinic. Clinic Admin can only view their own clinic.
 *     tags: [Clinic]
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
 *         description: Clinic retrieved successfully
 *       404:
 *         description: Clinic not found
 */
router.get("/:id", verifyToken, clinicController.getClinicById);

/**
 * @swagger
 * /api/clinics/{id}/profile:
 *   get:
 *     summary: Get comprehensive clinic profile
 *     description: Returns detailed clinic info with statistics.
 *     tags: [Clinic]
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
 *         description: Clinic profile retrieved successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: Clinic not found
 */
router.get("/:id/profile", verifyToken, clinicController.getClinicProfile);

/**
 * @swagger
 * /api/clinics/{id}:
 *   put:
 *     summary: Update clinic information
 *     description: Super Admin can update any clinic. Clinic Admin can update their own clinic.
 *     tags: [Clinic]
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
 *         description: Clinic updated successfully
 *       403:
 *         description: Forbidden
 */
router.put("/:id", verifyToken, checkClinicAdminOrSuper, clinicController.updateClinic);

/**
 * @swagger
 * /api/clinics/{id}:
 *   delete:
 *     summary: Deactivate clinic
 *     description: Super Admin only endpoint to deactivate a clinic.
 *     tags: [Clinic]
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
 *         description: Clinic deactivated successfully
 *       403:
 *         description: Forbidden - Super Admin only
 */
router.delete("/:id", verifyToken, checkSuperAdmin, clinicController.deactivateClinic);

router.get("/:id/stats", verifyToken, checkClinicAdminOrSuper, clinicController.getClinicStats);

module.exports = router;
