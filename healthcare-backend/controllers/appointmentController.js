const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const Appointment = require("../models/appointment/Appointment");
const DoctorSlot = require("../models/clinic/DoctorSlot");
const Patient = require("../models/patient/Patient");
const Doctor = require("../models/clinic/Doctor");
const Reminder = require("../models/appointment/Reminder");
const MedicalHistory = require("../models/patient/MedicalHistory");
const WaitingQueue = require("../models/patient/WaitingQueue");
const User = require("../models/user/User");
const Clinic = require("../models/clinic/Clinic");
const {
  verifyToken,
  checkRole
} = require("../middleware/auth");
const {
  transformByRole,
  transformAppointments
} = require("../utils/appointmentTransformer");
const {
  scheduleAppointmentReminder,
  scheduleDoctorAppointmentReminder,
  sendAppointmentEmail,
  scheduleReminder
} = require("../services/reminderService");
const ACTIVE_APPOINTMENT_STATUSES = {
  $nin: ["cancelled", "no_show", "rescheduled"]
};
const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
function getAppointmentDayRange(dateInput) {
  const dayStart = new Date(dateInput);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
  return {
    dayStart,
    dayEnd
  };
}
function expandDoctorSlotTimes(slots) {
  const availableTimes = new Set();
  for (const slot of slots) {
    const [startHour, startMin] = slot.start_time.split(":").map(Number);
    const [endHour, endMin] = slot.end_time.split(":").map(Number);
    const slotDuration = slot.slot_duration || 30;
    let currentHour = startHour;
    let currentMin = startMin;
    while (currentHour < endHour || currentHour === endHour && currentMin < endMin) {
      availableTimes.add(`${String(currentHour).padStart(2, "0")}:${String(currentMin).padStart(2, "0")}`);
      currentMin += slotDuration;
      if (currentMin >= 60) {
        currentHour += Math.floor(currentMin / 60);
        currentMin = currentMin % 60;
      }
    }
  }
  return Array.from(availableTimes).sort();
}

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
exports.postIndex = asyncHandler(async (req, res, next) => {
  try {
    const {
      patient_id,
      doctor_id,
      clinic_id,
      appointment_date,
      appointment_time,
      reason_for_visit,
      symptoms,
      visit_type,
      priority
    } = req.body;

    // Validation: required fields
    if (!doctor_id || !clinic_id || !appointment_date || !appointment_time || !reason_for_visit) {
      return res.status(400).json({
        message: "Missing required fields: doctor_id, clinic_id, appointment_date, appointment_time, reason_for_visit"
      });
    }

    // Validate appointment date is within 6 months from today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxBookingDate = new Date(today);
    maxBookingDate.setMonth(maxBookingDate.getMonth() + 6);
    const requestedDate = new Date(appointment_date);
    requestedDate.setHours(0, 0, 0, 0);
    if (requestedDate > maxBookingDate) {
      return res.status(400).json({
        message: "Appointments can only be booked up to 6 months in advance"
      });
    }

    // Handle patient_id resolution
    let finalPatientId = patient_id;

    // If patient is booking for themselves, auto-detect from user token
    if (req.user.role === "patient") {
      if (!patient_id) {
        // Patient didn't provide patient_id, auto-fetch their patient record from user_id
        const patientRecord = await Patient.findOne({
          user_id: req.user.userId
        });
        if (!patientRecord) {
          return res.status(404).json({
            message: "Patient profile not found. Please complete your onboarding first."
          });
        }
        finalPatientId = patientRecord._id;
      } else {
        // Patient provided patient_id, it might be Patient._id or User._id, try to resolve it
        let resolvedPatient = await Patient.findById(patient_id);
        if (!resolvedPatient) {
          // Maybe they passed their User._id instead of Patient._id
          resolvedPatient = await Patient.findOne({
            user_id: patient_id
          });
          if (!resolvedPatient) {
            return res.status(404).json({
              message: "Patient profile not found. The provided ID does not match a patient record."
            });
          }
          finalPatientId = resolvedPatient._id;
        } else {
          finalPatientId = resolvedPatient._id;
        }

        // Verify patient is booking for themselves
        if (resolvedPatient.user_id.toString() !== req.user.userId.toString()) {
          return res.status(403).json({
            message: "You can only book appointments for yourself"
          });
        }
      }
    } else if (!patient_id) {
      // Non-patient users (staff, doctor, admin) must provide patient_id
      return res.status(400).json({
        message: "patient_id is required"
      });
    } else {
      finalPatientId = patient_id;
    }

    // Verify patient exists
    const patient = await Patient.findById(finalPatientId);
    if (!patient) {
      return res.status(404).json({
        message: "Patient not found"
      });
    }

    // Verify doctor exists and is available
    const doctor = await Doctor.findById(doctor_id);
    if (!doctor) {
      return res.status(404).json({
        message: "Doctor not found"
      });
    }
    if (doctor.availability_status !== "available") {
      return res.status(400).json({
        message: "Doctor is not available"
      });
    }

    // Check for conflicting appointments
    const {
      dayStart,
      dayEnd
    } = getAppointmentDayRange(appointment_date);
    const existingAppointment = await Appointment.findOne({
      doctor_id,
      appointment_date: {
        $gte: dayStart,
        $lt: dayEnd
      },
      appointment_time,
      status: ACTIVE_APPOINTMENT_STATUSES
    });
    if (existingAppointment) {
      return res.status(409).json({
        message: "This appointment slot is already booked. Please select a different time slot."
      });
    }

    // For patient bookings, verify payment is made for consultation fee
    let paymentStatus = "pending";
    let isPaid = false;
    let invoiceId = null;
    if (req.user.role === "patient") {
      // Check if patient has already paid for this appointment
      const Invoice = require("../models/Invoice");

      // Look for a paid invoice for this patient (priority: check paid first)
      const paidInvoice = await Invoice.findOne({
        patient_id: finalPatientId,
        status: "paid",
        line_items: {
          $elemMatch: {
            item_type: "consultation"
          }
        }
      }).sort({
        createdAt: -1
      });
      if (paidInvoice) {
        // Patient has paid, allow booking
        paymentStatus = "paid";
        isPaid = true;
        invoiceId = paidInvoice._id;
      } else {
        // Check for unpaid/pending invoices as backup
        const unpaidInvoice = await Invoice.findOne({
          patient_id: finalPatientId,
          status: {
            $in: ["pending", "partially_paid"]
          },
          line_items: {
            $elemMatch: {
              item_type: "consultation"
            }
          }
        }).sort({
          createdAt: -1
        });
        if (!unpaidInvoice) {
          // No invoice found, patient must pay before booking
          return res.status(402).json({
            message: "Consultation fee payment required before booking appointment",
            action: "GENERATE_INVOICE",
            doctor_consultation_fee: doctor.consultation_fee,
            next_step: "Generate invoice and complete payment via POST /api/billing/invoices/consultation"
          });
        } else {
          // Unpaid invoice exists, allow booking but mark status
          paymentStatus = unpaidInvoice.status;
          invoiceId = unpaidInvoice._id;
        }
      }
    }

    // Determine booking source
    const booking_source = req.user.role === "patient" ? "online" : "staff";

    // Create appointment
    const appointment = new Appointment({
      patient_id: finalPatientId,
      doctor_id,
      clinic_id,
      appointment_date,
      appointment_time,
      reason_for_visit,
      symptoms: symptoms || [],
      visit_type: visit_type || "first_visit",
      priority: priority || "normal",
      booking_source,
      // booked_by skipped for MVP demo
      status: "booked",
      payment_status: paymentStatus,
      invoice_id: invoiceId,
      is_paid: isPaid
    });
    await appointment.save();

    // Populate appointment with related data
    await appointment.populate({
      path: "patient_id",
      populate: {
        path: "user_id",
        select: "name email phone"
      }
    });
    await appointment.populate({
      path: "doctor_id",
      populate: {
        path: "user_id",
        select: "name email phone"
      }
    });
    await appointment.populate("clinic_id", "name address contact");

    // Immediate booking emails (non-blocking; safe if transporter not configured)
    const patientEmail = appointment?.patient_id?.user_id?.email;
    const patientName = appointment?.patient_id?.user_id?.name || "Patient";
    const doctorEmail = appointment?.doctor_id?.user_id?.email;
    const doctorName = appointment?.doctor_id?.user_id?.name || "Doctor";
    const clinicName = appointment?.clinic_id?.name || "your clinic";
    if (patientEmail) {
      sendAppointmentEmail({
        to: patientEmail,
        subject: "Appointment Confirmation",
        html: `
          <p>Hi ${patientName},</p>
          <p>Your appointment is booked with Dr. ${doctorName} on ${appointment_date} at ${appointment_time}.</p>
          <p>Clinic: ${clinicName}</p>
          <p>Please arrive 10 minutes early.</p>
        `
      }).catch(err => console.error("Error sending patient confirmation email:", err?.message || err));
    }
    if (doctorEmail) {
      sendAppointmentEmail({
        to: doctorEmail,
        subject: "New Appointment Booked",
        html: `
          <p>Hi Dr. ${doctorName},</p>
          <p>You have a new appointment on ${appointment_date} at ${appointment_time}.</p>
          <p>Patient: ${patientName}</p>
          <p>Clinic: ${clinicName}</p>
        `
      }).catch(err => console.error("Error sending doctor notification email:", err?.message || err));
    }

    // Schedule reminders 24 hours before (patient + doctor) - non-blocking
    scheduleAppointmentReminder(appointment).catch(err => console.error("Error scheduling patient reminder:", err?.message || err));
    scheduleDoctorAppointmentReminder(appointment).catch(err => console.error("Error scheduling doctor reminder:", err?.message || err));

    // Transform response based on user role
    const transformedAppointment = transformByRole(appointment, req.user.role);
    res.status(201).json({
      message: "Appointment booked successfully",
      appointment: transformedAppointment
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "This appointment slot has just been booked by another patient. Please select a different time slot."
      });
    }
    console.error("Book appointment error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
});
exports.getIndex = asyncHandler(async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      date,
      date_from,
      date_to,
      doctor_id,
      patient_id,
      clinic_id
    } = req.query;
    let query = {};

    // Role-based filtering
    if (req.user.role === "patient") {
      const patient = await Patient.findOne({
        user_id: req.user.userId
      });
      if (patient) {
        query.patient_id = patient._id;
      }
    } else if (req.user.role === "doctor") {
      const doctor = await Doctor.findOne({
        user_id: req.user.userId
      });
      if (doctor) {
        query.doctor_id = doctor._id;
      }
    } else if (req.user.role === "staff") {
      query.clinic_id = req.user.clinicId;
    }
    // Admin can see all

    // Apply filters
    if (status) {
      // Treat "booked" as matching both booked and confirmed (both are active appointments)
      query.status = status === "booked" ? {
        $in: ["booked", "confirmed"]
      } : status;
    }
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      query.appointment_date = {
        $gte: startDate,
        $lte: endDate
      };
    } else if (date_from || date_to) {
      query.appointment_date = {};
      if (date_from) {
        const from = new Date(date_from);
        from.setUTCHours(0, 0, 0, 0);
        query.appointment_date.$gte = from;
      }
      if (date_to) {
        const to = new Date(date_to);
        to.setUTCHours(23, 59, 59, 999);
        query.appointment_date.$lte = to;
      }
    }
    if (doctor_id) query.doctor_id = doctor_id;
    if (patient_id) query.patient_id = patient_id;
    if (clinic_id) query.clinic_id = clinic_id;
    const appointments = await Appointment.find(query).populate({
      path: "patient_id",
      populate: {
        path: "user_id",
        select: "name email phone"
      }
    }).populate({
      path: "doctor_id",
      populate: {
        path: "user_id",
        select: "name email phone"
      }
    }).populate("clinic_id", "name address contact").limit(limit * 1).skip((page - 1) * limit).sort({
      appointment_date: 1,
      appointment_time: 1
    });
    const count = await Appointment.countDocuments(query);

    // Transform appointments based on user role
    const transformedAppointments = transformAppointments(appointments, req.user.role);
    res.json({
      appointments: transformedAppointments,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      total: count
    });
  } catch (error) {
    console.error("Get appointments error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
});
exports.getById = asyncHandler(async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id).populate({
      path: "patient_id",
      populate: {
        path: "user_id",
        select: "name email phone"
      }
    }).populate({
      path: "doctor_id",
      populate: {
        path: "user_id",
        select: "name email phone"
      }
    }).populate("clinic_id", "name address contact");
    if (!appointment) {
      return res.status(404).json({
        message: "Appointment not found"
      });
    }

    // For doctors, include patient's medical history
    if (req.user.role === "doctor" && appointment.patient_id) {
      const medicalHistory = await MedicalHistory.findOne({
        patient_id: appointment.patient_id._id
      });
      appointment.medical_history = medicalHistory;
    }

    // Transform response based on user role
    const transformedAppointment = transformByRole(appointment, req.user.role);
    res.json({
      appointment: transformedAppointment
    });
  } catch (error) {
    console.error("Get appointment error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
});
exports.getDoctorByDoctorIdAvailableSlots = asyncHandler(async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.doctorId);
    if (!doctor) {
      return res.status(404).json({
        message: "Doctor not found"
      });
    }

    // Parse start date and days window (use UTC to avoid timezone offset shifting the date)
    const startDate = req.query.date ? new Date(req.query.date) : new Date();
    startDate.setUTCHours(0, 0, 0, 0);
    const days = Math.min(Math.max(parseInt(req.query.days || "180", 10) || 180, 1), 180);
    const result = [];
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

    // Iterate through each day in the window
    for (let i = 0; i < days; i++) {
      const currentDate = new Date(startDate.getTime());
      currentDate.setUTCDate(startDate.getUTCDate() + i);
      const dayOfWeek = dayNames[currentDate.getUTCDay()];

      // Get doctor slots for this day of week
      const slots = await DoctorSlot.find({
        doctor_id: req.params.doctorId,
        day_of_week: dayOfWeek,
        is_active: true
      });

      // Skip days with no active slots
      if (slots.length === 0) {
        // No schedule defined, but still check for booked appointments so the
        // frontend can show them as red. Use the standard 09:00–19:00 hourly
        // grid as the full slot window.
        const {
          dayStart,
          dayEnd
        } = getAppointmentDayRange(currentDate);
        const bookedOnDay = await Appointment.find({
          doctor_id: req.params.doctorId,
          appointment_date: {
            $gte: dayStart,
            $lt: dayEnd
          },
          status: ACTIVE_APPOINTMENT_STATUSES
        }).select("appointment_time status");
        if (bookedOnDay.length > 0) {
          const bookedTimesSet = new Set(bookedOnDay.map(a => a.appointment_time));
          const fallbackAvailable = [];
          for (let h = 9; h < 19; h++) {
            const t = `${String(h).padStart(2, "0")}:00`;
            if (!bookedTimesSet.has(t)) fallbackAvailable.push(t);
          }
          result.push({
            date: currentDate.toISOString().split("T")[0],
            available_slots: fallbackAvailable,
            booked_slots: bookedOnDay.map(a => ({
              time: a.appointment_time,
              status: a.status
            })).sort((a, b) => a.time.localeCompare(b.time))
          });
        }
        continue;
      }

      // Get booked appointments for this date
      const {
        dayStart,
        dayEnd
      } = getAppointmentDayRange(currentDate);
      const bookedAppointments = await Appointment.find({
        doctor_id: req.params.doctorId,
        appointment_date: {
          $gte: dayStart,
          $lt: dayEnd
        },
        status: ACTIVE_APPOINTMENT_STATUSES
      }).select("appointment_time status");
      const bookedSlots = bookedAppointments.map(apt => ({
        time: apt.appointment_time,
        status: apt.status
      })).sort((a, b) => a.time.localeCompare(b.time));
      const bookedTimes = bookedAppointments.map(apt => apt.appointment_time);

      // Generate available slots for this day
      const availableSlots = [];
      for (const timeSlot of expandDoctorSlotTimes(slots)) {
        if (!bookedTimes.includes(timeSlot)) {
          availableSlots.push(timeSlot);
        }
      }
      result.push({
        date: currentDate.toISOString().split("T")[0],
        available_slots: availableSlots.sort(),
        booked_slots: bookedSlots
      });
    }
    if (result.length === 0) {
      return res.json({
        days: [],
        message: "No slots available in the selected window"
      });
    }
    res.json({
      days: result
    });
  } catch (error) {
    console.error("Get available slots error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
});
exports.putByIdReschedule = asyncHandler(async (req, res, next) => {
  try {
    const {
      appointment_date,
      appointment_time
    } = req.body;
    if (!appointment_date || !appointment_time) {
      return res.status(400).json({
        message: "New date and time are required"
      });
    }
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({
        message: "Appointment not found"
      });
    }

    // Check for conflicts
    const {
      dayStart,
      dayEnd
    } = getAppointmentDayRange(appointment_date);
    const existingAppointment = await Appointment.findOne({
      doctor_id: appointment.doctor_id,
      appointment_date: {
        $gte: dayStart,
        $lt: dayEnd
      },
      appointment_time,
      _id: {
        $ne: req.params.id
      },
      status: ACTIVE_APPOINTMENT_STATUSES
    });
    if (existingAppointment) {
      return res.status(400).json({
        message: "This time slot is already booked"
      });
    }

    // Create new appointment
    const newAppointment = new Appointment({
      ...appointment.toObject(),
      _id: undefined,
      appointment_date,
      appointment_time,
      status: "booked",
      rescheduled_from: appointment._id
      // booked_by skipped for MVP demo
    });
    await newAppointment.save();

    // Update old appointment
    appointment.status = "rescheduled";
    await appointment.save();

    // Cancel old reminder and schedule new one for rescheduled appointment
    await Reminder.deleteMany({
      related_id: appointment._id,
      type: "appointment",
      status: "scheduled"
    });
    const patient = await Patient.findById(appointment.patient_id);
    const appointmentDateTime = new Date(appointment_date);
    const [hours, minutes] = appointment_time.split(":");
    appointmentDateTime.setHours(parseInt(hours), parseInt(minutes));
    const reminderTime = new Date(appointmentDateTime.getTime() - 24 * 60 * 60 * 1000);
    if (reminderTime > new Date() && patient && patient.user_id) {
      // Schedule patient reminder (non-blocking)
      scheduleReminder({
        user_id: patient.user_id,
        patient_id: appointment.patient_id,
        clinic_id: appointment.clinic_id,
        type: "appointment",
        related_id: newAppointment._id,
        related_model: "Appointment",
        subject: "Appointment Reminder",
        message: `You have an appointment with Dr. tomorrow at ${appointment_time}. Please arrive 10 minutes early.`,
        channel: "email",
        scheduled_at: reminderTime,
        status: "scheduled"
      }).catch(err => console.error("Error scheduling patient reminder (reschedule):", err?.message || err));

      // Schedule doctor reminder (non-blocking)
      const doctor = await Doctor.findById(appointment.doctor_id);
      if (doctor && doctor.user_id) {
        scheduleReminder({
          user_id: doctor.user_id,
          clinic_id: appointment.clinic_id,
          type: "appointment",
          related_id: newAppointment._id,
          related_model: "Appointment",
          subject: "Upcoming Appointment Reminder",
          message: `You have an appointment tomorrow at ${appointment_time}.`,
          channel: "email",
          scheduled_at: reminderTime,
          status: "scheduled"
        }).catch(err => console.error("Error scheduling doctor reminder (reschedule):", err?.message || err));
      }
    }

    // Populate new appointment with related data
    await newAppointment.populate({
      path: "patient_id",
      populate: {
        path: "user_id",
        select: "name email phone"
      }
    });
    await newAppointment.populate({
      path: "doctor_id",
      populate: {
        path: "user_id",
        select: "name email phone"
      }
    });
    await newAppointment.populate("clinic_id", "name address contact");

    // Transform response based on user role
    const transformedAppointment = transformByRole(newAppointment, req.user.role);
    res.json({
      message: "Appointment rescheduled successfully",
      appointment: transformedAppointment
    });
  } catch (error) {
    console.error("Reschedule appointment error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
});
exports.putByIdCancel = asyncHandler(async (req, res, next) => {
  try {
    const {
      cancelled_reason
    } = req.body;
    const appointment = await Appointment.findById(req.params.id).populate({
      path: "patient_id",
      populate: {
        path: "user_id",
        select: "name email phone"
      }
    }).populate({
      path: "doctor_id",
      populate: {
        path: "user_id",
        select: "name email phone"
      }
    }).populate("clinic_id", "name address contact");
    if (!appointment) {
      return res.status(404).json({
        message: "Appointment not found"
      });
    }
    if (appointment.status === "cancelled") {
      return res.status(400).json({
        message: "Appointment is already cancelled"
      });
    }
    appointment.status = "cancelled";
    appointment.cancelled_reason = cancelled_reason;
    appointment.cancelled_at = new Date();
    await appointment.save();

    // Cancel associated reminder
    await Reminder.updateMany({
      related_id: appointment._id,
      type: "appointment",
      status: "scheduled"
    }, {
      status: "cancelled"
    });

    // Notify waiting queue — find patients waiting for this doctor on this date
    (async () => {
      try {
        const {
          processWaitingQueue
        } = require("../services/cronService");
        await processWaitingQueue();
      } catch (e) {
        console.error("Waiting queue notification failed (non-blocking):", e.message);
      }
    })();

    // Immediately notify follow-up patients about this newly freed slot
    (async () => {
      try {
        const {
          processReleasedSlots
        } = require("../services/cronService");
        await processReleasedSlots();
      } catch (e) {
        console.error("Released slot notification failed (non-blocking):", e.message);
      }
    })();

    // Transform response based on user role
    const transformedAppointment = transformByRole(appointment, req.user.role);
    res.json({
      message: "Appointment cancelled successfully",
      appointment: transformedAppointment
    });
  } catch (error) {
    console.error("Cancel appointment error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
});
exports.putByIdStatus = asyncHandler(async (req, res, next) => {
  try {
    const {
      status
    } = req.body;
    if (!["booked", "confirmed", "completed", "no_show"].includes(status)) {
      return res.status(400).json({
        message: "Invalid status"
      });
    }
    const appointment = await Appointment.findByIdAndUpdate(req.params.id, {
      status
    }, {
      new: true
    }).populate({
      path: "patient_id",
      populate: {
        path: "user_id",
        select: "name email phone"
      }
    }).populate({
      path: "doctor_id",
      populate: {
        path: "user_id",
        select: "name email phone"
      }
    }).populate("clinic_id", "name address contact");
    if (!appointment) {
      return res.status(404).json({
        message: "Appointment not found"
      });
    }

    // Transform response based on user role
    const transformedAppointment = transformByRole(appointment, req.user.role);
    res.json({
      message: "Appointment status updated",
      appointment: transformedAppointment
    });
  } catch (error) {
    console.error("Update appointment status error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
});
exports.getDoctorByDoctorIdCalendar = asyncHandler(async (req, res, next) => {
  try {
    const {
      doctorId
    } = req.params;
    const {
      startDate,
      endDate
    } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().setHours(0, 0, 0, 0));
    const end = endDate ? new Date(endDate) : new Date(start.getTime() + 7 * 86400000);
    const appointments = await Appointment.find({
      doctor_id: doctorId,
      appointment_date: {
        $gte: start,
        $lte: end
      }
    }).populate({
      path: "patient_id",
      populate: {
        path: "user_id",
        select: "name email phone"
      }
    }).populate("clinic_id", "name").sort({
      appointment_date: 1,
      appointment_time: 1
    }).lean();
    const now = new Date();
    const colored = appointments.map(apt => {
      const aptDateTime = new Date(apt.appointment_date);
      const [h, m] = apt.appointment_time.split(":");
      aptDateTime.setHours(parseInt(h), parseInt(m));
      let color = "#2196F3"; // blue — upcoming
      if (apt.status === "completed") color = "#4CAF50"; // green
      else if (apt.status === "cancelled") color = "#F44336"; // red
      else if (aptDateTime < now && apt.status !== "completed") color = "#9E9E9E"; // grey — past

      return {
        _id: apt._id,
        date: apt.appointment_date,
        time: apt.appointment_time,
        duration: apt.duration_minutes,
        status: apt.status,
        color,
        reason: apt.reason_for_visit,
        visit_type: apt.visit_type,
        patient: apt.patient_id ? {
          _id: apt.patient_id._id,
          name: apt.patient_id.user_id?.name || "Unknown",
          patient_id: apt.patient_id.patient_id
        } : null,
        clinic: apt.clinic_id?.name
      };
    });
    res.json({
      message: "Calendar data retrieved",
      appointments: colored,
      dateRange: {
        start,
        end
      }
    });
  } catch (error) {
    console.error("Calendar data error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
});
exports.postByIdWaitingQueue = asyncHandler(async (req, res, next) => {
  try {
    const {
      patient_id,
      doctor_id,
      clinic_id,
      preferred_date,
      preferred_time_range,
      reason
    } = req.body;
    if (!patient_id || !doctor_id || !preferred_date) {
      return res.status(400).json({
        message: "patient_id, doctor_id, and preferred_date are required"
      });
    }
    const entry = await WaitingQueue.create({
      patient_id,
      doctor_id,
      clinic_id,
      preferred_date: new Date(preferred_date),
      preferred_time_range,
      reason,
      status: "waiting"
    });
    res.status(201).json({
      message: "Added to waiting queue",
      entry
    });
  } catch (error) {
    console.error("Waiting queue error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
});
