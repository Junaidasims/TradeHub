const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
  rental: { type: mongoose.Schema.Types.ObjectId, ref: 'Rental', default: null },

  // Razorpay identifiers
  razorpayOrderId: { type: String, required: true, unique: true },
  razorpayPaymentId: { type: String, default: '' },
  razorpaySignature: { type: String, default: '' },

  amount: { type: Number, required: true },   // in paise (₹1 = 100 paise)
  currency: { type: String, default: 'INR' },

  // 'sell' | 'rent'
  purpose: { type: String, enum: ['sell', 'rent'], required: true },

  // 'created' → 'paid' → 'failed'
  status: { type: String, enum: ['created', 'paid', 'failed'], default: 'created' },

  createdAt: { type: Date, default: Date.now }
});

paymentSchema.index({ buyer: 1 });
paymentSchema.index({ seller: 1 });
paymentSchema.index({ listing: 1 });
paymentSchema.index({ razorpayOrderId: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
