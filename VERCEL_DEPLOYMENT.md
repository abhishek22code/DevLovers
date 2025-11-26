# Vercel Deployment Guide

## ⚠️ Important: Socket.IO Limitation

**Vercel is a serverless platform**, which means it doesn't support persistent connections required for Socket.IO. You have two options:

### Option 1: Hybrid Deployment (Recommended)
- **Frontend**: Deploy on Vercel (this file)
- **Backend + Socket.IO**: Deploy on a platform that supports persistent connections:
  - Railway
  - Render
  - DigitalOcean App Platform
  - Heroku
  - AWS EC2 / Elastic Beanstalk
  - Any VPS (DigitalOcean, Linode, etc.)

### Option 2: Full Backend on Vercel (Limited)
- Use Vercel Serverless Functions for API routes
- Socket.IO won't work (requires separate WebSocket server)
- Real-time features will be disabled

## Setup Instructions

### Step 1: Update vercel.json

Before deploying, update the `vercel.json` file:

1. Replace `https://your-backend-domain.com` with your actual backend URL
2. Example:
   ```json
   "destination": "https://api.devlovers.com/api/:path*"
   ```

### Step 2: Set Environment Variables in Vercel

Go to your Vercel project settings → Environment Variables and add:

#### Frontend Environment Variables:
```
VITE_API_URL=https://your-backend-domain.com
VITE_SERVER_PORT=443
VITE_LOCALHOST_HOSTNAME=localhost
```

**Note**: If your backend is on the same domain (subdomain), you can use relative paths:
```
VITE_API_URL=
```

### Step 3: Deploy Frontend to Vercel

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel
   ```

   Or for production:
   ```bash
   vercel --prod
   ```

4. **Or use GitHub Integration**:
   - Push your code to GitHub
   - Connect your repository to Vercel
   - Vercel will auto-deploy on every push

### Step 4: Configure Backend CORS

In your backend `.env` file, set:

```env
ALLOWED_ORIGINS=https://your-vercel-app.vercel.app,https://yourdomain.com
SOCKET_CORS_ORIGINS=https://your-vercel-app.vercel.app,https://yourdomain.com
```

### Step 5: Update Frontend Socket Configuration

The frontend will automatically use `VITE_API_URL` if set. Make sure your `client/src/socket.js` uses:

```javascript
const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;
```

## Alternative: Deploy Everything on Vercel (Without Socket.IO)

If you want to deploy everything on Vercel and can live without real-time features:

### 1. Convert Backend to Serverless Functions

Create `api/` folder in root with serverless functions:

```
api/
  auth/
    login.js
    signup.js
  posts/
    index.js
  users/
    [id].js
```

### 2. Update vercel.json

```json
{
  "version": 2,
  "buildCommand": "cd client && npm install && npm run build",
  "outputDirectory": "client/dist",
  "functions": {
    "api/**/*.js": {
      "runtime": "nodejs18.x"
    }
  },
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

**Note**: This approach requires significant refactoring and Socket.IO won't work.

## Recommended Architecture

```
┌─────────────────┐
│   Vercel        │
│   (Frontend)    │
│   React App     │
└────────┬────────┘
         │
         │ API Calls
         │ Socket.IO
         │
┌────────▼────────┐
│   Railway/     │
│   Render/etc   │
│   (Backend)     │
│   Express +    │
│   Socket.IO     │
└─────────────────┘
```

## Environment Variables Checklist

### Vercel (Frontend):
- [ ] `VITE_API_URL` - Your backend URL
- [ ] `VITE_SERVER_PORT` - Backend port (usually 443 for HTTPS)
- [ ] `VITE_LOCALHOST_HOSTNAME` - localhost (for development)

### Backend Server:
- [ ] `ALLOWED_ORIGINS` - Include your Vercel domain
- [ ] `SOCKET_CORS_ORIGINS` - Include your Vercel domain
- [ ] `MONGODB_URI` - MongoDB connection string
- [ ] `JWT_SECRET` - Strong secret key
- [ ] SMTP credentials
- [ ] All other backend env vars

## Testing After Deployment

1. **Test Frontend**: Visit your Vercel URL
2. **Test API**: Check if API calls work (open browser console)
3. **Test Socket.IO**: Check if real-time features work
4. **Test Authentication**: Try login/signup
5. **Test All Features**: Posts, messages, notifications

## Troubleshooting

### CORS Errors
- Ensure `ALLOWED_ORIGINS` includes your Vercel domain
- Check that backend CORS is configured correctly

### Socket.IO Not Connecting
- Verify backend is running and accessible
- Check `SOCKET_CORS_ORIGINS` includes Vercel domain
- Verify `VITE_API_URL` is set correctly

### 404 Errors on Refresh
- This is handled by the rewrite rule in `vercel.json`
- Ensure the rewrite rule is correct

### Build Failures
- Check that all dependencies are in `package.json`
- Ensure build command works locally: `cd client && npm run build`

## Next Steps

1. Update `vercel.json` with your backend URL
2. Set environment variables in Vercel dashboard
3. Deploy frontend to Vercel
4. Deploy backend to a platform that supports Socket.IO
5. Test everything thoroughly

Good luck with your deployment! 🚀



