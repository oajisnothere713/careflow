const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhone = (phone) => {
  // Basic phone validation - adjust regex as needed for your region
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
  return phoneRegex.test(phone);
};

const validateOTP = (otp) => {
  return /^\d{6}$/.test(otp);
};

const validateRole = (role) => {
  return ['doctor', 'staff', 'patient'].includes(role);
};

const validateSignupData = (data) => {
  const errors = [];

  if (!data.email || !validateEmail(data.email)) {
    errors.push('Valid email is required');
  }

  if (!data.phone || !validatePhone(data.phone)) {
    errors.push('Valid phone number is required');
  }

  if (!data.otp || !validateOTP(data.otp)) {
    errors.push('Valid 6-digit OTP is required');
  }

  if (!data.name || data.name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long');
  }

  if (!data.role || !validateRole(data.role)) {
    errors.push('Valid role (doctor, staff, or patient) is required');
  }

  return errors;
};

const validateLoginData = (data) => {
  const errors = [];

  if (!data.email || !validateEmail(data.email)) {
    errors.push('Valid email is required');
  }

  if (!data.phone || !validatePhone(data.phone)) {
    errors.push('Valid phone number is required');
  }

  if (!data.otp || !validateOTP(data.otp)) {
    errors.push('Valid 6-digit OTP is required');
  }

  return errors;
};

const validateSendOTPData = (data) => {
  const errors = [];

  if (!data.email || !validateEmail(data.email)) {
    errors.push('Valid email is required');
  }

  if (!data.phone || !validatePhone(data.phone)) {
    errors.push('Valid phone number is required');
  }

  if (!data.type || !['signup', 'login'].includes(data.type)) {
    errors.push('Type must be either signup or login');
  }

  return errors;
};

const validateProfileUpdateData = (data) => {
  const errors = [];

  if (data.name !== undefined && (!data.name || data.name.trim().length < 2)) {
    errors.push('Name must be at least 2 characters long');
  }

  if (data.phone !== undefined && !validatePhone(data.phone)) {
    errors.push('Valid phone number is required');
  }

  if (!data.name && !data.phone) {
    errors.push('At least one field (name or phone) must be provided');
  }

  return errors;
};

module.exports = {
  validateSignupData,
  validateLoginData,
  validateSendOTPData,
  validateProfileUpdateData
};