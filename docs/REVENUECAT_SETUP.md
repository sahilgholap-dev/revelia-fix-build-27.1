# RevenueCat Setup and Configuration Guide

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [App Store Connect Setup (iOS)](#app-store-connect-setup-ios)
4. [Google Play Console Setup (Android)](#google-play-console-setup-android)
5. [RevenueCat Dashboard Configuration](#revenuecat-dashboard-configuration)
6. [Environment Variables Setup](#environment-variables-setup)
7. [Testing Guide](#testing-guide)
8. [Troubleshooting](#troubleshooting)
9. [Production Deployment](#production-deployment)
10. [Resources and Links](#resources-and-links)

---

## Overview

### What is RevenueCat?

RevenueCat is a subscription management platform that simplifies in-app purchases across iOS and Android. It provides:

- **Unified API**: Single codebase for both platforms
- **Webhook Events**: Real-time subscription status updates
- **Analytics**: Revenue tracking and subscription metrics
- **Customer Management**: Centralized subscriber data
- **Free Tier**: Up to $10,000 MRR at no cost

### Why We Use RevenueCat

1. **Cross-Platform**: Handles both Apple and Google subscriptions
2. **Server-Side Validation**: Secure receipt verification
3. **Webhook Integration**: Automatic backend sync
4. **Reduced Complexity**: No need to manage platform-specific APIs
5. **Analytics**: Built-in revenue and churn metrics

### Revelia Subscription Tiers

#### Free Tier
- Basic face reading (limited)
- 3 readings per month
- Ad-supported

#### Premium - $7.99/month or $59.99/year
- Full face & palm readings
- Both palm hands
- Combined profile
- Full monthly readings
- Unlimited compatibility checks
- Ad-free experience
- **7-day free trial**

#### Premium Plus - $14.99/month or $99.99/year
- Everything in Premium
- Daily personalized insights
- Weekly forecasts
- Advanced numerology
- Priority support
- **7-day free trial**

### Products and Pricing

| Product ID | Description | Price | Duration | Free Trial |
|------------|-------------|-------|----------|------------|
| `revelia_premium_monthly` | Premium Monthly | $7.99 | 1 month | 7 days |
| `revelia_premium_annual` | Premium Annual | $59.99 | 1 year | 7 days |
| `revelia_premium_plus_monthly` | Premium Plus Monthly | $14.99 | 1 month | 7 days |
| `revelia_premium_plus_annual` | Premium Plus Annual | $99.99 | 1 year | 7 days |

**Annual Savings:**
- Premium Annual: Save 37% ($95.88 → $59.99)
- Premium Plus Annual: Save 45% ($179.88 → $99.99)

---

## Prerequisites

### Required Accounts

1. **Apple Developer Account** - $99/year
   - Sign up: https://developer.apple.com/programs/
   - Required for: iOS app distribution and in-app purchases
   - Processing time: 24-48 hours

2. **Google Play Developer Account** - $25 one-time
   - Sign up: https://play.google.com/console/signup
   - Required for: Android app distribution and subscriptions
   - Processing time: 24-48 hours

3. **RevenueCat Account** - Free (up to $10k MRR)
   - Sign up: https://app.revenuecat.com/signup
   - Required for: Subscription management
   - Processing time: Instant

### Technical Requirements

- Revelia backend deployed and accessible
- Mobile app built with Expo
- Bundle ID configured: `com.revelia.app`
- Package name configured: `com.revelia.app`

### Before You Begin

- [ ] Apple Developer Account active
- [ ] Google Play Developer Account active
- [ ] RevenueCat account created
- [ ] Backend API deployed
- [ ] Mobile app bundle ID/package name set

---

## App Store Connect Setup (iOS)

### Step 1: Access In-App Purchases

1. Log in to [App Store Connect](https://appstoreconnect.apple.com/)
2. Navigate to **My Apps**
3. Select **Revelia** (or create app if not exists)
4. Click **In-App Purchases** in the left sidebar

### Step 2: Create Subscription Group

1. Click **Manage** next to "Subscription Groups"
2. Click the **+** button to create a new group
3. Enter details:
   - **Reference Name**: `Revelia Subscriptions`
   - **Group Name (Localized)**: `Revelia Premium Access`
4. Click **Create**

### Step 3: Create Subscription Products

Create 4 auto-renewable subscriptions within the group:

#### Product 1: Premium Monthly

1. Click **+** to add a subscription
2. Select **Auto-Renewable Subscription**
3. Fill in details:

**Product Information:**
- **Reference Name**: `Revelia Premium Monthly`
- **Product ID**: `revelia_premium_monthly`
- **Subscription Group**: `Revelia Subscriptions`

**Subscription Duration:**
- **Duration**: `1 month`

**Subscription Prices:**
- Click **Add Pricing**
- **Price**: `$7.99 USD`
- **Availability**: All territories (or select specific ones)

**Introductory Offer:**
- Click **Add Introductory Offer**
- **Type**: `Free Trial`
- **Duration**: `7 days`
- **Eligibility**: `New Subscribers`

**Localizations:**
- Click **Add Localization**
- **Language**: `English (U.S.)`
- **Display Name**: `Premium Monthly`
- **Description**: `Unlock full face & palm readings, unlimited compatibility, and ad-free experience. Cancel anytime.`

4. Click **Save**

#### Product 2: Premium Annual

1. Click **+** to add another subscription
2. Fill in details:

**Product Information:**
- **Reference Name**: `Revelia Premium Annual`
- **Product ID**: `revelia_premium_annual`
- **Subscription Group**: `Revelia Subscriptions`

**Subscription Duration:**
- **Duration**: `1 year`

**Subscription Prices:**
- **Price**: `$59.99 USD`

**Introductory Offer:**
- **Type**: `Free Trial`
- **Duration**: `7 days`

**Localizations:**
- **Display Name**: `Premium Annual`
- **Description**: `Save 37% with annual billing. Full access to all premium features. Cancel anytime.`

3. Click **Save**

#### Product 3: Premium Plus Monthly

1. Click **+** to add another subscription
2. Fill in details:

**Product Information:**
- **Reference Name**: `Revelia Premium Plus Monthly`
- **Product ID**: `revelia_premium_plus_monthly`
- **Subscription Group**: `Revelia Subscriptions`

**Subscription Duration:**
- **Duration**: `1 month`

**Subscription Prices:**
- **Price**: `$14.99 USD`

**Introductory Offer:**
- **Type**: `Free Trial`
- **Duration**: `7 days`

**Localizations:**
- **Display Name**: `Premium Plus Monthly`
- **Description**: `Everything in Premium plus daily insights, weekly forecasts, and advanced numerology. Cancel anytime.`

3. Click **Save**

#### Product 4: Premium Plus Annual

1. Click **+** to add another subscription
2. Fill in details:

**Product Information:**
- **Reference Name**: `Revelia Premium Plus Annual`
- **Product ID**: `revelia_premium_plus_annual`
- **Subscription Group**: `Revelia Subscriptions`

**Subscription Duration:**
- **Duration**: `1 year`

**Subscription Prices:**
- **Price**: `$99.99 USD`

**Introductory Offer:**
- **Type**: `Free Trial`
- **Duration**: `7 days`

**Localizations:**
- **Display Name**: `Premium Plus Annual`
- **Description**: `Save 45% with annual billing. Ultimate access with daily insights and forecasts. Cancel anytime.`

3. Click **Save**

### Step 4: Configure Subscription Group Settings

1. Go back to **Subscription Groups**
2. Select **Revelia Subscriptions**
3. Configure upgrade/downgrade behavior:

**Subscription Levels (Ranking):**
- Level 1: `revelia_premium_monthly`, `revelia_premium_annual`
- Level 2: `revelia_premium_plus_monthly`, `revelia_premium_plus_annual`

**Upgrade Behavior:**
- From Premium to Premium Plus: Immediate upgrade, prorated credit

**Downgrade Behavior:**
- From Premium Plus to Premium: Takes effect at next renewal

4. Click **Save**

### Step 5: Add Additional Localizations (Optional)

For international markets, add localizations:

1. Select each product
2. Click **Add Localization**
3. Add languages: Spanish, French, German, Japanese, etc.
4. Translate display names and descriptions

### Step 6: Set Pricing for Additional Territories

1. Select each product
2. Click **Pricing and Availability**
3. Review auto-converted prices for each territory
4. Adjust if needed (e.g., round to .99 endings)
5. Click **Save**

### Step 7: Get App-Specific Shared Secret

1. In App Store Connect, go to **My Apps** > **Revelia**
2. Click **App Information** in the left sidebar
3. Scroll to **App-Specific Shared Secret**
4. Click **Generate** (if not already generated)
5. **Copy and save this secret** - you'll need it for RevenueCat

### Step 8: Submit for Review (When Ready)

1. Add screenshot of subscription in app
2. Fill in review notes explaining subscription features
3. Submit with app for review

**Note:** Subscriptions must be reviewed with your app. They cannot be tested in production until approved.

---

## Google Play Console Setup (Android)

### Step 1: Access Monetization Setup

1. Log in to [Google Play Console](https://play.google.com/console/)
2. Select **Revelia** app (or create if not exists)
3. Navigate to **Monetize** > **Subscriptions** in the left sidebar

### Step 2: Set Up Merchant Account

If not already done:

1. Click **Set up a merchant account**
2. Follow prompts to link Google Merchant Center
3. Complete tax and banking information
4. Wait for approval (can take 1-2 business days)

### Step 3: Create Subscription Products

Create 4 subscription products:

#### Product 1: Premium Monthly

1. Click **Create subscription**
2. Fill in details:

**Product details:**
- **Product ID**: `revelia_premium_monthly`
- **Name**: `Premium Monthly`
- **Description**: `Unlock full face & palm readings, unlimited compatibility, and ad-free experience. Cancel anytime.`

**Base plan:**
- Click **Add base plan**
- **Base plan ID**: `monthly`
- **Billing period**: `1 month`
- **Price**: `$7.99 USD`
- **Auto-renewing**: Yes

**Free trial offer:**
- Click **Add offer**
- **Offer ID**: `free-trial`
- **Eligibility**: New customers only
- **Phases**:
  - Phase 1: Free for 7 days
  - Phase 2: $7.99 every month

3. Click **Activate** (top right)

#### Product 2: Premium Annual

1. Click **Create subscription**
2. Fill in details:

**Product details:**
- **Product ID**: `revelia_premium_annual`
- **Name**: `Premium Annual`
- **Description**: `Save 37% with annual billing. Full access to all premium features. Cancel anytime.`

**Base plan:**
- **Base plan ID**: `annual`
- **Billing period**: `1 year`
- **Price**: `$59.99 USD`

**Free trial offer:**
- **Offer ID**: `free-trial`
- **Phases**:
  - Phase 1: Free for 7 days
  - Phase 2: $59.99 every year

3. Click **Activate**

#### Product 3: Premium Plus Monthly

1. Click **Create subscription**
2. Fill in details:

**Product details:**
- **Product ID**: `revelia_premium_plus_monthly`
- **Name**: `Premium Plus Monthly`
- **Description**: `Everything in Premium plus daily insights, weekly forecasts, and advanced numerology. Cancel anytime.`

**Base plan:**
- **Base plan ID**: `monthly`
- **Billing period**: `1 month`
- **Price**: `$14.99 USD`

**Free trial offer:**
- **Offer ID**: `free-trial`
- **Phases**:
  - Phase 1: Free for 7 days
  - Phase 2: $14.99 every month

3. Click **Activate**

#### Product 4: Premium Plus Annual

1. Click **Create subscription**
2. Fill in details:

**Product details:**
- **Product ID**: `revelia_premium_plus_annual`
- **Name**: `Premium Plus Annual`
- **Description**: `Save 45% with annual billing. Ultimate access with daily insights and forecasts. Cancel anytime.`

**Base plan:**
- **Base plan ID**: `annual`
- **Billing period**: `1 year`
- **Price**: `$99.99 USD`

**Free trial offer:**
- **Offer ID**: `free-trial`
- **Phases**:
  - Phase 1: Free for 7 days
  - Phase 2: $99.99 every year

3. Click **Activate**

### Step 4: Configure Subscription Settings

1. Go to **Monetize** > **Subscriptions** > **Settings**
2. Configure:

**Grace period:**
- Enable 7-day grace period for billing issues

**Account hold:**
- Enable 30-day account hold

**Resubscribe:**
- Allow users to resubscribe to expired subscriptions

**Pause:**
- Allow users to pause subscriptions (1-3 months)

3. Click **Save**

### Step 5: Set Up Service Account for RevenueCat

1. Go to **Setup** > **API access**
2. Click **Create new service account**
3. Follow link to Google Cloud Console
4. In Google Cloud Console:
   - Click **Create Service Account**
   - **Name**: `RevenueCat`
   - **Role**: `Service Account User`
   - Click **Create and Continue**
   - Click **Done**
5. Click on the service account you just created
6. Go to **Keys** tab
7. Click **Add Key** > **Create new key**
8. Select **JSON** format
9. Click **Create** - JSON file will download
10. **Save this JSON file securely** - you'll upload it to RevenueCat

11. Back in Play Console:
    - Click **Grant access** next to the service account
    - Under **App permissions**, select **Revelia**
    - Check **View financial data**
    - Check **Manage orders and subscriptions**
    - Click **Invite user**

### Step 6: Configure Pricing for Additional Countries

1. For each subscription, click **Edit**
2. Go to **Pricing**
3. Review auto-converted prices for each country
4. Adjust if needed
5. Click **Save**

---

## RevenueCat Dashboard Configuration

### Step 1: Create Project

1. Log in to [RevenueCat Dashboard](https://app.revenuecat.com/)
2. Click **Create new project**
3. Enter project details:
   - **Project name**: `Revelia`
   - **Currency**: `USD`
4. Click **Create project**

### Step 2: Add iOS App

1. In your project, click **Add app**
2. Select **iOS**
3. Fill in details:

**App information:**
- **App name**: `Revelia iOS`
- **Bundle ID**: `com.revelia.app`

**App Store Connect:**
- **App-Specific Shared Secret**: Paste the secret from Step 7 of iOS setup

4. Click **Save**
5. **Copy the iOS API Key** (starts with `appl_`) - you'll need this for mobile app

### Step 3: Add Android App

1. Click **Add app** again
2. Select **Android**
3. Fill in details:

**App information:**
- **App name**: `Revelia Android`
- **Package name**: `com.revelia.app`

**Google Play:**
- Click **Upload Service Account JSON**
- Upload the JSON file from Step 5 of Android setup

4. Click **Save**
5. **Copy the Android API Key** (starts with `goog_`) - you'll need this for mobile app

### Step 4: Create Entitlements

Entitlements represent access levels in your app.

#### Entitlement 1: Premium

1. Go to **Entitlements** in the left sidebar
2. Click **+ New**
3. Fill in:
   - **Identifier**: `premium`
   - **Display name**: `Premium Access`
   - **Description**: `Full face & palm readings, unlimited compatibility, ad-free`
4. Click **Save**

#### Entitlement 2: Premium Plus

1. Click **+ New** again
2. Fill in:
   - **Identifier**: `premium_plus`
   - **Display name**: `Premium Plus Access`
   - **Description**: `Everything in Premium plus daily insights and forecasts`
3. Click **Save**

### Step 5: Import and Configure Products

#### Import iOS Products

1. Go to **Products** in the left sidebar
2. Click **Import from App Store Connect**
3. Select all 4 products:
   - `revelia_premium_monthly`
   - `revelia_premium_annual`
   - `revelia_premium_plus_monthly`
   - `revelia_premium_plus_annual`
4. Click **Import**

#### Import Android Products

1. Click **Import from Google Play**
2. Select all 4 products (same IDs as iOS)
3. Click **Import**

#### Map Products to Entitlements

For each product:

1. Click on the product name
2. Under **Entitlements**, click **Attach entitlement**
3. Map as follows:
   - `revelia_premium_monthly` → `premium`
   - `revelia_premium_annual` → `premium`
   - `revelia_premium_plus_monthly` → `premium_plus`
   - `revelia_premium_plus_annual` → `premium_plus`
4. Click **Save**

**Important:** Premium Plus products should have BOTH entitlements:
- `revelia_premium_plus_monthly` → `premium` AND `premium_plus`
- `revelia_premium_plus_annual` → `premium` AND `premium_plus`

This ensures Premium Plus users have access to all Premium features.

### Step 6: Create Offering

Offerings are how you present products to users.

1. Go to **Offerings** in the left sidebar
2. Click **+ New offering**
3. Fill in:
   - **Identifier**: `default`
   - **Description**: `Current offering`
4. Click **Create**

#### Add Packages to Offering

1. Click **+ Add package**
2. Create 4 packages:

**Package 1: Premium Monthly**
- **Identifier**: `premium_monthly`
- **Display name**: `Monthly Premium`
- **iOS Product**: `revelia_premium_monthly`
- **Android Product**: `revelia_premium_monthly`

**Package 2: Premium Annual**
- **Identifier**: `premium_annual`
- **Display name**: `Annual Premium`
- **iOS Product**: `revelia_premium_annual`
- **Android Product**: `revelia_premium_annual`

**Package 3: Premium Plus Monthly**
- **Identifier**: `premium_plus_monthly`
- **Display name**: `Monthly Premium Plus`
- **iOS Product**: `revelia_premium_plus_monthly`
- **Android Product**: `revelia_premium_plus_monthly`

**Package 4: Premium Plus Annual**
- **Identifier**: `premium_plus_annual`
- **Display name**: `Annual Premium Plus`
- **iOS Product**: `revelia_premium_plus_annual`
- **Android Product**: `revelia_premium_plus_annual`

3. Click **Save** for each package

#### Set as Current Offering

1. Click the **⋮** menu next to the offering
2. Select **Make current**
3. Confirm

### Step 7: Configure Webhooks

Webhooks keep your backend in sync with subscription changes.

1. Go to **Integrations** in the left sidebar
2. Click **Webhooks**
3. Click **+ Add webhook**
4. Fill in:

**Webhook configuration:**
- **URL**: `https://api.revelia.app/api/webhooks/revenuecat`
  (Replace with your actual backend URL)
- **Authorization header**: `Bearer your-webhook-secret-here`
  (Generate a secure random string)

**Events to send:**
Select all events:
- ✅ Initial Purchase
- ✅ Renewal
- ✅ Cancellation
- ✅ Uncancellation
- ✅ Non Renewing Purchase
- ✅ Expiration
- ✅ Billing Issue
- ✅ Product Change
- ✅ Transfer

5. Click **Add webhook**

#### Test Webhook

1. Click **Send test event**
2. Select **Initial Purchase**
3. Click **Send**
4. Verify your backend receives the event (check logs)
5. Should return `200 OK` with `{"received": true}`

### Step 8: Get API Keys

1. Go to **Settings** > **API Keys**
2. Copy the following keys:

**Public API Keys (for mobile app):**
- **iOS**: `appl_xxxxxxxxxxxx` (already copied in Step 2)
- **Android**: `goog_xxxxxxxxxxxx` (already copied in Step 3)

**Secret API Keys (for backend):**
- Click **Show** next to **Secret API Key**
- **Copy the key** (starts with `sk_`)
- **Save securely** - this is for backend only

### Step 9: Configure Sandbox Testing

1. Go to **Settings** > **Sandbox**
2. Enable **Sandbox mode**
3. This allows testing without real charges
4. Disable before production launch

---

## Environment Variables Setup

### Backend Environment Variables

Add to `/app/server/.env`:

```bash
# RevenueCat Configuration
REVENUECAT_API_KEY=sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
REVENUECAT_WEBHOOK_SECRET=your-secure-webhook-secret-min-32-chars
```

**How to generate webhook secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Mobile Environment Variables

Add to `/app/mobile/.env`:

```bash
# RevenueCat Public Keys
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_xxxxxxxxxxxx
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_xxxxxxxxxxxx
```

### Update .env.example

Ensure `/app/.env.example` documents all variables:

```bash
# ----------------------------------------------------------------------------
# Subscription Management - RevenueCat
# ----------------------------------------------------------------------------
# Get credentials from: https://app.revenuecat.com/
# Required for: In-app purchases, subscription management

# Backend (Secret Key)
REVENUECAT_API_KEY=sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Webhook Secret (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
REVENUECAT_WEBHOOK_SECRET=your-secure-webhook-secret-min-32-chars

# Mobile (Public Keys - safe to expose in client)
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_xxxxxxxxxxxx
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_xxxxxxxxxxxx
```

### Verify Configuration

1. **Backend**: Check that API key is loaded
   ```bash
   cd /app/server
   node -e "require('dotenv').config(); console.log('API Key:', process.env.REVENUECAT_API_KEY?.substring(0, 10) + '...');"
   ```

2. **Mobile**: Check that keys are loaded
   ```bash
   cd /app/mobile
   node -e "require('dotenv').config(); console.log('iOS Key:', process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY?.substring(0, 10) + '...');"
   ```

---

## Testing Guide

### Prerequisites for Testing

- [ ] All products created in App Store Connect
- [ ] All products created in Google Play Console
- [ ] RevenueCat configured with products and entitlements
- [ ] Environment variables set
- [ ] Backend deployed and accessible
- [ ] Mobile app built with EAS

### iOS Sandbox Testing

#### Step 1: Create Sandbox Test Account

1. Go to [App Store Connect](https://appstoreconnect.apple.com/)
2. Navigate to **Users and Access** > **Sandbox Testers**
3. Click **+** to add a tester
4. Fill in:
   - **First Name**: Test
   - **Last Name**: User
   - **Email**: testuser+revelia@example.com (must be unique, not a real Apple ID)
   - **Password**: Create a strong password
   - **Country**: United States
5. Click **Create**
6. **Save the credentials** - you'll need them on device

#### Step 2: Configure Device for Sandbox Testing

1. On your iOS device, go to **Settings**
2. Scroll down and tap **App Store**
3. Tap **Sandbox Account**
4. Sign in with the sandbox test account created above
5. **Do NOT sign in with this account in Settings > Apple ID** - only in Sandbox Account

#### Step 3: Install Test Build

1. Build and install app via TestFlight or development build:
   ```bash
   cd /app/mobile
   eas build --profile preview --platform ios
   ```
2. Install on device
3. Launch app

#### Step 4: Test Purchase Flow

1. **Sign in** to Revelia with a test user account
2. Navigate to **Paywall** (should appear when accessing premium feature)
3. Select **Premium Monthly** plan
4. Tap **Start 7-Day Free Trial**
5. **Sandbox purchase dialog** will appear:
   - Shows "[Sandbox] Premium Monthly"
   - Shows "Free for 7 days, then $7.99/month"
6. Tap **Subscribe**
7. Authenticate with Face ID/Touch ID
8. **Verify**:
   - Purchase completes successfully
   - Paywall dismisses
   - Premium features unlock
   - Backend tier updates to `premium`

#### Step 5: Verify Backend Sync

1. Check backend logs for webhook event:
   ```bash
   # Should see: "Webhook event: INITIAL_PURCHASE"
   ```

2. Call subscription status endpoint:
   ```bash
   curl -X GET https://api.revelia.app/api/subscription/status \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

   Expected response:
   ```json
   {
     "success": true,
     "data": {
       "tier": "premium",
       "isActive": true,
       "expiresAt": "2025-02-01T00:00:00.000Z",
       "productId": "revelia_premium_monthly",
       "willRenew": true
     }
   }
   ```

#### Step 6: Test Restore Purchases

1. **Uninstall** the app
2. **Reinstall** the app
3. **Sign in** with the same user account
4. Navigate to **Paywall**
5. Tap **Restore Purchases**
6. **Verify**:
   - Subscription restored
   - Premium features unlock
   - No new charge

#### Step 7: Test Subscription Management

1. In app, go to **Profile** > **Manage Subscription**
2. Should open App Store subscription management
3. Verify subscription details are correct
4. **Cancel subscription** (for testing)
5. **Verify**:
   - Backend receives CANCELLATION webhook
   - `willRenew` set to `false`
   - User retains access until expiration

#### Step 8: Clear Sandbox Data (Between Tests)

To reset sandbox purchases:

1. On device, go to **Settings** > **App Store** > **Sandbox Account**
2. Tap **Clear Purchase History**
3. Confirm
4. This allows re-testing free trials

### Android Test Track Testing

#### Step 1: Create Internal Test Track

1. Go to [Google Play Console](https://play.google.com/console/)
2. Select **Revelia**
3. Navigate to **Testing** > **Internal testing**
4. Click **Create new release**
5. Upload APK/AAB:
   ```bash
   cd /app/mobile
   eas build --profile preview --platform android
   ```
6. Add release notes
7. Click **Review release** > **Start rollout to Internal testing**

#### Step 2: Add Test Users

1. In **Internal testing**, go to **Testers** tab
2. Click **Create email list**
3. Add tester email addresses
4. Click **Save**
5. Copy the **opt-in URL** and send to testers

#### Step 3: Install Test Build

1. Testers open opt-in URL on Android device
2. Tap **Become a tester**
3. Install app from Play Store
4. Launch app

#### Step 4: Test Purchase Flow

1. **Sign in** to Revelia
2. Navigate to **Paywall**
3. Select **Premium Monthly**
4. Tap **Start 7-Day Free Trial**
5. **Google Play purchase dialog** appears
6. Tap **Subscribe**
7. **Verify**:
   - Purchase completes
   - Premium features unlock
   - Backend tier updates

#### Step 5: Use Test Cards (Optional)

For testing without real charges:

1. Add a test card in Google Play:
   - Go to [Google Play Console](https://play.google.com/console/)
   - Navigate to **Setup** > **License testing**
   - Add tester email addresses
   - These users can make test purchases without charges

2. Test cards:
   - **Visa**: 4242 4242 4242 4242
   - **Mastercard**: 5555 5555 5555 4444
   - Any future expiry date
   - Any CVV

### Testing Checklist

Complete this checklist for both iOS and Android:

#### Purchase Flow
- [ ] Monthly subscription purchase works
- [ ] Annual subscription purchase works
- [ ] Free trial activates correctly
- [ ] Premium tier unlocks features
- [ ] Premium Plus tier unlocks all features
- [ ] Purchase confirmation shown
- [ ] Receipt validated

#### Backend Integration
- [ ] Webhook INITIAL_PURCHASE received
- [ ] User tier updated in database
- [ ] Expiration date set correctly
- [ ] Product ID stored
- [ ] `willRenew` set to `true`

#### Subscription Management
- [ ] Restore purchases works
- [ ] Subscription status displayed correctly
- [ ] Manage subscription link works
- [ ] Cancel subscription works
- [ ] Webhook CANCELLATION received
- [ ] `willRenew` set to `false`
- [ ] User retains access until expiration

#### Expiration
- [ ] Subscription expires after trial/period
- [ ] Webhook EXPIRATION received
- [ ] User downgraded to free tier
- [ ] Premium features locked

#### Edge Cases
- [ ] Network error during purchase handled gracefully
- [ ] User cancels purchase (no error shown)
- [ ] Multiple rapid purchases handled
- [ ] Upgrade from Premium to Premium Plus works
- [ ] Downgrade from Premium Plus to Premium works

### Simulating Subscription Events (Sandbox)

#### iOS Sandbox Time Acceleration

iOS sandbox accelerates subscription renewals:

| Real Duration | Sandbox Duration |
|---------------|------------------|
| 7 days (trial) | 3 minutes |
| 1 month | 5 minutes |
| 1 year | 1 hour |

Use this to test renewals and expirations quickly.

#### Android Test Subscriptions

Android test subscriptions also accelerate:

| Real Duration | Test Duration |
|---------------|---------------|
| 7 days (trial) | 5 minutes |
| 1 month | 5 minutes |
| 1 year | 30 minutes |

### Manual Webhook Testing

Test webhook endpoint directly:

```bash
curl -X POST https://api.revelia.app/api/webhooks/revenuecat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_WEBHOOK_SECRET" \
  -d '{
    "event": {
      "type": "INITIAL_PURCHASE",
      "app_user_id": "test-user-123",
      "product_id": "revelia_premium_monthly",
      "period_type": "TRIAL",
      "purchased_at_ms": 1640000000000,
      "expiration_at_ms": 1640604800000,
      "store": "APP_STORE",
      "environment": "SANDBOX"
    }
  }'
```

Expected response:
```json
{"received": true}
```

---

## Troubleshooting

### Common Issues and Solutions

#### Issue: "Offerings not loading"

**Symptoms:**
- Paywall shows "Loading..." indefinitely
- No subscription options displayed
- Console error: "Failed to fetch offerings"

**Solutions:**

1. **Check RevenueCat API keys:**
   ```bash
   # Mobile .env
   EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_xxxxxxxxxxxx
   EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_xxxxxxxxxxxx
   ```
   - Verify keys are correct (copy from RevenueCat dashboard)
   - Ensure no extra spaces or quotes
   - Rebuild app after changing .env

2. **Verify products in App Store Connect / Google Play:**
   - Products must be in "Ready to Submit" or "Approved" status
   - Product IDs must match exactly (case-sensitive)
   - At least one product must be active

3. **Check RevenueCat offering configuration:**
   - Go to RevenueCat dashboard > Offerings
   - Verify "default" offering exists and is current
   - Verify packages are attached to offering
   - Verify products are attached to packages

4. **Check network connectivity:**
   - Ensure device has internet connection
   - Check if RevenueCat API is accessible
   - Try on different network (WiFi vs cellular)

#### Issue: "Purchase fails with error"

**Symptoms:**
- Purchase dialog appears but fails
- Error: "Cannot connect to iTunes Store" (iOS)
- Error: "Purchase failed" (Android)

**Solutions:**

1. **iOS: Verify sandbox account:**
   - Settings > App Store > Sandbox Account
   - Must be signed in with sandbox test account
   - NOT signed in with real Apple ID
   - Try signing out and back in

2. **iOS: Check bundle ID:**
   - Xcode: Verify bundle ID is `com.revelia.app`
   - App Store Connect: Verify products are for correct bundle ID
   - RevenueCat: Verify iOS app has correct bundle ID

3. **Android: Verify package name:**
   - build.gradle: Verify package is `com.revelia.app`
   - Google Play: Verify products are for correct package
   - RevenueCat: Verify Android app has correct package

4. **Check product status:**
   - iOS: Products must be "Ready to Submit" or approved
   - Android: Products must be "Active"
   - Products must have pricing set

5. **Clear app data and retry:**
   - Uninstall app
   - Clear sandbox purchase history (iOS)
   - Reinstall app
   - Try purchase again

#### Issue: "Webhook not received"

**Symptoms:**
- Purchase succeeds in app
- Backend tier doesn't update
- No webhook event in logs

**Solutions:**

1. **Verify webhook URL:**
   - RevenueCat dashboard > Integrations > Webhooks
   - URL must be publicly accessible
   - Must use HTTPS (not HTTP)
   - Test URL in browser or with curl

2. **Check webhook authorization:**
   ```bash
   # Backend .env
   REVENUECAT_WEBHOOK_SECRET=your-webhook-secret
   ```
   - Must match Authorization header in RevenueCat
   - Format: `Bearer your-webhook-secret`

3. **Test webhook manually:**
   ```bash
   curl -X POST https://api.revelia.app/api/webhooks/revenuecat \
     -H "Authorization: Bearer YOUR_WEBHOOK_SECRET" \
     -H "Content-Type: application/json" \
     -d '{"event":{"type":"TEST"}}'
   ```
   - Should return `{"received": true}`
   - Check backend logs for received event

4. **Check RevenueCat webhook logs:**
   - RevenueCat dashboard > Integrations > Webhooks
   - Click on webhook
   - View "Recent deliveries"
   - Check for errors (4xx, 5xx responses)

5. **Verify backend is processing webhooks:**
   - Check backend logs: `tail -f /var/log/backend.log`
   - Should see: "Webhook event: INITIAL_PURCHASE"
   - If not, check webhook route is mounted

#### Issue: "Tier not updating in app"

**Symptoms:**
- Purchase succeeds
- Webhook received
- Premium features still locked

**Solutions:**

1. **Manually sync subscription:**
   ```bash
   curl -X POST https://api.revelia.app/api/subscription/sync \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

2. **Check user is identified with RevenueCat:**
   - After login, app should call `identifyUser(userId)`
   - Check RevenueCat dashboard > Customers
   - Search for user ID
   - Verify subscription is attached to user

3. **Link RevenueCat user:**
   ```bash
   curl -X POST https://api.revelia.app/api/subscription/link \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"revenueCatAppUserId": "USER_ID"}'
   ```

4. **Check subscription store state:**
   - In app, log subscription store state
   - Verify `tier` is updated
   - Verify `canAccess()` returns true for premium features

5. **Force refresh:**
   - Pull to refresh on profile screen
   - Or restart app

#### Issue: "Restore purchases not working"

**Symptoms:**
- User reinstalls app
- Taps "Restore Purchases"
- Subscription not restored

**Solutions:**

1. **Verify same Apple ID / Google account:**
   - iOS: Must be signed in with same Apple ID
   - Android: Must be signed in with same Google account
   - Check in device settings

2. **Check RevenueCat customer history:**
   - RevenueCat dashboard > Customers
   - Search for user's email or ID
   - Verify purchase exists
   - Check if subscription is expired

3. **Verify user is logged in:**
   - User must be logged into Revelia account
   - RevenueCat user ID must match backend user ID

4. **Check subscription expiration:**
   - Subscription may have expired
   - Check expiration date in RevenueCat
   - Expired subscriptions cannot be restored

5. **Try manual sync:**
   - After restore, call `/api/subscription/sync`
   - This forces backend to check RevenueCat

#### Issue: "Sandbox purchases not working"

**Symptoms:**
- iOS: "Cannot connect to iTunes Store"
- Purchases fail in sandbox

**Solutions:**

1. **Sign out of real Apple ID:**
   - Settings > [Your Name] > Sign Out
   - Or use a device without Apple ID signed in

2. **Use sandbox account correctly:**
   - Settings > App Store > Sandbox Account
   - Sign in with sandbox test account
   - Do NOT use real Apple ID

3. **Create new sandbox account:**
   - Old sandbox accounts can become invalid
   - Create fresh account in App Store Connect
   - Use unique email address

4. **Clear purchase history:**
   - Settings > App Store > Sandbox Account
   - Clear Purchase History
   - Try purchase again

5. **Wait for App Store Connect sync:**
   - After creating products, wait 1-2 hours
   - Products need time to propagate to sandbox

#### Issue: "Products showing wrong price"

**Symptoms:**
- Paywall shows $0.00 or incorrect price
- Price in wrong currency

**Solutions:**

1. **Check product pricing in store:**
   - App Store Connect: Verify pricing is set
   - Google Play: Verify pricing is set
   - Must have price for user's country

2. **Verify RevenueCat product import:**
   - RevenueCat dashboard > Products
   - Click on product
   - Verify pricing information is present

3. **Re-import products:**
   - RevenueCat dashboard > Products
   - Delete product
   - Re-import from App Store Connect / Google Play

4. **Check offering configuration:**
   - RevenueCat dashboard > Offerings
   - Verify packages have correct products attached

#### Issue: "Free trial not showing"

**Symptoms:**
- Purchase button shows full price
- No "7-day free trial" text

**Solutions:**

1. **Verify introductory offer configured:**
   - App Store Connect: Check product has free trial
   - Google Play: Check offer is active

2. **Check user eligibility:**
   - Free trials only for new subscribers
   - If user previously subscribed, no trial
   - Clear sandbox purchase history to re-test

3. **Verify RevenueCat offering:**
   - RevenueCat dashboard > Offerings
   - Check package shows introductory offer

### Getting Help

#### RevenueCat Support

- **Documentation**: https://docs.revenuecat.com/
- **Community**: https://community.revenuecat.com/
- **Support**: support@revenuecat.com
- **Status**: https://status.revenuecat.com/

#### Apple Support

- **App Store Connect Help**: https://developer.apple.com/support/app-store-connect/
- **In-App Purchase Guide**: https://developer.apple.com/in-app-purchase/
- **Technical Support**: https://developer.apple.com/contact/

#### Google Support

- **Play Console Help**: https://support.google.com/googleplay/android-developer/
- **Billing Guide**: https://developer.android.com/google/play/billing/

#### Revelia Backend

- Check backend logs: `tail -f /var/log/backend.log`
- Test subscription endpoints with curl
- Review `/app/server/SUBSCRIPTION_IMPLEMENTATION.md`

---

## Production Deployment

### Pre-Launch Checklist

#### RevenueCat Configuration
- [ ] All products created and active
- [ ] Entitlements configured correctly
- [ ] Offering set as "current"
- [ ] Webhook URL set to production API
- [ ] Webhook authorization configured
- [ ] Sandbox mode DISABLED
- [ ] API keys copied to production .env

#### App Store Connect
- [ ] All products approved
- [ ] Subscription group configured
- [ ] Localizations added for all markets
- [ ] Pricing set for all territories
- [ ] App-Specific Shared Secret generated
- [ ] Privacy policy URL added
- [ ] Terms of service URL added

#### Google Play Console
- [ ] All products activated
- [ ] Service account configured
- [ ] Pricing set for all countries
- [ ] Subscription settings configured
- [ ] Privacy policy URL added
- [ ] Terms of service URL added

#### Backend
- [ ] Production API deployed
- [ ] Environment variables set
- [ ] Webhook endpoint accessible
- [ ] HTTPS enabled
- [ ] Database backups configured
- [ ] Monitoring enabled (Sentry)

#### Mobile App
- [ ] Production build created
- [ ] RevenueCat keys updated
- [ ] API URL set to production
- [ ] Paywall tested
- [ ] Restore purchases tested
- [ ] App submitted for review

### Switching from Sandbox to Production

#### RevenueCat

1. Go to RevenueCat dashboard > **Settings**
2. Under **Sandbox**, toggle **OFF**
3. Confirm switch to production
4. **Warning**: This affects all users immediately

#### Backend

1. Update webhook URL to production:
   ```
   https://api.revelia.app/api/webhooks/revenuecat
   ```

2. Verify webhook is receiving events:
   ```bash
   tail -f /var/log/backend.log | grep "Webhook event"
   ```

#### Mobile App

1. Build production release:
   ```bash
   cd /app/mobile
   eas build --profile production --platform all
   ```

2. Submit to stores:
   ```bash
   eas submit --platform ios
   eas submit --platform android
   ```

### Testing in Production

**⚠️ Warning**: Production purchases charge real money.

1. **Make a real purchase** (you'll be charged):
   - Install production app from store
   - Sign in with real account
   - Purchase cheapest subscription (monthly)
   - Verify purchase succeeds
   - Verify webhook received
   - Verify tier updates

2. **Request refund** (within 48 hours):
   - iOS: https://reportaproblem.apple.com/
   - Android: Google Play Console > Order Management

3. **Monitor for issues**:
   - Check Sentry for errors
   - Monitor RevenueCat dashboard
   - Watch for support tickets

### Monitoring and Alerts

#### RevenueCat Dashboard

Monitor daily:
- **Overview**: Revenue, active subscriptions, churn
- **Charts**: MRR, new subscribers, cancellations
- **Customers**: Recent purchases, issues

#### Backend Monitoring

Set up alerts for:
- Webhook failures (5xx errors)
- High error rate on subscription endpoints
- Database connection issues
- RevenueCat API failures

#### Key Metrics to Track

- **Conversion Rate**: Free to paid %
- **Trial Conversion**: Trial to paid %
- **Churn Rate**: Monthly cancellations %
- **MRR**: Monthly recurring revenue
- **ARPU**: Average revenue per user
- **LTV**: Lifetime value

### Post-Launch Tasks

#### Week 1
- [ ] Monitor webhook delivery (should be 100%)
- [ ] Check for purchase errors
- [ ] Verify tier updates are working
- [ ] Respond to user issues quickly

#### Week 2-4
- [ ] Analyze conversion funnel
- [ ] A/B test paywall designs
- [ ] Optimize pricing if needed
- [ ] Add promotional offers

#### Ongoing
- [ ] Monthly revenue review
- [ ] Churn analysis
- [ ] Feature usage by tier
- [ ] Customer feedback

---

## Resources and Links

### Official Documentation

#### RevenueCat
- **Main Docs**: https://docs.revenuecat.com/
- **iOS SDK**: https://docs.revenuecat.com/docs/ios
- **Android SDK**: https://docs.revenuecat.com/docs/android
- **Webhooks**: https://docs.revenuecat.com/docs/webhooks
- **API Reference**: https://docs.revenuecat.com/reference/basic
- **Community**: https://community.revenuecat.com/

#### Apple
- **App Store Connect**: https://appstoreconnect.apple.com/
- **Developer Portal**: https://developer.apple.com/
- **In-App Purchase Guide**: https://developer.apple.com/in-app-purchase/
- **StoreKit Documentation**: https://developer.apple.com/documentation/storekit
- **Subscription Best Practices**: https://developer.apple.com/app-store/subscriptions/

#### Google
- **Play Console**: https://play.google.com/console/
- **Developer Console**: https://console.cloud.google.com/
- **Billing Documentation**: https://developer.android.com/google/play/billing/
- **Subscription Guide**: https://developer.android.com/google/play/billing/subscriptions

### Revelia Documentation

#### Backend
- **Subscription Implementation**: `/app/server/SUBSCRIPTION_IMPLEMENTATION.md`
- **Quick Reference**: `/app/server/SUBSCRIPTION_QUICK_REFERENCE.md`
- **API Documentation**: `/app/docs/API.md`

#### Mobile
- **Subscription Implementation**: `/app/mobile/SUBSCRIPTION_IMPLEMENTATION.md`
- **Quick Start**: `/app/mobile/SUBSCRIPTION_QUICKSTART.md`
- **Examples**: `/app/mobile/SUBSCRIPTION_EXAMPLES.tsx`

### Tools and Utilities

#### Testing
- **iOS Sandbox**: Settings > App Store > Sandbox Account
- **Android Test Cards**: https://developer.android.com/google/play/billing/test
- **Webhook Tester**: https://webhook.site/

#### Monitoring
- **RevenueCat Dashboard**: https://app.revenuecat.com/
- **Sentry**: https://sentry.io/
- **App Store Analytics**: https://appstoreconnect.apple.com/analytics
- **Play Console Statistics**: https://play.google.com/console/statistics

### Support Contacts

#### RevenueCat
- **Email**: support@revenuecat.com
- **Response Time**: 24-48 hours
- **Priority Support**: Available on paid plans

#### Apple Developer Support
- **Phone**: 1-800-633-2152 (US)
- **Email**: Through developer portal
- **Response Time**: 1-2 business days

#### Google Play Support
- **Help Center**: https://support.google.com/googleplay/android-developer/
- **Contact**: Through Play Console
- **Response Time**: 1-3 business days

### Community Resources

#### Forums
- **RevenueCat Community**: https://community.revenuecat.com/
- **Apple Developer Forums**: https://developer.apple.com/forums/
- **Android Developers**: https://www.reddit.com/r/androiddev/

#### Blogs and Guides
- **RevenueCat Blog**: https://www.revenuecat.com/blog/
- **App Store Optimization**: https://www.revenuecat.com/blog/app-store-optimization/
- **Subscription Pricing**: https://www.revenuecat.com/blog/subscription-pricing/

---

## Appendix

### Product ID Reference

| Product ID | Platform | Type | Price | Duration |
|------------|----------|------|-------|----------|
| `revelia_premium_monthly` | iOS & Android | Auto-renewable | $7.99 | 1 month |
| `revelia_premium_annual` | iOS & Android | Auto-renewable | $59.99 | 1 year |
| `revelia_premium_plus_monthly` | iOS & Android | Auto-renewable | $14.99 | 1 month |
| `revelia_premium_plus_annual` | iOS & Android | Auto-renewable | $99.99 | 1 year |

### Entitlement Mapping

| Product | Entitlements |
|---------|-------------|
| `revelia_premium_monthly` | `premium` |
| `revelia_premium_annual` | `premium` |
| `revelia_premium_plus_monthly` | `premium`, `premium_plus` |
| `revelia_premium_plus_annual` | `premium`, `premium_plus` |

### Webhook Event Types

| Event Type | Description | Action |
|------------|-------------|--------|
| `INITIAL_PURCHASE` | First purchase or trial start | Upgrade user to paid tier |
| `RENEWAL` | Subscription renewed | Extend expiration date |
| `CANCELLATION` | User cancelled (still active) | Set `willRenew = false` |
| `UNCANCELLATION` | User re-enabled renewal | Set `willRenew = true` |
| `EXPIRATION` | Subscription expired | Downgrade to free tier |
| `BILLING_ISSUE` | Payment failed | Notify user, grace period |
| `PRODUCT_CHANGE` | Upgrade/downgrade | Update tier and product |

### Environment Variable Summary

#### Backend (.env)
```bash
REVENUECAT_API_KEY=sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
REVENUECAT_WEBHOOK_SECRET=your-secure-webhook-secret
```

#### Mobile (.env)
```bash
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_xxxxxxxxxxxx
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_xxxxxxxxxxxx
```

### API Endpoint Reference

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/subscription/status` | GET | JWT | Get current subscription status |
| `/api/subscription/sync` | POST | JWT | Sync with RevenueCat |
| `/api/subscription/link` | POST | JWT | Link RevenueCat user ID |
| `/api/webhooks/revenuecat` | POST | Bearer | Receive webhook events |

### Useful Commands

#### Generate Webhook Secret
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Test Webhook
```bash
curl -X POST https://api.revelia.app/api/webhooks/revenuecat \
  -H "Authorization: Bearer YOUR_WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"event":{"type":"TEST"}}'
```

#### Check Subscription Status
```bash
curl -X GET https://api.revelia.app/api/subscription/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Sync Subscription
```bash
curl -X POST https://api.revelia.app/api/subscription/sync \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Conclusion

You now have a complete guide to setting up RevenueCat for Revelia. Follow the steps in order:

1. ✅ Create accounts (Apple, Google, RevenueCat)
2. ✅ Set up products in App Store Connect
3. ✅ Set up products in Google Play Console
4. ✅ Configure RevenueCat dashboard
5. ✅ Set environment variables
6. ✅ Test in sandbox
7. ✅ Deploy to production
8. ✅ Monitor and optimize

For questions or issues, refer to the [Troubleshooting](#troubleshooting) section or contact support.

**Good luck with your launch! 🚀**
