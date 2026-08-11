import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import compression from 'compression';
import { errorHandler } from './middleware/error.middleware';
import { mountRoutes } from './routes';
import { logger } from './utils/logger';
import { resolveProductionCorsOrigins } from './utils/cors';
import { productionConfig } from './config/production';

/**
 * Create and configure Express application
 */
const app: Application = express();

// Railway (and most cloud platforms) sit behind a reverse proxy that sets
// X-Forwarded-For. Without this, express-rate-limit throws ERR_ERL_UNEXPECTED_X_FORWARDED_FOR
// and req.ip resolves to the proxy IP instead of the real client IP.
app.set('trust proxy', 1);

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Production Security Middleware
 * Only applied in production environment
 */
if (isProduction) {
  // Helmet - Security headers
  app.use(helmet(productionConfig.helmet) as any);
  logger.info('✓ Helmet security headers enabled');

  // Mongo sanitization - Prevent NoSQL injection
  app.use(mongoSanitize() as any);
  logger.info('✓ MongoDB sanitization enabled');

  // HPP - Prevent HTTP parameter pollution
  app.use(hpp() as any);
  logger.info('✓ HTTP parameter pollution protection enabled');

  // Compression - Reduce response size
  app.use(compression() as any);
  logger.info('✓ Response compression enabled');

  // General rate limiting — generous per-IP limit (auth-specific limits applied per-route)
  app.use(
    rateLimit({
      windowMs: productionConfig.rateLimit.general.windowMs,
      max: productionConfig.rateLimit.general.max,
      message: productionConfig.rateLimit.general.message,
      standardHeaders: true,
      legacyHeaders: false,
    }) as any
  );
  logger.info('✓ General rate limiting enabled (500 req/15min per IP)');
} else {
  // Development - Basic helmet only
  app.use(helmet());
}

// CORS configuration
//
// 🔴 IN PRODUCTION THIS USED TO IGNORE `CORS_ORIGIN` ENTIRELY, so adding an
//    origin was a code change and a deploy rather than a variable and a
//    restart. That cost a round trip when the web PWA went up: Google Sign-In
//    completed and the POST after it was blocked by the browser, which reads as
//    an auth bug and is not one.
//
//    `CORS_ORIGIN` is now ADDITIVE in production — the hardcoded list is the
//    floor and the variable can only extend it. It cannot narrow or replace it,
//    so a typo in the dashboard can never lock the first-party apps out.
//    Non-production behaviour is unchanged.
//    The parsing lives in utils/cors.ts so a check can invoke it — importing
//    this file would run the entire app setup.
const corsOrigin = isProduction
  ? resolveProductionCorsOrigins(productionConfig.cors.origin, process.env.CORS_ORIGIN, (m) =>
      logger.warn(m)
    )
  : process.env.CORS_ORIGIN || '*';

if (isProduction) {
  // Print the resolved list, because the failure mode is invisible from the
  // server side — a blocked request looks identical to one that was never made.
  logger.info(`✓ CORS allow-list (${(corsOrigin as string[]).length}): ${(corsOrigin as string[]).join(', ')}`);
}

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Mount all routes under /api prefix
mountRoutes(app);

// Global error handler (must be last)
app.use(errorHandler);

export default app;
