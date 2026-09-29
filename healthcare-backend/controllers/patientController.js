const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const Patient = require("../models/patient/Patient");
const User = require("../models/user/User");
const MedicalHistory = require("../models/patient/MedicalHistory");
const ConsultationNote = require("../models/consultation/ConsultationNote");
const Prescription = require("../models/consultation/Prescription");
const Appointment = require("../models/appointment/Appointment");
const LabReport = require("../models/consultation/LabReport");
const VisitRecord = require("../models/consultation/VisitRecord");
const {
  verifyToken,
  checkRole,
  checkClinicAccess
} = require("../middleware/auth");
const Joi = require("joi");

// Helper function to generate unique patient ID (MRN)
// Helper function to generate unique patient ID (MRN)
const generatePatientId = async clinicId => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const prefix = `P${year}${month}`;

  // Count patients created this month in this clinic
  const count = await Patient.countDocuments({
    clinic_id: clinicId,
    patient_id: new RegExp(`^${prefix}`)
  });
  const sequence = count + 1;
  return `${prefix}-${String(sequence).padStart(5, "0")}`;
};

/**
 * @swagger
 * /api/patients/onboard:
 *   post:
 *     summary: Onboard a new patient (Clinic Admin/Doctor)
 *     description: Clinic Admin or Doctor can onboard a new patient by creating user account and patient profile
 *     tags: [Patient]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, phone, gender, date_of_birth, blood_group, address, emergency_contact]
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *               date_of_birth:
 *                 type: string
 *                 format: date
 *               blood_group:
 *                 type: string
 *                 enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
 *               address:
 *                 type: string
 *               emergency_contact:
 *                 type: string
 *     responses:
 *       201:
 *         description: Patient onboarded successfully
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Only clinic admin or doctor can onboard patients
 */
exports.postOnboard = asyncHandler(async (req, res, next) => {
  try {
    // Only clinic_admin, doctor, and super_admin (for MVP demo) can onboard patients
    if (!["clinic_admin", "doctor", "super_admin"].includes(req.user.role)) {
      return res.status(403).json({
        message: "Only Clinic Admin or Doctor can onboard patients"
      });
    }
    const {
      name,
      email,
      phone,
      gender,
      date_of_birth,
      blood_group,
      address,
      emergency_contact,
      targetClinicId
    } = req.body;

    // Validation - address and emergency_contact are optional
    if (!name || !email || !phone || !gender || !date_of_birth || !blood_group) {
      return res.status(400).json({
        message: "Required fields: name, email, phone, gender, date_of_birth, blood_group. Optional: address, emergency_contact"
      });
    }

    // REQUIRED: targetClinicId must be provided from frontend
    // Patients are created ONLY in the selected clinic
    if (!targetClinicId) {
      return res.status(400).json({
        message: "Target clinic ID is required. Please select a clinic."
      });
    }

    // Verify the clinic exists
    const Clinic = require("../models/clinic/Clinic");
    const clinic = await Clinic.findById(targetClinicId);
    if (!clinic) {
      return res.status(400).json({
        message: "Selected clinic not found."
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{
        email
      }, {
        phone
      }]
    });
    if (existingUser) {
      return res.status(400).json({
        message: "User already exists with this email or phone"
      });
    }

    // Use the selected clinic ID ONLY (no fallback logic)
    const clinicId = targetClinicId;

    // Create User account
    const user = new User({
      name,
      email,
      phone,
      role: "patient",
      clinic_id: clinicId,
      isVerified: true,
      status: "active"
    });
    await user.save();

    // Generate unique patient ID
    const patientId = await generatePatientId(clinicId);

    // Create Patient profile
    const patient = new Patient({
      user_id: user._id,
      clinic_id: clinicId,
      patient_id: patientId,
      gender,
      date_of_birth,
      blood_group,
      address,
      emergency_contact
    });
    await patient.save();

    // Populate user details
    await patient.populate("user_id", "name email phone");
    res.status(201).json({
      message: "Patient onboarded successfully",
      patient: {
        _id: patient._id,
        patient_id: patient.patient_id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        gender: patient.gender,
        date_of_birth: patient.date_of_birth,
        blood_group: patient.blood_group,
        address: patient.address,
        emergency_contact: patient.emergency_contact,
        clinic_id: patient.clinic_id
      },
      clinic: clinic ? {
        _id: clinic._id,
        name: clinic.name,
        address: clinic.address
      } : null
    });
  } catch (error) {
    console.error("Onboard patient error:", error);
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
      clinic_id,
      search,
      blood_group
    } = req.query;
    const query = {};
    if (clinic_id) query.clinic_id = clinic_id;
    if (blood_group) query.blood_group = blood_group;
    if (search) {
      query.$or = [{
        name: {
          $regex: search,
          $options: "i"
        }
      }, {
        email: {
          $regex: search,
          $options: "i"
        }
      }, {
        phone: {
          $regex: search,
          $options: "i"
        }
      }];
    }
    const total = await Patient.countDocuments(query);
    const totalPages = Math.ceil(total / limit);
    const patients = await Patient.find(query).populate("user_id", "name email phone").populate("clinic_id", "name").skip((page - 1) * limit).limit(Number(limit));
    const transformedPatients = patients.map(patient => {
      const userId = patient.user_id?._id;
      return {
        _id: patient._id,
        user_id: userId,
        patient_id: patient.patient_id,
        name: patient.user_id?.name,
        email: patient.user_id?.email,
        phone: patient.user_id?.phone,
        gender: patient.gender,
        date_of_birth: patient.date_of_birth,
        blood_group: patient.blood_group,
        address: patient.address,
        emergency_contact: patient.emergency_contact,
        clinic_id: patient.clinic_id?._id,
        clinic_name: patient.clinic_id?.name,
        created_at: patient.created_at
      };
    });
    res.json({
      patients: transformedPatients,
      totalPages,
      currentPage: String(page),
      total
    });
  } catch (error) {
    console.error("Get patients error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
});
exports.postCompleteProfile = asyncHandler(async (req, res, next) => {
  try {
    const {
      gender,
      date_of_birth,
      blood_group,
      address,
      emergency_contact,
      clinic_id,
      insurance_id,
      medical_history
    } = req.body;

    // Validation
    if (!gender || !date_of_birth || !blood_group || !address || !emergency_contact || !clinic_id) {
      return res.status(400).json({
        message: "All fields are required: gender, date_of_birth, blood_group, address, emergency_contact, clinic_id"
      });
    }

    // Check if patient profile already exists (clinic admin may have onboarded them)
    const existingPatient = await Patient.findOne({
      user_id: req.user.userId
    });
    if (existingPatient) {
      // Profile exists (onboarded by clinic admin) - UPDATE it instead
      if (gender !== undefined) existingPatient.gender = gender;
      if (date_of_birth !== undefined) existingPatient.date_of_birth = date_of_birth;
      if (blood_group !== undefined) existingPatient.blood_group = blood_group;
      if (address !== undefined) existingPatient.address = address;
      if (emergency_contact !== undefined) existingPatient.emergency_contact = emergency_contact;
      if (insurance_id !== undefined) existingPatient.insurance_id = insurance_id;
      await existingPatient.save();

      // Update or create medical history if provided
      if (medical_history) {
        const mh = medical_history;
        const normalizeItems = {
          known_conditions: arr => Array.isArray(arr) ? arr.map(item => typeof item === "string" ? {
            condition: item
          } : item && item.condition ? item : {
            condition: String(item)
          }) : arr,
          allergies: arr => Array.isArray(arr) ? arr.map(item => typeof item === "string" ? {
            allergen: item,
            reaction: "Unknown",
            severity: "mild"
          } : {
            allergen: item?.allergen ?? item?.allergy ?? "",
            reaction: item?.reaction ?? "Unknown",
            severity: item?.severity ?? "mild",
            identified_date: item?.identified_date
          }) : arr,
          family_history: arr => Array.isArray(arr) ? arr.map(item => typeof item === "string" ? {
            relation: "other",
            condition: item
          } : {
            relation: item?.relation ?? "other",
            condition: item?.condition,
            notes: item?.notes
          }) : arr
        };
        const updateData = {
          ...(mh.known_conditions !== undefined && {
            known_conditions: normalizeItems.known_conditions(mh.known_conditions)
          }),
          ...(mh.allergies !== undefined && {
            allergies: normalizeItems.allergies(mh.allergies)
          }),
          ...(mh.current_medications !== undefined && {
            current_medications: mh.current_medications
          }),
          ...(mh.past_surgeries !== undefined && {
            past_surgeries: mh.past_surgeries
          }),
          ...(mh.family_history !== undefined && {
            family_history: normalizeItems.family_history(mh.family_history)
          }),
          ...(mh.immunizations !== undefined && {
            immunizations: mh.immunizations
          }),
          ...(mh.lifestyle !== undefined && {
            lifestyle: mh.lifestyle
          }),
          last_updated_by: req.user.userId
        };
        await MedicalHistory.findOneAndUpdate({
          patient_id: existingPatient._id
        }, updateData, {
          new: true,
          upsert: true,
          runValidators: true
        });
      }

      // Update user profile_completed flag
      await User.findByIdAndUpdate(req.user.userId, {
        profile_completed: true
      });

      // Populate and return
      await existingPatient.populate("user_id", "name email phone");
      await existingPatient.populate("clinic_id", "name");
      return res.status(200).json({
        message: "Profile completed successfully! You can now book appointments.",
        patient: {
          _id: existingPatient._id,
          patient_id: existingPatient.patient_id,
          name: existingPatient.user_id.name,
          email: existingPatient.user_id.email,
          phone: existingPatient.user_id.phone,
          gender: existingPatient.gender,
          date_of_birth: existingPatient.date_of_birth,
          blood_group: existingPatient.blood_group,
          address: existingPatient.address,
          emergency_contact: existingPatient.emergency_contact,
          clinic_id: existingPatient.clinic_id._id,
          clinic_name: existingPatient.clinic_id.name,
          insurance_id: existingPatient.insurance_id || null
        }
      });
    }

    // Profile doesn't exist - CREATE it (self-registration flow)
    // Generate unique patient ID (MRN)
    const patientId = await generatePatientId(clinic_id);

    // Create Patient profile
    const patientData = {
      clinic_id: clinic_id,
      patient_id: patientId,
      gender,
      date_of_birth,
      blood_group,
      address,
      emergency_contact,
      insurance_id
      // Skip user_id for MVP demo (no real User records)
    };
    const patient = new Patient(patientData);
    await patient.save();

    // Create medical history record
    const medicalHistoryData = {
      patient_id: patient._id,
      clinic_id: clinic_id,
      known_conditions: medical_history?.known_conditions || [],
      allergies: medical_history?.allergies || [],
      current_medications: medical_history?.current_medications || [],
      past_surgeries: medical_history?.past_surgeries || [],
      family_history: medical_history?.family_history || [],
      immunizations: medical_history?.immunizations || [],
      lifestyle: medical_history?.lifestyle || {}
    };
    const medicalHistoryRecord = new MedicalHistory(medicalHistoryData);
    await medicalHistoryRecord.save();

    // Update user profile_completed flag
    await User.findByIdAndUpdate(req.user.userId, {
      profile_completed: true
    });

    // Populate user details for response
    await patient.populate("user_id", "name email phone");
    await patient.populate("clinic_id", "name");
    res.status(201).json({
      message: "Profile completed successfully! You can now book appointments.",
      patient: {
        _id: patient._id,
        patient_id: patient.patient_id,
        name: patient.user_id.name,
        email: patient.user_id.email,
        phone: patient.user_id.phone,
        gender: patient.gender,
        date_of_birth: patient.date_of_birth,
        blood_group: patient.blood_group,
        address: patient.address,
        emergency_contact: patient.emergency_contact,
        clinic_id: patient.clinic_id._id,
        clinic_name: patient.clinic_id.name,
        medical_history_id: medicalHistoryRecord._id
      }
    });
  } catch (error) {
    console.error("Complete profile error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
});
exports.putCompleteProfile = asyncHandler(async (req, res, next) => {
  try {
    // Find the patient record associated with the logged-in user
    const patient = await Patient.findOne({
      user_id: req.user.userId
    }).populate("user_id", "name email phone").populate("clinic_id", "name");
    if (!patient) {
      return res.status(404).json({
        message: "Patient profile not found. Please complete your profile first."
      });
    }

    // Allowed demographic fields to update
    const {
      gender,
      date_of_birth,
      blood_group,
      address,
      emergency_contact,
      insurance_id
    } = req.body;
    if (gender !== undefined) patient.gender = gender;
    if (date_of_birth !== undefined) patient.date_of_birth = date_of_birth;
    if (blood_group !== undefined) patient.blood_group = blood_group;
    if (address !== undefined) patient.address = address;
    if (emergency_contact !== undefined) patient.emergency_contact = emergency_contact;
    if (insurance_id !== undefined) patient.insurance_id = insurance_id;
    await patient.save();

    // Optionally update medical history if provided
    if (req.body.medical_history) {
      const mh = req.body.medical_history;
      const normalizeItems = {
        known_conditions: arr => Array.isArray(arr) ? arr.map(item => typeof item === "string" ? {
          condition: item
        } : item && item.condition ? item : {
          condition: String(item)
        }) : arr,
        allergies: arr => Array.isArray(arr) ? arr.map(item => typeof item === "string" ? {
          allergen: item,
          reaction: "Unknown",
          severity: "mild"
        } : {
          allergen: item?.allergen ?? item?.allergy ?? "",
          reaction: item?.reaction ?? "Unknown",
          severity: item?.severity ?? "mild",
          identified_date: item?.identified_date
        }) : arr,
        family_history: arr => Array.isArray(arr) ? arr.map(item => typeof item === "string" ? {
          relation: "other",
          condition: item
        } : {
          relation: item?.relation ?? "other",
          condition: item?.condition,
          notes: item?.notes
        }) : arr
      };
      const updateData = {
        ...(mh.known_conditions !== undefined && {
          known_conditions: normalizeItems.known_conditions(mh.known_conditions)
        }),
        ...(mh.allergies !== undefined && {
          allergies: normalizeItems.allergies(mh.allergies)
        }),
        ...(mh.current_medications !== undefined && {
          current_medications: mh.current_medications
        }),
        ...(mh.past_surgeries !== undefined && {
          past_surgeries: mh.past_surgeries
        }),
        ...(mh.family_history !== undefined && {
          family_history: normalizeItems.family_history(mh.family_history)
        }),
        ...(mh.immunizations !== undefined && {
          immunizations: mh.immunizations
        }),
        ...(mh.lifestyle !== undefined && {
          lifestyle: mh.lifestyle
        }),
        last_updated_by: req.user.userId
      };
      await MedicalHistory.findOneAndUpdate({
        patient_id: patient._id
      }, updateData, {
        new: true,
        runValidators: true
      });
    }

    // Response
    res.json({
      message: "Profile updated successfully",
      patient: {
        _id: patient._id,
        patient_id: patient.patient_id,
        name: patient.user_id.name,
        email: patient.user_id.email,
        phone: patient.user_id.phone,
        gender: patient.gender,
        date_of_birth: patient.date_of_birth,
        blood_group: patient.blood_group,
        address: patient.address,
        emergency_contact: patient.emergency_contact,
        clinic_id: patient.clinic_id._id,
        clinic_name: patient.clinic_id.name,
        insurance_id: patient.insurance_id || null
      }
    });
  } catch (error) {
    console.error("Edit complete profile error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
});
exports.getMyMedicalHistory = asyncHandler(async (req, res, next) => {
  try {
    // Get patient record for logged-in user
    const patient = await Patient.findOne({
      user_id: req.user.userId
    });
    if (!patient) {
      return res.status(404).json({
        message: "Patient profile not found. Please complete your profile first."
      });
    }

    // Get medical history
    const medicalHistory = await MedicalHistory.findOne({
      patient_id: patient._id
    }).populate("last_updated_by", "name");
    if (!medicalHistory) {
      return res.status(404).json({
        message: "Medical history not found"
      });
    }
    res.json({
      medicalHistory
    });
  } catch (error) {
    console.error("Get my medical history error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
});
exports.putMyMedicalHistory = asyncHandler(async (req, res, next) => {
  try {
    // Get patient record for logged-in user
    const patient = await Patient.findOne({
      user_id: req.user.userId
    });
    if (!patient) {
      return res.status(404).json({
        message: "Patient profile not found. Please complete your profile first."
      });
    }
    const body = req.body;
    const normalizeItems = {
      known_conditions: arr => Array.isArray(arr) ? arr.map(item => typeof item === "string" ? {
        condition: item
      } : item && item.condition ? item : {
        condition: String(item)
      }) : arr,
      allergies: arr => Array.isArray(arr) ? arr.map(item => typeof item === "string" ? {
        allergen: item,
        reaction: "Unknown",
        severity: "mild"
      } : {
        allergen: item?.allergen ?? item?.allergy ?? "",
        reaction: item?.reaction ?? "Unknown",
        severity: item?.severity ?? "mild",
        identified_date: item?.identified_date
      }) : arr,
      family_history: arr => Array.isArray(arr) ? arr.map(item => typeof item === "string" ? {
        relation: "other",
        condition: item
      } : {
        relation: item?.relation ?? "other",
        condition: item?.condition,
        notes: item?.notes
      }) : arr
    };
    const updateData = {
      ...(body.known_conditions !== undefined && {
        known_conditions: normalizeItems.known_conditions(body.known_conditions)
      }),
      ...(body.allergies !== undefined && {
        allergies: normalizeItems.allergies(body.allergies)
      }),
      ...(body.current_medications !== undefined && {
        current_medications: body.current_medications
      }),
      ...(body.past_surgeries !== undefined && {
        past_surgeries: body.past_surgeries
      }),
      ...(body.family_history !== undefined && {
        family_history: normalizeItems.family_history(body.family_history)
      }),
      ...(body.immunizations !== undefined && {
        immunizations: body.immunizations
      }),
      ...(body.lifestyle !== undefined && {
        lifestyle: body.lifestyle
      }),
      last_updated_by: req.user.userId
    };
    const medicalHistory = await MedicalHistory.findOneAndUpdate({
      patient_id: patient._id
    }, updateData, {
      new: true,
      runValidators: true
    });
    if (!medicalHistory) {
      return res.status(404).json({
        message: "Medical history not found"
      });
    }
    res.json({
      message: "Medical history updated successfully",
      medicalHistory
    });
  } catch (error) {
    console.error("Update my medical history error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
});
exports.postIndex = asyncHandler(async (req, res, next) => {
  try {
    const {
      user_id,
      gender,
      date_of_birth,
      blood_group,
      address,
      emergency_contact,
      insurance_id
    } = req.body;

    // Validate required fields
    if (!user_id || !gender || !date_of_birth || !blood_group || !address || !emergency_contact) {
      return res.status(400).json({
        message: "Missing required fields"
      });
    }

    // Check if user exists and is a patient
    const user = await User.findById(user_id);
    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }
    if (user.role !== "patient") {
      return res.status(400).json({
        message: "User is not a patient"
      });
    }

    // Check if patient profile already exists
    const existingPatient = await Patient.findOne({
      user_id
    });
    if (existingPatient) {
      return res.status(400).json({
        message: "Patient profile already exists"
      });
    }

    // Get clinic_id from authenticated user or request
    const clinicId = req.body.clinic_id || req.user.clinicId;
    if (!clinicId) {
      return res.status(400).json({
        message: "Clinic ID is required"
      });
    }

    // Generate unique patient ID
    const patient_id = await generatePatientId(clinicId);

    // Create patient record
    const patient = new Patient({
      user_id,
      clinic_id: clinicId,
      patient_id,
      gender,
      date_of_birth,
      blood_group,
      address,
      emergency_contact,
      insurance_id
    });
    await patient.save();

    // Initialize empty medical history
    const medicalHistory = new MedicalHistory({
      patient_id: patient._id,
      clinic_id: clinicId,
      known_conditions: [],
      allergies: [],
      current_medications: [],
      past_surgeries: [],
      family_history: []
    });
    await medicalHistory.save();
    res.status(201).json({
      message: "Patient admitted successfully",
      patient,
      patient_mrn: patient_id
    });
  } catch (error) {
    console.error("Create patient error:", error);
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
      search,
      blood_group
    } = req.query;
    let query = {};

    // Clinic scoping - admins and super_admins see all patients, others see only their clinic's patients
    if (!["admin", "super_admin"].includes(req.user.role)) {
      query.clinic_id = req.user.clinicId;
    } else if (req.query.clinic_id) {
      query.clinic_id = req.query.clinic_id;
    }
    if (blood_group) query.blood_group = blood_group;
    const patients = await Patient.find(query).populate("user_id", "name email phone").populate("clinic_id", "name").limit(limit * 1).skip((page - 1) * limit).sort({
      created_at: -1
    });
    const count = await Patient.countDocuments(query);

    // Transform response to flatten user data and remove duplicate IDs
    const transformedPatients = patients.map(patient => ({
      _id: patient._id,
      patient_id: patient.patient_id,
      name: patient.user_id.name,
      email: patient.user_id.email,
      phone: patient.user_id.phone,
      gender: patient.gender,
      date_of_birth: patient.date_of_birth,
      blood_group: patient.blood_group,
      address: patient.address,
      emergency_contact: patient.emergency_contact,
      clinic_id: patient.clinic_id._id,
      clinic_name: patient.clinic_id.name,
      created_at: patient.created_at
    }));
    res.json({
      patients: transformedPatients,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count
    });
  } catch (error) {
    console.error("Get patients error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
});
exports.getById = asyncHandler(async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id).populate("user_id", "name email phone").populate("clinic_id", "name address contact").populate("insurance_id");
    if (!patient) {
      return res.status(404).json({
        message: "Patient not found"
      });
    }

    // Access control
    const isOwnRecord = req.user.role === "patient" && patient.user_id._id.toString() === req.user.userId.toString();
    const isSameClinic = patient.clinic_id._id.toString() === req.user.clinicId?.toString();
    if (!isOwnRecord && !["admin", "super_admin"].includes(req.user.role) && !isSameClinic) {
      return res.status(403).json({
        message: "Access denied"
      });
    }

    // Transform response to flatten user data and remove duplicate IDs
    const transformedPatient = {
      _id: patient._id,
      patient_id: patient.patient_id,
      name: patient.user_id.name,
      email: patient.user_id.email,
      phone: patient.user_id.phone,
      gender: patient.gender,
      date_of_birth: patient.date_of_birth,
      blood_group: patient.blood_group,
      address: patient.address,
      emergency_contact: patient.emergency_contact,
      clinic_id: patient.clinic_id._id,
      clinic_name: patient.clinic_id.name,
      clinic_address: patient.clinic_id.address,
      insurance_id: patient.insurance_id,
      created_at: patient.created_at
    };
    res.json({
      patient: transformedPatient
    });
  } catch (error) {
    console.error("Get patient error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
});
exports.getByIdMedicalHistory = asyncHandler(async (req, res, next) => {
  try {
    const medicalHistory = await MedicalHistory.findOne({
      patient_id: req.params.id
    }).populate("patient_id").populate("last_updated_by", "name");
    if (!medicalHistory) {
      return res.status(404).json({
        message: "Medical history not found"
      });
    }
    res.json({
      medicalHistory
    });
  } catch (error) {
    console.error("Get medical history error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
});
exports.putByIdMedicalHistory = asyncHandler(async (req, res, next) => {
  try {
    const updateData = {
      ...req.body,
      last_updated_by: req.user.userId
    };
    const medicalHistory = await MedicalHistory.findOneAndUpdate({
      patient_id: req.params.id
    }, updateData, {
      new: true,
      runValidators: true
    });
    if (!medicalHistory) {
      return res.status(404).json({
        message: "Medical history not found"
      });
    }
    res.json({
      message: "Medical history updated successfully",
      medicalHistory
    });
  } catch (error) {
    console.error("Update medical history error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
});
exports.postByIdAllergies = asyncHandler(async (req, res, next) => {
  try {
    const {
      allergen,
      reaction,
      severity,
      identified_date
    } = req.body;
    if (!allergen || !reaction || !severity) {
      return res.status(400).json({
        message: "Allergen, reaction, and severity are required"
      });
    }
    const medicalHistory = await MedicalHistory.findOne({
      patient_id: req.params.id
    });
    if (!medicalHistory) {
      return res.status(404).json({
        message: "Medical history not found"
      });
    }
    medicalHistory.allergies.push({
      allergen,
      reaction,
      severity,
      identified_date
    });
    medicalHistory.last_updated_by = req.user.userId;
    await medicalHistory.save();
    res.json({
      message: "Allergy added successfully",
      allergies: medicalHistory.allergies
    });
  } catch (error) {
    console.error("Add allergy error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
});
exports.postByIdMedications = asyncHandler(async (req, res, next) => {
  try {
    const {
      medication_name,
      dosage,
      frequency,
      started_date,
      prescribed_by,
      purpose
    } = req.body;
    if (!medication_name || !dosage || !frequency || !started_date) {
      return res.status(400).json({
        message: "Medication name, dosage, frequency, and started date are required"
      });
    }
    const medicalHistory = await MedicalHistory.findOne({
      patient_id: req.params.id
    });
    if (!medicalHistory) {
      return res.status(404).json({
        message: "Medical history not found"
      });
    }
    medicalHistory.current_medications.push({
      medication_name,
      dosage,
      frequency,
      started_date,
      prescribed_by,
      purpose
    });
    medicalHistory.last_updated_by = req.user.userId;
    await medicalHistory.save();
    res.json({
      message: "Medication added successfully",
      medications: medicalHistory.current_medications
    });
  } catch (error) {
    console.error("Add medication error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
});
exports.putById = asyncHandler(async (req, res, next) => {
  try {
    const patient = await Patient.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate("user_id", "name email phone");
    if (!patient) {
      return res.status(404).json({
        message: "Patient not found"
      });
    }
    res.json({
      message: "Patient updated successfully",
      patient
    });
  } catch (error) {
    console.error("Update patient error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
});
exports.deleteById = asyncHandler(async (req, res, next) => {
  try {
    // Only clinic_admin, doctor, and super_admin can delete patients
    if (!["clinic_admin", "doctor", "super_admin"].includes(req.user.role)) {
      return res.status(403).json({
        message: "Only Clinic Admin, Doctor, or Super Admin can delete patients"
      });
    }
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({
        message: "Patient not found"
      });
    }

    // Clinic Admin and Doctor can only delete patients from their clinic
    if (["clinic_admin", "doctor"].includes(req.user.role) && patient.clinic_id.toString() !== req.user.clinicId?.toString()) {
      return res.status(403).json({
        message: "Access denied. You can only delete patients from your clinic."
      });
    }

    // Delete associated user account
    await User.findByIdAndDelete(patient.user_id);

    // Delete patient profile
    await Patient.findByIdAndDelete(req.params.id);

    // Delete medical history if exists
    await MedicalHistory.findOneAndDelete({
      patient_id: req.params.id
    });
    res.json({
      message: "Patient deleted successfully",
      patient_id: req.params.id
    });
  } catch (error) {
    console.error("Delete patient error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
});
exports.getByIdMedicalRecords = asyncHandler(async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    // Fetch patient with user details
    const patient = await Patient.findById(req.params.id).populate("user_id", "name email phone").populate("clinic_id", "name address phone");
    if (!patient) {
      return res.status(404).json({
        message: "Patient not found"
      });
    }

    // Access control
    const isOwnRecord = req.user.role === "patient" && patient.user_id._id.toString() === req.user.userId.toString();
    const isSameClinic = ["clinic_admin", "doctor"].includes(req.user.role) && patient.clinic_id._id.toString() === req.user.clinicId?.toString();
    if (!isOwnRecord && !isSameClinic && !["admin", "super_admin"].includes(req.user.role)) {
      return res.status(403).json({
        message: "Access denied"
      });
    }

    // Fetch all medical records in parallel for better performance
    const [medicalHistory, consultations, prescriptions, appointments, labReports, visitRecords] = await Promise.all([
    // Medical History
    MedicalHistory.findOne({
      patient_id: req.params.id
    }).populate("last_updated_by", "name").lean(),
    // Recent Consultations
    ConsultationNote.find({
      patient_id: req.params.id
    }).populate({
      path: "doctor_id",
      select: "specialization user_id",
      populate: {
        path: "user_id",
        select: "name"
      }
    }).populate("appointment_id", "appointment_date appointment_time").sort({
      createdAt: -1
    }).limit(limit).lean(),
    // Recent Prescriptions
    Prescription.find({
      patient_id: req.params.id
    }).populate({
      path: "doctor_id",
      select: "specialization user_id",
      populate: {
        path: "user_id",
        select: "name"
      }
    }).sort({
      createdAt: -1
    }).limit(limit).lean(),
    // Recent Appointments
    Appointment.find({
      patient_id: req.params.id
    }).populate({
      path: "doctor_id",
      select: "specialization user_id",
      populate: {
        path: "user_id",
        select: "name"
      }
    }).sort({
      appointment_date: -1,
      appointment_time: -1
    }).limit(limit).lean(),
    // Recent Lab Reports
    LabReport.find({
      patient_id: req.params.id
    }).populate({
      path: "doctor_id",
      select: "user_id",
      populate: {
        path: "user_id",
        select: "name"
      }
    }).sort({
      test_date: -1
    }).limit(limit).lean(),
    // Recent Visit Records
    VisitRecord.find({
      patient_id: req.params.id
    }).populate({
      path: "doctor_id",
      select: "user_id",
      populate: {
        path: "user_id",
        select: "name"
      }
    }).populate("appointment_id", "appointment_date appointment_time").sort({
      visit_date: -1
    }).limit(limit).lean()]);

    // Get total counts
    const [consultationsTotal, prescriptionsTotal, appointmentsTotal, labReportsTotal, visitRecordsTotal] = await Promise.all([ConsultationNote.countDocuments({
      patient_id: req.params.id
    }), Prescription.countDocuments({
      patient_id: req.params.id
    }), Appointment.countDocuments({
      patient_id: req.params.id
    }), LabReport.countDocuments({
      patient_id: req.params.id
    }), VisitRecord.countDocuments({
      patient_id: req.params.id
    })]);

    // Transform patient data
    const patientData = {
      _id: patient._id,
      patient_id: patient.patient_id,
      name: patient.user_id.name,
      email: patient.user_id.email,
      phone: patient.user_id.phone,
      gender: patient.gender,
      date_of_birth: patient.date_of_birth,
      age: Math.floor((new Date() - new Date(patient.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000)),
      blood_group: patient.blood_group,
      address: patient.address,
      emergency_contact: patient.emergency_contact,
      clinic: {
        _id: patient.clinic_id._id,
        name: patient.clinic_id.name,
        address: patient.clinic_id.address,
        phone: patient.clinic_id.phone
      },
      created_at: patient.created_at
    };

    // Transform consultations
    const transformedConsultations = consultations.map(consultation => ({
      _id: consultation._id,
      appointment_id: consultation.appointment_id?._id,
      appointment_date: consultation.appointment_id?.appointment_date,
      appointment_time: consultation.appointment_id?.appointment_time,
      doctor: consultation.doctor_id ? {
        _id: consultation.doctor_id._id,
        name: consultation.doctor_id.user_id?.name,
        specialization: consultation.doctor_id.specialization
      } : null,
      chief_complaint: consultation.chief_complaint,
      diagnosis: consultation.diagnosis,
      follow_up_date: consultation.follow_up_date,
      created_at: consultation.createdAt
    }));

    // Transform prescriptions
    const transformedPrescriptions = prescriptions.map(prescription => ({
      _id: prescription._id,
      consultation_id: prescription.consultation_id,
      doctor: prescription.doctor_id ? {
        _id: prescription.doctor_id._id,
        name: prescription.doctor_id.user_id?.name,
        specialization: prescription.doctor_id.specialization
      } : null,
      medications: prescription.medications,
      additional_instructions: prescription.additional_instructions,
      status: prescription.status,
      created_at: prescription.createdAt
    }));

    // Transform appointments
    const transformedAppointments = appointments.map(appointment => ({
      _id: appointment._id,
      appointment_date: appointment.appointment_date,
      appointment_time: appointment.appointment_time,
      status: appointment.status,
      reason_for_visit: appointment.reason_for_visit,
      doctor: appointment.doctor_id ? {
        _id: appointment.doctor_id._id,
        name: appointment.doctor_id.user_id?.name,
        specialization: appointment.doctor_id.specialization
      } : null,
      created_at: appointment.createdAt
    }));

    // Transform lab reports
    const transformedLabReports = labReports.map(report => ({
      _id: report._id,
      test_name: report.test_name,
      test_type: report.test_type,
      test_date: report.test_date,
      status: report.status,
      findings: report.findings,
      report_file_url: report.report_file_url,
      doctor: report.doctor_id ? {
        _id: report.doctor_id._id,
        name: report.doctor_id.user_id?.name
      } : null,
      created_at: report.createdAt
    }));

    // Transform visit records
    const transformedVisitRecords = visitRecords.map(record => ({
      _id: record._id,
      visit_date: record.visit_date,
      visit_type: record.visit_type,
      status: record.status,
      summary: record.summary,
      doctor: record.doctor_id ? {
        _id: record.doctor_id._id,
        name: record.doctor_id.user_id?.name
      } : null,
      appointment_date: record.appointment_id?.appointment_date,
      appointment_time: record.appointment_id?.appointment_time,
      created_at: record.createdAt
    }));

    // Build response
    const medicalRecords = {
      patient: patientData,
      medicalHistory: medicalHistory || {
        message: "No medical history available",
        known_conditions: [],
        allergies: [],
        current_medications: [],
        past_surgeries: [],
        family_history: [],
        immunizations: []
      },
      consultations: {
        data: transformedConsultations,
        total: consultationsTotal,
        showing: transformedConsultations.length
      },
      prescriptions: {
        data: transformedPrescriptions,
        total: prescriptionsTotal,
        showing: transformedPrescriptions.length
      },
      appointments: {
        data: transformedAppointments,
        total: appointmentsTotal,
        showing: transformedAppointments.length
      },
      labReports: {
        data: transformedLabReports,
        total: labReportsTotal,
        showing: transformedLabReports.length
      },
      visitRecords: {
        data: transformedVisitRecords,
        total: visitRecordsTotal,
        showing: transformedVisitRecords.length
      },
      summary: {
        total_consultations: consultationsTotal,
        total_prescriptions: prescriptionsTotal,
        total_appointments: appointmentsTotal,
        total_lab_reports: labReportsTotal,
        total_visit_records: visitRecordsTotal,
        has_allergies: medicalHistory?.allergies?.length > 0,
        has_chronic_conditions: medicalHistory?.known_conditions?.some(c => c.status === "chronic") || false,
        active_medications_count: medicalHistory?.current_medications?.length || 0
      }
    };
    res.json({
      message: "Medical records retrieved successfully",
      data: medicalRecords
    });
  } catch (error) {
    console.error("Get medical records error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
});
exports.getByPatientIdHistory = asyncHandler(async (req, res, next) => {
  try {
    const {
      patientId
    } = req.params;
    const ConsultationNote = require("../models/consultation/ConsultationNote");
    const Prescription = require("../models/consultation/Prescription");
    const AIConsultation = require("../models/consultation/AIConsultation");
    const FollowUp = require("../models/appointment/FollowUp");
    const Appointment = require("../models/appointment/Appointment");
    const Doctor = require("../models/clinic/Doctor");
    const User = require("../models/user/User");

    // Get patient with user info
    const patient = await Patient.findById(patientId).populate("user_id", "name email phone");
    if (!patient) {
      return res.status(404).json({
        message: "Patient not found"
      });
    }

    // Get all consultations for this patient, newest first
    const consultations = await ConsultationNote.find({
      patient_id: patientId
    }).sort({
      createdAt: -1
    }).lean();

    // Build visits timeline
    const visits = [];
    for (const consultation of consultations) {
      // Get doctor name
      let doctorName = "Doctor";
      if (consultation.doctor_id) {
        const doctor = await Doctor.findById(consultation.doctor_id);
        if (doctor) {
          const doctorUser = await User.findById(doctor.user_id);
          doctorName = doctorUser?.name || "Doctor";
        }
      }

      // Get linked prescription
      const prescription = await Prescription.findOne({
        consultation_id: consultation._id
      }).lean();

      // Get AI consultation if linked
      let aiSummary = null;
      if (consultation.ai_consultation_id) {
        const aiConsult = await AIConsultation.findById(consultation.ai_consultation_id).lean();
        aiSummary = aiConsult?.summary || aiConsult?.doctor_edits?.summary || null;
      }

      // Get follow-up info if linked
      const followUp = await FollowUp.findOne({
        consultation_note_id: consultation._id
      }).lean();

      // Get appointment status
      let appointmentStatus = null;
      if (consultation.appointment_id) {
        const appointment = await Appointment.findById(consultation.appointment_id).lean();
        appointmentStatus = appointment?.status;
      }
      visits.push({
        _id: consultation._id,
        date: consultation.createdAt,
        doctorName,
        chiefComplaint: consultation.chief_complaint,
        diagnosis: consultation.diagnosis,
        treatmentPlan: consultation.treatment_plan,
        summary: consultation.notes,
        aiSummary,
        vitalSigns: consultation.vital_signs,
        prescription: prescription ? {
          _id: prescription._id,
          medications: prescription.medications,
          status: prescription.status
        } : null,
        followUp: followUp ? {
          date: followUp.follow_up_date,
          status: followUp.status,
          purpose: followUp.purpose
        } : null,
        appointmentStatus
      });
    }
    res.json({
      patient: {
        _id: patient._id,
        name: patient.user_id?.name,
        email: patient.user_id?.email,
        phone: patient.user_id?.phone,
        patient_id: patient.patient_id,
        gender: patient.gender,
        date_of_birth: patient.date_of_birth,
        blood_group: patient.blood_group,
        address: patient.address,
        emergency_contact: patient.emergency_contact
      },
      visits,
      totalVisits: visits.length
    });
  } catch (error) {
    console.error("Patient history error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
});
