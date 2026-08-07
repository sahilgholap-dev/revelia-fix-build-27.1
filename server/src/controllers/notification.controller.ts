import { Request, Response } from 'express';
import { User } from '../models/User';
import * as oneSignalService from '../services/onesignal.service';
import { logger } from '../utils/logger';

/**
 * POST /api/notifications/register
 * Register device for push notifications
 */
export async function registerDevice(req: Request, res: Response) {
  try {
    const userId = req.user!._id;
    const { oneSignalPlayerId, platform } = req.body;
    
    if (!oneSignalPlayerId) {
      return res.status(400).json({
        success: false,
        error: 'OneSignal player ID is required'
      });
    }
    
    await User.findByIdAndUpdate(userId, {
      $set: {
        'preferences.oneSignalPlayerId': oneSignalPlayerId,
        'preferences.platform': platform
      }
    });
    
    logger.info(`Device registered for user ${userId}`);
    
    return res.status(200).json({
      success: true,
      message: 'Device registered successfully'
    });
  } catch (error: any) {
    logger.error('Device registration error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to register device'
    });
  }
}

/**
 * PATCH /api/notifications/preferences
 * Update notification preferences
 */
export async function updatePreferences(req: Request, res: Response) {
  try {
    const userId = req.user!._id;
    const { notifications, dailyInsightTime, timezone } = req.body;
    
    const updates: any = {};
    if (typeof notifications === 'boolean') {
      updates['preferences.notifications'] = notifications;
    }
    if (dailyInsightTime) {
      updates['preferences.dailyInsightTime'] = dailyInsightTime;
    }
    if (timezone) {
      // Validate IANA timezone via Intl round-trip (same pattern as
      // geocoder.service). Rejects abbreviations like "EST"/"IST" and
      // arbitrary strings.
      try {
        new Intl.DateTimeFormat('en-US', { timeZone: timezone });
      } catch {
        return res.status(400).json({
          success: false,
          error: 'Invalid timezone. Use an IANA name like "America/New_York" or "Asia/Kolkata".',
        });
      }
      updates['preferences.timezone'] = timezone;
    }
    
    await User.findByIdAndUpdate(userId, { $set: updates });
    
    logger.info(`Notification preferences updated for user ${userId}`);
    
    return res.status(200).json({
      success: true,
      message: 'Notification preferences updated'
    });
  } catch (error: any) {
    logger.error('Update preferences error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update preferences'
    });
  }
}

/**
 * GET /api/notifications/preferences
 * Get notification preferences
 */
export async function getPreferences(req: Request, res: Response) {
  try {
    const userId = req.user!._id;
    const user = await User.findById(userId);
    
    return res.status(200).json({
      success: true,
      data: user?.preferences || {}
    });
  } catch (error: any) {
    logger.error('Get preferences error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get preferences'
    });
  }
}

/**
 * POST /api/notifications/test
 * Send test notification
 */
export async function sendTestNotification(req: Request, res: Response) {
  try {
    const userId = req.user!._id;
    const user = await User.findById(userId);
    
    if (!user?.preferences?.oneSignalPlayerId) {
      return res.status(400).json({
        success: false,
        error: 'No OneSignal player ID registered'
      });
    }
    
    await oneSignalService.sendToUser(
      user.preferences.oneSignalPlayerId,
      '🔮 Test Notification',
      'This is a test notification from Revelia. Tap to open the app!',
      { screen: 'home' }
    );
    
    logger.info(`Test notification sent to user ${userId}`);
    
    return res.status(200).json({
      success: true,
      message: 'Test notification sent'
    });
  } catch (error: any) {
    logger.error('Test notification error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to send test notification'
    });
  }
}
