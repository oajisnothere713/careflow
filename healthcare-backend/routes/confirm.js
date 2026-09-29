const express = require("express");
const router = express.Router();
const confirmController = require("../controllers/confirmController");

/**
 * GET /api/confirm/:token/details
 * Public — show slot details before confirming
 */
router.get("/:token/details", confirmController.getTokenDetails);

/**
 * POST /api/confirm/:token
 * Public — patient confirms appointment from email link.
 * Creates actual Appointment, updates FollowUp/WaitingQueue status.
 */
router.post("/:token", confirmController.confirmToken);

module.exports = router;
