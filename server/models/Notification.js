const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['message', 'trade_proposal', 'trade_accepted', 'trade_declined', 'rental_confirmed', 'rental_request', 'review', 'tracking_request', 'tracking_response', 'smart_alert'],
    required: true
  },
  message: { type: String, required: true },
  data: { type: Object },
  link: { type: String, default: '' },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

notificationSchema.index({ recipient: 1, read: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
