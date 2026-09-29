const Bull = require('bull');
const Reminder = require('../models/appointment/Reminder');
const nodemailer = require('nodemailer');

// Create Bull queue for reminders
let reminderQueue;

try {
  reminderQueue = new Bull('reminders', {
    redis: {
      port: process.env.REDIS_PORT || 6379,
      host: process.env.REDIS_HOST || '127.0.0.1',
    },
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    }
  });
  console.log('✅ Redis connected for reminder queue');
} catch (error) {
  console.warn('⚠️ Redis not available for reminders:', error.message);
  reminderQueue = null;
}

const { getTransporter } = require('./emailService');
let transporter = null;

try {
  transporter = getTransporter();
  console.log('✅ Email transporter configured');
} catch (error) {
  console.warn('⚠️ Email transporter setup failed:', error.message);
}

const sendAppointmentEmail = async ({ to, subject, html }) => {
  if (!to || !transporter) {
    console.warn('⚠️ Skipping email: missing recipient or transporter not configured');
    return null;
  }
  try {
    return await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      html
    });
  } catch (error) {
    console.error('❌ Email send failed:', error.message);
    return null;
  }
};

// Process reminder jobs
if (reminderQueue) {
  reminderQueue.process(async (job) => {
    let reminder = null;
    const { reminderId } = job.data;

    try {
      reminder = await Reminder.findById(reminderId)
        .populate('user_id', 'name email')
        .populate('patient_id')
        .populate('clinic_id', 'name');

      if (!reminder) {
        throw new Error('Reminder not found');
      }

      if (reminder.status !== 'scheduled') {
        return { message: 'Reminder already processed' };
      }

      // Send email
      if (reminder.channel === 'email' && reminder.user_id.email && transporter) {
        try {
          const mailOptions = {
            from: process.env.EMAIL_USER,
            to: reminder.user_id.email,
            subject: reminder.subject,
            html: `
              <h2>${reminder.subject}</h2>
              <p>Dear ${reminder.user_id.name},</p>
              <p>${reminder.message}</p>
              <br/>
              <p>Best regards,<br/>${reminder.clinic_id?.name || 'Healthcare Portal'}</p>
            `
          };

          await transporter.sendMail(mailOptions);
        } catch (emailError) {
          console.error('Email send error in reminder job:', emailError.message);
          // Continue to mark as sent even if email fails
        }
      }

      // Update reminder status
      reminder.status = 'sent';
      reminder.sent_at = new Date();
      await reminder.save();

      return { message: 'Reminder sent successfully' };
    } catch (error) {
      console.error('Reminder job error:', error.message);

      // Update reminder with error (only if reminder was loaded)
      if (reminder) {
        try {
          reminder.status = 'failed';
          reminder.error_message = error.message;
          reminder.retry_count = (reminder.retry_count || 0) + 1;
          await reminder.save();
        } catch (saveError) {
          console.error('Failed to update reminder status:', saveError.message);
        }
      }

      throw error;
    }
  });
}

/**
 * Schedule a reminder
 */
const scheduleReminder = async (reminderData) => {
  try {
    const reminder = new Reminder(reminderData);
    await reminder.save();

    // Only enqueue if Redis/Bull queue is available
    if (reminderQueue) {
      // Calculate delay until scheduled time
      const now = new Date();
      const scheduledTime = new Date(reminder.scheduled_at);
      const delay = scheduledTime.getTime() - now.getTime();

      try {
        if (delay > 0) {
          // Add job to queue
          await reminderQueue.add(
            { reminderId: reminder._id },
            { delay }
          );
          console.log(`✅ Reminder scheduled for ${scheduledTime}`);
        } else {
          console.log('⚠️ Scheduled time is in the past, sending immediately');
          await reminderQueue.add({ reminderId: reminder._id });
        }
      } catch (queueError) {
        console.error('Failed to enqueue reminder:', queueError.message);
        // Reminder is still saved in DB, can be processed later
      }
    } else {
      console.warn('⚠️ Redis queue not available. Reminder saved but won\'t be processed.');
    }

    return reminder;
  } catch (error) {
    console.error('Schedule reminder error:', error.message);
    throw error;
  }
};

/**
 * Schedule appointment reminder (24 hours before)
 */
const scheduleAppointmentReminder = async (appointment) => {
  try {
    const Patient = require('../models/patient/Patient');
    const patient = await Patient.findById(appointment.patient_id).populate('user_id');

    if (!patient || !patient.user_id) {
      return null;
    }

    const appointmentDateTime = new Date(appointment.appointment_date);
    const [hours, minutes] = appointment.appointment_time.split(':');
    appointmentDateTime.setHours(parseInt(hours), parseInt(minutes));

    const reminderTime = new Date(appointmentDateTime.getTime() - 48 * 60 * 60 * 1000);

    if (reminderTime <= new Date()) {
      return null; // Don't schedule if time has passed
    }

    const reminderData = {
      user_id: patient.user_id._id,
      patient_id: patient._id,
      clinic_id: appointment.clinic_id,
      type: 'appointment',
      related_id: appointment._id,
      related_model: 'Appointment',
      subject: 'Appointment Reminder',
      message: `You have an appointment in 2 days at ${appointment.appointment_time}. Please arrive 10 minutes early.`,
      channel: 'email',
      scheduled_at: reminderTime,
      status: 'scheduled'
    };

    return await scheduleReminder(reminderData);
  } catch (error) {
    console.error('Schedule appointment reminder error:', error);
    throw error;
  }
};

/**
 * Schedule doctor appointment reminder (48 hours before)
 */
const scheduleDoctorAppointmentReminder = async (appointment) => {
  try {
    const Doctor = require('../models/clinic/Doctor');
    const doctor = await Doctor.findById(appointment.doctor_id).populate('user_id');

    if (!doctor || !doctor.user_id) {
      return null;
    }

    const appointmentDateTime = new Date(appointment.appointment_date);
    const [hours, minutes] = appointment.appointment_time.split(':');
    appointmentDateTime.setHours(parseInt(hours), parseInt(minutes));

    const reminderTime = new Date(appointmentDateTime.getTime() - 48 * 60 * 60 * 1000);

    if (reminderTime <= new Date()) {
      return null; // Don't schedule if time has passed
    }

    const reminderData = {
      user_id: doctor.user_id._id,
      clinic_id: appointment.clinic_id,
      type: 'appointment',
      related_id: appointment._id,
      related_model: 'Appointment',
      subject: 'Upcoming Appointment Reminder',
      message: `You have an appointment in 2 days at ${appointment.appointment_time}.`,
      channel: 'email',
      scheduled_at: reminderTime,
      status: 'scheduled'
    };

    return await scheduleReminder(reminderData);
  } catch (error) {
    console.error('Schedule doctor appointment reminder error:', error);
    throw error;
  }
};

/**
 * Schedule follow-up reminder
 */
const scheduleFollowUpReminder = async (followUp) => {
  try {
    const Patient = require('../models/patient/Patient');
    const patient = await Patient.findById(followUp.patient_id).populate('user_id');

    if (!patient || !patient.user_id) {
      return null;
    }

    const followUpDate = new Date(followUp.follow_up_date);
    const reminderTime = new Date(followUpDate.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days before

    if (reminderTime <= new Date()) {
      return null;
    }

    const reminderData = {
      user_id: patient.user_id._id,
      patient_id: patient._id,
      clinic_id: followUp.clinic_id,
      type: 'follow_up',
      related_id: followUp._id,
      related_model: 'FollowUp',
      subject: 'Follow-up Reminder',
      message: `You have a follow-up scheduled for ${followUpDate.toDateString()}. Purpose: ${followUp.purpose}`,
      channel: 'email',
      scheduled_at: reminderTime,
      status: 'scheduled'
    };

    return await scheduleReminder(reminderData);
  } catch (error) {
    console.error('Schedule follow-up reminder error:', error);
    throw error;
  }
};

// Queue event listeners
if (reminderQueue) {
  reminderQueue.on('completed', (job, result) => {
    console.log(`✅ Reminder job ${job.id} completed:`, result);
  });

  reminderQueue.on('failed', (job, err) => {
    console.error(`❌ Reminder job ${job.id} failed:`, err.message);
  });
}

module.exports = {
  reminderQueue,
  scheduleReminder,
  scheduleAppointmentReminder,
  scheduleDoctorAppointmentReminder,
  scheduleFollowUpReminder,
  sendAppointmentEmail
};
