import { PREMIUM_TEST_ACCOUNTS, getTestAccountTier } from '../config/testAccounts';
import { User } from '../models/User';
import { logger } from '../utils/logger';

/**
 * Update existing test accounts with their assigned premium tiers.
 * Called on server startup to ensure test accounts always have correct tiers.
 */
export const updateExistingTestAccounts = async () => {
  const allTestEmails = [
    ...PREMIUM_TEST_ACCOUNTS.premium,
    ...PREMIUM_TEST_ACCOUNTS.premium_plus,
  ];

  for (const email of allTestEmails) {
    const tier = getTestAccountTier(email);
    if (!tier) continue;

    const result = await User.findOneAndUpdate(
      { email: email.toLowerCase() },
      {
        $set: {
          'subscription.tier': tier,
          'subscription.expiresAt': new Date('2099-12-31'),
          'subscription.isTestAccount': true,
        },
      }
    );

    if (result) {
      logger.info(`Test account updated: ${email} → ${tier}`);
    }
  }
};
