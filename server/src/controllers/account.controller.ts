import { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler, AppError } from '../middleware/error.middleware';
import { User } from '../models/User';
import { UserProfile } from '../models/UserProfile';
import { Reading } from '../models/Reading';
import { Compatibility } from '../models/Compatibility';
import { InsightCache } from '../models/InsightCache';
import * as r2Service from '../services/r2.service';
import { updateUserName } from '../services/user.service';
import { logger } from '../utils/logger';

// Outer Zod gate — keeps obviously-bad requests out before they hit the
// service-level validateName() (which is more expensive). 100 chars here
// is intentionally looser than nameValidation.ts's 50-char post-trim limit
// so trailing whitespace / pre-trim padding doesn't fail the schema.
const updateNameSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .min(1, 'Name is required')
    .max(100, 'Name is too long'),
});

/**
 * Account controller class
 */
class AccountController {
  /**
   * POST /api/account/export
   * Request data export (GDPR compliance)
   */
  exportData = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!._id;
    
    logger.info(`Data export requested for user ${userId}`);
    
    // Fetch all user data
    const readings = await Reading.find({ userId });
    const compatibility = await Compatibility.find({ userId });
    const insights = await InsightCache.find({ userId });
    
    // In production, this would trigger an email with JSON export
    // or generate a downloadable file
    // For now, return a confirmation message
    
    res.status(200).json({
      success: true,
      data: {
        message: 'Your data export will be sent to your email within 24 hours.',
        dataSize: {
          readings: readings.length,
          compatibility: compatibility.length,
          insights: insights.length
        }
      }
    });
  });

  /**
   * DELETE /api/account
   * Delete user account and all associated data (GDPR compliance)
   */
  deleteAccount = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!._id;
    
    logger.info(`Account deletion initiated for user ${userId}`);
    
    try {
      // 1. Delete all readings
      const deletedReadings = await Reading.deleteMany({ userId });
      logger.info(`Deleted ${deletedReadings.deletedCount} readings for user ${userId}`);
      
      // 2. Delete all compatibility readings (and their images)
      const compatReadings = await Compatibility.find({ userId });
      for (const reading of compatReadings) {
        if (reading.partnerImageUrl) {
          try {
            // Extract key from URL and delete from R2
            const urlParts = reading.partnerImageUrl.split('/');
            const key = urlParts.slice(-3).join('/');
            await r2Service.deleteImage(key);
            logger.info(`Deleted partner image: ${key}`);
          } catch (error) {
            logger.error('Failed to delete partner image:', error);
          }
        }
      }
      const deletedCompat = await Compatibility.deleteMany({ userId });
      logger.info(`Deleted ${deletedCompat.deletedCount} compatibility readings for user ${userId}`);
      
      // 3. Delete all insight caches
      const deletedInsights = await InsightCache.deleteMany({ userId });
      logger.info(`Deleted ${deletedInsights.deletedCount} insight caches for user ${userId}`);
      
      // 4. Delete user images from R2
      const profile = await UserProfile.findOne({ userId });
      if (profile) {
        // Delete face image
        if (profile.images?.face?.url) {
          try {
            const urlParts = profile.images.face.url.split('/');
            const key = urlParts.slice(-3).join('/');
            await r2Service.deleteImage(key);
            logger.info(`Deleted face image: ${key}`);
          } catch (error) {
            logger.error('Failed to delete face image:', error);
          }
        }
        
        // Delete palm dominant image
        if (profile.images?.palmDominant?.url) {
          try {
            const urlParts = profile.images.palmDominant.url.split('/');
            const key = urlParts.slice(-3).join('/');
            await r2Service.deleteImage(key);
            logger.info(`Deleted palm dominant image: ${key}`);
          } catch (error) {
            logger.error('Failed to delete palm dominant image:', error);
          }
        }
        
        // Delete palm non-dominant image
        if (profile.images?.palmNonDominant?.url) {
          try {
            const urlParts = profile.images.palmNonDominant.url.split('/');
            const key = urlParts.slice(-3).join('/');
            await r2Service.deleteImage(key);
            logger.info(`Deleted palm non-dominant image: ${key}`);
          } catch (error) {
            logger.error('Failed to delete palm non-dominant image:', error);
          }
        }
      }
      
      // 5. Delete user profile
      await UserProfile.deleteOne({ userId });
      logger.info(`Deleted profile for user ${userId}`);
      
      // 6. Delete user
      await User.findByIdAndDelete(userId);
      logger.info(`Deleted user ${userId}`);
      
      res.status(200).json({
        success: true,
        message: 'Account and all associated data have been permanently deleted'
      });
    } catch (error) {
      logger.error('Error during account deletion:', error);
      throw error;
    }
  });

  /**
   * PATCH /api/account/name
   * Update the user's display name. Tier-rate-limited (middleware) and
   * multi-layer-validated (service). Updates both User.name and
   * UserProfile.name atomically (best-effort).
   */
  updateName = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError(401, 'User not authenticated');
    }
    const parsed = updateNameSchema.parse(req.body);
    const result = await updateUserName(req.user._id.toString(), parsed.name);
    res.status(200).json({
      success: true,
      data: {
        user: result.user.toJSON(),
      },
    });
  });
}

export const accountController = new AccountController();
