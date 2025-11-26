// Script to check user verification status
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const username = 'abhisheksahani';

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    
    const user = await User.findOne({ username }).select('-password');
    
    if (!user) {
      console.error(`❌ User "${username}" not found`);
      await mongoose.disconnect();
      process.exit(1);
    }
    
    console.log(`📋 User Details:`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   isVerified: ${user.isVerified}`);
    console.log(`   isVerified type: ${typeof user.isVerified}`);
    console.log(`   Full user object:`, JSON.stringify(user.toObject(), null, 2));
    
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });

