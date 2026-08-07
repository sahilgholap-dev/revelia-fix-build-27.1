# Monitoring & Analytics Guide

## Overview

Comprehensive guide for monitoring Revelia's health, performance, and user behavior in production.

---

## 1. Error Monitoring (Sentry)

### Setup

**Backend (Node.js):**
```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

**Mobile (React Native):**
```typescript
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: process.env.EXPO_PUBLIC_ENV,
  enableAutoSessionTracking: true,
  sessionTrackingIntervalMillis: 30000,
});
```

### Key Metrics to Monitor

**Error Rate:**
- Target: <1% of requests
- Alert: >5% error rate
- Critical: >10% error rate

**Crash-Free Rate:**
- Target: >99.5%
- Alert: <99%
- Critical: <98%

**Response Time:**
- Target: <2s for API calls
- Alert: >5s average
- Critical: >10s average

### Alerts Configuration

**Critical Alerts (Immediate):**
- App crashes on launch
- Payment system errors
- Database connection failures
- Claude API failures (>50% error rate)

**Warning Alerts (Within 1 hour):**
- Error rate >5%
- Slow response times (>5s)
- High memory usage
- Rate limit violations

**Info Alerts (Daily digest):**
- New error types
- Performance degradation
- Unusual usage patterns

### Sentry Dashboard

**Access:** https://sentry.io/organizations/revelia/

**Key Views:**
1. **Issues:** All errors grouped by type
2. **Performance:** API response times, slow queries
3. **Releases:** Errors by app version
4. **Users:** Affected users, user feedback

**Daily Routine:**
- Check for new critical errors (morning)
- Review error trends (afternoon)
- Triage and assign issues (end of day)

---

## 2. Application Performance Monitoring (APM)

### Backend Performance (Railway)

**Metrics to Track:**
- CPU usage (target: <70%)
- Memory usage (target: <80%)
- Request rate (requests/second)
- Response time (p50, p95, p99)
- Error rate (%)

**Railway Dashboard:**
- Access: https://railway.app/project/revelia
- View: Metrics tab
- Alerts: Configure in Settings

**Key Endpoints to Monitor:**
- `POST /api/readings/face` (most expensive)
- `POST /api/readings/palm` (most expensive)
- `POST /api/auth/login` (most frequent)
- `GET /api/profile` (most frequent)
- `POST /api/webhooks/revenuecat` (critical)

### Mobile Performance

**Metrics to Track:**
- App launch time (target: <3s)
- Screen render time (target: <1s)
- Memory usage (target: <200MB)
- Battery drain (target: <5%/hour)
- Network usage (target: <10MB/session)

**Tools:**
- Xcode Instruments (iOS)
- Android Profiler (Android)
- React Native Performance Monitor

---

## 3. Business Metrics

### User Acquisition

**Daily Active Users (DAU):**
- Definition: Users who open the app
- Target: Grow 10% week-over-week
- Track: Daily, weekly, monthly trends

**Monthly Active Users (MAU):**
- Definition: Users who open the app in 30 days
- Target: Grow 20% month-over-month
- Track: Monthly trends

**New Users:**
- Definition: First-time app opens
- Target: 100+ per day (after launch)
- Track: Daily signups, signup sources

**User Acquisition Cost (UAC):**
- Formula: Marketing spend / New users
- Target: <$5 per user (if running ads)
- Track: By channel (organic, paid, referral)

### User Engagement

**Session Length:**
- Definition: Time spent in app per session
- Target: >5 minutes average
- Track: Distribution (short, medium, long sessions)

**Sessions per User:**
- Definition: App opens per user per day
- Target: >2 sessions/day
- Track: Daily, weekly averages

**Reading Generation Rate:**
- Definition: Readings generated per user
- Target: >3 readings per user (lifetime)
- Track: By reading type (face, palm, compatibility)

**Feature Usage:**
- Face readings: % of users who generate
- Palm readings: % of users who generate
- Daily insights: % of users who view
- Compatibility: % of users who use
- Sharing: % of users who share

### Retention

**Day 1 Retention:**
- Definition: % of users who return next day
- Target: >40%
- Track: By cohort (signup date)

**Day 7 Retention:**
- Definition: % of users who return after 7 days
- Target: >20%
- Track: By cohort

**Day 30 Retention:**
- Definition: % of users who return after 30 days
- Target: >10%
- Track: By cohort

**Retention Curve:**
- Plot: % retained over time (Day 1, 7, 14, 30, 60, 90)
- Goal: Flatten curve (reduce churn)

### Monetization

**Free-to-Paid Conversion:**
- Definition: % of free users who subscribe
- Target: >10%
- Track: By cohort, by plan

**Trial-to-Paid Conversion:**
- Definition: % of trial users who convert to paid
- Target: >30%
- Track: By plan (weekly, monthly, yearly)

**Monthly Recurring Revenue (MRR):**
- Formula: Sum of all monthly subscription revenue
- Target: Grow 20% month-over-month
- Track: By plan, by cohort

**Average Revenue Per User (ARPU):**
- Formula: Total revenue / Total users
- Target: >$2 per user per month
- Track: Monthly trends

**Lifetime Value (LTV):**
- Formula: ARPU × Average customer lifetime (months)
- Target: >$50 per user
- Track: By cohort

**Churn Rate:**
- Definition: % of subscribers who cancel
- Target: <5% per month
- Track: By plan, by cohort

**Churn Reasons:**
- Track: Why users cancel (survey)
- Categories: Too expensive, not using, technical issues, other

---

## 4. Technical Metrics

### API Performance

**Request Volume:**
- Track: Requests per second, per minute, per hour
- Alert: Unusual spikes (>3x normal)

**Response Times:**
- p50 (median): Target <500ms
- p95: Target <2s
- p99: Target <5s

**Error Rates:**
- 4xx errors: Target <5% (client errors)
- 5xx errors: Target <1% (server errors)

**Endpoint Performance:**
| Endpoint | Target | Alert |
|----------|--------|-------|
| GET /api/health | <100ms | >500ms |
| POST /api/auth/login | <500ms | >2s |
| POST /api/readings/face | <30s | >60s |
| POST /api/readings/palm | <30s | >60s |
| GET /api/profile | <200ms | >1s |

### Database Performance

**MongoDB Atlas Metrics:**
- Connections: Target <100 concurrent
- Query time: Target <100ms average
- Index usage: Target >90% queries use indexes
- Storage: Monitor growth rate

**Slow Queries:**
- Alert: Queries >1s
- Investigate: Queries >5s
- Optimize: Add indexes, refactor queries

### Claude API Usage

**Request Volume:**
- Track: Requests per hour, per day
- Alert: Unusual spikes

**Cost:**
- Track: Daily spend, monthly spend
- Target: <$0.03 per reading
- Alert: >$100 per day

**Error Rate:**
- Track: Failed requests
- Alert: >10% error rate
- Investigate: Rate limits, API issues

**Response Time:**
- Track: Time to generate reading
- Target: <20s average
- Alert: >30s average

### Image Storage (Cloudflare R2)

**Storage Usage:**
- Track: Total GB stored
- Alert: Approaching limit (if on paid plan)

**Bandwidth:**
- Track: GB transferred per month
- Alert: Unusual spikes

**Upload Success Rate:**
- Track: Successful uploads / Total attempts
- Target: >99%
- Alert: <95%

---

## 5. User Behavior Analytics

### Funnel Analysis

**Signup Funnel:**
1. App install: 100%
2. Onboarding start: 90%
3. Birth data entered: 70%
4. Face photo captured: 50%
5. First reading generated: 40%

**Conversion Funnel:**
1. Free user: 100%
2. Hit paywall: 80%
3. View plans: 50%
4. Start trial: 20%
5. Convert to paid: 10%

**Optimize:**
- Identify drop-off points
- A/B test improvements
- Reduce friction

### User Segmentation

**By Subscription Status:**
- Free users
- Trial users
- Paid users (weekly, monthly, yearly, lifetime)
- Churned users

**By Engagement:**
- Power users (daily active)
- Regular users (weekly active)
- Casual users (monthly active)
- Inactive users (>30 days)

**By Reading Type:**
- Face reading users
- Palm reading users
- Both (face + palm)
- Compatibility users

**By Demographics:**
- Age groups
- Gender (if collected)
- Location (country, city)
- Zodiac sign

### Cohort Analysis

**Retention by Cohort:**
- Group users by signup week/month
- Track retention over time
- Compare cohorts (which cohorts retain better?)

**Revenue by Cohort:**
- Track MRR by signup cohort
- Identify high-value cohorts
- Optimize acquisition for similar users

---

## 6. Monitoring Dashboard

### Daily Dashboard (Check Every Morning)

**Health Check:**
- [ ] Backend API is up (https://api.revelia.app/api/health)
- [ ] Mobile app is accessible (check stores)
- [ ] No critical errors in Sentry
- [ ] No alerts from Railway

**Key Metrics:**
- DAU (yesterday)
- New users (yesterday)
- Readings generated (yesterday)
- Revenue (yesterday)
- Error rate (last 24 hours)

**Quick Actions:**
- Respond to critical errors
- Check user reviews (App Store, Play Store)
- Monitor social media mentions

### Weekly Dashboard (Check Every Monday)

**Growth Metrics:**
- MAU (last 30 days)
- Week-over-week growth
- Retention (D1, D7, D30)
- Conversion rate (free to paid)

**Performance:**
- Average response time
- Error rate trend
- Crash-free rate

**Revenue:**
- MRR
- New subscriptions
- Churn rate
- LTV

**User Feedback:**
- App Store reviews (average rating, new reviews)
- Play Store reviews (average rating, new reviews)
- Support tickets (volume, common issues)

### Monthly Dashboard (Check First of Month)

**Business Review:**
- Total users
- Active users (MAU)
- Paying users
- MRR
- Churn rate
- LTV

**Product Review:**
- Feature usage
- Most popular features
- Least used features
- User feedback themes

**Technical Review:**
- Infrastructure costs
- API costs (Claude, RevenueCat, etc.)
- Performance trends
- Error trends

**Planning:**
- Set goals for next month
- Plan feature releases
- Identify areas for improvement

---

## 7. Alerting Strategy

### Critical Alerts (Immediate Response)

**Channels:** SMS, Phone call, Slack

**Triggers:**
- Backend API down (>5 minutes)
- Database connection lost
- Error rate >10%
- Payment system failure
- Security breach detected

**Response:**
- Investigate immediately
- Fix within 1 hour
- Communicate with users if needed

### Warning Alerts (Response Within 1 Hour)

**Channels:** Email, Slack

**Triggers:**
- Error rate >5%
- Slow response times (>5s average)
- High memory usage (>80%)
- Claude API errors (>20%)
- Unusual traffic spike

**Response:**
- Investigate within 1 hour
- Fix within 4 hours
- Monitor closely

### Info Alerts (Daily Digest)

**Channels:** Email

**Triggers:**
- New error types
- Performance degradation
- Low conversion rate
- Negative reviews

**Response:**
- Review daily
- Prioritize for next sprint
- Track trends

---

## 8. Tools & Integrations

### Monitoring Stack

**Error Monitoring:**
- Sentry (backend + mobile)
- https://sentry.io

**Infrastructure Monitoring:**
- Railway (backend hosting)
- MongoDB Atlas (database)
- Cloudflare (R2 storage, CDN)

**Analytics:**
- RevenueCat (subscription analytics)
- App Store Connect (iOS analytics)
- Google Play Console (Android analytics)

**User Feedback:**
- App Store reviews
- Play Store reviews
- In-app feedback (if implemented)
- Support email (support@revelia.app)

### Recommended Additions

**Analytics Platform:**
- Mixpanel (free tier available)
- Amplitude (free tier available)
- PostHog (open source, self-hosted)

**Benefits:**
- User behavior tracking
- Funnel analysis
- Cohort analysis
- A/B testing

**Uptime Monitoring:**
- UptimeRobot (free tier available)
- Pingdom
- StatusCake

**Benefits:**
- 24/7 uptime monitoring
- Instant alerts if API goes down
- Public status page

---

## 9. Reporting

### Daily Report (Automated)

**Recipients:** Team

**Content:**
- DAU
- New users
- Readings generated
- Revenue
- Critical errors
- Top issues

**Format:** Email or Slack message

### Weekly Report (Manual)

**Recipients:** Team, stakeholders

**Content:**
- Growth metrics (MAU, retention)
- Revenue metrics (MRR, conversions)
- Product updates (features shipped)
- User feedback highlights
- Next week's priorities

**Format:** Email or presentation

### Monthly Report (Manual)

**Recipients:** Team, stakeholders, investors

**Content:**
- Executive summary
- Growth metrics
- Revenue metrics
- Product roadmap
- Challenges and solutions
- Goals for next month

**Format:** Presentation or document

---

## 10. Best Practices

### 1. Set Baselines

**Establish normal ranges:**
- Average DAU
- Average error rate
- Average response time
- Average conversion rate

**Use baselines to:**
- Detect anomalies
- Set alert thresholds
- Measure improvements

### 2. Monitor Trends, Not Just Numbers

**Look for:**
- Week-over-week changes
- Month-over-month changes
- Seasonal patterns
- Correlation between metrics

### 3. Act on Data

**Don't just collect data:**
- Investigate anomalies
- Fix issues promptly
- Optimize based on insights
- Test hypotheses

### 4. Automate Alerts

**Automate:**
- Error alerts (Sentry)
- Uptime alerts (UptimeRobot)
- Performance alerts (Railway)
- Revenue alerts (RevenueCat)

**Benefits:**
- Faster response times
- Less manual monitoring
- Catch issues early

### 5. Review Regularly

**Daily:** Health check, critical metrics

**Weekly:** Growth, performance, feedback

**Monthly:** Business review, planning

**Quarterly:** Strategic review, roadmap

---

**Monitoring Guide Version:** 1.0.0  
**Last Updated:** January 31, 2026  
**Status:** ✅ Complete
