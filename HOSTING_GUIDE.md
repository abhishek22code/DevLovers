# DevLovers Hosting Guide

This guide covers how to host your DevLovers MERN stack application (React + Node.js + MongoDB + Socket.IO).

## Table of Contents
1. [Hosting Options Overview](#hosting-options-overview)
2. [Backend Hosting](#backend-hosting)
3. [Frontend Hosting](#frontend-hosting)
4. [Database Setup](#database-setup)
5. [Environment Variables Setup](#environment-variables-setup)
6. [Complete Deployment Examples](#complete-deployment-examples)

---

## Hosting Options Overview

### Backend (Node.js/Express)
- **Recommended**: Railway, Render, Heroku, DigitalOcean App Platform
- **Budget**: VPS (DigitalOcean, Linode, Vultr) + PM2
- **Enterprise**: AWS EC2, Google Cloud Run, Azure App Service

### Frontend (React/Vite)
- **Recommended**: Vercel, Netlify, Cloudflare Pages
- **Alternative**: Same as backend (Railway, Render)
- **Budget**: GitHub Pages (static only)

### Database (MongoDB)
- **Recommended**: MongoDB Atlas (Free tier available)
- **Alternative**: Self-hosted on VPS

---

## Backend Hosting

### Option 1: Railway (Easiest - Recommended) ⭐

1. **Sign up**: Go to [railway.app](https://railway.app)
2. **Create new project**: Click "New Project"
3. **Deploy from GitHub**:
   - Connect your GitHub repo
   - Select the `server` folder
   - Railway auto-detects Node.js
4. **Add environment variables** (see Environment Variables section)
5. **Deploy**: Railway automatically deploys on push

**Pros**: Free tier, auto-deploy, easy setup
**Cons**: Sleeps after inactivity on free tier

---

### Option 2: Render

1. **Sign up**: Go to [render.com](https://render.com)
2. **Create Web Service**:
   - Connect GitHub repo
   - Root Directory: `server`
   - Build Command: `npm install`
   - Start Command: `npm start`
3. **Environment**: Select "Node"
4. **Add environment variables**
5. **Deploy**

**Pros**: Free tier, persistent (doesn't sleep)
**Cons**: Slower cold starts

---

### Option 3: DigitalOcean App Platform

1. **Sign up**: [digitalocean.com](https://digitalocean.com)
2. **Create App**:
   - Connect GitHub
   - Select `server` directory
   - Auto-detects Node.js
3. **Configure**:
   - Build Command: `npm install`
   - Run Command: `npm start`
4. **Add environment variables**
5. **Deploy**

**Pros**: Reliable, good performance
**Cons**: Paid (starts at $5/month)

---

### Option 4: VPS (DigitalOcean Droplet, Linode, etc.)

1. **Create VPS**: Ubuntu 22.04 LTS (minimum 1GB RAM)
2. **SSH into server**:
   ```bash
   ssh root@your-server-ip
   ```
3. **Install Node.js**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```
4. **Install PM2** (process manager):
   ```bash
   sudo npm install -g pm2
   ```
5. **Clone your repo**:
   ```bash
   git clone https://github.com/yourusername/devlovers.git
   cd devlovers/server
   ```
6. **Install dependencies**:
   ```bash
   npm install
   ```
7. **Create .env file**:
   ```bash
   nano .env
   # Add all your environment variables
   ```
8. **Start with PM2**:
   ```bash
   pm2 start index.js --name devlovers-api
   pm2 save
   pm2 startup  # Follow instructions to enable auto-start
   ```
9. **Setup Nginx** (reverse proxy):
   ```bash
   sudo apt install nginx
   sudo nano /etc/nginx/sites-available/devlovers
   ```
   
   Add this configuration:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
   
   Enable site:
   ```bash
   sudo ln -s /etc/nginx/sites-available/devlovers /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

**Pros**: Full control, cost-effective
**Cons**: Requires server management knowledge

---

## Frontend Hosting

### Option 1: Vercel (Recommended) ⭐

1. **Sign up**: [vercel.com](https://vercel.com)
2. **Import project**:
   - Connect GitHub repo
   - Root Directory: `client`
   - Framework Preset: Vite
3. **Build settings** (auto-detected):
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. **Environment variables**:
   - Add `VITE_API_URL` (your backend URL)
   - Add `VITE_LOCALHOST_HOSTNAME`
   - Add `VITE_SERVER_PORT`
5. **Deploy**: Auto-deploys on push

**Pros**: Free, fast CDN, auto-deploy, custom domains
**Cons**: None for this use case

---

### Option 2: Netlify

1. **Sign up**: [netlify.com](https://netlify.com)
2. **Add new site**:
   - Connect GitHub
   - Base directory: `client`
   - Build command: `npm run build`
   - Publish directory: `dist`
3. **Environment variables**: Add VITE_* variables
4. **Deploy**

**Pros**: Free, easy, good for static sites
**Cons**: Slightly slower than Vercel

---

### Option 3: Cloudflare Pages

1. **Sign up**: [cloudflare.com](https://cloudflare.com)
2. **Pages → Create project**:
   - Connect GitHub
   - Framework: Vite
   - Build command: `npm run build`
   - Build output: `dist`
3. **Environment variables**: Add VITE_* variables
4. **Deploy**

**Pros**: Free, excellent CDN, fast
**Cons**: Slightly more complex setup

---

## Database Setup

### MongoDB Atlas (Recommended)

1. **Sign up**: [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. **Create cluster**:
   - Choose free tier (M0)
   - Select region closest to your backend
3. **Create database user**:
   - Database Access → Add New User
   - Username/password (save these!)
4. **Network Access**:
   - Add IP Address → Allow Access from Anywhere (0.0.0.0/0)
   - Or add your backend server IP
5. **Get connection string**:
   - Clusters → Connect → Connect your application
   - Copy connection string
   - Replace `<password>` with your database user password
   - Example: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/devlovers?retryWrites=true&w=majority`

6. **Add to .env**:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/devlovers?retryWrites=true&w=majority
   ```

---

## Environment Variables Setup

### Backend (.env in server folder)

```env
# Server Configuration
NODE_ENV=production
PORT=3001

# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/devlovers

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d

# Localhost Configuration (if needed)
LOCALHOST_HOSTNAME=localhost
CLIENT_URL=https://your-frontend-domain.com
CLIENT_URL_ALT=https://www.your-frontend-domain.com
SERVER_PORT=3001

# Production CORS - REQUIRED!
ALLOWED_ORIGINS=https://your-frontend-domain.com,https://www.your-frontend-domain.com
SOCKET_CORS_ORIGINS=https://your-frontend-domain.com,https://www.your-frontend-domain.com
DOMAIN=https://your-frontend-domain.com

# SMTP (for emails - optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="DevLovers <no-reply@devlovers.com>"

# OpenAI (optional)
OPENAI_API_KEY=your-openai-api-key

# Judge0 (optional)
JUDGE0_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_KEY=your-judge0-key
FEATURE_CODE_RUNNER=false
```

### Frontend (.env in client folder)

```env
# API Configuration
VITE_API_URL=https://your-backend-domain.com

# Localhost Configuration
VITE_LOCALHOST_HOSTNAME=localhost
VITE_SERVER_PORT=3001

# Optional: Full proxy target
# VITE_PROXY_TARGET=https://your-backend-domain.com
```

**Important**: 
- Replace `your-frontend-domain.com` with your actual frontend URL
- Replace `your-backend-domain.com` with your actual backend URL
- For Vercel/Netlify, add these in their dashboard under Environment Variables

---

## Complete Deployment Examples

### Example 1: Railway (Backend) + Vercel (Frontend) + MongoDB Atlas

**Backend (Railway)**:
1. Deploy `server` folder to Railway
2. Add all backend environment variables
3. Get Railway URL: `https://your-app.railway.app`

**Frontend (Vercel)**:
1. Deploy `client` folder to Vercel
2. Add environment variables:
   - `VITE_API_URL=https://your-app.railway.app`
3. Get Vercel URL: `https://your-app.vercel.app`

**Update Backend CORS**:
```env
ALLOWED_ORIGINS=https://your-app.vercel.app
SOCKET_CORS_ORIGINS=https://your-app.vercel.app
```

**Database**: MongoDB Atlas (free tier)

---

### Example 2: Render (Both) + MongoDB Atlas

**Backend (Render)**:
1. Create Web Service from `server` folder
2. Add environment variables
3. Get URL: `https://devlovers-api.onrender.com`

**Frontend (Render)**:
1. Create Static Site from `client` folder
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Add environment variables
5. Get URL: `https://devlovers.onrender.com`

**Update Backend CORS**:
```env
ALLOWED_ORIGINS=https://devlovers.onrender.com
SOCKET_CORS_ORIGINS=https://devlovers.onrender.com
```

---

## Post-Deployment Checklist

- [ ] Backend deployed and accessible
- [ ] Frontend deployed and accessible
- [ ] MongoDB Atlas connected
- [ ] Environment variables set correctly
- [ ] CORS configured with frontend URL
- [ ] Socket.IO CORS configured
- [ ] Test API endpoints
- [ ] Test frontend connection to backend
- [ ] Test authentication flow
- [ ] Test Socket.IO connections
- [ ] SSL/HTTPS enabled (automatic on most platforms)

---

## Troubleshooting

### CORS Errors
- Make sure `ALLOWED_ORIGINS` includes your exact frontend URL (with https://)
- Check for trailing slashes
- Verify `SOCKET_CORS_ORIGINS` is set

### Socket.IO Connection Issues
- Ensure `SOCKET_CORS_ORIGINS` matches frontend URL
- Check that WebSocket is enabled on your hosting platform
- Verify `VITE_API_URL` in frontend matches backend URL

### Database Connection Issues
- Verify MongoDB Atlas IP whitelist includes your backend server
- Check connection string has correct password
- Ensure database user has proper permissions

### Build Failures
- Check Node.js version (should be 18+)
- Verify all dependencies are in package.json
- Check build logs for specific errors

---

## Custom Domain Setup

### Backend (Railway/Render)
1. Go to your service settings
2. Add custom domain
3. Follow DNS instructions
4. Update `ALLOWED_ORIGINS` with new domain

### Frontend (Vercel/Netlify)
1. Go to project settings → Domains
2. Add your domain
3. Follow DNS instructions
4. Update backend `ALLOWED_ORIGINS` with new domain

---

## Security Checklist

- [ ] Change `JWT_SECRET` to a strong random string
- [ ] Set `NODE_ENV=production`
- [ ] Configure `ALLOWED_ORIGINS` (don't leave empty!)
- [ ] Use HTTPS (automatic on most platforms)
- [ ] MongoDB Atlas IP whitelist configured
- [ ] Remove any hardcoded secrets
- [ ] Enable rate limiting (already in code)
- [ ] Regular backups of database

---

## Cost Estimate

**Free Tier Option**:
- Railway/Render (Backend): Free (with limitations)
- Vercel/Netlify (Frontend): Free
- MongoDB Atlas: Free (512MB storage)
- **Total: $0/month**

**Production Option**:
- DigitalOcean App Platform: $5-12/month
- Vercel Pro: $20/month (optional)
- MongoDB Atlas: $9/month (M10 cluster)
- **Total: ~$14-41/month**

---

## Need Help?

- Check hosting platform documentation
- Review error logs in hosting dashboard
- Test locally first with production-like environment variables
- Use platform's support/community forums

Good luck with your deployment! 🚀

