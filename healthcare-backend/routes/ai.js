const express = require("express");
const router = express.Router();
const controller = require('../controllers/aiController');
/**
 * POST /api/ai/process-transcript
 * Receives transcript text + appointment context, calls AI service, returns draft data
 * Validates that appointment_id resolves to valid doctor/patient/clinic context
 */
router.post("/process-transcript", controller.postProcessTranscript);

/**
 * GET /api/ai/by-appointment/:appointmentId
 * Fetches the latest AI consultation draft (status: draft or reviewed) for a given appointment
 */
router.get("/by-appointment/:appointmentId", controller.getByAppointmentByAppointmentId);

/**
 * GET /api/ai/:id
 * Doctor retrieves AI consultation draft for review
 */
router.get("/:id", controller.getById);

/**
 * PUT /api/ai/:id/review
 * Doctor edits AI-generated data before saving
 */
router.put("/:id/review", controller.putByIdReview);

/**
 * POST /api/ai/:id/save
 * Doctor confirms — creates actual ConsultationNote + Prescription,
 * marks appointment completed, sends patient email
 */
router.post("/:id/save", controller.postByIdSave);

/**
 * DELETE /api/ai/:id
 * Discard an AI consultation draft
 */
router.delete("/:id", controller.deleteById);
module.exports = router;