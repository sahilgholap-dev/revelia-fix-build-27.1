import { api } from '../lib/api';

export interface SubscriptionStatus {
  tier: 'free' | 'premium' | 'premium_plus';
  isActive: boolean;
  expiresAt: string | null;
  revenueCatId?: string;
}

export const subscriptionService = {
  async getStatus(): Promise<SubscriptionStatus> {
    const { data } = await api.get('/subscription/status');
    return data.data;
  },
  
  async syncSubscription() {
    await api.post('/subscription/sync');
  },
  
  async linkRevenueCatUser(userId: string) {
    await api.post('/subscription/link', { revenueCatAppUserId: userId });
  }
};
