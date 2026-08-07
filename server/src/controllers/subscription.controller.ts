import { Request, Response } from 'express';
import crypto from 'crypto';
import { User } from '../models/User';
import * as revenueCatService from '../services/revenuecat.service';
import * as webhookService from '../services/webhook.service';
import { getEffectiveTier } from '../utils/subscriptionTier';

function timingSafeStringEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, 'utf8');
  const bBuf = Buffer.from(b, 'utf8');
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

interface AuthRequest extends Request {
  user?: any;
}

/**
 * GET /api/subscription/status
 * Get current subscription status
 */
export async function getStatus(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!._id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    // Report the effective tier so a comped user shows active/premium here too.
    // A live comp grant counts as active even though there's no billing
    // expiresAt; billing-truth fields (expiresAt/productId/willRenew) are
    // still surfaced verbatim below.
    const effectiveTier = getEffectiveTier(user);
    const isActive = effectiveTier !== 'free' &&
                     (!user.subscription.expiresAt || new Date(user.subscription.expiresAt) > new Date());

    const managementUrl = user.subscription.productId?.startsWith('revelia_premium')
      ? 'https://apps.apple.com/account/subscriptions'
      : user.subscription.productId?.startsWith('goog')
      ? 'https://play.google.com/store/account/subscriptions'
      : null;

    return res.status(200).json({
      success: true,
      data: {
        tier: effectiveTier,
        isActive,
        expiresAt: user.subscription.expiresAt,
        productId: user.subscription.productId,
        willRenew: user.subscription.willRenew ?? true,
        managementUrl
      }
    });
  } catch (error: any) {
    console.error('Get subscription status error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get subscription status'
    });
  }
}

/**
 * POST /api/subscription/sync
 * Sync subscription with RevenueCat
 */
export async function syncSubscription(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!._id;
    
    await revenueCatService.syncSubscription(userId);
    
    // Return updated status
    const user = await User.findById(userId);
    
    // 🔴 EFFECTIVE, not raw — the same value `getStatus` above returns under the
    //    same key name (fixed 2026-08-06 with P88's sweep). This endpoint made
    //    the server pull from RevenueCat and then reported `subscription.tier`
    //    verbatim, so a COMPED account got 'free' back on a field its sibling
    //    endpoint defines as the entitlement tier.
    // ⚠️ NOT A LIVE DEFECT TODAY, AND THAT IS WHY IT IS RECORDED HERE RATHER
    //    THAN JUST CHANGED: `subscriptionStore.purchasePackage` discards this
    //    response and immediately calls `checkSubscriptionStatus()`, which reads
    //    `getStatus`. So nothing consumed the wrong value. It is a trap rather
    //    than a bug — one key, two meanings, on two endpoints of one controller
    //    — and the cost of closing it is one call.
    return res.status(200).json({
      success: true,
      data: {
        tier: user ? getEffectiveTier(user) : undefined,
        expiresAt: user?.subscription.expiresAt,
        message: 'Subscription synced successfully'
      }
    });
  } catch (error: any) {
    console.error('Sync error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to sync subscription'
    });
  }
}

/**
 * POST /api/subscription/link
 * Link user to RevenueCat app user ID
 */
export async function linkRevenueCatUser(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!._id;
    const { revenueCatAppUserId } = req.body;
    
    if (!revenueCatAppUserId) {
      return res.status(400).json({
        success: false,
        error: 'RevenueCat app user ID is required'
      });
    }
    
    await revenueCatService.linkRevenueCatUser(userId, revenueCatAppUserId);
    
    return res.status(200).json({
      success: true,
      message: 'RevenueCat user linked and synced'
    });
  } catch (error: any) {
    console.error('Link RevenueCat user error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to link RevenueCat user'
    });
  }
}

/**
 * POST /api/webhooks/revenuecat
 * Handle RevenueCat webhook events.
 *
 * Auth: RC sends the value configured in its dashboard's "Authorization header"
 * field verbatim. We require exact match against REVENUECAT_WEBHOOK_AUTH.
 * Falls back to legacy REVENUECAT_WEBHOOK_SECRET (compared as `Bearer <secret>`)
 * for backwards compatibility with any prior config — remove after migration.
 */
export async function handleWebhook(req: Request, res: Response) {
  try {
    const expected = process.env.REVENUECAT_WEBHOOK_AUTH;
    const legacySecret = process.env.REVENUECAT_WEBHOOK_SECRET;
    const authHeader = req.headers.authorization || '';

    if (!expected && !legacySecret) {
      console.error('[RC webhook] REVENUECAT_WEBHOOK_AUTH not configured — rejecting');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const authorized =
      (expected && timingSafeStringEqual(authHeader, expected)) ||
      (legacySecret && timingSafeStringEqual(authHeader, `Bearer ${legacySecret}`));

    if (!authorized) {
      console.warn('[RC webhook] auth header mismatch');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await webhookService.handleRevenueCatWebhook(req.body);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('[RC webhook] handler error:', error?.stack || error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
}
