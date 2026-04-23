const express = require('express');
const router = express.Router();
const Rental = require('../models/Rental');
const Listing = require('../models/Listing');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const verified = require('../middleware/verified');

// POST / — create rental (Pending Approval)
router.post('/', auth, verified, async (req, res) => {
  const { listingId } = req.body;
  try {
    const listing = await Listing.findById(listingId);
    if (!listing) return res.status(404).json({ msg: 'Listing not found' });
    if (listing.status !== 'active') return res.status(400).json({ msg: 'Listing not available' });

    const rental = new Rental({
      listing: listingId,
      renter: req.user.id,
      owner: listing.seller,
      totalCost: listing.rentPrice || listing.price,
      status: 'pending'
    });
    await rental.save();

    const User = require('../models/User');
    const renter = await User.findById(req.user.id);

    // Notify owner for approval
    const notif = new Notification({
      recipient: listing.seller,
      type: 'rental_request',
      message: `Check notification and mark Yes\n\n${renter?.name || 'A buyer'} has submitted a rental request for "${listing.title}".`,
      data: { rentalId: rental._id },
      link: `/notifications`
    });
    await notif.save();

    const io = req.app.get('io');
    io.to(listing.seller.toString()).emit('new_notification', notif);

    res.json(rental);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// PATCH /:id/approve — Owner approves rental
router.patch('/:id/approve', auth, async (req, res) => {
  try {
    const rental = await Rental.findById(req.params.id);
    if (!rental) return res.status(404).json({ msg: 'Rental not found' });
    if (rental.owner.toString() !== req.user.id) return res.status(401).json({ msg: 'Not authorized' });
    if (rental.status !== 'pending') return res.status(400).json({ msg: 'Request already processed' });

    const listing = await Listing.findById(rental.listing);
    if (listing.status !== 'active') return res.status(400).json({ msg: 'Listing no longer available' });

    rental.status = 'active';
    await rental.save();

    listing.status = 'rented';
    await listing.save();

    // Notify renter
    const notif = new Notification({
      recipient: rental.renter,
      type: 'rental_confirmed',
      message: `Your rental for "${listing.title}" was approved!`,
      link: `/dashboard`
    });
    await notif.save();

    const io = req.app.get('io');
    io.to(rental.renter.toString()).emit('new_notification', notif);
    io.emit('listing_updated', { listingId: listing._id, status: 'rented' });

    res.json(rental);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// PATCH /:id/reject — Owner rejects rental
router.patch('/:id/reject', auth, async (req, res) => {
  try {
    const rental = await Rental.findById(req.params.id);
    if (!rental) return res.status(404).json({ msg: 'Rental not found' });
    if (rental.owner.toString() !== req.user.id) return res.status(401).json({ msg: 'Not authorized' });

    rental.status = 'rejected';
    await rental.save();

    const listing = await Listing.findById(rental.listing);

    // Notify renter
    const notif = new Notification({
      recipient: rental.renter,
      type: 'trade_declined',
      message: `Your rental request for "${listing?.title || 'an item'}" was declined.`,
      link: `/listings`
    });
    await notif.save();

    const io = req.app.get('io');
    io.to(rental.renter.toString()).emit('new_notification', notif);

    res.json(rental);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// PATCH /:id/status — Manage active rental (complete/cancel)
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const rental = await Rental.findById(req.params.id);
    if (!rental) return res.status(404).json({ msg: 'Rental not found' });
    if (rental.owner.toString() !== req.user.id && rental.renter.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    rental.status = req.body.status;
    await rental.save();

    if (req.body.status === 'completed' || req.body.status === 'cancelled') {
      const listing = await Listing.findById(rental.listing);
      listing.status = 'active';
      await listing.save();
      const io = req.app.get('io');
      io.emit('listing_updated', { listingId: listing._id, status: 'active' });
    }

    res.json(rental);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
