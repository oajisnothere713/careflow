const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth");
const chatController = require("../controllers/chatController");

/**
 * @swagger
 * /api/chat/session:
 *   post:
 *     summary: Create or get a chat session with another user
 *     tags:
 *       - Chat
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               otherUserId:
 *                 type: string
 *                 description: The user ID of the other participant (doctor, patient, clinic admin, or super admin)
 *               clinicId:
 *                 type: string
 *                 description: (Optional) Clinic context for the session
 *     responses:
 *       200:
 *         description: Chat session object
 *       401:
 *         description: Unauthorized
 */
router.post("/session", verifyToken, chatController.createOrGetSession);

// Send message
router.post("/session/:sessionId/message", verifyToken, chatController.sendMessage);

// Get messages
router.get("/session/:sessionId/messages", verifyToken, chatController.getMessages);

/**
 * @swagger
 * /api/chat/sessions:
 *   get:
 *     summary: List all chat sessions for the logged-in user, optionally filtered by user or clinic
 *     tags:
 *       - Chat
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter sessions by other user ID (doctor, patient, clinic admin, or super admin)
 *       - in: query
 *         name: clinicId
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter sessions by clinic ID
 *     responses:
 *       200:
 *         description: List of chat sessions
 *       401:
 *         description: Unauthorized
 */
router.get("/sessions", verifyToken, chatController.listSessions);

module.exports = router;
