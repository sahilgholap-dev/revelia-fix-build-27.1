# Revelia Production Deployment Guide

## Overview

This guide walks you through deploying Revelia to production, including backend deployment to Railway, mobile app builds with Expo EAS, and app store submission preparation.

**Timeline:** 2-3 days for complete deployment

---

## Prerequisites Checklist

### Required Accounts

- [ ] **Apple Developer Account** ($99/year)
  - Sign up: https://developer.apple.com
  - Required for: iOS app submission, Apple Sign In
  - Setup time: 1-2 days (account approval)

- [ ] **Google Play Developer Account** ($25 one-time)
  - Sign up: https://play.google.com/console
  - Required for: Android app submission
  - Setup time: 1-2 days (account approval)

- [ ] **Railway Account** (Free tier available)
  - Sign up: https://railway.app
  - Required for: Backend hosting
  - Setup time: 5 minutes

- [ ] **MongoDB Atlas** (Free tier available)
  - Sign up: https://www.mongodb.com/cloud/atlas
  - Required for: Database
  - Setup time: 10 minutes

- [ ] **Cloudflare Account** (Free tier available)
  - Sign up: https://cloudflare.com
  - Required for: R2 image storage, CDN
  - Setup time: 10 minutes

- [ ] **RevenueCat Account** (Free up to $10k MRR)
  - Sign up: https://www.revenuecat.com
  - Required for: Subscription management
  - Setup time: 15 minutes

- [ ] **OneSignal Account** (Free tier available)
  - Sign up: https://onesignal.com
  - Required for: Push notifications
  - Setup time: 10 minutes

- [ ] **Anthropic Account** (Pay-as-you-go)
  - Sign up: https://console.anthropic.com
  - Required for: Claude API (reading generation)
  - Setup time: 5 minutes

- [ ] **Sentry Account** (Free tier available)
  - Sign up: https://sentry.io
  - Required for: Error monitoring
  - Setup time: 10 minutes

- [ ] **Expo Account** (Free)
  - Sign up: https://expo.dev
  - Required for: EAS builds
  - Setup time: 5 minutes

### Domain & Payment

- [ ] **Domain purchased** (revelia.app or your choice)
  - Recommended: Namecheap, Google Domains, Cloudflare
  - Cost: $10-15/year

- [ ] **Payment method configured** for all paid services

---

## Part A: MongoDB Atlas Setup

**Time:** 15 minutes

### Step 1: Create Cluster

1. Go to https://cloud.mongodb.com
2. Click **"Build a Database"**
3. Choose **M0 (Free)** tier
4. Select region closest to your Railway deployment (e.g., US East)
5. Name cluster: `revelia-production`
6. Click **"Create"**

### Step 2: Create Database User

1. Go to **Database Access** → **Add New Database User**
2. Authentication: **Password**
3. Username: `revelia-api`
4. Password: Generate strong password (save it!)
5. Database User Privileges: **Read and write to any database**
6. Click **"Add User"**

### Step 3: Configure Network Access

1. Go to **Network Access** → **Add IP Address**
2. Click **"Allow Access from Anywhere"** (0.0.0.0/0)
   - Railway uses dynamic IPs, so we need to allow all
   - MongoDB Atlas has built-in security, this is safe
3. Click **"Confirm"**

### Step 4: Get Connection String

1. Go to **Database** → **Connect** → **Connect your application**
2. Driver: **Node.js**
3. Copy connection string:
   ```
   mongodb+srv://revelia-api:<password>@revelia-production.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
4. Replace `<password>` with your database user password
5. Add database name before `?`:
   ```
   mongodb+srv://revelia-api:PASSWORD@revelia-production.xxxxx.mongodb.net/revelia?retryWrites=true&w=majority
   ```
6. **Save this connection string** - you'll need it for Railway

### Step 5: Test Connection (Optional)

```bash
cd /app/server
MONGODB_URI="your-connection-string" npm run dev
```

Should see: `✅ MongoDB connected`

---

## Part B: Cloudflare R2 Setup

**Time:** 15 minutes

### Step 1: Create R2 Bucket

1. Go to Cloudflare Dashboard → **R2**
2. Click **"Create bucket"**
3. Bucket name: `revelia-images`
4. Location: **Automatic** (or choose region)
5. Click **"Create bucket"**

### Step 2: Configure Public Access (Option 1: Public Bucket)

1. Go to bucket settings
2. Enable **"Public access"**
3. Note the public URL: `https://pub-xxxxx.r2.dev`
4. This URL will be your `R2_PUBLIC_URL`

**OR**

### Step 2: Configure Custom Domain (Option 2: Custom Domain)

1. Go to bucket → **Settings** → **Custom Domains**
2. Add domain: `images.revelia.app`
3. Add CNAME record in your DNS:
   ```
   images.revelia.app → revelia-images.r2.cloudflarestorage.com
   ```
4. Wait for DNS propagation (5-30 minutes)
5. Your `R2_PUBLIC_URL` will be: `https://images.revelia.app`

### Step 3: Generate API Tokens

1. Go to **R2** → **Manage R2 API Tokens**
2. Click **"Create API token"**
3. Token name: `revelia-backend`
4. Permissions: **Object Read & Write**
5. Bucket: `revelia-images`
6. Click **"Create API Token"**
7. **Save these values:**
   - Access Key ID: `R2_ACCESS_KEY_ID`
   - Secret Access Key: `R2_SECRET_ACCESS_KEY`
   - Account ID: `R2_ACCOUNT_ID` (shown in R2 dashboard)

### Step 4: Test Upload (Optional)

```bash
cd /app/server

# Set environment variables
export R2_ACCOUNT_ID="your-account-id"
export R2_ACCESS_KEY_ID="your-access-key"
export R2_SECRET_ACCESS_KEY="your-secret-key"
export R2_BUCKET_NAME="revelia-images"
export R2_PUBLIC_URL="https://pub-xxxxx.r2.dev"

# Test upload
curl -X POST http://localhost:8001/api/upload/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "image=@test-image.jpg"
```

---

## Part C: Backend Deployment to Railway

**Time:** 30 minutes

### Step 1: Create Railway Project

1. Go to https://railway.app
2. Click **"New Project"**
3. Choose **"Deploy from GitHub repo"**
4. Connect your GitHub account
5. Select your Revelia repository
6. Railway will auto-detect Node.js

### Step 2: Configure Build Settings

1. Go to project → **Settings**
2. **Root Directory:** `server`
3. **Build Command:** `npm install && npm run build`
4. **Start Command:** `npm start`
5. **Node Version:** `20.x`

### Step 3: Set Environment Variables

1. Go to project → **Variables**
2. Click **"New Variable"** and add each:

```bash
# Core
NODE_ENV=production
PORT=8001
JWT_SECRET=<GENERATE_RANDOM_64_CHAR_STRING>
CORS_ORIGIN=https://revelia.app,https://www.revelia.app

# MongoDB
MONGODB_URI=<YOUR_MONGODB_ATLAS_CONNECTION_STRING>

# Claude API
ANTHROPIC_API_KEY=<YOUR_ANTHROPIC_API_KEY>

# Cloudflare R2
R2_ACCOUNT_ID=<YOUR_R2_ACCOUNT_ID>
R2_ACCESS_KEY_ID=<YOUR_R2_ACCESS_KEY_ID>
R2_SECRET_ACCESS_KEY=<YOUR_R2_SECRET_ACCESS_KEY>
R2_BUCKET_NAME=revelia-images
R2_PUBLIC_URL=<YOUR_R2_PUBLIC_URL>

# RevenueCat
REVENUECAT_API_KEY=<YOUR_REVENUECAT_API_KEY>
REVENUECAT_WEBHOOK_SECRET=<GENERATE_RANDOM_32_CHAR_STRING>

# OneSignal
ONESIGNAL_APP_ID=<YOUR_ONESIGNAL_APP_ID>
ONESIGNAL_REST_API_KEY=<YOUR_ONESIGNAL_REST_API_KEY>

# Internal API (for cron jobs)
INTERNAL_API_KEY=<GENERATE_RANDOM_32_CHAR_STRING>
```

**Generate Random Secrets:**
```bash
# JWT_SECRET (64 characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# REVENUECAT_WEBHOOK_SECRET (32 characters)
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"

# INTERNAL_API_KEY (32 characters)
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

### Step 4: Deploy

1. Railway will automatically deploy after setting variables
2. Wait for deployment (2-5 minutes)
3. Check logs for errors
4. Look for: `✅ MongoDB connected` and `🚀 Server running on port 8001`

### Step 5: Configure Custom Domain

1. Go to project → **Settings** → **Domains**
2. Click **"Generate Domain"** (Railway provides free subdomain)
3. Note the URL: `revelia-production.up.railway.app`
4. **OR** add custom domain:
   - Click **"Custom Domain"**
   - Enter: `api.revelia.app`
   - Add CNAME record in your DNS:
     ```
     api.revelia.app → revelia-production.up.railway.app
     ```
   - Wait for DNS propagation (5-30 minutes)

### Step 6: Verify Deployment

```bash
# Test health endpoint
curl https://api.revelia.app/api/health

# Expected response:
{
  "success": true,
  "message": "Revelia API running",
  "data": {
    "timestamp": "2026-01-31T...",
    "uptime": 123.45,
    "environment": "production",
    "database": "connected",
    "services": {
      "claudeAPI": true,
      "r2Storage": true,
      "revenueCat": true,
      "oneSignal": true,
      "internalAPI": true
    }
  }
}
```

### Step 7: Test All Endpoints

```bash
# Test signup
curl -X POST https://api.revelia.app/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123456!",
    "name": "Test User"
  }'

# Test login
curl -X POST https://api.revelia.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123456!"
  }'

# Save the JWT token from response
TOKEN="<jwt-token-from-login>"

# Test profile
curl https://api.revelia.app/api/profile \
  -H "Authorization: Bearer $TOKEN"
```

### Step 8: Configure Auto-Deploy

1. Go to project → **Settings** → **Deployments**
2. Enable **"Auto-deploy on push"**
3. Branch: `main`
4. Now every push to `main` will auto-deploy

---

## Part D: Mobile App Build (Expo EAS)

**Time:** 1-2 hours (build time)

### Step 1: Install EAS CLI

```bash
npm install -g eas-cli
```

### Step 2: Login to Expo

```bash
eas login
# Enter your Expo credentials
```

### Step 3: Configure EAS Project

```bash
cd /app/mobile
eas build:configure
```

This will:
- Create/update `eas.json`
- Generate project ID
- Update `app.json` with project ID

### Step 4: Update Environment Variables

Edit `/app/mobile/eas.json` and update API URLs:

```json
{
  "build": {
    "development": {
      "env": {
        "EXPO_PUBLIC_API_URL": "http://localhost:8001/api"
      }
    },
    "preview": {
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api.revelia.app/api"
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api.revelia.app/api"
      }
    }
  }
}
```

### Step 5: Build Preview (Testing)

```bash
# Build iOS preview
eas build --platform ios --profile preview

# Build Android preview
eas build --platform android --profile preview
```

**What happens:**
- EAS builds your app in the cloud
- iOS: Creates IPA file for TestFlight
- Android: Creates APK file for internal testing
- Build time: 15-30 minutes per platform

**Download and test:**
1. EAS will provide download links
2. Install on physical devices
3. Test all features:
   - Signup/login
   - Face/palm capture
   - Reading generation
   - Subscriptions
   - Push notifications

### Step 6: Build Production

**Only after preview testing is complete!**

```bash
# Build both platforms
eas build --platform all --profile production

# OR build separately
eas build --platform ios --profile production
eas build --platform android --profile production
```

**What happens:**
- iOS: Creates IPA for App Store submission
- Android: Creates AAB (Android App Bundle) for Play Store
- Build time: 15-30 minutes per platform

### Step 7: Download Builds

```bash
# List builds
eas build:list

# Download specific build
eas build:download --id <build-id>
```

---

## Part E: App Store Connect Submission (iOS)

**Time:** 2-3 hours (initial setup), 1-7 days (review)

### Step 1: Create App Record

1. Go to https://appstoreconnect.apple.com
2. Click **"My Apps"** → **"+"** → **"New App"**
3. Fill in:
   - **Platform:** iOS
   - **Name:** Revelia
   - **Primary Language:** English (U.S.)
   - **Bundle ID:** `com.revelia.app` (must match app.json)
   - **SKU:** `revelia-ios-001`
   - **User Access:** Full Access
4. Click **"Create"**

### Step 2: Fill App Information

1. Go to **App Information**
2. Fill in:
   - **Subtitle:** AI Face & Palm Readings
   - **Category:** Lifestyle (Primary), Entertainment (Secondary)
   - **Content Rights:** Check if you have rights
   - **Age Rating:** Click **"Edit"**
     - Unrestricted Web Access: No
     - Simulated Gambling: No
     - Contests: No
     - All others: No
     - **Result:** 12+ (due to mystical content)

### Step 3: Configure Pricing & Availability

1. Go to **Pricing and Availability**
2. **Price:** Free (with in-app purchases)
3. **Availability:** All countries
4. Click **"Save"**

### Step 4: Configure In-App Purchases (Subscriptions)

1. Go to **In-App Purchases** → **"+"**
2. Create 4 subscriptions:

**Weekly Subscription:**
- Product ID: `revelia_weekly`
- Reference Name: Weekly Premium
- Subscription Group: Revelia Premium
- Subscription Duration: 1 Week
- Price: $7.99
- Free Trial: 7 days
- Localized Description: "Unlock unlimited readings, daily insights, and premium features"

**Monthly Subscription:**
- Product ID: `revelia_monthly`
- Reference Name: Monthly Premium
- Subscription Group: Revelia Premium
- Subscription Duration: 1 Month
- Price: $14.99
- Free Trial: 7 days
- Localized Description: "Unlock unlimited readings, daily insights, and premium features"

**Yearly Subscription:**
- Product ID: `revelia_yearly`
- Reference Name: Yearly Premium
- Subscription Group: Revelia Premium
- Subscription Duration: 1 Year
- Price: $59.99
- Free Trial: 7 days
- Localized Description: "Unlock unlimited readings, daily insights, and premium features. Best value!"

**Lifetime Purchase:**
- Product ID: `revelia_lifetime`
- Type: Non-Consumable
- Reference Name: Lifetime Premium
- Price: $99.99
- Localized Description: "One-time payment for lifetime access to all premium features"

### Step 5: Upload Screenshots

See `/app/docs/SCREENSHOTS.md` for detailed specifications.

**Required sizes:**
- 6.7" (iPhone 14 Pro Max): 1290 x 2796 pixels (6 screenshots)
- 6.5" (iPhone 11 Pro Max): 1242 x 2688 pixels (6 screenshots)
- 12.9" iPad Pro: 2048 x 2732 pixels (6 screenshots)

**Screenshot order:**
1. Hero screen (onboarding/home)
2. Face reading result
3. Palm reading result
4. Daily insights
5. Compatibility reading
6. Monthly forecast

### Step 6: Fill App Store Metadata

1. Go to **App Store** → **1.0 Prepare for Submission**
2. Fill in:

**App Previews and Screenshots:**
- Upload screenshots (from Step 5)

**Promotional Text:**
```
Discover your destiny through AI-powered face and palm readings. Get personalized insights, daily guidance, and compatibility analysis.
```

**Description:**
```
Revelia uses advanced AI to provide personalized face and palm readings, offering insights into your personality, future, and relationships.

✨ FEATURES:
• Face Reading: Analyze facial features for personality insights
• Palm Reading: Discover your life path through palm analysis
• Daily Insights: Personalized guidance every day
• Weekly Forecasts: Plan your week with cosmic wisdom
• Monthly Readings: Deep dive into upcoming opportunities
• Compatibility: Find your perfect match
• Birth Chart: Astrology and numerology insights

🔮 PREMIUM BENEFITS:
• Unlimited readings
• Daily personalized insights
• Weekly and monthly forecasts
• Compatibility analysis
• Ad-free experience
• Priority support

📱 HOW IT WORKS:
1. Sign up with email or social login
2. Enter your birth details
3. Capture face and palm photos
4. Receive AI-generated readings
5. Get daily insights and forecasts

🎁 FREE TRIAL:
Try Premium free for 7 days. Cancel anytime.

⚠️ ENTERTAINMENT DISCLAIMER:
Revelia readings are for entertainment and self-reflection purposes only. Not a substitute for professional advice.

💎 SUBSCRIPTION PRICING:
• Weekly: $7.99/week
• Monthly: $14.99/month (save 25%)
• Yearly: $59.99/year (save 60%)
• Lifetime: $99.99 one-time

Payment charged to Apple ID at confirmation. Auto-renews unless canceled 24 hours before period ends. Manage in Account Settings.

Privacy Policy: https://revelia.app/privacy
Terms of Service: https://revelia.app/terms
```

**Keywords:**
```
face reading,palm reading,astrology,numerology,fortune,destiny,compatibility,horoscope,tarot,psychic,spiritual,mystical,ai readings
```

**Support URL:** `https://revelia.app/support`

**Marketing URL:** `https://revelia.app`

**Privacy Policy URL:** `https://revelia.app/privacy`

**What's New in This Version:**
```
Welcome to Revelia 1.0!

✨ Initial release featuring:
• AI-powered face and palm readings
• Daily personalized insights
• Weekly and monthly forecasts
• Compatibility analysis
• Birth chart and numerology
• 7-day free trial for Premium

Start your journey of self-discovery today!
```

### Step 7: Upload Build

1. Go to **Build** section
2. Click **"+"** next to **iOS App**
3. Select the build uploaded via EAS
4. Click **"Done"**

**OR upload manually:**
```bash
eas submit --platform ios --profile production
```

### Step 8: Configure App Privacy

1. Go to **App Privacy**
2. Click **"Get Started"**
3. Answer questions:

**Do you collect data from this app?** Yes

**Data Types Collected:**
- Contact Info: Email Address, Name
- User Content: Photos (face/palm images)
- Identifiers: User ID
- Usage Data: Product Interaction
- Diagnostics: Crash Data

**For each data type:**
- **Linked to User:** Yes
- **Used for Tracking:** No
- **Purpose:** App Functionality, Analytics

**Biometric Data Disclosure:**
- Face photos are collected for reading generation
- Palm photos are collected for reading generation
- Photos are processed by AI and stored securely
- Users can delete their data anytime

### Step 9: Submit for Review

1. Go to **App Review Information**
2. Fill in:
   - **Sign-in required:** Yes
   - **Demo account:**
     - Email: `demo@revelia.app`
     - Password: `Demo123456!`
   - **Notes:**
     ```
     Revelia is an AI-powered face and palm reading app for entertainment.
     
     To test:
     1. Login with demo account
     2. View existing readings on home screen
     3. Tap "New Reading" to generate (requires camera permission)
     4. Subscription features can be tested via sandbox
     
     Camera permission is required for face/palm capture.
     Photos are processed by Claude AI for reading generation.
     All readings are for entertainment purposes only.
     ```

3. Click **"Add for Review"**
4. Click **"Submit to App Review"**

### Step 10: Wait for Review

- **Review time:** 1-7 days (usually 24-48 hours)
- **Status:** Check App Store Connect for updates
- **Rejection:** Address issues and resubmit
- **Approval:** App goes live automatically (or on date you set)

---

## Part F: Google Play Console Submission (Android)

**Time:** 2-3 hours (initial setup), 1-7 days (review)

### Step 1: Create App

1. Go to https://play.google.com/console
2. Click **"Create app"**
3. Fill in:
   - **App name:** Revelia
   - **Default language:** English (United States)
   - **App or game:** App
   - **Free or paid:** Free
   - **Declarations:** Check all boxes
4. Click **"Create app"**

### Step 2: Set Up Store Listing

1. Go to **Store presence** → **Main store listing**
2. Fill in:

**App name:** Revelia

**Short description:**
```
AI-powered face and palm readings. Discover your destiny with personalized insights and forecasts.
```

**Full description:**
```
Revelia uses advanced AI to provide personalized face and palm readings, offering insights into your personality, future, and relationships.

✨ FEATURES:
• Face Reading: Analyze facial features for personality insights
• Palm Reading: Discover your life path through palm analysis
• Daily Insights: Personalized guidance every day
• Weekly Forecasts: Plan your week with cosmic wisdom
• Monthly Readings: Deep dive into upcoming opportunities
• Compatibility: Find your perfect match
• Birth Chart: Astrology and numerology insights

🔮 PREMIUM BENEFITS:
• Unlimited readings
• Daily personalized insights
• Weekly and monthly forecasts
• Compatibility analysis
• Ad-free experience
• Priority support

📱 HOW IT WORKS:
1. Sign up with email or social login
2. Enter your birth details
3. Capture face and palm photos
4. Receive AI-generated readings
5. Get daily insights and forecasts

🎁 FREE TRIAL:
Try Premium free for 7 days. Cancel anytime.

⚠️ ENTERTAINMENT DISCLAIMER:
Revelia readings are for entertainment and self-reflection purposes only. Not a substitute for professional advice.

💎 SUBSCRIPTION PRICING:
• Weekly: $7.99/week
• Monthly: $14.99/month (save 25%)
• Yearly: $59.99/year (save 60%)
• Lifetime: $99.99 one-time

Payment charged to Google Play at confirmation. Auto-renews unless canceled 24 hours before period ends. Manage in Play Store settings.

Privacy Policy: https://revelia.app/privacy
Terms of Service: https://revelia.app/terms
```

**App icon:** Upload 512x512 PNG

**Feature graphic:** Upload 1024x500 PNG

**Phone screenshots:** Upload 6 screenshots (1080x1920 or 1080x2340)
- Same content as iOS screenshots

**Tablet screenshots:** Upload 6 screenshots (1200x1920 or 1600x2560)

**Category:** Lifestyle

**Tags:** Astrology, Personalization, Entertainment

**Contact details:**
- Email: support@revelia.app
- Website: https://revelia.app
- Privacy policy: https://revelia.app/privacy

### Step 3: Configure In-App Products

1. Go to **Monetize** → **In-app products** → **Subscriptions**
2. Click **"Create subscription"**
3. Create 4 subscriptions (same as iOS):

**Weekly:**
- Product ID: `revelia_weekly`
- Name: Weekly Premium
- Description: Unlock unlimited readings and premium features
- Billing period: 1 week
- Price: $7.99
- Free trial: 7 days

**Monthly:**
- Product ID: `revelia_monthly`
- Name: Monthly Premium
- Description: Unlock unlimited readings and premium features
- Billing period: 1 month
- Price: $14.99
- Free trial: 7 days

**Yearly:**
- Product ID: `revelia_yearly`
- Name: Yearly Premium
- Description: Unlock unlimited readings and premium features. Best value!
- Billing period: 1 year
- Price: $59.99
- Free trial: 7 days

**Lifetime:**
- Go to **In-app products** (not subscriptions)
- Product ID: `revelia_lifetime`
- Name: Lifetime Premium
- Description: One-time payment for lifetime access
- Price: $99.99

### Step 4: Complete Content Rating

1. Go to **Policy** → **App content** → **Content rating**
2. Click **"Start questionnaire"**
3. Select **"IARC questionnaire"**
4. Answer questions:
   - Violence: No
   - Sexuality: No
   - Language: No
   - Controlled Substances: No
   - Gambling: No
   - **Miscellaneous:** Yes (mystical/occult content)
5. **Result:** ESRB: Teen (13+), PEGI: 12

### Step 5: Complete Data Safety

1. Go to **Policy** → **App content** → **Data safety**
2. Click **"Start"**
3. Answer questions:

**Does your app collect or share user data?** Yes

**Data types collected:**
- Personal info: Name, Email address
- Photos: User-generated photos (face/palm)
- App activity: App interactions
- App info and performance: Crash logs

**For each data type:**
- **Collected:** Yes
- **Shared:** No
- **Optional:** No (required for app functionality)
- **Purpose:** App functionality, Analytics
- **Encrypted in transit:** Yes
- **Can users request deletion:** Yes

**Biometric data disclosure:**
- Face and palm photos are collected
- Used for AI reading generation
- Stored securely in Cloudflare R2
- Users can delete anytime via app settings

### Step 6: Upload App Bundle

1. Go to **Release** → **Production** → **Create new release**
2. Upload AAB file:
   - Click **"Upload"**
   - Select AAB file from EAS build
   - OR use EAS submit:
     ```bash
     eas submit --platform android --profile production
     ```
3. Fill in **Release notes:**
   ```
   Welcome to Revelia 1.0!
   
   ✨ Initial release featuring:
   • AI-powered face and palm readings
   • Daily personalized insights
   • Weekly and monthly forecasts
   • Compatibility analysis
   • Birth chart and numerology
   • 7-day free trial for Premium
   
   Start your journey of self-discovery today!
   ```

### Step 7: Review and Rollout

1. Review all sections (must be complete)
2. Click **"Review release"**
3. Choose rollout:
   - **Internal testing:** Test with up to 100 users
   - **Closed testing:** Test with specific users
   - **Open testing:** Public beta
   - **Production:** Full release
4. For first release, start with **Internal testing**
5. Click **"Start rollout to Internal testing"**

### Step 8: Promote to Production

After testing:
1. Go to **Internal testing** → **Promote release**
2. Choose **Production**
3. Click **"Start rollout to Production"**
4. Choose percentage (start with 20%, increase gradually)

### Step 9: Wait for Review

- **Review time:** 1-7 days
- **Status:** Check Play Console for updates
- **Rejection:** Address issues and resubmit
- **Approval:** App goes live

---

## Part G: Post-Deployment Verification

**Time:** 1 hour

### Backend Health Check

```bash
# Check health endpoint
curl https://api.revelia.app/api/health

# Verify all services are "true"
```

### Complete User Journey Test

**Test on production app:**

1. **Install app** from TestFlight/Internal Testing
2. **Signup** with new email
3. **Enter birth data** (name, DOB, location)
4. **Capture face photo**
5. **Capture palm photo**
6. **Generate face reading** (verify Claude API works)
7. **Generate palm reading**
8. **View combined profile**
9. **Check daily insight** (should generate)
10. **Test subscription:**
    - Tap paywall
    - Start free trial
    - Verify premium unlocked
11. **Test push notification:**
    - Enable notifications
    - Wait for daily insight notification
12. **Test compatibility:**
    - Enter partner details
    - Generate compatibility reading
13. **Test sharing:**
    - Share a reading
    - Verify share sheet works
14. **Test account deletion:**
    - Go to Settings → Delete Account
    - Verify data is deleted

### Monitor Errors

**Sentry (if configured):**
1. Go to Sentry dashboard
2. Check for errors in last 24 hours
3. Address any critical issues

**Railway Logs:**
```bash
# View logs in Railway dashboard
# Look for:
# - 500 errors
# - Database connection issues
# - Claude API failures
# - Rate limit violations
```

### Monitor Costs

**Claude API:**
- Check Anthropic console for usage
- Expected: $0.03 per reading
- Monitor for unexpected spikes

**MongoDB Atlas:**
- Check cluster metrics
- Free tier: 512 MB storage
- Upgrade if needed

**Cloudflare R2:**
- Check storage usage
- Free tier: 10 GB storage, 10M reads/month

**Railway:**
- Check usage dashboard
- Free tier: $5 credit/month
- Upgrade to Pro if needed ($20/month)

---

## Part H: RevenueCat Configuration

**Time:** 30 minutes

### Step 1: Create Project

1. Go to https://app.revenuecat.com
2. Click **"Create new project"**
3. Name: `Revelia`
4. Click **"Create"**

### Step 2: Configure iOS

1. Go to **Project Settings** → **Apps**
2. Click **"+ New"** → **iOS**
3. Fill in:
   - **App name:** Revelia iOS
   - **Bundle ID:** `com.revelia.app`
   - **Shared Secret:** Get from App Store Connect
     - Go to App Store Connect → My Apps → Revelia → App Information
     - Scroll to **App-Specific Shared Secret**
     - Click **"Generate"** and copy
4. Click **"Save"**

### Step 3: Configure Android

1. Click **"+ New"** → **Android**
2. Fill in:
   - **App name:** Revelia Android
   - **Package name:** `com.revelia.app`
   - **Service Account JSON:** Upload from Google Play Console
     - Go to Play Console → Setup → API access
     - Create service account
     - Download JSON key
3. Click **"Save"**

### Step 4: Create Entitlements

1. Go to **Entitlements**
2. Click **"+ New"**
3. Create entitlement:
   - **Identifier:** `premium`
   - **Display name:** Premium Access
4. Click **"Save"**

### Step 5: Create Products

1. Go to **Products**
2. Click **"+ New"**
3. Create 4 products (match App Store/Play Store):

**Weekly:**
- Identifier: `revelia_weekly`
- Type: Subscription
- Duration: 1 week
- Entitlements: premium

**Monthly:**
- Identifier: `revelia_monthly`
- Type: Subscription
- Duration: 1 month
- Entitlements: premium

**Yearly:**
- Identifier: `revelia_yearly`
- Type: Subscription
- Duration: 1 year
- Entitlements: premium

**Lifetime:**
- Identifier: `revelia_lifetime`
- Type: Non-consumable
- Entitlements: premium

### Step 6: Create Offerings

1. Go to **Offerings**
2. Click **"+ New"**
3. Create offering:
   - **Identifier:** `default`
   - **Display name:** Premium Subscription
   - **Packages:**
     - Weekly: `revelia_weekly`
     - Monthly: `revelia_monthly`
     - Yearly: `revelia_yearly`
     - Lifetime: `revelia_lifetime`
4. Click **"Save"**
5. Set as **Current Offering**

### Step 7: Configure Webhooks

1. Go to **Integrations** → **Webhooks**
2. Click **"+ Add"**
3. Fill in:
   - **URL:** `https://api.revelia.app/api/webhooks/revenuecat`
   - **Authorization:** Bearer `<REVENUECAT_WEBHOOK_SECRET>`
4. Click **"Add"**

### Step 8: Get API Keys

1. Go to **Project Settings** → **API Keys**
2. Copy **Public API Key** (for mobile app)
3. Copy **Secret API Key** (for backend)
4. Add to Railway environment variables:
   ```
   REVENUECAT_API_KEY=<secret-api-key>
   ```
5. Add to mobile app:
   - iOS: `RevenueCat.configure(apiKey: "<public-api-key>")`
   - Android: Same key

---

## Part I: OneSignal Configuration

**Time:** 20 minutes

### Step 1: Create App

1. Go to https://onesignal.com
2. Click **"New App/Website"**
3. Name: `Revelia`
4. Click **"Create"**

### Step 2: Configure iOS

1. Select **Apple iOS (APNs)**
2. Upload APNs certificate:
   - Go to Apple Developer → Certificates
   - Create **Apple Push Notification service SSL (Production)**
   - Download and upload to OneSignal
3. Click **"Save"**

### Step 3: Configure Android

1. Select **Google Android (FCM)**
2. Enter **Firebase Server Key:**
   - Go to Firebase Console → Project Settings → Cloud Messaging
   - Copy **Server Key**
   - Paste in OneSignal
3. Click **"Save"**

### Step 4: Get App ID and API Key

1. Go to **Settings** → **Keys & IDs**
2. Copy:
   - **OneSignal App ID:** `ONESIGNAL_APP_ID`
   - **REST API Key:** `ONESIGNAL_REST_API_KEY`
3. Add to Railway environment variables
4. Add to mobile app:
   ```typescript
   OneSignal.initialize("<ONESIGNAL_APP_ID>");
   ```

### Step 5: Test Notification

1. Install app on device
2. Accept notification permission
3. Go to OneSignal → **Messages** → **New Push**
4. Send test notification
5. Verify received on device

---

## Part J: Sentry Configuration

**Time:** 15 minutes

### Step 1: Create Projects

1. Go to https://sentry.io
2. Create **2 projects:**
   - **Revelia Backend** (Node.js)
   - **Revelia Mobile** (React Native)

### Step 2: Configure Backend

1. Go to **Revelia Backend** → **Settings** → **Client Keys (DSN)**
2. Copy DSN
3. Add to Railway:
   ```
   SENTRY_DSN=<backend-dsn>
   ```
4. Backend already configured in code

### Step 3: Configure Mobile

1. Go to **Revelia Mobile** → **Settings** → **Client Keys (DSN)**
2. Copy DSN
3. Add to mobile app:
   ```typescript
   Sentry.init({
     dsn: "<mobile-dsn>",
     environment: "production"
   });
   ```

### Step 4: Test Error Tracking

```bash
# Backend
curl https://api.revelia.app/api/test-error

# Mobile
# Trigger error in app
# Check Sentry dashboard
```

---

## Troubleshooting

### Backend Not Responding

**Symptom:** API returns 502/503

**Solutions:**
1. Check Railway logs for errors
2. Verify MongoDB connection string
3. Check environment variables
4. Restart Railway service

### Mobile Build Failing

**Symptom:** EAS build fails

**Solutions:**
1. Check build logs: `eas build:list`
2. Verify `app.json` and `eas.json` are valid
3. Check for missing dependencies
4. Clear cache: `eas build --clear-cache`

### Subscriptions Not Working

**Symptom:** Purchase fails or not recognized

**Solutions:**
1. Verify RevenueCat configuration
2. Check product IDs match exactly
3. Test in sandbox mode first
4. Check RevenueCat dashboard for errors

### Push Notifications Not Received

**Symptom:** Notifications not showing

**Solutions:**
1. Verify OneSignal configuration
2. Check device has permission enabled
3. Test with OneSignal dashboard
4. Check APNs/FCM certificates

### Images Not Uploading

**Symptom:** Upload fails or images not accessible

**Solutions:**
1. Verify R2 credentials
2. Check bucket permissions
3. Test R2 upload manually
4. Check CORS configuration

---

## Cost Estimates

### Monthly Costs (1000 active users)

**Infrastructure:**
- Railway: $20/month (Pro plan)
- MongoDB Atlas: $0 (free tier) or $57/month (M10)
- Cloudflare R2: $0 (free tier) or ~$5/month
- Domain: $1/month (amortized)

**Services:**
- Claude API: ~$900/month (30k readings @ $0.03 each)
- RevenueCat: $0 (free up to $10k MRR)
- OneSignal: $0 (free tier)
- Sentry: $0 (free tier) or $26/month

**App Stores:**
- Apple Developer: $99/year ($8.25/month)
- Google Play: $25 one-time ($0/month after first year)

**Total: ~$960/month** (mostly Claude API)

**Revenue (10% conversion to $14.99/month):**
- 100 paying users × $14.99 = $1,499/month
- **Profit: $539/month**

### Scaling Costs

**10,000 active users:**
- Infrastructure: $100/month
- Claude API: $9,000/month
- Total: ~$9,100/month
- Revenue (10% conversion): $14,990/month
- **Profit: $5,890/month**

---

## Next Steps After Deployment

1. **Monitor metrics:**
   - DAU/MAU
   - Retention (D1, D7, D30)
   - Conversion rate
   - Churn rate
   - MRR

2. **Gather feedback:**
   - App Store reviews
   - In-app feedback
   - Support emails

3. **Iterate:**
   - Fix bugs
   - Add features
   - Improve UX
   - Optimize conversion

4. **Marketing:**
   - App Store Optimization (ASO)
   - Social media
   - Content marketing
   - Paid ads (if profitable)

5. **Scale:**
   - Upgrade infrastructure as needed
   - Optimize Claude API costs
   - Add more features
   - Expand to more markets

---

## Support

For deployment issues:
1. Check this guide
2. Review service-specific documentation
3. Check logs (Railway, Sentry)
4. Test with curl/Postman
5. Contact service support if needed

---

**Deployment Guide Version:** 1.0.0  
**Last Updated:** January 31, 2026  
**Status:** ✅ Complete and Ready for Production
