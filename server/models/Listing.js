const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  category: { type: String, required: true },
  condition: { type: String, enum: ['New', 'Like New', 'Good', 'Fair'], required: true },
  type: [{ type: String, enum: ['sell', 'rent', 'trade'], required: true }],
  price: { type: Number, default: 0 },
  rentPrice: { type: Number, default: 0 },
  rentPeriod: { type: String, enum: ['daily', 'weekly', 'monthly'] },
  rentedUntil: { type: Date },
  tradePreference: { type: String, default: '' },
  images: [String],
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['active', 'sold', 'rented', 'traded', 'expired'], default: 'active' },
  views: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

listingSchema.index({ seller: 1 });
listingSchema.index({ status: 1 });
listingSchema.index({ category: 1 });
listingSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Listing', listingSchema);
