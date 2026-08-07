# Revelia EAS Build & Deployment Guide

Complete guide for building and deploying Revelia mobile app using Expo Application Services (EAS).

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [EAS Setup](#eas-setup)
3. [Build Profiles](#build-profiles)
4. [Building the App](#building-the-app)
5. [Testing Builds](#testing-builds)
6. [App Store Submission](#app-store-submission)
7. [OTA Updates](#ota-updates)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Accounts

- [ ] Expo account (free)
- [ ] Apple Developer Program ($99/year) - for iOS
- [ ] Google Play Console ($25 one-time) - for Android
- [ ] GitHub account (for CI/CD)

### Required Tools

```bash
# Install EAS CLI globally
npm install -g eas-cli

# Or with yarn
yarn global add eas-cli

# Verify installation
eas --version
```

### Project Setup

```bash
# Navigate to mobile directory
cd mobile

# Install dependencies
yarn install

# Login to Expo
eas login
```

---

## EAS Setup

### 1. Initialize EAS Project

```bash
cd mobile
eas init
```

This will:
- Create an EAS project
- Generate a project ID
- Update `app.json` with the project ID

### 2. Configure Credentials

EAS can automatically manage your iOS certificates and Android keystores.

**iOS:**
```bash
eas credentials
# Select iOS
# Choose "Set up new credentials"
# EAS will generate certificates and provisioning profiles
```

**Android:**
```bash
eas credentials
# Select Android
# Choose "Set up new keystore"
# EAS will generate and store your keystore
```

**Recommended:** Let EAS manage credentials automatically. Manual management is complex and error-prone.

---

## Build Profiles

Revelia uses three build profiles defined in `eas.json`:

### 1. Development Profile

**Purpose:** Internal testing with development client

**Features:**
- Includes Expo DevTools
- Can load from local dev server
- iOS simulator builds available
- Android APK for easy installation

**Bundle IDs:**
- iOS: `com.srcoderz99.revelia.dev`
- Android: `com.srcoderz99.revelia.dev`

**Environment:**
- `EXPO_PUBLIC_APP_ENV=development`
- `EXPO_PUBLIC_API_URL=http://localhost:3000/api`

### 2. Preview Profile

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

**Environment:**
- `EXPO_PUBLIC_APP_ENV=preview`
- API URL from `.env` or EAS secrets

### 3. Production Profile

**Purpose:** App Store and Google Play releases

**Features:**
- Optimized production build
- Auto-increment build numbers
- iOS IPA for App Store
- Android AAB for Play Store

**Bundle IDs:**
- iOS: `com.srcoderz99.revelia`
- Android: `com.srcoderz99.revelia`

**Environment:**
- `EXPO_PUBLIC_APP_ENV=production`
- Production API URL

---

## Building the App

### Development Build

**iOS Simulator:**
```bash
eas build --profile development --platform ios
```

**Android Device:**
```bash
eas build --profile development --platform android
```

**Both Platforms:**
```bash
eas build --profile development --platform all
```

**Installation:**
- iOS: Download and drag to simulator
- Android: Download APK and install on device

### Preview Build

**For TestFlight (iOS):**
```bash
eas build --profile preview --platform ios
```

**For Internal Testing (Android):**
```bash
eas build --profile preview --platform android
```

**Distribution:**
- iOS: Upload to TestFlight via `eas submit`
- Android: Share APK directly or upload to Play Console Internal Track

### Production Build

**iOS:**
```bash
eas build --profile production --platform ios
```

**Android:**
```bash
eas build --profile production --platform android
```

**Both:**
```bash
eas build --profile production --platform all
```

**Build Time:**
- iOS: ~15-20 minutes
- Android: ~10-15 minutes

**Monitoring:**
```bash
# Check build status
eas build:list

# View build logs
eas build:view [BUILD_ID]
```

---

## Testing Builds

### Development Builds

1. **Install the build:**
   - iOS: Drag IPA to simulator or use TestFlight for device
   - Android: Install APK directly

2. **Start local dev server:**
   ```bash
   cd mobile
   yarn start
   ```

3. **Connect to dev server:**
   - Shake device to open dev menu
   - Enter your local IP: `http://192.168.1.100:8081`

### Preview Builds

**iOS (TestFlight):**
1. Submit to TestFlight:
   ```bash
   eas submit --platform ios --latest
   ```
2. Add internal testers in App Store Connect
3. Testers receive email invitation
4. Install via TestFlight app

**Android (Internal Track):**
1. Upload to Play Console:
   ```bash
   eas submit --platform android --latest
   ```
2. Add internal testers (email addresses)
3. Share opt-in link
4. Testers install from Play Store

### Production Builds

Test thoroughly in preview before production:

- [ ] All features working
- [ ] API connectivity verified
- [ ] Authentication flow complete
- [ ] Image upload/download working
- [ ] In-app purchases functional (sandbox)
- [ ] Push notifications received
- [ ] No crashes or errors in Sentry
- [ ] Performance acceptable
- [ ] UI/UX polished

---

## App Store Submission

### iOS App Store

#### 1. Prepare App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com/)
2. Create new app:
   - Name: Revelia
   - Bundle ID: `com.srcoderz99.revelia`
   - SKU: `revelia-ios`
3. Fill in app information:
   - Category: Lifestyle
   - Subcategory: Entertainment
   - Content Rights: You own the rights

#### 2. Prepare Assets

**App Icon:**
- 1024x1024px PNG (no transparency)
- Upload in App Store Connect

**Screenshots:**
- iPhone 6.7" (1290x2796px): 3-10 screenshots
- iPhone 6.5" (1242x2688px): 3-10 screenshots
- iPad Pro 12.9" (2048x2732px): 3-10 screenshots

**Preview Videos (Optional):**
- 15-30 seconds
- Portrait orientation
- Show key features

#### 3. App Information

**Description:**
```
Revelia - AI-Powered Mystical Readings

Discover insights about yourself through:
• Face Reading - AI analyzes facial features
• Palm Reading - Scan your palm for insights
• Astrology - Personalized horoscopes
• Numerology - Unlock your numbers

Features:
• Instant AI-powered readings
• Save and share your readings
• Beautiful, intuitive interface
• Privacy-focused (images not stored)
• Regular updates with new features

Subscription required for unlimited readings.
```

**Keywords:**
```
face reading, palm reading, astrology, numerology, horoscope, fortune, mystical, AI, insights, personality
```

**Support URL:**
```
https://revelia.app/support
```

**Privacy Policy URL:**
```
https://revelia.app/privacy
```

#### 4. Age Rating

- Frequent/Intense: None
- Infrequent/Mild: Simulated Gambling (fortune telling)
- Age Rating: 12+

#### 5. App Privacy

Data collected:
- [ ] Contact Info (email)
- [ ] User Content (photos - face/palm images)
- [ ] Identifiers (user ID)
- [ ] Usage Data (analytics)
- [ ] Diagnostics (crash logs)

Data usage:
- Linked to user identity
- Used for app functionality
- Not used for tracking

#### 6. Submit Build

```bash
# Build production iOS
eas build --profile production --platform ios

# Submit to App Store
eas submit --platform ios --latest
```

Or manually:
1. Download IPA from EAS
2. Upload via Transporter app
3. Select build in App Store Connect
4. Submit for review

#### 7. Review Process

- Review time: 24-48 hours typically
- Be ready to respond to questions
- Common rejections:
  - Missing privacy policy
  - Subscription not clear
  - App crashes
  - Incomplete functionality

---

### Android Play Store

#### 1. Prepare Play Console

1. Go to [Google Play Console](https://play.google.com/console/)
2. Create new app:
   - App name: Revelia
   - Default language: English (US)
   - App or game: App
   - Free or paid: Free (with in-app purchases)

#### 2. Prepare Assets

**App Icon:**
- 512x512px PNG
- Upload in Play Console

**Feature Graphic:**
- 1024x500px JPG or PNG
- Required for store listing

**Screenshots:**
- Phone: 2-8 screenshots (min 320px on shortest side)
- 7-inch tablet: 2-8 screenshots
- 10-inch tablet: 2-8 screenshots

**Promo Video (Optional):**
- YouTube URL
- 30 seconds to 2 minutes

#### 3. Store Listing

**Short Description (80 chars):**
```
AI-powered face reading, palm reading, astrology, and numerology insights.
```

**Full Description (4000 chars):**
```
Revelia - AI-Powered Mystical Readings

Discover deep insights about yourself through the power of AI and ancient wisdom.

🔮 FEATURES

• Face Reading - Upload a photo and let AI analyze your facial features to reveal personality traits and life insights
• Palm Reading - Scan your palm to uncover your destiny, love life, and fortune
• Astrology - Get personalized horoscopes based on your birth chart
• Numerology - Discover the hidden meanings in your numbers

✨ WHY REVELIA?

• Instant Results - Get readings in seconds
• AI-Powered - Advanced AI provides detailed, personalized insights
• Privacy First - Your images are analyzed securely and not stored
• Beautiful Design - Intuitive, mystical interface
• Save & Share - Keep your readings and share with friends

🔒 PRIVACY & SECURITY

Your privacy matters. Face and palm images are processed securely and not permanently stored. We only keep reading results you choose to save.

💳 SUBSCRIPTION

Revelia offers a subscription for unlimited readings:
• Weekly: $4.99
• Monthly: $9.99
• Yearly: $49.99 (save 58%)

Free trial available. Cancel anytime.

🌟 START YOUR JOURNEY

Download Revelia now and unlock the mysteries of your life!
```

**Categorization:**
- App category: Lifestyle
- Tags: Entertainment, Personalization

#### 4. Content Rating

1. Complete questionnaire
2. Select "Simulated Gambling" (fortune telling)
3. Rating: ESRB Everyone 12+, PEGI 12

#### 5. App Content

**Privacy Policy:**
```
https://revelia.app/privacy
```

**Ads:**
- No ads

**In-app Purchases:**
- Yes (subscriptions)

**Target Audience:**
- Age: 18+

**Data Safety:**
- Collects: Email, photos, user ID, analytics
- Shares: None
- Encryption: In transit and at rest
- Can request deletion: Yes

#### 6. Submit Build

```bash
# Build production Android
eas build --profile production --platform android

# Submit to Play Store
eas submit --platform android --latest
```

Or manually:
1. Download AAB from EAS
2. Upload to Play Console
3. Create release in Production track
4. Submit for review

#### 7. Review Process

- Review time: Few hours to few days
- Faster than iOS typically
- Common issues:
  - Missing privacy policy
  - Permissions not justified
  - Content rating incorrect

---

## OTA Updates

Over-The-Air updates allow you to push JavaScript/asset changes without rebuilding.

### When to Use OTA

✅ **Use OTA for:**
- Bug fixes (JS only)
- UI tweaks
- Content updates
- Feature toggles
- Analytics updates

❌ **Cannot use OTA for:**
- Native code changes
- New native dependencies
- Permission changes
- App icon/splash screen
- Bundle identifier changes

### Publishing Updates

**Development Channel:**
```bash
eas update --branch development --message "Fix login bug"
```

**Preview Channel:**
```bash
eas update --branch preview --message "Update home screen UI"
```

**Production Channel:**
```bash
eas update --branch production --message "Critical bug fix"
```

### Update Strategy

1. **Test in development:**
   ```bash
   eas update --branch development
   ```

2. **Promote to preview:**
   ```bash
   eas update --branch preview
   ```

3. **Test with preview build**

4. **Deploy to production:**
   ```bash
   eas update --branch production
   ```

### Rollback

If an update causes issues:

```bash
# List updates
eas update:list --branch production

# Rollback to previous
eas update:republish --group [GROUP_ID]
```

### Update Policies

Configure in `app.json`:

```json
{
  "expo": {
    "updates": {
      "enabled": true,
      "checkAutomatically": "ON_LOAD",
      "fallbackToCacheTimeout": 0
    }
  }
}
```

---

## Troubleshooting

### Build Failures

**Error: "No valid iOS distribution certificate"**
```bash
# Reset credentials
eas credentials
# Select iOS > Remove all credentials
# Build again - EAS will generate new ones
```

**Error: "Android build failed: Gradle error"**
- Check `android/build.gradle` for syntax errors
- Verify all dependencies are compatible
- Clear cache: `eas build --clear-cache`

**Error: "Out of memory"**
- Reduce image sizes in assets
- Remove unused dependencies
- Optimize bundle size

### Submission Failures

**iOS: "Missing compliance"**
- Answer export compliance questions in App Store Connect
- Most apps: "No" to encryption (unless you added custom encryption)

**iOS: "Invalid bundle"**
- Ensure bundle ID matches App Store Connect
- Check provisioning profile is valid
- Verify app version is incremented

**Android: "Upload failed"**
- Ensure version code is incremented
- Check AAB is signed correctly
- Verify package name matches Play Console

### Runtime Issues

**App crashes on launch:**
- Check Sentry for error logs
- Verify environment variables are set
- Test API connectivity
- Check native dependencies are linked

**OTA updates not applying:**
- Verify runtime version matches
- Check update channel configuration
- Ensure app is connected to internet
- Force close and reopen app

**Images not loading:**
- Check Cloudflare R2 configuration
- Verify CORS settings
- Test image URLs directly
- Check network permissions

---

## CI/CD with GitHub Actions

Automate builds with GitHub Actions:

```yaml
# .github/workflows/eas-build.yml
name: EAS Build

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - name: Setup Expo
        uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      
      - name: Install dependencies
        run: cd mobile && yarn install
      
      - name: Build preview
        run: cd mobile && eas build --profile preview --platform all --non-interactive
```

---

## Best Practices

### Version Management

1. **Semantic Versioning:**
   - Major: Breaking changes (2.0.0)
   - Minor: New features (1.1.0)
   - Patch: Bug fixes (1.0.1)

2. **Build Numbers:**
   - Auto-increment in production
   - Manual for preview/development

3. **Update Strategy:**
   - OTA for minor fixes
   - New build for features
   - Force update for critical fixes

### Testing Checklist

Before production release:

- [ ] All features tested on iOS
- [ ] All features tested on Android
- [ ] Tested on multiple device sizes
- [ ] Tested on iOS 14+ and Android 10+
- [ ] Authentication flow complete
- [ ] In-app purchases working (sandbox)
- [ ] Push notifications received
- [ ] Image upload/download working
- [ ] Offline mode graceful
- [ ] Error handling tested
- [ ] Performance acceptable (< 3s load time)
- [ ] No memory leaks
- [ ] Battery usage reasonable
- [ ] Accessibility tested
- [ ] Privacy policy linked
- [ ] Terms of service linked

### Release Process

1. **Code freeze** - No new features
2. **Build preview** - Test internally
3. **Fix critical bugs** - OTA or new build
4. **Build production** - Final build
5. **Submit to stores** - iOS and Android
6. **Monitor** - Watch Sentry for errors
7. **Respond to reviews** - Address user feedback
8. **Plan next release** - Iterate

---

## Resources

- [EAS Documentation](https://docs.expo.dev/eas/)
- [EAS Build](https://docs.expo.dev/build/introduction/)
- [EAS Submit](https://docs.expo.dev/submit/introduction/)
- [EAS Update](https://docs.expo.dev/eas-update/introduction/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Policy](https://play.google.com/about/developer-content-policy/)

---

**Last Updated:** 2025-01-XX  
**Revelia Version:** 1.0.0
