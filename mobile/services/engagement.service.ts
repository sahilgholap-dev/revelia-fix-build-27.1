import { api } from '../lib/api';
import { StreakData, EngagementCheckIn } from '@shared/types';

export const engagementService = {
  // Daily check-in
  async checkIn(): Promise<EngagementCheckIn> {
    const response = await api.post('/engagement/checkin');
    return response.data;
  },
  
  // Get streak data
  async getStreak(): Promise<StreakData> {
    const response = await api.get('/engagement/streak');
    return response.data;
  }
};
