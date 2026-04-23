const mongoose = require('mongoose');
require('dotenv').config();

// Load models
const User = require('../models/User');
const Listing = require('../models/Listing');
const Rental = require('../models/Rental');
const TradeProposal = require('../models/TradeProposal');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Notification = require('../models/Notification');

async function inspect() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');

  const users = await User.find({});
  console.log(`\n--- USERS (${users.length}) ---`);
  users.forEach(u => console.log(`ID: ${u._id} | Name: ${u.name} | Email: ${u.email}`));

  const seededTitles = [
    'MacBook Air M2', 'Sony WH-1000XM5 Headphones', 'iPad Pro 11" with Apple Pencil',
    'JBL Flip 6 Bluetooth Speaker', 'Engineering Mathematics by B.S. Grewal',
    'Data Structures & Algorithms in Java', 'Atomic Habits by James Clear',
    'Complete GATE Preparation Kit', 'IKEA Study Desk', 'Ergonomic Office Chair',
    'Bean Bag Chair', 'Bookshelf – 4 Tier', 'Nike Air Jordan 1 Mid',
    'Levi\'s Denim Jacket', 'College Formal Shirts Bundle (5)', 'Winter Hoodie – Oversized',
    'Yonex Badminton Racket', 'Football – Adidas Brazuca', 'Yoga Mat – Premium',
    'Dumbbells Set – 5kg Pair', 'Casio Scientific Calculator', 'Drawing Supplies Kit',
    'Electric Kettle – 1.5L', 'Backpack – Wildcraft 40L'
  ];

  const listings = await Listing.find({});
  console.log(`\n--- LISTINGS (${listings.length}) ---`);
  const seededListings = listings.filter(l => seededTitles.includes(l.title) || (l.images && l.images[0] && l.images[0].includes('unsplash.com')));
  console.log(`Likely Seeded: ${seededListings.length}`);
  seededListings.forEach(l => console.log(`ID: ${l._id} | Title: ${l.title} | Seller: ${l.seller}`));

  const rentals = await Rental.find({});
  console.log(`\n--- RENTALS (${rentals.length}) ---`);
  rentals.forEach(r => console.log(`ID: ${r._id} | Listing: ${r.listing} | Status: ${r.status}`));

  const trades = await TradeProposal.find({});
  console.log(`\n--- TRADES (${trades.length}) ---`);
  trades.forEach(t => console.log(`ID: ${t._id} | Listing: ${t.listing} | Status: ${t.status}`));

  process.exit();
}

inspect().catch(console.error);
