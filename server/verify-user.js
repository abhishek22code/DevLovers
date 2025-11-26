// Script to manually verify a user
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const username = 'abhisheksahani';

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    
    const user = await User.findOne({ username });
    
    if (!user) {
      console.error(`❌ User "${username}" not found`);
      await mongoose.disconnect();
      process.exit(1);
    }
    
    console.log(`📋 Found user: ${user.username} (${user.email})`);
    console.log(`   Current verification status: ${user.isVerified ? '✅ Verified' : '❌ Not verified'}`);
    
    if (user.isVerified) {
      console.log('ℹ️  User is already verified');
      await mongoose.disconnect();
      process.exit(0);
    }
    
    // Update verification status
    user.isVerified = true;
    await user.save();
    
    console.log(`✅ Successfully verified user: ${user.username}`);
    console.log(`   User ID: ${user._id}`);
    
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });

