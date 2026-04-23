const mongoose = require('mongoose');
require('dotenv').config();

// Define models
const User = mongoose.model('User', new mongoose.Schema({ name: String }));
const Conversation = mongoose.model('Conversation', new mongoose.Schema({
  participants: [mongoose.Schema.Types.ObjectId]
}));
const Message = mongoose.model('Message', new mongoose.Schema({
  conversation: mongoose.Schema.Types.ObjectId,
  sender: mongoose.Schema.Types.ObjectId,
  text: String,
  createdAt: Date
}));

async function checkMessages() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected');

  const targetConvoId = '69d79ad54ed35415db399410';
  const convo = await Conversation.findById(targetConvoId);
  console.log('\n--- TARGET CONVERSATION ---');
  if (convo) {
    console.log(`ID: ${convo._id}`);
    console.log(`Participants: ${convo.participants}`);
    console.log(`Listing: ${convo.listing}`);
    console.log(`Unread Count: ${JSON.stringify(Object.fromEntries(convo.unreadCount || []))}`);
  } else {
    console.log(`Conversation ${targetConvoId} NOT FOUND!`);
  }

  const messages = await Message.find({ conversation: targetConvoId }).sort({ createdAt: 1 });
  console.log('\n--- MESSAGES IN THIS CONVO ---');
  messages.forEach(m => {
    console.log(`[${m.createdAt.toISOString()}] Sender: ${m.sender} | Text: ${m.text}`);
  });

  process.exit();
}

checkMessages().catch(console.error);
