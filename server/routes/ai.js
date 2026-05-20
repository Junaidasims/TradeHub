const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../middleware/auth');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Only image files are allowed'), false);
  },
  limits: { fileSize: 8 * 1024 * 1024 }
});

router.post('/analyze-image', auth, upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ msg: 'No image file provided.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'YOUR_KEY_HERE') {
    return res.status(500).json({ msg: 'Gemini API key is not configured on the server.' });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `You are an expert marketplace seller. Carefully analyze this image of an item.
Return ONLY a valid JSON object (no markdown, no code blocks, no extra text) with these exact fields:
{
  "title": "A concise, catchy product title (max 60 chars)",
  "description": "A compelling 2-3 sentence description highlighting the item's key features and appeal.",
  "category": "One of: Electronics, Books, Lab Equipment, Furniture, Clothing, Appliances",
  "condition": "One of: New, Like New, Good, Fair — based on what you can see",
  "suggestedPrice": a number (integer) representing a reasonable daily rental price in Indian Rupees (₹)
} (Note: ensure 'condition' is exactly one of the four capitalized options)`;

    const imagePart = {
      inlineData: {
        data: req.file.buffer.toString("base64"),
        mimeType: req.file.mimetype
      },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const rawText = result.response.text();

    const cleaned = rawText.replace(/```json|```/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('[AI] Failed to parse Gemini response:', rawText);
      return res.status(500).json({ msg: 'AI returned an unexpected response format. Please try again.' });
    }

    const required = ['title', 'description', 'category', 'condition', 'suggestedPrice'];
    for (const field of required) {
      if (parsed[field] === undefined) {
        return res.status(500).json({ msg: `AI response missing field: ${field}. Please try again.` });
      }
    }

    return res.json(parsed);

  } catch (err) {
    console.error('[AI] Gemini API error:', err.message || err);
    return res.status(500).json({ msg: err.message || 'AI analysis failed. Please try again.' });
  }
});

// POST /api/ai/smart-replies
// Accepts: { context: [{ sender: 'user', text: '...' }, ...] }
router.post('/smart-replies', auth, async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'YOUR_KEY_HERE') {
    return res.status(500).json({ msg: 'Gemini API key is not configured.' });
  }

  try {
    const { context } = req.body;
    if (!context || !Array.isArray(context) || context.length === 0) {
      return res.status(400).json({ msg: 'Context is required to generate replies.' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Format the context into a readable transcript
    const transcript = context.map(msg => `${msg.sender}: ${msg.text}`).join('\n');

    const prompt = `You are a helpful smart reply generator for a marketplace chat application.
Here is the recent chat history between 'Me' and 'Other':
${transcript}

Based on this conversation, generate 3 very short, natural, and polite replies that 'Me' could send next.
Return ONLY a valid JSON array of strings (no markdown, no code blocks).
Example: ["Yes, that works", "No, price is firm", "Can we do ₹500?"]`;

    const result = await model.generateContent(prompt);
    const rawText = result.response.text();
    const cleaned = rawText.replace(/```json|```/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) throw new Error("Not an array");
      // ensure max 3 items, all strings
      parsed = parsed.slice(0, 3).map(String);
    } catch (parseErr) {
      console.error('[AI] Failed to parse smart replies:', rawText);
      return res.status(500).json({ msg: 'AI returned an unexpected format.' });
    }

    return res.json({ replies: parsed });

  } catch (err) {
    console.error('[AI] Smart replies error:', err.message || err);
    return res.status(500).json({ msg: 'Failed to generate replies.' });
  }
});

const Listing = require('../models/Listing');

// ... (existing multer and analyze-image routes)

// POST /api/ai/chat
// The core logic for TradeHub Buddy
router.post('/chat', auth, async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'YOUR_KEY_HERE') {
    return res.status(500).json({ msg: 'Gemini API key is not configured.' });
  }

  try {
    const { message, history } = req.body;
    if (!message) return res.status(400).json({ msg: 'Message is required.' });

    // 1. Fetch current active listings to give the bot "real-time" knowledge
    const activeListings = await Listing.find({ status: 'active' })
      .sort({ createdAt: -1 })
      .limit(30)
      .select('title price rentPrice category type _id');

    // 2. Format listings for the prompt
    const listingContext = activeListings.map(l => 
      `- ${l.title}: Buy ₹${l.price}${l.type.includes('rent') ? `, Rent ₹${l.rentPrice}/day` : ''} [Category: ${l.category}] (ID: ${l._id})`
    ).join('\n');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // 3. Build the system prompt
    const systemPrompt = `You are "TradeHub Buddy", a helpful, friendly, and witty AI assistant for the TradeHub Campus Marketplace.
Your goal is to help students find items, understand prices, and navigate the platform.

CURRENT LISTINGS ON CAMPUS:
${listingContext || "No active listings currently available."}

RULES:
- Be concise and friendly. Use college-student-friendly language.
- If a user asks for an item, check the "CURRENT LISTINGS" above.
- If you find a match, provide the exact title and mention the price.
- IMPORTANT: When mentioning an item, you can use markdown links in this format: [Item Title](/listing/ITEM_ID)
- If you don't find a specific item, suggest the closest category or tell them to check back later.
- If they ask about platform features (renting, trading), explain them briefly.
- Keep responses under 3-4 sentences unless absolutely necessary.

USER CONVERSATION HISTORY:
${(history || []).map(h => `${h.role === 'user' ? 'Student' : 'Buddy'}: ${h.parts[0].text}`).join('\n')}
Student: ${message}
Buddy:`;

    const result = await model.generateContent(systemPrompt);
    const responseText = result.response.text();

    return res.json({ text: responseText });

  } catch (err) {
    console.error('[TradeBot] Error:', err.message || err);
    return res.status(500).json({ msg: 'TradeBot is resting right now. Try again later!' });
  }
});

module.exports = router;

