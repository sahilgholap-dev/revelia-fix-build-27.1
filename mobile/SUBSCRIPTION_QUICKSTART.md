# RevenueCat Integration - Quick Start Guide

## Setup Complete ✅

The RevenueCat SDK has been successfully integrated into the Revelia mobile app.

## What Was Implemented

### 1. Core Infrastructure
- ✅ RevenueCat SDK installed (`react-native-purchases@9.7.5`)
- ✅ RevenueCat initialization in app startup
- ✅ User identification on login
- ✅ Subscription state management (Zustand store)
- ✅ Backend API integration

### 2. Paywall Screen
- ✅ Full-featured paywall at `/(paywall)` route
- ✅ Feature comparison table
- ✅ Monthly/Annual billing toggle
- ✅ Premium and Premium Plus plan cards
- ✅ Purchase flow with 7-day free trial
- ✅ Restore purchases functionality

### 3. Premium Components
- ✅ `PremiumBadge` - Visual tier indicators
- ✅ `LockedOverlay` - Premium content gates
- ✅ `FeatureComparisonTable` - Plan comparison UI

### 4. Developer Tools
- ✅ `usePaywall` hook for feature gating
- ✅ Subscription store with tier checks
- ✅ Feature access matrix in constants

### 5. Auth Integration
- ✅ RevenueCat user identification on login
- ✅ Subscription sync with backend
- ✅ Logout cleanup

## Next Steps (Required Before Testing)

### 1. Configure RevenueCat Dashboard

**Create Products in App Store Connect / Google Play:**
- `premium_monthly` - $7.99/month
- `premium_annual` - $59.99/year  
- `premium_plus_monthly` - $14.99/month
- `premium_plus_annual` - $99.99/year

**Create Entitlements in RevenueCat:**
- `premium` entitlement
- `premium_plus` entitlement

**Create Offering:**
- Name: "current"
- Add all 4 packages
- Link to appropriate entitlements

### 2. Add API Keys

Create `/app/mobile/.env` file:

```bash
EXPO_PUBLIC_API_URL=http://localhost:3000/api
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_xxxxxxxxxxxx
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_xxxxxxxxxxxx
EXPO_PUBLIC_ONESIGNAL_APP_ID=your_onesignal_app_id
```

Get keys from:
- RevenueCat Dashboard → Project Settings → API Keys

### 3. Test Purchase Flow

**iOS:**
1. Create sandbox tester in App Store Connect
2. Sign out of App Store on device
3. Run app: `yarn ios`
4. Navigate to paywall
5. Make test purchase
6. Verify subscription activates

**Android:**
1. Add test account in Google Play Console
2. Run app: `yarn android`
3. Navigate to paywall
4. Make test purchase
5. Verify subscription activates

## Usage Examples

### Navigate to Paywall

```typescript
import { router } from 'expo-router';

router.push('/(paywall)');
```

### Check Feature Access

```typescript
import { usePaywall } from '@/hooks/usePaywall';

function MyComponent() {
  const { requirePremium, isPremium } = usePaywall();
  
  const handlePremiumFeature = () => {
    requirePremium(() => {
      // This code only runs if user has premium
      console.log('Premium feature accessed');
    });
  };
  
  return (
    <TouchableOpacity onPress={handlePremiumFeature}>
      <Text>Premium Feature</Text>
    </TouchableOpacity>
  );
}
```

### Lock Content with Overlay

```typescript
import { LockedOverlay } from '@/components/subscription/LockedOverlay';
import { usePaywall } from '@/hooks/usePaywall';

function PremiumContent() {
  const { isPremium } = usePaywall();
  
  return (
    <View>
      <Text>Premium Content Here</Text>
      {!isPremium && <LockedOverlay requiredTier="premium" />}
    </View>
  );
}
```

### Check Specific Feature Access

```typescript
import { useSubscriptionStore } from '@/store/subscriptionStore';

function MyComponent() {
  const { canAccess } = useSubscriptionStore();
  
  const hasDailyInsights = canAccess('dailyInsights');
  
  return (
    <View>
      {hasDailyInsights ? (
        <DailyInsightCard />
      ) : (
        <UpgradePrompt />
      )}
    </View>
  );
}
```

## Feature Access Matrix

| Feature | Free | Premium | Premium Plus |
|---------|------|---------|-------------|
| Face Reading | ✅ | ✅ | ✅ |
| Palm Reading | ❌ | ✅ | ✅ |
| Combined Reading | ❌ | ✅ | ✅ |
| Monthly Reading | ❌ | ✅ | ✅ |
| Compatibility | ❌ | ✅ | ✅ |
| Unlimited Readings | ❌ | ✅ | ✅ |
| Daily Insights | ❌ | ❌ | ✅ |
| Weekly Forecasts | ❌ | ❌ | ✅ |
| Advanced Numerology | ❌ | ❌ | ✅ |
| Ad-Free | ❌ | ✅ | ✅ |

## Files Created

```
mobile/
├── lib/
│   └── revenuecat.ts                    # RevenueCat SDK wrapper
├── services/
│   └── subscription.service.ts          # Backend API integration
├── store/
│   └── subscriptionStore.ts             # Subscription state
├── hooks/
│   └── usePaywall.ts                    # Feature gating hook
├── components/
│   └── subscription/
│       ├── PremiumBadge.tsx             # Tier badge
│       ├── LockedOverlay.tsx            # Premium gate
│       └── FeatureComparisonTable.tsx   # Plan comparison
├── app/
│   └── (paywall)/
│       ├── _layout.tsx                  # Paywall layout
│       └── index.tsx                    # Paywall screen
├── .env.example                         # Environment template
└── SUBSCRIPTION_IMPLEMENTATION.md       # Full documentation
```

## Files Modified

- `package.json` - Added react-native-purchases
- `lib/constants.ts` - Updated tiers and feature access
- `store/authStore.ts` - Added RevenueCat identification
- `app/_layout.tsx` - Added RevenueCat initialization

## Testing Checklist

- [ ] RevenueCat dashboard configured
- [ ] API keys added to `.env`
- [ ] Products created in App Store Connect / Google Play
- [ ] Entitlements configured in RevenueCat
- [ ] Offerings created with packages
- [ ] Test purchase on iOS simulator
- [ ] Test purchase on Android emulator
- [ ] Test restore purchases
- [ ] Test feature gating with free account
- [ ] Test feature unlocking after purchase
- [ ] Verify backend sync works

## Troubleshooting

### "Offerings not loading"
- Check API keys in `.env`
- Verify products exist in App Store Connect / Google Play
- Check RevenueCat dashboard offering configuration
- Look for errors in console logs

### "Purchase not working"
- Verify sandbox account signed in (iOS)
- Check test account added (Android)
- Ensure products are approved in stores
- Check RevenueCat webhook configuration

### "Subscription not syncing with backend"
- Verify backend `/api/subscription/sync` endpoint exists
- Check user is identified: `identifyUser(userId)`
- Look for network errors in console
- Verify backend subscription endpoints are working

## Support Resources

- **RevenueCat Docs**: https://docs.revenuecat.com
- **Implementation Guide**: `/app/mobile/SUBSCRIPTION_IMPLEMENTATION.md`
- **Backend Endpoints**: Check with backend team
- **RevenueCat Dashboard**: https://app.revenuecat.com

## Success Metrics

**Target Conversion Rate**: 10%+ free to paid

**Tracking:**
- Monitor conversion in RevenueCat dashboard
- Track paywall views vs purchases
- Measure annual vs monthly preference
- Monitor Premium vs Premium Plus adoption

## Revenue Model

**Premium**: $7.99/month or $59.99/year (37% savings)
**Premium Plus**: $14.99/month or $99.99/year (44% savings)

**Annual Revenue Potential** (1000 users, 10% conversion):
- 60 Premium users × $59.99 = $3,599
- 40 Premium Plus users × $99.99 = $3,999
- **Total**: ~$7,600/year from 100 paid users

---

**Status**: ✅ Implementation Complete - Ready for RevenueCat Configuration
