const nodemailer = require('nodemailer');
const config = require('../config/env');
const { getTransporter } = require('../services/emailService');

// Email OTP Service
const sendEmailOTP = async (email, otp) => {
  try {
    console.log('📧 Sending OTP to:', email);
    console.log('🔐 Using email:', config.email.user);
    
    const transporter = getTransporter();

    const mailOptions = {
      from: config.email.user,
      to: email,
      subject: 'Healthcare Portal - OTP Verification',
      html: `
        <h2>OTP Verification</h2>
        <p>Your OTP is: <strong>${otp}</strong></p>
        <p>This OTP will expire in 10 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', result.response);
    return { success: true };
  } catch (error) {
    console.error('❌ Email sending error:', error.message);
    return { success: false, error: error.message };
  }
};

// Generate random OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// SMS OTP Service (placeholder - implement with SMS provider like Twilio)
const sendSMSOTP = async (phone, otp) => {
  try {
    console.log('📱 Sending OTP to:', phone);
    // TODO: Implement SMS sending with Twilio or similar service
    console.log('🔐 OTP:', otp, '(SMS sending not implemented yet)');
    // For now, just log the OTP - in production, integrate with SMS provider
    return { success: true };
  } catch (error) {
    console.error('❌ SMS sending error:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendEmailOTP,
  sendSMSOTP,
  generateOTP
};