import { Request, Response } from 'express';
import { profileService } from '../services/profile.service';
import { asyncHandler, AppError } from '../middleware/error.middleware';
import {
  birthDataSchema,
  profileUpdateSchema,
  createProfileSchema,
} from '../utils/validation';
import { logger } from '../utils/logger';

/**
 * Profile controller class
 */
class ProfileController {
  /**
   * POST /api/profile - Create profile
   */
  createProfile = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError(401, 'User not authenticated');
    }

    // Validate request body
    const validatedData = createProfileSchema.parse(req.body);

    // Create profile
    const profile = await profileService.createProfile(
      req.user._id.toString(),
      {
        name: validatedData.name,
        birthData: {
          birthDate: validatedData.birthDate,
          birthTime: validatedData.birthTime,
          birthLocation: validatedData.birthLocation,
          handedness: validatedData.handedness,
        },
        handedness: validatedData.handedness,
      }
    );

    logger.info(`Profile created for user ${req.user._id}`);

    res.status(201).json({
      success: true,
      data: profile,
    });
  });

  /**
   * GET /api/profile - Get current user's profile
   */
  getProfile = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError(401, 'User not authenticated');
    }

    const profile = await profileService.getProfile(req.user._id.toString());

    if (!profile) {
      throw new AppError(404, 'Profile not found');
    }

    res.json({
      success: true,
      data: profile,
    });
  });

  /**
   * PATCH /api/profile - Update profile
   */
  updateProfile = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError(401, 'User not authenticated');
    }

    // Validate request body
    const validatedData = profileUpdateSchema.parse(req.body);

    // Update profile
    const profile = await profileService.updateProfile(
      req.user._id.toString(),
      validatedData
    );

    logger.info(`Profile updated for user ${req.user._id}`);

    res.json({
      success: true,
      data: profile,
    });
  });

  /**
   * POST /api/profile/birth-data - Set birth data
   */
  setBirthData = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError(401, 'User not authenticated');
    }

    // Validate request body
    const validatedData = birthDataSchema.parse(req.body);

    // Set birth data
    const result = await profileService.setBirthData(
      req.user._id.toString(),
      validatedData
    );

    logger.info(`Birth data updated for user ${req.user._id}`);

    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * GET /api/profile/astrology - Get astrology profile
   */
  getAstrology = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError(401, 'User not authenticated');
    }

    const astrology = await profileService.getAstrology(
      req.user._id.toString()
    );

    res.json({
      success: true,
      data: astrology,
    });
  });

  /**
   * GET /api/profile/numerology - Get numerology profile
   */
  getNumerology = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError(401, 'User not authenticated');
    }

    const numerology = await profileService.getNumerology(
      req.user._id.toString()
    );

    res.json({
      success: true,
      data: numerology,
    });
  });

  /**
   * DELETE /api/profile - Delete profile
   */
  deleteProfile = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError(401, 'User not authenticated');
    }

    await profileService.deleteProfile(req.user._id.toString());

    logger.info(`Profile deleted for user ${req.user._id}`);

    res.json({
      success: true,
      message: 'Profile deleted successfully',
    });
  });
}

export const profileController = new ProfileController();
