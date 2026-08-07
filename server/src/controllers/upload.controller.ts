import { Request, Response } from 'express';
import * as uploadService from '../services/upload.service';
import { logger } from '../utils/logger';

/**
 * Upload face image
 * POST /api/upload/face
 */
export async function uploadFace(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!._id.toString();

    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'No image file provided',
      });
      return;
    }

    logger.info(`Face upload request: userId=${userId}, fileSize=${req.file.size}`);
    const result = await uploadService.uploadFaceImage(userId, req.file.buffer, req.file.mimetype);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Face upload error:', { error: error.message, stack: error.stack });

    // Handle image validation rejection
    if (error.statusCode === 422 || error.message === 'INVALID_IMAGE') {
      res.status(422).json({
        error: 'INVALID_IMAGE',
        reason: error.reason || 'INVALID_IMAGE',
        message: error.userMessage || 'Image validation failed',
      });
      return;
    }

    const statusCode = error.message?.includes('temporarily unavailable') ? 503 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to upload face image',
    });
  }
}

/**
 * Upload palm image
 * POST /api/upload/palm
 */
export async function uploadPalm(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!._id.toString();

    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'No image file provided',
      });
      return;
    }

    // Get isDominant from request body
    const isDominant = req.body.isDominant === 'true' || req.body.isDominant === true;

    logger.info(`Palm upload request: userId=${userId}, isDominant=${isDominant}, fileSize=${req.file.size}`);
    const result = await uploadService.uploadPalmImage(userId, req.file.buffer, isDominant, req.file.mimetype);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Palm upload error:', { error: error.message, stack: error.stack });

    // Handle image validation rejection
    if (error.statusCode === 422 || error.message === 'INVALID_IMAGE') {
      res.status(422).json({
        error: 'INVALID_IMAGE',
        reason: error.reason || 'INVALID_IMAGE',
        message: error.userMessage || 'Image validation failed',
      });
      return;
    }

    const statusCode = error.message?.includes('temporarily unavailable') ? 503 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to upload palm image',
    });
  }
}

/**
 * Delete uploaded image
 * DELETE /api/upload/:type
 */
export async function deleteImage(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!._id.toString();
    const { type } = req.params;

    if (!['face', 'palm-dominant', 'palm-non-dominant'].includes(type)) {
      res.status(400).json({
        success: false,
        error: 'Invalid image type. Must be: face, palm-dominant, or palm-non-dominant',
      });
      return;
    }

    await uploadService.deleteUploadedImage(userId, type as any);

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete image error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete image',
    });
  }
}

/**
 * Upload partner image for compatibility reading
 * POST /api/upload/partner
 */
export async function uploadPartner(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!._id.toString();

    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'No image file provided',
      });
      return;
    }

    const result = await uploadService.uploadPartnerImage(userId, req.file.buffer, req.file.mimetype);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Partner upload error:', error);

    // Handle image validation rejection
    if (error.statusCode === 422 || error.message === 'INVALID_IMAGE') {
      res.status(422).json({
        error: 'INVALID_IMAGE',
        reason: error.reason || 'INVALID_IMAGE',
        message: error.userMessage || 'Image validation failed',
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload partner image',
    });
  }
}
