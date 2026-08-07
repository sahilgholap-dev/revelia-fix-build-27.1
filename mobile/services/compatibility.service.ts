import axios from 'axios';
import Constants from 'expo-constants';
import { storage } from '@/lib/storage';
import { api } from '@/lib/api';
import { CompatibilityReading, CompatibilityOutput } from '@shared/types';

const API_URL = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL || 'https://revelia-backend-production.up.railway.app/api';

// Helper to create form data from image URI
function createImageFormData(uri: string, fieldName: string = 'image'): FormData {
  const formData = new FormData();
  const filename = uri.split('/').pop() || 'partner.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const ext = match ? match[1].toLowerCase() : 'jpg';

  // Map extension to proper MIME type, defaulting to jpeg for unknown
  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
  };
  const type = mimeTypes[ext] || 'image/jpeg';
  // Ensure filename has a valid extension
  const safeName = mimeTypes[ext] ? filename : `partner.jpg`;

  formData.append(fieldName, {
    uri,
    name: safeName,
    type
  } as any);

  return formData;
}

export const compatibilityService = {
  // Upload partner image - uses direct axios to avoid API client Content-Type issues
  async uploadPartnerImage(imageUri: string): Promise<{ url: string; uploadedAt: string }> {
    const formData = createImageFormData(imageUri);
    const token = await storage.getToken();

    const response = await axios.post(`${API_URL}/upload/partner`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      timeout: 90000,
      transformRequest: (data) => data,
    });

    const body = response.data;
    if (body.success === false) {
      throw new Error(body.error || 'Upload failed');
    }
    return body.data || body;
  },

  // Generate compatibility reading
  async generateCompatibility(
    partnerName: string,
    partnerImageUrl: string,
    partnerBirthDate?: string,
    partnerBirthTime?: string,
    partnerBirthPlace?: string,
    relationshipType?: string,
    relationshipSubType?: string
  ): Promise<CompatibilityReading> {
    const { data } = await api.post('/compatibility', {
      partnerName,
      partnerImageUrl,
      partnerBirthDate,
      partnerBirthTime,
      partnerBirthPlace,
      relationshipType,
      relationshipSubType,
    });
    return data;
  },

  // Get all compatibility readings
  async getCompatibilityReadings(): Promise<CompatibilityReading[]> {
    const { data } = await api.get('/compatibility');
    return data.readings;
  },

  // Get specific reading
  async getCompatibilityById(id: string): Promise<CompatibilityReading> {
    const { data } = await api.get(`/compatibility/${id}`);
    return data;
  },

  // Delete reading
  async deleteCompatibility(id: string): Promise<void> {
    await api.delete(`/compatibility/${id}`);
  }
};
