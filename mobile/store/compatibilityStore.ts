import { create } from 'zustand';
import { CompatibilityReading } from '@shared/types';
import { compatibilityService } from '../services/compatibility.service';
import { router } from 'expo-router';

interface CompatibilityState {
  // Flow state
  partnerName: string;
  partnerBirthDate: string | null;
  partnerBirthTime: string | null;
  partnerBirthPlace: string | null;
  partnerImageUri: string | null;
  partnerImageUrl: string | null;
  relationshipType: string;  // 'love' | 'business' | 'parent_child' | 'friend'
  relationshipSubType: string | null;

  // Readings
  readings: CompatibilityReading[];
  currentReading: CompatibilityReading | null;
  
  // Loading states
  isUploading: boolean;
  isGenerating: boolean;
  isLoadingReadings: boolean;
  error: string | null;
  
  // Actions
  setPartnerInfo: (name: string, birthDate?: string, birthTime?: string, birthPlace?: string) => void;
  setRelationshipType: (type: string) => void;
  setRelationshipSubType: (subType: string | null) => void;
  setPartnerImage: (uri: string) => void;
  uploadPartnerImage: () => Promise<void>;
  generateReading: () => Promise<void>;
  fetchReadings: () => Promise<void>;
  deleteReading: (id: string) => Promise<void>;
  resetFlow: () => void;
  clearError: () => void;
}

export const useCompatibilityStore = create<CompatibilityState>((set, get) => ({
  // Initial state
  partnerName: '',
  partnerBirthDate: null,
  partnerBirthTime: null,
  partnerBirthPlace: null,
  partnerImageUri: null,
  partnerImageUrl: null,
  relationshipType: 'love',
  relationshipSubType: null,
  readings: [],
  currentReading: null,
  isUploading: false,
  isGenerating: false,
  isLoadingReadings: false,
  error: null,
  
  setPartnerInfo: (name, birthDate, birthTime, birthPlace) => {
    set({ partnerName: name, partnerBirthDate: birthDate || null, partnerBirthTime: birthTime || null, partnerBirthPlace: birthPlace || null });
  },

  setRelationshipType: (type) => {
    set({ relationshipType: type, relationshipSubType: null });
  },

  setRelationshipSubType: (subType) => {
    set({ relationshipSubType: subType });
  },
  
  setPartnerImage: (uri) => {
    set({ partnerImageUri: uri });
  },
  
  uploadPartnerImage: async () => {
    const { partnerImageUri } = get();
    if (!partnerImageUri) {
      throw new Error('No partner image selected');
    }
    
    set({ isUploading: true, error: null });
    try {
      const result = await compatibilityService.uploadPartnerImage(partnerImageUri);
      set({ partnerImageUrl: result.url, isUploading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Failed to upload partner image', isUploading: false });
      throw error;
    }
  },
  
  generateReading: async () => {
    const { partnerName, partnerImageUrl, partnerBirthDate, partnerBirthTime, partnerBirthPlace, relationshipType, relationshipSubType } = get();

    if (!partnerName || !partnerImageUrl) {
      throw new Error('Partner name and image are required');
    }

    set({ isGenerating: true, error: null });
    try {
      const reading = await compatibilityService.generateCompatibility(
        partnerName,
        partnerImageUrl,
        partnerBirthDate || undefined,
        partnerBirthTime || undefined,
        partnerBirthPlace || undefined,
        relationshipType,
        relationshipSubType || undefined
      );
      
      set({ 
        currentReading: reading, 
        isGenerating: false,
        readings: [reading, ...get().readings]
      });
      
      // Navigate to results
      router.push(`/(main)/compatibility/${reading._id}` as any);
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Failed to generate compatibility reading';
      set({ error: errorMsg, isGenerating: false });
      throw error;
    }
  },
  
  fetchReadings: async () => {
    set({ isLoadingReadings: true, error: null });
    try {
      const readings = await compatibilityService.getCompatibilityReadings();
      set({ readings, isLoadingReadings: false });
    } catch (error: any) {
      set({ isLoadingReadings: false });
      throw error;
    }
  },
  
  deleteReading: async (id) => {
    try {
      await compatibilityService.deleteCompatibility(id);
      set({ readings: get().readings.filter(r => r._id !== id) });
    } catch (error) {
      throw error;
    }
  },
  
  resetFlow: () => {
    set({
      partnerName: '',
      partnerBirthDate: null,
      partnerBirthTime: null,
      partnerBirthPlace: null,
      partnerImageUri: null,
      partnerImageUrl: null,
      relationshipType: 'love',
      relationshipSubType: null,
      currentReading: null,
      error: null
    });
  },
  
  clearError: () => set({ error: null })
}));
