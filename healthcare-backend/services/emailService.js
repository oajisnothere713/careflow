const nodemailer = require("nodemailer");

/**
 * Email Service — HTML email notifications for consultations, follow-ups, and waiting queue.
 * Reuses nodemailer transporter pattern from utils/otpService.js.
 */

const config = require("../config/env");

function getTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: config.email.user,
      pass: config.email.password,
    },
  });
}

/**
 * Strip "Dr." prefix from name if already present (avoids "Dr. Dr. Name")
 */
function stripDrPrefix(name) {
  if (!name) return "Doctor";
  return name.replace(/^Dr\.?\s*/i, "").trim() || name;
}

/**
 * Send consultation summary and prescription to patient after doctor saves
 */
async function sendConsultationSummary(
  patientEmail,
  {
    patientName,
    summary,
    prescription,
    followUpDate,
    doctorName,
    clinicName,
    appointmentDate,
  },
) {
  const prescriptionRows = (prescription || [])
    .map(
      (med) => `
    <tr>
      <td style="padding:8px;border:1px solid #e0e0e0">${med.medicine_name || "\u2014"}</td>
      <td style="padding:8px;border:1px solid #e0e0e0">${med.dosage || "\u2014"}</td>
      <td style="padding:8px;border:1px solid #e0e0e0">${med.frequency || "\u2014"}</td>
      <td style="padding:8px;border:1px solid #e0e0e0">${med.duration || "\u2014"}</td>
      <td style="padding:8px;border:1px solid #e0e0e0">${med.instructions || "\u2014"}</td>
    </tr>
  `,
    )
    .join("");

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <div style="background:#2196F3;color:white;padding:20px;border-radius:8px 8px 0 0">
        <h2 style="margin:0">Consultation Summary</h2>
        <p style="margin:5px 0 0">${clinicName}</p>
      </div>
      <div style="border:1px solid #e0e0e0;border-top:none;padding:20px;border-radius:0 0 8px 8px">
        <p>Dear ${patientName},</p>
        <p>Here is your consultation summary from your visit on <strong>${appointmentDate}</strong> with <strong>Dr. ${stripDrPrefix(doctorName)}</strong>.</p>
        
        <h3 style="color:#333;border-bottom:2px solid #2196F3;padding-bottom:8px">Summary</h3>
        <p style="background:#f5f5f5;padding:15px;border-radius:4px;line-height:1.6">${summary}</p>
        
        ${
          prescription && prescription.length > 0
            ? `
          <h3 style="color:#333;border-bottom:2px solid #2196F3;padding-bottom:8px">Prescription</h3>
          <table style="width:100%;border-collapse:collapse;margin:10px 0">
            <thead>
              <tr style="background:#f5f5f5">
                <th style="padding:8px;border:1px solid #e0e0e0;text-align:left">Medicine</th>
                <th style="padding:8px;border:1px solid #e0e0e0;text-align:left">Dosage</th>
                <th style="padding:8px;border:1px solid #e0e0e0;text-align:left">Frequency</th>
                <th style="padding:8px;border:1px solid #e0e0e0;text-align:left">Duration</th>
                <th style="padding:8px;border:1px solid #e0e0e0;text-align:left">Instructions</th>
              </tr>
            </thead>
            <tbody>${prescriptionRows}</tbody>
          </table>
        `
            : ""
        }

        ${
          followUpDate
            ? `
          <h3 style="color:#333;border-bottom:2px solid #FF9800;padding-bottom:8px">Follow-up Appointment</h3>
          <div style="background:#fff3e0;padding:14px;border-left:4px solid #FF9800;border-radius:4px;margin:10px 0">
            <p style="margin:0">Your doctor has recommended a follow-up visit on <strong>${new Date(followUpDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</strong>.</p>
            <p style="margin:8px 0 0;font-size:13px;color:#666">You will receive a separate email with available slots to confirm your follow-up appointment.</p>
          </div>
        `
            : ""
        }
        
        <p style="color:#666;font-size:13px;margin-top:20px">This is an automated message. Please contact the clinic for any questions.</p>
      </div>
    </div>
  `;

  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: patientEmail,
      subject: `Consultation Summary — Dr. ${stripDrPrefix(doctorName)} — ${clinicName}`,
      html,
    });
    console.log(`✅ Consultation summary email sent to ${patientEmail}`);
    return { success: true };
  } catch (error) {
    console.error("❌ Email error:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send follow-up available slots to patient with confirmation links
 * Shows context about preferred date availability
 */
async function sendFollowUpSlots(
  patientEmail,
  {
    patientName,
    slots,
    doctorName,
    clinicName,
    frontendUrl,
    preferredDate,
    fromPreferredDate,
  },
) {
  const slotLinks = slots
    .map(
      (s) => `
    <div style="background:#f5f5f5;padding:12px;margin:8px 0;border-radius:4px;display:flex;justify-content:space-between;align-items:center">
      <span><strong>${new Date(s.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</strong> at <strong>${s.time}</strong></span>
      <a href="${frontendUrl}/confirm/${s.token}" style="background:#4CAF50;color:white;padding:8px 16px;border-radius:4px;text-decoration:none;margin-left:12px">Confirm</a>
    </div>
  `,
    )
    .join("");

  // Format preferred date for display
  const preferredDateStr = preferredDate
    ? new Date(preferredDate).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "the requested date";

  // Determine context message
  let contextMessage = "";
  if (fromPreferredDate) {
    contextMessage = `<p style="background:#e8f5e9;padding:12px;border-left:4px solid #4CAF50;margin:12px 0;"><strong>✓ Slots available on your preferred date:</strong> ${preferredDateStr}</p>`;
  } else {
    contextMessage = `
      <div style="background:#fff3e0;padding:14px;border-left:4px solid #FF9800;margin:12px 0;border-radius:4px">
        <p style="margin:0 0 8px;font-weight:bold;color:#e65100">⚠ No slots available on your doctor's suggested date (${preferredDateStr})</p>
        <p style="margin:0 0 8px">The slots shown below are <strong>not</strong> on the date your doctor originally recommended — they are the <strong>next available</strong> times you can choose from.</p>
        <p style="margin:0 0 8px">Please select a slot that works for you. If any appointment gets cancelled on or after <strong>${preferredDateStr}</strong>, we will automatically send you another email with that freed slot so you can switch to an earlier date. If you book that earlier slot, your later appointment will be cancelled automatically.</p>
      </div>
    `;
  }

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <div style="background:#FF9800;color:white;padding:20px;border-radius:8px 8px 0 0">
        <h2 style="margin:0">Follow-up Appointment Available</h2>
        <p style="margin:5px 0 0">${clinicName}</p>
      </div>
      <div style="border:1px solid #e0e0e0;border-top:none;padding:20px;border-radius:0 0 8px 8px">
        <p>Dear ${patientName},</p>
        <p>Dr. ${stripDrPrefix(doctorName)} has recommended a follow-up appointment. Please choose one of the available slots below:</p>
        ${contextMessage}
        <p style="margin:8px 0;"><strong>Available times (9 AM - 7 PM):</strong></p>
        ${slotLinks}
        <p style="color:#666;font-size:13px;margin-top:20px">These confirmation links expire in 48 hours. Once you confirm, your appointment will be automatically booked. If you need assistance, please contact the clinic directly.</p>
      </div>
    </div>
  `;

  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: patientEmail,
      subject: `Follow-up Available — Dr. ${stripDrPrefix(doctorName)} — ${clinicName}`,
      html,
    });
    console.log(`✅ Follow-up slots email sent to ${patientEmail}`);
    return { success: true };
  } catch (error) {
    console.error("❌ Email error:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send waiting queue notification — a freed slot is available
 */
async function sendWaitlistNotification(
  patientEmail,
  { patientName, slot, doctorName, clinicName, confirmationLink },
) {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <div style="background:#9C27B0;color:white;padding:20px;border-radius:8px 8px 0 0">
        <h2 style="margin:0">Appointment Slot Available!</h2>
        <p style="margin:5px 0 0">${clinicName}</p>
      </div>
      <div style="border:1px solid #e0e0e0;border-top:none;padding:20px;border-radius:0 0 8px 8px">
        <p>Dear ${patientName},</p>
        <p>Great news! A slot has opened up with <strong>Dr. ${stripDrPrefix(doctorName)}</strong>:</p>
        <div style="background:#f5f5f5;padding:15px;border-radius:4px;text-align:center;margin:15px 0">
          <p style="font-size:18px;margin:0"><strong>${new Date(slot.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</strong></p>
          <p style="font-size:16px;color:#666;margin:5px 0">at <strong>${slot.time}</strong></p>
          <a href="${confirmationLink}" style="display:inline-block;background:#4CAF50;color:white;padding:12px 24px;border-radius:4px;text-decoration:none;margin-top:10px;font-size:16px">Confirm Appointment</a>
        </div>
        <p style="color:#666;font-size:13px">This link expires in 48 hours. If not confirmed, the slot will be offered to the next patient.</p>
      </div>
    </div>
  `;

  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: patientEmail,
      subject: `Slot Available — Dr. ${stripDrPrefix(doctorName)} — ${clinicName}`,
      html,
    });
    console.log(`✅ Waitlist notification sent to ${patientEmail}`);
    return { success: true };
  } catch (error) {
    console.error("❌ Email error:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Notify patient that a previously-cancelled slot (earlier than their current booking) is now free.
 * If they confirm, their later appointment will be moved to this slot.
 */
async function sendSlotReleasedNotification(
  patientEmail,
  { patientName, freedSlot, laterSlot, doctorName, clinicName, confirmLink },
) {
  const freedDateStr = new Date(freedSlot.date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const laterDateStr = new Date(laterSlot.date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <div style="background:#673AB7;color:white;padding:20px;border-radius:8px 8px 0 0">
        <h2 style="margin:0">Earlier Appointment Available!</h2>
        <p style="margin:5px 0 0">${clinicName}</p>
      </div>
      <div style="border:1px solid #e0e0e0;border-top:none;padding:20px;border-radius:0 0 8px 8px">
        <p>Dear ${patientName},</p>
        <p>An earlier appointment slot has opened up with <strong>Dr. ${stripDrPrefix(doctorName)}</strong>. You can move your current appointment to this earlier date!</p>

        <div style="display:flex;gap:12px;margin:16px 0;flex-wrap:wrap">
          <div style="flex:1;background:#fff3e0;padding:14px;border-radius:6px;border-left:4px solid #FF9800;min-width:200px">
            <p style="margin:0 0 4px;font-size:12px;color:#888;text-transform:uppercase">Your current appointment</p>
            <p style="margin:0;font-weight:bold">${laterDateStr}</p>
            <p style="margin:0;color:#666">at ${laterSlot.time}</p>
          </div>
          <div style="flex:1;background:#e8f5e9;padding:14px;border-radius:6px;border-left:4px solid #4CAF50;min-width:200px">
            <p style="margin:0 0 4px;font-size:12px;color:#888;text-transform:uppercase">New earlier slot</p>
            <p style="margin:0;font-weight:bold">${freedDateStr}</p>
            <p style="margin:0;color:#666">at ${freedSlot.time}</p>
          </div>
        </div>

        <p>If you confirm, your appointment will be automatically moved to the earlier slot and your current appointment will be cancelled.</p>
        <div style="text-align:center;margin:20px 0">
          <a href="${confirmLink}" style="display:inline-block;background:#4CAF50;color:white;padding:12px 32px;border-radius:4px;text-decoration:none;font-size:16px;font-weight:bold">Move to Earlier Slot</a>
        </div>
        <p style="color:#666;font-size:13px">This link expires in 48 hours. If you prefer to keep your current appointment, simply ignore this email.</p>
      </div>
    </div>
  `;

  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: patientEmail,
      subject: `Earlier Slot Available — Dr. ${stripDrPrefix(doctorName)} — ${clinicName}`,
      html,
    });
    console.log(`✅ Slot-release notification sent to ${patientEmail}`);
    return { success: true };
  } catch (error) {
    console.error("❌ Email error:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Notify a pending follow-up patient that a slot has opened on/after their doctor's suggested date
 * (triggered when an appointment is cancelled and the patient hasn't booked yet)
 */
async function sendFollowUpSlotOpened(
  patientEmail,
  { patientName, slot, preferredDate, doctorName, clinicName, confirmLink },
) {
  const slotDateStr = new Date(slot.date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const preferredDateStr = preferredDate
    ? new Date(preferredDate).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "the requested date";

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <div style="background:#4CAF50;color:white;padding:20px;border-radius:8px 8px 0 0">
        <h2 style="margin:0">Follow-up Slot Now Available!</h2>
        <p style="margin:5px 0 0">${clinicName}</p>
      </div>
      <div style="border:1px solid #e0e0e0;border-top:none;padding:20px;border-radius:0 0 8px 8px">
        <p>Dear ${patientName},</p>
        <p>Great news! An appointment slot has become available with <strong>Dr. ${stripDrPrefix(doctorName)}</strong> on or after your doctor's recommended follow-up date of <strong>${preferredDateStr}</strong>.</p>
        <div style="background:#e8f5e9;padding:15px;border-radius:4px;text-align:center;margin:15px 0">
          <p style="font-size:18px;margin:0"><strong>${slotDateStr}</strong></p>
          <p style="font-size:16px;color:#666;margin:5px 0">at <strong>${slot.time}</strong></p>
          <a href="${confirmLink}" style="display:inline-block;background:#4CAF50;color:white;padding:12px 24px;border-radius:4px;text-decoration:none;margin-top:10px;font-size:16px">Book This Slot</a>
        </div>
        <div style="background:#fff3e0;padding:12px;border-left:4px solid #FF9800;margin:12px 0;border-radius:4px">
          <p style="margin:0;font-size:13px"><strong>Note:</strong> If you have already booked a later appointment and you confirm this earlier slot, your later appointment will be automatically cancelled.</p>
        </div>
        <p style="color:#666;font-size:13px;margin-top:20px">This link expires in 48 hours. If not confirmed, the slot may be offered to another patient.</p>
      </div>
    </div>
  `;

  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: patientEmail,
      subject: `Follow-up Slot Available — Dr. ${stripDrPrefix(doctorName)} — ${clinicName}`,
      html,
    });
    console.log(
      `✅ Follow-up slot-opened notification sent to ${patientEmail}`,
    );
    return { success: true };
  } catch (error) {
    console.error("❌ Email error:", error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  getTransporter,
  sendConsultationSummary,
  sendFollowUpSlots,
  sendWaitlistNotification,
  sendSlotReleasedNotification,
  sendFollowUpSlotOpened,
};
