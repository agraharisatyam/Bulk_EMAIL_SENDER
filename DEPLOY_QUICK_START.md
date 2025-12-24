# ⚡ Quick Deploy Guide

## 🎯 Fastest Way to Deploy (5 minutes)

### 1. Backend → Railway (2 min)

1. Go to [railway.app](https://railway.app) → Sign up with GitHub
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select your `Bulk_EMAIL_SENDER` repository
4. Railway auto-detects and starts deploying
5. Go to **Settings** → **Variables** → Add these:

```env
PORT=3000
SESSION_SECRET=your-random-32-char-secret-key-here
```

6. Copy your backend URL (e.g., `https://bulk-email-api.railway.app`)

---

### 2. Update Backend CORS (1 min)

Edit `src/app.ts` line 25-28:

```typescript
app.use("*", cors({
	origin: [
		'http://localhost:5173',
		'https://your-frontend.vercel.app'  // Add this after frontend deploy
	],
	credentials: true,
}));
```

Commit and push:
```bash
git add src/app.ts
git commit -m "Update CORS for production"
git push
```

---

### 3. Frontend → Vercel (2 min)

1. Go to [vercel.com](https://vercel.com) → Sign up with GitHub
2. Click **"Add New"** → **"Project"**
3. Import your `Bulk_EMAIL_SENDER` repository
4. **Configure**:
   - **Root Directory**: `frontend`
   - **Framework**: SvelteKit (auto-detected)
5. **Environment Variables**:
   - Key: `VITE_API_BASE`
   - Value: `https://your-backend.railway.app` (from step 1)
6. Click **"Deploy"**

---

### 4. Update Backend CORS with Frontend URL

1. Go back to Railway
2. Update CORS in `src/app.ts` with your Vercel URL
3. Push changes
4. Railway auto-redeploys

---

## ✅ Done!

Your app is live:
- **Frontend**: `https://your-app.vercel.app`
- **Backend**: `https://your-app.railway.app`

---

## 🔧 Optional: Install Vercel Adapter

For better Vercel integration:

```bash
cd frontend
npm install -D @sveltejs/adapter-vercel
```

Update `frontend/svelte.config.js`:
```js
import adapter from '@sveltejs/adapter-vercel';
```

Then redeploy on Vercel.

---

## 🐛 Troubleshooting

**Frontend shows "Cannot connect to backend"?**
- ✅ Check `VITE_API_BASE` is set in Vercel
- ✅ Verify backend URL is correct
- ✅ Check backend is running (visit `/health` endpoint)

**CORS errors?**
- ✅ Add frontend URL to backend CORS origins
- ✅ Redeploy backend after CORS update

---

**Need help?** Check `HOSTING_GUIDE.md` for detailed instructions.

