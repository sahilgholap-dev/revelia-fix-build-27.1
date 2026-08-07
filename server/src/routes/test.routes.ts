import express, { Request, Response } from 'express';
import * as r2Service from '../services/r2.service';
import * as imageProcessing from '../utils/imageProcessing';
import { uploadMiddleware } from '../middleware/upload.middleware';
import * as readingController from '../controllers/reading.controller';

const router = express.Router();

/**
 * Test R2 configuration
 * GET /api/test/r2-config
 */
router.get('/r2-config', (_req, res) => {
  const isConfigured = r2Service.isR2Configured();
  
  res.json({
    success: true,
    data: {
      configured: isConfigured,
      accountId: process.env.R2_ACCOUNT_ID ? '✓ Set' : '✗ Missing',
      accessKeyId: process.env.R2_ACCESS_KEY_ID ? '✓ Set' : '✗ Missing',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ? '✓ Set' : '✗ Missing',
      bucketName: process.env.R2_BUCKET_NAME || 'revelia-images (default)',
      publicUrl: process.env.R2_PUBLIC_URL || '✗ Not set',
    },
  });
});

/**
 * Test image upload to R2
 * POST /api/test/r2-upload
 */
router.post('/r2-upload', uploadMiddleware.single('image') as any, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'No image file provided',
      });
      return;
    }

    // Check if R2 is configured
    if (!r2Service.isR2Configured()) {
      res.status(503).json({
        success: false,
        error: 'R2 is not configured. Please set R2 environment variables.',
      });
      return;
    }

    // Process image
    const processedBuffer = await imageProcessing.processImage(req.file.buffer);

    // Upload to R2 with test user ID
    const testUserId = 'test-user-' + Date.now();
    const result = await r2Service.uploadImage(processedBuffer, testUserId, 'face');

    res.json({
      success: true,
      message: 'Image uploaded successfully to R2',
      data: result,
    });
  } catch (error: any) {
    console.error('R2 upload test error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload to R2',
    });
  }
});

/**
 * Test image processing
 * POST /api/test/image-processing
 */
router.post('/image-processing', uploadMiddleware.single('image') as any, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'No image file provided',
      });
      return;
    }

    // Get original metadata
    const originalMetadata = await imageProcessing.getImageMetadata(req.file.buffer);

    // Process image
    const processedBuffer = await imageProcessing.processImage(req.file.buffer);

    // Get processed metadata
    const processedMetadata = await imageProcessing.getImageMetadata(processedBuffer);

    res.json({
      success: true,
      data: {
        original: {
          format: originalMetadata.format,
          width: originalMetadata.width,
          height: originalMetadata.height,
          size: req.file.size,
        },
        processed: {
          format: processedMetadata.format,
          width: processedMetadata.width,
          height: processedMetadata.height,
          size: processedBuffer.length,
        },
        compression: {
          ratio: ((1 - processedBuffer.length / req.file.size) * 100).toFixed(2) + '%',
          savedBytes: req.file.size - processedBuffer.length,
        },
      },
    });
  } catch (error: any) {
    console.error('Image processing test error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process image',
    });
  }
});

/**
 * Test Claude API connection
 * GET /api/test/claude
 */
router.get('/claude', readingController.testClaude);

export default router;
