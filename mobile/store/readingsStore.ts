import { create } from 'zustand';
import { FaceReadingOutput, PalmReadingOutput } from '@shared/types';
import { readingsService } from '@/services/readings.service';

interface ReadingsState {
  faceReading: FaceReadingOutput | null;
  palmReadingDominant: PalmReadingOutput | null;
  palmReadingNonDominant: PalmReadingOutput | null;
  combinedProfile: object | null;

  isLoadingFace: boolean;
  isLoadingPalm: boolean;
  error: string | null;
  errorCode: string | null;
  debugRef: string | null;

  fetchFaceReading: () => Promise<void>;
  generateFaceReading: () => Promise<void>;
  fetchPalmReading: (hand: 'dominant' | 'non-dominant') => Promise<void>;
  generatePalmReading: (hand: 'dominant' | 'non-dominant') => Promise<void>;
  clearError: () => void;
}

interface ParsedErr {
  message: string;
  code: string | null;
  debugRef: string | null;
}

function parseErr(error: any, fallback: string): ParsedErr {
  const body = error?.response?.data;
  // New structured shape: { success:false, error: { code, message, debugRef? } }
  if (body?.error && typeof body.error === 'object') {
    return {
      message: body.error.message || fallback,
      code: body.error.code || null,
      debugRef: body.error.debugRef || null,
    };
  }
  // Legacy shape: { success:false, error: 'string' }
  if (typeof body?.error === 'string') {
    return { message: body.error, code: null, debugRef: null };
  }
  return { message: error?.message || fallback, code: null, debugRef: null };
}

export const useReadingsStore = create<ReadingsState>((set) => ({
  faceReading: null,
  palmReadingDominant: null,
  palmReadingNonDominant: null,
  combinedProfile: null,
  isLoadingFace: false,
  isLoadingPalm: false,
  error: null,
  errorCode: null,
  debugRef: null,

  fetchFaceReading: async () => {
    set({ isLoadingFace: true, error: null, errorCode: null, debugRef: null });
    try {
      const response = await readingsService.getFaceReading();
      set({ faceReading: response.reading, isLoadingFace: false });
    } catch (error: any) {
      const e = parseErr(error, 'Failed to fetch face reading');
      set({ error: e.message, errorCode: e.code, debugRef: e.debugRef, isLoadingFace: false });
    }
  },

  generateFaceReading: async () => {
    set({ isLoadingFace: true, error: null, errorCode: null, debugRef: null });
    try {
      const response = await readingsService.generateFaceReading();
      set({ faceReading: response.reading, isLoadingFace: false });
    } catch (error: any) {
      const e = parseErr(error, 'Failed to generate face reading');
      set({ error: e.message, errorCode: e.code, debugRef: e.debugRef, isLoadingFace: false });
    }
  },

  fetchPalmReading: async (hand) => {
    set({ isLoadingPalm: true, error: null, errorCode: null, debugRef: null });
    try {
      const response = await readingsService.getPalmReading(hand);
      if (hand === 'dominant') {
        set({ palmReadingDominant: response.reading, isLoadingPalm: false });
      } else {
        set({ palmReadingNonDominant: response.reading, isLoadingPalm: false });
      }
    } catch (error: any) {
      const e = parseErr(error, 'Failed to fetch palm reading');
      set({ error: e.message, errorCode: e.code, debugRef: e.debugRef, isLoadingPalm: false });
    }
  },

  generatePalmReading: async (hand) => {
    set({ isLoadingPalm: true, error: null, errorCode: null, debugRef: null });
    try {
      const response = await readingsService.generatePalmReading(hand);
      if (hand === 'dominant') {
        set({ palmReadingDominant: response.reading, isLoadingPalm: false });
      } else {
        set({ palmReadingNonDominant: response.reading, isLoadingPalm: false });
      }
    } catch (error: any) {
      const e = parseErr(error, 'Failed to generate palm reading');
      set({ error: e.message, errorCode: e.code, debugRef: e.debugRef, isLoadingPalm: false });
    }
  },

  clearError: () => set({ error: null, errorCode: null, debugRef: null }),
}));

export default useReadingsStore;
