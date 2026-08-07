/**
 * Standalone email verification script.
 *
 * Usage:
 *   ts-node --transpile-only src/scripts/test-email.ts <recipient@example.com>
 * or via npm:
 *   npm run test:email -- <recipient@example.com>
 *
 * Reads SENDGRID_API_KEY (and optional SENDGRID_FROM_EMAIL /
 * SENDGRID_FROM_NAME) from .env. Dispatches a single verification-OTP
 * email with code 999999 and prints the result. Useful for verifying
 * SendGrid configuration without going through the full signup flow.
 */

import { config } from 'dotenv';
config();

import { sendVerificationOTP } from '../services/email.service';

async function main() {
  const recipient = process.argv[2];
  if (!recipient) {
    console.error('Usage: npm run test:email -- <recipient@example.com>');
    process.exit(1);
  }

  console.log(`Sending test OTP to ${recipient}...`);
  console.log('Env check:');
  console.log(
    '  SENDGRID_API_KEY:',
    process.env.SENDGRID_API_KEY
      ? `set (prefix: ${process.env.SENDGRID_API_KEY.substring(0, 7)})`
      : 'MISSING'
  );
  console.log(
    '  SENDGRID_FROM_EMAIL:',
    process.env.SENDGRID_FROM_EMAIL || '[default: support@revelia.me]'
  );
  console.log('  NODE_ENV:', process.env.NODE_ENV || 'development');
  console.log('');

  // Force production-mode behavior so failures throw rather than silently
  // returning false. Lets us see the SendGrid response body in errors.
  process.env.NODE_ENV = 'production';

  try {
    const sent = await sendVerificationOTP(recipient, '999999');
    if (sent) {
      console.log('✅ Email dispatch returned success. Check inbox + spam.');
      process.exit(0);
    } else {
      console.error('❌ Email dispatch returned false.');
      process.exit(1);
    }
  } catch (err: any) {
    console.error('❌ Email dispatch failed:', err.message);
    if (err.response?.body) {
      console.error('SendGrid response body:');
      console.error(JSON.stringify(err.response.body, null, 2));
    }
    process.exit(1);
  }
}

main();
