import { api } from '@/lib/api';
import { UploadResponse } from '@shared/types';
import { appendImageToFormData } from '@/lib/formDataFile';

export const uploadService = {
  /**
   * Upload face image
   */
  uploadFace: async (imageUri: string) => {
    const formData = new FormData();

    // Convert URI to file - always send as JPEG for consistency
    const filename = imageUri.split('/').pop() || 'face.jpg';

    // Platform-forked: RN takes a {uri,name,type} descriptor, the browser needs
    // a real Blob. See lib/formDataFile.ts — appending the descriptor on web
    // produces a 151-byte body and a 400 from the server.
    await appendImageToFormData(formData, 'image', imageUri, filename, 'image/jpeg');

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

    await appendImageToFormData(formData, 'image', imageUri, filename, 'image/jpeg');
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
