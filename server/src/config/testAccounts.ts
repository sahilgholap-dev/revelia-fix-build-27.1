import { SubscriptionTier } from '../types/shared';

/**
 * Test accounts that get auto-assigned premium tiers
 */
export const PREMIUM_TEST_ACCOUNTS: Record<string, string[]> = {
  premium: [
    'coolsidds19@gmail.com',
    'aniextc@gmail.com',
  ],
  premium_plus: [
    'getsidrao@gmail.com',
    'anirudh.chauhan@mastertech.co.in',
    'mairaj.poke@mastertech.co.in',
  ],
};

/**
 * Get the test account tier for a given email
 * Returns null if the email is not a test account
 */
export const getTestAccountTier = (email: string): SubscriptionTier | null => {
  const normalizedEmail = email.toLowerCase().trim();

  if (PREMIUM_TEST_ACCOUNTS.premium_plus.includes(normalizedEmail)) {
    return 'premium_plus';
  }
  if (PREMIUM_TEST_ACCOUNTS.premium.includes(normalizedEmail)) {
    return 'premium';
  }
  return null;
};
