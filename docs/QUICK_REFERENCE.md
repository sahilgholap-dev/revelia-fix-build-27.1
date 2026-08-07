# Revelia Quick Reference

Quick commands and references for Revelia development and deployment.

## 🚀 Quick Commands

### Local Development

```bash
# Install dependencies
yarn install                    # Root
cd server && yarn install       # Backend
cd mobile && yarn install       # Mobile

# Start development servers
cd server && yarn dev           # Backend (http://localhost:3000)
cd mobile && yarn start         # Mobile (Expo DevTools)

# Type checking
cd server && yarn type-check    # Backend
cd mobile && yarn type-check    # Mobile

# Linting
cd server && yarn lint          # Backend
cd mobile && yarn lint          # Mobile
```

### EAS Builds

```bash
# Development builds
eas build --profile development --platform ios
eas build --profile development --platform android
eas build --profile development --platform all

# Preview builds (TestFlight/Internal Track)
eas build --profile preview --platform ios
eas build --profile preview --platform android
eas build --profile preview --platform all

# Production builds
eas build --profile production --platform ios
eas build --profile production --platform android
eas build --profile production --platform all

# Check build status
eas build:list
eas build:view [BUILD_ID]
```

### App Store Submission

```bash
# Submit to iOS App Store
eas submit --platform ios --latest

# Submit to Google Play Store
eas submit --platform android --latest

# Check submission status
eas submit:list
```

### OTA Updates

```bash
# Publish update to development
eas update --branch development --message "Bug fix"

# Publish update to preview
eas update --branch preview --message "UI improvements"

# Publish update to production
eas update --branch production --message "Critical fix"

# List updates
eas update:list --branch production

# Rollback
eas update:republish --group [GROUP_ID]
```

### Backend Deployment

```bash
# Railway
railway login
railway init
railway up
railway logs
railway variables set KEY="value"

# Render
# Use web dashboard for deployment
# Push to main branch for auto-deploy
```

### Authentication Testing

```bash
# Backend Auth Endpoints

# Signup
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","password":"Password123!"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"Password123!"}'

# Get Current User
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Logout
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Mobile Auth Testing

# Test in Expo Go
cd mobile
npx expo start

# Test Apple Sign In (iOS Simulator)
cd mobile
npx expo run:ios

# Test Google Sign In (requires Android/iOS device or simulator)
cd mobile
npx expo run:android
# or
npx expo run:ios
```

---

## 📝 Environment Variables

### Required for Development

```bash
# Backend
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/revelia
JWT_SECRET=your-jwt-secret
ANTHROPIC_API_KEY=sk-ant-api03-...

# Mobile
EXPO_PUBLIC_API_URL=http://localhost:3000/api
EXPO_PUBLIC_APP_ENV=development
```

### Required for Production

```bash
# Backend
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
JWT_SECRET=<64-char-random>
JWT_REFRESH_SECRET=<64-char-random>
ANTHROPIC_API_KEY=sk-ant-...
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
REVENUECAT_API_KEY=...
ONESIGNAL_APP_ID=...
SENTRY_DSN=...

# Mobile
EXPO_PUBLIC_API_URL=https://api.revelia.app/api
EXPO_PUBLIC_APP_ENV=production
EXPO_PUBLIC_SENTRY_DSN=...
```

### Generate Secrets

```bash
# JWT secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Or with openssl
openssl rand -hex 64
```

---

## 🔗 Important URLs

### Development

- Backend API: http://localhost:3000
- Backend Health: http://localhost:3000/health
- Expo DevTools: http://localhost:19002

### Production

- Backend API: https://api.revelia.app
- Backend Health: https://api.revelia.app/health
- Mobile App (iOS): https://apps.apple.com/app/revelia/...
- Mobile App (Android): https://play.google.com/store/apps/details?id=com.revelia.app

### Service Dashboards

- **MongoDB Atlas**: https://cloud.mongodb.com/
- **Railway**: https://railway.app/
- **Render**: https://dashboard.render.com/
- **Expo**: https://expo.dev/
- **App Store Connect**: https://appstoreconnect.apple.com/
- **Google Play Console**: https://play.google.com/console/
- **Anthropic**: https://console.anthropic.com/
- **Cloudflare**: https://dash.cloudflare.com/
- **RevenueCat**: https://app.revenuecat.com/
- **OneSignal**: https://onesignal.com/
- **Mixpanel**: https://mixpanel.com/
- **Sentry**: https://sentry.io/

---

## 📊 Bundle Identifiers

### iOS

- Development: `com.srcoderz99.revelia.dev`
- Preview: `com.srcoderz99.revelia.preview`
- Production: `com.srcoderz99.revelia`

### Android

- Development: `com.srcoderz99.revelia.dev`
- Preview: `com.srcoderz99.revelia.preview`
- Production: `com.srcoderz99.revelia`

---

## 🛠️ Troubleshooting

### Backend won't start

```bash
# Check environment variables
cat server/.env

# Check MongoDB connection
mongosh "$MONGODB_URI"

# Check logs
railway logs
# or
tail -f server/logs/app.log
```

### Mobile build fails

```bash
# Check build logs
eas build:list
eas build:view [BUILD_ID]

# Clear cache and rebuild
eas build --clear-cache --profile development --platform ios

# Check credentials
eas credentials
```

### Environment variables not working

```bash
# Backend - check if loaded
node -e "require('dotenv').config(); console.log(process.env.MONGODB_URI)"

# Mobile - rebuild app (env vars embedded at build time)
eas build --profile development --platform all
```

### Database connection issues

```bash
# Test connection
mongosh "$MONGODB_URI"

# Check IP whitelist in MongoDB Atlas
# Add 0.0.0.0/0 for development

# Check connection string format
# mongodb+srv://username:password@cluster.mongodb.net/revelia
```

---

## 📚 Documentation

### Setup Guides

- [ENVIRONMENT_SETUP.md](./docs/ENVIRONMENT_SETUP.md) - Complete environment setup
- [AUTH_SETUP_GUIDE.md](./docs/AUTH_SETUP_GUIDE.md) - Authentication setup (Apple & Google OAuth)
- [INFRASTRUCTURE.md](./INFRASTRUCTURE.md) - Infrastructure overview

### Deployment Guides

- [BACKEND_DEPLOYMENT.md](./docs/BACKEND_DEPLOYMENT.md) - Deploy backend
- [EAS_BUILD_GUIDE.md](./docs/EAS_BUILD_GUIDE.md) - Build mobile app
- [APP_STORE_CHECKLIST.md](./docs/APP_STORE_CHECKLIST.md) - App store submission

### Configuration Files

- [.env.example](./.env.example) - Root environment template
- [server/.env.example](./server/.env.example) - Backend environment
- [mobile/.env.example](./mobile/.env.example) - Mobile environment
- [mobile/eas.json](./mobile/eas.json) - EAS build config
- [mobile/app.json](./mobile/app.json) - Expo app config

---

## ✅ Checklists

### Before First Build

- [ ] All dependencies installed
- [ ] Environment variables set
- [ ] MongoDB Atlas configured
- [ ] Anthropic API key obtained
- [ ] EAS CLI installed and logged in
- [ ] Expo account created
- [ ] Bundle identifiers configured

### Before Production Deploy

- [ ] All environment variables set in deployment platform
- [ ] MongoDB Atlas production cluster ready
- [ ] All API keys obtained (Anthropic, R2, RevenueCat, etc.)
- [ ] Custom domain configured (optional)
- [ ] Health check endpoint working
- [ ] Sentry error tracking configured
- [ ] Backend tested and working

### Before App Store Submission

- [ ] Production builds tested
- [ ] All features working
- [ ] No crashes or major bugs
- [ ] Privacy policy created and hosted
- [ ] Terms of service created
- [ ] Support page created
- [ ] App icons prepared (1024x1024)
- [ ] Screenshots prepared (all required sizes)
- [ ] App description written
- [ ] In-app purchases configured
- [ ] Age rating determined
- [ ] Apple Developer Program active
- [ ] Google Play Console account created

---

## 🔒 Security Reminders

✅ **Always:**
- Use `.env.example` for templates (no real values)
- Keep `.env` files in `.gitignore`
- Use different credentials for dev/staging/production
- Rotate secrets regularly
- Use strong, random secrets (64+ characters)

❌ **Never:**
- Commit `.env` files to Git
- Share credentials in Slack/email/chat
- Use production credentials in development
- Hardcode secrets in source code
- Use weak or default secrets

---

## 📞 Support

### Get API Keys

- **MongoDB Atlas**: https://cloud.mongodb.com/
- **Anthropic**: https://console.anthropic.com/
- **Cloudflare R2**: https://dash.cloudflare.com/ > R2 > Manage R2 API Tokens
- **RevenueCat**: https://app.revenuecat.com/ > Project Settings > API Keys
- **OneSignal**: https://onesignal.com/ > Settings > Keys & IDs
- **Mixpanel**: https://mixpanel.com/ > Project Settings
- **Sentry**: https://sentry.io/ > Project Settings > Client Keys (DSN)

### Documentation

- **Expo**: https://docs.expo.dev/
- **EAS**: https://docs.expo.dev/eas/
- **Railway**: https://docs.railway.app/
- **Render**: https://render.com/docs

### Community

- **Expo Forums**: https://forums.expo.dev/
- **Expo Discord**: https://chat.expo.dev/
- **Stack Overflow**: Tag with `expo`, `react-native`, `eas`

---

**Last Updated:** 2025-01-30  
**Revelia Version:** 1.0.0
