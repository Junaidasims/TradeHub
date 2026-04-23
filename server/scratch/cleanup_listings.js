const mongoose = require('mongoose');
require('./models/Listing');
require('dotenv').config();

async function cleanup() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const Listing = mongoose.model('Listing');
    
    // Using case-insensitive regex to catch 'aa', 'AA', '22', etc.
    const result = await Listing.deleteMany({
      title: { $in: [/22/i, /aa/i] }
    });

    console.log(`Successfully deleted ${result.deletedCount} listings.`);
    process.exit(0);
  } catch (err) {
    console.error('Cleanup failed:', err);
    process.exit(1);
  }
}

cleanup();
