import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { env } from '../config/env';

/**
 * Health check controller
 */
class HealthController {
  /**
   * Check API health status
   * Enhanced with service availability checks
   */
  async check(_req: Request, res: Response): Promise<void> {
    try {
      // Check database connection
      const dbStatus =
        mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

      // Check service configurations
      const services = {
        claudeAPI: !!env.ANTHROPIC_API_KEY,
        r2Storage: !!(
          env.R2_ACCOUNT_ID &&
          env.R2_ACCESS_KEY_ID &&
          env.R2_SECRET_ACCESS_KEY
        ),
        revenueCat: !!env.REVENUECAT_API_KEY,
        oneSignal: !!(env.ONESIGNAL_APP_ID && env.ONESIGNAL_REST_API_KEY),
        internalAPI: !!env.INTERNAL_API_KEY,
      };

      res.status(200).json({
        success: true,
        message: 'Revelia API running',
        data: {
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          environment: env.NODE_ENV,
          database: dbStatus,
          services,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Health check failed',
      });
    }
  }
}

export const healthController = new HealthController();
