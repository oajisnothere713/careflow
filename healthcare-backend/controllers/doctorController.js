const Doctor = require('../models/clinic/Doctor');
const DoctorSlot = require('../models/clinic/DoctorSlot');
const User = require('../models/user/User');
const Clinic = require('../models/clinic/Clinic');
const Appointment = require('../models/appointment/Appointment');
const Patient = require('../models/patient/Patient');
const ConsultationNote = require('../models/consultation/ConsultationNote');
const Invoice = require('../models/billing/Invoice');
const asyncHandler = require('../utils/asyncHandler');

exports.getDoctorProfile = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id).populate(
    "user_id",
    "name email phone",
  );
  if (!doctor) {
    return res.status(404).json({ message: "Doctor not found" });
  }

  // Basic info
  const profile = {
    name: doctor.user_id.name,
    email: doctor.user_id.email,
    phone: doctor.user_id.phone,
    license_number: doctor.license_number,
    specialization: doctor.specialization,
    experience_years: doctor.experience_years,
  };

  // Date helpers
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const weekStart = new Date(today);
  const weekEnd = new Date(today);
  weekEnd.setDate(today.getDate() + 7);

  // Today's appointments
  const todaysAppointments = await Appointment.countDocuments({
    doctor_id: doctor._id,
    appointment_date: { $gte: today, $lt: tomorrow },
    status: { $in: ["booked", "confirmed", "rescheduled"] },
  });

  // Total unique patients
  const patientIds = await Appointment.distinct("patient_id", {
    doctor_id: doctor._id,
  });
  const totalPatients = patientIds.length;

  // Completed consultations
  const completedConsults = await Appointment.countDocuments({
    doctor_id: doctor._id,
    status: "completed",
  });

  // Pending consultations
  const pendingConsults = await Appointment.countDocuments({
    doctor_id: doctor._id,
    status: { $in: ["booked", "confirmed", "rescheduled"] },
  });

  // Today's revenue (sum of invoices for today, status paid/partial)
  const todaysRevenueAgg = await Invoice.aggregate([
    {
      $match: {
        doctor_id: doctor._id,
        invoice_date: { $gte: today, $lt: tomorrow },
        status: { $in: ["paid", "partial", "partially_paid"] },
      },
    },
    { $group: { _id: null, total: { $sum: "$total_amount" } } },
  ]);
  const todaysRevenue = todaysRevenueAgg[0]?.total || 0;

  // Upcoming appointments this week
  const upcomingAppointments = await Appointment.find({
    doctor_id: doctor._id,
    appointment_date: { $gte: today, $lt: weekEnd },
    status: { $in: ["booked", "confirmed", "rescheduled"] },
  })
    .sort({ appointment_date: 1, appointment_time: 1 })
    .limit(10)
    .populate("patient_id", "user_id")
    .lean();

  // Populate patient name for upcoming appointments
  for (const appt of upcomingAppointments) {
    if (appt.patient_id && appt.patient_id.user_id) {
      const user = await User.findById(appt.patient_id.user_id).select(
        "name",
      );
      appt.patient_name = user ? user.name : undefined;
    }
  }

  res.json({
    ...profile,
    todays_appointment_count: todaysAppointments,
    total_patient_count: totalPatients,
    completed_consultation_count: completedConsults,
    pending_consultation_count: pendingConsults,
    todays_revenue: todaysRevenue,
    upcoming_appointments: upcomingAppointments,
  });
});

exports.getAllDoctors = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    specialization,
    availability_status,
  } = req.query;
  let clinic_id = req.query.clinic_id;

  // Clinic Admin can only see their own clinic's doctors
  if (req.user.role === "clinic_admin") {
    clinic_id = req.user.clinicId;
  }

  // Build query
  let query = {};
  if (clinic_id) {
    query.clinic_id = clinic_id;
  }
  if (specialization) {
    query.specialization = new RegExp(specialization, "i");
  }
  if (availability_status) {
    query.availability_status = availability_status;
  }

  const doctors = await Doctor.find(query)
    .populate("user_id", "name email phone")
    .populate("clinic_id", "name address")
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ created_at: -1 });

  const count = await Doctor.countDocuments(query);

  // Transform response to flatten user data and remove duplicate IDs
  const transformedDoctors = doctors.map((doctor) => ({
    _id: doctor._id,
    user_id: doctor.user_id?._id,
    name: doctor.user_id.name,
    email: doctor.user_id.email,
    phone: doctor.user_id.phone,
    specialization: doctor.specialization,
    license_number: doctor.license_number,
    experience_years: doctor.experience_years,
    consultation_fee: doctor.consultation_fee,
    availability_status: doctor.availability_status,
    clinic_id: doctor.clinic_id._id,
    clinic_name: doctor.clinic_id.name,
    created_at: doctor.created_at,
  }));

  res.json({
    doctors: transformedDoctors,
    totalPages: Math.ceil(count / limit),
    currentPage: parseInt(page),
    total: count,
  });
});

exports.getClinicDoctors = asyncHandler(async (req, res) => {
  const { clinicId } = req.params;
  const {
    page = 1,
    limit = 10,
    specialization,
    availability_status,
  } = req.query;

  // Verify clinic exists
  const clinic = await Clinic.findById(clinicId);
  if (!clinic) {
    return res.status(404).json({ message: "Clinic not found" });
  }

  // Build query for doctors in this clinic
  let query = { clinic_id: clinicId };
  if (specialization) {
    query.specialization = new RegExp(specialization, "i");
  }
  if (availability_status) {
    query.availability_status = availability_status;
  }

  const doctors = await Doctor.find(query)
    .populate("user_id", "name email phone")
    .populate("clinic_id", "name address")
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ created_at: -1 });

  const count = await Doctor.countDocuments(query);

  // Transform response
  const transformedDoctors = doctors.map((doctor) => ({
    _id: doctor._id,
    user_id: doctor.user_id?._id,
    name: doctor.user_id.name,
    email: doctor.user_id.email,
    phone: doctor.user_id.phone,
    specialization: doctor.specialization,
    license_number: doctor.license_number,
    experience_years: doctor.experience_years,
    consultation_fee: doctor.consultation_fee,
    availability_status: doctor.availability_status,
    clinic_id: doctor.clinic_id._id,
    clinic_name: doctor.clinic_id.name,
    created_at: doctor.created_at,
  }));

  res.json({
    clinic: { _id: clinic._id, name: clinic.name },
    doctors: transformedDoctors,
    totalPages: Math.ceil(count / limit),
    currentPage: parseInt(page),
    total: count,
  });
});

// Basic HH:MM time validation
const isValidTime = (value) => /^([0-1]?\d|2[0-3]):[0-5]\d$/.test(value || "");

exports.createDoctorSlot = asyncHandler(async (req, res) => {
  const {
    day_of_week,
    start_time,
    end_time,
    slot_duration = 30,
    max_patients = 1,
    is_active = true,
  } = req.body;

  if (!day_of_week || !start_time || !end_time) {
    return res
      .status(400)
      .json({ message: "day_of_week, start_time, end_time are required" });
  }

  if (!isValidTime(start_time) || !isValidTime(end_time)) {
    return res.status(400).json({
      message: "start_time and end_time must be in HH:MM (24h) format",
    });
  }

  // Ensure doctor exists and belongs to same clinic when clinic_admin
  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) {
    return res.status(404).json({ message: "Doctor not found" });
  }

  if (
    req.user.role === "clinic_admin" &&
    doctor.clinic_id.toString() !== req.user.clinicId?.toString()
  ) {
    return res.status(403).json({
      message: "Access denied. You can only manage doctors in your clinic.",
    });
  }

  // Upsert slot for the specific day
  const slot = await DoctorSlot.findOneAndUpdate(
    {
      doctor_id: req.params.id,
      day_of_week,
    },
    {
      doctor_id: req.params.id,
      clinic_id: doctor.clinic_id,
      day_of_week,
      start_time,
      end_time,
      slot_duration,
      max_patients,
      is_active,
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  res.json({ message: "Slot saved successfully", slot });
});

exports.getDoctorSlots = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) {
    return res.status(404).json({ message: "Doctor not found" });
  }

  // Clinic Admin can only view their clinic
  if (
    req.user.role === "clinic_admin" &&
    doctor.clinic_id.toString() !== req.user.clinicId?.toString()
  ) {
    return res.status(403).json({
      message: "Access denied. You can only view doctors in your clinic.",
    });
  }

  const slots = await DoctorSlot.find({ doctor_id: req.params.id }).sort({
    day_of_week: 1,
    start_time: 1,
  });
  res.json({ slots });
});

exports.getDoctorById = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id)
    .populate("user_id", "name email phone")
    .populate("clinic_id", "name address contact");

  if (!doctor) {
    return res.status(404).json({ message: "Doctor not found" });
  }

  // Access control: clinic admin can only see their clinic's doctors
  if (
    req.user.role === "clinic_admin" &&
    doctor.clinic_id._id.toString() !== req.user.clinicId?.toString()
  ) {
    return res.status(403).json({ message: "Access denied" });
  }

  // Transform response to flatten user data and remove duplicate IDs
  const transformedDoctor = {
    _id: doctor._id,
    name: doctor.user_id.name,
    email: doctor.user_id.email,
    phone: doctor.user_id.phone,
    specialization: doctor.specialization,
    license_number: doctor.license_number,
    experience_years: doctor.experience_years,
    consultation_fee: doctor.consultation_fee,
    availability_status: doctor.availability_status,
    clinic_id: doctor.clinic_id._id,
    clinic_name: doctor.clinic_id.name,
    clinic_address: doctor.clinic_id.address,
    created_at: doctor.created_at,
  };

  res.json({ doctor: transformedDoctor });
});

exports.onboardDoctor = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    phone,
    specialization,
    license_number,
    experience_years,
    consultation_fee,
    clinicId: bodyClinicId,
    targetClinicId,
  } = req.body;

  // Validation
  if (
    !name ||
    !email ||
    !phone ||
    !specialization ||
    !license_number ||
    !experience_years ||
    !consultation_fee
  ) {
    return res.status(400).json({
      message:
        "All fields are required: name, email, phone, specialization, license_number, experience_years, consultation_fee",
    });
  }

  // Check if user already exists
  const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
  if (existingUser) {
    return res.status(400).json({
      message: "User already exists with this email or phone",
    });
  }

  // Check if license number already exists
  const existingDoctor = await Doctor.findOne({ license_number });
  if (existingDoctor) {
    return res.status(400).json({
      message: "Doctor with this license number already exists",
    });
  }

  // Get clinic_id priority: user's clinic > bodyClinicId > targetClinicId > first clinic
  let clinicId = req.user.clinicId || bodyClinicId || targetClinicId;

  // For MVP demo mode: if no clinicId, use the first clinic
  if (!clinicId) {
    const firstClinic = await Clinic.findOne().sort({ createdAt: 1 });
    if (!firstClinic) {
      return res.status(400).json({
        message: "No clinics found. Please create a clinic first.",
      });
    }
    clinicId = firstClinic._id;
  }

  // Fetch clinic details to include in response
  const clinic = await Clinic.findById(clinicId);
  if (!clinic) {
    return res.status(400).json({
      message: "Specified clinic not found.",
    });
  }

  // Create User account
  const user = new User({
    name,
    email,
    phone,
    role: "doctor",
    clinic_id: clinicId,
    isVerified: true,
    status: "active",
  });
  await user.save();

  // Create Doctor profile
  const doctor = new Doctor({
    user_id: user._id,
    clinic_id: clinicId,
    specialization,
    license_number,
    experience_years,
    consultation_fee,
    availability_status: "available",
  });
  await doctor.save();

  // Populate user details
  await doctor.populate("user_id", "name email phone");

  res.status(201).json({
    message: "Doctor onboarded successfully",
    clinic: {
      _id: clinic._id,
      name: clinic.name,
    },
    doctor: {
      _id: doctor._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      specialization: doctor.specialization,
      license_number: doctor.license_number,
      experience_years: doctor.experience_years,
      consultation_fee: doctor.consultation_fee,
      availability_status: doctor.availability_status,
      clinic_id: doctor.clinic_id,
      clinic_name: clinic.name,
    },
  });
});

exports.updateDoctor = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id);

  if (!doctor) {
    return res.status(404).json({ message: "Doctor not found" });
  }

  // Clinic Admin can only update their clinic's doctors
  if (
    req.user.role === "clinic_admin" &&
    doctor.clinic_id.toString() !== req.user.clinicId?.toString()
  ) {
    return res.status(403).json({
      message: "Access denied. You can only update doctors in your clinic.",
    });
  }

  // Update allowed fields
  const allowedUpdates = [
    "specialization",
    "experience_years",
    "consultation_fee",
    "availability_status",
  ];
  const updates = {};

  Object.keys(req.body).forEach((key) => {
    if (allowedUpdates.includes(key)) {
      updates[key] = req.body[key];
    }
  });

  const updatedDoctor = await Doctor.findByIdAndUpdate(
    req.params.id,
    updates,
    { new: true, runValidators: true },
  )
    .populate("user_id", "name email phone")
    .populate("clinic_id", "name address");

  // Transform response to flatten user data and remove duplicate IDs
  const transformedDoctor = {
    _id: updatedDoctor._id,
    name: updatedDoctor.user_id.name,
    email: updatedDoctor.user_id.email,
    phone: updatedDoctor.user_id.phone,
    specialization: updatedDoctor.specialization,
    license_number: updatedDoctor.license_number,
    experience_years: updatedDoctor.experience_years,
    consultation_fee: updatedDoctor.consultation_fee,
    availability_status: updatedDoctor.availability_status,
    clinic_id: updatedDoctor.clinic_id._id,
    clinic_name: updatedDoctor.clinic_id.name,
    created_at: updatedDoctor.created_at,
  };

  res.json({
    message: "Doctor updated successfully",
    doctor: transformedDoctor,
  });
});

exports.removeDoctor = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id);

  if (!doctor) {
    return res.status(404).json({ message: "Doctor not found" });
  }

  // Clinic Admin can only delete their clinic's doctors
  if (
    req.user.role === "clinic_admin" &&
    doctor.clinic_id.toString() !== req.user.clinicId?.toString()
  ) {
    return res.status(403).json({
      message:
        "Access denied. You can only delete doctors from your clinic.",
    });
  }

  // Delete associated user account
  await User.findByIdAndDelete(doctor.user_id);

  // Delete doctor profile
  await Doctor.findByIdAndDelete(req.params.id);

  res.json({
    message: "Doctor deleted successfully",
    doctor_id: req.params.id,
  });
});

exports.getDoctorCalendarData = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const doctorId = req.params.id;

  const start = startDate
    ? new Date(startDate)
    : new Date(new Date().setHours(0, 0, 0, 0));
  const end = endDate
    ? new Date(endDate)
    : new Date(start.getTime() + 7 * 86400000);

  // Get doctor's configured slots
  const slots = await DoctorSlot.find({
    doctor_id: doctorId,
    is_active: true,
  }).lean();

  // Get appointments in range
  const appointments = await Appointment.find({
    doctor_id: doctorId,
    appointment_date: { $gte: start, $lte: end },
  })
    .populate({
      path: "patient_id",
      populate: { path: "user_id", select: "name email phone" },
    })
    .populate("clinic_id", "name")
    .sort({ appointment_date: 1, appointment_time: 1 })
    .lean();

  const now = new Date();

  // Build date array
  const dates = [];
  const d = new Date(start);
  while (d <= end) {
    dates.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }

  // Color-code appointments
  const coloredAppointments = appointments.map((apt) => {
    const aptDateTime = new Date(apt.appointment_date);
    const [h, m] = apt.appointment_time.split(":");
    aptDateTime.setHours(parseInt(h), parseInt(m));

    let color = "#2196F3";
    if (apt.status === "completed") color = "#4CAF50";
    else if (apt.status === "cancelled") color = "#F44336";
    else if (aptDateTime < now && apt.status !== "completed")
      color = "#9E9E9E";

    return {
      _id: apt._id,
      date: apt.appointment_date,
      time: apt.appointment_time,
      duration: apt.duration_minutes,
      status: apt.status,
      color,
      reason: apt.reason_for_visit,
      visit_type: apt.visit_type,
      patient: apt.patient_id
        ? {
            _id: apt.patient_id._id,
            name: apt.patient_id.user_id?.name || "Unknown",
            email: apt.patient_id.user_id?.email,
            phone: apt.patient_id.user_id?.phone,
            patient_id: apt.patient_id.patient_id,
            gender: apt.patient_id.gender,
            date_of_birth: apt.patient_id.date_of_birth,
            blood_group: apt.patient_id.blood_group,
          }
        : null,
      clinic: apt.clinic_id?.name,
    };
  });

  res.json({
    dates,
    timeSlots: slots,
    appointments: coloredAppointments,
    dateRange: { start, end },
  });
});
