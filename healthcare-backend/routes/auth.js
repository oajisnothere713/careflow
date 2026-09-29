const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

/**
 * @swagger
 * /api/auth/send-otp:
 *   post:
 *     summary: Send OTP to email for login or signup
 *     description: Request OTP for user authentication. Requires only email. Supports login for existing users and signup for new users. Works for super admin, clinic admin, and regular users.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, type]
 *             properties:
 *               email:
 *                 type: string
 *                 example: superadmin@healthcare.com
 *               type:
 *                 type: string
 *                 enum: [signup, login]
 *                 example: login
 *     responses:
 *       200:
 *         description: OTP sent successfully to email
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 email:
 *                   type: string
 *                 userRole:
 *                   type: string
 *       400:
 *         description: Bad request or user not found for login
 *       500:
 *         description: Server error
 */
router.post("/send-otp", authController.sendOtp);

/**
 * @swagger
 * /api/auth/verify-otp-signup:
 *   post:
 *     summary: Verify OTP and create account
 *     description: Verify OTP for user registration. Requires only email, OTP, name, and role. Works for patient, doctor, and staff roles.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, otp, name, role]
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               otp:
 *                 type: string
 *                 example: '123456'
 *               name:
 *                 type: string
 *                 example: John Doe
 *               role:
 *                 type: string
 *                 enum: [doctor, staff, patient]
 *                 example: patient
 *               clinic_id:
 *                 type: string
 *                 description: Required for doctor and staff roles
 *               phone:
 *                 type: string
 *                 description: Optional phone number
 *     responses:
 *       201:
 *         description: User created and verified
 *       400:
 *         description: Invalid OTP or missing required fields
 *       500:
 *         description: Server error
 */
router.post("/verify-otp-signup", authController.verifyOtpSignup);

/**
 * @swagger
 * /api/auth/verify-otp-login:
 *   post:
 *     summary: Verify OTP and login user
 *     description: Verify OTP for user login. Requires only email and OTP. Works for all user roles including super admin, clinic admin, doctor, staff, and patient.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, otp]
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               otp:
 *                 type: string
 *                 example: '123456'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     phone:
 *                       type: string
 *                     role:
 *                       type: string
 *                     clinic_id:
 *                       type: string
 *                     doctor_id:
 *                       type: string
 *                       nullable: true
 *                       description: Present when role is doctor
 *                     patient_id:
 *                       type: string
 *                       nullable: true
 *                       description: Present when role is patient
 *       400:
 *         description: Invalid OTP or user not found
 *       500:
 *         description: Server error
 */
router.post("/verify-otp-login", authController.verifyOtpLogin);

/**
 * @swagger
 * /api/auth/super-admin-login:
 *   post:
 *     summary: Super Admin login with email and OTP
 *     description: Simplified login for Super Admin. Requires only email and OTP (no phone needed). Verifies the user is a super admin before granting access.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, otp]
 *             properties:
 *               email:
 *                 type: string
 *                 example: superadmin@healthcare.com
 *               otp:
 *                 type: string
 *                 example: '123456'
 *     responses:
 *       200:
 *         description: Super Admin login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     phone:
 *                       type: string
 *                     role:
 *                       type: string
 *       400:
 *         description: Invalid OTP or not a super admin
 *       500:
 *         description: Server error
 */
router.post("/super-admin-login", authController.superAdminLogin);

/**
 * @swagger
 * /api/auth/create-clinic-admin:
 *   post:
 *     summary: Super Admin creates a Clinic Admin
 *     description: Super Admin endpoint to initiate clinic admin creation. Sends OTP to the new admin's email for verification. After OTP verification, the clinic admin account is created.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, phone, name, clinic_id]
 *             properties:
 *               email:
 *                 type: string
 *                 example: clinicadmin@hospital.com
 *               phone:
 *                 type: string
 *                 example: '9876543210'
 *               name:
 *                 type: string
 *                 example: Clinic Admin Name
 *               clinic_id:
 *                 type: string
 *                 description: ID of the clinic to assign this admin to
 *                 example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: OTP sent to Clinic Admin email for verification
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 email:
 *                   type: string
 *                 clinic:
 *                   type: object
 *       400:
 *         description: Invalid input or user already exists
 *       403:
 *         description: Only Super Admin can create Clinic Admins
 *       404:
 *         description: Clinic not found
 *       500:
 *         description: Server error
 */
router.post("/create-clinic-admin", authController.createClinicAdmin);

/**
 * @swagger
 * /api/auth/verify-clinic-admin-setup:
 *   post:
 *     summary: Verify OTP and complete Clinic Admin setup
 *     description: Verify the OTP sent to clinic admin and create the clinic admin account. Requires only email, OTP, name, and clinic_id. Phone is optional.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, otp, name, clinic_id]
 *             properties:
 *               email:
 *                 type: string
 *                 example: clinicadmin@hospital.com
 *               otp:
 *                 type: string
 *                 example: '123456'
 *               name:
 *                 type: string
 *                 example: Clinic Admin Name
 *               clinic_id:
 *                 type: string
 *                 example: 507f1f77bcf86cd799439011
 *               phone:
 *                 type: string
 *                 description: Optional phone number
 *     responses:
 *       201:
 *         description: Clinic Admin setup completed successfully
 *       400:
 *         description: Invalid OTP or user already exists
 *       500:
 *         description: Server error
 */
router.post("/verify-clinic-admin-setup", authController.verifyClinicAdminSetup);

/**
 * @swagger
 * /api/auth/register-super-admin:
 *   post:
 *     summary: Register the first and only Super Admin
 *     description: Registers the system's single Super Admin. Once a super admin exists, no new ones can be created. Sends OTP to email for verification.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, phone, name]
 *             properties:
 *               email:
 *                 type: string
 *                 example: superadmin@healthcare.com
 *               phone:
 *                 type: string
 *                 example: '9999999999'
 *               name:
 *                 type: string
 *                 example: Super Admin
 *     responses:
 *       200:
 *         description: OTP sent to Super Admin email for verification
 *       400:
 *         description: Super Admin already exists or invalid input
 *       500:
 *         description: Server error
 */
router.post("/register-super-admin", authController.registerSuperAdmin);

/**
 * @swagger
 * /api/auth/verify-super-admin-registration:
 *   post:
 *     summary: Verify OTP and complete Super Admin registration
 *     description: Verifies the OTP sent to the super admin email and creates the account. Only works if no super admin exists.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, phone, otp, name]
 *             properties:
 *               email:
 *                 type: string
 *                 example: superadmin@healthcare.com
 *               phone:
 *                 type: string
 *                 example: '9999999999'
 *               otp:
 *                 type: string
 *                 example: '123456'
 *               name:
 *                 type: string
 *                 example: Super Admin
 *     responses:
 *       201:
 *         description: Super Admin created successfully
 *       400:
 *         description: Invalid OTP or super admin already exists
 *       500:
 *         description: Server error
 */
router.post("/verify-super-admin-registration", authController.verifySuperAdminRegistration);

/**
 * @swagger
 * /api/auth/create-clinic-admin-direct:
 *   post:
 *     summary: Super Admin creates Clinic Admin directly (No OTP required)
 *     description: Super Admin endpoint to directly create a clinic admin account without OTP verification. Instant account creation.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, phone, name, clinic_id]
 *             properties:
 *               email:
 *                 type: string
 *                 example: clinicadmin@hospital.com
 *               phone:
 *                 type: string
 *                 example: '9876543210'
 *               name:
 *                 type: string
 *                 example: Clinic Admin Name
 *               clinic_id:
 *                 type: string
 *                 description: ID of the clinic to assign this admin to
 *                 example: 507f1f77bcf86cd799439011
 *     responses:
 *       201:
 *         description: Clinic Admin created successfully
 *       400:
 *         description: Invalid input or user already exists
 *       403:
 *         description: Only Super Admin can create Clinic Admins
 *       404:
 *         description: Clinic not found
 *       500:
 *         description: Server error
 */
router.post("/create-clinic-admin-direct", authController.createClinicAdminDirect);

module.exports = router;
