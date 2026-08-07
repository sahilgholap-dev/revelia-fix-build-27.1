import express from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { readingRateLimit } from '../middleware/reading-rate-limit.middleware';
import { computeNatalChartFromBirthData } from '../services/astrology.service';
import { UserProfile } from '../models/UserProfile';
import { AppError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';

const router = express.Router();

router.use(authenticateToken);

/**
 * Birth-chart routes (Build 27 R1).
 *
 * Repurposed from the old LLM-approximated chart to the real, arc-second
 * Swiss Ephemeris `natalChart` computed by astrology.service. The chart is
 * normally computed on birth-data save; these routes compute-or-return it,
 * with a lazy persist if it's missing (covers pre-R1 users).
 *
 * Response keeps the historical `data.hasBirthTime`/`hasBirthLocation` flags
 * (mobile uses them for the assumed-time provenance indicator) and returns the
 * structured chart under `data.natalChart`.
 */

/**
 * GET /api/astrology/birth-chart
 * Returns the user's natal chart (computing + persisting it if missing).
 */
router.get('/birth-chart', async (req, res, next) => {
  try {
    // authenticateToken sets req.user (NOT req.userId — that field is never
    // populated anywhere). The birth-data WRITE path keys the profile by
    // req.user._id; read it the same way or a fresh user 404s on lookup.
    const userId = req.user!._id;
    const profile = await UserProfile.findOne({ userId });
    if (!profile) throw new AppError(404, 'Profile not found');

    let natalChart = profile.natalChart ?? null;

    // Lazy compute + persist if absent (pre-R1 users, or a prior compute that
    // failed open). Best-effort — a compute failure still returns null.
    if (!natalChart && profile.birthData?.date) {
      const computed = computeNatalChartFromBirthData(profile.birthData as any);
      if (computed) {
        profile.natalChart = computed;
        await profile.save();
        natalChart = computed;
        logger.info('Natal chart lazily computed on GET', { userId });
      }
    }

    res.json({
      success: true,
      data: {
        natalChart,
        hasBirthTime: !!profile.birthData?.time && !profile.birthData?.timeIsAssumed,
        hasBirthLocation: !!profile.birthData?.location?.city,
        timeIsAssumed: !!profile.birthData?.timeIsAssumed,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/astrology/birth-chart
 * Compute (or recompute, with forceRegenerate) the natal chart. Rate limited.
 */
router.post('/birth-chart', readingRateLimit, async (req, res, next): Promise<void> => {
  try {
    const userId = req.user!._id;
    const profile = await UserProfile.findOne({ userId });
    if (!profile) throw new AppError(404, 'Profile not found');

    if (!profile.birthData?.date) {
      throw new AppError(400, 'Birth date is required to generate a birth chart');
    }

    const forceRegenerate = req.body?.forceRegenerate === true;

    if (profile.natalChart && !forceRegenerate) {
      res.json({
        success: true,
        data: { natalChart: profile.natalChart, cached: true },
      });
      return;
    }

    const natalChart = computeNatalChartFromBirthData(profile.birthData as any);
    if (!natalChart) {
      throw new AppError(500, 'Failed to compute birth chart');
    }

    profile.natalChart = natalChart;
    await profile.save();

    logger.info('Natal chart computed and cached', { userId, forceRegenerate });

    res.json({
      success: true,
      data: { natalChart, cached: false },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
