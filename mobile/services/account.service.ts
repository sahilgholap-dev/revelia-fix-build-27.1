import { api } from '../lib/api';

export const accountService = {
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.patch('/auth/change-password', { currentPassword, newPassword });
  },
  
  async exportData(): Promise<{ message: string; dataSize: any }> {
    const response = await api.post('/account/export');
    return response.data;
  },
  
  async deleteAccount(): Promise<void> {
    await api.delete('/account');
  }
};

export default accountService;
