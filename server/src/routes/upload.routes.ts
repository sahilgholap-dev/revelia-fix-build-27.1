import express from 'express';
import * as uploadController from '../controllers/upload.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { uploadMiddleware } from '../middleware/upload.middleware';

const router = express.Router();

/**
 * All routes require authentication
 */
router.use(authenticateToken);

/**
 * Upload face image
 * POST /api/upload/face
 * Body: multipart/form-data with 'image' field
 */
router.post('/face', uploadMiddleware.single('image') as any, uploadController.uploadFace);

/**
 * Upload palm image
 * POST /api/upload/palm
 * Body: multipart/form-data with 'image' field and 'isDominant' boolean
 */
router.post('/palm', uploadMiddleware.single('image') as any, uploadController.uploadPalm);

/**
 * Delete uploaded image
 * DELETE /api/upload/:type
 * Params: type = 'face' | 'palm-dominant' | 'palm-non-dominant'
 */
router.delete('/:type', uploadController.deleteImage);

/**
 * Upload partner image for compatibility reading
 * POST /api/upload/partner
 * Body: multipart/form-data with 'image' field
 */
router.post('/partner', uploadMiddleware.single('image') as any, uploadController.uploadPartner);

export default router;
