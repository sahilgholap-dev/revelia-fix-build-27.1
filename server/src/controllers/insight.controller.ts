import { Request, Response } from 'express';
import * as insightService from '../services/insight.service';
import { logger } from '../utils/logger';
import { sanitiseReadPayload } from '../services/prose-sanitiser';
import { sendReadingError } from '../utils/readingErrorResponse';
import { AiFailure } from '../models/AiFailure';

async function latestFailureRef(userId: string, readingType: string): Promise<string | undefined> {
  try {
    const fresh = await AiFailure.findOne({ userId, readingType })
      .sort({ createdAt: -1 })
      .select('_id createdAt')
      .lean();
    if (!fresh) return undefined;
    if (Date.now() - new Date(fresh.createdAt).getTime() > 60_000) return undefined;
    return fresh._id.toString();
  } catch {
    return undefined;
  }
}

/**
 * GET /api/insights/daily
 * Get full daily insight (Premium Plus only)
 */
export async function getDailyInsight(req: Request, res: Response) {
  try {
    const userId = req.user!._id.toString();
    const result = await insightService.getDailyInsight(userId);
    
    /* `P91` (a) — insight caches DO roll over on their own cadence, so this is the
       half natural expiry would eventually reach. It is installed anyway: 554 of
       567 cached documents are dirty today and a daily cache lives a day, but a
       MONTHLY one lives a month, so "eventually" is up to 30 days of dirty prose
       on a surface a user opens every morning. */
    res.status(200).json({
      success: true,
      data: sanitiseReadPayload(result).value
    });
  } catch (error: any) {
    logger.error('Daily insight error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to get daily insight'
    });
  }
}

/**
 * GET /api/insights/daily/teaser
 * Get daily insight teaser (all authenticated users)
 */
export async function getDailyTeaser(req: Request, res: Response) {
  try {
    const userId = req.user!._id.toString();
    const result = await insightService.getDailyTeaser(userId);
    
    /* `P91` (a) — the free-tier teaser reads the same cache. */
    res.status(200).json({
      success: true,
      data: sanitiseReadPayload(result).value
    });
  } catch (error: any) {
    logger.error('Daily teaser error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to get daily teaser'
    });
  }
}

/**
 * GET /api/insights/weekly
 * Get weekly forecast (Premium Plus only)
 */
export async function getWeeklyForecast(req: Request, res: Response) {
  try {
    const userId = req.user!._id.toString();
    const result = await insightService.getWeeklyForecast(userId);
    
    /* `P91` (a) — same cache, weekly cadence. */
    res.status(200).json({
      success: true,
      data: sanitiseReadPayload(result).value
    });
  } catch (error: any) {
    logger.error('Weekly forecast error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to get weekly forecast'
    });
  }
}

/**
 * GET /api/insights/monthly
 * Get monthly reading (all authenticated users, tier-based content)
 */
export async function getMonthlyReading(req: Request, res: Response) {
  let userId: string | undefined;
  try {
    userId = req.user!._id.toString();
    const result = await insightService.getMonthlyReading(userId);

    /* `P91` (a) — the LONGEST-LIVED cache at up to a calendar month, which makes it
       the strongest of the four cases for not waiting on expiry. */
    res.status(200).json({
      success: true,
      data: sanitiseReadPayload(result).value
    });
  } catch (error: any) {
    logger.error('Monthly reading error:', { userId, error: error.message });
    const debugRef = userId ? await latestFailureRef(userId, 'monthly_astrology') : undefined;
    sendReadingError({
      res,
      error,
      defaultMessage: 'We had trouble generating your monthly reading. Please try again.',
      debugRef,
    });
  }
}
