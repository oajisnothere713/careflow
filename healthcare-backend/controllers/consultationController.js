const ConsultationNote = require('../models/consultation/ConsultationNote');
const Prescription = require('../models/consultation/Prescription');
const LabReport = require('../models/consultation/LabReport');
const VisitRecord = require('../models/consultation/VisitRecord');
const Appointment = require('../models/appointment/Appointment');
const Patient = require('../models/patient/Patient');
const Doctor = require('../models/clinic/Doctor');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

exports.createConsultation = asyncHandler(async (req, res, next) => {
  const {
    appointment_id,
    chief_complaint,
    symptoms,
    vital_signs,
    physical_examination,
    diagnosis,
    treatment_plan,
    follow_up_instructions,
    follow_up_date,
    notes,
  } = req.body;

  if (!appointment_id) {
    return res.status(400).json({
      message:
        "appointment_id is required. Consultation must be linked to an appointment.",
    });
  }

  if (
    !vital_signs ||
    !vital_signs.blood_pressure ||
    !vital_signs.heart_rate ||
    !vital_signs.temperature
  ) {
    return res.status(400).json({
      message:
        "Vital signs (blood_pressure, heart_rate, temperature) are required",
    });
  }

  if (!chief_complaint || !diagnosis) {
    return res.status(400).json({
      message: "Chief complaint and diagnosis are required",
    });
  }

  const appointment = await Appointment.findById(appointment_id)
    .populate("patient_id")
    .populate("doctor_id");

  if (!appointment) {
    return res.status(404).json({
      message: "Appointment not found",
    });
  }

  const doctor = await Doctor.findOne({ user_id: req.user.userId });
  if (!doctor) {
    return res.status(404).json({ message: "Doctor profile not found" });
  }

  if (appointment.doctor_id._id.toString() !== doctor._id.toString()) {
    return res.status(403).json({
      message: "You can only create consultations for your own appointments",
    });
  }

  if (!["booked", "confirmed"].includes(appointment.status)) {
    return res.status(400).json({
      message: `Cannot create consultation for appointment with status '${appointment.status}'. Appointment must be 'booked' or 'confirmed'.`,
    });
  }

  const existingConsultation = await ConsultationNote.findOne({
    appointment_id,
  });
  if (existingConsultation) {
    return res.status(400).json({
      message: "Consultation already exists for this appointment",
    });
  }

  const consultationNote = new ConsultationNote({
    appointment_id: appointment._id,
    patient_id: appointment.patient_id._id,
    doctor_id: doctor._id,
    clinic_id: appointment.clinic_id,
    chief_complaint,
    symptoms,
    vital_signs,
    physical_examination,
    diagnosis,
    treatment_plan,
    follow_up_instructions,
    follow_up_date,
    notes,
  });

  await consultationNote.save();

  if (follow_up_date) {
    try {
      const FollowUp = require('../models/appointment/FollowUp');
      const followUp = new FollowUp({
        patient_id: appointment.patient_id._id,
        doctor_id: doctor._id,
        consultation_note_id: consultationNote._id,
        clinic_id: appointment.clinic_id,
        follow_up_date,
        purpose: follow_up_instructions || diagnosis,
        instructions: follow_up_instructions,
        priority: "routine",
        notes:
          `Auto-created from consultation. ${follow_up_instructions || ""}`.trim(),
        created_by: req.user.userId,
        status: "pending",
      });
      await followUp.save();
      console.log(
        `Follow-up record created automatically for patient ${appointment.patient_id._id}`,
      );

      const {
        scheduleFollowUpReminder,
      } = require("../services/reminderService");
      scheduleFollowUpReminder(followUp).catch((err) =>
        console.error("Error scheduling follow-up reminder:", err.message),
      );

      (async () => {
        try {
          const User = require('../models/user/User');
          const Clinic = require('../models/clinic/Clinic');
          const ConfirmationToken = require('../models/appointment/ConfirmationToken');
          const { v4: uuidv4 } = require("uuid");
          const { sendFollowUpSlots } = require("../services/emailService");
          const config = require("../config/env");
          const {
            getAvailableSlots,
            generateDefaultSlots,
          } = require("../services/cronService");

          const patient = await Patient.findById(appointment.patient_id._id);
          const patientUser = patient
            ? await User.findById(patient.user_id)
            : null;
          if (!patientUser?.email) return;

          const doctorUser = await User.findById(doctor.user_id);
          const clinic = await Clinic.findById(appointment.clinic_id);

          const slotResult = await getAvailableSlots(
            doctor._id,
            new Date(follow_up_date),
            0,
          );

          const availableSlots = slotResult.fromPreferredDate
            ? slotResult.preferredDateSlots
            : slotResult.nextAvailableSlots;

          if (!availableSlots || availableSlots.length === 0) {
            console.warn(
              `⚠️ No slots found for doctor ${doctor._id} — generating default slots`,
            );
            const defaultSlots = await generateDefaultSlots(
              doctor._id,
              new Date(follow_up_date),
            );

            if (defaultSlots.length === 0) {
              console.warn(
                `⚠️ All default slots booked for ${follow_up_date}`,
              );
              return;
            }

            const slotsWithTokens = [];
            const tokenIds = [];
            for (const slot of defaultSlots) {
              const token = uuidv4();
              const tokenRecord = await ConfirmationToken.create({
                token,
                type: "follow_up_confirm",
                patient_id: appointment.patient_id._id,
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
                preferredDate: new Date(follow_up_date),
                fromPreferredDate: true,
                doctorName: doctorUser?.name || "Doctor",
                clinicName: clinic?.name || "Clinic",
                frontendUrl: config.frontendUrl,
              },
            );
            if (defaultEmailResult.success) {
              await FollowUp.findByIdAndUpdate(followUp._id, {
                patient_notified_at: new Date(),
                suggested_slots: defaultSlots,
              });
              console.log(
                `✅ Default follow-up slots email sent to ${patientUser.email}`,
              );
            } else {
              await ConfirmationToken.updateMany(
                { _id: { $in: tokenIds }, status: "pending" },
                { status: "expired" },
              );
              console.error(
                "Default follow-up slots email failed:",
                defaultEmailResult.error,
              );
            }
            return;
          }

          const slotsWithTokens = [];
          const tokenIds = [];
          for (const slot of availableSlots) {
            const token = uuidv4();
            const tokenRecord = await ConfirmationToken.create({
              token,
              type: "follow_up_confirm",
              patient_id: appointment.patient_id._id,
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

          const emailResult = await sendFollowUpSlots(patientUser.email, {
            patientName: patientUser.name,
            slots: slotsWithTokens,
            preferredDate: new Date(follow_up_date),
            fromPreferredDate: slotResult.fromPreferredDate,
            doctorName: doctorUser?.name || "Doctor",
            clinicName: clinic?.name || "Clinic",
            frontendUrl: config.frontendUrl,
          });

          if (!emailResult.success) {
            await ConfirmationToken.updateMany(
              { _id: { $in: tokenIds }, status: "pending" },
              { status: "expired" },
            );
            console.error(
              "Immediate follow-up slot email failed:",
              emailResult.error,
            );
            return;
          }

          await FollowUp.findByIdAndUpdate(followUp._id, {
            patient_notified_at: new Date(),
            suggested_slots: availableSlots,
          });

          console.log(
            `✅ Immediate follow-up slot email sent to ${patientUser.email}`,
          );
        } catch (slotErr) {
          console.error(
            "Immediate follow-up slot processing error:",
            slotErr.message,
          );
        }
      })();
    } catch (followUpError) {
      console.error(
        "Error creating follow-up record:",
        followUpError.message,
      );
    }
  }

  appointment.status = "completed";
  await appointment.save();

  await consultationNote.populate([
    {
      path: "patient_id",
      select: "patient_id gender blood_group",
      populate: { path: "user_id", select: "name email phone" },
    },
    {
      path: "doctor_id",
      select: "specialization years_of_experience",
      populate: { path: "user_id", select: "name email phone" },
    },
    {
      path: "appointment_id",
      select: "appointment_date appointment_time reason_for_visit",
    },
  ]);

  const transformedResponse = {
    _id: consultationNote._id,
    appointment_id: consultationNote.appointment_id._id,
    appointment_date: consultationNote.appointment_id.appointment_date,
    appointment_time: consultationNote.appointment_id.appointment_time,
    patient: {
      _id: consultationNote.patient_id._id,
      patient_id: consultationNote.patient_id.patient_id,
      name: consultationNote.patient_id.user_id.name,
      email: consultationNote.patient_id.user_id.email,
      phone: consultationNote.patient_id.user_id.phone,
      blood_group: consultationNote.patient_id.blood_group,
    },
    doctor: {
      _id: consultationNote.doctor_id._id,
      name: consultationNote.doctor_id.user_id.name,
      email: consultationNote.doctor_id.user_id.email,
      phone: consultationNote.doctor_id.user_id.phone,
      specialization: consultationNote.doctor_id.specialization,
    },
    chief_complaint: consultationNote.chief_complaint,
    symptoms: consultationNote.symptoms,
    vital_signs: consultationNote.vital_signs,
    physical_examination: consultationNote.physical_examination,
    diagnosis: consultationNote.diagnosis,
    treatment_plan: consultationNote.treatment_plan,
    follow_up_instructions: consultationNote.follow_up_instructions,
    follow_up_date: consultationNote.follow_up_date,
    notes: consultationNote.notes,
    created_at: consultationNote.createdAt,
  };

  res.status(201).json({
    message: "Consultation note created successfully",
    consultation: transformedResponse,
  });
});

exports.getConsultationByAppointment = asyncHandler(async (req, res, next) => {
  const consultation = await ConsultationNote.findOne({
    appointment_id: req.params.appointmentId,
  }).populate([
    {
      path: "patient_id",
      select: "patient_id gender blood_group user_id",
      populate: { path: "user_id", select: "name email phone" },
    },
    {
      path: "doctor_id",
      select: "specialization years_of_experience user_id",
      populate: { path: "user_id", select: "name email phone" },
    },
    {
      path: "appointment_id",
      select: "appointment_date appointment_time reason_for_visit status",
    },
  ]);

  if (!consultation) {
    return res
      .status(404)
      .json({ message: "Consultation not found for this appointment" });
  }

  const isOwnConsultation =
    req.user.role === "patient" &&
    consultation.patient_id.user_id._id.toString() ===
      req.user.userId.toString();
  const isConsultingDoctor =
    req.user.role === "doctor" &&
    consultation.doctor_id.user_id._id.toString() ===
      req.user.userId.toString();

  if (
    !isOwnConsultation &&
    !isConsultingDoctor &&
    req.user.role !== "admin" &&
    req.user.role !== "clinic_admin"
  ) {
    return res.status(403).json({ message: "Access denied" });
  }

  const transformedResponse = {
    _id: consultation._id,
    consultation_id: consultation._id,
    appointment_id: consultation.appointment_id._id,
    appointment_date: consultation.appointment_id.appointment_date,
    appointment_time: consultation.appointment_id.appointment_time,
    patient: {
      _id: consultation.patient_id._id,
      patient_id: consultation.patient_id.patient_id,
      name: consultation.patient_id.user_id.name,
      email: consultation.patient_id.user_id.email,
      phone: consultation.patient_id.user_id.phone,
      blood_group: consultation.patient_id.blood_group,
    },
    doctor: {
      _id: consultation.doctor_id._id,
      name: consultation.doctor_id.user_id.name,
      email: consultation.doctor_id.user_id.email,
      phone: consultation.doctor_id.user_id.phone,
      specialization: consultation.doctor_id.specialization,
    },
    chief_complaint: consultation.chief_complaint,
    symptoms: consultation.symptoms,
    vital_signs: consultation.vital_signs,
    physical_examination: consultation.physical_examination,
    diagnosis: consultation.diagnosis,
    treatment_plan: consultation.treatment_plan,
    follow_up_instructions: consultation.follow_up_instructions,
    follow_up_date: consultation.follow_up_date,
    notes: consultation.notes,
    created_at: consultation.createdAt,
  };

  res.json({ consultation: transformedResponse });
});

exports.getConsultationById = asyncHandler(async (req, res, next) => {
  const consultation = await ConsultationNote.findById(
    req.params.id,
  ).populate([
    {
      path: "patient_id",
      select: "patient_id gender blood_group user_id",
      populate: { path: "user_id", select: "name email phone" },
    },
    {
      path: "doctor_id",
      select: "specialization years_of_experience user_id",
      populate: { path: "user_id", select: "name email phone" },
    },
    {
      path: "appointment_id",
      select: "appointment_date appointment_time reason_for_visit status",
    },
  ]);

  if (!consultation) {
    return res.status(404).json({ message: "Consultation not found" });
  }

  const isOwnConsultation =
    req.user.role === "patient" &&
    consultation.patient_id.user_id._id.toString() ===
      req.user.userId.toString();
  const isConsultingDoctor =
    req.user.role === "doctor" &&
    consultation.doctor_id.user_id._id.toString() ===
      req.user.userId.toString();

  if (
    !isOwnConsultation &&
    !isConsultingDoctor &&
    req.user.role !== "admin" &&
    req.user.role !== "clinic_admin"
  ) {
    return res.status(403).json({ message: "Access denied" });
  }

  const transformedResponse = {
    _id: consultation._id,
    appointment_id: consultation.appointment_id._id,
    appointment_date: consultation.appointment_id.appointment_date,
    appointment_time: consultation.appointment_id.appointment_time,
    patient: {
      _id: consultation.patient_id._id,
      patient_id: consultation.patient_id.patient_id,
      name: consultation.patient_id.user_id.name,
      email: consultation.patient_id.user_id.email,
      phone: consultation.patient_id.user_id.phone,
      blood_group: consultation.patient_id.blood_group,
    },
    doctor: {
      _id: consultation.doctor_id._id,
      name: consultation.doctor_id.user_id.name,
      email: consultation.doctor_id.user_id.email,
      phone: consultation.doctor_id.user_id.phone,
      specialization: consultation.doctor_id.specialization,
    },
    chief_complaint: consultation.chief_complaint,
    symptoms: consultation.symptoms,
    vital_signs: consultation.vital_signs,
    physical_examination: consultation.physical_examination,
    diagnosis: consultation.diagnosis,
    treatment_plan: consultation.treatment_plan,
    follow_up_instructions: consultation.follow_up_instructions,
    follow_up_date: consultation.follow_up_date,
    notes: consultation.notes,
    created_at: consultation.createdAt,
  };

  res.json({ consultation: transformedResponse });
});

exports.getConsultationsByPatient = asyncHandler(async (req, res, next) => {
  const patient = await Patient.findById(req.params.patientId);
  if (!patient) {
    return res.status(404).json({ message: "Patient not found" });
  }

  const isOwnRecord =
    req.user.role === "patient" &&
    patient.user_id.toString() === req.user.userId.toString();
  const isSameClinic =
    req.user.role !== "admin" &&
    patient.clinic_id.toString() === req.user.clinicId?.toString();

  if (!isOwnRecord && !isSameClinic && req.user.role !== "admin") {
    return res.status(403).json({ message: "Access denied" });
  }

  const consultations = await ConsultationNote.find({
    patient_id: req.params.patientId,
  })
    .populate([
      {
        path: "doctor_id",
        select: "specialization user_id",
        populate: { path: "user_id", select: "name email phone" },
      },
      {
        path: "appointment_id",
        select: "appointment_date appointment_time reason_for_visit",
      },
    ])
    .sort({ createdAt: -1 });

  const transformedConsultations = consultations.map((consultation) => ({
    _id: consultation._id,
    appointment_id: consultation.appointment_id._id,
    appointment_date: consultation.appointment_id.appointment_date,
    appointment_time: consultation.appointment_id.appointment_time,
    doctor: {
      _id: consultation.doctor_id._id,
      name: consultation.doctor_id.user_id.name,
      email: consultation.doctor_id.user_id.email,
      phone: consultation.doctor_id.user_id.phone,
      specialization: consultation.doctor_id.specialization,
    },
    chief_complaint: consultation.chief_complaint,
    symptoms: consultation.symptoms,
    vital_signs: consultation.vital_signs,
    physical_examination: consultation.physical_examination,
    diagnosis: consultation.diagnosis,
    treatment_plan: consultation.treatment_plan,
    follow_up_instructions: consultation.follow_up_instructions,
    follow_up_date: consultation.follow_up_date,
    notes: consultation.notes,
    created_at: consultation.createdAt,
  }));

  res.json({
    consultations: transformedConsultations,
    total: transformedConsultations.length,
  });
});

exports.addPrescription = asyncHandler(async (req, res, next) => {
  const { medications, additional_instructions, appointment_id } = req.body;

  if (
    !medications ||
    !Array.isArray(medications) ||
    medications.length === 0
  ) {
    return res.status(400).json({
      message: "At least one medication is required",
    });
  }

  for (const med of medications) {
    const medicineName = med.medicine_name || med.medication_name;
    if (!medicineName || !med.dosage || !med.frequency) {
      return res.status(400).json({
        message:
          "Each medication must have medicine_name, dosage, and frequency",
      });
    }
  }

  const transformedMedications = medications.map((med) => ({
    medicine_name: med.medicine_name || med.medication_name,
    dosage: med.dosage,
    frequency: med.frequency,
    duration: med.duration,
    instructions: med.instructions,
    quantity: med.quantity,
  }));

  const consultation = await ConsultationNote.findById(req.params.id);

  if (!consultation) {
    return res.status(404).json({
      message: "Consultation not found",
      hint: "If you only have an appointment ID, use GET /api/consultations/by-appointment/{appointmentId} to retrieve the consultation_id",
    });
  }

  if (!consultation.appointment_id) {
    return res.status(400).json({
      message: "Consultation is not linked to an appointment",
    });
  }

  if (!appointment_id) {
    return res.status(400).json({
      message:
        "appointment_id is required and must match this consultation's appointment",
      hint: "If you only have an appointment ID, use GET /api/consultations/by-appointment/{appointmentId} to retrieve the consultation_id",
    });
  }

  if (
    consultation.appointment_id.toString() !== appointment_id.toString()
  ) {
    return res.status(400).json({
      message: "appointment_id must match the consultation's appointment",
      hint: "If you only have an appointment ID, use GET /api/consultations/by-appointment/{appointmentId} to retrieve the consultation_id",
    });
  }

  const doctor = await Doctor.findOne({ user_id: req.user.userId });
  if (consultation.doctor_id.toString() !== doctor._id.toString()) {
    return res.status(403).json({
      message: "You can only add prescriptions to your own consultations",
    });
  }

  const prescription = new Prescription({
    consultation_id: consultation._id,
    appointment_id: consultation.appointment_id,
    patient_id: consultation.patient_id,
    doctor_id: doctor._id,
    clinic_id: consultation.clinic_id,
    medications: transformedMedications,
    additional_instructions,
  });

  await prescription.save();

  await prescription.populate([
    {
      path: "doctor_id",
      select: "user_id",
      populate: { path: "user_id", select: "name" },
    },
    {
      path: "patient_id",
      select: "patient_id user_id",
      populate: { path: "user_id", select: "name" },
    },
  ]);

  res.status(201).json({
    message: "Prescription created successfully",
    prescription: {
      _id: prescription._id,
      consultation_id: prescription.consultation_id,
      appointment_id: prescription.appointment_id,
      patient: {
        _id: prescription.patient_id._id,
        patient_id: prescription.patient_id.patient_id,
        name: prescription.patient_id.user_id.name,
      },
      doctor: {
        _id: prescription.doctor_id._id,
        name: prescription.doctor_id.user_id.name,
      },
      medications: prescription.medications,
      additional_instructions: prescription.additional_instructions,
      created_at: prescription.createdAt,
    },
  });
});

exports.getPrescriptionsByPatient = asyncHandler(async (req, res, next) => {
  const patient = await Patient.findById(req.params.patientId);
  if (!patient) {
    return res.status(404).json({ message: "Patient not found" });
  }

  const isOwnRecord =
    req.user.role === "patient" &&
    patient.user_id.toString() === req.user.userId.toString();
  const isSameClinic =
    req.user.role !== "admin" &&
    patient.clinic_id.toString() === req.user.clinicId?.toString();

  if (!isOwnRecord && !isSameClinic && req.user.role !== "admin") {
    return res.status(403).json({ message: "Access denied" });
  }

  const prescriptions = await Prescription.find({
    patient_id: req.params.patientId,
  })
    .populate({
      path: "doctor_id",
      select: "specialization user_id",
      populate: { path: "user_id", select: "name" },
    })
    .sort({ createdAt: -1 });

  const transformedPrescriptions = prescriptions.map((prescription) => ({
    _id: prescription._id,
    consultation_id: prescription.consultation_id,
    doctor: {
      _id: prescription.doctor_id._id,
      name: prescription.doctor_id.user_id.name,
      specialization: prescription.doctor_id.specialization,
    },
    medications: prescription.medications,
    additional_instructions: prescription.additional_instructions,
    created_at: prescription.createdAt,
  }));

  res.json({
    prescriptions: transformedPrescriptions,
    total: transformedPrescriptions.length,
  });
});

exports.addLabReport = asyncHandler(async (req, res, next) => {
  const { patient_id, test_name, test_date, test_result } = req.body;

  if (!patient_id || !test_name || !test_date || !test_result) {
    return res.status(400).json({
      message:
        "patient_id, test_name, test_date, and test_result are required",
    });
  }

  const labReport = new LabReport({
    patient_id,
    test_name,
    test_date,
    test_result,
    normal_range: req.body.normal_range,
    notes: req.body.notes,
    clinic_id: req.user.clinicId,
  });

  await labReport.save();

  res.status(201).json({
    message: "Lab report added successfully",
    lab_report: {
      _id: labReport._id,
      patient_id: labReport.patient_id,
      test_name: labReport.test_name,
      test_date: labReport.test_date,
      test_result: labReport.test_result,
      normal_range: labReport.normal_range,
      created_at: labReport.createdAt,
    },
  });
});

exports.getLabReportsByPatient = asyncHandler(async (req, res, next) => {
  const patient = await Patient.findById(req.params.patientId);
  if (!patient) {
    return res.status(404).json({ message: "Patient not found" });
  }

  const isOwnRecord =
    req.user.role === "patient" &&
    patient.user_id.toString() === req.user.userId.toString();
  const isSameClinic =
    req.user.role !== "admin" &&
    patient.clinic_id.toString() === req.user.clinicId?.toString();

  if (!isOwnRecord && !isSameClinic && req.user.role !== "admin") {
    return res.status(403).json({ message: "Access denied" });
  }

  const labReports = await LabReport.find({
    patient_id: req.params.patientId,
  }).sort({ test_date: -1 });

  res.json({
    lab_reports: labReports,
    total: labReports.length,
  });
});

exports.createVisitRecord = asyncHandler(async (req, res, next) => {
  const { appointment_id, patient_id, visit_type, summary } = req.body;

  if (!appointment_id || !patient_id || !visit_type || !summary) {
    return res.status(400).json({
      message:
        "appointment_id, patient_id, visit_type, and summary are required",
    });
  }

  const visitRecord = new VisitRecord({
    appointment_id,
    patient_id,
    visit_type,
    summary,
    clinic_id: req.user.clinicId,
  });

  await visitRecord.save();

  res.status(201).json({
    message: "Visit record created successfully",
    visit_record: {
      _id: visitRecord._id,
      appointment_id: visitRecord.appointment_id,
      patient_id: visitRecord.patient_id,
      visit_type: visitRecord.visit_type,
      summary: visitRecord.summary,
      created_at: visitRecord.createdAt,
    },
  });
});

exports.getVisitRecordsByPatient = asyncHandler(async (req, res, next) => {
  const patient = await Patient.findById(req.params.patientId);
  if (!patient) {
    return res.status(404).json({ message: "Patient not found" });
  }

  const isOwnRecord =
    req.user.role === "patient" &&
    patient.user_id.toString() === req.user.userId.toString();
  const isSameClinic =
    req.user.role !== "admin" &&
    patient.clinic_id.toString() === req.user.clinicId?.toString();

  if (!isOwnRecord && !isSameClinic && req.user.role !== "admin") {
    return res.status(403).json({ message: "Access denied" });
  }

  const visitRecords = await VisitRecord.find({
    patient_id: req.params.patientId,
  })
    .populate("appointment_id")
    .sort({ createdAt: -1 });

  res.json({
    visit_records: visitRecords,
    total: visitRecords.length,
  });
});

exports.addPrescriptionByAppointment = asyncHandler(async (req, res, next) => {
  const {
    medications,
    additional_instructions,
    chief_complaint,
    vital_signs,
    diagnosis,
  } = req.body;

  if (
    !medications ||
    !Array.isArray(medications) ||
    medications.length === 0
  ) {
    return res.status(400).json({
      message: "At least one medication is required",
    });
  }

  for (const med of medications) {
    const medicineName = med.medicine_name || med.medication_name;
    if (!medicineName || !med.dosage || !med.frequency) {
      return res.status(400).json({
        message:
          "Each medication must have medicine_name, dosage, and frequency",
      });
    }
  }

  const transformedMedications = medications.map((med) => ({
    medicine_name: med.medicine_name || med.medication_name,
    dosage: med.dosage,
    frequency: med.frequency,
    duration: med.duration,
    instructions: med.instructions,
    quantity: med.quantity,
  }));

  const appointment = await Appointment.findById(req.params.appointmentId)
    .populate("doctor_id")
    .populate("patient_id");

  if (!appointment) {
    return res.status(404).json({ message: "Appointment not found" });
  }

  const doctor = await Doctor.findOne({ user_id: req.user.userId });
  if (!doctor) {
    return res.status(404).json({ message: "Doctor profile not found" });
  }

  if (appointment.doctor_id._id.toString() !== doctor._id.toString()) {
    return res.status(403).json({
      message: "You can only add prescriptions for your own appointments",
    });
  }

  let consultation = await ConsultationNote.findOne({
    appointment_id: req.params.appointmentId,
  });

  if (!consultation) {
    if (!chief_complaint || !vital_signs || !diagnosis) {
      return res.status(400).json({
        message:
          "Consultation does not exist. Provide chief_complaint, vital_signs (with blood_pressure, heart_rate, temperature), and diagnosis to create it.",
      });
    }

    if (
      !vital_signs.blood_pressure ||
      !vital_signs.heart_rate ||
      !vital_signs.temperature
    ) {
      return res.status(400).json({
        message:
          "vital_signs must include blood_pressure, heart_rate, and temperature",
      });
    }

    consultation = new ConsultationNote({
      appointment_id: appointment._id,
      patient_id: appointment.patient_id._id,
      doctor_id: doctor._id,
      clinic_id: appointment.clinic_id,
      chief_complaint,
      vital_signs,
      diagnosis,
      treatment_plan: req.body.treatment_plan || "",
      follow_up_instructions: req.body.follow_up_instructions || "",
      notes: req.body.notes || "",
    });

    await consultation.save();

    appointment.status = "completed";
    await appointment.save();
  }

  const prescription = new Prescription({
    consultation_id: consultation._id,
    appointment_id: consultation.appointment_id,
    patient_id: consultation.patient_id,
    doctor_id: doctor._id,
    clinic_id: consultation.clinic_id,
    medications: transformedMedications,
    additional_instructions,
  });

  await prescription.save();

  await prescription.populate([
    {
      path: "doctor_id",
      select: "user_id",
      populate: { path: "user_id", select: "name" },
    },
    {
      path: "patient_id",
      select: "patient_id user_id",
      populate: { path: "user_id", select: "name" },
    },
  ]);

  res.status(201).json({
    message: "Prescription created successfully",
    prescription: {
      _id: prescription._id,
      consultation_id: prescription.consultation_id,
      appointment_id: prescription.appointment_id,
      patient: {
        _id: prescription.patient_id._id,
        patient_id: prescription.patient_id.patient_id,
        name: prescription.patient_id.user_id.name,
      },
      doctor: {
        _id: prescription.doctor_id._id,
        name: prescription.doctor_id.user_id.name,
      },
      medications: prescription.medications,
      additional_instructions: prescription.additional_instructions,
      created_at: prescription.createdAt,
    },
  });
});
