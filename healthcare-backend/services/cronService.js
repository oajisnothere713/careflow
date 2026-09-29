const cron = require("node-cron");
const { v4: uuidv4 } = require("uuid");
const FollowUp = require('../models/appointment/FollowUp');
const DoctorSlot = require('../models/clinic/DoctorSlot');
const Appointment = require('../models/appointment/Appointment');
const WaitingQueue = require('../models/patient/WaitingQueue');
const ConfirmationToken = require('../models/appointment/ConfirmationToken');
const Patient = require('../models/patient/Patient');
const Doctor = require('../models/clinic/Doctor');
const Clinic = require('../models/clinic/Clinic');
const User = require('../models/user/User');
const {
  sendFollowUpSlots,
  sendWaitlistNotification,
  sendSlotReleasedNotification,
  sendFollowUpSlotOpened,
} = require("./emailService");

const config = require("../config/env");
const FRONTEND_URL = config.frontendUrl;
const ACTIVE_APPOINTMENT_STATUSES = {
  $nin: ["cancelled", "no_show", "rescheduled"],
};
const DAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

/**
 * Helper: Check if time is within operating window (9 AM - 7 PM)
 */
function isWithinOperatingWindow(timeStr) {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const timeInMinutes = hours * 60 + minutes;
  const startWindow = 9 * 60; // 9:00 AM
  const endWindow = 19 * 60; // 7:00 PM
  return timeInMinutes >= startWindow && timeInMinutes < endWindow;
}

function getDayRange(dateInput) {
  const dayStart = new Date(dateInput);
  dayStart.setUTCHours(0, 0, 0, 0);

  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  return { dayStart, dayEnd };
}

function expandScheduleTimes(slots) {
  const timeSlots = new Set();

  for (const slot of slots) {
    const [startHour, startMin] = slot.start_time.split(":").map(Number);
    const [endHour, endMin] = slot.end_time.split(":").map(Number);
    const slotDuration = slot.slot_duration || 30;

    let currentHour = startHour;
    let currentMin = startMin;

    while (
      currentHour < endHour ||
      (currentHour === endHour && currentMin < endMin)
    ) {
      const timeSlot = `${String(currentHour).padStart(2, "0")}:${String(currentMin).padStart(2, "0")}`;

      if (isWithinOperatingWindow(timeSlot)) {
        timeSlots.add(timeSlot);
      }

      currentMin += slotDuration;
      if (currentMin >= 60) {
        currentHour += Math.floor(currentMin / 60);
        currentMin = currentMin % 60;
      }
    }
  }

  return Array.from(timeSlots).sort();
}

async function getAvailableSlotsForDate(doctorId, date, allSlots, count) {
  const { dayStart, dayEnd } = getDayRange(date);
  const dayOfWeek = DAY_NAMES[dayStart.getUTCDay()];
  const daySlots = allSlots.filter((slot) => slot.day_of_week === dayOfWeek);

  if (!daySlots.length) {
    return [];
  }

  const candidateTimes = expandScheduleTimes(daySlots);
  if (!candidateTimes.length) {
    return [];
  }

  const bookedAppointments = await Appointment.find({
    doctor_id: doctorId,
    appointment_date: { $gte: dayStart, $lt: dayEnd },
    status: ACTIVE_APPOINTMENT_STATUSES,
  }).select("appointment_time");

  const bookedTimes = new Set(
    bookedAppointments.map((appointment) => appointment.appointment_time),
  );

  const availableSlots = [];
  for (const time of candidateTimes) {
    if (!bookedTimes.has(time)) {
      availableSlots.push({ date: new Date(dayStart), time });
    }

    if (count && availableSlots.length >= count) {
      break;
    }
  }

  return availableSlots;
}

function pickSlotList(slotResult) {
  if (slotResult.fromPreferredDate) {
    return slotResult.preferredDateSlots;
  }

  return slotResult.nextAvailableSlots;
}

function pickFirstSlot(slotResult) {
  const slotList = pickSlotList(slotResult);
  return slotList.length > 0 ? slotList[0] : null;
}

/**
 * Generate default time slots (every 30 min, 9 AM – 6:30 PM) for a date
 * when no DoctorSlot records are configured.
 * Filters out already-booked appointment times.
 */
async function generateDefaultSlots(doctorId, date) {
  const { dayStart, dayEnd } = getDayRange(date);
  const defaultTimes = [];
  for (let h = 9; h <= 18; h++) {
    defaultTimes.push(`${String(h).padStart(2, "0")}:00`);
  }

  const bookedAppointments = await Appointment.find({
    doctor_id: doctorId,
    appointment_date: { $gte: dayStart, $lt: dayEnd },
    status: ACTIVE_APPOINTMENT_STATUSES,
  }).select("appointment_time");

  const bookedTimes = new Set(
    bookedAppointments.map((a) => a.appointment_time),
  );

  return defaultTimes
    .filter((t) => !bookedTimes.has(t))
    .map((time) => ({ date: new Date(dayStart), time }));
}

/**
 * Find ALL available slots for the single next date (after fromDate) that has
 * any availability. Slots from one date only — never mixes days.
 * DoctorSlot records are used when present; falls back to default 30-min intervals.
 * Returns: { date: Date|null, slots: Array<{date, time}> }
 */
async function getNextAvailableDateSlots(doctorId, fromDate) {
  const searchDate = new Date(fromDate);
  searchDate.setUTCHours(0, 0, 0, 0);
  searchDate.setUTCDate(searchDate.getUTCDate() + 1); // start day after preferred date

  const doctorSlots = await DoctorSlot.find({
    doctor_id: doctorId,
    is_active: true,
  });
  const maxDays = 30;

  if (doctorSlots.length > 0) {
    for (let d = 0; d < maxDays; d++) {
      const slots = await getAvailableSlotsForDate(
        doctorId,
        searchDate,
        doctorSlots,
        0, // 0 = return all slots on that date
      );
      if (slots.length > 0) {
        return { date: new Date(searchDate), slots };
      }
      searchDate.setUTCDate(searchDate.getUTCDate() + 1);
    }
  } else {
    // No DoctorSlot records configured — use default 30-min interval slots
    for (let d = 0; d < maxDays; d++) {
      const slots = await generateDefaultSlots(doctorId, searchDate);
      if (slots.length > 0) {
        return { date: new Date(searchDate), slots };
      }
      searchDate.setUTCDate(searchDate.getUTCDate() + 1);
    }
  }

  return { date: null, slots: [] };
}

/**
 * Get available slots for a doctor
 * Prioritizes target date first, then searches subsequent days
 * Only returns slots within 9 AM - 7 PM window
 * Returns object: { preferredDateSlots, nextAvailableSlots, fromPreferredDate }
 */
async function getAvailableSlots(doctorId, targetDate, count = 3) {
  const slots = await DoctorSlot.find({ doctor_id: doctorId, is_active: true });
  if (!slots.length)
    return {
      preferredDateSlots: [],
      nextAvailableSlots: [],
      fromPreferredDate: false,
    };

  const preferredDateSlots = [];
  const nextAvailableSlots = [];
  const checkDate = new Date(targetDate);
  checkDate.setUTCHours(0, 0, 0, 0);
  const maxDays = 30;
  const unlimited = !count; // count=0 or falsy means return ALL available slots

  // First pass: check target date only
  preferredDateSlots.push(
    ...(await getAvailableSlotsForDate(
      doctorId,
      checkDate,
      slots,
      unlimited ? 0 : count,
    )),
  );

  // If slots found on preferred date, return those
  if (preferredDateSlots.length > 0) {
    return {
      preferredDateSlots: unlimited
        ? preferredDateSlots
        : preferredDateSlots.slice(0, count),
      nextAvailableSlots: [],
      fromPreferredDate: true,
    };
  }

  // Second pass: find next available slots from subsequent days
  checkDate.setUTCDate(checkDate.getUTCDate() + 1);
  for (
    let d = 1;
    d < maxDays && (unlimited || nextAvailableSlots.length < count);
    d++
  ) {
    const slotsOnDate = await getAvailableSlotsForDate(
      doctorId,
      checkDate,
      slots,
      unlimited ? 0 : count - nextAvailableSlots.length,
    );
    nextAvailableSlots.push(...slotsOnDate);

    checkDate.setUTCDate(checkDate.getUTCDate() + 1);
  }

  return {
    preferredDateSlots: [],
    nextAvailableSlots,
    fromPreferredDate: false,
  };
}

/**
 * Follow-up processor — runs daily at 8 AM.
 * Finds pending follow-ups approaching within 3 days,
 * checks doctor availability, and sends patient available slots via email.
 */
async function processFollowUps() {
  console.log("🔄 Running follow-up processor...");
  try {
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const pendingFollowUps = await FollowUp.find({
      status: "pending",
      follow_up_date: { $lte: threeDaysFromNow },
      patient_notified_at: null,
    }).populate("patient_id doctor_id clinic_id");

    for (const followUp of pendingFollowUps) {
      try {
        const patient = followUp.patient_id;
        const doctor = followUp.doctor_id;
        const clinic = followUp.clinic_id;

        if (!patient || !doctor || !clinic) continue;

        // Get patient email via User model
        const patientUser = await User.findById(patient.user_id);
        if (!patientUser?.email) continue;

        // Get doctor user for name
        const doctorUser = await User.findById(doctor.user_id);

        // Find available slots: prioritize target date, then next available (9 AM - 7 PM)
        const slotResult = await getAvailableSlots(
          doctor._id,
          followUp.follow_up_date,
          0,
        );

        // Use whichever slots are available
        const availableSlots = pickSlotList(slotResult);

        if (!availableSlots || availableSlots.length === 0) {
          // No DoctorSlot records — generate default 30-min interval slots (9 AM – 6:30 PM)
          console.warn(
            `  ⚠️ No slots found for doctor ${doctor._id} — generating default slots`,
          );
          const defaultSlots = await generateDefaultSlots(
            doctor._id,
            followUp.follow_up_date,
          );

          if (defaultSlots.length === 0) {
            console.warn(
              `  ⚠️ All default slots booked for ${followUp.follow_up_date}`,
            );
            continue;
          }

          const slotsWithTokens = [];
          const tokenIds = [];
          for (const slot of defaultSlots) {
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
                doctor_id: doctor._id,
              },
              status: "pending",
            });
            tokenIds.push(tokenRecord._id);
            slotsWithTokens.push({ ...slot, token });
          }
          const defaultEmailResult = await sendFollowUpSlots(
            patientUser.email,
            {
              patientName: patientUser.name,
              slots: slotsWithTokens,
              preferredDate: followUp.follow_up_date,
              fromPreferredDate: true,
              doctorName: doctorUser?.name || "Your Doctor",
              clinicName: clinic.name,
              frontendUrl: FRONTEND_URL,
            },
          );
          if (defaultEmailResult.success) {
            followUp.patient_notified_at = new Date();
            followUp.suggested_slots = defaultSlots;
            await followUp.save();
            console.log(
              `  ✅ Default follow-up slots email sent to ${patientUser.email}`,
            );
          } else {
            await ConfirmationToken.updateMany(
              { _id: { $in: tokenIds }, status: "pending" },
              { status: "expired" },
            );
            console.error(
              `  ❌ Default follow-up slots email failed for ${patientUser.email}:`,
              defaultEmailResult.error,
            );
          }
          continue;
        }

        // Create confirmation tokens for each slot
        const slotsWithTokens = [];
        const tokenIds = [];
        for (const slot of availableSlots) {
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
              doctor_id: doctor._id,
            },
            status: "pending",
          });
          tokenIds.push(tokenRecord._id);
          slotsWithTokens.push({ ...slot, token });
        }

        // Send email with context about slot availability
        const emailResult = await sendFollowUpSlots(patientUser.email, {
          patientName: patientUser.name,
          slots: slotsWithTokens,
          preferredDate: followUp.follow_up_date,
          fromPreferredDate: slotResult.fromPreferredDate,
          doctorName: doctorUser?.name || "Your Doctor",
          clinicName: clinic.name,
          frontendUrl: FRONTEND_URL,
        });

        if (!emailResult.success) {
          await ConfirmationToken.updateMany(
            { _id: { $in: tokenIds }, status: "pending" },
            { status: "expired" },
          );
          console.error(
            `  ❌ Failed to send follow-up slots to ${patientUser.email}:`,
            emailResult.error,
          );
          continue;
        }

        // Update follow-up record
        followUp.patient_notified_at = new Date();
        followUp.suggested_slots = availableSlots;
        await followUp.save();

        console.log(
          `  ✅ Notified patient ${patientUser.email} about follow-up slots`,
        );
      } catch (err) {
        console.error(
          `  ❌ Error processing follow-up ${followUp._id}:`,
          err.message,
        );
      }
    }

    console.log(
      `🔄 Follow-up processor complete. Processed ${pendingFollowUps.length} follow-ups.`,
    );
  } catch (error) {
    console.error("❌ Follow-up processor error:", error.message);
  }
}

/**
 * Waiting queue processor — runs every 30 minutes.
 * Notifies next patient in queue when a slot is freed or previous token expires.
 */
async function processWaitingQueue() {
  console.log("🔄 Running waiting queue processor...");
  try {
    // Find expired tokens and update their waiting queue entries
    const expiredTokens = await ConfirmationToken.find({
      type: "waitlist_confirm",
      status: "pending",
      expires_at: { $lt: new Date() },
    });

    for (const token of expiredTokens) {
      token.status = "expired";
      await token.save();

      await WaitingQueue.findByIdAndUpdate(token.related_id, {
        status: "expired",
      });
    }

    // Find waiting queue entries that need notification
    const waitingEntries = await WaitingQueue.find({
      status: "waiting",
    })
      .sort({ createdAt: 1 })
      .populate("patient_id doctor_id clinic_id");

    for (const entry of waitingEntries) {
      try {
        const patient = entry.patient_id;
        const doctor = entry.doctor_id;
        const clinic = entry.clinic_id;

        if (!patient || !doctor || !clinic) continue;

        const patientUser = await User.findById(patient.user_id);
        const doctorUser = await User.findById(doctor.user_id);
        if (!patientUser?.email) continue;

        // Check if a slot is actually available for the preferred date/time
        const slotResult = await getAvailableSlots(
          doctor._id,
          entry.preferred_date,
          1,
        );
        const slot = pickFirstSlot(slotResult);
        if (!slot) continue;

        const token = uuidv4();

        const tokenRecord = await ConfirmationToken.create({
          token,
          type: "waitlist_confirm",
          patient_id: patient._id,
          related_id: entry._id,
          related_model: "WaitingQueue",
          slot_data: {
            date: slot.date,
            time: slot.time,
            doctor_id: doctor._id,
          },
          status: "pending",
        });

        const emailResult = await sendWaitlistNotification(patientUser.email, {
          patientName: patientUser.name,
          slot,
          doctorName: doctorUser?.name || "Your Doctor",
          clinicName: clinic.name,
          confirmationLink: `${FRONTEND_URL}/confirm/${token}`,
        });

        if (!emailResult.success) {
          await ConfirmationToken.findByIdAndUpdate(tokenRecord._id, {
            status: "expired",
          });
          console.error(
            `  ❌ Failed to send waitlist notification to ${patientUser.email}:`,
            emailResult.error,
          );
          continue;
        }

        entry.status = "notified";
        entry.notification_token = token;
        entry.token_expires_at = new Date(Date.now() + 48 * 60 * 60 * 1000);
        entry.notified_at = new Date();
        await entry.save();

        console.log(`  ✅ Notified queued patient ${patientUser.email}`);
      } catch (err) {
        console.error(
          `  ❌ Error processing queue entry ${entry._id}:`,
          err.message,
        );
      }
    }

    console.log("🔄 Waiting queue processor complete.");
  } catch (error) {
    console.error("❌ Waiting queue processor error:", error.message);
  }
}

/**
 * Token cleanup — expires stale unconfirmed tokens daily at midnight
 */
async function cleanupExpiredTokens() {
  console.log("🔄 Running token cleanup...");
  try {
    const result = await ConfirmationToken.updateMany(
      { status: "pending", expires_at: { $lt: new Date() } },
      { status: "expired" },
    );
    console.log(`🔄 Expired ${result.modifiedCount} tokens.`);
  } catch (error) {
    console.error("❌ Token cleanup error:", error.message);
  }
}

/**
 * Released-slot processor — runs every 30 minutes (:10 and :40 minutes).
 * When a doctor's appointment is cancelled, TWO groups of patients are notified:
 *
 * 1. LATER APPOINTMENTS: Patients with confirmed/booked appointments AFTER the cancelled slot
 *    - Offered the freed earlier slot (they can move up their appointment)
 *    - Their later appointment is cancelled if they accept
 *
 * 2. PENDING FOLLOW-UPS (PRIORITY-ORDERED): Patients with pending follow-ups who were notified of slots but haven't booked yet
 *    - ONLY offered the freed slot if it's ON or AFTER their suggested follow-up date
 *    - PRIORITY: Ordered by follow-up urgency (earliest suggested date = highest priority)
 *    - When confirmed, creates new Appointment & updates FollowUp status to "scheduled"
 *
 * Important: Only one patient can claim each freed slot (other pending tokens are expired)
 */
async function processReleasedSlots() {
  console.log(
    "🔄 Running released-slot processor (priority: later appointments → pending follow-ups by urgency)...",
  );
  try {
    // Find recently cancelled appointments that haven't been notified yet
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // last 24 hours
    const cancelledAppointments = await Appointment.find({
      status: "cancelled",
      cancelled_at: { $gte: since },
      slot_release_notified: false,
    });

    for (const freedAppt of cancelledAppointments) {
      try {
        const { dayStart: freedDayStart, dayEnd: freedDayEnd } = getDayRange(
          freedAppt.appointment_date,
        );
        let shouldMarkNotified = true;

        // Find patients with a LATER confirmed/booked appointment with the same doctor
        const laterAppointments = await Appointment.find({
          doctor_id: freedAppt.doctor_id,
          status: { $in: ["booked", "confirmed"] },
          _id: { $ne: freedAppt._id },
          $or: [
            { appointment_date: { $gte: freedDayEnd } },
            {
              appointment_date: { $gte: freedDayStart, $lt: freedDayEnd },
              appointment_time: { $gt: freedAppt.appointment_time },
            },
          ],
        })
          .populate({
            path: "patient_id",
            populate: { path: "user_id", select: "name email" },
          })
          .sort({ appointment_date: 1 })
          .lean();

        const doctor = await Doctor.findById(freedAppt.doctor_id);
        const doctorUser = doctor ? await User.findById(doctor.user_id) : null;
        const clinic = doctor ? await Clinic.findById(doctor.clinic_id) : null;

        for (const laterAppt of laterAppointments) {
          try {
            const patient = laterAppt.patient_id;
            if (!patient?.user_id?.email) continue;

            // Skip if this patient already has a pending slot_release_confirm token for this freed slot
            const existingToken = await ConfirmationToken.findOne({
              type: "slot_release_confirm",
              patient_id: patient._id,
              status: "pending",
              "slot_data.date": { $gte: freedDayStart, $lt: freedDayEnd },
              "slot_data.time": freedAppt.appointment_time,
            });
            if (existingToken) continue;

            const token = uuidv4();
            const tokenRecord = await ConfirmationToken.create({
              token,
              type: "slot_release_confirm",
              patient_id: patient._id,
              related_id: laterAppt._id, // the later appointment to cancel if confirmed
              related_model: "Appointment",
              slot_data: {
                date: freedAppt.appointment_date,
                time: freedAppt.appointment_time,
                doctor_id: freedAppt.doctor_id,
              },
              status: "pending",
            });

            const emailResult = await sendSlotReleasedNotification(
              patient.user_id.email,
              {
                patientName: patient.user_id.name,
                freedSlot: {
                  date: freedAppt.appointment_date,
                  time: freedAppt.appointment_time,
                },
                laterSlot: {
                  date: laterAppt.appointment_date,
                  time: laterAppt.appointment_time,
                },
                doctorName: doctorUser?.name || "Doctor",
                clinicName: clinic?.name || "Clinic",
                confirmLink: `${FRONTEND_URL}/confirm/${token}`,
              },
            );

            if (!emailResult.success) {
              shouldMarkNotified = false;
              await ConfirmationToken.findByIdAndUpdate(tokenRecord._id, {
                status: "expired",
              });
              console.error(
                `  ❌ Failed to send released-slot notification to ${patient.user_id.email}:`,
                emailResult.error,
              );
              continue;
            }

            console.log(
              `  ✅ Notified patient ${patient.user_id.email} about freed slot`,
            );
          } catch (innerErr) {
            shouldMarkNotified = false;
            console.error(
              `  ❌ Error notifying patient for later appt ${laterAppt._id}:`,
              innerErr.message,
            );
          }
        }

        // Mark freed appointment as notified
        if (shouldMarkNotified) {
          await Appointment.findByIdAndUpdate(freedAppt._id, {
            slot_release_notified: true,
          });
        }

        // ---- Cron Job 2: Notify PENDING follow-up patients about this freed slot ----
        // These patients were notified of follow-up slots but never booked one yet (status=pending).
        // If a cancellation occurs on/after their doctor's suggested follow-up date, offer them the freed slot.
        // IMPORTANT: Only offer freed slot if it's ON or AFTER the suggested follow-up date
        // PRIORITY: Patients ordered by follow-up urgency (earliest follow-up date = highest priority)
        try {
          const pendingFollowUps = await FollowUp.find({
            doctor_id: freedAppt.doctor_id,
            status: "pending",
            follow_up_date: { $lte: freedAppt.appointment_date }, // Freed slot must be on or after suggested date
          })
            .sort({ follow_up_date: 1 }) // Ascending = earliest date first = most urgent patients first
            .populate("patient_id clinic_id");

          for (const followUp of pendingFollowUps) {
            try {
              const fuPatient = followUp.patient_id;
              if (!fuPatient) continue;

              const fuPatientUser = await User.findById(fuPatient.user_id);
              if (!fuPatientUser?.email) continue;

              // Skip if this patient already has a scheduled follow-up for this doctor
              // (they'll receive the "earlier slot available" email from Group 3 instead)
              const hasScheduledFollowUp = await FollowUp.exists({
                patient_id: fuPatient._id,
                doctor_id: freedAppt.doctor_id,
                status: "scheduled",
                new_appointment_id: { $ne: null },
              });
              if (hasScheduledFollowUp) continue;

              // Skip if this patient already has a pending follow_up_confirm token for this exact freed slot
              const existingFuToken = await ConfirmationToken.findOne({
                type: "follow_up_confirm",
                patient_id: fuPatient._id,
                status: "pending",
                "slot_data.date": {
                  $gte: freedDayStart,
                  $lt: freedDayEnd,
                },
                "slot_data.time": freedAppt.appointment_time,
                "slot_data.doctor_id": freedAppt.doctor_id,
              });
              if (existingFuToken) continue;

              // Also skip if patient already has a booked/confirmed appointment at this slot
              const existingAppt = await Appointment.findOne({
                patient_id: fuPatient._id,
                doctor_id: freedAppt.doctor_id,
                appointment_date: {
                  $gte: freedDayStart,
                  $lt: freedDayEnd,
                },
                appointment_time: freedAppt.appointment_time,
                status: { $in: ["booked", "confirmed"] },
              });
              if (existingAppt) continue;

              const fuToken = uuidv4();
              const fuTokenRecord = await ConfirmationToken.create({
                token: fuToken,
                type: "follow_up_confirm",
                patient_id: fuPatient._id,
                related_id: followUp._id,
                related_model: "FollowUp",
                slot_data: {
                  date: freedAppt.appointment_date,
                  time: freedAppt.appointment_time,
                  doctor_id: freedAppt.doctor_id,
                },
                status: "pending",
              });

              const fuEmailResult = await sendFollowUpSlotOpened(
                fuPatientUser.email,
                {
                  patientName: fuPatientUser.name,
                  slot: {
                    date: freedAppt.appointment_date,
                    time: freedAppt.appointment_time,
                  },
                  preferredDate: followUp.follow_up_date,
                  doctorName: doctorUser?.name || "Doctor",
                  clinicName: clinic?.name || "Clinic",
                  confirmLink: `${FRONTEND_URL}/confirm/${fuToken}`,
                },
              );

              if (!fuEmailResult.success) {
                await ConfirmationToken.findByIdAndUpdate(fuTokenRecord._id, {
                  status: "expired",
                });
                console.error(
                  `  ❌ Failed to send follow-up slot-opened notification to ${fuPatientUser.email}:`,
                  fuEmailResult.error,
                );
                continue;
              }

              // Append this freed slot to the follow-up's suggested_slots
              await FollowUp.findByIdAndUpdate(followUp._id, {
                $push: {
                  suggested_slots: {
                    date: freedAppt.appointment_date,
                    time: freedAppt.appointment_time,
                  },
                },
              });

              // Calculate days until follow-up for logging context
              const now = new Date();
              const daysUntilFollowUp = Math.ceil(
                (followUp.follow_up_date - now) / (1000 * 60 * 60 * 24),
              );

              console.log(
                `  ✅ PRIORITY NOTIFICATION - Sent to patient ${fuPatientUser.email}`,
                `(Follow-up in ${daysUntilFollowUp} days on ${followUp.follow_up_date.toISOString().split("T")[0]})`,
                `Freed slot: ${freedAppt.appointment_date.toISOString().split("T")[0]} ${freedAppt.appointment_time}`,
              );
            } catch (fuErr) {
              console.error(
                `  ❌ Error notifying pending follow-up patient for followUp ${followUp._id}:`,
                fuErr.message,
              );
            }
          }
        } catch (fuBlockErr) {
          console.error(
            `  ❌ Error in pending follow-up block for freed appt ${freedAppt._id}:`,
            fuBlockErr.message,
          );
        }

        // ---- Scenario 2: Notify SCHEDULED follow-up patients about a freed earlier slot ----
        // These patients already confirmed a later appointment because their doctor's preferred
        // date had no slots. If a cancellation frees an earlier slot (on or after their
        // follow_up_date), offer them the earlier slot. If they confirm, the later appointment
        // is cancelled automatically (handled in routes/confirm.js).
        try {
          const { dayStart: freedDayStart, dayEnd: freedDayEnd } = getDayRange(
            freedAppt.appointment_date,
          );

          const scheduledFollowUps = await FollowUp.find({
            doctor_id: freedAppt.doctor_id,
            status: "scheduled",
            follow_up_date: { $lte: freedAppt.appointment_date },
            new_appointment_id: { $ne: null },
          })
            .populate("patient_id clinic_id")
            .populate("new_appointment_id");

          for (const followUp of scheduledFollowUps) {
            try {
              const fuPatient = followUp.patient_id;
              if (!fuPatient) continue;

              const bookedAppt = followUp.new_appointment_id;
              if (!bookedAppt) continue;

              // Skip if the booked appointment is already cancelled/completed
              if (["cancelled", "completed"].includes(bookedAppt.status))
                continue;

              // Only offer if the freed slot is strictly earlier than the already-booked slot
              const bookedDate = new Date(bookedAppt.appointment_date);
              bookedDate.setUTCHours(0, 0, 0, 0);
              const freedDate = new Date(freedAppt.appointment_date);
              freedDate.setUTCHours(0, 0, 0, 0);

              const isEarlierDate = freedDate < bookedDate;
              const isSameDayEarlierTime =
                freedDate.getTime() === bookedDate.getTime() &&
                freedAppt.appointment_time < bookedAppt.appointment_time;

              if (!isEarlierDate && !isSameDayEarlierTime) continue;

              const fuPatientUser = await User.findById(fuPatient.user_id);
              if (!fuPatientUser?.email) continue;

              // Skip if this patient already has a pending token for this exact freed slot
              const existingToken = await ConfirmationToken.findOne({
                type: "follow_up_confirm",
                patient_id: fuPatient._id,
                status: "pending",
                "slot_data.date": { $gte: freedDayStart, $lt: freedDayEnd },
                "slot_data.time": freedAppt.appointment_time,
                "slot_data.doctor_id": freedAppt.doctor_id,
              });
              if (existingToken) continue;

              const fuToken = uuidv4();
              const fuTokenRecord = await ConfirmationToken.create({
                token: fuToken,
                type: "follow_up_confirm",
                patient_id: fuPatient._id,
                related_id: followUp._id,
                related_model: "FollowUp",
                slot_data: {
                  date: freedAppt.appointment_date,
                  time: freedAppt.appointment_time,
                  doctor_id: freedAppt.doctor_id,
                },
                status: "pending",
              });

              const fuEmailResult = await sendSlotReleasedNotification(
                fuPatientUser.email,
                {
                  patientName: fuPatientUser.name,
                  freedSlot: {
                    date: freedAppt.appointment_date,
                    time: freedAppt.appointment_time,
                  },
                  laterSlot: {
                    date: bookedAppt.appointment_date,
                    time: bookedAppt.appointment_time,
                  },
                  doctorName: doctorUser?.name || "Doctor",
                  clinicName: clinic?.name || "Clinic",
                  confirmLink: `${FRONTEND_URL}/confirm/${fuToken}`,
                },
              );

              if (!fuEmailResult.success) {
                await ConfirmationToken.findByIdAndUpdate(fuTokenRecord._id, {
                  status: "expired",
                });
                console.error(
                  `  ❌ Failed to send revised follow-up notification to ${fuPatientUser.email}:`,
                  fuEmailResult.error,
                );
                continue;
              }

              // Append freed slot to the follow-up's suggested_slots
              await FollowUp.findByIdAndUpdate(followUp._id, {
                $push: {
                  suggested_slots: {
                    date: freedAppt.appointment_date,
                    time: freedAppt.appointment_time,
                  },
                },
              });

              console.log(
                `  ✅ Revised follow-up notification sent to ${fuPatientUser.email}`,
                `(Freed slot: ${freedAppt.appointment_date.toISOString().split("T")[0]} ${freedAppt.appointment_time}`,
                `Earlier than booked: ${bookedAppt.appointment_date.toISOString().split("T")[0]} ${bookedAppt.appointment_time})`,
              );
            } catch (sfErr) {
              console.error(
                `  ❌ Error notifying scheduled follow-up patient for followUp ${followUp._id}:`,
                sfErr.message,
              );
            }
          }
        } catch (sfBlockErr) {
          console.error(
            `  ❌ Error in scheduled follow-up block for freed appt ${freedAppt._id}:`,
            sfBlockErr.message,
          );
        }
      } catch (err) {
        console.error(
          `  ❌ Error processing cancelled appt ${freedAppt._id}:`,
          err.message,
        );
      }
    }

    console.log(
      `🔄 Released-slot processor complete. Checked ${cancelledAppointments.length} cancelled appointments.`,
    );
  } catch (error) {
    console.error("❌ Released-slot processor error:", error.message);
  }
}

/**
 * Initialize all cron jobs
 */
let isFollowUpsRunning = false;
let isWaitingQueueRunning = false;
let isReleasedSlotsRunning = false;

function initCronJobs() {
  // Follow-up processor — daily at 8 AM
  cron.schedule("0 8 * * *", async () => {
    if (isFollowUpsRunning) {
      console.log("⏭ Follow-up processor already running, skipping tick.");
      return;
    }
    isFollowUpsRunning = true;
    try {
      await processFollowUps();
    } catch (e) {
      console.error("❌ Follow-up cron uncaught error:", e.message);
    } finally {
      isFollowUpsRunning = false;
    }
  });

  // Waiting queue processor — every 30 minutes at :00 and :30
  cron.schedule("*/30 * * * *", async () => {
    if (isWaitingQueueRunning) {
      console.log("⏭ Waiting queue processor already running, skipping tick.");
      return;
    }
    isWaitingQueueRunning = true;
    try {
      await processWaitingQueue();
    } catch (e) {
      console.error("❌ Waiting queue cron uncaught error:", e.message);
    } finally {
      isWaitingQueueRunning = false;
    }
  });

  // Released slot processor — offset by 10 min to avoid colliding with waiting queue (:10 and :40)
  cron.schedule("10,40 * * * *", async () => {
    if (isReleasedSlotsRunning) {
      console.log("⏭ Released-slot processor already running, skipping tick.");
      return;
    }
    isReleasedSlotsRunning = true;
    try {
      await processReleasedSlots();
    } catch (e) {
      console.error("❌ Released-slot cron uncaught error:", e.message);
    } finally {
      isReleasedSlotsRunning = false;
    }
  });

  // Token cleanup — daily at midnight
  cron.schedule("0 0 * * *", async () => {
    try {
      await cleanupExpiredTokens();
    } catch (e) {
      console.error("❌ Token cleanup cron uncaught error:", e.message);
    }
  });

  console.log(
    "⏰ Cron jobs initialized: follow-ups (8AM), waiting queue (:00/:30), released slots (:10/:40), token cleanup (midnight)",
  );
}

module.exports = {
  initCronJobs,
  processFollowUps,
  processWaitingQueue,
  processReleasedSlots,
  cleanupExpiredTokens,
  getAvailableSlots,
  generateDefaultSlots,
  getNextAvailableDateSlots,
};
