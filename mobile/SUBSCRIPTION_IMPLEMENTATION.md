# RevenueCat SDK & Subscription Implementation

## Overview

This document describes the complete RevenueCat integration for Revelia's mobile app, including subscription management, paywall screen, and premium feature gating.

## Architecture

### Core Components

1. **RevenueCat Library** (`lib/revenuecat.ts`)
   - SDK initialization
   - User identification
   - Purchase operations
   - Tier mapping

2. **Subscription Store** (`store/subscriptionStore.ts`)
   - Global subscription state
   - Purchase flow management
   - Feature access control

3. **Subscription Service** (`services/subscription.service.ts`)
   - Backend API integration
   - Subscription sync
   - RevenueCat user linking

4. **Paywall Screen** (`app/(paywall)/index.tsx`)
   - Subscription plans display
   - Purchase UI
   - Feature comparison

5. **Premium Components**
   - `PremiumBadge`: Visual tier indicator
   - `LockedOverlay`: Premium content gate
   - `FeatureComparisonTable`: Plan comparison

6. **Paywall Hook** (`hooks/usePaywall.ts`)
   - Feature access checks
   - Paywall navigation

## Subscription Tiers

### Free Tier
- Basic face reading (limited)
- 3 readings per month

### Premium ($7.99/month or $59.99/year)
- Full face & palm readings
- Both palm hands
- Combined profile
- Full monthly readings
- Unlimited compatibility
- Ad-free

### Premium Plus ($14.99/month or $99.99/year)
- Everything in Premium
- Daily personalized insights
- Weekly forecasts
- Advanced numerology
- Priority support

## Implementation Details

### 1. RevenueCat Initialization

RevenueCat is initialized in `app/_layout.tsx` on app startup:

```typescript
import { initializeRevenueCat } from '@/lib/revenuecat';

useEffect(() => {
  initializeRevenueCat();
}, []);
```

### 2. User Identification

When a user logs in, they are identified with RevenueCat:

```typescript
import { identifyUser } from '@/lib/revenuecat';
import { subscriptionService } from '@/services/subscription.service';

// In authStore after successful login
await identifyUser(user._id);
await subscriptionService.linkRevenueCatUser(user._id);
await checkSubscriptionStatus();
```

### 3. Feature Access Control

Use the `usePaywall` hook to gate premium features:

```typescript
import { usePaywall } from '@/hooks/usePaywall';

function MyComponent() {
  const { requirePremium, isPremium } = usePaywall();
  
  const handlePremiumFeature = () => {
    requirePremium(() => {
      // Feature code here
    });
  };
  
  return (
    <View>
      {!isPremium && <LockedOverlay requiredTier="premium" />}
    </View>
  );
}
```

### 4. Subscription Store Usage

```typescript
import { useSubscriptionStore } from '@/store/subscriptionStore';

function MyComponent() {
  const { tier, canAccess, fetchOfferings } = useSubscriptionStore();
  
  const hasAccess = canAccess('dailyInsights');
  
  // ...
}
```

### 5. Paywall Navigation

Navigate to paywall from anywhere:

```typescript
import { router } from 'expo-router';

router.push('/(paywall)');
```

## Feature Access Matrix

Defined in `lib/constants.ts`:

```typescript
export const FEATURE_ACCESS = {
  faceReading: { free: true, premium: true, premium_plus: true },
  palmReading: { free: false, premium: true, premium_plus: true },
  combinedReading: { free: false, premium: true, premium_plus: true },
  monthlyReading: { free: false, premium: true, premium_plus: true },
  compatibility: { free: false, premium: true, premium_plus: true },
  unlimitedReadings: { free: false, premium: true, premium_plus: true },
  dailyInsights: { free: false, premium: false, premium_plus: true },
  weeklyForecasts: { free: false, premium: false, premium_plus: true },
  advancedNumerology: { free: false, premium: false, premium_plus: true },
  adFree: { free: false, premium: true, premium_plus: true },
};
```

## Backend Integration

The mobile app communicates with backend subscription endpoints:

### GET /api/subscription/status
Returns current subscription status:
```json
{
  "success": true,
  "data": {
    "tier": "premium",
    "isActive": true,
    "expiresAt": "2025-01-15T00:00:00Z",
    "revenueCatId": "rc_user_123"
  }
}
```

### POST /api/subscription/sync
Syncs RevenueCat subscription with backend.

### POST /api/subscription/link
Links RevenueCat user ID with backend user:
```json
{
  "revenueCatAppUserId": "user_123"
}
```

## Environment Variables

Required in `.env`:

```bash
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_xxxxxxxxxxxx
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_xxxxxxxxxxxx
```

## RevenueCat Dashboard Setup

### 1. Create Products

**iOS (App Store Connect)**
- `premium_monthly` - $7.99/month
- `premium_annual` - $59.99/year
- `premium_plus_monthly` - $14.99/month
- `premium_plus_annual` - $99.99/year

**Android (Google Play Console)**
- Same product IDs as iOS

### 2. Create Entitlements

- `premium` - Attached to premium products
- `premium_plus` - Attached to premium plus products

### 3. Create Offerings

Create a "current" offering with packages:
- `premium_monthly`
- `premium_annual`
- `premium_plus_monthly`
- `premium_plus_annual`

## Testing

### Test Purchase Flow

1. Use sandbox accounts (iOS) or test accounts (Android)
2. Navigate to paywall: `router.push('/(paywall)')`
3. Select plan and billing period
4. Tap "Start 7-Day Free Trial"
5. Complete purchase in sandbox
6. Verify tier updates in app

### Test Restore Purchases

1. Make a purchase
2. Uninstall and reinstall app
3. Login
4. Navigate to paywall
5. Tap "Restore Purchases"
6. Verify subscription restored

### Test Feature Gating

1. As free user, try to access premium feature
2. Verify paywall appears
3. Purchase subscription
4. Verify feature unlocks

## Conversion Optimization

### Design Principles

1. **Show VALUE, not LOSS**
   - "Unlock Your Full Destiny" not "You're missing out"
   - Positive framing throughout

2. **Clear Feature Comparison**
   - Visual table showing all tiers
   - Checkmarks for included features

3. **Highlight Best Value**
   - Annual plans show savings percentage
   - "MOST POPULAR" and "BEST VALUE" badges

4. **Reduce Friction**
   - 7-day free trial
   - One-tap purchase
   - Easy restore purchases

5. **Build Trust**
   - Clear pricing
   - Cancel anytime messaging
   - Terms and privacy links

### Target Metrics

- **Conversion Rate**: 10%+ free to paid
- **Annual vs Monthly**: 60%+ choose annual
- **Premium Plus Adoption**: 30%+ of paid users

## Error Handling

### Purchase Errors

```typescript
try {
  await purchasePackage(pkg);
} catch (error) {
  if (error.userCancelled) {
    // User cancelled - not an error
    return;
  }
  Alert.alert('Purchase Failed', error.message);
}
```

### Network Errors

```typescript
try {
  await subscriptionService.syncSubscription();
} catch (error) {
  // Sync failed - subscription still active locally
  console.error('Sync failed:', error);
}
```

## Troubleshooting

### "Offerings not loading"
- Check RevenueCat API keys in `.env`
- Verify products created in App Store Connect / Google Play
- Check RevenueCat dashboard for offering configuration

### "Purchase not reflecting"
- Check RevenueCat webhook configuration
- Verify backend `/subscription/sync` endpoint
- Check user is identified: `identifyUser(userId)`

### "Restore not working"
- Verify same Apple ID / Google account
- Check RevenueCat dashboard for purchase history
- Ensure products are not expired

## Next Steps

1. **Configure RevenueCat Dashboard**
   - Create products
   - Set up entitlements
   - Configure offerings

2. **Add API Keys**
   - Get keys from RevenueCat dashboard
   - Add to `.env` file

3. **Test Purchase Flow**
   - Use sandbox accounts
   - Test all plans
   - Verify backend sync

4. **Implement Feature Gates**
   - Add `LockedOverlay` to premium features
   - Use `usePaywall` hook for access control
   - Test with free account

5. **Monitor Metrics**
   - Track conversion rate
   - Monitor churn
   - Optimize paywall design

## Files Created/Modified

### New Files
- `lib/revenuecat.ts` - RevenueCat SDK wrapper
- `services/subscription.service.ts` - Backend API integration
- `store/subscriptionStore.ts` - Subscription state management
- `hooks/usePaywall.ts` - Feature access hook
- `components/subscription/PremiumBadge.tsx` - Tier badge component
- `components/subscription/LockedOverlay.tsx` - Premium gate component
- `components/subscription/FeatureComparisonTable.tsx` - Plan comparison
- `app/(paywall)/_layout.tsx` - Paywall route layout
- `app/(paywall)/index.tsx` - Paywall screen
- `.env.example` - Environment variable template

### Modified Files
- `package.json` - Added react-native-purchases
- `lib/constants.ts` - Updated tier names and feature access
- `store/authStore.ts` - Added RevenueCat identification
- `app/_layout.tsx` - Added RevenueCat initialization

## Support

For issues or questions:
1. Check RevenueCat documentation: https://docs.revenuecat.com
2. Review implementation in this document
3. Check backend subscription endpoints
4. Contact RevenueCat support for SDK issues
