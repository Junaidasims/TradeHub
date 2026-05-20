const mongoose = require('mongoose');

const cleanup = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/tradehub');
    const User = require('../models/User');
    await User.deleteMany({ email: { $in: ['owner@test.com', 'renter@test.com'] } });
    console.log('Demo users removed.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};
cleanup();
