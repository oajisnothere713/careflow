const { v4: uuidv4 } = require("uuid");
const FollowUp = require('../models/appointment/FollowUp');
const Patient = require('../models/patient/Patient');
const Doctor = require('../models/clinic/Doctor');
const Appointment = require('../models/appointment/Appointment');
const Reminder = require('../models/appointment/Reminder');
const ConfirmationToken = require('../models/appointment/ConfirmationToken');
const User = require('../models/user/User');
const { sendFollowUpSlots } = require("../services/emailService");
const {
  getAvailableSlots,
  getNextAvailableDateSlots,
} = require("../services/cronService");

const config = require("../config/env");
const FRONTEND_URL = config.frontendUrl;
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

exports.createFollowUp = asyncHandler(async (req, res, next) => {
  const {
    patient_id,
    doctor_id,
    follow_up_date,
    priority,
    notes,
    instructions,
  } = req.body;
  const consultationNoteId =
    req.body.consultation_note_id || req.body.consultation_id;
  const purpose = req.body.purpose || req.body.reason;

  if (
    !patient_id ||
    !doctor_id ||
    !consultationNoteId ||
    !follow_up_date ||
    !purpose
  ) {
    return res.status(400).json({
      message:
        "patient_id, doctor_id, consultation_note_id, follow_up_date, and purpose (or reason) are required",
    });
  }

  // Get clinic_id
  const doctor = await Doctor.findById(doctor_id);
  if (!doctor) {
    return res.status(404).json({ message: "Doctor not found" });
  }

  // Create follow-up record
  const followUp = new FollowUp({
    patient_id,
    doctor_id,
    consultation_note_id: consultationNoteId,
    clinic_id: doctor.clinic_id,
    follow_up_date,
    purpose,
    instructions,
    priority: priority || "routine",
    notes,
    created_by: doctor.user_id,
    status: "pending",
  });

  await followUp.save();

  // Populate for response
  await followUp.populate("patient_id");
  await followUp.populate("doctor_id");
  await followUp.populate("consultation_note_id");

  // Scenario 1: If no slots exist on the requested follow-up date, immediately email
  // the patient with ALL slots on the single next available date.
  // (Non-blocking — response is sent regardless of email outcome)
  (async () => {
    try {
      const patientUser = await User.findById(followUp.patient_id?.user_id);
      if (!patientUser?.email) return;

      const doctorUser = await User.findById(doctor.user_id);
      const Clinic = require('../models/clinic/Clinic');
      const clinic = await Clinic.findById(doctor.clinic_id);

      const preferredCheck = await getAvailableSlots(
        doctor._id,
        follow_up_date,
        1,
      );

      if (preferredCheck.fromPreferredDate) return;

      const { slots: slotsToOffer } = await getNextAvailableDateSlots(
        doctor._id,
        follow_up_date,
      );

      if (!slotsToOffer || slotsToOffer.length === 0) {
        console.warn(
          `  ⚠️ Follow-up ${followUp._id}: no available slots in next 30 days — skipping immediate notification`,
        );
        return;
      }

      const tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const slotsWithTokens = [];
      const tokenIds = [];

      for (const slot of slotsToOffer) {
        const token = uuidv4();
        const tokenRecord = await ConfirmationToken.create({
          token,
          type: "follow_up_confirm",
          patient_id: followUp.patient_id._id,
          related_id: followUp._id,
          related_model: "FollowUp",
          slot_data: {
            date: slot.date,
            time: slot.time,
            doctor_id: doctor._id,
          },
          status: "pending",
          expires_at: tokenExpiry,
        });
        tokenIds.push(tokenRecord._id);
        slotsWithTokens.push({ ...slot, token });
      }

      const emailResult = await sendFollowUpSlots(patientUser.email, {
        patientName: patientUser.name,
        slots: slotsWithTokens,
        preferredDate: follow_up_date,
        fromPreferredDate: false,
        doctorName: doctorUser?.name || "Your Doctor",
        clinicName: clinic?.name || "Clinic",
        frontendUrl: FRONTEND_URL,
      });

      if (emailResult.success) {
        followUp.patient_notified_at = new Date();
        followUp.suggested_slots = slotsToOffer;
        await followUp.save();
        console.log(
          `  ✅ Immediate follow-up notification sent to ${patientUser.email}`,
          `(next available: ${slotsToOffer[0]?.date?.toISOString().split("T")[0]}, ${slotsToOffer.length} slots)`,
        );
      } else {
        await ConfirmationToken.updateMany(
          { _id: { $in: tokenIds }, status: "pending" },
          { status: "expired" },
        );
        console.error(
          `  ❌ Immediate follow-up notification failed for ${patientUser.email}:`,
          emailResult.error,
        );
      }
    } catch (notifyErr) {
      console.error(
        `  ❌ Error sending immediate follow-up notification for followUp ${followUp._id}:`,
        notifyErr.message,
      );
    }
  })();

  res.status(201).json({
    message: "Follow-up created successfully",
    followUp,
  });
});

exports.getMyFollowUps = asyncHandler(async (req, res, next) => {
  const { status, page = 1, limit = 10 } = req.query;

  const patient = await Patient.findOne({ user_id: req.user.userId });
  if (!patient) {
    return res.status(404).json({
      message: "Patient profile not found",
    });
  }

  const query = { patient_id: patient._id };
  if (status) {
    query.status = status;
  }

  const followUps = await FollowUp.find(query)
    .populate({
      path: "doctor_id",
      populate: { path: "user_id", select: "name" },
    })
    .populate("consultation_note_id")
    .populate("appointment_id")
    .populate("clinic_id", "name")
    .sort({ follow_up_date: 1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

  const total = await FollowUp.countDocuments(query);

  res.json({
    followUps,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      totalFollowUps: total,
      limit: parseInt(limit),
    },
  });
});

exports.getDoctorFollowUps = asyncHandler(async (req, res, next) => {
  const { status, page = 1, limit = 10 } = req.query;

  const doctor = await Doctor.findOne({ user_id: req.user.userId });
  if (!doctor) {
    return res.status(404).json({
      message: "Doctor profile not found",
    });
  }

  const query = { doctor_id: doctor._id };
  if (status) {
    query.status = status;
  }

  const followUps = await FollowUp.find(query)
    .populate({
      path: "patient_id",
      populate: { path: "user_id", select: "name email phone" },
    })
    .populate("consultation_note_id")
    .populate("appointment_id")
    .sort({ follow_up_date: 1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

  const total = await FollowUp.countDocuments(query);

  res.json({
    followUps,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      totalFollowUps: total,
      limit: parseInt(limit),
    },
  });
});

exports.scheduleAppointment = asyncHandler(async (req, res, next) => {
  const { appointment_date, appointment_time, invoice_id } = req.body;

  if (!appointment_date || !appointment_time) {
    return res.status(400).json({
      message: "appointment_date and appointment_time are required",
    });
  }

  const patient = await Patient.findOne({ user_id: req.user.userId });
  if (!patient) {
    return res.status(404).json({
      message: "Patient profile not found",
    });
  }

  const followUp = await FollowUp.findById(req.params.id);
  if (!followUp) {
    return res.status(404).json({ message: "Follow-up not found" });
  }

  if (followUp.patient_id.toString() !== patient._id.toString()) {
    return res.status(403).json({
      message: "You can only book appointments for your own follow-ups",
    });
  }

  if (followUp.status === "scheduled") {
    return res
      .status(400)
      .json({ message: "Follow-up already has an appointment scheduled" });
  }

  let paymentStatus = "pending";
  let isPaid = false;
  if (invoice_id) {
    const Invoice = require('../models/billing/Invoice');
    const invoice = await Invoice.findById(invoice_id);
    if (invoice && invoice.status === "paid") {
      paymentStatus = "paid";
      isPaid = true;
    }
  }

  const appointment = new Appointment({
    patient_id: patient._id,
    doctor_id: followUp.doctor_id,
    clinic_id: followUp.clinic_id,
    appointment_date,
    appointment_time,
    reason_for_visit: followUp.reason,
    visit_type: "follow_up",
    priority: followUp.priority,
    status: "booked",
    booking_source: "online",
    notes: `Follow-up appointment. Reference: ${followUp._id}`,
    payment_status: paymentStatus,
    invoice_id: invoice_id || null,
    is_paid: isPaid,
  });

  await appointment.save();

  followUp.status = "scheduled";
  followUp.appointment_id = appointment._id;
  await followUp.save();

  await appointment.populate("doctor_id");
  await appointment.populate("clinic_id", "name");

  res.status(201).json({
    message: "Follow-up appointment scheduled successfully",
    appointment,
    followUp,
  });
});

exports.updateFollowUpStatus = asyncHandler(async (req, res, next) => {
  const { status, notes } = req.body;

  const updateData = {};
  if (status) updateData.status = status;
  if (notes) updateData.notes = notes;

  const followUp = await FollowUp.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true },
  )
    .populate("patient_id")
    .populate("doctor_id")
    .populate("appointment_id");

  if (!followUp) {
    return res.status(404).json({ message: "Follow-up not found" });
  }

  res.json({
    message: "Follow-up updated successfully",
    followUp,
  });
});

exports.sendReminder = asyncHandler(async (req, res, next) => {
  const followUp = await FollowUp.findById(req.params.id)
    .populate({
      path: "patient_id",
      populate: { path: "user_id", select: "name email" },
    })
    .populate({
      path: "doctor_id",
      populate: { path: "user_id", select: "name" },
    });

  if (!followUp) {
    return res.status(404).json({ message: "Follow-up not found" });
  }

  const reminder = new Reminder({
    user_id: followUp.patient_id.user_id._id,
    patient_id: followUp.patient_id._id,
    clinic_id: followUp.clinic_id,
    related_id: followUp.appointment_id,
    related_model: "Appointment",
    type: "follow_up",
    scheduled_at: new Date(),
    channel: "email",
    subject: "Follow-up Appointment Reminder",
    message: `Reminder: You have a follow-up recommended with Dr. ${followUp.doctor_id.user_id.name} on ${followUp.follow_up_date.toDateString()}. Reason: ${followUp.reason}`,
    status: "scheduled",
  });

  await reminder.save();

  followUp.reminder_sent = true;
  followUp.reminder_sent_at = new Date();
  await followUp.save();

  const { getTransporter } = require("../services/emailService");
  const transporter = getTransporter();

  const mailOptions = {
    from: config.email.user,
    to: followUp.patient_id.user_id.email,
    subject: "Follow-up Appointment Reminder",
    html: `
    <h2>Follow-up Reminder</h2>
    <p>Dear ${followUp.patient_id.user_id.name},</p>
    <p>This is a reminder for your follow-up appointment with <strong>Dr. ${followUp.doctor_id.user_id.name}</strong>.</p>
    <p><strong>Follow-up Date:</strong> ${followUp.follow_up_date.toDateString()}</p>
    <p><strong>Reason:</strong> ${followUp.reason}</p>
    <p>Please book your appointment at your earliest convenience.</p>
    <p>Best regards,<br>Healthcare Portal Team</p>
  `,
  };

  try {
    await transporter.sendMail(mailOptions);
    reminder.status = "sent";
    reminder.sent_at = new Date();
    await reminder.save();
  } catch (emailError) {
    console.error("Email send error:", emailError);
    reminder.status = "failed";
    reminder.error_message = emailError.message;
    await reminder.save();
  }

  res.json({
    message: "Follow-up reminder sent successfully",
    reminder,
  });
});

exports.getClinicFollowUps = asyncHandler(async (req, res, next) => {
  const { clinic_id, status, page = 1, limit = 20 } = req.query;

  if (!clinic_id) {
    return res
      .status(400)
      .json({ message: "clinic_id query param is required" });
  }

  const query = { clinic_id };
  if (status) query.status = status;

  const followUps = await FollowUp.find(query)
    .populate({
      path: "patient_id",
      populate: { path: "user_id", select: "name email phone" },
    })
    .populate({
      path: "doctor_id",
      populate: { path: "user_id", select: "name" },
    })
    .populate("appointment_id", "appointment_date appointment_time status")
    .populate(
      "new_appointment_id",
      "appointment_date appointment_time status",
    )
    .sort({ follow_up_date: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

  const total = await FollowUp.countDocuments(query);

  res.json({
    followUps,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      totalFollowUps: total,
      limit: parseInt(limit),
    },
  });
});
