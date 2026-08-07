import { z } from 'zod';

/**
 * Environment variables schema
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  MONGODB_URI: z.string(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters in production'),
  ANTHROPIC_API_KEY: z.string().optional(),
  CORS_ORIGIN: z.string().optional(),
  // Cloudflare R2 (Image Storage)
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().default('revelia-images'),
  R2_PUBLIC_URL: z.string().optional(),
  // OneSignal (Push Notifications)
  ONESIGNAL_APP_ID: z.string().optional(),
  ONESIGNAL_REST_API_KEY: z.string().optional(),
  // Internal API (for cron job triggers)
  INTERNAL_API_KEY: z.string().optional(),
  // RevenueCat (Subscription Management)
  REVENUECAT_API_KEY: z.string().optional(),
  REVENUECAT_WEBHOOK_SECRET: z.string().optional(),
  REVENUECAT_WEBHOOK_AUTH: z.string().optional(),
  // SendGrid (Transactional Email)
  SENDGRID_API_KEY: z.string().optional(),
});

/**
 * Validate and parse environment variables
 */
const parseEnv = () => {
  const result = envSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    MONGODB_URI: process.env.MONGODB_URI,
    JWT_SECRET: process.env.JWT_SECRET,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    CORS_ORIGIN: process.env.CORS_ORIGIN,
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
    R2_PUBLIC_URL: process.env.R2_PUBLIC_URL,
    ONESIGNAL_APP_ID: process.env.ONESIGNAL_APP_ID,
    ONESIGNAL_REST_API_KEY: process.env.ONESIGNAL_REST_API_KEY,
    INTERNAL_API_KEY: process.env.INTERNAL_API_KEY,
    REVENUECAT_API_KEY: process.env.REVENUECAT_API_KEY,
    REVENUECAT_WEBHOOK_SECRET: process.env.REVENUECAT_WEBHOOK_SECRET,
    REVENUECAT_WEBHOOK_AUTH: process.env.REVENUECAT_WEBHOOK_AUTH,
    SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
  });

  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(result.error.format());
    throw new Error('Environment validation failed');
  }

  const env = result.data;
  const isProduction = env.NODE_ENV === 'production';

  // Production warnings for missing optional services
  if (isProduction) {
    console.log('\n🔍 Production Environment Check:');
    
    if (!env.ANTHROPIC_API_KEY) {
      console.warn('⚠️  WARNING: ANTHROPIC_API_KEY not set - reading generation will fail');
    } else {
      console.log('✓ Claude API configured');
    }

    if (!env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
      console.warn('⚠️  WARNING: R2 credentials not set - image upload will fail');
    } else {
      console.log('✓ Cloudflare R2 configured');
    }

    if (!env.REVENUECAT_API_KEY) {
      console.warn('⚠️  WARNING: REVENUECAT_API_KEY not set - subscription verification will fail');
    } else {
      console.log('✓ RevenueCat configured');
    }

    if (!env.ONESIGNAL_APP_ID || !env.ONESIGNAL_REST_API_KEY) {
      console.warn('⚠️  WARNING: OneSignal credentials not set - push notifications will fail');
    } else {
      console.log('✓ OneSignal configured');
    }

    if (!env.INTERNAL_API_KEY) {
      console.warn('⚠️  WARNING: INTERNAL_API_KEY not set - cron jobs will fail');
    } else {
      console.log('✓ Internal API key configured');
    }

    if (!env.SENDGRID_API_KEY) {
      console.warn('⚠️  WARNING: SENDGRID_API_KEY not set - emails will fall back to console.log');
    } else {
      console.log('✓ SendGrid configured');
    }

    console.log('');
  }

  return env;
};

/**
 * Validated environment variables
 */
export const env = parseEnv();

/**
 * Type for environment variables
 */
export type Env = z.infer<typeof envSchema>;
