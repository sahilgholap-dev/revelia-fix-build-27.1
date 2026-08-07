# Revelia Infrastructure & Deployment

This document provides an overview of Revelia's infrastructure setup, deployment configuration, and operational guidelines.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Environment Configuration](#environment-configuration)
4. [Deployment Guides](#deployment-guides)
5. [Quick Start](#quick-start)
6. [Documentation](#documentation)

---

## Overview

Revelia is an AI-powered mobile app for face readings, palm readings, astrology, and numerology. The infrastructure consists of:

- **Backend API**: Node.js/Express/TypeScript hosted on Railway or Render
- **Mobile App**: React Native/Expo built with EAS (Expo Application Services)
- **Database**: MongoDB Atlas
- **Image Storage**: Cloudflare R2
- **AI Services**: Anthropic Claude API
- **Subscriptions**: RevenueCat
- **Push Notifications**: OneSignal
- **Analytics**: Mixpanel
- **Error Tracking**: Sentry

---

## Architecture

```
┌─────────────────┐
│   Mobile App    │
│  (React Native) │
│   Expo/EAS      │
└────────┬────────┘
         │
         │ HTTPS/REST API
         │
┌────────▼────────┐
│  Backend API    │
│ Node.js/Express │
│ Railway/Render  │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼──┐  ┌──▼───┐
│ MongoDB│  │Cloudflare│
│ Atlas  │  │   R2     │
└────────┘  └──────────┘

┌─────────────────────────────┐
│   External Services         │
├─────────────────────────────┤
│ • Anthropic Claude (AI)     │
│ • RevenueCat (Subscriptions)│
│ • OneSignal (Push)          │
│ • Mixpanel (Analytics)      │
│ • Sentry (Error Tracking)   │
└─────────────────────────────┘
```

---

## Environment Configuration

### Environment Files

Revelia uses three environment files:

1. **Root `.env`** - Full-stack development (all variables)
2. **`server/.env`** - Backend-specific variables
3. **`mobile/.env`** - Mobile app variables (EXPO_PUBLIC_ prefix)

### Setup Instructions

```bash
# 1. Copy environment templates
cp .env.example .env
cp server/.env.example server/.env
cp mobile/.env.example mobile/.env

# 2. Fill in required values
# See docs/ENVIRONMENT_SETUP.md for detailed instructions
```

### Required Services

| Service | Purpose | Free Tier | Required |
|---------|---------|-----------|----------|
| MongoDB Atlas | Database | ✅ 512MB | ✅ Yes |
| Anthropic Claude | AI readings | ❌ Pay-as-you-go | ✅ Yes |
| Cloudflare R2 | Image storage | ✅ 10GB | ⚠️ Production |
| RevenueCat | Subscriptions | ✅ Up to $10k MRR | ⚠️ Production |
| OneSignal | Push notifications | ✅ Unlimited | ⚠️ Production |
| Mixpanel | Analytics | ✅ 100k events/month | ⚠️ Production |
| Sentry | Error tracking | ✅ 5k events/month | ⚠️ Production |

**Legend:**
- ✅ Yes = Required for all environments
- ⚠️ Production = Required for production only

---

## Deployment Guides

### Backend Deployment

**Recommended Platform:** Railway (easiest) or Render (free tier)

**Quick Deploy:**

```bash
# Railway
npm install -g @railway/cli
railway login
railway init
railway up

# Render
# Use web dashboard to connect GitHub repo
```

**Full Guide:** See [docs/BACKEND_DEPLOYMENT.md](./docs/BACKEND_DEPLOYMENT.md)

### Mobile App Builds

**Platform:** Expo Application Services (EAS)

**Quick Build:**

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Initialize project
cd mobile
eas init

# Build for development
eas build --profile development --platform all

# Build for production
eas build --profile production --platform all
```

**Full Guide:** See [docs/EAS_BUILD_GUIDE.md](./docs/EAS_BUILD_GUIDE.md)

### App Store Submission

**Prerequisites:**
- Apple Developer Program ($99/year)
- Google Play Console ($25 one-time)
- All assets prepared (icons, screenshots, descriptions)

**Quick Submit:**

```bash
# iOS
eas submit --platform ios --latest

# Android
eas submit --platform android --latest
```

**Full Checklist:** See [docs/APP_STORE_CHECKLIST.md](./docs/APP_STORE_CHECKLIST.md)

---

## Quick Start

### Local Development

**1. Install Dependencies:**

```bash
# Root
yarn install

# Backend
cd server
yarn install

# Mobile
cd mobile
yarn install
```

**2. Set Up Environment:**

```bash
# Copy environment files
cp .env.example .env
cp server/.env.example server/.env
cp mobile/.env.example mobile/.env

# Edit .env files with your credentials
# Minimum required:
# - MONGODB_URI
# - JWT_SECRET
# - ANTHROPIC_API_KEY
```

**3. Start Backend:**

```bash
cd server
yarn dev

# Backend runs on http://localhost:3000
```

**4. Start Mobile App:**

```bash
cd mobile
yarn start

# Scan QR code with Expo Go app
# Or press 'i' for iOS simulator, 'a' for Android emulator
```

### Production Deployment

**1. Deploy Backend:**

```bash
# Set up Railway or Render (see BACKEND_DEPLOYMENT.md)
# Configure environment variables in platform dashboard
# Deploy from GitHub main branch
```

**2. Build Mobile App:**

```bash
cd mobile

# Production build
eas build --profile production --platform all

# Wait for builds to complete (~15-20 minutes)
```

**3. Submit to Stores:**

```bash
# iOS App Store
eas submit --platform ios --latest

# Google Play Store
eas submit --platform android --latest
```

**4. Monitor:**

- Check Sentry for errors
- Monitor analytics in Mixpanel
- Track subscriptions in RevenueCat
- Respond to user reviews

---

## Documentation

### Setup & Configuration

- **[ENVIRONMENT_SETUP.md](./docs/ENVIRONMENT_SETUP.md)** - Complete guide to setting up all environment variables and API credentials
- **[.env.example](./.env.example)** - Root environment template
- **[server/.env.example](./server/.env.example)** - Backend environment template
- **[mobile/.env.example](./mobile/.env.example)** - Mobile environment template

### Deployment

- **[BACKEND_DEPLOYMENT.md](./docs/BACKEND_DEPLOYMENT.md)** - Deploy backend to Railway or Render
- **[EAS_BUILD_GUIDE.md](./docs/EAS_BUILD_GUIDE.md)** - Build and deploy mobile app with EAS
- **[APP_STORE_CHECKLIST.md](./docs/APP_STORE_CHECKLIST.md)** - Complete checklist for app store submission

### Configuration Files

- **[mobile/eas.json](./mobile/eas.json)** - EAS build configuration (dev/preview/production)
- **[mobile/app.json](./mobile/app.json)** - Expo app configuration
- **[mobile/.easignore](./mobile/.easignore)** - Files to exclude from EAS builds
- **[.gitignore](./.gitignore)** - Git ignore rules (includes secrets, builds, etc.)

### API & Development

- **[API.md](./docs/API.md)** - API documentation
- **[DEPLOYMENT.md](./docs/DEPLOYMENT.md)** - General deployment notes
- **[PROMPTS.md](./docs/PROMPTS.md)** - AI prompt templates

---

## Build Profiles

Revelia uses three build profiles defined in `mobile/eas.json`:

### Development

**Purpose:** Internal testing with development client

**Features:**
- Includes Expo DevTools
- Can load from local dev server
- iOS simulator builds
- Android APK

**Bundle IDs:**
- iOS: `com.srcoderz99.revelia.dev`
- Android: `com.srcoderz99.revelia.dev`

**Build:**
```bash
eas build --profile development --platform all
```

### Preview

**Purpose:** Internal testing before production (TestFlight/Internal Track)

**Features:**
- Production-like build
- No development tools
- Connects to staging API
- iOS IPA for TestFlight
- Android APK for internal testing

**Bundle IDs:**
- iOS: `com.srcoderz99.revelia.preview`
- Android: `com.srcoderz99.revelia.preview`

**Build:**
```bash
eas build --profile preview --platform all
```

### Production

**Purpose:** App Store and Google Play releases

**Features:**
- Optimized production build
- Auto-increment build numbers
- iOS IPA for App Store
- Android AAB for Play Store

**Bundle IDs:**
- iOS: `com.srcoderz99.revelia`
- Android: `com.srcoderz99.revelia`

**Build:**
```bash
eas build --profile production --platform all
```

---

## Security Best Practices

### Environment Variables

✅ **DO:**
- Use `.env.example` as template (no real values)
- Keep `.env` files in `.gitignore`
- Use different credentials for dev/staging/production
- Rotate secrets regularly
- Use environment-specific API keys

❌ **DON'T:**
- Commit `.env` files to Git
- Share credentials in Slack/email
- Use production credentials in development
- Hardcode secrets in source code
- Use weak or default secrets

### API Keys

- **Backend keys:** Store in server `.env` only (never expose to client)
- **Mobile keys:** Use `EXPO_PUBLIC_` prefix only for client-safe keys
- **Sensitive operations:** Always validate on backend, never trust client

### Secrets Management

**Railway/Render:**
- Set environment variables in dashboard
- Use secrets management features
- Never commit secrets to code

**Expo EAS:**
- Use `eas secret:create` for sensitive values
- Never commit `eas.json` with real credentials
- Use different bundle IDs for dev/preview/production

---

## Monitoring & Maintenance

### Health Checks

**Backend:**
```bash
curl https://api.revelia.app/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "database": "connected",
  "uptime": 123.45,
  "timestamp": "2025-01-XX..."
}
```

### Error Tracking

- **Sentry:** Monitor errors and crashes
- **Backend:** https://sentry.io/organizations/revelia/projects/revelia-backend/
- **Mobile:** https://sentry.io/organizations/revelia/projects/revelia-mobile/

### Analytics

- **Mixpanel:** Track user behavior and feature usage
- **Dashboard:** https://mixpanel.com/project/revelia

### Subscriptions

- **RevenueCat:** Monitor subscription metrics
- **Dashboard:** https://app.revenuecat.com/projects/revelia

---

## Troubleshooting

### Backend Issues

**Problem:** Backend not starting

```bash
# Check logs
railway logs
# or
render logs

# Common causes:
# - Missing environment variables
# - Database connection failed
# - Port binding issues
```

**Problem:** Database connection timeout

```bash
# Check MongoDB Atlas:
# - IP whitelist includes 0.0.0.0/0
# - Database user has correct permissions
# - Connection string is correct
```

### Mobile Build Issues

**Problem:** EAS build fails

```bash
# Check build logs
eas build:list
eas build:view [BUILD_ID]

# Common causes:
# - Missing credentials
# - Invalid bundle identifier
# - Dependency conflicts
```

**Problem:** Environment variables not working

```bash
# Ensure variables are in mobile/.env
# Rebuild the app (env vars are embedded at build time)
# Check eas.json env overrides
```

### General Debugging

**Check environment variables:**
```javascript
// Backend
console.log('MongoDB URI:', process.env.MONGODB_URI?.substring(0, 20) + '...');

// Mobile
console.log('API URL:', process.env.EXPO_PUBLIC_API_URL);
```

**Test API connectivity:**
```bash
# Test backend health
curl http://localhost:3000/health

# Test from mobile (use your local IP)
curl http://192.168.1.100:3000/health
```

---

## Support

For issues not covered in this documentation:

1. Check service status pages
2. Review service documentation
3. Search community forums
4. Contact service support
5. Check Revelia project documentation

---

## Resources

### Platform Documentation

- [Railway Documentation](https://docs.railway.app/)
- [Render Documentation](https://render.com/docs)
- [Expo EAS Documentation](https://docs.expo.dev/eas/)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)

### Service Documentation

- [Anthropic API](https://docs.anthropic.com/)
- [Cloudflare R2](https://developers.cloudflare.com/r2/)
- [RevenueCat](https://docs.revenuecat.com/)
- [OneSignal](https://documentation.onesignal.com/)
- [Mixpanel](https://developer.mixpanel.com/)
- [Sentry](https://docs.sentry.io/)

### App Store Guidelines

- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Policy](https://play.google.com/about/developer-content-policy/)

---

## Timeline

### Week 1: Environment Setup
- ✅ Environment files created
- ✅ EAS configuration complete
- ✅ Documentation written
- ⏳ API credentials obtained
- ⏳ Development builds working

### Week 2-3: Development
- Backend API implementation
- Mobile app features
- Integration testing

### Week 4: Deployment Prep
- Production deployment configured
- EAS production builds ready
- App store submission prep complete
- Sentry monitoring active

### Week 5+: Launch
- Submit to app stores
- Monitor performance
- Respond to reviews
- Iterate based on feedback

---

## Contributing

When contributing to infrastructure:

1. **Never commit secrets** - Use `.env.example` templates only
2. **Document changes** - Update relevant docs
3. **Test thoroughly** - Verify in dev/preview before production
4. **Follow conventions** - Match existing patterns
5. **Security first** - Review security implications

---

**Last Updated:** 2025-01-30  
**Revelia Version:** 1.0.0  
**Infrastructure Agent:** Ready for deployment
