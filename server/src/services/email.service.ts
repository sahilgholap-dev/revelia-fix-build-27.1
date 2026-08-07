import sgMail from '@sendgrid/mail';
import { logger } from '../utils/logger';

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'support@revelia.me';
const FROM_NAME = process.env.SENDGRID_FROM_NAME || 'Revelia';

// Initialize SendGrid if API key is available
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  /**
   * Optional PER-SEND SendGrid tracking override (camelCase, @sendgrid/mail).
   * Omitted on OTP/welcome/reset sends → no `trackingSettings` key → SendGrid
   * uses the account default (unchanged, byte-identical payload). Set it ONLY on
   * transactional sends that carry a signed/one-time URL (the report-ready email)
   * so click/open tracking does NOT rewrite the link — see sendReportEmail.
   */
  trackingSettings?: {
    clickTracking?: { enable?: boolean; enableText?: boolean };
    openTracking?: { enable?: boolean; substitutionTag?: string };
  };
}

/**
 * Send email via SendGrid.
 *
 * Build 22 changes:
 *  - Structured pre-flight log (email_otp_attempt) with API key prefix
 *    and from-email so Railway logs answer "what config was in use?"
 *  - Success log includes statusCode + x-message-id (SendGrid's
 *    confirmation header) for chain-of-custody.
 *  - In production, throws on dispatch failure instead of silently
 *    returning false — caller surfaces 503 to mobile and the legacy
 *    "log OTP to console" fallback (genuine security concern: OTPs in
 *    cloud logs) is no longer reachable in prod.
 *  - In non-production, returns false on missing API key so local
 *    development continues to work via the controller's dev fallback.
 */
async function sendEmail(options: EmailOptions): Promise<boolean> {
  const isProd = process.env.NODE_ENV === 'production';

  logger.info('email_otp_attempt', {
    to: options.to,
    subject: options.subject,
    hasApiKey: !!process.env.SENDGRID_API_KEY,
    apiKeyPrefix: process.env.SENDGRID_API_KEY?.substring(0, 7),
    fromEmail: FROM_EMAIL,
    nodeEnv: process.env.NODE_ENV,
  });

  if (!process.env.SENDGRID_API_KEY) {
    logger.warn('email_sendgrid_not_configured', {
      to: options.to,
      subject: options.subject,
    });
    if (isProd) {
      // In production, missing key is a deployment error — surface it.
      throw new Error('Email service not configured (SENDGRID_API_KEY missing)');
    }
    return false;
  }

  try {
    const response = await sgMail.send({
      to: options.to,
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''),
      // PER-SEND tracking override — only present when the caller sets it
      // (report-ready email). Omitted otherwise → account default, unchanged.
      ...(options.trackingSettings ? { trackingSettings: options.trackingSettings } : {}),
    });
    logger.info('email_otp_sent', {
      to: options.to,
      subject: options.subject,
      statusCode: response[0]?.statusCode,
      messageId: response[0]?.headers?.['x-message-id'],
    });
    return true;
  } catch (error: any) {
    logger.error('email_otp_failed', {
      to: options.to,
      subject: options.subject,
      errorCode: error.code,
      errorMessage: error.message,
      sendGridResponse: error.response?.body,
    });
    if (isProd) {
      // Propagate so the API returns an error to mobile rather than the
      // user seeing "code sent" with nothing in their inbox.
      throw error;
    }
    return false;
  }
}

export async function sendVerificationOTP(to: string, otp: string): Promise<boolean> {
  return sendEmail({
    to,
    subject: 'Verify your Revelia account',
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #1a1a2e; color: #ffffff; padding: 40px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #FFD700; font-size: 28px; margin: 0;">Revelia</h1>
          <p style="color: #b0b0b0; font-size: 14px; margin-top: 4px;">Your face. Your palm. Your future.</p>
        </div>
        <div style="background-color: #16213e; border-radius: 8px; padding: 30px; text-align: center;">
          <h2 style="color: #ffffff; font-size: 20px; margin-top: 0;">Verify Your Email</h2>
          <p style="color: #cccccc; font-size: 15px; line-height: 1.6;">Enter this code in the app to verify your email address and complete your registration:</p>
          <div style="background-color: #0f3460; border: 2px solid #FFD700; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #FFD700;">${otp}</span>
          </div>
          <p style="color: #999999; font-size: 13px;">This code expires in <strong>10 minutes</strong>.</p>
          <p style="color: #999999; font-size: 13px;">If you didn't request this, you can safely ignore this email.</p>
        </div>
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #333;">
          <p style="color: #666666; font-size: 12px;">&copy; ${new Date().getFullYear()} Revelia by Nexxence LLC. All rights reserved.</p>
          <p style="color: #666666; font-size: 12px;">Readings are for entertainment and self-reflection purposes only.</p>
        </div>
      </div>
    `,
  });
}

/**
 * R9 §14 step 8 (D5) — the report-ready notification email.
 *
 * ⚠️ ONE-TIME NOTIFICATION, LINK NOT ATTACHMENT. Per the DELIVERY MODEL: this is
 * sent ONCE when a report reaches `ready` and carries a presigned URL at a ≤7-day
 * TTL (the first-week convenience). The APP is the durable path (GET /api/reports/:id
 * re-signs a fresh link on every view, day 1–59), so the 7-day email cap is
 * deliberate + fine. Do NOT attach the 20–24pp PDF; do NOT re-email on a schedule.
 *
 * ⚠️ EMAIL COPY IS A BUILD/CONTENT TASK (like R7 D6) — this is a reasonable
 * default. The final subject/body copy may be owner/Sid-refined; no legal or
 * marketing claims are invented here.
 *
 * Mirrors `sendWelcomeEmail` (best-effort boolean; the caller does NOT fail the
 * report if this returns false / throws).
 */
export async function sendReportEmail(
  to: string,
  secureLink: string,
  opts: { name?: string; headline?: string } = {}
): Promise<boolean> {
  const greeting = opts.name ? `, ${opts.name}` : '';
  const headline = opts.headline || 'Your Personalized Cosmic Report';
  return sendEmail({
    to,
    subject: 'Your Personalized Cosmic Report is ready',
    // ⚠️ PERMANENT GOTCHA — tracking OFF for THIS send. SendGrid click/open
    // tracking rewrites <a href> to a `url*.revelia.me/ls/click?...` redirect;
    // that subdomain is NXDOMAIN AND the rewrite corrupts the R2 presigned URL's
    // query-string signature. Disabling click+open tracking PER-SEND delivers the
    // raw `...r2.cloudflarestorage.com/...` presigned link verbatim so it opens
    // the PDF. This is a per-send override — NOT a reliance on the global config.
    trackingSettings: {
      clickTracking: { enable: false, enableText: false },
      openTracking: { enable: false },
    },
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #1a1a2e; color: #ffffff; padding: 40px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #FFD700; font-size: 28px; margin: 0;">Revelia</h1>
          <p style="color: #b0b0b0; font-size: 14px; margin-top: 4px;">Your face. Your palm. Your future.</p>
        </div>
        <div style="background-color: #16213e; border-radius: 8px; padding: 30px;">
          <h2 style="color: #ffffff; font-size: 20px; margin-top: 0;">Your report is ready${greeting}</h2>
          <p style="color: #cccccc; font-size: 15px; line-height: 1.6;">${headline} has finished generating. Tap below to open and download your PDF:</p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${secureLink}" style="display: inline-block; background-color: #0f3460; border: 2px solid #FFD700; border-radius: 8px; padding: 14px 28px; color: #FFD700; font-size: 16px; font-weight: bold; text-decoration: none;">Open your report</a>
          </div>
          <p style="color: #999999; font-size: 13px; line-height: 1.6;">This link expires in about 7 days. After that, just open the report any time from the Revelia app &mdash; it stays available there.</p>
        </div>
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #333;">
          <p style="color: #666666; font-size: 12px;">&copy; ${new Date().getFullYear()} Revelia by Nexxence LLC. All rights reserved.</p>
          <p style="color: #666666; font-size: 12px;">Readings are for entertainment and self-reflection purposes only.</p>
        </div>
      </div>
    `,
  });
}

export async function sendPasswordResetOTP(to: string, otp: string): Promise<boolean> {
  return sendEmail({
    to,
    subject: 'Reset your Revelia password',
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #1a1a2e; color: #ffffff; padding: 40px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #FFD700; font-size: 28px; margin: 0;">Revelia</h1>
          <p style="color: #b0b0b0; font-size: 14px; margin-top: 4px;">Your face. Your palm. Your future.</p>
        </div>
        <div style="background-color: #16213e; border-radius: 8px; padding: 30px; text-align: center;">
          <h2 style="color: #ffffff; font-size: 20px; margin-top: 0;">Password Reset</h2>
          <p style="color: #cccccc; font-size: 15px; line-height: 1.6;">We received a request to reset your password. Use this code to proceed:</p>
          <div style="background-color: #0f3460; border: 2px solid #FFD700; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #FFD700;">${otp}</span>
          </div>
          <p style="color: #999999; font-size: 13px;">This code expires in <strong>10 minutes</strong>.</p>
          <p style="color: #999999; font-size: 13px;">If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
        </div>
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #333;">
          <p style="color: #666666; font-size: 12px;">&copy; ${new Date().getFullYear()} Revelia by Nexxence LLC. All rights reserved.</p>
        </div>
      </div>
    `,
  });
}

export async function sendWelcomeEmail(to: string, name: string): Promise<boolean> {
  return sendEmail({
    to,
    subject: 'Welcome to Revelia',
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #1a1a2e; color: #ffffff; padding: 40px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #FFD700; font-size: 28px; margin: 0;">Revelia</h1>
          <p style="color: #b0b0b0; font-size: 14px; margin-top: 4px;">Your face. Your palm. Your future.</p>
        </div>
        <div style="background-color: #16213e; border-radius: 8px; padding: 30px;">
          <h2 style="color: #ffffff; font-size: 20px; margin-top: 0;">Welcome, ${name}!</h2>
          <p style="color: #cccccc; font-size: 15px; line-height: 1.6;">Your cosmic journey begins now. Here's what you can explore:</p>
          <div style="margin: 20px 0;">
            <div style="padding: 12px 0; border-bottom: 1px solid #333;">
              <span style="color: #ffffff;">Face Reading</span> &mdash; <span style="color: #b0b0b0;">Discover personality traits written in your features</span>
            </div>
            <div style="padding: 12px 0; border-bottom: 1px solid #333;">
              <span style="color: #ffffff;">Palm Reading</span> &mdash; <span style="color: #b0b0b0;">Uncover your destiny through your palm lines</span>
            </div>
            <div style="padding: 12px 0; border-bottom: 1px solid #333;">
              <span style="color: #ffffff;">Astrology</span> &mdash; <span style="color: #b0b0b0;">Your birth chart and cosmic guidance</span>
            </div>
            <div style="padding: 12px 0; border-bottom: 1px solid #333;">
              <span style="color: #ffffff;">Numerology</span> &mdash; <span style="color: #b0b0b0;">Life path and destiny numbers decoded</span>
            </div>
            <div style="padding: 12px 0;">
              <span style="color: #ffffff;">Compatibility</span> &mdash; <span style="color: #b0b0b0;">Discover your cosmic connection with others</span>
            </div>
          </div>
          <p style="color: #cccccc; font-size: 15px; line-height: 1.6;">Start by taking a face selfie and a palm photo &mdash; your personalized reading awaits!</p>
          <div style="text-align: center; margin-top: 24px;">
            <p style="color: #FFD700; font-size: 16px; font-style: italic;">"The stars incline, they do not compel."</p>
          </div>
        </div>
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #333;">
          <p style="color: #666666; font-size: 12px;">&copy; ${new Date().getFullYear()} Revelia by Nexxence LLC. All rights reserved.</p>
          <p style="color: #666666; font-size: 12px;">Readings are for entertainment and self-reflection purposes only.</p>
        </div>
      </div>
    `,
  });
}
