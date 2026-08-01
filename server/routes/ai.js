const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../middleware/auth');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Listing = require('../models/Listing');

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Only image files are allowed'), false);
  },
  limits: { fileSize: 8 * 1024 * 1024 }
});

// Model preference order — tries each until one works
const MODEL_PREFERENCE = ['gemini-2.5-flash', 'gemini-2.0-flash-lite', 'gemini-2.0-flash'];

// Helper: friendly error for key issues
const isKeyError = (msg) =>
  msg && (msg.includes('403') || msg.includes('API_KEY') || msg.includes('leaked') || msg.includes('Forbidden') || msg.includes('invalid') || msg.includes('expired'));

// Helper: quota/rate limit error
const isQuotaError = (msg) =>
  msg && (msg.includes('429') || msg.includes('quota') || msg.includes('Too Many Requests') || msg.includes('RESOURCE_EXHAUSTED'));

// Helper: get a working Gemini model instance
const getModel = (apiKey, modelName = MODEL_PREFERENCE[0]) => {
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: modelName });
};

// Helper: try generateContent with model fallback
const generateWithFallback = async (apiKey, generateFn) => {
  let lastErr;
  for (const modelName of MODEL_PREFERENCE) {
    try {
      const model = getModel(apiKey, modelName);
      return await generateFn(model);
    } catch (err) {
      lastErr = err;
      // Don't fall back on auth errors — they'll fail on all models
      if (isKeyError(err.message)) throw err;
      // Log and try next model on quota, 404, or other transient errors
      console.warn(`[AI] Model ${modelName} failed (${err.message?.substring(0, 80)}). Trying next...`);
    }
  }
  throw lastErr;
};

// POST /api/ai/analyze-image
router.post('/analyze-image', auth, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ msg: 'No image file provided.' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'YOUR_KEY_HERE' || apiKey === 'YOUR_NEW_KEY_HERE') {
    return res.status(503).json({ msg: 'AI is not configured. Add a valid GEMINI_API_KEY to server/.env and restart the server.' });
  }

  const prompt = `You are an expert marketplace seller. Carefully analyze this image of an item.
Return ONLY a valid JSON object (no markdown, no code blocks, no extra text) with these exact fields:
{
  "title": "A concise, catchy product title (max 60 chars)",
  "description": "A compelling 2-3 sentence description highlighting the item key features and appeal.",
  "category": "One of: Electronics, Books, Lab Equipment, Furniture, Clothing, Appliances",
  "condition": "One of: New, Like New, Good, Fair based on what you can see",
  "suggestedPrice": a number (integer) representing a reasonable price in Indian Rupees
}`;

  const imagePart = {
    inlineData: {
      data: req.file.buffer.toString('base64'),
      mimeType: req.file.mimetype
    }
  };

  try {
    const rawText = await generateWithFallback(apiKey, async (model) => {
      const result = await model.generateContent([prompt, imagePart]);
      return result.response.text();
    });

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
      return res.status(503).json({ msg: 'AI unavailable: The Gemini API key is invalid, expired, or leaked. Please generate a new key at https://aistudio.google.com/app/apikey and update GEMINI_API_KEY in server/.env, then restart.' });
    }
    if (isQuotaError(err.message)) {
      return res.status(429).json({ msg: 'AI quota exceeded for today. Free tier limit reached — try again tomorrow or upgrade your Gemini plan.' });
    }
    return res.status(500).json({ msg: 'AI analysis failed. Please try again.' });
  }
});

// POST /api/ai/smart-replies
router.post('/smart-replies', auth, async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'YOUR_KEY_HERE' || apiKey === 'YOUR_NEW_KEY_HERE') {
    return res.status(503).json({ msg: 'AI is not configured. Add a valid GEMINI_API_KEY to server/.env.' });
  }

  try {
    const { context } = req.body;
    if (!context || !Array.isArray(context) || context.length === 0) {
      return res.status(400).json({ msg: 'Context is required to generate replies.' });
    }

    const transcript = context.map(msg => `${msg.sender}: ${msg.text}`).join('\n');

    const prompt = `You are a helpful smart reply generator for a marketplace chat application.
Here is the recent chat history between 'Me' and 'Other':
${transcript}

Based on this conversation, generate 3 very short, natural, and polite replies that 'Me' could send next.
Return ONLY a valid JSON array of strings (no markdown, no code blocks).
Example: ["Yes, that works", "No, price is firm", "Can we do Rs.500?"]`;

    const rawText = await generateWithFallback(apiKey, async (model) => {
      const result = await model.generateContent(prompt);
      return result.response.text();
    });

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
      return res.status(503).json({ msg: 'Smart replies unavailable: Invalid or expired API key.' });
    }
    if (isQuotaError(err.message)) {
      return res.status(429).json({ msg: 'AI quota exceeded. Try again tomorrow.' });
    }
    return res.status(500).json({ msg: 'Failed to generate replies. Please try again.' });
  }
});

// POST /api/ai/chat — TradeHub Buddy
router.post('/chat', auth, async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'YOUR_KEY_HERE' || apiKey === 'YOUR_NEW_KEY_HERE') {
    return res.status(503).json({ msg: 'TradeBot is offline: AI is not configured. Add a valid GEMINI_API_KEY to server/.env.' });
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
- Keep responses under 3-4 sentences unless absolutely necessary.

USER CONVERSATION HISTORY:
${(history || []).map(h => {
  try {
    return `${h.role === 'user' ? 'Student' : 'Buddy'}: ${h.parts?.[0]?.text || ''}`;
  } catch (e) {
    return '';
  }
}).filter(Boolean).join('\n')}
Student: ${message}
Buddy:`;

    const responseText = await generateWithFallback(apiKey, async (model) => {
      const result = await model.generateContent(systemPrompt);
      return result.response.text();
    });

    return res.json({ text: responseText });
  } catch (err) {
    console.error('[TradeBot] Error:', err.message || err);
    if (isKeyError(err.message)) {
      return res.status(503).json({ msg: 'TradeBot is offline: API key is invalid, expired, or leaked. Please update GEMINI_API_KEY in server/.env and restart.' });
    }
    if (isQuotaError(err.message)) {
      return res.status(429).json({ msg: 'TradeBot hit its daily limit. Free tier quota reached — try again tomorrow!' });
    }
    return res.status(500).json({ msg: 'TradeBot is resting right now. Try again later!' });
  }
});

module.exports = router;
