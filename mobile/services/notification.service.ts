import { api } from '../lib/api';
import { NotificationPreferences } from '@shared/types';

export const notificationService = {
  // Register device for push notifications
  async registerDevice(oneSignalPlayerId: string, platform: 'ios' | 'android'): Promise<void> {
    await api.post('/notifications/register', { oneSignalPlayerId, platform });
  },
  
  // Get notification preferences
  async getPreferences(): Promise<NotificationPreferences> {
    const response = await api.get('/notifications/preferences');
    return response.data;
  },
  
  // Update notification preferences
  async updatePreferences(prefs: Partial<NotificationPreferences>): Promise<void> {
    await api.patch('/notifications/preferences', prefs);
  },
  
  // Send test notification
  async sendTestNotification(): Promise<void> {
    await api.post('/notifications/test');
  }
};
