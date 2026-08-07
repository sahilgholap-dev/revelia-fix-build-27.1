# Pre-Launch Checklist for Revelia

## Overview

Comprehensive checklist for Revelia production deployment and app store submission. Complete all items before launching to production.

**Total Items:** 120+  
**Estimated Time:** 2-3 days

---

## ✅ Accounts & Services (25 items)

### Core Accounts
- [ ] Apple Developer account created and active ($99/year paid)
- [ ] Google Play Developer account created and active ($25 one-time paid)
- [ ] Expo account created (free)
- [ ] GitHub repository set up with proper access

### Infrastructure
- [ ] Railway account created
- [ ] Railway project deployed
- [ ] MongoDB Atlas account created
- [ ] MongoDB Atlas cluster created (M0 free or M10 production)
- [ ] Cloudflare account created
- [ ] Cloudflare R2 bucket created (`revelia-images`)
- [ ] Domain purchased (revelia.app or your choice)
- [ ] DNS configured and propagated
- [ ] SSL certificates active (automatic with Railway/Cloudflare)

### Third-Party Services
- [ ] Anthropic account created
- [ ] Anthropic API key obtained and tested
- [ ] RevenueCat project created
- [ ] RevenueCat iOS app configured
- [ ] RevenueCat Android app configured
- [ ] RevenueCat products created (4 products)
- [ ] RevenueCat webhook configured
- [ ] OneSignal account created
- [ ] OneSignal app created
- [ ] OneSignal iOS configured (APNs certificate)
- [ ] OneSignal Android configured (FCM key)
- [ ] Sentry account created
- [ ] Sentry backend project created
- [ ] Sentry mobile project created

---

## ✅ Backend Deployment (20 items)

### Railway Configuration
- [ ] Railway project connected to GitHub
- [ ] Build settings configured (root: `server`, build: `npm install && npm run build`, start: `npm start`)
- [ ] Node version set to 20.x
- [ ] Auto-deploy enabled on `main` branch

### Environment Variables
- [ ] `NODE_ENV=production` set
- [ ] `PORT=8001` set
- [ ] `JWT_SECRET` generated (64 characters) and set
- [ ] `MONGODB_URI` set (from Atlas)
- [ ] `CORS_ORIGIN` set (production domains)
- [ ] `ANTHROPIC_API_KEY` set
- [ ] `R2_ACCOUNT_ID` set
- [ ] `R2_ACCESS_KEY_ID` set
- [ ] `R2_SECRET_ACCESS_KEY` set
- [ ] `R2_BUCKET_NAME` set (`revelia-images`)
- [ ] `R2_PUBLIC_URL` set
- [ ] `REVENUECAT_API_KEY` set (secret key)
- [ ] `REVENUECAT_WEBHOOK_SECRET` generated and set
- [ ] `ONESIGNAL_APP_ID` set
- [ ] `ONESIGNAL_REST_API_KEY` set
- [ ] `INTERNAL_API_KEY` generated and set

### Deployment Verification
- [ ] Backend deployed successfully (check Railway logs)
- [ ] Health endpoint returns 200: `curl https://api.revelia.app/api/health`
- [ ] All services show as `true` in health check response
- [ ] MongoDB connection successful (check logs for "✅ MongoDB connected")

---

## ✅ Database Setup (10 items)

### MongoDB Atlas
- [ ] Database user created with strong password
- [ ] Network access configured (0.0.0.0/0 for Railway)
- [ ] Connection string tested
- [ ] Database indexes created automatically (verify in Atlas)

### Data Verification
- [ ] Test user created via API
- [ ] Test reading generated
- [ ] Test subscription verified
- [ ] Test data can be deleted
- [ ] Database backup configured (Atlas automatic backups)
- [ ] Database monitoring enabled (Atlas monitoring)

---

## ✅ Image Storage (8 items)

### Cloudflare R2
- [ ] Bucket created and accessible
- [ ] Public access configured OR custom domain configured
- [ ] API tokens generated and tested
- [ ] Test image uploaded successfully
- [ ] Test image accessible via public URL
- [ ] CORS configured (if needed)
- [ ] Bucket lifecycle rules configured (optional)
- [ ] Storage monitoring enabled

---

## ✅ Mobile Build (15 items)

### EAS Configuration
- [ ] EAS CLI installed globally (`npm install -g eas-cli`)
- [ ] Logged in to Expo (`eas login`)
- [ ] EAS project configured (`eas build:configure`)
- [ ] Project ID generated and added to `app.json`
- [ ] `eas.json` updated with production API URLs
- [ ] Bundle identifiers correct (iOS: `com.revelia.app`, Android: `com.revelia.app`)

### Preview Builds (Testing)
- [ ] iOS preview build created (`eas build --platform ios --profile preview`)
- [ ] Android preview build created (`eas build --platform android --profile preview`)
- [ ] iOS preview build installed on physical device
- [ ] Android preview build installed on physical device
- [ ] Preview builds tested thoroughly (all features)

### Production Builds
- [ ] iOS production build created (`eas build --platform ios --profile production`)
- [ ] Android production build created (`eas build --platform android --profile production`)
- [ ] Production builds downloaded
- [ ] Production builds ready for submission

---

## ✅ App Store Connect (iOS) (30 items)

### App Record
- [ ] App created in App Store Connect
- [ ] Bundle ID registered (`com.revelia.app`)
- [ ] App name set ("Revelia")
- [ ] Primary language set (English - U.S.)
- [ ] SKU set (`revelia-ios-001`)

### App Information
- [ ] Subtitle set ("AI Face & Palm Readings")
- [ ] Primary category set (Lifestyle)
- [ ] Secondary category set (Entertainment)
- [ ] Privacy policy URL set (https://revelia.app/privacy)
- [ ] Support URL set (https://revelia.app/support)
- [ ] Marketing URL set (https://revelia.app)

### Pricing & Availability
- [ ] Price set to Free
- [ ] Availability set to all countries
- [ ] Pre-order disabled (for initial launch)

### In-App Purchases
- [ ] Subscription group created ("Revelia Premium")
- [ ] Weekly subscription created (`revelia_weekly`, $7.99/week, 7-day trial)
- [ ] Monthly subscription created (`revelia_monthly`, $14.99/month, 7-day trial)
- [ ] Yearly subscription created (`revelia_yearly`, $59.99/year, 7-day trial)
- [ ] Lifetime purchase created (`revelia_lifetime`, $99.99 one-time)
- [ ] All products approved by Apple

### App Store Listing
- [ ] App icon uploaded (1024x1024 PNG)
- [ ] Screenshots uploaded (6.7" - 6 screenshots)
- [ ] Screenshots uploaded (6.5" - 6 screenshots)
- [ ] iPad screenshots uploaded (optional but recommended)
- [ ] Promotional text set (170 characters)
- [ ] Description set (4000 characters)
- [ ] Keywords set (100 characters)
- [ ] What's New set (version 1.0.0 release notes)

### App Privacy
- [ ] Privacy questionnaire completed
- [ ] Data types disclosed (Contact Info, Photos, Identifiers, Usage, Diagnostics)
- [ ] Biometric data disclosure completed (face/palm photos)
- [ ] Data usage purposes set (App Functionality, Analytics)
- [ ] Privacy policy reviewed and accurate

### Age Rating
- [ ] Age rating questionnaire completed
- [ ] Rating confirmed as 12+ (mystical content)

### Build Upload
- [ ] Build uploaded via EAS (`eas submit --platform ios`)
- [ ] Build processing complete (wait 10-30 minutes)
- [ ] Build selected in App Store Connect
- [ ] Export compliance answered (Yes, standard encryption)

### App Review
- [ ] Demo account created (demo@revelia.app / Demo123456!)
- [ ] Demo account tested and working
- [ ] Review notes written (clear instructions for reviewers)
- [ ] Contact information provided
- [ ] App submitted for review

---

## ✅ Google Play Console (Android) (25 items)

### App Creation
- [ ] App created in Play Console
- [ ] App name set ("Revelia")
- [ ] Default language set (English - United States)
- [ ] App type set (App, not Game)
- [ ] Free/Paid set (Free)

### Store Listing
- [ ] Short description set (80 characters)
- [ ] Full description set (4000 characters)
- [ ] App icon uploaded (512x512 PNG)
- [ ] Feature graphic uploaded (1024x500 PNG)
- [ ] Phone screenshots uploaded (6 screenshots, 1080x1920)
- [ ] Tablet screenshots uploaded (optional, 6 screenshots)
- [ ] Category set (Lifestyle)
- [ ] Tags set (Astrology, Personalization, Entertainment)
- [ ] Contact email set (support@revelia.app)
- [ ] Website set (https://revelia.app)
- [ ] Privacy policy URL set (https://revelia.app/privacy)

### In-App Products
- [ ] Weekly subscription created (`revelia_weekly`, $7.99/week, 7-day trial)
- [ ] Monthly subscription created (`revelia_monthly`, $14.99/month, 7-day trial)
- [ ] Yearly subscription created (`revelia_yearly`, $59.99/year, 7-day trial)
- [ ] Lifetime product created (`revelia_lifetime`, $99.99 one-time)
- [ ] All products activated

### Content Rating
- [ ] Content rating questionnaire completed (IARC)
- [ ] Rating confirmed as ESRB: Teen (13+), PEGI: 12
- [ ] Certificate generated

### Data Safety
- [ ] Data safety form completed
- [ ] Data types disclosed (Personal info, Photos, App activity, Diagnostics)
- [ ] Biometric data disclosure completed
- [ ] Data usage purposes set
- [ ] Data deletion available confirmed

### App Release
- [ ] AAB file uploaded via EAS (`eas submit --platform android`)
- [ ] Release notes set (version 1.0.0)
- [ ] Internal testing track created
- [ ] Internal testers added
- [ ] Internal testing release rolled out
- [ ] Internal testing completed (all features tested)
- [ ] Production release created
- [ ] Production release submitted for review

---

## ✅ Feature Verification (30 items)

### Authentication
- [ ] Email signup works (new user can create account)
- [ ] Email login works (existing user can log in)
- [ ] Apple Sign In works (iOS)
- [ ] Google Sign In works (iOS and Android)
- [ ] Password reset works (if implemented)
- [ ] JWT tokens generated and validated correctly

### Onboarding
- [ ] Birth data collection works (name, DOB, location)
- [ ] Birth data saved to profile
- [ ] Zodiac sign calculated correctly
- [ ] Life path number calculated correctly

### Camera & Capture
- [ ] Camera permission requested correctly
- [ ] Face capture works (camera opens, photo taken)
- [ ] Palm capture works (camera opens, photo taken)
- [ ] Photos uploaded to R2 successfully
- [ ] Photos accessible via public URL
- [ ] Photo quality acceptable

### Reading Generation
- [ ] Face reading generates successfully
- [ ] Palm reading generates successfully
- [ ] Readings use Claude API (check Anthropic console for usage)
- [ ] Readings are personalized (not generic)
- [ ] Readings saved to database
- [ ] Readings displayed correctly in app
- [ ] Reading history accessible

### Profile & Insights
- [ ] Combined profile displays (face + palm + birth data)
- [ ] Daily insight generates on first app open
- [ ] Daily insight updates daily (test by changing device date)
- [ ] Weekly forecast generates (premium feature)
- [ ] Monthly reading generates (premium feature)
- [ ] Streak tracking works (increments daily)

### Compatibility
- [ ] Partner details can be entered
- [ ] Compatibility reading generates
- [ ] Compatibility score calculated
- [ ] Compatibility insights displayed
- [ ] Multiple partners can be added

### Subscriptions
- [ ] Paywall displays for free users
- [ ] Subscription plans displayed correctly (4 plans)
- [ ] Free trial badge shown (7 days)
- [ ] Purchase flow works (sandbox mode)
- [ ] Subscription verified via RevenueCat
- [ ] Premium features unlocked after purchase
- [ ] Restore purchases works (on new device)
- [ ] Subscription status synced across devices

### Notifications
- [ ] Notification permission requested
- [ ] User can enable/disable notifications
- [ ] Daily insight notification received (test by scheduling)
- [ ] Notification opens app to correct screen
- [ ] Notification settings saved

### Engagement
- [ ] Share functionality works (reading can be shared)
- [ ] Share sheet displays correctly
- [ ] Shared content includes reading text and image
- [ ] App review prompt appears (after 3 readings or 7 days)
- [ ] App review prompt can be dismissed

### Account Management
- [ ] User can view profile
- [ ] User can edit profile (name, birth data)
- [ ] User can view subscription status
- [ ] User can manage subscription (link to App Store/Play Store)
- [ ] User can delete account
- [ ] Account deletion removes all data (verify in database)

---

## ✅ Legal & Compliance (10 items)

### Documentation
- [ ] Privacy policy published at https://revelia.app/privacy
- [ ] Terms of service published at https://revelia.app/terms
- [ ] Support page created at https://revelia.app/support
- [ ] Privacy policy and terms linked in app (Settings)

### Disclaimers
- [ ] Entertainment disclaimer displayed on all readings
- [ ] Entertainment disclaimer in app description
- [ ] Entertainment disclaimer in terms of service

### Consent
- [ ] Camera permission includes clear explanation
- [ ] Photo permission includes clear explanation
- [ ] Biometric consent obtained before camera access
- [ ] User can revoke consent (delete photos)

---

## ✅ Security & Performance (10 items)

### Security
- [ ] HTTPS enabled (all API calls encrypted)
- [ ] JWT tokens secure (32+ character secret)
- [ ] Passwords hashed (bcrypt)
- [ ] Rate limiting enabled (auth: 5/15min, readings: 10/hour)
- [ ] Security headers present (Helmet middleware)
- [ ] MongoDB sanitization enabled (NoSQL injection prevention)
- [ ] Input validation on all endpoints (Zod schemas)

### Performance
- [ ] API response times acceptable (<2s for readings)
- [ ] Image upload times acceptable (<5s)
- [ ] App launch time acceptable (<3s)
- [ ] No memory leaks (test with long session)

---

## ✅ Monitoring & Analytics (8 items)

### Error Monitoring
- [ ] Sentry configured for backend
- [ ] Sentry configured for mobile
- [ ] Test errors sent to Sentry
- [ ] Sentry alerts configured (email on critical errors)

### Analytics
- [ ] Key events tracked (signup, reading, subscription)
- [ ] User properties set (subscription status, reading count)
- [ ] Funnel analysis possible (signup → reading → subscription)
- [ ] Dashboard accessible and useful

---

## ✅ Final Smoke Tests (10 critical paths)

### Test 1: New User Journey
- [ ] Install app from TestFlight/Internal Testing
- [ ] Complete onboarding (signup, birth data)
- [ ] Capture face photo
- [ ] Generate face reading
- [ ] View reading result
- [ ] Share reading
- [ ] Close and reopen app (data persists)

### Test 2: Free User Paywall
- [ ] Generate first reading (free)
- [ ] Attempt second reading (paywall appears)
- [ ] View subscription plans
- [ ] Close paywall (can still view existing reading)

### Test 3: Premium Upgrade
- [ ] Tap "Start Free Trial"
- [ ] Complete purchase (sandbox mode)
- [ ] Verify premium unlocked
- [ ] Generate unlimited readings
- [ ] Access daily insights
- [ ] Access weekly forecast
- [ ] Access monthly reading

### Test 4: Returning User
- [ ] Close app completely
- [ ] Reopen app (auto-login)
- [ ] View home screen (daily insight present)
- [ ] View reading history
- [ ] Generate new reading

### Test 5: Compatibility
- [ ] Navigate to compatibility
- [ ] Enter partner details
- [ ] Generate compatibility reading
- [ ] View compatibility score
- [ ] Share compatibility result

### Test 6: Notifications
- [ ] Enable notifications
- [ ] Wait for daily insight notification (or trigger manually)
- [ ] Tap notification
- [ ] App opens to insight screen

### Test 7: Subscription Management
- [ ] Go to Settings → Subscription
- [ ] View subscription status
- [ ] Tap "Manage Subscription" (opens App Store/Play Store)
- [ ] Cancel subscription (in store)
- [ ] Return to app (still has access until period ends)

### Test 8: Restore Purchases
- [ ] Install app on second device
- [ ] Login with same account
- [ ] Tap "Restore Purchases"
- [ ] Premium unlocked on second device

### Test 9: Account Deletion
- [ ] Go to Settings → Account → Delete Account
- [ ] Confirm deletion
- [ ] App logs out
- [ ] Verify data deleted in database
- [ ] Attempt to login (account not found)

### Test 10: Error Handling
- [ ] Turn off internet
- [ ] Attempt to generate reading (error message shown)
- [ ] Turn on internet
- [ ] Retry (works)
- [ ] Verify error logged in Sentry

---

## ✅ Pre-Submission Final Checks (15 items)

### Code Quality
- [ ] No console.log statements in production code
- [ ] No TODO comments in critical code
- [ ] No hardcoded secrets or API keys
- [ ] All environment variables documented
- [ ] Code linted (no errors)
- [ ] TypeScript compiles without errors

### Assets
- [ ] App icon correct (no transparency, correct size)
- [ ] Splash screen correct
- [ ] All images optimized (reasonable file sizes)
- [ ] No placeholder images or text

### Content
- [ ] All text proofread (no typos)
- [ ] All descriptions accurate
- [ ] All links working
- [ ] All legal documents reviewed

### Testing
- [ ] Tested on multiple iOS devices (if possible)
- [ ] Tested on multiple Android devices (if possible)
- [ ] Tested on different screen sizes
- [ ] Tested in different network conditions (WiFi, 4G, slow)
- [ ] Tested with low battery (no excessive drain)

---

## ✅ Post-Submission (5 items)

### Monitoring
- [ ] Check App Store Connect for review status (daily)
- [ ] Check Play Console for review status (daily)
- [ ] Monitor Sentry for errors
- [ ] Monitor Railway logs for issues
- [ ] Monitor Anthropic console for API usage/costs

---

## ✅ Launch Day (10 items)

### App Store Approval
- [ ] iOS app approved and live
- [ ] Android app approved and live
- [ ] Verify apps are searchable in stores
- [ ] Verify apps can be downloaded
- [ ] Verify store listings display correctly

### Final Testing
- [ ] Download from App Store (not TestFlight)
- [ ] Download from Play Store (not Internal Testing)
- [ ] Complete full user journey on production apps
- [ ] Verify subscriptions work (real purchase, then refund)
- [ ] Verify all features work in production

---

## Summary

**Total Checklist Items:** 120+

**Completion Status:**
- [ ] All items checked
- [ ] Ready for production launch
- [ ] Team notified
- [ ] Launch date set

**Estimated Timeline:**
- Day 1: Accounts, infrastructure, backend deployment (8 hours)
- Day 2: Mobile builds, App Store Connect, Play Console (8 hours)
- Day 3: Testing, verification, submission (8 hours)
- Review period: 1-7 days (Apple and Google)

**Next Steps After Launch:**
1. Monitor metrics (DAU, retention, conversion)
2. Respond to reviews
3. Fix critical bugs
4. Plan feature updates
5. Optimize ASO (App Store Optimization)

---

**Checklist Version:** 1.0.0  
**Last Updated:** January 31, 2026  
**Status:** ✅ Ready for Use
