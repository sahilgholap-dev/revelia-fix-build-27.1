# Revelia Environment Setup Guide

This guide walks you through setting up all required environment variables and API credentials for Revelia.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Environment Files](#environment-files)
3. [Required Services](#required-services)
4. [Service Setup Instructions](#service-setup-instructions)
5. [Security Best Practices](#security-best-practices)
6. [Troubleshooting](#troubleshooting)

---

## Quick Start

### 1. Copy Environment Files

```bash
# Root environment (for full-stack development)
cp .env.example .env

# Backend environment
cp server/.env.example server/.env

# Mobile environment
cp mobile/.env.example mobile/.env
```

### 2. Fill in Required Values

At minimum, you need:
- **MongoDB URI** (database)
- **JWT Secret** (authentication)
- **Anthropic API Key** (AI readings)

For production, you'll also need:
- Cloudflare R2 (image storage)
- RevenueCat (subscriptions)
- OneSignal (push notifications)
- Sentry (error tracking)

---

## Environment Files

### Root `.env`
Contains all environment variables for both backend and mobile. Use this for full-stack development.

### `server/.env`
Backend-specific variables. Used when running the backend independently.

### `mobile/.env`
Mobile app variables (must be prefixed with `EXPO_PUBLIC_`). Used by Expo during builds.

**Important:** Variables prefixed with `EXPO_PUBLIC_` are embedded in the mobile app bundle and accessible client-side.

---

## Required Services

| Service | Purpose | Required For | Free Tier |
|---------|---------|--------------|----------|
| MongoDB Atlas | Database | All environments | ✅ Yes (512MB) |
| Anthropic Claude | AI readings | All environments | ❌ Pay-as-you-go |
| Cloudflare R2 | Image storage | Production | ✅ Yes (10GB) |
| RevenueCat | Subscriptions | Production | ✅ Yes (up to $10k MRR) |
| OneSignal | Push notifications | Production | ✅ Yes (unlimited) |
| Mixpanel | Analytics | Production | ✅ Yes (100k events/month) |
| Sentry | Error tracking | Production | ✅ Yes (5k events/month) |

---

## Service Setup Instructions

### 1. MongoDB Atlas (Database)

**Purpose:** Store user data, readings, and app state.

**Setup:**

1. Go to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Create a free account
3. Create a new cluster (M0 free tier)
4. Click "Connect" → "Connect your application"
5. Copy the connection string
6. Replace `<password>` with your database user password
7. Replace `myFirstDatabase` with `revelia`

**Environment Variable:**
```bash
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/revelia?retryWrites=true&w=majority
```

**Security:**
- Add your IP address to the IP whitelist (or use `0.0.0.0/0` for development)
- Create a dedicated database user (not your Atlas account)
- Use a strong password

---

### 2. Anthropic Claude API (AI Readings)

**Purpose:** Generate face readings, palm readings, astrology, and numerology insights.

**Setup:**

1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Sign up for an account
3. Navigate to "API Keys"
4. Click "Create Key"
5. Copy the API key (starts with `sk-ant-api03-`)

**Environment Variable:**
```bash
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Pricing:**
- Claude 3.5 Sonnet: ~$3 per million input tokens
- Estimated cost per reading: $0.01-0.05
- Budget accordingly based on expected usage

**Rate Limits:**
- Tier 1: 50 requests/minute
- Tier 2: 1,000 requests/minute (after $100 spend)

---

### 3. Cloudflare R2 (Image Storage)

**Purpose:** Store user-uploaded face and palm images.

**Setup:**

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to R2 Object Storage
3. Create a new bucket: `revelia-images`
4. Go to "Manage R2 API Tokens"
5. Create a new API token with:
   - Permissions: Object Read & Write
   - Bucket: revelia-images
6. Copy the credentials:
   - Account ID
   - Access Key ID
   - Secret Access Key

**Environment Variables:**
```bash
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET_NAME=revelia-images
R2_PUBLIC_URL=https://images.revelia.app
```

**Public URL Setup:**
1. In R2 bucket settings, enable "Public Access"
2. Set up a custom domain (e.g., `images.revelia.app`)
3. Or use the default R2.dev URL: `https://pub-xxxxx.r2.dev`

**Pricing:**
- Free tier: 10GB storage, 1 million Class A operations/month
- No egress fees (unlike S3)

---

### 4. RevenueCat (Subscription Management)

**Purpose:** Handle in-app purchases and subscription management across iOS and Android.

**Setup:**

1. Go to [RevenueCat](https://app.revenuecat.com/)
2. Create a new project: "Revelia"
3. Add your apps:
   - iOS: Bundle ID `com.revelia.app`
   - Android: Package name `com.revelia.app`
4. Configure App Store Connect and Google Play Console integrations
5. Get your API keys:
   - Go to Project Settings → API Keys
   - Copy the public API key
   - Generate a webhook secret

**Environment Variables:**
```bash
REVENUECAT_API_KEY=your-revenuecat-api-key
REVENUECAT_WEBHOOK_SECRET=your-revenuecat-webhook-secret
REVENUECAT_IOS_APP_ID=your-ios-app-specific-shared-secret
REVENUECAT_ANDROID_APP_ID=your-android-app-key
```

**App Store Connect Setup (iOS):**
1. Create in-app purchase products
2. Get App-Specific Shared Secret from App Store Connect
3. Add to RevenueCat iOS app configuration

**Google Play Console Setup (Android):**
1. Create subscription products
2. Link Google Play service account to RevenueCat
3. Enable Real-time Developer Notifications

**Pricing:**
- Free up to $10,000 monthly tracked revenue
- 1% of revenue above $10k

---

### 5. OneSignal (Push Notifications)

**Purpose:** Send push notifications for reading completion, promotions, and engagement.

**Setup:**

1. Go to [OneSignal](https://onesignal.com/)
2. Create a new app: "Revelia"
3. Select "Apple iOS (APNs)" and "Google Android (FCM/GCM)"
4. Configure platforms:
   - **iOS:** Upload APNs certificate or key
   - **Android:** Add Firebase Server Key
5. Get credentials from Settings → Keys & IDs:
   - App ID
   - REST API Key

**Environment Variables:**
```bash
ONESIGNAL_APP_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
ONESIGNAL_API_KEY=your-onesignal-api-key
ONESIGNAL_REST_API_KEY=your-onesignal-rest-api-key
```

**iOS APNs Setup:**
1. Create APNs key in Apple Developer Portal
2. Upload to OneSignal
3. Or use .p12 certificate method

**Android FCM Setup:**
1. Create Firebase project
2. Add Android app with package name `com.revelia.app`
3. Get Server Key from Firebase Console → Project Settings → Cloud Messaging
4. Add to OneSignal

**Pricing:**
- Free for unlimited devices and notifications

---

### 6. Mixpanel (Analytics)

**Purpose:** Track user behavior, feature usage, and conversion funnels.

**Setup:**

1. Go to [Mixpanel](https://mixpanel.com/)
2. Create a new project: "Revelia"
3. Go to Project Settings
4. Copy the Project Token

**Environment Variable:**
```bash
MIXPANEL_TOKEN=your-mixpanel-project-token
```

**Recommended Events to Track:**
- User signup/login
- Reading initiated (face, palm, astrology, numerology)
- Reading completed
- Subscription started/cancelled
- Image uploaded
- Share reading

**Pricing:**
- Free: 100,000 events/month
- Growth: $25/month for 1M events

---

### 7. Sentry (Error Tracking)

**Purpose:** Monitor errors and crashes in both backend and mobile app.

**Setup:**

1. Go to [Sentry](https://sentry.io/)
2. Create a new organization: "Revelia"
3. Create two projects:
   - `revelia-backend` (Node.js)
   - `revelia-mobile` (React Native)
4. Get DSN from Project Settings → Client Keys (DSN)
5. Create an Auth Token:
   - Settings → Account → API → Auth Tokens
   - Scopes: `project:read`, `project:releases`, `org:read`

**Environment Variables:**
```bash
# Backend
SENTRY_DSN=https://xxxxxxxxxxxxx@sentry.io/xxxxxxx
SENTRY_AUTH_TOKEN=your-sentry-auth-token
SENTRY_ORG=your-sentry-org
SENTRY_PROJECT=revelia-backend

# Mobile
EXPO_PUBLIC_SENTRY_DSN=https://xxxxxxxxxxxxx@sentry.io/xxxxxxx
```

**Integration:**
- Backend: Install `@sentry/node`
- Mobile: Install `@sentry/react-native` and `sentry-expo`

**Pricing:**
- Free: 5,000 events/month
- Team: $26/month for 50k events

---

### 8. JWT Secrets (Authentication)

**Purpose:** Secure user authentication tokens.

**Setup:**

Generate secure random strings:

```bash
# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate refresh token secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Environment Variables:**
```bash
JWT_SECRET=your-generated-secret-here
JWT_REFRESH_SECRET=your-generated-refresh-secret-here
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
```

**Security:**
- Use different secrets for development and production
- Never commit secrets to version control
- Rotate secrets periodically in production
- Use at least 64 characters for production secrets

---

## Security Best Practices

### 1. Environment Variable Management

✅ **DO:**
- Use `.env.example` as a template (no real values)
- Keep `.env` files in `.gitignore`
- Use different credentials for dev/staging/production
- Rotate secrets regularly
- Use environment-specific API keys when available

❌ **DON'T:**
- Commit `.env` files to Git
- Share credentials in Slack/email
- Use production credentials in development
- Hardcode secrets in source code
- Use weak or default secrets

### 2. API Key Security

- **Backend keys:** Store in server `.env` only (never expose to client)
- **Mobile keys:** Use `EXPO_PUBLIC_` prefix only for client-safe keys
- **Sensitive operations:** Always validate on backend, never trust client

### 3. Production Deployment

**Railway/Render:**
1. Set environment variables in dashboard (not in code)
2. Use secrets management features
3. Enable automatic deployments from `main` branch
4. Set up health checks

**Expo EAS:**
1. Use `eas secret:create` for sensitive values
2. Never commit `eas.json` with real credentials
3. Use different bundle IDs for dev/preview/production

### 4. Access Control

- Limit API key permissions to minimum required
- Use IP whitelisting where possible (MongoDB, etc.)
- Enable 2FA on all service accounts
- Regularly audit access logs

---

## Troubleshooting

### MongoDB Connection Issues

**Error:** `MongoServerError: bad auth`
- Check username and password are correct
- Ensure password is URL-encoded (replace special characters)
- Verify database user has read/write permissions

**Error:** `MongooseServerSelectionError: connect ETIMEDOUT`
- Add your IP address to MongoDB Atlas IP whitelist
- Check network/firewall settings
- Verify connection string format

### Anthropic API Issues

**Error:** `401 Unauthorized`
- Verify API key is correct and active
- Check API key has not expired
- Ensure key starts with `sk-ant-api03-`

**Error:** `429 Too Many Requests`
- You've hit rate limits
- Implement exponential backoff
- Consider upgrading tier (after $100 spend)

### Cloudflare R2 Issues

**Error:** `403 Forbidden`
- Check API token has correct permissions
- Verify bucket name is correct
- Ensure token is not expired

**Error:** Images not loading
- Verify public access is enabled on bucket
- Check CORS settings
- Confirm R2_PUBLIC_URL is correct

### EAS Build Issues

**Error:** `EXPO_PUBLIC_` variables not working
- Ensure variables are in `mobile/.env`
- Rebuild the app (env vars are embedded at build time)
- Check `eas.json` env overrides

**Error:** Build fails with credentials error
- Run `eas credentials` to configure
- Let EAS manage certificates (recommended)
- Or manually upload credentials

### General Debugging

1. **Check environment variables are loaded:**
   ```javascript
   // Backend
   console.log('MongoDB URI:', process.env.MONGODB_URI?.substring(0, 20) + '...');
   
   // Mobile
   console.log('API URL:', process.env.EXPO_PUBLIC_API_URL);
   ```

2. **Verify API connectivity:**
   ```bash
   # Test backend health
   curl http://localhost:3000/health
   
   # Test from mobile (use your local IP)
   curl http://192.168.1.100:3000/health
   ```

3. **Check logs:**
   - Backend: Check console output
   - Mobile: Use Expo DevTools or `npx react-native log-ios/log-android`
   - Production: Check Sentry for errors

---

## Environment Checklist

Before deploying to production:

- [ ] All `.env.example` files are up to date
- [ ] Production environment variables are set in deployment platform
- [ ] MongoDB Atlas IP whitelist configured
- [ ] Cloudflare R2 bucket created and public URL configured
- [ ] RevenueCat integrated with App Store Connect and Google Play
- [ ] OneSignal configured with APNs and FCM
- [ ] Sentry projects created for backend and mobile
- [ ] JWT secrets are strong and unique
- [ ] All API keys are production-ready (not test/sandbox)
- [ ] Rate limiting configured
- [ ] CORS origins set correctly
- [ ] Health check endpoint working
- [ ] Error tracking verified
- [ ] Push notifications tested
- [ ] In-app purchases tested in sandbox

---

## Additional Resources

- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [Anthropic API Documentation](https://docs.anthropic.com/)
- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [RevenueCat Documentation](https://docs.revenuecat.com/)
- [OneSignal Documentation](https://documentation.onesignal.com/)
- [Expo EAS Documentation](https://docs.expo.dev/eas/)
- [Sentry Documentation](https://docs.sentry.io/)

---

## Support

If you encounter issues not covered in this guide:

1. Check service status pages
2. Review service documentation
3. Search community forums
4. Contact service support
5. Check Revelia project documentation in `/docs`

---

**Last Updated:** 2025-01-XX  
**Revelia Version:** 1.0.0
