# Quick Test - Demo Mode OTP

## Test Demo Mode Locally (Before Deploying)

### 1. Enable Demo Mode
```bash
# Windows PowerShell
$env:DEMO_MODE="true"

# Mac/Linux
export DEMO_MODE=true
```

### 2. Start the App
```bash
# Terminal 1 - Backend
cd backend
bun start

# Terminal 2 - Web App
cd web-app
bun dev
```

### 3. Test Login
1. Open http://localhost:3000
2. Click "Seller Login"
3. Enter any phone number (e.g., `9876543210`)
4. Click "Send OTP"
5. **Enter OTP: 123456**
6. Click "Verify"
7. ✅ You should be logged in!

### Expected Behavior:
- ✅ OTP **123456** always works
- ✅ No SMS sent (check backend terminal logs)
- ✅ Login successful
- ✅ Seller dashboard accessible

### Backend Logs Should Show:
```
[DEMO MODE] OTP for 9876543210: 123456 (fixed demo OTP)
[DEMO MODE] Accepting demo OTP 123456 for 9876543210
```

## Test on Vercel After Deployment

### 1. Add Environment Variable in Vercel
```
DEMO_MODE=true
```

### 2. Redeploy

### 3. Test
1. Visit your Vercel URL (e.g., `your-app.vercel.app`)
2. Login with any phone number
3. Use OTP: **123456**
4. ✅ Should work!

---

## Switch Back to Real OTP

### Locally:
```bash
# Windows
$env:DEMO_MODE="false"

# Mac/Linux
export DEMO_MODE=false
```

### Vercel:
Change environment variable to:
```
DEMO_MODE=false
```

Then real SMS OTPs will be sent via MSG91 (requires MSG91_API_KEY).

---

**Demo OTP:** 123456 (when DEMO_MODE=true)  
**Perfect for client demos without SMS charges!** 🎉
