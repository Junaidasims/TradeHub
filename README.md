# 🛒 TradeHub — Campus Marketplace Platform

A full-stack peer-to-peer marketplace for college students to **buy, sell, rent, and trade** items with AI-powered features, real-time chat, and secure payments.

---

## ✨ Features

- **AI Smart Listing** — Upload a photo, AI auto-fills title, description, price (Google Gemini)
- **Real-Time Messaging** — Socket.io chat with typing indicators + AI smart reply suggestions
- **Secure Payments** — Razorpay integration with signature verification
- **Location-Based** — GPS capture with geospatial proximity search
- **TradeBot AI** — Chatbot to help find items on campus
- **Transactions Page** — Track all payments sent and received

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14 (App Router), React, TailwindCSS |
| **Backend** | Node.js, Express.js, Socket.io |
| **Database** | MongoDB (Mongoose) |
| **Payments** | Razorpay |
| **AI** | Google Gemini 2.5 Flash |
| **Auth** | JWT (httpOnly cookies + localStorage) |

---

## 📂 Project Structure

```
Tradehub/
├── apps/web/               # Next.js frontend (Port 3000)
│   ├── app/               # Pages (App Router)
│   ├── components/        # Reusable components
│   ├── context/           # Auth & Theme context
│   └── lib/               # API client, Socket, Razorpay hook
│
└── server/                # Express backend (Port 5000)
    ├── models/            # Mongoose schemas
    ├── routes/            # API endpoints
    ├── middleware/        # JWT auth
    └── uploads/           # User-uploaded images
```

---

## 🚀 Local Development

### Prerequisites
- Node.js 18+ 
- MongoDB Atlas account
- Razorpay account (Test Mode)
- Google Gemini API key

### 1️⃣ Backend Setup

```bash
cd server
npm install
```

Create `server/.env`:
```env
PORT=5000
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_jwt_secret_key
GEMINI_API_KEY=your_gemini_api_key
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=xxxxx
CLIENT_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000
```

```bash
npm run dev
```

### 2️⃣ Frontend Setup

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

## 📤 Deployment Guide

### **MongoDB Atlas**
1. Go to [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas)
2. Create cluster → Get connection string
3. Whitelist all IPs: `0.0.0.0/0`

### **Backend (Render)**
1. Go to [render.com](https://render.com) → New Web Service
2. Connect GitHub repo
3. **Settings:**
   - Root Directory: `server`
   - Build Command: `npm install`
   - Start Command: `npm start`
4. **Environment Variables** (copy from `server/.env.example`):
   ```
   MONGO_URI=mongodb+srv://...
   JWT_SECRET=...
   GEMINI_API_KEY=...
   RAZORPAY_KEY_ID=...
   RAZORPAY_KEY_SECRET=...
   FRONTEND_URL=https://your-app.vercel.app
   BACKEND_URL=https://your-service.onrender.com
   ```
5. Deploy → Copy the Render URL

### **Frontend (Vercel)**
1. Go to [vercel.com](https://vercel.com) → New Project
2. Connect GitHub repo
3. **Settings:**
   - Root Directory: `apps/web`
   - Framework: Next.js
4. **Environment Variable:**
   ```
   NEXT_PUBLIC_API_URL=https://your-service.onrender.com/api
   ```
5. Deploy → Copy the Vercel URL
6. Go back to Render → Update `FRONTEND_URL` to your Vercel URL

---

## 🔑 Getting API Keys

**Google Gemini:**
- Go to [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
- Generate API Key (free tier: 15 requests/min)

**Razorpay:**
- Go to [dashboard.razorpay.com](https://dashboard.razorpay.com)
- Switch to **Test Mode**
- Settings → API Keys → Generate Test Key
- For production: Complete KYC and switch to Live Mode

---

## 🧪 Testing Payments

In Test Mode, use these credentials:

| Method | Details |
|---|---|
| **Card** | `4718 6000 0000 0002` · Expiry: `12/26` · CVV: `123` · OTP: `1234` |
| **Net Banking** | Select any bank → Click "Success" |

---

## 📋 Git Commands

```bash
cd "c:\Users\JUNAID ASIM\Desktop\Tradehub\Tradehub"

# Check status
git status

# Add all changes
git add .

# Commit
git commit -m "Add payment integration and AI features"

# Push to your GitHub
git push origin main
```

If you haven't initialized git yet:
```bash
git init
git add .
git commit -m "Initial commit - TradeHub marketplace"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/tradehub.git
git push -u origin main
```

---

## 🎯 Core Features Explained

### 1. **AI Smart Listing**
Upload an item photo → AI analyzes it → Auto-fills title, description, category, condition, and price

### 2. **Real-Time Chat**
Socket.io powers instant messaging with typing indicators. AI suggests 3 smart replies based on conversation context.

### 3. **Payments (Razorpay)**
Buyer pays → Backend verifies signature → Listing marked sold → Seller gets notification → Both see transaction history

### 4. **Location Search**
GPS capture with manual fallback → Geospatial queries show "X km away" → Listings sorted by proximity

### 5. **TradeBot**
AI chatbot that searches active listings and helps users find items with clickable links

---

## 📊 Database Models

- **User** — name, email, password (bcrypt), college, rating
- **Listing** — title, price, images, location (GeoJSON), status, seller ref
- **Conversation** — participants, lastMessage, unreadCount (Map)
- **Message** — sender, text, conversation ref, itemContext
- **Payment** — buyer, seller, razorpayOrderId, amount, status
- **Rental** — listing, renter, owner, dates, status
- **Notification** — recipient, type, message, link

---

## 🛡️ Security Features

- Passwords hashed with bcrypt (10 rounds)
- JWT tokens with httpOnly cookies
- CORS restricted to Vercel/local origins
- Razorpay signature verification (HMAC-SHA256)
- Rate limiting on auth routes (30 req/15min)
- Input validation on all routes

---

## 📝 Environment Variables Reference

### Backend (`server/.env`)
```env
PORT=5000
NODE_ENV=production
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/tradehub
JWT_SECRET=your_secret_key
BCRYPT_SALT_ROUNDS=10
FRONTEND_URL=https://tradehub.vercel.app
BACKEND_URL=https://tradehub-api.onrender.com
GEMINI_API_KEY=your_gemini_key
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=xxxxx
```

### Frontend (`apps/web/.env.local`)
```env
NEXT_PUBLIC_API_URL=https://tradehub-api.onrender.com/api
```

---

## 🐛 Troubleshooting

**"AI analysis failed"**
- Check `GEMINI_API_KEY` in server `.env`
- Verify key starts with `AIza` (not `AQ.`)
- Check quota at [aistudio.google.com](https://aistudio.google.com)

**"Payment not working"**
- Ensure `RAZORPAY_KEY_ID` starts with `rzp_test_`
- Use test card: `4718 6000 0000 0002`
- Enable international cards in Razorpay dashboard if using `4111 1111 1111 1111`

**"Socket.io not connecting"**
- Check `NEXT_PUBLIC_API_URL` in frontend `.env.local`
- Ensure backend CORS allows frontend URL
- Verify JWT token in localStorage

**"Images not loading after deployment"**
- Set `BACKEND_URL` in Render environment variables
- Check `next.config.mjs` has correct `remotePatterns`

---

## 📚 API Endpoints

**Auth:** `POST /api/auth/register`, `/login`, `GET /me`  
**Listings:** `GET /api/listings`, `POST /`, `GET /:id`, `PATCH /:id`  
**Payments:** `POST /api/payments/create-order`, `/verify`, `GET /my`  
**AI:** `POST /api/ai/analyze-image`, `/chat`, `/smart-replies`  
**Messages:** `GET /api/conversations`, `POST /api/messages`  
**Upload:** `POST /api/upload`, `/upload/multiple`  

---

## 👥 Team / Author

**Your Name** — Full Stack Developer  
GitHub: [@YOUR_USERNAME](https://github.com/YOUR_USERNAME)

---

## 📄 License

MIT License - Feel free to use this project for learning or your own campus marketplace.

---

## 🙏 Acknowledgments

- Google Gemini for AI features
- Razorpay for payment infrastructure
- MongoDB Atlas for database hosting
- Vercel & Render for deployment

---

**Built with ❤️ for campus communities**
