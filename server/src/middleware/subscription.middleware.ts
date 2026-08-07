import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import * as revenueCatService from '../services/revenuecat.service';
import { SubscriptionTier } from '../types/shared';
import { getEffectiveTier } from '../utils/subscriptionTier';

interface AuthRequest extends Request {
  user?: any;
}

/**
 * Middleware to require specific subscription tier(s)
 * @param allowedTiers - Array of allowed subscription tiers
 */
export function requireTier(...allowedTiers: SubscriptionTier[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }
      
      // Check if subscription might be expired
      if (user.subscription.expiresAt && new Date(user.subscription.expiresAt) < new Date()) {
        // Sync with RevenueCat to get fresh status
        if (user.subscription.revenueCatId) {
          await revenueCatService.syncSubscription(user._id);
          // Reload user
          const freshUser = await User.findById(user._id);
          req.user = freshUser;
        }
      }
      
      const effectiveTier = getEffectiveTier(req.user);
      if (!allowedTiers.includes(effectiveTier)) {
        return res.status(403).json({
          success: false,
          error: `This feature requires ${allowedTiers.join(' or ')} subscription`,
          requiredTier: allowedTiers[0],
          currentTier: effectiveTier,
          upgradeUrl: 'revelia://paywall'
        });
      }
      
      return next();
    } catch (error: any) {
      console.error('Subscription verification error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to verify subscription'
      });
    }
  };
}

/**
 * Convenience middleware: Require premium or premium_plus
 */
export const requirePremium = requireTier('premium', 'premium_plus');

/**
 * Convenience middleware: Require premium_plus only
 */
export const requirePremiumPlus = requireTier('premium_plus');
