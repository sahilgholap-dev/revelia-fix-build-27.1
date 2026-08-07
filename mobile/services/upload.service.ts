import { api } from '@/lib/api';
import { UploadResponse } from '@shared/types';

export const uploadService = {
  /**
   * Upload face image
   */
  uploadFace: async (imageUri: string) => {
    const formData = new FormData();

    // Convert URI to file - always send as JPEG for consistency
    const filename = imageUri.split('/').pop() || 'face.jpg';

    formData.append('image', {
      uri: imageUri,
      name: filename,
      type: 'image/jpeg'
    } as any);

    try {
      return await api.post<UploadResponse>('/upload/face', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 60000
      });
    } catch (error: any) {
      console.error('Face upload failed:', error?.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Upload palm image
   */
  uploadPalm: async (imageUri: string, isDominant: boolean) => {
    const formData = new FormData();

    const filename = imageUri.split('/').pop() || 'palm.jpg';

    formData.append('image', {
      uri: imageUri,
      name: filename,
      type: 'image/jpeg'
    } as any);
    formData.append('isDominant', String(isDominant));

    try {
      return await api.post<UploadResponse>('/upload/palm', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 60000
      });
    } catch (error: any) {
      console.error('Palm upload failed:', error?.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Delete image
   */
  deleteImage: async (type: 'face' | 'palm-dominant' | 'palm-non-dominant') => {
    return api.delete(`/upload/${type}`);
  }
};

export default uploadService;
