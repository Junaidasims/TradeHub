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
const Review = require('../models/Review');
const WishlistRequest = require('../models/WishlistRequest');

const WHITELIST_EMAILS = [
  'ramanakoushik18@gmail.com',
  'junaid@gmail.com',
  'kranthi4595@gmail.com'
];

const SEED_TITLES = [
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

async function cleanup() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    // 1. Identify Users to Delete
    const allUsers = await User.find({});
    const usersToDelete = allUsers.filter(u => !WHITELIST_EMAILS.includes(u.email));
    const userIdsToDelete = usersToDelete.map(u => u._id);
    const whitelistedUsers = allUsers.filter(u => WHITELIST_EMAILS.includes(u.email));
    const whitelistedUserIds = whitelistedUsers.map(u => u._id);

    console.log(`\n--- USERS ---`);
    console.log(`Total: ${allUsers.length}`);
    console.log(`To Keep: ${whitelistedUsers.length} (${WHITELIST_EMAILS.join(', ')})`);
    console.log(`To Delete: ${userIdsToDelete.length}`);

    // 2. Identify Listings to Delete
    // Delete if title is in seed list OR image is Unsplash OR seller is being deleted
    const allListings = await Listing.find({});
    const listingsToDelete = allListings.filter(l => 
      SEED_TITLES.includes(l.title) || 
      (l.images && l.images[0] && l.images[0].includes('unsplash.com')) ||
      userIdsToDelete.some(uid => uid.equals(l.seller))
    );
    const listingIdsToDelete = listingsToDelete.map(l => l._id);

    console.log(`\n--- LISTINGS ---`);
    console.log(`Total: ${allListings.length}`);
    console.log(`To Delete: ${listingIdsToDelete.length}`);

    // 3. Execution - Listings
    if (listingIdsToDelete.length > 0) {
      await Listing.deleteMany({ _id: { $in: listingIdsToDelete } });
      console.log(`✅ Deleted ${listingIdsToDelete.length} listings`);
    }

    // 4. Execution - Users
    if (userIdsToDelete.length > 0) {
      await User.deleteMany({ _id: { $in: userIdsToDelete } });
      console.log(`✅ Deleted ${userIdsToDelete.length} users`);
    }

    // 5. Cleanup related data
    // Rentals: associated with deleted listings OR deleted users
    const rentalsDeleted = await Rental.deleteMany({
      $or: [
        { listing: { $in: listingIdsToDelete } },
        { renter: { $in: userIdsToDelete } },
        { owner: { $in: userIdsToDelete } }
      ]
    });
    console.log(`✅ Deleted ${rentalsDeleted.deletedCount} rentals`);

    // Trade Proposals
    const tradesDeleted = await TradeProposal.deleteMany({
      $or: [
        { listing: { $in: listingIdsToDelete } },
        { proposedBy: { $in: userIdsToDelete } }
      ]
    });
    console.log(`✅ Deleted ${tradesDeleted.deletedCount} trade proposals`);

    // Conversations & Messages
    const convosToDelete = await Conversation.find({
      $or: [
        { listing: { $in: listingIdsToDelete } },
        { participants: { $in: userIdsToDelete } }
      ]
    });
    const convoIdsToDelete = convosToDelete.map(c => c._id);
    
    if (convoIdsToDelete.length > 0) {
      await Message.deleteMany({ conversation: { $in: convoIdsToDelete } });
      await Conversation.deleteMany({ _id: { $in: convoIdsToDelete } });
      console.log(`✅ Deleted ${convoIdsToDelete.length} conversations and their messages`);
    }

    // Notifications
    const notifsDeleted = await Notification.deleteMany({
      $or: [
        { recipient: { $in: userIdsToDelete } },
        { link: { $regex: listingIdsToDelete.join('|') } } // Rough check for links to deleted listings
      ]
    });
    console.log(`✅ Deleted ${notifsDeleted.deletedCount} notifications`);

    // Reviews
    const reviewsDeleted = await Review.deleteMany({
      $or: [
        { reviewer: { $in: userIdsToDelete } },
        { reviewee: { $in: userIdsToDelete } }
      ]
    });
    console.log(`✅ Deleted ${reviewsDeleted.deletedCount} reviews`);

    // Wishlist Requests
    const wishlistDeleted = await WishlistRequest.deleteMany({
      user: { $in: userIdsToDelete }
    });
    console.log(`✅ Deleted ${wishlistDeleted.deletedCount} wishlist requests`);

    console.log('\n--- CLEANUP COMPLETE ---');
    process.exit(0);
  } catch (err) {
    console.error('Cleanup error:', err);
    process.exit(1);
  }
}

cleanup();
