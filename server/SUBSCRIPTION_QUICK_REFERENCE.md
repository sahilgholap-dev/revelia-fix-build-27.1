# RevenueCat Subscription System - Quick Reference

## For Backend Developers

### Protecting Endpoints with Subscription Tiers

```typescript
import { requirePremium, requirePremiumPlus } from '../middleware/subscription.middleware';
import { authenticateToken } from '../middleware/auth.middleware';

// Require premium or premium_plus
router.post(
  '/api/readings/face',
  authenticateToken,
  requirePremium,
  readingController.createFaceReading
);

// Require premium_plus only
router.post(
  '/api/compatibility/detailed',
  authenticateToken,
  requirePremiumPlus,
  compatibilityController.getDetailedAnalysis
);

// Custom tier requirements
import { requireTier } from '../middleware/subscription.middleware';

router.post(
  '/api/custom-feature',
  authenticateToken,
  requireTier('premium', 'premium_plus'),
  handler
);
```

### Error Response for Insufficient Tier

When a user doesn't have the required tier:

```json
{
  "success": false,
  "error": "This feature requires premium or premium_plus subscription",
  "requiredTier": "premium",
  "currentTier": "free",
  "upgradeUrl": "revelia://paywall"
}
```

HTTP Status: `403 Forbidden`

### Checking Subscription in Code

```typescript
import { User } from '../models/User';

const user = await User.findById(userId);

// Check tier
if (user.subscription.tier === 'premium_plus') {
  // Premium plus features
}

// Check if active
const isActive = 
  user.subscription.tier !== 'free' && 
  (!user.subscription.expiresAt || new Date(user.subscription.expiresAt) > new Date());

if (isActive) {
  // User has active subscription
}

// Check expiration
if (user.subscription.expiresAt && new Date(user.subscription.expiresAt) < new Date()) {
  // Subscription expired
}
```

## For Mobile Developers

### 1. Install RevenueCat SDK

**iOS (Swift):**
```swift
import RevenueCat

// In AppDelegate or App struct
Purchases.configure(withAPIKey: "appl_xxxxxxxxxx")
```

**Android (Kotlin):**
```kotlin
import com.revenuecat.purchases.Purchases

// In Application class
Purchases.configure(PurchasesConfiguration.Builder(this, "goog_xxxxxxxxxx").build())
```

### 2. Identify User After Login

```swift
// iOS
Purchases.shared.logIn(userId) { (customerInfo, created, error) in
    if let error = error {
        print("Error logging in: \(error)")
        return
    }
    
    // Link to backend
    linkRevenueCatUser(revenueCatId: userId)
}
```

```kotlin
// Android
Purchases.sharedInstance.logIn(userId) { customerInfo, created ->
    // Link to backend
    linkRevenueCatUser(userId)
}
```

### 3. Link RevenueCat User to Backend

```typescript
// API Call
POST /api/subscription/link
Headers: {
  Authorization: Bearer <JWT_TOKEN>
  Content-Type: application/json
}
Body: {
  "revenueCatAppUserId": "<USER_ID>"
}
```

**Example (React Native):**
```javascript
async function linkRevenueCatUser(userId) {
  try {
    const response = await fetch('https://api.revelia.me/api/subscription/link', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        revenueCatAppUserId: userId
      })
    });
    
    const data = await response.json();
    if (data.success) {
      console.log('RevenueCat user linked');
    }
  } catch (error) {
    console.error('Failed to link RevenueCat user:', error);
  }
}
```

### 4. Get Subscription Status

```typescript
GET /api/subscription/status
Headers: {
  Authorization: Bearer <JWT_TOKEN>
}

Response:
{
  "success": true,
  "data": {
    "tier": "premium",
    "isActive": true,
    "expiresAt": "2024-02-01T00:00:00.000Z",
    "productId": "revelia_premium_monthly",
    "willRenew": true,
    "managementUrl": "https://apps.apple.com/account/subscriptions"
  }
}
```

**Example (React Native):**
```javascript
async function getSubscriptionStatus() {
  try {
    const response = await fetch('https://api.revelia.me/api/subscription/status', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      }
    });
    
    const data = await response.json();
    if (data.success) {
      const { tier, isActive, expiresAt, willRenew } = data.data;
      
      // Update UI based on subscription status
      if (tier === 'free') {
        // Show paywall or limited features
      } else if (tier === 'premium') {
        // Enable premium features
      } else if (tier === 'premium_plus') {
        // Enable all features
      }
    }
  } catch (error) {
    console.error('Failed to get subscription status:', error);
  }
}
```

### 5. Sync Subscription After Purchase

```typescript
POST /api/subscription/sync
Headers: {
  Authorization: Bearer <JWT_TOKEN>
}

Response:
{
  "success": true,
  "data": {
    "tier": "premium",
    "expiresAt": "2024-02-01T00:00:00.000Z",
    "message": "Subscription synced successfully"
  }
}
```

**Example (React Native):**
```javascript
// After successful purchase
Purchases.shared.purchasePackage(package, (transaction, customerInfo, error, userCancelled) => {
  if (error) {
    console.error('Purchase failed:', error);
    return;
  }
  
  if (userCancelled) {
    console.log('User cancelled purchase');
    return;
  }
  
  // Sync with backend
  syncSubscription();
});

async function syncSubscription() {
  try {
    const response = await fetch('https://api.revelia.me/api/subscription/sync', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      }
    });
    
    const data = await response.json();
    if (data.success) {
      console.log('Subscription synced:', data.data.tier);
      // Update app state
    }
  } catch (error) {
    console.error('Failed to sync subscription:', error);
  }
}
```

### 6. Handle Paywall

When API returns 403 with upgrade URL:

```javascript
async function callProtectedEndpoint() {
  try {
    const response = await fetch('https://api.revelia.me/api/readings/face', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageUrl: '...' })
    });
    
    const data = await response.json();
    
    if (response.status === 403) {
      // Show paywall
      const { requiredTier, currentTier, upgradeUrl } = data;
      navigation.navigate('Paywall', { requiredTier });
      return;
    }
    
    // Process successful response
  } catch (error) {
    console.error('API call failed:', error);
  }
}
```

## Subscription Tiers

### Free Tier
- Basic features
- Limited readings per day
- Ads (if implemented)

### Premium Tier
- Unlimited face readings
- Unlimited palm readings
- Daily insights
- Weekly forecasts
- No ads

### Premium Plus Tier
- All Premium features
- Monthly readings
- Compatibility analysis
- Priority support
- Early access to new features

## Product IDs

### iOS (App Store)
- `revelia_premium_monthly`
- `revelia_premium_yearly`
- `revelia_premium_plus_monthly`
- `revelia_premium_plus_yearly`

### Android (Play Store)
- `revelia_premium_monthly`
- `revelia_premium_yearly`
- `revelia_premium_plus_monthly`
- `revelia_premium_plus_yearly`

## Entitlements

- `premium` - Maps to tier `premium`
- `premium_plus` - Maps to tier `premium_plus`

## Webhook Events

RevenueCat automatically sends webhooks to:
```
https://api.revelia.me/api/webhooks/revenuecat
```

Events handled:
- `INITIAL_PURCHASE` - First subscription purchase
- `RENEWAL` - Subscription renewed
- `CANCELLATION` - User cancelled (still has access until expiration)
- `UNCANCELLATION` - User re-enabled renewal
- `EXPIRATION` - Subscription expired
- `BILLING_ISSUE` - Payment failed
- `PRODUCT_CHANGE` - User changed subscription tier

## Testing

### Sandbox Testing

1. Use RevenueCat sandbox environment
2. Create test users in App Store Connect / Play Console
3. Make sandbox purchases
4. Verify webhook events in RevenueCat dashboard
5. Check backend logs for webhook processing

### Manual Testing

```bash
# Test subscription status
curl http://localhost:8001/api/subscription/status \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test webhook (with correct secret)
curl -X POST http://localhost:8001/api/webhooks/revenuecat \
  -H "Authorization: Bearer YOUR_WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "api_version": "1.0",
    "event": {
      "type": "INITIAL_PURCHASE",
      "app_user_id": "test-user-123",
      "product_id": "revelia_premium_monthly",
      "period_type": "NORMAL",
      "purchased_at_ms": 1706540000000,
      "expiration_at_ms": 1709218800000,
      "environment": "SANDBOX"
    }
  }'
```

## Troubleshooting

### User shows free tier after purchase

1. Check RevenueCat dashboard for purchase
2. Verify webhook was sent
3. Check backend logs for webhook processing
4. Manually sync: `POST /api/subscription/sync`

### Webhook not working

1. Verify webhook URL in RevenueCat dashboard
2. Check webhook secret matches `.env`
3. Test webhook with curl
4. Check backend logs for errors

### API returns "Invalid API Key"

1. Verify `REVENUECAT_API_KEY` in `.env`
2. Check API key is for correct project
3. Ensure API key has correct permissions

## Support

For issues:
1. Check backend logs: `tail -f /var/log/supervisor/backend.*.log`
2. Check RevenueCat dashboard for events
3. Test with curl commands
4. Review implementation docs: `SUBSCRIPTION_IMPLEMENTATION.md`
