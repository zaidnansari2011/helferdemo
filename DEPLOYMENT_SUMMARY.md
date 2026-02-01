# ✅ Vercel Deployment Ready!

## What I Did

### 1. ✅ Integrated Backend into Next.js
- Created `/api/trpc/[trpc]/route.ts` - tRPC now runs as Vercel serverless functions
- Updated `trpc-provider.tsx` - automatically uses `/api/trpc` in production
- Updated `config.ts` - uses same-origin URLs for production (no separate backend needed)
- Added backend dependencies to `web-app/package.json`

### 2. ✅ Added Demo Mode OTP (123456)
- Modified `backend/server/auth.ts`:
  - When `DEMO_MODE=true`, OTP **123456** always works
  - No SMS sent, no MSG91 charges
  - Perfect for client demos
  - Switch back to real OTP by setting `DEMO_MODE=false`

### 3. ✅ Prepared for Vercel Deployment
- Created `VERCEL_DEPLOYMENT.md` - complete deployment guide
- Created `web-app/.env.example` - environment variables template
- Backend now runs as Next.js API routes (serverless functions)

## 🎯 How It Works Now

### Development (Local)
```bash
# Terminal 1 - Backend (for development)
cd backend
bun start

# Terminal 2 - Frontend
cd web-app
bun dev
```
- Frontend: http://localhost:3000
- Backend: http://localhost:4000

### Production (Vercel)
```bash
cd web-app
vercel --prod
```
- Everything runs on Vercel (one deployment)
- Backend tRPC API: `your-app.vercel.app/api/trpc`
- Better Auth: `your-app.vercel.app/api/auth`
- No separate backend server needed!

## 🎮 Demo Mode

### Enable Demo Mode
Set this in Vercel environment variables:
```env
DEMO_MODE=true
```

### What Happens:
1. **Login with any phone number** (e.g., +91 9876543210)
2. **Use OTP: 123456** (fixed demo OTP)
3. **Seller applications auto-approved** (no waiting)
4. **No SMS charges** (MSG91 not called)

### Disable Demo Mode (Production):
```env
DEMO_MODE=false
```

Then real SMS OTPs will be sent via MSG91.

## 📦 Deploy to Vercel

### Quick Steps:

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for Vercel deployment"
   git push
   ```

2. **Create Vercel Project**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repo
   - **Set Root Directory:** `web-app`
   - Click Deploy

3. **Add Environment Variables**
   Required:
   ```env
   DEMO_MODE=true
   BETTER_AUTH_SECRET=your-secret-key-min-32-chars
   DATABASE_URL=file:./dev.db
   ```

   Optional (for production):
   ```env
   MSG91_API_KEY=your-key
   MSG91_TEMPLATE_ID=your-template
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-key
   ```

4. **Test Demo**
   - Visit your Vercel URL
   - Login with any phone
   - OTP: **123456**
   - Done! ✅

## 🔄 Switching Between Modes

### For Client Demo:
```env
DEMO_MODE=true          # Fixed OTP 123456
DATABASE_URL=file:./dev.db    # SQLite
```

### For Production:
```env
DEMO_MODE=false         # Real SMS OTP
DATABASE_URL=postgresql://...  # PostgreSQL
MSG91_API_KEY=real-key
MSG91_TEMPLATE_ID=real-template
```

## 📂 File Changes Made

### New Files:
- ✅ `web-app/src/app/api/trpc/[trpc]/route.ts` - tRPC API route
- ✅ `VERCEL_DEPLOYMENT.md` - Deployment guide
- ✅ `web-app/.env.example` - Environment variables template

### Modified Files:
- ✅ `backend/server/auth.ts` - Added demo mode OTP logic
- ✅ `web-app/src/lib/config.ts` - Production uses same-origin URLs
- ✅ `web-app/src/lib/trpc-provider.tsx` - Uses `/api/trpc` in production
- ✅ `web-app/package.json` - Added backend dependencies

## ✅ Testing

### Test Demo Mode Locally:
```bash
# In web-app directory
export DEMO_MODE=true  # or set DEMO_MODE=true (Windows)
bun dev
```

Then login with any phone + OTP **123456**

### Test Production Build:
```bash
cd web-app
bun install  # Install new backend dependencies
bun build
bun start
```

Visit http://localhost:3000, login with any phone + OTP **123456**

## 🚀 You're Ready!

**No separate backend hosting needed!** Everything runs on Vercel:
- ✅ Next.js frontend
- ✅ tRPC API (serverless functions)
- ✅ Better Auth (serverless functions)
- ✅ Prisma database access
- ✅ Auto-scaling included

Just deploy to Vercel and your app is live! 🎉

---

**Questions or Issues?**
- See `VERCEL_DEPLOYMENT.md` for detailed instructions
- All backend code still works, just runs as Next.js API routes instead of Express
- Demo mode is perfect for showcasing to clients without SMS costs
