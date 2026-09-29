const ConfirmationToken = require('../models/appointment/ConfirmationToken');
const FollowUp = require('../models/appointment/FollowUp');
const WaitingQueue = require('../models/patient/WaitingQueue');
const Appointment = require('../models/appointment/Appointment');
const Patient = require('../models/patient/Patient');
const Doctor = require('../models/clinic/Doctor');
const Clinic = require('../models/clinic/Clinic');
const User = require('../models/user/User');
const { sendAppointmentEmail } = require("../services/reminderService");
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

function getAppointmentDayRange(dateInput) {
  const dayStart = new Date(dateInput);
  dayStart.setUTCHours(0, 0, 0, 0);

  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  return { dayStart, dayEnd };
}

exports.getTokenDetails = asyncHandler(async (req, res, next) => {
  const tokenRecord = await ConfirmationToken.findOne({
    token: req.params.token,
  }).populate("patient_id");

  if (!tokenRecord) {
    return next(new AppError("Token not found", 404));
  }

  if (tokenRecord.status === "confirmed") {
    return res
      .status(400)
      .json({ message: "Already confirmed", status: "confirmed" });
  }

  if (
    tokenRecord.status === "expired" ||
    tokenRecord.expires_at < new Date()
  ) {
    tokenRecord.status = "expired";
    await tokenRecord.save();
    return res
      .status(410)
      .json({ message: "Token expired", status: "expired" });
  }

  // Get doctor and clinic info
  const doctor = await Doctor.findById(tokenRecord.slot_data.doctor_id);
  const doctorUser = doctor ? await User.findById(doctor.user_id) : null;
  const clinic = doctor ? await Clinic.findById(doctor.clinic_id) : null;
  const patient = tokenRecord.patient_id;
  const patientUser = patient ? await User.findById(patient.user_id) : null;

  res.json({
    type: tokenRecord.type,
    status: tokenRecord.status,
    slot: {
      date: tokenRecord.slot_data.date,
      time: tokenRecord.slot_data.time,
    },
    doctor: {
      name: doctorUser?.name || "Doctor",
      specialization: doctor?.specialization,
    },
    clinic: {
      name: clinic?.name,
    },
    patient: {
      name: patientUser?.name,
    },
    expires_at: tokenRecord.expires_at,
  });
});

exports.confirmToken = asyncHandler(async (req, res, next) => {
  const tokenRecord = await ConfirmationToken.findOne({
    token: req.params.token,
  });

  if (!tokenRecord) {
    return next(new AppError("Token not found", 404));
  }

  if (tokenRecord.status === "confirmed") {
    return next(new AppError("Already confirmed", 400));
  }

  if (
    tokenRecord.status === "expired" ||
    tokenRecord.expires_at < new Date()
  ) {
    tokenRecord.status = "expired";
    await tokenRecord.save();
    return next(new AppError("Token expired", 410));
  }

  // Get references
  const doctor = await Doctor.findById(tokenRecord.slot_data.doctor_id);
  if (!doctor) {
    return next(new AppError("Doctor not found", 404));
  }

  const { dayStart, dayEnd } = getAppointmentDayRange(
    tokenRecord.slot_data.date,
  );

  // Check if the slot is still available (prevent double booking)
  const existing = await Appointment.findOne({
    doctor_id: doctor._id,
    appointment_date: { $gte: dayStart, $lt: dayEnd },
    appointment_time: tokenRecord.slot_data.time,
    status: { $nin: ["cancelled", "no_show", "rescheduled"] },
  });

  if (existing) {
    return next(new AppError("Slot is no longer available", 409));
  }

  // Determine visit type and reason based on token type
  const isFollowUp = tokenRecord.type === "follow_up_confirm";
  const isWaitlist = tokenRecord.type === "waitlist_confirm";
  const isSlotRelease = tokenRecord.type === "slot_release_confirm";

  let laterAppointmentCancelled = null;
  if (isSlotRelease) {
    const laterAppt = await Appointment.findById(tokenRecord.related_id);
    if (laterAppt && !["cancelled", "completed"].includes(laterAppt.status)) {
      laterAppt.status = "cancelled";
      laterAppt.cancelled_reason = "Patient moved to earlier available slot";
      laterAppt.cancelled_at = new Date();
      await laterAppt.save();
      laterAppointmentCancelled = laterAppt;
    }
  }

  // Create the appointment
  const appointment = await Appointment.create({
    patient_id: tokenRecord.patient_id,
    doctor_id: doctor._id,
    clinic_id: doctor.clinic_id,
    appointment_date: tokenRecord.slot_data.date,
    appointment_time: tokenRecord.slot_data.time,
    duration_minutes: 30,
    status: "booked",
    booking_source: "online",
    reason_for_visit: isFollowUp
      ? "Follow-up visit"
      : isSlotRelease
        ? "Appointment moved to earlier available slot"
        : "Appointment from waiting list",
    visit_type: isFollowUp ? "follow_up" : "first_visit",
    from_waitlist: isWaitlist,
  });

  // Update the related record
  if (isFollowUp) {
    const existingFollowUp = await FollowUp.findById(tokenRecord.related_id);
    if (
      existingFollowUp?.status === "scheduled" &&
      existingFollowUp?.new_appointment_id
    ) {
      const oldAppt = await Appointment.findById(
        existingFollowUp.new_appointment_id,
      );
      if (
        oldAppt &&
        !["cancelled", "completed", "no_show"].includes(oldAppt.status)
      ) {
        oldAppt.status = "cancelled";
        oldAppt.cancelled_reason = "Rescheduled to earlier follow-up slot";
        oldAppt.cancelled_at = new Date();
        await oldAppt.save();
      }
    }

    await FollowUp.findByIdAndUpdate(tokenRecord.related_id, {
      status: "scheduled",
      appointment_id: appointment._id,
      new_appointment_id: appointment._id,
    });
  } else if (isWaitlist) {
    await WaitingQueue.findByIdAndUpdate(tokenRecord.related_id, {
      status: "confirmed",
      confirmed_at: new Date(),
    });
  }

  // Mark token as confirmed
  tokenRecord.status = "confirmed";
  await tokenRecord.save();

  // Expire other tokens
  if (isSlotRelease) {
    await ConfirmationToken.updateMany(
      {
        type: "slot_release_confirm",
        "slot_data.date": { $gte: dayStart, $lt: dayEnd },
        "slot_data.time": tokenRecord.slot_data.time,
        "slot_data.doctor_id": tokenRecord.slot_data.doctor_id,
        _id: { $ne: tokenRecord._id },
        status: "pending",
      },
      { status: "expired" },
    );
  } else {
    await ConfirmationToken.updateMany(
      {
        related_id: tokenRecord.related_id,
        _id: { $ne: tokenRecord._id },
        status: "pending",
      },
      { status: "expired" },
    );
  }

  // Send confirmation email
  (async () => {
    try {
      const patient = await Patient.findById(tokenRecord.patient_id).populate(
        "user_id",
      );
      const doctorInfo = await Doctor.findById(doctor._id);
      const doctorUser = doctorInfo
        ? await User.findById(doctorInfo.user_id)
        : null;
      const clinic = await Clinic.findById(doctor.clinic_id);

      if (patient?.user_id?.email) {
        const appointmentDate = new Date(appointment.appointment_date);
        const formattedDate = appointmentDate.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        });

        const html = `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
            <div style="background:#4CAF50;color:white;padding:20px;border-radius:8px 8px 0 0">
              <h2 style="margin:0">✓ Appointment Confirmed</h2>
              <p style="margin:5px 0 0">${clinic?.name || "Healthcare Portal"}</p>
            </div>
            <div style="border:1px solid #e0e0e0;border-top:none;padding:20px;border-radius:0 0 8px 8px">
              <p>Dear ${patient.user_id.name},</p>
              <p>Your appointment has been successfully confirmed!</p>
              <div style="background:#f5f5f5;padding:15px;border-left:4px solid #4CAF50;margin:15px 0">
                <p style="margin:8px 0"><strong>Appointment Details:</strong></p>
                <p style="margin:5px 0">📅 <strong>Date:</strong> ${formattedDate}</p>
                <p style="margin:5px 0">🕐 <strong>Time:</strong> ${appointment.appointment_time}</p>
                <p style="margin:5px 0">👨‍⚕️ <strong>Doctor:</strong> Dr. ${doctorUser?.name || "Doctor"}</p>
                <p style="margin:5px 0">🏥 <strong>Clinic:</strong> ${clinic?.name || "Healthcare Portal"}</p>
              </div>
              <p>Please arrive 10 minutes before your appointment time. If you need to reschedule or cancel, please contact the clinic at least 24 hours in advance.</p>
              <p style="color:#666;font-size:13px;margin-top:20px">This is an automated confirmation. If you did not book this appointment, please contact the clinic immediately.</p>
            </div>
          </div>
        `;

        await sendAppointmentEmail({
          to: patient.user_id.email,
          subject: `Appointment Confirmed — ${formattedDate} at ${appointment.appointment_time} — Dr. ${doctorUser?.name || "Doctor"}`,
          html,
        });
      }
    } catch (emailErr) {
      console.error(
        "Confirmation email failed (non-blocking):",
        emailErr.message,
      );
    }
  })();

  res.json({
    message: "Appointment confirmed successfully",
    appointment: {
      _id: appointment._id,
      date: appointment.appointment_date,
      time: appointment.appointment_time,
      status: appointment.status,
    },
  });
});
