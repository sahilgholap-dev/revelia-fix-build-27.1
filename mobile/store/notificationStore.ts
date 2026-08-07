import { create } from 'zustand';
import { NotificationPreferences } from '@shared/types';
import { notificationService } from '../services/notification.service';

interface NotificationState {
  preferences: NotificationPreferences | null;
  isLoading: boolean;
  
  fetchPreferences: () => Promise<void>;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  preferences: null,
  isLoading: false,
  
  fetchPreferences: async () => {
    set({ isLoading: true });
    try {
      const prefs = await notificationService.getPreferences();
      set({ preferences: prefs, isLoading: false });
    } catch (error) {
      console.error('Fetch preferences error:', error);
      set({ isLoading: false });
    }
  },
  
  updatePreferences: async (updates) => {
    try {
      await notificationService.updatePreferences(updates);
      const currentPrefs = get().preferences;
      set({ preferences: { ...currentPrefs, ...updates } as NotificationPreferences });
    } catch (error) {
      console.error('Update preferences error:', error);
      throw error;
    }
  }
}));
