# Revelia App Store Submission Checklist

Complete checklist for submitting Revelia to Apple App Store and Google Play Store.

## Pre-Submission Requirements

### Legal & Compliance

- [ ] **Privacy Policy** created and hosted at `https://revelia.app/privacy`
- [ ] **Terms of Service** created and hosted at `https://revelia.app/terms`
- [ ] **Support Page** created at `https://revelia.app/support`
- [ ] **Data Deletion Instructions** documented
- [ ] **Age Rating** determined (12+ recommended)
- [ ] **Export Compliance** reviewed (encryption usage)

### App Store Accounts

- [ ] **Apple Developer Program** membership active ($99/year)
- [ ] **Google Play Console** account created ($25 one-time)
- [ ] **App Store Connect** access configured
- [ ] **Play Console** access configured

---

## iOS App Store Assets

### App Icon

- [ ] **1024x1024px** PNG (no transparency, no rounded corners)
  - Location: `mobile/assets/icon.png`
  - Requirements:
    - RGB color space
    - No alpha channel
    - No text or UI elements that change

### Screenshots

Required sizes (portrait orientation):

**iPhone 6.7" (iPhone 14 Pro Max, 15 Pro Max):**
- [ ] Screenshot 1: **1290x2796px** - Home/Welcome screen
- [ ] Screenshot 2: **1290x2796px** - Face reading feature
- [ ] Screenshot 3: **1290x2796px** - Palm reading feature
- [ ] Screenshot 4: **1290x2796px** - Reading results
- [ ] Screenshot 5: **1290x2796px** - Subscription/paywall (optional)

**iPhone 6.5" (iPhone 11 Pro Max, XS Max):**
- [ ] Screenshot 1: **1242x2688px** - Home/Welcome screen
- [ ] Screenshot 2: **1242x2688px** - Face reading feature
- [ ] Screenshot 3: **1242x2688px** - Palm reading feature
- [ ] Screenshot 4: **1242x2688px** - Reading results
- [ ] Screenshot 5: **1242x2688px** - Subscription/paywall (optional)

**iPad Pro 12.9" (optional but recommended):**
- [ ] Screenshot 1: **2048x2732px** - Home screen
- [ ] Screenshot 2: **2048x2732px** - Feature showcase
- [ ] Screenshot 3: **2048x2732px** - Results view

### App Preview Videos (Optional)

- [ ] **iPhone 6.7"**: 1080x1920px, 15-30 seconds
- [ ] **iPhone 6.5"**: 1080x1920px, 15-30 seconds
- [ ] Format: .mov, .mp4, or .m4v
- [ ] Max file size: 500MB

### App Information

- [ ] **App Name**: "Revelia" (max 30 characters)
- [ ] **Subtitle**: "AI Face & Palm Readings" (max 30 characters)
- [ ] **Promotional Text**: Short tagline (max 170 characters)
- [ ] **Description**: Full app description (max 4000 characters)
- [ ] **Keywords**: Comma-separated (max 100 characters)
- [ ] **Support URL**: `https://revelia.app/support`
- [ ] **Marketing URL**: `https://revelia.app` (optional)
- [ ] **Privacy Policy URL**: `https://revelia.app/privacy`

### Categories

- [ ] **Primary Category**: Lifestyle
- [ ] **Secondary Category**: Entertainment

### Age Rating

- [ ] Complete questionnaire in App Store Connect
- [ ] Expected rating: **12+** (Infrequent/Mild Simulated Gambling)

### App Privacy

Data types collected:

- [ ] **Contact Info**: Email address
- [ ] **User Content**: Photos (face/palm images)
- [ ] **Identifiers**: User ID
- [ ] **Usage Data**: Product interaction, analytics
- [ ] **Diagnostics**: Crash data, performance data

For each data type, specify:
- [ ] Linked to user identity
- [ ] Used for tracking (No)
- [ ] Purpose: App functionality, analytics, product personalization

### In-App Purchases

Create subscription products:

- [ ] **Weekly Subscription**: $4.99/week
  - Product ID: `com.revelia.app.weekly`
  - Free trial: 3 days
  
- [ ] **Monthly Subscription**: $9.99/month
  - Product ID: `com.revelia.app.monthly`
  - Free trial: 7 days
  
- [ ] **Yearly Subscription**: $49.99/year
  - Product ID: `com.revelia.app.yearly`
  - Free trial: 7 days

### Build Information

- [ ] **Version**: 1.0.0
- [ ] **Build Number**: Auto-incremented by EAS
- [ ] **Bundle ID**: `com.srcoderz99.revelia`
- [ ] **Minimum iOS Version**: 14.0
- [ ] **Supported Devices**: iPhone, iPad

---

## Android Play Store Assets

### App Icon

- [ ] **512x512px** PNG (32-bit, with transparency)
  - Location: `mobile/assets/icon.png`
  - Requirements:
    - PNG format
    - 32-bit color
    - Transparency allowed

### Feature Graphic

- [ ] **1024x500px** JPG or PNG
  - Showcases app branding
  - No text (will be overlaid)
  - High quality, eye-catching

### Screenshots

Minimum 2, maximum 8 per device type:

**Phone (required):**
- [ ] Screenshot 1: **1080x1920px** - Home/Welcome screen
- [ ] Screenshot 2: **1080x1920px** - Face reading feature
- [ ] Screenshot 3: **1080x1920px** - Palm reading feature
- [ ] Screenshot 4: **1080x1920px** - Reading results
- [ ] Screenshot 5: **1080x1920px** - Subscription screen (optional)

**7-inch Tablet (optional):**
- [ ] Screenshot 1: **1200x1920px** - Home screen
- [ ] Screenshot 2: **1200x1920px** - Feature showcase

**10-inch Tablet (optional):**
- [ ] Screenshot 1: **1800x2560px** - Home screen
- [ ] Screenshot 2: **1800x2560px** - Feature showcase

### Promo Video (Optional)

- [ ] **YouTube URL** of 30-second to 2-minute video
- [ ] Shows key features and benefits

### Store Listing

- [ ] **App Name**: "Revelia" (max 50 characters)
- [ ] **Short Description**: One-liner (max 80 characters)
- [ ] **Full Description**: Detailed description (max 4000 characters)
- [ ] **App Category**: Lifestyle
- [ ] **Tags**: Entertainment, Personalization
- [ ] **Contact Email**: support@revelia.app
- [ ] **Website**: https://revelia.app
- [ ] **Privacy Policy**: https://revelia.app/privacy

### Content Rating

- [ ] Complete IARC questionnaire
- [ ] Expected ratings:
  - ESRB: Everyone 12+
  - PEGI: 12
  - USK: 12
  - Reason: Simulated Gambling (fortune telling)

### Data Safety

Data collected:

- [ ] **Personal Info**: Email address
- [ ] **Photos and Videos**: User-uploaded images
- [ ] **App Activity**: In-app actions
- [ ] **App Info and Performance**: Crash logs, diagnostics

For each data type:
- [ ] Purpose: App functionality, analytics
- [ ] Shared: No
- [ ] Optional: No (required for core functionality)
- [ ] Encrypted in transit: Yes
- [ ] Users can request deletion: Yes

### In-App Products

Create subscription products in Play Console:

- [ ] **Weekly Subscription**: $4.99/week
  - Product ID: `weekly_subscription`
  - Free trial: 3 days
  
- [ ] **Monthly Subscription**: $9.99/month
  - Product ID: `monthly_subscription`
  - Free trial: 7 days
  
- [ ] **Yearly Subscription**: $49.99/year
  - Product ID: `yearly_subscription`
  - Free trial: 7 days

### Build Information

- [ ] **Version Name**: 1.0.0
- [ ] **Version Code**: Auto-incremented by EAS
- [ ] **Package Name**: `com.srcoderz99.revelia`
- [ ] **Minimum SDK**: 21 (Android 5.0)
- [ ] **Target SDK**: 34 (Android 14)

---

## Technical Requirements

### iOS

- [ ] App built with EAS production profile
- [ ] Tested on iOS 14, 15, 16, 17
- [ ] Tested on iPhone SE, iPhone 14, iPhone 15 Pro Max
- [ ] Tested on iPad (if supporting)
- [ ] No crashes or major bugs
- [ ] Performance acceptable (< 3s launch time)
- [ ] All features functional
- [ ] Push notifications working
- [ ] In-app purchases working (sandbox)
- [ ] Face ID/Touch ID working (if implemented)
- [ ] Camera permissions working
- [ ] Photo library permissions working

### Android

- [ ] App built with EAS production profile (AAB)
- [ ] Tested on Android 10, 11, 12, 13, 14
- [ ] Tested on various screen sizes (small, normal, large, xlarge)
- [ ] Tested on different manufacturers (Samsung, Google, OnePlus)
- [ ] No crashes or major bugs
- [ ] Performance acceptable (< 3s launch time)
- [ ] All features functional
- [ ] Push notifications working
- [ ] In-app purchases working (sandbox)
- [ ] Biometric authentication working (if implemented)
- [ ] Camera permissions working
- [ ] Storage permissions working

---

## Submission Process

### iOS Submission

1. **Build and Submit:**
   ```bash
   cd mobile
   eas build --profile production --platform ios
   eas submit --platform ios --latest
   ```

2. **Complete App Store Connect:**
   - [ ] Upload screenshots
   - [ ] Add app description
   - [ ] Set pricing (Free with IAP)
   - [ ] Configure in-app purchases
   - [ ] Complete privacy questionnaire
   - [ ] Add age rating
   - [ ] Set availability (all countries or specific)

3. **Submit for Review:**
   - [ ] Click "Submit for Review"
   - [ ] Answer export compliance questions
   - [ ] Provide demo account (if needed)
   - [ ] Add review notes (optional)

4. **Wait for Review:**
   - Typical time: 24-48 hours
   - Check status in App Store Connect
   - Respond to any questions promptly

### Android Submission

1. **Build and Submit:**
   ```bash
   cd mobile
   eas build --profile production --platform android
   eas submit --platform android --latest
   ```

2. **Complete Play Console:**
   - [ ] Upload screenshots and feature graphic
   - [ ] Add app description
   - [ ] Set pricing (Free with IAP)
   - [ ] Configure in-app products
   - [ ] Complete data safety form
   - [ ] Add content rating
   - [ ] Set countries (all or specific)

3. **Create Release:**
   - [ ] Go to Production track
   - [ ] Create new release
   - [ ] Add release notes
   - [ ] Set rollout percentage (start with 20%)

4. **Submit for Review:**
   - [ ] Click "Review Release"
   - [ ] Confirm all details
   - [ ] Click "Start Rollout to Production"

5. **Wait for Review:**
   - Typical time: Few hours to few days
   - Check status in Play Console
   - Respond to any issues

---

## Post-Submission

### Monitor Launch

- [ ] Check Sentry for crashes
- [ ] Monitor user reviews
- [ ] Track analytics in Mixpanel
- [ ] Monitor subscription conversions in RevenueCat
- [ ] Check server logs for API errors
- [ ] Monitor server performance

### Respond to Reviews

- [ ] Set up review monitoring
- [ ] Respond to negative reviews within 24 hours
- [ ] Thank users for positive reviews
- [ ] Address bugs mentioned in reviews

### Marketing

- [ ] Announce launch on social media
- [ ] Send email to beta testers
- [ ] Submit to app review sites
- [ ] Create press kit
- [ ] Reach out to influencers

### Iterate

- [ ] Collect user feedback
- [ ] Plan next version features
- [ ] Fix critical bugs with OTA updates
- [ ] Schedule regular updates (every 2-4 weeks)

---

## Common Rejection Reasons

### iOS

1. **Incomplete Information:**
   - Missing privacy policy
   - Missing support URL
   - Incomplete app description

2. **Functionality Issues:**
   - App crashes on launch
   - Features don't work as described
   - Login/signup broken

3. **Privacy Concerns:**
   - Accessing data without permission
   - Not explaining data usage
   - Missing privacy disclosures

4. **In-App Purchase Issues:**
   - Subscription not clear
   - No restore purchases option
   - Pricing not transparent

5. **Design Issues:**
   - UI looks unfinished
   - Poor user experience
   - Not following iOS guidelines

### Android

1. **Policy Violations:**
   - Misleading content
   - Inappropriate content
   - Spam or deceptive behavior

2. **Technical Issues:**
   - App crashes
   - Permissions not justified
   - Security vulnerabilities

3. **Content Rating:**
   - Incorrect rating
   - Missing disclosures

4. **Data Safety:**
   - Incomplete data safety form
   - Not explaining data collection

---

## Resources

### iOS

- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [App Store Connect Help](https://help.apple.com/app-store-connect/)
- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [In-App Purchase Guidelines](https://developer.apple.com/app-store/subscriptions/)

### Android

- [Google Play Policy](https://play.google.com/about/developer-content-policy/)
- [Play Console Help](https://support.google.com/googleplay/android-developer/)
- [Material Design Guidelines](https://material.io/design)
- [In-App Billing](https://developer.android.com/google/play/billing)

### Tools

- [Screenshot Generator](https://www.screely.com/)
- [App Icon Generator](https://appicon.co/)
- [App Store Optimization](https://www.apptweaker.com/)
- [Review Monitoring](https://www.appfollow.io/)

---

## Timeline

**Week 1-2: Preparation**
- Create all assets
- Write descriptions
- Set up accounts
- Test thoroughly

**Week 3: Submission**
- Submit to both stores
- Monitor review status
- Respond to questions

**Week 4: Launch**
- Apps approved and live
- Monitor performance
- Respond to reviews
- Plan updates

---

**Last Updated:** 2025-01-XX  
**Revelia Version:** 1.0.0
