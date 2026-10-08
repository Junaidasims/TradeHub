# TradeHub — Campus Marketplace Platform

A full-stack peer-to-peer marketplace for college students to buy, sell, rent, and trade items — with AI-powered features, real-time chat, and secure payments.

---

## Features

- **AI Description Writer** — Fill in a title and category, AI writes the listing description for you
- **AI Smart Replies** — After receiving a message, AI suggests 3 quick replies based on the conversation
- **AI Negotiation Coach** — While chatting, get a one-tap negotiation tip as a buyer
- **TradeBot** — Chatbot that searches active listings and helps students find items
- **Real-Time Messaging** — Socket.io chat with typing indicators
- **Secure Payments** — Razorpay integration (UPI, Cards, Net Banking)
- **Location-Based Search** — GPS capture with proximity display ("2 km away")
- **Rental System** — Rent items for a period with payment and approval flow
- **Wishlist & Trade Requests** — Request items or propose exchanges

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), React, TailwindCSS |
| Backend | Node.js, Express.js, Socket.io |
| Database | MongoDB (Mongoose) |
| Payments | Razorpay |
| AI | Groq API (qwen/qwen3.8-27b) |
| Auth | JWT (httpOnly cookies + localStorage) |
| Deployment | Vercel (frontend) + Render (backend) |

---

## Project Structure

```
Tradehub/
├── apps/web/               # Next.js frontend (Port 3000)
│   ├── app/               # Pages (App Router)
│   ├── components/        # Reusable components (Navbar, TradeBot, etc.)
│   ├── context/           # Auth & Theme context
│   └── lib/               # API client, Socket, Razorpay hook
│
└── server/                # Express backend (Port 5000)
    ├── models/            # Mongoose schemas
    ├── routes/            # API endpoints
    └── middleware/        # JWT auth
```

---

## Local Development

### Prerequisites
- Node.js 18+
- MongoDB Atlas account
- Razorpay account (Test Mode)
- Groq API key (free at [console.groq.com](https://console.groq.com))

### Backend

```bash
cd server
npm install
```

Create `server/.env`:
```env
PORT=5000
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_jwt_secret_key
GROQ_API_KEY=gsk_your_groq_key
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=xxxxx
CLIENT_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000
```

```bash
npm run dev
```

### Frontend

```bash
cd apps/web
npm install
```

Create `apps/web/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deployment

### MongoDB Atlas
1. Go to [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas)
2. Create cluster → get connection string
3. Network Access → Add `0.0.0.0/0`

### Backend — Render
1. New Web Service → connect GitHub repo
2. Root Directory: `server` | Build: `npm install` | Start: `npm start`
3. Environment Variables:
```
MONGO_URI=mongodb+srv://...
JWT_SECRET=...
GROQ_API_KEY=gsk_...
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
FRONTEND_URL=https://your-app.vercel.app
BACKEND_URL=https://your-service.onrender.com
```

### Frontend — Vercel
1. New Project → connect GitHub repo
2. Root Directory: `apps/web` | Framework: Next.js
3. Environment Variable:
```
NEXT_PUBLIC_API_URL=https://your-service.onrender.com/api
```

---

## API Keys

**Groq (free, no credit card):**
- Sign up at [console.groq.com](https://console.groq.com)
- Create API Keys → copy the key (starts with `gsk_`)

**Razorpay:**
- Go to [dashboard.razorpay.com](https://dashboard.razorpay.com) → Test Mode
- Settings → API Keys → Generate Test Key

---

## Testing Payments

| Method | Details |
|---|---|
| Card | `4718 6000 0000 0002` · Expiry: `12/26` · CVV: `123` · OTP: `1234` |
| Net Banking | Select any bank → Click "Success" |

---

## Testing AI Features

**AI Description Writer** (`/create` or `/create-listing`)
1. Fill in the title (e.g. "HP Laptop i5") and select a category
2. Click "Generate Details with AI"
3. Description auto-fills in the textarea

**AI Smart Replies** (Messages page)
1. Open any conversation where the other person sent the last message
2. 3 reply suggestions appear above the input box automatically
3. Click one to fill it into the input

**AI Negotiation Coach** (Messages page)
1. Open any conversation with some messages
2. Click the "Negotiate" button in the chat header
3. An orange tip banner appears with one actionable advice

**TradeBot** (floating button, bottom-right, logged in users only)
1. Click the bot icon → type "Do you have any laptops?"
2. Bot searches active listings and responds with links

---

## API Endpoints

```
Auth        POST /api/auth/register, /login  |  GET /api/auth/me
Listings    GET/POST /api/listings  |  GET/PATCH/DELETE /api/listings/:id
AI          POST /api/ai/chat, /smart-replies, /write-description, /negotiate-tip
Payments    POST /api/payments/create-order, /verify  |  GET /api/payments/my
Messages    GET /api/conversations  |  POST /api/messages
Upload      POST /api/upload
```

---

## Database Models

- **User** — name, email, password (bcrypt), college, rating
- **Listing** — title, price, images, location (GeoJSON), status, type, seller
- **Conversation** — participants, lastMessage, unreadCount
- **Message** — sender, text, conversation, itemContext
- **Payment** — buyer, seller, razorpayOrderId, amount, status
- **Rental** — listing, renter, owner, dates, totalCost, status
- **Notification** — recipient, type, message, link

---

## Security

- Passwords hashed with bcrypt (10 rounds)
- JWT tokens verified on every protected route
- CORS restricted to known frontend origins
- Razorpay signature verification (HMAC-SHA256)
- Rate limiting on auth routes (30 req / 15 min)

---

## Troubleshooting

**AI not working** — Check `GROQ_API_KEY` in Render environment variables. Key must start with `gsk_`.

**Payment failing** — Use test card `4718 6000 0000 0002`. Ensure `RAZORPAY_KEY_ID` starts with `rzp_test_`.

**Socket.io not connecting** — Verify `NEXT_PUBLIC_API_URL` in Vercel environment variables points to your Render URL.

**MongoDB not connecting locally** — Your ISP may block SRV DNS lookups. Use a mobile hotspot or change DNS to `8.8.8.8`. The live deployment on Render is unaffected.

---

## License

MIT — free to use for learning or building your own campus marketplace.
