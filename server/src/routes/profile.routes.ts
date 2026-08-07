import { Router } from 'express';
import { profileController } from '../controllers/profile.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Profile CRUD
router.post('/', profileController.createProfile);
router.get('/', profileController.getProfile);
router.patch('/', profileController.updateProfile);
router.delete('/', profileController.deleteProfile);

// Birth data
router.post('/birth-data', profileController.setBirthData);

// Astrology and numerology
router.get('/astrology', profileController.getAstrology);
router.get('/numerology', profileController.getNumerology);

export default router;
