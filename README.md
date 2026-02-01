# Helfer - B2B Marketplace Demo

> **Quick Start for Vercel Deployment** - Everything runs on Vercel, no separate backend needed!

## 🎯 What This Is

A modern B2B marketplace platform for sellers to manage their products, inventory, and orders. Built with Next.js 15, tRPC, Prisma, and Better Auth.

## ✨ Features

- 📱 **Phone OTP Authentication** - Secure login with Better Auth
- 🏪 **Seller Dashboard** - Complete product & inventory management
- 📦 **Product Catalog** - Categories, variants, pricing, images
- 📊 **Analytics** - Sales tracking and insights
- 🧾 **Proforma Invoices** - Create and manage PIs
- 📋 **Purchase Orders** - Track POs and deliveries
- 🎨 **Modern UI** - Built with shadcn/ui and Tailwind CSS

## 🚀 Deploy to Vercel (1-Click)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/helferdemo&root-directory=web-app)

### Environment Variables

Add these in Vercel dashboard:

```env
# Demo Mode (Use fixed OTP: 123456)
DEMO_MODE=true

# Database (SQLite for demo)
DATABASE_URL=file:./dev.db

# Auth Secret (Generate a random 32+ character string)
BETTER_AUTH_SECRET=your-super-secret-key-at-least-32-characters-long
```

**That's it!** Your app will be live in ~2 minutes.

## 🎮 Demo Login

After deployment:

1. Visit your Vercel URL
2. Click "Seller Login"
3. Enter any phone number (e.g., `9876543210`)
4. Click "Send OTP"
5. **Enter OTP: 123456** (fixed demo OTP)
6. Click "Verify"
7. ✅ You're in!

## 💻 Local Development

### Prerequisites

- [Bun](https://bun.sh) runtime
- Node.js 20+

### Quick Start

```bash
# 1. Clone
git clone https://github.com/YOUR_USERNAME/helferdemo.git
cd helferdemo

# 2. Install dependencies
cd web-app
bun install

cd ../backend
bun install

# 3. Setup database
cd backend
bunx prisma generate
bunx prisma db push

# 4. Seed demo data
bun run prisma/seed.ts

# 5. Run in development (2 terminals)

# Terminal 1 - Backend
cd backend
bun start

# Terminal 2 - Web App
cd web-app
bun dev
```

Visit: http://localhost:3000

## 🎯 Demo Mode

When `DEMO_MODE=true`:
- ✅ OTP **123456** always works (no SMS sent)
- ✅ Seller applications auto-approved
- ✅ Perfect for demonstrations

To disable (production):
```env
DEMO_MODE=false
MSG91_API_KEY=your-msg91-key
MSG91_TEMPLATE_ID=your-template-id
```

## 📦 Tech Stack

- **Frontend:** Next.js 15, React 19, TypeScript
- **Styling:** Tailwind CSS, shadcn/ui components
- **Backend:** tRPC, Prisma ORM
- **Database:** SQLite (demo) / PostgreSQL (production)
- **Auth:** Better Auth with phone OTP
- **Deployment:** Vercel (frontend + backend as API routes)

## 📁 Project Structure

```
helferdemo/
├── web-app/              # Next.js application
│   ├── src/
│   │   ├── app/          # App router pages
│   │   ├── components/   # React components
│   │   └── lib/          # Utilities, tRPC client
│   └── package.json
│
├── backend/              # Backend logic (runs as Next.js API routes on Vercel)
│   ├── server/
│   │   ├── routers/      # tRPC routers
│   │   ├── auth.ts       # Better Auth config
│   │   └── index.ts      # Server setup
│   ├── prisma/
│   │   └── schema.prisma # Database schema
│   └── package.json
│
└── README.md
```

## 🔧 Key Features Explained

### 1. Authentication
- Phone OTP via Better Auth
- Demo mode: Fixed OTP `123456`
- Production: Real SMS via MSG91

### 2. Product Management
- Create products with variants
- Upload images
- Manage pricing and inventory
- Category organization

### 3. Order Workflow
- Proforma Invoice creation
- Purchase Order tracking
- Delivery management

### 4. Dashboard Analytics
- Sales overview
- Order statistics
- Revenue tracking

## 📚 Documentation

- [Vercel Deployment Guide](./VERCEL_DEPLOYMENT.md)
- [Deployment Summary](./DEPLOYMENT_SUMMARY.md)
- [Test Demo Mode](./TEST_DEMO_MODE.md)

## 🛠️ Production Deployment

For production use:

1. **Migrate to PostgreSQL:**
   ```env
   DATABASE_URL=postgresql://user:password@host:port/database
   ```

2. **Configure SMS:**
   ```env
   DEMO_MODE=false
   MSG91_API_KEY=your-real-key
   MSG91_TEMPLATE_ID=your-template
   ```

3. **Add Google Maps** (optional):
   ```env
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-key
   ```

4. **Setup File Storage** (for product images):
   ```env
   AWS_ACCESS_KEY_ID=your-key
   AWS_SECRET_ACCESS_KEY=your-secret
   AWS_S3_BUCKET=your-bucket
   ```

## 🤝 Contributing

This is a demo project. For the full production version, please contact the development team.

## 📄 License

Proprietary - Demo purposes only

---

**Built with ❤️ for modern B2B commerce**

🚀 **Ready to deploy?** Click the Vercel button above!
