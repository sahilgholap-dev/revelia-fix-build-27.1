// Load environment variables FIRST before any other imports
import { config } from 'dotenv';
config();

import app from './app';
import { connectDatabase } from './config/database';
import { env } from './config/env';
import { logger } from './utils/logger';
import { updateExistingTestAccounts } from './scripts/updateTestAccounts';
import { startPushScheduler } from './jobs/pushScheduler';
import { startReportWorker } from './jobs/reportWorker';
import { initTimingConfig } from './services/confidential-config.service';
import { isDeviceSaltConfigured } from './services/qa-caps.service';

const PORT = env.PORT;

/**
 * Start the server
 */
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDatabase();
    logger.info('Database connected successfully');

    // Surface silent-fallback failure modes for OAuth audience env vars at
    // startup. Build 17 root cause was an audience mismatch hiding behind a
    // stale fallback in code; explicit warnings here would have caught it.
    if (!process.env.APPLE_CLIENT_ID) {
      logger.warn(
        'APPLE_CLIENT_ID not set — using fallback (com.revelia.app). Set the env var explicitly for production.'
      );
    }
    if (!process.env.GOOGLE_OAUTH_WEB_CLIENT_ID) {
      logger.warn(
        'GOOGLE_OAUTH_WEB_CLIENT_ID not set — Google Sign In token validation will be disabled.'
      );
    }

    // R7 D5 — same class of silent-fallback failure, announced at boot rather than
    // discovered by a repro. Without QA_DEVICE_SALT the per-device free-Deep-Insight
    // gate hashes nothing, so it neither RECORDS a claim nor ENFORCES one: every free
    // DI is served and the anti-farming protection is entirely off, with a 200 on the
    // wire and no per-account symptom. Fail-open is deliberate (a misconfigured deploy
    // must never block a legitimate user) — but it must be loud, and it was not: the
    // only prior signal was a per-request warn that fires solely when the client also
    // happened to send X-Device-Id.
    if (!isDeviceSaltConfigured()) {
      logger.warn(
        '[qa-device-gate] QA_DEVICE_SALT is NOT set — the D5 per-device free-Deep-Insight anti-farming gate is INERT (fails open: no claim recorded, none enforced). One device can farm the free Fable-5 Deep Insight via new accounts. Set QA_DEVICE_SALT on this environment to enable it.'
      );
    }

    // Update test accounts on startup
    await updateExistingTestAccounts().catch((err) => {
      logger.warn('Failed to update test accounts:', err);
    });

    // R7 Timing Engine confidential rule-set prefetch (LG1). When R2_TIMING_* is
    // configured this fetches the trade-secret rule set from the private R2 bucket
    // into the engine's in-memory memo BEFORE /api/qa can serve. BOOT-FAILURE =
    // PER-REQUEST DEGRADE, NOT boot hard-fail (owner-resolved 2026-07-24): a single
    // live-prod backend serves ALL of Revelia, so a bad/absent R2_TIMING_* cred must
    // NEVER crash face/palm/numerology/R9/auth over a prod-dark R7 feature no user
    // can reach yet. On failure we log a LOUD, content-free fail-closed warning and
    // let the server come up; the timing path then fail-closes per-request (a timing
    // question degrades to a grounded reflective answer via qa.service — never a
    // fabricated verdict, never a stacktrace/5xx that leaks the engine exists). When
    // R2_TIMING_* is unset (local/dev/harness) this is a no-op and the engine uses
    // the local filesystem config.
    try {
      await initTimingConfig();
    } catch (err: any) {
      logger.warn(
        '[timing-config] initTimingConfig FAILED at boot — Timing Engine will FAIL-CLOSED per-request (server continues; reflective Q&A unaffected). Provision R2_TIMING_* + the timing rule-set bucket to enable timing.',
        { reason: err?.message ?? String(err) }
      );
    }

    // Start Express server
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Revelia API server running on port ${PORT}`);
      logger.info(`Environment: ${env.NODE_ENV}`);
      logger.info(`Health check: http://localhost:${PORT}/api/health`);
    });

    // Start in-process push scheduler (daily insight + re-engagement crons).
    // ENV-GATED so a NON-prod backend that SHARES the prod OneSignal app cannot
    // fire real push. Default = ON (unset → runs) so prod behaviour is unchanged;
    // set PUSH_SCHEDULER_ENABLED=false on staging/test backends to disable. This
    // is the safeguard for the build-27 staging deploy (shared OneSignal keys).
    if (process.env.PUSH_SCHEDULER_ENABLED === 'false') {
      logger.warn(
        '[INFO] Push scheduler DISABLED (PUSH_SCHEDULER_ENABLED=false) — no daily/re-engagement push will fire from this backend (staging/test safeguard).'
      );
    } else {
      startPushScheduler();
      logger.info('[INFO] Push scheduler started.');
    }

    // Start the async report worker (R9 §14 step 4 — claim tick + stale-timeout
    // sweep). PROD-DARK by default: registers NO cron unless
    // REPORT_WORKER_ENABLED === 'true' (keeps the single live backend dark until
    // steps 5-8 wire real generation content + renderer + QA + delivery).
    startReportWorker();

    // Claude Vision calls can take 60-110s for first readings; align with
    // the mobile/SDK ceiling of 180s so reading requests aren't cut off mid-flight.
    server.timeout = 180_000;
    server.keepAliveTimeout = 180_000;
    server.headersTimeout = 181_000;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start the server
startServer();
