import { create } from 'zustand';
import { UserProfile, AstrologyProfile, NumerologyProfile, BirthDataInput } from '@shared/types';
import { profileService } from '../lib/profileService';
import { useInsightsStore } from './insightsStore';
import { mapServerChart } from '../lib/astrology/chartGenerator';

interface ProfileState {
  profile: UserProfile | null;
  astrology: AstrologyProfile | null;
  numerology: NumerologyProfile | null;
  birthChart: any | null;
  isLoadingBirthChart: boolean;
  birthChartError: string | null;
  isLoading: boolean;
  error: string | null;
  // True only after a fetchProfile() call returns a DEFINITIVE answer:
  // either 200 with profile data, or 404 (server says no profile yet).
  // Network/5xx errors keep this false so app/index.tsx will not mistake
  // "fetch failed" for "user has no birth data" and bounce a returning
  // user into onboarding on a flaky Android resume.
  lastFetchOk: boolean;

  // Actions
  fetchProfile: () => Promise<void>;
  setBirthData: (birthData: BirthDataInput) => Promise<any>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  fetchAstrology: () => Promise<void>;
  fetchNumerology: () => Promise<void>;
  fetchBirthChart: () => Promise<void>;
  generateBirthChart: () => Promise<void>;
  clearProfile: () => void;
  clearError: () => void;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,
  astrology: null,
  numerology: null,
  birthChart: null,
  isLoadingBirthChart: false,
  birthChartError: null,
  isLoading: false,
  error: null,
  lastFetchOk: false,

  fetchProfile: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await profileService.getProfile();
      set({ profile: response.data, isLoading: false, lastFetchOk: true });
    } catch (error: any) {
      // If 404, profile doesn't exist yet - not an error, and it's a
      // DEFINITIVE answer from the server, so lastFetchOk = true.
      if (error.response?.status === 404) {
        set({ profile: null, isLoading: false, lastFetchOk: true });
      } else {
        // Network blip, 5xx, etc — NOT definitive. Leave lastFetchOk false
        // so the router-level rehydration gate keeps showing splash instead
        // of dumping an authenticated user into birth-data onboarding.
        set({ error: error.response?.data?.error || 'Failed to fetch profile', isLoading: false });
      }
    }
  },
  
  setBirthData: async (birthData: BirthDataInput) => {
    set({ isLoading: true, error: null });
    try {
      const response = await profileService.setBirthData(birthData);
      const { profile, calculated } = response.data;
      
      set({
        profile,
        astrology: {
          sunSign: calculated.sunSign,
          sunSignTraits: calculated.sunSignTraits
        },
        numerology: {
          lifePathNumber: calculated.lifePathNumber,
          lifePathMeaning: calculated.lifePathMeaning,
          personalYear: calculated.personalYear,
          personalYearMeaning: calculated.personalYearMeaning,
          personalMonth: calculated.personalMonth,
          personalMonthMeaning: calculated.personalMonthMeaning
        },
        isLoading: false
      });

      // Clear cached insights so they regenerate with new birth data
      useInsightsStore.getState().clearAll();

      return calculated; // Return for sun sign reveal
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to save birth data';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },
  
  updateProfile: async (updates) => {
    set({ isLoading: true, error: null });
    try {
      const response = await profileService.updateProfile(updates);
      set({ profile: response.data, isLoading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to update profile', isLoading: false });
      throw error;
    }
  },
  
  fetchAstrology: async () => {
    try {
      const response = await profileService.getAstrology();
      set({ astrology: response.data });
    } catch (error) {
      console.error('Failed to fetch astrology:', error);
    }
  },
  
  fetchNumerology: async () => {
    try {
      const response = await profileService.getNumerology();
      set({ numerology: response.data });
    } catch (error) {
      console.error('Failed to fetch numerology:', error);
    }
  },
  
  fetchBirthChart: async () => {
    // If we already have a chart in memory, nothing to do.
    const { birthChart, profile } = get();
    if (birthChart) return;
    if (!profile?.birthData?.date) {
      set({ isLoadingBirthChart: false });
      return;
    }
    // Build 27 R1: fetch the real Swiss Ephemeris chart from the server
    // (computes + persists on the server if it doesn't exist yet).
    try {
      set({ isLoadingBirthChart: true });
      const response = await profileService.getBirthChart();
      const natal = response.data?.natalChart;
      if (natal) {
        const chart = mapServerChart(natal, profile.sunSign);
        set({ birthChart: chart, isLoadingBirthChart: false, birthChartError: null });
      } else {
        // 200 but no chart (e.g. compute couldn't run) — leave error unset so
        // the hub shows the neutral lock/prompt card rather than a scary error.
        set({ isLoadingBirthChart: false });
      }
    } catch (error: any) {
      // Network/5xx — surface an error so the retry button (POST) is available.
      console.error('Failed to fetch birth chart:', error);
      const msg = error.response?.data?.error || 'Could not load your birth chart';
      set({ isLoadingBirthChart: false, birthChartError: msg });
    }
  },

  generateBirthChart: async () => {
    set({ isLoadingBirthChart: true, birthChartError: null });
    try {
      const profile = get().profile;
      if (!profile?.birthData?.date) {
        throw new Error('No birth date available');
      }

      const response = await profileService.generateBirthChart();
      const natal = response.data?.natalChart;
      if (!natal) {
        throw new Error('Chart generation failed');
      }
      const chart = mapServerChart(natal, profile.sunSign);
      set({ birthChart: chart, isLoadingBirthChart: false, birthChartError: null });
    } catch (error: any) {
      console.error('Failed to generate birth chart:', error);
      const msg = error.response?.data?.error || error.message || 'Chart generation failed';
      set({ isLoadingBirthChart: false, birthChartError: msg });
      throw error;
    }
  },

  clearProfile: () => set({ profile: null, astrology: null, numerology: null, birthChart: null, birthChartError: null, error: null, lastFetchOk: false }),
  clearError: () => set({ error: null })
}));

export default useProfileStore;
