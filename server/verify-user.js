require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const username = 'abhisheksahani';

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const user = await User.findOne({ username });
    if (!user) {
      await mongoose.disconnect();
      process.exit(1);
    }
    if (user.isVerified) {
      await mongoose.disconnect();
      process.exit(0);
    }
    user.isVerified = true;
    await user.save();
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(() => {
    process.exit(1);
  });

