const express = require('express');
const path = require('path');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Allowed origins
const allowedOrigins = [
  'http://localhost:3000', 
  'http://localhost:3001',
  'http://localhost:5173',
  process.env.FRONTEND_URL
].filter(Boolean);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  }
});

// Make io accessible to routes
app.set('io', io);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' } // Allow images to be loaded cross-origin (port 3000 → 5000)
}));
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());

// Serve uploaded images as static files (with explicit cross-origin header)
app.use('/uploads', (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, 'uploads')));

// Rate limiting on auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { msg: 'Too many requests, please try again later' }
});

// Database
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Models
require('./models/User');
require('./models/Listing');
require('./models/Conversation');
require('./models/Message');
require('./models/Rental');
require('./models/TradeProposal');
require('./models/Notification');
require('./models/Review');
require('./models/WishlistRequest');

// Routes
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/listings', require('./routes/listings'));
app.use('/api/users', require('./routes/users'));
app.use('/api/conversations', require('./routes/conversations'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/rentals', require('./routes/rentals'));
app.use('/api/trades', require('./routes/trades'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/wishlist', require('./routes/wishlist'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/ai', require('./routes/ai'));

app.get('/', (req, res) => res.send('TradeHub API v2'));

// Socket.io authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication error'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.user?.id || decoded.id;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.userId}`);
  socket.join(socket.userId); // Personal room for notifications

  socket.on('join_conversation', (conversationId) => {
    socket.join(conversationId);
  });

  socket.on('leave_conversation', (conversationId) => {
    socket.leave(conversationId);
  });

  socket.on('send_message', async (data) => {
    try {
      const Message = require('./models/Message');
      const Conversation = require('./models/Conversation');
      
      const convo = await Conversation.findOne({ 
        _id: data.conversationId, 
        participants: socket.userId 
      });
      
      if (!convo) {
        console.log(`Unauthorized send_message attempt by ${socket.userId}`);
        return;
      }

      const message = new Message({
        conversation: data.conversationId,
        sender: socket.userId,
        text: data.text,
        imageUrl: data.imageUrl || '',
        itemContext: data.itemContext || null
      });
      await message.save();
      const populated = await Message.findById(message._id)
        .populate('sender', 'name avatar')
        .populate('itemContext', 'title');

      // Update conversation
      convo.lastMessage = data.text || '📷 Image';
      convo.lastTimestamp = new Date();
      // Increment unread for all participants except sender
      convo.participants.forEach(p => {
        if (p.toString() !== socket.userId) {
          convo.unreadCount.set(p.toString(), (convo.unreadCount.get(p.toString()) || 0) + 1);
        }
      });
      await convo.save();

      // Emit to each participant's personal room for global real-time notifications
      convo.participants.forEach(p => {
        io.to(p.toString()).emit('new_message', populated);
        
        if (p.toString() !== socket.userId) {
          io.to(p.toString()).emit('unread_count_updated', {
            conversationId: data.conversationId,
            count: convo.unreadCount.get(p.toString()) || 0
          });
        }
      });
    } catch (err) {
      console.error('send_message error:', err);
    }
  });

  socket.on('typing_start', (data) => {
    socket.to(data.conversationId).emit('user_typing', {
      userId: socket.userId,
      name: data.name,
      conversationId: data.conversationId
    });
  });

  socket.on('typing_stop', (data) => {
    socket.to(data.conversationId).emit('user_stopped_typing', {
      userId: socket.userId,
      conversationId: data.conversationId
    });
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.userId}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  
  // Background task: Auto-complete expired rentals
  const checkExpiredRentals = async () => {
    try {
      const Rental = mongoose.model('Rental');
      const Listing = mongoose.model('Listing');
      
      const expired = await Rental.find({ 
        status: 'active', 
        endDate: { $lt: new Date() } 
      });

      if (expired.length > 0) {
        console.log(`[Auto-Rental] Found ${expired.length} expired rentals. Processing...`);
      }

      for (const rental of expired) {
        rental.status = 'completed';
        await rental.save();

        const listing = await Listing.findById(rental.listing);
        if (listing) {
          listing.status = 'expired';
          listing.rentedUntil = null;
          await listing.save();

          // Notify owner to re-list
          const Notification = mongoose.model('Notification');
          const notif = new Notification({
            recipient: listing.seller,
            type: 'listing_expired',
            message: `Your rental period for "${listing.title}" has ended. Would you like to re-list it?`,
            link: `/listing/${listing._id}`
          });
          await notif.save();
          io.to(listing.seller.toString()).emit('new_notification', notif);

          io.emit('listing_updated', { listingId: listing._id, status: 'expired' });
          console.log(`[Auto-Rental] Listing "${listing.title}" rental ended. Moved to expired for re-listing.`);
        }
      }
    } catch (err) {
      console.error('[Auto-Rental] Check failed:', err);
    }
  };

  // Run every 10 minutes (600,000 ms)
  setInterval(checkExpiredRentals, 600000);
  // Initial check on startup
  await checkExpiredRentals();
});
