const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const AudioRecording = require("../models/consultation/AudioRecording");
const AIConsultation = require("../models/consultation/AIConsultation");
const ConsultationNote = require("../models/consultation/ConsultationNote");
const Prescription = require("../models/consultation/Prescription");
const Appointment = require("../models/appointment/Appointment");
const FollowUp = require("../models/appointment/FollowUp");
const Patient = require("../models/patient/Patient");
const Doctor = require("../models/clinic/Doctor");
const Clinic = require("../models/clinic/Clinic");
const User = require("../models/user/User");
const {
  generateConsultationData
} = require("../services/aiService");
const {
  sendConsultationSummary,
  sendFollowUpSlots
} = require("../services/emailService");
const {
  getAvailableSlots,
  generateDefaultSlots,
  getNextAvailableDateSlots
} = require("../services/cronService");
const {
  v4: uuidv4
} = require("uuid");
const ConfirmationToken = require("../models/appointment/ConfirmationToken");

/**
 * POST /api/ai/process-transcript
 * Receives transcript text + appointment context, calls AI service, returns draft data
 * Validates that appointment_id resolves to valid doctor/patient/clinic context
 */
exports.postProcessTranscript = asyncHandler(async (req, res, next) => {
  try {
    const {
      transcript,
      appointment_id,
      patient_id,
      doctor_id,
      clinic_id,
      duration_seconds
    } = req.body;
    if (!transcript || !appointment_id) {
      return res.status(400).json({
        message: "transcript and appointment_id are required"
      });
    }

    // Fetch appointment to get context
    const appointment = await Appointment.findById(appointment_id);
    if (!appointment) {
      return res.status(404).json({
        message: `Appointment not found for ID: ${appointment_id}. Cannot extract doctor/patient/clinic context.`
      });
    }

    // Use appointment context, fallback to request body if provided
    const finalDoctorId = doctor_id || appointment.doctor_id;
    const finalPatientId = patient_id || appointment.patient_id;
    const finalClinicId = clinic_id || appointment.clinic_id;
    if (!finalDoctorId || !finalPatientId || !finalClinicId) {
      return res.status(400).json({
        message: "Cannot resolve appointment context. Missing doctor_id, patient_id, or clinic_id in appointment or request body."
      });
    }

    // Create audio recording record
    const recording = await AudioRecording.create({
      appointment_id,
      doctor_id: finalDoctorId,
      patient_id: finalPatientId,
      clinic_id: finalClinicId,
      transcript,
      duration_seconds: duration_seconds || 0,
      status: "transcribed"
    });

    // Get patient history for AI context
    let patientHistory = null;
    if (finalPatientId) {
      const pastConsultations = await ConsultationNote.find({
        patient_id: finalPatientId
      }).sort({
        createdAt: -1
      }).limit(5).lean();
      if (pastConsultations.length) {
        patientHistory = {
          pastVisits: pastConsultations.map(c => ({
            date: c.createdAt,
            diagnosis: c.diagnosis,
            chiefComplaint: c.chief_complaint,
            treatmentPlan: c.treatment_plan
          }))
        };
      }
    }

    // Call AI service
    const aiResult = await generateConsultationData(transcript, patientHistory);

    // Create AI consultation draft
    const aiConsultation = await AIConsultation.create({
      appointment_id,
      recording_id: recording._id,
      doctor_id: finalDoctorId,
      patient_id: finalPatientId,
      clinic_id: finalClinicId,
      raw_transcript: transcript,
      summary: aiResult.summary,
      patient_summary: aiResult.patientSummary,
      doctor_summary: aiResult.doctorSummary,
      prescription_data: aiResult.prescription,
      follow_up_date: aiResult.followUpDate ? new Date(aiResult.followUpDate) : null,
      status: "draft"
    });

    // Update recording status
    recording.status = "processed";
    await recording.save();
    res.json({
      message: "Transcript processed successfully",
      aiConsultation: {
        _id: aiConsultation._id,
        summary: aiConsultation.summary,
        patient_summary: aiConsultation.patient_summary,
        doctor_summary: aiConsultation.doctor_summary,
        prescription_data: aiConsultation.prescription_data,
        follow_up_date: aiConsultation.follow_up_date,
        raw_transcript: aiConsultation.raw_transcript,
        diagnosis: aiResult.diagnosis,
        chief_complaint: aiResult.chiefComplaint,
        status: aiConsultation.status
      }
    });
  } catch (error) {
    console.error("AI process-transcript error:", error);
    res.status(500).json({
      message: error.message || "Failed to process transcript"
    });
  }
});
exports.getByAppointmentByAppointmentId = asyncHandler(async (req, res, next) => {
  try {
    const aiConsultation = await AIConsultation.findOne({
      appointment_id: req.params.appointmentId,
      status: {
        $in: ["draft", "reviewed"]
      }
    }).sort({
      createdAt: -1
    }).populate("patient_id", "user_id gender blood_group").populate("doctor_id", "user_id specialization").populate("clinic_id", "name address").lean();
    if (!aiConsultation) {
      return res.status(404).json({
        message: "No active consultation draft found"
      });
    }
    let patientName = "Patient";
    if (aiConsultation.patient_id?.user_id) {
      const patientUser = await User.findById(aiConsultation.patient_id.user_id);
      patientName = patientUser?.name || "Patient";
    }
    let doctorName = "Doctor";
    if (aiConsultation.doctor_id?.user_id) {
      const doctorUser = await User.findById(aiConsultation.doctor_id.user_id);
      doctorName = doctorUser?.name || "Doctor";
    }

    // Prefer doctor_edits if available (most recently saved reviewed data)
    const edits = aiConsultation.doctor_edits || {};
    res.json({
      _id: aiConsultation._id,
      status: aiConsultation.status,
      patientName,
      doctorName,
      clinic: aiConsultation.clinic_id,
      raw_transcript: aiConsultation.raw_transcript,
      summary: edits.summary || aiConsultation.summary,
      patient_summary: edits.patient_summary || aiConsultation.patient_summary,
      doctor_summary: edits.doctor_summary || aiConsultation.doctor_summary,
      prescription_data: edits.prescription_data || aiConsultation.prescription_data,
      follow_up_date: edits.follow_up_date || aiConsultation.follow_up_date,
      diagnosis: edits.diagnosis || aiConsultation.diagnosis,
      chief_complaint: edits.chief_complaint || aiConsultation.chief_complaint,
      doctor_edits: aiConsultation.doctor_edits || null,
      created_at: aiConsultation.createdAt
    });
  } catch (error) {
    console.error("Get AI consultation by appointment error:", error);
    res.status(500).json({
      message: error.message
    });
  }
});
exports.getById = asyncHandler(async (req, res, next) => {
  try {
    const aiConsultation = await AIConsultation.findById(req.params.id).populate("patient_id", "user_id gender blood_group").populate("doctor_id", "user_id specialization").populate("clinic_id", "name address").lean();
    if (!aiConsultation) {
      return res.status(404).json({
        message: "AI consultation not found"
      });
    }

    // Get patient user info
    let patientName = "Patient";
    if (aiConsultation.patient_id?.user_id) {
      const patientUser = await User.findById(aiConsultation.patient_id.user_id);
      patientName = patientUser?.name || "Patient";
    }

    // Get doctor user info
    let doctorName = "Doctor";
    if (aiConsultation.doctor_id?.user_id) {
      const doctorUser = await User.findById(aiConsultation.doctor_id.user_id);
      doctorName = doctorUser?.name || "Doctor";
    }
    res.json({
      _id: aiConsultation._id,
      status: aiConsultation.status,
      patientName,
      doctorName,
      clinic: aiConsultation.clinic_id,
      raw_transcript: aiConsultation.raw_transcript,
      summary: aiConsultation.summary,
      patient_summary: aiConsultation.patient_summary,
      doctor_summary: aiConsultation.doctor_summary,
      prescription_data: aiConsultation.prescription_data,
      follow_up_date: aiConsultation.follow_up_date,
      diagnosis: aiConsultation.diagnosis,
      chief_complaint: aiConsultation.chief_complaint,
      doctor_edits: aiConsultation.doctor_edits || null,
      created_at: aiConsultation.createdAt
    });
  } catch (error) {
    console.error("Get AI consultation error:", error);
    res.status(500).json({
      message: error.message
    });
  }
});
exports.putByIdReview = asyncHandler(async (req, res, next) => {
  try {
    const {
      summary,
      patient_summary,
      doctor_summary,
      chief_complaint,
      diagnosis,
      prescription_data,
      follow_up_date
    } = req.body;
    const aiConsultation = await AIConsultation.findById(req.params.id);
    if (!aiConsultation) {
      return res.status(404).json({
        message: "AI consultation not found"
      });
    }
    if (aiConsultation.status === "saved") {
      return res.status(400).json({
        message: "Cannot edit a saved consultation"
      });
    }

    // Store doctor's edits
    // Normalize prescription field names: frontend sends 'name', schema expects 'medicine_name'
    // Use .toObject() to convert Mongoose subdocuments to plain objects so fields are not lost
    const normalizedPrescriptions = prescription_data !== undefined ? prescription_data.map(med => ({
      medicine_name: med.medicine_name || med.name || "",
      dosage: med.dosage || "",
      frequency: med.frequency || "",
      duration: med.duration || "",
      instructions: med.instructions || ""
    })) : (aiConsultation.prescription_data || []).map(med => {
      const plain = med.toObject ? med.toObject() : med;
      return {
        medicine_name: plain.medicine_name || plain.name || "",
        dosage: plain.dosage || "",
        frequency: plain.frequency || "",
        duration: plain.duration || "",
        instructions: plain.instructions || ""
      };
    });
    aiConsultation.doctor_edits = {
      summary: doctor_summary !== undefined ? doctor_summary : summary !== undefined ? summary : aiConsultation.doctor_summary || aiConsultation.summary,
      patient_summary: patient_summary !== undefined ? patient_summary : aiConsultation.patient_summary,
      doctor_summary: doctor_summary !== undefined ? doctor_summary : aiConsultation.doctor_summary,
      chief_complaint: chief_complaint !== undefined ? chief_complaint : aiConsultation.chief_complaint,
      diagnosis: diagnosis !== undefined ? diagnosis : aiConsultation.diagnosis,
      prescription_data: normalizedPrescriptions,
      follow_up_date: follow_up_date !== undefined ? follow_up_date : aiConsultation.follow_up_date
    };
    aiConsultation.status = "reviewed";
    await aiConsultation.save();
    res.json({
      message: "Review saved",
      aiConsultation
    });
  } catch (error) {
    console.error("AI review error:", error);
    res.status(500).json({
      message: error.message
    });
  }
});
exports.postByIdSave = asyncHandler(async (req, res, next) => {
  try {
    const aiConsultation = await AIConsultation.findById(req.params.id);
    if (!aiConsultation) {
      return res.status(404).json({
        message: "AI consultation not found"
      });
    }
    if (aiConsultation.status === "saved") {
      return res.status(400).json({
        message: "Already saved"
      });
    }

    // Use doctor edits if available, otherwise use AI-generated data
    const finalData = {
      summary: aiConsultation.doctor_edits?.summary || aiConsultation.doctor_summary || aiConsultation.summary,
      patient_summary: aiConsultation.doctor_edits?.patient_summary || aiConsultation.patient_summary || "",
      doctor_summary: aiConsultation.doctor_edits?.doctor_summary || aiConsultation.doctor_summary || aiConsultation.summary,
      prescription_data: aiConsultation.doctor_edits?.prescription_data || aiConsultation.prescription_data,
      follow_up_date: aiConsultation.doctor_edits?.follow_up_date || aiConsultation.follow_up_date
    };

    // Allow override from request body (for final edits during save)
    if (req.body.summary) finalData.summary = req.body.summary;
    if (req.body.patient_summary) finalData.patient_summary = req.body.patient_summary;
    if (req.body.doctor_summary) finalData.doctor_summary = req.body.doctor_summary;
    if (req.body.prescription_data) finalData.prescription_data = req.body.prescription_data;
    if (req.body.follow_up_date) finalData.follow_up_date = req.body.follow_up_date;

    // Normalize prescription field names: frontend sends 'name', AI generates 'medicine_name'
    // Use .toObject() to convert Mongoose subdocuments to plain objects so fields are not lost
    if (Array.isArray(finalData.prescription_data)) {
      finalData.prescription_data = finalData.prescription_data.map(med => {
        const plain = med.toObject ? med.toObject() : med;
        return {
          medicine_name: plain.medicine_name || plain.name || "",
          dosage: plain.dosage || "",
          frequency: plain.frequency || "",
          duration: plain.duration || "",
          instructions: plain.instructions || ""
        };
      });
    }

    // Create ConsultationNote
    const consultationNote = await ConsultationNote.create({
      appointment_id: aiConsultation.appointment_id,
      patient_id: aiConsultation.patient_id,
      doctor_id: aiConsultation.doctor_id,
      clinic_id: aiConsultation.clinic_id,
      chief_complaint: aiConsultation.doctor_edits?.chief_complaint || aiConsultation.chief_complaint || req.body.chief_complaint || "See AI-generated summary",
      diagnosis: aiConsultation.doctor_edits?.diagnosis || aiConsultation.diagnosis || req.body.diagnosis || "See AI-generated summary",
      treatment_plan: finalData.doctor_summary || finalData.summary,
      patient_summary: finalData.patient_summary,
      follow_up_date: finalData.follow_up_date,
      notes: `AI-generated from audio recording. Transcript: ${aiConsultation.raw_transcript.substring(0, 500)}`,
      ai_consultation_id: aiConsultation._id,
      audio_recording_id: aiConsultation.recording_id
    });

    // Create Prescription if medications exist
    let prescription = null;
    let validMedications = [];
    if (finalData.prescription_data && finalData.prescription_data.length > 0) {
      // Filter out empty medications and keep doctor-edited values as-is
      validMedications = finalData.prescription_data.filter(med => med.medicine_name && med.medicine_name.trim()).map(med => {
        const plain = med.toObject ? med.toObject() : med;
        return {
          medicine_name: plain.medicine_name.trim(),
          dosage: plain.dosage?.trim() || "",
          frequency: plain.frequency?.trim() || "",
          duration: plain.duration?.trim() || "",
          instructions: plain.instructions?.trim() || ""
        };
      });
      if (validMedications.length > 0) {
        prescription = await Prescription.create({
          consultation_id: consultationNote._id,
          appointment_id: aiConsultation.appointment_id,
          patient_id: aiConsultation.patient_id,
          doctor_id: aiConsultation.doctor_id,
          clinic_id: aiConsultation.clinic_id,
          medications: validMedications,
          status: "active"
        });
      }
    }

    // Mark appointment as completed
    await Appointment.findByIdAndUpdate(aiConsultation.appointment_id, {
      status: "completed"
    });

    // Create follow-up if date is set — immediately check and book/notify slots
    let followUpEmailSent = false;
    let followUpEmailError = null;
    if (finalData.follow_up_date) {
      const followUp = await FollowUp.create({
        patient_id: aiConsultation.patient_id,
        doctor_id: aiConsultation.doctor_id,
        clinic_id: aiConsultation.clinic_id,
        appointment_id: aiConsultation.appointment_id,
        consultation_note_id: consultationNote._id,
        follow_up_date: new Date(finalData.follow_up_date),
        purpose: "Follow-up visit recommended by doctor",
        status: "pending",
        created_by: aiConsultation.doctor_id
      });

      // Process follow-up slots and send email (awaited for proper error handling)
      try {
        const patient = await Patient.findById(aiConsultation.patient_id);
        const patientUser = patient ? await User.findById(patient.user_id) : null;
        const doctor = await Doctor.findById(aiConsultation.doctor_id);
        const doctorUser = doctor ? await User.findById(doctor.user_id) : null;
        const clinic = await Clinic.findById(aiConsultation.clinic_id);
        if (!patientUser?.email) {
          console.warn(`⚠️ Follow-up: No email found for patient ${aiConsultation.patient_id}`);
          followUpEmailError = "Patient email not found";
        } else {
          const slotResult = await getAvailableSlots(aiConsultation.doctor_id, new Date(finalData.follow_up_date), 0);
          const allSlots = slotResult.fromPreferredDate ? slotResult.preferredDateSlots : slotResult.nextAvailableSlots;
          if (!allSlots || allSlots.length === 0) {
            // No DoctorSlot records — generate default 30-min interval slots (9 AM – 6:30 PM)
            console.warn(`⚠️ No DoctorSlot records found for doctor ${aiConsultation.doctor_id} — generating default slots`);
            const defaultSlots = await generateDefaultSlots(aiConsultation.doctor_id, new Date(finalData.follow_up_date));

            // Determine which slots to send: preferred date slots, or next available date
            let slotsForEmail = defaultSlots;
            let emailFromPreferredDate = defaultSlots.length > 0;
            if (defaultSlots.length === 0) {
              // Preferred date fully booked — find all slots on the single next available date
              console.warn(`⚠️ All default slots booked for ${finalData.follow_up_date} — searching next available date`);
              const {
                slots: nextSlots
              } = await getNextAvailableDateSlots(aiConsultation.doctor_id, new Date(finalData.follow_up_date));
              slotsForEmail = nextSlots;
              emailFromPreferredDate = false;
            }
            if (!slotsForEmail || slotsForEmail.length === 0) {
              console.warn(`⚠️ No available slots in next 30 days for doctor ${aiConsultation.doctor_id}`);
              followUpEmailError = "No available slots in next 30 days";
            } else {
              const slotsWithTokens = [];
              const tokenIds = [];
              for (const slot of slotsForEmail) {
                const token = uuidv4();
                const tokenRecord = await ConfirmationToken.create({
                  token,
                  type: "follow_up_confirm",
                  patient_id: patient._id,
                  related_id: followUp._id,
                  related_model: "FollowUp",
                  slot_data: {
                    date: slot.date,
                    time: slot.time,
                    doctor_id: aiConsultation.doctor_id
                  },
                  status: "pending",
                  expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                });
                tokenIds.push(tokenRecord._id);
                slotsWithTokens.push({
                  ...slot,
                  token
                });
              }
              const emailResult = await sendFollowUpSlots(patientUser.email, {
                patientName: patientUser.name,
                slots: slotsWithTokens,
                preferredDate: new Date(finalData.follow_up_date),
                fromPreferredDate: emailFromPreferredDate,
                doctorName: doctorUser?.name || "Doctor",
                clinicName: clinic?.name || "Clinic",
                frontendUrl: "https://main.dvf5kv20zyoy6.amplifyapp.com"
              });
              if (emailResult.success) {
                followUpEmailSent = true;
                await FollowUp.findByIdAndUpdate(followUp._id, {
                  patient_notified_at: new Date(),
                  suggested_slots: slotsForEmail
                });
                console.log(`✅ Follow-up slots email sent to ${patientUser.email}`, `(next available: ${slotsForEmail[0]?.date?.toISOString().split("T")[0]}, ${slotsForEmail.length} slots)`);
              } else {
                await ConfirmationToken.updateMany({
                  _id: {
                    $in: tokenIds
                  },
                  status: "pending"
                }, {
                  status: "expired"
                });
                followUpEmailError = emailResult.error;
                console.error("Follow-up default slots email send failed:", emailResult.error);
              }
            }
          } else {
            // Slots available — create confirmation tokens and send email
            const slotsWithTokens = [];
            const tokenIds = [];
            for (const slot of allSlots) {
              const token = uuidv4();
              const tokenRecord = await ConfirmationToken.create({
                token,
                type: "follow_up_confirm",
                patient_id: patient._id,
                related_id: followUp._id,
                related_model: "FollowUp",
                slot_data: {
                  date: slot.date,
                  time: slot.time,
                  doctor_id: aiConsultation.doctor_id
                },
                status: "pending"
              });
              tokenIds.push(tokenRecord._id);
              slotsWithTokens.push({
                ...slot,
                token
              });
            }
            const emailResult = await sendFollowUpSlots(patientUser.email, {
              patientName: patientUser.name,
              slots: slotsWithTokens,
              preferredDate: new Date(finalData.follow_up_date),
              fromPreferredDate: slotResult.fromPreferredDate,
              doctorName: doctorUser?.name || "Doctor",
              clinicName: clinic?.name || "Clinic",
              frontendUrl: "https://main.dvf5kv20zyoy6.amplifyapp.com"
            });
            if (emailResult.success) {
              followUpEmailSent = true;
              await FollowUp.findByIdAndUpdate(followUp._id, {
                patient_notified_at: new Date(),
                suggested_slots: allSlots
              });
            } else {
              await ConfirmationToken.updateMany({
                _id: {
                  $in: tokenIds
                },
                status: "pending"
              }, {
                status: "expired"
              });
              followUpEmailError = emailResult.error;
              console.error("Follow-up email send failed:", emailResult.error);
            }
          }
        }
      } catch (followUpErr) {
        followUpEmailError = followUpErr.message;
        console.error("Follow-up processing error:", followUpErr.message);
      }
    }

    // Mark AI consultation as saved
    aiConsultation.status = "saved";
    aiConsultation.saved_at = new Date();
    await aiConsultation.save();

    // Send email to patient only if explicitly requested
    const notifyPatient = req.query.notify_patient === "true" || req.body.notify_patient === true;
    if (notifyPatient) {
      try {
        const patient = await Patient.findById(aiConsultation.patient_id);
        const patientUser = patient ? await User.findById(patient.user_id) : null;
        const doctor = await Doctor.findById(aiConsultation.doctor_id);
        const doctorUser = doctor ? await User.findById(doctor.user_id) : null;
        const clinic = await Clinic.findById(aiConsultation.clinic_id);
        if (patientUser?.email) {
          const appointment = await Appointment.findById(aiConsultation.appointment_id);
          await sendConsultationSummary(patientUser.email, {
            patientName: patientUser.name,
            summary: finalData.doctor_summary || finalData.summary,
            prescription: validMedications || [],
            followUpDate: finalData.follow_up_date || null,
            doctorName: doctorUser?.name || "Doctor",
            clinicName: clinic?.name || "Clinic",
            appointmentDate: appointment?.appointment_date?.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric"
            }) || "N/A"
          });
        }
      } catch (emailErr) {
        console.error("Email sending failed (non-blocking):", emailErr.message);
      }
    }
    res.json({
      message: notifyPatient ? "Consultation saved & patient notified" : "Consultation saved successfully",
      consultationNote,
      prescription,
      followUpCreated: !!finalData.follow_up_date,
      followUpEmailSent,
      followUpEmailError,
      patientNotified: notifyPatient
    });
  } catch (error) {
    console.error("AI save error:", error);
    res.status(500).json({
      message: error.message
    });
  }
});
exports.deleteById = asyncHandler(async (req, res, next) => {
  try {
    const aiConsultation = await AIConsultation.findById(req.params.id);
    if (!aiConsultation) {
      return res.status(404).json({
        message: "AI consultation not found"
      });
    }
    if (aiConsultation.status === "saved") {
      return res.status(400).json({
        message: "Cannot delete a saved consultation"
      });
    }

    // Delete associated recording too
    if (aiConsultation.recording_id) {
      await AudioRecording.findByIdAndDelete(aiConsultation.recording_id);
    }
    await AIConsultation.findByIdAndDelete(req.params.id);
    res.json({
      message: "AI consultation discarded"
    });
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
});