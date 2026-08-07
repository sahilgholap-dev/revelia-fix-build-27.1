import { create } from 'zustand';
import { StreakData } from '@shared/types';
import { engagementService } from '../services/engagement.service';

interface EngagementState {
  streakData: StreakData | null;
  isLoading: boolean;
  hasCheckedInToday: boolean;
  
  checkIn: () => Promise<void>;
  fetchStreak: () => Promise<void>;
}

export const useEngagementStore = create<EngagementState>((set, get) => ({
  streakData: null,
  isLoading: false,
  hasCheckedInToday: false,
  
  checkIn: async () => {
    set({ isLoading: true });
    try {
      const result = await engagementService.checkIn();
      
      if (result.alreadyCheckedIn) {
        set({ hasCheckedInToday: true, isLoading: false });
      } else {
        // Update streak data
        const streakData = await engagementService.getStreak();
        set({ 
          streakData, 
          hasCheckedInToday: true, 
          isLoading: false 
        });
        
        // Show celebration if new record
        if (result.isNewRecord) {
          console.log('🎉 New personal record!');
        }
      }
    } catch (error) {
      console.error('Check-in error:', error);
      set({ isLoading: false });
    }
  },
  
  fetchStreak: async () => {
    try {
      const streakData = await engagementService.getStreak();
      set({ streakData });
    } catch (error) {
      console.error('Fetch streak error:', error);
    }
  }
}));
