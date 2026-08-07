import { create } from 'zustand';
import {
  DailyInsightOutput,
  DailyTeaserOutput,
  WeeklyForecastOutput,
  MonthlyReadingOutput
} from '@shared/types';
import { insightsService } from '@/services/insights.service';

function extractErrorMessage(error: any, fallback: string): string {
  const body = error?.response?.data;
  if (body?.error && typeof body.error === 'object' && body.error.message) {
    return body.error.message;
  }
  if (typeof body?.error === 'string') return body.error;
  return error?.message || fallback;
}

interface InsightsState {
  dailyInsight: DailyInsightOutput | null;
  dailyTeaser: DailyTeaserOutput | null;
  weeklyForecast: WeeklyForecastOutput | null;
  monthlyReading: MonthlyReadingOutput | null;
  
  isLoadingDaily: boolean;
  isLoadingWeekly: boolean;
  isLoadingMonthly: boolean;
  error: string | null;
  
  fetchDailyInsight: () => Promise<void>;
  fetchDailyTeaser: () => Promise<void>;
  fetchWeeklyForecast: () => Promise<void>;
  fetchMonthlyReading: () => Promise<void>;
  clearError: () => void;
  clearAll: () => void;
}

export const useInsightsStore = create<InsightsState>((set) => ({
  dailyInsight: null,
  dailyTeaser: null,
  weeklyForecast: null,
  monthlyReading: null,
  isLoadingDaily: false,
  isLoadingWeekly: false,
  isLoadingMonthly: false,
  error: null,
  
  fetchDailyInsight: async () => {
    set({ isLoadingDaily: true, error: null });
    try {
      const result = await insightsService.getDailyInsight();
      set({ dailyInsight: result.insight, isLoadingDaily: false });
    } catch (error: any) {
      set({ error: extractErrorMessage(error, 'Failed to fetch daily insight'), isLoadingDaily: false });
    }
  },

  fetchDailyTeaser: async () => {
    set({ isLoadingDaily: true, error: null });
    try {
      const result = await insightsService.getDailyTeaser();
      set({ dailyTeaser: result, isLoadingDaily: false });
    } catch (error: any) {
      set({ error: extractErrorMessage(error, 'Failed to fetch daily teaser'), isLoadingDaily: false });
    }
  },

  fetchWeeklyForecast: async () => {
    set({ isLoadingWeekly: true, error: null });
    try {
      const result = await insightsService.getWeeklyForecast();
      set({ weeklyForecast: result.forecast, isLoadingWeekly: false });
    } catch (error: any) {
      set({ error: extractErrorMessage(error, 'Failed to fetch weekly forecast'), isLoadingWeekly: false });
    }
  },

  fetchMonthlyReading: async () => {
    set({ isLoadingMonthly: true, error: null });
    try {
      const result = await insightsService.getMonthlyReading();
      set({ monthlyReading: result.reading, isLoadingMonthly: false });
    } catch (error: any) {
      set({ error: extractErrorMessage(error, 'Failed to fetch monthly reading'), isLoadingMonthly: false });
    }
  },
  
  clearError: () => set({ error: null }),
  clearAll: () => set({ dailyInsight: null, dailyTeaser: null, weeklyForecast: null, monthlyReading: null, error: null })
}));

export default useInsightsStore;
