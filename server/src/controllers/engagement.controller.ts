import { Request, Response } from 'express';
import { User } from '../models/User';
import { logger } from '../utils/logger';

/**
 * POST /api/engagement/checkin
 * Record user check-in and update streak
 */
export async function checkIn(req: Request, res: Response) {
  try {
    const userId = req.user!._id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const now = new Date();
    const lastCheckIn = user.engagement?.lastCheckIn;
    
    let currentStreak = user.engagement?.currentStreak || 0;
    let alreadyCheckedIn = false;
    let isNewRecord = false;
    
    if (lastCheckIn) {
      const hoursSince = (now.getTime() - new Date(lastCheckIn).getTime()) / (1000 * 60 * 60);
      
      if (hoursSince < 20) {
        // Already checked in today (within 20 hours)
        alreadyCheckedIn = true;
      } else if (hoursSince < 48) {
        // Continuing streak (within 48 hours)
        currentStreak += 1;
      } else {
        // Streak broken (more than 48 hours)
        currentStreak = 1;
      }
    } else {
      // First check-in ever
      currentStreak = 1;
    }
    
    // Update user
    if (!alreadyCheckedIn) {
      const longestStreak = Math.max(
        user.engagement?.longestStreak || 0,
        currentStreak
      );
      
      isNewRecord = currentStreak > (user.engagement?.longestStreak || 0);
      
      user.engagement = {
        currentStreak,
        longestStreak,
        lastCheckIn: now,
        totalCheckIns: (user.engagement?.totalCheckIns || 0) + 1
      };
      
      await user.save();
      
      logger.info(`User ${userId} checked in. Streak: ${currentStreak}`);
    }
    
    return res.status(200).json({
      success: true,
      data: {
        streak: currentStreak,
        alreadyCheckedIn,
        isNewRecord
      }
    });
  } catch (error: any) {
    logger.error('Check-in error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to record check-in'
    });
  }
}

/**
 * GET /api/engagement/streak
 * Get user's streak data
 */
export async function getStreak(req: Request, res: Response) {
  try {
    const userId = req.user!._id;
    const user = await User.findById(userId);
    
    return res.status(200).json({
      success: true,
      data: user?.engagement || {
        currentStreak: 0,
        longestStreak: 0,
        lastCheckIn: null,
        totalCheckIns: 0
      }
    });
  } catch (error: any) {
    logger.error('Get streak error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get streak data'
    });
  }
}
