# 🚀 Hosting Guide - Bulk Email Sender

This guide covers hosting options for both the **Hono Backend API** and **SvelteKit Frontend**.

---

## 📋 Prerequisites

- GitHub repository (already done ✅)
- Environment variables configured
- SMTP credentials ready

---

## 🎯 Hosting Strategy

You have two main options:

### Option 1: Separate Hosting (Recommended)
- **Backend**: Railway, Render, Fly.io, or DigitalOcean
- **Frontend**: Vercel, Netlify, or Cloudflare Pages

### Option 2: Full-Stack Hosting
- **Both**: Railway, Render, or Fly.io (single platform)

---

## 🔧 Backend Hosting (Hono API)

### Option A: Railway (Easiest) ⭐ Recommended

1. **Sign up**: Go to [railway.app](https://railway.app)

2. **Create New Project**:
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Configure**:
   - **Root Directory**: Leave empty (or set to project root)
   - **Build Command**: `npm install` (or `bun install`)
   - **Start Command**: `bun run src/app.ts` (or `npm start`)

4. **Environment Variables** (Settings → Variables):
   ```env
   PORT=3000
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your@email.com
   SMTP_PASS=your-app-password
   FROM_EMAIL=your@email.com
   FROM_NAME=Your Name
   SESSION_SECRET=your-random-secret-key-here
   ```

5. **Deploy**: Railway will auto-deploy on push to main branch

6. **Get Backend URL**: Railway provides a URL like `https://your-app.railway.app`

---

### Option B: Render

1. **Sign up**: [render.com](https://render.com)

2. **Create Web Service**:
   - New → Web Service
   - Connect GitHub repo
   - **Name**: `bulk-email-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `bun run src/app.ts` (or use Node.js)

3. **Environment Variables** (same as Railway)

4. **Deploy**: Auto-deploys on git push

---

### Option C: Fly.io

1. **Install Fly CLI**:
   ```bash
   # Windows (PowerShell)
   iwr https://fly.io/install.ps1 -useb | iex
   ```

2. **Login**:
   ```bash
   fly auth login
   ```

3. **Create `fly.toml`** in project root:
   ```toml
   app = "your-app-name"
   primary_region = "iad"

   [build]

   [http_service]
     internal_port = 3000
     force_https = true
     auto_stop_machines = true
     auto_start_machines = true
     min_machines_running = 0
     processes = ["app"]

   [[vm]]
     cpu_kind = "shared"
     cpus = 1
     memory_mb = 256
   ```

4. **Deploy**:
   ```bash
   fly launch
   fly secrets set SMTP_HOST=smtp.gmail.com
   fly secrets set SMTP_PORT=587
   # ... set all env vars
   fly deploy
   ```

---

## 🎨 Frontend Hosting (SvelteKit)

### Option A: Vercel (Easiest) ⭐ Recommended

1. **Sign up**: [vercel.com](https://vercel.com)

2. **Import Project**:
   - Click "Add New" → "Project"
   - Import from GitHub
   - Select your repository

3. **Configure**:
   - **Root Directory**: `frontend`
   - **Framework Preset**: SvelteKit (auto-detected)
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `.svelte-kit` (auto-detected)

4. **Environment Variables**:
   ```env
   VITE_API_BASE=https://your-backend-url.railway.app
   ```

5. **Deploy**: Vercel auto-deploys on push

6. **Custom Domain** (optional): Add your domain in settings

---

### Option B: Netlify

1. **Sign up**: [netlify.com](https://netlify.com)

2. **Create Site**:
   - "Add new site" → "Import an existing project"
   - Connect GitHub
   - Select repository

3. **Build Settings**:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/.svelte-kit`

4. **Environment Variables**:
   ```env
   VITE_API_BASE=https://your-backend-url.railway.app
   ```

5. **Deploy**: Auto-deploys on push

---

### Option C: Cloudflare Pages

1. **Sign up**: [cloudflare.com](https://cloudflare.com)

2. **Create Pages Project**:
   - Pages → Create a project
   - Connect GitHub
   - Select repository

3. **Build Settings**:
   - **Framework preset**: SvelteKit
   - **Root directory**: `frontend`
   - **Build command**: `npm run build`
   - **Build output directory**: `.svelte-kit`

4. **Environment Variables**:
   ```env
   VITE_API_BASE=https://your-backend-url.railway.app
   ```

---

## 🔄 Update Frontend for Production

You need to update the SvelteKit adapter for your hosting platform:

### For Vercel:
```bash
cd frontend
npm install -D @sveltejs/adapter-vercel
```

Update `frontend/svelte.config.js`:
```js
import adapter from '@sveltejs/adapter-vercel';
```

### For Netlify:
```bash
cd frontend
npm install -D @sveltejs/adapter-netlify
```

Update `frontend/svelte.config.js`:
```js
import adapter from '@sveltejs/adapter-netlify';
```

### For Cloudflare Pages:
```bash
cd frontend
npm install -D @sveltejs/adapter-cloudflare
```

Update `frontend/svelte.config.js`:
```js
import adapter from '@sveltejs/adapter-cloudflare';
```

---

## 🔐 Environment Variables Checklist

### Backend (.env):
```env
# Server
PORT=3000

# SMTP (Optional - users can add their own)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your@email.com
SMTP_PASS=your-app-password
FROM_EMAIL=your@email.com
FROM_NAME=Your Name

# Security
SESSION_SECRET=generate-a-random-32-char-string-here
```

### Frontend (.env):
```env
# API Base URL (your backend URL)
VITE_API_BASE=https://your-backend.railway.app
```

---

## 📝 Step-by-Step: Complete Deployment

### Step 1: Deploy Backend (Railway)

1. Go to [railway.app](https://railway.app) and sign up
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Add environment variables (see above)
5. Wait for deployment
6. Copy your backend URL (e.g., `https://bulk-email-api.railway.app`)

### Step 2: Update Frontend Config

1. Update `frontend/src/lib/api.ts` to use production URL:
   ```typescript
   const API_BASE = import.meta.env.VITE_API_BASE || 'https://your-backend.railway.app';
   ```

2. Update CORS in backend `src/app.ts`:
   ```typescript
   app.use("*", cors({
     origin: [
       'http://localhost:5173',  // Dev
       'https://your-frontend.vercel.app'  // Production
     ],
     credentials: true,
   }));
   ```

### Step 3: Deploy Frontend (Vercel)

1. Go to [vercel.com](https://vercel.com) and sign up
2. Click "Add New" → "Project"
3. Import from GitHub
4. Set root directory to `frontend`
5. Add environment variable:
   - `VITE_API_BASE=https://your-backend.railway.app`
6. Deploy

### Step 4: Update Backend CORS

1. Go back to Railway
2. Add frontend URL to CORS origins
3. Redeploy backend

---

## 🗄️ Database Considerations

**SQLite** is file-based and works well for:
- ✅ Small to medium applications
- ✅ Single server deployments
- ✅ Development and testing

**For production with multiple servers**, consider:
- PostgreSQL (Railway, Render, Supabase)
- MySQL (PlanetScale, Railway)
- MongoDB Atlas

**Current setup works fine** for single-server deployments (Railway, Render, Fly.io).

---

## 🔍 Testing Your Deployment

1. **Backend Health Check**:
   ```bash
   curl https://your-backend.railway.app/health
   ```
   Should return: `{"status":"OK",...}`

2. **Frontend**:
   - Visit your frontend URL
   - Try registering a new account
   - Test email sending

3. **Check Logs**:
   - Railway: View logs in dashboard
   - Vercel: View logs in deployment tab

---

## 🐛 Troubleshooting

### Backend not connecting?
- ✅ Check CORS settings include frontend URL
- ✅ Verify environment variables are set
- ✅ Check backend logs for errors

### Frontend can't reach backend?
- ✅ Verify `VITE_API_BASE` is set correctly
- ✅ Check backend is running (health endpoint)
- ✅ Verify CORS allows frontend origin

### Database issues?
- ✅ SQLite files persist on Railway/Render
- ✅ Check file permissions
- ✅ Verify `data/` directory exists

---

## 💰 Cost Estimates

### Free Tier Options:
- **Railway**: $5/month free credit (enough for small apps)
- **Render**: Free tier available (with limitations)
- **Vercel**: Free tier (generous)
- **Netlify**: Free tier (generous)
- **Fly.io**: Free tier available

### Recommended (Free):
- Backend: **Railway** (free tier)
- Frontend: **Vercel** (free tier)

---

## 🚀 Quick Start Commands

### Deploy Backend to Railway:
```bash
# Already on GitHub, just connect in Railway dashboard
```

### Deploy Frontend to Vercel:
```bash
cd frontend
npm install -D @sveltejs/adapter-vercel
# Then deploy via Vercel dashboard
```

---

## 📚 Additional Resources

- [Railway Docs](https://docs.railway.app)
- [Vercel Docs](https://vercel.com/docs)
- [SvelteKit Adapters](https://kit.svelte.dev/docs/adapters)
- [Hono Deployment](https://hono.dev/getting-started/bun#deployment)

---

## ✅ Deployment Checklist

- [ ] Backend deployed and accessible
- [ ] Backend health endpoint working
- [ ] Environment variables set
- [ ] Frontend deployed
- [ ] Frontend environment variable (`VITE_API_BASE`) set
- [ ] CORS configured with frontend URL
- [ ] Test registration/login
- [ ] Test email sending
- [ ] Check logs for errors

---

**Your app is now live! 🎉**

