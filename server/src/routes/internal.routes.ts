import express from 'express';
import { User } from '../models/User';
import * as notificationTemplates from '../services/notification-templates.service';
import * as oneSignalService from '../services/onesignal.service';
import * as insightService from '../services/insight.service';
import { logger } from '../utils/logger';

const router = express.Router();

/**
 * Security middleware for internal endpoints
 */
function internalAuth(req: any, res: any, next: any) {
  const apiKey = req.headers['x-internal-api-key'];
  if (apiKey !== process.env.INTERNAL_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

router.use(internalAuth);

/**
 * POST /api/internal/trigger-daily-notifications
 * Trigger daily insight notifications for eligible users
 */
router.post('/trigger-daily-notifications', async (_req, res) => {
  try {
    // Build 22: tz-aware scheduling. Previously compared the cron host's
    // local hour:minute (Railway = UTC) directly to user.preferences.
    // dailyInsightTime — which meant a Mumbai user wanting "09:00" got
    // notified at 09:00 UTC = 14:30 IST, 5.5h late. Now we filter
    // candidates broadly then apply the per-user tz comparison in-app.
    const now = new Date();

    // Format the current UTC moment in each user's stored timezone and
    // check whether THEIR local hour:minute is within ±15 min of their
    // dailyInsightTime. The candidate pool is small (premium_plus +
    // notifications enabled) so the in-app filter is fine.
    const candidates = await User.find({
      'preferences.notifications': true,
      'subscription.tier': 'premium_plus',
    }).limit(1000);

    function userLocalHHMM(tz: string | undefined): { hour: number; minute: number } | null {
      const timeZone = tz || 'America/New_York';
      try {
        const parts = new Intl.DateTimeFormat('en-US', {
          timeZone,
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
        }).formatToParts(now);
        let hour = Number(parts.find((p) => p.type === 'hour')?.value);
        const minute = Number(parts.find((p) => p.type === 'minute')?.value);
        if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
        if (hour === 24) hour = 0;
        return { hour, minute };
      } catch {
        return null;
      }
    }

    function withinWindow(
      local: { hour: number; minute: number },
      target: string
    ): boolean {
      const [th, tm] = target.split(':').map(Number);
      if (Number.isNaN(th) || Number.isNaN(tm)) return false;
      const localMin = local.hour * 60 + local.minute;
      const targetMin = th * 60 + tm;
      // ±15 min window (matches pre-Build-22 width).
      return Math.abs(localMin - targetMin) <= 15;
    }

    const users = candidates.filter((u) => {
      const local = userLocalHHMM(u.preferences?.timezone);
      if (!local) return false;
      return withinWindow(local, u.preferences?.dailyInsightTime || '09:00');
    });

    let sent = 0;
    for (const user of users) {
      try {
        // Get or generate daily insight
        const { insight } = await insightService.getDailyInsight(user._id.toString());
        
        // Send notification
        await notificationTemplates.sendDailyInsightNotification(
          user._id.toString(),
          (insight as any).headline
        );
        
        sent++;
      } catch (error) {
        logger.error(`Failed to send daily notification to user ${user._id}:`, error);
      }
    }
    
    logger.info(`Daily notifications triggered: ${sent} sent`);
    
    res.json({ success: true, notificationsSent: sent });
  } catch (error: any) {
    logger.error('Trigger daily notifications error:', error);
    res.status(500).json({ error: 'Failed to trigger notifications' });
  }
});

/**
 * POST /api/internal/trigger-monthly-notifications
 * Trigger monthly reading notifications for premium users
 */
router.post('/trigger-monthly-notifications', async (_req, res) => {
  try {
    const now = new Date();
    const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    // Send to all premium users on 1st of month
    await oneSignalService.sendToSegment(
      'Premium Users',
      `🌙 Your ${monthName} Reading is Ready`,
      'Discover what the stars and your profile reveal for the month ahead.',
      { screen: 'monthly-reading' }
    );
    
    logger.info('Monthly notifications triggered');
    
    res.json({ success: true, message: 'Monthly notifications triggered' });
  } catch (error: any) {
    logger.error('Trigger monthly notifications error:', error);
    res.status(500).json({ error: 'Failed to trigger monthly notifications' });
  }
});

export default router;
