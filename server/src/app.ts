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
const corsOrigin = isProduction
  ? productionConfig.cors.origin
  : process.env.CORS_ORIGIN || '*';

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
