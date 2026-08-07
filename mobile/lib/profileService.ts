import { api } from './api';
import { UserProfile, BirthDataInput, AstrologyProfile, NumerologyProfile } from '@shared/types';

export const profileService = {
  // Create profile with birth data
  createProfile: async (data: {
    name: string;
    birthData: BirthDataInput;
  }) => api.post('/profile', data),
  
  // Get profile
  getProfile: async () => api.get('/profile'),
  
  // Update profile
  updateProfile: async (updates: Partial<UserProfile>) => 
    api.patch('/profile', updates),
  
  // Set birth data (triggers astrology/numerology calculation)
  setBirthData: async (birthData: BirthDataInput) =>
    api.post('/profile/birth-data', {
      birthDate: birthData.date,
      birthTime: birthData.time,
      birthLocation: birthData.location,
      handedness: birthData.handedness
    }),
  
  // Get astrology
  getAstrology: async () => api.get('/profile/astrology'),
  
  // Get numerology
  getNumerology: async () => api.get('/profile/numerology'),

  // Get the real Swiss Ephemeris natal chart (computed server-side, Build 27 R1).
  // Returns { success, data: { natalChart, hasBirthTime, hasBirthLocation, timeIsAssumed } }.
  getBirthChart: async () => api.get('/astrology/birth-chart'),

  // Force-(re)compute the natal chart server-side.
  generateBirthChart: async (forceRegenerate = false) =>
    api.post('/astrology/birth-chart', { forceRegenerate }),

  // Delete profile
  deleteProfile: async () => api.delete('/profile')
};

export default profileService;
