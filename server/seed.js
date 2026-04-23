const mongoose = require('mongoose');
require('dotenv').config();
const Listing = require('./models/Listing');
const User = require('./models/User');

const SEED_ITEMS = [
  // === ELECTRONICS ===
  {
    title: 'MacBook Air M2',
    description: 'Barely used MacBook Air M2, 8GB RAM, 256GB SSD. Perfect for college work. Includes charger and sleeve.',
    category: 'Electronics',
    condition: 'Like New',
    type: ['sell'],
    price: 65000,
    images: ['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&h=400&fit=crop'],
  },
  {
    title: 'Sony WH-1000XM5 Headphones',
    description: 'Premium noise-cancelling headphones. Amazing for studying in noisy dorms. Includes case and cables.',
    category: 'Electronics',
    condition: 'Good',
    type: ['sell', 'trade'],
    price: 18000,
    tradePreference: 'AirPods Pro or similar',
    images: ['https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=600&h=400&fit=crop'],
  },
  {
    title: 'iPad Pro 11" with Apple Pencil',
    description: '2023 iPad Pro 11-inch, 128GB, includes Apple Pencil 2nd gen. Great for notes and digital art.',
    category: 'Electronics',
    condition: 'Like New',
    type: ['sell', 'rent'],
    price: 45000,
    rentPeriod: 'monthly',
    images: ['https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&h=400&fit=crop'],
  },
  {
    title: 'JBL Flip 6 Bluetooth Speaker',
    description: 'Waterproof portable speaker. Great bass and battery life. Perfect for hostel parties.',
    category: 'Electronics',
    condition: 'Good',
    type: ['sell', 'rent'],
    price: 5500,
    rentPeriod: 'daily',
    images: ['https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600&h=400&fit=crop'],
  },

  // === BOOKS ===
  {
    title: 'Engineering Mathematics by B.S. Grewal',
    description: 'Latest edition, no markings. Covers all semesters of engineering math.',
    category: 'Books',
    condition: 'Good',
    type: ['sell', 'trade'],
    price: 350,
    tradePreference: 'Any engineering textbook',
    images: ['https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&h=400&fit=crop'],
  },
  {
    title: 'Data Structures & Algorithms in Java',
    description: 'Robert Lafore textbook. Essential for CS students. Some highlighting but clean overall.',
    category: 'Books',
    condition: 'Good',
    type: ['sell'],
    price: 450,
    images: ['https://images.unsplash.com/photo-1532012197267-da84d127e765?w=600&h=400&fit=crop'],
  },
  {
    title: 'Atomic Habits by James Clear',
    description: 'Bestselling self-help book. Read once, in perfect condition.',
    category: 'Books',
    condition: 'Like New',
    type: ['sell', 'rent', 'trade'],
    price: 200,
    rentPeriod: 'weekly',
    tradePreference: 'Any bestseller novel',
    images: ['https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&h=400&fit=crop'],
  },
  {
    title: 'Complete GATE Preparation Kit',
    description: 'Set of 5 GATE prep books for CSE. Includes previous year papers and solutions.',
    category: 'Books',
    condition: 'Fair',
    type: ['sell'],
    price: 1200,
    images: ['https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&h=400&fit=crop'],
  },

  // === FURNITURE ===
  {
    title: 'IKEA Study Desk',
    description: 'Compact white study desk with drawer. Perfect for hostel rooms. Easy to assemble.',
    category: 'Furniture',
    condition: 'Good',
    type: ['sell'],
    price: 3500,
    images: ['https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=600&h=400&fit=crop'],
  },
  {
    title: 'Ergonomic Office Chair',
    description: 'Mesh back, adjustable height, lumbar support. Saves your back during long study sessions.',
    category: 'Furniture',
    condition: 'Like New',
    type: ['sell', 'rent'],
    price: 8000,
    rentPeriod: 'monthly',
    images: ['https://images.unsplash.com/photo-1592078615290-033ee584e267?w=600&h=400&fit=crop'],
  },
  {
    title: 'Bean Bag Chair',
    description: 'Large comfy bean bag in grey. Great for gaming or reading. Comes with extra filling.',
    category: 'Furniture',
    condition: 'Good',
    type: ['sell'],
    price: 1800,
    images: ['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&h=400&fit=crop'],
  },
  {
    title: 'Bookshelf – 4 Tier',
    description: 'Wooden 4-tier bookshelf. Holds textbooks, decor, and more. Sturdy construction.',
    category: 'Furniture',
    condition: 'Good',
    type: ['sell', 'trade'],
    price: 2200,
    tradePreference: 'Storage cabinet or desk',
    images: ['https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=600&h=400&fit=crop'],
  },

  // === CLOTHING ===
  {
    title: 'Nike Air Jordan 1 Mid',
    description: 'Size 9 UK, black/white colorway. Worn a few times, still in great shape. Original box included.',
    category: 'Clothing',
    condition: 'Like New',
    type: ['sell', 'trade'],
    price: 7500,
    tradePreference: 'Any Nike/Adidas sneakers size 9',
    images: ['https://images.unsplash.com/photo-1556906781-9a412961c28c?w=600&h=400&fit=crop'],
  },
  {
    title: 'Levi\'s Denim Jacket',
    description: 'Classic blue denim jacket, size M. Timeless style that goes with everything.',
    category: 'Clothing',
    condition: 'Good',
    type: ['sell'],
    price: 2000,
    images: ['https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&h=400&fit=crop'],
  },
  {
    title: 'College Formal Shirts Bundle (5)',
    description: 'Set of 5 formal shirts in various colors, size L. Perfect for presentations and interviews.',
    category: 'Clothing',
    condition: 'Good',
    type: ['sell'],
    price: 1500,
    images: ['https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600&h=400&fit=crop'],
  },
  {
    title: 'Winter Hoodie – Oversized',
    description: 'Thick cotton hoodie in charcoal grey, size XL (oversized fit). Super warm for winter.',
    category: 'Clothing',
    condition: 'New',
    type: ['sell', 'rent'],
    price: 1200,
    rentPeriod: 'weekly',
    images: ['https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600&h=400&fit=crop'],
  },

  // === SPORTS ===
  {
    title: 'Yonex Badminton Racket',
    description: 'Yonex Astrox 88D, strung and ready. Includes cover. Great for intermediate to advanced players.',
    category: 'Sports',
    condition: 'Good',
    type: ['sell', 'rent'],
    price: 4000,
    rentPeriod: 'daily',
    images: ['https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=600&h=400&fit=crop'],
  },
  {
    title: 'Football – Adidas Brazuca',
    description: 'Match-quality football. Used in a few college tournaments. Still holds air perfectly.',
    category: 'Sports',
    condition: 'Good',
    type: ['sell'],
    price: 800,
    images: ['https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=600&h=400&fit=crop'],
  },
  {
    title: 'Yoga Mat – Premium',
    description: '6mm thick, non-slip surface. Perfect for yoga, stretching, or floor workouts.',
    category: 'Sports',
    condition: 'Like New',
    type: ['sell', 'rent'],
    price: 600,
    rentPeriod: 'weekly',
    images: ['https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=600&h=400&fit=crop'],
  },
  {
    title: 'Dumbbells Set – 5kg Pair',
    description: 'Rubber-coated 5kg dumbbells. Great for hostel room workouts. No gym needed.',
    category: 'Sports',
    condition: 'Good',
    type: ['sell', 'trade'],
    price: 1000,
    tradePreference: 'Resistance bands or pull-up bar',
    images: ['https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&h=400&fit=crop'],
  },

  // === OTHER ===
  {
    title: 'Casio Scientific Calculator',
    description: 'Casio FX-991EX, essential for engineering exams. Works perfectly, fresh batteries.',
    category: 'Other',
    condition: 'Good',
    type: ['sell', 'rent'],
    price: 800,
    rentPeriod: 'monthly',
    images: ['https://images.unsplash.com/photo-1564466809058-bf4114d55352?w=600&h=400&fit=crop'],
  },
  {
    title: 'Drawing Supplies Kit',
    description: 'Complete art kit: pencils, charcoal, sketch pad, erasers, blending stumps. Perfect for design students.',
    category: 'Other',
    condition: 'Like New',
    type: ['sell'],
    price: 1500,
    images: ['https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600&h=400&fit=crop'],
  },
  {
    title: 'Electric Kettle – 1.5L',
    description: 'Stainless steel electric kettle. Boils water in 3 minutes. Must-have for dorm life.',
    category: 'Other',
    condition: 'Good',
    type: ['sell'],
    price: 600,
    images: ['https://images.unsplash.com/photo-1594213114663-d94db4760c3e?w=600&h=400&fit=crop'],
  },
  {
    title: 'Backpack – Wildcraft 40L',
    description: 'Spacious 40L backpack with laptop compartment. Rain cover included. Great for trips and daily use.',
    category: 'Other',
    condition: 'Good',
    type: ['sell', 'trade'],
    price: 1800,
    tradePreference: 'Any good quality backpack',
    images: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&h=400&fit=crop'],
  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected for seeding...');

    // Find a user to be the seller — use the first user in the DB
    const users = await User.find({});
    if (users.length === 0) {
      console.error('No users found! Register at least one user first.');
      process.exit(1);
    }

    // Distribute listings across available users
    const listings = SEED_ITEMS.map((item, i) => ({
      ...item,
      seller: users[i % users.length]._id,
      status: 'active',
    }));

    // Clear old listings (optional — keeps existing ones)
    await Listing.deleteMany({ title: { $in: SEED_ITEMS.map(i => i.title) } });

    const result = await Listing.insertMany(listings);
    console.log(`✅ Seeded ${result.length} listings across ${users.length} user(s):`);

    const categories = {};
    result.forEach(l => { categories[l.category] = (categories[l.category] || 0) + 1; });
    Object.entries(categories).forEach(([cat, count]) => console.log(`   ${cat}: ${count} items`));

    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

// Safeguard: To run seeding, use: node seed.js --force
if (process.argv.includes('--force')) {
  seed();
} else {
  console.log('⚠️  Seeding skipped to protect live data. Use --force to seed anyway.');
}
