import express, { Request, Response, NextFunction } from 'express';
import { getRecentAiFailures } from '../services/aiFailure.service';
import { logger } from '../utils/logger';

const router = express.Router();

/**
 * Admin auth: header must match ADMIN_API_KEY env var.
 * Kept distinct from INTERNAL_API_KEY to avoid sharing secrets between
 * cron-job paths and human-operated debugging endpoints.
 */
function adminAuth(req: Request, res: Response, next: NextFunction): void {
  const provided = req.headers['x-admin-api-key'];
  const expected = process.env.ADMIN_API_KEY;
  if (!expected || !provided || provided !== expected) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }
  next();
}

router.use(adminAuth);

/**
 * GET /api/admin/ai-failures?since=24h
 * Aggregated view of recent AI generation failures.
 */
router.get('/ai-failures', async (req: Request, res: Response) => {
  try {
    const sinceParam = (req.query.since as string) || '24h';
    const sinceMs = parseDuration(sinceParam);
    const data = await getRecentAiFailures(sinceMs);
    res.status(200).json({ success: true, data });
  } catch (err: any) {
    logger.error('admin ai-failures endpoint error', { error: err?.message });
    res.status(500).json({ success: false, error: 'Failed to load failures' });
  }
});

function parseDuration(s: string): number {
  const m = /^(\d+)([smhd])$/.exec(s.trim());
  if (!m) return 24 * 60 * 60 * 1000;
  const n = parseInt(m[1], 10);
  const unit = m[2];
  switch (unit) {
    case 's': return n * 1000;
    case 'm': return n * 60 * 1000;
    case 'h': return n * 60 * 60 * 1000;
    case 'd': return n * 24 * 60 * 60 * 1000;
    default: return 24 * 60 * 60 * 1000;
  }
}

export default router;
