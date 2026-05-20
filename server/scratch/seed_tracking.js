const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const seed = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/tradehub';
    await mongoose.connect(mongoUri);
    console.log('Connected to DB');

    const User = require('../models/User');
    const Listing = require('../models/Listing');
    const Rental = require('../models/Rental');

    // Create Owner
    let owner = await User.findOne({ email: 'owner@test.com' });
    if (!owner) {
      owner = new User({
        name: 'Demo Owner',
        email: 'owner@test.com',
        password: await bcrypt.hash('123456', 10)
      });
      await owner.save();
    }

    // Create Renter
    let renter = await User.findOne({ email: 'renter@test.com' });
    if (!renter) {
      renter = new User({
        name: 'Demo Renter',
        email: 'renter@test.com',
        password: await bcrypt.hash('123456', 10)
      });
      await renter.save();
    }

    // Create Listing for Owner
    let listing = await Listing.findOne({ seller: owner._id, title: 'Demo Tracking Item' });
    if (!listing) {
      listing = new Listing({
        title: 'Demo Tracking Item',
        description: 'Testing live tracking.',
        price: 500,
        rentPrice: 50,
        category: 'Electronics',
        condition: 'New',
        seller: owner._id,
        type: ['rent'],
        status: 'active'
      });
      await listing.save();
    }

    // Create Rental
    await Rental.deleteMany({ listing: listing._id }); // Clear old
    const rental = new Rental({
      listing: listing._id,
      renter: renter._id,
      owner: owner._id,
      totalCost: 50,
      status: 'active',
      startDate: new Date(),
      endDate: new Date(Date.now() + 1.5 * 60 * 60 * 1000), // Due in 1.5 hours (trigger smart alert condition)
      trackingRequested: true,
      trackingAccepted: true,
      baseLocation: { lat: 28.6139, lng: 77.2090 }
    });
    await rental.save();

    listing.status = 'rented';
    await listing.save();

    console.log('Seed successful!');
    console.log('==============================');
    console.log('Owner Account: owner@test.com / 123456');
    console.log('Renter Account: renter@test.com / 123456');
    console.log('Rental is Active, Tracking is Accepted, Due in 1.5 hours.');
    console.log('==============================');
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seed();
