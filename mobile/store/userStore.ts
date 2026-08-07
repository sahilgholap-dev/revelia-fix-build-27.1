import { create } from 'zustand';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  tier: 'free' | 'premium' | 'ultimate';
  birthDate?: string;
  birthTime?: string;
  birthPlace?: string;
  phoneNumber?: string;
  avatar?: string;
  preferences?: {
    notifications: boolean;
    darkMode: boolean;
    language: string;
  };
  stats?: {
    totalReadings: number;
    faceReadings: number;
    palmReadings: number;
    astrologyReadings: number;
    numerologyReadings: number;
  };
}

interface UserState {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setProfile: (profile: UserProfile | null) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  clearProfile: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useUserStore = create<UserState>((set) => ({
  profile: null,
  isLoading: false,
  error: null,

  setProfile: (profile: UserProfile | null) => {
    set({ profile, error: null });
  },

  updateProfile: (updates: Partial<UserProfile>) => {
    set((state) => ({
      profile: state.profile ? { ...state.profile, ...updates } : null,
    }));
  },

  clearProfile: () => {
    set({ profile: null, error: null });
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  setError: (error: string | null) => {
    set({ error });
  },
}));

export default useUserStore;
