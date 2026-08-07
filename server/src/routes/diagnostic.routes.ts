import express, { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { DiagnosticLog } from '../models/DiagnosticLog';
import { logger } from '../utils/logger';

const router = express.Router();

// Granular instrumentation in the mobile app fires ~30-50 events per launch
// per device, plus retries from previous-launch buffers. 100 req/min was
// too tight; bump to 1000 to ensure no events are dropped during the iOS
// blank-screen investigation.
const diagnosticLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many diagnostic logs' },
}) as any;

/**
 * Strip anything that looks like PII or secrets from `data` before storing.
 * The mobile app should already only send metadata, but defense-in-depth.
 */
const FORBIDDEN_KEYS = new Set([
  'password',
  'token',
  'authorization',
  'auth',
  'idToken',
  'identityToken',
  'jwt',
  'apiKey',
  'api_key',
  'birthData',
  'birth_data',
  'image',
  'imageBase64',
  'imageUrl',
  'photo',
  'face',
  'palm',
  'email',
  'phone',
  'ssn',
  'name',
  'firstName',
  'lastName',
]);

function sanitize(value: any, depth = 0): any {
  if (depth > 5) return undefined;
  if (value == null) return value;
  if (typeof value === 'string') return value.length > 1000 ? value.slice(0, 1000) : value;
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => sanitize(v, depth + 1));
  if (typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      if (FORBIDDEN_KEYS.has(k.toLowerCase())) continue;
      out[k] = sanitize(v, depth + 1);
    }
    return out;
  }
  return undefined;
}

/**
 * POST /api/diagnostic/log
 * Body: { deviceId?, platform?, osVersion?, appVersion?, event, timestamp?, data? }
 *
 * No auth (we'll secure later); client-side fire-and-forget. Used to debug
 * device-specific issues like the iPad blank-screen bug.
 */
router.post('/log', diagnosticLimiter, async (req: Request, res: Response) => {
  // Respond immediately so the mobile app never has to wait on us
  res.status(200).json({ success: true });

  try {
    const { deviceId, platform, osVersion, appVersion, event, data } = req.body || {};

    if (!event || typeof event !== 'string') {
      // Already responded 200; just skip writing
      return;
    }

    await DiagnosticLog.create({
      deviceId: typeof deviceId === 'string' ? deviceId.slice(0, 200) : undefined,
      platform: typeof platform === 'string' ? platform.slice(0, 64) : undefined,
      osVersion: typeof osVersion === 'string' ? osVersion.slice(0, 64) : undefined,
      appVersion: typeof appVersion === 'string' ? appVersion.slice(0, 64) : undefined,
      event: event.slice(0, 200),
      data: sanitize(data),
      ip: req.ip,
    });
  } catch (err: any) {
    logger.warn('diagnostic.log write failed', { error: err?.message });
  }
});

/**
 * POST /api/diagnostic/log/bulk
 * Body: { entries: [{ deviceId?, platform?, osVersion?, appVersion?, event, ts?, timestamp?, data?, error? }, ...] }
 *
 * Used by the mobile crash-surviving local logger to push persisted entries
 * from prior launches in one shot. Always responds 200 so the client can
 * drop its persisted buffer regardless of partial failures here.
 */
router.post('/log/bulk', diagnosticLimiter, async (req: Request, res: Response) => {
  try {
    const { entries } = req.body || {};
    if (!Array.isArray(entries)) {
      res.status(400).json({ success: false, error: 'entries must be an array' });
      return;
    }

    const docs = entries
      .filter((e: any) => e && typeof e.event === 'string')
      .slice(0, 500)
      .map((e: any) => ({
        deviceId: typeof e.deviceId === 'string' ? e.deviceId.slice(0, 200) : 'unknown',
        platform: typeof e.platform === 'string' ? e.platform.slice(0, 64) : 'unknown',
        osVersion: typeof e.osVersion === 'string' ? e.osVersion.slice(0, 64) : 'unknown',
        appVersion: typeof e.appVersion === 'string' ? e.appVersion.slice(0, 64) : 'unknown',
        event: String(e.event).slice(0, 200),
        timestamp: e.ts || e.timestamp || new Date().toISOString(),
        data: sanitize(e.data),
        error: typeof e.error === 'string' ? e.error.slice(0, 1000) : undefined,
        bulkUpload: true,
        ip: req.ip,
      }));

    if (docs.length > 0) {
      try {
        await DiagnosticLog.insertMany(docs, { ordered: false });
      } catch (insertErr: any) {
        // Partial inserts are OK — surface count we attempted.
        logger.warn('diagnostic.log/bulk insertMany partial failure', {
          error: insertErr?.message,
          attempted: docs.length,
        });
      }
    }

    res.status(200).json({ success: true, inserted: docs.length });
  } catch (err: any) {
    logger.warn('diagnostic.log/bulk handler error', { error: err?.message });
    // Always 200 — we never want a failure here to make the client retry
    // forever and accumulate a giant local log.
    res.status(200).json({ success: false });
  }
});

/**
 * GET /api/diagnostic/admin/recent?platform=ios&limit=100
 * Header: X-Admin-API-Key: <ADMIN_API_KEY>
 *
 * Curl-friendly read endpoint for fetching recent diagnostic logs by
 * platform. Workaround for environments where mongosh is unavailable
 * (e.g. Contabo glibc 2.28 incompat).
 */
router.get('/admin/recent', async (req: Request, res: Response) => {
  try {
    const adminKey = req.headers['x-admin-api-key'];
    if (!process.env.ADMIN_API_KEY || adminKey !== process.env.ADMIN_API_KEY) {
      res.status(401).json({ success: false, error: 'unauthorized' });
      return;
    }

    const platform = ((req.query.platform as string) || 'ios').slice(0, 32);
    const rawLimit = parseInt((req.query.limit as string) || '100', 10);
    const limit = Math.min(Number.isFinite(rawLimit) ? rawLimit : 100, 500);

    // Match the platform substring (entries store "ios/17.6.1" style values).
    const escaped = platform.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const logs = await DiagnosticLog
      .find({ platform: { $regex: escaped, $options: 'i' } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({ success: true, count: logs.length, logs });
  } catch (err: any) {
    logger.warn('diagnostic.admin/recent error', { error: err?.message });
    res.status(500).json({ success: false, error: err?.message || 'unknown' });
  }
});

export default router;
