const Joi = require('joi');

const sendOtpSchema = Joi.object({
  email: Joi.string().email().required(),
});

const verifyOtpSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().length(6).required(),
  name: Joi.string().min(2).max(100),
  phone: Joi.string().pattern(/^[0-9]{10}$/),
  role: Joi.string().valid('patient', 'doctor', 'clinic_admin', 'super_admin'),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

module.exports = { sendOtpSchema, verifyOtpSchema, loginSchema };
