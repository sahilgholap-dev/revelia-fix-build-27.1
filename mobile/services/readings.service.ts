import { api } from '@/lib/api';
import { FaceReadingOutput, PalmReadingOutput, ReadingResponse } from '@shared/types';

export const readingsService = {
  // Get cached face reading
  async getFaceReading(): Promise<ReadingResponse<FaceReadingOutput>> {
    const response = await api.get('/readings/face');
    return response.data;
  },
  
  // Generate new face reading
  async generateFaceReading(): Promise<ReadingResponse<FaceReadingOutput>> {
    const response = await api.post('/readings/face', { regenerate: false });
    return response.data;
  },
  
  // Get cached palm reading
  async getPalmReading(hand: 'dominant' | 'non-dominant'): Promise<ReadingResponse<PalmReadingOutput>> {
    const response = await api.get(`/readings/palm?hand=${hand}`);
    return response.data;
  },
  
  // Generate new palm reading
  async generatePalmReading(hand: 'dominant' | 'non-dominant'): Promise<ReadingResponse<PalmReadingOutput>> {
    const response = await api.post('/readings/palm', { hand, regenerate: false });
    return response.data;
  },
  
  // Get reading history
  async getReadingHistory(type?: string, limit: number = 10) {
    const response = await api.get('/readings/history', { params: { type, limit } });
    return response.data.readings;
  }
};

export default readingsService;
