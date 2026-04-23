const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
require('../models/User'); // Register for populate
const auth = require('../middleware/auth');

// POST / — send a message (REST fallback, Socket.io is primary)
router.post('/', auth, async (req, res) => {
  const { conversationId, text, imageUrl, itemContext } = req.body;
  try {
    const convo = await Conversation.findById(conversationId);
    if (!convo || !convo.participants.map(p => p.toString()).includes(req.user.id)) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    const message = new Message({
      conversation: conversationId,
      sender: req.user.id,
      text: text || '',
      imageUrl: imageUrl || '',
      itemContext: itemContext || null
    });
    await message.save();

    // Update conversation metadata
    convo.lastMessage = text || '📷 Image';
    convo.lastTimestamp = new Date();
    convo.participants.forEach(p => {
      if (p.toString() !== req.user.id) {
        convo.unreadCount.set(p.toString(), (convo.unreadCount.get(p.toString()) || 0) + 1);
      }
    });
    await convo.save();

    const populated = await Message.findById(message._id)
      .populate('sender', 'name avatar')
      .populate('itemContext', 'title');

    // Emit to each participant's personal room for global real-time notifications
    const io = req.app.get('io');
    convo.participants.forEach(p => {
      io.to(p.toString()).emit('new_message', populated);
      
      if (p.toString() !== req.user.id) {
        io.to(p.toString()).emit('unread_count_updated', {
          conversationId, 
          count: convo.unreadCount.get(p.toString()) || 0
        });
      }
    });

    res.json(populated);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// DELETE /:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ msg: 'Message not found' });
    if (message.sender.toString() !== req.user.id) return res.status(401).json({ msg: 'Not authorized' });

    await message.deleteOne();
    
    // Notify via socket
    const io = req.app.get('io');
    io.to(message.conversation.toString()).emit('message_deleted', { messageId: message._id });

    res.json({ msg: 'Message deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
