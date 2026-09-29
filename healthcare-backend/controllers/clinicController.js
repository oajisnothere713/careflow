const Clinic = require('../models/clinic/Clinic');
const Doctor = require('../models/clinic/Doctor');
const Patient = require('../models/patient/Patient');
const Appointment = require('../models/appointment/Appointment');
const Payment = require('../models/billing/Payment');
const asyncHandler = require('../utils/asyncHandler');
const Joi = require('joi');

const clinicSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  registration_number: Joi.string().required(),
  address: Joi.object({
    street: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    postal_code: Joi.string().required(),
    country: Joi.string().default("India"),
  }).required(),
  contact: Joi.object({
    phone: Joi.string()
      .pattern(/^[0-9]{10}$/)
      .required(),
    email: Joi.string().email().required(),
    website: Joi.string().uri().allow("", null),
  }).required(),
  timings: Joi.object().pattern(
    Joi.string(),
    Joi.object({
      open: Joi.string().allow("", null),
      close: Joi.string().allow("", null),
      isClosed: Joi.boolean(),
    }),
  ),
  specialties: Joi.array().items(
    Joi.string().valid(
      "General Medicine",
      "Cardiology",
      "Dermatology",
      "Pediatrics",
      "Orthopedics",
      "Neurology",
      "Gynecology",
      "Psychiatry",
      "Dentistry",
      "Ophthalmology",
      "ENT",
      "Radiology",
      "Oncology",
      "Urology",
      "Nephrology",
      "Gastroenterology",
      "Pulmonology",
      "Endocrinology",
    ),
  ),
  facilities: Joi.array().items(
    Joi.string().valid(
      "Emergency",
      "24x7 Emergency",
      "ICU",
      "Laboratory",
      "Pharmacy",
      "Radiology",
      "MRI & CT Scan",
      "Surgery",
      "Ambulance",
      "Ambulance Service",
      "Blood Bank",
      "Dialysis",
      "X-Ray",
      "Ultrasound",
      "Cafeteria",
      "Parking",
    ),
  ),
  total_beds: Joi.number().min(0),
  status: Joi.string().valid("active", "inactive", "temporarily_closed"),
});

exports.createClinic = asyncHandler(async (req, res) => {
  const { error } = clinicSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const existingClinic = await Clinic.findOne({
    registration_number: req.body.registration_number,
  });

  if (existingClinic) {
    return res.status(400).json({
      message: "Clinic with this registration number already exists",
    });
  }

  const clinic = new Clinic({
    ...req.body,
    // created_by skipped for MVP demo (no real user ObjectIds)
  });

  await clinic.save();

  res.status(201).json({
    message: "Clinic created successfully",
    clinic,
  });
});

exports.getAllClinics = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, city, specialty } = req.query;

  let query = {};

  // Role-based filtering
  if (req.user && (req.user.role === "clinic_admin" || req.user.role === "staff")) {
    if (req.user.clinicId) {
      query._id = req.user.clinicId;
    }
  }

  if (status) query.status = status;
  if (city) query["address.city"] = new RegExp(city, "i");
  if (specialty) query.specialties = specialty;

  const clinics = await Clinic.find(query)
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ createdAt: -1 });

  const count = await Clinic.countDocuments(query);

  res.json({
    clinics,
    totalPages: Math.ceil(count / limit),
    currentPage: page,
    total: count,
  });
});

exports.getClinicById = asyncHandler(async (req, res) => {
  const clinic = await Clinic.findById(req.params.id).populate(
    "created_by",
    "name email",
  );

  if (!clinic) {
    return res.status(404).json({ message: "Clinic not found" });
  }

  // Check access
  if (
    req.user.role !== "super_admin" &&
    req.user.clinicId?.toString() !== clinic._id.toString()
  ) {
    return res.status(403).json({ message: "Access denied" });
  }

  const doctorCount = await Doctor.countDocuments({ clinic_id: clinic._id });
  const patientCount = await Patient.countDocuments({
    clinic_id: clinic._id,
  });

  res.json({
    clinic,
    stats: {
      total_doctors: doctorCount,
      total_patients: patientCount,
      total_beds: clinic.total_beds,
    },
  });
});

exports.getClinicProfile = asyncHandler(async (req, res) => {
  const { period = "all" } = req.query;

  // Find the clinic
  const clinic = await Clinic.findById(req.params.id).populate(
    "created_by",
    "name email",
  );

  if (!clinic) {
    return res.status(404).json({ message: "Clinic not found" });
  }

  // Check access permissions
  if (
    req.user.role !== "super_admin" &&
    req.user.clinicId?.toString() !== clinic._id.toString()
  ) {
    return res.status(403).json({ message: "Access denied" });
  }

  // Calculate date range based on period
  let dateFilter = {};
  const now = new Date();

  switch (period) {
    case "today":
      dateFilter = {
        $gte: new Date(now.setHours(0, 0, 0, 0)),
        $lt: new Date(now.setHours(23, 59, 59, 999)),
      };
      break;
    case "week":
      const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
      weekStart.setHours(0, 0, 0, 0);
      dateFilter = { $gte: weekStart };
      break;
    case "month":
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      dateFilter = { $gte: monthStart };
      break;
    case "year":
      const yearStart = new Date(now.getFullYear(), 0, 1);
      dateFilter = { $gte: yearStart };
      break;
    case "all":
    default:
      dateFilter = {}; // No date filter for all time
      break;
  }

  // Build appointment query
  const appointmentQuery = { clinic_id: req.params.id };
  if (Object.keys(dateFilter).length > 0) {
    appointmentQuery.appointment_date = dateFilter;
  }

  // Build payment query for earnings
  const paymentQuery = {
    clinic_id: req.params.id,
    payment_status: "completed",
  };
  if (Object.keys(dateFilter).length > 0) {
    paymentQuery.payment_date = dateFilter;
  }

  // Fetch all statistics in parallel
  const [
    totalDoctors,
    activeDoctors,
    totalPatients,
    totalAppointments,
    completedAppointments,
    cancelledAppointments,
    payments,
  ] = await Promise.all([
    Doctor.countDocuments({ clinic_id: req.params.id }),
    Doctor.countDocuments({
      clinic_id: req.params.id,
      availability_status: "available",
    }),
    Patient.countDocuments({ clinic_id: req.params.id }),
    Appointment.countDocuments(appointmentQuery),
    Appointment.countDocuments({
      ...appointmentQuery,
      status: "completed",
    }),
    Appointment.countDocuments({
      ...appointmentQuery,
      status: "cancelled",
    }),
    Payment.find(paymentQuery).select("amount payment_status"),
  ]);

  // Calculate total earnings from completed payments
  const totalEarnings = payments.reduce((sum, payment) => {
    if (payment.payment_status === "completed") {
      return sum + (payment.amount || 0);
    }
    return sum;
  }, 0);

  // Get appointment status breakdown
  const appointmentsByStatus = await Appointment.aggregate([
    { $match: appointmentQuery },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  // Get top specialties
  const topSpecialties = await Doctor.aggregate([
    { $match: { clinic_id: clinic._id } },
    { $unwind: "$specialization" },
    {
      $group: {
        _id: "$specialization",
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 5 },
  ]);

  // Get payment method breakdown
  const paymentsByMethod = await Payment.aggregate([
    { $match: paymentQuery },
    {
      $group: {
        _id: "$payment_method",
        count: { $sum: 1 },
        total_amount: { $sum: "$amount" },
      },
    },
    { $sort: { total_amount: -1 } },
  ]);

  // Prepare response
  res.json({
    clinic: {
      id: clinic._id,
      name: clinic.name,
      registration_number: clinic.registration_number,
      address: clinic.address,
      contact: clinic.contact,
      status: clinic.status,
      specialties: clinic.specialties,
      facilities: clinic.facilities,
      total_beds: clinic.total_beds,
      timings: clinic.timings,
      created_by: clinic.created_by,
      createdAt: clinic.createdAt,
    },
    statistics: {
      period: period,
      doctors: {
        total: totalDoctors,
        active: activeDoctors,
        inactive: totalDoctors - activeDoctors,
      },
      patients: {
        total: totalPatients,
      },
      appointments: {
        total: totalAppointments,
        completed: completedAppointments,
        cancelled: cancelledAppointments,
        pending:
          totalAppointments - completedAppointments - cancelledAppointments,
        by_status: appointmentsByStatus.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
      },
      earnings: {
        total: totalEarnings,
        currency: "INR",
        payment_count: payments.length,
        by_payment_method: paymentsByMethod.map((p) => ({
          method: p._id,
          count: p.count,
          total_amount: p.total_amount,
        })),
      },
      top_specialties: topSpecialties.map((s) => ({
        specialty: s._id,
        doctor_count: s.count,
      })),
    },
    summary: {
      total_doctors: totalDoctors,
      total_patients: totalPatients,
      total_appointments: totalAppointments,
      total_earnings: totalEarnings,
    },
  });
});

exports.updateClinic = asyncHandler(async (req, res) => {
  const { error } = clinicSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const clinic = await Clinic.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!clinic) {
    return res.status(404).json({ message: "Clinic not found" });
  }

  res.json({
    message: "Clinic updated successfully",
    clinic,
  });
});

exports.deactivateClinic = asyncHandler(async (req, res) => {
  const clinic = await Clinic.findByIdAndUpdate(
    req.params.id,
    { status: "inactive" },
    { new: true },
  );

  if (!clinic) {
    return res.status(404).json({ message: "Clinic not found" });
  }

  res.json({
    message: "Clinic deactivated successfully",
    clinic,
  });
});

exports.getClinicStats = asyncHandler(async (req, res) => {
  const clinic = await Clinic.findById(req.params.id);

  if (!clinic) {
    return res.status(404).json({ message: "Clinic not found" });
  }

  // Check access - clinic_admin can only see their own, super_admin sees all
  if (
    req.user.role === "clinic_admin" &&
    req.user.clinicId?.toString() !== clinic._id.toString()
  ) {
    return res.status(403).json({ message: "Access denied" });
  }

  const [doctorCount, patientCount, todayAppointments] = await Promise.all([
    Doctor.countDocuments({
      clinic_id: req.params.id,
      availability_status: "available",
    }),
    Patient.countDocuments({ clinic_id: req.params.id }),
    Appointment.countDocuments({
      clinic_id: req.params.id,
      appointment_date: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        $lt: new Date(new Date().setHours(23, 59, 59, 999)),
      },
    }),
  ]);

  res.json({
    clinic: {
      name: clinic.name,
      total_beds: clinic.total_beds,
    },
    stats: {
      active_doctors: doctorCount,
      total_patients: patientCount,
      today_appointments: todayAppointments,
    },
  });
});
