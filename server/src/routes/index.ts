import { Application } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import profileRoutes from './profile.routes';
import uploadRoutes from './upload.routes';
import readingRoutes from './readings.routes';
import insightRoutes from './insights.routes';
import compatibilityRoutes from './compatibility.routes';
import notificationRoutes from './notifications.routes';
import engagementRoutes from './engagement.routes';
import internalRoutes from './internal.routes';
import testRoutes from './test.routes';
import subscriptionRoutes from './subscription.routes';
import webhookRoutes from './webhook.routes';
import rtdnRoutes from './rtdn.routes';
import accountRoutes from './account.routes';
import astrologyRoutes from './astrology.routes';
import adminRoutes from './admin.routes';
import diagnosticRoutes from './diagnostic.routes';
import reportRoutes from './report.routes';
import qaRoutes from './qa.routes';

/**
 * Mount all application routes
 */
export const mountRoutes = (app: Application): void => {
  // Health check routes
  app.use('/api/health', healthRoutes);

  // Authentication routes
  app.use('/api/auth', authRoutes);

  // Profile routes
  app.use('/api/profile', profileRoutes);

  // Upload routes
  app.use('/api/upload', uploadRoutes);

  // Reading routes
  app.use('/api/readings', readingRoutes);

  // Report routes (Build 27 R9 — Personalized Cosmic Report; async enqueue)
  app.use('/api/reports', reportRoutes);

  // Q&A routes (Build 27 R7 — Conversational Q&A + Timing Engine; prod-dark)
  app.use('/api/qa', qaRoutes);

  // Insight routes (daily, weekly, monthly)
  app.use('/api/insights', insightRoutes);

  // Compatibility routes
  app.use('/api/compatibility', compatibilityRoutes);

  // Notification routes
  app.use('/api/notifications', notificationRoutes);

  // Engagement routes (streaks, check-ins)
  app.use('/api/engagement', engagementRoutes);

  // Internal routes (for cron jobs)
  app.use('/api/internal', internalRoutes);

  // Test routes (for development/testing)
  app.use('/api/test', testRoutes);

  // Subscription routes
  app.use('/api/subscription', subscriptionRoutes);

  // Webhook routes
  app.use('/api/webhooks', webhookRoutes);

  // RevenueCat RTDN webhook
  app.use('/api/webhooks', rtdnRoutes);

  // Account management routes
  app.use('/api/account', accountRoutes);

  // Astrology routes (birth chart)
  app.use('/api/astrology', astrologyRoutes);

  // Admin routes (failures dashboard, etc — guarded by ADMIN_API_KEY header)
  app.use('/api/admin', adminRoutes);

  // Diagnostic logging endpoint (rate-limited, no auth — see diagnostic.routes.ts)
  app.use('/api/diagnostic', diagnosticRoutes);
};
