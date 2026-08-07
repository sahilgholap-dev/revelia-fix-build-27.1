import axios from 'axios';
import { User } from '../models/User';
import { logger } from '../utils/logger';

const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
const ONESIGNAL_API_KEY = process.env.ONESIGNAL_REST_API_KEY;
const ONESIGNAL_API_URL = 'https://onesignal.com/api/v1';

interface SendNotificationParams {
  playerIds?: string[];        // Specific devices
  includedSegments?: string[]; // Segments like "All", "Active Users"
  headings: { en: string };
  contents: { en: string };
  data?: Record<string, string>;
  sendAfter?: string;          // ISO 8601 datetime for scheduled
}

/**
 * Send notification via OneSignal
 */
export async function sendNotification(params: SendNotificationParams): Promise<void> {
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_API_KEY) {
    logger.warn('OneSignal credentials not configured, skipping notification');
    return;
  }

  try {
    await axios.post(`${ONESIGNAL_API_URL}/notifications`, {
      app_id: ONESIGNAL_APP_ID,
      ...params
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_API_KEY}`
      }
    });
    logger.info('OneSignal notification sent successfully');
  } catch (error: any) {
    logger.error('OneSignal send error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Send to specific user by OneSignal player ID
 */
export async function sendToUser(
  oneSignalPlayerId: string,
  title: string,
  message: string,
  data?: Record<string, string>
): Promise<void> {
  await sendNotification({
    playerIds: [oneSignalPlayerId],
    headings: { en: title },
    contents: { en: message },
    data
  });
}

/**
 * Send to user by userId (lookup player ID)
 */
export async function sendToUserId(
  userId: string,
  title: string,
  message: string,
  data?: Record<string, string>
): Promise<void> {
  const user = await User.findById(userId);
  
  if (!user?.preferences?.oneSignalPlayerId) {
    logger.info(`User ${userId} has no OneSignal player ID, skipping notification`);
    return;
  }
  
  if (!user.preferences.notifications) {
    logger.info(`User ${userId} has notifications disabled, skipping`);
    return;
  }
  
  await sendToUser(user.preferences.oneSignalPlayerId, title, message, data);
}

/**
 * Send to segment
 */
export async function sendToSegment(
  segment: string,
  title: string,
  message: string,
  data?: Record<string, string>
): Promise<void> {
  await sendNotification({
    includedSegments: [segment],
    headings: { en: title },
    contents: { en: message },
    data
  });
}

/**
 * Schedule notification
 */
export async function scheduleNotification(
  oneSignalPlayerId: string,
  title: string,
  message: string,
  sendAfter: Date,
  data?: Record<string, string>
): Promise<void> {
  await sendNotification({
    playerIds: [oneSignalPlayerId],
    headings: { en: title },
    contents: { en: message },
    sendAfter: sendAfter.toISOString(),
    data
  });
}
