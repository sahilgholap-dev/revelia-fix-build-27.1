import { schedule } from 'node-cron';
import axios from 'axios';
import { toZonedTime } from 'date-fns-tz';
import { User } from '../models/User';
import { logger } from '../utils/logger';

const DAILY_MESSAGES: Record<number, string> = {
  0: 'The stars have something to say about your week ahead.',
  1: 'Your cosmic energy is aligned for new beginnings today.',
  2: 'A powerful day to trust your instincts and inner voice.',
  3: 'The universe is opening doors — stay open to signs.',
  4: "Your birth chart holds wisdom for today's choices.",
  5: 'Cosmic energy peaks — your reading holds special meaning today.',
  6: 'Reflect on your journey. The stars see your progress.',
};

async function sendOneSignalPush(
  userId: string,
  headings: { en: string },
  contents: { en: string },
  name: string,
  data?: Record<string, string>
): Promise<void> {
  await axios.post(
    'https://api.onesignal.com/notifications',
    {
      app_id: process.env.ONESIGNAL_APP_ID,
      include_aliases: { external_id: [userId] },
      target_channel: 'push',
      headings,
      contents,
      name,
      ...(data ? { data } : {}),
    },
    {
      headers: {
        Authorization: `Key ${process.env.ONESIGNAL_REST_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );
}

let dailyTickRunning = false;

async function runDailyInsightTick(): Promise<void> {
  if (dailyTickRunning) return;
  dailyTickRunning = true;

  try {
    const now = new Date();
    const twentyHoursAgo = new Date(now.getTime() - 20 * 60 * 60 * 1000);

    const users = await User.find({
      'preferences.notifications': true,
      'preferences.dailyInsightTime': { $exists: true, $nin: [null, ''] },
      'preferences.timezone': { $exists: true, $nin: [null, ''] },
      $or: [
        { lastDailyPushSentAt: { $exists: false } },
        { lastDailyPushSentAt: null },
        { lastDailyPushSentAt: { $lt: twentyHoursAgo } },
      ],
    }).lean();

    let sentCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    let matchedCount = 0;

    for (const user of users) {
      const { timezone, dailyInsightTime, notifications } = user.preferences;

      if (!notifications || !dailyInsightTime || !timezone) {
        skippedCount++;
        continue;
      }

      const zonedNow = toZonedTime(now, timezone);
      const currentHour = zonedNow.getHours();
      const currentMinute = zonedNow.getMinutes();

      const parts = dailyInsightTime.split(':');
      const targetHour = parseInt(parts[0] ?? '', 10);
      const targetMinute = parseInt(parts[1] ?? '', 10);

      if (isNaN(targetHour) || isNaN(targetMinute)) {
        skippedCount++;
        continue;
      }

      if (currentHour !== targetHour || currentMinute !== targetMinute) {
        skippedCount++;
        continue;
      }

      matchedCount++;

      if (user.lastDailyPushSentAt) {
        const zonedLast = toZonedTime(user.lastDailyPushSentAt, timezone);
        const todayStr = `${zonedNow.getFullYear()}-${zonedNow.getMonth()}-${zonedNow.getDate()}`;
        const lastStr = `${zonedLast.getFullYear()}-${zonedLast.getMonth()}-${zonedLast.getDate()}`;
        if (todayStr === lastStr) {
          skippedCount++;
          continue;
        }
      }

      const userId = user._id.toString();
      const dayOfWeek = zonedNow.getDay();
      const message = DAILY_MESSAGES[dayOfWeek] ?? DAILY_MESSAGES[0];
      const dateStr = `${zonedNow.getFullYear()}-${String(zonedNow.getMonth() + 1).padStart(2, '0')}-${String(zonedNow.getDate()).padStart(2, '0')}`;

      try {
        await sendOneSignalPush(
          userId,
          { en: 'Your Daily Cosmic Insight ✨' },
          { en: message },
          `daily-insight-${userId}-${dateStr}`,
          { screen: 'daily-insight' }
        );
        await User.updateOne({ _id: user._id }, { $set: { lastDailyPushSentAt: now } });
        logger.info(`[Scheduler] Sent daily push to user ${userId}`);
        sentCount++;
      } catch (err) {
        const errorMessage = axios.isAxiosError(err) ? err.message : String(err);
        logger.error(`[Scheduler] Failed to send to user ${userId}: ${errorMessage}`, {
          response: axios.isAxiosError(err) ? err.response?.data : undefined,
        });
        failedCount++;
      }
    }

    logger.info(
      `[Scheduler] Daily tick: matched=${matchedCount} sent=${sentCount} failed=${failedCount} skipped=${skippedCount}`
    );
  } finally {
    dailyTickRunning = false;
  }
}

let reengagementTickRunning = false;

async function runReengagementTick(): Promise<void> {
  if (reengagementTickRunning) return;
  reengagementTickRunning = true;

  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const users = await User.find({
      'preferences.notifications': true,
      lastSeenAt: { $exists: true, $ne: null, $lt: sevenDaysAgo },
      $or: [
        { lastReengagementPushSentAt: { $exists: false } },
        { lastReengagementPushSentAt: null },
        { lastReengagementPushSentAt: { $lt: sevenDaysAgo } },
      ],
    }).lean();

    let sentCount = 0;
    let failedCount = 0;

    const dateStr = now.toISOString().split('T')[0] ?? now.toISOString().slice(0, 10);

    for (const user of users) {
      const userId = user._id.toString();
      try {
        await sendOneSignalPush(
          userId,
          { en: 'We miss you ✨' },
          {
            en: 'Your cosmic reading is waiting. Come back and discover what the stars have for you.',
          },
          `reengagement-${userId}-${dateStr}`
        );
        await User.updateOne(
          { _id: user._id },
          { $set: { lastReengagementPushSentAt: now } }
        );
        logger.info(`[Scheduler] Sent re-engagement push to user ${userId}`);
        sentCount++;
      } catch (err) {
        const errorMessage = axios.isAxiosError(err) ? err.message : String(err);
        logger.error(`[Scheduler] Failed to send re-engagement push to user ${userId}: ${errorMessage}`, {
          response: axios.isAxiosError(err) ? err.response?.data : undefined,
        });
        failedCount++;
      }
    }

    logger.info(`[Scheduler] Re-engagement tick: sent=${sentCount} failed=${failedCount}`);
  } finally {
    reengagementTickRunning = false;
  }
}

export function startPushScheduler(): void {
  console.log('[Scheduler] startPushScheduler called');
  if (!process.env.ONESIGNAL_APP_ID || !process.env.ONESIGNAL_REST_API_KEY) {
    logger.warn(
      '[Scheduler] ONESIGNAL_APP_ID or ONESIGNAL_REST_API_KEY not set — push notifications will not be sent.'
    );
  }

  // Check every minute — send when user's local HH:mm matches their dailyInsightTime
  schedule('* * * * *', () => {
    runDailyInsightTick().catch((err: unknown) => {
      logger.error('Daily insight tick error:', err);
    });
  });

  // Re-engagement push at 10:00 UTC daily
  schedule('0 10 * * *', () => {
    runReengagementTick().catch((err: unknown) => {
      logger.error('Re-engagement tick error:', err);
    });
  });
}
