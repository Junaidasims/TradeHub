const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
require('../models/User'); // Register for populate
require('../models/Listing'); // Register for populate
const auth = require('../middleware/auth');

// GET / — all conversations for current user
router.get('/', auth, async (req, res) => {
  try {
    const conversations = await Conversation.find({ participants: req.user.id })
      .populate('participants', 'name avatar')
      .populate('listing', 'title images')
      .sort({ lastTimestamp: -1 });
    res.json(conversations);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// GET /:id/messages — paginated messages
router.get('/:id/messages', auth, async (req, res) => {
  try {
    // SECURITY: Only participants can fetch messages
    const convo = await Conversation.findOne({ _id: req.params.id, participants: req.user.id });
    if (!convo) {
      return res.status(401).json({ msg: 'Not authorized or conversation not found' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const messages = await Message.find({ conversation: req.params.id })
      .populate('sender', 'name avatar')
      .populate('itemContext', 'title')
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit);

    const total = await Message.countDocuments({ conversation: req.params.id });
    res.json({ messages, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// POST / — create or find existing conversation (Unified per user pair)
router.post('/', auth, async (req, res) => {
  const { receiverId } = req.body;
  try {
    if (!receiverId) return res.status(400).json({ msg: 'Receiver ID required' });
    if (receiverId === req.user.id) return res.status(400).json({ msg: 'Cannot start conversation with yourself' });

    // Find any conversation between these exactly two participants
    let conversation = await Conversation.findOne({
      participants: { $all: [req.user.id, receiverId], $size: 2 }
    }).populate('participants', 'name avatar');

    if (conversation) return res.json(conversation);

    // Create new unified conversation
    conversation = new Conversation({
      participants: [req.user.id, receiverId],
      unreadCount: new Map([[req.user.id, 0], [receiverId, 0]])
    });
    await conversation.save();

    const populated = await Conversation.findById(conversation._id)
      .populate('participants', 'name avatar');

    res.json(populated);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// PATCH /:id/read — mark all messages as read
router.patch('/:id/read', auth, async (req, res) => {
  try {
    const convo = await Conversation.findOne({ _id: req.params.id, participants: req.user.id });
    if (!convo) {
      return res.status(401).json({ msg: 'Not authorized or conversation not found' });
    }

    await Message.updateMany(
      { conversation: req.params.id, sender: { $ne: req.user.id }, read: false },
      { read: true }
    );
    convo.unreadCount.set(req.user.id, 0);
    await convo.save();

    res.json({ msg: 'Messages marked as read' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
