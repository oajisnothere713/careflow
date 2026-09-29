require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/user/User');

async function createSuperAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/healthcare-portal');
    console.log('✅ Connected to MongoDB');

    // Check if super admin already exists
    const existing = await User.findOne({ role: 'super_admin' });
    if (existing) {
      console.log('\n⚠️  Super Admin already exists!');
      console.log('📧 Email:', existing.email);
      console.log('📱 Phone:', existing.phone);
      console.log('👤 Name:', existing.name);
      console.log('\nUse these credentials to login via OTP');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Create super admin
    const superAdmin = new User({
      name: 'Super Admin',
      email: 'superadmin@healthcare.com',
      phone: '9999999999',
      role: 'super_admin',
      isVerified: true,
      status: 'active'
    });

    await superAdmin.save();

    console.log('\n🎉 Super Admin created successfully!');
    console.log('========================================');
    console.log('📧 Email: superadmin@healthcare.com');
    console.log('📱 Phone: 9999999999');
    console.log('========================================');
    console.log('\n📝 Next Steps:');
    console.log('1. Use these credentials to request OTP via:');
    console.log('   POST /api/auth/send-otp');
    console.log('2. Verify OTP and login via:');
    console.log('   POST /api/auth/verify-otp-login');
    console.log('3. Create clinics using the super admin token');
    console.log('4. Create clinic admins for each clinic\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating super admin:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

createSuperAdmin();
