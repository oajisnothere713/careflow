/**
 * Seed script for MVP demo — creates sample clinics, doctors, patients, appointments, and doctor slots.
 * Run: node scripts/seedDemo.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const User = require('../models/user/User');
const Clinic = require('../models/clinic/Clinic');
const Doctor = require('../models/clinic/Doctor');
const Patient = require('../models/patient/Patient');
const DoctorSlot = require('../models/clinic/DoctorSlot');
const Appointment = require('../models/appointment/Appointment');
const ConsultationNote = require('../models/consultation/ConsultationNote');
const Prescription = require('../models/consultation/Prescription');

async function seed() {
  await mongoose.connect(
    process.env.MONGODB_URI || "mongodb://localhost:27017/healthcare-portal",
  );
  console.log("✅ Connected to MongoDB");

  // Clear existing demo data
  console.log("🧹 Clearing existing data...");
  await Promise.all([
    User.deleteMany({}),
    Clinic.deleteMany({}),
    Doctor.deleteMany({}),
    Patient.deleteMany({}),
    DoctorSlot.deleteMany({}),
    Appointment.deleteMany({}),
    ConsultationNote.deleteMany({}),
    Prescription.deleteMany({}),
  ]);

  // 1. Create Super Admin user
  console.log("👤 Creating Super Admin...");
  const superAdmin = await User.create({
    name: "Super Admin",
    email: "admin@healthcare.com",
    phone: "9999999999",
    role: "super_admin",
    isVerified: true,
    status: "active",
  });

  // 2. Create Clinics
  console.log("🏥 Creating Clinics...");
  const clinic1 = await Clinic.create({
    name: "City Health Clinic",
    registration_number: "CHC-2024-001",
    address: {
      street: "123 Healthcare Ave",
      city: "Mumbai",
      state: "Maharashtra",
      postal_code: "400001",
      country: "India",
    },
    contact: {
      phone: "9876543214",
      email: "info@cityhealth.com",
      website: "www.cityhealth.com",
    },
    timings: {
      monday: { open: "08:00", close: "18:00", isClosed: false },
      tuesday: { open: "08:00", close: "18:00", isClosed: false },
      wednesday: { open: "08:00", close: "18:00", isClosed: false },
      thursday: { open: "08:00", close: "18:00", isClosed: false },
      friday: { open: "08:00", close: "18:00", isClosed: false },
      saturday: { open: "09:00", close: "14:00", isClosed: false },
      sunday: { open: "00:00", close: "00:00", isClosed: true },
    },
    specialties: ["General Medicine", "Cardiology", "Dermatology"],
    facilities: ["X-Ray", "Laboratory", "Pharmacy"],
    status: "active",
    created_by: superAdmin._id,
  });

  const clinic2 = await Clinic.create({
    name: "Green Valley Medical Center",
    registration_number: "GVM-2024-002",
    address: {
      street: "456 Wellness Road",
      city: "Pune",
      state: "Maharashtra",
      postal_code: "411001",
      country: "India",
    },
    contact: { phone: "9876543215", email: "contact@greenvalley.com" },
    timings: {
      monday: { open: "09:00", close: "17:00", isClosed: false },
      tuesday: { open: "09:00", close: "17:00", isClosed: false },
      wednesday: { open: "09:00", close: "17:00", isClosed: false },
      thursday: { open: "09:00", close: "17:00", isClosed: false },
      friday: { open: "09:00", close: "17:00", isClosed: false },
      saturday: { open: "10:00", close: "13:00", isClosed: false },
      sunday: { open: "00:00", close: "00:00", isClosed: true },
    },
    specialties: ["Pediatrics", "Orthopedics", "ENT"],
    facilities: ["MRI & CT Scan", "Radiology", "Pharmacy"],
    status: "active",
    created_by: superAdmin._id,
  });

  // 3. Create Clinic Admin users
  console.log("👩‍💼 Creating Clinic Admins...");
  const clinicAdmin1 = await User.create({
    name: "Priya Sharma",
    email: "priya@cityhealth.com",
    phone: "9876543210",
    role: "clinic_admin",
    clinic_id: clinic1._id,
    isVerified: true,
    status: "active",
  });

  const clinicAdmin2 = await User.create({
    name: "Rajesh Kumar",
    email: "rajesh@greenvalley.com",
    phone: "9876543211",
    role: "clinic_admin",
    clinic_id: clinic2._id,
    isVerified: true,
    status: "active",
  });

  // 4. Create Doctors
  console.log("👨‍⚕️ Creating Doctors...");
  const docUser1 = await User.create({
    name: "Dr. Anil Mehta",
    email: "anil.mehta@cityhealth.com",
    phone: "9876543220",
    role: "doctor",
    clinic_id: clinic1._id,
    isVerified: true,
    status: "active",
  });
  const doctor1 = await Doctor.create({
    user_id: docUser1._id,
    clinic_id: clinic1._id,
    specialization: "General Medicine",
    license_number: "MCI-GM-001",
    experience_years: 15,
    consultation_fee: 500,
    availability_status: "available",
  });

  const docUser2 = await User.create({
    name: "Dr. Sneha Patel",
    email: "sneha.patel@cityhealth.com",
    phone: "9876543221",
    role: "doctor",
    clinic_id: clinic1._id,
    isVerified: true,
    status: "active",
  });
  const doctor2 = await Doctor.create({
    user_id: docUser2._id,
    clinic_id: clinic1._id,
    specialization: "Cardiology",
    license_number: "MCI-CD-002",
    experience_years: 10,
    consultation_fee: 800,
    availability_status: "available",
  });

  const docUser3 = await User.create({
    name: "Dr. Vikram Singh",
    email: "vikram.singh@greenvalley.com",
    phone: "9876543222",
    role: "doctor",
    clinic_id: clinic2._id,
    isVerified: true,
    status: "active",
  });
  const doctor3 = await Doctor.create({
    user_id: docUser3._id,
    clinic_id: clinic2._id,
    specialization: "Pediatrics",
    license_number: "MCI-PD-003",
    experience_years: 8,
    consultation_fee: 600,
    availability_status: "available",
  });

  // 5. Create Doctor Slots (weekly schedule)
  console.log("📅 Creating Doctor Slots...");
  const weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday"];
  for (const day of weekdays) {
    await DoctorSlot.create({
      doctor_id: doctor1._id,
      clinic_id: clinic1._id,
      day_of_week: day,
      start_time: "09:00",
      end_time: "19:00",
      slot_duration: 60,
      max_patients: 10,
      is_active: true,
    });
    await DoctorSlot.create({
      doctor_id: doctor2._id,
      clinic_id: clinic1._id,
      day_of_week: day,
      start_time: "09:00",
      end_time: "19:00",
      slot_duration: 60,
      max_patients: 10,
      is_active: true,
    });
    await DoctorSlot.create({
      doctor_id: doctor3._id,
      clinic_id: clinic2._id,
      day_of_week: day,
      start_time: "09:00",
      end_time: "19:00",
      slot_duration: 60,
      max_patients: 10,
      is_active: true,
    });
  }

  // 6. Create Patients
  console.log("🤒 Creating Patients...");
  const patients = [];
  const patientData = [
    {
      name: "Rahul Verma",
      email: "rahul.verma@email.com",
      phone: "9876543300",
      gender: "male",
      dob: "1985-03-15",
      blood: "B+",
      address: "123 Main St, Mumbai, 400001",
      emergency_contact: "9876543400",
    },
    {
      name: "Anita Desai",
      email: "anita.desai@email.com",
      phone: "9876543301",
      gender: "female",
      dob: "1990-07-22",
      blood: "A+",
      address: "456 Park Ave, Mumbai, 400002",
      emergency_contact: "9876543401",
    },
    {
      name: "Suresh Nair",
      email: "suresh.nair@email.com",
      phone: "9876543302",
      gender: "male",
      dob: "1978-11-08",
      blood: "O+",
      address: "789 Oak St, Mumbai, 400003",
      emergency_contact: "9876543402",
    },
    {
      name: "Meera Krishnan",
      email: "meera.k@email.com",
      phone: "9876543303",
      gender: "female",
      dob: "1995-01-30",
      blood: "AB+",
      address: "321 Elm St, Pune, 411001",
      emergency_contact: "9876543403",
    },
    {
      name: "Arjun Reddy",
      email: "arjun.reddy@email.com",
      phone: "9876543304",
      gender: "male",
      dob: "2000-05-12",
      blood: "O-",
      address: "654 Maple St, Pune, 411002",
      emergency_contact: "9876543404",
    },
  ];

  for (let i = 0; i < patientData.length; i++) {
    const pd = patientData[i];
    const clinicId = i < 3 ? clinic1._id : clinic2._id;
    const user = await User.create({
      name: pd.name,
      email: pd.email,
      phone: pd.phone,
      role: "patient",
      clinic_id: clinicId,
      isVerified: true,
      status: "active",
    });
    const patient = await Patient.create({
      user_id: user._id,
      clinic_id: clinicId,
      patient_id: `MRN-${String(i + 1).padStart(4, "0")}`,
      gender: pd.gender,
      date_of_birth: new Date(pd.dob),
      blood_group: pd.blood,
      address: pd.address,
      emergency_contact: pd.emergency_contact,
    });
    patients.push(patient);
  }

  // 7. Create Appointments (mix of statuses and dates)
  console.log("📋 Creating Appointments...");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const appointmentData = [
    // Past completed appointments (with consultations)
    {
      patient: 0,
      doctor: doctor1,
      clinic: clinic1,
      daysAgo: 14,
      time: "09:00",
      status: "completed",
      reason: "Persistent headache and dizziness",
    },
    {
      patient: 1,
      doctor: doctor1,
      clinic: clinic1,
      daysAgo: 10,
      time: "10:00",
      status: "completed",
      reason: "Annual health checkup",
    },
    {
      patient: 0,
      doctor: doctor2,
      clinic: clinic1,
      daysAgo: 7,
      time: "10:30",
      status: "completed",
      reason: "Chest pain evaluation",
    },
    {
      patient: 2,
      doctor: doctor1,
      clinic: clinic1,
      daysAgo: 5,
      time: "11:00",
      status: "completed",
      reason: "Back pain for 2 weeks",
    },
    // Past cancelled
    {
      patient: 1,
      doctor: doctor2,
      clinic: clinic1,
      daysAgo: 3,
      time: "11:30",
      status: "cancelled",
      reason: "Follow-up for blood pressure",
    },
    // Today's appointments
    {
      patient: 0,
      doctor: doctor1,
      clinic: clinic1,
      daysAgo: 0,
      time: "09:30",
      status: "confirmed",
      reason: "Follow-up for headache treatment",
    },
    {
      patient: 2,
      doctor: doctor1,
      clinic: clinic1,
      daysAgo: 0,
      time: "10:30",
      status: "booked",
      reason: "Back pain follow-up",
    },
    {
      patient: 1,
      doctor: doctor1,
      clinic: clinic1,
      daysAgo: 0,
      time: "14:00",
      status: "confirmed",
      reason: "Vaccination consultation",
    },
    // Future appointments
    {
      patient: 3,
      doctor: doctor3,
      clinic: clinic2,
      daysAgo: -2,
      time: "09:00",
      status: "booked",
      reason: "Child fever and cough",
    },
    {
      patient: 4,
      doctor: doctor3,
      clinic: clinic2,
      daysAgo: -3,
      time: "10:00",
      status: "confirmed",
      reason: "Routine pediatric checkup",
    },
  ];

  const appointments = [];
  for (const ad of appointmentData) {
    const aptDate = new Date(today);
    aptDate.setDate(aptDate.getDate() - ad.daysAgo);
    const apt = await Appointment.create({
      patient_id: patients[ad.patient]._id,
      doctor_id: ad.doctor._id,
      clinic_id: ad.clinic._id,
      appointment_date: aptDate,
      appointment_time: ad.time,
      duration_minutes: 30,
      status: ad.status,
      booking_source: "staff",
      reason_for_visit: ad.reason,
      visit_type:
        ad.reason.includes("Follow") || ad.reason.includes("follow")
          ? "follow_up"
          : "first_visit",
      ...(ad.status === "cancelled"
        ? {
            cancelled_reason: "Patient requested cancellation",
            cancelled_at: new Date(),
          }
        : {}),
    });
    appointments.push(apt);
  }

  // 8. Create consultation notes for completed appointments
  console.log("📝 Creating Consultation Notes...");
  const consultationData = [
    {
      chief_complaint: "Persistent headache and dizziness for 1 week",
      diagnosis: "Tension-type headache with possible migraine component",
      treatment_plan:
        "Prescribed analgesics, stress management techniques, adequate hydration. Advised to maintain sleep schedule.",
      prescription: [
        {
          medicine_name: "Paracetamol",
          dosage: "500mg",
          frequency: "Twice daily",
          duration: "5 days",
          instructions: "Take after meals",
        },
        {
          medicine_name: "Amitriptyline",
          dosage: "10mg",
          frequency: "Once at bedtime",
          duration: "14 days",
          instructions: "Take before sleep",
        },
      ],
    },
    {
      chief_complaint: "Annual health checkup",
      diagnosis: "Generally healthy, mild Vitamin D deficiency",
      treatment_plan:
        "Vitamin D supplementation, follow-up blood work in 3 months. Continue regular exercise.",
      prescription: [
        {
          medicine_name: "Vitamin D3",
          dosage: "60000 IU",
          frequency: "Once weekly",
          duration: "8 weeks",
          instructions: "Take with fatty meal",
        },
      ],
    },
    {
      chief_complaint: "Chest pain during exertion",
      diagnosis:
        "Musculoskeletal chest pain, cardiac causes ruled out after ECG",
      treatment_plan:
        "Anti-inflammatory medication, rest, and gradual return to physical activity. ECG normal.",
      prescription: [
        {
          medicine_name: "Ibuprofen",
          dosage: "400mg",
          frequency: "Three times daily",
          duration: "7 days",
          instructions: "Take with food",
        },
        {
          medicine_name: "Omeprazole",
          dosage: "20mg",
          frequency: "Once daily",
          duration: "7 days",
          instructions: "Take before breakfast",
        },
      ],
    },
    {
      chief_complaint: "Lower back pain for 2 weeks",
      diagnosis: "Lumbar strain, no neurological deficits",
      treatment_plan:
        "Physical therapy referral, pain management, and posture correction exercises.",
      prescription: [
        {
          medicine_name: "Diclofenac",
          dosage: "50mg",
          frequency: "Twice daily",
          duration: "7 days",
          instructions: "Take after meals",
        },
        {
          medicine_name: "Thiocolchicoside",
          dosage: "4mg",
          frequency: "Twice daily",
          duration: "5 days",
          instructions: "Muscle relaxant, take after meals",
        },
      ],
    },
  ];

  for (let i = 0; i < 4; i++) {
    const cd = consultationData[i];
    const apt = appointments[i];
    const cn = await ConsultationNote.create({
      appointment_id: apt._id,
      patient_id: apt.patient_id,
      doctor_id: apt.doctor_id,
      clinic_id: apt.clinic_id,
      chief_complaint: cd.chief_complaint,
      diagnosis: cd.diagnosis,
      treatment_plan: cd.treatment_plan,
      notes: "Patient advised to return if symptoms persist.",
    });

    await Prescription.create({
      consultation_id: cn._id,
      appointment_id: apt._id,
      patient_id: apt.patient_id,
      doctor_id: apt.doctor_id,
      clinic_id: apt.clinic_id,
      medications: cd.prescription,
      status: "active",
    });
  }

  console.log("\n✅ Demo data seeded successfully!");
  console.log("──────────────────────────────────────");
  console.log(`  Super Admin:    ${superAdmin.email}`);
  console.log(`  Clinics:        ${clinic1.name}, ${clinic2.name}`);
  console.log(`  Clinic Admins:  ${clinicAdmin1.email}, ${clinicAdmin2.email}`);
  console.log(
    `  Doctors:        ${docUser1.name}, ${docUser2.name}, ${docUser3.name}`,
  );
  console.log(`  Patients:       ${patientData.map((p) => p.name).join(", ")}`);
  console.log(
    `  Appointments:   ${appointments.length} (${appointmentData.filter((a) => a.status === "completed").length} completed, ${appointmentData.filter((a) => a.status === "cancelled").length} cancelled)`,
  );
  console.log(
    `  Consultations:  ${consultationData.length} with prescriptions`,
  );
  console.log("──────────────────────────────────────");

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed error:", err);
  process.exit(1);
});
