// MVP helper: lightweight base64 token helper (no jsonwebtoken dependency)
const jwt = {
  sign: (payload) => Buffer.from(JSON.stringify(payload)).toString("base64"),
  verify: (token) => {
    try {
      return JSON.parse(Buffer.from(token, "base64").toString("utf-8"));
    } catch {
      return {};
    }
  },
};
const config = require("../config/env");
const User = require('../models/user/User');
const OTP = require('../models/user/OTP');
const Doctor = require('../models/clinic/Doctor');
const Patient = require('../models/patient/Patient');
const Clinic = require('../models/clinic/Clinic');
const {
  sendEmailOTP,
  sendSMSOTP,
  generateOTP,
} = require("../utils/otpService");
const asyncHandler = require("../utils/asyncHandler");

exports.sendOtp = asyncHandler(async (req, res) => {
  const { email, type } = req.body;

  // Validation
  if (!email || !type) {
    return res.status(400).json({ message: "Email and type are required" });
  }

  if (!["signup", "login"].includes(type)) {
    return res.status(400).json({ message: "Type must be signup or login" });
  }

  // Check if user exists
  let user = null;
  if (type === "signup") {
    user = await User.findOne({ email });
    if (user) {
      return res
        .status(400)
        .json({ message: "User already exists with this email" });
    }
  } else if (type === "login") {
    user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }
  }

  // Generate OTP
  const otp = generateOTP();

  // Delete existing OTP for this email
  await OTP.deleteMany({ email });

  // Save OTP to database - use empty string for phone since not required
  await OTP.create({ email, phone: "", otp, type });

  // Send OTP via email
  const emailResult = await sendEmailOTP(email, otp);

  if (!emailResult.success) {
    return res.status(500).json({ message: "Failed to send OTP" });
  }

  res.json({
    message: "OTP sent successfully to your email",
    success: true,
  });
});

exports.verifyOtpSignup = asyncHandler(async (req, res) => {
  const { email, otp, name, role, clinic_id, phone } = req.body;

  // Validation
  if (!email || !otp || !name || !role) {
    return res
      .status(400)
      .json({ message: "Email, OTP, name, and role are required" });
  }

  if (!["doctor", "staff", "patient"].includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }

  // Find and verify OTP - email only
  const otpRecord = await OTP.findOne({ email, otp, type: "signup" });

  if (!otpRecord) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  if (new Date() > otpRecord.expiresAt) {
    await OTP.deleteOne({ _id: otpRecord._id });
    return res.status(400).json({ message: "OTP expired" });
  }

  // Check if user already exists - by email only
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res
      .status(400)
      .json({ message: "User already exists with this email" });
  }

  // Validate clinic_id requirement for doctor and staff
  if ((role === "doctor" || role === "staff") && !clinic_id) {
    return res
      .status(400)
      .json({ message: "clinic_id is required for doctor and staff roles" });
  }

  // Create user
  const userData = {
    name,
    email,
    role,
    isVerified: true,
  };

  if (phone) {
    userData.phone = phone;
  }

  if (clinic_id) {
    userData.clinic_id = clinic_id;
  }

  const user = new User(userData);

  await user.save();

  // Delete OTP
  await OTP.deleteOne({ _id: otpRecord._id });

  // Generate JWT token
  const token = jwt.sign(
    { userId: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET || config.jwtSecret,
    { expiresIn: "7d" }
  );

  res.status(201).json({
    message: "User created successfully",
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      clinic_id: user.clinic_id,
    },
  });
});

exports.verifyOtpLogin = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  // Validation
  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP are required" });
  }

  // Find and verify OTP
  const otpRecord = await OTP.findOne({ email, otp, type: "login" });

  if (!otpRecord) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  if (new Date() > otpRecord.expiresAt) {
    await OTP.deleteOne({ _id: otpRecord._id });
    return res.status(400).json({ message: "OTP expired" });
  }

  // Find user
  const user = await User.findOne({ email });

  if (!user) {
    return res.status(400).json({ message: "User not found" });
  }

  // Delete OTP
  await OTP.deleteOne({ _id: otpRecord._id });

  // Generate JWT token
  const token = jwt.sign(
    { userId: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET || config.jwtSecret,
    { expiresIn: "7d" }
  );

  // Resolve role-linked IDs
  const doctor =
    user.role === "doctor"
      ? await Doctor.findOne({ user_id: user._id }).select("_id")
      : null;
  const patient =
    user.role === "patient"
      ? await Patient.findOne({ user_id: user._id }).select("_id")
      : null;

  const userPayload = {
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    clinic_id: user.clinic_id || null,
  };

  if (user.role === "doctor" && doctor) {
    userPayload.doctor_id = doctor._id;
  }

  if (user.role === "patient" && patient) {
    userPayload.patient_id = patient._id;
  }

  res.json({
    message: "Login successful",
    token,
    user: userPayload,
  });
});

exports.superAdminLogin = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  // Validation
  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP are required" });
  }

  // Find OTP record - check both login and super_admin_registration types
  const otpRecord = await OTP.findOne({
    email,
    otp,
    type: { $in: ["login", "super_admin_registration"] },
  });

  if (!otpRecord) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  if (new Date() > otpRecord.expiresAt) {
    await OTP.deleteOne({ _id: otpRecord._id });
    return res
      .status(400)
      .json({ message: "OTP expired. Please request a new one." });
  }

  // Find user by email
  const user = await User.findOne({ email });

  if (!user) {
    return res.status(400).json({ message: "User not found" });
  }

  // Verify user is super admin
  if (user.role !== "super_admin") {
    return res.status(403).json({
      message: "Access denied. Only Super Admin can use this endpoint.",
      userRole: user.role,
    });
  }

  // Delete OTP
  await OTP.deleteOne({ _id: otpRecord._id });

  // Generate JWT token
  const token = jwt.sign(
    { userId: user._id, email: user.email, role: user.role },
    config.jwtSecret,
    { expiresIn: "7d" }
  );

  res.json({
    message: "Super Admin login successful",
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
    },
  });
});

exports.createClinicAdmin = asyncHandler(async (req, res) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const decoded = jwt.verify(token, config.jwtSecret);
  const requestingUser = await User.findById(decoded.userId);

  // Only super_admin can create clinic admins
  if (!requestingUser || requestingUser.role !== "super_admin") {
    return res.status(403).json({
      message: "Only Super Admin can create Clinic Admins",
    });
  }

  const { email, phone, name, clinic_id } = req.body;

  // Validation
  if (!email || !phone || !name || !clinic_id) {
    return res.status(400).json({
      message: "Email, phone, name, and clinic_id are required",
    });
  }

  // Check if clinic exists
  const clinic = await Clinic.findById(clinic_id);
  if (!clinic) {
    return res.status(404).json({ message: "Clinic not found" });
  }

  // Check if user already exists
  const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
  if (existingUser) {
    return res
      .status(400)
      .json({ message: "User already exists with this email or phone" });
  }

  // Send OTP
  const otp = generateOTP();

  // Save OTP
  await OTP.create({
    email,
    phone,
    otp,
    type: "clinic_admin_setup",
  });

  // Send OTP to new admin
  await sendEmailOTP(email, otp);

  res.json({
    message:
      "OTP sent to Clinic Admin email. They should verify to complete setup.",
    email,
    clinic: {
      _id: clinic._id,
      name: clinic.name,
    },
  });
});

exports.verifyClinicAdminSetup = asyncHandler(async (req, res) => {
  const { email, otp, name, clinic_id, phone } = req.body;

  // Validation
  if (!email || !otp || !name || !clinic_id) {
    return res
      .status(400)
      .json({ message: "Email, OTP, name, and clinic_id are required" });
  }

  // Verify OTP - email only
  const otpRecord = await OTP.findOne({
    email,
    otp,
    type: "clinic_admin_setup",
  });

  if (!otpRecord) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  if (new Date() > otpRecord.expiresAt) {
    await OTP.deleteOne({ _id: otpRecord._id });
    return res.status(400).json({ message: "OTP expired" });
  }

  // Check if user already exists - by email only
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res
      .status(400)
      .json({ message: "User already exists with this email" });
  }

  // Create Clinic Admin user
  const userData = {
    name,
    email,
    role: "clinic_admin",
    clinic_id,
    isVerified: true,
  };

  if (phone) {
    userData.phone = phone;
  }

  const user = new User(userData);
  await user.save();

  // Delete OTP
  await OTP.deleteOne({ _id: otpRecord._id });

  // Generate JWT token
  const token = jwt.sign(
    { userId: user._id, email: user.email, role: user.role },
    config.jwtSecret,
    { expiresIn: "7d" }
  );

  res.status(201).json({
    message: "Clinic Admin setup completed successfully",
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      clinic_id: user.clinic_id,
    },
  });
});

exports.registerSuperAdmin = asyncHandler(async (req, res) => {
  const { email, phone, name } = req.body;

  // Validation
  if (!email || !phone || !name) {
    return res.status(400).json({
      message: "Email, phone, and name are required",
    });
  }

  // Check if super admin already exists
  const existingSuperAdmin = await User.findOne({ role: "super_admin" });
  if (existingSuperAdmin) {
    return res.status(400).json({
      message:
        "Super Admin already exists. Only one Super Admin is allowed in the system.",
      existingAdmin: {
        email: existingSuperAdmin.email,
        name: existingSuperAdmin.name,
      },
    });
  }

  // Check if user already exists with this email or phone
  const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
  if (existingUser) {
    return res.status(400).json({
      message: "User already exists with this email or phone",
    });
  }

  // Send OTP
  const otp = generateOTP();

  // Save OTP
  await OTP.create({
    email,
    phone,
    otp,
    type: "super_admin_registration",
  });

  // Send OTP to email
  await sendEmailOTP(email, otp);

  res.json({
    message:
      "OTP sent to Super Admin email for verification. Please verify within 5 minutes.",
    email,
    nextStep: "POST /api/auth/verify-super-admin-registration",
  });
});

exports.verifySuperAdminRegistration = asyncHandler(async (req, res) => {
  const { email, phone, otp, name } = req.body;

  // Validation
  if (!email || !phone || !otp || !name) {
    return res.status(400).json({
      message: "Email, phone, OTP, and name are required",
    });
  }

  // Check if super admin already exists
  const existingSuperAdmin = await User.findOne({ role: "super_admin" });
  if (existingSuperAdmin) {
    return res.status(400).json({
      message:
        "Super Admin already exists. Only one Super Admin is allowed in the system.",
      existingAdmin: {
        email: existingSuperAdmin.email,
        name: existingSuperAdmin.name,
      },
    });
  }

  // Verify OTP
  const otpRecord = await OTP.findOne({
    email,
    phone,
    otp,
    type: "super_admin_registration",
  });

  if (!otpRecord) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  if (new Date() > otpRecord.expiresAt) {
    await OTP.deleteOne({ _id: otpRecord._id });
    return res
      .status(400)
      .json({ message: "OTP expired. Please request a new one." });
  }

  // Check if user already exists
  const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
  if (existingUser) {
    return res
      .status(400)
      .json({ message: "User already exists with this email or phone" });
  }

  // Create Super Admin user
  const user = new User({
    name,
    email,
    phone,
    role: "super_admin",
    isVerified: true,
    status: "active",
  });
  await user.save();

  // Delete OTP
  await OTP.deleteOne({ _id: otpRecord._id });

  // Generate JWT token
  const jwtToken = jwt.sign(
    { userId: user._id, email: user.email, role: user.role },
    config.jwtSecret,
    { expiresIn: "7d" }
  );

  res.status(201).json({
    message:
      "Super Admin registered successfully! You can now login and manage the system.",
    token: jwtToken,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
    },
  });
});

exports.createClinicAdminDirect = asyncHandler(async (req, res) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const decoded = jwt.verify(token, config.jwtSecret);
  const requestingUser = await User.findById(decoded.userId);

  if (!requestingUser || requestingUser.role !== "super_admin") {
    return res.status(403).json({
      message: "Only Super Admin can create Clinic Admins",
    });
  }

  const { email, phone, name, clinic_id } = req.body;

  if (!email || !phone || !name || !clinic_id) {
    return res.status(400).json({
      message: "Email, phone, name, and clinic_id are required",
    });
  }

  const clinic = await Clinic.findById(clinic_id);
  if (!clinic) {
    return res.status(404).json({ message: "Clinic not found" });
  }

  const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
  if (existingUser) {
    return res.status(400).json({
      message: "User already exists with this email or phone",
    });
  }

  const user = new User({
    name,
    email,
    phone,
    role: "clinic_admin",
    clinic_id,
    isVerified: true,
    status: "active",
  });
  await user.save();

  const jwtToken = jwt.sign(
    { userId: user._id, email: user.email, role: user.role },
    config.jwtSecret,
    { expiresIn: "7d" }
  );

  res.status(201).json({
    message: "Clinic Admin created successfully",
    token: jwtToken,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      clinic_id: user.clinic_id,
    },
    clinic: {
      _id: clinic._id,
      name: clinic.name,
    },
  });
});
