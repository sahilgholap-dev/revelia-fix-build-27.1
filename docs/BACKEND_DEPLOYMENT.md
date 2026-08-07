# Revelia Backend Deployment Guide

Complete guide for deploying Revelia backend to production using Railway or Render.

## Table of Contents

1. [Deployment Options](#deployment-options)
2. [Railway Deployment](#railway-deployment)
3. [Render Deployment](#render-deployment)
4. [Environment Configuration](#environment-configuration)
5. [Database Setup](#database-setup)
6. [Health Checks](#health-checks)
7. [Monitoring](#monitoring)
8. [Troubleshooting](#troubleshooting)

---

## Deployment Options

### Railway (Recommended)

**Pros:**
- ✅ Easiest setup
- ✅ Automatic HTTPS
- ✅ Built-in metrics
- ✅ Great developer experience
- ✅ Generous free tier ($5/month credit)

**Cons:**
- ❌ Can be expensive at scale
- ❌ Less control over infrastructure

**Best for:** MVP, early stage, rapid iteration

### Render

**Pros:**
- ✅ Free tier available
- ✅ Automatic deployments
- ✅ Good documentation
- ✅ Predictable pricing

**Cons:**
- ❌ Free tier has cold starts
- ❌ Slower builds than Railway

**Best for:** Cost-conscious deployments, side projects

### Other Options

- **Heroku:** Similar to Railway but more expensive
- **AWS/GCP/Azure:** More control but complex setup
- **DigitalOcean App Platform:** Good middle ground
- **Fly.io:** Great for global distribution

---

## Railway Deployment

### 1. Prerequisites

- [ ] GitHub account
- [ ] Railway account (sign up at [railway.app](https://railway.app))
- [ ] MongoDB Atlas database ready
- [ ] All API keys ready (see ENVIRONMENT_SETUP.md)

### 2. Initial Setup

1. **Login to Railway:**
   ```bash
   npm install -g @railway/cli
   railway login
   ```

2. **Create new project:**
   - Go to [railway.app/new](https://railway.app/new)
   - Click "Deploy from GitHub repo"
   - Select your Revelia repository
   - Railway will detect the Node.js app

3. **Configure build settings:**
   - Root directory: `server`
   - Build command: `yarn build`
   - Start command: `yarn start`
   - Or use `railway.json` (see below)

### 3. Create railway.json

Create `/app/server/railway.json`:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "yarn install && yarn build"
  },
  "deploy": {
    "startCommand": "node dist/index.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### 4. Set Environment Variables

In Railway dashboard:

1. Go to your service
2. Click "Variables" tab
3. Add all variables from `server/.env.example`:

```bash
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-production-secret
JWT_REFRESH_SECRET=your-production-refresh-secret
ANTHROPIC_API_KEY=sk-ant-...
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=revelia-images
R2_PUBLIC_URL=https://images.revelia.app
REVENUECAT_API_KEY=...
REVENUECAT_WEBHOOK_SECRET=...
ONESIGNAL_APP_ID=...
ONESIGNAL_REST_API_KEY=...
MIXPANEL_TOKEN=...
SENTRY_DSN=...
SENTRY_AUTH_TOKEN=...
SENTRY_ORG=...
SENTRY_PROJECT=revelia-backend
```

**Tip:** Use Railway CLI to set variables:
```bash
railway variables set MONGODB_URI="mongodb+srv://..."
```

### 5. Configure Domain

1. **Generate Railway domain:**
   - Railway provides: `revelia-production.up.railway.app`

2. **Add custom domain (optional):**
   - Go to Settings → Domains
   - Add domain: `api.revelia.app`
   - Update DNS:
     ```
     CNAME api.revelia.app -> revelia-production.up.railway.app
     ```

3. **Update mobile app:**
   ```bash
   # mobile/.env
   EXPO_PUBLIC_API_URL=https://api.revelia.app/api
   ```

### 6. Deploy

**Automatic deployment:**
- Push to `main` branch
- Railway automatically builds and deploys

**Manual deployment:**
```bash
cd server
railway up
```

**Monitor deployment:**
```bash
railway logs
```

### 7. Verify Deployment

```bash
# Check health endpoint
curl https://api.revelia.app/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2025-01-XX...",
  "uptime": 123.45
}
```

---

## Render Deployment

### 1. Prerequisites

- [ ] GitHub account
- [ ] Render account (sign up at [render.com](https://render.com))
- [ ] MongoDB Atlas database ready
- [ ] All API keys ready

### 2. Initial Setup

1. **Create new Web Service:**
   - Go to [dashboard.render.com](https://dashboard.render.com)
   - Click "New +" → "Web Service"
   - Connect GitHub repository
   - Select Revelia repo

2. **Configure service:**
   - Name: `revelia-backend`
   - Region: Choose closest to users
   - Branch: `main`
   - Root Directory: `server`
   - Runtime: `Node`
   - Build Command: `yarn install && yarn build`
   - Start Command: `node dist/index.js`

3. **Choose plan:**
   - Free: $0/month (cold starts after 15 min inactivity)
   - Starter: $7/month (always on)
   - Standard: $25/month (more resources)

### 3. Set Environment Variables

In Render dashboard:

1. Go to "Environment" tab
2. Add all variables from `server/.env.example`
3. Click "Save Changes"

**Tip:** Use "Add from .env" to paste all at once:
```bash
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://...
# ... rest of variables
```

### 4. Configure Domain

1. **Render provides:**
   - `revelia-backend.onrender.com`

2. **Add custom domain:**
   - Go to Settings → Custom Domain
   - Add: `api.revelia.app`
   - Update DNS:
     ```
     CNAME api.revelia.app -> revelia-backend.onrender.com
     ```

### 5. Deploy

**Automatic deployment:**
- Push to `main` branch
- Render automatically builds and deploys

**Manual deployment:**
- Click "Manual Deploy" in dashboard
- Select branch to deploy

**Monitor deployment:**
- View logs in "Logs" tab
- Check "Events" for deployment status

### 6. Health Checks

Render automatically configures health checks:

1. Go to Settings → Health Check
2. Set path: `/health`
3. Render will ping every 30 seconds
4. Auto-restart if unhealthy

---

## Environment Configuration

### Production Environment Variables

**Critical variables:**

```bash
# Must be set for app to work
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
JWT_SECRET=<64-char-random-string>
JWT_REFRESH_SECRET=<64-char-random-string>
ANTHROPIC_API_KEY=sk-ant-...
```

**Optional but recommended:**

```bash
# Image storage (required for face/palm uploads)
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=revelia-images
R2_PUBLIC_URL=https://images.revelia.app

# Subscriptions (required for monetization)
REVENUECAT_API_KEY=...
REVENUECAT_WEBHOOK_SECRET=...

# Push notifications
ONESIGNAL_APP_ID=...
ONESIGNAL_REST_API_KEY=...

# Analytics
MIXPANEL_TOKEN=...

# Error tracking
SENTRY_DSN=...
```

### Generating Secrets

```bash
# Generate JWT secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Or use openssl
openssl rand -hex 64
```

### Environment Validation

Add to `server/src/config/env.ts`:

```typescript
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.string().default('3000'),
  MONGODB_URI: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ANTHROPIC_API_KEY: z.string().startsWith('sk-ant-'),
  // ... other variables
});

export const env = envSchema.parse(process.env);
```

---

## Database Setup

### MongoDB Atlas Configuration

1. **Create cluster:**
   - Go to [cloud.mongodb.com](https://cloud.mongodb.com)
   - Create M0 free cluster
   - Choose region closest to your backend

2. **Configure network access:**
   - Add IP: `0.0.0.0/0` (allow all)
   - Or add specific IPs from Railway/Render

3. **Create database user:**
   - Username: `revelia-prod`
   - Password: Generate strong password
   - Role: `readWrite` on `revelia` database

4. **Get connection string:**
   ```
   mongodb+srv://revelia-prod:<password>@cluster0.xxxxx.mongodb.net/revelia?retryWrites=true&w=majority
   ```

5. **Set in deployment platform:**
   ```bash
   MONGODB_URI=mongodb+srv://...
   ```

### Database Indexes

Create indexes for performance:

```javascript
// Users collection
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ createdAt: -1 });

// Readings collection
db.readings.createIndex({ userId: 1, createdAt: -1 });
db.readings.createIndex({ type: 1 });

// Sessions collection
db.sessions.createIndex({ userId: 1 });
db.sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
```

---

## Health Checks

### Implement Health Endpoint

Create `server/src/routes/health.ts`:

```typescript
import { Router } from 'express';
import mongoose from 'mongoose';

const router = Router();

router.get('/health', async (req, res) => {
  try {
    // Check database connection
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    // Check critical services
    const checks = {
      database: dbStatus,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      memory: process.memoryUsage(),
    };

    if (dbStatus !== 'connected') {
      return res.status(503).json({
        status: 'unhealthy',
        ...checks,
      });
    }

    res.json({
      status: 'healthy',
      ...checks,
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});

export default router;
```

### Configure Platform Health Checks

**Railway:**
- Automatically uses `/health` if available
- Configure in Settings → Health Check

**Render:**
- Settings → Health Check Path: `/health`
- Interval: 30 seconds
- Timeout: 10 seconds
- Unhealthy threshold: 3 failures

---

## Monitoring

### Sentry Error Tracking

1. **Install Sentry:**
   ```bash
   cd server
   yarn add @sentry/node @sentry/tracing
   ```

2. **Initialize in `server/src/index.ts`:**
   ```typescript
   import * as Sentry from '@sentry/node';

   Sentry.init({
     dsn: process.env.SENTRY_DSN,
     environment: process.env.NODE_ENV,
     tracesSampleRate: 1.0,
   });

   // Add error handler
   app.use(Sentry.Handlers.errorHandler());
   ```

3. **Test error tracking:**
   ```bash
   curl https://api.revelia.app/debug-sentry
   ```

### Logging

**Use structured logging:**

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
  ],
});

logger.info('Server started', { port: 3000 });
logger.error('Database connection failed', { error: err.message });
```

### Metrics

**Railway:**
- Built-in metrics dashboard
- CPU, memory, network usage
- Request rate and latency

**Render:**
- Metrics tab shows:
  - CPU usage
  - Memory usage
  - Request count
  - Response times

**Custom metrics with Mixpanel:**

```typescript
import Mixpanel from 'mixpanel';

const mixpanel = Mixpanel.init(process.env.MIXPANEL_TOKEN);

// Track API usage
mixpanel.track('API Request', {
  endpoint: '/api/readings',
  method: 'POST',
  userId: user.id,
});
```

---

## Troubleshooting

### Common Issues

**1. Build fails:**

```bash
# Check build logs
railway logs --build

# Common fixes:
# - Ensure package.json has correct scripts
# - Check TypeScript compilation
# - Verify all dependencies are in package.json
```

**2. App crashes on startup:**

```bash
# Check runtime logs
railway logs

# Common causes:
# - Missing environment variables
# - Database connection failed
# - Port binding issues
```

**3. Database connection timeout:**

```bash
# Check MongoDB Atlas:
# - IP whitelist includes 0.0.0.0/0
# - Database user has correct permissions
# - Connection string is correct
# - Network access is configured
```

**4. API returns 502/503:**

```bash
# Check health endpoint
curl https://api.revelia.app/health

# If unhealthy:
# - Check database connection
# - Check memory usage
# - Check error logs
# - Restart service
```

**5. Slow response times:**

```bash
# Optimize:
# - Add database indexes
# - Enable caching
# - Optimize queries
# - Upgrade plan (more resources)
```

### Debugging

**Enable debug logging:**

```bash
# Add environment variable
DEBUG=*
LOG_LEVEL=debug
```

**Check logs:**

```bash
# Railway
railway logs --tail

# Render
# View in dashboard Logs tab
```

**Test locally with production env:**

```bash
# Copy production env vars to .env.production
cp .env.example .env.production
# Fill in production values

# Run with production env
NODE_ENV=production node dist/index.js
```

---

## Deployment Checklist

Before going to production:

- [ ] All environment variables set
- [ ] MongoDB Atlas configured and accessible
- [ ] Health check endpoint working
- [ ] Sentry error tracking configured
- [ ] Custom domain configured (optional)
- [ ] HTTPS enabled (automatic on Railway/Render)
- [ ] CORS configured for mobile app domain
- [ ] Rate limiting enabled
- [ ] API documentation updated
- [ ] Backup strategy in place
- [ ] Monitoring alerts configured
- [ ] Load testing completed
- [ ] Security audit done

---

## Resources

- [Railway Documentation](https://docs.railway.app/)
- [Render Documentation](https://render.com/docs)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [Sentry Node.js Documentation](https://docs.sentry.io/platforms/node/)
- [Express.js Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)

---

**Last Updated:** 2025-01-XX  
**Revelia Version:** 1.0.0
