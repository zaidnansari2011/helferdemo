# Vercel Deployment Guide

## ✅ Good News!
Your entire application (frontend + backend) can now be deployed to **Vercel only** - no need for separate backend hosting!

## 🎯 What Changed

1. **Backend Integrated into Next.js API Routes**
   - tRPC router now accessible via `/api/trpc/*`
   - Better Auth already integrated via `/api/auth/*`
   - All backend logic runs as Vercel serverless functions

2. **Demo Mode OTP**
   - When `DEMO_MODE=true`, OTP **123456** always works
   - No SMS charges during demos
   - Switch back by setting `DEMO_MODE=false`

3. **Single Deployment**
   - Push to Vercel → Everything works
   - No separate backend server needed
   - Auto-scaling included

## 📦 Deployment Steps

### 1. Install Vercel CLI (optional)
```bash
npm i -g vercel
```

### 2. Push to GitHub
```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push
```

### 3. Deploy to Vercel

**Option A: Using Vercel Dashboard**
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repo
4. Select `web-app` as root directory
5. Add environment variables (see below)
6. Click "Deploy"

**Option B: Using Vercel CLI**
```bash
cd web-app
vercel
```

### 4. Environment Variables

Add these in Vercel Dashboard → Project Settings → Environment Variables:

```env
# Database
DATABASE_URL=file:./dev.db

# Better Auth
BETTER_AUTH_SECRET=your-super-secret-key-at-least-32-chars

# Demo Mode (set to true for demos)
DEMO_MODE=true

# SMS (MSG91) - Optional, not needed in demo mode
MSG91_API_KEY=your-msg91-key
MSG91_TEMPLATE_ID=your-template-id

# Google Maps (for address autocomplete)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-key
```

### 5. Database Setup

Since you're using SQLite, you have two options:

**Option A: Migrate to PostgreSQL (Recommended for Production)**
```bash
# Use Vercel Postgres
# Vercel will provide DATABASE_URL automatically
```

**Option B: Use Turso (SQLite for Edge)**
```bash
# Visit: https://turso.tech
# Create database and get connection URL
```

## 🎮 Demo Mode Features

When `DEMO_MODE=true`:

- ✅ OTP **123456** always works (no SMS sent)
- ✅ Seller applications auto-approved
- ✅ No real payment processing
- ✅ Perfect for client demos

To disable demo mode:
```env
DEMO_MODE=false
```

## 🧪 Testing Locally

Development (with separate backend):
```bash
# Terminal 1 - Backend
cd backend
bun start

# Terminal 2 - Web App
cd web-app
bun dev
```

Production simulation (all-in-one):
```bash
cd web-app
bun build
bun start
```

## ✅ Deployment Checklist

- [ ] Push code to GitHub
- [ ] Create Vercel project
- [ ] Set root directory to `web-app`
- [ ] Add environment variables
- [ ] Set `DEMO_MODE=true` for demos
- [ ] Deploy!
- [ ] Test with phone: Login with any number + OTP **123456**

## 🔥 Production Checklist

Before going live with real users:

- [ ] Migrate to PostgreSQL/Turso
- [ ] Set `DEMO_MODE=false`
- [ ] Add real MSG91 credentials
- [ ] Add Google Maps API key
- [ ] Test SMS OTP with real numbers
- [ ] Set up custom domain

## 📝 Notes

1. **Database**: SQLite works but has limitations on Vercel (read-only file system). Migrate to PostgreSQL or Turso for production.

2. **File Uploads**: If you have image uploads, configure S3 or Vercel Blob storage.

3. **Prisma**: Your schema and migrations are in the `backend` folder. Keep them there and reference from web-app.

4. **Environment**: Vercel automatically sets `NODE_ENV=production` on deployment.

## 🎯 Quick Demo Deploy

```bash
cd web-app
vercel --prod
```

Add environment variables in Vercel dashboard, then:
- Visit your deployment URL
- Login with any phone number
- Use OTP: **123456**
- Seller dashboard unlocked!

---

**Questions?** The backend is now part of your Next.js app via API routes. Everything runs on Vercel. No separate hosting needed! 🚀
