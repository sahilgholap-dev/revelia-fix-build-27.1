import axios from 'axios';
import { User } from '../models/User';
import { AppError } from '../utils/errors';
import { SubscriptionTier } from '../types/shared';

const REVENUECAT_API_KEY = process.env.REVENUECAT_API_KEY || '';
const REVENUECAT_API_URL = 'https://api.revenuecat.com/v1';

interface RevenueCatSubscriberInfo {
  subscriber: {
    entitlements: Record<string, {
      expires_date: string | null;
      product_identifier: string;
      purchase_date: string;
    }>;
    subscriptions: Record<string, {
      expires_date: string;
      product_identifier: string;
      is_sandbox: boolean;
      original_purchase_date: string;
      purchase_date: string;
      store: string;
      unsubscribe_detected_at: string | null;
      billing_issues_detected_at: string | null;
    }>;
    non_subscriptions: Record<string, any>;
  };
}

/**
 * Get subscriber info from RevenueCat
 */
export async function getSubscriberInfo(revenueCatAppUserId: string): Promise<RevenueCatSubscriberInfo> {
  try {
    const response = await axios.get(
      `${REVENUECAT_API_URL}/subscribers/${revenueCatAppUserId}`,
      {
        headers: {
          'Authorization': `Bearer ${REVENUECAT_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    return response.data;
  } catch (error: any) {
    console.error('RevenueCat API error:', error.response?.data || error.message);
    throw new AppError('Failed to fetch subscription info', 500);
  }
}

/**
 * Map RevenueCat entitlements to our tier system
 */
function mapEntitlementToTier(subscriberInfo: RevenueCatSubscriberInfo): SubscriptionTier {
  const entitlements = subscriberInfo.subscriber.entitlements;
  
  // Check for active entitlements
  const premiumPlus = entitlements.premium_plus;
  const premium = entitlements.premium;
  
  if (premiumPlus && premiumPlus.expires_date === null) {
    // Lifetime or active premium_plus
    return 'premium_plus';
  }
  
  if (premiumPlus && premiumPlus.expires_date && new Date(premiumPlus.expires_date) > new Date()) {
    return 'premium_plus';
  }
  
  if (premium && premium.expires_date === null) {
    return 'premium';
  }
  
  if (premium && premium.expires_date && new Date(premium.expires_date) > new Date()) {
    return 'premium';
  }
  
  return 'free';
}

/**
 * Sync RevenueCat subscription to our database
 */
export async function syncSubscription(userId: string): Promise<void> {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found', 404);
  
  if (!user.subscription.revenueCatId) {
    // User hasn't been identified with RevenueCat yet
    // This happens on first app install
    return;
  }
  
  const subscriberInfo = await getSubscriberInfo(user.subscription.revenueCatId);
  const tier = mapEntitlementToTier(subscriberInfo);
  
  // Find active subscription
  const activeSubscription = Object.values(subscriberInfo.subscriber.subscriptions)
    .find(sub => {
      if (!sub.expires_date) return false;
      return new Date(sub.expires_date) > new Date();
    });
  
  await User.findByIdAndUpdate(userId, {
    'subscription.tier': tier,
    'subscription.expiresAt': activeSubscription?.expires_date || null,
    'subscription.productId': activeSubscription?.product_identifier || null,
    'subscription.willRenew': activeSubscription?.unsubscribe_detected_at === null,
    'subscription.lastSyncedAt': new Date(),
  });
}

/**
 * Link user to RevenueCat app user ID
 */
export async function linkRevenueCatUser(userId: string, revenueCatAppUserId: string): Promise<void> {
  await User.findByIdAndUpdate(userId, {
    'subscription.revenueCatId': revenueCatAppUserId
  });
  
  // Immediately sync to get current status
  await syncSubscription(userId);
}
