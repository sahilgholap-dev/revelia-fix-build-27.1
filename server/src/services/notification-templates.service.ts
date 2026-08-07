import * as oneSignalService from './onesignal.service';
import { logger } from '../utils/logger';

/**
 * Daily insight notification
 */
export async function sendDailyInsightNotification(
  userId: string,
  insightHeadline: string
): Promise<void> {
  try {
    await oneSignalService.sendToUserId(
      userId,
      '✨ Your Daily Insight',
      insightHeadline,
      { screen: 'daily-insight' }
    );
  } catch (error) {
    logger.error(`Failed to send daily insight notification to user ${userId}:`, error);
  }
}

/**
 * Monthly reading available
 */
export async function sendMonthlyReadingNotification(
  userId: string,
  monthName: string
): Promise<void> {
  try {
    await oneSignalService.sendToUserId(
      userId,
      `🌙 Your ${monthName} Reading is Ready`,
      'Discover what the stars and your profile reveal for the month ahead.',
      { screen: 'monthly-reading' }
    );
  } catch (error) {
    logger.error(`Failed to send monthly reading notification to user ${userId}:`, error);
  }
}

/**
 * Compatibility nudge
 */
export async function sendCompatibilityNudge(userId: string): Promise<void> {
  try {
    await oneSignalService.sendToUserId(
      userId,
      '💕 Curious About Compatibility?',
      "Upload someone special's photo and discover your cosmic connection.",
      { screen: 'compatibility' }
    );
  } catch (error) {
    logger.error(`Failed to send compatibility nudge to user ${userId}:`, error);
  }
}

/**
 * Streak reminder
 */
export async function sendStreakReminder(
  userId: string,
  streakCount: number
): Promise<void> {
  try {
    await oneSignalService.sendToUserId(
      userId,
      '🔥 Don\'t Break Your Streak!',
      `You're on a ${streakCount}-day streak. Check in to keep it going!`,
      { screen: 'home' }
    );
  } catch (error) {
    logger.error(`Failed to send streak reminder to user ${userId}:`, error);
  }
}

/**
 * Reading complete
 */
export async function sendReadingCompleteNotification(
  userId: string,
  readingType: 'face' | 'palm',
  screen: string
): Promise<void> {
  try {
    await oneSignalService.sendToUserId(
      userId,
      '🔮 Your Reading is Ready',
      `Your ${readingType} reading has been revealed. Tap to see your insights.`,
      { screen }
    );
  } catch (error) {
    logger.error(`Failed to send reading complete notification to user ${userId}:`, error);
  }
}

/**
 * Welcome back (for lapsed users)
 */
export async function sendWelcomeBackNotification(userId: string): Promise<void> {
  try {
    await oneSignalService.sendToUserId(
      userId,
      '🌟 We Missed You',
      'Your cosmic insights are waiting. See what the universe has in store.',
      { screen: 'home' }
    );
  } catch (error) {
    logger.error(`Failed to send welcome back notification to user ${userId}:`, error);
  }
}
