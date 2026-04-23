const mongoose = require('mongoose');
require('dotenv').config();

async function repair() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // We need the models
  const Conversation = mongoose.model('Conversation', new mongoose.Schema({
    participants: [mongoose.Schema.Types.ObjectId]
  }));
  const Message = mongoose.model('Message', new mongoose.Schema({
    conversation: mongoose.Schema.Types.ObjectId,
    sender: mongoose.Schema.Types.ObjectId
  }));

  const conversations = await Conversation.find();
  console.log(`Found ${conversations.length} conversations to check.`);

  for (const convo of conversations) {
    // Find all unique senders for this conversation
    const messages = await Message.find({ conversation: convo._id });
    const senders = [...new Set(messages.map(m => m.sender.toString()))];
    
    let modified = false;
    const currentParticipants = convo.participants.map(p => p.toString());

    for (const senderId of senders) {
      if (!currentParticipants.includes(senderId)) {
        console.log(`Adding missing participant ${senderId} to conversation ${convo._id}`);
        convo.participants.push(new mongoose.Types.ObjectId(senderId));
        modified = true;
      }
    }

    if (modified) {
      await convo.save();
      console.log(`Saved conversation ${convo._id}`);
    }
  }

  console.log('Repair complete!');
  process.exit();
}

repair().catch(console.error);
