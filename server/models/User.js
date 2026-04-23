const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  college: { type: String, default: '' },
  avatar: { type: String, default: '' },
  rating: { type: Number, default: 0 },
  totalRatings: { type: Number, default: 0 },
  
  // Keep isVerified for existing gates, but default to true
  isVerified: { type: Boolean, default: true },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
