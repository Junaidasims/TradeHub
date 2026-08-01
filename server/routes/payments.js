const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const auth = require('../middleware/auth');
const Payment = require('../models/Payment');
const Listing = require('../models/Listing');
const Rental = require('../models/Rental');
const Notification = require('../models/Notification');

// Lazy-init Razorpay so missing keys don't crash the server at boot
const getRazorpay = () => {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret || key_id === 'rzp_test_YOUR_KEY_ID') {
    return null;
  }
  return new Razorpay({ key_id, key_secret });
};

// ─────────────────────────────────────────────
// POST /api/payments/create-order
// Body: { listingId, rentalId? }
// Creates a Razorpay order and returns order details + key_id for the frontend
// ─────────────────────────────────────────────
router.post('/create-order', auth, async (req, res) => {
  const razorpay = getRazorpay();
  if (!razorpay) {
    return res.status(503).json({
      msg: 'Payments are not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to server/.env.'
    });
  }

  try {
    const { listingId, rentalId } = req.body;
    if (!listingId) return res.status(400).json({ msg: 'listingId is required.' });

    const listing = await Listing.findById(listingId).populate('seller', 'name');
    if (!listing) return res.status(404).json({ msg: 'Listing not found.' });
    if (listing.seller._id.toString() === req.user.id) {
      return res.status(400).json({ msg: 'You cannot pay for your own listing.' });
    }
    if (listing.status !== 'active') {
      return res.status(400).json({ msg: 'This listing is no longer available.' });
    }

    let amountInPaise;
    let purpose;
    let rental = null;

    if (rentalId) {
      // Rental payment — use rental totalCost
      rental = await Rental.findById(rentalId);
      if (!rental) return res.status(404).json({ msg: 'Rental not found.' });
      if (rental.renter.toString() !== req.user.id) {
        return res.status(401).json({ msg: 'Not your rental.' });
      }
      amountInPaise = Math.round(rental.totalCost * 100);
      purpose = 'rent';
    } else {
      // Buy payment
      amountInPaise = Math.round(listing.price * 100);
      purpose = 'sell';
    }

    if (amountInPaise < 100) {
      return res.status(400).json({ msg: 'Amount must be at least ₹1.' });
    }

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `th_${Date.now()}`,
      notes: {
        listingId: listing._id.toString(),
        buyerId: req.user.id,
        sellerId: listing.seller._id.toString(),
        purpose
      }
    });

    // Persist the order in our DB
    const payment = new Payment({
      buyer: req.user.id,
      seller: listing.seller._id,
      listing: listing._id,
      rental: rental?._id || null,
      razorpayOrderId: order.id,
      amount: amountInPaise,
      purpose
    });
    await payment.save();

    return res.json({
      orderId: order.id,
      amount: amountInPaise,
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID,
      listingTitle: listing.title,
      sellerName: listing.seller.name,
      purpose
    });
  } catch (err) {
    console.error('[Payment] create-order error:', err.message || err);
    return res.status(500).json({ msg: 'Failed to create payment order. Please try again.' });
  }
});

// ─────────────────────────────────────────────
// POST /api/payments/verify
// Body: { razorpayOrderId, razorpayPaymentId, razorpaySignature }
// Verifies HMAC signature, marks payment as paid, updates listing/rental
// ─────────────────────────────────────────────
router.post('/verify', auth, async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return res.status(400).json({ msg: 'Missing payment verification fields.' });
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) return res.status(503).json({ msg: 'Payment verification not configured.' });

  try {
    // HMAC-SHA256 signature check
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      // Mark payment as failed
      await Payment.findOneAndUpdate(
        { razorpayOrderId },
        { status: 'failed', razorpayPaymentId }
      );
      return res.status(400).json({ msg: 'Payment verification failed. Signature mismatch.' });
    }

    // Signature valid — update payment record
    const payment = await Payment.findOneAndUpdate(
      { razorpayOrderId },
      { status: 'paid', razorpayPaymentId, razorpaySignature },
      { new: true }
    ).populate('listing').populate('buyer', 'name').populate('seller', 'name');

    if (!payment) return res.status(404).json({ msg: 'Payment record not found.' });

    // Update listing/rental status
    if (payment.purpose === 'sell') {
      await Listing.findByIdAndUpdate(payment.listing._id, { status: 'sold' });
    } else if (payment.purpose === 'rent' && payment.rental) {
      await Rental.findByIdAndUpdate(payment.rental, { status: 'active' });
    }

    // Notify seller
    const io = req.app.get('io');
    const notif = new Notification({
      recipient: payment.seller._id,
      type: 'payment_received',
      message: `💰 ${payment.buyer.name} paid ₹${(payment.amount / 100).toLocaleString()} for "${payment.listing.title}"`,
      link: `/listing/${payment.listing._id}`
    });
    await notif.save();
    if (io) io.to(payment.seller._id.toString()).emit('new_notification', notif);

    return res.json({
      msg: 'Payment verified successfully.',
      paymentId: payment._id,
      amount: payment.amount / 100,
      purpose: payment.purpose
    });
  } catch (err) {
    console.error('[Payment] verify error:', err.message || err);
    return res.status(500).json({ msg: 'Verification failed. Please contact support.' });
  }
});

// ─────────────────────────────────────────────
// GET /api/payments/my
// Returns all payments for the current user (as buyer or seller)
// ─────────────────────────────────────────────
router.get('/my', auth, async (req, res) => {
  try {
    const payments = await Payment.find({
      $or: [{ buyer: req.user.id }, { seller: req.user.id }]
    })
      .populate('listing', 'title images')
      .populate('buyer', 'name')
      .populate('seller', 'name')
      .sort({ createdAt: -1 });

    return res.json(payments);
  } catch (err) {
    console.error('[Payment] my error:', err.message || err);
    return res.status(500).json({ msg: 'Failed to fetch payments.' });
  }
});

module.exports = router;
