const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../middleware/auth');
const Groq = require('groq-sdk');
const Listing = require('../models/Listing');

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Only image files are allowed'), false);
  },
  limits: { fileSize: 8 * 1024 * 1024 }
});

// Get Groq client
const getGroq = () => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not set');
  return new Groq({ apiKey });
};

// Helper: check for quota/rate limit errors
const isQuotaError = (msg) =>
  msg && (msg.includes('429') || msg.includes('quota') || msg.includes('rate_limit') || msg.includes('Too Many Requests'));

// Helper: check for auth errors
const isKeyError = (msg) =>
  msg && (msg.includes('401') || msg.includes('403') || msg.includes('invalid_api_key') || msg.includes('Authentication'));

// POST /api/ai/analyze-image
router.post('/analyze-image', auth, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ msg: 'No image file provided.' });

  if (!process.env.GROQ_API_KEY) {
    return res.status(503).json({ msg: 'AI is not configured. Add a valid GROQ_API_KEY to server/.env and restart the server.' });
  }

  // Groq's vision model supports base64 images
  const base64Image = req.file.buffer.toString('base64');
  const dataUrl = `data:${req.file.mimetype};base64,${base64Image}`;

  const prompt = `You are an expert marketplace seller. Carefully analyze this image of an item.
Return ONLY a valid JSON object (no markdown, no code blocks, no extra text) with these exact fields:
{
  "title": "A concise, catchy product title (max 60 chars)",
  "description": "A compelling 2-3 sentence description highlighting the item key features and appeal.",
  "category": "One of: Electronics, Books, Lab Equipment, Furniture, Clothing, Appliances",
  "condition": "One of: New, Like New, Good, Fair based on what you can see",
  "suggestedPrice": a number (integer) representing a reasonable price in Indian Rupees
}`;

  try {
    const groq = getGroq();
    const completion = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: dataUrl } }
          ]
        }
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    const rawText = completion.choices[0]?.message?.content || '';
    const cleaned = rawText.replace(/```json|```/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error('[AI] Parse error:', rawText);
      return res.status(500).json({ msg: 'AI returned unexpected format. Please try again.' });
    }

    const required = ['title', 'description', 'category', 'condition', 'suggestedPrice'];
    for (const field of required) {
      if (parsed[field] === undefined) {
        return res.status(500).json({ msg: `AI response missing field: ${field}. Please try again.` });
      }
    }

    return res.json(parsed);
  } catch (err) {
    console.error('[AI] analyze-image error:', err.message || err);
    if (isKeyError(err.message)) {
      return res.status(503).json({ msg: 'AI unavailable: The API key is invalid. Please check GROQ_API_KEY in your environment.' });
    }
    if (isQuotaError(err.message)) {
      return res.status(429).json({ msg: 'AI quota exceeded. Free tier limit reached — try again in a minute.' });
    }
    return res.status(500).json({ msg: 'AI analysis failed. Please try again.' });
  }
});

// POST /api/ai/smart-replies
router.post('/smart-replies', auth, async (req, res) => {
  if (!process.env.GROQ_API_KEY) {
    return res.status(503).json({ msg: 'AI is not configured. Add a valid GROQ_API_KEY to server/.env.' });
  }

  try {
    const { context } = req.body;
    if (!context || !Array.isArray(context) || context.length === 0) {
      return res.status(400).json({ msg: 'Context is required to generate replies.' });
    }

    const transcript = context.map(msg => `${msg.sender}: ${msg.text}`).join('\n');

    const groq = getGroq();
    const completion = await groq.chat.completions.create({
      model: 'qwen/qwen3.8-27b',
      messages: [
        {
          role: 'system',
          content: 'You are a smart reply generator for a marketplace chat. Generate exactly 3 short, natural replies. Return ONLY a valid JSON array of strings, no markdown, no explanation, no thinking. Example: ["Yes, that works", "No, price is firm", "Can we do Rs.500?"]'
        },
        {
          role: 'user',
          content: `Chat history:\n${transcript}\n\nGenerate 3 short replies for "Me":`
        }
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    const rawText = completion.choices[0]?.message?.content || '';
    const cleaned = rawText.replace(/```json|```/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) throw new Error('Not an array');
      parsed = parsed.slice(0, 3).map(String);
    } catch (e) {
      console.error('[AI] Smart replies parse error:', rawText);
      return res.status(500).json({ msg: 'AI returned unexpected format.' });
    }

    return res.json({ replies: parsed });
  } catch (err) {
    console.error('[AI] smart-replies error:', err.message || err);
    if (isKeyError(err.message)) {
      return res.status(503).json({ msg: 'Smart replies unavailable: Invalid API key.' });
    }
    if (isQuotaError(err.message)) {
      return res.status(429).json({ msg: 'AI quota exceeded. Try again in a moment.' });
    }
    return res.status(500).json({ msg: 'Failed to generate replies. Please try again.' });
  }
});

// POST /api/ai/chat — TradeHub Buddy
router.post('/chat', auth, async (req, res) => {
  if (!process.env.GROQ_API_KEY) {
    return res.status(503).json({ msg: 'TradeBot is offline: AI is not configured. Add a valid GROQ_API_KEY to server/.env.' });
  }

  try {
    const { message, history } = req.body;
    if (!message) return res.status(400).json({ msg: 'Message is required.' });

    const activeListings = await Listing.find({ status: 'active' })
      .sort({ createdAt: -1 })
      .limit(30)
      .select('title price rentPrice category type _id');

    const listingContext = activeListings.map(l =>
      `- ${l.title}: Buy Rs.${l.price}${l.type.includes('rent') ? `, Rent Rs.${l.rentPrice}/day` : ''} [Category: ${l.category}] (ID: ${l._id})`
    ).join('\n');

    const systemPrompt = `You are "TradeHub Buddy", a helpful, friendly, and witty AI assistant for the TradeHub Campus Marketplace.
Your goal is to help students find items, understand prices, and navigate the platform.

CURRENT LISTINGS ON CAMPUS:
${listingContext || 'No active listings currently available.'}

RULES:
- Be concise and friendly. Use college-student-friendly language.
- If a user asks for an item, check the "CURRENT LISTINGS" above.
- If you find a match, provide the exact title and mention the price.
- IMPORTANT: When mentioning an item, format it as: [Item Title](/listing/ITEM_ID)
- If you don't find a specific item, suggest the closest category or tell them to check back later.
- If they ask about platform features (renting, trading), explain them briefly.
- Keep responses under 3-4 sentences unless absolutely necessary.`;

    // Build conversation history for Groq
    const messages = [{ role: 'system', content: systemPrompt }];

    // Add previous turns from history
    if (history && Array.isArray(history)) {
      for (const h of history.slice(-6)) {
        try {
          const role = h.role === 'user' ? 'user' : 'assistant';
          const text = h.parts?.[0]?.text || '';
          if (text) messages.push({ role, content: text });
        } catch (e) { /* skip malformed history entries */ }
      }
    }

    // Add current user message
    messages.push({ role: 'user', content: message });

    const groq = getGroq();
    const completion = await groq.chat.completions.create({
      model: 'qwen/qwen3.8-27b',
      messages,
      temperature: 0.7,
      max_tokens: 500,
    });

    const responseText = completion.choices[0]?.message?.content || "Sorry, I couldn't generate a response. Try again!";
    return res.json({ text: responseText });
  } catch (err) {
    console.error('[TradeBot] Error:', err.message || err);
    if (isKeyError(err.message)) {
      return res.status(503).json({ msg: 'TradeBot is offline: API key is invalid. Please check GROQ_API_KEY in your environment.' });
    }
    if (isQuotaError(err.message)) {
      return res.status(429).json({ msg: 'TradeBot hit its rate limit. Try again in a moment!' });
    }
    return res.status(500).json({ msg: 'TradeBot is resting right now. Try again later!' });
  }
});

module.exports = router;
