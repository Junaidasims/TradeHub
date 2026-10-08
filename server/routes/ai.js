const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Groq = require('groq-sdk');
const Listing = require('../models/Listing');

const groq = () => new Groq({ apiKey: process.env.GROQ_API_KEY });

const isQuotaError = (msg) => msg && (msg.includes('429') || msg.includes('quota') || msg.includes('rate_limit'));

router.post('/smart-replies', auth, async (req, res) => {
  if (!process.env.GROQ_API_KEY) return res.status(503).json({ msg: 'AI not configured.' });

  const { context } = req.body;
  if (!context || !Array.isArray(context) || context.length === 0) {
    return res.status(400).json({ msg: 'Chat context is required.' });
  }

  const transcript = context.map(m => `${m.sender}: ${m.text}`).join('\n');

  try {
    const completion = await groq().chat.completions.create({
      model: 'qwen/qwen3.8-27b',
      messages: [
        {
          role: 'system',
          content: 'Generate exactly 3 short natural marketplace chat replies. Return ONLY a JSON array of strings, no markdown, no thinking tags. Example: ["Sure!", "What\'s the condition?", "Can you do Rs.400?"]'
        },
        { role: 'user', content: `Chat:\n${transcript}\n\nGenerate 3 replies for "Me":` }
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    const raw = completion.choices[0]?.message?.content || '';
    const cleaned = raw.replace(/```json|```/g, '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) throw new Error();
      parsed = parsed.slice(0, 3).map(String);
    } catch {
      return res.status(500).json({ msg: 'AI returned unexpected format.' });
    }

    return res.json({ replies: parsed });
  } catch (err) {
    console.error('[AI] smart-replies:', err.message);
    if (isQuotaError(err.message)) return res.status(429).json({ msg: 'AI rate limited. Try again shortly.' });
    return res.status(500).json({ msg: 'Failed to generate replies.' });
  }
});

router.post('/chat', auth, async (req, res) => {
  if (!process.env.GROQ_API_KEY) return res.status(503).json({ msg: 'TradeBot is offline.' });

  const { message, history } = req.body;
  if (!message) return res.status(400).json({ msg: 'Message is required.' });

  try {
    const listings = await Listing.find({ status: 'active' })
      .sort({ createdAt: -1 })
      .limit(30)
      .select('title price rentPrice category type _id');

    const listingContext = listings.length
      ? listings.map(l =>
          `- ${l.title}: Rs.${l.price}${l.type.includes('rent') ? ` (Rent Rs.${l.rentPrice}/day)` : ''} [${l.category}] ID:${l._id}`
        ).join('\n')
      : 'No active listings right now.';

    const systemPrompt = `You are "TradeHub Buddy", a friendly AI assistant for the TradeHub Campus Marketplace.
Help students find items, understand prices, and use the platform.

ACTIVE LISTINGS:
${listingContext}

Guidelines:
- Keep replies short and friendly (2-3 sentences max).
- When mentioning an item, link it as: [Item Title](/listing/ID)
- If an item isn't listed, suggest the nearest category.
- For platform questions about renting, trading or selling, explain briefly.`;

    const messages = [{ role: 'system', content: systemPrompt }];

    if (Array.isArray(history)) {
      for (const h of history.slice(-6)) {
        const text = h.parts?.[0]?.text;
        if (text) messages.push({ role: h.role === 'user' ? 'user' : 'assistant', content: text });
      }
    }

    messages.push({ role: 'user', content: message });

    const completion = await groq().chat.completions.create({
      model: 'qwen/qwen3.8-27b',
      messages,
      temperature: 0.7,
      max_tokens: 400,
    });

    const text = completion.choices[0]?.message?.content || "Sorry, I couldn't respond. Try again!";
    return res.json({ text });
  } catch (err) {
    console.error('[TradeBot]:', err.message);
    if (isQuotaError(err.message)) return res.status(429).json({ msg: 'TradeBot is rate limited. Try again in a moment!' });
    return res.status(500).json({ msg: 'TradeBot ran into an issue. Try again!' });
  }
});

module.exports = router;
