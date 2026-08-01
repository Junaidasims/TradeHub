# TradeHub — Campus Marketplace

A peer-to-peer marketplace for college students to buy, sell, rent, and trade items — with AI-powered listing creation, real-time chat, and integrated payments.

## Tech Stack

- **Frontend:** Next.js 14, TailwindCSS
- **Backend:** Node.js, Express, Socket.io
- **Database:** MongoDB Atlas
- **Payments:** Razorpay
- **AI:** Google Gemini 2.5 Flash

## Local Development

**Backend:**
```bash
cd server
npm install
# Create .env from .env.example and fill in values
npm run dev
```

**Frontend:**
```bash
cd apps/web
npm install
# Create .env.local: NEXT_PUBLIC_API_URL=http://localhost:5000/api
npm run dev
```

## Deployment

- **Backend** → Render (Web Service, root dir: `server`)
- **Frontend** → Vercel (root dir: `apps/web`)
- **Database** → MongoDB Atlas

Set environment variables as listed in `server/.env.example` and `apps/web/.env.example`.
