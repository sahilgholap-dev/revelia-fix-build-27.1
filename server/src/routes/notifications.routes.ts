import express from 'express';
import * as notificationController from '../controllers/notification.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = express.Router();

// All notification routes require authentication
router.use(authenticateToken);

// Register device for push notifications
router.post('/register', notificationController.registerDevice);

// Get notification preferences
router.get('/preferences', notificationController.getPreferences);

// Update notification preferences
router.patch('/preferences', notificationController.updatePreferences);

// Send test notification
router.post('/test', notificationController.sendTestNotification);

export default router;
