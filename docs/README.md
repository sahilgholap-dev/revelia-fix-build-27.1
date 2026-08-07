# Revelia Production Deployment Documentation

## Overview

Complete documentation for deploying Revelia to production and submitting to app stores.

**Status:** ✅ Ready for Production Launch  
**Last Updated:** January 31, 2026  
**Version:** 1.0.0

---

## Documentation Index

### 1. Production Deployment Guide
**File:** [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md)

**Contents:**
- Prerequisites checklist (all required accounts)
- MongoDB Atlas setup
- Cloudflare R2 setup
- Backend deployment to Railway
- Mobile app builds with Expo EAS
- App Store Connect submission (iOS)
- Google Play Console submission (Android)
- Post-deployment verification
- RevenueCat configuration
- OneSignal configuration
- Sentry configuration
- Troubleshooting
- Cost estimates

**Time to Complete:** 2-3 days

**Use When:** Ready to deploy to production

---

### 2. App Store Metadata
**File:** [APP_STORE_METADATA.md](./APP_STORE_METADATA.md)

**Contents:**
- App name, subtitle, description
- Keywords and categories
- Age rating
- Release notes (version 1.0.0 and templates)
- Subscription product details
- App review information
- Privacy and data collection disclosure
- Export compliance
- ASO (App Store Optimization) strategy

**Use When:** Filling out App Store Connect and Play Console

---

### 3. Screenshot Specifications
**File:** [SCREENSHOTS.md](./SCREENSHOTS.md)

**Contents:**
- Required sizes (iOS and Android)
- Screenshot plan (6 screens)
- Design guidelines (colors, typography, layout)
- Tools and resources (Figma, mockup generators)
- Creation workflow (3 options)
- Screenshot content examples
- Quality checklist
- A/B testing strategy

**Use When:** Creating app store screenshots

---

### 4. Privacy Policy
**File:** [PRIVACY_POLICY.md](./PRIVACY_POLICY.md)

**Contents:**
- Information we collect (personal, biometric, usage)
- How we use information
- How we share information (service providers)
- Data storage and security
- Your privacy rights (access, deletion, opt-out)
- California residents (CCPA)
- European residents (GDPR)
- Children's privacy
- Biometric data disclosure (Illinois BIPA)
- Data breach notification

**Use When:** 
- Publishing to website (https://revelia.app/privacy)
- App Store submission (required)
- Legal compliance

**IMPORTANT:** Review with legal counsel before publishing

---

### 5. Terms of Service
**File:** [TERMS_OF_SERVICE.md](./TERMS_OF_SERVICE.md)

**Contents:**
- Acceptance of terms
- Description of service
- **ENTERTAINMENT DISCLAIMER** (critical)
- Account registration and responsibilities
- Subscription terms (pricing, billing, cancellation, refunds)
- User content (photos, ownership, license)
- Intellectual property
- Prohibited uses
- Limitation of liability
- Indemnification
- Dispute resolution (arbitration, class action waiver)
- Governing law

**Use When:**
- Publishing to website (https://revelia.app/terms)
- App Store submission (required)
- Legal compliance

**IMPORTANT:** Review with legal counsel before publishing

---

### 6. Pre-Launch Checklist
**File:** [PRE_LAUNCH_CHECKLIST.md](./PRE_LAUNCH_CHECKLIST.md)

**Contents:**
- Accounts & Services (25 items)
- Backend Deployment (20 items)
- Database Setup (10 items)
- Image Storage (8 items)
- Mobile Build (15 items)
- App Store Connect (30 items)
- Google Play Console (25 items)
- Feature Verification (30 items)
- Legal & Compliance (10 items)
- Security & Performance (10 items)
- Monitoring & Analytics (8 items)
- Final Smoke Tests (10 critical paths)
- Pre-Submission Final Checks (15 items)
- Post-Submission (5 items)
- Launch Day (10 items)

**Total Items:** 120+

**Use When:** Before submitting to app stores (go through every item)

---

### 7. Version Management Guide
**File:** [VERSION_MANAGEMENT.md](./VERSION_MANAGEMENT.md)

**Contents:**
- Semantic versioning (MAJOR.MINOR.PATCH)
- Build numbers (iOS and Android)
- Version lifecycle (development, preview, production)
- Release process (6 steps)
- Changelog format
- Release notes templates
- Hotfix process
- OTA updates (Over-The-Air)
- Version rollback
- Best practices

**Use When:** 
- Planning releases
- Creating changelogs
- Managing versions

---

### 8. Monitoring & Analytics Guide
**File:** [MONITORING.md](./MONITORING.md)

**Contents:**
- Error monitoring (Sentry)
- Application performance monitoring (APM)
- Business metrics (DAU, MAU, retention, conversion, MRR)
- Technical metrics (API performance, database, Claude API, R2)
- User behavior analytics (funnels, segmentation, cohorts)
- Monitoring dashboard (daily, weekly, monthly)
- Alerting strategy (critical, warning, info)
- Tools and integrations
- Reporting (daily, weekly, monthly)
- Best practices

**Use When:**
- Setting up monitoring
- Daily/weekly/monthly reviews
- Investigating issues

---

## Quick Start

### For First-Time Deployment

**Day 1: Infrastructure Setup**
1. Read [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md) sections A-C
2. Create all required accounts
3. Set up MongoDB Atlas
4. Set up Cloudflare R2
5. Deploy backend to Railway
6. Verify health check

**Day 2: Mobile Builds & Store Setup**
1. Read [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md) sections D-G
2. Create EAS builds (preview)
3. Test on physical devices
4. Create production builds
5. Set up App Store Connect
6. Set up Google Play Console
7. Create screenshots (use [SCREENSHOTS.md](./SCREENSHOTS.md))

**Day 3: Testing & Submission**
1. Go through [PRE_LAUNCH_CHECKLIST.md](./PRE_LAUNCH_CHECKLIST.md)
2. Complete all 120+ items
3. Publish privacy policy and terms
4. Submit to App Store
5. Submit to Play Store
6. Set up monitoring

**Day 4-10: Review Period**
1. Monitor review status
2. Respond to reviewer questions
3. Fix any issues
4. Wait for approval

**Launch Day:**
1. Verify apps are live
2. Test production apps
3. Monitor metrics
4. Celebrate! 🎉

---

## File Structure

```
/app/docs/
├── README.md                      # This file
├── PRODUCTION_DEPLOYMENT.md       # Complete deployment guide
├── APP_STORE_METADATA.md          # Store listing content
├── SCREENSHOTS.md                 # Screenshot specifications
├── PRIVACY_POLICY.md              # Privacy policy (publish to website)
├── TERMS_OF_SERVICE.md            # Terms of service (publish to website)
├── PRE_LAUNCH_CHECKLIST.md        # 120+ item checklist
├── VERSION_MANAGEMENT.md          # Version and release management
└── MONITORING.md                  # Monitoring and analytics

/app/server/
└── .env.example                   # Environment variables template

/app/mobile/
├── eas.json                       # EAS build configuration (UPDATED)
└── app.json                       # Expo app configuration
```

---

## Key Decisions Made

### Infrastructure

**Backend Hosting:** Railway
- Reason: Easy deployment, auto-scaling, good free tier
- Alternative: Render, Heroku, AWS

**Database:** MongoDB Atlas
- Reason: Managed, free tier, easy scaling
- Alternative: PostgreSQL on Railway

**Image Storage:** Cloudflare R2
- Reason: S3-compatible, cheaper than S3, global CDN
- Alternative: AWS S3, Google Cloud Storage

**Mobile Builds:** Expo EAS
- Reason: Cloud builds, no Mac required, easy CI/CD
- Alternative: Local builds, Fastlane

### Services

**AI:** Claude API (Anthropic)
- Reason: Best quality for creative content, reasonable cost
- Cost: ~$0.03 per reading

**Subscriptions:** RevenueCat
- Reason: Cross-platform, free tier, great analytics
- Alternative: Native StoreKit/Billing, Stripe

**Push Notifications:** OneSignal
- Reason: Free tier, easy setup, good features
- Alternative: Firebase Cloud Messaging, Pusher

**Error Monitoring:** Sentry
- Reason: Industry standard, free tier, great features
- Alternative: Bugsnag, Rollbar

### Pricing

**Subscription Plans:**
- Weekly: $7.99/week (for users who want to try short-term)
- Monthly: $14.99/month (most popular, 25% savings vs weekly)
- Yearly: $59.99/year (best value, 60% savings vs weekly)
- Lifetime: $99.99 one-time (for committed users)

**Free Trial:** 7 days (industry standard, good conversion)

**Reasoning:**
- Competitive with similar apps (Co-Star, The Pattern)
- Multiple price points for different user segments
- Free trial reduces friction
- Lifetime option for high-value users

---

## Important Notes

### Legal Disclaimer

**CRITICAL:** The entertainment disclaimer is essential:

> "THE READINGS PROVIDED BY REVELIA ARE FOR ENTERTAINMENT AND SELF-REFLECTION PURPOSES ONLY. REVELIA DOES NOT PROVIDE MEDICAL, PSYCHOLOGICAL, FINANCIAL, OR LEGAL ADVICE."

**Why it matters:**
- Protects against liability
- Required for app store approval
- Sets user expectations
- Prevents misuse

**Where to include:**
- Terms of Service (prominent section)
- App Store description
- In-app (on every reading)
- Privacy Policy

### Biometric Data

**Face and palm photos are biometric data** under some laws (GDPR, BIPA).

**Requirements:**
- Explicit consent before collection
- Clear explanation of purpose
- Secure storage
- User can delete anytime
- Disclosure in privacy policy
- Disclosure in app store listing

**Compliance:**
- Privacy Policy has detailed biometric section
- App requests permission with clear explanation
- Users can delete photos in settings
- Data deleted within 30 days of account deletion

### Security

**Production security features enabled:**
- HTTPS (all API calls encrypted)
- JWT tokens (secure authentication)
- Password hashing (bcrypt)
- Rate limiting (prevent abuse)
- Security headers (Helmet)
- MongoDB sanitization (prevent NoSQL injection)
- Input validation (Zod schemas)

**See:** `/app/server/PRODUCTION_SECURITY.md` for details

---

## Cost Breakdown

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

### Scaling

**At 10,000 active users:**
- Infrastructure: $100/month
- Claude API: $9,000/month
- Total: ~$9,100/month
- Revenue (10% conversion): $14,990/month
- **Profit: $5,890/month**

**Cost optimization:**
- Rate limiting prevents abuse (10 readings/hour per user)
- Caching reduces API calls
- Efficient prompts reduce token usage

---

## Support

### For Deployment Issues

1. Check relevant documentation file
2. Review troubleshooting section
3. Check service-specific documentation:
   - Railway: https://docs.railway.app
   - MongoDB Atlas: https://docs.atlas.mongodb.com
   - Expo EAS: https://docs.expo.dev/eas
   - RevenueCat: https://docs.revenuecat.com
4. Check logs (Railway, Sentry)
5. Contact service support if needed

### For Legal Questions

**IMPORTANT:** This documentation is not legal advice.

- Consult with a lawyer before publishing privacy policy and terms
- Ensure compliance with local laws (GDPR, CCPA, BIPA, etc.)
- Review app store guidelines
- Consider liability insurance

### For Technical Questions

- Backend: See `/app/server/README.md`
- Mobile: See `/app/mobile/README.md`
- Security: See `/app/server/PRODUCTION_SECURITY.md`

---

## Next Steps After Launch

### Week 1: Monitor & Stabilize

- Monitor error rates (Sentry)
- Monitor user feedback (reviews)
- Fix critical bugs immediately
- Respond to all reviews
- Monitor costs (Claude API)

### Week 2-4: Optimize

- Analyze user behavior
- Identify drop-off points
- Optimize conversion funnel
- A/B test paywall
- Improve onboarding

### Month 2: Iterate

- Add most-requested features
- Improve reading quality
- Optimize performance
- Reduce costs
- Plan marketing

### Month 3+: Scale

- Expand to more markets (localization)
- Add more reading types
- Build community features
- Optimize ASO
- Consider paid marketing

---

## Success Metrics

### Week 1 Goals

- [ ] 100+ downloads
- [ ] 50+ active users
- [ ] 10+ paying users
- [ ] 4.0+ star rating
- [ ] <1% error rate

### Month 1 Goals

- [ ] 1,000+ downloads
- [ ] 500+ active users
- [ ] 50+ paying users
- [ ] $500+ MRR
- [ ] 40%+ D1 retention
- [ ] 20%+ D7 retention

### Month 3 Goals

- [ ] 5,000+ downloads
- [ ] 2,000+ active users
- [ ] 200+ paying users
- [ ] $2,000+ MRR
- [ ] 10%+ free-to-paid conversion

### Month 6 Goals

- [ ] 10,000+ downloads
- [ ] 5,000+ active users
- [ ] 500+ paying users
- [ ] $5,000+ MRR
- [ ] Profitable (revenue > costs)

---

## Changelog

### Version 1.0.0 (January 31, 2026)

**Created:**
- Production deployment guide
- App store metadata
- Screenshot specifications
- Privacy policy
- Terms of service
- Pre-launch checklist (120+ items)
- Version management guide
- Monitoring & analytics guide
- Environment variables template
- Updated eas.json for production

**Status:** ✅ Complete and ready for production deployment

---

## License

This documentation is proprietary and confidential.

© 2026 Revelia Inc. All rights reserved.

---

**Documentation Version:** 1.0.0  
**Last Updated:** January 31, 2026  
**Status:** ✅ Complete  
**Ready for Production:** Yes
